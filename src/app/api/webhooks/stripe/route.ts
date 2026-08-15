import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingInterval, SubscriptionStatus } from "@/lib/billing/types";

export const runtime = "nodejs";

// Stripeを課金状態の原本とし、Webhookで受け取った内容をsubscriptionsテーブルへミラーする (■70, ■82)。
// 処理対象イベント (■74)
const HANDLED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    default:
      // "paused" 等、本サービスで使用しない状態はfail-closedでCANCELED扱いにする。
      return "CANCELED";
  }
}

function billingIntervalFromSubscription(subscription: Stripe.Subscription): BillingInterval {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  if (interval === "month") return "MONTH";
  if (interval === "year") return "YEAR";
  return "NONE";
}

type AdminClient = ReturnType<typeof createAdminClient>;

// Stripe Subscriptionの最新状態をsubscriptionsテーブルへ反映する。
// イベントの到着順に依存せず、常にStripe側の「現在の状態」で上書きする (■78)。
async function upsertSubscriptionFromStripe(
  admin: AdminClient,
  workspaceId: string,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0];
  const nextStatus = mapStripeStatus(subscription.status);

  const { data: existing } = await admin
    .from("subscriptions")
    .select("status, past_due_since")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // 猶予期間の起点は「最初にPAST_DUEになった時刻」。既にPAST_DUEなら上書きしない (■85)。
  let pastDueSince: string | null = null;
  if (nextStatus === "PAST_DUE") {
    pastDueSince =
      existing?.status === "PAST_DUE" && existing.past_due_since
        ? (existing.past_due_since as string)
        : new Date().toISOString();
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item?.price.id ?? null,
      plan_code: "PRO",
      billing_interval: billingIntervalFromSubscription(subscription),
      status: nextStatus,
      current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      past_due_since: pastDueSince,
    },
    { onConflict: "workspace_id" }
  );

  if (error) throw error;
}

// subscriptionIdからStripe側の最新状態を取得して同期する共通処理。
async function syncSubscriptionById(admin: AdminClient, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const workspaceId = subscription.metadata?.workspace_id;
  if (!workspaceId) return;
  await upsertSubscriptionFromStripe(admin, workspaceId, subscription);
}

async function handleEvent(admin: AdminClient, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subscriptionId) {
        await syncSubscriptionById(admin, subscriptionId);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspace_id;
      if (workspaceId) {
        await upsertSubscriptionFromStripe(admin, workspaceId, subscription);
      }
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
      if (subscriptionId) {
        await syncSubscriptionById(admin, subscriptionId);
      }
      break;
    }

    default:
      break;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secretが未設定です" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  // 署名検証には生のリクエストボディが必要 (■75-76)
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: `署名検証に失敗しました: ${message}` }, { status: 400 });
  }

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const admin = createAdminClient();

  // 重複処理防止: stripe_event_idにUNIQUE制約があるため、既に記録済みなら即200を返す (■77, ■197)
  const { error: insertError } = await admin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processing_status: "PENDING",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "イベント記録に失敗しました" }, { status: 500 });
  }

  try {
    await handleEvent(admin, event);
    await admin
      .from("stripe_events")
      .update({ processing_status: "PROCESSED", processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await admin
      .from("stripe_events")
      .update({ processing_status: "ERROR", error_message: message })
      .eq("stripe_event_id", event.id);
    // 5xxを返すとStripeが再試行してくれる
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

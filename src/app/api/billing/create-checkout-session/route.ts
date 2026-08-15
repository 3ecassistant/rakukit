import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// クライアントからは MONTH | YEAR のみを受け取り、実際のStripe Price IDは
// 必ずサーバー側の環境変数から決定する（■64-66、金額をクライアントから信用しない）。
const PRICE_ID_BY_INTERVAL: Record<"MONTH" | "YEAR", string | undefined> = {
  MONTH: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  YEAR: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
};

function isBillingInterval(value: unknown): value is "MONTH" | "YEAR" {
  return value === "MONTH" || value === "YEAR";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const { billingInterval } = (body ?? {}) as Record<string, unknown>;
  if (!isBillingInterval(billingInterval)) {
    return NextResponse.json({ error: "billingIntervalはMONTHまたはYEARを指定してください" }, { status: 400 });
  }

  const priceId = PRICE_ID_BY_INTERVAL[billingInterval];
  if (!priceId) {
    return NextResponse.json({ error: "価格設定が完了していません" }, { status: 500 });
  }

  // ログイン確認 (■63)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // workspace確認: RLS配下のクライアントで取得するため、他人のworkspaceは取得できない (■63, ■265)
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: "ワークスペースが見つかりません" }, { status: 400 });
  }

  const admin = createAdminClient();
  const stripe = getStripe();

  // 既存active/trialingサブスクリプションがあれば二重契約させない (■193-194)
  const { data: existingSubscription } = await admin
    .from("subscriptions")
    .select("stripe_customer_id, plan_code, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (
    existingSubscription?.plan_code === "PRO" &&
    (existingSubscription.status === "ACTIVE" || existingSubscription.status === "TRIALING")
  ) {
    return NextResponse.json(
      { error: "すでにPROをご利用中です。契約管理からご確認ください。" },
      { status: 409 }
    );
  }

  // Stripe Customerの取得または作成 (■54-55, ■63)
  let stripeCustomerId = existingSubscription?.stripe_customer_id as string | undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { workspace_id: workspaceId },
    });
    stripeCustomerId = customer.id;

    const { error: upsertError } = await admin
      .from("subscriptions")
      .upsert(
        { workspace_id: workspaceId, stripe_customer_id: stripeCustomerId },
        { onConflict: "workspace_id" }
      );

    if (upsertError) {
      return NextResponse.json({ error: "顧客情報の作成に失敗しました" }, { status: 500 });
    }
  }

  const origin = req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata: { workspace_id: workspaceId, billing_interval: billingInterval },
    subscription_data: {
      metadata: { workspace_id: workspaceId },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Checkoutセッションの作成に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

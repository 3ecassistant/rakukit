import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe Customer Portalへのセッションを都度サーバー側で発行する (■92-93)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

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
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const stripeCustomerId = subscription?.stripe_customer_id as string | undefined;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: "契約情報が見つかりません" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}

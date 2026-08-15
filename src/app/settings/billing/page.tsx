import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { SubscriptionRecord } from "@/lib/billing/types";
import PortalButton from "@/components/billing/PortalButton";

export const metadata: Metadata = {
  title: "契約・お支払い",
};

const BILLING_INTERVAL_LABELS: Record<string, string> = {
  MONTH: "月払い（¥4,980 / 月）",
  YEAR: "年払い（¥49,800 / 年）",
  NONE: "-",
};

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id as string | undefined;

  let subscription: SubscriptionRecord | null = null;
  let hasStripeCustomer = false;
  if (workspaceId) {
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "plan_code, billing_interval, status, current_period_end, cancel_at_period_end, past_due_since, stripe_customer_id"
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (data) {
      hasStripeCustomer = Boolean(data.stripe_customer_id);
      subscription = {
        planCode: data.plan_code,
        billingInterval: data.billing_interval,
        status: data.status,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        pastDueSince: data.past_due_since,
      };
    }
  }

  const entitlements = getEntitlements(subscription);
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("ja-JP")
    : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">契約・お支払い</h1>
      </header>

      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        {entitlements.planState === "PRO_PAST_DUE_LOCKED" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            お支払いを確認できませんでした。決済方法をご確認ください。
          </p>
        )}
        {entitlements.planState === "PRO_PAST_DUE_GRACE" && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            決済確認中です。お支払い方法のご確認をお願いします。
          </p>
        )}

        <div>
          <p className="text-xs text-zinc-500">現在のプラン</p>
          <p className="text-lg font-bold text-zinc-900">{entitlements.isPro ? "PRO" : "FREE"}</p>
        </div>

        {entitlements.isPro && subscription && (
          <>
            <div>
              <p className="text-xs text-zinc-500">請求周期</p>
              <p className="text-sm font-medium text-zinc-800">
                {BILLING_INTERVAL_LABELS[subscription.billingInterval]}
              </p>
            </div>

            {periodEnd && (
              <div>
                <p className="text-xs text-zinc-500">
                  {subscription.cancelAtPeriodEnd ? "利用終了予定日" : "次回更新日"}
                </p>
                <p className="text-sm font-medium text-zinc-800">{periodEnd}</p>
                {subscription.cancelAtPeriodEnd && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {periodEnd}までPROをご利用いただけます。以降はFREEプランに切り替わります。
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {hasStripeCustomer ? (
          <PortalButton />
        ) : (
          <Link
            href="/pricing"
            className="self-start rounded-full bg-gradient-to-b from-red-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700"
          >
            PROにアップグレード
          </Link>
        )}
      </div>
    </main>
  );
}

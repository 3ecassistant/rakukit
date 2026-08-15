import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { SubscriptionRecord } from "@/lib/billing/types";
import { signOutAction } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "アカウント",
};

const PLAN_STATE_LABELS: Record<string, string> = {
  FREE: "FREE",
  PRO_ACTIVE: "PRO",
  PRO_CANCEL_SCHEDULED: "PRO（解約予約中）",
  PRO_PAST_DUE_GRACE: "PRO（お支払い確認中）",
  PRO_PAST_DUE_LOCKED: "PRO（お支払いが必要です）",
};

export default async function AccountPage() {
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
  if (workspaceId) {
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "plan_code, billing_interval, status, current_period_end, cancel_at_period_end, past_due_since"
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (data) {
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">アカウント</h1>
        <p className="text-sm text-zinc-500">{user.email}</p>
      </header>

      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs text-zinc-500">現在のプラン</p>
          <p className="text-lg font-bold text-zinc-900">
            {PLAN_STATE_LABELS[entitlements.planState] ?? entitlements.planState}
          </p>
        </div>

        {entitlements.isPro ? (
          <Link
            href="/settings/billing"
            className="self-start rounded-full border border-red-600 px-4 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            契約・お支払いを管理
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="self-start rounded-full bg-gradient-to-b from-red-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700"
          >
            PROにアップグレード
          </Link>
        )}

        <form action={signOutAction}>
          <button type="submit" className="text-sm text-zinc-500 hover:text-red-600">
            ログアウト
          </button>
        </form>
      </div>
    </main>
  );
}

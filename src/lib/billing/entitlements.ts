// docs/billing-spec.md ■83-88, ■155-159, ■296-299 に対応するEntitlement判定ロジック。
//
// 重要: この関数はStripe/Supabaseへの問い合わせを一切行わない純粋関数にする。
// 「Calculator関数：純粋計算 / Subscription：別レイヤー」という方針（■296-299）を
// このモジュールにも適用し、Stripe Webhookやサーバー側APIから同じロジックを
// テスト可能な形で共有する。

import { Entitlements, PlanState, SubscriptionRecord } from "./types";

// 支払い失敗から何日間はPRO利用を継続するか (■85)
export const PAST_DUE_GRACE_DAYS = 7;

const FREE_ENTITLEMENTS: Omit<Entitlements, "planState" | "isPro"> = {
  canCalculateBasic: true,
  canCopyResult: true,
  canSaveStore: false,
  canSaveProduct: false,
  canSaveScenario: false,
  canViewHistory: false,
  canCompareScenarios: false,
  canImportCsv: false,
  canExportCsv: false,
  canUsePersistentHandoff: false,
};

const FULL_PRO_ENTITLEMENTS: Omit<Entitlements, "planState" | "isPro"> = {
  canCalculateBasic: true,
  canCopyResult: true,
  canSaveStore: true,
  canSaveProduct: true,
  canSaveScenario: true,
  canViewHistory: true,
  canCompareScenarios: true,
  canImportCsv: true,
  canExportCsv: true,
  canUsePersistentHandoff: true,
};

// 猶予期間を過ぎたPAST_DUE状態 (■87-89)。
// 新規保存・CSV取込は停止するが、閲覧・比較・エクスポート・自動入力（既存データの利用）は維持し、
// データそのものも削除しない。
const PAST_DUE_LOCKED_ENTITLEMENTS: Omit<Entitlements, "planState" | "isPro"> = {
  canCalculateBasic: true,
  canCopyResult: true,
  canSaveStore: false,
  canSaveProduct: false,
  canSaveScenario: false,
  canViewHistory: true,
  canCompareScenarios: true,
  canImportCsv: false,
  canExportCsv: true,
  canUsePersistentHandoff: true,
};

function daysSince(now: Date, since: Date): number {
  return (now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24);
}

// サブスクリプション行から画面表示用の粗い状態を求める (■84-87, ■96-98)
export function resolvePlanState(
  subscription: SubscriptionRecord | null | undefined,
  now: Date = new Date()
): PlanState {
  if (!subscription || subscription.planCode !== "PRO") return "FREE";

  if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") {
    return subscription.cancelAtPeriodEnd ? "PRO_CANCEL_SCHEDULED" : "PRO_ACTIVE";
  }

  if (subscription.status === "PAST_DUE") {
    const since = subscription.pastDueSince ? new Date(subscription.pastDueSince) : now;
    return daysSince(now, since) <= PAST_DUE_GRACE_DAYS
      ? "PRO_PAST_DUE_GRACE"
      : "PRO_PAST_DUE_LOCKED";
  }

  // CANCELED / UNPAID / INCOMPLETE / INCOMPLETE_EXPIRED / NONE はすべてFREE扱い
  return "FREE";
}

// PRO保存API・CSV API・履歴APIなど、サーバー側の各エンドポイントは必ずこの関数の
// 戻り値だけを見て許可判定する。stripe_status等を直接参照しない（■153-159, ■283）。
export function getEntitlements(
  subscription: SubscriptionRecord | null | undefined,
  now: Date = new Date()
): Entitlements {
  const planState = resolvePlanState(subscription, now);

  switch (planState) {
    case "PRO_ACTIVE":
    case "PRO_CANCEL_SCHEDULED":
    case "PRO_PAST_DUE_GRACE":
      return { planState, isPro: true, ...FULL_PRO_ENTITLEMENTS };
    case "PRO_PAST_DUE_LOCKED":
      return { planState, isPro: true, ...PAST_DUE_LOCKED_ENTITLEMENTS };
    case "FREE":
    default:
      return { planState, isPro: false, ...FREE_ENTITLEMENTS };
  }
}

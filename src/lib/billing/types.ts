// docs/billing-spec.md ■58, ■81-82, ■156-158 に対応する課金ドメイン型。
// Stripe/SupabaseのSDK型に依存しない、プレーンなドメインモデルとして定義する（■290-291）。

export type PlanCode = "FREE" | "PRO";

export type BillingInterval = "NONE" | "MONTH" | "YEAR";

export type SubscriptionStatus =
  | "NONE"
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED";

// subscriptionsテーブル1行を表す。Stripeの生オブジェクトそのものではなく、
// アプリ側が必要とする最小限のミラー項目のみを持つ（■82, ■290）。
export interface SubscriptionRecord {
  planCode: PlanCode;
  billingInterval: BillingInterval;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | string | null;
  cancelAtPeriodEnd: boolean;
  pastDueSince: Date | string | null;
}

// UI側の状態表示（バナー・設定画面等）に使う粒度の粗い状態 (■84-87, ■96-98, ■200)
export type PlanState =
  | "FREE"
  | "PRO_ACTIVE"
  | "PRO_CANCEL_SCHEDULED"
  | "PRO_PAST_DUE_GRACE"
  | "PRO_PAST_DUE_LOCKED";

// 機能ごとの許可フラグ (■156)。24ツール側やAPI側はplanCode/statusを直接見ず、
// 必ずこのEntitlementsだけを参照する（■159, ■283, ■290）。
export interface Entitlements {
  planState: PlanState;
  isPro: boolean;

  // FREEでも常にtrue (■157)
  canCalculateBasic: boolean;
  canCopyResult: boolean;

  // PRO機能 (■156, ■237)
  canSaveStore: boolean;
  canSaveProduct: boolean;
  canSaveScenario: boolean;
  canViewHistory: boolean;
  canCompareScenarios: boolean;
  canImportCsv: boolean;
  canExportCsv: boolean;
  canUsePersistentHandoff: boolean;
}

// ログイン/課金状態の3区分 (■34-36)。UIの導線判定に使う。
export type UserAccountState = "ANONYMOUS_FREE" | "ACCOUNT_FREE" | "PRO";

export interface CouponMinimumSpendInputs {
  couponAmount: number;
  costRate: number;
  shipping: number;
  marketplaceCostRate: number;
  minProfitRate: number;
}

export const DEFAULT_COUPON_MIN_SPEND_INPUTS: CouponMinimumSpendInputs = {
  couponAmount: 500,
  costRate: 35,
  shipping: 600,
  marketplaceCostRate: 10,
  minProfitRate: 10,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: CouponMinimumSpendInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.couponAmount <= 0) issues.push({ field: "couponAmount", message: "クーポン額は1円以上を入力してください。" });
  if (inputs.costRate < 0 || inputs.costRate >= 100) {
    issues.push({ field: "costRate", message: "原価率は0〜100%未満で入力してください。" });
  }
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.minProfitRate < 0 || inputs.minProfitRate >= 100) {
    issues.push({ field: "minProfitRate", message: "最低利益率は0〜100%未満で入力してください。" });
  }
  return issues;
}

export interface SpendProfitBreakdown {
  spend: number;
  postCouponRevenue: number;
  productCost: number;
  marketplaceCost: number;
  shipping: number;
  profit: number;
  profitRate: number | null;
  effectiveDiscountRate: number;
}

/** 購入金額Xにおける利益内訳。原価は値引き前の購入金額基準、販売関連費はクーポン適用後売上基準（§20-22）。 */
export function computeProfitAtSpend(inputs: CouponMinimumSpendInputs, spend: number): SpendProfitBreakdown {
  const postCouponRevenue = spend - inputs.couponAmount;
  const productCost = spend * (inputs.costRate / 100);
  const marketplaceCost = postCouponRevenue * (inputs.marketplaceCostRate / 100);
  const profit = postCouponRevenue - productCost - inputs.shipping - marketplaceCost;
  const profitRate = postCouponRevenue > 0 ? (profit / postCouponRevenue) * 100 : null;
  const effectiveDiscountRate = spend > 0 ? (inputs.couponAmount / spend) * 100 : 0;

  return {
    spend,
    postCouponRevenue,
    productCost,
    marketplaceCost,
    shipping: inputs.shipping,
    profit,
    profitRate,
    effectiveDiscountRate,
  };
}

/**
 * 利益率targetRate(%)を達成する最小の購入金額を閉形式で算出する。
 * profit(X) = X(1-cr-mr) - C(1-mr) - shipping は購入金額Xに対して線形なので、
 * profitRate(X) = targetRate/100 を解く一次方程式として厳密に求まる（二分探索より高精度）。
 * 分母が0以下の場合、購入金額をいくら増やしても目標利益率へ到達できない（構造的に不可能）。
 */
export function minSpendForProfitRate(inputs: CouponMinimumSpendInputs, targetRatePercent: number): number | null {
  const cr = inputs.costRate / 100;
  const mr = inputs.marketplaceCostRate / 100;
  const pr = targetRatePercent / 100;
  const denom = 1 - cr - mr - pr;
  if (denom <= 0) return null;
  const numer = inputs.couponAmount * (1 - mr - pr) + inputs.shipping;
  const rawSpend = numer / denom;
  return Math.max(rawSpend, inputs.couponAmount + 0.01);
}

export function roundUpTo(value: number, unit: number): number {
  return Math.ceil(value / unit) * unit;
}

export type SpendStatus = "ok" | "caution" | "deficit";

export function judgeSpendStatus(profit: number, profitRate: number | null, minProfitRate: number): SpendStatus {
  if (profit < 0) return "deficit";
  if (profitRate !== null && profitRate < minProfitRate) return "caution";
  return "ok";
}

export interface RoundedThreshold {
  unit: number;
  value: number;
}

export interface CouponMinimumSpendResult {
  theoreticalMaxProfitRate: number;
  isStructurallyUnprofitable: boolean;
  breakEvenMinimumSpend: number | null;
  targetProfitMinimumSpend: number | null;
  isTargetUnreachable: boolean;
  breakdownAtTarget: SpendProfitBreakdown | null;
  roundedThresholds: RoundedThreshold[];
}

export function computeCouponMinimumSpend(inputs: CouponMinimumSpendInputs): CouponMinimumSpendResult {
  const cr = inputs.costRate / 100;
  const mr = inputs.marketplaceCostRate / 100;
  const theoreticalMaxProfitRate = (1 - cr - mr) * 100;
  const isStructurallyUnprofitable = theoreticalMaxProfitRate <= 0;

  const breakEvenRaw = minSpendForProfitRate(inputs, 0);
  const breakEvenMinimumSpend = breakEvenRaw !== null ? Math.ceil(breakEvenRaw) : null;

  const targetRaw = minSpendForProfitRate(inputs, inputs.minProfitRate);
  const isTargetUnreachable = targetRaw === null;
  const targetProfitMinimumSpend = targetRaw !== null ? Math.ceil(targetRaw) : null;

  const breakdownAtTarget = targetProfitMinimumSpend !== null ? computeProfitAtSpend(inputs, targetProfitMinimumSpend) : null;

  const roundedThresholds: RoundedThreshold[] =
    targetProfitMinimumSpend !== null
      ? [100, 500, 1000].map((unit) => ({ unit, value: roundUpTo(targetProfitMinimumSpend, unit) }))
      : [];

  return {
    theoreticalMaxProfitRate,
    isStructurallyUnprofitable,
    breakEvenMinimumSpend,
    targetProfitMinimumSpend,
    isTargetUnreachable,
    breakdownAtTarget,
    roundedThresholds,
  };
}

export const DEFAULT_COMPARISON_SPENDS = [3000, 4000, 5000, 6000, 7000];

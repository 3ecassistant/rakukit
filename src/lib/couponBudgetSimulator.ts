import { CouponMinimumSpendInputs, computeProfitAtSpend, minSpendForProfitRate } from "./couponMinimumSpendCalculator";

export interface CouponBudgetInputs {
  couponAmount: number;
  expectedRedemptions: number;
  averageOrderValue: number;
  costRate: number;
  shippingPerOrder: number;
  marketplaceCostRate: number;
  minimumProfitRate: number;
}

export const DEFAULT_COUPON_BUDGET_INPUTS: CouponBudgetInputs = {
  couponAmount: 500,
  expectedRedemptions: 100,
  averageOrderValue: 5000,
  costRate: 35,
  shippingPerOrder: 600,
  marketplaceCostRate: 8.5,
  minimumProfitRate: 10,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: CouponBudgetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.couponAmount <= 0) issues.push({ field: "couponAmount", message: "クーポン額は1円以上を入力してください。" });
  if (inputs.expectedRedemptions < 0) issues.push({ field: "expectedRedemptions", message: "想定利用数はマイナスにできません。" });
  if (inputs.averageOrderValue <= 0) issues.push({ field: "averageOrderValue", message: "平均注文単価は1円以上を入力してください。" });
  if (inputs.averageOrderValue <= inputs.couponAmount) {
    issues.push({ field: "averageOrderValue", message: "クーポン額が平均注文単価以上です。" });
  }
  if (inputs.costRate < 0 || inputs.costRate >= 100) {
    issues.push({ field: "costRate", message: "原価率は0〜100%未満で入力してください。" });
  }
  if (inputs.shippingPerOrder < 0) issues.push({ field: "shippingPerOrder", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.minimumProfitRate < 0 || inputs.minimumProfitRate >= 100) {
    issues.push({ field: "minimumProfitRate", message: "最低利益率は0〜100%未満で入力してください。" });
  }
  return issues;
}

function toCouponMinimumSpendInputs(inputs: CouponBudgetInputs): CouponMinimumSpendInputs {
  return {
    couponAmount: inputs.couponAmount,
    costRate: inputs.costRate,
    shipping: inputs.shippingPerOrder,
    marketplaceCostRate: inputs.marketplaceCostRate,
    minProfitRate: inputs.minimumProfitRate,
  };
}

export type CouponBudgetStatus = "ok" | "caution" | "deficit";

export interface CouponBudgetResult {
  totalCouponCost: number;
  grossCouponSales: number;
  netCouponSales: number;
  profitPerOrder: number;
  profitRate: number | null;
  totalProfit: number;
  minimumAov: number | null;
  requiredCouponSales: number | null;
  status: CouponBudgetStatus;
}

/**
 * 1件あたりの採算は既存 CouponMinimumSpendCalculator をそのまま流用する
 * （平均注文単価をそのクーポンの「購入金額」として渡すだけで同じロジックが使える）。
 */
export function computeCouponBudget(inputs: CouponBudgetInputs): CouponBudgetResult {
  const minSpendInputs = toCouponMinimumSpendInputs(inputs);
  const perOrder = computeProfitAtSpend(minSpendInputs, inputs.averageOrderValue);

  const totalCouponCost = inputs.couponAmount * inputs.expectedRedemptions;
  const grossCouponSales = inputs.averageOrderValue * inputs.expectedRedemptions;
  const netCouponSales = grossCouponSales - totalCouponCost;
  const profitPerOrder = perOrder.profit;
  const profitRate = perOrder.profitRate;
  const totalProfit = profitPerOrder * inputs.expectedRedemptions;

  const minimumAovRaw = minSpendForProfitRate(minSpendInputs, inputs.minimumProfitRate);
  const minimumAov = minimumAovRaw !== null ? Math.ceil(minimumAovRaw) : null;
  const requiredCouponSales = minimumAov !== null ? minimumAov * inputs.expectedRedemptions : null;

  let status: CouponBudgetStatus;
  if (profitPerOrder < 0) status = "deficit";
  else if (profitRate !== null && profitRate < inputs.minimumProfitRate) status = "caution";
  else status = "ok";

  return {
    totalCouponCost,
    grossCouponSales,
    netCouponSales,
    profitPerOrder,
    profitRate,
    totalProfit,
    minimumAov,
    requiredCouponSales,
    status,
  };
}

import { DEFAULT_PROFIT_INPUTS, ProfitBreakdown, ProfitInputs, computeProfitBreakdown } from "./profitSimulator";

export interface BulkPurchaseCouponInputs {
  unitPrice: number;
  unitCost: number;
  baselineQuantity: number;
  bulkQuantity: number;
  couponAmount: number;
  shipping: number;
  marketplaceCostRate: number;
}

export const DEFAULT_BULK_PURCHASE_COUPON_INPUTS: BulkPurchaseCouponInputs = {
  unitPrice: 3980,
  unitCost: 1500,
  baselineQuantity: 1,
  bulkQuantity: 2,
  couponAmount: 500,
  shipping: 600,
  marketplaceCostRate: 8.5,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: BulkPurchaseCouponInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.unitPrice <= 0) issues.push({ field: "unitPrice", message: "商品単価は1円以上を入力してください。" });
  if (inputs.unitCost < 0) issues.push({ field: "unitCost", message: "商品原価はマイナスにできません。" });
  if (inputs.baselineQuantity < 1) issues.push({ field: "baselineQuantity", message: "通常購入点数は1点以上を入力してください。" });
  if (inputs.bulkQuantity <= inputs.baselineQuantity) {
    issues.push({ field: "bulkQuantity", message: "まとめ買い点数は通常購入点数より多く入力してください。" });
  }
  if (inputs.couponAmount < 0) issues.push({ field: "couponAmount", message: "クーポン額はマイナスにできません。" });
  const bulkGrossRevenue = inputs.unitPrice * inputs.bulkQuantity;
  if (inputs.couponAmount >= bulkGrossRevenue && bulkGrossRevenue > 0) {
    issues.push({ field: "couponAmount", message: "クーポン額が注文金額以上です。" });
  }
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  return issues;
}

function buildProfitInputs(revenue: number, cost: number, shipping: number, marketplaceCostRate: number, couponDiscount: number): ProfitInputs {
  return {
    ...DEFAULT_PROFIT_INPUTS,
    sellingPrice: revenue,
    cost,
    shipping,
    otherCost: 0,
    pointRate: 0,
    couponDiscount,
    marketplaceCostRate,
    adCostMode: "fixed",
    adCostFixed: 0,
    minProfitMode: "rate",
    minProfitRate: 0,
  };
}

export type BulkPurchaseStatus = "ok" | "deficit";

function judgeStatus(profit: number): BulkPurchaseStatus {
  return profit < 0 ? "deficit" : "ok";
}

export interface ScenarioResult {
  label: string;
  quantity: number;
  breakdown: ProfitBreakdown;
  unitProfit: number;
  status: BulkPurchaseStatus;
}

export interface BulkPurchaseCouponResult {
  baseline: ScenarioResult;
  bulkNoCoupon: ScenarioResult;
  bulkWithCoupon: ScenarioResult;

  effectiveDiscountRate: number;
  revenueDifference: number;
  revenueGrowthRate: number | null;
  profitDifference: number;
  profitGrowthRate: number | null;
  unitProfitDifference: number;
  unitProfitDifferenceRate: number | null;
  couponProfitImpact: number;
}

/**
 * 3シナリオ（①通常購入 ②同点数・クーポンなし ③同点数・クーポンあり）を既存ProfitCalculatorで計算する。
 * クーポン額は売上から控除した後、費用として二重控除しない（§79の二重値引き防止）。
 */
export function computeBulkPurchaseCoupon(inputs: BulkPurchaseCouponInputs): BulkPurchaseCouponResult {
  const baselineRevenue = inputs.unitPrice * inputs.baselineQuantity;
  const baselineCost = inputs.unitCost * inputs.baselineQuantity;
  const baselineBreakdown = computeProfitBreakdown(
    buildProfitInputs(baselineRevenue, baselineCost, inputs.shipping, inputs.marketplaceCostRate, 0)
  );
  const baseline: ScenarioResult = {
    label: "通常購入",
    quantity: inputs.baselineQuantity,
    breakdown: baselineBreakdown,
    unitProfit: baselineBreakdown.profit / inputs.baselineQuantity,
    status: judgeStatus(baselineBreakdown.profit),
  };

  const bulkGrossRevenue = inputs.unitPrice * inputs.bulkQuantity;
  const bulkCost = inputs.unitCost * inputs.bulkQuantity;

  const bulkNoCouponBreakdown = computeProfitBreakdown(
    buildProfitInputs(bulkGrossRevenue, bulkCost, inputs.shipping, inputs.marketplaceCostRate, 0)
  );
  const bulkNoCoupon: ScenarioResult = {
    label: "まとめ買い（クーポンなし）",
    quantity: inputs.bulkQuantity,
    breakdown: bulkNoCouponBreakdown,
    unitProfit: bulkNoCouponBreakdown.profit / inputs.bulkQuantity,
    status: judgeStatus(bulkNoCouponBreakdown.profit),
  };

  const bulkWithCouponBreakdown = computeProfitBreakdown(
    buildProfitInputs(bulkGrossRevenue, bulkCost, inputs.shipping, inputs.marketplaceCostRate, inputs.couponAmount)
  );
  const bulkWithCoupon: ScenarioResult = {
    label: "まとめ買い（クーポンあり）",
    quantity: inputs.bulkQuantity,
    breakdown: bulkWithCouponBreakdown,
    unitProfit: bulkWithCouponBreakdown.profit / inputs.bulkQuantity,
    status: judgeStatus(bulkWithCouponBreakdown.profit),
  };

  const effectiveDiscountRate = bulkGrossRevenue > 0 ? (inputs.couponAmount / bulkGrossRevenue) * 100 : 0;
  const revenueDifference = bulkWithCouponBreakdown.actualSellingPrice - baselineRevenue;
  const revenueGrowthRate = baselineRevenue !== 0 ? (revenueDifference / baselineRevenue) * 100 : null;
  const profitDifference = bulkWithCouponBreakdown.profit - baselineBreakdown.profit;
  const profitGrowthRate =
    baselineBreakdown.profit !== 0 ? (profitDifference / Math.abs(baselineBreakdown.profit)) * 100 : null;
  const unitProfitDifference = bulkWithCoupon.unitProfit - baseline.unitProfit;
  const unitProfitDifferenceRate =
    baseline.unitProfit !== 0 ? (unitProfitDifference / Math.abs(baseline.unitProfit)) * 100 : null;
  const couponProfitImpact = bulkNoCouponBreakdown.profit - bulkWithCouponBreakdown.profit;

  return {
    baseline,
    bulkNoCoupon,
    bulkWithCoupon,
    effectiveDiscountRate,
    revenueDifference,
    revenueGrowthRate,
    profitDifference,
    profitGrowthRate,
    unitProfitDifference,
    unitProfitDifferenceRate,
    couponProfitImpact,
  };
}

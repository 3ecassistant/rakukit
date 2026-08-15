import { DEFAULT_PROFIT_INPUTS, ProfitBreakdown, ProfitInputs, computeProfitBreakdown } from "./profitSimulator";

export interface MaxPointRateInputs {
  sellingPrice: number;
  cost: number;
  shipping: number;
  marketplaceCostRate: number;
  currentPointRate: number;
  minProfitRate: number;
}

export const DEFAULT_MAX_POINT_RATE_INPUTS: MaxPointRateInputs = {
  sellingPrice: 4980,
  cost: 1500,
  shipping: 600,
  marketplaceCostRate: 8.5,
  currentPointRate: 5,
  minProfitRate: 10,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: MaxPointRateInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.sellingPrice <= 0) issues.push({ field: "sellingPrice", message: "販売価格は1円以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.cost >= inputs.sellingPrice && inputs.sellingPrice > 0) {
    issues.push({ field: "cost", message: "商品原価が販売価格以上です。" });
  }
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.currentPointRate < 0 || inputs.currentPointRate >= 100) {
    issues.push({ field: "currentPointRate", message: "現在ポイント負担率は0〜100%未満で入力してください。" });
  }
  if (inputs.minProfitRate < 0 || inputs.minProfitRate >= 100) {
    issues.push({ field: "minProfitRate", message: "最低利益率は0〜100%未満で入力してください。" });
  }
  return issues;
}

function toProfitInputs(inputs: MaxPointRateInputs, pointRate: number): ProfitInputs {
  return {
    ...DEFAULT_PROFIT_INPUTS,
    sellingPrice: inputs.sellingPrice,
    cost: inputs.cost,
    shipping: inputs.shipping,
    otherCost: 0,
    pointRate,
    couponDiscount: 0,
    marketplaceCostRate: inputs.marketplaceCostRate,
    adCostMode: "fixed",
    adCostFixed: 0,
    minProfitMode: "rate",
    minProfitRate: inputs.minProfitRate,
  };
}

export function computeBreakdownAtPointRate(inputs: MaxPointRateInputs, pointRate: number): ProfitBreakdown {
  return computeProfitBreakdown(toProfitInputs(inputs, pointRate));
}

export type PointRateStatus = "ok" | "caution" | "deficit";

export function judgePointRateStatus(profit: number, profitRate: number | null, minProfitRate: number): PointRateStatus {
  if (profit < 0) return "deficit";
  if (profitRate !== null && profitRate < minProfitRate) return "caution";
  return "ok";
}

export interface MaxPointRateResult {
  currentBreakdown: ProfitBreakdown;
  currentStatus: PointRateStatus;
  /** ポイント負担率0%時点の利益率。profitRate(pr) = profitRateAt0 - pr が成り立つ厳密な基準値。 */
  profitRateAt0: number;
  /** 原価・送料・販売関連費だけで、ポイントなしでも最低利益率を満たせない構造的な不成立状態。 */
  isUnreachableEvenAtZeroPoint: boolean;
  /** 利益率が最低利益率を維持できる最大ポイント負担率（%）。0未満にはならない。 */
  maxPointRate: number | null;
  maxPointCostAmount: number | null;
  /** 追加で上げられるポイント負担（pt）。現在が上限を超えている場合は負値。 */
  additionalPointCapacity: number | null;
  additionalPointCostCapacity: number | null;
  /** 利益がちょうど0円になるポイント負担率（赤字ライン）。 */
  breakEvenPointRate: number;
  isCurrentOverMax: boolean;
  isCurrentDeficit: boolean;
  requiredReductionToMax: number | null;
  requiredReductionToBreakEven: number | null;
}

/**
 * ポイント負担額は actualSellingPrice × pointRate/100 のため、
 * profitRate(pr) = profitRate(0) − pr が厳密に成り立つ（クーポン併用なしの場合、実売価格はポイント率に依存しないため）。
 * よって最大ポイント負担率は profitRateAt0 − minProfitRate という単純な引き算で厳密に求まる。
 */
export function computeMaxPointRate(inputs: MaxPointRateInputs): MaxPointRateResult {
  const currentBreakdown = computeBreakdownAtPointRate(inputs, inputs.currentPointRate);
  const currentStatus = judgePointRateStatus(currentBreakdown.profit, currentBreakdown.profitRate, inputs.minProfitRate);

  const breakdownAt0 = computeBreakdownAtPointRate(inputs, 0);
  const profitRateAt0 = breakdownAt0.profitRate ?? 0;

  const isUnreachableEvenAtZeroPoint = profitRateAt0 < inputs.minProfitRate;
  const maxPointRateRaw = profitRateAt0 - inputs.minProfitRate;
  const maxPointRate = isUnreachableEvenAtZeroPoint ? null : Math.min(100, maxPointRateRaw);
  const maxPointCostAmount = maxPointRate !== null ? inputs.sellingPrice * (maxPointRate / 100) : null;

  const additionalPointCapacity = maxPointRate !== null ? maxPointRate - inputs.currentPointRate : null;
  const additionalPointCostCapacity =
    maxPointCostAmount !== null ? maxPointCostAmount - currentBreakdown.pointCost : null;

  const breakEvenPointRate = Math.min(100, profitRateAt0);

  const isCurrentOverMax = maxPointRate !== null && inputs.currentPointRate > maxPointRate;
  const isCurrentDeficit = currentBreakdown.profit < 0;

  const requiredReductionToMax =
    maxPointRate !== null && isCurrentOverMax ? inputs.currentPointRate - maxPointRate : null;
  const requiredReductionToBreakEven = isCurrentDeficit ? inputs.currentPointRate - breakEvenPointRate : null;

  return {
    currentBreakdown,
    currentStatus,
    profitRateAt0,
    isUnreachableEvenAtZeroPoint,
    maxPointRate,
    maxPointCostAmount,
    additionalPointCapacity,
    additionalPointCostCapacity,
    breakEvenPointRate,
    isCurrentOverMax,
    isCurrentDeficit,
    requiredReductionToMax,
    requiredReductionToBreakEven,
  };
}

export const DEFAULT_COMPARISON_POINT_RATES = [1, 2, 5, 10, 15, 20, 30];

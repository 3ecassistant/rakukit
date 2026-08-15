export interface DiscountVolumeInputs {
  currentPrice: number;
  discountedPrice: number;
  currentQuantity: number;
  cost: number;
}

export const DEFAULT_DISCOUNT_VOLUME_INPUTS: DiscountVolumeInputs = {
  currentPrice: 4980,
  discountedPrice: 3980,
  currentQuantity: 100,
  cost: 2000,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: DiscountVolumeInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.currentPrice <= 0) issues.push({ field: "currentPrice", message: "現在価格は1円以上を入力してください。" });
  if (inputs.discountedPrice <= 0) issues.push({ field: "discountedPrice", message: "値下げ後価格は1円以上を入力してください。" });
  if (inputs.currentQuantity <= 0) issues.push({ field: "currentQuantity", message: "現在販売数は1個以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.discountedPrice >= inputs.currentPrice && inputs.currentPrice > 0) {
    issues.push({ field: "discountedPrice", message: "値下げ後価格は現在価格未満にしてください（値上げの場合は対象外です）。" });
  }
  return issues;
}

export type GrowthBurden = "small" | "medium" | "large" | "very-large";

export function classifyGrowthBurden(rate: number): GrowthBurden {
  if (rate < 10) return "small";
  if (rate < 30) return "medium";
  if (rate < 50) return "large";
  return "very-large";
}

export interface DiscountVolumeResult {
  currentUnitProfit: number;
  currentTotalProfit: number;
  currentRevenue: number;
  currentProfitRate: number | null;

  discountedUnitProfit: number;
  discountedProfitRate: number | null;
  profitRateChange: number | null;

  isCurrentlyUnprofitable: boolean;
  isDiscountedUnprofitable: boolean;

  discountAmount: number;
  discountRate: number;

  discountedRevenueAtCurrentQuantity: number;
  discountedProfitAtCurrentQuantity: number;
  totalProfitDifference: number;
  totalProfitDifferenceRate: number | null;

  requiredQuantityForProfit: number | null;
  additionalQuantity: number | null;
  requiredQuantityGrowthRate: number | null;
  growthBurden: GrowthBurden | null;

  requiredQuantityForRevenue: number;
  additionalQuantityForRevenue: number;
  requiredQuantityGrowthRateForRevenue: number | null;
}

export function computeDiscountVolumeResult(inputs: DiscountVolumeInputs): DiscountVolumeResult {
  const { currentPrice, discountedPrice, currentQuantity, cost } = inputs;

  const currentUnitProfit = currentPrice - cost;
  const currentTotalProfit = currentUnitProfit * currentQuantity;
  const currentRevenue = currentPrice * currentQuantity;
  const currentProfitRate = currentPrice > 0 ? (currentUnitProfit / currentPrice) * 100 : null;

  const discountedUnitProfit = discountedPrice - cost;
  const discountedProfitRate = discountedPrice > 0 ? (discountedUnitProfit / discountedPrice) * 100 : null;
  const profitRateChange =
    currentProfitRate !== null && discountedProfitRate !== null ? discountedProfitRate - currentProfitRate : null;

  const isCurrentlyUnprofitable = currentUnitProfit <= 0;
  const isDiscountedUnprofitable = discountedUnitProfit <= 0;

  const discountAmount = currentPrice - discountedPrice;
  const discountRate = currentPrice > 0 ? (discountAmount / currentPrice) * 100 : 0;

  const discountedRevenueAtCurrentQuantity = discountedPrice * currentQuantity;
  const discountedProfitAtCurrentQuantity = discountedUnitProfit * currentQuantity;
  const totalProfitDifference = discountedProfitAtCurrentQuantity - currentTotalProfit;
  const totalProfitDifferenceRate =
    currentTotalProfit !== 0 ? (totalProfitDifference / Math.abs(currentTotalProfit)) * 100 : null;

  let requiredQuantityForProfit: number | null = null;
  let additionalQuantity: number | null = null;
  let requiredQuantityGrowthRate: number | null = null;
  let growthBurden: GrowthBurden | null = null;

  if (!isCurrentlyUnprofitable && !isDiscountedUnprofitable) {
    requiredQuantityForProfit = Math.ceil(currentTotalProfit / discountedUnitProfit);
    additionalQuantity = requiredQuantityForProfit - currentQuantity;
    requiredQuantityGrowthRate = currentQuantity > 0 ? (additionalQuantity / currentQuantity) * 100 : null;
    growthBurden = requiredQuantityGrowthRate !== null ? classifyGrowthBurden(Math.max(0, requiredQuantityGrowthRate)) : null;
  }

  const requiredQuantityForRevenue = discountedPrice > 0 ? Math.ceil(currentRevenue / discountedPrice) : 0;
  const additionalQuantityForRevenue = requiredQuantityForRevenue - currentQuantity;
  const requiredQuantityGrowthRateForRevenue =
    currentQuantity > 0 ? (additionalQuantityForRevenue / currentQuantity) * 100 : null;

  return {
    currentUnitProfit,
    currentTotalProfit,
    currentRevenue,
    currentProfitRate,
    discountedUnitProfit,
    discountedProfitRate,
    profitRateChange,
    isCurrentlyUnprofitable,
    isDiscountedUnprofitable,
    discountAmount,
    discountRate,
    discountedRevenueAtCurrentQuantity,
    discountedProfitAtCurrentQuantity,
    totalProfitDifference,
    totalProfitDifferenceRate,
    requiredQuantityForProfit,
    additionalQuantity,
    requiredQuantityGrowthRate,
    growthBurden,
    requiredQuantityForRevenue,
    additionalQuantityForRevenue,
    requiredQuantityGrowthRateForRevenue,
  };
}

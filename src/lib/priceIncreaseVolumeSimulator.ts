export interface PriceIncreaseInputs {
  currentPrice: number;
  increasedPrice: number;
  currentQuantity: number;
  cost: number;
}

export const DEFAULT_PRICE_INCREASE_INPUTS: PriceIncreaseInputs = {
  currentPrice: 4980,
  increasedPrice: 5480,
  currentQuantity: 100,
  cost: 2000,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: PriceIncreaseInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.currentPrice <= 0) issues.push({ field: "currentPrice", message: "現在価格は1円以上を入力してください。" });
  if (inputs.increasedPrice <= 0) issues.push({ field: "increasedPrice", message: "値上げ後価格は1円以上を入力してください。" });
  if (inputs.currentQuantity <= 0) issues.push({ field: "currentQuantity", message: "現在販売数は1個以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.increasedPrice <= inputs.currentPrice && inputs.currentPrice > 0) {
    issues.push({
      field: "increasedPrice",
      message: "入力された価格は値上げではありません。値下げの場合は「値引き必要販売数シミュレーター」をご利用ください。",
    });
  }
  return issues;
}

export type MarginLevel = "small" | "medium" | "large" | "very-large";

export function classifyMargin(rate: number): MarginLevel {
  if (rate < 5) return "small";
  if (rate < 15) return "medium";
  if (rate < 30) return "large";
  return "very-large";
}

export interface PriceIncreaseResult {
  currentUnitProfit: number;
  currentTotalProfit: number;
  currentRevenue: number;
  currentProfitRate: number | null;

  increasedUnitProfit: number;
  increasedProfitRate: number | null;
  profitRateChange: number | null;

  isCurrentlyUnprofitable: boolean;
  isIncreasedUnprofitable: boolean;

  priceIncreaseAmount: number;
  priceIncreaseRate: number;

  increasedRevenueAtCurrentQuantity: number;
  increasedProfitAtCurrentQuantity: number;
  totalProfitIncrease: number;
  totalProfitIncreaseRate: number | null;

  requiredQuantityForProfit: number | null;
  allowedQuantityDecrease: number | null;
  allowedQuantityDecreaseRate: number | null;
  marginLevel: MarginLevel | null;

  requiredQuantityForRevenue: number;
  allowedQuantityDecreaseForRevenue: number;
  allowedQuantityDecreaseRateForRevenue: number | null;
}

export function computePriceIncreaseResult(inputs: PriceIncreaseInputs): PriceIncreaseResult {
  const { currentPrice, increasedPrice, currentQuantity, cost } = inputs;

  const currentUnitProfit = currentPrice - cost;
  const currentTotalProfit = currentUnitProfit * currentQuantity;
  const currentRevenue = currentPrice * currentQuantity;
  const currentProfitRate = currentPrice > 0 ? (currentUnitProfit / currentPrice) * 100 : null;

  const increasedUnitProfit = increasedPrice - cost;
  const increasedProfitRate = increasedPrice > 0 ? (increasedUnitProfit / increasedPrice) * 100 : null;
  const profitRateChange =
    currentProfitRate !== null && increasedProfitRate !== null ? increasedProfitRate - currentProfitRate : null;

  const isCurrentlyUnprofitable = currentUnitProfit <= 0;
  const isIncreasedUnprofitable = increasedUnitProfit <= 0;

  const priceIncreaseAmount = increasedPrice - currentPrice;
  const priceIncreaseRate = currentPrice > 0 ? (priceIncreaseAmount / currentPrice) * 100 : 0;

  const increasedRevenueAtCurrentQuantity = increasedPrice * currentQuantity;
  const increasedProfitAtCurrentQuantity = increasedUnitProfit * currentQuantity;
  const totalProfitIncrease = increasedProfitAtCurrentQuantity - currentTotalProfit;
  const totalProfitIncreaseRate =
    currentTotalProfit !== 0 ? (totalProfitIncrease / Math.abs(currentTotalProfit)) * 100 : null;

  let requiredQuantityForProfit: number | null = null;
  let allowedQuantityDecrease: number | null = null;
  let allowedQuantityDecreaseRate: number | null = null;
  let marginLevel: MarginLevel | null = null;

  if (!isCurrentlyUnprofitable && !isIncreasedUnprofitable) {
    requiredQuantityForProfit = Math.ceil(currentTotalProfit / increasedUnitProfit);
    allowedQuantityDecrease = Math.max(0, currentQuantity - requiredQuantityForProfit);
    allowedQuantityDecreaseRate = currentQuantity > 0 ? (allowedQuantityDecrease / currentQuantity) * 100 : null;
    marginLevel = allowedQuantityDecreaseRate !== null ? classifyMargin(allowedQuantityDecreaseRate) : null;
  }

  const requiredQuantityForRevenue = increasedPrice > 0 ? Math.ceil(currentRevenue / increasedPrice) : 0;
  const allowedQuantityDecreaseForRevenue = Math.max(0, currentQuantity - requiredQuantityForRevenue);
  const allowedQuantityDecreaseRateForRevenue =
    currentQuantity > 0 ? (allowedQuantityDecreaseForRevenue / currentQuantity) * 100 : null;

  return {
    currentUnitProfit,
    currentTotalProfit,
    currentRevenue,
    currentProfitRate,
    increasedUnitProfit,
    increasedProfitRate,
    profitRateChange,
    isCurrentlyUnprofitable,
    isIncreasedUnprofitable,
    priceIncreaseAmount,
    priceIncreaseRate,
    increasedRevenueAtCurrentQuantity,
    increasedProfitAtCurrentQuantity,
    totalProfitIncrease,
    totalProfitIncreaseRate,
    requiredQuantityForProfit,
    allowedQuantityDecrease,
    allowedQuantityDecreaseRate,
    marginLevel,
    requiredQuantityForRevenue,
    allowedQuantityDecreaseForRevenue,
    allowedQuantityDecreaseRateForRevenue,
  };
}

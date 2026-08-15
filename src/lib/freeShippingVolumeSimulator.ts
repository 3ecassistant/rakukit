import { DEFAULT_PROFIT_INPUTS, ProfitBreakdown, ProfitInputs, computeProfitBreakdown } from "./profitSimulator";

export interface FreeShippingInputs {
  productPrice: number;
  productCost: number;
  currentQuantity: number;
  actualShippingCost: number;
  customerShippingCharge: number;
  marketplaceCostRate: number;
}

export const DEFAULT_FREE_SHIPPING_INPUTS: FreeShippingInputs = {
  productPrice: 3980,
  productCost: 1500,
  currentQuantity: 100,
  actualShippingCost: 700,
  customerShippingCharge: 500,
  marketplaceCostRate: 8.5,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: FreeShippingInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.productPrice <= 0) issues.push({ field: "productPrice", message: "商品価格は1円以上を入力してください。" });
  if (inputs.productCost < 0) issues.push({ field: "productCost", message: "商品原価はマイナスにできません。" });
  if (inputs.currentQuantity <= 0) issues.push({ field: "currentQuantity", message: "現在販売数は1件以上を入力してください。" });
  if (inputs.actualShippingCost < 0) issues.push({ field: "actualShippingCost", message: "実配送コストはマイナスにできません。" });
  if (inputs.customerShippingCharge < 0) issues.push({ field: "customerShippingCharge", message: "現在顧客送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  return issues;
}

function toProfitInputs(sellingPrice: number, inputs: FreeShippingInputs): ProfitInputs {
  return {
    ...DEFAULT_PROFIT_INPUTS,
    sellingPrice,
    cost: inputs.productCost,
    shipping: inputs.actualShippingCost,
    otherCost: 0,
    pointRate: 0,
    couponDiscount: 0,
    marketplaceCostRate: inputs.marketplaceCostRate,
    adCostMode: "fixed",
    adCostFixed: 0,
    minProfitMode: "rate",
    minProfitRate: 0,
  };
}

export interface FreeShippingResult {
  currentBreakdown: ProfitBreakdown;
  freeShippingBreakdown: ProfitBreakdown;

  currentShippingBurden: number;
  freeShippingBurden: number;
  additionalShippingBurden: number;

  unitProfitDifference: number;
  currentTotalProfit: number;
  freeShippingTotalProfitAtCurrentVolume: number;
  totalProfitDifference: number;

  isAlreadyFreeShipping: boolean;
  isCurrentlyUnprofitable: boolean;
  isFreeShippingUnprofitable: boolean;
  isFreeShippingZero: boolean;

  requiredQuantity: number | null;
  additionalQuantity: number | null;
  requiredGrowthRate: number | null;

  requiredQuantityForRevenue: number;
  additionalQuantityForRevenue: number;
  requiredGrowthRateForRevenue: number | null;

  shippingRecoveryRate: number | null;
}

/**
 * 現在：商品価格＋顧客送料を売上とし、実配送コストは既に費用計上済み。
 * 送料無料後：商品価格のみを売上とし、実配送コストは変わらず費用計上する。
 * 「送料無料後だけ配送費を新規コストとして追加しない」（仕様書§77の最重要注意点）。
 */
export function computeFreeShippingResult(inputs: FreeShippingInputs): FreeShippingResult {
  const currentBreakdown = computeProfitBreakdown(
    toProfitInputs(inputs.productPrice + inputs.customerShippingCharge, inputs)
  );
  const freeShippingBreakdown = computeProfitBreakdown(toProfitInputs(inputs.productPrice, inputs));

  const currentShippingBurden = inputs.actualShippingCost - inputs.customerShippingCharge;
  const freeShippingBurden = inputs.actualShippingCost;
  const additionalShippingBurden = freeShippingBurden - currentShippingBurden;

  const unitProfitDifference = freeShippingBreakdown.profit - currentBreakdown.profit;
  const currentTotalProfit = currentBreakdown.profit * inputs.currentQuantity;
  const freeShippingTotalProfitAtCurrentVolume = freeShippingBreakdown.profit * inputs.currentQuantity;
  const totalProfitDifference = freeShippingTotalProfitAtCurrentVolume - currentTotalProfit;

  const isAlreadyFreeShipping = inputs.customerShippingCharge === 0;
  const isCurrentlyUnprofitable = currentBreakdown.profit <= 0;
  const isFreeShippingZero = freeShippingBreakdown.profit === 0;
  const isFreeShippingUnprofitable = freeShippingBreakdown.profit < 0;

  let requiredQuantity: number | null = null;
  let additionalQuantity: number | null = null;
  let requiredGrowthRate: number | null = null;

  if (!isCurrentlyUnprofitable && freeShippingBreakdown.profit > 0) {
    requiredQuantity = Math.ceil(currentTotalProfit / freeShippingBreakdown.profit);
    additionalQuantity = requiredQuantity - inputs.currentQuantity;
    requiredGrowthRate = inputs.currentQuantity > 0 ? (additionalQuantity / inputs.currentQuantity) * 100 : null;
  }

  const currentRevenueTotal = (inputs.productPrice + inputs.customerShippingCharge) * inputs.currentQuantity;
  const requiredQuantityForRevenue =
    inputs.productPrice > 0 ? Math.ceil(currentRevenueTotal / inputs.productPrice) : 0;
  const additionalQuantityForRevenue = requiredQuantityForRevenue - inputs.currentQuantity;
  const requiredGrowthRateForRevenue =
    inputs.currentQuantity > 0 ? (additionalQuantityForRevenue / inputs.currentQuantity) * 100 : null;

  const shippingRecoveryRate =
    inputs.actualShippingCost > 0 ? (inputs.customerShippingCharge / inputs.actualShippingCost) * 100 : null;

  return {
    currentBreakdown,
    freeShippingBreakdown,
    currentShippingBurden,
    freeShippingBurden,
    additionalShippingBurden,
    unitProfitDifference,
    currentTotalProfit,
    freeShippingTotalProfitAtCurrentVolume,
    totalProfitDifference,
    isAlreadyFreeShipping,
    isCurrentlyUnprofitable,
    isFreeShippingUnprofitable,
    isFreeShippingZero,
    requiredQuantity,
    additionalQuantity,
    requiredGrowthRate,
    requiredQuantityForRevenue,
    additionalQuantityForRevenue,
    requiredGrowthRateForRevenue,
    shippingRecoveryRate,
  };
}

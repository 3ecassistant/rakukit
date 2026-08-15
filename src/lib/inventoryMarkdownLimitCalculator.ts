import { DEFAULT_PROFIT_INPUTS, computeProfitBreakdown } from "./profitSimulator";

export type ProfitConditionMode = "allowable-loss" | "minimum-total";

export interface InventoryMarkdownInputs {
  currentInventory: number;
  currentPrice: number;
  cost: number;
  shipping: number;
  marketplaceCostRate: number;
  mode: ProfitConditionMode;
  /** mode === "allowable-loss" のとき使用 */
  allowableTotalProfitLoss: number;
  /** mode === "minimum-total" のとき使用 */
  minimumTotalProfit: number;
}

export const DEFAULT_INVENTORY_MARKDOWN_INPUTS: InventoryMarkdownInputs = {
  currentInventory: 300,
  currentPrice: 4980,
  cost: 2000,
  shipping: 600,
  marketplaceCostRate: 8.5,
  mode: "allowable-loss",
  allowableTotalProfitLoss: 100000,
  minimumTotalProfit: 500000,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: InventoryMarkdownInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.currentInventory <= 0) issues.push({ field: "currentInventory", message: "現在在庫数は1個以上を入力してください。" });
  if (inputs.currentPrice <= 0) issues.push({ field: "currentPrice", message: "現在販売価格は1円以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.mode === "allowable-loss" && inputs.allowableTotalProfitLoss < 0) {
    issues.push({ field: "allowableTotalProfitLoss", message: "許容利益減少額はマイナスにできません。" });
  }
  if (inputs.mode === "minimum-total" && inputs.minimumTotalProfit < 0) {
    issues.push({ field: "minimumTotalProfit", message: "最低確保総利益はマイナスにできません。" });
  }
  return issues;
}

export interface InventoryMarkdownResult {
  currentUnitProfit: number;
  currentTotalProfit: number;
  minimumRequiredTotalProfit: number;
  allowableProfitLossPerUnit: number;
  isConditionImpossibleAtCurrentPrice: boolean;
  minimumSellingPrice: number | null;
  maximumDiscountAmount: number | null;
  maximumDiscountRate: number | null;
}

/**
 * profit(price) = price(1-mr) - (cost+shipping) は価格に対して線形なので、
 * 「在庫全量をこの価格で販売した総利益 >= 最低確保総利益」を満たす最低価格を閉形式で厳密に求める。
 */
export function computeInventoryMarkdownLimit(inputs: InventoryMarkdownInputs): InventoryMarkdownResult {
  const profitInputs = {
    ...DEFAULT_PROFIT_INPUTS,
    sellingPrice: inputs.currentPrice,
    cost: inputs.cost,
    shipping: inputs.shipping,
    otherCost: 0,
    pointRate: 0,
    couponDiscount: 0,
    marketplaceCostRate: inputs.marketplaceCostRate,
    adCostMode: "fixed" as const,
    adCostFixed: 0,
    minProfitMode: "rate" as const,
    minProfitRate: 0,
  };
  const currentBreakdown = computeProfitBreakdown(profitInputs);
  const currentUnitProfit = currentBreakdown.profit;
  const currentTotalProfit = currentUnitProfit * inputs.currentInventory;

  const minimumRequiredTotalProfit =
    inputs.mode === "allowable-loss" ? currentTotalProfit - inputs.allowableTotalProfitLoss : inputs.minimumTotalProfit;

  const allowableProfitLossPerUnit = (currentTotalProfit - minimumRequiredTotalProfit) / inputs.currentInventory;

  const isConditionImpossibleAtCurrentPrice = currentTotalProfit < minimumRequiredTotalProfit;

  let minimumSellingPrice: number | null = null;
  let maximumDiscountAmount: number | null = null;
  let maximumDiscountRate: number | null = null;

  if (!isConditionImpossibleAtCurrentPrice) {
    const mr = inputs.marketplaceCostRate / 100;
    const minimumUnitProfit = minimumRequiredTotalProfit / inputs.currentInventory;
    const rawPrice = (minimumUnitProfit + inputs.cost + inputs.shipping) / (1 - mr);
    minimumSellingPrice = Math.max(0, Math.ceil(rawPrice));
    maximumDiscountAmount = Math.max(0, inputs.currentPrice - minimumSellingPrice);
    maximumDiscountRate = inputs.currentPrice > 0 ? (maximumDiscountAmount / inputs.currentPrice) * 100 : 0;
  }

  return {
    currentUnitProfit,
    currentTotalProfit,
    minimumRequiredTotalProfit,
    allowableProfitLossPerUnit,
    isConditionImpossibleAtCurrentPrice,
    minimumSellingPrice,
    maximumDiscountAmount,
    maximumDiscountRate,
  };
}

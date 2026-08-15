import {
  AdLimits,
  DEFAULT_PROFIT_INPUTS,
  ProfitBreakdown,
  ProfitInputs,
  computeAdLimits,
  computeProfitBreakdown,
} from "./profitSimulator";

export interface RppClickRunwayInputs {
  sellingPrice: number;
  cost: number;
  shipping: number;
  marketplaceCostRate: number;
  minProfitRate: number;
  currentAdCost: number;
  currentClicks: number;
  currentOrders: number;
  /** 任意入力。null なら 販売価格×注文数 から自動算出する。 */
  currentAdSales: number | null;
}

export const DEFAULT_RPP_CLICK_RUNWAY_INPUTS: RppClickRunwayInputs = {
  sellingPrice: 5000,
  cost: 1500,
  shipping: 600,
  marketplaceCostRate: 8.5,
  minProfitRate: 10,
  currentAdCost: 720,
  currentClicks: 24,
  currentOrders: 0,
  currentAdSales: null,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: RppClickRunwayInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.sellingPrice <= 0) issues.push({ field: "sellingPrice", message: "販売価格は1円以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.minProfitRate < 0 || inputs.minProfitRate >= 100) {
    issues.push({ field: "minProfitRate", message: "最低利益率は0〜100%未満で入力してください。" });
  }
  if (inputs.currentAdCost < 0) issues.push({ field: "currentAdCost", message: "現在広告費はマイナスにできません。" });
  if (inputs.currentClicks <= 0) issues.push({ field: "currentClicks", message: "現在クリック数は1以上を入力してください。" });
  if (inputs.currentOrders < 0) issues.push({ field: "currentOrders", message: "現在注文数はマイナスにできません。" });
  if (inputs.currentOrders > inputs.currentClicks) {
    issues.push({ field: "currentOrders", message: "現在注文数がクリック数を超えています。" });
  }
  if (inputs.currentAdSales !== null && inputs.currentAdSales < 0) {
    issues.push({ field: "currentAdSales", message: "現在広告売上はマイナスにできません。" });
  }
  return issues;
}

export type RunwayStatus = "within-target" | "profitable-below-target" | "over-break-even" | "already-deficit-before-ads";

function toProfitInputs(inputs: RppClickRunwayInputs): ProfitInputs {
  return {
    ...DEFAULT_PROFIT_INPUTS,
    sellingPrice: inputs.sellingPrice,
    cost: inputs.cost,
    shipping: inputs.shipping,
    otherCost: 0,
    pointRate: 0,
    couponDiscount: 0,
    marketplaceCostRate: inputs.marketplaceCostRate,
    adCostMode: "fixed",
    adCostFixed: 0,
    minProfitMode: "rate",
    minProfitRate: inputs.minProfitRate,
  };
}

export interface RppClickRunwayResult {
  breakdown: ProfitBreakdown;
  adLimits: AdLimits;

  preAdProfit: number;
  minimumProfitAmount: number;
  targetCpaLimit: number | null;
  breakEvenCpa: number | null;

  averageCpc: number;

  /** 次の1件（現在注文数+1件目）獲得までの累計広告費上限 */
  targetCumulativeAdLimit: number | null;
  breakEvenCumulativeAdLimit: number | null;

  remainingTargetBudget: number | null;
  remainingBreakEvenBudget: number | null;
  remainingTargetClicks: number | null;
  remainingBreakEvenClicks: number | null;
  targetOverflowAmount: number | null;
  breakEvenOverflowAmount: number | null;

  currentCvr: number;
  currentCpa: number | null;
  currentAdSales: number;
  currentRoas: number;

  status: RunwayStatus;
}

/**
 * 「次の1注文モード」（仕様書㉜）：現在注文数+1件目を獲得するまでの累計広告費上限を、
 * CPA上限 ×（現在注文数＋1）として算出し、現在広告費との差を平均CPCで割って残りクリック数を求める。
 * 許容クリック数は必要販売数（切り上げ）とは逆に、上限を超えないよう必ず切り捨てる（仕様書㉗）。
 */
export function computeRppClickRunway(inputs: RppClickRunwayInputs): RppClickRunwayResult {
  const profitInputs = toProfitInputs(inputs);
  const breakdown = computeProfitBreakdown(profitInputs);
  const adLimits = computeAdLimits(profitInputs, breakdown);

  const preAdProfit = breakdown.profitBeforeAds;
  const minimumProfitAmount = breakdown.actualSellingPrice * (inputs.minProfitRate / 100);
  const targetCpaLimit = adLimits.maxAdCostForTarget !== null ? Math.max(0, adLimits.maxAdCostForTarget) : adLimits.alreadyUnprofitableBeforeAds ? null : 0;
  const breakEvenCpa = adLimits.maxAdCost;

  const averageCpc = inputs.currentAdCost / inputs.currentClicks;

  const nextOrderNumber = inputs.currentOrders + 1;

  let targetCumulativeAdLimit: number | null = null;
  let breakEvenCumulativeAdLimit: number | null = null;
  let remainingTargetBudget: number | null = null;
  let remainingBreakEvenBudget: number | null = null;
  let remainingTargetClicks: number | null = null;
  let remainingBreakEvenClicks: number | null = null;
  let targetOverflowAmount: number | null = null;
  let breakEvenOverflowAmount: number | null = null;

  if (!adLimits.alreadyUnprofitableBeforeAds) {
    targetCumulativeAdLimit = (targetCpaLimit ?? 0) * nextOrderNumber;
    breakEvenCumulativeAdLimit = (breakEvenCpa ?? 0) * nextOrderNumber;

    remainingTargetBudget = targetCumulativeAdLimit - inputs.currentAdCost;
    remainingBreakEvenBudget = breakEvenCumulativeAdLimit - inputs.currentAdCost;

    remainingTargetClicks = Math.max(0, Math.floor(remainingTargetBudget / averageCpc));
    remainingBreakEvenClicks = Math.max(0, Math.floor(remainingBreakEvenBudget / averageCpc));

    targetOverflowAmount = remainingTargetBudget < 0 ? -remainingTargetBudget : null;
    breakEvenOverflowAmount = remainingBreakEvenBudget < 0 ? -remainingBreakEvenBudget : null;
  }

  const currentCvr = (inputs.currentOrders / inputs.currentClicks) * 100;
  const currentCpa = inputs.currentOrders > 0 ? inputs.currentAdCost / inputs.currentOrders : null;
  const currentAdSales = inputs.currentAdSales ?? inputs.sellingPrice * inputs.currentOrders;
  const currentRoas = inputs.currentAdCost > 0 ? (currentAdSales / inputs.currentAdCost) * 100 : 0;

  let status: RunwayStatus;
  if (adLimits.alreadyUnprofitableBeforeAds) {
    status = "already-deficit-before-ads";
  } else if (remainingTargetBudget !== null && remainingTargetBudget >= 0) {
    status = "within-target";
  } else if (remainingBreakEvenBudget !== null && remainingBreakEvenBudget >= 0) {
    status = "profitable-below-target";
  } else {
    status = "over-break-even";
  }

  return {
    breakdown,
    adLimits,
    preAdProfit,
    minimumProfitAmount,
    targetCpaLimit,
    breakEvenCpa,
    averageCpc,
    targetCumulativeAdLimit,
    breakEvenCumulativeAdLimit,
    remainingTargetBudget,
    remainingBreakEvenBudget,
    remainingTargetClicks,
    remainingBreakEvenClicks,
    targetOverflowAmount,
    breakEvenOverflowAmount,
    currentCvr,
    currentCpa,
    currentAdSales,
    currentRoas,
    status,
  };
}

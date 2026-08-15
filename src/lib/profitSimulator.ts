export type AdCostMode = "fixed" | "roas";
export type MinProfitMode = "rate" | "amount";

export interface ProfitInputs {
  sellingPrice: number;
  cost: number;
  shipping: number;
  otherCost: number;
  pointRate: number;
  couponDiscount: number;
  marketplaceCostRate: number;
  adCostMode: AdCostMode;
  adCostFixed: number;
  adRoas: number;
  minProfitMode: MinProfitMode;
  minProfitRate: number;
  minProfitAmount: number;
}

export const DEFAULT_PROFIT_INPUTS: ProfitInputs = {
  sellingPrice: 4980,
  cost: 1500,
  shipping: 600,
  otherCost: 0,
  pointRate: 1,
  couponDiscount: 0,
  marketplaceCostRate: 0,
  adCostMode: "fixed",
  adCostFixed: 400,
  adRoas: 500,
  minProfitMode: "rate",
  minProfitRate: 10,
  minProfitAmount: 500,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: ProfitInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.sellingPrice <= 0) issues.push({ field: "sellingPrice", message: "販売価格は1円以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.otherCost < 0) issues.push({ field: "otherCost", message: "その他原価はマイナスにできません。" });
  if (inputs.couponDiscount < 0) issues.push({ field: "couponDiscount", message: "クーポン額はマイナスにできません。" });
  if (inputs.couponDiscount >= inputs.sellingPrice) {
    issues.push({ field: "couponDiscount", message: "クーポン金額が販売価格を超えています。" });
  }
  if (inputs.pointRate < 0 || inputs.pointRate >= 100) {
    issues.push({ field: "pointRate", message: "ポイント負担率は0〜100%未満で入力してください。" });
  }
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.adCostMode === "roas" && inputs.adRoas <= 0) {
    issues.push({ field: "adRoas", message: "ROASは1%以上を入力してください。" });
  }
  if (inputs.adCostMode === "fixed" && inputs.adCostFixed < 0) {
    issues.push({ field: "adCostFixed", message: "広告費はマイナスにできません。" });
  }
  return issues;
}

export interface ProfitBreakdown {
  displayPrice: number;
  actualSellingPrice: number;
  cost: number;
  shipping: number;
  otherCost: number;
  pointCost: number;
  marketplaceCost: number;
  adCost: number;
  profitBeforeAds: number;
  profit: number;
  profitRate: number | null;
  costRatios: {
    cost: number;
    shipping: number;
    otherCost: number;
    pointCost: number;
    marketplaceCost: number;
    adCost: number;
    profit: number;
  };
}

export function calcActualSellingPrice(sellingPrice: number, couponDiscount: number): number {
  return Math.max(0, sellingPrice - couponDiscount);
}

export function calcAdCost(actualSellingPrice: number, inputs: ProfitInputs): number {
  if (inputs.adCostMode === "fixed") return inputs.adCostFixed;
  if (inputs.adRoas <= 0) return 0;
  return (actualSellingPrice * 100) / inputs.adRoas;
}

export function computeProfitBreakdown(inputs: ProfitInputs): ProfitBreakdown {
  const actualSellingPrice = calcActualSellingPrice(inputs.sellingPrice, inputs.couponDiscount);
  const pointCost = actualSellingPrice * (inputs.pointRate / 100);
  const marketplaceCost = actualSellingPrice * (inputs.marketplaceCostRate / 100);
  const adCost = calcAdCost(actualSellingPrice, inputs);

  const profitBeforeAds = actualSellingPrice - inputs.cost - inputs.shipping - inputs.otherCost - pointCost - marketplaceCost;
  const profit = profitBeforeAds - adCost;
  const profitRate = actualSellingPrice > 0 ? (profit / actualSellingPrice) * 100 : null;

  const base = actualSellingPrice > 0 ? actualSellingPrice : 1;
  return {
    displayPrice: inputs.sellingPrice,
    actualSellingPrice,
    cost: inputs.cost,
    shipping: inputs.shipping,
    otherCost: inputs.otherCost,
    pointCost,
    marketplaceCost,
    adCost,
    profitBeforeAds,
    profit,
    profitRate,
    costRatios: {
      cost: (inputs.cost / base) * 100,
      shipping: (inputs.shipping / base) * 100,
      otherCost: (inputs.otherCost / base) * 100,
      pointCost: (pointCost / base) * 100,
      marketplaceCost: (marketplaceCost / base) * 100,
      adCost: (adCost / base) * 100,
      profit: (profit / base) * 100,
    },
  };
}

export interface AdLimits {
  maxAdCost: number | null;
  breakEvenRoas: number | null;
  alreadyUnprofitableBeforeAds: boolean;
  maxAdCostForTarget: number | null;
  targetRoas: number | null;
}

function requiredProfitAmount(actualSellingPrice: number, inputs: ProfitInputs): number {
  if (inputs.minProfitMode === "amount") return inputs.minProfitAmount;
  return actualSellingPrice * (inputs.minProfitRate / 100);
}

export function computeAdLimits(inputs: ProfitInputs, breakdown: ProfitBreakdown): AdLimits {
  const { actualSellingPrice, profitBeforeAds } = breakdown;
  const alreadyUnprofitableBeforeAds = profitBeforeAds <= 0;

  const maxAdCost = alreadyUnprofitableBeforeAds ? 0 : profitBeforeAds;
  const breakEvenRoas =
    !alreadyUnprofitableBeforeAds && maxAdCost > 0 ? (actualSellingPrice / maxAdCost) * 100 : null;

  const required = requiredProfitAmount(actualSellingPrice, inputs);
  const maxAdCostForTarget = profitBeforeAds - required;
  const targetRoas = maxAdCostForTarget > 0 ? (actualSellingPrice / maxAdCostForTarget) * 100 : null;

  return {
    maxAdCost: alreadyUnprofitableBeforeAds ? null : maxAdCost,
    breakEvenRoas,
    alreadyUnprofitableBeforeAds,
    maxAdCostForTarget: maxAdCostForTarget > 0 ? maxAdCostForTarget : null,
    targetRoas,
  };
}

export type RoasJudgement = "good" | "caution" | "danger";

export function judgeRoas(currentRoas: number | null, breakEvenRoas: number | null, targetRoas: number | null): RoasJudgement {
  if (currentRoas === null) return "caution";
  if (targetRoas !== null && currentRoas >= targetRoas) return "good";
  if (breakEvenRoas !== null && currentRoas > breakEvenRoas) return "caution";
  return "danger";
}

/**
 * 元の販売価格から一律の値引額を適用した場合の利益を計算する。
 * 比率型コスト（ポイント・販売関連費・ROAS広告費）は値引後の実売価格を基準に再計算する。
 */
function profitAtDiscount(discountAmount: number, inputs: ProfitInputs): number {
  const testInputs: ProfitInputs = { ...inputs, couponDiscount: discountAmount };
  return computeProfitBreakdown(testInputs).profit;
}

export interface MaxDiscountResult {
  maxDiscountAmount: number | null;
  maxDiscountRate: number | null;
  alreadyBelowTarget: boolean;
}

/** 二分探索で「利益が targetProfit を下回る直前」の値引額を求める。 */
function searchMaxDiscount(inputs: ProfitInputs, targetProfitFn: (discount: number) => number): number {
  let low = 0;
  let high = inputs.sellingPrice;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (targetProfitFn(mid) >= 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

export function computeMaxDiscount(inputs: ProfitInputs): MaxDiscountResult {
  const profitAtZeroDiscount = profitAtDiscount(0, inputs);
  if (profitAtZeroDiscount < 0) {
    return { maxDiscountAmount: 0, maxDiscountRate: 0, alreadyBelowTarget: true };
  }
  const maxDiscountAmount = searchMaxDiscount(inputs, (d) => profitAtDiscount(d, inputs));
  return {
    maxDiscountAmount,
    maxDiscountRate: (maxDiscountAmount / inputs.sellingPrice) * 100,
    alreadyBelowTarget: false,
  };
}

export function computeMaxDiscountForTarget(inputs: ProfitInputs): MaxDiscountResult {
  const requiredAtZero = requiredProfitAmount(calcActualSellingPrice(inputs.sellingPrice, 0), inputs);
  const profitAtZeroDiscount = profitAtDiscount(0, inputs);
  if (profitAtZeroDiscount < requiredAtZero) {
    return { maxDiscountAmount: 0, maxDiscountRate: 0, alreadyBelowTarget: true };
  }
  const maxDiscountAmount = searchMaxDiscount(inputs, (d) => {
    const actualPrice = calcActualSellingPrice(inputs.sellingPrice, d);
    const required = requiredProfitAmount(actualPrice, inputs);
    return profitAtDiscount(d, inputs) - required;
  });
  return {
    maxDiscountAmount,
    maxDiscountRate: (maxDiscountAmount / inputs.sellingPrice) * 100,
    alreadyBelowTarget: false,
  };
}

import {
  AdLimits,
  DEFAULT_PROFIT_INPUTS,
  ProfitBreakdown,
  ProfitInputs,
  computeAdLimits,
  computeProfitBreakdown,
} from "./profitSimulator";

export interface RequiredCvrInputs {
  sellingPrice: number;
  cpc: number;
  cost: number;
  shipping: number;
  marketplaceCostRate: number;
  minProfitRate: number;
  /** 任意入力。null なら未入力扱い。 */
  currentCvr: number | null;
}

export const DEFAULT_REQUIRED_CVR_INPUTS: RequiredCvrInputs = {
  sellingPrice: 5000,
  cpc: 30,
  cost: 1500,
  shipping: 600,
  marketplaceCostRate: 8.5,
  minProfitRate: 10,
  currentCvr: 1.8,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: RequiredCvrInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.sellingPrice <= 0) issues.push({ field: "sellingPrice", message: "販売価格は1円以上を入力してください。" });
  if (inputs.cpc <= 0) issues.push({ field: "cpc", message: "CPCは1円以上を入力してください。" });
  if (inputs.cost < 0) issues.push({ field: "cost", message: "商品原価はマイナスにできません。" });
  if (inputs.shipping < 0) issues.push({ field: "shipping", message: "送料はマイナスにできません。" });
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.minProfitRate < 0 || inputs.minProfitRate >= 100) {
    issues.push({ field: "minProfitRate", message: "最低利益率は0〜100%未満で入力してください。" });
  }
  if (inputs.currentCvr !== null && (inputs.currentCvr < 0 || inputs.currentCvr > 100)) {
    issues.push({ field: "currentCvr", message: "現在CVRは0〜100%で入力してください。" });
  }
  return issues;
}

export type RequiredCvrStatus =
  | "achieved"
  | "profitable-below-target"
  | "deficit"
  | "no-current-cvr"
  | "unreachable"
  | "already-deficit-before-ads";

function toProfitInputs(inputs: RequiredCvrInputs): ProfitInputs {
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

export interface RequiredCvrResult {
  breakdown: ProfitBreakdown;
  adLimits: AdLimits;

  preAdProfit: number;
  minimumProfitAmount: number;

  /** 損益分岐CPA（利益0円になる広告費上限）。商品採算自体が赤字の場合はnull。 */
  breakEvenCpa: number | null;
  /** 最低利益率を維持できるCPA上限。 */
  maxCpa: number | null;

  breakEvenCvr: number | null;
  requiredCvr: number | null;
  requiredCvrExceeds100: boolean;

  currentEstimatedCpa: number | null;
  currentEstimatedRoas: number | null;
  requiredRoas: number | null;
  breakEvenRoas: number | null;

  cvrGapPt: number | null;
  cvrImprovementRate: number | null;
  maxCpcAtCurrentCvr: number | null;

  status: RequiredCvrStatus;
}

/**
 * CPA上限・損益分岐CPAは既存 computeAdLimits をそのまま流用する。
 * CVRはCPC/CPAの単純な比なので、CPA上限をCVRへ変換するだけで求まる（必要CVR = CPC ÷ CPA上限）。
 */
export function computeRequiredCvr(inputs: RequiredCvrInputs): RequiredCvrResult {
  const profitInputs = toProfitInputs(inputs);
  const breakdown = computeProfitBreakdown(profitInputs);
  const adLimits = computeAdLimits(profitInputs, breakdown);

  const preAdProfit = breakdown.profitBeforeAds;
  const minimumProfitAmount = breakdown.actualSellingPrice * (inputs.minProfitRate / 100);

  const breakEvenCpa = adLimits.maxAdCost;
  const maxCpa = adLimits.maxAdCostForTarget;

  const breakEvenCvr = breakEvenCpa !== null && breakEvenCpa > 0 ? (inputs.cpc / breakEvenCpa) * 100 : null;
  const requiredCvrRaw = maxCpa !== null && maxCpa > 0 ? (inputs.cpc / maxCpa) * 100 : null;
  const requiredCvr = requiredCvrRaw;
  const requiredCvrExceeds100 = requiredCvr !== null && requiredCvr > 100;

  const currentEstimatedCpa =
    inputs.currentCvr !== null && inputs.currentCvr > 0 ? inputs.cpc / (inputs.currentCvr / 100) : null;
  const currentEstimatedRoas =
    currentEstimatedCpa !== null && currentEstimatedCpa > 0
      ? (breakdown.actualSellingPrice / currentEstimatedCpa) * 100
      : null;

  const requiredRoas = adLimits.targetRoas;
  const breakEvenRoas = adLimits.breakEvenRoas;

  const cvrGapPt = inputs.currentCvr !== null && requiredCvr !== null ? requiredCvr - inputs.currentCvr : null;
  const cvrImprovementRate =
    cvrGapPt !== null && inputs.currentCvr !== null && inputs.currentCvr > 0 ? (cvrGapPt / inputs.currentCvr) * 100 : null;
  const maxCpcAtCurrentCvr =
    inputs.currentCvr !== null && maxCpa !== null ? maxCpa * (inputs.currentCvr / 100) : null;

  let status: RequiredCvrStatus;
  if (adLimits.alreadyUnprofitableBeforeAds) {
    status = "already-deficit-before-ads";
  } else if (maxCpa === null || requiredCvr === null) {
    status = "unreachable";
  } else if (inputs.currentCvr === null) {
    status = "no-current-cvr";
  } else if (inputs.currentCvr >= requiredCvr) {
    status = "achieved";
  } else if (breakEvenCvr !== null && inputs.currentCvr >= breakEvenCvr) {
    status = "profitable-below-target";
  } else {
    status = "deficit";
  }

  return {
    breakdown,
    adLimits,
    preAdProfit,
    minimumProfitAmount,
    breakEvenCpa,
    maxCpa,
    breakEvenCvr,
    requiredCvr,
    requiredCvrExceeds100,
    currentEstimatedCpa,
    currentEstimatedRoas,
    requiredRoas,
    breakEvenRoas,
    cvrGapPt,
    cvrImprovementRate,
    maxCpcAtCurrentCvr,
    status,
  };
}

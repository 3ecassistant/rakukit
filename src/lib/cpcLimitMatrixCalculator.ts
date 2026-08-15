import {
  AdLimits,
  DEFAULT_PROFIT_INPUTS,
  ProfitBreakdown,
  ProfitInputs,
  computeAdLimits,
  computeProfitBreakdown,
} from "./profitSimulator";

export interface CpcLimitInputs {
  sellingPrice: number;
  cost: number;
  shipping: number;
  marketplaceCostRate: number;
  minProfitRate: number;
  /** 任意入力。null なら未入力扱い。 */
  currentCvr: number | null;
  currentCpc: number | null;
}

export const DEFAULT_CPC_LIMIT_INPUTS: CpcLimitInputs = {
  sellingPrice: 5000,
  cost: 1500,
  shipping: 600,
  marketplaceCostRate: 8.5,
  minProfitRate: 10,
  currentCvr: 2.2,
  currentCpc: 30,
};

export const CVR_STEPS = [1, 2, 3, 4, 5];

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: CpcLimitInputs): ValidationIssue[] {
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
  if (inputs.currentCvr !== null && (inputs.currentCvr < 0 || inputs.currentCvr > 100)) {
    issues.push({ field: "currentCvr", message: "現在CVRは0〜100%で入力してください。" });
  }
  if (inputs.currentCpc !== null && inputs.currentCpc < 0) {
    issues.push({ field: "currentCpc", message: "現在CPCはマイナスにできません。" });
  }
  return issues;
}

export type CpcLimitStatus =
  | "achieved"
  | "profitable-below-target"
  | "deficit"
  | "no-current-values"
  | "unreachable"
  | "already-deficit-before-ads";

function toProfitInputs(inputs: CpcLimitInputs): ProfitInputs {
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

export interface MatrixRow {
  cvr: number;
  targetProfitCpcLimit: number | null;
  breakEvenCpcLimit: number | null;
  isCurrentRow: boolean;
}

export interface CpcLimitResult {
  breakdown: ProfitBreakdown;
  adLimits: AdLimits;

  preAdProfit: number;
  minimumProfitAmount: number;
  maxCpa: number | null;
  breakEvenCpa: number | null;
  requiredRoas: number | null;
  breakEvenRoas: number | null;

  matrixRows: MatrixRow[];

  currentCpcLimit: number | null;
  breakEvenCpcAtCurrentCvr: number | null;
  cpcGap: number | null;
  requiredCvrAtCurrentCpc: number | null;
  currentEstimatedCpa: number | null;
  currentEstimatedRoas: number | null;

  status: CpcLimitStatus;
}

/**
 * CPC上限 = CPA上限 × CVR（RPP必要CVRシミュレーターの逆方向）。
 * CPA上限・損益分岐CPAはRequiredCvrCalculatorと同じ computeAdLimits をそのまま流用する。
 */
export function computeCpcLimitMatrix(inputs: CpcLimitInputs): CpcLimitResult {
  const profitInputs = toProfitInputs(inputs);
  const breakdown = computeProfitBreakdown(profitInputs);
  const adLimits = computeAdLimits(profitInputs, breakdown);

  const preAdProfit = breakdown.profitBeforeAds;
  const minimumProfitAmount = breakdown.actualSellingPrice * (inputs.minProfitRate / 100);
  const maxCpa = adLimits.maxAdCostForTarget;
  const breakEvenCpa = adLimits.maxAdCost;
  const requiredRoas = adLimits.targetRoas;
  const breakEvenRoas = adLimits.breakEvenRoas;

  const matrixRows: MatrixRow[] = CVR_STEPS.map((cvr) => ({
    cvr,
    targetProfitCpcLimit: maxCpa !== null ? maxCpa * (cvr / 100) : null,
    breakEvenCpcLimit: breakEvenCpa !== null ? breakEvenCpa * (cvr / 100) : null,
    isCurrentRow: inputs.currentCvr !== null && Math.abs(inputs.currentCvr - cvr) < 0.001,
  }));

  const currentCpcLimit =
    inputs.currentCvr !== null && maxCpa !== null ? maxCpa * (inputs.currentCvr / 100) : null;
  const breakEvenCpcAtCurrentCvr =
    inputs.currentCvr !== null && breakEvenCpa !== null ? breakEvenCpa * (inputs.currentCvr / 100) : null;
  const cpcGap =
    inputs.currentCpc !== null && currentCpcLimit !== null ? inputs.currentCpc - currentCpcLimit : null;
  const requiredCvrAtCurrentCpc =
    inputs.currentCpc !== null && maxCpa !== null && maxCpa > 0 ? (inputs.currentCpc / maxCpa) * 100 : null;
  const currentEstimatedCpa =
    inputs.currentCpc !== null && inputs.currentCvr !== null && inputs.currentCvr > 0
      ? inputs.currentCpc / (inputs.currentCvr / 100)
      : null;
  const currentEstimatedRoas =
    currentEstimatedCpa !== null && currentEstimatedCpa > 0
      ? (breakdown.actualSellingPrice / currentEstimatedCpa) * 100
      : null;

  let status: CpcLimitStatus;
  if (adLimits.alreadyUnprofitableBeforeAds) {
    status = "already-deficit-before-ads";
  } else if (maxCpa === null) {
    status = "unreachable";
  } else if (inputs.currentCvr === null || inputs.currentCpc === null) {
    status = "no-current-values";
  } else if (currentCpcLimit !== null && inputs.currentCpc <= currentCpcLimit) {
    status = "achieved";
  } else if (breakEvenCpcAtCurrentCvr !== null && inputs.currentCpc <= breakEvenCpcAtCurrentCvr) {
    status = "profitable-below-target";
  } else {
    status = "deficit";
  }

  return {
    breakdown,
    adLimits,
    preAdProfit,
    minimumProfitAmount,
    maxCpa,
    breakEvenCpa,
    requiredRoas,
    breakEvenRoas,
    matrixRows,
    currentCpcLimit,
    breakEvenCpcAtCurrentCvr,
    cpcGap,
    requiredCvrAtCurrentCpc,
    currentEstimatedCpa,
    currentEstimatedRoas,
    status,
  };
}

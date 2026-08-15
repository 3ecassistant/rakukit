export type ProfitTargetMode = "margin" | "unit-profit";

export interface ProfitTargetInputs {
  targetProfit: number;
  mode: ProfitTargetMode;
  profitMarginRate: number;
  unitProfit: number;
  hasCurrentProfit: boolean;
  currentProfit: number;
}

export const DEFAULT_PROFIT_TARGET_INPUTS: ProfitTargetInputs = {
  targetProfit: 1000000,
  mode: "margin",
  profitMarginRate: 20,
  unitProfit: 1200,
  hasCurrentProfit: true,
  currentProfit: 600000,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: ProfitTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.targetProfit <= 0) issues.push({ field: "targetProfit", message: "利益目標は1円以上を入力してください。" });
  if (inputs.mode === "margin" && (inputs.profitMarginRate < 0 || inputs.profitMarginRate > 100)) {
    issues.push({ field: "profitMarginRate", message: "利益率は0〜100%で入力してください。" });
  }
  return issues;
}

export interface ProfitTargetResult {
  remainingProfit: number;
  isTargetAlreadyMet: boolean;
  profitSurplus: number;
  profitProgressRate: number | null;
  isReachable: boolean;
  requiredSales: number | null;
  additionalSalesNeeded: number | null;
  requiredQuantity: number | null;
  additionalQuantityNeeded: number | null;
  profitAboveTarget: number | null;
}

export function computeProfitTarget(inputs: ProfitTargetInputs): ProfitTargetResult {
  const currentProfit = inputs.hasCurrentProfit ? inputs.currentProfit : 0;
  const remainingProfitRaw = inputs.targetProfit - currentProfit;
  const remainingProfit = Math.max(0, remainingProfitRaw);
  const isTargetAlreadyMet = inputs.hasCurrentProfit && remainingProfitRaw <= 0;
  const profitSurplus = inputs.hasCurrentProfit ? Math.max(0, -remainingProfitRaw) : 0;
  const profitProgressRate = inputs.hasCurrentProfit ? (currentProfit / inputs.targetProfit) * 100 : null;

  let isReachable: boolean;
  let requiredSales: number | null = null;
  let additionalSalesNeeded: number | null = null;
  let requiredQuantity: number | null = null;
  let additionalQuantityNeeded: number | null = null;
  let profitAboveTarget: number | null = null;

  if (inputs.mode === "margin") {
    isReachable = inputs.profitMarginRate > 0;
    if (isReachable) {
      const marginDecimal = inputs.profitMarginRate / 100;
      requiredSales = inputs.targetProfit / marginDecimal;
      additionalSalesNeeded = isTargetAlreadyMet ? 0 : remainingProfit / marginDecimal;
    }
  } else {
    isReachable = inputs.unitProfit > 0;
    if (isReachable) {
      requiredQuantity = Math.ceil(inputs.targetProfit / inputs.unitProfit);
      additionalQuantityNeeded = isTargetAlreadyMet ? 0 : Math.ceil(remainingProfit / inputs.unitProfit);
      profitAboveTarget = requiredQuantity * inputs.unitProfit - inputs.targetProfit;
    }
  }

  return {
    remainingProfit,
    isTargetAlreadyMet,
    profitSurplus,
    profitProgressRate,
    isReachable,
    requiredSales,
    additionalSalesNeeded,
    requiredQuantity,
    additionalQuantityNeeded,
    profitAboveTarget,
  };
}

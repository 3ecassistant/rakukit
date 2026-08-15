export interface FixedCostBreakEvenInputs {
  fixedCost: number;
  contributionMarginPerUnit: number;
  hasCurrentQuantity: boolean;
  currentQuantity: number;
}

export const DEFAULT_FIXED_COST_BREAK_EVEN_INPUTS: FixedCostBreakEvenInputs = {
  fixedCost: 500000,
  contributionMarginPerUnit: 1500,
  hasCurrentQuantity: true,
  currentQuantity: 200,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: FixedCostBreakEvenInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.fixedCost <= 0) issues.push({ field: "fixedCost", message: "固定費は1円以上を入力してください。" });
  if (inputs.hasCurrentQuantity && (!Number.isInteger(inputs.currentQuantity) || inputs.currentQuantity < 0)) {
    issues.push({ field: "currentQuantity", message: "現在販売数は0以上の整数で入力してください。" });
  }
  return issues;
}

export interface FixedCostBreakEvenResult {
  isReachable: boolean;
  requiredQuantity: number | null;
  breakEvenSurplus: number | null;
  recoveredAmount: number | null;
  remainingFixedCost: number | null;
  additionalQuantityNeeded: number | null;
  recoveryRate: number | null;
  profitAfterFixedCost: number | null;
  isBreakEvenReached: boolean;
}

export function computeFixedCostBreakEven(inputs: FixedCostBreakEvenInputs): FixedCostBreakEvenResult {
  const isReachable = inputs.contributionMarginPerUnit > 0;

  if (!isReachable) {
    return {
      isReachable: false,
      requiredQuantity: null,
      breakEvenSurplus: null,
      recoveredAmount: null,
      remainingFixedCost: null,
      additionalQuantityNeeded: null,
      recoveryRate: null,
      profitAfterFixedCost: null,
      isBreakEvenReached: false,
    };
  }

  const requiredQuantity = Math.ceil(inputs.fixedCost / inputs.contributionMarginPerUnit);
  const breakEvenSurplus = requiredQuantity * inputs.contributionMarginPerUnit - inputs.fixedCost;

  let recoveredAmount: number | null = null;
  let remainingFixedCost: number | null = null;
  let additionalQuantityNeeded: number | null = null;
  let recoveryRate: number | null = null;
  let profitAfterFixedCost: number | null = null;
  let isBreakEvenReached = false;

  if (inputs.hasCurrentQuantity) {
    recoveredAmount = inputs.currentQuantity * inputs.contributionMarginPerUnit;
    remainingFixedCost = Math.max(0, inputs.fixedCost - recoveredAmount);
    additionalQuantityNeeded = Math.max(0, requiredQuantity - inputs.currentQuantity);
    recoveryRate = (recoveredAmount / inputs.fixedCost) * 100;
    profitAfterFixedCost = recoveredAmount - inputs.fixedCost;
    isBreakEvenReached = inputs.currentQuantity >= requiredQuantity;
  }

  return {
    isReachable: true,
    requiredQuantity,
    breakEvenSurplus,
    recoveredAmount,
    remainingFixedCost,
    additionalQuantityNeeded,
    recoveryRate,
    profitAfterFixedCost,
    isBreakEvenReached,
  };
}

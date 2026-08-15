export interface FreeShippingThresholdAovInputs {
  currentAov: number;
  targetThreshold: number;
  currentThreshold: number | null;
}

export const DEFAULT_FREE_SHIPPING_THRESHOLD_AOV_INPUTS: FreeShippingThresholdAovInputs = {
  currentAov: 3800,
  targetThreshold: 5000,
  currentThreshold: 3980,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: FreeShippingThresholdAovInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.currentAov <= 0) issues.push({ field: "currentAov", message: "現在客単価は1円以上を入力してください。" });
  if (inputs.targetThreshold <= 0) issues.push({ field: "targetThreshold", message: "送料無料ラインは1円以上を入力してください。" });
  if (inputs.currentThreshold !== null && inputs.currentThreshold <= 0) {
    issues.push({ field: "currentThreshold", message: "現在の送料無料ラインは1円以上を入力してください。" });
  }
  return issues;
}

export interface FreeShippingThresholdAovResult {
  requiredAov: number;
  requiredAovIncrease: number;
  requiredAovGrowthRate: number | null;
  isCurrentAovAboveThreshold: boolean;
  isCurrentAovEqualThreshold: boolean;
  marginAboveThreshold: number;
  thresholdDifference: number | null;
  thresholdChangeRate: number | null;
}

export function computeFreeShippingThresholdAov(inputs: FreeShippingThresholdAovInputs): FreeShippingThresholdAovResult {
  const requiredAov = inputs.targetThreshold;
  const isCurrentAovAboveThreshold = inputs.currentAov > inputs.targetThreshold;
  const isCurrentAovEqualThreshold = inputs.currentAov === inputs.targetThreshold;

  const requiredAovIncrease = Math.max(0, inputs.targetThreshold - inputs.currentAov);
  const requiredAovGrowthRate = requiredAovIncrease > 0 ? (requiredAovIncrease / inputs.currentAov) * 100 : null;
  const marginAboveThreshold = isCurrentAovAboveThreshold ? inputs.currentAov - inputs.targetThreshold : 0;

  const thresholdDifference = inputs.currentThreshold !== null ? inputs.targetThreshold - inputs.currentThreshold : null;
  const thresholdChangeRate =
    thresholdDifference !== null && inputs.currentThreshold !== null && inputs.currentThreshold > 0
      ? (thresholdDifference / inputs.currentThreshold) * 100
      : null;

  return {
    requiredAov,
    requiredAovIncrease,
    requiredAovGrowthRate,
    isCurrentAovAboveThreshold,
    isCurrentAovEqualThreshold,
    marginAboveThreshold,
    thresholdDifference,
    thresholdChangeRate,
  };
}

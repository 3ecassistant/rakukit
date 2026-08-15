export interface BulkPurchaseRateInputs {
  baseOrderValue: number;
  bulkOrderValue: number;
  targetAov: number;
  currentAov: number | null;
}

export const DEFAULT_BULK_PURCHASE_RATE_INPUTS: BulkPurchaseRateInputs = {
  baseOrderValue: 3000,
  bulkOrderValue: 6000,
  targetAov: 4500,
  currentAov: 3200,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: BulkPurchaseRateInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.baseOrderValue <= 0) issues.push({ field: "baseOrderValue", message: "1個購入時の注文金額は1円以上を入力してください。" });
  if (inputs.bulkOrderValue <= 0) issues.push({ field: "bulkOrderValue", message: "まとめ買い時の注文金額は1円以上を入力してください。" });
  if (inputs.targetAov <= 0) issues.push({ field: "targetAov", message: "目標客単価は1円以上を入力してください。" });
  if (inputs.currentAov !== null && inputs.currentAov <= 0) {
    issues.push({ field: "currentAov", message: "現在客単価は1円以上を入力してください。" });
  }
  return issues;
}

/** 必要条件を示す率は切り捨てると理論上未達になりうるため、小数第1位へ必ず切り上げる。 */
function ceilToOneDecimalPercent(value: number): number {
  return Math.ceil(value * 10) / 10;
}

export interface BulkPurchaseRateResult {
  isDegenerate: boolean;
  isBulkBelowBase: boolean;
  isAlreadyMet: boolean;
  isReachable: boolean;
  maxAov: number;
  minAov: number;
  requiredBulkRate: number | null;
  requiredBulkRatePercent: number | null;
  baseOrderRatePercent: number | null;
  bulkOrdersPer100: number | null;
  currentAovGap: number | null;
  requiredAovGrowthRate: number | null;
}

/**
 * AOV = baseOrderValue×(1−x) + bulkOrderValue×x を x について解く（§⑬）。
 * 必要率は理論上の下限であり、四捨五入や切り捨てで目標未達にならないよう小数第1位へ切り上げる。
 */
export function computeBulkPurchaseRate(inputs: BulkPurchaseRateInputs): BulkPurchaseRateResult {
  const isDegenerate = inputs.bulkOrderValue === inputs.baseOrderValue;
  const isBulkBelowBase = inputs.bulkOrderValue < inputs.baseOrderValue;
  const isAlreadyMet = !isBulkBelowBase && inputs.targetAov <= inputs.baseOrderValue;

  const maxAov = Math.max(inputs.baseOrderValue, inputs.bulkOrderValue);
  const minAov = Math.min(inputs.baseOrderValue, inputs.bulkOrderValue);
  const isReachable = !isDegenerate && inputs.targetAov >= minAov && inputs.targetAov <= maxAov;

  let requiredBulkRate: number | null = null;
  let requiredBulkRatePercent: number | null = null;
  let baseOrderRatePercent: number | null = null;
  let bulkOrdersPer100: number | null = null;

  if (isDegenerate) {
    // 分母が0のため算出不可
  } else if (isAlreadyMet) {
    requiredBulkRate = 0;
    requiredBulkRatePercent = 0;
    baseOrderRatePercent = 100;
    bulkOrdersPer100 = 0;
  } else if (isReachable) {
    requiredBulkRate = (inputs.targetAov - inputs.baseOrderValue) / (inputs.bulkOrderValue - inputs.baseOrderValue);
    requiredBulkRatePercent = ceilToOneDecimalPercent(requiredBulkRate * 100);
    baseOrderRatePercent = Math.max(0, 100 - requiredBulkRatePercent);
    bulkOrdersPer100 = Math.ceil(requiredBulkRate * 100);
  }

  const currentAovGap = inputs.currentAov !== null ? inputs.targetAov - inputs.currentAov : null;
  const requiredAovGrowthRate =
    currentAovGap !== null && inputs.currentAov !== null && inputs.currentAov > 0
      ? (currentAovGap / inputs.currentAov) * 100
      : null;

  return {
    isDegenerate,
    isBulkBelowBase,
    isAlreadyMet,
    isReachable,
    maxAov,
    minAov,
    requiredBulkRate,
    requiredBulkRatePercent,
    baseOrderRatePercent,
    bulkOrdersPer100,
    currentAovGap,
    requiredAovGrowthRate,
  };
}

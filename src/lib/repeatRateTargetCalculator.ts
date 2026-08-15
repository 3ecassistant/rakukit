export interface RepeatRateTargetInputs {
  totalCustomers: number;
  currentRepeatCustomers: number;
  targetRepeatRate: number;
}

export const DEFAULT_REPEAT_RATE_TARGET_INPUTS: RepeatRateTargetInputs = {
  totalCustomers: 1000,
  currentRepeatCustomers: 200,
  targetRepeatRate: 25,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: RepeatRateTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(inputs.totalCustomers) || inputs.totalCustomers < 1) {
    issues.push({ field: "totalCustomers", message: "総顧客数は1人以上の整数で入力してください。" });
  }
  if (!Number.isInteger(inputs.currentRepeatCustomers) || inputs.currentRepeatCustomers < 0) {
    issues.push({ field: "currentRepeatCustomers", message: "現在リピーター数は0以上の整数で入力してください。" });
  }
  if (inputs.currentRepeatCustomers > inputs.totalCustomers) {
    issues.push({ field: "currentRepeatCustomers", message: "リピーター数は総顧客数以下で入力してください。" });
  }
  if (inputs.targetRepeatRate < 0 || inputs.targetRepeatRate > 100) {
    issues.push({ field: "targetRepeatRate", message: "目標リピート率は0〜100%で入力してください。" });
  }
  return issues;
}

export interface RepeatRateTargetResult {
  currentRepeatRate: number;
  requiredRepeatCustomers: number;
  additionalRepeatCustomersNeeded: number;
  repeatRateGapPt: number;
  nonRepeatCustomers: number;
  requiredConversionFromNonRepeatRate: number | null;
  achievedRepeatRateAtRequiredCount: number;
  isTargetMet: boolean;
}

export function computeRepeatRateTarget(inputs: RepeatRateTargetInputs): RepeatRateTargetResult {
  const currentRepeatRate = (inputs.currentRepeatCustomers / inputs.totalCustomers) * 100;
  const requiredRepeatCustomers = Math.ceil(inputs.totalCustomers * (inputs.targetRepeatRate / 100));
  const additionalRepeatCustomersNeeded = Math.max(0, requiredRepeatCustomers - inputs.currentRepeatCustomers);
  const repeatRateGapPt = inputs.targetRepeatRate - currentRepeatRate;
  const nonRepeatCustomers = inputs.totalCustomers - inputs.currentRepeatCustomers;
  const requiredConversionFromNonRepeatRate =
    nonRepeatCustomers > 0 ? (additionalRepeatCustomersNeeded / nonRepeatCustomers) * 100 : null;
  const achievedRepeatRateAtRequiredCount = (requiredRepeatCustomers / inputs.totalCustomers) * 100;
  const isTargetMet = additionalRepeatCustomersNeeded === 0;

  return {
    currentRepeatRate,
    requiredRepeatCustomers,
    additionalRepeatCustomersNeeded,
    repeatRateGapPt,
    nonRepeatCustomers,
    requiredConversionFromNonRepeatRate,
    achievedRepeatRateAtRequiredCount,
    isTargetMet,
  };
}

export interface RepeatSalesTargetInputs {
  targetRepeatSales: number;
  currentRepeatSales: number;
  repeatPurchaseAov: number;
}

export const DEFAULT_REPEAT_SALES_TARGET_INPUTS: RepeatSalesTargetInputs = {
  targetRepeatSales: 1000000,
  currentRepeatSales: 600000,
  repeatPurchaseAov: 5000,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: RepeatSalesTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.targetRepeatSales <= 0) issues.push({ field: "targetRepeatSales", message: "リピート売上目標は1円以上を入力してください。" });
  if (inputs.currentRepeatSales < 0) issues.push({ field: "currentRepeatSales", message: "現在リピート売上はマイナスにできません。" });
  if (inputs.repeatPurchaseAov <= 0) issues.push({ field: "repeatPurchaseAov", message: "平均再購入単価は1円以上を入力してください。" });
  return issues;
}

export interface RepeatSalesTargetResult {
  repeatSalesGap: number;
  additionalRepeatOrdersNeeded: number;
  requiredTotalRepeatOrders: number;
  repeatSalesProgressRate: number;
  repeatSalesSurplus: number;
  repeatSalesAboveTarget: number;
}

export function computeRepeatSalesTarget(inputs: RepeatSalesTargetInputs): RepeatSalesTargetResult {
  const repeatSalesGap = Math.max(0, inputs.targetRepeatSales - inputs.currentRepeatSales);
  const additionalRepeatOrdersNeeded = Math.ceil(repeatSalesGap / inputs.repeatPurchaseAov);
  const requiredTotalRepeatOrders = Math.ceil(inputs.targetRepeatSales / inputs.repeatPurchaseAov);
  const repeatSalesProgressRate = (inputs.currentRepeatSales / inputs.targetRepeatSales) * 100;
  const repeatSalesSurplus = Math.max(0, inputs.currentRepeatSales - inputs.targetRepeatSales);
  const repeatSalesAboveTarget = additionalRepeatOrdersNeeded * inputs.repeatPurchaseAov - repeatSalesGap;

  return {
    repeatSalesGap,
    additionalRepeatOrdersNeeded,
    requiredTotalRepeatOrders,
    repeatSalesProgressRate,
    repeatSalesSurplus,
    repeatSalesAboveTarget,
  };
}

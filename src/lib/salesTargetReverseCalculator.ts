export interface SalesTargetInputs {
  targetSales: number;
  averageOrderValue: number;
  targetCvr: number;
  periodDays: number;
}

export const DEFAULT_SALES_TARGET_INPUTS: SalesTargetInputs = {
  targetSales: 3000000,
  averageOrderValue: 5000,
  targetCvr: 2,
  periodDays: 30,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: SalesTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.targetSales <= 0) issues.push({ field: "targetSales", message: "売上目標は1円以上を入力してください。" });
  if (inputs.averageOrderValue <= 0) issues.push({ field: "averageOrderValue", message: "平均注文単価は1円以上を入力してください。" });
  if (inputs.targetCvr < 0 || inputs.targetCvr > 100) {
    issues.push({ field: "targetCvr", message: "想定CVRは0〜100%で入力してください。" });
  }
  if (inputs.periodDays <= 0) issues.push({ field: "periodDays", message: "期間日数は1日以上を入力してください。" });
  return issues;
}

export interface SalesTargetResult {
  requiredOrders: number;
  requiredTraffic: number | null;
  isCvrZero: boolean;
  requiredDailySales: number;
  requiredDailyOrders: number;
  requiredDailyTraffic: number | null;
}

export function computeSalesTarget(inputs: SalesTargetInputs): SalesTargetResult {
  const requiredOrders = Math.ceil(inputs.targetSales / inputs.averageOrderValue);
  const isCvrZero = inputs.targetCvr === 0;
  const requiredTraffic = isCvrZero ? null : Math.ceil(requiredOrders / (inputs.targetCvr / 100));

  const requiredDailySales = inputs.targetSales / inputs.periodDays;
  const requiredDailyOrders = requiredOrders / inputs.periodDays;
  const requiredDailyTraffic = requiredTraffic !== null ? requiredTraffic / inputs.periodDays : null;

  return {
    requiredOrders,
    requiredTraffic,
    isCvrZero,
    requiredDailySales,
    requiredDailyOrders,
    requiredDailyTraffic,
  };
}

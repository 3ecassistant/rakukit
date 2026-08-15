export interface InventoryClearanceInputs {
  currentInventory: number;
  targetClearanceDays: number;
  currentDailySales: number;
}

export const DEFAULT_INVENTORY_CLEARANCE_INPUTS: InventoryClearanceInputs = {
  currentInventory: 300,
  targetClearanceDays: 30,
  currentDailySales: 5,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: InventoryClearanceInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.currentInventory <= 0) issues.push({ field: "currentInventory", message: "現在在庫数は1個以上を入力してください。" });
  if (inputs.targetClearanceDays <= 0) issues.push({ field: "targetClearanceDays", message: "消化目標日数は1日以上を入力してください。" });
  if (inputs.currentDailySales < 0) issues.push({ field: "currentDailySales", message: "現在販売ペースはマイナスにできません。" });
  return issues;
}

export interface InventoryClearanceResult {
  requiredDailySales: number;
  isCurrentDailySalesZero: boolean;
  additionalDailySales: number | null;
  requiredSalesGrowthRate: number | null;
  requiredSalesMultiplier: number | null;
  daysToClearAtCurrentPace: number | null;
  remainingInventoryAtTargetDate: number | null;
}

export function computeInventoryClearance(inputs: InventoryClearanceInputs): InventoryClearanceResult {
  const requiredDailySales = inputs.currentInventory / inputs.targetClearanceDays;
  const isCurrentDailySalesZero = inputs.currentDailySales === 0;

  const additionalDailySales = isCurrentDailySalesZero ? null : requiredDailySales - inputs.currentDailySales;
  const requiredSalesGrowthRate = isCurrentDailySalesZero ? null : (additionalDailySales! / inputs.currentDailySales) * 100;
  const requiredSalesMultiplier = isCurrentDailySalesZero ? null : requiredDailySales / inputs.currentDailySales;
  const daysToClearAtCurrentPace = isCurrentDailySalesZero ? null : inputs.currentInventory / inputs.currentDailySales;
  const remainingInventoryAtTargetDate = isCurrentDailySalesZero
    ? inputs.currentInventory
    : Math.max(0, inputs.currentInventory - inputs.currentDailySales * inputs.targetClearanceDays);

  return {
    requiredDailySales,
    isCurrentDailySalesZero,
    additionalDailySales,
    requiredSalesGrowthRate,
    requiredSalesMultiplier,
    daysToClearAtCurrentPace,
    remainingInventoryAtTargetDate,
  };
}

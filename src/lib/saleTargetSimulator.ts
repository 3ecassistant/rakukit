export interface SaleTargetInputs {
  regularPrice: number;
  salePrice: number;
  targetSales: number;
  saleDays: number;
}

export const DEFAULT_SALE_TARGET_INPUTS: SaleTargetInputs = {
  regularPrice: 4980,
  salePrice: 3980,
  targetSales: 1000000,
  saleDays: 7,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: SaleTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.regularPrice <= 0) issues.push({ field: "regularPrice", message: "通常価格は1円以上を入力してください。" });
  if (inputs.salePrice <= 0) issues.push({ field: "salePrice", message: "SALE価格は1円以上を入力してください。" });
  if (inputs.salePrice >= inputs.regularPrice && inputs.regularPrice > 0) {
    issues.push({ field: "salePrice", message: "SALE価格は通常価格未満にしてください（値上げの場合は対象外です）。" });
  }
  if (inputs.targetSales <= 0) issues.push({ field: "targetSales", message: "目標売上は1円以上を入力してください。" });
  if (inputs.saleDays <= 0) issues.push({ field: "saleDays", message: "SALE期間は1日以上を入力してください。" });
  return issues;
}

export interface SaleTargetResult {
  discountAmount: number;
  discountRate: number;
  requiredQuantityForSales: number;
  actualSalesAtRequiredQuantity: number;
  requiredDailyQuantity: number;
  requiredDailySales: number;
}

export function computeSaleTarget(inputs: SaleTargetInputs): SaleTargetResult {
  const discountAmount = inputs.regularPrice - inputs.salePrice;
  const discountRate = inputs.regularPrice > 0 ? (discountAmount / inputs.regularPrice) * 100 : 0;

  const requiredQuantityForSales = Math.ceil(inputs.targetSales / inputs.salePrice);
  const actualSalesAtRequiredQuantity = requiredQuantityForSales * inputs.salePrice;

  const requiredDailyQuantity = requiredQuantityForSales / inputs.saleDays;
  const requiredDailySales = inputs.targetSales / inputs.saleDays;

  return {
    discountAmount,
    discountRate,
    requiredQuantityForSales,
    actualSalesAtRequiredQuantity,
    requiredDailyQuantity,
    requiredDailySales,
  };
}

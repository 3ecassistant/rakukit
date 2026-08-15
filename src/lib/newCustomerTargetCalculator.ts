export interface NewCustomerTargetInputs {
  targetSales: number;
  nonNewCustomerSales: number;
  newCustomerAov: number;
  currentNewCustomers: number | null;
}

export const DEFAULT_NEW_CUSTOMER_TARGET_INPUTS: NewCustomerTargetInputs = {
  targetSales: 3000000,
  nonNewCustomerSales: 2000000,
  newCustomerAov: 5000,
  currentNewCustomers: 150,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: NewCustomerTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.targetSales <= 0) issues.push({ field: "targetSales", message: "売上目標は1円以上を入力してください。" });
  if (inputs.nonNewCustomerSales < 0) issues.push({ field: "nonNewCustomerSales", message: "新規顧客以外の売上はマイナスにできません。" });
  if (inputs.newCustomerAov <= 0) issues.push({ field: "newCustomerAov", message: "新規顧客の平均注文単価は1円以上を入力してください。" });
  if (inputs.currentNewCustomers !== null && inputs.currentNewCustomers < 0) {
    issues.push({ field: "currentNewCustomers", message: "現在新規顧客数はマイナスにできません。" });
  }
  return issues;
}

export interface NewCustomerTargetResult {
  requiredNewCustomerSales: number;
  requiredNewCustomers: number;
  isNewCustomerRequired: boolean;
  nonNewSalesSurplus: number;
  requiredNewSalesRate: number;
  nonNewSalesRate: number;
  salesAboveRequired: number;
  newCustomerGap: number | null;
  surplusCustomers: number | null;
}

/** 新規顧客＝対象期間内の初回購入者とし、必要人数は必ず切り上げる（不足を出さないため）。 */
export function computeNewCustomerTarget(inputs: NewCustomerTargetInputs): NewCustomerTargetResult {
  const requiredNewCustomerSalesRaw = inputs.targetSales - inputs.nonNewCustomerSales;
  const requiredNewCustomerSales = Math.max(0, requiredNewCustomerSalesRaw);
  const isNewCustomerRequired = requiredNewCustomerSales > 0;
  const requiredNewCustomers = isNewCustomerRequired ? Math.ceil(requiredNewCustomerSales / inputs.newCustomerAov) : 0;

  const nonNewSalesSurplus = requiredNewCustomerSalesRaw < 0 ? -requiredNewCustomerSalesRaw : 0;

  const requiredNewSalesRate = inputs.targetSales > 0 ? (requiredNewCustomerSales / inputs.targetSales) * 100 : 0;
  const nonNewSalesRate = 100 - requiredNewSalesRate;

  const salesAboveRequired = requiredNewCustomers * inputs.newCustomerAov - requiredNewCustomerSales;

  const newCustomerGap =
    inputs.currentNewCustomers !== null ? Math.max(0, requiredNewCustomers - inputs.currentNewCustomers) : null;
  const surplusCustomers =
    inputs.currentNewCustomers !== null && inputs.currentNewCustomers > requiredNewCustomers
      ? inputs.currentNewCustomers - requiredNewCustomers
      : null;

  return {
    requiredNewCustomerSales,
    requiredNewCustomers,
    isNewCustomerRequired,
    nonNewSalesSurplus,
    requiredNewSalesRate,
    nonNewSalesRate,
    salesAboveRequired,
    newCustomerGap,
    surplusCustomers,
  };
}

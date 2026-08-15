export interface AdBudgetScalingInputs {
  currentAdCost: number;
  currentAdSales: number;
  costRate: number;
  marketplaceCostRate: number;
  minProfitRate: number;
  targetAdBudget: number;
  /** 任意入力。増額後の想定ROAS（%）。null なら未入力扱い。 */
  assumedRoas: number | null;
}

export const DEFAULT_AD_BUDGET_SCALING_INPUTS: AdBudgetScalingInputs = {
  currentAdCost: 30000,
  currentAdSales: 300000,
  costRate: 35,
  marketplaceCostRate: 10,
  minProfitRate: 10,
  targetAdBudget: 50000,
  assumedRoas: null,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: AdBudgetScalingInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (inputs.currentAdCost < 0) issues.push({ field: "currentAdCost", message: "現在広告費はマイナスにできません。" });
  if (inputs.currentAdSales < 0) issues.push({ field: "currentAdSales", message: "現在広告売上はマイナスにできません。" });
  if (inputs.costRate < 0 || inputs.costRate >= 100) {
    issues.push({ field: "costRate", message: "原価率は0〜100%未満で入力してください。" });
  }
  if (inputs.marketplaceCostRate < 0 || inputs.marketplaceCostRate >= 100) {
    issues.push({ field: "marketplaceCostRate", message: "販売関連費率は0〜100%未満で入力してください。" });
  }
  if (inputs.minProfitRate < 0 || inputs.minProfitRate >= 100) {
    issues.push({ field: "minProfitRate", message: "最低利益率は0〜100%未満で入力してください。" });
  }
  if (inputs.targetAdBudget < 0) issues.push({ field: "targetAdBudget", message: "増額後広告費はマイナスにできません。" });
  if (inputs.assumedRoas !== null && inputs.assumedRoas < 0) {
    issues.push({ field: "assumedRoas", message: "想定ROASはマイナスにできません。" });
  }
  return issues;
}

/**
 * 広告売上Xに対する利益は profit(X) = X(1-cr-mr) - adCost という一次式になる
 * （原価率・販売関連費率はいずれも売上に比例し、広告費のみ固定のため）。
 * よって profitRate(X) = targetRate(%) を満たす最小売上は閉形式で厳密に求まる。
 * 分母が0以下の場合、売上をいくら増やしても目標利益率へ到達できない（費用構造上不可能）。
 */
function requiredSalesForProfitRate(adCost: number, costRate: number, marketplaceCostRate: number, targetRatePercent: number): number | null {
  const cr = costRate / 100;
  const mr = marketplaceCostRate / 100;
  const denom = 1 - cr - mr - targetRatePercent / 100;
  if (denom <= 0) return null;
  return adCost / denom;
}

function profitAtSales(sales: number, adCost: number, costRate: number, marketplaceCostRate: number): number {
  const cr = costRate / 100;
  const mr = marketplaceCostRate / 100;
  return sales * (1 - cr - mr) - adCost;
}

export type AdBudgetStatus = "achieved" | "profitable-below-target" | "deficit" | "no-assumed-roas" | "unreachable";

export interface AdBudgetScalingResult {
  theoreticalMaxProfitRate: number;
  isStructurallyInfeasible: boolean;

  currentProfit: number;
  currentProfitRate: number | null;
  currentRoas: number | null;
  isCurrentBelowTarget: boolean;

  targetBudgetIncrease: number;
  targetBudgetIncreaseRate: number | null;

  requiredSales: number | null;
  requiredAdditionalSales: number | null;
  requiredSalesGrowthRate: number | null;
  requiredRoas: number | null;

  breakEvenSales: number | null;
  breakEvenRoas: number | null;

  assumedScenarioProfit: number | null;
  assumedScenarioProfitRate: number | null;

  status: AdBudgetStatus;
}

export function computeAdBudgetScaling(inputs: AdBudgetScalingInputs): AdBudgetScalingResult {
  const cr = inputs.costRate / 100;
  const mr = inputs.marketplaceCostRate / 100;
  const theoreticalMaxProfitRate = (1 - cr - mr) * 100;
  const isStructurallyInfeasible = inputs.minProfitRate >= theoreticalMaxProfitRate;

  const currentProfit = profitAtSales(inputs.currentAdSales, inputs.currentAdCost, inputs.costRate, inputs.marketplaceCostRate);
  const currentProfitRate = inputs.currentAdSales > 0 ? (currentProfit / inputs.currentAdSales) * 100 : null;
  const currentRoas = inputs.currentAdCost > 0 ? (inputs.currentAdSales / inputs.currentAdCost) * 100 : null;
  const isCurrentBelowTarget = currentProfitRate !== null && currentProfitRate < inputs.minProfitRate;

  const targetBudgetIncrease = inputs.targetAdBudget - inputs.currentAdCost;
  const targetBudgetIncreaseRate = inputs.currentAdCost > 0 ? (targetBudgetIncrease / inputs.currentAdCost) * 100 : null;

  const requiredSales = requiredSalesForProfitRate(inputs.targetAdBudget, inputs.costRate, inputs.marketplaceCostRate, inputs.minProfitRate);
  const requiredAdditionalSales = requiredSales !== null ? requiredSales - inputs.currentAdSales : null;
  const requiredSalesGrowthRate =
    requiredAdditionalSales !== null && inputs.currentAdSales > 0 ? (requiredAdditionalSales / inputs.currentAdSales) * 100 : null;
  const requiredRoas = requiredSales !== null && inputs.targetAdBudget > 0 ? (requiredSales / inputs.targetAdBudget) * 100 : null;

  const breakEvenSales = requiredSalesForProfitRate(inputs.targetAdBudget, inputs.costRate, inputs.marketplaceCostRate, 0);
  const breakEvenRoas = breakEvenSales !== null && inputs.targetAdBudget > 0 ? (breakEvenSales / inputs.targetAdBudget) * 100 : null;

  let assumedScenarioProfit: number | null = null;
  let assumedScenarioProfitRate: number | null = null;
  if (inputs.assumedRoas !== null) {
    const assumedSales = inputs.targetAdBudget * (inputs.assumedRoas / 100);
    assumedScenarioProfit = profitAtSales(assumedSales, inputs.targetAdBudget, inputs.costRate, inputs.marketplaceCostRate);
    assumedScenarioProfitRate = assumedSales > 0 ? (assumedScenarioProfit / assumedSales) * 100 : null;
  }

  let status: AdBudgetStatus;
  if (isStructurallyInfeasible) {
    status = "unreachable";
  } else if (inputs.assumedRoas === null) {
    status = "no-assumed-roas";
  } else if (requiredRoas !== null && inputs.assumedRoas >= requiredRoas) {
    status = "achieved";
  } else if (breakEvenRoas !== null && inputs.assumedRoas >= breakEvenRoas) {
    status = "profitable-below-target";
  } else {
    status = "deficit";
  }

  return {
    theoreticalMaxProfitRate,
    isStructurallyInfeasible,
    currentProfit,
    currentProfitRate,
    currentRoas,
    isCurrentBelowTarget,
    targetBudgetIncrease,
    targetBudgetIncreaseRate,
    requiredSales,
    requiredAdditionalSales,
    requiredSalesGrowthRate,
    requiredRoas,
    breakEvenSales,
    breakEvenRoas,
    assumedScenarioProfit,
    assumedScenarioProfitRate,
    status,
  };
}

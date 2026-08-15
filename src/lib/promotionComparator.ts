import { DEFAULT_PROFIT_INPUTS, ProfitInputs, computeProfitBreakdown } from "./profitSimulator";

export type ScenarioType = "none" | "coupon-fixed" | "coupon-percent" | "point";

export interface PromotionScenario {
  id: string;
  name: string;
  type: ScenarioType;
  /** COUPON_FIXED: 値引額（円） */
  couponAmount: number;
  /** COUPON_PERCENT: 値引率（%） */
  couponRate: number;
  /** POINT: 顧客に見せる還元率（%）。店舗負担率と異なってよい。 */
  customerPointRate: number;
  /** POINT: 実際に店舗が負担するポイント原価率（%） */
  storePointCostRate: number;
}

export interface ComparisonBaseInputs {
  sellingPrice: number;
  cost: number;
  shipping: number;
  otherCost: number;
  marketplaceCostRate: number;
  adCostFixed: number;
  /** 通常販売・クーポン施策でも付与される基本ポイント負担率（%） */
  basePointRate: number;
  minProfitRate: number;
}

export const DEFAULT_BASE_INPUTS: ComparisonBaseInputs = {
  sellingPrice: 5000,
  cost: 1500,
  shipping: 600,
  otherCost: 0,
  marketplaceCostRate: 0,
  adCostFixed: 0,
  basePointRate: 1,
  minProfitRate: 10,
};

export const NONE_SCENARIO_ID = "none-scenario";
export const MAX_EXTRA_SCENARIOS = 5;

export function createNoneScenario(): PromotionScenario {
  return {
    id: NONE_SCENARIO_ID,
    name: "通常販売",
    type: "none",
    couponAmount: 0,
    couponRate: 0,
    customerPointRate: 0,
    storePointCostRate: 0,
  };
}

let scenarioCounter = 0;
function newScenarioId(): string {
  scenarioCounter += 1;
  return `scenario-${Date.now()}-${scenarioCounter}`;
}

export function createScenario(type: Exclude<ScenarioType, "none">, name: string): PromotionScenario {
  return {
    id: newScenarioId(),
    name,
    type,
    couponAmount: 500,
    couponRate: 10,
    customerPointRate: 10,
    storePointCostRate: 10,
  };
}

export interface ValidationIssue {
  scenarioId: string;
  message: string;
}

export function validateScenario(scenario: PromotionScenario, sellingPrice: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (scenario.type === "coupon-fixed") {
    if (scenario.couponAmount < 0) {
      issues.push({ scenarioId: scenario.id, message: "クーポン額はマイナスにできません。" });
    } else if (scenario.couponAmount >= sellingPrice) {
      issues.push({ scenarioId: scenario.id, message: "クーポン額が販売価格を超えています。" });
    }
  }
  if (scenario.type === "coupon-percent") {
    if (scenario.couponRate < 0 || scenario.couponRate >= 100) {
      issues.push({ scenarioId: scenario.id, message: "クーポン率は0〜100%未満で入力してください。" });
    }
  }
  if (scenario.type === "point") {
    if (scenario.customerPointRate < 0 || scenario.customerPointRate >= 100) {
      issues.push({ scenarioId: scenario.id, message: "顧客還元率は0〜100%未満で入力してください。" });
    }
    if (scenario.storePointCostRate < 0 || scenario.storePointCostRate >= 100) {
      issues.push({ scenarioId: scenario.id, message: "店舗負担率は0〜100%未満で入力してください。" });
    }
  }
  return issues;
}

export type PromotionStatus = "ok" | "caution" | "deficit";

export interface PromotionResult {
  scenario: PromotionScenario;
  /** 顧客が購入時に支払う金額 */
  customerPayment: number;
  /** 顧客から見た還元額（値引き or ポイント） */
  customerRewardAmount: number;
  /** 販売価格に対する還元率 */
  customerRewardRate: number;
  /** 還元を踏まえた顧客の実質負担相当額 */
  effectiveCustomerCost: number;
  /** 店舗が実際に負担する金額 */
  storeBurdenAmount: number;
  profit: number;
  profitRate: number | null;
  /** 通常販売との利益差（通常販売行は常に0） */
  profitDifference: number;
  status: PromotionStatus;
}

function resolveCouponDiscount(scenario: PromotionScenario, sellingPrice: number): number {
  if (scenario.type === "coupon-fixed") return Math.max(0, Math.min(scenario.couponAmount, sellingPrice));
  if (scenario.type === "coupon-percent") return sellingPrice * (Math.max(0, scenario.couponRate) / 100);
  return 0;
}

function buildProfitInputs(scenario: PromotionScenario, base: ComparisonBaseInputs): ProfitInputs {
  const couponDiscount = resolveCouponDiscount(scenario, base.sellingPrice);
  const pointRate = scenario.type === "point" ? scenario.storePointCostRate : base.basePointRate;

  return {
    ...DEFAULT_PROFIT_INPUTS,
    sellingPrice: base.sellingPrice,
    cost: base.cost,
    shipping: base.shipping,
    otherCost: base.otherCost,
    pointRate,
    couponDiscount,
    marketplaceCostRate: base.marketplaceCostRate,
    adCostMode: "fixed",
    adCostFixed: base.adCostFixed,
    minProfitMode: "rate",
    minProfitRate: base.minProfitRate,
  };
}

function judgeStatus(profit: number, profitRate: number | null, minProfitRate: number): PromotionStatus {
  if (profit < 0) return "deficit";
  if (profitRate !== null && profitRate < minProfitRate) return "caution";
  return "ok";
}

function computeSingleResult(
  scenario: PromotionScenario,
  base: ComparisonBaseInputs,
  noneProfit: number
): PromotionResult {
  const inputs = buildProfitInputs(scenario, base);
  const breakdown = computeProfitBreakdown(inputs);
  const couponDiscount = resolveCouponDiscount(scenario, base.sellingPrice);

  const customerPayment = scenario.type === "point" ? base.sellingPrice : breakdown.actualSellingPrice;
  const customerRewardAmount =
    scenario.type === "point" ? base.sellingPrice * (scenario.customerPointRate / 100) : couponDiscount;
  const customerRewardRate = base.sellingPrice > 0 ? (customerRewardAmount / base.sellingPrice) * 100 : 0;
  const effectiveCustomerCost = base.sellingPrice - customerRewardAmount;
  const storeBurdenAmount = scenario.type === "point" ? breakdown.pointCost : couponDiscount;

  return {
    scenario,
    customerPayment,
    customerRewardAmount,
    customerRewardRate,
    effectiveCustomerCost,
    storeBurdenAmount,
    profit: breakdown.profit,
    profitRate: breakdown.profitRate,
    profitDifference: breakdown.profit - noneProfit,
    status: judgeStatus(breakdown.profit, breakdown.profitRate, base.minProfitRate),
  };
}

export interface ComparisonSummary {
  results: PromotionResult[];
  bestProfit: PromotionResult | null;
  bestReward: PromotionResult | null;
}

export function compareScenarios(base: ComparisonBaseInputs, scenarios: PromotionScenario[]): ComparisonSummary {
  const noneScenario = scenarios.find((s) => s.type === "none") ?? createNoneScenario();
  const noneBreakdown = computeProfitBreakdown(buildProfitInputs(noneScenario, base));
  const noneProfit = noneBreakdown.profit;

  const results = scenarios.map((s) => computeSingleResult(s, base, noneProfit));

  const promoResults = results.filter((r) => r.scenario.type !== "none");
  const bestProfit =
    promoResults.length > 0
      ? promoResults.reduce((a, b) => (b.profit > a.profit ? b : a))
      : null;
  const bestReward =
    promoResults.length > 0
      ? promoResults.reduce((a, b) => (b.customerRewardAmount > a.customerRewardAmount ? b : a))
      : null;

  return { results, bestProfit, bestReward };
}

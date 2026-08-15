import { RppFieldKey } from "./rppColumnMaster";

export interface StoreSettings {
  targetRoas: number;
  minCvr: number;
  cpcWarning: number;
  zeroSalesAdCostWarning: number;
  minEvaluationClicks: number;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  targetRoas: 400,
  minCvr: 2.0,
  cpcWarning: 50,
  zeroSalesAdCostWarning: 3000,
  minEvaluationClicks: 30,
};

export function parseNumericCell(cell: string | undefined): { value: number; isMissing: boolean; isInvalid: boolean } {
  const trimmed = (cell ?? "").trim();
  if (trimmed === "") return { value: 0, isMissing: true, isInvalid: false };
  const cleaned = trimmed.replace(/[,¥円]/g, "");
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return { value: 0, isMissing: false, isInvalid: true };
  return { value: num, isMissing: false, isInvalid: false };
}

export interface ProductAggregate {
  productKey: string;
  productNames: Set<string>;
  impressions: number;
  clicks: number;
  adCost: number;
  sales: number;
  orders: number;
  invalidCellCount: number;
  rowCount: number;
}

export interface AggregationResult {
  products: Map<string, ProductAggregate>;
  totalRows: number;
  validRows: number;
  errorRows: number;
  negativeValueRows: number;
  ordersExceedClicksRows: number;
  multiNameProductCount: number;
}

export function aggregateByProduct(
  dataRows: string[][],
  mapping: Record<RppFieldKey, number>
): AggregationResult {
  const products = new Map<string, ProductAggregate>();
  let errorRows = 0;
  let negativeValueRows = 0;
  let ordersExceedClicksRows = 0;

  dataRows.forEach((row) => {
    const key = (row[mapping.productKey] ?? "").trim();
    if (!key) {
      errorRows++;
      return;
    }
    const name = (row[mapping.productName] ?? "").trim();
    const impressions = parseNumericCell(row[mapping.impressions]);
    const clicks = parseNumericCell(row[mapping.clicks]);
    const adCost = parseNumericCell(row[mapping.adCost]);
    const sales = parseNumericCell(row[mapping.sales]);
    const orders = parseNumericCell(row[mapping.orders]);

    const invalidCount = [impressions, clicks, adCost, sales, orders].filter((v) => v.isInvalid).length;
    if (invalidCount > 0) errorRows++;

    if (clicks.value < 0 || adCost.value < 0 || sales.value < 0 || orders.value < 0) {
      negativeValueRows++;
    }
    if (orders.value > clicks.value * 1.5 && clicks.value > 0) {
      ordersExceedClicksRows++;
    }

    const existing = products.get(key);
    if (existing) {
      existing.impressions += impressions.value;
      existing.clicks += clicks.value;
      existing.adCost += adCost.value;
      existing.sales += sales.value;
      existing.orders += orders.value;
      existing.invalidCellCount += invalidCount;
      existing.rowCount += 1;
      if (name) existing.productNames.add(name);
    } else {
      products.set(key, {
        productKey: key,
        productNames: new Set(name ? [name] : []),
        impressions: impressions.value,
        clicks: clicks.value,
        adCost: adCost.value,
        sales: sales.value,
        orders: orders.value,
        invalidCellCount: invalidCount,
        rowCount: 1,
      });
    }
  });

  const multiNameProductCount = Array.from(products.values()).filter((p) => p.productNames.size > 1).length;

  return {
    products,
    totalRows: dataRows.length,
    validRows: dataRows.length - errorRows,
    errorRows,
    negativeValueRows,
    ordersExceedClicksRows,
    multiNameProductCount,
  };
}

export interface ProductKpi {
  productKey: string;
  productName: string;
  impressions: number;
  clicks: number;
  adCost: number;
  sales: number;
  orders: number;
  cpc: number | null;
  ctr: number | null;
  cvr: number | null;
  roas: number | null;
  cpa: number | null;
  adCostRatio: number | null;
}

export function computeKpi(agg: ProductAggregate): ProductKpi {
  const { impressions, clicks, adCost, sales, orders } = agg;
  return {
    productKey: agg.productKey,
    productName: Array.from(agg.productNames)[0] ?? agg.productKey,
    impressions,
    clicks,
    adCost,
    sales,
    orders,
    cpc: clicks > 0 ? adCost / clicks : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cvr: clicks > 0 ? (orders / clicks) * 100 : null,
    roas: adCost > 0 ? (sales / adCost) * 100 : null,
    cpa: orders > 0 ? adCost / orders : null,
    adCostRatio: sales > 0 ? (adCost / sales) * 100 : null,
  };
}

export type ProductStatus =
  | "stop-candidate"
  | "page-improvement"
  | "cpc-review"
  | "expand-candidate"
  | "good"
  | "continue"
  | "insufficient-data";

export type PriorityLevel = "緊急" | "高" | "中" | "低" | "-";

export interface EvaluationResult {
  status: ProductStatus;
  priority: PriorityLevel;
  reason: string;
}

export const STATUS_LABELS: Record<ProductStatus, string> = {
  "stop-candidate": "広告停止検討",
  "page-improvement": "商品ページ改善候補",
  "cpc-review": "CPC見直し候補",
  "expand-candidate": "拡大候補",
  good: "好調",
  continue: "継続",
  "insufficient-data": "データ不足",
};

export const ACTION_POINTS: Record<ProductStatus, string[]> = {
  "stop-candidate": ["広告費に見合う売上が出ているか確認する", "入札の停止・縮小を検討する", "キーワード設定を見直す"],
  "page-improvement": ["商品ページを確認する", "商品名SEOを確認する", "価格・送料条件を確認する", "レビュー状況を確認する"],
  "cpc-review": ["入札単価を見直す", "競合状況を確認する", "キーワードの絞り込みを検討する"],
  "expand-candidate": ["広告予算の拡大を検討する", "類似キーワードへの展開を検討する"],
  good: ["現状の運用を維持する"],
  continue: ["大きな問題はありません。定期的に確認してください。"],
  "insufficient-data": ["データが蓄積してから再評価してください。"],
};

function fmtPct(v: number | null): string {
  return v === null ? "-" : `${v.toFixed(1)}%`;
}
function fmtYen(v: number | null): string {
  return v === null ? "-" : `¥${v.toFixed(1)}`;
}

export function evaluateProduct(kpi: ProductKpi, settings: StoreSettings): EvaluationResult {
  const { clicks, adCost, sales, roas, cvr, cpc } = kpi;
  const hasEnoughClicks = clicks >= settings.minEvaluationClicks;

  if (adCost >= settings.zeroSalesAdCostWarning && sales === 0) {
    return {
      status: "stop-candidate",
      priority: "緊急",
      reason: `広告費${fmtYen(adCost).replace("¥", "¥")}に対し売上が0円です（広告費警戒値: ¥${settings.zeroSalesAdCostWarning}）。`,
    };
  }

  if (hasEnoughClicks && roas !== null && roas < settings.targetRoas * 0.3) {
    return {
      status: "stop-candidate",
      priority: "高",
      reason: `ROAS ${fmtPct(roas)}は目標(${settings.targetRoas}%)を大幅に下回っています。`,
    };
  }

  if (!hasEnoughClicks) {
    return {
      status: "insufficient-data",
      priority: "-",
      reason: `クリック数${clicks}件は評価基準（${settings.minEvaluationClicks}件）未満のため、判断材料が不足しています。`,
    };
  }

  if (cvr !== null && cvr < settings.minCvr) {
    return {
      status: "page-improvement",
      priority: "中",
      reason: `CVR ${fmtPct(cvr)}は店舗基準(${settings.minCvr}%)を下回っています。クリックは${clicks}件獲得できているため、商品ページ側の改善余地があります。`,
    };
  }

  if (cpc !== null && cpc >= settings.cpcWarning && roas !== null && roas < settings.targetRoas) {
    return {
      status: "cpc-review",
      priority: "中",
      reason: `CPC ${fmtYen(cpc)}は基準(¥${settings.cpcWarning})以上で、ROAS ${fmtPct(roas)}は目標(${settings.targetRoas}%)未達です。`,
    };
  }

  if (roas !== null && roas >= settings.targetRoas * 1.5 && cvr !== null && cvr >= settings.minCvr * 1.5) {
    return {
      status: "expand-candidate",
      priority: "-",
      reason: `ROAS ${fmtPct(roas)}・CVR ${fmtPct(cvr)}とも高水準です。広告費の拡大を検討できます。`,
    };
  }

  if (roas !== null && roas >= settings.targetRoas && cvr !== null && cvr >= settings.minCvr) {
    return { status: "good", priority: "-", reason: "ROAS・CVRとも店舗基準を満たしています。" };
  }

  return { status: "continue", priority: "低", reason: "店舗基準を大きく外れる項目はありません。" };
}

export const STATUS_SORT_RANK: Record<ProductStatus, number> = {
  "stop-candidate": 0,
  "page-improvement": 1,
  "cpc-review": 1,
  "expand-candidate": 2,
  good: 3,
  continue: 4,
  "insufficient-data": 5,
};

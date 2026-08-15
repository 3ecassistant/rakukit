const ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const HITS_PER_PAGE = 30;
const MAX_PAGES = 100;
const REQUEST_TIMEOUT_MS = 10000;
const RETRYABLE_STATUS = new Set([429, 500, 503]);
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 2000];

export const DEFAULT_ELEMENTS = [
  "itemCode",
  "itemName",
  "catchcopy",
  "itemPrice",
  "itemUrl",
  "reviewCount",
  "reviewAverage",
  "postageFlag",
  "pointRate",
  "pointRateStartTime",
  "pointRateEndTime",
  "availability",
  "genreId",
  "shopName",
  "shopCode",
  "shopUrl",
  "startTime",
  "endTime",
  "itemCaption",
  "mediumImageUrls",
];

const EXTENDED_ELEMENTS = [
  ...DEFAULT_ELEMENTS,
  "itemPriceMin1",
  "itemPriceMax1",
  "taxFlag",
  "creditCardFlag",
  "giftFlag",
  "attributeIds",
];

export type RakutenErrorKind = "http" | "network" | "timeout" | "parse" | "config";

export class RakutenApiError extends Error {
  status: number | null;
  kind: RakutenErrorKind;

  constructor(message: string, status: number | null, kind: RakutenErrorKind) {
    super(message);
    this.name = "RakutenApiError";
    this.status = status;
    this.kind = kind;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "検索条件が不正です（入力条件エラー）",
  404: "条件に一致する商品が見つかりませんでした",
  429: "楽天APIへのアクセスが集中しています（アクセス超過）。しばらく待って再度お試しください",
  500: "楽天APIの内部エラーが発生しました",
  503: "楽天APIがメンテナンス中、または一時的に利用できません",
};

export interface RakutenSearchParams {
  keyword?: string;
  shopCode?: string;
  itemCode?: string;
  genreId?: string;
  minPrice?: number;
  maxPrice?: number;
  ngKeyword?: string;
  hasReviewFlag?: boolean;
  postageFlag?: boolean;
  /** 未指定/true = 購入可能商品のみ(availability=1)、false = 全商品(availability=0) */
  availability?: boolean;
  pointRateFlag?: boolean;
  attributeFlag?: boolean;
  /** 楽天API sort パラメータ。省略時は "standard" */
  sort?: string;
  /** elements パラメータの上書き。省略時は DEFAULT_ELEMENTS */
  elements?: string[];
  requestedCount: number;
}

export interface RakutenRawItem {
  itemCode: string;
  itemName: string;
  catchcopy: string;
  itemPrice: number;
  itemPriceMin1?: number;
  itemPriceMax1?: number;
  itemUrl: string;
  reviewCount: number;
  reviewAverage: number;
  postageFlag: number;
  pointRate: number;
  pointRateStartTime: string;
  pointRateEndTime: string;
  availability: number;
  taxFlag?: number;
  creditCardFlag?: number;
  giftFlag?: number;
  genreId: string;
  attributeIds?: string[];
  shopName: string;
  shopCode: string;
  shopUrl: string;
  startTime: string;
  endTime: string;
  itemCaption: string;
  mediumImageUrls: { imageUrl: string }[];
}

export interface RakutenSearchResult {
  items: RakutenRawItem[];
  totalCount: number;
  /** ページング上限(3,000件)に達し、全件取得できていない場合 true */
  isPartial: boolean;
}

function buildUrl(params: RakutenSearchParams, page: number, applicationId: string, accessKey: string): string {
  const url = new URL(ENDPOINT);
  url.searchParams.set("applicationId", applicationId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatVersion", "2");
  url.searchParams.set("sort", params.sort ?? "standard");
  url.searchParams.set("availability", params.availability === false ? "0" : "1");
  url.searchParams.set("hits", String(HITS_PER_PAGE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("elements", (params.elements ?? DEFAULT_ELEMENTS).join(","));
  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.shopCode) url.searchParams.set("shopCode", params.shopCode);
  if (params.itemCode) url.searchParams.set("itemCode", params.itemCode);
  if (params.genreId) url.searchParams.set("genreId", params.genreId);
  if (params.attributeFlag) url.searchParams.set("attributeFlag", "1");
  if (params.minPrice !== undefined) url.searchParams.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) url.searchParams.set("maxPrice", String(params.maxPrice));
  if (params.ngKeyword) url.searchParams.set("NGKeyword", params.ngKeyword);
  if (params.hasReviewFlag) url.searchParams.set("hasReviewFlag", "1");
  if (params.postageFlag) url.searchParams.set("postageFlag", "1");
  if (params.pointRateFlag) url.searchParams.set("pointRateFlag", "1");
  return url.toString();
}

async function fetchPage(
  params: RakutenSearchParams,
  page: number,
  applicationId: string,
  accessKey: string,
  referrer: string
): Promise<{ items: RakutenRawItem[]; count: number }> {
  const url = buildUrl(params, page, applicationId, accessKey);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Referer: referrer },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new RakutenApiError(
      isTimeout ? "楽天APIへのリクエストがタイムアウトしました" : "楽天APIとの通信に失敗しました",
      null,
      isTimeout ? "timeout" : "network"
    );
  }

  if (!res.ok) {
    const message = STATUS_MESSAGES[res.status] ?? `楽天APIがエラーを返しました（HTTP ${res.status}）`;
    throw new RakutenApiError(message, res.status, "http");
  }

  try {
    const data = await res.json();
    const items: RakutenRawItem[] = Array.isArray(data?.Items) ? data.Items : [];
    const count: number = typeof data?.count === "number" ? data.count : items.length;
    return { items, count };
  } catch {
    throw new RakutenApiError("楽天APIのレスポンス解析に失敗しました", res.status, "parse");
  }
}

async function fetchPageWithRetry(
  params: RakutenSearchParams,
  page: number,
  applicationId: string,
  accessKey: string,
  referrer: string
): Promise<{ items: RakutenRawItem[]; count: number }> {
  let lastError: RakutenApiError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchPage(params, page, applicationId, accessKey, referrer);
    } catch (err) {
      const error = err instanceof RakutenApiError ? err : new RakutenApiError("不明なエラー", null, "network");
      lastError = error;
      const retryable = error.kind === "timeout" || error.kind === "network" || (error.kind === "http" && error.status !== null && RETRYABLE_STATUS.has(error.status));
      if (!retryable || attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt] ?? 2000));
    }
  }
  throw lastError ?? new RakutenApiError("不明なエラー", null, "network");
}

function getCredentials(): { applicationId: string; accessKey: string; referrer: string } {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const referrer = process.env.RAKUTEN_API_REFERRER;
  if (!applicationId || !accessKey || !referrer) {
    throw new RakutenApiError("楽天APIの認証情報が設定されていません（サーバー環境変数を確認してください）", null, "config");
  }
  return { applicationId, accessKey, referrer };
}

export async function searchIchibaItems(params: RakutenSearchParams): Promise<RakutenSearchResult> {
  const { applicationId, accessKey, referrer } = getCredentials();

  const pageCount = Math.min(MAX_PAGES, Math.ceil(params.requestedCount / HITS_PER_PAGE));
  const byCode = new Map<string, RakutenRawItem>();
  let totalCount = 0;

  for (let page = 1; page <= pageCount; page++) {
    const { items, count } = await fetchPageWithRetry(params, page, applicationId, accessKey, referrer);
    if (page === 1) totalCount = count;
    for (const item of items) {
      if (!byCode.has(item.itemCode)) byCode.set(item.itemCode, item);
    }
    if (items.length < HITS_PER_PAGE) break;
    if (page < pageCount) await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const collected = Array.from(byCode.values()).slice(0, params.requestedCount);
  return { items: collected, totalCount, isPartial: totalCount > collected.length };
}

/** itemCode 単体で商品を取得する。見つからない場合は null。 */
export async function fetchItemByCode(itemCode: string, elements?: string[]): Promise<RakutenRawItem | null> {
  const { applicationId, accessKey, referrer } = getCredentials();
  const { items } = await fetchPageWithRetry(
    { itemCode, requestedCount: 1, availability: false, elements: elements ?? EXTENDED_ELEMENTS },
    1,
    applicationId,
    accessKey,
    referrer
  );
  return items[0] ?? null;
}

export { EXTENDED_ELEMENTS };

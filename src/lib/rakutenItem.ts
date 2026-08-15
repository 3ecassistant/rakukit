import { RakutenRawItem } from "./rakutenIchibaApi";

export interface RakutenItem {
  itemCode: string;
  itemName: string;
  catchcopy: string;
  itemPrice: number;
  itemPriceMin1: number | null;
  itemPriceMax1: number | null;
  itemUrl: string;
  reviewCount: number;
  reviewAverage: number;
  postageFlag: 0 | 1;
  pointRate: number;
  pointRateStartTime: string;
  pointRateEndTime: string;
  availability: number;
  taxFlag: 0 | 1 | null;
  genreId: string;
  attributeIds: string[];
  shopName: string;
  shopCode: string;
  shopUrl: string;
  startTime: string;
  endTime: string;
  itemCaption: string;
  imageUrl: string | null;
}

export function normalizeItem(raw: RakutenRawItem): RakutenItem {
  return {
    itemCode: raw.itemCode,
    itemName: raw.itemName,
    catchcopy: raw.catchcopy ?? "",
    itemPrice: raw.itemPrice,
    itemPriceMin1: raw.itemPriceMin1 ?? null,
    itemPriceMax1: raw.itemPriceMax1 ?? null,
    itemUrl: raw.itemUrl,
    reviewCount: raw.reviewCount ?? 0,
    reviewAverage: raw.reviewAverage ?? 0,
    postageFlag: raw.postageFlag === 1 ? 1 : 0,
    pointRate: raw.pointRate ?? 1,
    pointRateStartTime: raw.pointRateStartTime ?? "",
    pointRateEndTime: raw.pointRateEndTime ?? "",
    availability: raw.availability ?? 1,
    taxFlag: raw.taxFlag === 0 || raw.taxFlag === 1 ? raw.taxFlag : null,
    genreId: raw.genreId ?? "",
    attributeIds: Array.isArray(raw.attributeIds) ? raw.attributeIds : [],
    shopName: raw.shopName ?? "",
    shopCode: raw.shopCode ?? "",
    shopUrl: raw.shopUrl ?? "",
    startTime: raw.startTime ?? "",
    endTime: raw.endTime ?? "",
    itemCaption: raw.itemCaption ?? "",
    imageUrl: raw.mediumImageUrls?.[0]?.imageUrl ?? null,
  };
}

/** shopCode:識別子 形式のitemCodeからshopCode部分を抽出する。 */
export function extractShopCodeFromItemCode(itemCode: string): string | null {
  const idx = itemCode.indexOf(":");
  return idx > 0 ? itemCode.slice(0, idx) : null;
}

/** 楽天ショップURL(例: https://www.rakuten.co.jp/shopcode/ )からshopCodeを抽出する。 */
export function extractShopCodeFromUrl(input: string): string | null {
  const trimmed = input.trim();
  const directMatch = /^[A-Za-z0-9_-]+$/.test(trimmed);
  if (directMatch && !trimmed.includes("http")) return trimmed;
  const match = trimmed.match(/rakuten\.co\.jp\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

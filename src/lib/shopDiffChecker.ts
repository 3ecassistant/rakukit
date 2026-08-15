import { RakutenRawItem } from "./rakutenIchibaApi";

export interface ShopMaster {
  id: string;
  shopCode: string;
  shopName: string;
}

export interface ProductMaster {
  commonCode: string;
  productName: string;
  itemCodesByShop: Record<string, string>;
}

export type FieldStatus = "match" | "diff" | "unavailable";

export interface ShopFieldValue {
  shopId: string;
  value: string;
  status: FieldStatus;
}

export interface FieldDiff {
  field: string;
  label: string;
  baseValue: string;
  values: ShopFieldValue[];
  hasDiff: boolean;
  severity: "critical" | "important" | "caution" | "reference";
}

export type FetchedShopItem = { ok: true; item: RakutenRawItem } | { ok: false; error: string };

export interface ProductDiffResult {
  commonCode: string;
  productName: string;
  baseShopId: string;
  fields: FieldDiff[];
  diffCount: number;
  criticalDiffCount: number;
  unavailableCount: number;
  overallStatus: "match" | "diff" | "critical" | "unavailable";
}

const FIELD_DEFS: { field: string; label: string; severity: FieldDiff["severity"] }[] = [
  { field: "itemPrice", label: "価格", severity: "critical" },
  { field: "availability", label: "販売可否", severity: "critical" },
  { field: "postageFlag", label: "送料条件", severity: "critical" },
  { field: "itemName", label: "商品名", severity: "important" },
  { field: "genreId", label: "ジャンル", severity: "important" },
  { field: "pointRate", label: "商品別ポイント倍率", severity: "caution" },
];

function fieldValue(item: RakutenRawItem, field: string): string {
  switch (field) {
    case "itemPrice":
      return String(item.itemPrice);
    case "availability":
      return item.availability === 1 ? "購入可能" : "購入不可";
    case "postageFlag":
      return item.postageFlag === 0 ? "送料込み" : "送料別";
    case "itemName":
      return item.itemName.trim().replace(/\s+/g, " ");
    case "genreId":
      return item.genreId ?? "";
    case "pointRate":
      return `${item.pointRate ?? 1}倍`;
    default:
      return "";
  }
}

export function buildProductDiff(
  product: ProductMaster,
  shops: ShopMaster[],
  baseShopId: string,
  fetchedByShopId: Map<string, FetchedShopItem>
): ProductDiffResult {
  const baseFetched = fetchedByShopId.get(baseShopId);
  const baseOk = baseFetched?.ok === true;

  const fields: FieldDiff[] = FIELD_DEFS.map(({ field, label, severity }) => {
    const baseValue = baseOk ? fieldValue(baseFetched.item, field) : "";
    const values: ShopFieldValue[] = shops
      .filter((s) => product.itemCodesByShop[s.id])
      .map((s) => {
        const fetched = fetchedByShopId.get(s.id);
        if (!fetched || !fetched.ok) return { shopId: s.id, value: "取得不可", status: "unavailable" as FieldStatus };
        const value = fieldValue(fetched.item, field);
        const status: FieldStatus = !baseOk ? "unavailable" : value === baseValue ? "match" : "diff";
        return { shopId: s.id, value, status };
      });
    const hasDiff = values.some((v) => v.status === "diff");
    return { field, label, baseValue, values, hasDiff, severity };
  });

  const diffCount = fields.filter((f) => f.hasDiff).length;
  const criticalDiffCount = fields.filter((f) => f.hasDiff && f.severity === "critical").length;
  const unavailableCount = Array.from(fetchedByShopId.values()).filter((f) => !f.ok).length;

  const overallStatus: ProductDiffResult["overallStatus"] =
    criticalDiffCount > 0 ? "critical" : diffCount > 0 ? "diff" : unavailableCount > 0 ? "unavailable" : "match";

  return {
    commonCode: product.commonCode,
    productName: product.productName,
    baseShopId,
    fields,
    diffCount,
    criticalDiffCount,
    unavailableCount,
    overallStatus,
  };
}

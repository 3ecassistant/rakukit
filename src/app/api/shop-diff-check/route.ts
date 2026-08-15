import { NextRequest, NextResponse } from "next/server";
import { EXTENDED_ELEMENTS, fetchItemByCode } from "@/lib/rakutenIchibaApi";
import { FetchedShopItem, ProductMaster, ShopMaster, buildProductDiff } from "@/lib/shopDiffChecker";

export const runtime = "nodejs";
const MAX_PRODUCTS = 50;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const shops = Array.isArray(body.shops) ? (body.shops as ShopMaster[]) : [];
  const products = Array.isArray(body.products) ? (body.products as ProductMaster[]).slice(0, MAX_PRODUCTS) : [];
  const baseShopId = typeof body.baseShopId === "string" ? body.baseShopId : shops[0]?.id;

  if (shops.length === 0 || products.length === 0 || !baseShopId) {
    return NextResponse.json({ error: "店舗マスタと商品マスタを1件以上登録してください" }, { status: 400 });
  }

  const itemCodeCache = new Map<string, FetchedShopItem>();

  async function fetchCached(itemCode: string): Promise<FetchedShopItem> {
    if (itemCodeCache.has(itemCode)) return itemCodeCache.get(itemCode)!;
    try {
      const item = await fetchItemByCode(itemCode, EXTENDED_ELEMENTS);
      const result: FetchedShopItem = item ? { ok: true, item } : { ok: false, error: "商品が見つかりませんでした" };
      itemCodeCache.set(itemCode, result);
      return result;
    } catch (err) {
      const result: FetchedShopItem = { ok: false, error: err instanceof Error ? err.message : "取得エラー" };
      itemCodeCache.set(itemCode, result);
      return result;
    }
  }

  const results = [];
  for (const product of products) {
    const fetchedByShopId = new Map<string, FetchedShopItem>();
    for (const shop of shops) {
      const itemCode = product.itemCodesByShop[shop.id];
      if (!itemCode) continue;
      const fetched = await fetchCached(itemCode);
      fetchedByShopId.set(shop.id, fetched);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    results.push(buildProductDiff(product, shops, baseShopId, fetchedByShopId));
  }

  return NextResponse.json({ results });
}

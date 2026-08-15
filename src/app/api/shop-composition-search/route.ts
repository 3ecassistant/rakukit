import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { analyzeShopComposition } from "@/lib/shopCompositionAnalysis";
import { extractShopCodeFromUrl, normalizeItem } from "@/lib/rakutenItem";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const rawInput = typeof body.shopInput === "string" ? body.shopInput.trim() : "";
  if (!rawInput) {
    return NextResponse.json({ error: "競合ショップURLまたはshopCodeを入力してください" }, { status: 400 });
  }
  const shopCode = extractShopCodeFromUrl(rawInput);
  if (!shopCode) {
    return NextResponse.json({ error: "shopCodeを認識できませんでした。ショップURLまたはshopCodeを確認してください" }, { status: 400 });
  }

  const requestedCount = typeof body.requestedCount === "number" ? Math.min(3000, Math.max(30, body.requestedCount)) : 300;

  try {
    const { items, totalCount } = await searchIchibaItems({
      shopCode,
      keyword: typeof body.keyword === "string" && body.keyword ? body.keyword : undefined,
      genreId: typeof body.genreId === "string" && body.genreId ? body.genreId : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      requestedCount,
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "指定したショップから商品が見つかりませんでした", kind: "empty" }, { status: 404 });
    }

    const analysis = analyzeShopComposition(items, totalCount);
    const normalizedItems = items.map(normalizeItem);

    return NextResponse.json({ shopCode, items: normalizedItems, analysis });
  } catch (err) {
    if (err instanceof RakutenApiError) {
      const status = err.status ?? (err.kind === "config" ? 500 : 502);
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status }, { status });
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { analyzePromotionCompetition } from "@/lib/promotionCompetitionAnalysis";
import { normalizeItem } from "@/lib/rakutenItem";

export const runtime = "nodejs";

const ALLOWED_COUNTS = new Set([30, 100, 300]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
  if (!keyword) {
    return NextResponse.json({ error: "検索キーワードを入力してください" }, { status: 400 });
  }

  const requestedCount = ALLOWED_COUNTS.has(body.requestedCount as number) ? (body.requestedCount as 30 | 100 | 300) : 300;
  const ownPostageFree = typeof body.ownPostageFree === "boolean" ? body.ownPostageFree : null;
  const ownPointRate = typeof body.ownPointRate === "number" ? body.ownPointRate : null;

  try {
    const { items, totalCount } = await searchIchibaItems({
      keyword,
      genreId: typeof body.genreId === "string" && body.genreId ? body.genreId : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      ngKeyword: typeof body.ngKeyword === "string" && body.ngKeyword ? body.ngKeyword : undefined,
      requestedCount,
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "条件に一致する商品が見つかりませんでした", kind: "empty" }, { status: 404 });
    }

    const analysis = analyzePromotionCompetition(items, totalCount, ownPostageFree, ownPointRate);
    const normalizedItems = items.map(normalizeItem);

    return NextResponse.json({ keyword, items: normalizedItems, analysis });
  } catch (err) {
    if (err instanceof RakutenApiError) {
      const status = err.status ?? (err.kind === "config" ? 500 : 502);
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status }, { status });
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}

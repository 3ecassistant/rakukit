import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { analyzeCompetitors, normalizeItem } from "@/lib/competitorAnalysis";

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

  const requestedCount = ALLOWED_COUNTS.has(body.requestedCount as number) ? (body.requestedCount as 30 | 100 | 300) : 100;

  try {
    const { items, totalCount } = await searchIchibaItems({
      keyword,
      genreId: typeof body.genreId === "string" && body.genreId ? body.genreId : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      ngKeyword: typeof body.ngKeyword === "string" && body.ngKeyword ? body.ngKeyword : undefined,
      hasReviewFlag: body.hasReviewFlag === true,
      postageFlag: body.postageFlag === true,
      availability: body.availability !== false,
      pointRateFlag: body.pointRateFlag === true,
      requestedCount,
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "条件に一致する商品が見つかりませんでした", kind: "empty" }, { status: 404 });
    }

    const analysis = analyzeCompetitors(items, totalCount);
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

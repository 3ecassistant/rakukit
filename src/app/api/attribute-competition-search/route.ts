import { NextRequest, NextResponse } from "next/server";
import { EXTENDED_ELEMENTS, RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { fetchGenreAttributes } from "@/lib/rakutenAttributeApi";
import { analyzeAttributeCompetition } from "@/lib/attributeCompetitionAnalysis";
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

  const genreId = typeof body.genreId === "string" ? body.genreId.trim() : "";
  if (!genreId) {
    return NextResponse.json({ error: "ジャンルIDを入力してください（属性取得にはジャンル指定が必須です）" }, { status: 400 });
  }

  const requestedCount = ALLOWED_COUNTS.has(body.requestedCount as number) ? (body.requestedCount as 30 | 100 | 300) : 300;

  try {
    const { items } = await searchIchibaItems({
      genreId,
      keyword: typeof body.keyword === "string" && body.keyword ? body.keyword : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      attributeFlag: true,
      elements: EXTENDED_ELEMENTS,
      requestedCount,
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "条件に一致する商品が見つかりませんでした", kind: "empty" }, { status: 404 });
    }

    let attributeMaster: Awaited<ReturnType<typeof fetchGenreAttributes>> = [];
    try {
      attributeMaster = await fetchGenreAttributes(genreId);
    } catch {
      attributeMaster = [];
    }

    const analysis = analyzeAttributeCompetition(items, attributeMaster);
    const normalizedItems = items.map(normalizeItem);

    return NextResponse.json({ genreId, items: normalizedItems, analysis });
  } catch (err) {
    if (err instanceof RakutenApiError) {
      const status = err.status ?? (err.kind === "config" ? 500 : 502);
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status }, { status });
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}

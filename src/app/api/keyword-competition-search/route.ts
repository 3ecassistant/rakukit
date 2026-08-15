import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { analyzeKeywordResult, applyProductCountScores } from "@/lib/keywordCompetitionChecker";

export const runtime = "nodejs";
const MAX_KEYWORDS = 50;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const keywordsRaw = Array.isArray(body.keywords) ? body.keywords : [];
  const keywords = keywordsRaw
    .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
    .map((k) => k.trim())
    .slice(0, MAX_KEYWORDS);

  if (keywords.length === 0) {
    return NextResponse.json({ error: "分析キーワードを1件以上入力してください" }, { status: 400 });
  }

  const ownPrice = typeof body.ownPrice === "number" ? body.ownPrice : null;
  const genreId = typeof body.genreId === "string" && body.genreId ? body.genreId : undefined;
  const minPrice = typeof body.minPrice === "number" ? body.minPrice : undefined;
  const maxPrice = typeof body.maxPrice === "number" ? body.maxPrice : undefined;

  const results = [];
  let baseProductCount: number | null = null;

  try {
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      const { items, totalCount } = await searchIchibaItems({ keyword, genreId, minPrice, maxPrice, requestedCount: 30 });
      if (i === 0) baseProductCount = totalCount;
      results.push(analyzeKeywordResult(keyword, items, totalCount, i === 0 ? null : baseProductCount, ownPrice));
      if (i < keywords.length - 1) await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (err) {
    if (err instanceof RakutenApiError) {
      const status = err.status ?? (err.kind === "config" ? 500 : 502);
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status, partialResults: results }, { status });
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({ results: applyProductCountScores(results) });
}

import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { AnalysisTarget, analyzeTitleSeo } from "@/lib/titleSeoAnalysis";
import { normalizeItem } from "@/lib/rakutenItem";

export const runtime = "nodejs";

const ALLOWED_COUNTS = new Set([30, 100, 300]);
const ALLOWED_TARGETS: AnalysisTarget[] = ["itemName", "catchcopy", "both"];

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
  const target = ALLOWED_TARGETS.includes(body.target as AnalysisTarget) ? (body.target as AnalysisTarget) : "both";
  const customStopwords = Array.isArray(body.customStopwords) ? body.customStopwords.filter((w): w is string => typeof w === "string") : [];
  const ownItemName = typeof body.ownItemName === "string" && body.ownItemName ? body.ownItemName : null;
  const ownCatchcopy = typeof body.ownCatchcopy === "string" && body.ownCatchcopy ? body.ownCatchcopy : null;

  try {
    const { items } = await searchIchibaItems({
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

    const analysis = analyzeTitleSeo(items, target, customStopwords, ownItemName, ownCatchcopy);
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

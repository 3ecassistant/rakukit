import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";

export const runtime = "nodejs";

const ALLOWED_COUNTS = new Set([30, 100, 300, 1000, 3000]);

/**
 * Stateless proxy: 楽天APIへ問い合わせて生の検索結果を返すのみ。
 * 分析・保存は一切行わない（クライアント側のIndexedDBで実施する設計のため）。
 */
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

  const requestedCount = ALLOWED_COUNTS.has(body.requestedCount as number) ? (body.requestedCount as number) : 300;

  try {
    const { items, totalCount } = await searchIchibaItems({
      keyword,
      genreId: typeof body.genreId === "string" && body.genreId ? body.genreId : undefined,
      shopCode: typeof body.shopCode === "string" && body.shopCode ? body.shopCode : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      ngKeyword: typeof body.ngKeyword === "string" && body.ngKeyword ? body.ngKeyword : undefined,
      requestedCount,
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "条件に一致する商品が見つかりませんでした", kind: "empty" }, { status: 404 });
    }

    return NextResponse.json({ items, totalCount, checkedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof RakutenApiError) {
      const status = err.status ?? (err.kind === "config" ? 500 : 502);
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status }, { status });
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}

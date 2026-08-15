import { NextRequest, NextResponse } from "next/server";
import { RakutenApiError, searchIchibaItems } from "@/lib/rakutenIchibaApi";
import { extractShopCodeFromUrl } from "@/lib/rakutenItem";

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
    return NextResponse.json({ error: "監視ショップURLまたはshopCodeを入力してください" }, { status: 400 });
  }
  const shopCode = extractShopCodeFromUrl(rawInput);
  if (!shopCode) {
    return NextResponse.json({ error: "shopCodeを認識できませんでした" }, { status: 400 });
  }

  const requestedCount = typeof body.requestedCount === "number" ? Math.min(3000, Math.max(30, body.requestedCount)) : 300;

  try {
    const { items, totalCount } = await searchIchibaItems({ shopCode, availability: false, requestedCount });
    return NextResponse.json({ shopCode, items, marketTotalCount: totalCount });
  } catch (err) {
    if (err instanceof RakutenApiError) {
      const status = err.status ?? (err.kind === "config" ? 500 : 502);
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status }, { status });
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました" }, { status: 500 });
  }
}

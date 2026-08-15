import { NextRequest, NextResponse } from "next/server";
import { EXTENDED_ELEMENTS, fetchItemByCode } from "@/lib/rakutenIchibaApi";

export const runtime = "nodejs";
const MAX_ITEMS = 100;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const itemCodes = Array.isArray(body.itemCodes)
    ? body.itemCodes.filter((c): c is string => typeof c === "string" && c.trim().length > 0).slice(0, MAX_ITEMS)
    : [];

  if (itemCodes.length === 0) {
    return NextResponse.json({ error: "監視対象のitemCodeを1件以上登録してください" }, { status: 400 });
  }

  const results: Record<string, { ok: true; item: Awaited<ReturnType<typeof fetchItemByCode>> } | { ok: false; error: string }> = {};

  for (const itemCode of itemCodes) {
    try {
      const item = await fetchItemByCode(itemCode, EXTENDED_ELEMENTS);
      results[itemCode] = item ? { ok: true, item } : { ok: false, error: "商品が見つかりませんでした" };
    } catch (err) {
      results[itemCode] = { ok: false, error: err instanceof Error ? err.message : "取得エラー" };
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return NextResponse.json({ results });
}

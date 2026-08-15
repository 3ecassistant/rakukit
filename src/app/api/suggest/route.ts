import { NextRequest, NextResponse } from "next/server";
import { SuggestApiError, fetchSuggestions } from "@/lib/suggestProvider";
import { sanitizeKeyword } from "@/lib/sanitizeKeyword";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const keyword = sanitizeKeyword(req.nextUrl.searchParams.get("q"));

  if (!keyword) {
    return NextResponse.json({ error: "キーワードが指定されていません" }, { status: 400 });
  }

  try {
    const suggestions = await fetchSuggestions(keyword);
    return NextResponse.json({ keyword, suggestions });
  } catch (err) {
    if (err instanceof SuggestApiError) {
      const status = err.status ?? 502;
      return NextResponse.json({ error: err.message, kind: err.kind, status: err.status }, { status });
    }
    return NextResponse.json({ error: "サジェスト取得に失敗しました" }, { status: 502 });
  }
}

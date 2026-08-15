import { RakutenApiError } from "./rakutenIchibaApi";

const ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/Attribute/Search/20220601";
const REQUEST_TIMEOUT_MS = 10000;

export interface RakutenAttribute {
  id: string;
  nameJa: string;
}

/** ジャンルIDに紐づく属性マスタ(属性ID・日本語名称)を取得する。 */
export async function fetchGenreAttributes(genreId: string): Promise<RakutenAttribute[]> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const referrer = process.env.RAKUTEN_API_REFERRER;
  if (!applicationId || !accessKey || !referrer) {
    throw new RakutenApiError("楽天APIの認証情報が設定されていません（サーバー環境変数を確認してください）", null, "config");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("applicationId", applicationId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("genreId", genreId);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Referer: referrer },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new RakutenApiError(
      isTimeout ? "属性APIへのリクエストがタイムアウトしました" : "属性APIとの通信に失敗しました",
      null,
      isTimeout ? "timeout" : "network"
    );
  }

  if (!res.ok) {
    throw new RakutenApiError(`属性APIがエラーを返しました（HTTP ${res.status}）`, res.status, "http");
  }

  try {
    const data = await res.json();
    const attributes: unknown[] = Array.isArray(data?.attributes) ? data.attributes : [];
    return attributes
      .map((a) => {
        const rec = a as Record<string, unknown>;
        const id = typeof rec.id === "string" ? rec.id : typeof rec.attributeId === "string" ? rec.attributeId : null;
        const nameJa =
          typeof rec.nameJa === "string" ? rec.nameJa : typeof rec.name === "string" ? rec.name : null;
        return id && nameJa ? { id, nameJa } : null;
      })
      .filter((a): a is RakutenAttribute => a !== null);
  } catch {
    throw new RakutenApiError("属性APIのレスポンス解析に失敗しました", res.status, "parse");
  }
}

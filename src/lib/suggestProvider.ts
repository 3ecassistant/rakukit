const ENDPOINT = "https://rdc-api-catalog-gateway-api.rakuten.co.jp/SUI/autocomplete/pc";
const REQUEST_TIMEOUT_MS = 8000;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

export class SuggestApiError extends Error {
  status: number | null;
  kind: "http" | "network" | "timeout" | "parse";

  constructor(message: string, status: number | null, kind: SuggestApiError["kind"]) {
    super(message);
    this.name = "SuggestApiError";
    this.status = status;
    this.kind = kind;
  }
}

function isRetryable(error: SuggestApiError): boolean {
  if (error.kind === "timeout" || error.kind === "network") return true;
  if (error.kind === "http" && error.status !== null) return RETRYABLE_STATUS.has(error.status);
  return false;
}

async function fetchOnce(keyword: string): Promise<string[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", keyword);
  url.searchParams.set("acc", "1");
  url.searchParams.set("aid", "4");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Referer: "https://search.rakuten.co.jp/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new SuggestApiError(
      isTimeout ? "リクエストがタイムアウトしました" : "通信エラーが発生しました",
      null,
      isTimeout ? "timeout" : "network"
    );
  }

  if (!res.ok) {
    throw new SuggestApiError(`APIがエラーを返しました（HTTP ${res.status}）`, res.status, "http");
  }

  try {
    const data = await res.json();
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    return suggestions
      .map((item: { name?: unknown }) => (typeof item?.name === "string" ? item.name : null))
      .filter((name: string | null): name is string => Boolean(name && name.trim()));
  } catch {
    throw new SuggestApiError("レスポンスの解析に失敗しました", res.status, "parse");
  }
}

export async function fetchSuggestions(keyword: string): Promise<string[]> {
  try {
    return await fetchOnce(keyword);
  } catch (err) {
    const error = err instanceof SuggestApiError ? err : new SuggestApiError("不明なエラー", null, "network");
    if (!isRetryable(error)) throw error;

    await new Promise((resolve) => setTimeout(resolve, 1500));
    return fetchOnce(keyword);
  }
}

export type MatchStatus = "exact" | "constituent" | "partial" | "unused";
export type SimpleMatchStatus = "used" | "partial" | "unused";

export function tokenizeKeyword(text: string): string[] {
  return text
    .split(/[ 　]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function computeMatchStatus(productName: string, suggestionKeyword: string): MatchStatus {
  const phrase = suggestionKeyword.trim();
  if (!phrase) return "unused";
  if (productName.includes(phrase)) return "exact";

  const tokens = tokenizeKeyword(phrase);
  if (tokens.length === 0) return "unused";
  if (tokens.every((t) => productName.includes(t))) return "constituent";
  if (tokens.some((t) => productName.includes(t))) return "partial";
  return "unused";
}

export function toSimpleStatus(status: MatchStatus): SimpleMatchStatus {
  if (status === "exact" || status === "constituent") return "used";
  if (status === "partial") return "partial";
  return "unused";
}

export const SIMPLE_STATUS_LABELS: Record<SimpleMatchStatus, string> = {
  used: "使用済み",
  partial: "一部使用",
  unused: "未使用",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  exact: "完全一致",
  constituent: "構成語一致",
  partial: "部分一致",
  unused: "未使用",
};

/** サジェストキーワードから起点キーワードの構成語を除いた「追加語」を抽出する。 */
export function extractAdditionalWords(suggestionKeyword: string, rootKeyword: string): string[] {
  const tokens = tokenizeKeyword(suggestionKeyword);
  return tokens.filter((t) => !rootKeyword.includes(t));
}

export interface DuplicateWord {
  word: string;
  count: number;
}

export function findDuplicateWords(productName: string): DuplicateWord[] {
  const tokens = tokenizeKeyword(productName);
  const counts = new Map<string, number>();
  tokens.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([word, count]) => ({ word, count }));
}

/** 商品名を分解し、サジェスト由来の語（追加語として一度でも登場した語）かどうかを判定するためのセットを作る。 */
export function buildSuggestVocabulary(additionalWordsList: string[][]): Set<string> {
  const vocab = new Set<string>();
  additionalWordsList.forEach((words) => words.forEach((w) => vocab.add(w)));
  return vocab;
}

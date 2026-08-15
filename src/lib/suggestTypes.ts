export interface SuggestNode {
  keyword: string;
  depth: number;
  firstParent: string | null;
  order: number;
  firstSeenAt: string;
}

export interface SuggestRelation {
  parent: string;
  child: string;
  depth: number;
  order: number;
  seenAt: string;
}

export interface SuggestErrorEntry {
  keyword: string;
  httpStatus: number | null;
  kind: string;
  message: string;
  occurredAt: string;
  retryCount: number;
}

export type StopReason =
  | "completed"
  | "user-stopped"
  | "api-limit"
  | "keyword-limit"
  | "consecutive-errors"
  | "access-restricted"
  | null;

export interface SuggestProgress {
  apiCount: number;
  processedCount: number;
  queueLength: number;
  uniqueCount: number;
  currentKeyword: string | null;
  apiLimit: number;
  seedIndex: number | null;
  seedTotal: number | null;
}

export interface SuggestSummary {
  rootKeyword: string;
  maxDepth: number;
  apiCount: number;
  depthCounts: Record<number, number>;
  beforeDedupe: number;
  dedupedCount: number;
  uniqueCount: number;
  seeds: string[] | null;
}

export function comparisonKey(keyword: string): string {
  return keyword.trim();
}

// 「バイクカバー」→「バイクカバー 0」〜「バイクカバー 9」「バイクカバー a」〜「バイクカバー z」の36種を
// それぞれ起点として展開調査するための接尾辞一覧。
export const ALPHABET_SUFFIXES = "0123456789abcdefghijklmnopqrstuvwxyz".split("");

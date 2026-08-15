"use client";

import { useCallback, useRef, useState } from "react";
import {
  SuggestNode,
  SuggestRelation,
  SuggestErrorEntry,
  SuggestProgress,
  SuggestSummary,
  StopReason,
  comparisonKey,
  ALPHABET_SUFFIXES,
} from "@/lib/suggestTypes";

export const MAX_API_REQUESTS = 150;
export const MAX_UNIQUE_KEYWORDS = 2000;
// アルファベット・数字展開モードは36起点分をまとめて処理するため、通常モードより大幅に上限を引き上げる。
export const BATCH_MAX_API_REQUESTS = 1800;
export const BATCH_MAX_UNIQUE_KEYWORDS = 6000;
export const REQUEST_INTERVAL_MS = 250;
export const MAX_CONSECUTIVE_ERRORS = 5;

// 深さが増えるほど検索対象が指数的に増えるため、階層ごとに「さらに掘り下げて検索する」件数の上限を設ける。
// キー = そのノードの深さ（例: 2 なら「2階層目のキーワードのうち何件を検索して3階層目を取得するか」）。
// 未指定の深さは DEFAULT_EXPAND_LIMIT を使う。1階層目まではMVPと同じく全件展開する。
const DEPTH_EXPAND_LIMITS: Record<number, number> = {
  1: Infinity,
  2: 20,
};
const DEFAULT_EXPAND_LIMIT = 10;

export type CollectorStatus = "idle" | "running" | "stopped" | "completed";

interface QueueItem {
  keyword: string;
  depth: number;
}

interface StartOptions {
  expandAlphabet?: boolean;
}

export interface SuggestCollectionResult {
  nodes: SuggestNode[];
  relations: SuggestRelation[];
  errors: SuggestErrorEntry[];
  summary: SuggestSummary;
  stopReason: StopReason;
}

type SuggestFetchResult =
  | { suggestions: string[] }
  | { error: string; status: number | null; kind: string };

async function requestSuggestions(keyword: string): Promise<SuggestFetchResult> {
  try {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    if (!res.ok) {
      return {
        error: data?.error ?? "取得に失敗しました",
        status: typeof data?.status === "number" ? data.status : res.status,
        kind: data?.kind ?? "http",
      };
    }
    return { suggestions: Array.isArray(data.suggestions) ? data.suggestions : [] };
  } catch {
    return { error: "通信エラーが発生しました", status: null, kind: "network" };
  }
}

function buildEmptyProgress(apiLimit: number): SuggestProgress {
  return {
    apiCount: 0,
    processedCount: 0,
    queueLength: 0,
    uniqueCount: 0,
    currentKeyword: null,
    apiLimit,
    seedIndex: null,
    seedTotal: null,
  };
}

export function useSuggestCollector() {
  const [status, setStatus] = useState<CollectorStatus>("idle");
  const [nodes, setNodes] = useState<SuggestNode[]>([]);
  const [relations, setRelations] = useState<SuggestRelation[]>([]);
  const [errors, setErrors] = useState<SuggestErrorEntry[]>([]);
  const [progress, setProgress] = useState<SuggestProgress>(buildEmptyProgress(MAX_API_REQUESTS));
  const [summary, setSummary] = useState<SuggestSummary | null>(null);
  const [stopReason, setStopReason] = useState<StopReason>(null);

  const stopRequestedRef = useRef(false);
  const lastRequestAtRef = useRef(0);

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setNodes([]);
    setRelations([]);
    setErrors([]);
    setProgress(buildEmptyProgress(MAX_API_REQUESTS));
    setSummary(null);
    setStopReason(null);
  }, []);

  const start = useCallback(async (
    rootKeywordRaw: string,
    maxDepth: number,
    options: StartOptions = {}
  ): Promise<SuggestCollectionResult | null> => {
    const rootKeyword = rootKeywordRaw.trim();
    if (!rootKeyword) return null;

    const expandAlphabet = options.expandAlphabet ?? false;
    const seeds = expandAlphabet ? ALPHABET_SUFFIXES.map((suffix) => `${rootKeyword} ${suffix}`) : [rootKeyword];
    const apiLimit = expandAlphabet ? BATCH_MAX_API_REQUESTS : MAX_API_REQUESTS;
    const uniqueLimit = expandAlphabet ? BATCH_MAX_UNIQUE_KEYWORDS : MAX_UNIQUE_KEYWORDS;

    stopRequestedRef.current = false;
    lastRequestAtRef.current = 0;
    setStatus("running");
    setNodes([]);
    setRelations([]);
    setErrors([]);
    setSummary(null);
    setStopReason(null);

    const nodesMap = new Map<string, SuggestNode>();
    const relationList: SuggestRelation[] = [];
    const errorList: SuggestErrorEntry[] = [];
    const visited = new Set<string>();
    const queuedKeys = new Set<string>(seeds.map(comparisonKey));
    const queue: QueueItem[] = seeds.map((keyword) => ({ keyword, depth: 0 }));

    let apiCount = 0;
    let processedCount = 0;
    let discoveryOrder = 0;
    let consecutiveErrors = 0;
    let seedsStarted = 0;
    let finalStopReason: StopReason = "completed";
    const depthCounts: Record<number, number> = {};
    const enqueuedCountByDepth: Record<number, number> = {};

    while (queue.length > 0) {
      if (stopRequestedRef.current) {
        finalStopReason = "user-stopped";
        break;
      }
      if (apiCount >= apiLimit) {
        finalStopReason = "api-limit";
        break;
      }
      if (nodesMap.size >= uniqueLimit) {
        finalStopReason = "keyword-limit";
        break;
      }

      const item = queue.shift()!;
      const itemKey = comparisonKey(item.keyword);
      queuedKeys.delete(itemKey);
      if (visited.has(itemKey)) continue;
      visited.add(itemKey);
      if (item.depth === 0) seedsStarted++;

      const waitMs = REQUEST_INTERVAL_MS - (Date.now() - lastRequestAtRef.current);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastRequestAtRef.current = Date.now();

      apiCount++;
      setProgress({
        apiCount,
        processedCount,
        queueLength: queue.length,
        uniqueCount: nodesMap.size,
        currentKeyword: item.keyword,
        apiLimit,
        seedIndex: expandAlphabet ? seedsStarted : null,
        seedTotal: expandAlphabet ? seeds.length : null,
      });

      const result = await requestSuggestions(item.keyword);
      processedCount++;

      if ("error" in result) {
        consecutiveErrors++;
        errorList.push({
          keyword: item.keyword,
          httpStatus: result.status,
          kind: result.kind,
          message: result.error,
          occurredAt: new Date().toISOString(),
          retryCount: 0,
        });
        setErrors([...errorList]);

        if (result.status === 403 || result.status === 429) {
          finalStopReason = "access-restricted";
          break;
        }
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          finalStopReason = "consecutive-errors";
          break;
        }
        continue;
      }

      consecutiveErrors = 0;
      const childDepth = item.depth + 1;

      for (const rawSuggestion of result.suggestions) {
        const trimmed = rawSuggestion.trim();
        if (!trimmed) continue;
        const childKey = comparisonKey(trimmed);
        if (childKey === itemKey || childKey === comparisonKey(rootKeyword)) continue;

        discoveryOrder++;
        const now = new Date().toISOString();
        depthCounts[childDepth] = (depthCounts[childDepth] ?? 0) + 1;
        relationList.push({
          parent: item.keyword,
          child: trimmed,
          depth: childDepth,
          order: discoveryOrder,
          seenAt: now,
        });

        if (!nodesMap.has(childKey)) {
          nodesMap.set(childKey, {
            keyword: trimmed,
            depth: childDepth,
            firstParent: item.keyword,
            order: discoveryOrder,
            firstSeenAt: now,
          });

          // 他の起点（seed）として既にキュー投入済み／処理済みの場合は、子ノードとして重複して積まない。
          if (childDepth < maxDepth && !visited.has(childKey) && !queuedKeys.has(childKey)) {
            const expandLimit = DEPTH_EXPAND_LIMITS[childDepth] ?? DEFAULT_EXPAND_LIMIT;
            const expandedSoFar = enqueuedCountByDepth[childDepth] ?? 0;
            if (expandedSoFar < expandLimit) {
              queue.push({ keyword: trimmed, depth: childDepth });
              queuedKeys.add(childKey);
              enqueuedCountByDepth[childDepth] = expandedSoFar + 1;
            }
          }
        }
      }

      setNodes(Array.from(nodesMap.values()));
      setRelations([...relationList]);
      setProgress({
        apiCount,
        processedCount,
        queueLength: queue.length,
        uniqueCount: nodesMap.size,
        currentKeyword: item.keyword,
        apiLimit,
        seedIndex: expandAlphabet ? seedsStarted : null,
        seedTotal: expandAlphabet ? seeds.length : null,
      });
    }

    const beforeDedupe = relationList.length;
    const uniqueCount = nodesMap.size;

    const finalNodes = Array.from(nodesMap.values());
    const finalSummary: SuggestSummary = {
      rootKeyword,
      maxDepth,
      apiCount,
      depthCounts,
      beforeDedupe,
      dedupedCount: beforeDedupe - uniqueCount,
      uniqueCount,
      seeds: expandAlphabet ? seeds : null,
    };

    setSummary(finalSummary);
    setStopReason(finalStopReason);
    setStatus(finalStopReason === "user-stopped" ? "stopped" : "completed");

    return {
      nodes: finalNodes,
      relations: relationList,
      errors: errorList,
      summary: finalSummary,
      stopReason: finalStopReason,
    };
  }, []);

  return { status, nodes, relations, errors, progress, summary, stopReason, start, stop, reset };
}

import { SuggestSnapshot } from "./suggestTrendDb";

export type DiffStatus = "new" | "out" | "keep";

export interface DiffEntry {
  keyword: string;
  status: DiffStatus;
  depth: number;
  parentKeyword: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface DiffResult {
  baseline: SuggestSnapshot | null;
  isFirstFetch: boolean;
  entries: DiffEntry[];
  newCount: number;
  outCount: number;
  keepCount: number;
  conditionMismatch: boolean;
  anomalyDetected: boolean;
}

function comparisonKey(keyword: string): string {
  return keyword.trim();
}

/**
 * 直前のSnapshotではなく「直前に正常取得(completed)できた、比較除外されていないSnapshot」を
 * 比較基準として採用する。取得失敗(partial/failed)を挟んでも誤ってOUT判定しないための核心ロジック。
 */
export function findComparisonBaseline(
  allSnapshotsDesc: SuggestSnapshot[],
  currentSnapshotId: string
): SuggestSnapshot | null {
  const currentIndex = allSnapshotsDesc.findIndex((s) => s.id === currentSnapshotId);
  if (currentIndex === -1) return null;
  for (let i = currentIndex + 1; i < allSnapshotsDesc.length; i++) {
    const candidate = allSnapshotsDesc[i];
    if (candidate.status === "completed" && !candidate.excludedFromComparison) {
      return candidate;
    }
  }
  return null;
}

function buildFirstLastSeenMaps(
  allSnapshotsAsc: SuggestSnapshot[]
): { firstSeen: Map<string, string>; lastSeen: Map<string, string> } {
  const firstSeen = new Map<string, string>();
  const lastSeen = new Map<string, string>();
  for (const snapshot of allSnapshotsAsc) {
    for (const kw of snapshot.keywords) {
      const key = comparisonKey(kw.keyword);
      if (!firstSeen.has(key)) firstSeen.set(key, snapshot.fetchedAt);
      lastSeen.set(key, snapshot.fetchedAt);
    }
  }
  return { firstSeen, lastSeen };
}

export function computeDiff(
  current: SuggestSnapshot,
  allSnapshotsDesc: SuggestSnapshot[]
): DiffResult {
  const baseline = findComparisonBaseline(allSnapshotsDesc, current.id);
  const { firstSeen, lastSeen } = buildFirstLastSeenMaps([...allSnapshotsDesc].reverse());

  const currentByKey = new Map(current.keywords.map((k) => [comparisonKey(k.keyword), k]));

  if (!baseline) {
    const entries: DiffEntry[] = current.keywords.map((k) => ({
      keyword: k.keyword,
      status: "keep",
      depth: k.depth,
      parentKeyword: k.parentKeyword,
      firstSeenAt: firstSeen.get(comparisonKey(k.keyword)) ?? null,
      lastSeenAt: lastSeen.get(comparisonKey(k.keyword)) ?? null,
    }));
    return {
      baseline: null,
      isFirstFetch: true,
      entries,
      newCount: 0,
      outCount: 0,
      keepCount: entries.length,
      conditionMismatch: false,
      anomalyDetected: false,
    };
  }

  const baselineByKey = new Map(baseline.keywords.map((k) => [comparisonKey(k.keyword), k]));
  const entries: DiffEntry[] = [];

  currentByKey.forEach((k, key) => {
    const status: DiffStatus = baselineByKey.has(key) ? "keep" : "new";
    entries.push({
      keyword: k.keyword,
      status,
      depth: k.depth,
      parentKeyword: k.parentKeyword,
      firstSeenAt: firstSeen.get(key) ?? null,
      lastSeenAt: lastSeen.get(key) ?? null,
    });
  });

  baselineByKey.forEach((k, key) => {
    if (!currentByKey.has(key)) {
      entries.push({
        keyword: k.keyword,
        status: "out",
        depth: k.depth,
        parentKeyword: k.parentKeyword,
        firstSeenAt: firstSeen.get(key) ?? null,
        lastSeenAt: lastSeen.get(key) ?? null,
      });
    }
  });

  const newCount = entries.filter((e) => e.status === "new").length;
  const outCount = entries.filter((e) => e.status === "out").length;
  const keepCount = entries.filter((e) => e.status === "keep").length;

  const conditionMismatch = baseline.depth !== current.depth;
  const anomalyDetected =
    baseline.uniqueCount > 0 && current.uniqueCount < baseline.uniqueCount * 0.5;

  return {
    baseline,
    isFirstFetch: false,
    entries,
    newCount,
    outCount,
    keepCount,
    conditionMismatch,
    anomalyDetected,
  };
}

export function determineSnapshotStatus(
  stopReason: string | null,
  errorCount: number,
  uniqueCount: number
): "completed" | "partial" | "failed" {
  if (uniqueCount === 0 && (stopReason === "access-restricted" || stopReason === "consecutive-errors")) {
    return "failed";
  }
  if (stopReason === "completed" && errorCount === 0) {
    return "completed";
  }
  return "partial";
}

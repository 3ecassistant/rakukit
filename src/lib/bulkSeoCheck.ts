import { KeywordProject, SuggestSnapshot, listProjects, listSnapshots } from "./suggestTrendDb";
import { computeDiff } from "./suggestDiff";
import { computeMatchStatus, extractAdditionalWords, toSimpleStatus } from "./productSeoCheck";

function comparisonKey(keyword: string): string {
  return keyword.trim();
}

export interface ProjectSnapshotData {
  project: KeywordProject;
  latestCompleted: SuggestSnapshot | null;
  allSnapshots: SuggestSnapshot[];
}

/** 起点キーワード（trim済み）→ プロジェクト・最新completed Snapshot のマップを一括ロードする。 */
export async function loadAllProjectData(): Promise<Map<string, ProjectSnapshotData>> {
  const projects = await listProjects();
  const map = new Map<string, ProjectSnapshotData>();
  for (const project of projects) {
    const snapshots = await listSnapshots(project.id);
    const latestCompleted = snapshots.find((s) => s.status === "completed") ?? null;
    map.set(comparisonKey(project.rootKeyword), { project, latestCompleted, allSnapshots: snapshots });
  }
  return map;
}

export interface ProductSeoInput {
  productKey: string;
  productName: string;
  rootKeyword: string;
}

export type ProductDiagnosisStatus = "no-key" | "no-name" | "no-root" | "no-snapshot" | "diagnosed";
export type PriorityLevel = "high" | "mid" | "low";

export interface PriorityKeyword {
  keyword: string;
  additionalWords: string[];
  depth: number;
  priority: PriorityLevel;
  isNew: boolean;
}

export interface ProductDiagnosis {
  productKey: string;
  productName: string;
  rootKeyword: string;
  nameLength: number;
  status: ProductDiagnosisStatus;
  totalKeywords: number;
  usedCount: number;
  partialCount: number;
  unusedCount: number;
  coverageRate: number | null;
  level1Total: number;
  level1Used: number;
  level1CoverageRate: number | null;
  newUnusedCount: number;
  priorityKeywords: PriorityKeyword[];
  highPriorityCount: number;
  isDuplicateKey: boolean;
}

function classifyPriority(depth: number, isNew: boolean): PriorityLevel {
  if (depth === 1) return "high";
  if (isNew) return "mid";
  return "low";
}

function emptyDiagnosis(input: ProductSeoInput, nameLength: number, status: ProductDiagnosisStatus): ProductDiagnosis {
  return {
    productKey: input.productKey,
    productName: input.productName,
    rootKeyword: input.rootKeyword,
    nameLength,
    status,
    totalKeywords: 0,
    usedCount: 0,
    partialCount: 0,
    unusedCount: 0,
    coverageRate: null,
    level1Total: 0,
    level1Used: 0,
    level1CoverageRate: null,
    newUnusedCount: 0,
    priorityKeywords: [],
    highPriorityCount: 0,
    isDuplicateKey: false,
  };
}

export function diagnoseProduct(
  input: ProductSeoInput,
  projectDataMap: Map<string, ProjectSnapshotData>
): ProductDiagnosis {
  const nameLength = Array.from(input.productName).length;
  if (!input.productKey.trim()) return emptyDiagnosis(input, nameLength, "no-key");
  if (!input.productName.trim()) return emptyDiagnosis(input, nameLength, "no-name");

  const rootKeyword = input.rootKeyword.trim();
  if (!rootKeyword) return emptyDiagnosis(input, nameLength, "no-root");

  const data = projectDataMap.get(comparisonKey(rootKeyword));
  if (!data || !data.latestCompleted) return emptyDiagnosis(input, nameLength, "no-snapshot");

  const snapshot = data.latestCompleted;
  const excludeWords = data.project.excludeWords ?? [];
  const diff = computeDiff(snapshot, data.allSnapshots);
  const isNewMap = new Map(
    diff.entries.filter((e) => e.status !== "out").map((e) => [comparisonKey(e.keyword), e.status === "new"])
  );

  const filteredKeywords = snapshot.keywords.filter(
    (k) => !excludeWords.some((w) => w && k.keyword.includes(w))
  );

  let usedCount = 0;
  let partialCount = 0;
  let unusedCount = 0;
  let level1Total = 0;
  let level1Used = 0;
  let newUnusedCount = 0;
  const priorityKeywords: PriorityKeyword[] = [];

  filteredKeywords.forEach((k) => {
    const matchStatus = computeMatchStatus(input.productName, k.keyword);
    const simple = toSimpleStatus(matchStatus);
    if (simple === "used") usedCount++;
    else if (simple === "partial") partialCount++;
    else unusedCount++;

    if (k.depth === 1) {
      level1Total++;
      if (simple === "used") level1Used++;
    }

    const isNew = isNewMap.get(comparisonKey(k.keyword)) ?? false;
    if (simple !== "used" && isNew) newUnusedCount++;

    if (simple !== "used") {
      priorityKeywords.push({
        keyword: k.keyword,
        additionalWords: extractAdditionalWords(k.keyword, rootKeyword),
        depth: k.depth,
        priority: classifyPriority(k.depth, isNew),
        isNew,
      });
    }
  });

  const order: Record<PriorityLevel, number> = { high: 0, mid: 1, low: 2 };
  priorityKeywords.sort((a, b) => order[a.priority] - order[b.priority]);

  const total = filteredKeywords.length;

  return {
    productKey: input.productKey,
    productName: input.productName,
    rootKeyword,
    nameLength,
    status: "diagnosed",
    totalKeywords: total,
    usedCount,
    partialCount,
    unusedCount,
    coverageRate: total > 0 ? (usedCount / total) * 100 : null,
    level1Total,
    level1Used,
    level1CoverageRate: level1Total > 0 ? (level1Used / level1Total) * 100 : null,
    newUnusedCount,
    priorityKeywords,
    highPriorityCount: priorityKeywords.filter((p) => p.priority === "high").length,
    isDuplicateKey: false,
  };
}

export interface SeoStatusThresholds {
  goodLevel1Coverage: number;
  reviewLevel1Coverage: number;
  highPriorityWarningCount: number;
}

export const DEFAULT_SEO_THRESHOLDS: SeoStatusThresholds = {
  goodLevel1Coverage: 80,
  reviewLevel1Coverage: 50,
  highPriorityWarningCount: 5,
};

export type ProductSeoStatus = "priority" | "review" | "good" | "undiagnosed";

export const SEO_STATUS_LABELS: Record<ProductSeoStatus, string> = {
  priority: "改善優先",
  review: "要確認",
  good: "良好",
  undiagnosed: "未診断",
};

export function classifyProductStatus(d: ProductDiagnosis, thresholds: SeoStatusThresholds): ProductSeoStatus {
  if (d.status !== "diagnosed" || d.level1CoverageRate === null) return "undiagnosed";
  if (d.level1CoverageRate < thresholds.reviewLevel1Coverage || d.highPriorityCount >= thresholds.highPriorityWarningCount) {
    return "priority";
  }
  if (d.level1CoverageRate < thresholds.goodLevel1Coverage) return "review";
  return "good";
}

export function markDuplicateKeys(diagnoses: ProductDiagnosis[]): ProductDiagnosis[] {
  const counts = new Map<string, number>();
  diagnoses.forEach((d) => counts.set(d.productKey, (counts.get(d.productKey) ?? 0) + 1));
  return diagnoses.map((d) => ({ ...d, isDuplicateKey: (counts.get(d.productKey) ?? 0) > 1 }));
}

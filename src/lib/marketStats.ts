export function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function quantile(sorted: number[], q: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface DistributionStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
}

export function computeDistribution(values: number[]): DistributionStats {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: mean(sorted),
    median: median(sorted),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  };
}

/** 値がソート済み配列の中で何%タイル(0-100)に位置するか。value以下の件数ベース。 */
export function percentileRank(sorted: number[], value: number): number {
  if (sorted.length === 0) return 0;
  const countBelowOrEqual = sorted.filter((v) => v <= value).length;
  return (countBelowOrEqual / sorted.length) * 100;
}

function niceBucketWidth(range: number, targetBuckets = 5): number {
  if (range <= 0) return 1000;
  const rough = range / targetBuckets;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

export interface Band {
  label: string;
  lower: number;
  upper: number | null;
  count: number;
  ratio: number;
}

/** 価格などの数値配列を自動幅の帯（バンド）へ分割する。 */
export function computeAutoBands(values: number[], unit = "円", targetBuckets = 5): Band[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = niceBucketWidth(max - min, targetBuckets);
  const start = Math.floor(min / width) * width;

  const bounds: { lower: number; upper: number | null }[] = [];
  for (let lower = start; lower <= max; lower += width) {
    const upper = lower + width;
    bounds.push({ lower, upper: upper > max ? null : upper });
  }
  if (bounds.length === 0) bounds.push({ lower: start, upper: null });

  return bounds.map(({ lower, upper }, i) => {
    const count = values.filter((v) => (upper === null ? v >= lower : v >= lower && v < upper)).length;
    const label =
      i === 0 && lower === 0
        ? `〜${(upper! - 1).toLocaleString()}${unit}`
        : upper === null
          ? `${lower.toLocaleString()}${unit}〜`
          : `${lower.toLocaleString()}〜${(upper - 1).toLocaleString()}${unit}`;
    return { label, lower, upper, count, ratio: (count / values.length) * 100 };
  });
}

/** 昇順しきい値配列に対して、valueが到達した最高段階のpointsを返す(境界はthresholds[i]以上でi段階)。 */
export function tierScore(value: number, thresholds: number[], points: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return points[i];
  }
  return points[0];
}

export type StarLevel = 1 | 2 | 3 | 4 | 5;

export function scoreToStars(score0to100: number): StarLevel {
  return Math.min(5, Math.max(1, Math.ceil(Math.max(score0to100, 1) / 20))) as StarLevel;
}

export function starsLabel(stars: StarLevel): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function sampleConfidence(sampleSize: number): "高" | "中" | "低" | "データなし" {
  if (sampleSize >= 30) return "高";
  if (sampleSize >= 10) return "中";
  if (sampleSize >= 1) return "低";
  return "データなし";
}

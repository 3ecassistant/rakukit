import { RakutenRawItem } from "./rakutenIchibaApi";
import { DistributionStats, computeDistribution, mean, tierScore } from "./marketStats";
import { RakutenItem, normalizeItem } from "./rakutenItem";

export type CompetitorItem = RakutenItem;
export { normalizeItem };

function niceBucketWidth(range: number): number {
  if (range <= 0) return 1000;
  const rough = range / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

export interface PriceBand {
  label: string;
  count: number;
  ratio: number;
}

function computePriceBands(prices: number[]): PriceBand[] {
  if (prices.length === 0) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const width = niceBucketWidth(max - min);
  const start = Math.floor(min / width) * width;

  const bands: { lower: number; upper: number | null }[] = [];
  for (let lower = start; lower <= max; lower += width) {
    const upper = lower + width;
    bands.push({ lower, upper: upper > max ? null : upper });
  }
  if (bands.length === 0) bands.push({ lower: start, upper: null });

  return bands.map(({ lower, upper }, i) => {
    const count = prices.filter((p) => (upper === null ? p >= lower : p >= lower && p < upper)).length;
    const label =
      i === 0 && lower === 0
        ? `〜${(upper! - 1).toLocaleString()}円`
        : upper === null
          ? `${lower.toLocaleString()}円〜`
          : `${lower.toLocaleString()}〜${(upper - 1).toLocaleString()}円`;
    return { label, count, ratio: (count / prices.length) * 100 };
  });
}

export interface ReviewBucket {
  label: string;
  count: number;
  ratio: number;
}

const REVIEW_BUCKET_DEFS: { label: string; min: number; max: number | null }[] = [
  { label: "0件", min: 0, max: 0 },
  { label: "1〜9件", min: 1, max: 9 },
  { label: "10〜49件", min: 10, max: 49 },
  { label: "50〜99件", min: 50, max: 99 },
  { label: "100〜499件", min: 100, max: 499 },
  { label: "500〜999件", min: 500, max: 999 },
  { label: "1,000件以上", min: 1000, max: null },
];

function computeReviewBuckets(reviewCounts: number[]): ReviewBucket[] {
  return REVIEW_BUCKET_DEFS.map(({ label, min, max }) => {
    const count = reviewCounts.filter((c) => c >= min && (max === null || c <= max)).length;
    return { label, count, ratio: reviewCounts.length === 0 ? 0 : (count / reviewCounts.length) * 100 };
  });
}

export type BarrierLevel = 1 | 2 | 3 | 4 | 5;

function reviewMedianToBarrierLevel(reviewMedian: number): BarrierLevel {
  if (reviewMedian < 20) return 1;
  if (reviewMedian < 100) return 2;
  if (reviewMedian < 300) return 3;
  if (reviewMedian < 1000) return 4;
  return 5;
}

const BARRIER_LABELS: Record<BarrierLevel, string> = {
  1: "非常に低い",
  2: "低い",
  3: "標準",
  4: "高い",
  5: "非常に高い",
};

export interface ShopStat {
  shopCode: string;
  shopName: string;
  count: number;
  ratio: number;
}

function computeShopAnalysis(items: CompetitorItem[]): {
  uniqueShopCount: number;
  shops: ShopStat[];
  top5ConcentrationRatio: number;
} {
  const byShop = new Map<string, { shopName: string; count: number }>();
  for (const item of items) {
    const entry = byShop.get(item.shopCode);
    if (entry) entry.count += 1;
    else byShop.set(item.shopCode, { shopName: item.shopName, count: 1 });
  }
  const shops: ShopStat[] = Array.from(byShop.entries())
    .map(([shopCode, { shopName, count }]) => ({
      shopCode,
      shopName,
      count,
      ratio: items.length === 0 ? 0 : (count / items.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  const top5Count = shops.slice(0, 5).reduce((sum, s) => sum + s.count, 0);

  return {
    uniqueShopCount: shops.length,
    shops,
    top5ConcentrationRatio: items.length === 0 ? 0 : (top5Count / items.length) * 100,
  };
}

export interface PointAnalysis {
  normalRate: number;
  doubleOrMoreRate: number;
  fiveTimesOrMoreRate: number;
  tenTimesRate: number;
  averagePointRate: number;
}

function computePointAnalysis(items: CompetitorItem[]): PointAnalysis {
  const n = items.length || 1;
  const rates = items.map((i) => i.pointRate);
  return {
    normalRate: (items.filter((i) => i.pointRate <= 1).length / n) * 100,
    doubleOrMoreRate: (items.filter((i) => i.pointRate >= 2).length / n) * 100,
    fiveTimesOrMoreRate: (items.filter((i) => i.pointRate >= 5).length / n) * 100,
    tenTimesRate: (items.filter((i) => i.pointRate >= 10).length / n) * 100,
    averagePointRate: mean(rates),
  };
}

export interface RankingSet {
  byReviewCount: CompetitorItem[];
  byReviewAverage: CompetitorItem[];
  byLowPrice: CompetitorItem[];
  byHighPrice: CompetitorItem[];
  byPointRate: CompetitorItem[];
}

function computeRankings(items: CompetitorItem[]): RankingSet {
  const top = (arr: CompetitorItem[]) => arr.slice(0, 10);
  return {
    byReviewCount: top([...items].sort((a, b) => b.reviewCount - a.reviewCount)),
    byReviewAverage: top([...items].sort((a, b) => b.reviewAverage - a.reviewAverage)),
    byLowPrice: top([...items].sort((a, b) => a.itemPrice - b.itemPrice)),
    byHighPrice: top([...items].sort((a, b) => b.itemPrice - a.itemPrice)),
    byPointRate: top([...items].sort((a, b) => b.pointRate - a.pointRate)),
  };
}

export interface CompetitivenessScore {
  total: number;
  reviewScore: number;
  priceScore: number;
  shopConcentrationScore: number;
  freeShippingScore: number;
  pointScore: number;
  stars: BarrierLevel;
  label: string;
}

function priceCoefficientOfVariation(prices: number[]): number {
  const m = mean(prices);
  if (m === 0) return 0;
  const variance = mean(prices.map((p) => (p - m) ** 2));
  return Math.sqrt(variance) / m;
}

function computeCompetitivenessScore(
  reviewMedian: number,
  prices: number[],
  top5ConcentrationRatio: number,
  freeShippingRate: number,
  pointDoubleOrMoreRate: number
): CompetitivenessScore {
  const reviewScore = [6, 12, 18, 24, 30][reviewMedianToBarrierLevel(reviewMedian) - 1];

  const cv = priceCoefficientOfVariation(prices);
  // 価格が均一（変動係数が小さい）ほど、価格軸での横並び競争が強いとみなす（暫定ロジック）
  const priceScore = cv < 0.15 ? 20 : cv < 0.3 ? 16 : cv < 0.45 ? 12 : cv < 0.6 ? 8 : 4;

  const shopConcentrationScore = tierScore(top5ConcentrationRatio, [0, 20, 40, 60, 80], [4, 8, 12, 16, 20]);
  const freeShippingScore = tierScore(freeShippingRate, [0, 20, 40, 60, 80], [3, 6, 9, 12, 15]);
  const pointScore = tierScore(pointDoubleOrMoreRate, [0, 20, 40, 60, 80], [3, 6, 9, 12, 15]);

  const total = reviewScore + priceScore + shopConcentrationScore + freeShippingScore + pointScore;
  const stars = Math.min(5, Math.max(1, Math.ceil(total / 20))) as BarrierLevel;
  const label =
    total <= 20 ? "競争弱" : total <= 40 ? "やや弱" : total <= 60 ? "標準" : total <= 80 ? "強い" : "非常に強い";

  return { total, reviewScore, priceScore, shopConcentrationScore, freeShippingScore, pointScore, stars, label };
}

export interface CompetitorAnalysisResult {
  itemCount: number;
  marketTotalCount: number;
  price: DistributionStats;
  priceBands: PriceBand[];
  reviewCount: DistributionStats;
  reviewRating: { mean: number; median: number };
  reviewBuckets: ReviewBucket[];
  reviewBarrierLevel: BarrierLevel;
  reviewBarrierLabel: string;
  freeShippingRate: number;
  point: PointAnalysis;
  shop: { uniqueShopCount: number; shops: ShopStat[]; top5ConcentrationRatio: number };
  rankings: RankingSet;
  competitiveness: CompetitivenessScore;
}

export function analyzeCompetitors(rawItems: RakutenRawItem[], marketTotalCount: number): CompetitorAnalysisResult {
  const items = rawItems.map(normalizeItem);
  const prices = items.map((i) => i.itemPrice);
  const reviewCounts = items.map((i) => i.reviewCount);
  const reviewAverages = items.filter((i) => i.reviewCount > 0).map((i) => i.reviewAverage);

  const price = computeDistribution(prices);
  const reviewCountStats = computeDistribution(reviewCounts);
  const reviewRatingStats = computeDistribution(reviewAverages);
  const priceBands = computePriceBands(prices);
  const reviewBuckets = computeReviewBuckets(reviewCounts);
  const reviewBarrierLevel = reviewMedianToBarrierLevel(reviewCountStats.median);
  const freeShippingRate = items.length === 0 ? 0 : (items.filter((i) => i.postageFlag === 0).length / items.length) * 100;
  const point = computePointAnalysis(items);
  const shop = computeShopAnalysis(items);
  const rankings = computeRankings(items);
  const competitiveness = computeCompetitivenessScore(
    reviewCountStats.median,
    prices,
    shop.top5ConcentrationRatio,
    freeShippingRate,
    point.doubleOrMoreRate
  );

  return {
    itemCount: items.length,
    marketTotalCount,
    price,
    priceBands,
    reviewCount: reviewCountStats,
    reviewRating: { mean: reviewRatingStats.mean, median: reviewRatingStats.median },
    reviewBuckets,
    reviewBarrierLevel,
    reviewBarrierLabel: BARRIER_LABELS[reviewBarrierLevel],
    freeShippingRate,
    point,
    shop,
    rankings,
    competitiveness,
  };
}

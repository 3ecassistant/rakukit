import { RakutenRawItem } from "./rakutenIchibaApi";
import { RakutenItem, normalizeItem } from "./rakutenItem";
import { Band, DistributionStats, computeAutoBands, computeDistribution, tierScore } from "./marketStats";

export interface ReviewBucket {
  label: string;
  count: number;
  ratio: number;
}

const REVIEW_BUCKET_DEFS: { label: string; min: number; max: number | null }[] = [
  { label: "0件", min: 0, max: 0 },
  { label: "1〜49件", min: 1, max: 49 },
  { label: "50〜99件", min: 50, max: 99 },
  { label: "100〜499件", min: 100, max: 499 },
  { label: "500件以上", min: 500, max: null },
];

export interface GenreBreakdown {
  genreId: string;
  count: number;
  ratio: number;
  priceMedian: number;
  reviewMedian: number;
}

export interface MainCandidateItem {
  item: RakutenItem;
  rank: number;
  score: number;
}

export interface ShopCompositionResult {
  shopSearchTotalCount: number;
  itemCount: number;
  fetchRate: number;
  isPartial: boolean;
  price: DistributionStats;
  priceBands: Band[];
  reviewCount: DistributionStats;
  reviewBuckets: ReviewBucket[];
  reviewConcentrationTop10Rate: number;
  freeShippingRate: number;
  pointUpRate: number;
  genreBreakdown: GenreBreakdown[];
  mainCandidates: MainCandidateItem[];
}

export function analyzeShopComposition(rawItems: RakutenRawItem[], shopSearchTotalCount: number): ShopCompositionResult {
  const items = rawItems.map(normalizeItem);
  const n = items.length;
  const prices = items.map((i) => i.itemPrice);
  const reviewCounts = items.map((i) => i.reviewCount);

  const price = computeDistribution(prices);
  const priceBands = computeAutoBands(prices);
  const reviewCount = computeDistribution(reviewCounts);
  const reviewBuckets: ReviewBucket[] = REVIEW_BUCKET_DEFS.map(({ label, min, max }) => {
    const count = reviewCounts.filter((c) => c >= min && (max === null || c <= max)).length;
    return { label, count, ratio: n === 0 ? 0 : (count / n) * 100 };
  });

  const totalReviewSum = reviewCounts.reduce((s, c) => s + c, 0);
  const top10ReviewSum = [...reviewCounts].sort((a, b) => b - a).slice(0, 10).reduce((s, c) => s + c, 0);
  const reviewConcentrationTop10Rate = totalReviewSum === 0 ? 0 : (top10ReviewSum / totalReviewSum) * 100;

  const freeShippingRate = n === 0 ? 0 : (items.filter((i) => i.postageFlag === 0).length / n) * 100;
  const pointUpRate = n === 0 ? 0 : (items.filter((i) => i.pointRate > 1).length / n) * 100;

  const byGenre = new Map<string, RakutenItem[]>();
  for (const item of items) {
    const list = byGenre.get(item.genreId) ?? [];
    list.push(item);
    byGenre.set(item.genreId, list);
  }
  const genreBreakdown: GenreBreakdown[] = Array.from(byGenre.entries())
    .map(([genreId, list]) => ({
      genreId,
      count: list.length,
      ratio: (list.length / n) * 100,
      priceMedian: computeDistribution(list.map((i) => i.itemPrice)).median,
      reviewMedian: computeDistribution(list.map((i) => i.reviewCount)).median,
    }))
    .sort((a, b) => b.count - a.count);

  const mainCandidates: MainCandidateItem[] = items
    .map((item, index) => {
      const reviewCountScore = tierScore(item.reviewCount, [0, 50, 200, 500, 1500], [10, 20, 30, 40, 50]);
      const reviewAverageScore = tierScore(item.reviewAverage, [0, 4.0, 4.3, 4.5, 4.7], [3, 6, 9, 12, 15]);
      const positionScore = n <= 1 ? 20 : 20 * (1 - index / (n - 1));
      const sharePct = totalReviewSum === 0 ? 0 : (item.reviewCount / totalReviewSum) * 100;
      const shareScore = tierScore(sharePct, [0, 2, 5, 10, 20], [3, 6, 9, 12, 15]);
      const score = Math.round(reviewCountScore + reviewAverageScore + positionScore + shareScore);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return {
    shopSearchTotalCount,
    itemCount: n,
    fetchRate: shopSearchTotalCount === 0 ? 100 : (n / shopSearchTotalCount) * 100,
    isPartial: n < shopSearchTotalCount,
    price,
    priceBands,
    reviewCount,
    reviewBuckets,
    reviewConcentrationTop10Rate,
    freeShippingRate,
    pointUpRate,
    genreBreakdown,
    mainCandidates,
  };
}

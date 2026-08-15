import { RakutenRawItem } from "./rakutenIchibaApi";
import { normalizeItem } from "./rakutenItem";
import { Band, DistributionStats, StarLevel, computeAutoBands, computeDistribution, percentileRank, tierScore } from "./marketStats";

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
  { label: "100〜299件", min: 100, max: 299 },
  { label: "300〜499件", min: 300, max: 499 },
  { label: "500〜999件", min: 500, max: 999 },
  { label: "1,000〜2,999件", min: 1000, max: 2999 },
  { label: "3,000件以上", min: 3000, max: null },
];

export interface PriceReviewBand extends Band {
  reviewMedian: number;
}

export interface ReviewBarrierScore {
  total: number;
  overallMedianScore: number;
  top30MedianScore: number;
  over1000RateScore: number;
  lowReviewTop30Score: number;
  top30MultiplierScore: number;
  stars: StarLevel;
  label: string;
}

export interface OwnReviewResult {
  reviewCount: number;
  percentile: number;
  gapFromMedian: number;
  gapFromMedianRate: number;
  gapFromTop30Median: number;
  ratioToTop30Median: number;
  position: "少" | "やや少" | "市場中心" | "やや多" | "多";
}

export interface ReviewBarrierResult {
  itemCount: number;
  marketTotalCount: number;
  reviewCount: DistributionStats;
  reviewBuckets: ReviewBucket[];
  zeroRate: number;
  under50Rate: number;
  over100Rate: number;
  over500Rate: number;
  over1000Rate: number;
  over3000Rate: number;
  top30Median: number;
  top30Multiplier: number;
  lowReviewInTop30Count: number;
  lowReviewInTop30Rate: number;
  entryOpportunityStars: StarLevel;
  barrierScore: ReviewBarrierScore;
  priceReviewBands: PriceReviewBand[];
  own: OwnReviewResult | null;
}

function reviewMedianTierScore(medianValue: number, maxPoints: number): number {
  const points = [maxPoints * 0.2, maxPoints * 0.4, maxPoints * 0.6, maxPoints * 0.8, maxPoints];
  if (medianValue < 20) return points[0];
  if (medianValue < 100) return points[1];
  if (medianValue < 300) return points[2];
  if (medianValue < 1000) return points[3];
  return points[4];
}

function ownPosition(percentile: number): OwnReviewResult["position"] {
  if (percentile <= 20) return "少";
  if (percentile <= 40) return "やや少";
  if (percentile <= 60) return "市場中心";
  if (percentile <= 80) return "やや多";
  return "多";
}

export function analyzeReviewBarrier(
  rawItems: RakutenRawItem[],
  marketTotalCount: number,
  ownReviewCount: number | null,
  lowReviewThreshold = 50
): ReviewBarrierResult {
  const items = rawItems.map(normalizeItem);
  const reviewCounts = items.map((i) => i.reviewCount);
  const sortedReviewCounts = [...reviewCounts].sort((a, b) => a - b);
  const reviewCount = computeDistribution(reviewCounts);

  const reviewBuckets: ReviewBucket[] = REVIEW_BUCKET_DEFS.map(({ label, min, max }) => {
    const count = reviewCounts.filter((c) => c >= min && (max === null || c <= max)).length;
    return { label, count, ratio: items.length === 0 ? 0 : (count / items.length) * 100 };
  });

  const n = items.length || 1;
  const zeroRate = (reviewCounts.filter((c) => c === 0).length / n) * 100;
  const under50Rate = (reviewCounts.filter((c) => c < lowReviewThreshold).length / n) * 100;
  const over100Rate = (reviewCounts.filter((c) => c >= 100).length / n) * 100;
  const over500Rate = (reviewCounts.filter((c) => c >= 500).length / n) * 100;
  const over1000Rate = (reviewCounts.filter((c) => c >= 1000).length / n) * 100;
  const over3000Rate = (reviewCounts.filter((c) => c >= 3000).length / n) * 100;

  const top30Items = items.slice(0, 30);
  const top30Median = computeDistribution(top30Items.map((i) => i.reviewCount)).median;
  const top30Multiplier = reviewCount.median === 0 ? 0 : top30Median / reviewCount.median;
  const lowReviewInTop30Count = top30Items.filter((i) => i.reviewCount < lowReviewThreshold).length;
  const lowReviewInTop30Rate = top30Items.length === 0 ? 0 : (lowReviewInTop30Count / top30Items.length) * 100;

  const entryOpportunityStars = tierScore(lowReviewInTop30Rate, [0, 1, 10, 20, 30], [1, 2, 3, 4, 5]) as StarLevel;

  const overallMedianScore = reviewMedianTierScore(reviewCount.median, 25);
  const top30MedianScore = reviewMedianTierScore(top30Median, 25);
  const over1000RateScore = tierScore(over1000Rate, [0, 5, 15, 30, 50], [3, 6, 9, 12, 15]);
  // 低レビュー上位出現率が高いほど参入余地が大きい(障壁が低い)ため、障壁スコアへは逆方向で加点する
  const lowReviewTop30Score = tierScore(30 - lowReviewInTop30Rate, [0, 10, 20, 29, 30], [4, 8, 12, 16, 20]);
  const top30MultiplierScore = tierScore(top30Multiplier, [1.0, 1.5, 2.0, 3.0, 5.0], [3, 6, 9, 12, 15]);
  const total = overallMedianScore + top30MedianScore + over1000RateScore + lowReviewTop30Score + top30MultiplierScore;
  const stars = tierScore(total, [0, 21, 41, 61, 81], [1, 2, 3, 4, 5]) as StarLevel;
  const label = total <= 20 ? "非常に低い" : total <= 40 ? "低い" : total <= 60 ? "標準" : total <= 80 ? "高い" : "非常に高い";

  const prices = items.map((i) => i.itemPrice);
  const bands = computeAutoBands(prices);
  const priceReviewBands: PriceReviewBand[] = bands.map((band) => {
    const inBand = items.filter((i) => (band.upper === null ? i.itemPrice >= band.lower : i.itemPrice >= band.lower && i.itemPrice < band.upper));
    return { ...band, reviewMedian: computeDistribution(inBand.map((i) => i.reviewCount)).median };
  });

  let own: OwnReviewResult | null = null;
  if (ownReviewCount !== null) {
    const percentile = percentileRank(sortedReviewCounts, ownReviewCount);
    own = {
      reviewCount: ownReviewCount,
      percentile,
      gapFromMedian: ownReviewCount - reviewCount.median,
      gapFromMedianRate: reviewCount.median === 0 ? 0 : (ownReviewCount / reviewCount.median - 1) * 100,
      gapFromTop30Median: ownReviewCount - top30Median,
      ratioToTop30Median: top30Median === 0 ? 0 : (ownReviewCount / top30Median) * 100,
      position: ownPosition(percentile),
    };
  }

  return {
    itemCount: items.length,
    marketTotalCount,
    reviewCount,
    reviewBuckets,
    zeroRate,
    under50Rate,
    over100Rate,
    over500Rate,
    over1000Rate,
    over3000Rate,
    top30Median,
    top30Multiplier,
    lowReviewInTop30Count,
    lowReviewInTop30Rate,
    entryOpportunityStars,
    barrierScore: { total, overallMedianScore, top30MedianScore, over1000RateScore, lowReviewTop30Score, top30MultiplierScore, stars, label },
    priceReviewBands,
    own,
  };
}

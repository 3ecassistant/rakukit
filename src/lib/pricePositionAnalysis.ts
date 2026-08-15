import { RakutenRawItem } from "./rakutenIchibaApi";
import { normalizeItem } from "./rakutenItem";
import { Band, DistributionStats, computeAutoBands, computeDistribution, percentileRank } from "./marketStats";

export interface ReviewBandPriceStat {
  label: string;
  count: number;
  price: DistributionStats;
}

export type PricePosition = "低価格帯" | "やや低価格" | "市場中心" | "やや高価格" | "高価格帯";

export interface OwnPriceResult {
  price: number;
  diff: number;
  diffRate: number;
  percentile: number;
  position: PricePosition;
}

export interface PricePositionResult {
  itemCount: number;
  marketTotalCount: number;
  price: DistributionStats;
  priceBands: Band[];
  mostCommonBand: Band | null;
  reviewBandPrice: ReviewBandPriceStat[];
  strongCompetitor: { count: number; price: DistributionStats; reviewCountThreshold: number; reviewAverageThreshold: number };
  shippingPrice: {
    included: DistributionStats & { count: number };
    separate: DistributionStats & { count: number };
  };
  taxSeparateCount: number;
  own: OwnPriceResult | null;
}

const REVIEW_BANDS: { label: string; min: number; max: number | null }[] = [
  { label: "0〜9件", min: 0, max: 9 },
  { label: "10〜49件", min: 10, max: 49 },
  { label: "50〜99件", min: 50, max: 99 },
  { label: "100〜499件", min: 100, max: 499 },
  { label: "500〜999件", min: 500, max: 999 },
  { label: "1,000件以上", min: 1000, max: null },
];

function pricePosition(percentile: number): PricePosition {
  if (percentile <= 20) return "低価格帯";
  if (percentile <= 40) return "やや低価格";
  if (percentile <= 60) return "市場中心";
  if (percentile <= 80) return "やや高価格";
  return "高価格帯";
}

export function analyzePricePosition(
  rawItems: RakutenRawItem[],
  marketTotalCount: number,
  ownPrice: number | null,
  strongReviewCountThreshold = 100,
  strongReviewAverageThreshold = 4.3
): PricePositionResult {
  const items = rawItems.map(normalizeItem);
  const prices = items.map((i) => i.itemPrice).sort((a, b) => a - b);
  const price = computeDistribution(prices);
  const priceBands = computeAutoBands(prices);
  const mostCommonBand = priceBands.length > 0 ? priceBands.reduce((a, b) => (b.count > a.count ? b : a)) : null;

  const reviewBandPrice: ReviewBandPriceStat[] = REVIEW_BANDS.map(({ label, min, max }) => {
    const grouped = items.filter((i) => i.reviewCount >= min && (max === null || i.reviewCount <= max));
    return { label, count: grouped.length, price: computeDistribution(grouped.map((i) => i.itemPrice)) };
  });

  const strong = items.filter(
    (i) => i.reviewCount >= strongReviewCountThreshold && i.reviewAverage >= strongReviewAverageThreshold
  );
  const strongCompetitor = {
    count: strong.length,
    price: computeDistribution(strong.map((i) => i.itemPrice)),
    reviewCountThreshold: strongReviewCountThreshold,
    reviewAverageThreshold: strongReviewAverageThreshold,
  };

  const included = items.filter((i) => i.postageFlag === 0);
  const separate = items.filter((i) => i.postageFlag === 1);
  const shippingPrice = {
    included: { ...computeDistribution(included.map((i) => i.itemPrice)), count: included.length },
    separate: { ...computeDistribution(separate.map((i) => i.itemPrice)), count: separate.length },
  };

  const taxSeparateCount = items.filter((i) => i.taxFlag === 1).length;

  let own: OwnPriceResult | null = null;
  if (ownPrice !== null && prices.length > 0) {
    const percentile = percentileRank(prices, ownPrice);
    const diff = ownPrice - price.median;
    const diffRate = price.median === 0 ? 0 : (ownPrice / price.median - 1) * 100;
    own = { price: ownPrice, diff, diffRate, percentile, position: pricePosition(percentile) };
  }

  return {
    itemCount: items.length,
    marketTotalCount,
    price,
    priceBands,
    mostCommonBand,
    reviewBandPrice,
    strongCompetitor,
    shippingPrice,
    taxSeparateCount,
    own,
  };
}

import { RakutenRawItem } from "./rakutenIchibaApi";
import { RakutenItem, normalizeItem } from "./rakutenItem";
import { Band, DistributionStats, computeAutoBands, computeDistribution, percentileRank } from "./marketStats";

export type PricePosition = "低価格帯" | "中低価格" | "中高価格" | "高価格帯";

export interface OwnPriceComparison {
  price: number;
  percentile: number;
  diff: number;
  diffRate: number;
  position: PricePosition;
}

export interface PriceBandWithReview extends Band {
  reviewMedian: number;
}

export interface ShopPriceStat {
  shopCode: string;
  shopName: string;
  count: number;
  priceMedian: number;
  priceMin: number;
  priceMax: number;
  reviewMedian: number;
}

export interface PriceResearchAnalysis {
  itemCount: number;
  marketTotalCount: number;
  price: DistributionStats;
  iqr: number;
  priceBands: PriceBandWithReview[];
  mostCommonBand: PriceBandWithReview | null;
  reviewMedian: number;
  freeShippingRate: number;
  pointUpRate: number;
  own: OwnPriceComparison | null;
  highReviewGroup: { count: number; price: DistributionStats };
  highRatingGroup: { count: number; price: DistributionStats };
  shippingPrice: { included: DistributionStats & { count: number }; separate: DistributionStats & { count: number } };
  pointPrice: { pointUp: DistributionStats & { count: number }; normal: DistributionStats & { count: number } };
  shopPrice: ShopPriceStat[];
}

function pricePosition(percentile: number): PricePosition {
  if (percentile <= 25) return "低価格帯";
  if (percentile <= 50) return "中低価格";
  if (percentile <= 75) return "中高価格";
  return "高価格帯";
}

export function analyzePriceResearch(rawItems: RakutenRawItem[], marketTotalCount: number, ownPrice: number | null): PriceResearchAnalysis {
  const items: RakutenItem[] = rawItems.map(normalizeItem);
  const n = items.length;
  const prices = items.map((i) => i.itemPrice).sort((a, b) => a - b);
  const price = computeDistribution(prices);
  const iqr = price.q3 - price.q1;

  const bands = computeAutoBands(prices);
  const priceBands: PriceBandWithReview[] = bands.map((band) => {
    const inBand = items.filter((i) => (band.upper === null ? i.itemPrice >= band.lower : i.itemPrice >= band.lower && i.itemPrice < band.upper));
    return { ...band, reviewMedian: computeDistribution(inBand.map((i) => i.reviewCount)).median };
  });
  const mostCommonBand = priceBands.length > 0 ? priceBands.reduce((a, b) => (b.count > a.count ? b : a)) : null;

  const reviewMedian = computeDistribution(items.map((i) => i.reviewCount)).median;
  const freeShippingRate = n === 0 ? 0 : (items.filter((i) => i.postageFlag === 0).length / n) * 100;
  const pointUpRate = n === 0 ? 0 : (items.filter((i) => i.pointRate > 1).length / n) * 100;

  let own: OwnPriceComparison | null = null;
  if (ownPrice !== null && prices.length > 0) {
    const percentile = percentileRank(prices, ownPrice);
    own = {
      price: ownPrice,
      percentile,
      diff: ownPrice - price.median,
      diffRate: price.median === 0 ? 0 : (ownPrice / price.median - 1) * 100,
      position: pricePosition(percentile),
    };
  }

  const highReview = items.filter((i) => i.reviewCount >= 500);
  const highRating = items.filter((i) => i.reviewCount >= 100 && i.reviewAverage >= 4.3);

  const included = items.filter((i) => i.postageFlag === 0);
  const separate = items.filter((i) => i.postageFlag === 1);
  const pointUp = items.filter((i) => i.pointRate > 1);
  const normal = items.filter((i) => i.pointRate <= 1);

  const byShop = new Map<string, RakutenItem[]>();
  for (const item of items) {
    const list = byShop.get(item.shopCode) ?? [];
    list.push(item);
    byShop.set(item.shopCode, list);
  }
  const shopPrice: ShopPriceStat[] = Array.from(byShop.entries())
    .map(([shopCode, list]) => {
      const dist = computeDistribution(list.map((i) => i.itemPrice));
      return {
        shopCode,
        shopName: list[0]?.shopName ?? shopCode,
        count: list.length,
        priceMedian: dist.median,
        priceMin: dist.min,
        priceMax: dist.max,
        reviewMedian: computeDistribution(list.map((i) => i.reviewCount)).median,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    itemCount: n,
    marketTotalCount,
    price,
    iqr,
    priceBands,
    mostCommonBand,
    reviewMedian,
    freeShippingRate,
    pointUpRate,
    own,
    highReviewGroup: { count: highReview.length, price: computeDistribution(highReview.map((i) => i.itemPrice)) },
    highRatingGroup: { count: highRating.length, price: computeDistribution(highRating.map((i) => i.itemPrice)) },
    shippingPrice: {
      included: { ...computeDistribution(included.map((i) => i.itemPrice)), count: included.length },
      separate: { ...computeDistribution(separate.map((i) => i.itemPrice)), count: separate.length },
    },
    pointPrice: {
      pointUp: { ...computeDistribution(pointUp.map((i) => i.itemPrice)), count: pointUp.length },
      normal: { ...computeDistribution(normal.map((i) => i.itemPrice)), count: normal.length },
    },
    shopPrice,
  };
}

export interface PriceChangeEntry {
  itemCode: string;
  itemName: string;
  oldPrice: number;
  newPrice: number;
  diff: number;
  diffRate: number;
  shopName: string;
  itemUrl: string;
}

export interface ComparisonResult {
  priceDrops: PriceChangeEntry[];
  priceRises: PriceChangeEntry[];
  newlyAppeared: RakutenItem[];
  outOfRange: { itemCode: string; itemName: string; itemPrice: number }[];
}

export function compareWithPrevious(
  currentItems: RakutenItem[],
  previousPriceByItemCode: Map<string, number>,
  previousNameByItemCode: Map<string, string>
): ComparisonResult {
  const priceDrops: PriceChangeEntry[] = [];
  const priceRises: PriceChangeEntry[] = [];
  const newlyAppeared: RakutenItem[] = [];
  const currentCodes = new Set(currentItems.map((i) => i.itemCode));

  for (const item of currentItems) {
    const prevPrice = previousPriceByItemCode.get(item.itemCode);
    if (prevPrice === undefined) {
      newlyAppeared.push(item);
      continue;
    }
    if (item.itemPrice !== prevPrice) {
      const diff = item.itemPrice - prevPrice;
      const diffRate = prevPrice === 0 ? 0 : (diff / prevPrice) * 100;
      const entry: PriceChangeEntry = {
        itemCode: item.itemCode,
        itemName: item.itemName,
        oldPrice: prevPrice,
        newPrice: item.itemPrice,
        diff,
        diffRate,
        shopName: item.shopName,
        itemUrl: item.itemUrl,
      };
      if (diff < 0) priceDrops.push(entry);
      else priceRises.push(entry);
    }
  }

  const outOfRange = Array.from(previousPriceByItemCode.entries())
    .filter(([itemCode]) => !currentCodes.has(itemCode))
    .map(([itemCode, itemPrice]) => ({ itemCode, itemName: previousNameByItemCode.get(itemCode) ?? itemCode, itemPrice }));

  priceDrops.sort((a, b) => a.diffRate - b.diffRate);
  priceRises.sort((a, b) => b.diffRate - a.diffRate);

  return { priceDrops, priceRises, newlyAppeared, outOfRange };
}

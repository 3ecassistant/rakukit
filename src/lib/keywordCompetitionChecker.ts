import { RakutenRawItem } from "./rakutenIchibaApi";
import { normalizeItem } from "./rakutenItem";
import { computeDistribution, percentileRank, tierScore } from "./marketStats";

export interface KeywordCompetitionResult {
  keyword: string;
  productCount: number;
  itemCount: number;
  competitorRemainingRate: number | null;
  competitorReductionRate: number | null;
  reviewMedian: number;
  priceMedian: number;
  freeShippingRate: number;
  pointUpRate: number;
  uniqueShopCount: number;
  top5ShopConcentration: number;
  ownPricePercentile: number | null;
  productCountScore: number;
  reviewScore: number;
  shopConcentrationScore: number;
  priceCompetitionScore: number;
  freeShippingScore: number;
  pointScore: number;
  competitionScore: number;
  opportunityScore: number;
}

function priceCoefficientOfVariation(prices: number[]): number {
  if (prices.length === 0) return 0;
  const m = prices.reduce((s, v) => s + v, 0) / prices.length;
  if (m === 0) return 0;
  const variance = prices.reduce((s, v) => s + (v - m) ** 2, 0) / prices.length;
  return Math.sqrt(variance) / m;
}

export function analyzeKeywordResult(keyword: string, rawItems: RakutenRawItem[], productCount: number, baseProductCount: number | null, ownPrice: number | null): KeywordCompetitionResult {
  const items = rawItems.map(normalizeItem);
  const n = items.length;
  const prices = items.map((i) => i.itemPrice);
  const reviewCounts = items.map((i) => i.reviewCount);

  const reviewMedian = computeDistribution(reviewCounts).median;
  const priceMedian = computeDistribution(prices).median;
  const freeShippingRate = n === 0 ? 0 : (items.filter((i) => i.postageFlag === 0).length / n) * 100;
  const pointUpRate = n === 0 ? 0 : (items.filter((i) => i.pointRate > 1).length / n) * 100;

  const byShop = new Map<string, number>();
  for (const item of items) byShop.set(item.shopCode, (byShop.get(item.shopCode) ?? 0) + 1);
  const shopCounts = Array.from(byShop.values()).sort((a, b) => b - a);
  const uniqueShopCount = byShop.size;
  const top5Count = shopCounts.slice(0, 5).reduce((s, c) => s + c, 0);
  const top5ShopConcentration = n === 0 ? 0 : (top5Count / n) * 100;

  const competitorRemainingRate = baseProductCount && baseProductCount > 0 ? (productCount / baseProductCount) * 100 : null;
  const competitorReductionRate = competitorRemainingRate !== null ? 100 - competitorRemainingRate : null;

  const ownPricePercentile = ownPrice !== null && prices.length > 0 ? percentileRank([...prices].sort((a, b) => a - b), ownPrice) : null;

  const reviewScore = tierScore(reviewMedian, [0, 20, 100, 300, 1000], [6, 12, 18, 24, 30]);
  const shopConcentrationScore = tierScore(top5ShopConcentration, [0, 20, 40, 60, 80], [3, 6, 9, 12, 15]);
  const cv = priceCoefficientOfVariation(prices);
  const priceCompetitionScore = cv < 0.15 ? 10 : cv < 0.3 ? 8 : cv < 0.45 ? 6 : cv < 0.6 ? 4 : 2;
  const freeShippingScore = tierScore(freeShippingRate, [0, 40, 60, 75, 90], [2, 4, 6, 8, 10]);
  const pointScore = tierScore(pointUpRate, [0, 10, 20, 35, 50], [1, 2, 3, 4, 5]);

  return {
    keyword,
    productCount,
    itemCount: n,
    competitorRemainingRate,
    competitorReductionRate,
    reviewMedian,
    priceMedian,
    freeShippingRate,
    pointUpRate,
    uniqueShopCount,
    top5ShopConcentration,
    ownPricePercentile,
    productCountScore: 0,
    reviewScore,
    shopConcentrationScore,
    priceCompetitionScore,
    freeShippingScore,
    pointScore,
    competitionScore: 0,
    opportunityScore: 0,
  };
}

/** 商品数スコア(30点)はバッチ内の相対パーセンタイルで決まるため、全キーワード分析後にまとめて計算する。 */
export function applyProductCountScores(results: KeywordCompetitionResult[]): KeywordCompetitionResult[] {
  const counts = [...results.map((r) => r.productCount)].sort((a, b) => a - b);
  return results.map((r) => {
    const percentile = percentileRank(counts, r.productCount);
    const productCountScore = (percentile / 100) * 30;
    const competitionScore = Math.round(
      productCountScore + r.reviewScore + r.shopConcentrationScore + r.priceCompetitionScore + r.freeShippingScore + r.pointScore
    );
    const opportunityScore = 100 - competitionScore;
    return { ...r, productCountScore: Math.round(productCountScore * 10) / 10, competitionScore, opportunityScore };
  });
}

import { RakutenRawItem } from "./rakutenIchibaApi";
import { RakutenAttribute } from "./rakutenAttributeApi";
import { RakutenItem, normalizeItem } from "./rakutenItem";
import { computeDistribution, percentileRank, sampleConfidence, tierScore } from "./marketStats";

export interface AttributeStat {
  attributeId: string;
  attributeName: string;
  productCount: number;
  usageRate: number;
  priceMedian: number;
  reviewMedian: number;
  shopCount: number;
  freeShippingRate: number;
  pointUpRate: number;
  competitionScore: number;
  opportunityScore: number;
  confidence: "高" | "中" | "低" | "データなし";
}

export interface AttributeCompetitionResult {
  itemCount: number;
  attributeRegistrationRate: number;
  marketPriceMedian: number;
  marketReviewMedian: number;
  attributes: AttributeStat[];
}

export function analyzeAttributeCompetition(rawItems: RakutenRawItem[], attributeMaster: RakutenAttribute[]): AttributeCompetitionResult {
  const items: RakutenItem[] = rawItems.map(normalizeItem);
  const n = items.length;
  const nameMap = new Map(attributeMaster.map((a) => [a.id, a.nameJa]));

  const itemsWithAttributes = items.filter((i) => i.attributeIds.length > 0);
  const attributeRegistrationRate = n === 0 ? 0 : (itemsWithAttributes.length / n) * 100;

  const byAttribute = new Map<string, RakutenItem[]>();
  for (const item of items) {
    for (const attrId of item.attributeIds) {
      const list = byAttribute.get(attrId) ?? [];
      list.push(item);
      byAttribute.set(attrId, list);
    }
  }

  const productCounts = Array.from(byAttribute.values()).map((list) => list.length).sort((a, b) => a - b);

  const attributes: AttributeStat[] = Array.from(byAttribute.entries())
    .map(([attributeId, list]) => {
      const productCount = list.length;
      const usageRate = n === 0 ? 0 : (productCount / n) * 100;
      const priceMedian = computeDistribution(list.map((i) => i.itemPrice)).median;
      const reviewMedian = computeDistribution(list.map((i) => i.reviewCount)).median;
      const shopCount = new Set(list.map((i) => i.shopCode)).size;
      const freeShippingRate = (list.filter((i) => i.postageFlag === 0).length / productCount) * 100;
      const pointUpRate = (list.filter((i) => i.pointRate > 1).length / productCount) * 100;
      const reviewOver500Rate = (list.filter((i) => i.reviewCount >= 500).length / productCount) * 100;

      const productCountPercentile = percentileRank(productCounts, productCount);
      const productCountScore = (productCountPercentile / 100) * 30;
      const reviewScore = tierScore(reviewMedian, [0, 20, 100, 300, 1000], [6, 12, 18, 24, 30]);
      const reviewOver500Score = tierScore(reviewOver500Rate, [0, 5, 15, 30, 50], [3, 6, 9, 12, 15]);
      const shopCountScore = tierScore(shopCount, [0, 5, 15, 30, 50], [2, 4, 6, 8, 10]);
      const freeShippingScore = tierScore(freeShippingRate, [0, 40, 60, 75, 90], [2, 4, 6, 8, 10]);
      const pointScore = tierScore(pointUpRate, [0, 10, 20, 35, 50], [1, 2, 3, 4, 5]);
      const competitionScore = Math.round(productCountScore + reviewScore + reviewOver500Score + shopCountScore + freeShippingScore + pointScore);

      return {
        attributeId,
        attributeName: nameMap.get(attributeId) ?? `属性ID:${attributeId}`,
        productCount,
        usageRate,
        priceMedian,
        reviewMedian,
        shopCount,
        freeShippingRate,
        pointUpRate,
        competitionScore,
        opportunityScore: 100 - competitionScore,
        confidence: sampleConfidence(productCount),
      };
    })
    .sort((a, b) => b.productCount - a.productCount);

  return {
    itemCount: n,
    attributeRegistrationRate,
    marketPriceMedian: computeDistribution(items.map((i) => i.itemPrice)).median,
    marketReviewMedian: computeDistribution(items.map((i) => i.reviewCount)).median,
    attributes,
  };
}

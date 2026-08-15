import { RakutenRawItem } from "./rakutenIchibaApi";
import { RakutenItem, normalizeItem } from "./rakutenItem";
import { Band, StarLevel, computeAutoBands, tierScore } from "./marketStats";

export interface PromotionQuadrant {
  key: "A" | "B" | "C" | "D";
  label: string;
  count: number;
  ratio: number;
}

export interface PriceShippingBand extends Band {
  freeShippingRate: number;
}

export interface PromotionScore {
  total: number;
  shippingRateScore: number;
  top30ShippingRateScore: number;
  pointUpRateScore: number;
  fiveOrMoreRateScore: number;
  top30PointUpRateScore: number;
  strongPromoRateScore: number;
  stars: StarLevel;
  label: string;
}

export interface OwnPromotionComparison {
  postageFree: boolean;
  pointRate: number;
  freeShippingRateDiffPt: number;
  pointUpRateDiffPt: number;
  isStrongPromo: boolean;
  strongPromoRate: number;
}

export interface PromotionCompetitionResult {
  itemCount: number;
  marketTotalCount: number;
  freeShippingRate: number;
  separateShippingRate: number;
  top30FreeShippingRate: number;
  pointUpRate: number;
  fiveOrMoreRate: number;
  tenTimesRate: number;
  averagePointRate: number;
  top30PointUpRate: number;
  quadrants: PromotionQuadrant[];
  strongPromoRate: number;
  top30StrongPromoRate: number;
  priceShippingBands: PriceShippingBand[];
  shippingScore0to100: number;
  pointScore0to100: number;
  score: PromotionScore;
  own: OwnPromotionComparison | null;
}

function rate(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

export function analyzePromotionCompetition(
  rawItems: RakutenRawItem[],
  marketTotalCount: number,
  ownPostageFree: boolean | null,
  ownPointRate: number | null
): PromotionCompetitionResult {
  const items: RakutenItem[] = rawItems.map(normalizeItem);
  const n = items.length;

  const freeShippingCount = items.filter((i) => i.postageFlag === 0).length;
  const freeShippingRate = rate(freeShippingCount, n);
  const separateShippingRate = rate(n - freeShippingCount, n);

  const top30Items = items.slice(0, 30);
  const top30FreeShippingRate = rate(top30Items.filter((i) => i.postageFlag === 0).length, top30Items.length);

  const pointUpCount = items.filter((i) => i.pointRate > 1).length;
  const pointUpRate = rate(pointUpCount, n);
  const fiveOrMoreCount = items.filter((i) => i.pointRate >= 5).length;
  const fiveOrMoreRate = rate(fiveOrMoreCount, n);
  const tenTimesRate = rate(items.filter((i) => i.pointRate >= 10).length, n);
  const averagePointRate = n === 0 ? 0 : items.reduce((sum, i) => sum + i.pointRate, 0) / n;
  const top30PointUpRate = rate(top30Items.filter((i) => i.pointRate > 1).length, top30Items.length);

  const a = items.filter((i) => i.postageFlag === 0 && i.pointRate > 1).length;
  const b = items.filter((i) => i.postageFlag === 0 && i.pointRate <= 1).length;
  const c = items.filter((i) => i.postageFlag === 1 && i.pointRate > 1).length;
  const d = items.filter((i) => i.postageFlag === 1 && i.pointRate <= 1).length;
  const quadrants: PromotionQuadrant[] = [
    { key: "A", label: "送料込み＋ポイントUP", count: a, ratio: rate(a, n) },
    { key: "B", label: "送料込み＋ポイントUPなし", count: b, ratio: rate(b, n) },
    { key: "C", label: "送料別＋ポイントUP", count: c, ratio: rate(c, n) },
    { key: "D", label: "送料別＋ポイントUPなし", count: d, ratio: rate(d, n) },
  ];

  const strongPromoCount = items.filter((i) => i.postageFlag === 0 && i.pointRate >= 5).length;
  const strongPromoRate = rate(strongPromoCount, n);
  const top30StrongPromoCount = top30Items.filter((i) => i.postageFlag === 0 && i.pointRate >= 5).length;
  const top30StrongPromoRate = rate(top30StrongPromoCount, top30Items.length);

  const prices = items.map((i) => i.itemPrice);
  const bands = computeAutoBands(prices);
  const priceShippingBands: PriceShippingBand[] = bands.map((band) => {
    const inBand = items.filter((i) => (band.upper === null ? i.itemPrice >= band.lower : i.itemPrice >= band.lower && i.itemPrice < band.upper));
    return { ...band, freeShippingRate: rate(inBand.filter((i) => i.postageFlag === 0).length, inBand.length) };
  });

  const shippingRateScore = tierScore(freeShippingRate, [0, 40, 60, 75, 90], [4, 8, 12, 16, 20]);
  const top30ShippingRateScore = tierScore(top30FreeShippingRate, [0, 40, 60, 75, 90], [2, 4, 6, 8, 10]);
  const pointUpRateScore = tierScore(pointUpRate, [0, 10, 20, 35, 50], [3, 6, 9, 12, 15]);
  const fiveOrMoreRateScore = tierScore(fiveOrMoreRate, [0, 5, 10, 20, 35], [3, 6, 9, 12, 15]);
  const top30PointUpRateScore = tierScore(top30PointUpRate, [0, 10, 20, 35, 50], [2, 4, 6, 8, 10]);
  const strongPromoRateScore = tierScore(strongPromoRate, [0, 5, 10, 20, 35], [2, 4, 6, 8, 10]);
  const total = shippingRateScore + top30ShippingRateScore + pointUpRateScore + fiveOrMoreRateScore + top30PointUpRateScore + strongPromoRateScore;
  const stars = tierScore(total, [0, 21, 41, 61, 81], [1, 2, 3, 4, 5]) as StarLevel;
  const label = total <= 20 ? "非常に弱い" : total <= 40 ? "弱い" : total <= 60 ? "標準" : total <= 80 ? "強い" : "非常に強い";

  const shippingScore0to100 = Math.min(100, freeShippingRate * 0.7 + top30FreeShippingRate * 0.3);
  const pointScore0to100 = Math.min(100, pointUpRate * 0.4 + fiveOrMoreRate * 0.4 + top30PointUpRate * 0.2);

  let own: OwnPromotionComparison | null = null;
  if (ownPostageFree !== null || ownPointRate !== null) {
    const postageFree = ownPostageFree ?? false;
    const pointRate = ownPointRate ?? 1;
    own = {
      postageFree,
      pointRate,
      freeShippingRateDiffPt: (postageFree ? 100 : 0) - freeShippingRate,
      pointUpRateDiffPt: (pointRate > 1 ? 100 : 0) - pointUpRate,
      isStrongPromo: postageFree && pointRate >= 5,
      strongPromoRate,
    };
  }

  return {
    itemCount: n,
    marketTotalCount,
    freeShippingRate,
    separateShippingRate,
    top30FreeShippingRate,
    pointUpRate,
    fiveOrMoreRate,
    tenTimesRate,
    averagePointRate,
    top30PointUpRate,
    quadrants,
    strongPromoRate,
    top30StrongPromoRate,
    priceShippingBands,
    shippingScore0to100,
    pointScore0to100,
    score: { total, shippingRateScore, top30ShippingRateScore, pointUpRateScore, fiveOrMoreRateScore, top30PointUpRateScore, strongPromoRateScore, stars, label },
    own,
  };
}

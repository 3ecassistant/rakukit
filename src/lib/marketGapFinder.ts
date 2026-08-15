import { RakutenRawItem } from "./rakutenIchibaApi";
import { RakutenAttribute } from "./rakutenAttributeApi";
import { RakutenItem, normalizeItem } from "./rakutenItem";
import { computeAutoBands, computeDistribution, percentileRank, sampleConfidence } from "./marketStats";

export interface MarketCell {
  id: string;
  label: string;
  attributeIds: string[];
  attributeNames: string[];
  priceRangeLabel: string | null;
  productCount: number;
  reviewMedian: number;
  priceMedian: number;
  shopCount: number;
  top5ShopConcentration: number;
  opportunityScore: number;
  confidence: "高" | "中" | "低" | "データなし";
  sampleItems: { itemCode: string; itemName: string; itemUrl: string; itemPrice: number; reviewCount: number }[];
}

export interface MarketGapResult {
  itemCount: number;
  attributeRegistrationRate: number;
  marketBaseline: { priceMedian: number; reviewMedian: number; shopCount: number };
  attributeCells: MarketCell[];
  attributePriceCells: MarketCell[];
  twoAttributeCells: MarketCell[];
}

const MIN_SAMPLE = 10;
const MIN_USAGE_RATE_FOR_COMBO = 5;
const MAX_ATTRIBUTES_FOR_COMBO = 8;

type RawCell = Omit<MarketCell, "opportunityScore" | "confidence">;

function cellStats(items: RakutenItem[]) {
  const shopCounts = new Map<string, number>();
  for (const i of items) shopCounts.set(i.shopCode, (shopCounts.get(i.shopCode) ?? 0) + 1);
  const sortedShopCounts = Array.from(shopCounts.values()).sort((a, b) => b - a);
  const top5 = sortedShopCounts.slice(0, 5).reduce((s, c) => s + c, 0);
  return {
    productCount: items.length,
    reviewMedian: computeDistribution(items.map((i) => i.reviewCount)).median,
    priceMedian: computeDistribution(items.map((i) => i.itemPrice)).median,
    shopCount: shopCounts.size,
    top5ShopConcentration: items.length === 0 ? 0 : (top5 / items.length) * 100,
  };
}

function buildSampleItems(items: RakutenItem[]) {
  return items.slice(0, 10).map((i) => ({ itemCode: i.itemCode, itemName: i.itemName, itemUrl: i.itemUrl, itemPrice: i.itemPrice, reviewCount: i.reviewCount }));
}

function applyOpportunityScores(cells: RawCell[]): MarketCell[] {
  const productCounts = cells.map((c) => c.productCount).sort((a, b) => a - b);
  const reviewMedians = cells.map((c) => c.reviewMedian).sort((a, b) => a - b);
  const priceMedians = cells.map((c) => c.priceMedian).sort((a, b) => a - b);
  const shopCounts = cells.map((c) => c.shopCount).sort((a, b) => a - b);
  const concentrations = cells.map((c) => c.top5ShopConcentration).sort((a, b) => a - b);

  return cells.map((c) => {
    const productCountScore = ((100 - percentileRank(productCounts, c.productCount)) / 100) * 30;
    const reviewScore = ((100 - percentileRank(reviewMedians, c.reviewMedian)) / 100) * 30;
    const priceScore = (percentileRank(priceMedians, c.priceMedian) / 100) * 20;
    const shopCountScore = ((100 - percentileRank(shopCounts, c.shopCount)) / 100) * 10;
    const concentrationScore = ((100 - percentileRank(concentrations, c.top5ShopConcentration)) / 100) * 10;
    const opportunityScore = Math.round(productCountScore + reviewScore + priceScore + shopCountScore + concentrationScore);
    return { ...c, opportunityScore, confidence: sampleConfidence(c.productCount) };
  });
}

export function analyzeMarketGaps(rawItems: RakutenRawItem[], attributeMaster: RakutenAttribute[]): MarketGapResult {
  const items: RakutenItem[] = rawItems.map(normalizeItem);
  const n = items.length;
  const nameMap = new Map(attributeMaster.map((a) => [a.id, a.nameJa]));
  const attrName = (id: string) => nameMap.get(id) ?? `属性ID:${id}`;

  const itemsWithAttributes = items.filter((i) => i.attributeIds.length > 0);
  const attributeRegistrationRate = n === 0 ? 0 : (itemsWithAttributes.length / n) * 100;

  const baseline = cellStats(items);

  const byAttribute = new Map<string, RakutenItem[]>();
  for (const item of items) {
    for (const attrId of item.attributeIds) {
      const list = byAttribute.get(attrId) ?? [];
      list.push(item);
      byAttribute.set(attrId, list);
    }
  }

  const attributeCellsRaw: RawCell[] = Array.from(byAttribute.entries())
    .filter(([, list]) => list.length >= MIN_SAMPLE)
    .map(([attrId, list]) => ({
      id: `attr:${attrId}`,
      label: attrName(attrId),
      attributeIds: [attrId],
      attributeNames: [attrName(attrId)],
      priceRangeLabel: null,
      sampleItems: buildSampleItems(list),
      ...cellStats(list),
    }));
  const attributeCells = applyOpportunityScores(attributeCellsRaw).sort((a, b) => b.opportunityScore - a.opportunityScore);

  const marketBands = computeAutoBands(items.map((i) => i.itemPrice));
  const attributePriceCellsRaw: RawCell[] = [];
  for (const [attrId, list] of byAttribute.entries()) {
    for (const band of marketBands) {
      const inBand = list.filter((i) => (band.upper === null ? i.itemPrice >= band.lower : i.itemPrice >= band.lower && i.itemPrice < band.upper));
      if (inBand.length < MIN_SAMPLE) continue;
      attributePriceCellsRaw.push({
        id: `attr-price:${attrId}:${band.label}`,
        label: `${attrName(attrId)} + ${band.label}`,
        attributeIds: [attrId],
        attributeNames: [attrName(attrId)],
        priceRangeLabel: band.label,
        sampleItems: buildSampleItems(inBand),
        ...cellStats(inBand),
      });
    }
  }
  const attributePriceCells = applyOpportunityScores(attributePriceCellsRaw).sort((a, b) => b.opportunityScore - a.opportunityScore);

  const topAttributeIds = Array.from(byAttribute.entries())
    .filter(([, list]) => (list.length / n) * 100 >= MIN_USAGE_RATE_FOR_COMBO)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_ATTRIBUTES_FOR_COMBO)
    .map(([id]) => id);

  const twoAttributeCellsRaw: RawCell[] = [];
  for (let i = 0; i < topAttributeIds.length; i++) {
    for (let j = i + 1; j < topAttributeIds.length; j++) {
      const idA = topAttributeIds[i];
      const idB = topAttributeIds[j];
      const combo = items.filter((it) => it.attributeIds.includes(idA) && it.attributeIds.includes(idB));
      if (combo.length < MIN_SAMPLE) continue;
      twoAttributeCellsRaw.push({
        id: `attr-attr:${idA}:${idB}`,
        label: `${attrName(idA)} + ${attrName(idB)}`,
        attributeIds: [idA, idB],
        attributeNames: [attrName(idA), attrName(idB)],
        priceRangeLabel: null,
        sampleItems: buildSampleItems(combo),
        ...cellStats(combo),
      });
    }
  }
  const twoAttributeCells = applyOpportunityScores(twoAttributeCellsRaw).sort((a, b) => b.opportunityScore - a.opportunityScore);

  return {
    itemCount: n,
    attributeRegistrationRate,
    marketBaseline: { priceMedian: baseline.priceMedian, reviewMedian: baseline.reviewMedian, shopCount: baseline.shopCount },
    attributeCells,
    attributePriceCells,
    twoAttributeCells,
  };
}

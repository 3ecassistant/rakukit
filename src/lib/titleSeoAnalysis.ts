import { RakutenRawItem } from "./rakutenIchibaApi";
import { normalizeItem } from "./rakutenItem";

export type AnalysisTarget = "itemName" | "catchcopy" | "both";

const DEFAULT_STOPWORDS = ["送料無料", "楽天", "ランキング", "人気", "おすすめ", "商品", "限定", "SALE", "セール"];

const EXCLUDE_SYMBOLS_REGEX = /[【】\[\]★☆！!♪◎○●◆◇■□▼▽＼／｜"'"'、。,.･・:：;；~〜]/g;

const CATEGORY_DICTIONARY: { category: string; words: string[] }[] = [
  { category: "ターゲット", words: ["レディース", "メンズ", "キッズ", "ベビー", "男性", "女性", "ママ", "学生", "ビジネス", "ユニセックス"] },
  { category: "用途", words: ["通勤", "通学", "旅行", "仕事", "普段使い", "アウトドア", "部屋着", "オフィス", "プレゼント用"] },
  { category: "機能", words: ["軽量", "防水", "撥水", "保温", "保冷", "静音", "自立", "ファスナー", "2WAY", "3WAY", "折りたたみ"] },
  { category: "サイズ", words: ["A4", "A5", "B5", "大容量", "小さめ", "大きめ", "ミニ", "XL", "L", "M", "S", "XS", "ワイド", "コンパクト"] },
  { category: "素材", words: ["ナイロン", "本革", "レザー", "コットン", "キャンバス", "合皮", "ステンレス", "シルク", "ウール", "ポリエステル"] },
  { category: "デザイン", words: ["シンプル", "おしゃれ", "かわいい", "きれいめ", "北欧", "モダン", "カジュアル", "上品"] },
  { category: "ギフト", words: ["ギフト", "プレゼント", "誕生日", "母の日", "父の日", "記念日", "内祝い"] },
  { category: "販促", words: ["送料無料", "ランキング", "人気", "限定", "SALE", "セール", "訳あり", "アウトレット"] },
];

function classifyCategory(word: string): string {
  const upper = word.toUpperCase();
  for (const { category, words } of CATEGORY_DICTIONARY) {
    if (words.some((w) => w.toUpperCase() === upper)) return category;
  }
  return "その他";
}

export function normalizeTitleText(text: string): string {
  let t = text.replace(/<[^>]+>/g, " ");
  t = t.normalize("NFKC");
  t = t.toUpperCase();
  t = t.replace(EXCLUDE_SYMBOLS_REGEX, " ");
  t = t.replace(/[\r\n]+/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export function tokenizeText(text: string, stopwords: Set<string>): string[] {
  const normalized = normalizeTitleText(text);
  return normalized
    .split(" ")
    .filter(Boolean)
    .filter((tok) => tok.length >= 2 && !stopwords.has(tok));
}

export interface ProductTokens {
  itemCode: string;
  tokens: string[];
}

export interface KeywordStat {
  word: string;
  category: string;
  occurrenceCount: number;
  productCount: number;
  usageRate: number;
  top10UsageRate: number;
  top30UsageRate: number;
  top100UsageRate: number;
  topBiasScore: number;
}

export interface CategoryBreakdown {
  category: string;
  productOccurrences: number;
  ratio: number;
}

export interface OwnComparisonEntry {
  word: string;
  usageRate: number;
  ownHasWord: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface TitleSeoResult {
  itemCount: number;
  extractedWordCount: number;
  importantWordCount: number;
  topBiasedWordCount: number;
  keywordRanking: KeywordStat[];
  categoryBreakdown: CategoryBreakdown[];
  ownComparison: OwnComparisonEntry[] | null;
  missingKeywords: OwnComparisonEntry[];
}

function buildProductTokens(itemCode: string, itemName: string, catchcopy: string, target: AnalysisTarget, stopwords: Set<string>): ProductTokens {
  const text = target === "itemName" ? itemName : target === "catchcopy" ? catchcopy : `${itemName} ${catchcopy}`;
  return { itemCode, tokens: Array.from(new Set(tokenizeText(text, stopwords))) };
}

function usageRateWithin(productTokensList: ProductTokens[], word: string): number {
  if (productTokensList.length === 0) return 0;
  const count = productTokensList.filter((p) => p.tokens.includes(word)).length;
  return (count / productTokensList.length) * 100;
}

function priorityFromUsageRate(usageRate: number): 1 | 2 | 3 | 4 | 5 {
  if (usageRate >= 50) return 5;
  if (usageRate >= 30) return 4;
  if (usageRate >= 20) return 3;
  if (usageRate >= 10) return 2;
  return 1;
}

export function analyzeTitleSeo(
  rawItems: RakutenRawItem[],
  target: AnalysisTarget,
  customStopwords: string[],
  ownItemName: string | null,
  ownCatchcopy: string | null
): TitleSeoResult {
  const items = rawItems.map(normalizeItem);
  const stopwords = new Set([...DEFAULT_STOPWORDS, ...customStopwords]);

  const productTokensAll = items.map((i) => buildProductTokens(i.itemCode, i.itemName, i.catchcopy, target, stopwords));
  const top10 = productTokensAll.slice(0, 10);
  const top30 = productTokensAll.slice(0, 30);
  const top100 = productTokensAll.slice(0, 100);

  const occurrenceMap = new Map<string, number>();
  const productCountMap = new Map<string, number>();
  for (const p of productTokensAll) {
    for (const tok of p.tokens) {
      productCountMap.set(tok, (productCountMap.get(tok) ?? 0) + 1);
    }
  }
  // 出現回数(重複含む)は商品ごとの生トークン列から再集計する（productCountMapは商品単位の重複除去済みトークンのため）
  for (const item of items) {
    const text = target === "itemName" ? item.itemName : target === "catchcopy" ? item.catchcopy : `${item.itemName} ${item.catchcopy}`;
    const rawTokens = normalizeTitleText(text).split(" ").filter(Boolean).filter((t) => t.length >= 2 && !stopwords.has(t));
    for (const tok of rawTokens) occurrenceMap.set(tok, (occurrenceMap.get(tok) ?? 0) + 1);
  }

  const words = Array.from(productCountMap.keys());
  const keywordRanking: KeywordStat[] = words
    .map((word) => {
      const productCount = productCountMap.get(word) ?? 0;
      const usageRate = (productCount / productTokensAll.length) * 100;
      const top30UsageRate = usageRateWithin(top30, word);
      return {
        word,
        category: classifyCategory(word),
        occurrenceCount: occurrenceMap.get(word) ?? productCount,
        productCount,
        usageRate,
        top10UsageRate: usageRateWithin(top10, word),
        top30UsageRate,
        top100UsageRate: usageRateWithin(top100, word),
        topBiasScore: top30UsageRate - usageRate,
      };
    })
    .sort((a, b) => b.productCount - a.productCount);

  const categoryOccurrence = new Map<string, number>();
  for (const stat of keywordRanking) {
    categoryOccurrence.set(stat.category, (categoryOccurrence.get(stat.category) ?? 0) + stat.productCount);
  }
  const totalCategoryOccurrence = Array.from(categoryOccurrence.values()).reduce((s, v) => s + v, 0);
  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryOccurrence.entries())
    .map(([category, productOccurrences]) => ({
      category,
      productOccurrences,
      ratio: totalCategoryOccurrence === 0 ? 0 : (productOccurrences / totalCategoryOccurrence) * 100,
    }))
    .sort((a, b) => b.productOccurrences - a.productOccurrences);

  let ownComparison: OwnComparisonEntry[] | null = null;
  let missingKeywords: OwnComparisonEntry[] = [];
  if (ownItemName !== null || ownCatchcopy !== null) {
    const ownTokens = new Set(tokenizeText(`${ownItemName ?? ""} ${ownCatchcopy ?? ""}`, stopwords));
    const importantWords = keywordRanking.filter((k) => k.usageRate >= 10).slice(0, 50);
    ownComparison = importantWords.map((k) => ({
      word: k.word,
      usageRate: k.usageRate,
      ownHasWord: ownTokens.has(k.word),
      priority: priorityFromUsageRate(k.usageRate),
    }));
    missingKeywords = ownComparison.filter((e) => !e.ownHasWord).sort((a, b) => b.usageRate - a.usageRate);
  }

  return {
    itemCount: items.length,
    extractedWordCount: keywordRanking.length,
    importantWordCount: keywordRanking.filter((k) => k.usageRate >= 10).length,
    topBiasedWordCount: keywordRanking.filter((k) => k.topBiasScore >= 15).length,
    keywordRanking: keywordRanking.slice(0, 100),
    categoryBreakdown,
    ownComparison,
    missingKeywords,
  };
}

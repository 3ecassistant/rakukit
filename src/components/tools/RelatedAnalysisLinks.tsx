import Link from "next/link";

export type CrossLinkType = "keyword" | "shop" | "genre";

interface ToolRef {
  slug: string;
  title: string;
}

const KEYWORD_TOOLS: ToolRef[] = [
  { slug: "competitor-analysis", title: "①競合商品分析" },
  { slug: "title-seo-analysis", title: "②SEOタイトル分析" },
  { slug: "keyword-competition-checker", title: "③キーワード競合度" },
  { slug: "price-position-analysis", title: "④価格ポジショニング分析" },
  { slug: "review-barrier-analysis", title: "⑤レビュー参入障壁分析" },
  { slug: "promotion-competition-analysis", title: "⑥ポイント・送料分析" },
];

const SHOP_TOOLS: ToolRef[] = [
  { slug: "shop-composition-analysis", title: "⑦競合ショップ商品構成分析" },
  { slug: "change-detection", title: "⑫新商品・変化検知" },
];

const GENRE_TOOLS: ToolRef[] = [
  { slug: "attribute-competition-analysis", title: "⑨商品属性×競争力分析" },
  { slug: "market-gap-finder", title: "⑩空白市場発見" },
];

const GROUPS: Record<CrossLinkType, ToolRef[]> = { keyword: KEYWORD_TOOLS, shop: SHOP_TOOLS, genre: GENRE_TOOLS };
const PARAM_KEY: Record<CrossLinkType, string> = { keyword: "keyword", shop: "shopCode", genre: "genreId" };
const TYPE_LABEL: Record<CrossLinkType, string> = { keyword: "キーワード", shop: "ショップ", genre: "ジャンル" };

interface RelatedAnalysisLinksProps {
  type: CrossLinkType;
  value: string;
  currentSlug: string;
}

export default function RelatedAnalysisLinks({ type, value, currentSlug }: RelatedAnalysisLinksProps) {
  if (!value.trim()) return null;
  const others = GROUPS[type].filter((t) => t.slug !== currentSlug);
  if (others.length === 0) return null;
  const paramKey = PARAM_KEY[type];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold text-zinc-500">この{TYPE_LABEL[type]}で他の分析も見る（クリックで自動的に再検索します）</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {others.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}?${paramKey}=${encodeURIComponent(value)}`}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
          >
            {t.title} ＞
          </Link>
        ))}
      </div>
    </div>
  );
}

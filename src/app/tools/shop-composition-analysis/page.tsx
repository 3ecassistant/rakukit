"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { ShopCompositionResult } from "@/lib/shopCompositionAnalysis";
import { RakutenItem } from "@/lib/rakutenItem";

interface ApiResponse {
  shopCode: string;
  items: RakutenItem[];
  analysis: ShopCompositionResult;
}

function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}

function ShopCompositionAnalysisContent() {
  const searchParams = useSearchParams();
  const [shopInput, setShopInput] = useState(() => searchParams.get("shopCode") ?? "");
  const [keyword, setKeyword] = useState("");
  const [requestedCount, setRequestedCount] = useState<number>(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const autoRanRef = useRef(false);

  const handleSearch = async (overrideShopInput?: string) => {
    const target = overrideShopInput ?? shopInput;
    if (!target.trim()) {
      setError("競合ショップURLまたはshopCodeを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop-composition-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopInput: target.trim(), keyword: keyword.trim() || undefined, requestedCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `検索に失敗しました（HTTP ${res.status}）`);
        setResult(null);
        return;
      }
      setResult(data as ApiResponse);
    } catch {
      setError("通信エラーが発生しました。しばらく待って再度お試しください");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!result) return;
    const rows: string[][] = [
      ["取得日時", "shopCode", "商品コード", "商品名", "価格", "レビュー件数", "レビュー平均", "ジャンルID", "送料状態", "ポイント倍率", "商品URL"],
      ...result.items.map((item) => [
        new Date().toLocaleString("ja-JP"),
        result.shopCode,
        item.itemCode,
        item.itemName,
        String(item.itemPrice),
        String(item.reviewCount),
        String(item.reviewAverage),
        item.genreId,
        item.postageFlag === 0 ? "送料込み" : "送料別",
        String(item.pointRate),
        item.itemUrl,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `shop-composition_${result.shopCode}.csv`);
  };

  useEffect(() => {
    const shopCodeParam = searchParams.get("shopCode");
    if (!shopCodeParam) return;
    const timer = setTimeout(() => {
      if (autoRanRef.current) return;
      autoRanRef.current = true;
      handleSearch(shopCodeParam);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 競合ショップ商品構成分析ツール</h1>
        <p className="text-sm text-zinc-500">
          競合ショップのshopCodeを指定し、掲載商品群の価格帯・ジャンル構成・レビュー資産・送料・ポイント条件を分析します。売上構成ではなく、公開されている商品構成の分析であることにご注意ください。
        </p>
      </header>

      <ToolSection step="1" title="競合ショップ指定">
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          競合ショップURL または shopCode（必須）
          <input
            type="text"
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
            placeholder="例：https://www.rakuten.co.jp/shop-a/ または shop-a"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            検索キーワード（任意・ショップ内絞り込み）
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            取得商品数上限
            <select value={requestedCount} onChange={(e) => setRequestedCount(Number(e.target.value))} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
              <option value={300}>300件</option>
              <option value={1000}>1,000件</option>
              <option value={3000}>3,000件（上限）</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={() => handleSearch()} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "取得中..." : "ショップ分析を実行"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <>
          <ToolSection step="2" title="ショップサマリー">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="検索商品数" value={`${result.analysis.shopSearchTotalCount.toLocaleString()}商品`} />
              <StatTile label="分析商品数" value={`${result.analysis.itemCount.toLocaleString()}商品`} />
              <StatTile label="取得率" value={fmtPct(result.analysis.fetchRate)} />
              <StatTile label="価格中央値" value={fmtYen(result.analysis.price.median)} />
              <StatTile label="レビュー中央値" value={`${Math.round(result.analysis.reviewCount.median).toLocaleString()}件`} />
              <StatTile label="送料込み率" value={fmtPct(result.analysis.freeShippingRate)} />
              <StatTile label="商品別ポイントUP率" value={fmtPct(result.analysis.pointUpRate)} />
              <StatTile label="レビュー資産集中度（TOP10）" value={fmtPct(result.analysis.reviewConcentrationTop10Rate)} />
            </div>
            {result.analysis.isPartial && (
              <p className="text-xs text-amber-600">
                ⚠ 検索結果{result.analysis.shopSearchTotalCount.toLocaleString()}商品のうち{result.analysis.itemCount.toLocaleString()}商品のみ取得しています（全件取得ではありません）。
              </p>
            )}
          </ToolSection>

          <ToolSection step="3" title="価格帯構成">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <StatTile label="最低価格" value={fmtYen(result.analysis.price.min)} />
              <StatTile label="平均価格" value={fmtYen(result.analysis.price.mean)} />
              <StatTile label="中央値" value={fmtYen(result.analysis.price.median)} />
              <StatTile label="Q1" value={fmtYen(result.analysis.price.q1)} />
              <StatTile label="Q3" value={fmtYen(result.analysis.price.q3)} />
              <StatTile label="最高価格" value={fmtYen(result.analysis.price.max)} />
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              {result.analysis.priceBands.map((band) => (
                <div key={band.label} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 text-zinc-500">{band.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${band.ratio}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-zinc-500">
                    {band.count}件（{band.ratio.toFixed(1)}%）
                  </span>
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="4" title="レビュー資産構成">
            <div className="flex flex-col gap-1.5">
              {result.analysis.reviewBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-zinc-500">{bucket.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${bucket.ratio}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-zinc-500">
                    {bucket.count}件（{bucket.ratio.toFixed(1)}%）
                  </span>
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="5" title="ジャンル構成">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">ジャンルID</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">構成比</th>
                    <th className="py-1.5 pr-2 text-right">価格中央値</th>
                    <th className="py-1.5 pr-2 text-right">レビュー中央値</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.genreBreakdown.slice(0, 10).map((g) => (
                    <tr key={g.genreId} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{g.genreId || "(不明)"}</td>
                      <td className="py-1.5 pr-2 text-right">{g.count}</td>
                      <td className="py-1.5 pr-2 text-right">{g.ratio.toFixed(1)}%</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(g.priceMedian)}</td>
                      <td className="py-1.5 pr-2 text-right">{Math.round(g.reviewMedian).toLocaleString()}件</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400">ジャンル名称の表示は今後の拡張とし、現在はジャンルIDで表示しています。</p>
          </ToolSection>

          <ToolSection step="6" title="主力候補商品">
            <ol className="flex flex-col gap-1.5 text-sm">
              {result.analysis.mainCandidates.map((c) => (
                <li key={c.item.itemCode} className="flex items-center gap-2 border-b border-zinc-100 pb-1.5">
                  <span className="w-6 shrink-0 text-zinc-400">{c.rank}</span>
                  <a href={c.item.itemUrl} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-red-700 hover:underline">
                    {c.item.itemName}
                  </a>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {fmtYen(c.item.itemPrice)} / レビュー{c.item.reviewCount}件（{c.item.reviewAverage.toFixed(2)}）
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-zinc-400">
              レビュー件数・評価・取得順位・レビュー資産集中度から算出した「主力候補」です。実際の売上・販売数量を示すものではありません。
            </p>
          </ToolSection>

          <ToolSection step="7" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              商品一覧CSVを出力
            </button>
          </ToolSection>

          <RelatedAnalysisLinks type="shop" value={result.shopCode} currentSlug="shop-composition-analysis" />
        </>
      )}
    </main>
  );
}

export default function ShopCompositionAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <ShopCompositionAnalysisContent />
    </Suspense>
  );
}

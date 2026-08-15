"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { KeywordCompetitionResult } from "@/lib/keywordCompetitionChecker";

type SortKey = "competitionScore" | "opportunityScore" | "productCount" | "reviewMedian" | "priceMedian";

const SORT_LABELS: Record<SortKey, string> = {
  competitionScore: "競合度が高い順",
  opportunityScore: "競合余地スコアが高い順",
  productCount: "商品数が多い順",
  reviewMedian: "レビュー中央値が少ない順",
  priceMedian: "価格中央値が高い順",
};

function fmtPct(v: number | null, digits = 1): string {
  if (v === null) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}

function KeywordCompetitionCheckerContent() {
  const searchParams = useSearchParams();
  const [keywordsText, setKeywordsText] = useState(() => searchParams.get("keyword") ?? "");
  const [genreId, setGenreId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ownPrice, setOwnPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<KeywordCompetitionResult[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("competitionScore");

  const keywordCount = keywordsText.split("\n").map((k) => k.trim()).filter(Boolean).length;

  const sortedResults = useMemo(() => {
    if (!results) return [];
    const sorted = [...results];
    switch (sortKey) {
      case "competitionScore":
        return sorted.sort((a, b) => b.competitionScore - a.competitionScore);
      case "opportunityScore":
        return sorted.sort((a, b) => b.opportunityScore - a.opportunityScore);
      case "productCount":
        return sorted.sort((a, b) => b.productCount - a.productCount);
      case "reviewMedian":
        return sorted.sort((a, b) => a.reviewMedian - b.reviewMedian);
      case "priceMedian":
        return sorted.sort((a, b) => b.priceMedian - a.priceMedian);
      default:
        return sorted;
    }
  }, [results, sortKey]);

  const handleSearch = async () => {
    const keywords = keywordsText.split("\n").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      setError("分析キーワードを1行に1件ずつ入力してください（先頭行が基準キーワードになります）");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keyword-competition-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          genreId: genreId.trim() || undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          ownPrice: ownPrice ? Number(ownPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `検索に失敗しました（HTTP ${res.status}）`);
        setResults(Array.isArray(data?.partialResults) ? data.partialResults : null);
        return;
      }
      setResults(data.results as KeywordCompetitionResult[]);
    } catch {
      setError("通信エラーが発生しました。しばらく待って再度お試しください");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!results) return;
    const rows: string[][] = [
      ["キーワード", "検索商品数", "競合残存率", "レビュー中央値", "価格中央値", "送料無料率", "ポイントUP率", "ユニークショップ数", "上位5ショップ占有率", "競合度", "競合余地スコア"],
      ...results.map((r) => [
        r.keyword,
        String(r.productCount),
        r.competitorRemainingRate === null ? "-" : `${r.competitorRemainingRate.toFixed(1)}%`,
        String(Math.round(r.reviewMedian)),
        String(Math.round(r.priceMedian)),
        `${r.freeShippingRate.toFixed(1)}%`,
        `${r.pointUpRate.toFixed(1)}%`,
        String(r.uniqueShopCount),
        `${r.top5ShopConcentration.toFixed(1)}%`,
        String(r.competitionScore),
        String(r.opportunityScore),
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), "keyword-competition.csv");
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天SEOキーワード競合度チェッカー</h1>
        <p className="text-sm text-zinc-500">
          複数のキーワード候補について検索結果商品数・レビュー・価格・ショップ集中度・送料無料率・ポイント条件を比較し、競合の強さを定量化します。検索ボリューム（検索需要）を測定するツールではありません。
        </p>
      </header>

      <ToolSection step="1" title="キーワード入力">
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          分析キーワード（1行に1件、最大50件・先頭行が基準キーワード）
          <textarea
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            rows={8}
            placeholder={"トートバッグ レディース\nトートバッグ レディース 軽量\nトートバッグ レディース 大容量\nトートバッグ レディース A4"}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-400"
          />
        </label>
        <p className="text-xs text-zinc-400">入力キーワード数：{keywordCount}件</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            ジャンルID（任意）
            <input type="text" value={genreId} onChange={(e) => setGenreId(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最低価格（任意）
            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最高価格（任意）
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            自社想定価格（任意）
            <input type="number" value={ownPrice} onChange={(e) => setOwnPrice(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
        </div>
        <p className="text-xs text-amber-600">
          キーワード数が多いほど楽天APIへのリクエスト回数が増えます（1キーワードにつき最大1回）。件数が多い場合は分析完了まで時間がかかります。
        </p>
        <button type="button" onClick={handleSearch} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? `分析中...（${keywordCount}件）` : "競合度を分析"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <ToolSection step="2" title="比較結果">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                並び替え：
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={handleExportCsv} className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
                CSV出力
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">キーワード</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">競合残存率</th>
                    <th className="py-1.5 pr-2 text-right">レビュー中央値</th>
                    <th className="py-1.5 pr-2 text-right">価格中央値</th>
                    <th className="py-1.5 pr-2 text-right">送料無料率</th>
                    <th className="py-1.5 pr-2 text-right">ショップ数</th>
                    <th className="py-1.5 pr-2 text-right">上位5占有率</th>
                    <th className="py-1.5 pr-2 text-right">競合度</th>
                    <th className="py-1.5 pr-2 text-right">競合余地</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((r) => (
                    <tr key={r.keyword} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2 font-medium text-zinc-800">{r.keyword}</td>
                      <td className="py-1.5 pr-2 text-right">{r.productCount.toLocaleString()}</td>
                      <td className="py-1.5 pr-2 text-right">{fmtPct(r.competitorRemainingRate)}</td>
                      <td className="py-1.5 pr-2 text-right">{Math.round(r.reviewMedian).toLocaleString()}件</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(r.priceMedian)}</td>
                      <td className="py-1.5 pr-2 text-right">{r.freeShippingRate.toFixed(1)}%</td>
                      <td className="py-1.5 pr-2 text-right">{r.uniqueShopCount}</td>
                      <td className="py-1.5 pr-2 text-right">{r.top5ShopConcentration.toFixed(1)}%</td>
                      <td className="py-1.5 pr-2 text-right font-bold text-zinc-900">{r.competitionScore}</td>
                      <td className="py-1.5 pr-2 text-right">{r.opportunityScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <ToolSection step="3" title="基準キーワードとの比較">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="基準キーワード" value={results[0].keyword} />
              <StatTile label="基準商品数" value={`${results[0].productCount.toLocaleString()}件`} />
              <StatTile label="基準レビュー中央値" value={`${Math.round(results[0].reviewMedian).toLocaleString()}件`} />
              <StatTile label="基準競合度" value={String(results[0].competitionScore)} />
            </div>
          </ToolSection>

          <RelatedAnalysisLinks type="keyword" value={results[0].keyword} currentSlug="keyword-competition-checker" />

          <p className="text-xs text-zinc-400">
            検索結果商品数はAPIの検索条件該当商品総数であり、月間検索回数などの検索需要を示すものではありません。競合が少ないことと需要があることは別であり、「このキーワードなら売れる」という判断はできません。
          </p>
        </>
      )}
    </main>
  );
}

export default function KeywordCompetitionCheckerPage() {
  return (
    <Suspense fallback={null}>
      <KeywordCompetitionCheckerContent />
    </Suspense>
  );
}

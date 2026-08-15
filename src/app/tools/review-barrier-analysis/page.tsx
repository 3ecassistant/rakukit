"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { ReviewBarrierResult } from "@/lib/reviewBarrierAnalysis";
import { RakutenItem } from "@/lib/rakutenItem";

interface FormState {
  keyword: string;
  genreId: string;
  minPrice: string;
  maxPrice: string;
  ngKeyword: string;
  postageFlag: boolean;
  requestedCount: 30 | 100 | 300;
  ownReviewCount: string;
  lowReviewThreshold: string;
}

const DEFAULT_FORM: FormState = {
  keyword: "",
  genreId: "",
  minPrice: "",
  maxPrice: "",
  ngKeyword: "",
  postageFlag: false,
  requestedCount: 300,
  ownReviewCount: "",
  lowReviewThreshold: "50",
};

interface ApiResponse {
  keyword: string;
  items: RakutenItem[];
  analysis: ReviewBarrierResult;
}

function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}
function stars(level: number): string {
  return "★".repeat(level) + "☆".repeat(5 - level);
}

function ReviewBarrierAnalysisContent() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(() => {
    const keywordParam = searchParams.get("keyword");
    return keywordParam ? { ...DEFAULT_FORM, keyword: keywordParam } : DEFAULT_FORM;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const autoRanRef = useRef(false);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSearch = async (overrideKeyword?: string) => {
    const keyword = overrideKeyword ?? form.keyword;
    if (!keyword.trim()) {
      setError("検索キーワードを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review-barrier-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          genreId: form.genreId.trim() || undefined,
          minPrice: form.minPrice ? Number(form.minPrice) : undefined,
          maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
          ngKeyword: form.ngKeyword.trim() || undefined,
          postageFlag: form.postageFlag,
          requestedCount: form.requestedCount,
          ownReviewCount: form.ownReviewCount ? Number(form.ownReviewCount) : undefined,
          lowReviewThreshold: Number(form.lowReviewThreshold),
        }),
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
      ["取得日時", "検索キーワード", "API標準順", "商品コード", "商品名", "価格", "レビュー件数", "レビュー平均", "ショップ名", "商品URL"],
      ...result.items.map((item, i) => [
        new Date().toLocaleString("ja-JP"),
        result.keyword,
        String(i + 1),
        item.itemCode,
        item.itemName,
        String(item.itemPrice),
        String(item.reviewCount),
        String(item.reviewAverage),
        item.shopName,
        item.itemUrl,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `review-barrier_${result.keyword}.csv`);
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    const keywordParam = searchParams.get("keyword");
    if (!keywordParam) return;
    const timer = setTimeout(() => {
      if (autoRanRef.current) return;
      autoRanRef.current = true;
      handleSearch(keywordParam);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 レビュー参入障壁分析ツール</h1>
        <p className="text-sm text-zinc-500">
          競合商品のレビュー件数・評価を取得し、市場全体・API標準順上位30商品のレビュー資産からレビュー参入障壁を定量化します。レビュー件数と検索順位の因果関係を証明するものではありません。
        </p>
      </header>

      <ToolSection step="1" title="検索条件">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 sm:col-span-2">
            検索キーワード（必須）
            <input type="text" value={form.keyword} onChange={(e) => update({ keyword: e.target.value })} placeholder="例：トートバッグ レディース" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            ジャンルID（任意）
            <input type="text" value={form.genreId} onChange={(e) => update({ genreId: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            除外キーワード（任意）
            <input type="text" value={form.ngKeyword} onChange={(e) => update({ ngKeyword: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最低価格（任意）
            <input type="number" value={form.minPrice} onChange={(e) => update({ minPrice: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最高価格（任意）
            <input type="number" value={form.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            取得商品数
            <select value={form.requestedCount} onChange={(e) => update({ requestedCount: Number(e.target.value) as 30 | 100 | 300 })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
              <option value={30}>30件</option>
              <option value={100}>100件</option>
              <option value={300}>300件</option>
            </select>
          </label>
        </div>
      </ToolSection>

      <ToolSection step="2" title="自社レビュー件数（任意）">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            自社レビュー件数
            <input type="number" value={form.ownReviewCount} onChange={(e) => update({ ownReviewCount: e.target.value })} placeholder="例：120" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            低レビュー判定件数（未満）
            <input type="number" value={form.lowReviewThreshold} onChange={(e) => update({ lowReviewThreshold: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => handleSearch()} disabled={loading} className="rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? "検索中..." : "検索実行"}
          </button>
          <button type="button" onClick={handleReset} className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400">
            入力をリセット
          </button>
        </div>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <>
          <ToolSection step="3" title="レビュー参入障壁サマリー">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
              <p className="text-xs text-zinc-400">レビュー参入障壁</p>
              <p className="text-4xl font-bold text-zinc-900">
                {result.analysis.barrierScore.total} / 100 {stars(result.analysis.barrierScore.stars)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{result.analysis.barrierScore.label}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="検索該当商品数" value={`${result.analysis.marketTotalCount.toLocaleString()}件`} />
              <StatTile label="分析対象商品数" value={`${result.analysis.itemCount.toLocaleString()}件`} />
              <StatTile label="レビュー件数中央値" value={`${Math.round(result.analysis.reviewCount.median).toLocaleString()}件`} />
              <StatTile label="上位30レビュー中央値" value={`${Math.round(result.analysis.top30Median).toLocaleString()}件`} />
              <StatTile label="上位レビュー偏重度" value={`${result.analysis.top30Multiplier.toFixed(1)}倍`} />
              <StatTile label="低レビュー上位出現率" value={fmtPct(result.analysis.lowReviewInTop30Rate)} />
              <StatTile label="レビュー参入余地" value={stars(result.analysis.entryOpportunityStars)} />
              <StatTile label="レビュー0件率" value={fmtPct(result.analysis.zeroRate)} />
            </div>
          </ToolSection>

          {result.analysis.own && (
            <ToolSection step="4" title="自社レビューポジション">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">自社レビュー{result.analysis.own.reviewCount.toLocaleString()}件は</p>
                <p className="text-3xl font-bold text-zinc-900">{result.analysis.own.position}</p>
                <p className="mt-1 text-sm text-zinc-500">市場パーセンタイル {result.analysis.own.percentile.toFixed(1)}%</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="市場中央値との差" value={`${Math.round(result.analysis.own.gapFromMedian).toLocaleString()}件`} />
                <StatTile label="市場中央値比" value={`${result.analysis.own.gapFromMedianRate >= 0 ? "+" : ""}${result.analysis.own.gapFromMedianRate.toFixed(1)}%`} />
                <StatTile label="上位30中央値との差" value={`${Math.round(result.analysis.own.gapFromTop30Median).toLocaleString()}件`} />
                <StatTile label="上位30中央値比" value={`${result.analysis.own.ratioToTop30Median.toFixed(1)}%`} />
              </div>
            </ToolSection>
          )}

          <ToolSection step="5" title="レビュー件数分布">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              <StatTile label="100件以上率" value={fmtPct(result.analysis.over100Rate)} />
              <StatTile label="500件以上率" value={fmtPct(result.analysis.over500Rate)} />
              <StatTile label="1,000件以上率" value={fmtPct(result.analysis.over1000Rate)} />
              <StatTile label="3,000件以上率" value={fmtPct(result.analysis.over3000Rate)} />
              <StatTile label="低レビュー商品率" value={fmtPct(result.analysis.under50Rate)} />
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              {result.analysis.reviewBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 text-zinc-500">{bucket.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${bucket.ratio}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-zinc-500">
                    {bucket.count}件（{bucket.ratio.toFixed(1)}%）
                  </span>
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="6" title="価格帯別レビュー中央値">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">価格帯</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">レビュー中央値</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.priceReviewBands.map((b) => (
                    <tr key={b.label} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{b.label}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count > 0 ? `${Math.round(b.reviewMedian).toLocaleString()}件` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <ToolSection step="7" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              商品一覧CSVを出力
            </button>
          </ToolSection>

          <RelatedAnalysisLinks type="keyword" value={form.keyword} currentSlug="review-barrier-analysis" />

          <p className="text-xs text-zinc-400">
            本ツールは楽天市場商品検索APIの「楽天標準順」で取得した公開データを算術的に集計するものです。レビュー件数が検索表示順位を決定しているという因果関係は証明できません。「レビュー◯件あれば上位表示される」という基準としては扱わないでください。
          </p>
        </>
      )}
    </main>
  );
}

export default function ReviewBarrierAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <ReviewBarrierAnalysisContent />
    </Suspense>
  );
}

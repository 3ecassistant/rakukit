"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { CompetitorAnalysisResult, CompetitorItem } from "@/lib/competitorAnalysis";

type FetchCount = 30 | 100 | 300;

interface FormState {
  keyword: string;
  genreId: string;
  minPrice: string;
  maxPrice: string;
  ngKeyword: string;
  hasReviewFlag: boolean;
  postageFlag: boolean;
  availability: boolean;
  pointRateFlag: boolean;
  requestedCount: FetchCount;
}

const DEFAULT_FORM: FormState = {
  keyword: "",
  genreId: "",
  minPrice: "",
  maxPrice: "",
  ngKeyword: "",
  hasReviewFlag: false,
  postageFlag: false,
  availability: true,
  pointRateFlag: false,
  requestedCount: 100,
};

interface ApiResponse {
  keyword: string;
  items: CompetitorItem[];
  analysis: CompetitorAnalysisResult;
}

function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtCount(v: number): string {
  return `${Math.round(v).toLocaleString()}件`;
}
function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}
function stars(level: number): string {
  return "★".repeat(level) + "☆".repeat(5 - level);
}

const RANKING_TABS = [
  { key: "byReviewCount", label: "レビュー件数TOP10" },
  { key: "byReviewAverage", label: "レビュー評価TOP10" },
  { key: "byLowPrice", label: "低価格TOP10" },
  { key: "byHighPrice", label: "高価格TOP10" },
  { key: "byPointRate", label: "ポイント倍率TOP10" },
] as const;

function CompetitorAnalysisContent() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(() => {
    const keywordParam = searchParams.get("keyword");
    return keywordParam ? { ...DEFAULT_FORM, keyword: keywordParam } : DEFAULT_FORM;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [rankingTab, setRankingTab] = useState<(typeof RANKING_TABS)[number]["key"]>("byReviewCount");
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
      const res = await fetch("/api/competitor-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          genreId: form.genreId.trim() || undefined,
          minPrice: form.minPrice ? Number(form.minPrice) : undefined,
          maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
          ngKeyword: form.ngKeyword.trim() || undefined,
          hasReviewFlag: form.hasReviewFlag,
          postageFlag: form.postageFlag,
          availability: form.availability,
          pointRateFlag: form.pointRateFlag,
          requestedCount: form.requestedCount,
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

  const handleExportItemsCsv = () => {
    if (!result) return;
    const rows: string[][] = [
      [
        "取得日時",
        "検索キーワード",
        "取得順位",
        "商品コード",
        "商品名",
        "ショップ名",
        "価格",
        "レビュー件数",
        "レビュー平均",
        "送料状態",
        "ポイント倍率",
        "商品URL",
      ],
      ...result.items.map((item, i) => [
        new Date().toLocaleString("ja-JP"),
        result.keyword,
        String(i + 1),
        item.itemCode,
        item.itemName,
        item.shopName,
        String(item.itemPrice),
        String(item.reviewCount),
        String(item.reviewAverage),
        item.postageFlag === 0 ? "送料込み" : "送料別",
        String(item.pointRate),
        item.itemUrl,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `competitor-items_${result.keyword}.csv`);
  };

  const handleExportSummaryCsv = () => {
    if (!result) return;
    const a = result.analysis;
    const rows: string[][] = [
      ["検索総商品数", "価格中央値", "レビュー中央値", "送料無料率", "ポイントUP率(2倍以上)", "ショップ数", "競争力スコア"],
      [
        String(a.marketTotalCount),
        String(a.price.median),
        String(a.reviewCount.median),
        `${a.freeShippingRate.toFixed(1)}%`,
        `${a.point.doubleOrMoreRate.toFixed(1)}%`,
        String(a.shop.uniqueShopCount),
        String(a.competitiveness.total),
      ],
    ];
    triggerBlobDownload(buildCsvBlob(rows), `competitor-summary_${result.keyword}.csv`);
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
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 競合商品分析ツール</h1>
        <p className="text-sm text-zinc-500">
          検索キーワードから楽天市場商品検索APIで競合商品の公開情報を取得し、価格・レビュー・送料・ポイント・ショップ集中度から市場の競争力を数値化します。将来の売上や検索順位を予測するものではありません。
        </p>
      </header>

      <ToolSection step="1" title="検索条件">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 sm:col-span-2">
            検索キーワード（必須）
            <input
              type="text"
              value={form.keyword}
              onChange={(e) => update({ keyword: e.target.value })}
              placeholder="例：トートバッグ レディース"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            ジャンルID（任意）
            <input
              type="text"
              value={form.genreId}
              onChange={(e) => update({ genreId: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            除外キーワード（任意）
            <input
              type="text"
              value={form.ngKeyword}
              onChange={(e) => update({ ngKeyword: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最低価格（任意）
            <input
              type="number"
              value={form.minPrice}
              onChange={(e) => update({ minPrice: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            最高価格（任意）
            <input
              type="number"
              value={form.maxPrice}
              onChange={(e) => update({ maxPrice: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            取得商品数
            <select
              value={form.requestedCount}
              onChange={(e) => update({ requestedCount: Number(e.target.value) as FetchCount })}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
            >
              <option value={30}>30件</option>
              <option value={100}>100件</option>
              <option value={300}>300件</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          {[
            { key: "hasReviewFlag" as const, label: "レビューあり商品のみ" },
            { key: "postageFlag" as const, label: "送料無料商品のみ" },
            { key: "availability" as const, label: "販売可能商品のみ" },
            { key: "pointRateFlag" as const, label: "ポイントアップ商品のみ" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" checked={form[key]} onChange={(e) => update({ [key]: e.target.checked } as Partial<FormState>)} />
              {label}
            </label>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading}
            className="rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "検索中..." : "検索実行"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400"
          >
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
          <ToolSection step="2" title="市場サマリー">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="検索該当商品数" value={fmtCount(result.analysis.marketTotalCount)} />
              <StatTile label="分析対象商品数" value={fmtCount(result.analysis.itemCount)} />
              <StatTile label="価格中央値" value={fmtYen(result.analysis.price.median)} />
              <StatTile label="レビュー件数中央値" value={fmtCount(result.analysis.reviewCount.median)} />
              <StatTile label="送料無料率" value={fmtPct(result.analysis.freeShippingRate)} />
              <StatTile label="ポイントUP率（2倍以上）" value={fmtPct(result.analysis.point.doubleOrMoreRate)} />
              <StatTile label="ユニークショップ数" value={`${result.analysis.shop.uniqueShopCount}店舗`} />
              <StatTile
                label="市場競争力スコア"
                value={`${result.analysis.competitiveness.total} / 100 ${stars(result.analysis.competitiveness.stars)}`}
              />
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700">
              <p className="font-bold text-zinc-800">
                総合評価：{result.analysis.competitiveness.label}な市場（楽天標準順・上位{result.analysis.itemCount}商品分析）
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                レビュー参入障壁は{result.analysis.reviewBarrierLabel}（{stars(result.analysis.reviewBarrierLevel)}）。
                送料無料率{fmtPct(result.analysis.freeShippingRate)}・上位5ショップ占有率
                {fmtPct(result.analysis.shop.top5ConcentrationRatio)}を踏まえ、価格以外の差別化余地を検討してください。
                本スコアは暫定ロジックによる簡易指標であり、実際の検索順位や売上を保証するものではありません。
              </p>
            </div>
          </ToolSection>

          <ToolSection step="3" title="価格分析">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <StatTile label="最低価格" value={fmtYen(result.analysis.price.min)} />
              <StatTile label="最高価格" value={fmtYen(result.analysis.price.max)} />
              <StatTile label="平均価格" value={fmtYen(result.analysis.price.mean)} />
              <StatTile label="中央値価格" value={fmtYen(result.analysis.price.median)} />
              <StatTile label="第1四分位" value={fmtYen(result.analysis.price.q1)} />
              <StatTile label="第3四分位" value={fmtYen(result.analysis.price.q3)} />
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              {result.analysis.priceBands.map((band) => (
                <div key={band.label} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 text-zinc-500">{band.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${band.ratio}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-zinc-500">
                    {band.count}件（{band.ratio.toFixed(1)}%）
                  </span>
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="4" title="レビュー競争分析">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <StatTile label="件数 平均" value={fmtCount(result.analysis.reviewCount.mean)} />
              <StatTile label="件数 中央値" value={fmtCount(result.analysis.reviewCount.median)} />
              <StatTile label="件数 第1四分位" value={fmtCount(result.analysis.reviewCount.q1)} />
              <StatTile label="件数 第3四分位" value={fmtCount(result.analysis.reviewCount.q3)} />
              <StatTile label="評価 平均" value={result.analysis.reviewRating.mean.toFixed(2)} />
              <StatTile label="評価 中央値" value={result.analysis.reviewRating.median.toFixed(2)} />
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
            <p className="pt-1 text-sm font-semibold text-zinc-700">
              レビュー参入障壁：{stars(result.analysis.reviewBarrierLevel)}（{result.analysis.reviewBarrierLabel}）
            </p>
          </ToolSection>

          <ToolSection step="5" title="送料・ポイント競争分析">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="送料無料率" value={fmtPct(result.analysis.freeShippingRate)} />
              <StatTile label="通常ポイント商品率" value={fmtPct(result.analysis.point.normalRate)} />
              <StatTile label="2倍以上商品率" value={fmtPct(result.analysis.point.doubleOrMoreRate)} />
              <StatTile label="5倍以上商品率" value={fmtPct(result.analysis.point.fiveTimesOrMoreRate)} />
              <StatTile label="10倍商品率" value={fmtPct(result.analysis.point.tenTimesRate)} />
            </div>
            <p className="text-xs text-zinc-400">
              終了まで24時間以内の商品は楽天APIの仕様上ポイント倍率が取得できないため、ポイント施策を完全網羅した集計ではありません。ショップ単位のポイント施策も対象外です。
            </p>
          </ToolSection>

          <ToolSection step="6" title="ショップ競争分析">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <StatTile label="ユニークショップ数" value={`${result.analysis.shop.uniqueShopCount}店舗`} />
              <StatTile label="上位5ショップ占有率" value={fmtPct(result.analysis.shop.top5ConcentrationRatio)} />
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[400px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">ショップ名</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">構成比</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.shop.shops.slice(0, 10).map((s) => (
                    <tr key={s.shopCode} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{s.shopName}</td>
                      <td className="py-1.5 pr-2 text-right">{s.count}商品</td>
                      <td className="py-1.5 pr-2 text-right">{s.ratio.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <ToolSection step="7" title="主要競合商品ランキング">
            <div className="flex flex-wrap gap-2">
              {RANKING_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setRankingTab(tab.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    rankingTab === tab.key ? "border-red-600 bg-red-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-red-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <ol className="flex flex-col gap-1.5 pt-2 text-sm">
              {result.analysis.rankings[rankingTab].map((item, i) => (
                <li key={item.itemCode} className="flex items-center gap-2 border-b border-zinc-100 pb-1.5">
                  <span className="w-6 shrink-0 text-zinc-400">{i + 1}</span>
                  <a
                    href={item.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-red-700 hover:underline"
                  >
                    {item.itemName}
                  </a>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {fmtYen(item.itemPrice)} / レビュー{item.reviewCount}件（{item.reviewAverage.toFixed(2)}） / P{item.pointRate}倍
                  </span>
                </li>
              ))}
            </ol>
          </ToolSection>

          <ToolSection step="8" title="競合商品一覧・CSV出力">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportItemsCsv}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                商品一覧CSVを出力
              </button>
              <button
                type="button"
                onClick={handleExportSummaryCsv}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400"
              >
                市場分析CSVを出力
              </button>
            </div>
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-zinc-100">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">順位</th>
                    <th className="py-1.5 pr-2">商品名</th>
                    <th className="py-1.5 pr-2">ショップ名</th>
                    <th className="py-1.5 pr-2 text-right">価格</th>
                    <th className="py-1.5 pr-2 text-right">レビュー</th>
                    <th className="py-1.5 pr-2">送料</th>
                    <th className="py-1.5 pr-2 text-right">ポイント</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, i) => (
                    <tr key={item.itemCode} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2 text-zinc-400">{i + 1}</td>
                      <td className="py-1.5 pr-2">
                        <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">
                          {item.itemName}
                        </a>
                      </td>
                      <td className="py-1.5 pr-2">{item.shopName}</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(item.itemPrice)}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {item.reviewCount}件（{item.reviewAverage.toFixed(2)}）
                      </td>
                      <td className="py-1.5 pr-2">{item.postageFlag === 0 ? "無料" : "別途"}</td>
                      <td className="py-1.5 pr-2 text-right">{item.pointRate}倍</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <RelatedAnalysisLinks type="keyword" value={form.keyword} currentSlug="competitor-analysis" />

          <p className="text-xs text-zinc-400">
            本ツールは楽天市場商品検索APIの「楽天標準順」で取得した公開データを算術的に集計するものです。楽天市場フロント画面の検索表示順位と完全一致することを前提としません。取得データはブラウザ・サーバーいずれにも恒久保存されません。
          </p>
        </>
      )}
    </main>
  );
}

export default function CompetitorAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <CompetitorAnalysisContent />
    </Suspense>
  );
}

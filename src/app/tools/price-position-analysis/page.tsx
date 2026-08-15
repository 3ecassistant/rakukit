"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { PricePositionResult } from "@/lib/pricePositionAnalysis";
import { RakutenItem } from "@/lib/rakutenItem";

interface FormState {
  keyword: string;
  genreId: string;
  minPrice: string;
  maxPrice: string;
  ngKeyword: string;
  hasReviewFlag: boolean;
  postageFlag: boolean;
  requestedCount: 30 | 100 | 300;
  ownPrice: string;
  strongReviewCountThreshold: string;
  strongReviewAverageThreshold: string;
}

const DEFAULT_FORM: FormState = {
  keyword: "",
  genreId: "",
  minPrice: "",
  maxPrice: "",
  ngKeyword: "",
  hasReviewFlag: false,
  postageFlag: false,
  requestedCount: 300,
  ownPrice: "",
  strongReviewCountThreshold: "100",
  strongReviewAverageThreshold: "4.3",
};

interface ApiResponse {
  keyword: string;
  items: RakutenItem[];
  analysis: PricePositionResult;
}

function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number, digits = 1): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function PricePositionAnalysisContent() {
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
      const res = await fetch("/api/price-position-search", {
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
          requestedCount: form.requestedCount,
          ownPrice: form.ownPrice ? Number(form.ownPrice) : undefined,
          strongReviewCountThreshold: Number(form.strongReviewCountThreshold),
          strongReviewAverageThreshold: Number(form.strongReviewAverageThreshold),
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
      ["取得日時", "検索キーワード", "取得順位", "商品コード", "商品名", "ショップ名", "価格", "レビュー件数", "レビュー平均", "送料状態", "商品URL"],
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
        item.itemUrl,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `price-position_${result.keyword}.csv`);
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
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 価格ポジショニング分析ツール</h1>
        <p className="text-sm text-zinc-500">
          競合商品価格を取得し、市場価格中央値・価格帯構成・自社商品の市場内価格位置を分析します。「誰と比較した場合に自社価格が高いか安いか」を判断する材料を提供するものであり、値下げ・値上げを推奨するツールではありません。
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
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={form.hasReviewFlag} onChange={(e) => update({ hasReviewFlag: e.target.checked })} />
            レビューあり商品のみ
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={form.postageFlag} onChange={(e) => update({ postageFlag: e.target.checked })} />
            送料無料商品のみ
          </label>
        </div>
      </ToolSection>

      <ToolSection step="2" title="自社価格・強い競合の条件（任意）">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            自社販売価格
            <input type="number" value={form.ownPrice} onChange={(e) => update({ ownPrice: e.target.value })} placeholder="例：4980" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            強い競合のレビュー件数条件
            <input type="number" value={form.strongReviewCountThreshold} onChange={(e) => update({ strongReviewCountThreshold: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            強い競合のレビュー評価条件
            <input type="number" step={0.1} value={form.strongReviewAverageThreshold} onChange={(e) => update({ strongReviewAverageThreshold: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
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
          <ToolSection step="3" title="価格サマリー">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="検索該当商品数" value={`${result.analysis.marketTotalCount.toLocaleString()}件`} />
              <StatTile label="分析対象商品数" value={`${result.analysis.itemCount.toLocaleString()}件`} />
              <StatTile label="価格中央値" value={fmtYen(result.analysis.price.median)} />
              <StatTile label="平均価格" value={fmtYen(result.analysis.price.mean)} />
              <StatTile label="第1四分位" value={fmtYen(result.analysis.price.q1)} />
              <StatTile label="第3四分位" value={fmtYen(result.analysis.price.q3)} />
              <StatTile label="最低価格" value={fmtYen(result.analysis.price.min)} />
              <StatTile label="最高価格" value={fmtYen(result.analysis.price.max)} />
            </div>
            {result.analysis.taxSeparateCount > 0 && (
              <p className="text-xs text-amber-600">
                ⚠ 分析対象{result.analysis.itemCount}商品のうち{result.analysis.taxSeparateCount}商品が税別表示です。
              </p>
            )}
          </ToolSection>

          {result.analysis.own && (
            <ToolSection step="4" title="自社価格ポジション">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">自社価格{fmtYen(result.analysis.own.price)}は市場において</p>
                <p className="text-3xl font-bold text-zinc-900">{result.analysis.own.position}</p>
                <p className="mt-1 text-sm text-zinc-500">価格パーセンタイル 上位{(100 - result.analysis.own.percentile).toFixed(0)}%相当</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="市場中央値との差" value={fmtYen(result.analysis.own.diff)} />
                <StatTile label="市場中央値比" value={fmtPct(result.analysis.own.diffRate)} />
                <StatTile label="市場内パーセンタイル" value={`${result.analysis.own.percentile.toFixed(1)}%`} />
                <StatTile
                  label="強い競合中央値との差"
                  value={
                    result.analysis.strongCompetitor.count > 0
                      ? fmtPct((result.analysis.own.price / result.analysis.strongCompetitor.price.median - 1) * 100)
                      : "-"
                  }
                />
              </div>
            </ToolSection>
          )}

          <ToolSection step="5" title="価格帯構成">
            {result.analysis.mostCommonBand && (
              <p className="text-sm text-zinc-600">
                最頻価格帯：<span className="font-bold text-zinc-900">{result.analysis.mostCommonBand.label}</span>（
                {result.analysis.mostCommonBand.count}件・{result.analysis.mostCommonBand.ratio.toFixed(1)}%）
              </p>
            )}
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

          <ToolSection step="6" title="レビュー件数帯別の価格">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">レビュー件数帯</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">価格中央値</th>
                    <th className="py-1.5 pr-2 text-right">価格Q1</th>
                    <th className="py-1.5 pr-2 text-right">価格Q3</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.reviewBandPrice.map((b) => (
                    <tr key={b.label} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{b.label}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count > 0 ? fmtYen(b.price.median) : "-"}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count > 0 ? fmtYen(b.price.q1) : "-"}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count > 0 ? fmtYen(b.price.q3) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <ToolSection step="7" title="強い競合・送料別の価格">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label={`強い競合（レビュー${result.analysis.strongCompetitor.reviewCountThreshold}件以上・評価${result.analysis.strongCompetitor.reviewAverageThreshold}以上）`}
                value={result.analysis.strongCompetitor.count > 0 ? fmtYen(result.analysis.strongCompetitor.price.median) : "該当なし"}
              />
              <StatTile label="強い競合商品数" value={`${result.analysis.strongCompetitor.count}件`} />
              <StatTile label="送料込み商品 価格中央値" value={result.analysis.shippingPrice.included.count > 0 ? fmtYen(result.analysis.shippingPrice.included.median) : "-"} />
              <StatTile label="送料別商品 価格中央値" value={result.analysis.shippingPrice.separate.count > 0 ? fmtYen(result.analysis.shippingPrice.separate.median) : "-"} />
            </div>
          </ToolSection>

          <ToolSection step="8" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              商品一覧CSVを出力
            </button>
          </ToolSection>

          <RelatedAnalysisLinks type="keyword" value={form.keyword} currentSlug="price-position-analysis" />

          <p className="text-xs text-zinc-400">
            本ツールは楽天市場商品検索APIの「楽天標準順」で取得した公開データを算術的に集計するものです。商品価格ベースの分析であり、クーポン適用後価格・送料込み実支払額は含みません。「値下げすべき」「値上げすべき」といった判断は行わず、価格ポジションの提示までとします。
          </p>
        </>
      )}
    </main>
  );
}

export default function PricePositionAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <PricePositionAnalysisContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { PromotionCompetitionResult } from "@/lib/promotionCompetitionAnalysis";
import { RakutenItem } from "@/lib/rakutenItem";

interface FormState {
  keyword: string;
  genreId: string;
  minPrice: string;
  maxPrice: string;
  ngKeyword: string;
  requestedCount: 30 | 100 | 300;
  hasOwnCondition: boolean;
  ownPostageFree: boolean;
  ownPointRate: string;
}

const DEFAULT_FORM: FormState = {
  keyword: "",
  genreId: "",
  minPrice: "",
  maxPrice: "",
  ngKeyword: "",
  requestedCount: 300,
  hasOwnCondition: false,
  ownPostageFree: false,
  ownPointRate: "1",
};

interface ApiResponse {
  keyword: string;
  items: RakutenItem[];
  analysis: PromotionCompetitionResult;
}

function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}
function stars(level: number): string {
  return "★".repeat(level) + "☆".repeat(5 - level);
}

function PromotionCompetitionAnalysisContent() {
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
      const res = await fetch("/api/promotion-competition-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          genreId: form.genreId.trim() || undefined,
          minPrice: form.minPrice ? Number(form.minPrice) : undefined,
          maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
          ngKeyword: form.ngKeyword.trim() || undefined,
          requestedCount: form.requestedCount,
          ownPostageFree: form.hasOwnCondition ? form.ownPostageFree : undefined,
          ownPointRate: form.hasOwnCondition ? Number(form.ownPointRate) : undefined,
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
      ["取得日時", "検索キーワード", "API標準順", "商品コード", "商品名", "価格", "送料状態", "ポイント倍率", "ショップ名", "商品URL"],
      ...result.items.map((item, i) => [
        new Date().toLocaleString("ja-JP"),
        result.keyword,
        String(i + 1),
        item.itemCode,
        item.itemName,
        String(item.itemPrice),
        item.postageFlag === 0 ? "送料込み" : "送料別",
        String(item.pointRate),
        item.shopName,
        item.itemUrl,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `promotion-competition_${result.keyword}.csv`);
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
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 ポイント・送料無料競争分析ツール</h1>
        <p className="text-sm text-zinc-500">
          競合商品の送料条件・商品別ポイント倍率を取得し、その検索市場で送料無料・ポイントアップがどの程度一般化しているかを定量化します。「送料無料にすべき」「ポイントを上げるべき」といった採算判断は行いません。
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

      <ToolSection step="2" title="自社条件（任意）">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={form.hasOwnCondition} onChange={(e) => update({ hasOwnCondition: e.target.checked })} />
          自社の送料・ポイント条件を入力する
        </label>
        {form.hasOwnCondition && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" checked={form.ownPostageFree} onChange={(e) => update({ ownPostageFree: e.target.checked })} />
              自社商品は送料込み
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-600">
              自社商品別ポイント倍率
              <input type="number" step={0.5} value={form.ownPointRate} onChange={(e) => update({ ownPointRate: e.target.value })} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
            </label>
          </div>
        )}
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
          <ToolSection step="3" title="販促競争サマリー">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
              <p className="text-xs text-zinc-400">総合販促競争度</p>
              <p className="text-4xl font-bold text-zinc-900">
                {result.analysis.score.total} / 100 {stars(result.analysis.score.stars)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{result.analysis.score.label}</p>
              <p className="mt-2 text-xs text-zinc-400">
                送料競争 {result.analysis.shippingScore0to100.toFixed(0)} / 100　／　ポイント競争 {result.analysis.pointScore0to100.toFixed(0)} / 100
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="送料込み率" value={fmtPct(result.analysis.freeShippingRate)} />
              <StatTile label="上位30送料込み率" value={fmtPct(result.analysis.top30FreeShippingRate)} />
              <StatTile label="ポイントUP率" value={fmtPct(result.analysis.pointUpRate)} />
              <StatTile label="上位30ポイントUP率" value={fmtPct(result.analysis.top30PointUpRate)} />
              <StatTile label="5倍以上率" value={fmtPct(result.analysis.fiveOrMoreRate)} />
              <StatTile label="10倍率" value={fmtPct(result.analysis.tenTimesRate)} />
              <StatTile label="平均商品別ポイント倍率" value={`${result.analysis.averagePointRate.toFixed(2)}倍`} />
              <StatTile label="強販促条件商品率" value={fmtPct(result.analysis.strongPromoRate)} />
            </div>
          </ToolSection>

          {result.analysis.own && (
            <ToolSection step="4" title="自社との比較">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="自社送料条件" value={result.analysis.own.postageFree ? "送料込み" : "送料別"} />
                <StatTile label="自社商品別ポイント倍率" value={`${result.analysis.own.pointRate}倍`} />
                <StatTile label="市場送料込み率との差" value={`${result.analysis.own.freeShippingRateDiffPt >= 0 ? "+" : ""}${result.analysis.own.freeShippingRateDiffPt.toFixed(1)}pt`} />
                <StatTile label="市場ポイントUP率との差" value={`${result.analysis.own.pointUpRateDiffPt >= 0 ? "+" : ""}${result.analysis.own.pointUpRateDiffPt.toFixed(1)}pt`} />
              </div>
              <p className="text-sm text-zinc-600">
                {result.analysis.own.isStrongPromo
                  ? `自社は「強販促条件商品」（送料込み＋5倍以上）に該当します。市場内の該当率は${fmtPct(result.analysis.own.strongPromoRate)}です。`
                  : `自社は「強販促条件商品」（送料込み＋5倍以上）には該当しません。市場内の該当率は${fmtPct(result.analysis.own.strongPromoRate)}です。`}
              </p>
            </ToolSection>
          )}

          <ToolSection step="5" title="送料×ポイント4象限">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {result.analysis.quadrants.map((q) => (
                <div key={q.key} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">{q.label}</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {q.count}件（{q.ratio.toFixed(1)}%）
                  </p>
                </div>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="6" title="価格帯別送料込み率">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">価格帯</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">送料込み率</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.priceShippingBands.map((b) => (
                    <tr key={b.label} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{b.label}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count}</td>
                      <td className="py-1.5 pr-2 text-right">{b.count > 0 ? fmtPct(b.freeShippingRate) : "-"}</td>
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

          <RelatedAnalysisLinks type="keyword" value={form.keyword} currentSlug="promotion-competition-analysis" />

          <p className="text-xs text-zinc-400">
            商品別ポイント倍率は、終了まで24時間以内の施策がAPI仕様上表示されないため、実施中の全ポイント施策を完全網羅した数値ではありません。ショップ単位のポイント倍率も対象外です。「送料無料化・ポイント増額により売上が増える」といった判断はできません。
          </p>
        </>
      )}
    </main>
  );
}

export default function PromotionCompetitionAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <PromotionCompetitionAnalysisContent />
    </Suspense>
  );
}

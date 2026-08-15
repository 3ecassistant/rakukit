"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { MarketCell, MarketGapResult } from "@/lib/marketGapFinder";
import { RakutenItem } from "@/lib/rakutenItem";

interface ApiResponse {
  genreId: string;
  items: RakutenItem[];
  analysis: MarketGapResult;
}

function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}

function CellTable({ cells }: { cells: MarketCell[] }) {
  if (cells.length === 0) return <p className="text-xs text-zinc-400">最低サンプル数を満たす市場セルがありませんでした。</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-1.5 pr-2">市場セル</th>
            <th className="py-1.5 pr-2 text-right">商品数</th>
            <th className="py-1.5 pr-2 text-right">価格中央値</th>
            <th className="py-1.5 pr-2 text-right">レビュー中央値</th>
            <th className="py-1.5 pr-2 text-right">ショップ数</th>
            <th className="py-1.5 pr-2 text-right">競争余地スコア</th>
            <th className="py-1.5 pr-2">信頼度</th>
          </tr>
        </thead>
        <tbody>
          {cells.slice(0, 20).map((c) => (
            <tr key={c.id} className="border-b border-zinc-100">
              <td className="py-1.5 pr-2 font-medium text-zinc-800">{c.label}</td>
              <td className="py-1.5 pr-2 text-right">{c.productCount}</td>
              <td className="py-1.5 pr-2 text-right">{fmtYen(c.priceMedian)}</td>
              <td className="py-1.5 pr-2 text-right">{Math.round(c.reviewMedian).toLocaleString()}件</td>
              <td className="py-1.5 pr-2 text-right">{c.shopCount}</td>
              <td className="py-1.5 pr-2 text-right font-bold text-zinc-900">{c.opportunityScore}</td>
              <td className="py-1.5 pr-2">{c.confidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketGapFinderContent() {
  const searchParams = useSearchParams();
  const [genreId, setGenreId] = useState(() => searchParams.get("genreId") ?? "");
  const [keyword, setKeyword] = useState("");
  const [requestedCount, setRequestedCount] = useState<100 | 300 | 1000>(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const autoRanRef = useRef(false);

  const handleSearch = async (overrideGenreId?: string) => {
    const gid = overrideGenreId ?? genreId;
    if (!gid.trim()) {
      setError("ジャンルIDを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market-gap-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genreId: gid.trim(), keyword: keyword.trim() || undefined, requestedCount }),
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
    const allCells = [...result.analysis.attributeCells, ...result.analysis.attributePriceCells, ...result.analysis.twoAttributeCells];
    const rows: string[][] = [
      ["市場セル", "商品数", "価格中央値", "レビュー中央値", "ショップ数", "上位5ショップ占有率", "競争余地スコア", "信頼度"],
      ...allCells.map((c) => [
        c.label,
        String(c.productCount),
        String(Math.round(c.priceMedian)),
        String(Math.round(c.reviewMedian)),
        String(c.shopCount),
        `${c.top5ShopConcentration.toFixed(1)}%`,
        String(c.opportunityScore),
        c.confidence,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `market-gap_${result.genreId}.csv`);
  };

  useEffect(() => {
    const genreIdParam = searchParams.get("genreId");
    if (!genreIdParam) return;
    const timer = setTimeout(() => {
      if (autoRanRef.current) return;
      autoRanRef.current = true;
      handleSearch(genreIdParam);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 空白市場発見ツール</h1>
        <p className="text-sm text-zinc-500">
          ジャンル内の商品を属性×価格帯×属性の組み合わせへ分解し、公開商品データ上で競争条件が比較的手薄な「市場セル」を抽出します。競争が少ないことと需要があることは別であり、「売れる市場」「ブルーオーシャン」を示すものではありません。
        </p>
      </header>

      <ToolSection step="1" title="ジャンル・検索条件">
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          ジャンルID（必須）
          <input type="text" value={genreId} onChange={(e) => setGenreId(e.target.value)} placeholder="例：100371" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            検索キーワード（任意）
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            取得商品数
            <select value={requestedCount} onChange={(e) => setRequestedCount(Number(e.target.value) as 100 | 300 | 1000)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
              <option value={100}>100件</option>
              <option value={300}>300件</option>
              <option value={1000}>1,000件</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={() => handleSearch()} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "分析中..." : "空白市場を探索"}
        </button>
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
              <StatTile label="分析商品数" value={`${result.analysis.itemCount}商品`} />
              <StatTile label="属性登録率" value={`${result.analysis.attributeRegistrationRate.toFixed(1)}%`} />
              <StatTile label="市場価格中央値" value={fmtYen(result.analysis.marketBaseline.priceMedian)} />
              <StatTile label="市場レビュー中央値" value={`${Math.round(result.analysis.marketBaseline.reviewMedian).toLocaleString()}件`} />
            </div>
          </ToolSection>

          <ToolSection step="3" title="属性単位の競争余地ランキング">
            <CellTable cells={result.analysis.attributeCells} />
          </ToolSection>

          <ToolSection step="4" title="属性×価格帯の競争余地ランキング">
            <CellTable cells={result.analysis.attributePriceCells} />
          </ToolSection>

          <ToolSection step="5" title="2属性組み合わせの競争余地ランキング">
            <CellTable cells={result.analysis.twoAttributeCells} />
            <p className="text-xs text-zinc-400">使用率5%以上・出現数上位8属性の組み合わせのみを対象としています（組み合わせ数の爆発を防ぐため）。</p>
          </ToolSection>

          <ToolSection step="6" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              市場セル一覧CSVを出力
            </button>
          </ToolSection>

          <RelatedAnalysisLinks type="genre" value={result.genreId} currentSlug="market-gap-finder" />

          <p className="text-xs text-zinc-400">
            競争余地スコアが高いことは「売れる」「需要がある」ことを意味しません。検索需要データを含まないため、次のステップとして顧客ニーズ・原価・粗利の検証を推奨します。サンプル数が少ない市場セルはスコアの信頼性が低い点にご注意ください。
          </p>
        </>
      )}
    </main>
  );
}

export default function MarketGapFinderPage() {
  return (
    <Suspense fallback={null}>
      <MarketGapFinderContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { AttributeCompetitionResult } from "@/lib/attributeCompetitionAnalysis";
import { RakutenItem } from "@/lib/rakutenItem";

interface ApiResponse {
  genreId: string;
  items: RakutenItem[];
  analysis: AttributeCompetitionResult;
}

function fmtYen(v: number): string {
  return `¥${Math.round(v).toLocaleString()}`;
}

function AttributeCompetitionAnalysisContent() {
  const searchParams = useSearchParams();
  const [genreId, setGenreId] = useState(() => searchParams.get("genreId") ?? "");
  const [keyword, setKeyword] = useState("");
  const [requestedCount, setRequestedCount] = useState<30 | 100 | 300>(300);
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
      const res = await fetch("/api/attribute-competition-search", {
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
    const rows: string[][] = [
      ["属性ID", "属性名", "商品数", "使用率", "価格中央値", "レビュー中央値", "ショップ数", "送料込み率", "競争度", "競争余地", "信頼度"],
      ...result.analysis.attributes.map((a) => [
        a.attributeId,
        a.attributeName,
        String(a.productCount),
        `${a.usageRate.toFixed(1)}%`,
        String(Math.round(a.priceMedian)),
        String(Math.round(a.reviewMedian)),
        String(a.shopCount),
        `${a.freeShippingRate.toFixed(1)}%`,
        String(a.competitionScore),
        String(a.opportunityScore),
        a.confidence,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `attribute-competition_${result.genreId}.csv`);
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
        <h1 className="text-2xl font-black text-zinc-900">楽天市場 商品属性×競争力分析ツール</h1>
        <p className="text-sm text-zinc-500">
          指定ジャンルの商品属性ごとに商品数・価格・レビュー・ショップ数・送料条件を比較し、同一ジャンル内部で競争環境が異なる属性を発見します。属性を追加すれば売れる・検索順位が上がるといった判断はできません。
        </p>
      </header>

      <ToolSection step="1" title="ジャンル・検索条件">
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          ジャンルID（必須・属性取得にはジャンル指定が必要です）
          <input type="text" value={genreId} onChange={(e) => setGenreId(e.target.value)} placeholder="例：100371" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            検索キーワード（任意）
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            取得商品数
            <select value={requestedCount} onChange={(e) => setRequestedCount(Number(e.target.value) as 30 | 100 | 300)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
              <option value={30}>30件</option>
              <option value={100}>100件</option>
              <option value={300}>300件</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={() => handleSearch()} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "分析中..." : "属性競争力を分析"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <>
          <ToolSection step="2" title="属性取得状況">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="分析商品数" value={`${result.analysis.itemCount}商品`} />
              <StatTile label="属性登録率" value={`${result.analysis.attributeRegistrationRate.toFixed(1)}%`} />
              <StatTile label="抽出属性数" value={`${result.analysis.attributes.length}属性`} />
              <StatTile label="市場価格中央値" value={fmtYen(result.analysis.marketPriceMedian)} />
            </div>
            {result.analysis.attributeRegistrationRate < 50 && (
              <p className="text-xs text-amber-600">⚠ 属性情報が確認できる商品が少ないため、分析結果の代表性には注意してください。</p>
            )}
          </ToolSection>

          <ToolSection step="3" title="属性ランキング（商品数順）">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">属性</th>
                    <th className="py-1.5 pr-2 text-right">商品数</th>
                    <th className="py-1.5 pr-2 text-right">使用率</th>
                    <th className="py-1.5 pr-2 text-right">価格中央値</th>
                    <th className="py-1.5 pr-2 text-right">レビュー中央値</th>
                    <th className="py-1.5 pr-2 text-right">ショップ数</th>
                    <th className="py-1.5 pr-2 text-right">競争度</th>
                    <th className="py-1.5 pr-2 text-right">競争余地</th>
                    <th className="py-1.5 pr-2">信頼度</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.attributes.slice(0, 30).map((a) => (
                    <tr key={a.attributeId} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2 font-medium text-zinc-800">{a.attributeName}</td>
                      <td className="py-1.5 pr-2 text-right">{a.productCount}</td>
                      <td className="py-1.5 pr-2 text-right">{a.usageRate.toFixed(1)}%</td>
                      <td className="py-1.5 pr-2 text-right">{fmtYen(a.priceMedian)}</td>
                      <td className="py-1.5 pr-2 text-right">{Math.round(a.reviewMedian).toLocaleString()}件</td>
                      <td className="py-1.5 pr-2 text-right">{a.shopCount}</td>
                      <td className="py-1.5 pr-2 text-right">{a.competitionScore}</td>
                      <td className="py-1.5 pr-2 text-right font-bold text-zinc-900">{a.opportunityScore}</td>
                      <td className="py-1.5 pr-2">{a.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400">
              「属性使用率」の合計は100%になりません（1商品が複数属性を持つ場合があるため）。サンプル数が少ない属性は信頼度「低」または「データなし」と表示されます。
            </p>
          </ToolSection>

          <ToolSection step="4" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              属性分析CSVを出力
            </button>
          </ToolSection>

          <RelatedAnalysisLinks type="genre" value={result.genreId} currentSlug="attribute-competition-analysis" />

          <p className="text-xs text-zinc-400">
            属性名は取得できた場合のみ表示され、取得できない場合は属性IDを表示します。属性分類はツール側の分析用整理であり、楽天API自体の公式カテゴリ体系とは異なる場合があります。検索需要・売上・利益はこのデータからは判断できません。
          </p>
        </>
      )}
    </main>
  );
}

export default function AttributeCompetitionAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <AttributeCompetitionAnalysisContent />
    </Suspense>
  );
}

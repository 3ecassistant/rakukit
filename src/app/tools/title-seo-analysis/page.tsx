"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import RelatedAnalysisLinks from "@/components/tools/RelatedAnalysisLinks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";
import { AnalysisTarget, TitleSeoResult } from "@/lib/titleSeoAnalysis";
import { RakutenItem } from "@/lib/rakutenItem";

interface ApiResponse {
  keyword: string;
  items: RakutenItem[];
  analysis: TitleSeoResult;
}

const TARGET_LABELS: Record<AnalysisTarget, string> = {
  itemName: "商品名のみ",
  catchcopy: "キャッチコピーのみ",
  both: "商品名＋キャッチコピー",
};

function stars(level: number): string {
  return "★".repeat(level) + "☆".repeat(5 - level);
}

function TitleSeoAnalysisContent() {
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") ?? "");
  const [target, setTarget] = useState<AnalysisTarget>("both");
  const [requestedCount, setRequestedCount] = useState<30 | 100 | 300>(100);
  const [ownItemName, setOwnItemName] = useState("");
  const [ownCatchcopy, setOwnCatchcopy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const autoRanRef = useRef(false);

  const handleSearch = async (overrideKeyword?: string) => {
    const kw = overrideKeyword ?? keyword;
    if (!kw.trim()) {
      setError("検索キーワードを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/title-seo-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kw.trim(),
          target,
          requestedCount,
          ownItemName: ownItemName.trim() || undefined,
          ownCatchcopy: ownCatchcopy.trim() || undefined,
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
      ["キーワード", "カテゴリ", "使用商品数", "使用率", "上位10使用率", "上位30使用率", "上位100使用率", "上位偏重スコア"],
      ...result.analysis.keywordRanking.map((k) => [
        k.word,
        k.category,
        String(k.productCount),
        `${k.usageRate.toFixed(1)}%`,
        `${k.top10UsageRate.toFixed(1)}%`,
        `${k.top30UsageRate.toFixed(1)}%`,
        `${k.top100UsageRate.toFixed(1)}%`,
        `${k.topBiasScore.toFixed(1)}pt`,
      ]),
    ];
    triggerBlobDownload(buildCsvBlob(rows), `title-seo_${result.keyword}.csv`);
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
        <h1 className="text-2xl font-black text-zinc-900">楽天SEO競合タイトル分析ツール</h1>
        <p className="text-sm text-zinc-500">
          競合商品の商品名・キャッチコピーを分析し、「何回書かれているか」ではなく「何商品で使用されているか（商品使用率）」を中心に頻出キーワードを抽出します。単語分割はスペース・記号区切りによる簡易処理のため、日本語の完全な形態素解析ではありません。
        </p>
      </header>

      <ToolSection step="1" title="検索条件">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 sm:col-span-2">
            分析キーワード（必須）
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例：トートバッグ レディース" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            分析対象
            <select value={target} onChange={(e) => setTarget(e.target.value as AnalysisTarget)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400">
              {(Object.keys(TARGET_LABELS) as AnalysisTarget[]).map((t) => (
                <option key={t} value={t}>
                  {TARGET_LABELS[t]}
                </option>
              ))}
            </select>
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
      </ToolSection>

      <ToolSection step="2" title="自社商品タイトル比較（任意）">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            自社商品名
            <input type="text" value={ownItemName} onChange={(e) => setOwnItemName(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            自社キャッチコピー
            <input type="text" value={ownCatchcopy} onChange={(e) => setOwnCatchcopy(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400" />
          </label>
        </div>
        <button type="button" onClick={() => handleSearch()} disabled={loading} className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "分析中..." : "SEO分析を実行"}
        </button>
      </ToolSection>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <>
          <ToolSection step="3" title="SEOサマリー">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="分析商品数" value={`${result.analysis.itemCount}商品`} />
              <StatTile label="抽出ワード数" value={`${result.analysis.extractedWordCount}語`} />
              <StatTile label="重要ワード数（使用率10%以上）" value={`${result.analysis.importantWordCount}語`} />
              <StatTile label="上位偏重ワード数" value={`${result.analysis.topBiasedWordCount}語`} />
            </div>
          </ToolSection>

          <ToolSection step="4" title="頻出キーワードランキング（商品使用率順）">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-1.5 pr-2">順位</th>
                    <th className="py-1.5 pr-2">キーワード</th>
                    <th className="py-1.5 pr-2">カテゴリ</th>
                    <th className="py-1.5 pr-2 text-right">使用率</th>
                    <th className="py-1.5 pr-2 text-right">上位30使用率</th>
                    <th className="py-1.5 pr-2 text-right">上位偏重スコア</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.keywordRanking.slice(0, 30).map((k, i) => (
                    <tr key={k.word} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2 text-zinc-400">{i + 1}</td>
                      <td className="py-1.5 pr-2 font-medium text-zinc-800">{k.word}</td>
                      <td className="py-1.5 pr-2 text-zinc-500">{k.category}</td>
                      <td className="py-1.5 pr-2 text-right">{k.usageRate.toFixed(1)}%</td>
                      <td className="py-1.5 pr-2 text-right">{k.top30UsageRate.toFixed(1)}%</td>
                      <td className="py-1.5 pr-2 text-right">{k.topBiasScore >= 0 ? "+" : ""}{k.topBiasScore.toFixed(1)}pt</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ToolSection>

          <ToolSection step="5" title="カテゴリ別構成比">
            <div className="flex flex-col gap-1.5">
              {result.analysis.categoryBreakdown.map((c) => (
                <div key={c.category} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-zinc-500">{c.category}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${c.ratio}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-zinc-500">{c.ratio.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-400">カテゴリ分類はツール独自の簡易辞書によるものであり、楽天API自体の分類ではありません。</p>
          </ToolSection>

          {result.analysis.missingKeywords.length > 0 && (
            <ToolSection step="6" title="不足キーワード候補">
              <ol className="flex flex-col gap-1.5 text-sm">
                {result.analysis.missingKeywords.slice(0, 20).map((k) => (
                  <li key={k.word} className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <span className="font-medium text-zinc-800">
                      {stars(k.priority)} {k.word}
                    </span>
                    <span className="text-xs text-zinc-500">競合使用率 {k.usageRate.toFixed(1)}%・自社なし</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-zinc-400">
                「競合使用率が高い＝自社にも必ず入れるべき」ではありません。商品仕様に実際に合致するかを確認したうえでご検討ください。
              </p>
            </ToolSection>
          )}

          <ToolSection step="7" title="CSV出力">
            <button type="button" onClick={handleExportCsv} className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700">
              キーワード分析CSVを出力
            </button>
          </ToolSection>

          <RelatedAnalysisLinks type="keyword" value={keyword} currentSlug="title-seo-analysis" />

          <p className="text-xs text-zinc-400">
            本ツールはAPI標準順で取得した競合商品のタイトル・キャッチコピーを算術的に集計するものです。検索ボリューム（検索需要）ではなく、あくまで競合商品での使用率を示します。楽天検索順位を予測・保証するものではありません。
          </p>
        </>
      )}
    </main>
  );
}

export default function TitleSeoAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <TitleSeoAnalysisContent />
    </Suspense>
  );
}

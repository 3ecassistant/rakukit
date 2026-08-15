"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import ProgressPanel from "@/components/tools/suggest/ProgressPanel";
import ResultsView from "@/components/tools/suggest/ResultsView";
import { useSuggestCollector } from "@/hooks/useSuggestCollector";
import { ALPHABET_SUFFIXES, StopReason } from "@/lib/suggestTypes";

const STOP_MESSAGES: Record<Exclude<StopReason, null | "completed">, string> = {
  "user-stopped": "取得を停止しました。取得済みの結果を表示しています。",
  "api-limit": "API検索数の上限に達したため処理を停止しました。取得済みの結果を表示しています。",
  "keyword-limit": "ユニークキーワード数の上限に達したため処理を停止しました。取得済みの結果を表示しています。",
  "consecutive-errors":
    "サジェスト取得を停止しました。通信エラーが連続して発生しました。時間を空けて再度お試しください。",
  "access-restricted":
    "サジェスト取得を停止しました。対象サービス側のアクセス制限または通信障害の可能性があります。時間を空けて再度お試しください。",
};

// 実測値ベースの1起点あたりの目安API呼び出し数（1階層目は全件展開、2階層目は先頭20件のみ展開）。
const ESTIMATED_CALLS_PER_SEED: Record<1 | 2 | 3, number> = { 1: 1, 2: 11, 3: 30 };

function formatEstimatedDuration(totalCalls: number): string {
  const seconds = totalCalls * 0.25;
  if (seconds < 60) return `${Math.ceil(seconds)}秒`;
  return `${Math.ceil(seconds / 60)}分`;
}

export default function SuggestToolPage() {
  const [rootKeyword, setRootKeyword] = useState("");
  const [maxDepth, setMaxDepth] = useState<1 | 2 | 3>(2);
  const [expandAlphabet, setExpandAlphabet] = useState(false);
  const { status, nodes, relations, errors, progress, summary, stopReason, start, stop } =
    useSuggestCollector();

  const isRunning = status === "running";

  const estimate = useMemo(() => {
    const perSeed = ESTIMATED_CALLS_PER_SEED[maxDepth];
    const seedCount = expandAlphabet ? ALPHABET_SUFFIXES.length : 1;
    const totalCalls = perSeed * seedCount;
    return { seedCount, totalCalls, duration: formatEstimatedDuration(totalCalls) };
  }, [maxDepth, expandAlphabet]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">楽天サジェストキーワード収集</h1>
        <p className="text-sm text-zinc-500">
          楽天市場の検索窓に表示される関連サジェストキーワードを、起点キーワードから階層的にまとめて収集します。
        </p>
      </header>

      <ToolSection step="1" title="起点キーワードと取得階層">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={rootKeyword}
            onChange={(e) => setRootKeyword(e.target.value)}
            placeholder="例: トートバッグ"
            disabled={isRunning}
            className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none disabled:bg-zinc-50"
          />
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMaxDepth(d)}
                disabled={isRunning}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${
                  maxDepth === d
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-red-400"
                }`}
              >
                {d}階層
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => start(rootKeyword, maxDepth, { expandAlphabet })}
            disabled={isRunning || !rootKeyword.trim()}
            className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            サジェストを収集する
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={expandAlphabet}
            disabled={isRunning}
            onChange={(e) => setExpandAlphabet(e.target.checked)}
          />
          「{rootKeyword.trim() || "キーワード"} 0」〜「{rootKeyword.trim() || "キーワード"} 9」「
          {rootKeyword.trim() || "キーワード"} a」〜「{rootKeyword.trim() || "キーワード"} z」の36通りに展開して、
          それぞれ独立に収集する
        </label>

        <p className="text-xs text-zinc-400">
          楽天市場の内部サジェストAPIを利用します。1リクエストあたり250ms以上の間隔をあけて順番に取得するため、時間がかかる場合があります。
          {maxDepth === 3 &&
            "　3階層取得時は検索対象が急増するため、2階層目のキーワードは先頭20件のみさらに掘り下げて3階層目を取得します。"}
        </p>
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
          目安: API呼び出し約{estimate.totalCalls}回・所要時間約{estimate.duration}
          {expandAlphabet && `（${estimate.seedCount}キーワード展開）`}
          。実際の件数はサジェスト結果の件数によって変動します。
        </p>
      </ToolSection>

      {isRunning && <ProgressPanel progress={progress} onStop={stop} />}

      {!isRunning && stopReason && stopReason !== "completed" && (
        <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {STOP_MESSAGES[stopReason]}
        </p>
      )}

      {!isRunning && summary && nodes.length >= 0 && (
        <ResultsView
          rootKeyword={summary.rootKeyword}
          nodes={nodes}
          relations={relations}
          errors={errors}
          summary={summary}
        />
      )}
    </main>
  );
}

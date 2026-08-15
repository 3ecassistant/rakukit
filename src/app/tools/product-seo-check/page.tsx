"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import {
  KeywordProject,
  SuggestSnapshot,
  listProjects,
  listSnapshots,
} from "@/lib/suggestTrendDb";
import { computeDiff } from "@/lib/suggestDiff";
import {
  MATCH_STATUS_LABELS,
  MatchStatus,
  SIMPLE_STATUS_LABELS,
  SimpleMatchStatus,
  buildSuggestVocabulary,
  computeMatchStatus,
  extractAdditionalWords,
  findDuplicateWords,
  toSimpleStatus,
} from "@/lib/productSeoCheck";
import { classifyText, countByteLength } from "@/lib/charClassify";
import { countExcludingWhitespace, countGraphemes } from "@/lib/textChecks";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";

function comparisonKey(keyword: string): string {
  return keyword.trim();
}

interface KeywordCheckResult {
  keyword: string;
  additionalWords: string[];
  matchStatus: MatchStatus;
  simpleStatus: SimpleMatchStatus;
  depth: number;
  parentKeyword: string;
  isNew: boolean;
}

type Tab = "unused" | "used" | "new";
type TrendFilter = "all" | "new" | "keep";
type SortMode = "depth" | "keyword-asc" | "keyword-desc";

export default function ProductSeoCheckPage() {
  const [projects, setProjects] = useState<KeywordProject[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [snapshots, setSnapshots] = useState<SuggestSnapshot[]>([]);
  const [productName, setProductName] = useState("");
  const [hasChecked, setHasChecked] = useState(false);

  const [tab, setTab] = useState<Tab>("unused");
  const [depthFilter, setDepthFilter] = useState<string>("all");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("depth");

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    listSnapshots(selectedProjectId).then(setSnapshots);
  }, [selectedProjectId]);

  const project = useMemo(
    () => projects?.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const latestCompleted = useMemo(
    () => snapshots.find((s) => s.status === "completed") ?? null,
    [snapshots]
  );

  const diffByKeyword = useMemo(() => {
    if (!latestCompleted) return new Map<string, { isNew: boolean }>();
    const diff = computeDiff(latestCompleted, snapshots);
    const map = new Map<string, { isNew: boolean }>();
    diff.entries
      .filter((e) => e.status !== "out")
      .forEach((e) => map.set(comparisonKey(e.keyword), { isNew: e.status === "new" }));
    return map;
  }, [latestCompleted, snapshots]);

  const results: KeywordCheckResult[] = useMemo(() => {
    if (!latestCompleted || !project) return [];
    return latestCompleted.keywords.map((k) => {
      const matchStatus = computeMatchStatus(productName, k.keyword);
      return {
        keyword: k.keyword,
        additionalWords: extractAdditionalWords(k.keyword, project.rootKeyword),
        matchStatus,
        simpleStatus: toSimpleStatus(matchStatus),
        depth: k.depth,
        parentKeyword: k.parentKeyword,
        isNew: diffByKeyword.get(comparisonKey(k.keyword))?.isNew ?? false,
      };
    });
  }, [latestCompleted, project, productName, diffByKeyword]);

  const nameStats = useMemo(() => {
    const classified = classifyText(productName);
    return {
      total: countGraphemes(productName),
      excludingSpaces: countExcludingWhitespace(productName),
      zenkaku: classified.filter((c) => c.byteWidth === 2).length,
      hankaku: classified.filter((c) => c.byteWidth === 1).length,
      bytes: countByteLength(productName),
    };
  }, [productName]);

  const duplicateWords = useMemo(() => findDuplicateWords(productName), [productName]);

  const suggestVocab = useMemo(() => buildSuggestVocabulary(results.map((r) => r.additionalWords)), [results]);

  const nameSegments = useMemo(() => productName.split(/([ 　]+)/), [productName]);

  const usedCount = results.filter((r) => r.simpleStatus === "used").length;
  const partialCount = results.filter((r) => r.simpleStatus === "partial").length;
  const unusedCount = results.filter((r) => r.simpleStatus === "unused").length;
  const coverageRate = results.length > 0 ? (usedCount / results.length) * 100 : 0;

  const depthGroups = useMemo(() => {
    const depths = Array.from(new Set(results.map((r) => r.depth))).sort((a, b) => a - b);
    return depths.map((depth) => {
      const inDepth = results.filter((r) => r.depth === depth);
      const usedInDepth = inDepth.filter((r) => r.simpleStatus === "used").length;
      return {
        depth,
        total: inDepth.length,
        used: usedInDepth,
        rate: inDepth.length > 0 ? (usedInDepth / inDepth.length) * 100 : 0,
      };
    });
  }, [results]);

  const newCount = results.filter((r) => r.isNew).length;
  const newUnusedCount = results.filter((r) => r.isNew && r.simpleStatus !== "used").length;

  const availableDepths = useMemo(
    () => Array.from(new Set(results.map((r) => r.depth))).sort((a, b) => a - b),
    [results]
  );

  const tabResults = useMemo(() => {
    let list = results;
    if (tab === "unused") list = list.filter((r) => r.simpleStatus !== "used");
    else if (tab === "used") list = list.filter((r) => r.simpleStatus === "used");
    else if (tab === "new") list = list.filter((r) => r.isNew);

    if (depthFilter !== "all") list = list.filter((r) => String(r.depth) === depthFilter);
    if (trendFilter === "new") list = list.filter((r) => r.isNew);
    else if (trendFilter === "keep") list = list.filter((r) => !r.isNew);
    if (search.trim()) list = list.filter((r) => r.keyword.includes(search.trim()));

    const sorted = [...list];
    if (sortMode === "keyword-asc") sorted.sort((a, b) => a.keyword.localeCompare(b.keyword, "ja"));
    else if (sortMode === "keyword-desc") sorted.sort((a, b) => b.keyword.localeCompare(a.keyword, "ja"));
    else sorted.sort((a, b) => a.depth - b.depth || a.keyword.localeCompare(b.keyword, "ja"));
    return sorted;
  }, [results, tab, depthFilter, trendFilter, search, sortMode]);

  const handleDownloadCsv = () => {
    if (!project) return;
    const header = ["起点キーワード", "サジェストKW", "追加語", "使用状況", "階層", "親キーワード", "トレンド"];
    const rows = tabResults.map((r) => [
      project.rootKeyword,
      r.keyword,
      r.additionalWords.join(" "),
      MATCH_STATUS_LABELS[r.matchStatus],
      String(r.depth),
      r.parentKeyword,
      r.isNew ? "NEW" : "KEEP",
    ]);
    const blob = buildCsvBlob([header, ...rows]);
    triggerBlobDownload(blob, `${project.name}_seo_check.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">商品名SEOチェッカー</h1>
        <p className="text-sm text-zinc-500">
          現在の商品名と楽天サジェストを照合し、使っている語・足りない語・新しく出た語を可視化します。
        </p>
      </header>

      <ToolSection step="1" title="サジェストプロジェクトを選択">
        {projects === null ? (
          <p className="text-sm text-zinc-400">読み込み中…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-zinc-500">
            まだサジェストプロジェクトがありません。先に
            <Link href="/tools/suggest-trend" className="text-red-600 underline">
              サジェスト差分・トレンド
            </Link>
            でキーワードを登録・取得してください。
          </p>
        ) : (
          <>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSnapshots([]);
              }}
              className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.rootKeyword}）
                </option>
              ))}
            </select>
            {selectedProjectId && !latestCompleted && (
              <p className="text-sm text-yellow-700">
                正常取得済み（completed）のSnapshotがありません。
                <Link href={`/tools/suggest-trend/${selectedProjectId}`} className="underline">
                  サジェストを取得
                </Link>
                してください。
              </p>
            )}
            {latestCompleted && (
              <p className="text-xs text-zinc-400">
                使用データ: {new Date(latestCompleted.fetchedAt).toLocaleString("ja-JP")} 取得（
                {latestCompleted.uniqueCount}件）
              </p>
            )}
          </>
        )}
      </ToolSection>

      <ToolSection step="2" title="商品名を入力">
        <textarea
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          rows={3}
          placeholder="例: トートバッグ レディース 大容量 軽量 通勤 ファスナー付き"
          className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setHasChecked(true)}
          disabled={!latestCompleted || !productName.trim()}
          className="self-start rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasChecked ? "再チェック" : "チェックする"}
        </button>
      </ToolSection>

      {hasChecked && latestCompleted && (
        <>
          <ToolSection step="3" title="サマリー">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="商品名文字数" value={`${nameStats.total}文字`} />
              <StatTile label="対象サジェスト" value={`${results.length}件`} />
              <StatTile label="使用済み" value={`${usedCount}件`} />
              <StatTile label="一部使用" value={`${partialCount}件`} />
              <StatTile label="未使用" value={`${unusedCount}件`} />
              <StatTile label="サジェストカバー率" value={`${coverageRate.toFixed(1)}%`} />
              <StatTile label="NEW件数" value={`${newCount}件`} />
              <StatTile label="NEWかつ未使用" value={`${newUnusedCount}件`} />
            </div>

            {depthGroups.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {depthGroups.map((g) => (
                  <span key={g.depth} className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                    {g.depth}階層目: 使用 {g.used}/{g.total}件（{g.rate.toFixed(1)}%）
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-zinc-600">商品名（サジェスト由来語をハイライト）</p>
              <div className="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed">
                {nameSegments.map((segment, i) =>
                  suggestVocab.has(segment) ? (
                    <mark key={i} className="rounded bg-red-200 text-red-900">
                      {segment}
                    </mark>
                  ) : (
                    <Fragment key={i}>{segment}</Fragment>
                  )
                )}
              </div>
            </div>

            {duplicateWords.length > 0 && (
              <p className="rounded-lg bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
                商品名内で重複している語があります:{" "}
                {duplicateWords.map((d) => `「${d.word}」×${d.count}`).join("、")}
              </p>
            )}
          </ToolSection>

          <div className="flex gap-2 border-b border-zinc-200">
            {(["unused", "used", "new"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === t ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {t === "unused" ? `未使用KW（${unusedCount + partialCount}）` : t === "used" ? `使用済み（${usedCount}）` : `NEW（${newCount}）`}
              </button>
            ))}
          </div>

          <ToolSection step="●" title="キーワード一覧">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {["all", ...availableDepths.map(String)].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepthFilter(d)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      depthFilter === d
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-zinc-300 text-zinc-600 hover:border-red-400"
                    }`}
                  >
                    {d === "all" ? "全階層" : `${d}階層`}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {(["all", "new", "keep"] as TrendFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTrendFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      trendFilter === f
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-zinc-300 text-zinc-600 hover:border-red-400"
                    }`}
                  >
                    {f === "all" ? "すべて" : f.toUpperCase()}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="キーワードを検索"
                className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
              >
                <option value="depth">階層順</option>
                <option value="keyword-asc">キーワード昇順</option>
                <option value="keyword-desc">キーワード降順</option>
              </select>
            </div>
            <p className="text-xs text-zinc-400">{tabResults.length}件表示中</p>

            <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-max border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-zinc-100">
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">状態</th>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">キーワード</th>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">追加語</th>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">階層</th>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">トレンド</th>
                  </tr>
                </thead>
                <tbody>
                  {tabResults.map((r, i) => (
                    <tr key={`${r.keyword}-${i}`} className="odd:bg-white even:bg-zinc-50">
                      <td className="border-b border-zinc-100 px-3 py-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            r.simpleStatus === "used"
                              ? "bg-green-50 text-green-700"
                              : r.simpleStatus === "partial"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {SIMPLE_STATUS_LABELS[r.simpleStatus]}
                        </span>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">{r.keyword}</td>
                      <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">
                        {r.additionalWords.join(" ") || "-"}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{r.depth}</td>
                      <td className="border-b border-zinc-100 px-3 py-1.5">
                        {r.isNew && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                            NEW
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyButton
                getText={() => tabResults.map((r) => r.keyword).join("\n")}
                label="表示中のキーワードをコピー"
              />
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                CSVダウンロード
              </button>
            </div>
          </ToolSection>
        </>
      )}
    </main>
  );
}

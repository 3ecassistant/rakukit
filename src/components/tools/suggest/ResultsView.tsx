"use client";

import { useMemo, useState } from "react";
import StatTile from "@/components/tools/StatTile";
import KeywordTree from "./KeywordTree";
import CopyButton from "@/components/tools/CopyButton";
import { SuggestErrorEntry, SuggestNode, SuggestRelation, SuggestSummary } from "@/lib/suggestTypes";
import {
  buildForestTree,
  buildSuggestJson,
  buildSuggestJsonForest,
  buildTree,
  relationsToCsvRows,
} from "@/lib/suggestExport";
import { buildCsvBlob } from "@/lib/csv";
import { triggerBlobDownload } from "@/lib/download";

type Tab = "list" | "tree" | "errors";
type SortMode = "order" | "keyword-asc" | "keyword-desc" | "depth";

interface ResultsViewProps {
  rootKeyword: string;
  nodes: SuggestNode[];
  relations: SuggestRelation[];
  errors: SuggestErrorEntry[];
  summary: SuggestSummary;
}

export default function ResultsView({ rootKeyword, nodes, relations, errors, summary }: ResultsViewProps) {
  const [tab, setTab] = useState<Tab>("list");
  const [search, setSearch] = useState("");
  const [depthFilter, setDepthFilter] = useState<string>("all");
  const [excludeText, setExcludeText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("order");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const excludeWords = useMemo(
    () =>
      excludeText
        .split(/[\n,、,]/)
        .map((w) => w.trim())
        .filter(Boolean),
    [excludeText]
  );

  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((n) => n.keyword.includes(q));
    }
    if (depthFilter !== "all") {
      const d = Number(depthFilter);
      list = list.filter((n) => n.depth === d);
    }
    if (excludeWords.length > 0) {
      list = list.filter((n) => !excludeWords.some((w) => n.keyword.includes(w)));
    }

    const sorted = [...list];
    if (sortMode === "keyword-asc") sorted.sort((a, b) => a.keyword.localeCompare(b.keyword, "ja"));
    else if (sortMode === "keyword-desc") sorted.sort((a, b) => b.keyword.localeCompare(a.keyword, "ja"));
    else if (sortMode === "depth") sorted.sort((a, b) => a.depth - b.depth || a.order - b.order);
    else sorted.sort((a, b) => a.order - b.order);
    return sorted;
  }, [nodes, search, depthFilter, excludeWords, sortMode]);

  const seeds = summary.seeds;

  const tree = useMemo(
    () => (seeds ? buildForestTree(rootKeyword, seeds, relations) : buildTree(rootKeyword, relations)),
    [rootKeyword, relations, seeds]
  );

  const availableDepths = useMemo(() => {
    const depths = new Set(nodes.map((n) => n.depth));
    return Array.from(depths).sort((a, b) => a - b);
  }, [nodes]);

  const toggleSelect = (keyword: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const handleDownloadCsv = () => {
    const rows = relationsToCsvRows(rootKeyword, relations);
    const blob = buildCsvBlob(rows);
    triggerBlobDownload(blob, `${rootKeyword}_suggest.csv`);
  };

  const handleDownloadJson = () => {
    const json = seeds
      ? buildSuggestJsonForest(rootKeyword, seeds, relations)
      : buildSuggestJson(rootKeyword, relations);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    triggerBlobDownload(blob, `${rootKeyword}_suggest.json`);
  };

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="起点キーワード" value={summary.rootKeyword} />
        {seeds && <StatTile label="展開キーワード数" value={`${seeds.length}件`} />}
        <StatTile label="API検索数" value={`${summary.apiCount}回`} />
        <StatTile label="重複削除前" value={`${summary.beforeDedupe}件`} />
        <StatTile label="ユニークキーワード" value={`${summary.uniqueCount}件`} />
        {Object.entries(summary.depthCounts).map(([depth, count]) => (
          <StatTile key={depth} label={`${depth}階層目`} value={`${count}件`} />
        ))}
        <StatTile label="重複削除" value={`${summary.dedupedCount}件`} />
      </div>

      <div className="flex gap-2 border-b border-zinc-200">
        {(["list", "tree", "errors"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "list" ? "一覧" : t === "tree" ? "階層" : `エラー（${errors.length}）`}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="キーワードを検索"
              className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
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
                  {d === "all" ? "全件" : `${d}階層`}
                </button>
              ))}
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
            >
              <option value="order">取得順</option>
              <option value="keyword-asc">キーワード昇順</option>
              <option value="keyword-desc">キーワード降順</option>
              <option value="depth">階層順</option>
            </select>
          </div>
          <input
            type="text"
            value={excludeText}
            onChange={(e) => setExcludeText(e.target.value)}
            placeholder="除外キーワード（カンマ区切り、例: 中古,メンズ）"
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />

          <p className="text-xs text-zinc-400">{filteredNodes.length}件表示中</p>

          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-max border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-zinc-100">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">No.</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">キーワード</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">階層</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">親キーワード</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">起点</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map((node, i) => (
                  <tr key={node.keyword} className="odd:bg-white even:bg-zinc-50">
                    <td className="border-b border-zinc-100 px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(node.keyword)}
                        onChange={() => toggleSelect(node.keyword)}
                      />
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-400">{i + 1}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">{node.keyword}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{node.depth}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{node.firstParent}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{rootKeyword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton getText={() => filteredNodes.map((n) => n.keyword).join("\n")} label="改行区切りでコピー" />
            <CopyButton getText={() => filteredNodes.map((n) => n.keyword).join(" ")} label="スペース区切りでコピー" />
            <CopyButton getText={() => filteredNodes.map((n) => n.keyword).join(",")} label="CSV形式でコピー" />
            <CopyButton
              getText={() => Array.from(selected).join("\n")}
              label={`選択キーワードをコピー（${selected.size}）`}
              disabled={selected.size === 0}
            />
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              CSVダウンロード
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              JSONダウンロード
            </button>
          </div>
        </div>
      )}

      {tab === "tree" && <KeywordTree tree={tree} />}

      {tab === "errors" && (
        <div className="flex flex-col gap-2">
          {errors.length === 0 ? (
            <p className="text-sm text-zinc-400">エラーはありませんでした。</p>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">キーワード</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">HTTPステータス</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">種別</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">発生日時</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, i) => (
                  <tr key={i} className="odd:bg-white even:bg-zinc-50">
                    <td className="border-b border-zinc-100 px-3 py-1.5">{err.keyword}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5">{err.httpStatus ?? "-"}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5">{err.kind}</td>
                    <td className="border-b border-zinc-100 px-3 py-1.5">
                      {new Date(err.occurredAt).toLocaleString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CsvPreviewTable from "@/components/tools/CsvPreviewTable";
import { CsvLoadResult, buildCsvBlob } from "@/lib/csv";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

type MatchMode = "exact" | "partial" | "prefix" | "suffix";

const MATCH_LABELS: Record<MatchMode, string> = {
  exact: "完全一致",
  partial: "部分一致",
  prefix: "前方一致",
  suffix: "後方一致",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cellMatches(cell: string, search: string, mode: MatchMode, caseSensitive: boolean): boolean {
  const a = caseSensitive ? cell : cell.toLowerCase();
  const b = caseSensitive ? search : search.toLowerCase();
  if (mode === "exact") return a === b;
  if (mode === "partial") return a.includes(b);
  if (mode === "prefix") return a.startsWith(b);
  return a.endsWith(b);
}

function replaceCell(
  cell: string,
  search: string,
  replace: string,
  mode: MatchMode,
  caseSensitive: boolean
): string {
  if (!search || !cellMatches(cell, search, mode, caseSensitive)) return cell;
  if (mode === "exact") return replace;
  const flags = caseSensitive ? "g" : "gi";
  const escaped = escapeRegExp(search);
  if (mode === "partial") return cell.replace(new RegExp(escaped, flags), replace);
  if (mode === "prefix") return cell.replace(new RegExp(`^${escaped}`, flags), replace);
  return cell.replace(new RegExp(`${escaped}$`, flags), replace);
}

export default function CsvReplacePage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [targetAll, setTargetAll] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("partial");
  const [caseSensitive, setCaseSensitive] = useState(true);

  const handleLoaded = (result: CsvLoadResult) => {
    setCsv(result);
    setSelectedColumns((result.rows[0] ?? []).map((_, i) => i));
    setTargetAll(true);
  };

  const toggleColumn = (index: number) => {
    setSelectedColumns((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const { outputRows, changedCellCount } = useMemo(() => {
    if (!csv || !search) return { outputRows: csv?.rows ?? [], changedCellCount: 0 };

    const header = csv.rows[0];
    const dataRows = csv.rows.slice(1);
    const targetIndices = targetAll
      ? header.map((_, i) => i)
      : selectedColumns;
    const targetSet = new Set(targetIndices);

    let changed = 0;
    const newDataRows = dataRows.map((row) =>
      row.map((cell, colIndex) => {
        if (!targetSet.has(colIndex)) return cell;
        if (!cellMatches(cell, search, matchMode, caseSensitive)) return cell;
        changed++;
        return replaceCell(cell, search, replace, matchMode, caseSensitive);
      })
    );

    return { outputRows: [header, ...newDataRows], changedCellCount: changed };
  }, [csv, search, replace, matchMode, caseSensitive, targetAll, selectedColumns]);

  const handleDownload = () => {
    if (!csv) return;
    const blob = buildCsvBlob(outputRows);
    triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}_replaced.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CSV一括置換</h1>
        <p className="text-sm text-zinc-500">指定した列の文字列をまとめて検索・置換します。</p>
      </header>

      <ToolSection step="1" title="CSVをアップロード（1行目はヘッダーとして扱います）">
        <CsvUploadPanel onLoaded={handleLoaded} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="現在の情報">
            <CsvOverview csv={csv} />
          </ToolSection>

          <ToolSection step="3" title="対象列">
            <label className="flex items-center gap-1.5 text-sm text-zinc-600">
              <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} />
              全列を対象にする
            </label>
            {!targetAll && (
              <div className="flex flex-wrap gap-2">
                {(csv.rows[0] ?? []).map((name, index) => (
                  <label
                    key={index}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                      selectedColumns.includes(index)
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-zinc-300 text-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedColumns.includes(index)}
                      onChange={() => toggleColumn(index)}
                    />
                    {name || `列${index + 1}`}
                  </label>
                ))}
              </div>
            )}
          </ToolSection>

          <ToolSection step="4" title="検索・置換条件">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="検索文字列"
                className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <span className="text-zinc-400">→</span>
              <input
                type="text"
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder="置換後の文字列"
                className="w-48 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MATCH_LABELS) as MatchMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMatchMode(mode)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    matchMode === mode
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-red-400"
                  }`}
                >
                  {MATCH_LABELS[mode]}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                大文字小文字を区別
              </label>
            </div>
          </ToolSection>

          <ToolSection step="5" title="実行前の確認">
            <p className="text-sm font-medium text-zinc-700">
              {search ? `${changedCellCount}セルが変更されます` : "検索文字列を入力してください"}
            </p>
            <CsvPreviewTable rows={outputRows} hasHeaderRow />
          </ToolSection>

          <ToolSection step="6" title="出力">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!search || changedCellCount === 0}
              className="self-start rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              CSVをダウンロード
            </button>
          </ToolSection>
        </>
      )}
    </main>
  );
}

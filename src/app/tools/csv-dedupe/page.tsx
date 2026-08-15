"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CsvPreviewTable from "@/components/tools/CsvPreviewTable";
import { CsvLoadResult, buildCsvBlob } from "@/lib/csv";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

type DedupeAction = "keep-first" | "keep-last" | "remove-all" | "extract-duplicates";

const ACTION_LABELS: Record<DedupeAction, string> = {
  "keep-first": "最初を残す",
  "keep-last": "最後を残す",
  "remove-all": "重複を全件削除",
  "extract-duplicates": "重複だけ抽出",
};

export default function CsvDedupePage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [keyIndices, setKeyIndices] = useState<number[]>([]);
  const [action, setAction] = useState<DedupeAction>("keep-first");

  const handleLoaded = (result: CsvLoadResult) => {
    setCsv(result);
    setKeyIndices(result.rows[0] && result.rows[0].length > 0 ? [0] : []);
  };

  const toggleKey = (index: number) => {
    setKeyIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const { outputRows, stats } = useMemo(() => {
    if (!csv || keyIndices.length === 0) {
      return {
        outputRows: csv ? csv.rows : [],
        stats: { total: 0, duplicateRows: 0, groupCount: 0, toRemove: 0, afterCount: 0 },
      };
    }
    const header = csv.rows[0];
    const dataRows = csv.rows.slice(1);

    const groups = new Map<string, number[]>();
    dataRows.forEach((row, i) => {
      const key = JSON.stringify(keyIndices.map((idx) => row[idx] ?? ""));
      const list = groups.get(key) ?? [];
      list.push(i);
      groups.set(key, list);
    });

    const duplicateGroups = Array.from(groups.values()).filter((list) => list.length > 1);
    const duplicateRowCount = duplicateGroups.reduce((sum, g) => sum + g.length, 0);
    const groupCount = duplicateGroups.length;

    const keepIndices = new Set<number>();
    groups.forEach((list) => {
      if (list.length === 1) {
        keepIndices.add(list[0]);
        return;
      }
      if (action === "keep-first") keepIndices.add(list[0]);
      else if (action === "keep-last") keepIndices.add(list[list.length - 1]);
      else if (action === "extract-duplicates") list.forEach((i) => keepIndices.add(i));
      // remove-all: keep none from duplicate groups
    });

    const filteredData = dataRows.filter((_, i) => keepIndices.has(i));
    const outputRows = [header, ...filteredData];

    const afterCount = filteredData.length;
    const toRemove = dataRows.length - afterCount;

    return {
      outputRows,
      stats: {
        total: dataRows.length,
        duplicateRows: duplicateRowCount,
        groupCount,
        toRemove,
        afterCount,
      },
    };
  }, [csv, keyIndices, action]);

  const handleDownload = () => {
    if (!csv) return;
    const blob = buildCsvBlob(outputRows);
    triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}_deduped.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CSV重複削除</h1>
        <p className="text-sm text-zinc-500">指定した列の値をもとに重複行を検出し、削除・抽出します。</p>
      </header>

      <ToolSection step="1" title="CSVをアップロード（1行目はヘッダーとして扱います）">
        <CsvUploadPanel onLoaded={handleLoaded} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="現在の情報">
            <CsvOverview csv={csv} />
          </ToolSection>

          <ToolSection step="3" title="判定に使う列（複数選択可）">
            <div className="flex flex-wrap gap-2">
              {(csv.rows[0] ?? []).map((name, index) => (
                <label
                  key={index}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                    keyIndices.includes(index)
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-zinc-300 text-zinc-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={keyIndices.includes(index)}
                    onChange={() => toggleKey(index)}
                  />
                  {name || `列${index + 1}`}
                </label>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="4" title="重複時の処理">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACTION_LABELS) as DedupeAction[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAction(a)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    action === a
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-red-400"
                  }`}
                >
                  {ACTION_LABELS[a]}
                </button>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="5" title="実行前の確認">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StatTile label="総行数" value={`${stats.total}行`} />
              <StatTile label="重複グループ" value={`${stats.groupCount}件`} />
              <StatTile label="重複行数" value={`${stats.duplicateRows}行`} />
              <StatTile label="削除予定" value={`${stats.toRemove}行`} />
              <StatTile label="処理後" value={`${stats.afterCount}行`} />
            </div>
            <CsvPreviewTable rows={outputRows} hasHeaderRow />
          </ToolSection>

          <ToolSection step="6" title="出力">
            <button
              type="button"
              onClick={handleDownload}
              disabled={keyIndices.length === 0}
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

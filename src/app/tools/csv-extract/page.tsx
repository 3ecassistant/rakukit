"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CsvPreviewTable from "@/components/tools/CsvPreviewTable";
import { CsvLoadResult, buildCsvBlob } from "@/lib/csv";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

interface ColumnEntry {
  index: number;
  name: string;
  checked: boolean;
}

export default function CsvExtractPage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [columns, setColumns] = useState<ColumnEntry[]>([]);

  const handleLoaded = (result: CsvLoadResult) => {
    setCsv(result);
    const header = result.rows[0] ?? [];
    setColumns(
      header.map((name, index) => ({
        index,
        name: name || `列${index + 1}`,
        checked: true,
      }))
    );
  };

  const move = (from: number, to: number) => {
    setColumns((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const toggle = (index: number) => {
    setColumns((prev) =>
      prev.map((c) => (c.index === index ? { ...c, checked: !c.checked } : c))
    );
  };

  const outputRows = useMemo(() => {
    if (!csv) return [];
    const activeColumns = columns.filter((c) => c.checked);
    return csv.rows.map((row) => activeColumns.map((c) => row[c.index] ?? ""));
  }, [csv, columns]);

  const handleDownload = () => {
    if (!csv || outputRows.length === 0) return;
    const blob = buildCsvBlob(outputRows);
    triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}_extracted.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CSV列抽出</h1>
        <p className="text-sm text-zinc-500">必要な列だけを選んで、並び順を指定した新しいCSVを生成します。</p>
      </header>

      <ToolSection step="1" title="CSVをアップロード（1行目はヘッダーとして扱います）">
        <CsvUploadPanel onLoaded={handleLoaded} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="現在の情報">
            <CsvOverview csv={csv} />
          </ToolSection>

          <ToolSection step="3" title="出力する列を選択・並び替え">
            <ul className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {columns.map((col, i) => (
                <li key={col.index} className="flex items-center gap-3 px-3 py-2">
                  <input type="checkbox" checked={col.checked} onChange={() => toggle(col.index)} />
                  <span className="flex-1 truncate text-sm text-zinc-700">{col.name}</span>
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:border-red-400 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === columns.length - 1}
                    className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:border-red-400 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
          </ToolSection>

          <ToolSection step="4" title="プレビュー（先頭20行）">
            <CsvPreviewTable rows={outputRows} hasHeaderRow />
          </ToolSection>

          <ToolSection step="5" title="出力">
            <button
              type="button"
              onClick={handleDownload}
              disabled={outputRows.length === 0}
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

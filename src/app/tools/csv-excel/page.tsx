"use client";

import { useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CsvPreviewTable from "@/components/tools/CsvPreviewTable";
import { CsvLoadResult } from "@/lib/csv";
import { buildExcelFromRows } from "@/lib/excel";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

export default function CsvExcelPage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!csv) return;
    setIsGenerating(true);
    try {
      const blob = await buildExcelFromRows(csv.rows, { hasHeaderRow });
      triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}.xlsx`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CSV→Excel変換</h1>
        <p className="text-sm text-zinc-500">
          先頭行固定・オートフィルター付きのExcelファイルへ変換します。先頭0付きコードなどはすべて文字列として保持されます。
        </p>
      </header>

      <ToolSection step="1" title="CSVをアップロード">
        <CsvUploadPanel onLoaded={setCsv} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="現在の情報とプレビュー（先頭20行）">
            <CsvOverview csv={csv} />
            <CsvPreviewTable rows={csv.rows} hasHeaderRow={hasHeaderRow} />
          </ToolSection>

          <ToolSection step="3" title="設定">
            <label className="flex items-center gap-1.5 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={hasHeaderRow}
                onChange={(e) => setHasHeaderRow(e.target.checked)}
              />
              1行目をヘッダーとして扱う（太字・先頭行固定・オートフィルター）
            </label>
          </ToolSection>

          <ToolSection step="4" title="出力">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="self-start rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {isGenerating ? "生成中…" : "Excelをダウンロード"}
            </button>
          </ToolSection>
        </>
      )}
    </main>
  );
}

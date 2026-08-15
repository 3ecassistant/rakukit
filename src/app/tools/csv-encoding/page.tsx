"use client";

import { useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CsvPreviewTable from "@/components/tools/CsvPreviewTable";
import { CsvEncodingTarget, CsvLoadResult, encodeText } from "@/lib/csv";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

const TARGET_OPTIONS: { value: CsvEncodingTarget; label: string }[] = [
  { value: "UTF8", label: "UTF-8" },
  { value: "UTF8BOM", label: "UTF-8 (BOM付き)" },
  { value: "SJIS", label: "Shift_JIS" },
  { value: "EUCJP", label: "EUC-JP" },
];

export default function CsvEncodingPage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [target, setTarget] = useState<CsvEncodingTarget>("UTF8BOM");

  const handleDownload = () => {
    if (!csv) return;
    const bytes = encodeText(csv.text, target);
    const blob = new Blob([bytes], { type: "text/csv" });
    const label = TARGET_OPTIONS.find((o) => o.value === target)?.label ?? target;
    triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}_${label.replace(/[^\w]/g, "")}.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CSV文字コード変換</h1>
        <p className="text-sm text-zinc-500">
          文字コードを自動判定し、CSVの構造を保ったまま指定の文字コードへ変換します。
        </p>
      </header>

      <ToolSection step="1" title="CSVをアップロード">
        <CsvUploadPanel onLoaded={setCsv} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="現在の情報とプレビュー（先頭20行）">
            <CsvOverview csv={csv} />
            <CsvPreviewTable rows={csv.rows} hasHeaderRow />
          </ToolSection>

          <ToolSection step="3" title="変換先の文字コード">
            <div className="flex flex-wrap gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTarget(opt.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    target === opt.value
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-red-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="4" title="出力">
            <button
              type="button"
              onClick={handleDownload}
              className="self-start rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              変換してダウンロード
            </button>
          </ToolSection>
        </>
      )}
    </main>
  );
}

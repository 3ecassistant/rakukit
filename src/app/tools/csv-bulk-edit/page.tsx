"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CsvUploadPanel from "@/components/tools/CsvUploadPanel";
import CsvOverview from "@/components/tools/CsvOverview";
import CsvPreviewTable from "@/components/tools/CsvPreviewTable";
import OperationForm from "@/components/tools/csv-bulk-edit/OperationForm";
import DiffPreviewTable, { DiffSample } from "@/components/tools/csv-bulk-edit/DiffPreviewTable";
import { CsvEncodingTarget, CsvLoadResult, buildCsvBlob } from "@/lib/csv";
import {
  Condition,
  DEFAULT_CONDITION,
  OperationSettings,
  computeOperation,
} from "@/lib/csvBulkEdit";
import { recognizeColumn } from "@/lib/rakutenColumnMaster";
import { baseNameOf } from "@/lib/naming";
import { triggerBlobDownload } from "@/lib/download";

const DEFAULT_SETTINGS: OperationSettings = {
  type: "replace",
  targetColumnIndex: 0,
  matchMode: "partial",
  caseSensitive: true,
  appendPosition: "suffix",
  skipIfExists: true,
  trimAfter: false,
};

const ENCODING_OPTIONS: { value: CsvEncodingTarget; label: string }[] = [
  { value: "UTF8", label: "UTF-8" },
  { value: "UTF8BOM", label: "UTF-8 (BOM付き)" },
  { value: "SJIS", label: "Shift_JIS" },
  { value: "EUCJP", label: "EUC-JP" },
];

export default function CsvBulkEditPage() {
  const [csv, setCsv] = useState<CsvLoadResult | null>(null);
  const [originalRows, setOriginalRows] = useState<string[][]>([]);
  const [workingRows, setWorkingRows] = useState<string[][]>([]);
  const [settings, setSettings] = useState<OperationSettings>(DEFAULT_SETTINGS);
  const [condition, setCondition] = useState<Condition>(DEFAULT_CONDITION);
  const [outputEncoding, setOutputEncoding] = useState<CsvEncodingTarget | null>(null);

  const handleLoaded = (result: CsvLoadResult) => {
    setCsv(result);
    setOriginalRows(result.rows);
    setWorkingRows(result.rows);
    setSettings({ ...DEFAULT_SETTINGS, targetColumnIndex: 0 });
    setCondition(DEFAULT_CONDITION);
    setOutputEncoding(null);
  };

  const header = useMemo(() => workingRows[0] ?? [], [workingRows]);
  const dataRows = useMemo(() => workingRows.slice(1), [workingRows]);

  const codeColumnIndex = useMemo(() => {
    const idx = header.findIndex((h) => {
      const rec = recognizeColumn(h);
      return rec?.id === "itemManagementId" || rec?.id === "itemNumber";
    });
    return idx;
  }, [header]);

  const preview = useMemo(() => computeOperation(dataRows, settings, condition), [dataRows, settings, condition]);

  const changedCount = preview.changedRowIndices.length;
  const totalCount = dataRows.length;
  const changeRatio = totalCount > 0 ? changedCount / totalCount : 0;

  const diffSamples: DiffSample[] = useMemo(
    () =>
      preview.changedRowIndices.slice(0, 20).map((i) => {
        const rowLabel = codeColumnIndex >= 0 ? dataRows[i][codeColumnIndex] || `${i + 1}行目` : `${i + 1}行目`;
        return {
          rowLabel,
          before: dataRows[i][settings.targetColumnIndex] ?? "",
          after: preview.newRows[i][settings.targetColumnIndex] ?? "",
        };
      }),
    [preview, dataRows, settings.targetColumnIndex, codeColumnIndex]
  );

  const overallChangedCount = useMemo(() => {
    const origData = originalRows.slice(1);
    let changed = 0;
    dataRows.forEach((row, i) => {
      const origRow = origData[i];
      if (!origRow) return;
      if (row.some((cell, j) => cell !== origRow[j])) changed++;
    });
    return changed;
  }, [originalRows, dataRows]);

  const handleApply = () => {
    if (changedCount === 0) return;
    setWorkingRows([header, ...preview.newRows]);
  };

  const handleReset = () => {
    if (!confirm("すべての編集を破棄して、アップロード直後の状態に戻します。よろしいですか？")) return;
    setWorkingRows(originalRows);
  };

  const handleDownload = () => {
    if (!csv) return;
    const target = outputEncoding ?? csv.detectedTarget;
    const lineBreak = csv.lineBreak === "LF" ? "LF" : "CRLF";
    const blob = buildCsvBlob(workingRows, target, lineBreak);
    triggerBlobDownload(blob, `${baseNameOf(csv.fileName)}_edited.csv`);
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CSV商品一括編集</h1>
        <p className="text-sm text-zinc-500">
          楽天商品CSVを読み込み、対象列・条件を指定して一括置換・追加・削除を行います。適用前に必ず変更前後を確認できます。
        </p>
      </header>

      <ToolSection step="1" title="CSVをアップロード（1行目はヘッダーとして扱います）">
        <CsvUploadPanel onLoaded={handleLoaded} fileName={csv?.fileName} />
      </ToolSection>

      {csv && (
        <>
          <ToolSection step="2" title="CSV確認">
            <CsvOverview csv={csv} />
            <CsvPreviewTable rows={workingRows} hasHeaderRow maxRows={20} />
          </ToolSection>

          <ToolSection step="3" title="編集内容を設定">
            <OperationForm
              header={header}
              settings={settings}
              onSettingsChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              condition={condition}
              onConditionChange={(patch) => setCondition((prev) => ({ ...prev, ...patch }))}
            />
          </ToolSection>

          <ToolSection step="4" title="対象件数・変更前後の確認">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatTile label="総行数" value={`${totalCount}行`} />
              <StatTile label="変更対象" value={`${changedCount}行`} />
              <StatTile label="変更なし" value={`${totalCount - changedCount}行`} />
            </div>

            {changeRatio >= 0.9 && changedCount > 0 && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                全体の{Math.round(changeRatio * 100)}%（{changedCount}行）が変更されます。設定内容をよくご確認ください。
              </p>
            )}
            {preview.becameEmptyCount > 0 && (
              <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                この編集により{preview.becameEmptyCount}件のセルが空欄になります。
              </p>
            )}

            <p className="text-xs font-semibold text-zinc-600">変更前後のサンプル（最大20件）</p>
            <DiffPreviewTable samples={diffSamples} />

            <button
              type="button"
              onClick={handleApply}
              disabled={changedCount === 0}
              className="self-start rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              編集を適用（{changedCount}行）
            </button>
          </ToolSection>

          <ToolSection step="5" title="出力">
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
              <span>この画面を開いてから累計 {overallChangedCount}行を変更しました（未適用の設定は含みません）。</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">出力する文字コード</span>
              {ENCODING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutputEncoding(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    (outputEncoding ?? csv.detectedTarget) === opt.value
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-red-400"
                  }`}
                >
                  {opt.label}
                  {csv.detectedTarget === opt.value && outputEncoding === null ? "（元のまま）" : ""}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={overallChangedCount === 0}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400 disabled:opacity-40"
              >
                元CSVに戻す
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                CSVをダウンロード
              </button>
            </div>
          </ToolSection>
        </>
      )}
    </main>
  );
}

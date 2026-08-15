"use client";

import { ProcessedFileResult, ProcessSummary } from "@/lib/types";
import { formatBytes, formatPercent } from "@/lib/format";

interface ResultsPanelProps {
  summary: ProcessSummary;
  results: ProcessedFileResult[];
  onDownloadSingle: (result: ProcessedFileResult) => void;
  onDownloadAll: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-100 bg-red-50/60 px-4 py-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-red-800">{value}</p>
    </div>
  );
}

export default function ResultsPanel({
  summary,
  results,
  onDownloadSingle,
  onDownloadAll,
}: ResultsPanelProps) {
  const successResults = results.filter((r) => !r.error);
  const errorResults = results.filter((r) => r.error);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="処理枚数" value={`${summary.count}枚`} />
        <Stat label="処理前容量" value={formatBytes(summary.originalTotalSize)} />
        <Stat label="処理後容量" value={formatBytes(summary.processedTotalSize)} />
        <Stat label="削減容量" value={formatBytes(summary.savedSize)} />
        <Stat label="削減率" value={formatPercent(summary.savedRatio)} />
      </div>

      {successResults.length > 0 && (
        <button
          type="button"
          onClick={onDownloadAll}
          className="self-start rounded-full bg-gradient-to-b from-red-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-red-600 hover:to-red-700"
        >
          {successResults.length > 1 ? "すべてダウンロード（ZIP）" : "ダウンロード"}
        </button>
      )}

      <ul className="flex flex-col divide-y divide-zinc-100">
        {results.map((result) => (
          <li key={result.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium text-zinc-700"
                title={result.error ? result.originalName : result.downloadName}
              >
                {result.error ? result.originalName : result.downloadName}
              </p>
              {result.error ? (
                <p className="text-xs text-red-600">{result.error}</p>
              ) : (
                <p className="text-xs text-zinc-400">
                  {result.originalName}
                  {" ・ "}
                  {formatBytes(result.originalSize)} → {formatBytes(result.processedSize)}
                  {" ・ "}
                  {result.width}×{result.height}
                </p>
              )}
            </div>
            {!result.error && (
              <button
                type="button"
                onClick={() => onDownloadSingle(result)}
                className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
              >
                ダウンロード
              </button>
            )}
          </li>
        ))}
      </ul>

      {errorResults.length > 0 && (
        <p className="text-xs text-zinc-500">
          {errorResults.length}枚の画像は処理できませんでした。上記のエラー内容をご確認ください。
        </p>
      )}
    </div>
  );
}

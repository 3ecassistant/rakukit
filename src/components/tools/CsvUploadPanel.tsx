"use client";

import { useRef, useState } from "react";
import { CsvLoadResult, describeParseError, loadCsvFile } from "@/lib/csv";
import { formatBytes } from "@/lib/format";

interface CsvUploadPanelProps {
  onLoaded: (result: CsvLoadResult) => void;
  maxSizeBytes?: number;
  fileName?: string;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

export default function CsvUploadPanel({
  onLoaded,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  fileName,
}: CsvUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("CSVファイル（.csv）を選択してください");
      return;
    }
    if (file.size > maxSizeBytes) {
      setError(`ファイルサイズが上限（${formatBytes(maxSizeBytes)}）を超えています`);
      return;
    }
    setIsLoading(true);
    try {
      const result = await loadCsvFile(file);
      if (result.parseErrors.length > 0) {
        setError(
          `CSVを読み込めましたが、一部の行に問題があります: ${describeParseError(result.parseErrors[0])}`
        );
      }
      onLoaded(result);
    } catch {
      setError("CSVを読み込めませんでした。ファイル形式をご確認ください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white px-6 py-10 text-center transition-colors hover:border-red-400 hover:bg-red-50/50"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <p className="text-sm font-semibold text-zinc-800">
          {fileName ? fileName : "CSVファイルを選択"}
        </p>
        <p className="text-xs text-zinc-400">
          {isLoading ? "読み込み中…" : `クリックしてアップロード（最大${formatBytes(maxSizeBytes)}）`}
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

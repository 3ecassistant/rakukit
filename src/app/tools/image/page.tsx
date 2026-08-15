"use client";

import { useCallback, useState } from "react";
import JSZip from "jszip";
import UploadArea from "@/components/UploadArea";
import FileList from "@/components/FileList";
import SettingsPanel from "@/components/SettingsPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { ACCEPTED_MIME_TYPES, DEFAULT_SETTINGS, MAX_FILES, MAX_FILE_SIZE } from "@/lib/constants";
import { ProcessedFileResult, ProcessSettings, ProcessSummary, UploadItem } from "@/lib/types";
import { base64ToBlob, triggerBlobDownload } from "@/lib/download";
import { formatBytes } from "@/lib/format";

type Status = "idle" | "processing" | "done" | "error";

export default function ImageToolPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [settings, setSettings] = useState<ProcessSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<ProcessedFileResult[] | null>(null);
  const [summary, setSummary] = useState<ProcessSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessing = status === "processing";

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setErrorMessage(null);
      setStatus("idle");
      setResults(null);
      setSummary(null);

      const accepted: File[] = [];
      const rejected: string[] = [];

      for (const file of files) {
        if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
          rejected.push(`${file.name}（対応していない形式です）`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          rejected.push(`${file.name}（20MBを超えています）`);
          continue;
        }
        accepted.push(file);
      }

      setItems((prev) => {
        const remainingSlots = MAX_FILES - prev.length;
        const toAdd = accepted.slice(0, Math.max(0, remainingSlots));
        if (accepted.length > toAdd.length) {
          rejected.push(`一度に処理できるのは${MAX_FILES}枚までです（超過分は追加されませんでした）`);
        }
        const newItems: UploadItem[] = toAdd.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        }));
        return [...prev, ...newItems];
      });

      if (rejected.length > 0) {
        setErrorMessage(rejected.join(" / "));
      }
    },
    []
  );

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setResults(null);
    setSummary(null);
    setStatus("idle");
  }, []);

  const handleSettingsChange = useCallback((patch: Partial<ProcessSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleProcess = useCallback(async () => {
    if (items.length === 0) return;
    setStatus("processing");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("settings", JSON.stringify(settings));
      items.forEach((item) => formData.append("files", item.file));

      const res = await fetch("/api/process", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "処理に失敗しました");
      }

      setResults(data.results);
      setSummary(data.summary);
      setStatus("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "処理に失敗しました");
      setStatus("error");
    }
  }, [items, settings]);

  const handleDownloadSingle = useCallback((result: ProcessedFileResult) => {
    const blob = base64ToBlob(result.dataBase64, result.mimeType);
    triggerBlobDownload(blob, result.downloadName);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!results) return;
    const successResults = results.filter((r) => !r.error);
    if (successResults.length === 0) return;

    if (successResults.length === 1) {
      handleDownloadSingle(successResults[0]);
      return;
    }

    const zip = new JSZip();
    successResults.forEach((result) => {
      zip.file(result.downloadName, result.dataBase64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[-:T]/g, "");
    triggerBlobDownload(blob, `rakukit_${timestamp}.zip`);
  }, [results, handleDownloadSingle]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-black text-zinc-900 sm:text-3xl">
          楽天市場の画像作業を、もっと簡単に。
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          商品画像のリサイズ・圧縮をブラウザだけで一括処理。
        </p>
      </header>

      <UploadArea onFilesSelected={handleFilesSelected} disabled={isProcessing} />

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
      )}

      <FileList
        items={items}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
        disabled={isProcessing}
      />

      {items.length > 0 && (
        <SettingsPanel settings={settings} onChange={handleSettingsChange} disabled={isProcessing} />
      )}

      {items.length > 0 && (
        <button
          type="button"
          onClick={handleProcess}
          disabled={isProcessing}
          className="self-center rounded-full bg-red-600 px-10 py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing
            ? "処理中…"
            : `画像を処理する（${items.length}枚・合計${formatBytes(
                items.reduce((sum, i) => sum + i.file.size, 0)
              )}）`}
        </button>
      )}

      {results && summary && (
        <ResultsPanel
          summary={summary}
          results={results}
          onDownloadSingle={handleDownloadSingle}
          onDownloadAll={handleDownloadAll}
        />
      )}
    </main>
  );
}

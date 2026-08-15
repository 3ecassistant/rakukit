"use client";

import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "@/lib/constants";

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function UploadArea({ onFilesSelected, disabled }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openFileDialog = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      onClick={openFileDialog}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFilesSelected(files);
      }}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
          : isDragging
            ? "cursor-pointer border-red-500 bg-red-50"
            : "cursor-pointer border-zinc-300 bg-white hover:border-red-400 hover:bg-red-50/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFilesSelected(files);
          e.target.value = "";
        }}
      />
      <p className="text-lg font-bold text-zinc-800">画像を選択</p>
      <p className="text-sm text-zinc-500">またはここに画像をドロップ</p>
      <p className="text-xs text-zinc-400">JPEG / PNG / WebP・1ファイル20MBまで・最大50枚</p>
    </div>
  );
}

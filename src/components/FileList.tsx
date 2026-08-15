"use client";

import { UploadItem } from "@/lib/types";
import { formatBytes } from "@/lib/format";

interface FileListProps {
  items: UploadItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export default function FileList({ items, onRemove, onClearAll, disabled }: FileListProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700">
          選択中の画像 <span className="text-zinc-400">{items.length}枚</span>
        </p>
        <button
          type="button"
          onClick={onClearAll}
          disabled={disabled}
          className="text-sm text-zinc-500 hover:text-red-600 disabled:opacity-40"
        >
          全て削除
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt={item.file.name}
              className="h-24 w-full object-cover"
            />
            <div className="flex flex-col gap-0.5 p-2">
              <p className="truncate text-xs font-medium text-zinc-700" title={item.file.name}>
                {item.file.name}
              </p>
              <p className="text-[11px] text-zinc-400">{formatBytes(item.file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`${item.file.name}を削除`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

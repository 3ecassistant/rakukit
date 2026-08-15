"use client";

import { useState } from "react";
import { KeywordProject } from "@/lib/suggestTrendDb";

export interface ProjectFormValues {
  name: string;
  rootKeyword: string;
  depth: 1 | 2 | 3;
  memo: string;
  excludeWords: string[];
}

interface ProjectFormProps {
  initial?: KeywordProject;
  onSubmit: (values: ProjectFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function ProjectForm({ initial, onSubmit, onCancel, submitLabel = "登録する" }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [rootKeyword, setRootKeyword] = useState(initial?.rootKeyword ?? "");
  const [depth, setDepth] = useState<1 | 2 | 3>(initial?.depth ?? 2);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [excludeText, setExcludeText] = useState((initial?.excludeWords ?? []).join(", "));

  const handleSubmit = () => {
    if (!rootKeyword.trim()) return;
    onSubmit({
      name: name.trim() || rootKeyword.trim(),
      rootKeyword: rootKeyword.trim(),
      depth,
      memo: memo.trim(),
      excludeWords: excludeText
        .split(/[,、\n]/)
        .map((w) => w.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          起点キーワード
          <input
            type="text"
            value={rootKeyword}
            onChange={(e) => setRootKeyword(e.target.value)}
            placeholder="例: トートバッグ"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          管理名（省略時は起点キーワード）
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: トートバッグSEO"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-600">取得階層</span>
        {([1, 2, 3] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDepth(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              depth === d
                ? "border-red-600 bg-red-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-red-400"
            }`}
          >
            {d}階層
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        除外キーワード（カンマ区切り、表示のみ非表示・データは保持）
        <input
          type="text"
          value={excludeText}
          onChange={(e) => setExcludeText(e.target.value)}
          placeholder="例: 中古, メンズ"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        メモ
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!rootKeyword.trim()}
          className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

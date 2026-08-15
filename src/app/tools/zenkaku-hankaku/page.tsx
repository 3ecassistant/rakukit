"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CharCategory,
  alnumToFullWidth,
  alnumToHalfWidth,
  classifyText,
  katakanaToFullWidth,
  katakanaToHalfWidth,
  spaceToHalfWidth,
} from "@/lib/charClassify";

const CATEGORY_COLORS: Record<CharCategory, string> = {
  zenkaku_hiragana: "bg-pink-100 text-pink-900",
  zenkaku_katakana: "bg-purple-100 text-purple-900",
  hankaku_katakana: "bg-purple-50 text-purple-700",
  zenkaku_alpha: "bg-blue-100 text-blue-900",
  hankaku_alpha: "bg-blue-50 text-blue-700",
  zenkaku_digit: "bg-green-100 text-green-900",
  hankaku_digit: "bg-green-50 text-green-700",
  zenkaku_space: "bg-yellow-100 text-yellow-900",
  hankaku_space: "bg-yellow-50 text-yellow-700",
  symbol: "bg-orange-100 text-orange-900",
  other: "bg-zinc-100 text-zinc-500",
};

export default function ZenkakuHankakuPage() {
  const [text, setText] = useState("");

  const classified = useMemo(() => classifyText(text), [text]);

  const counts = useMemo(() => {
    const map = new Map<CharCategory, number>();
    CATEGORY_ORDER.forEach((c) => map.set(c, 0));
    classified.forEach((c) => map.set(c.category, (map.get(c.category) ?? 0) + 1));
    return map;
  }, [classified]);

  const applyTransform = (fn: (t: string) => string) => setText((prev) => fn(prev));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">全角／半角文字数チェック</h1>
        <p className="text-sm text-zinc-500">
          文字種別ごとの件数を確認し、ワンクリックで全角⇔半角に変換できます。
        </p>
      </header>

      <ToolSection step="1" title="テキストを入力">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="チェックしたいテキストを入力してください"
          className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none"
        />
      </ToolSection>

      <ToolSection step="2" title="文字種別カウント">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORY_ORDER.map((category) => (
            <StatTile
              key={category}
              label={CATEGORY_LABELS[category]}
              value={`${counts.get(category) ?? 0}文字`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-600">ハイライト表示</p>
          {text ? (
            <div className="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed">
              {classified.map((c, i) => (
                <span key={i} className={`rounded ${CATEGORY_COLORS[c.category]}`}>
                  {c.char}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">ここに文字種別の色分け表示がされます。</p>
          )}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((category) => (
              <span
                key={category}
                className={`rounded px-2 py-0.5 text-[11px] ${CATEGORY_COLORS[category]}`}
              >
                {CATEGORY_LABELS[category]}
              </span>
            ))}
          </div>
        </div>
      </ToolSection>

      <ToolSection step="3" title="変換">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyTransform(alnumToHalfWidth)}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
          >
            英数字を半角化
          </button>
          <button
            type="button"
            onClick={() => applyTransform(alnumToFullWidth)}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
          >
            英数字を全角化
          </button>
          <button
            type="button"
            onClick={() => applyTransform(katakanaToFullWidth)}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
          >
            カタカナを全角化
          </button>
          <button
            type="button"
            onClick={() => applyTransform(katakanaToHalfWidth)}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
          >
            カタカナを半角化
          </button>
          <button
            type="button"
            onClick={() => applyTransform(spaceToHalfWidth)}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600"
          >
            スペースを半角化
          </button>
          <CopyButton getText={() => text} label="変換後をコピー" disabled={!text} />
        </div>
      </ToolSection>
    </main>
  );
}

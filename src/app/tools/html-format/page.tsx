"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import CopyButton from "@/components/tools/CopyButton";
import { IndentOption, formatHtml } from "@/lib/htmlFormat";

export default function HtmlFormatPage() {
  const [html, setHtml] = useState("");
  const [indent, setIndent] = useState<IndentOption>("2");
  const [removeComments, setRemoveComments] = useState(false);
  const [collapseSpaces, setCollapseSpaces] = useState(true);

  const formatted = useMemo(
    () => formatHtml(html, { indent, removeComments, collapseSpaces }),
    [html, indent, removeComments, collapseSpaces]
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">HTML整形</h1>
        <p className="text-sm text-zinc-500">読みにくいHTMLをインデント付きで自動整形します。</p>
      </header>

      <ToolSection step="1" title="HTMLを入力">
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          placeholder="<div><p>商品説明</p><p>送料無料</p></div>"
          className="w-full resize-y rounded-lg border border-zinc-300 p-3 font-mono text-xs focus:border-red-400 focus:outline-none"
        />
      </ToolSection>

      <ToolSection step="2" title="設定">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">インデント</span>
            {(["2", "4", "tab"] as IndentOption[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIndent(opt)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  indent === opt
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-red-400"
                }`}
              >
                {opt === "tab" ? "タブ" : `${opt}スペース`}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={removeComments} onChange={(e) => setRemoveComments(e.target.checked)} />
            コメント削除
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={collapseSpaces} onChange={(e) => setCollapseSpaces(e.target.checked)} />
            連続スペース削除
          </label>
        </div>
      </ToolSection>

      <ToolSection step="3" title="結果">
        <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
          <code>{formatted || "整形結果がここに表示されます"}</code>
        </pre>
        <div className="flex flex-wrap gap-2">
          <CopyButton getText={() => formatted} label="整形結果をコピー" disabled={!formatted} />
        </div>
      </ToolSection>
    </main>
  );
}

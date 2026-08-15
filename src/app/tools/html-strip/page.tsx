"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import CopyButton from "@/components/tools/CopyButton";
import { StripHtmlOptions, stripHtml } from "@/lib/htmlStrip";

export default function HtmlStripPage() {
  const [html, setHtml] = useState("");
  const [options, setOptions] = useState<StripHtmlOptions>({
    brToNewline: true,
    pNewline: true,
    liNewline: true,
    keepLinkUrls: false,
    keepImageUrls: false,
  });

  const stripped = useMemo(() => stripHtml(html, options), [html, options]);

  const toggle = (key: keyof StripHtmlOptions) =>
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">HTMLタグ除去</h1>
        <p className="text-sm text-zinc-500">HTMLからタグを取り除き、文字情報だけを抽出します。</p>
      </header>

      <ToolSection step="1" title="HTMLを入力">
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          placeholder="<p>人気の<b>バッグ</b>です。</p>"
          className="w-full resize-y rounded-lg border border-zinc-300 p-3 font-mono text-xs focus:border-red-400 focus:outline-none"
        />
      </ToolSection>

      <ToolSection step="2" title="オプション">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={options.brToNewline} onChange={() => toggle("brToNewline")} />
            brを改行として残す
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={options.pNewline} onChange={() => toggle("pNewline")} />
            p終了時に改行
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={options.liNewline} onChange={() => toggle("liNewline")} />
            liを改行
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={options.keepLinkUrls} onChange={() => toggle("keepLinkUrls")} />
            URLを残す（aタグ）
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input type="checkbox" checked={options.keepImageUrls} onChange={() => toggle("keepImageUrls")} />
            画像URLを残す
          </label>
        </div>
        <p className="text-xs text-zinc-400">HTMLエンティティ（&amp;など）は自動的に文字へ変換されます。</p>
      </ToolSection>

      <ToolSection step="3" title="結果">
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          {stripped || "抽出結果がここに表示されます"}
        </pre>
        <CopyButton getText={() => stripped} label="テキストをコピー" disabled={!stripped} />
      </ToolSection>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import HighlightedText from "@/components/tools/HighlightedText";
import { classifyText, countByteLength } from "@/lib/charClassify";
import { checkText } from "@/lib/forbiddenCharRules";
import { countExcludingWhitespace, countGraphemes, countLineBreaks, runAdditionalChecks } from "@/lib/textChecks";

const MAX_LENGTH = 10000;

export default function ProductNameCheckerPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const classified = classifyText(text);
    const zenkaku = classified.filter((c) => c.byteWidth === 2).length;
    const hankaku = classified.filter((c) => c.byteWidth === 1).length;
    const digit = classified.filter((c) => c.category === "zenkaku_digit" || c.category === "hankaku_digit").length;
    const alpha = classified.filter((c) => c.category === "zenkaku_alpha" || c.category === "hankaku_alpha").length;
    const symbol = classified.filter((c) => c.category === "symbol").length;

    return {
      total: countGraphemes(text),
      includingSpaces: countGraphemes(text),
      excludingSpaces: countExcludingWhitespace(text),
      zenkaku,
      hankaku,
      digit,
      alpha,
      symbol,
      lineBreaks: countLineBreaks(text),
      bytes: countByteLength(text),
    };
  }, [text]);

  const issues = useMemo(() => checkText(text), [text]);
  const additionalChecks = useMemo(() => runAdditionalChecks(text), [text]);
  const detectedChecks = additionalChecks.filter((c) => c.detected);

  const fixedText = useMemo(() => {
    if (issues.length === 0) return text;
    let result = "";
    let cursor = 0;
    const chars = Array.from(text);
    const issueByIndex = new Map(issues.map((issue) => [issue.index, issue]));
    chars.forEach((char) => {
      const issue = issueByIndex.get(cursor);
      result += issue?.suggestion ?? char;
      cursor += char.length;
    });
    return result;
  }, [text, issues]);

  const checkResultSummary = useMemo(() => {
    const lines = [
      `総文字数: ${stats.total}文字（バイト数: ${stats.bytes}バイト）`,
      `全角: ${stats.zenkaku}文字 / 半角: ${stats.hankaku}文字`,
      `問題のある文字: ${issues.length}件`,
      ...(detectedChecks.length > 0 ? [`注意: ${detectedChecks.map((c) => c.label).join("、")}`] : []),
    ];
    return lines.join("\n");
  }, [stats, issues, detectedChecks]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">商品名文字数チェッカー</h1>
        <p className="text-sm text-zinc-500">
          楽天の商品名を登録する前に、文字数・バイト数・機種依存文字などを確認できます。
        </p>
      </header>

      <ToolSection step="1" title="商品名を入力">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          rows={4}
          placeholder="商品名を貼り付けてください"
          className="w-full resize-y rounded-lg border border-zinc-300 p-3 text-sm focus:border-red-400 focus:outline-none"
        />
        <p className="text-right text-xs text-zinc-400">
          {stats.total} / {MAX_LENGTH}文字
        </p>
      </ToolSection>

      <ToolSection step="2" title="結果">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatTile label="総文字数" value={`${stats.total}文字`} />
          <StatTile label="空白除外" value={`${stats.excludingSpaces}文字`} />
          <StatTile label="全角文字数" value={`${stats.zenkaku}文字`} />
          <StatTile label="半角文字数" value={`${stats.hankaku}文字`} />
          <StatTile label="バイト数" value={`${stats.bytes}バイト`} />
          <StatTile label="数字数" value={`${stats.digit}文字`} />
          <StatTile label="英字数" value={`${stats.alpha}文字`} />
          <StatTile label="記号数" value={`${stats.symbol}文字`} />
          <StatTile label="改行数" value={`${stats.lineBreaks}箇所`} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-600">注意箇所ハイライト</p>
          <HighlightedText text={text} issues={issues} />
          {issues.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-zinc-600">
              {issues.slice(0, 20).map((issue, i) => (
                <li key={i}>
                  <span className="font-mono">「{issue.char}」</span>：{issue.reason}
                  {issue.suggestion && <span className="text-zinc-400">（候補: {issue.suggestion}）</span>}
                </li>
              ))}
              {issues.length > 20 && <li className="text-zinc-400">他 {issues.length - 20} 件</li>}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-600">追加チェック</p>
          <div className="flex flex-wrap gap-2">
            {additionalChecks.map((check) => (
              <span
                key={check.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  check.detected ? "bg-yellow-100 text-yellow-800" : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {check.detected ? "⚠ " : "✓ "}
                {check.label}
              </span>
            ))}
          </div>
        </div>
      </ToolSection>

      <ToolSection step="3" title="出力">
        <div className="flex flex-wrap gap-2">
          <CopyButton getText={() => text} label="商品名コピー" disabled={!text} />
          <CopyButton getText={() => fixedText} label="修正版コピー" disabled={!text} />
          <CopyButton getText={() => checkResultSummary} label="チェック結果コピー" disabled={!text} />
        </div>
      </ToolSection>
    </main>
  );
}

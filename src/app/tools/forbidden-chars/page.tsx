"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import HighlightedText from "@/components/tools/HighlightedText";
import { checkText } from "@/lib/forbiddenCharRules";
import { runAdditionalChecks } from "@/lib/textChecks";

export default function ForbiddenCharsPage() {
  const [text, setText] = useState("");

  const issues = useMemo(() => checkText(text), [text]);
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warningCount = issues.filter((i) => i.level === "warning").length;
  const additionalChecks = useMemo(() => runAdditionalChecks(text), [text]);
  const detectedAdditional = additionalChecks.filter(
    (c) => c.detected && (c.id === "tab" || c.id === "line-break" || c.id === "invisible")
  );

  const overallStatus = errorCount > 0 ? "ERROR" : warningCount > 0 ? "WARNING" : "OK";
  const statusStyle =
    overallStatus === "ERROR"
      ? "bg-red-100 text-red-700"
      : overallStatus === "WARNING"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-green-100 text-green-700";

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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">禁止文字／機種依存文字チェック</h1>
        <p className="text-sm text-zinc-500">
          商品登録時の文字化け・エラー原因になりやすい文字を事前に検出します。
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

      <ToolSection step="2" title="判定結果">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-4 py-1 text-sm font-bold ${statusStyle}`}>
            {overallStatus}
          </span>
          <div className="flex gap-2">
            <StatTile label="ERROR" value={`${errorCount}件`} />
            <StatTile label="WARNING" value={`${warningCount}件`} />
          </div>
        </div>

        <HighlightedText text={text} issues={issues} />

        {issues.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-zinc-600">
            {issues.slice(0, 30).map((issue, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    issue.level === "error" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {issue.level === "error" ? "ERROR" : "WARN"}
                </span>
                <span className="font-mono">「{issue.char}」</span>
                <span>{issue.reason}</span>
                {issue.suggestion && <span className="text-zinc-400">→ 候補: {issue.suggestion}</span>}
              </li>
            ))}
            {issues.length > 30 && <li className="text-zinc-400">他 {issues.length - 30} 件</li>}
          </ul>
        )}

        {detectedAdditional.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {detectedAdditional.map((c) => (
              <span key={c.id} className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                ⚠ {c.label}が含まれています
              </span>
            ))}
          </div>
        )}

        {issues.length === 0 && detectedAdditional.length === 0 && text && (
          <p className="text-sm text-green-700">問題のある文字は見つかりませんでした。</p>
        )}
      </ToolSection>

      <ToolSection step="3" title="修正・出力">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setText(fixedText)}
            disabled={fixedText === text}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            候補で置換して反映
          </button>
          <CopyButton getText={() => fixedText} label="修正版コピー" disabled={!text} />
        </div>
      </ToolSection>
    </main>
  );
}

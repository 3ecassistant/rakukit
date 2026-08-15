import { ReactNode } from "react";
import { TextCharIssue } from "@/lib/forbiddenCharRules";

interface HighlightedTextProps {
  text: string;
  issues: TextCharIssue[];
}

export default function HighlightedText({ text, issues }: HighlightedTextProps) {
  if (!text) {
    return <p className="text-sm text-zinc-400">ここに入力内容のハイライトが表示されます。</p>;
  }

  const issueByIndex = new Map(issues.map((issue) => [issue.index, issue]));
  const chars = Array.from(text);
  const nodes: ReactNode[] = [];
  let offset = 0;

  chars.forEach((char, i) => {
    const issue = issueByIndex.get(offset);
    if (issue) {
      nodes.push(
        <mark
          key={i}
          title={`${issue.reason}${issue.suggestion ? ` （候補: ${issue.suggestion}）` : ""}`}
          className={
            issue.level === "error"
              ? "rounded bg-red-200 text-red-900"
              : "rounded bg-yellow-200 text-yellow-900"
          }
        >
          {char}
        </mark>
      );
    } else {
      nodes.push(char);
    }
    offset += char.length;
  });

  return (
    <div className="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-800">
      {nodes}
    </div>
  );
}

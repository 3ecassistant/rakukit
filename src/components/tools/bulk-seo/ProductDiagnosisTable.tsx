"use client";

import { Fragment, useState } from "react";
import { ProductDiagnosis, ProductSeoStatus, SEO_STATUS_LABELS } from "@/lib/bulkSeoCheck";

export interface DiagnosedRow {
  diagnosis: ProductDiagnosis;
  status: ProductSeoStatus;
}

interface ProductDiagnosisTableProps {
  rows: DiagnosedRow[];
  selected: Set<string>;
  onToggleSelect: (productKey: string) => void;
}

function fmtPct(v: number | null): string {
  return v === null ? "-" : `${v.toFixed(1)}%`;
}

const STATUS_STYLES: Record<ProductSeoStatus, string> = {
  priority: "bg-red-100 text-red-700",
  review: "bg-yellow-100 text-yellow-700",
  good: "bg-green-100 text-green-700",
  undiagnosed: "bg-zinc-100 text-zinc-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  mid: "bg-yellow-50 text-yellow-700",
  low: "bg-zinc-100 text-zinc-500",
};

export default function ProductDiagnosisTable({ rows, selected, onToggleSelect }: ProductDiagnosisTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">該当する商品はありません。</p>;
  }

  return (
    <div className="max-h-[32rem] overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-max border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-zinc-100">
          <tr>
            <th className="px-3 py-2" />
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">商品コード</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">商品名</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">起点KW</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">カバー率</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">1階層カバー率</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">NEW未使用</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">優先KW</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">文字数</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">判定</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ diagnosis: d, status }, rowIndex) => {
            const rowKey = `${d.productKey}-${rowIndex}`;
            return (
            <Fragment key={rowKey}>
              <tr
                className="cursor-pointer odd:bg-white even:bg-zinc-50 hover:bg-red-50/40"
                onClick={() => setExpandedKey((prev) => (prev === rowKey ? null : rowKey))}
              >
                <td className="border-b border-zinc-100 px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(d.productKey)} onChange={() => onToggleSelect(d.productKey)} />
                </td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">
                  {d.productKey}
                  {d.isDuplicateKey && <span className="ml-1 text-[10px] text-red-500">重複</span>}
                </td>
                <td
                  className="max-w-[10rem] truncate border-b border-zinc-100 px-3 py-1.5 text-zinc-700"
                  title={d.productName}
                >
                  {d.productName}
                </td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{d.rootKeyword || "-"}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtPct(d.coverageRate)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtPct(d.level1CoverageRate)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{d.newUnusedCount}</td>
                <td className="max-w-[12rem] truncate border-b border-zinc-100 px-3 py-1.5 text-zinc-500">
                  {d.priorityKeywords.length === 0
                    ? "-"
                    : d.priorityKeywords
                        .slice(0, 3)
                        .map((p) => p.keyword)
                        .join(" / ") + (d.priorityKeywords.length > 3 ? ` +${d.priorityKeywords.length - 3}件` : "")}
                </td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{d.nameLength}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[status]}`}>
                    {SEO_STATUS_LABELS[status]}
                  </span>
                </td>
              </tr>
              {expandedKey === rowKey && (
                <tr>
                  <td colSpan={10} className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                    {d.status !== "diagnosed" ? (
                      <p className="text-xs text-zinc-500">
                        {d.status === "no-key" && "商品コードが空欄です。"}
                        {d.status === "no-name" && "商品名が空欄です。"}
                        {d.status === "no-root" && "起点キーワードが設定されていません。"}
                        {d.status === "no-snapshot" && `起点キーワード「${d.rootKeyword}」の正常取得済みサジェストデータが見つかりません。`}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-600">
                          対象{d.totalKeywords}件・使用済み{d.usedCount}件・一部使用{d.partialCount}件・未使用
                          {d.unusedCount}件
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {d.priorityKeywords.slice(0, 30).map((p, i) => (
                            <li
                              key={i}
                              title={p.additionalWords.join(" ")}
                              className={`rounded px-1.5 py-0.5 text-[11px] ${PRIORITY_STYLES[p.priority]}`}
                            >
                              {p.keyword}
                              {p.isNew && <span className="ml-1 font-bold">NEW</span>}
                            </li>
                          ))}
                          {d.priorityKeywords.length > 30 && (
                            <li className="text-[11px] text-zinc-400">他 {d.priorityKeywords.length - 30} 件</li>
                          )}
                        </ul>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

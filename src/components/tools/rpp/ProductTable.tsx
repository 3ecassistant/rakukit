"use client";

import { Fragment, useState } from "react";
import { ACTION_POINTS, EvaluationResult, ProductKpi, STATUS_LABELS } from "@/lib/rppAnalysis";

export interface EvaluatedProduct {
  kpi: ProductKpi;
  evaluation: EvaluationResult;
}

interface ProductTableProps {
  items: EvaluatedProduct[];
  selected: Set<string>;
  onToggleSelect: (productKey: string) => void;
}

function fmtYen(v: number | null): string {
  return v === null ? "-" : `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  return v === null ? "-" : `${v.toFixed(2)}%`;
}
function fmtNum(v: number): string {
  return v.toLocaleString();
}

const STATUS_STYLES: Record<string, string> = {
  "stop-candidate": "bg-red-100 text-red-700",
  "page-improvement": "bg-yellow-100 text-yellow-700",
  "cpc-review": "bg-orange-100 text-orange-700",
  "expand-candidate": "bg-green-100 text-green-700",
  good: "bg-green-50 text-green-700",
  continue: "bg-zinc-100 text-zinc-500",
  "insufficient-data": "bg-zinc-100 text-zinc-400",
};

export default function ProductTable({ items, selected, onToggleSelect }: ProductTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (items.length === 0) {
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
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">判定</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">表示回数</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">クリック</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">CPC</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">CTR</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">広告費</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">売上</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">注文</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">CVR</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">ROAS</th>
            <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-600">CPA</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ kpi, evaluation }) => (
            <Fragment key={kpi.productKey}>
              <tr
                className="cursor-pointer odd:bg-white even:bg-zinc-50 hover:bg-red-50/40"
                onClick={() => setExpandedKey((prev) => (prev === kpi.productKey ? null : kpi.productKey))}
              >
                <td className="border-b border-zinc-100 px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(kpi.productKey)}
                    onChange={() => onToggleSelect(kpi.productKey)}
                  />
                </td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-800">{kpi.productKey}</td>
                <td className="max-w-[12rem] truncate border-b border-zinc-100 px-3 py-1.5 text-zinc-700" title={kpi.productName}>
                  {kpi.productName}
                </td>
                <td className="border-b border-zinc-100 px-3 py-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[evaluation.status]}`}>
                    {STATUS_LABELS[evaluation.status]}
                  </span>
                </td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtNum(kpi.impressions)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtNum(kpi.clicks)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtYen(kpi.cpc)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtPct(kpi.ctr)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtYen(kpi.adCost)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtYen(kpi.sales)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtNum(kpi.orders)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtPct(kpi.cvr)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtPct(kpi.roas)}</td>
                <td className="border-b border-zinc-100 px-3 py-1.5 text-zinc-500">{fmtYen(kpi.cpa)}</td>
              </tr>
              {expandedKey === kpi.productKey && (
                <tr>
                  <td colSpan={13} className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-700">
                      {STATUS_LABELS[evaluation.status]}
                      {evaluation.priority !== "-" && (
                        <span className="ml-2 text-[10px] text-zinc-400">優先度: {evaluation.priority}</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">{evaluation.reason}</p>
                    <ul className="mt-2 list-disc pl-5 text-xs text-zinc-500">
                      {ACTION_POINTS[evaluation.status].map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

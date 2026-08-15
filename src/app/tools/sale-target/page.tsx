"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_SALE_TARGET_INPUTS,
  SaleTargetInputs,
  computeSaleTarget,
  validateInputs,
} from "@/lib/saleTargetSimulator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtCount(v: number | null, unit: string): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}${unit}`;
}

export default function SaleTargetPage() {
  const [inputs, setInputs] = useState<SaleTargetInputs>(DEFAULT_SALE_TARGET_INPUTS);

  const update = (patch: Partial<SaleTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeSaleTarget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_SALE_TARGET_INPUTS);

  const summaryText = () =>
    [
      `通常価格: ${fmtYen(inputs.regularPrice)} → SALE価格: ${fmtYen(inputs.salePrice)}（${fmtPct(result.discountRate)}OFF）`,
      `目標売上: ${fmtYen(inputs.targetSales)} / SALE期間: ${inputs.saleDays}日`,
      `必要販売数: ${fmtCount(result.requiredQuantityForSales, "個")}（実売上 ${fmtYen(result.actualSalesAtRequiredQuantity)}）`,
      `必要日販: ${result.requiredDailyQuantity.toFixed(1)}個/日 / 必要日商: ${fmtYen(result.requiredDailySales)}`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">SALE目標売上・必要販売数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          通常価格・SALE価格・目標売上・SALE期間を入力するだけで、「SALE価格にした場合、目標売上達成には何個売る必要があるか」を即座に算出します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="SALE条件">
            <NumberField
              label="通常価格"
              value={inputs.regularPrice}
              onChange={(v) => update({ regularPrice: v })}
              prefix="¥"
              error={issueMap.get("regularPrice")}
            />
            <NumberField
              label="SALE価格"
              value={inputs.salePrice}
              onChange={(v) => update({ salePrice: v })}
              prefix="¥"
              error={issueMap.get("salePrice")}
            />
            <NumberField
              label="目標売上"
              value={inputs.targetSales}
              onChange={(v) => update({ targetSales: v })}
              prefix="¥"
              error={issueMap.get("targetSales")}
            />
            <NumberField
              label="SALE期間"
              value={inputs.saleDays}
              onChange={(v) => update({ saleDays: v })}
              suffix="日"
              error={issueMap.get("saleDays")}
            />
          </ToolSection>

          <button
            type="button"
            onClick={handleReset}
            className="self-start rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:border-red-400"
          >
            入力をリセット
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {hasBlockingIssue ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">入力内容をご確認ください</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                {issues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">
                  {fmtYen(inputs.salePrice)}で売上{fmtYen(inputs.targetSales)}達成には
                </p>
                <p className="text-3xl font-bold text-zinc-900">{fmtCount(result.requiredQuantityForSales, "個")}必要</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {inputs.saleDays}日間なら {result.requiredDailyQuantity.toFixed(1)}個/日
                </p>
              </div>

              <ToolSection step="2" title="値下げ・実績">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="値下げ額" value={fmtYen(result.discountAmount)} />
                  <StatTile label="値下げ率" value={fmtPct(result.discountRate)} />
                  <StatTile label="実際の到達売上" value={fmtYen(result.actualSalesAtRequiredQuantity)} />
                  <StatTile label="必要日商" value={fmtYen(result.requiredDailySales)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールはSALEによる販売数増加を予測するものではありません。目標売上を達成するために必要な販売数を算出するだけです。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

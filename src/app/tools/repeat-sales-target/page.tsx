"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_REPEAT_SALES_TARGET_INPUTS,
  RepeatSalesTargetInputs,
  computeRepeatSalesTarget,
  validateInputs,
} from "@/lib/repeatSalesTargetCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtCount(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}件`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

export default function RepeatSalesTargetPage() {
  const [inputs, setInputs] = useState<RepeatSalesTargetInputs>(DEFAULT_REPEAT_SALES_TARGET_INPUTS);

  const update = (patch: Partial<RepeatSalesTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeRepeatSalesTarget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_REPEAT_SALES_TARGET_INPUTS);

  const summaryText = () =>
    [
      `リピート売上目標: ${fmtYen(inputs.targetRepeatSales)} / 現在: ${fmtYen(inputs.currentRepeatSales)} / 平均再購入単価: ${fmtYen(inputs.repeatPurchaseAov)}`,
      `不足売上: ${fmtYen(result.repeatSalesGap)} / 必要追加再購入: ${fmtCount(result.additionalRepeatOrdersNeeded)}`,
      `売上進捗率: ${fmtPct(result.repeatSalesProgressRate)}`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">リピート売上目標・必要再購入件数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          リピート売上目標・現在リピート売上・平均再購入単価を入力するだけで、「リピート売上目標まで、あと何件の再購入が必要か」を逆算します。リピーター人数と再購入件数は別概念です——1人が複数回再購入する可能性があります。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="リピート売上">
            <NumberField
              label="リピート売上目標"
              value={inputs.targetRepeatSales}
              onChange={(v) => update({ targetRepeatSales: v })}
              prefix="¥"
              error={issueMap.get("targetRepeatSales")}
            />
            <NumberField
              label="現在リピート売上"
              value={inputs.currentRepeatSales}
              onChange={(v) => update({ currentRepeatSales: v })}
              prefix="¥"
              error={issueMap.get("currentRepeatSales")}
            />
            <NumberField
              label="平均再購入単価"
              value={inputs.repeatPurchaseAov}
              onChange={(v) => update({ repeatPurchaseAov: v })}
              prefix="¥"
              error={issueMap.get("repeatPurchaseAov")}
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
                {result.additionalRepeatOrdersNeeded === 0 ? (
                  <>
                    <p className="text-lg font-semibold text-green-700">
                      {result.repeatSalesSurplus > 0
                        ? `現在リピート売上は目標を${fmtYen(result.repeatSalesSurplus)}上回っています。`
                        : "現在リピート売上が設定目標と同額です。"}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-zinc-900">再購入 あと0件</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">
                      リピート売上{fmtYen(inputs.targetRepeatSales)}まで
                    </p>
                    <p className="text-4xl font-bold text-zinc-900">
                      あと{fmtCount(result.additionalRepeatOrdersNeeded)}の再購入が必要
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      不足{fmtYen(result.repeatSalesGap)}を、平均再購入単価{fmtYen(inputs.repeatPurchaseAov)}で割った必要件数
                    </p>
                  </>
                )}
              </div>

              <ToolSection step="2" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="不足売上" value={fmtYen(result.repeatSalesGap)} />
                  <StatTile label="売上進捗率" value={fmtPct(result.repeatSalesProgressRate)} />
                  <StatTile label="目標総再購入件数" value={fmtCount(result.requiredTotalRepeatOrders)} />
                  <StatTile label="必要件数での売上超過分" value={fmtYen(result.repeatSalesAboveTarget)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは再購文件数や売上を予測するものではありません。設定した平均再購入単価を前提として、目標売上に必要な再注文件数を算術的に逆算します。目標売上・現在売上は同じ対象期間の数値を入力してください。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

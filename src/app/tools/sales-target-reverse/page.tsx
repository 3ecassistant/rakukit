"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_SALES_TARGET_INPUTS,
  SalesTargetInputs,
  computeSalesTarget,
  validateInputs,
} from "@/lib/salesTargetReverseCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtCount(v: number | null, unit: string): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}${unit}`;
}

export default function SalesTargetReversePage() {
  const [inputs, setInputs] = useState<SalesTargetInputs>(DEFAULT_SALES_TARGET_INPUTS);

  const update = (patch: Partial<SalesTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeSalesTarget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_SALES_TARGET_INPUTS);

  const summaryText = () =>
    [
      `売上目標: ${fmtYen(inputs.targetSales)} / 平均注文単価: ${fmtYen(inputs.averageOrderValue)} / 想定CVR: ${inputs.targetCvr}%`,
      `必要注文数: ${fmtCount(result.requiredOrders, "件")}`,
      result.requiredTraffic !== null ? `必要アクセス数: ${fmtCount(result.requiredTraffic, "")}` : "必要アクセス数: 算出不可（CVR0%）",
      `期間: ${inputs.periodDays}日 / 必要日商: ${fmtYen(result.requiredDailySales)} / 必要日次注文: ${result.requiredDailyOrders.toFixed(1)}件`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">売上目標逆算シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          売上目標・平均注文単価・想定CVRを入力するだけで、「売上目標達成には何アクセス・何注文が必要か」を即座に算出します。売上 = アクセス数 × CVR × 客単価という基本式で目標を実行KPIへ分解します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="売上目標">
            <NumberField
              label="売上目標"
              value={inputs.targetSales}
              onChange={(v) => update({ targetSales: v })}
              prefix="¥"
              error={issueMap.get("targetSales")}
            />
            <NumberField
              label="平均注文単価"
              value={inputs.averageOrderValue}
              onChange={(v) => update({ averageOrderValue: v })}
              prefix="¥"
              error={issueMap.get("averageOrderValue")}
            />
            <NumberField
              label="想定CVR"
              value={inputs.targetCvr}
              onChange={(v) => update({ targetCvr: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("targetCvr")}
            />
          </ToolSection>

          <ToolSection step="2" title="期間">
            <NumberField
              label="期間日数"
              value={inputs.periodDays}
              onChange={(v) => update({ periodDays: v })}
              suffix="日"
              error={issueMap.get("periodDays")}
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
                <p className="text-xs text-zinc-400">売上目標 {fmtYen(inputs.targetSales)} 達成には</p>
                <p className="text-3xl font-bold text-zinc-900">{fmtCount(result.requiredOrders, "件")}必要</p>
                {result.isCvrZero ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    CVRが0%のため必要アクセスを算出できません。
                  </p>
                ) : (
                  <p className="mt-1 text-lg font-semibold text-red-600">
                    CVR{inputs.targetCvr}%なら{fmtCount(result.requiredTraffic, "アクセス")}必要
                  </p>
                )}
              </div>

              <ToolSection step="3" title="日割り目標">
                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="必要日商" value={fmtYen(result.requiredDailySales)} />
                  <StatTile label="必要日次注文" value={`${result.requiredDailyOrders.toFixed(1)}件`} />
                  <StatTile
                    label="必要日次アクセス"
                    value={result.requiredDailyTraffic !== null ? `${result.requiredDailyTraffic.toFixed(1)}` : "-"}
                  />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは将来のアクセス増加やCVR改善を予測するものではありません。売上目標を達成するために必要な条件を算出するだけです。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

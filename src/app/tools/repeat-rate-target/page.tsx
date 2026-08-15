"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_REPEAT_RATE_TARGET_INPUTS,
  RepeatRateTargetInputs,
  computeRepeatRateTarget,
  validateInputs,
} from "@/lib/repeatRateTargetCalculator";

function fmtPeople(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}人`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtPt(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}pt`;
}

export default function RepeatRateTargetPage() {
  const [inputs, setInputs] = useState<RepeatRateTargetInputs>(DEFAULT_REPEAT_RATE_TARGET_INPUTS);

  const update = (patch: Partial<RepeatRateTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeRepeatRateTarget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_REPEAT_RATE_TARGET_INPUTS);

  const summaryText = () =>
    [
      `総顧客数: ${fmtPeople(inputs.totalCustomers)} / 現在リピーター: ${fmtPeople(inputs.currentRepeatCustomers)}（${fmtPct(result.currentRepeatRate)}）`,
      `目標リピート率: ${fmtPct(inputs.targetRepeatRate)}（必要 ${fmtPeople(result.requiredRepeatCustomers)}）`,
      result.additionalRepeatCustomersNeeded > 0
        ? `あと${fmtPeople(result.additionalRepeatCustomersNeeded)}必要（率差 ${fmtPt(result.repeatRateGapPt)}）`
        : "現在の顧客母数を前提にすると、目標リピート率をすでに満たしています。",
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">リピート率目標・必要リピーター数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          総顧客数・現在リピーター数・目標リピート率を入力するだけで、「目標リピート率を成立させるにはリピーターがあと何人必要か」を逆算します。実際に何人が再購入するかを予測するものではありません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="顧客構成">
            <NumberField
              label="総顧客数"
              value={inputs.totalCustomers}
              onChange={(v) => update({ totalCustomers: v })}
              suffix="人"
              error={issueMap.get("totalCustomers")}
            />
            <NumberField
              label="現在リピーター数"
              value={inputs.currentRepeatCustomers}
              onChange={(v) => update({ currentRepeatCustomers: v })}
              suffix="人"
              error={issueMap.get("currentRepeatCustomers")}
            />
          </ToolSection>

          <ToolSection step="2" title="目標">
            <NumberField
              label="目標リピート率"
              value={inputs.targetRepeatRate}
              onChange={(v) => update({ targetRepeatRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("targetRepeatRate")}
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
                  リピート率{fmtPct(inputs.targetRepeatRate)}には
                </p>
                {result.isTargetMet ? (
                  <p className="text-2xl font-bold text-green-700">
                    現在のリピート率が設定目標を{fmtPt(-result.repeatRateGapPt)}上回っています。
                  </p>
                ) : (
                  <p className="text-4xl font-bold text-zinc-900">
                    あと{fmtPeople(result.additionalRepeatCustomersNeeded)}のリピーターが必要
                  </p>
                )}
                <p className="mt-2 text-sm text-zinc-500">
                  現在{fmtPeople(inputs.currentRepeatCustomers)}（{fmtPct(result.currentRepeatRate)}） → 目標
                  {fmtPeople(result.requiredRepeatCustomers)}（{fmtPct(inputs.targetRepeatRate)}）
                </p>
              </div>

              <ToolSection step="3" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="非リピーター数" value={fmtPeople(result.nonRepeatCustomers)} />
                  <StatTile label="リピート率差" value={fmtPt(result.repeatRateGapPt)} />
                  <StatTile
                    label="非リピーターからの必要転換率"
                    value={result.requiredConversionFromNonRepeatRate !== null ? fmtPct(result.requiredConversionFromNonRepeatRate) : "-"}
                  />
                  <StatTile label="人数単位での達成率" value={fmtPct(result.achievedRepeatRateAtRequiredCount)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本計算は、総顧客数{fmtPeople(inputs.totalCustomers)}が変わらない場合の必要人数です。実際に何人が再購入するかを予測するものではありません。総顧客数とリピーター数は同一期間・同一定義の数値を入力してください。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_FIXED_COST_BREAK_EVEN_INPUTS,
  FixedCostBreakEvenInputs,
  computeFixedCostBreakEven,
  validateInputs,
} from "@/lib/fixedCostBreakEvenCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtCount(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}個`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

export default function FixedCostBreakEvenPage() {
  const [inputs, setInputs] = useState<FixedCostBreakEvenInputs>(DEFAULT_FIXED_COST_BREAK_EVEN_INPUTS);

  const update = (patch: Partial<FixedCostBreakEvenInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeFixedCostBreakEven(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_FIXED_COST_BREAK_EVEN_INPUTS);

  const summaryText = () =>
    [
      `固定費: ${fmtYen(inputs.fixedCost)} / 1個あたり限界利益: ${fmtYen(inputs.contributionMarginPerUnit)}`,
      `固定費回収に必要な販売数: ${fmtCount(result.requiredQuantity)}`,
      inputs.hasCurrentQuantity
        ? `現在${fmtCount(inputs.currentQuantity)} → あと${fmtCount(result.additionalQuantityNeeded)}（回収率 ${fmtPct(result.recoveryRate)}）`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">固定費回収・必要販売数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          固定費と1個あたり限界利益（販売価格から商品原価・送料などの変動費を差し引いた金額）を入力するだけで、「固定費を回収するには何個売る必要があるか」を逆算します。商品原価などの変動費は固定費に含めず、1個あたり限界利益側で反映してください。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="固定費・限界利益">
            <NumberField
              label="固定費"
              value={inputs.fixedCost}
              onChange={(v) => update({ fixedCost: v })}
              prefix="¥"
              error={issueMap.get("fixedCost")}
            />
            <NumberField
              label="1個売ったときに固定費回収へ使える利益"
              value={inputs.contributionMarginPerUnit}
              onChange={(v) => update({ contributionMarginPerUnit: v })}
              prefix="¥"
              error={issueMap.get("contributionMarginPerUnit")}
            />
          </ToolSection>

          <ToolSection step="2" title="現在販売数（任意）">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={inputs.hasCurrentQuantity}
                onChange={(e) => update({ hasCurrentQuantity: e.target.checked })}
              />
              現在販売数を入力する
            </label>
            {inputs.hasCurrentQuantity && (
              <NumberField
                label="現在販売数"
                value={inputs.currentQuantity}
                onChange={(v) => update({ currentQuantity: v })}
                suffix="個"
                error={issueMap.get("currentQuantity")}
              />
            )}
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
          ) : !result.isReachable ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                {inputs.contributionMarginPerUnit === 0
                  ? "1個あたり限界利益が0円のため、販売数を増やしても固定費を回収できません。"
                  : "1個販売するごとに設定利益が減少するため、販売数量増加では固定費を回収できません。"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                {inputs.hasCurrentQuantity && result.isBreakEvenReached ? (
                  <>
                    <p className="text-lg font-semibold text-green-700">
                      現在販売数が固定費回収ラインに到達しています。
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      設定条件上の超過利益: {fmtYen(result.profitAfterFixedCost)}
                    </p>
                  </>
                ) : inputs.hasCurrentQuantity ? (
                  <>
                    <p className="text-xs text-zinc-400">固定費回収まで</p>
                    <p className="text-4xl font-bold text-zinc-900">あと{fmtCount(result.additionalQuantityNeeded)}必要</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      損益分岐販売数{fmtCount(result.requiredQuantity)} / 現在{fmtCount(inputs.currentQuantity)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">固定費{fmtYen(inputs.fixedCost)}を回収するには</p>
                    <p className="text-4xl font-bold text-zinc-900">{fmtCount(result.requiredQuantity)}必要</p>
                    <p className="mt-1 text-sm text-zinc-500">損益分岐販売数（固定費回収に必要な販売数）</p>
                  </>
                )}
              </div>

              <ToolSection step="3" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="損益分岐販売数" value={fmtCount(result.requiredQuantity)} />
                  <StatTile label="必要数量での回収超過分" value={fmtYen(result.breakEvenSurplus)} />
                  {inputs.hasCurrentQuantity && (
                    <>
                      <StatTile label="現在回収額" value={fmtYen(result.recoveredAmount)} />
                      <StatTile label="残り固定費" value={fmtYen(result.remainingFixedCost)} />
                      <StatTile label="固定費回収進捗" value={fmtPct(result.recoveryRate)} />
                    </>
                  )}
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは販売数を予測するものではありません。入力した固定費と1個あたり限界利益を前提として、固定費回収に必要な販売数を算術的に逆算します。商品原価・配送費・販売関連費などの変動費は「1個あたり限界利益」側に含め、固定費と二重計上しないようご注意ください。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

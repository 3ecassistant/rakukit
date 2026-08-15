"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_PROFIT_TARGET_INPUTS,
  ProfitTargetInputs,
  ProfitTargetMode,
  computeProfitTarget,
  validateInputs,
} from "@/lib/profitTargetCalculator";

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

export default function ProfitTargetPage() {
  const [inputs, setInputs] = useState<ProfitTargetInputs>(DEFAULT_PROFIT_TARGET_INPUTS);

  const update = (patch: Partial<ProfitTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeProfitTarget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_PROFIT_TARGET_INPUTS);

  const summaryText = () =>
    inputs.mode === "margin"
      ? [
          `利益目標: ${fmtYen(inputs.targetProfit)} / 利益率: ${fmtPct(inputs.profitMarginRate)}`,
          `必要売上: ${fmtYen(result.requiredSales)}`,
          inputs.hasCurrentProfit ? `現在利益: ${fmtYen(inputs.currentProfit)} / 追加必要売上: ${fmtYen(result.additionalSalesNeeded)}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `利益目標: ${fmtYen(inputs.targetProfit)} / 1個利益: ${fmtYen(inputs.unitProfit)}`,
          `必要販売数: ${fmtCount(result.requiredQuantity)}`,
          inputs.hasCurrentProfit ? `現在利益: ${fmtYen(inputs.currentProfit)} / 追加必要販売数: ${fmtCount(result.additionalQuantityNeeded)}` : "",
        ]
          .filter(Boolean)
          .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">月間利益目標・必要売上／販売数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          利益目標から、必要な売上額または必要な販売数を逆算します。本ツールは売上・販売数を予測するものではありません。設定した利益条件を成立させるために必要な条件のみを算術的に逆算します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="モード">
            <div className="flex gap-2">
              {(["margin", "unit-profit"] as ProfitTargetMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update({ mode })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    inputs.mode === mode
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-red-400"
                  }`}
                >
                  {mode === "margin" ? "必要売上を知りたい" : "必要販売数を知りたい"}
                </button>
              ))}
            </div>
          </ToolSection>

          <ToolSection step="2" title="利益条件">
            <NumberField
              label="利益目標"
              value={inputs.targetProfit}
              onChange={(v) => update({ targetProfit: v })}
              prefix="¥"
              error={issueMap.get("targetProfit")}
            />
            {inputs.mode === "margin" ? (
              <NumberField
                label="利益率"
                value={inputs.profitMarginRate}
                onChange={(v) => update({ profitMarginRate: v })}
                suffix="%"
                step={0.1}
                error={issueMap.get("profitMarginRate")}
              />
            ) : (
              <NumberField
                label="1個あたり利益"
                value={inputs.unitProfit}
                onChange={(v) => update({ unitProfit: v })}
                prefix="¥"
                error={issueMap.get("unitProfit")}
              />
            )}
          </ToolSection>

          <ToolSection step="3" title="現在利益（任意）">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={inputs.hasCurrentProfit}
                onChange={(e) => update({ hasCurrentProfit: e.target.checked })}
              />
              現在利益を入力する（赤字の場合はマイナス値でも入力可）
            </label>
            {inputs.hasCurrentProfit && (
              <NumberField
                label="現在利益"
                value={inputs.currentProfit}
                onChange={(v) => update({ currentProfit: v })}
                prefix="¥"
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
                {inputs.mode === "margin"
                  ? "利益率が0%以下のため、売上増加による利益目標の逆算はできません。"
                  : "1個あたり利益が0円以下のため、販売数を増やす方法では利益目標へ到達できません。"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                {inputs.hasCurrentProfit && result.isTargetAlreadyMet ? (
                  <>
                    <p className="text-lg font-semibold text-green-700">
                      {result.profitSurplus > 0
                        ? `現在利益は設定目標を${fmtYen(result.profitSurplus)}上回っています。`
                        : "現在利益が設定目標と同額です。"}
                    </p>
                  </>
                ) : inputs.mode === "margin" ? (
                  <>
                    <p className="text-xs text-zinc-400">利益{fmtYen(inputs.targetProfit)}を確保するには</p>
                    <p className="text-4xl font-bold text-zinc-900">
                      {inputs.hasCurrentProfit ? "追加売上" : "売上"}
                      {fmtYen(inputs.hasCurrentProfit ? result.additionalSalesNeeded : result.requiredSales)}必要
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">利益率{fmtPct(inputs.profitMarginRate)}を前提とした必要売上</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">利益{fmtYen(inputs.targetProfit)}を確保するには</p>
                    <p className="text-4xl font-bold text-zinc-900">
                      {inputs.hasCurrentProfit ? "追加" : ""}
                      {fmtCount(inputs.hasCurrentProfit ? result.additionalQuantityNeeded : result.requiredQuantity)}必要
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">1個利益{fmtYen(inputs.unitProfit)}を前提とした必要販売数</p>
                  </>
                )}
              </div>

              <ToolSection step="4" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  {inputs.hasCurrentProfit && (
                    <>
                      <StatTile label="残り必要利益" value={fmtYen(result.remainingProfit)} />
                      <StatTile label="利益進捗率" value={fmtPct(result.profitProgressRate)} />
                    </>
                  )}
                  {inputs.mode === "margin" ? (
                    <StatTile label="必要売上（目標全額ベース）" value={fmtYen(result.requiredSales)} />
                  ) : (
                    <>
                      <StatTile label="必要販売数（目標全額ベース）" value={fmtCount(result.requiredQuantity)} />
                      <StatTile label="必要人数での利益超過分" value={fmtYen(result.profitAboveTarget)} />
                    </>
                  )}
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                現在利益がマイナス（赤字）の場合もそのまま計算します。「売上◯円達成できます」ではなく、設定条件を成立させるために必要な条件を示すだけです。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_INVENTORY_CLEARANCE_INPUTS,
  InventoryClearanceInputs,
  computeInventoryClearance,
  validateInputs,
} from "@/lib/inventoryClearanceSimulator";

function fmtNum(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return v.toFixed(digits);
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export default function InventoryClearancePage() {
  const [inputs, setInputs] = useState<InventoryClearanceInputs>(DEFAULT_INVENTORY_CLEARANCE_INPUTS);

  const update = (patch: Partial<InventoryClearanceInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeInventoryClearance(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_INVENTORY_CLEARANCE_INPUTS);

  const summaryText = () =>
    [
      `現在在庫: ${inputs.currentInventory}個 / 消化目標: ${inputs.targetClearanceDays}日 / 現在日販: ${inputs.currentDailySales}個/日`,
      `必要日販: ${fmtNum(result.requiredDailySales)}個/日`,
      result.additionalDailySales !== null
        ? `現在比: ${result.additionalDailySales >= 0 ? "+" : ""}${fmtNum(result.additionalDailySales)}個/日（${fmtPct(result.requiredSalesGrowthRate)} / ${fmtNum(result.requiredSalesMultiplier, 2)}倍）`
        : "",
      result.daysToClearAtCurrentPace !== null
        ? `現在ペースなら完売まで${fmtNum(result.daysToClearAtCurrentPace)}日 / 目標日時点の残在庫: ${fmtNum(result.remainingInventoryAtTargetDate, 0)}個`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">在庫消化に必要な販売数・価格シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在在庫数・消化目標日数・現在販売ペースを入力するだけで、「在庫を期限内に消化するには1日何個必要か」を即座に算出します。値下げすれば何個売れるかは予測しません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="在庫条件">
            <NumberField
              label="現在在庫数"
              value={inputs.currentInventory}
              onChange={(v) => update({ currentInventory: v })}
              suffix="個"
              error={issueMap.get("currentInventory")}
            />
            <NumberField
              label="消化目標日数"
              value={inputs.targetClearanceDays}
              onChange={(v) => update({ targetClearanceDays: v })}
              suffix="日"
              error={issueMap.get("targetClearanceDays")}
            />
            <NumberField
              label="現在販売ペース"
              value={inputs.currentDailySales}
              onChange={(v) => update({ currentDailySales: v })}
              suffix="個/日"
              error={issueMap.get("currentDailySales")}
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
                  {inputs.currentInventory}個を{inputs.targetClearanceDays}日で完売するには
                </p>
                <p className="text-3xl font-bold text-zinc-900">{fmtNum(result.requiredDailySales)}個/日必要</p>
                {result.isCurrentDailySalesZero ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    現在販売数が0のため増加率は算出できません。
                  </p>
                ) : (
                  <p className="mt-1 text-lg font-semibold text-red-600">
                    現在{inputs.currentDailySales}個/日 → あと{result.additionalDailySales! >= 0 ? "+" : ""}
                    {fmtNum(result.additionalDailySales)}個/日（{fmtPct(result.requiredSalesGrowthRate)} / 現在の
                    {fmtNum(result.requiredSalesMultiplier, 2)}倍）
                  </p>
                )}
              </div>

              {!result.isCurrentDailySalesZero && (
                <ToolSection step="2" title="現在ペースのまま推移した場合">
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="現在ペースでの完売日数" value={`${fmtNum(result.daysToClearAtCurrentPace)}日`} />
                    <StatTile label="目標日時点の残在庫" value={`${fmtNum(result.remainingInventoryAtTargetDate, 0)}個`} />
                  </div>
                </ToolSection>
              )}

              <p className="text-xs text-zinc-400">
                本ツールは値下げによって販売数が実際に何個増えるかを予測するものではありません。在庫消化目標を必要日販へ変換するだけです。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_INVENTORY_MARKDOWN_INPUTS,
  InventoryMarkdownInputs,
  ProfitConditionMode,
  computeInventoryMarkdownLimit,
  validateInputs,
} from "@/lib/inventoryMarkdownLimitCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

export default function InventoryMarkdownLimitPage() {
  const [inputs, setInputs] = useState<InventoryMarkdownInputs>(DEFAULT_INVENTORY_MARKDOWN_INPUTS);

  const update = (patch: Partial<InventoryMarkdownInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeInventoryMarkdownLimit(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_INVENTORY_MARKDOWN_INPUTS);

  const summaryText = () =>
    [
      `現在在庫: ${inputs.currentInventory}個 / 現在価格: ${fmtYen(inputs.currentPrice)}`,
      `現在完売総利益: ${fmtYen(result.currentTotalProfit)} / 最低確保総利益: ${fmtYen(result.minimumRequiredTotalProfit)}`,
      result.minimumSellingPrice !== null
        ? `利益条件上の最低販売価格: ${fmtYen(result.minimumSellingPrice)}（最大値下げ ${fmtYen(result.maximumDiscountAmount)} / ${fmtPct(result.maximumDiscountRate)}OFF）`
        : "現在価格のままでも指定総利益を満たせません。",
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">在庫消化値下げ上限・利益許容額シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          在庫数・現在価格・原価・許容できる利益減少額を入力するだけで、「利益条件上どこまで値下げできるか」を逆算します。値下げすれば何個売れるかは予測しません。この価格は「推奨価格」ではなく、設定した利益条件を満たせる最低販売価格です。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="在庫・商品条件">
            <NumberField
              label="現在在庫数"
              value={inputs.currentInventory}
              onChange={(v) => update({ currentInventory: v })}
              suffix="個"
              error={issueMap.get("currentInventory")}
            />
            <NumberField
              label="現在販売価格"
              value={inputs.currentPrice}
              onChange={(v) => update({ currentPrice: v })}
              prefix="¥"
              error={issueMap.get("currentPrice")}
            />
            <NumberField
              label="商品原価"
              value={inputs.cost}
              onChange={(v) => update({ cost: v })}
              prefix="¥"
              error={issueMap.get("cost")}
            />
            <NumberField
              label="送料"
              value={inputs.shipping}
              onChange={(v) => update({ shipping: v })}
              prefix="¥"
              error={issueMap.get("shipping")}
            />
            <NumberField
              label="販売関連費率"
              value={inputs.marketplaceCostRate}
              onChange={(v) => update({ marketplaceCostRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("marketplaceCostRate")}
            />
          </ToolSection>

          <ToolSection step="2" title="利益許容条件">
            <div className="flex gap-2">
              {(["allowable-loss", "minimum-total"] as ProfitConditionMode[]).map((mode) => (
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
                  {mode === "allowable-loss" ? "許容利益減少額で設定" : "最低確保総利益で設定"}
                </button>
              ))}
            </div>
            {inputs.mode === "allowable-loss" ? (
              <NumberField
                label="許容総利益減少額"
                value={inputs.allowableTotalProfitLoss}
                onChange={(v) => update({ allowableTotalProfitLoss: v })}
                prefix="¥"
                error={issueMap.get("allowableTotalProfitLoss")}
              />
            ) : (
              <NumberField
                label="最低確保総利益"
                value={inputs.minimumTotalProfit}
                onChange={(v) => update({ minimumTotalProfit: v })}
                prefix="¥"
                error={issueMap.get("minimumTotalProfit")}
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
          ) : result.isConditionImpossibleAtCurrentPrice ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                現在価格のままでも指定した総利益を満たせません。
              </p>
              <p className="mt-1 text-xs text-red-600">
                現在完売総利益: {fmtYen(result.currentTotalProfit)} / 最低確保総利益: {fmtYen(result.minimumRequiredTotalProfit)}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">利益条件上</p>
                <p className="text-3xl font-bold text-zinc-900">最大{fmtPct(result.maximumDiscountRate)}OFFまで</p>
                <p className="mt-1 text-sm text-zinc-500">
                  現在{fmtYen(inputs.currentPrice)} → 最低{fmtYen(result.minimumSellingPrice)}（値下げ{" "}
                  {fmtYen(result.maximumDiscountAmount)}）
                </p>
              </div>

              <ToolSection step="3" title="利益の内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在1個利益" value={fmtYen(result.currentUnitProfit)} />
                  <StatTile label="現在完売総利益" value={fmtYen(result.currentTotalProfit)} />
                  <StatTile label="最低確保総利益" value={fmtYen(result.minimumRequiredTotalProfit)} />
                  <StatTile label="1個あたり許容利益減" value={fmtYen(result.allowableProfitLossPerUnit)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                この最低販売価格は「在庫を売り切れる価格」でも「最適価格」でもありません。設定した利益条件を満たせる最低販売価格です。1円単位運用のため理論値は切り上げて表示しています。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

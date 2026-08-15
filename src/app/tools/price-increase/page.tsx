"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_PRICE_INCREASE_INPUTS,
  MarginLevel,
  PriceIncreaseInputs,
  computePriceIncreaseResult,
  validateInputs,
} from "@/lib/priceIncreaseVolumeSimulator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}
function fmtCount(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}個`;
}

const MARGIN_STYLES: Record<MarginLevel, { label: string; style: string }> = {
  small: { label: "余力 小", style: "bg-red-100 text-red-700" },
  medium: { label: "余力 中", style: "bg-yellow-100 text-yellow-700" },
  large: { label: "余力 大", style: "bg-green-100 text-green-700" },
  "very-large": { label: "余力 非常に大", style: "bg-green-100 text-green-700" },
};

export default function PriceIncreasePage() {
  const [inputs, setInputs] = useState<PriceIncreaseInputs>(DEFAULT_PRICE_INCREASE_INPUTS);

  const update = (patch: Partial<PriceIncreaseInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const isNotAnIncrease = inputs.increasedPrice <= inputs.currentPrice && inputs.currentPrice > 0;
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computePriceIncreaseResult(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_PRICE_INCREASE_INPUTS);

  const summaryText = () =>
    [
      `現在価格: ${fmtYen(inputs.currentPrice)} → 値上げ後価格: ${fmtYen(inputs.increasedPrice)}（${fmtPct(result.priceIncreaseRate)}）`,
      `現在販売数: ${fmtCount(inputs.currentQuantity)} / 商品原価: ${fmtYen(inputs.cost)}`,
      `現在総利益: ${fmtYen(result.currentTotalProfit)}`,
      `値上げ後1個利益: ${fmtYen(result.increasedUnitProfit)}`,
      result.requiredQuantityForProfit !== null
        ? `利益維持最低販売数: ${fmtCount(result.requiredQuantityForProfit)} / 許容販売減少: ${fmtCount(result.allowedQuantityDecrease)}（${fmtPct(result.allowedQuantityDecreaseRate)}）`
        : "利益維持最低販売数: 算出不可",
      `売上維持必要販売数: ${fmtCount(result.requiredQuantityForRevenue)}（許容減少 ${fmtPct(result.allowedQuantityDecreaseRateForRevenue)}）`,
      `現在販売数のまま値上げした場合の総利益: ${fmtYen(result.increasedProfitAtCurrentQuantity)}（差 ${fmtYen(result.totalProfitIncrease)} / ${fmtPct(result.totalProfitIncreaseRate)}）`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">値上げ許容販売減少率シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在価格・値上げ後価格・現在販売数・商品原価の4項目だけで、「値上げ後、販売数が何％減っても現在と同じ総利益を維持できるか」を即座に算出します。販売数の減少幅を予測するツールではなく、許容できる範囲を示すものです。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="現在の条件">
            <NumberField
              label="現在価格"
              value={inputs.currentPrice}
              onChange={(v) => update({ currentPrice: v })}
              prefix="¥"
              error={issueMap.get("currentPrice")}
            />
            <NumberField
              label="現在販売数（比較したい同一期間）"
              value={inputs.currentQuantity}
              onChange={(v) => update({ currentQuantity: v })}
              suffix="個"
              error={issueMap.get("currentQuantity")}
            />
            <NumberField
              label="商品原価"
              value={inputs.cost}
              onChange={(v) => update({ cost: v })}
              prefix="¥"
              error={issueMap.get("cost")}
            />
          </ToolSection>

          <ToolSection step="2" title="値上げ案">
            <NumberField
              label="値上げ後価格"
              value={inputs.increasedPrice}
              onChange={(v) => update({ increasedPrice: v })}
              prefix="¥"
              error={issueMap.get("increasedPrice")}
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
              {isNotAnIncrease && (
                <p className="mt-2 text-sm text-red-700">
                  値下げを検討している場合は{" "}
                  <Link href="/tools/discount-volume" className="underline hover:text-red-900">
                    値引き必要販売数シミュレーター
                  </Link>{" "}
                  をご利用ください。
                </p>
              )}
            </div>
          ) : result.isCurrentlyUnprofitable ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">現在価格の時点で1個あたり利益が0円以下です。</p>
              <p className="mt-1 text-xs text-red-600">
                現在1個利益: {fmtYen(result.currentUnitProfit)}。値上げの検討より先に、現在価格・原価を見直してください。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">この値上げなら</p>
                <p className="text-4xl font-bold text-zinc-900">
                  販売数{" "}
                  {fmtPct(result.allowedQuantityDecreaseRate !== null ? -result.allowedQuantityDecreaseRate : null)}
                  まで許容
                </p>
                <p className="mt-1 text-lg font-semibold text-green-700">現在の総利益を維持できます</p>
                {result.marginLevel && (
                  <span
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${MARGIN_STYLES[result.marginLevel].style}`}
                  >
                    {MARGIN_STYLES[result.marginLevel].label}
                  </span>
                )}
              </div>

              <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                {fmtYen(inputs.currentPrice)} → {fmtYen(inputs.increasedPrice)}
                へ値上げしても、販売数が{fmtCount(inputs.currentQuantity)}から
                {fmtCount(result.requiredQuantityForProfit)}（最大{fmtCount(result.allowedQuantityDecrease)}減）まで
                なら現在の総利益を維持できます。許容販売減少率は {fmtPct(result.allowedQuantityDecreaseRate)} です。
              </p>

              <ToolSection step="3" title="現在 vs 値上げ後">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs font-semibold text-zinc-500">現在</p>
                    <p className="mt-1 text-sm text-zinc-700">価格: {fmtYen(inputs.currentPrice)}</p>
                    <p className="text-sm text-zinc-700">販売数: {fmtCount(inputs.currentQuantity)}</p>
                    <p className="text-sm text-zinc-700">1個利益: {fmtYen(result.currentUnitProfit)}</p>
                    <p className="text-sm text-zinc-700">利益率: {fmtPct(result.currentProfitRate)}</p>
                    <p className="mt-1 font-semibold text-zinc-900">総利益: {fmtYen(result.currentTotalProfit)}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs font-semibold text-zinc-500">値上げ後</p>
                    <p className="mt-1 text-sm text-zinc-700">価格: {fmtYen(inputs.increasedPrice)}</p>
                    <p className="text-sm text-zinc-700">
                      値上げ額: {fmtYen(result.priceIncreaseAmount)}（{fmtPct(result.priceIncreaseRate)}）
                    </p>
                    <p className="text-sm text-zinc-700">1個利益: {fmtYen(result.increasedUnitProfit)}</p>
                    <p className="text-sm text-zinc-700">
                      利益率: {fmtPct(result.increasedProfitRate)}（{fmtPct(result.profitRateChange, 1)}pt）
                    </p>
                    <p className="mt-1 font-semibold text-zinc-900">
                      現在販売数のまま: {fmtYen(result.increasedProfitAtCurrentQuantity)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>現在販売数のまま値上げした場合の総利益差</span>
                  <span className="font-semibold">
                    {fmtYen(result.totalProfitIncrease)}（{fmtPct(result.totalProfitIncreaseRate)}）
                  </span>
                </div>
              </ToolSection>

              <ToolSection step="4" title="売上維持 vs 利益維持">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="売上維持でも許容できる販売数減少"
                    value={`${fmtCount(result.allowedQuantityDecreaseForRevenue)}（${fmtPct(result.allowedQuantityDecreaseRateForRevenue !== null ? -result.allowedQuantityDecreaseRateForRevenue : null)}）`}
                  />
                  <StatTile
                    label="利益維持でも許容できる販売数減少"
                    value={
                      result.allowedQuantityDecrease !== null
                        ? `${fmtCount(result.allowedQuantityDecrease)}（${fmtPct(result.allowedQuantityDecreaseRate !== null ? -result.allowedQuantityDecreaseRate : null)}）`
                        : "算出不可"
                    }
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  値上げ後は一般に、利益維持のほうが売上維持よりも大きな販売数減少を許容できます。
                </p>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは値上げ後の販売数量を予測するものではありません。現在の総利益を維持するために許容できる販売数量の減少幅を計算します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

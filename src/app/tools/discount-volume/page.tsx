"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_DISCOUNT_VOLUME_INPUTS,
  DiscountVolumeInputs,
  GrowthBurden,
  computeDiscountVolumeResult,
  validateInputs,
} from "@/lib/discountVolumeSimulator";

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

const BURDEN_STYLES: Record<GrowthBurden, { label: string; style: string }> = {
  small: { label: "増加負担 小", style: "bg-green-100 text-green-700" },
  medium: { label: "増加負担 中", style: "bg-yellow-100 text-yellow-700" },
  large: { label: "増加負担 大", style: "bg-orange-100 text-orange-700" },
  "very-large": { label: "増加負担 非常に大", style: "bg-red-100 text-red-700" },
};

export default function DiscountVolumePage() {
  const [inputs, setInputs] = useState<DiscountVolumeInputs>(DEFAULT_DISCOUNT_VOLUME_INPUTS);

  const update = (patch: Partial<DiscountVolumeInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeDiscountVolumeResult(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_DISCOUNT_VOLUME_INPUTS);

  const summaryText = () =>
    [
      `現在価格: ${fmtYen(inputs.currentPrice)} → 値下げ後価格: ${fmtYen(inputs.discountedPrice)}（${fmtPct(-result.discountRate)}）`,
      `現在販売数: ${fmtCount(inputs.currentQuantity)} / 商品原価: ${fmtYen(inputs.cost)}`,
      `現在総利益: ${fmtYen(result.currentTotalProfit)}`,
      `値下げ後1個利益: ${fmtYen(result.discountedUnitProfit)}`,
      result.requiredQuantityForProfit !== null
        ? `利益維持必要販売数: ${fmtCount(result.requiredQuantityForProfit)}（現在比 ${fmtPct(result.requiredQuantityGrowthRate)}）`
        : "利益維持必要販売数: 算出不可（値下げ後が原価割れ）",
      `売上維持必要販売数: ${fmtCount(result.requiredQuantityForRevenue)}（現在比 ${fmtPct(result.requiredQuantityGrowthRateForRevenue)}）`,
      `現在販売数のまま値下げした場合の総利益: ${fmtYen(result.discountedProfitAtCurrentQuantity)}（差 ${fmtYen(result.totalProfitDifference)} / ${fmtPct(result.totalProfitDifferenceRate)}）`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">値引き必要販売数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在価格・値下げ後価格・現在販売数・商品原価の4項目だけで、「値下げ後、現在と同じ総利益を維持するには何個売る必要があるか」を即座に算出します。値下げが実際に何％売れるかを予測するツールではなく、必要条件を示すものです。
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

          <ToolSection step="2" title="値下げ案">
            <NumberField
              label="値下げ後価格"
              value={inputs.discountedPrice}
              onChange={(v) => update({ discountedPrice: v })}
              prefix="¥"
              error={issueMap.get("discountedPrice")}
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
          ) : result.isCurrentlyUnprofitable ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">現在価格の時点で1個あたり利益が0円以下です。</p>
              <p className="mt-1 text-xs text-red-600">
                現在1個利益: {fmtYen(result.currentUnitProfit)}。値下げの検討より先に、現在価格・原価を見直してください。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                {result.isDiscountedUnprofitable ? (
                  <>
                    <p className="text-sm font-semibold text-red-700">値下げ後は赤字価格です</p>
                    <p className="mt-1 text-3xl font-bold text-red-600">{fmtYen(result.discountedUnitProfit)} / 個</p>
                    <p className="mt-2 text-xs text-red-600">
                      販売数を増やしても、1個売るごとに赤字が増えます。現在利益を維持できません。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">現在利益を維持するには</p>
                    <p className="text-4xl font-bold text-zinc-900">
                      {fmtCount(result.requiredQuantityForProfit)} 必要
                    </p>
                    <p className="mt-1 text-lg font-semibold text-red-600">
                      現在より {result.additionalQuantity! >= 0 ? "+" : ""}
                      {result.additionalQuantity}個（販売数 {fmtPct(result.requiredQuantityGrowthRate)} 必要）
                    </p>
                    {result.growthBurden && (
                      <span
                        className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${BURDEN_STYLES[result.growthBurden].style}`}
                      >
                        {BURDEN_STYLES[result.growthBurden].label}
                      </span>
                    )}
                  </>
                )}
              </div>

              <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                {fmtYen(inputs.currentPrice)} → {fmtYen(inputs.discountedPrice)}
                へ値下げする場合、現在と同じ総利益を維持するには販売数を{fmtCount(inputs.currentQuantity)}から
                {fmtCount(result.requiredQuantityForProfit)}へ増やす必要があります。現在比{" "}
                {fmtPct(result.requiredQuantityGrowthRate)} の販売数増加が必要です。
              </p>

              <ToolSection step="3" title="現在 vs 値下げ後">
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
                    <p className="text-xs font-semibold text-zinc-500">値下げ後</p>
                    <p className="mt-1 text-sm text-zinc-700">価格: {fmtYen(inputs.discountedPrice)}</p>
                    <p className="text-sm text-zinc-700">値下げ額: {fmtYen(result.discountAmount)}（{fmtPct(-result.discountRate)}）</p>
                    <p className="text-sm text-zinc-700">1個利益: {fmtYen(result.discountedUnitProfit)}</p>
                    <p className="text-sm text-zinc-700">
                      利益率: {fmtPct(result.discountedProfitRate)}（{fmtPct(result.profitRateChange, 1)}pt）
                    </p>
                    <p className="mt-1 font-semibold text-zinc-900">
                      現在販売数のまま: {fmtYen(result.discountedProfitAtCurrentQuantity)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <span>現在販売数のまま値下げした場合の総利益差</span>
                  <span className="font-semibold">
                    {fmtYen(result.totalProfitDifference)}（{fmtPct(result.totalProfitDifferenceRate)}）
                  </span>
                </div>
              </ToolSection>

              <ToolSection step="4" title="売上維持 vs 利益維持">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="売上維持に必要な販売数"
                    value={`${fmtCount(result.requiredQuantityForRevenue)}（${fmtPct(result.requiredQuantityGrowthRateForRevenue)}）`}
                  />
                  <StatTile
                    label="利益維持に必要な販売数"
                    value={
                      result.requiredQuantityForProfit !== null
                        ? `${fmtCount(result.requiredQuantityForProfit)}（${fmtPct(result.requiredQuantityGrowthRate)}）`
                        : "算出不可"
                    }
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  売上が維持できても、利益は維持できるとは限りません。一般に利益維持のほうが必要な販売数増加率は大きくなります。
                </p>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは値下げによって販売数が実際に何％増えるかを予測するものではありません。「現在と同じ利益を維持するには最低何％販売数を増やす必要があるか」という必要条件を示します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

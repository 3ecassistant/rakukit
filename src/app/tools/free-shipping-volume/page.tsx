"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_FREE_SHIPPING_INPUTS,
  FreeShippingInputs,
  computeFreeShippingResult,
  validateInputs,
} from "@/lib/freeShippingVolumeSimulator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtYenSigned(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  const rounded = Math.round(v);
  return `${rounded >= 0 ? "+" : ""}¥${rounded.toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}
function fmtCount(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}件`;
}

export default function FreeShippingVolumePage() {
  const [inputs, setInputs] = useState<FreeShippingInputs>(DEFAULT_FREE_SHIPPING_INPUTS);

  const update = (patch: Partial<FreeShippingInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeFreeShippingResult(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_FREE_SHIPPING_INPUTS);

  const summaryText = () =>
    [
      `商品価格: ${fmtYen(inputs.productPrice)} / 原価: ${fmtYen(inputs.productCost)} / 現在販売数: ${fmtCount(inputs.currentQuantity)}`,
      `実配送コスト: ${fmtYen(inputs.actualShippingCost)} / 現在顧客送料: ${fmtYen(inputs.customerShippingCharge)}`,
      `現在1注文利益: ${fmtYen(result.currentBreakdown.profit)} / 送料無料後1注文利益: ${fmtYen(result.freeShippingBreakdown.profit)}`,
      `送料負担増: ${fmtYenSigned(result.additionalShippingBurden)}`,
      result.requiredQuantity !== null
        ? `利益維持必要販売数: ${fmtCount(result.requiredQuantity)}（現在比 ${fmtPct(result.requiredGrowthRate)}）`
        : "利益維持必要販売数: 算出不可",
      `売上維持必要販売数: ${fmtCount(result.requiredQuantityForRevenue)}（現在比 ${fmtPct(result.requiredGrowthRateForRevenue)}）`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">送料無料化必要販売増加率シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          商品価格・原価・現在販売数・実配送コスト・現在顧客送料の5項目だけで、「送料無料化した場合、現在と同じ総利益を維持するには販売数を何％増やす必要があるか」を即座に算出します。実配送コストと顧客送料は別管理し、送料無料化で新たに失うのは基本的に現在回収している送料収入分のみです。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="商品条件">
            <NumberField
              label="商品価格"
              value={inputs.productPrice}
              onChange={(v) => update({ productPrice: v })}
              prefix="¥"
              error={issueMap.get("productPrice")}
            />
            <NumberField
              label="商品原価"
              value={inputs.productCost}
              onChange={(v) => update({ productCost: v })}
              prefix="¥"
              error={issueMap.get("productCost")}
            />
            <NumberField
              label="現在販売数（比較したい同一期間）"
              value={inputs.currentQuantity}
              onChange={(v) => update({ currentQuantity: v })}
              suffix="件"
              error={issueMap.get("currentQuantity")}
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

          <ToolSection step="2" title="送料条件">
            <NumberField
              label="実配送コスト"
              value={inputs.actualShippingCost}
              onChange={(v) => update({ actualShippingCost: v })}
              prefix="¥"
              error={issueMap.get("actualShippingCost")}
            />
            <NumberField
              label="現在顧客送料"
              value={inputs.customerShippingCharge}
              onChange={(v) => update({ customerShippingCharge: v })}
              prefix="¥"
              error={issueMap.get("customerShippingCharge")}
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
          ) : result.isAlreadyFreeShipping ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-sm font-semibold text-zinc-700">現在すでに送料無料です。</p>
            </div>
          ) : result.isCurrentlyUnprofitable ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">現在価格の時点で1注文あたり利益が0円以下です。</p>
              <p className="mt-1 text-xs text-red-600">現在1注文利益: {fmtYen(result.currentBreakdown.profit)}</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                {result.isFreeShippingUnprofitable ? (
                  <>
                    <p className="text-sm font-semibold text-red-700">送料無料化すると赤字です</p>
                    <p className="mt-1 text-3xl font-bold text-red-600">{fmtYen(result.freeShippingBreakdown.profit)} / 件</p>
                    <p className="mt-2 text-xs text-red-600">
                      販売数を増やしても現在利益を維持できません。
                    </p>
                  </>
                ) : result.isFreeShippingZero ? (
                  <>
                    <p className="text-sm font-semibold text-red-700">送料無料化すると利益が残りません</p>
                    <p className="mt-1 text-xs text-red-600">送料無料化すると1件販売しても利益が残りません。</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">送料無料化すると</p>
                    <p className="text-4xl font-bold text-zinc-900">販売数{fmtPct(result.requiredGrowthRate)}必要</p>
                    <p className="mt-1 text-lg font-semibold text-red-600">
                      現在{fmtCount(inputs.currentQuantity)} → 維持{fmtCount(result.requiredQuantity)}（あと
                      {result.additionalQuantity}件）
                    </p>
                  </>
                )}
              </div>

              <ToolSection step="3" title="送料負担の内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在の店舗送料負担" value={fmtYen(result.currentShippingBurden)} />
                  <StatTile label="送料無料後の店舗送料負担" value={fmtYen(result.freeShippingBurden)} />
                </div>
                <StatTile label="送料無料化による負担増" value={fmtYenSigned(result.additionalShippingBurden)} />
                {result.shippingRecoveryRate !== null && (
                  <p className="text-xs text-zinc-500">
                    現在の送料回収率: {result.shippingRecoveryRate.toFixed(1)}%（顧客送料 ÷ 実配送コスト）
                  </p>
                )}
              </ToolSection>

              <ToolSection step="4" title="現在 vs 送料無料後">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs font-semibold text-zinc-500">現在</p>
                    <p className="mt-1 text-sm text-zinc-700">1注文利益: {fmtYen(result.currentBreakdown.profit)}</p>
                    <p className="text-sm text-zinc-700">利益率: {fmtPct(result.currentBreakdown.profitRate)}</p>
                    <p className="mt-1 font-semibold text-zinc-900">総利益: {fmtYen(result.currentTotalProfit)}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs font-semibold text-zinc-500">送料無料後</p>
                    <p className="mt-1 text-sm text-zinc-700">1注文利益: {fmtYen(result.freeShippingBreakdown.profit)}</p>
                    <p className="text-sm text-zinc-700">利益率: {fmtPct(result.freeShippingBreakdown.profitRate)}</p>
                    <p className="mt-1 font-semibold text-zinc-900">
                      現在販売数のまま: {fmtYen(result.freeShippingTotalProfitAtCurrentVolume)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <span>現在販売数のまま送料無料化した場合の総利益差</span>
                  <span className="font-semibold">{fmtYenSigned(result.totalProfitDifference)}</span>
                </div>
              </ToolSection>

              <ToolSection step="5" title="売上維持 vs 利益維持">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="売上維持に必要な販売数"
                    value={`${fmtCount(result.requiredQuantityForRevenue)}（${fmtPct(result.requiredGrowthRateForRevenue)}）`}
                  />
                  <StatTile
                    label="利益維持に必要な販売数"
                    value={
                      result.requiredQuantity !== null
                        ? `${fmtCount(result.requiredQuantity)}（${fmtPct(result.requiredGrowthRate)}）`
                        : "算出不可"
                    }
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  売上を維持できても、利益を維持するにはさらに多くの販売数が必要になる場合があります。
                </p>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは送料無料化によって販売数が実際に何％増えるかを予測するものではありません。「現在と同じ利益を維持するには最低何％販売数を増やす必要があるか」という必要条件を示します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

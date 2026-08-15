"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  BulkPurchaseCouponInputs,
  BulkPurchaseStatus,
  DEFAULT_BULK_PURCHASE_COUPON_INPUTS,
  ScenarioResult,
  computeBulkPurchaseCoupon,
  validateInputs,
} from "@/lib/bulkPurchaseCouponCalculator";

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
  return `${v.toFixed(digits)}%`;
}

const STATUS_STYLES: Record<BulkPurchaseStatus, { label: string; style: string }> = {
  ok: { label: "黒字", style: "bg-green-100 text-green-700" },
  deficit: { label: "赤字", style: "bg-red-100 text-red-700" },
};

function ScenarioCard({ scenario }: { scenario: ScenarioResult }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <p className="text-xs font-semibold text-zinc-500">
        {scenario.label}（{scenario.quantity}点）
      </p>
      <p className="mt-1 text-sm text-zinc-700">売上: {fmtYen(scenario.breakdown.actualSellingPrice)}</p>
      <p className="text-sm text-zinc-700">利益率: {fmtPct(scenario.breakdown.profitRate)}</p>
      <p className="text-sm text-zinc-700">1点あたり利益: {fmtYen(scenario.unitProfit)}</p>
      <p className="mt-1 font-semibold text-zinc-900">利益: {fmtYen(scenario.breakdown.profit)}</p>
      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[scenario.status].style}`}>
        {STATUS_STYLES[scenario.status].label}
      </span>
    </div>
  );
}

export default function BulkPurchaseCouponPage() {
  const [inputs, setInputs] = useState<BulkPurchaseCouponInputs>(DEFAULT_BULK_PURCHASE_COUPON_INPUTS);

  const update = (patch: Partial<BulkPurchaseCouponInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeBulkPurchaseCoupon(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_BULK_PURCHASE_COUPON_INPUTS);

  const summaryText = () =>
    [
      `${inputs.unitPrice}円商品 / ${inputs.baselineQuantity}点購入 → ${inputs.bulkQuantity}点購入＋${fmtYen(inputs.couponAmount)}OFF`,
      `通常${inputs.baselineQuantity}点購入: 利益 ${fmtYen(result.baseline.breakdown.profit)}（${fmtPct(result.baseline.breakdown.profitRate)}）`,
      `${inputs.bulkQuantity}点・クーポンなし: 利益 ${fmtYen(result.bulkNoCoupon.breakdown.profit)}（${fmtPct(result.bulkNoCoupon.breakdown.profitRate)}）`,
      `${inputs.bulkQuantity}点・クーポンあり: 利益 ${fmtYen(result.bulkWithCoupon.breakdown.profit)}（${fmtPct(result.bulkWithCoupon.breakdown.profitRate)}）`,
      `通常購入比 注文利益差: ${fmtYenSigned(result.profitDifference)} / 客単価差: ${fmtYenSigned(result.revenueDifference)}`,
      `1点あたり利益差: ${fmtYenSigned(result.unitProfitDifference)}`,
      `クーポンによる利益減少: ${fmtYenSigned(-result.couponProfitImpact)}`,
      `実質値引率: ${fmtPct(result.effectiveDiscountRate)}`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">まとめ買いクーポン採算チェッカー</h1>
        <p className="text-sm text-zinc-500">
          商品単価・原価・購入点数・クーポン額・送料・販売関連費率を入力するだけで、「まとめ買いによって客単価は増えるが、本当に利益も増えるのか」を即座に確認します。通常購入・クーポンなしまとめ買い・クーポンありまとめ買いの3シナリオを比較します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="商品条件">
            <NumberField
              label="商品単価"
              value={inputs.unitPrice}
              onChange={(v) => update({ unitPrice: v })}
              prefix="¥"
              error={issueMap.get("unitPrice")}
            />
            <NumberField
              label="商品原価"
              value={inputs.unitCost}
              onChange={(v) => update({ unitCost: v })}
              prefix="¥"
              error={issueMap.get("unitCost")}
            />
            <NumberField
              label="送料（1注文あたり店舗実負担）"
              value={inputs.shipping}
              onChange={(v) => update({ shipping: v })}
              prefix="¥"
              error={issueMap.get("shipping")}
            />
            <NumberField
              label="販売関連費率（クーポン適用後売上基準）"
              value={inputs.marketplaceCostRate}
              onChange={(v) => update({ marketplaceCostRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("marketplaceCostRate")}
            />
          </ToolSection>

          <ToolSection step="2" title="まとめ買い条件">
            <NumberField
              label="通常購入点数"
              value={inputs.baselineQuantity}
              onChange={(v) => update({ baselineQuantity: v })}
              suffix="点"
              error={issueMap.get("baselineQuantity")}
            />
            <NumberField
              label="まとめ買い点数"
              value={inputs.bulkQuantity}
              onChange={(v) => update({ bulkQuantity: v })}
              suffix="点"
              error={issueMap.get("bulkQuantity")}
            />
            <NumberField
              label="クーポン額"
              value={inputs.couponAmount}
              onChange={(v) => update({ couponAmount: v })}
              prefix="¥"
              error={issueMap.get("couponAmount")}
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
                  {inputs.bulkQuantity}点購入＋{fmtYen(inputs.couponAmount)}OFFにすると
                </p>
                <p className="text-3xl font-bold text-zinc-900">
                  注文利益 {fmtYenSigned(result.profitDifference)}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  （通常{inputs.baselineQuantity}点購入比。実質値引率 {fmtPct(result.effectiveDiscountRate)}）
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-left">
                  <StatTile label="客単価" value={fmtYenSigned(result.revenueDifference)} />
                  <StatTile
                    label="1点あたり利益"
                    value={`${fmtYenSigned(result.unitProfitDifference)}`}
                  />
                </div>
              </div>

              {result.bulkWithCoupon.status === "deficit" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  まとめ買い注文は赤字です（利益 {fmtYen(result.bulkWithCoupon.breakdown.profit)}）。
                </div>
              )}
              {result.bulkWithCoupon.status === "ok" && result.unitProfitDifference < 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  注文利益は増えていますが、1点あたり利益は通常時より{fmtPct(result.unitProfitDifferenceRate !== null ? Math.abs(result.unitProfitDifferenceRate) : null)}低下しています。
                </div>
              )}

              <ToolSection step="3" title="3シナリオ比較（①通常購入 ②クーポンなし ③クーポンあり）">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ScenarioCard scenario={result.baseline} />
                  <ScenarioCard scenario={result.bulkNoCoupon} />
                  <ScenarioCard scenario={result.bulkWithCoupon} />
                </div>
                <p className="text-xs text-zinc-500">
                  ①→②の差が「まとめ買いそのものによる利益増」、②→③の差が「クーポンによる利益減」です。
                </p>
              </ToolSection>

              <ToolSection step="4" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="まとめ買いによる利益増（①→②）" value={fmtYenSigned(result.bulkNoCoupon.breakdown.profit - result.baseline.breakdown.profit)} />
                  <StatTile label="クーポンによる利益減（②→③）" value={fmtYenSigned(-result.couponProfitImpact)} />
                  <StatTile label="注文利益差（①→③）" value={fmtYenSigned(result.profitDifference)} />
                  <StatTile label="客単価差（①→③）" value={fmtYenSigned(result.revenueDifference)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールはまとめ買いクーポンを出した場合に実際に何％の顧客が複数購入するかを予測するものではありません。まとめ買い注文が1件発生した場合の採算のみを算出します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

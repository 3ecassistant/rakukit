"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  CouponMinimumSpendInputs,
  DEFAULT_COMPARISON_SPENDS,
  DEFAULT_COUPON_MIN_SPEND_INPUTS,
  SpendStatus,
  computeCouponMinimumSpend,
  computeProfitAtSpend,
  judgeSpendStatus,
  validateInputs,
} from "@/lib/couponMinimumSpendCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

const STATUS_STYLES: Record<SpendStatus, { label: string; style: string }> = {
  ok: { label: "採算OK", style: "bg-green-100 text-green-700" },
  caution: { label: "注意", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字", style: "bg-red-100 text-red-700" },
};

export default function CouponMinimumSpendPage() {
  const [inputs, setInputs] = useState<CouponMinimumSpendInputs>(DEFAULT_COUPON_MIN_SPEND_INPUTS);

  const update = (patch: Partial<CouponMinimumSpendInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeCouponMinimumSpend(inputs), [inputs]);

  const comparisonRows = useMemo(
    () =>
      DEFAULT_COMPARISON_SPENDS.filter((s) => s > inputs.couponAmount).map((spend) => {
        const breakdown = computeProfitAtSpend(inputs, spend);
        return {
          spend,
          breakdown,
          status: judgeSpendStatus(breakdown.profit, breakdown.profitRate, inputs.minProfitRate),
        };
      }),
    [inputs]
  );

  const handleReset = () => setInputs(DEFAULT_COUPON_MIN_SPEND_INPUTS);

  const summaryText = () =>
    [
      `クーポン: ${fmtYen(inputs.couponAmount)}OFF`,
      `原価率: ${fmtPct(inputs.costRate)} / 送料: ${fmtYen(inputs.shipping)} / 販売関連費率: ${fmtPct(inputs.marketplaceCostRate)} / 最低利益率: ${fmtPct(inputs.minProfitRate)}`,
      result.breakEvenMinimumSpend !== null
        ? `赤字にならない最低購入金額: ${fmtYen(result.breakEvenMinimumSpend)}以上`
        : "赤字にならない最低購入金額: 算出不可",
      result.targetProfitMinimumSpend !== null
        ? `利益率${fmtPct(inputs.minProfitRate)}維持の最低購入金額: ${fmtYen(result.targetProfitMinimumSpend)}以上`
        : `利益率${fmtPct(inputs.minProfitRate)}維持の最低購入金額: 算出不可`,
      result.roundedThresholds.length > 0
        ? `設定候補: ${result.roundedThresholds.map((t) => `${fmtYen(t.value)}以上（${t.unit}円単位）`).join(" / ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">クーポン最低購入金額シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          クーポン額・原価率・送料・販売関連費率・最低利益率を入力するだけで、「このクーポンを出すなら最低購入金額をいくら以上に設定すべきか」を自動算出します。金額はすべて税込で入力してください。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="クーポン条件">
            <NumberField
              label="クーポン額"
              value={inputs.couponAmount}
              onChange={(v) => update({ couponAmount: v })}
              prefix="¥"
              error={issueMap.get("couponAmount")}
            />
          </ToolSection>

          <ToolSection step="2" title="コスト条件">
            <NumberField
              label="商品原価率（値引き前の購入金額基準）"
              value={inputs.costRate}
              onChange={(v) => update({ costRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("costRate")}
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
            <NumberField
              label="最低利益率"
              value={inputs.minProfitRate}
              onChange={(v) => update({ minProfitRate: v })}
              suffix="%"
              error={issueMap.get("minProfitRate")}
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
          ) : result.isTargetUnreachable ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                購入金額を増やしても設定した利益率を維持できません。
              </p>
              <p className="mt-1 text-xs text-red-600">
                原価率・販売関連費率・最低利益率をご確認ください（理論上の上限利益率: {fmtPct(result.theoreticalMaxProfitRate)}）。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">{fmtYen(inputs.couponAmount)}OFFクーポンなら</p>
                <p className="text-4xl font-bold text-zinc-900">
                  最低{fmtYen(result.targetProfitMinimumSpend)}以上
                </p>
                <p className="mt-1 text-lg font-semibold text-red-600">
                  利益率{fmtPct(inputs.minProfitRate)}を維持
                </p>
              </div>

              <ToolSection step="3" title="計算結果">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="赤字にならない最低購入金額"
                    value={result.breakEvenMinimumSpend !== null ? `${fmtYen(result.breakEvenMinimumSpend)}以上` : "算出不可"}
                  />
                  <StatTile
                    label={`利益率${fmtPct(inputs.minProfitRate)}維持の最低購入金額`}
                    value={result.targetProfitMinimumSpend !== null ? `${fmtYen(result.targetProfitMinimumSpend)}以上` : "算出不可"}
                  />
                </div>
                {result.breakdownAtTarget && (
                  <p className="text-xs text-zinc-500">
                    この金額での実質値引率: {fmtPct(result.breakdownAtTarget.effectiveDiscountRate)}
                  </p>
                )}
              </ToolSection>

              <ToolSection step="4" title="設定候補（丸め）">
                <div className="grid grid-cols-3 gap-2">
                  {result.roundedThresholds.map((t) => (
                    <StatTile key={t.unit} label={`${t.unit}円単位`} value={`${fmtYen(t.value)}以上`} />
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  計算上の最低金額そのままより、キリのよい金額の方が実務上は使いやすい場合があります。
                </p>
              </ToolSection>

              {result.breakdownAtTarget && (
                <ToolSection step="5" title="利益内訳（設定候補金額）">
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between text-zinc-700">
                      <span>購入金額</span>
                      <span>{fmtYen(result.targetProfitMinimumSpend)}</span>
                    </div>
                    {[
                      ["クーポン", -inputs.couponAmount],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between text-zinc-500">
                        <span>{label}</span>
                        <span>{fmtYen(value as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-zinc-100 pt-1 text-zinc-700">
                      <span>クーポン後売上</span>
                      <span>{fmtYen(result.breakdownAtTarget.postCouponRevenue)}</span>
                    </div>
                    {[
                      ["商品原価", -result.breakdownAtTarget.productCost],
                      ["送料", -result.breakdownAtTarget.shipping],
                      ["販売関連費", -result.breakdownAtTarget.marketplaceCost],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between text-zinc-500">
                        <span>{label}</span>
                        <span>{fmtYen(value as number)}</span>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1 font-semibold text-zinc-900">
                      <span>利益</span>
                      <span>{fmtYen(result.breakdownAtTarget.profit)}</span>
                    </div>
                  </div>
                </ToolSection>
              )}

              <ToolSection step="6" title="購入金額別比較">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
                        <th className="py-2 pr-3">購入金額</th>
                        <th className="py-2 pr-3">実質値引率</th>
                        <th className="py-2 pr-3">利益</th>
                        <th className="py-2 pr-3">利益率</th>
                        <th className="py-2 pr-3">判定</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.spend} className="border-b border-zinc-100">
                          <td className="py-2 pr-3 font-medium text-zinc-800">{fmtYen(row.spend)}以上</td>
                          <td className="py-2 pr-3 text-zinc-600">{fmtPct(row.breakdown.effectiveDiscountRate)}</td>
                          <td className={`py-2 pr-3 font-semibold ${row.breakdown.profit < 0 ? "text-red-600" : "text-zinc-900"}`}>
                            {fmtYen(row.breakdown.profit)}
                          </td>
                          <td className="py-2 pr-3 text-zinc-600">{fmtPct(row.breakdown.profitRate)}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[row.status].style}`}>
                              {STATUS_STYLES[row.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは最低購入金額を高くした場合のクーポン利用率の変化を予測するものではありません。設定した費用条件・利益率を維持するために必要な最低購入金額のみを算出します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

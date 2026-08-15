"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  CouponBudgetInputs,
  CouponBudgetStatus,
  DEFAULT_COUPON_BUDGET_INPUTS,
  computeCouponBudget,
  validateInputs,
} from "@/lib/couponBudgetSimulator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

const STATUS_STYLES: Record<CouponBudgetStatus, { label: string; style: string }> = {
  ok: { label: "採算OK", style: "bg-green-100 text-green-700" },
  caution: { label: "黒字・目標未達", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字", style: "bg-red-100 text-red-700" },
};

export default function CouponBudgetPage() {
  const [inputs, setInputs] = useState<CouponBudgetInputs>(DEFAULT_COUPON_BUDGET_INPUTS);

  const update = (patch: Partial<CouponBudgetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeCouponBudget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_COUPON_BUDGET_INPUTS);

  const summaryText = () =>
    [
      `${fmtYen(inputs.couponAmount)}OFF × ${inputs.expectedRedemptions}件`,
      `クーポン原資: ${fmtYen(result.totalCouponCost)}`,
      `値引前売上: ${fmtYen(result.grossCouponSales)} / 値引後売上: ${fmtYen(result.netCouponSales)}`,
      `1件利益: ${fmtYen(result.profitPerOrder)}（${fmtPct(result.profitRate)}） / 総利益: ${fmtYen(result.totalProfit)}`,
      result.minimumAov !== null
        ? `利益率${fmtPct(inputs.minimumProfitRate)}維持の必要平均注文単価: ${fmtYen(result.minimumAov)}以上 / 必要クーポン経由売上: ${fmtYen(result.requiredCouponSales)}以上`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">クーポン予算・必要売上シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          クーポン額・想定利用数・平均注文単価・原価率・送料・最低利益率を入力するだけで、クーポン施策全体の原資・必要売上・利益を算出します。1注文単位の採算は「クーポン最低購入金額シミュレーター」と同じロジックを使用しています。
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
            <NumberField
              label="想定利用数"
              value={inputs.expectedRedemptions}
              onChange={(v) => update({ expectedRedemptions: v })}
              suffix="件"
              error={issueMap.get("expectedRedemptions")}
            />
          </ToolSection>

          <ToolSection step="2" title="注文・コスト条件">
            <NumberField
              label="平均注文単価"
              value={inputs.averageOrderValue}
              onChange={(v) => update({ averageOrderValue: v })}
              prefix="¥"
              error={issueMap.get("averageOrderValue")}
            />
            <NumberField
              label="平均原価率"
              value={inputs.costRate}
              onChange={(v) => update({ costRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("costRate")}
            />
            <NumberField
              label="送料（1注文あたり）"
              value={inputs.shippingPerOrder}
              onChange={(v) => update({ shippingPerOrder: v })}
              prefix="¥"
              error={issueMap.get("shippingPerOrder")}
            />
            <NumberField
              label="販売関連費率"
              value={inputs.marketplaceCostRate}
              onChange={(v) => update({ marketplaceCostRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("marketplaceCostRate")}
            />
            <NumberField
              label="最低利益率"
              value={inputs.minimumProfitRate}
              onChange={(v) => update({ minimumProfitRate: v })}
              suffix="%"
              error={issueMap.get("minimumProfitRate")}
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
                  {fmtYen(inputs.couponAmount)}OFF × {inputs.expectedRedemptions}件なら
                </p>
                <p className="text-3xl font-bold text-zinc-900">クーポン原資 {fmtYen(result.totalCouponCost)}</p>
                {result.minimumAov !== null ? (
                  <p className="mt-1 text-sm text-zinc-600">
                    利益率{fmtPct(inputs.minimumProfitRate)}維持には平均注文単価{fmtYen(result.minimumAov)}以上必要
                  </p>
                ) : null}
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[result.status].style}`}
                >
                  {STATUS_STYLES[result.status].label}
                </span>
              </div>

              {result.status === "deficit" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  クーポン利用1件ごとに赤字となる条件です。利用数を増やすほど赤字が拡大します。
                </div>
              )}

              <ToolSection step="3" title="売上・利益">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="値引前売上" value={fmtYen(result.grossCouponSales)} />
                  <StatTile label="値引後売上" value={fmtYen(result.netCouponSales)} />
                  <StatTile label="1件あたり利益" value={fmtYen(result.profitPerOrder)} />
                  <StatTile label="利益率" value={fmtPct(result.profitRate)} />
                </div>
                <StatTile label="全体利益" value={fmtYen(result.totalProfit)} />
              </ToolSection>

              <ToolSection step="4" title="必要売上（利益率維持）">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="必要平均注文単価" value={result.minimumAov !== null ? `${fmtYen(result.minimumAov)}以上` : "-"} />
                  <StatTile label="必要クーポン経由売上" value={result.requiredCouponSales !== null ? `${fmtYen(result.requiredCouponSales)}以上` : "-"} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールはクーポン利用率やCVR改善を予測するものではありません。想定利用数に基づいた原資・必要売上・利益のみを算出します。発行枚数・取得数ではなく「利用数」を採算計算の基準としています。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

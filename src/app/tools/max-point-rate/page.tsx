"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_COMPARISON_POINT_RATES,
  DEFAULT_MAX_POINT_RATE_INPUTS,
  MaxPointRateInputs,
  PointRateStatus,
  computeBreakdownAtPointRate,
  computeMaxPointRate,
  judgePointRateStatus,
  validateInputs,
} from "@/lib/maxPointRateCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtPt(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}pt`;
}

const STATUS_STYLES: Record<PointRateStatus, { label: string; style: string }> = {
  ok: { label: "採算OK", style: "bg-green-100 text-green-700" },
  caution: { label: "注意", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字", style: "bg-red-100 text-red-700" },
};

export default function MaxPointRatePage() {
  const [inputs, setInputs] = useState<MaxPointRateInputs>(DEFAULT_MAX_POINT_RATE_INPUTS);

  const update = (patch: Partial<MaxPointRateInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeMaxPointRate(inputs), [inputs]);

  const comparisonRows = useMemo(
    () =>
      DEFAULT_COMPARISON_POINT_RATES.map((rate) => {
        const breakdown = computeBreakdownAtPointRate(inputs, rate);
        return {
          rate,
          breakdown,
          status: judgePointRateStatus(breakdown.profit, breakdown.profitRate, inputs.minProfitRate),
        };
      }),
    [inputs]
  );

  const handleReset = () => setInputs(DEFAULT_MAX_POINT_RATE_INPUTS);

  const summaryText = () =>
    [
      `販売価格: ${fmtYen(inputs.sellingPrice)} / 原価: ${fmtYen(inputs.cost)} / 送料: ${fmtYen(inputs.shipping)}`,
      `現在ポイント負担率: ${fmtPct(inputs.currentPointRate)} / 最低利益率: ${fmtPct(inputs.minProfitRate)}`,
      `現在利益: ${fmtYen(result.currentBreakdown.profit)} / 現在利益率: ${fmtPct(result.currentBreakdown.profitRate)}`,
      result.maxPointRate !== null
        ? `最大ポイント負担率: ${fmtPct(result.maxPointRate)}（追加余力 ${fmtPt(result.additionalPointCapacity)}）`
        : "最大ポイント負担率: 算出不可（ポイントなしでも最低利益率未達）",
      `赤字ライン: ${fmtPct(result.breakEvenPointRate)}`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">最大ポイント倍率チェッカー</h1>
        <p className="text-sm text-zinc-500">
          販売価格・原価・送料・現在ポイント負担率・最低利益率を入力するだけで、「利益率を維持できる最大ポイント負担率」を自動算出します。ポイント施策の集客効果を予測するものではなく、利益面から見た上限を示します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="商品条件">
            <NumberField
              label="販売価格"
              value={inputs.sellingPrice}
              onChange={(v) => update({ sellingPrice: v })}
              prefix="¥"
              error={issueMap.get("sellingPrice")}
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

          <ToolSection step="2" title="ポイント・利益条件">
            <NumberField
              label="現在ポイント負担率（店舗実負担）"
              value={inputs.currentPointRate}
              onChange={(v) => update({ currentPointRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("currentPointRate")}
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
          ) : result.isUnreachableEvenAtZeroPoint ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                ポイントを付与しなくても設定した最低利益率を満たしていません。
              </p>
              <p className="mt-1 text-xs text-red-600">
                ポイント0%時点の利益率: {fmtPct(result.profitRateAt0)}（目標 {fmtPct(inputs.minProfitRate)}）。原価・送料・販売関連費率をご確認ください。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">現在{fmtPct(inputs.currentPointRate)}</p>
                <p className="text-4xl font-bold text-zinc-900">最大{fmtPct(result.maxPointRate)}まで</p>
                {result.isCurrentDeficit ? (
                  <p className="mt-1 text-lg font-semibold text-red-600">現在施策は赤字です</p>
                ) : result.isCurrentOverMax ? (
                  <p className="mt-1 text-lg font-semibold text-yellow-700">
                    現在の施策は最低利益率を超過しています
                  </p>
                ) : (
                  <p className="mt-1 text-lg font-semibold text-red-600">
                    あと{fmtPt(result.additionalPointCapacity)}余力あり
                  </p>
                )}
                <p className="mt-1 text-sm text-zinc-500">利益率{fmtPct(inputs.minProfitRate)}を維持</p>
              </div>

              {result.isCurrentDeficit && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  黒字化するにはポイント率を{fmtPct(result.breakEvenPointRate)}以下にしてください（現在との差{" "}
                  {fmtPt(result.requiredReductionToBreakEven)}）。
                </div>
              )}
              {!result.isCurrentDeficit && result.isCurrentOverMax && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  現在利益率{fmtPct(result.currentBreakdown.profitRate)}は目標{fmtPct(inputs.minProfitRate)}未満です。最低利益率まで戻すには{" "}
                  {fmtPt(result.requiredReductionToMax)} の削減が必要です。
                </div>
              )}

              <ToolSection step="3" title="現在の利益">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在ポイント負担額" value={fmtYen(result.currentBreakdown.pointCost)} />
                  <StatTile label="現在利益" value={fmtYen(result.currentBreakdown.profit)} />
                  <StatTile label="現在利益率" value={fmtPct(result.currentBreakdown.profitRate)} />
                </div>
                <span
                  className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[result.currentStatus].style}`}
                >
                  {STATUS_STYLES[result.currentStatus].label}
                </span>
              </ToolSection>

              <ToolSection step="4" title="上限ライン">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label={`最大ポイント負担率（利益率${fmtPct(inputs.minProfitRate)}維持）`}
                    value={`${fmtPct(result.maxPointRate)}（${fmtYen(result.maxPointCostAmount)}）`}
                  />
                  <StatTile label="赤字ライン（利益0%）" value={fmtPct(result.breakEvenPointRate)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="追加可能ポイント余力" value={fmtPt(result.additionalPointCapacity)} />
                  <StatTile label="追加可能負担額" value={fmtYen(result.additionalPointCostCapacity)} />
                </div>
              </ToolSection>

              <ToolSection step="5" title="ポイント率別比較">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
                        <th className="py-2 pr-3">ポイント率</th>
                        <th className="py-2 pr-3">負担額</th>
                        <th className="py-2 pr-3">利益</th>
                        <th className="py-2 pr-3">利益率</th>
                        <th className="py-2 pr-3">判定</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.rate} className="border-b border-zinc-100">
                          <td className="py-2 pr-3 font-medium text-zinc-800">{fmtPct(row.rate)}</td>
                          <td className="py-2 pr-3 text-zinc-600">{fmtYen(row.breakdown.pointCost)}</td>
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
                本ツールはポイント倍率を上げた場合の売上増加を予測するものではありません。現在の費用構造で利益条件を維持できるポイント負担率の上限のみを算出します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

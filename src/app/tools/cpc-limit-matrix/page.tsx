"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  CpcLimitInputs,
  CpcLimitStatus,
  DEFAULT_CPC_LIMIT_INPUTS,
  computeCpcLimitMatrix,
  validateInputs,
} from "@/lib/cpcLimitMatrixCalculator";

function fmtYen(v: number | null, digits = 0): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${v.toFixed(digits)}`;
}
function fmtYenSigned(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}¥${v.toFixed(digits)}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}

const STATUS_STYLES: Record<CpcLimitStatus, { label: string; style: string }> = {
  achieved: { label: "目標利益達成", style: "bg-green-100 text-green-700" },
  "profitable-below-target": { label: "黒字・目標未達", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字圏", style: "bg-red-100 text-red-700" },
  "no-current-values": { label: "現在条件未入力", style: "bg-zinc-100 text-zinc-600" },
  unreachable: { label: "算出不可", style: "bg-red-100 text-red-700" },
  "already-deficit-before-ads": { label: "商品採算自体が赤字", style: "bg-red-100 text-red-700" },
};

export default function CpcLimitMatrixPage() {
  const [inputs, setInputs] = useState<CpcLimitInputs>(DEFAULT_CPC_LIMIT_INPUTS);
  const [hasCurrent, setHasCurrent] = useState(true);

  const update = (patch: Partial<CpcLimitInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeCpcLimitMatrix(inputs), [inputs]);

  const handleReset = () => {
    setInputs(DEFAULT_CPC_LIMIT_INPUTS);
    setHasCurrent(true);
  };

  const summaryText = () =>
    [
      `販売価格: ${fmtYen(inputs.sellingPrice)} / 原価: ${fmtYen(inputs.cost)} / 送料: ${fmtYen(inputs.shipping)} / 最低利益率: ${fmtPct(inputs.minProfitRate)}`,
      `広告前利益: ${fmtYen(result.preAdProfit)} / CPA上限: ${fmtYen(result.maxCpa)} / 損益分岐CPA: ${fmtYen(result.breakEvenCpa)}`,
      ...result.matrixRows.map(
        (r) =>
          `CVR${r.cvr}%: 目標利益維持CPC上限 ${fmtYen(r.targetProfitCpcLimit, 1)} / 損益分岐CPC ${fmtYen(r.breakEvenCpcLimit, 1)}`
      ),
      inputs.currentCvr !== null && inputs.currentCpc !== null
        ? `現在CVR ${fmtPct(inputs.currentCvr)} / CPC上限 ${fmtYen(result.currentCpcLimit, 1)} / 現在CPC ${fmtYen(inputs.currentCpc)} / 差 ${fmtYenSigned(result.cpcGap)}`
        : "",
      `必要ROAS: ${fmtPct(result.requiredRoas)}`,
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">CVR別CPC上限マトリクス</h1>
        <p className="text-sm text-zinc-500">
          販売価格・原価・送料・最低利益率を入力するだけで、CVRごとに許容できる最大CPC（CPC上限）を一覧表示します。CPCだけでは高い・安いを判断できません——同じCPCでもCVRによって採算は大きく変わります。
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
            <NumberField
              label="最低利益率"
              value={inputs.minProfitRate}
              onChange={(v) => update({ minProfitRate: v })}
              suffix="%"
              error={issueMap.get("minProfitRate")}
            />
          </ToolSection>

          <ToolSection step="2" title="現在のRPP条件（任意）">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={hasCurrent}
                onChange={(e) => {
                  setHasCurrent(e.target.checked);
                  update({
                    currentCvr: e.target.checked ? DEFAULT_CPC_LIMIT_INPUTS.currentCvr : null,
                    currentCpc: e.target.checked ? DEFAULT_CPC_LIMIT_INPUTS.currentCpc : null,
                  });
                }}
              />
              現在CVR・CPCを入力する
            </label>
            {hasCurrent && (
              <>
                <NumberField
                  label="現在CVR"
                  value={inputs.currentCvr ?? 0}
                  onChange={(v) => update({ currentCvr: v })}
                  suffix="%"
                  step={0.1}
                  error={issueMap.get("currentCvr")}
                />
                <NumberField
                  label="現在CPC"
                  value={inputs.currentCpc ?? 0}
                  onChange={(v) => update({ currentCpc: v })}
                  prefix="¥"
                  error={issueMap.get("currentCpc")}
                />
              </>
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
          ) : result.status === "already-deficit-before-ads" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">商品採算自体が赤字です</p>
              <p className="mt-1 text-xs text-red-600">
                広告前利益: {fmtYen(result.preAdProfit)}。RPP以前に商品採算条件をご確認ください。
              </p>
            </div>
          ) : result.status === "unreachable" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                広告費を使わなくても設定した最低利益率を満たしていません。
              </p>
              <p className="mt-1 text-xs text-red-600">広告前利益: {fmtYen(result.preAdProfit)}</p>
            </div>
          ) : (
            <>
              {inputs.currentCvr !== null && inputs.currentCpc !== null && (
                <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                  <p className="text-xs text-zinc-400">
                    現在CVR{fmtPct(inputs.currentCvr)} / 現在CPC{fmtYen(inputs.currentCpc)}
                  </p>
                  <p className="text-sm text-zinc-600">CPC上限: {fmtYen(result.currentCpcLimit, 1)}</p>
                  <p className={`text-3xl font-bold ${result.cpcGap !== null && result.cpcGap > 0 ? "text-red-600" : "text-green-700"}`}>
                    {result.cpcGap !== null && result.cpcGap > 0
                      ? `${fmtYen(Math.abs(result.cpcGap), 1)}超過`
                      : `${fmtYen(result.cpcGap !== null ? Math.abs(result.cpcGap) : null, 1)}余力`}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[result.status].style}`}
                  >
                    {STATUS_STYLES[result.status].label}
                  </span>
                  <p className="mt-2 text-xs text-zinc-500">
                    このCPCを維持するための必要CVR: {fmtPct(result.requiredCvrAtCurrentCpc, 2)}
                  </p>
                </div>
              )}

              <ToolSection step="3" title={`CVR別CPC上限（利益率${fmtPct(inputs.minProfitRate)}を維持する場合）`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
                        <th className="py-2 pr-3">CVR</th>
                        <th className="py-2 pr-3">目標利益維持CPC上限</th>
                        <th className="py-2 pr-3">損益分岐CPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matrixRows.map((row) => (
                        <tr
                          key={row.cvr}
                          className={`border-b border-zinc-100 ${row.isCurrentRow ? "bg-red-50" : ""}`}
                        >
                          <td className="py-2 pr-3 font-medium text-zinc-800">
                            {row.cvr}%{row.isCurrentRow && <span className="ml-1 text-[10px] text-red-500">現在</span>}
                          </td>
                          <td className="py-2 pr-3 font-semibold text-zinc-900">
                            {fmtYen(row.targetProfitCpcLimit, 1)}
                          </td>
                          <td className="py-2 pr-3 text-zinc-500">{fmtYen(row.breakEvenCpcLimit, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-500">
                  ここでのCPC上限は利益条件から算出した「許容できる最大CPC」であり、競争環境を考慮した推奨CPCではありません。
                </p>
              </ToolSection>

              <ToolSection step="4" title="CPA・ROAS">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="広告前利益" value={fmtYen(result.preAdProfit)} />
                  <StatTile label="CPA上限（目標利益維持）" value={fmtYen(result.maxCpa)} />
                  <StatTile label="損益分岐CPA" value={fmtYen(result.breakEvenCpa)} />
                  <StatTile label="必要ROAS" value={fmtPct(result.requiredRoas)} />
                </div>
                {inputs.currentCvr !== null && inputs.currentCpc !== null && (
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="現在CPA（推計）" value={fmtYen(result.currentEstimatedCpa)} />
                    <StatTile label="現在ROAS（推計）" value={fmtPct(result.currentEstimatedRoas)} />
                  </div>
                )}
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールはCVR予測やCPC自動調整を行うものではありません。利益条件から算出したCPC上限を一覧化するだけです。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_RPP_CLICK_RUNWAY_INPUTS,
  RppClickRunwayInputs,
  RunwayStatus,
  computeRppClickRunway,
  validateInputs,
} from "@/lib/rppClickRunwayCalculator";

function fmtYen(v: number | null, digits = 0): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${v.toFixed(digits)}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtClicks(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}クリック`;
}

const STATUS_STYLES: Record<RunwayStatus, { label: string; style: string }> = {
  "within-target": { label: "目標利益内", style: "bg-green-100 text-green-700" },
  "profitable-below-target": { label: "黒字・目標利益未達", style: "bg-yellow-100 text-yellow-700" },
  "over-break-even": { label: "損益分岐超過", style: "bg-red-100 text-red-700" },
  "already-deficit-before-ads": { label: "商品採算自体が赤字", style: "bg-red-100 text-red-700" },
};

export default function RppClickRunwayPage() {
  const [inputs, setInputs] = useState<RppClickRunwayInputs>(DEFAULT_RPP_CLICK_RUNWAY_INPUTS);

  const update = (patch: Partial<RppClickRunwayInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeRppClickRunway(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_RPP_CLICK_RUNWAY_INPUTS);

  const summaryText = () =>
    [
      `販売価格: ${fmtYen(inputs.sellingPrice)} / 原価: ${fmtYen(inputs.cost)} / 送料: ${fmtYen(inputs.shipping)} / 最低利益率: ${fmtPct(inputs.minProfitRate)}`,
      `現在広告費: ${fmtYen(inputs.currentAdCost)} / クリック: ${inputs.currentClicks} / 注文: ${inputs.currentOrders} / 平均CPC: ${fmtYen(result.averageCpc, 1)}`,
      `広告前利益: ${fmtYen(result.preAdProfit)} / CPA上限: ${fmtYen(result.targetCpaLimit)} / 損益分岐CPA: ${fmtYen(result.breakEvenCpa)}`,
      result.remainingTargetClicks !== null
        ? `利益率${fmtPct(inputs.minProfitRate)}維持まで: あと${fmtClicks(result.remainingTargetClicks)}`
        : "",
      result.remainingBreakEvenClicks !== null
        ? `損益分岐まで: あと${fmtClicks(result.remainingBreakEvenClicks)}`
        : "",
      `現在CVR: ${fmtPct(result.currentCvr)} / 現在CPA: ${result.currentCpa !== null ? fmtYen(result.currentCpa) : "算出不可（注文0件）"} / 現在ROAS: ${fmtPct(result.currentRoas)}`,
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">RPP赤字まであと何クリックシミュレーター</h1>
        <p className="text-sm text-zinc-500">
          販売価格・原価・送料・現在の広告費/クリック数/注文数・最低利益率を入力するだけで、「次の注文が入らないまま広告費が増えた場合、あと何クリックまで利益条件を維持できるか」を即座に算出します。これは注文発生の予測ではなく、現在の平均CPCが続いた場合の広告費余力をクリック数に換算した値です。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="商品採算">
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

          <ToolSection step="2" title="RPP実績">
            <NumberField
              label="現在広告費"
              value={inputs.currentAdCost}
              onChange={(v) => update({ currentAdCost: v })}
              prefix="¥"
              error={issueMap.get("currentAdCost")}
            />
            <NumberField
              label="現在クリック数"
              value={inputs.currentClicks}
              onChange={(v) => update({ currentClicks: v })}
              suffix="クリック"
              error={issueMap.get("currentClicks")}
            />
            <NumberField
              label="現在注文数"
              value={inputs.currentOrders}
              onChange={(v) => update({ currentOrders: v })}
              suffix="件"
              error={issueMap.get("currentOrders")}
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
          ) : result.status === "already-deficit-before-ads" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                広告費を使う前の段階で商品採算が0円以下です。
              </p>
              <p className="mt-1 text-xs text-red-600">広告前利益: {fmtYen(result.preAdProfit)}</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">現在平均CPC {fmtYen(result.averageCpc, 1)}</p>
                {result.status === "over-break-even" ? (
                  <>
                    <p className="text-2xl font-bold text-red-600">
                      設定した損益分岐広告費を{fmtYen(result.breakEvenOverflowAmount)}超過しています
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 mt-2">損益分岐まで</p>
                    <p className="text-3xl font-bold text-zinc-900">あと{fmtClicks(result.remainingBreakEvenClicks)}</p>
                    <p className="mt-3 text-xs text-zinc-500">
                      利益率{fmtPct(inputs.minProfitRate)}維持まで
                    </p>
                    {result.status === "profitable-below-target" ? (
                      <p className="text-lg font-semibold text-yellow-700">
                        既に{fmtYen(result.targetOverflowAmount)}超過
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-red-600">
                        あと{fmtClicks(result.remainingTargetClicks)}
                      </p>
                    )}
                  </>
                )}
                <span
                  className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[result.status].style}`}
                >
                  {STATUS_STYLES[result.status].label}
                </span>
                <p className="mt-2 text-xs text-zinc-400">
                  ○クリック以内に注文が発生する予測ではありません。現在の平均CPCが続いた場合に、広告費上限まで残っているクリック分を示します。
                </p>
              </div>

              <ToolSection step="3" title="残り広告費・クリック数">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="残り目標広告費（次の1件まで）"
                    value={result.remainingTargetBudget !== null ? fmtYen(result.remainingTargetBudget) : "-"}
                  />
                  <StatTile
                    label="残り損益分岐広告費（次の1件まで）"
                    value={result.remainingBreakEvenBudget !== null ? fmtYen(result.remainingBreakEvenBudget) : "-"}
                  />
                  <StatTile label="CPA上限（目標利益維持）" value={fmtYen(result.targetCpaLimit)} />
                  <StatTile label="損益分岐CPA" value={fmtYen(result.breakEvenCpa)} />
                </div>
              </ToolSection>

              <ToolSection step="4" title="現在実績">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在CVR" value={fmtPct(result.currentCvr)} />
                  <StatTile label="現在CPA" value={result.currentCpa !== null ? fmtYen(result.currentCpa) : "算出不可（注文0件）"} />
                  <StatTile label="現在ROAS" value={fmtPct(result.currentRoas)} />
                  <StatTile label="広告前利益" value={fmtYen(result.preAdProfit)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                本ツールは広告停止を推奨・自動判定するものではありません。採算ライン超過という事実のみを示します。LTVやアシスト効果、認知目的の広告投資は考慮していません。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

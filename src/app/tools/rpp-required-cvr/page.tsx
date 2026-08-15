"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_REQUIRED_CVR_INPUTS,
  RequiredCvrInputs,
  RequiredCvrStatus,
  computeRequiredCvr,
  validateInputs,
} from "@/lib/requiredCvrCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtPt(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}pt`;
}
function fmtRelativePct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

const STATUS_STYLES: Record<RequiredCvrStatus, { label: string; style: string }> = {
  achieved: { label: "目標達成", style: "bg-green-100 text-green-700" },
  "profitable-below-target": { label: "黒字・目標未達", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字圏", style: "bg-red-100 text-red-700" },
  "no-current-cvr": { label: "現在CVR未入力", style: "bg-zinc-100 text-zinc-600" },
  unreachable: { label: "算出不可", style: "bg-red-100 text-red-700" },
  "already-deficit-before-ads": { label: "商品採算自体が赤字", style: "bg-red-100 text-red-700" },
};

export default function RppRequiredCvrPage() {
  const [inputs, setInputs] = useState<RequiredCvrInputs>(DEFAULT_REQUIRED_CVR_INPUTS);
  const [hasCurrentCvr, setHasCurrentCvr] = useState(true);

  const update = (patch: Partial<RequiredCvrInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeRequiredCvr(inputs), [inputs]);

  const handleReset = () => {
    setInputs(DEFAULT_REQUIRED_CVR_INPUTS);
    setHasCurrentCvr(true);
  };

  const summaryText = () =>
    [
      `販売価格: ${fmtYen(inputs.sellingPrice)} / CPC: ${fmtYen(inputs.cpc)} / 原価: ${fmtYen(inputs.cost)} / 送料: ${fmtYen(inputs.shipping)} / 最低利益率: ${fmtPct(inputs.minProfitRate)}`,
      `広告前利益: ${fmtYen(result.preAdProfit)}`,
      `CPA上限: ${fmtYen(result.maxCpa)} / 損益分岐CPA: ${fmtYen(result.breakEvenCpa)}`,
      `必要CVR: ${fmtPct(result.requiredCvr, 2)} / 損益分岐CVR: ${fmtPct(result.breakEvenCvr, 2)}`,
      inputs.currentCvr !== null
        ? `現在CVR: ${fmtPct(inputs.currentCvr, 2)} / 差: ${fmtPt(result.cvrGapPt)} / 現在CPA: ${fmtYen(result.currentEstimatedCpa)} / 現在ROAS: ${fmtPct(result.currentEstimatedRoas)}`
        : "",
      `必要ROAS: ${fmtPct(result.requiredRoas)}`,
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">RPP必要CVRシミュレーター</h1>
        <p className="text-sm text-zinc-500">
          販売価格・CPC・原価・送料・最低利益率を入力するだけで、「現在のCPCなら最低何％のCVRが必要か」を即座に算出します。CPCの高低だけでなく、そのCPCを成立させる商品ページCVRを確認できます。
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

          <ToolSection step="2" title="RPP条件">
            <NumberField
              label="現在CPC"
              value={inputs.cpc}
              onChange={(v) => update({ cpc: v })}
              prefix="¥"
              error={issueMap.get("cpc")}
            />
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={hasCurrentCvr}
                  onChange={(e) => {
                    setHasCurrentCvr(e.target.checked);
                    update({ currentCvr: e.target.checked ? DEFAULT_REQUIRED_CVR_INPUTS.currentCvr : null });
                  }}
                />
                現在CVRを入力する（任意）
              </label>
              {hasCurrentCvr && (
                <NumberField
                  label="現在CVR"
                  value={inputs.currentCvr ?? 0}
                  onChange={(v) => update({ currentCvr: v })}
                  suffix="%"
                  step={0.1}
                  error={issueMap.get("currentCvr")}
                />
              )}
            </div>
          </ToolSection>

          <ToolSection step="3" title="利益条件">
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
                広告費を0円にしても設定した最低利益率を満たせません。
              </p>
              <p className="mt-1 text-xs text-red-600">広告前利益: {fmtYen(result.preAdProfit)}</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">CPC{fmtYen(inputs.cpc)}なら</p>
                <p className="text-4xl font-bold text-zinc-900">
                  CVR {fmtPct(result.requiredCvr, 2)}以上必要
                </p>
                <p className="mt-1 text-sm text-zinc-500">利益率{fmtPct(inputs.minProfitRate)}を維持</p>
                {result.requiredCvrExceeds100 && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    現在のCPCでは、理論上、目標利益の達成が困難です。CPCを下げる必要があります。
                  </p>
                )}
                {inputs.currentCvr !== null && (
                  <>
                    <p className="mt-3 text-sm text-zinc-600">
                      現在{fmtPct(inputs.currentCvr, 2)} → 必要{fmtPct(result.requiredCvr, 2)}
                    </p>
                    <p
                      className={`text-lg font-semibold ${result.cvrGapPt !== null && result.cvrGapPt > 0 ? "text-red-600" : "text-green-700"}`}
                    >
                      {result.cvrGapPt !== null && result.cvrGapPt > 0
                        ? `あと${fmtPt(result.cvrGapPt)}必要`
                        : "目標を達成しています"}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[result.status].style}`}
                    >
                      {STATUS_STYLES[result.status].label}
                    </span>
                  </>
                )}
              </div>

              <ToolSection step="4" title="CPA・ROAS">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="広告前利益" value={fmtYen(result.preAdProfit)} />
                  <StatTile label="CPA上限（目標利益維持）" value={fmtYen(result.maxCpa)} />
                  <StatTile label="損益分岐CPA" value={fmtYen(result.breakEvenCpa)} />
                  <StatTile label="損益分岐CVR" value={fmtPct(result.breakEvenCvr, 2)} />
                </div>
                {inputs.currentCvr !== null && (
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="現在CPA（推計）" value={fmtYen(result.currentEstimatedCpa)} />
                    <StatTile label="現在ROAS（推計）" value={fmtPct(result.currentEstimatedRoas)} />
                  </div>
                )}
                <StatTile label="必要ROAS" value={fmtPct(result.requiredRoas)} />
              </ToolSection>

              {inputs.currentCvr !== null && result.cvrGapPt !== null && result.cvrGapPt > 0 && (
                <ToolSection step="5" title="改善選択肢">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-xs font-semibold text-zinc-500">CVRを改善する場合</p>
                      <p className="mt-1 text-sm text-zinc-700">{fmtPct(inputs.currentCvr, 2)}</p>
                      <p className="text-lg font-bold text-zinc-900">↓ {fmtPct(result.requiredCvr, 2)}以上</p>
                      {result.cvrImprovementRate !== null && (
                        <p className="text-xs text-zinc-500">相対 {fmtRelativePct(result.cvrImprovementRate)}改善</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-xs font-semibold text-zinc-500">CPCを調整する場合</p>
                      <p className="mt-1 text-sm text-zinc-700">{fmtYen(inputs.cpc)}</p>
                      <p className="text-lg font-bold text-zinc-900">↓ {fmtYen(result.maxCpcAtCurrentCvr)}以下</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    どちらが現実的かは商品・競争環境によって異なります。本ツールは必要条件の比較のみを示します。
                  </p>
                </ToolSection>
              )}

              <p className="text-xs text-zinc-400">
                本ツールは商品ページ改善で実際にCVRが何％になるか、CPCを下げてもクリック量を維持できるかを予測するものではありません。現在の利益構造で目標利益を確保するために必要なCVRのみを算出します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

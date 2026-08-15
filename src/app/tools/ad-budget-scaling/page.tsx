"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  AdBudgetScalingInputs,
  AdBudgetStatus,
  DEFAULT_AD_BUDGET_SCALING_INPUTS,
  computeAdBudgetScaling,
  validateInputs,
} from "@/lib/adBudgetScalingSimulator";

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
function fmtPctSigned(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

const STATUS_STYLES: Record<AdBudgetStatus, { label: string; style: string }> = {
  achieved: { label: "目標利益達成", style: "bg-green-100 text-green-700" },
  "profitable-below-target": { label: "黒字・目標利益未達", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字圏", style: "bg-red-100 text-red-700" },
  "no-assumed-roas": { label: "想定ROAS未入力", style: "bg-zinc-100 text-zinc-600" },
  unreachable: { label: "算出不可", style: "bg-red-100 text-red-700" },
};

export default function AdBudgetScalingPage() {
  const [inputs, setInputs] = useState<AdBudgetScalingInputs>(DEFAULT_AD_BUDGET_SCALING_INPUTS);
  const [hasAssumedRoas, setHasAssumedRoas] = useState(false);

  const update = (patch: Partial<AdBudgetScalingInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeAdBudgetScaling(inputs), [inputs]);

  const handleReset = () => {
    setInputs(DEFAULT_AD_BUDGET_SCALING_INPUTS);
    setHasAssumedRoas(false);
  };

  const summaryText = () =>
    [
      `現在広告費: ${fmtYen(inputs.currentAdCost)} → 増額後: ${fmtYen(inputs.targetAdBudget)}（${fmtYenSigned(result.targetBudgetIncrease)} / ${fmtPctSigned(result.targetBudgetIncreaseRate)}）`,
      `現在広告売上: ${fmtYen(inputs.currentAdSales)} / 現在ROAS: ${fmtPct(result.currentRoas)} / 現在利益率: ${fmtPct(result.currentProfitRate)}`,
      result.requiredSales !== null
        ? `必要広告売上: ${fmtYen(result.requiredSales)}以上（必要ROAS ${fmtPct(result.requiredRoas)}）`
        : "必要広告売上: 算出不可",
      result.breakEvenSales !== null ? `損益分岐売上: ${fmtYen(result.breakEvenSales)}（損益分岐ROAS ${fmtPct(result.breakEvenRoas)}）` : "",
      inputs.assumedRoas !== null
        ? `想定ROAS ${fmtPct(inputs.assumedRoas)} 時の利益: ${fmtYen(result.assumedScenarioProfit)}（${fmtPct(result.assumedScenarioProfitRate)}）`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">広告予算増額シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在広告費・広告売上・原価率・販売関連費率・最低利益率・増額後広告費を入力するだけで、「その予算まで増額するなら、最低どのROAS・売上が必要か」を即座に算出します。増額後の売上・ROASを予測するものではなく、必要条件のみを示します。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="現在の広告実績">
            <NumberField
              label="現在広告費"
              value={inputs.currentAdCost}
              onChange={(v) => update({ currentAdCost: v })}
              prefix="¥"
              error={issueMap.get("currentAdCost")}
            />
            <NumberField
              label="現在広告売上"
              value={inputs.currentAdSales}
              onChange={(v) => update({ currentAdSales: v })}
              prefix="¥"
              error={issueMap.get("currentAdSales")}
            />
          </ToolSection>

          <ToolSection step="2" title="商品採算">
            <NumberField
              label="原価率（広告売上基準の平均原価率）"
              value={inputs.costRate}
              onChange={(v) => update({ costRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("costRate")}
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

          <ToolSection step="3" title="増額案">
            <NumberField
              label="増額後広告費"
              value={inputs.targetAdBudget}
              onChange={(v) => update({ targetAdBudget: v })}
              prefix="¥"
              error={issueMap.get("targetAdBudget")}
            />
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={hasAssumedRoas}
                  onChange={(e) => {
                    setHasAssumedRoas(e.target.checked);
                    update({ assumedRoas: e.target.checked ? result.currentRoas ?? 0 : null });
                  }}
                />
                想定ROASを入力する（任意・判定に使用）
              </label>
              {hasAssumedRoas && (
                <NumberField
                  label="増額後の想定ROAS"
                  value={inputs.assumedRoas ?? 0}
                  onChange={(v) => update({ assumedRoas: v })}
                  suffix="%"
                  error={issueMap.get("assumedRoas")}
                />
              )}
            </div>
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
          ) : result.isStructurallyInfeasible ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                広告費を除いても設定した最低利益率を満たせない費用構造です。
              </p>
              <p className="mt-1 text-xs text-red-600">
                理論上の上限利益率: {fmtPct(result.theoreticalMaxProfitRate)}。原価率・販売関連費率・最低利益率をご確認ください。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">
                  広告費{fmtYen(inputs.currentAdCost)} → {fmtYen(inputs.targetAdBudget)}にするなら
                </p>
                <p className="text-3xl font-bold text-zinc-900">ROAS {fmtPct(result.requiredRoas)}以上必要</p>
                <p className="mt-1 text-sm text-zinc-500">
                  広告売上 {fmtYen(result.requiredSales)}以上（利益率{fmtPct(inputs.minProfitRate)}維持）
                </p>
                {inputs.assumedRoas !== null && (
                  <>
                    <p className="mt-3 text-sm text-zinc-600">
                      現在ROAS{fmtPct(result.currentRoas)} → 想定{fmtPct(inputs.assumedRoas)}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[result.status].style}`}
                    >
                      {STATUS_STYLES[result.status].label}
                    </span>
                  </>
                )}
              </div>

              {result.isCurrentBelowTarget && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  現在条件の時点で最低利益率を下回っています（現在利益率 {fmtPct(result.currentProfitRate)}）。
                </div>
              )}

              <ToolSection step="4" title="増額幅">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="増額額" value={fmtYenSigned(result.targetBudgetIncrease)} />
                  <StatTile label="増額率" value={fmtPctSigned(result.targetBudgetIncreaseRate)} />
                </div>
              </ToolSection>

              <ToolSection step="5" title="必要売上・ROAS">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="必要広告売上" value={fmtYen(result.requiredSales)} />
                  <StatTile label="必要追加売上" value={fmtYenSigned(result.requiredAdditionalSales)} />
                  <StatTile label="必要売上増加率" value={fmtPctSigned(result.requiredSalesGrowthRate)} />
                  <StatTile label="必要ROAS" value={fmtPct(result.requiredRoas)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="損益分岐売上" value={fmtYen(result.breakEvenSales)} />
                  <StatTile label="損益分岐ROAS" value={fmtPct(result.breakEvenRoas)} />
                </div>
                <p className="text-xs text-zinc-500">
                  現在ROASが維持されるとは限りません。必要ROASとの差はあくまで参考値です。
                </p>
              </ToolSection>

              <ToolSection step="6" title="現在の実績">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在ROAS" value={fmtPct(result.currentRoas)} />
                  <StatTile label="現在利益" value={fmtYen(result.currentProfit)} />
                  <StatTile label="現在利益率" value={fmtPct(result.currentProfitRate)} />
                </div>
              </ToolSection>

              {inputs.assumedRoas !== null && result.assumedScenarioProfit !== null && (
                <ToolSection step="7" title="想定シナリオの利益">
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label={`想定ROAS${fmtPct(inputs.assumedRoas)}時の利益`} value={fmtYen(result.assumedScenarioProfit)} />
                    <StatTile label="想定シナリオ利益率" value={fmtPct(result.assumedScenarioProfitRate)} />
                  </div>
                  <p className="text-xs text-zinc-500">「想定ROASが実現したと仮定した場合」の参考値です。予測値ではありません。</p>
                </ToolSection>
              )}

              <p className="text-xs text-zinc-400">
                本ツールは広告費を増やした場合に売上がいくら増えるかを予測するものではありません。設定した利益条件を成立させるために最低限必要な広告売上・ROASのみを算出します。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

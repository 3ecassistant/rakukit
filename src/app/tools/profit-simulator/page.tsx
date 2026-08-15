"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  AdCostMode,
  DEFAULT_PROFIT_INPUTS,
  MinProfitMode,
  ProfitInputs,
  computeAdLimits,
  computeMaxDiscount,
  computeMaxDiscountForTarget,
  computeProfitBreakdown,
  judgeRoas,
  validateInputs,
} from "@/lib/profitSimulator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(1)}%`;
}

const JUDGEMENT_STYLES = {
  good: { label: "採算良好", style: "bg-green-100 text-green-700" },
  caution: { label: "黒字だが目標未達", style: "bg-yellow-100 text-yellow-700" },
  danger: { label: "赤字可能性", style: "bg-red-100 text-red-700" },
} as const;

export default function ProfitSimulatorPage() {
  const [inputs, setInputs] = useState<ProfitInputs>(DEFAULT_PROFIT_INPUTS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<ProfitInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const breakdown = useMemo(() => computeProfitBreakdown(inputs), [inputs]);
  const adLimits = useMemo(() => computeAdLimits(inputs, breakdown), [inputs, breakdown]);
  const maxDiscount = useMemo(() => computeMaxDiscount(inputs), [inputs]);
  const maxDiscountForTarget = useMemo(() => computeMaxDiscountForTarget(inputs), [inputs]);

  const currentRoas =
    breakdown.adCost > 0 ? (breakdown.actualSellingPrice / breakdown.adCost) * 100 : null;
  const roasJudgement = judgeRoas(currentRoas, adLimits.breakEvenRoas, adLimits.targetRoas);

  const handleReset = () => setInputs(DEFAULT_PROFIT_INPUTS);

  const summaryText = () =>
    [
      `販売価格: ${fmtYen(inputs.sellingPrice)}`,
      `クーポン: ${fmtYen(inputs.couponDiscount)}`,
      `1注文あたり利益: ${fmtYen(breakdown.profit)}`,
      `利益率: ${fmtPct(breakdown.profitRate)}`,
      `損益分岐ROAS: ${fmtPct(adLimits.breakEvenRoas)}`,
      `最大値引率: ${fmtPct(maxDiscount.maxDiscountRate)}`,
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">利益・値引きシミュレーター</h1>
        <p className="text-sm text-zinc-500">
          販売価格・原価・送料・ポイント・クーポン・広告費を入力すると、1注文あたりの利益と「あといくら値引き・広告費を使えるか」を即座に計算します。すべて税込金額で入力してください。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="売価・原価">
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
          </ToolSection>

          <ToolSection step="2" title="販促">
            <NumberField
              label="ポイント負担率"
              value={inputs.pointRate}
              onChange={(v) => update({ pointRate: v })}
              suffix="%"
              step={0.1}
              error={issueMap.get("pointRate")}
            />
            <NumberField
              label="クーポン（値引額）"
              value={inputs.couponDiscount}
              onChange={(v) => update({ couponDiscount: v })}
              prefix="¥"
              error={issueMap.get("couponDiscount")}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm text-zinc-600">広告費</span>
              <div className="flex gap-2">
                {(["fixed", "roas"] as AdCostMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update({ adCostMode: mode })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      inputs.adCostMode === mode
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-zinc-300 text-zinc-600 hover:border-red-400"
                    }`}
                  >
                    {mode === "fixed" ? "1注文あたり金額" : "ROASから逆算"}
                  </button>
                ))}
              </div>
              {inputs.adCostMode === "fixed" ? (
                <NumberField
                  label="広告費（1注文あたり）"
                  value={inputs.adCostFixed}
                  onChange={(v) => update({ adCostFixed: v })}
                  prefix="¥"
                  error={issueMap.get("adCostFixed")}
                />
              ) : (
                <NumberField
                  label="ROAS"
                  value={inputs.adRoas}
                  onChange={(v) => update({ adRoas: v })}
                  suffix="%"
                  error={issueMap.get("adRoas")}
                />
              )}
            </div>
          </ToolSection>

          <ToolSection step="3" title="最低利益ライン">
            <div className="flex gap-2">
              {(["rate", "amount"] as MinProfitMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update({ minProfitMode: mode })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    inputs.minProfitMode === mode
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-red-400"
                  }`}
                >
                  {mode === "rate" ? "利益率で設定" : "利益額で設定"}
                </button>
              ))}
            </div>
            {inputs.minProfitMode === "rate" ? (
              <NumberField
                label="最低利益率"
                value={inputs.minProfitRate}
                onChange={(v) => update({ minProfitRate: v })}
                suffix="%"
              />
            ) : (
              <NumberField
                label="最低利益額"
                value={inputs.minProfitAmount}
                onChange={(v) => update({ minProfitAmount: v })}
                prefix="¥"
              />
            )}
          </ToolSection>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="self-start text-sm text-zinc-500 underline hover:text-red-600"
          >
            {showAdvanced ? "詳細設定を閉じる" : "詳細設定を開く（その他原価・販売関連費）"}
          </button>

          {showAdvanced && (
            <ToolSection step="●" title="詳細設定">
              <NumberField
                label="その他原価（梱包・物流費など）"
                value={inputs.otherCost}
                onChange={(v) => update({ otherCost: v })}
                prefix="¥"
                error={issueMap.get("otherCost")}
              />
              <NumberField
                label="販売関連費率（モール手数料・決済手数料など）"
                value={inputs.marketplaceCostRate}
                onChange={(v) => update({ marketplaceCostRate: v })}
                suffix="%"
                step={0.1}
                error={issueMap.get("marketplaceCostRate")}
              />
            </ToolSection>
          )}

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
              <div className="rounded-lg border border-zinc-200 bg-white p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-zinc-400">1注文あたり利益</p>
                    <p className={`text-3xl font-bold ${breakdown.profit < 0 ? "text-red-600" : "text-zinc-900"}`}>
                      {fmtYen(breakdown.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">利益率</p>
                    <p className={`text-3xl font-bold ${breakdown.profit < 0 ? "text-red-600" : "text-zinc-900"}`}>
                      {fmtPct(breakdown.profitRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">損益分岐ROAS</p>
                    <p className="text-2xl font-black text-zinc-900">
                      {adLimits.alreadyUnprofitableBeforeAds ? "広告費0でも赤字" : fmtPct(adLimits.breakEvenRoas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">最大値引率</p>
                    <p className="text-2xl font-black text-zinc-900">{fmtPct(maxDiscount.maxDiscountRate)}</p>
                  </div>
                </div>
                {breakdown.profit < 0 && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    現在の条件では1注文あたり赤字です。主なコストは広告費 {fmtYen(breakdown.adCost)}・送料{" "}
                    {fmtYen(breakdown.shipping)} です。
                  </p>
                )}
              </div>

              <ToolSection step="4" title="利益内訳">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-zinc-700">
                    <span>実売価格（クーポン控除後）</span>
                    <span>{fmtYen(breakdown.actualSellingPrice)}</span>
                  </div>
                  {[
                    ["商品原価", -breakdown.cost],
                    ["送料", -breakdown.shipping],
                    ["その他原価", -breakdown.otherCost],
                    ["ポイント負担", -breakdown.pointCost],
                    ["販売関連費", -breakdown.marketplaceCost],
                    ["広告費", -breakdown.adCost],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-zinc-500">
                      <span>{label}</span>
                      <span>{fmtYen(value as number)}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1 font-semibold text-zinc-900">
                    <span>利益</span>
                    <span>{fmtYen(breakdown.profit)}</span>
                  </div>
                </div>

                <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                  {[
                    ["bg-zinc-400", breakdown.costRatios.cost],
                    ["bg-zinc-300", breakdown.costRatios.shipping + breakdown.costRatios.otherCost],
                    ["bg-yellow-400", breakdown.costRatios.pointCost],
                    ["bg-orange-400", breakdown.costRatios.marketplaceCost],
                    ["bg-red-400", breakdown.costRatios.adCost],
                    ["bg-green-400", Math.max(0, breakdown.costRatios.profit)],
                  ].map(([color, ratio], i) => (
                    <div key={i} className={color as string} style={{ width: `${Math.max(0, ratio as number)}%` }} />
                  ))}
                </div>
                <p className="text-xs text-zinc-400">
                  広告前利益: {fmtYen(breakdown.profitBeforeAds)}（原価・送料・ポイント・販売関連費を引いた後、広告費を引く前の利益）
                </p>
              </ToolSection>

              <ToolSection step="5" title="広告・ROASの目安">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <StatTile
                    label="赤字にならない広告費上限"
                    value={adLimits.maxAdCost === null ? "¥0" : fmtYen(adLimits.maxAdCost)}
                  />
                  <StatTile
                    label="目標利益を維持できる広告費上限"
                    value={adLimits.maxAdCostForTarget === null ? "-" : fmtYen(adLimits.maxAdCostForTarget)}
                  />
                  <StatTile label="現在の想定ROAS" value={fmtPct(currentRoas)} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${JUDGEMENT_STYLES[roasJudgement].style}`}>
                    {JUDGEMENT_STYLES[roasJudgement].label}
                  </span>
                  <span className="text-xs text-zinc-400">
                    赤字ライン {adLimits.alreadyUnprofitableBeforeAds ? "-" : fmtPct(adLimits.breakEvenRoas)} ／ 目標利益ライン{" "}
                    {fmtPct(adLimits.targetRoas)} ／ 現在 {fmtPct(currentRoas)}
                  </span>
                </div>
                {!adLimits.alreadyUnprofitableBeforeAds && adLimits.breakEvenRoas !== null && (
                  <p className="text-xs text-zinc-500">
                    損益分岐ROAS {fmtPct(adLimits.breakEvenRoas)} → ROASがこれを下回ると、現在入力した費用条件では1注文あたり利益がマイナスになります。
                  </p>
                )}
              </ToolSection>

              <ToolSection step="6" title="値引き余力">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <StatTile
                    label="利益0円になるまでの最大値引率"
                    value={maxDiscount.alreadyBelowTarget ? "0%（既に赤字）" : fmtPct(maxDiscount.maxDiscountRate)}
                  />
                  <StatTile
                    label="最低利益ラインを維持できる最大値引率"
                    value={
                      maxDiscountForTarget.alreadyBelowTarget
                        ? "0%（既に最低利益未達）"
                        : fmtPct(maxDiscountForTarget.maxDiscountRate)
                    }
                  />
                </div>
                {maxDiscountForTarget.alreadyBelowTarget && (
                  <p className="text-xs text-yellow-700">
                    現在価格の時点で設定した最低利益ラインを下回っています。
                  </p>
                )}
              </ToolSection>

              <p className="text-xs text-zinc-400">
                この結果は入力された原価・送料・ポイント負担・広告費等をもとにした概算です（推定利益／注文）。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

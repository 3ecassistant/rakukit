"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  ComparisonBaseInputs,
  DEFAULT_BASE_INPUTS,
  MAX_EXTRA_SCENARIOS,
  PromotionResult,
  PromotionScenario,
  ScenarioType,
  compareScenarios,
  createNoneScenario,
  createScenario,
  validateScenario,
} from "@/lib/promotionComparator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(1)}%`;
}

const TYPE_LABELS: Record<ScenarioType, string> = {
  none: "通常販売",
  "coupon-fixed": "金額OFFクーポン",
  "coupon-percent": "%OFFクーポン",
  point: "ポイント施策",
};

const STATUS_STYLES: Record<PromotionResult["status"], { label: string; style: string }> = {
  ok: { label: "採算OK", style: "bg-green-100 text-green-700" },
  caution: { label: "注意", style: "bg-yellow-100 text-yellow-700" },
  deficit: { label: "赤字", style: "bg-red-100 text-red-700" },
};

const PRESETS: { type: Exclude<ScenarioType, "none">; name: string; patch: Partial<PromotionScenario> }[] = [
  { type: "coupon-fixed", name: "500円OFFクーポン", patch: { couponAmount: 500 } },
  { type: "coupon-percent", name: "10%OFFクーポン", patch: { couponRate: 10 } },
  { type: "point", name: "ポイント10%還元", patch: { customerPointRate: 10, storePointCostRate: 10 } },
];

export default function PromotionComparatorPage() {
  const [base, setBase] = useState<ComparisonBaseInputs>(DEFAULT_BASE_INPUTS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<PromotionScenario[]>(() => [
    createScenario("coupon-fixed", "500円OFFクーポン"),
    createScenario("coupon-percent", "10%OFFクーポン"),
    createScenario("point", "ポイント10%還元"),
  ]);

  const updateBase = (patch: Partial<ComparisonBaseInputs>) => setBase((prev) => ({ ...prev, ...patch }));
  const updateScenario = (id: string, patch: Partial<PromotionScenario>) =>
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeScenario = (id: string) => setScenarios((prev) => prev.filter((s) => s.id !== id));
  const addScenario = (preset: (typeof PRESETS)[number]) => {
    if (scenarios.length >= MAX_EXTRA_SCENARIOS) return;
    setScenarios((prev) => [...prev, { ...createScenario(preset.type, preset.name), ...preset.patch }]);
  };
  const addBlank = (type: Exclude<ScenarioType, "none">) => {
    if (scenarios.length >= MAX_EXTRA_SCENARIOS) return;
    setScenarios((prev) => [...prev, createScenario(type, TYPE_LABELS[type])]);
  };
  const handleReset = () => {
    setBase(DEFAULT_BASE_INPUTS);
    setScenarios([
      createScenario("coupon-fixed", "500円OFFクーポン"),
      createScenario("coupon-percent", "10%OFFクーポン"),
      createScenario("point", "ポイント10%還元"),
    ]);
  };

  const issues = useMemo(
    () => scenarios.flatMap((s) => validateScenario(s, base.sellingPrice)),
    [scenarios, base.sellingPrice]
  );
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.scenarioId, i.message));
    return map;
  }, [issues]);

  const allScenarios = useMemo(() => [createNoneScenario(), ...scenarios], [scenarios]);
  const summary = useMemo(() => compareScenarios(base, allScenarios), [base, allScenarios]);

  const summaryText = () =>
    [
      `販売価格: ${fmtYen(base.sellingPrice)} / 原価: ${fmtYen(base.cost)} / 送料: ${fmtYen(base.shipping)}`,
      ...summary.results.map(
        (r) =>
          `${r.scenario.name}: 顧客支払額 ${fmtYen(r.customerPayment)} / 顧客還元額 ${fmtYen(
            r.customerRewardAmount
          )}（${fmtPct(r.customerRewardRate)}） / 店舗負担 ${fmtYen(r.storeBurdenAmount)} / 利益 ${fmtYen(
            r.profit
          )}（${fmtPct(r.profitRate)}） / 通常比 ${fmtYen(r.profitDifference)} / 判定 ${STATUS_STYLES[r.status].label}`
      ),
      summary.bestProfit ? `最も利益が残る施策: ${summary.bestProfit.scenario.name}` : "",
      summary.bestReward ? `顧客還元が最大の施策: ${summary.bestReward.scenario.name}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">ポイント vs クーポン比較</h1>
        <p className="text-sm text-zinc-500">
          金額OFFクーポン・%OFFクーポン・ポイント還元など、複数の販促施策を同じ条件で並べて比較し、店舗の利益への影響を確認します。すべて税込金額で入力してください。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="共通条件（すべての施策に適用）">
            <NumberField
              label="販売価格"
              value={base.sellingPrice}
              onChange={(v) => updateBase({ sellingPrice: v })}
              prefix="¥"
            />
            <NumberField label="商品原価" value={base.cost} onChange={(v) => updateBase({ cost: v })} prefix="¥" />
            <NumberField label="送料" value={base.shipping} onChange={(v) => updateBase({ shipping: v })} prefix="¥" />
            <NumberField
              label="基本ポイント負担率（通常時・クーポン時）"
              value={base.basePointRate}
              onChange={(v) => updateBase({ basePointRate: v })}
              suffix="%"
              step={0.1}
            />
            <NumberField
              label="最低利益率"
              value={base.minProfitRate}
              onChange={(v) => updateBase({ minProfitRate: v })}
              suffix="%"
            />
          </ToolSection>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="self-start text-sm text-zinc-500 underline hover:text-red-600"
          >
            {showAdvanced ? "詳細設定を閉じる" : "詳細設定を開く（その他原価・販売関連費・広告費）"}
          </button>

          {showAdvanced && (
            <ToolSection step="●" title="詳細設定">
              <NumberField
                label="その他原価（梱包・物流費など）"
                value={base.otherCost}
                onChange={(v) => updateBase({ otherCost: v })}
                prefix="¥"
              />
              <NumberField
                label="販売関連費率（モール手数料・決済手数料など）"
                value={base.marketplaceCostRate}
                onChange={(v) => updateBase({ marketplaceCostRate: v })}
                suffix="%"
                step={0.1}
              />
              <NumberField
                label="広告費（1注文あたり）"
                value={base.adCostFixed}
                onChange={(v) => updateBase({ adCostFixed: v })}
                prefix="¥"
              />
            </ToolSection>
          )}

          <ToolSection step="2" title={`比較する施策（通常販売＋最大${MAX_EXTRA_SCENARIOS}件）`}>
            <div className="flex flex-col gap-3">
              {scenarios.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  error={issueMap.get(s.id)}
                  onChange={(patch) => updateScenario(s.id, patch)}
                  onRemove={() => removeScenario(s.id)}
                />
              ))}
            </div>

            {scenarios.length < MAX_EXTRA_SCENARIOS ? (
              <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
                <span className="text-xs text-zinc-400">よく使う施策を追加</span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => addScenario(p)}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-red-400 hover:text-red-600"
                    >
                      + {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => addBlank("coupon-fixed")}
                    className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 hover:border-red-400 hover:text-red-600"
                  >
                    + 金額OFFを追加
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlank("coupon-percent")}
                    className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 hover:border-red-400 hover:text-red-600"
                  >
                    + %OFFを追加
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlank("point")}
                    className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 hover:border-red-400 hover:text-red-600"
                  >
                    + ポイントを追加
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                施策は最大{MAX_EXTRA_SCENARIOS}件まで比較できます（通常販売を除く）。
              </p>
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
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <StatTile
                label="最も利益が残る施策"
                value={summary.bestProfit ? summary.bestProfit.scenario.name : "-"}
              />
              <StatTile label="顧客還元が最大の施策" value={summary.bestReward ? summary.bestReward.scenario.name : "-"} />
            </div>
          </div>

          <ToolSection step="3" title="比較結果">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
                    <th className="py-2 pr-3">施策名</th>
                    <th className="py-2 pr-3">顧客支払額</th>
                    <th className="py-2 pr-3">顧客還元額</th>
                    <th className="py-2 pr-3">還元率</th>
                    <th className="py-2 pr-3">実質負担相当</th>
                    <th className="py-2 pr-3">店舗負担額</th>
                    <th className="py-2 pr-3">利益</th>
                    <th className="py-2 pr-3">利益率</th>
                    <th className="py-2 pr-3">通常比</th>
                    <th className="py-2 pr-3">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.results.map((r) => {
                    const isBest = summary.bestProfit?.scenario.id === r.scenario.id && r.scenario.type !== "none";
                    return (
                      <tr
                        key={r.scenario.id}
                        className={`border-b border-zinc-100 ${isBest ? "bg-green-50" : ""}`}
                      >
                        <td className="py-2 pr-3 font-medium text-zinc-800">
                          {r.scenario.name}
                          <span className="ml-1 text-[10px] text-zinc-400">
                            ({TYPE_LABELS[r.scenario.type]})
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-zinc-600">{fmtYen(r.customerPayment)}</td>
                        <td className="py-2 pr-3 text-zinc-600">{fmtYen(r.customerRewardAmount)}</td>
                        <td className="py-2 pr-3 text-zinc-600">{fmtPct(r.customerRewardRate)}</td>
                        <td className="py-2 pr-3 text-zinc-600">{fmtYen(r.effectiveCustomerCost)}</td>
                        <td className="py-2 pr-3 text-zinc-600">{fmtYen(r.storeBurdenAmount)}</td>
                        <td className={`py-2 pr-3 font-semibold ${r.profit < 0 ? "text-red-600" : "text-zinc-900"}`}>
                          {fmtYen(r.profit)}
                        </td>
                        <td className="py-2 pr-3 text-zinc-600">{fmtPct(r.profitRate)}</td>
                        <td
                          className={`py-2 pr-3 ${
                            r.scenario.type === "none"
                              ? "text-zinc-400"
                              : r.profitDifference < 0
                                ? "text-red-600"
                                : "text-green-700"
                          }`}
                        >
                          {r.scenario.type === "none" ? "-" : fmtYen(r.profitDifference)}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[r.status].style}`}>
                            {STATUS_STYLES[r.status].label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400">
              ポイント施策は「顧客支払額」は変わらず、後からポイントとして還元される点にご注意ください（実際の値引きではありません）。「実質負担相当」は還元を踏まえた顧客の実質的な負担感の目安です。
            </p>
          </ToolSection>

          <p className="text-xs text-zinc-400">
            この結果は入力された原価・送料・ポイント負担・販売関連費等をもとにした概算です（推定利益／注文）。
          </p>

          <CopyButton getText={summaryText} label="結果をコピー" />
        </div>
      </div>
    </main>
  );
}

function ScenarioCard({
  scenario,
  error,
  onChange,
  onRemove,
}: {
  scenario: PromotionScenario;
  error?: string;
  onChange: (patch: Partial<PromotionScenario>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={scenario.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-800 outline-none focus:border-red-400"
        />
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
          {TYPE_LABELS[scenario.type]}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600"
        >
          削除
        </button>
      </div>

      {scenario.type === "coupon-fixed" && (
        <NumberField
          label="クーポン額"
          value={scenario.couponAmount}
          onChange={(v) => onChange({ couponAmount: v })}
          prefix="¥"
          error={error}
        />
      )}
      {scenario.type === "coupon-percent" && (
        <NumberField
          label="クーポン率"
          value={scenario.couponRate}
          onChange={(v) => onChange({ couponRate: v })}
          suffix="%"
          step={0.1}
          error={error}
        />
      )}
      {scenario.type === "point" && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="顧客還元率"
            value={scenario.customerPointRate}
            onChange={(v) => onChange({ customerPointRate: v })}
            suffix="%"
            step={0.1}
            error={error}
          />
          <NumberField
            label="店舗負担率"
            value={scenario.storePointCostRate}
            onChange={(v) => onChange({ storePointCostRate: v })}
            suffix="%"
            step={0.1}
          />
        </div>
      )}
    </div>
  );
}

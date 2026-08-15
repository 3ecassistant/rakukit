"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_FREE_SHIPPING_THRESHOLD_AOV_INPUTS,
  FreeShippingThresholdAovInputs,
  computeFreeShippingThresholdAov,
  validateInputs,
} from "@/lib/freeShippingThresholdAovCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtYenSigned(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  const r = Math.round(v);
  return `${r >= 0 ? "+" : ""}¥${r.toLocaleString()}`;
}
function fmtPctSigned(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export default function FreeShippingThresholdAovPage() {
  const [inputs, setInputs] = useState<FreeShippingThresholdAovInputs>(DEFAULT_FREE_SHIPPING_THRESHOLD_AOV_INPUTS);
  const [hasCurrentThreshold, setHasCurrentThreshold] = useState(true);

  const update = (patch: Partial<FreeShippingThresholdAovInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeFreeShippingThresholdAov(inputs), [inputs]);

  const handleReset = () => {
    setInputs(DEFAULT_FREE_SHIPPING_THRESHOLD_AOV_INPUTS);
    setHasCurrentThreshold(true);
  };

  const summaryText = () =>
    [
      `現在客単価: ${fmtYen(inputs.currentAov)} / 送料無料ライン: ${fmtYen(inputs.targetThreshold)}`,
      result.requiredAovIncrease > 0
        ? `あと${fmtYenSigned(result.requiredAovIncrease)}必要（現在比${fmtPctSigned(result.requiredAovGrowthRate)}）`
        : result.isCurrentAovEqualThreshold
          ? "現在客単価は送料無料ラインと同水準です。"
          : `現在客単価が送料無料ラインを${fmtYen(result.marginAboveThreshold)}上回っています。`,
      inputs.currentThreshold !== null
        ? `現在の送料無料ラインとの差: ${fmtYenSigned(result.thresholdDifference)}（${fmtPctSigned(result.thresholdChangeRate)}）`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">送料無料ライン目標・必要客単価シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在客単価と検討中の送料無料ラインを入力するだけで、「送料無料ラインと同水準のAOVまで、あと何円・何％必要か」を算出します。送料無料ラインにすればAOVが上がる、という予測ではありません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="客単価・送料無料ライン">
            <NumberField
              label="現在客単価"
              value={inputs.currentAov}
              onChange={(v) => update({ currentAov: v })}
              prefix="¥"
              error={issueMap.get("currentAov")}
            />
            <NumberField
              label="新しい送料無料ライン"
              value={inputs.targetThreshold}
              onChange={(v) => update({ targetThreshold: v })}
              prefix="¥"
              error={issueMap.get("targetThreshold")}
            />
          </ToolSection>

          <ToolSection step="2" title="現在の送料無料ライン（任意）">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={hasCurrentThreshold}
                onChange={(e) => {
                  setHasCurrentThreshold(e.target.checked);
                  update({
                    currentThreshold: e.target.checked ? DEFAULT_FREE_SHIPPING_THRESHOLD_AOV_INPUTS.currentThreshold : null,
                  });
                }}
              />
              現在の送料無料ラインを入力する
            </label>
            {hasCurrentThreshold && (
              <NumberField
                label="現在の送料無料ライン"
                value={inputs.currentThreshold ?? 0}
                onChange={(v) => update({ currentThreshold: v })}
                prefix="¥"
                error={issueMap.get("currentThreshold")}
              />
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
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">送料無料ライン{fmtYen(inputs.targetThreshold)}まで</p>
                {result.requiredAovIncrease > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-zinc-900">あと{fmtYenSigned(result.requiredAovIncrease)}必要</p>
                    <p className="mt-1 text-sm text-zinc-500">現在比{fmtPctSigned(result.requiredAovGrowthRate)}</p>
                  </>
                ) : result.isCurrentAovEqualThreshold ? (
                  <p className="text-2xl font-bold text-green-700">現在客単価と同水準です</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-700">
                      現在客単価が{fmtYen(result.marginAboveThreshold)}上回っています
                    </p>
                  </>
                )}
              </div>

              {inputs.currentThreshold !== null && (
                <ToolSection step="3" title="現在の送料無料ラインとの差">
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="ライン差額" value={fmtYenSigned(result.thresholdDifference)} />
                    <StatTile label="ライン変更率" value={fmtPctSigned(result.thresholdChangeRate)} />
                  </div>
                </ToolSection>
              )}

              <p className="text-xs text-zinc-400">
                平均客単価が送料無料ライン以上でも、すべての注文が送料無料条件を満たすとは限りません。本ツールは送料無料ラインを必要AOVへ変換するだけで、送料無料対象注文率そのものは予測しません。
              </p>

              <p className="text-xs text-zinc-500">
                このAOVを達成するための必要まとめ買い率は{" "}
                <Link href="/tools/bulk-purchase-rate" className="underline hover:text-red-600">
                  客単価目標・必要まとめ買い率シミュレーター
                </Link>{" "}
                で確認できます。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

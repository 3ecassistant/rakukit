"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  BulkPurchaseRateInputs,
  DEFAULT_BULK_PURCHASE_RATE_INPUTS,
  computeBulkPurchaseRate,
  validateInputs,
} from "@/lib/bulkPurchaseRateCalculator";

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `¥${Math.round(v).toLocaleString()}`;
}
function fmtYenSigned(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  const r = Math.round(v);
  return `${r >= 0 ? "+" : ""}¥${r.toLocaleString()}`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(digits)}%`;
}
function fmtPctSigned(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export default function BulkPurchaseRatePage() {
  const [inputs, setInputs] = useState<BulkPurchaseRateInputs>(DEFAULT_BULK_PURCHASE_RATE_INPUTS);
  const [hasCurrentAov, setHasCurrentAov] = useState(true);

  const update = (patch: Partial<BulkPurchaseRateInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeBulkPurchaseRate(inputs), [inputs]);

  const handleReset = () => {
    setInputs(DEFAULT_BULK_PURCHASE_RATE_INPUTS);
    setHasCurrentAov(true);
  };

  const summaryText = () =>
    [
      `1個購入: ${fmtYen(inputs.baseOrderValue)} / まとめ買い: ${fmtYen(inputs.bulkOrderValue)} / 目標客単価: ${fmtYen(inputs.targetAov)}`,
      result.requiredBulkRatePercent !== null
        ? `必要まとめ買い率: ${fmtPct(result.requiredBulkRatePercent)}（100注文換算 ${result.bulkOrdersPer100}件）`
        : "必要まとめ買い率: 算出不可",
      inputs.currentAov !== null
        ? `現在客単価: ${fmtYen(inputs.currentAov)} / 目標との差: ${fmtYenSigned(result.currentAovGap)}（${fmtPctSigned(result.requiredAovGrowthRate)}）`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">客単価目標・必要まとめ買い率シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          1個購入の注文金額・まとめ買い時の注文金額・目標客単価を入力するだけで、「目標客単価を成立させるにはまとめ買い注文が全注文の何％必要か」を逆算します。本ツールは設定した注文金額と注文構成比に基づく算術シミュレーションであり、まとめ買い率や客単価が実際にこの数値になることを予測するものではありません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="注文金額・目標">
            <NumberField
              label="1個購入時の注文金額"
              value={inputs.baseOrderValue}
              onChange={(v) => update({ baseOrderValue: v })}
              prefix="¥"
              error={issueMap.get("baseOrderValue")}
            />
            <NumberField
              label="まとめ買い時の注文金額"
              value={inputs.bulkOrderValue}
              onChange={(v) => update({ bulkOrderValue: v })}
              prefix="¥"
              error={issueMap.get("bulkOrderValue")}
            />
            <NumberField
              label="目標客単価"
              value={inputs.targetAov}
              onChange={(v) => update({ targetAov: v })}
              prefix="¥"
              error={issueMap.get("targetAov")}
            />
          </ToolSection>

          <ToolSection step="2" title="現在客単価（任意）">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={hasCurrentAov}
                onChange={(e) => {
                  setHasCurrentAov(e.target.checked);
                  update({ currentAov: e.target.checked ? DEFAULT_BULK_PURCHASE_RATE_INPUTS.currentAov : null });
                }}
              />
              現在客単価を入力する
            </label>
            {hasCurrentAov && (
              <NumberField
                label="現在客単価"
                value={inputs.currentAov ?? 0}
                onChange={(v) => update({ currentAov: v })}
                prefix="¥"
                error={issueMap.get("currentAov")}
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
          ) : result.isDegenerate ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-sm font-semibold text-zinc-700">
                基準注文とまとめ買い注文の金額が同じため、まとめ買い率を変更しても客単価は変化しません。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                {result.isBulkBelowBase && (
                  <p className="mb-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                    まとめ買い注文金額が基準注文金額を下回っています。入力内容をご確認ください。
                  </p>
                )}
                {!result.isReachable ? (
                  <>
                    <p className="text-sm font-semibold text-red-700">
                      設定した注文構成では目標客単価{fmtYen(inputs.targetAov)}へ到達できません
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      まとめ買い率100%時の最大客単価は{fmtYen(result.maxAov)}です（最小{fmtYen(result.minAov)}）。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">目標客単価 {fmtYen(inputs.targetAov)} を成立させるには</p>
                    <p className="text-3xl font-bold text-zinc-900">
                      まとめ買い注文が{fmtPct(result.requiredBulkRatePercent)}必要
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      100注文なら約{result.bulkOrdersPer100}注文がまとめ買いとなる構成（注文件数ベース）
                    </p>
                  </>
                )}
              </div>

              {result.isReachable && (
                <ToolSection step="3" title="注文構成比">
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="1個購入率" value={fmtPct(result.baseOrderRatePercent)} />
                    <StatTile label="まとめ買い率" value={fmtPct(result.requiredBulkRatePercent)} />
                  </div>
                </ToolSection>
              )}

              {inputs.currentAov !== null && (
                <ToolSection step="4" title="現在客単価との差">
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="目標との差額" value={fmtYenSigned(result.currentAovGap)} />
                    <StatTile label="必要上昇率" value={fmtPctSigned(result.requiredAovGrowthRate)} />
                  </div>
                </ToolSection>
              )}

              <p className="text-xs text-zinc-400">
                本ツールでいう「まとめ買い率」は全注文件数のうち、まとめ買い注文が占める割合です（注文件数ベース、販売個数ベースではありません）。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

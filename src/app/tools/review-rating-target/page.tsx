"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_REVIEW_RATING_TARGET_INPUTS,
  ReviewRatingTargetInputs,
  computeReviewRatingTarget,
  validateInputs,
} from "@/lib/reviewRatingTargetCalculator";

function fmtStar(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `★${v.toFixed(digits)}`;
}
function fmtCount(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}件`;
}
function fmtPct(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export default function ReviewRatingTargetPage() {
  const [inputs, setInputs] = useState<ReviewRatingTargetInputs>(DEFAULT_REVIEW_RATING_TARGET_INPUTS);

  const update = (patch: Partial<ReviewRatingTargetInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeReviewRatingTarget(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_REVIEW_RATING_TARGET_INPUTS);

  const summaryText = () =>
    [
      `現在: ${fmtStar(inputs.currentAverageRating)} / ${fmtCount(inputs.currentReviewCount)} → 目標: ${fmtStar(inputs.targetAverageRating)}`,
      result.requiredAdditionalReviews !== null
        ? `★5レビューがあと${fmtCount(result.requiredAdditionalReviews)}必要（目標達成時 ${fmtCount(result.targetTotalReviewCount)} / 増加率 ${fmtPct(result.reviewGrowthRate)}）`
        : "この条件では到達できません",
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">レビュー評価目標・必要★5件数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在レビュー件数・現在平均評価・目標平均評価を入力するだけで、「平均評価を目標まで上げるには★5レビューがあと何件必要か」を逆算します。今後追加されるレビューはすべて★5と仮定した計算です。レビュー獲得を予測・誘導するものではありません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ToolSection step="1" title="現在のレビュー">
            <NumberField
              label="現在レビュー件数"
              value={inputs.currentReviewCount}
              onChange={(v) => update({ currentReviewCount: v })}
              suffix="件"
              error={issueMap.get("currentReviewCount")}
            />
            <NumberField
              label="現在平均評価"
              value={inputs.currentAverageRating}
              onChange={(v) => update({ currentAverageRating: v })}
              step={0.01}
              error={issueMap.get("currentAverageRating")}
            />
          </ToolSection>

          <ToolSection step="2" title="目標">
            <NumberField
              label="目標平均評価"
              value={inputs.targetAverageRating}
              onChange={(v) => update({ targetAverageRating: v })}
              step={0.01}
              error={issueMap.get("targetAverageRating")}
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
          ) : result.isAlreadyMet ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center">
              <p className="text-lg font-semibold text-green-700">現在すでに目標評価を達成しています。</p>
              <p className="mt-1 text-sm text-green-600">必要追加: 0件</p>
            </div>
          ) : !result.isReachable ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                既存レビューに5未満の評価が含まれるため、平均{inputs.targetAverageRating.toFixed(2)}には有限件数では到達できません。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">
                  {fmtStar(inputs.currentAverageRating)} → {fmtStar(inputs.targetAverageRating)}
                </p>
                <p className="text-4xl font-bold text-zinc-900">
                  ★5評価があと{fmtCount(result.requiredAdditionalReviews)}必要
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  現在{fmtCount(inputs.currentReviewCount)} → 目標達成時{fmtCount(result.targetTotalReviewCount)}
                </p>
              </div>

              <ToolSection step="3" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在総評価点" value={result.currentTotalScore.toFixed(1)} />
                  <StatTile label="必要レビュー増加率" value={fmtPct(result.reviewGrowthRate)} />
                  <StatTile label="目標達成後レビュー件数" value={fmtCount(result.targetTotalReviewCount)} />
                  <StatTile label="達成時の平均評価" value={fmtStar(result.achievedAverageRating)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                実際の表示評価はモール側の丸め・表示仕様により、本計算結果と1件程度以上ずれる場合があります。本ツールは入力された平均評価を前提とした計算値です。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

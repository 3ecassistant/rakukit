"use client";

import { useMemo, useState } from "react";
import ToolSection from "@/components/tools/ToolSection";
import StatTile from "@/components/tools/StatTile";
import CopyButton from "@/components/tools/CopyButton";
import NumberField from "@/components/tools/profit/NumberField";
import {
  DEFAULT_LOW_RATING_IMPACT_INPUTS,
  LowRatingImpactInputs,
  computeLowRatingImpact,
  validateInputs,
} from "@/lib/lowRatingImpactCalculator";

function fmtStar(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `★${v.toFixed(digits)}`;
}
function fmtCount(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString()}件`;
}
function fmtPt(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}pt`;
}

export default function LowRatingImpactPage() {
  const [inputs, setInputs] = useState<LowRatingImpactInputs>(DEFAULT_LOW_RATING_IMPACT_INPUTS);

  const update = (patch: Partial<LowRatingImpactInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  const issues = useMemo(() => validateInputs(inputs), [inputs]);
  const issueMap = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => map.set(i.field, i.message));
    return map;
  }, [issues]);
  const hasBlockingIssue = issues.length > 0;

  const result = useMemo(() => computeLowRatingImpact(inputs), [inputs]);

  const handleReset = () => setInputs(DEFAULT_LOW_RATING_IMPACT_INPUTS);

  const summaryText = () =>
    [
      `現在: ${fmtStar(inputs.currentAverageRating)} / ${fmtCount(inputs.currentReviewCount)} に★${inputs.lowRatingScore}が${inputs.lowRatingCount}件追加`,
      `→ 新平均: ${fmtStar(result.newAverageRating)}（${fmtPt(-result.ratingDropPt)}）`,
      result.requiredRecoveryReviews !== null
        ? `元の${fmtStar(inputs.currentAverageRating)}へ戻すには★5評価があと${fmtCount(result.requiredRecoveryReviews)}必要（回復後 ${fmtCount(result.recoveredReviewCount)}）`
        : "この条件では元の評価へ回復できません",
    ].join("\n");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-zinc-900">低評価レビュー1件の影響・回復必要件数シミュレーター</h1>
        <p className="text-sm text-zinc-500">
          現在レビュー件数・平均評価・追加される低評価を入力するだけで、「低評価が入ると平均評価がどこまで下がるか」と「元の評価へ戻すには★5評価があと何件必要か」を算出します。低評価削除や高評価誘導を扱うものではなく、算術的な必要件数のみを示します。
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

          <ToolSection step="2" title="追加される低評価">
            <NumberField
              label="追加評価（★1〜★4）"
              value={inputs.lowRatingScore}
              onChange={(v) => update({ lowRatingScore: v })}
              error={issueMap.get("lowRatingScore")}
            />
            <NumberField
              label="追加件数"
              value={inputs.lowRatingCount}
              onChange={(v) => update({ lowRatingCount: v })}
              suffix="件"
              error={issueMap.get("lowRatingCount")}
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
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                <p className="text-xs text-zinc-400">
                  ★{inputs.lowRatingScore}が{inputs.lowRatingCount}件入ると
                </p>
                <p className="text-3xl font-bold text-zinc-900">
                  {fmtStar(inputs.currentAverageRating)} → {fmtStar(result.newAverageRating)}
                </p>
                <p className="mt-1 text-lg font-semibold text-red-600">評価差 {fmtPt(-result.ratingDropPt)}</p>
              </div>

              {result.isRecoveryReachable ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
                  <p className="text-xs text-zinc-400">元の{fmtStar(inputs.currentAverageRating)}へ戻すには</p>
                  <p className="text-3xl font-bold text-zinc-900">
                    ★5評価があと{fmtCount(result.requiredRecoveryReviews)}必要
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    低評価追加後{fmtCount(result.newReviewCount)} → 回復時{fmtCount(result.recoveredReviewCount)}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-5">
                  <p className="text-sm font-semibold text-red-700">
                    この条件では元の評価{fmtStar(inputs.currentAverageRating)}へ回復できません。
                  </p>
                </div>
              )}

              <ToolSection step="3" title="内訳">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="現在総評価点" value={result.currentTotalScore.toFixed(1)} />
                  <StatTile label="低評価追加後総評価点" value={result.newTotalScore.toFixed(1)} />
                  <StatTile label="低評価追加後レビュー件数" value={fmtCount(result.newReviewCount)} />
                  <StatTile label="低評価追加後平均評価" value={fmtStar(result.newAverageRating)} />
                </div>
              </ToolSection>

              <p className="text-xs text-zinc-400">
                現在平均評価から総評価点を推定しているため、実際の評価分布によって必要件数が前後する場合があります。低評価レビューの削除方法や高評価レビュー誘導は扱いません。
              </p>

              <CopyButton getText={summaryText} label="結果をコピー" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

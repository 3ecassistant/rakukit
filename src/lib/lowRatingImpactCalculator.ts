import { computeReviewRatingTarget } from "./reviewRatingTargetCalculator";

export interface LowRatingImpactInputs {
  currentReviewCount: number;
  currentAverageRating: number;
  lowRatingScore: number;
  lowRatingCount: number;
}

export const DEFAULT_LOW_RATING_IMPACT_INPUTS: LowRatingImpactInputs = {
  currentReviewCount: 100,
  currentAverageRating: 4.5,
  lowRatingScore: 1,
  lowRatingCount: 1,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: LowRatingImpactInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(inputs.currentReviewCount) || inputs.currentReviewCount < 1) {
    issues.push({ field: "currentReviewCount", message: "現在レビュー件数は1件以上の整数で入力してください。" });
  }
  if (inputs.currentAverageRating < 1 || inputs.currentAverageRating > 5) {
    issues.push({ field: "currentAverageRating", message: "現在平均評価は1.00〜5.00で入力してください。" });
  }
  if (inputs.lowRatingScore < 1 || inputs.lowRatingScore > 5) {
    issues.push({ field: "lowRatingScore", message: "追加評価は1〜5で入力してください。" });
  }
  if (!Number.isInteger(inputs.lowRatingCount) || inputs.lowRatingCount < 1) {
    issues.push({ field: "lowRatingCount", message: "追加件数は1件以上の整数で入力してください。" });
  }
  return issues;
}

export interface LowRatingImpactResult {
  currentTotalScore: number;
  newReviewCount: number;
  newTotalScore: number;
  newAverageRating: number;
  ratingDropPt: number;
  isRecoveryReachable: boolean;
  requiredRecoveryReviews: number | null;
  recoveredReviewCount: number | null;
}

/**
 * 低評価追加後の新平均を求めたら、元評価への回復計算は⑮の ReviewRatingTargetCalculator へそのまま委譲する
 * （§㊸-㊹の指示通り、回復逆算ロジックを重複実装しない）。
 */
export function computeLowRatingImpact(inputs: LowRatingImpactInputs): LowRatingImpactResult {
  const currentTotalScore = inputs.currentAverageRating * inputs.currentReviewCount;
  const newReviewCount = inputs.currentReviewCount + inputs.lowRatingCount;
  const newTotalScore = currentTotalScore + inputs.lowRatingScore * inputs.lowRatingCount;
  const newAverageRating = newTotalScore / newReviewCount;
  const ratingDropPt = inputs.currentAverageRating - newAverageRating;

  const recovery = computeReviewRatingTarget({
    currentReviewCount: newReviewCount,
    currentAverageRating: newAverageRating,
    targetAverageRating: inputs.currentAverageRating,
  });

  return {
    currentTotalScore,
    newReviewCount,
    newTotalScore,
    newAverageRating,
    ratingDropPt,
    isRecoveryReachable: recovery.isReachable,
    requiredRecoveryReviews: recovery.requiredAdditionalReviews,
    recoveredReviewCount: recovery.targetTotalReviewCount,
  };
}

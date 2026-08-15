const FUTURE_RATING = 5;

export interface ReviewRatingTargetInputs {
  currentReviewCount: number;
  currentAverageRating: number;
  targetAverageRating: number;
}

export const DEFAULT_REVIEW_RATING_TARGET_INPUTS: ReviewRatingTargetInputs = {
  currentReviewCount: 100,
  currentAverageRating: 4.3,
  targetAverageRating: 4.5,
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInputs(inputs: ReviewRatingTargetInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(inputs.currentReviewCount) || inputs.currentReviewCount < 1) {
    issues.push({ field: "currentReviewCount", message: "現在レビュー件数は1件以上の整数で入力してください（レビュー0件の新商品は今後対応予定です）。" });
  }
  if (inputs.currentAverageRating < 1 || inputs.currentAverageRating > 5) {
    issues.push({ field: "currentAverageRating", message: "現在平均評価は1.00〜5.00で入力してください。" });
  }
  if (inputs.targetAverageRating < 1 || inputs.targetAverageRating > 5) {
    issues.push({ field: "targetAverageRating", message: "目標平均評価は1.00〜5.00で入力してください。" });
  }
  return issues;
}

function newAverageAt(currentTotalScore: number, currentReviewCount: number, additionalReviews: number): number {
  return (currentTotalScore + FUTURE_RATING * additionalReviews) / (currentReviewCount + additionalReviews);
}

/**
 * required = ceil(R×(T−A)/(5−T)) を基本式としつつ、浮動小数誤差により境界がずれないよう、
 * newAverage(N) >= T かつ newAverage(N-1) < T を満たす最小Nであることを再検証する（§79-81）。
 */
function computeRequiredAdditionalReviews(currentReviewCount: number, currentAverageRating: number, targetAverageRating: number): number {
  const currentTotalScore = currentAverageRating * currentReviewCount;
  const raw =
    (currentReviewCount * (targetAverageRating - currentAverageRating)) / (FUTURE_RATING - targetAverageRating);
  let n = Math.max(0, Math.ceil(raw - 1e-9));

  while (n > 0 && newAverageAt(currentTotalScore, currentReviewCount, n - 1) >= targetAverageRating - 1e-9) {
    n -= 1;
  }
  while (newAverageAt(currentTotalScore, currentReviewCount, n) < targetAverageRating - 1e-9) {
    n += 1;
  }
  return n;
}

export interface ReviewRatingTargetResult {
  currentTotalScore: number;
  isAlreadyMet: boolean;
  isReachable: boolean;
  requiredAdditionalReviews: number | null;
  targetTotalReviewCount: number | null;
  reviewGrowthRate: number | null;
  achievedAverageRating: number | null;
}

export function computeReviewRatingTarget(inputs: ReviewRatingTargetInputs): ReviewRatingTargetResult {
  const currentTotalScore = inputs.currentAverageRating * inputs.currentReviewCount;
  const isAlreadyMet = inputs.targetAverageRating <= inputs.currentAverageRating;
  const isReachable = isAlreadyMet || inputs.targetAverageRating < FUTURE_RATING;

  if (isAlreadyMet) {
    return {
      currentTotalScore,
      isAlreadyMet: true,
      isReachable: true,
      requiredAdditionalReviews: 0,
      targetTotalReviewCount: inputs.currentReviewCount,
      reviewGrowthRate: 0,
      achievedAverageRating: inputs.currentAverageRating,
    };
  }

  if (!isReachable) {
    return {
      currentTotalScore,
      isAlreadyMet: false,
      isReachable: false,
      requiredAdditionalReviews: null,
      targetTotalReviewCount: null,
      reviewGrowthRate: null,
      achievedAverageRating: null,
    };
  }

  const requiredAdditionalReviews = computeRequiredAdditionalReviews(
    inputs.currentReviewCount,
    inputs.currentAverageRating,
    inputs.targetAverageRating
  );
  const targetTotalReviewCount = inputs.currentReviewCount + requiredAdditionalReviews;
  const reviewGrowthRate =
    inputs.currentReviewCount > 0 ? (requiredAdditionalReviews / inputs.currentReviewCount) * 100 : null;
  const achievedAverageRating = newAverageAt(currentTotalScore, inputs.currentReviewCount, requiredAdditionalReviews);

  return {
    currentTotalScore,
    isAlreadyMet: false,
    isReachable: true,
    requiredAdditionalReviews,
    targetTotalReviewCount,
    reviewGrowthRate,
    achievedAverageRating,
  };
}

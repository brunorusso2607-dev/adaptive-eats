/**
 * Utility function for calculating health score
 * Used by both useHealthStats and useHealthScoreHistory for consistency
 */

export interface HealthScoreInput {
  wellMeals: number;
  totalMeals: number;
  symptoms: number;
}

export interface HealthScoreResult {
  score: number;
  wellRatio: number;
  symptomPenalty: number;
}

/**
 * Calculates health score based on well meals ratio and symptom penalty
 * @param input - Object containing wellMeals, totalMeals, and symptoms count
 * @returns Object with calculated score (0-100), wellRatio, and symptomPenalty
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const { wellMeals, totalMeals, symptoms } = input;
  
  // No meals: default to 100 if no symptoms, otherwise penalize
  if (totalMeals === 0) {
    if (symptoms > 0) {
      const score = Math.max(0, 100 - symptoms * 15);
      return { score, wellRatio: 1, symptomPenalty: symptoms * 15 };
    }
    return { score: 100, wellRatio: 1, symptomPenalty: 0 };
  }
  
  // Calculate well meals ratio
  const wellRatio = wellMeals / totalMeals;
  
  // Symptom penalty: each symptom reduces score, max 30% penalty
  const symptomPenalty = Math.min(symptoms * 5, 30);
  
  // Calculate final score
  const calculatedScore = Math.round((wellRatio * 100) - symptomPenalty);
  const score = Math.max(0, Math.min(100, calculatedScore));
  
  return { score, wellRatio, symptomPenalty };
}

/**
 * Calculates daily health score with slightly different penalty for per-day view
 */
export function calculateDailyHealthScore(input: HealthScoreInput): number {
  const { wellMeals, totalMeals, symptoms } = input;
  
  if (totalMeals === 0) {
    if (symptoms > 0) {
      return Math.max(0, 100 - symptoms * 15);
    }
    return 100;
  }
  
  const wellRatio = wellMeals / totalMeals;
  const symptomPenalty = Math.min(symptoms * 10, 30); // Slightly higher per-day penalty
  const score = Math.max(0, Math.min(100, Math.round(wellRatio * 100 - symptomPenalty)));
  
  return score;
}

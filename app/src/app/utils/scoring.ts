import type { ProblemScores } from "../types/schema";

export const OPPORTUNITY_WEIGHTS = {
  severity: 0.3,
  marketPotential: 0.25,
  aiFeasibility: 0.2,
  inverseCompetition: 0.25,
} as const;

export function computeOpportunityScore(scores: ProblemScores): number {
  const raw =
    scores.severity * OPPORTUNITY_WEIGHTS.severity +
    scores.marketPotential * OPPORTUNITY_WEIGHTS.marketPotential +
    scores.aiFeasibility * OPPORTUNITY_WEIGHTS.aiFeasibility +
    (10 - scores.competition) * OPPORTUNITY_WEIGHTS.inverseCompetition;

  return clampScore(Math.round(raw));
}

function clampScore(score: number): number {
  return Math.min(10, Math.max(1, score));
}

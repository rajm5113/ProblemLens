import { T } from "../tokens";
import type { ProblemIntelligenceCard } from "../types/schema";

export type Problem = ProblemIntelligenceCard;

export const SECTOR_COLORS: Record<string, string> = {
  HEALTHCARE:             T.sector.healthcare,
  FINTECH:                T.sector.fintech,
  "FINTECH / RETAIL":     T.sector.fintech,
  "FINTECH / CREATOR":    T.sector.fintech,
  EDUCATION:              T.sector.education,
  AGRICULTURE:            T.sector.agriculture,
  "GOVTECH / LEGAL":      T.sector.govtech,
  "LEGAL / GOVTECH":      T.sector.govtech,
  CLEANTECH:              T.sector.cleantech,
  "EMPLOYMENT / EDTECH":  T.sector.employment,
  "CREATOR ECONOMY":      T.sector.creator,
  "RARE DISEASE":         T.sector.rareDisease,
  TECHNOLOGY:             T.sector.technology,
};

export function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector.toUpperCase()] || T.sector.education;
}

export function getScoreGradient(value: number): { from: string; to: string } {
  if (value >= 8) return { from: T.accent.primary, to: T.accent.primaryDark };
  if (value >= 5) return { from: T.score.medium, to: "#F57C00" };
  return { from: T.score.low, to: "#D32F2F" };
}

export function getBarColor(value: number, invert = false): string {
  if (invert) {
    if (value <= 4) return T.score.high;
    if (value <= 7) return T.score.medium;
    return T.score.low;
  }
  if (value >= 8) return T.score.high;
  if (value >= 5) return T.score.medium;
  return T.score.low;
}

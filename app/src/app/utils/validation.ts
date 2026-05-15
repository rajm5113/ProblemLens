import {
  CONFIDENCE_LEVELS,
  FREQUENCIES,
  SECTORS,
  TREND_STATUSES,
  type ProblemIntelligenceCard,
  type ProblemScores,
} from "../types/schema";
import { computeOpportunityScore } from "./scoring";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProblemCard(card: ProblemIntelligenceCard): ValidationResult {
  const errors: string[] = [];

  requirePattern(card.id, /^PIP-\d{3}$/, "id must match PIP-XXX", errors);
  requireInteger(card.numericId, "numericId", errors, { min: 1 });
  requireIsoTimestamp(card.createdAt, "createdAt", errors);
  requireIsoTimestamp(card.updatedAt, "updatedAt", errors);
  requireStringLength(card.title, "title", errors, { min: 10, max: 200 });
  requireStringLength(card.painSummary, "painSummary", errors, { min: 20, max: 300 });
  optionalStringLength(card.description, "description", errors, { max: 2000 });
  requireEnum(card.sector, SECTORS, "sector", errors);
  requireStringArray(card.userType, "userType", errors, { min: 1, max: 5, itemMax: 60 });
  requireStringLength(card.geography, "geography", errors, { min: 1, max: 100 });
  requireEnum(card.frequency, FREQUENCIES, "frequency", errors);
  requireStringArray(card.tags, "tags", errors, { min: 3, max: 3, itemMax: 100 });
  requireStringArray(card.painPoints, "painPoints", errors, { min: 2, max: 5, itemMax: 200 });
  optionalStringLength(card.rootCause, "rootCause", errors, { max: 500 });
  requireStringArray(card.solutions, "solutions", errors, { min: 2, max: 5, itemMax: 200 });
  requireStringLength(card.source, "source", errors, { min: 1, max: 200 });
  requireEnum(card.confidence, CONFIDENCE_LEVELS, "confidence", errors);
  requireInteger(card.signalCount, "signalCount", errors, { min: 1 });
  validateScores(card.scores, errors);
  requireInteger(card.opportunityScore, "opportunityScore", errors, { min: 1, max: 10 });
  requireEnum(card.trendStatus, TREND_STATUSES, "trendStatus", errors);

  const expectedTags = [card.userType[0], card.geography, card.frequency];
  if (JSON.stringify(card.tags) !== JSON.stringify(expectedTags)) {
    errors.push("tags must equal [userType[0], geography, frequency]");
  }

  const expectedScore = computeOpportunityScore(card.scores);
  if (Math.abs(card.opportunityScore - expectedScore) > 1) {
    errors.push(`opportunityScore must be within 1 point of computed score ${expectedScore}`);
  }

  return { valid: errors.length === 0, errors };
}

function validateScores(scores: ProblemScores, errors: string[]): void {
  requireInteger(scores.severity, "scores.severity", errors, { min: 1, max: 10 });
  requireInteger(scores.marketPotential, "scores.marketPotential", errors, { min: 1, max: 10 });
  requireInteger(scores.aiFeasibility, "scores.aiFeasibility", errors, { min: 1, max: 10 });
  requireInteger(scores.competition, "scores.competition", errors, { min: 1, max: 10 });
}

function requireStringLength(
  value: string,
  field: string,
  errors: string[],
  limits: { min?: number; max: number },
): void {
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return;
  }
  if (limits.min !== undefined && value.trim().length < limits.min) {
    errors.push(`${field} must be at least ${limits.min} characters`);
  }
  if (value.length > limits.max) {
    errors.push(`${field} must be at most ${limits.max} characters`);
  }
}

function optionalStringLength(
  value: string | undefined,
  field: string,
  errors: string[],
  limits: { max: number },
): void {
  if (value === undefined) return;
  requireStringLength(value, field, errors, { max: limits.max });
}

function requireStringArray(
  value: string[],
  field: string,
  errors: string[],
  limits: { min: number; max: number; itemMax: number },
): void {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }
  if (value.length < limits.min || value.length > limits.max) {
    errors.push(`${field} must have ${limits.min}-${limits.max} items`);
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      errors.push(`${field}[${index}] must be a non-empty string`);
    } else if (item.length > limits.itemMax) {
      errors.push(`${field}[${index}] must be at most ${limits.itemMax} characters`);
    }
  });
}

function requireInteger(
  value: number,
  field: string,
  errors: string[],
  limits: { min?: number; max?: number } = {},
): void {
  if (!Number.isInteger(value)) {
    errors.push(`${field} must be an integer`);
    return;
  }
  if (limits.min !== undefined && value < limits.min) {
    errors.push(`${field} must be at least ${limits.min}`);
  }
  if (limits.max !== undefined && value > limits.max) {
    errors.push(`${field} must be at most ${limits.max}`);
  }
}

function requireEnum<T extends readonly string[]>(
  value: string,
  allowed: T,
  field: string,
  errors: string[],
): void {
  if (!allowed.includes(value)) {
    errors.push(`${field} must be one of: ${allowed.join(", ")}`);
  }
}

function requirePattern(value: string, pattern: RegExp, message: string, errors: string[]): void {
  if (typeof value !== "string" || !pattern.test(value)) {
    errors.push(message);
  }
}

function requireIsoTimestamp(value: string, field: string, errors: string[]): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push(`${field} must be a valid ISO 8601 timestamp`);
  }
}

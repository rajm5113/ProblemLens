export const SECTORS = [
  "Healthcare",
  "Fintech",
  "Education",
  "Agriculture",
  "GovTech",
  "Legal",
  "CleanTech",
  "Employment",
  "Creator Economy",
  "Retail",
  "Rare Disease",
  "Technology",
  "Transportation",
  "Fintech / Retail",
  "Fintech / Creator",
  "Legal / GovTech",
  "GovTech / Legal",
  "Employment / EdTech",
] as const;

export const FREQUENCIES = ["Low", "Medium", "High", "Very High"] as const;

export const CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const;

export const TREND_STATUSES = ["New", "Rising", "Stable", "Declining"] as const;

export type Sector = (typeof SECTORS)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export type TrendStatus = (typeof TREND_STATUSES)[number];

export interface ProblemScores {
  severity: number;
  marketPotential: number;
  aiFeasibility: number;
  competition: number;
}

export interface ProblemIntelligenceCard {
  id: string;
  numericId: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  painSummary: string;
  description?: string;
  sector: Sector;
  userType: string[];
  geography: string;
  frequency: Frequency;
  tags: string[];
  painPoints: string[];
  rootCause?: string;
  solutions: string[];
  source: string;
  confidence: Confidence;
  signalCount: number;
  scores: ProblemScores;
  opportunityScore: number;
  trendStatus: TrendStatus;
}

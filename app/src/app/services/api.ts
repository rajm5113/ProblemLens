import type { ProblemIntelligenceCard } from "../types/schema";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function readJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${fallbackMessage}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchProblems(): Promise<ProblemIntelligenceCard[]> {
  const res = await fetch(`${API_BASE}/problems`);
  return readJson<ProblemIntelligenceCard[]>(res, "Failed to load problems");
}

export async function fetchProblemById(id: string): Promise<ProblemIntelligenceCard> {
  const res = await fetch(`${API_BASE}/problems/${id}`);
  return readJson<ProblemIntelligenceCard>(res, `Problem ${id} not found`);
}

export interface StatsResponse {
  totalProblems: number;
  avgOpportunityScore: number;
  topSector: string;
  sectorBreakdown: Record<string, number>;
  sectorCounts: Record<string, number>;
  trendBreakdown: Record<string, number>;
  trendCounts: Record<string, number>;
  scoreDistribution: number[];
  totalSignals: number;
}

export interface PipelineRun {
  runId: string;
  stage: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  signalCount: number;
  hasCard: boolean;
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/stats`);
  return readJson<StatsResponse>(res, "Failed to load stats");
}

export async function fetchPipelineRuns(limit = 5): Promise<PipelineRun[]> {
  const res = await fetch(`${API_BASE}/pipeline/runs?limit=${limit}`);
  return readJson<PipelineRun[]>(res, "Failed to load pipeline runs");
}

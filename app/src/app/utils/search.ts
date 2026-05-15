import type { Problem } from "../data/problems";

export function searchProblems(problems: Problem[], query: string): Problem[] {
  if (!query.trim()) return [];

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return problems.filter((problem) => {
    const haystack = [
      problem.title,
      problem.painSummary,
      problem.sector,
      problem.description ?? "",
      problem.rootCause ?? "",
      ...problem.tags,
      ...problem.painPoints,
      ...problem.solutions,
      ...problem.userType,
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

const RECENT_SEARCHES_KEY = "pl_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter(Boolean).slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const cleaned = query.trim();
  if (!cleaned) return loadRecentSearches();

  const next = [
    cleaned,
    ...loadRecentSearches().filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota or storage errors.
  }

  return next;
}

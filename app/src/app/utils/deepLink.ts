export function getDeepLinkProblemId(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#problem\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setDeepLink(problemId: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#problem/${encodeURIComponent(problemId)}`);
}

export function clearDeepLink(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

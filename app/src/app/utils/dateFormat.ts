/**
 * Shared date formatting utilities for problem cards.
 */

/**
 * Formats an ISO date string into a human-readable "Added on" label.
 *
 * Examples:
 *   - "Added today"
 *   - "Added yesterday"
 *   - "Added 3 days ago"
 *   - "Added on 14 May 2026"
 */
export function formatAddedDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  // Reset to start of day for clean comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Added today";
  if (diffDays === 1) return "Added yesterday";
  if (diffDays < 7) return `Added ${diffDays} days ago`;

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `Added on ${day} ${month} ${year}`;
}

/**
 * Returns a compact date label for list cards (e.g., "14 May" or "14 May '25").
 */
export function formatCompactDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });

  if (date.getFullYear() === now.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} '${String(date.getFullYear()).slice(-2)}`;
}

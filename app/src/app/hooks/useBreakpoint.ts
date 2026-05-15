import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function classify(width: number): Breakpoint {
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "mobile";
}

/**
 * Returns the current responsive breakpoint and re-renders when it changes.
 * Uses CSS-only resize listener — no JS polling.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => classify(window.innerWidth));

  useEffect(() => {
    const handler = () => setBp(classify(window.innerWidth));
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);

  return bp;
}

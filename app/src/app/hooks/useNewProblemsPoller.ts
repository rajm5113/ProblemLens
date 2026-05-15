import { useEffect, useRef, useState } from "react";
import { useProblems } from "../contexts/ProblemsContext";
import { fetchStats } from "../services/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useNewProblemsPoller() {
  const { problems, refresh } = useProblems();
  const [newCount, setNewCount] = useState(0);
  const baselineRef = useRef(problems.length);

  useEffect(() => {
    if (newCount === 0) baselineRef.current = problems.length;
  }, [newCount, problems.length]);

  useEffect(() => {
    const poll = async () => {
      try {
        const stats = await fetchStats();
        const diff = stats.totalProblems - baselineRef.current;
        if (diff > 0) setNewCount(diff);
      } catch {
        // Polling failure is non-fatal.
      }
    };

    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const dismiss = async () => {
    const announced = newCount;
    setNewCount(0);
    baselineRef.current = problems.length + announced;
    await refresh();
    return announced;
  };

  return { newCount, dismiss };
}

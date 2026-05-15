import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ProblemIntelligenceCard } from "../types/schema";
import { fetchProblems } from "../services/api";

interface ProblemsContextValue {
  problems: ProblemIntelligenceCard[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const ProblemsContext = createContext<ProblemsContextValue>({
  problems: [],
  isLoading: true,
  error: null,
  refresh: () => {},
});

export function ProblemsProvider({ children }: { children: React.ReactNode }) {
  const [problems, setProblems] = useState<ProblemIntelligenceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchProblems();
      setProblems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load problems");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ProblemsContext.Provider value={{ problems, isLoading, error, refresh: load }}>
      {children}
    </ProblemsContext.Provider>
  );
}

export function useProblems() {
  return useContext(ProblemsContext);
}

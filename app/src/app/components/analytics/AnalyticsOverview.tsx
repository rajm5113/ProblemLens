import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useProblems } from "../../contexts/ProblemsContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { fetchStats, type StatsResponse } from "../../services/api";
import { PipelineActivity } from "./PipelineActivity";
import { ScoreDistribution } from "./ScoreDistribution";
import { SectorDonut } from "./SectorDonut";
import { StatCards } from "./StatCards";
import { TrendHealth } from "./TrendHealth";

export function AnalyticsOverview() {
  const { problems } = useProblems();
  const bp = useBreakpoint();
  const isDesktop = bp !== "mobile";
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "20px" }}
    >
      <StatCards problems={problems} stats={stats} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
          gap: "20px",
        }}
      >
        <SectorDonut problems={problems} stats={stats} />
        <ScoreDistribution problems={problems} stats={stats} />
      </div>
      <TrendHealth problems={problems} stats={stats} />
      <PipelineActivity />
    </motion.div>
  );
}

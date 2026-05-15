import { motion } from "motion/react";
import { useTheme } from "../../contexts/ThemeContext";
import type { Problem } from "../../data/problems";
import type { StatsResponse } from "../../services/api";

interface StatCardData {
  label: string;
  value: string;
  emoji: string;
  color: string;
}

function computeStats(problems: Problem[], stats: StatsResponse | null): StatCardData[] {
  const total = problems.length;
  const avgOpp = stats
    ? stats.avgOpportunityScore.toFixed(1)
    : total > 0
    ? (problems.reduce((sum, problem) => sum + problem.opportunityScore, 0) / total).toFixed(1)
    : "0";
  const rising = stats ? stats.trendCounts.Rising || 0 : problems.filter((problem) => problem.trendStatus === "Rising").length;
  const highOpp = problems.filter((problem) => problem.opportunityScore >= 8).length;
  const aiSolvable = problems.filter((problem) => problem.scores.aiFeasibility >= 8).length;

  return [
    { label: "Total Problems", value: String(total), emoji: "📊", color: "#4F46E5" },
    { label: "Avg Opportunity", value: avgOpp, emoji: "💰", color: "#F59E0B" },
    { label: "Rising", value: String(rising), emoji: "🔥", color: "#EF4444" },
    { label: "High Opp (8+)", value: String(highOpp), emoji: "🏆", color: "#10B981" },
    { label: "AI-Solvable", value: String(aiSolvable), emoji: "🤖", color: "#0EA5E9" },
  ];
}

export function StatCards({ problems, stats }: { problems: Problem[]; stats: StatsResponse | null }) {
  const { C, theme } = useTheme();
  const cards = computeStats(problems, stats);

  return (
    <div
      style={{
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "minmax(168px, 1fr)",
        gap: "12px",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {cards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: index * 0.04 }}
          style={{
            minHeight: "116px",
            borderRadius: "16px",
            padding: "18px",
            border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ color: C.textDim, fontSize: "12px", fontWeight: 600, lineHeight: 1.35 }}>
              {stat.label}
            </span>
            <span style={{ fontSize: "18px" }}>{stat.emoji}</span>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32, delay: index * 0.05 }}
            style={{ color: stat.color, fontSize: "28px", fontWeight: 800, lineHeight: 1 }}
          >
            {stat.value}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}

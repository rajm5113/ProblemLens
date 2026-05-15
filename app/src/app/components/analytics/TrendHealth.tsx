import { motion } from "motion/react";
import type { Problem } from "../../data/problems";
import { useTheme } from "../../contexts/ThemeContext";
import type { StatsResponse } from "../../services/api";

const TREND_COLORS = {
  New: "#4F46E5",
  Rising: "#EF4444",
  Stable: "#10B981",
  Declining: "#6B7280",
} as const;

function getTrendData(problems: Problem[]) {
  const counts = { New: 0, Rising: 0, Stable: 0, Declining: 0 };
  for (const problem of problems) {
    if (problem.trendStatus in counts) {
      counts[problem.trendStatus as keyof typeof counts] += 1;
    }
  }
  const total = problems.length || 1;
  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    pct: Math.round((count / total) * 100),
    color: TREND_COLORS[status as keyof typeof TREND_COLORS],
  }));
}

export function TrendHealth({
  problems,
  stats,
}: {
  problems: Problem[];
  stats: StatsResponse | null;
}) {
  const { C } = useTheme();
  const data = stats
    ? Object.entries(stats.trendCounts).map(([status, count]) => ({
        status,
        count,
        pct: Math.round((count / Math.max(problems.length, 1)) * 100),
        color: TREND_COLORS[status as keyof typeof TREND_COLORS],
      }))
    : getTrendData(problems);
  const total = problems.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      style={{
        backgroundColor: C.cardBg,
        borderRadius: "16px",
        border: `1px solid ${C.borderSubtle}`,
        padding: "16px",
      }}
    >
      <h3 style={{ color: C.textPrimary, fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>
        Trend Health
      </h3>
      {total === 0 ? (
        <p style={{ color: C.textDim, fontSize: "13px", margin: 0 }}>No data yet.</p>
      ) : (
        <>
          <div style={{ height: "12px", borderRadius: "999px", overflow: "hidden", display: "flex", backgroundColor: C.subtleBg }}>
            {data.map((item) => (
              <div
                key={item.status}
                style={{
                  width: `${item.pct}%`,
                  minWidth: item.count > 0 ? "8px" : 0,
                  backgroundColor: item.color,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "12px" }}>
            {data.map((item) => (
              <div key={item.status} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
                <span style={{ color: C.textDim, fontSize: "12px", fontWeight: 500 }}>
                  {item.status}: {item.count} ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getSectorColor } from "../../data/problems";
import type { Problem } from "../../data/problems";
import { useTheme } from "../../contexts/ThemeContext";
import type { StatsResponse } from "../../services/api";

interface SectorDatum {
  name: string;
  value: number;
  color: string;
}

function normalizeSector(sector: string) {
  const upper = sector.toUpperCase();
  if (upper.includes("HEALTHCARE")) return "Healthcare";
  if (upper.includes("FINTECH")) return "Fintech / Retail";
  if (upper.includes("AGRICULTURE")) return "Agriculture";
  if (upper.includes("EMPLOYMENT") || upper.includes("EDTECH")) return "Employment / EdTech";
  if (upper.includes("CLEANTECH")) return "CleanTech";
  if (upper.includes("LEGAL") || upper.includes("GOVTECH")) return "Legal / GovTech";
  if (upper.includes("EDUCATION")) return "Education";
  if (upper.includes("CREATOR")) return "Creator Economy";
  return sector;
}

function getSectorData(problems: Problem[]): SectorDatum[] {
  const counts = new Map<string, number>();
  for (const problem of problems) {
    const key = normalizeSector(problem.sector);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value, color: getSectorColor(name.toUpperCase()) }))
    .sort((left, right) => right.value - left.value);
}

export function SectorDonut({
  problems,
  stats,
}: {
  problems: Problem[];
  stats: StatsResponse | null;
}) {
  const { C } = useTheme();
  const data = stats
    ? Object.entries(stats.sectorCounts)
        .map(([name, value]) => ({ name, value, color: getSectorColor(name.toUpperCase()) }))
        .sort((left, right) => right.value - left.value)
    : getSectorData(problems);
  const total = data.reduce((sum, item) => sum + item.value, 0);

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
        Sector Distribution
      </h3>
      {data.length === 0 ? (
        <EmptyMessage />
      ) : (
        <>
          <div style={{ position: "relative", height: "220px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  stroke="none"
                  animationDuration={800}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: C.cardBg,
                    border: `1px solid ${C.borderSubtle}`,
                    borderRadius: "8px",
                    color: C.textPrimary,
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                flexDirection: "column",
              }}
            >
              <span style={{ color: C.textPrimary, fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>
                {total}
              </span>
              <span style={{ color: C.textDim, fontSize: "11px", fontWeight: 600, marginTop: "4px" }}>
                sectors tracked
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
            {data.map((item) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color }} />
                <span style={{ color: C.textDim, fontSize: "12px", fontWeight: 500 }}>
                  {item.name} {item.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

function EmptyMessage() {
  const { C } = useTheme();
  return <p style={{ color: C.textDim, fontSize: "13px", margin: 0 }}>No data yet.</p>;
}

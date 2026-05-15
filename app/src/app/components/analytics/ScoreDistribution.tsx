import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Problem } from "../../data/problems";
import { useTheme } from "../../contexts/ThemeContext";
import type { StatsResponse } from "../../services/api";

function getScoreBuckets(problems: Problem[]) {
  const buckets = Array.from({ length: 10 }, (_, index) => ({ score: index + 1, count: 0 }));
  for (const problem of problems) {
    const bucketIndex = Math.max(0, Math.min(9, Math.round(problem.opportunityScore) - 1));
    buckets[bucketIndex].count += 1;
  }
  return buckets;
}

function colorForScore(score: number) {
  if (score >= 8) return "#10B981";
  if (score >= 5) return "#F59E0B";
  return "#EF4444";
}

export function ScoreDistribution({
  problems,
  stats,
}: {
  problems: Problem[];
  stats: StatsResponse | null;
}) {
  const { C } = useTheme();
  const data = stats
    ? stats.scoreDistribution.map((count, index) => ({ score: index + 1, count }))
    : getScoreBuckets(problems);
  const hasData = data.some((bucket) => bucket.count > 0);

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
        Score Distribution
      </h3>
      {!hasData ? (
        <p style={{ color: C.textDim, fontSize: "13px", margin: 0 }}>No data yet.</p>
      ) : (
        <div style={{ height: "180px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="score"
                tick={{ fill: C.textDim, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                ticks={[1, 5, 10]}
              />
              <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={22} />
              <Tooltip
                contentStyle={{
                  backgroundColor: C.cardBg,
                  border: `1px solid ${C.borderSubtle}`,
                  borderRadius: "8px",
                  color: C.textPrimary,
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((bucket) => (
                  <Cell key={bucket.score} fill={colorForScore(bucket.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { fetchPipelineRuns, type PipelineRun } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";

function dotColor(run: PipelineRun) {
  if (run.status === "manual_review") return "#EF4444";
  if (run.hasCard) return "#10B981";
  return "#F59E0B";
}

function formatWhen(run: PipelineRun) {
  const value = run.completedAt || run.startedAt;
  if (!value) return "just now";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function PipelineActivity() {
  const { C } = useTheme();
  const [runs, setRuns] = useState<PipelineRun[]>([]);

  useEffect(() => {
    fetchPipelineRuns(5)
      .then(setRuns)
      .catch(() => setRuns([]));
  }, []);

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
        Recent Pipeline Runs
      </h3>
      {runs.length === 0 ? (
        <p style={{ color: C.textDim, fontSize: "13px", margin: 0 }}>No pipeline runs yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {runs.map((run) => (
            <div key={run.runId} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: dotColor(run),
                  marginTop: "4px",
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: C.textPrimary, fontSize: "13px", fontWeight: 600, lineHeight: 1.4, margin: 0 }}>
                  {formatWhen(run)}: {run.signalCount} signals, {run.hasCard ? "card created" : "no card created"}
                </p>
                <p style={{ color: C.textDim, fontSize: "12px", lineHeight: 1.45, margin: "2px 0 0 0" }}>
                  {run.stage} · {run.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

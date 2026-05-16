import { Bookmark, ChevronRight, FileText } from "lucide-react";
import { motion } from "motion/react";
import { getScoreGradient, getSectorColor } from "../data/problems";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useNotes } from "../contexts/NotesContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";

interface SavedScreenProps {
  onCardTap: (id: string) => void;
  onGoToFeed: () => void;
  onDashboardTap: () => void;
}

export function SavedScreen({ onCardTap, onGoToFeed, onDashboardTap }: SavedScreenProps) {
  const { C } = useTheme();
  const { bookmarks } = useBookmarks();
  const { hasNote } = useNotes();
  const { problems } = useProblems();

  const savedProblems = problems.filter((problem) => bookmarks.has(problem.id));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: C.appBg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "56px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${C.borderSubtle}`,
        }}
      >
        <span
          style={{
            color: C.textPrimary,
            fontSize: "22px",
            fontWeight: 700,
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}
        >
          Saved
        </span>
        <span style={{ color: C.textDim, fontSize: "13px", fontWeight: 600 }}>
          {savedProblems.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 20px 20px" }}>
        {savedProblems.length === 0 ? (
          <EmptySavedState />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {savedProblems.map((problem) => (
              <SavedCard
                key={problem.id}
                title={problem.title}
                sector={problem.sector}
                summary={problem.painSummary}
                opportunityScore={problem.opportunityScore}
                hasNote={hasNote(problem.id)}
                onTap={() => onCardTap(problem.id)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function EmptySavedState() {
  const { C } = useTheme();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          backgroundColor: C.emptyIconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "18px",
        }}
      >
        <Bookmark size={30} color={C.accent} fill={C.accent} />
      </div>
      <p style={{ color: C.textPrimary, fontSize: "18px", fontWeight: 700, margin: 0 }}>
        No saved problems yet
      </p>
      <p
        style={{
          color: C.textDim,
          fontSize: "14px",
          lineHeight: 1.6,
          margin: "10px 0 0 0",
          maxWidth: "280px",
        }}
      >
        Tap the bookmark icon on any problem card to save it here for quick access later.
      </p>
    </div>
  );
}

function SavedCard({
  title,
  sector,
  summary,
  opportunityScore,
  hasNote,
  onTap,
}: {
  title: string;
  sector: string;
  summary: string;
  opportunityScore: number;
  hasNote: boolean;
  onTap: () => void;
}) {
  const { C } = useTheme();
  const sectorColor = getSectorColor(sector.toUpperCase());
  const gradient = getScoreGradient(opportunityScore);

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onTap}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "16px",
        border: `1px solid ${C.borderSubtle}`,
        backgroundColor: C.cardBg,
        padding: "18px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: `${sectorColor}22`,
            border: `1px solid ${sectorColor}44`,
            borderRadius: "6px",
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              color: sectorColor,
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {sector}
          </span>
          <Bookmark size={14} color={C.accent} fill={C.accent} />
          {hasNote && <FileText size={14} color={C.textDim} />}
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            borderRadius: "20px",
            padding: "4px 10px",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {opportunityScore}/10
        </div>
      </div>

      <p
        style={{
          color: C.textPrimary,
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: 1.35,
          margin: "12px 0 0 0",
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: C.textMuted,
          fontSize: "13px",
          lineHeight: 1.45,
          margin: "6px 0 0 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {summary}
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
        <ChevronRight size={16} color={C.textFaint} />
      </div>
    </motion.button>
  );
}

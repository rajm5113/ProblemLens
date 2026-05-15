import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Calendar, ChevronUp, FileText, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { formatAddedDate } from "../utils/dateFormat";
import { getScoreGradient, getSectorColor } from "../data/problems";
import type { Problem } from "../data/problems";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useNotes } from "../contexts/NotesContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNewProblemsPoller } from "../hooks/useNewProblemsPoller";
import { NewProblemsBanner } from "./NewProblemsBanner";
import type { FilterState } from "./FiltersSheet";
import { countMatchingProblems } from "./FiltersSheet";
import { BottomNav } from "./BottomNav";

interface ProblemFeedProps {
  onCardTap: (problemId: string) => void;
  onFilterTap: () => void;
  onSavedTap: () => void;
  onDashboardTap: () => void;
  filterActive: boolean;
  appliedFilters: FilterState;
  onAnnounce: (message: string) => void;
}

export function ProblemFeed({
  onCardTap,
  onFilterTap,
  onSavedTap,
  onDashboardTap,
  filterActive,
  appliedFilters,
  onAnnounce,
}: ProblemFeedProps) {
  const { C, theme, toggleTheme } = useTheme();
  const { problems } = useProblems();
  const { isBookmarked } = useBookmarks();
  const { hasNote } = useNotes();
  const { newCount, dismiss } = useNewProblemsPoller();

  const hasResults = countMatchingProblems(appliedFilters, problems) > 0;
  const visibleProblems = useMemo(
    () =>
      hasResults
        ? problems.filter((problem) => {
            if (appliedFilters.sectors.length > 0) {
              const match = appliedFilters.sectors.some((sector) =>
                problem.sector.toLowerCase().includes(sector.toLowerCase())
              );
              if (!match) return false;
            }
            if (
              appliedFilters.geography.trim() !== "" &&
              appliedFilters.geography.trim().toLowerCase() !== "india" &&
              !problem.geography.toLowerCase().includes(appliedFilters.geography.trim().toLowerCase())
            ) {
              return false;
            }
            if (appliedFilters.aiSolvableOnly && problem.scores.aiFeasibility < 7) return false;
            if (problem.opportunityScore < appliedFilters.minOpportunity) return false;
            return true;
          })
        : problems,
    [appliedFilters, hasResults, problems]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"up" | "down">("up");
  const touchStartY = useRef<number | null>(null);
  const clampedIndex = Math.min(currentIndex, Math.max(visibleProblems.length - 1, 0));
  const currentProblem = hasResults ? visibleProblems[clampedIndex] : null;

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(visibleProblems.length - 1, 0)));
  }, [visibleProblems.length]);

  const goToNext = () => {
    if (clampedIndex >= visibleProblems.length - 1) return;
    setSwipeDir("up");
    setCurrentIndex((index) => Math.min(index + 1, visibleProblems.length - 1));
  };

  const goToPrevious = () => {
    if (clampedIndex <= 0) return;
    setSwipeDir("down");
    setCurrentIndex((index) => Math.max(index - 1, 0));
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - event.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goToNext();
      else goToPrevious();
    }
    touchStartY.current = null;
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (event.deltaY > 30) goToNext();
    else if (event.deltaY < -30) goToPrevious();
  };

  const sectorColor = currentProblem ? getSectorColor(currentProblem.sector.toUpperCase()) : C.accent;
  const scoreGradient = currentProblem
    ? getScoreGradient(currentProblem.opportunityScore)
    : { from: C.accent, to: C.accentDark };

  const cardVariants = {
    enterUp: { y: "100%", opacity: 0 },
    enterDown: { y: "-100%", opacity: 0 },
    center: { y: 0, opacity: 1 },
    exitUp: { y: "-100%", opacity: 0 },
    exitDown: { y: "100%", opacity: 0 },
  };

  return (
    <main
      role="main"
      aria-label="Problem feed"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") goToPrevious();
        if (event.key === "ArrowDown") goToNext();
        if ((event.key === "Enter" || event.key === " ") && currentProblem) {
          event.preventDefault();
          onCardTap(currentProblem.id);
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: C.appBg,
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        outline: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Problem Feed
      </h1>

      <NewProblemsBanner
        count={newCount}
        onDismiss={async () => {
          const announced = await dismiss();
          onAnnounce(`Feed updated with ${announced} new problem${announced !== 1 ? "s" : ""}`);
        }}
      />

      <div
        style={{
          height: "56px",
          backgroundColor: C.appBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "20px",
          paddingRight: "12px",
          flexShrink: 0,
          borderBottom: `1px solid ${C.borderSubtle}`,
        }}
      >
        <span
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: "-0.3px",
          }}
        >
          ProblemLens
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.15 }}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to daylight mode" : "Switch to night mode"}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme === "dark" ? "#FFB300" : C.textDim,
              minWidth: "44px",
              minHeight: "44px",
            }}
          >
            {theme === "dark" ? <Sun size={19} strokeWidth={2} /> : <Moon size={19} strokeWidth={2} />}
          </motion.button>

          <div style={{ position: "relative" }}>
            <button
              onClick={onFilterTap}
              aria-label="Open filters"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: filterActive ? C.accent : C.textDim,
                minWidth: "44px",
                minHeight: "44px",
              }}
            >
              <SlidersHorizontal size={20} />
            </button>
            {filterActive && (
              <div
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: C.accent,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 16px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {hasResults && currentProblem ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentProblem.id}
                variants={cardVariants}
                initial={swipeDir === "up" ? "enterUp" : "enterDown"}
                animate="center"
                exit={swipeDir === "up" ? "exitUp" : "exitDown"}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ width: "100%", height: "100%" }}
              >
                <ProblemCard
                  problem={currentProblem}
                  sectorColor={sectorColor}
                  scoreGradient={scoreGradient}
                  bookmarked={isBookmarked(currentProblem.id)}
                  noted={hasNote(currentProblem.id)}
                  onTap={() => onCardTap(currentProblem.id)}
                />
              </motion.div>
            </AnimatePresence>

            <div
              style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                zIndex: 20,
              }}
            >
              {visibleProblems.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: "4px",
                    height: index === clampedIndex ? "16px" : "4px",
                    borderRadius: "2px",
                    backgroundColor: index === clampedIndex ? C.textPrimary : C.textGhost,
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <FeedEmptyState onAdjustFilters={onFilterTap} />
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: C.appBg,
        }}
      >
        {hasResults && (
          <div
            style={{
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SwipeIndicator />
          </div>
        )}
        <BottomNav
          active="feed"
          onFeedTap={() => {}}
          onSavedTap={onSavedTap}
          onDashboardTap={onDashboardTap}
        />
      </div>
    </main>
  );
}

interface ProblemCardProps {
  problem: Problem;
  sectorColor: string;
  scoreGradient: { from: string; to: string };
  bookmarked: boolean;
  noted: boolean;
  onTap: () => void;
}

function ProblemCard({ problem, sectorColor, scoreGradient, bookmarked, noted, onTap }: ProblemCardProps) {
  const { C, theme } = useTheme();

  return (
    <div
      onClick={onTap}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "20px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        boxShadow: theme === "dark" ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.08)",
        cursor: "pointer",
        background: C.cardGradient,
        border: `1px solid ${C.borderSubtle}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-40px",
          left: "-40px",
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sectorColor}1A 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            backgroundColor: `${sectorColor}22`,
            border: `1px solid ${sectorColor}44`,
            borderRadius: "8px",
            padding: "6px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              color: sectorColor,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {problem.sector}
          </span>
          {bookmarked && <Bookmark size={14} color={C.accent} fill={C.accent} />}
          {noted && <FileText size={14} color={C.textDim} />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${scoreGradient.from}, ${scoreGradient.to})`,
              borderRadius: "10px",
              padding: "6px 14px",
            }}
          >
            <span style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 700, lineHeight: 1 }}>
              {problem.opportunityScore}/10
            </span>
          </div>
          <span
            style={{
              color: C.textFaint,
              fontSize: "9px",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            Opportunity
          </span>
        </div>
      </div>

      <h2
        style={{
          color: C.textPrimary,
          fontSize: "26px",
          fontWeight: 700,
          lineHeight: 1.3,
          margin: "20px 0 0 0",
          fontFamily: "'Outfit', 'Inter', sans-serif",
        }}
      >
        {problem.title}
      </h2>

      <p
        style={{
          color: C.textMuted,
          fontSize: "15px",
          lineHeight: 1.5,
          margin: "14px 0 0 0",
        }}
      >
        {problem.painSummary}
      </p>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "12px",
          padding: "5px 10px",
          borderRadius: "6px",
          backgroundColor: `${C.textFaint}12`,
          border: `1px solid ${C.borderSubtle}`,
        }}
      >
        <Calendar size={12} color={C.textFaint} />
        <span style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500 }}>
          {formatAddedDate(problem.createdAt)}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${C.borderDefault}, transparent)`,
          marginBottom: "14px",
        }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {problem.tags.map((tag) => (
          <div
            key={tag}
            style={{
              border: `1px solid ${C.borderDefault}`,
              borderRadius: "6px",
              padding: "4px 10px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span style={{ color: C.textDim, fontSize: "11px", fontWeight: 500 }}>{tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedEmptyState({ onAdjustFilters }: { onAdjustFilters: () => void }) {
  const { C } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        gap: "16px",
        textAlign: "center",
        height: "100%",
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
          marginBottom: "4px",
        }}
      >
        <SlidersHorizontal size={28} color={C.textFaint} />
      </div>
      <p style={{ color: C.textPrimary, fontSize: "18px", fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
        No problems match your filters
      </p>
      <p
        style={{
          color: C.textDim,
          fontSize: "14px",
          lineHeight: 1.5,
          margin: 0,
          maxWidth: "260px",
        }}
      >
        Try broadening your search by adjusting the sector, geography, or minimum opportunity score.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onClick={onAdjustFilters}
        style={{
          marginTop: "8px",
          height: "50px",
          padding: "0 32px",
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
          borderRadius: "14px",
          border: "none",
          cursor: "pointer",
          boxShadow: `0 4px 16px ${C.accentGlow}`,
          color: "#FFFFFF",
          fontSize: "15px",
          fontWeight: 700,
        }}
      >
        Adjust Filters
      </motion.button>
    </div>
  );
}

function SwipeIndicator() {
  const { C } = useTheme();
  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      style={{ display: "flex", alignItems: "center", gap: "4px", opacity: 0.5 }}
    >
      <ChevronUp size={14} color={C.textFaint} strokeWidth={2} />
      <span style={{ color: C.textFaint, fontSize: "11px", fontWeight: 400 }}>Swipe to browse</span>
    </motion.div>
  );
}

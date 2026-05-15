import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SlidersHorizontal, ChevronUp, Sun, Moon } from "lucide-react";
import { PROBLEMS, getSectorColor, getScoreGradient } from "../data/problems";
import { BottomNav } from "./BottomNav";
import { useTheme } from "../contexts/ThemeContext";
import type { FilterState } from "./FiltersSheet";
import { countMatchingProblems } from "./FiltersSheet";

interface ProblemFeedProps {
  onCardTap: (problemId: number) => void;
  onFilterTap: () => void;
  onDashboardTap: () => void;
  filterActive: boolean;
  appliedFilters: FilterState;
}

export function ProblemFeed({
  onCardTap,
  onFilterTap,
  onDashboardTap,
  filterActive,
  appliedFilters,
}: ProblemFeedProps) {
  const { C, theme, toggleTheme } = useTheme();

  /* ── Filtered problem list ── */
  const hasResults = countMatchingProblems(appliedFilters) > 0;
  const visibleProblems = hasResults
    ? PROBLEMS.filter((p) => {
        if (appliedFilters.sectors.length > 0) {
          const match = appliedFilters.sectors.some((s) =>
            p.sector.toLowerCase().includes(s.toLowerCase())
          );
          if (!match) return false;
        }
        if (
          appliedFilters.geography.trim() !== "" &&
          appliedFilters.geography.trim().toLowerCase() !== "india" &&
          !p.geography.toLowerCase().includes(
            appliedFilters.geography.trim().toLowerCase()
          )
        )
          return false;
        if (appliedFilters.aiSolvableOnly && p.scores.aiFeasibility < 7)
          return false;
        if (p.opportunityScore < appliedFilters.minOpportunity) return false;
        return true;
      })
    : PROBLEMS;

  /* ── Swipe state ── */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"up" | "down">("up");
  const touchStartY = useRef<number | null>(null);

  const clampedIndex = Math.min(currentIndex, visibleProblems.length - 1);

  const handleSwipeUp = () => {
    if (clampedIndex < visibleProblems.length - 1) {
      setSwipeDir("up");
      setCurrentIndex((i) => Math.min(i + 1, visibleProblems.length - 1));
    }
  };
  const handleSwipeDown = () => {
    if (clampedIndex > 0) {
      setSwipeDir("down");
      setCurrentIndex((i) => Math.max(i - 1, 0));
    }
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) {
      if (delta > 0) handleSwipeUp();
      else handleSwipeDown();
    }
    touchStartY.current = null;
  };
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 30) handleSwipeUp();
    else if (e.deltaY < -30) handleSwipeDown();
  };

  const problem = hasResults ? visibleProblems[clampedIndex] : null;
  const sectorColor = problem ? getSectorColor(problem.sector.toUpperCase()) : C.accent;
  const scoreGradient = problem
    ? getScoreGradient(problem.opportunityScore)
    : { from: C.accent, to: C.accentDark };

  const cardVariants = {
    enterUp:   { y: "100%", opacity: 0 },
    enterDown: { y: "-100%", opacity: 0 },
    center:    { y: 0, opacity: 1 },
    exitUp:    { y: "-100%", opacity: 0 },
    exitDown:  { y: "100%", opacity: 0 },
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: C.appBg,
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* ── Top Nav Bar ── */}
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
          position: "relative",
          zIndex: 10,
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
          {/* ── Theme toggle (sun / moon) ── */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.15 }}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to daylight mode" : "Switch to night mode"}
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
            {theme === "dark"
              ? <Sun size={19} strokeWidth={2} />
              : <Moon size={19} strokeWidth={2} />}
          </motion.button>

          {/* ── Filter icon ── */}
          <div style={{ position: "relative" }}>
            <button
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
              onClick={onFilterTap}
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
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Card Area ── */}
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
        {hasResults ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={problem!.id}
                variants={cardVariants}
                initial={swipeDir === "up" ? "enterUp" : "enterDown"}
                animate="center"
                exit={swipeDir === "up" ? "exitUp" : "exitDown"}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ width: "100%", height: "100%" }}
              >
                <ProblemCard
                  problem={problem!}
                  sectorColor={sectorColor}
                  scoreGradient={scoreGradient}
                  onTap={() => onCardTap(problem!.id)}
                />
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
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
              {visibleProblems.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "4px",
                    height: i === clampedIndex ? "16px" : "4px",
                    borderRadius: "2px",
                    backgroundColor:
                      i === clampedIndex ? C.textPrimary : C.textGhost,
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

      {/* ── Swipe hint + Bottom nav ── */}
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
          onFeedTap={() => { /* already here */ }}
          onDashboardTap={onDashboardTap}
        />
      </div>
    </div>
  );
}

/* ── Problem Card ──────────────────────────────────────── */
interface ProblemCardProps {
  problem: (typeof PROBLEMS)[0];
  sectorColor: string;
  scoreGradient: { from: string; to: string };
  onTap: () => void;
}

function ProblemCard({ problem, sectorColor, scoreGradient, onTap }: ProblemCardProps) {
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
        boxShadow: theme === "dark"
          ? "0 4px 24px rgba(0,0,0,0.3)"
          : "0 2px 16px rgba(0,0,0,0.08)",
        cursor: "pointer",
        background: C.cardGradient,
        border: `1px solid ${C.borderSubtle}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sector glow */}
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

      {/* Top row: sector badge + score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            backgroundColor: `${sectorColor}22`,
            border: `1px solid ${sectorColor}44`,
            borderRadius: "8px",
            padding: "6px 12px",
            display: "inline-flex",
            alignItems: "center",
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
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${scoreGradient.from}, ${scoreGradient.to})`,
              borderRadius: "10px",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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

      {/* Title */}
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

      {/* Pain summary */}
      <p
        style={{
          color: C.textMuted,
          fontSize: "15px",
          fontWeight: 400,
          lineHeight: 1.5,
          margin: "14px 0 0 0",
        }}
      >
        {problem.painSummary}
      </p>

      <div style={{ flex: 1 }} />

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${C.borderDefault}, transparent)`,
          marginBottom: "14px",
        }}
      />

      {/* Tags */}
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
            <span style={{ color: C.textDim, fontSize: "11px", fontWeight: 500 }}>
              {tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feed Empty State ──────────────────────────────────── */
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
          fontWeight: 400,
          margin: 0,
          lineHeight: 1.5,
          maxWidth: "260px",
        }}
      >
        Try broadening your search — adjust the sector, geography, or minimum
        opportunity score.
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

/* ── Swipe Indicator ───────────────────────────────────── */
function SwipeIndicator() {
  const { C } = useTheme();
  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      style={{ display: "flex", alignItems: "center", gap: "4px", opacity: 0.5 }}
    >
      <ChevronUp size={14} color={C.textFaint} strokeWidth={2} />
      <span style={{ color: C.textFaint, fontSize: "11px", fontWeight: 400 }}>
        Swipe to browse
      </span>
    </motion.div>
  );
}
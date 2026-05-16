import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark, Calendar, ChevronUp, FileText, Moon,
  SlidersHorizontal, Sun, LayoutGrid, BarChart2, X,
} from "lucide-react";
import { formatAddedDate } from "../utils/dateFormat";
import { getScoreGradient, getSectorColor, SECTOR_COLORS } from "../data/problems";
import type { Problem } from "../data/problems";
import { getSectorImage } from "../data/sectorImages";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useNotes } from "../contexts/NotesContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNewProblemsPoller } from "../hooks/useNewProblemsPoller";
import { NewProblemsBanner } from "./NewProblemsBanner";
import type { FilterState } from "./FiltersSheet";
import { countMatchingProblems } from "./FiltersSheet";

/* ── Sector icon map (reuse desktop emojis) ─────────────── */
const SECTOR_ICONS: Record<string, string> = {
  "Healthcare": "🏥", "Fintech / Retail": "💰", "Education": "🎓",
  "Agriculture": "🌾", "Legal / GovTech": "⚖️", "CleanTech": "♻️",
  "Employment / EdTech": "💼", "Creator Economy": "🎨",
  "Technology": "💻", "Transportation": "🚆",
};

const ALL_SECTORS = Object.keys(SECTOR_ICONS);

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
  onCardTap, onFilterTap, onSavedTap, onDashboardTap,
  filterActive, appliedFilters, onAnnounce,
}: ProblemFeedProps) {
  const { C, theme, toggleTheme } = useTheme();
  const { problems } = useProblems();
  const { isBookmarked } = useBookmarks();
  const { hasNote } = useNotes();
  const { newCount, dismiss } = useNewProblemsPoller();

  const [activeTab, setActiveTab] = useState<"feed"|"sectors"|"saved"|"dashboard">("feed");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [sectorGridOpen, setSectorGridOpen] = useState(false);

  const hasResults = countMatchingProblems(appliedFilters, problems) > 0;
  const visibleProblems = useMemo(() => {
    let filtered = hasResults
      ? problems.filter((p) => {
          if (appliedFilters.sectors.length > 0) {
            if (!appliedFilters.sectors.some((s) => p.sector.toLowerCase().includes(s.toLowerCase()))) return false;
          }
          if (appliedFilters.geography.trim() !== "" && appliedFilters.geography.trim().toLowerCase() !== "india"
            && !p.geography.toLowerCase().includes(appliedFilters.geography.trim().toLowerCase())) return false;
          if (appliedFilters.aiSolvableOnly && p.scores.aiFeasibility < 7) return false;
          if (p.opportunityScore < appliedFilters.minOpportunity) return false;
          return true;
        })
      : problems;
    if (sectorFilter) filtered = filtered.filter((p) => p.sector === sectorFilter);
    return filtered;
  }, [appliedFilters, hasResults, problems, sectorFilter]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"up" | "down">("up");
  const touchStartY = useRef<number | null>(null);
  const clampedIndex = Math.min(currentIndex, Math.max(visibleProblems.length - 1, 0));
  const currentProblem = visibleProblems[clampedIndex] ?? null;

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(visibleProblems.length - 1, 0)));
  }, [visibleProblems.length]);

  useEffect(() => { setCurrentIndex(0); }, [sectorFilter]);

  const goToNext = () => { if (clampedIndex < visibleProblems.length - 1) { setSwipeDir("up"); setCurrentIndex((i) => i + 1); } };
  const goToPrevious = () => { if (clampedIndex > 0) { setSwipeDir("down"); setCurrentIndex((i) => i - 1); } };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) { delta > 0 ? goToNext() : goToPrevious(); }
    touchStartY.current = null;
  };
  const handleWheel = (e: React.WheelEvent) => { if (e.deltaY > 30) goToNext(); else if (e.deltaY < -30) goToPrevious(); };

  const cardVariants = {
    enterUp: { y: "100%", opacity: 0 }, enterDown: { y: "-100%", opacity: 0 },
    center: { y: 0, opacity: 1 },
    exitUp: { y: "-100%", opacity: 0 }, exitDown: { y: "100%", opacity: 0 },
  };

  // When tab changes, delegate to parent for saved/dashboard
  const handleTabChange = (tab: "feed"|"sectors"|"saved"|"dashboard") => {
    if (tab === "saved") { onSavedTap(); return; }
    if (tab === "dashboard") { onDashboardTap(); return; }
    if (tab === "sectors") { setSectorGridOpen(true); setActiveTab("sectors"); return; }
    setActiveTab("feed"); setSectorFilter(null); setSectorGridOpen(false);
  };

  const sectorColor = currentProblem ? getSectorColor(currentProblem.sector.toUpperCase()) : C.accent;
  const scoreGrad = currentProblem ? getScoreGradient(currentProblem.opportunityScore) : { from: C.accent, to: C.accentDark };

  return (
    <main role="main" aria-label="Problem feed" tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") goToPrevious();
        if (e.key === "ArrowDown") goToNext();
        if ((e.key === "Enter" || e.key === " ") && currentProblem) { e.preventDefault(); onCardTap(currentProblem.id); }
      }}
      style={{ width: "100%", height: "100%", backgroundColor: C.appBg, fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", outline: "none" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}
    >
      <h1 style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
        overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Problem Feed</h1>

      <NewProblemsBanner count={newCount} onDismiss={async () => {
        const announced = await dismiss();
        onAnnounce(`Feed updated with ${announced} new problem${announced !== 1 ? "s" : ""}`);
      }} />

      {/* ── TOP HEADER BAR ─────────────────────────────── */}
      <div style={{ backgroundColor: C.appBg, flexShrink: 0, borderBottom: `1px solid ${C.borderSubtle}` }}>
        {/* Row 1: Logo + theme toggle + filter */}
        <div style={{ height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <span style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: "18px", fontWeight: 700,
            color: C.textPrimary, letterSpacing: "-0.3px" }}>ProblemLens</span>
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", display: "flex",
                alignItems: "center", justifyContent: "center", color: theme === "dark" ? "#FFB300" : C.textDim,
                minWidth: "40px", minHeight: "40px" }}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={onFilterTap} aria-label="Open filters"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", display: "flex",
                  alignItems: "center", justifyContent: "center", color: filterActive ? C.accent : C.textDim,
                  minWidth: "40px", minHeight: "40px" }}>
                <SlidersHorizontal size={18} />
              </button>
              {filterActive && <div style={{ position: "absolute", top: "6px", right: "6px", width: "6px", height: "6px",
                borderRadius: "50%", backgroundColor: C.accent }} />}
            </div>
          </div>
        </div>

        {/* Row 2: Tab bar — Feed | Sectors | Saved | Dashboard */}
        <div style={{ display: "flex", alignItems: "center", height: "40px", padding: "0 8px", gap: "0",
          overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {(["feed", "sectors", "saved", "dashboard"] as const).map((tab) => {
            const isActive = activeTab === tab || (tab === "sectors" && sectorFilter !== null);
            const labels: Record<string, { icon: React.ReactNode; label: string }> = {
              feed: { icon: <LayoutGrid size={14} />, label: "My Feed" },
              sectors: { icon: <span style={{ fontSize: "14px" }}>🏷️</span>, label: "Sectors" },
              saved: { icon: <Bookmark size={14} />, label: "Saved" },
              dashboard: { icon: <BarChart2 size={14} />, label: "Dashboard" },
            };
            const { icon, label } = labels[tab];
            return (
              <button key={tab} onClick={() => handleTabChange(tab)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center",
                  gap: "5px", padding: "6px 14px", borderRadius: "20px", whiteSpace: "nowrap",
                  color: isActive ? C.accent : C.textDim, fontWeight: isActive ? 700 : 500, fontSize: "13px",
                  backgroundColor: isActive ? `${C.accent}14` : "transparent",
                  transition: "all 0.2s ease" }}>
                {icon}<span>{label}</span>
              </button>
            );
          })}
          {sectorFilter && (
            <button onClick={() => { setSectorFilter(null); setActiveTab("feed"); }}
              style={{ background: `${sectorColor}22`, border: `1px solid ${sectorColor}44`, borderRadius: "20px",
                padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer",
                marginLeft: "4px", whiteSpace: "nowrap", color: sectorColor, fontSize: "11px", fontWeight: 600 }}>
              {SECTOR_ICONS[sectorFilter] || "📌"} {sectorFilter}
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── SECTOR GRID OVERLAY ────────────────────────── */}
      <AnimatePresence>
        {sectorGridOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            style={{ position: "absolute", top: "88px", left: "8px", right: "8px", zIndex: 50,
              backgroundColor: C.cardBg, borderRadius: "16px", padding: "16px",
              boxShadow: theme === "dark" ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.12)",
              border: `1px solid ${C.borderSubtle}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: C.textPrimary }}>Filter by Sector</span>
              <button onClick={() => { setSectorGridOpen(false); if (!sectorFilter) setActiveTab("feed"); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: "4px" }}>
                <X size={18} />
              </button>
            </div>
            {ALL_SECTORS.map((s) => {
              const color = getSectorColor(s.toUpperCase());
              const isActive = sectorFilter === s;
              return (
                <button key={s} onClick={() => { setSectorFilter(isActive ? null : s); setSectorGridOpen(false); setActiveTab(isActive ? "feed" : "sectors"); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px 4px",
                    borderRadius: "12px", border: isActive ? `2px solid ${color}` : `1px solid ${C.borderSubtle}`,
                    backgroundColor: isActive ? `${color}18` : "transparent", cursor: "pointer", background: isActive ? `${color}18` : "transparent" }}>
                  <span style={{ fontSize: "22px" }}>{SECTOR_ICONS[s]}</span>
                  <span style={{ fontSize: "9px", fontWeight: 600, color: isActive ? color : C.textDim,
                    textAlign: "center", lineHeight: 1.2 }}>{s.split(" / ")[0]}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CARD AREA ──────────────────────────────────── */}
      <div onClick={() => sectorGridOpen && setSectorGridOpen(false)}
        style={{ flex: 1, display: "flex", alignItems: "stretch", justifyContent: "center",
          padding: "6px 0 0 0", overflow: "hidden", position: "relative" }}>
        {currentProblem ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div key={currentProblem.id} variants={cardVariants}
                initial={swipeDir === "up" ? "enterUp" : "enterDown"} animate="center"
                exit={swipeDir === "up" ? "exitUp" : "exitDown"}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ width: "100%", height: "100%" }}>
                <InshortsCard problem={currentProblem} sectorColor={sectorColor} scoreGrad={scoreGrad}
                  bookmarked={isBookmarked(currentProblem.id)} noted={hasNote(currentProblem.id)}
                  onTap={() => onCardTap(currentProblem.id)} />
              </motion.div>
            </AnimatePresence>

            {/* Scroll indicator dots */}
            <div style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)",
              display: "flex", flexDirection: "column", gap: "5px", zIndex: 20 }}>
              {visibleProblems.slice(
                Math.max(0, clampedIndex - 4),
                Math.min(visibleProblems.length, clampedIndex + 5)
              ).map((_, i) => {
                const realIdx = Math.max(0, clampedIndex - 4) + i;
                return (
                  <div key={realIdx} style={{ width: "3px", height: realIdx === clampedIndex ? "14px" : "3px",
                    borderRadius: "2px", backgroundColor: realIdx === clampedIndex ? C.textPrimary : C.textGhost,
                    transition: "all 0.3s ease" }} />
                );
              })}
            </div>
          </>
        ) : (
          <FeedEmptyState onAdjustFilters={onFilterTap} />
        )}
      </div>

      {/* ── BOTTOM: swipe hint + counter ───────────────── */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: C.appBg, padding: "8px 16px 12px", gap: "12px" }}>
        {currentProblem && (
          <>
            <SwipeIndicator />
            <span style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500 }}>
              {clampedIndex + 1} / {visibleProblems.length}
            </span>
          </>
        )}
      </div>
    </main>
  );
}

/* ── INSHORTS-STYLE CARD ─────────────────────────────────── */
interface InshortsCardProps {
  problem: Problem;
  sectorColor: string;
  scoreGrad: { from: string; to: string };
  bookmarked: boolean;
  noted: boolean;
  onTap: () => void;
}

function InshortsCard({ problem, sectorColor, scoreGrad, bookmarked, noted, onTap }: InshortsCardProps) {
  const { C, theme } = useTheme();
  const imageUrl = getSectorImage(problem.sector);

  return (
    <div onClick={onTap} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
      cursor: "pointer", backgroundColor: C.cardBg, overflow: "hidden" }}>

      {/* ── Image Hero ── */}
      <div style={{ position: "relative", width: "100%", height: "42%", minHeight: "160px", flexShrink: 0, overflow: "hidden" }}>
        <img src={imageUrl} alt={problem.sector}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="eager" />
        {/* Gradient overlay at bottom of image */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px",
          background: `linear-gradient(transparent, ${C.cardBg})` }} />
        {/* Source badge on image */}
        <div style={{ position: "absolute", bottom: "10px", left: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "10px", color: C.textFaint, fontWeight: 500, backgroundColor: `${C.cardBg}CC`,
            padding: "3px 8px", borderRadius: "4px", backdropFilter: "blur(4px)" }}>
            📡 {problem.source}
          </span>
        </div>
        {/* Bookmark + Note icons */}
        <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "8px" }}>
          {bookmarked && (
            <div style={{ backgroundColor: `${C.cardBg}CC`, borderRadius: "8px", padding: "6px", backdropFilter: "blur(4px)" }}>
              <Bookmark size={16} color={C.accent} fill={C.accent} />
            </div>
          )}
          {noted && (
            <div style={{ backgroundColor: `${C.cardBg}CC`, borderRadius: "8px", padding: "6px", backdropFilter: "blur(4px)" }}>
              <FileText size={16} color={C.textDim} />
            </div>
          )}
        </div>
        {/* Score badge */}
        <div style={{ position: "absolute", top: "10px", left: "12px" }}>
          <div style={{ background: `linear-gradient(135deg, ${scoreGrad.from}, ${scoreGrad.to})`,
            borderRadius: "10px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#FFF", fontSize: "13px", fontWeight: 700 }}>{problem.opportunityScore}/10</span>
          </div>
        </div>
      </div>

      {/* ── Text Content ── */}
      <div style={{ flex: 1, padding: "14px 16px 10px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Sector + Score row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ backgroundColor: `${sectorColor}1A`, border: `1px solid ${sectorColor}33`,
            borderRadius: "6px", padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "12px" }}>{SECTOR_ICONS[problem.sector] || "📌"}</span>
            <span style={{ color: sectorColor, fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px",
              textTransform: "uppercase" }}>{problem.sector}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={11} color={C.textFaint} />
            <span style={{ color: C.textFaint, fontSize: "10px", fontWeight: 500 }}>
              {formatAddedDate(problem.createdAt)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 style={{ color: C.textPrimary, fontSize: "20px", fontWeight: 700, lineHeight: 1.3, margin: "0 0 8px 0",
          fontFamily: "'Outfit', 'Inter', sans-serif",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {problem.title}
        </h2>

        {/* Summary */}
        <p style={{ color: C.textMuted, fontSize: "14px", lineHeight: 1.55, margin: "0 0 10px 0", flex: 1,
          display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {problem.painSummary}
        </p>

        {/* Divider */}
        <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${C.borderDefault}, transparent)`,
          marginBottom: "8px" }} />

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {problem.tags.map((tag) => (
            <div key={tag} style={{ border: `1px solid ${C.borderDefault}`, borderRadius: "5px",
              padding: "3px 8px", display: "inline-flex", alignItems: "center" }}>
              <span style={{ color: C.textDim, fontSize: "10px", fontWeight: 500 }}>{tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────── */
function FeedEmptyState({ onAdjustFilters }: { onAdjustFilters: () => void }) {
  const { C } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 32px", gap: "16px", textAlign: "center", height: "100%" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: C.emptyIconBg,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
        <SlidersHorizontal size={28} color={C.textFaint} />
      </div>
      <p style={{ color: C.textPrimary, fontSize: "18px", fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
        No problems match your filters
      </p>
      <p style={{ color: C.textDim, fontSize: "14px", lineHeight: 1.5, margin: 0, maxWidth: "260px" }}>
        Try broadening your search by adjusting the sector, geography, or minimum opportunity score.
      </p>
      <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }} onClick={onAdjustFilters}
        style={{ marginTop: "8px", height: "50px", padding: "0 32px",
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`, borderRadius: "14px",
          border: "none", cursor: "pointer", boxShadow: `0 4px 16px ${C.accentGlow}`,
          color: "#FFFFFF", fontSize: "15px", fontWeight: 700 }}>
        Adjust Filters
      </motion.button>
    </div>
  );
}

function SwipeIndicator() {
  const { C } = useTheme();
  return (
    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      style={{ display: "flex", alignItems: "center", gap: "4px", opacity: 0.5 }}>
      <ChevronUp size={14} color={C.textFaint} strokeWidth={2} />
      <span style={{ color: C.textFaint, fontSize: "11px", fontWeight: 400 }}>Swipe to browse</span>
    </motion.div>
  );
}

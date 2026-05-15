import { lazy, Suspense, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, ChevronRight, FileText, Search } from "lucide-react";
import { getScoreGradient, getSectorColor } from "../data/problems";
import type { Problem } from "../data/problems";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useNotes } from "../contexts/NotesContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";
import { AnalyticsSkeleton } from "./analytics";
import { BottomNav } from "./BottomNav";

const AnalyticsOverview = lazy(() =>
  import("./analytics/AnalyticsOverview").then((module) => ({ default: module.AnalyticsOverview }))
);

type TabId = "overview" | "trending" | "opportunity" | "ai" | "sectors";

interface DashboardProps {
  onCardTap: (problemId: string) => void;
  onGoToFeed: () => void;
  onSavedTap: () => void;
  onDashboardTap: () => void;
  onSearchTap: () => void;
}

const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: "overview", emoji: "📊", label: "Overview" },
  { id: "trending", emoji: "🔥", label: "Trending" },
  { id: "opportunity", emoji: "💰", label: "High Opportunity" },
  { id: "ai", emoji: "🤖", label: "AI-Solvable" },
  { id: "sectors", emoji: "🧠", label: "Sectors" },
];

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  overview: "Live intelligence metrics, sector mix, score distribution, and pipeline activity",
  trending: "Problems gaining attention across sources",
  opportunity: "High pain, low competition - best startup bets",
  ai: "Best candidates for AI-powered solutions",
  sectors: "Explore problems by industry vertical",
};

const FREQ_ORDER: Record<string, number> = {
  "Very High": 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function getTrendingProblems(problems: Problem[]): Problem[] {
  return [...problems]
    .sort((a, b) => {
      if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
      return (FREQ_ORDER[b.frequency] || 0) - (FREQ_ORDER[a.frequency] || 0);
    })
    .slice(0, 5);
}

function getHighOpportunityProblems(problems: Problem[]): Problem[] {
  return [...problems]
    .filter((problem) => problem.opportunityScore >= 8)
    .sort((a, b) => {
      if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
      return a.scores.competition - b.scores.competition;
    });
}

function getAISolvableProblems(problems: Problem[]): Problem[] {
  return [...problems]
    .filter((problem) => problem.scores.aiFeasibility >= 8)
    .sort((a, b) => b.scores.aiFeasibility - a.scores.aiFeasibility);
}

interface SectorGroup {
  name: string;
  color: string;
  problems: Problem[];
  totalOpportunity: number;
}

function getSectorGroups(problems: Problem[]): SectorGroup[] {
  const map = new Map<string, Problem[]>();
  const normalize = (sector: string) => {
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
  };

  for (const problem of problems) {
    const key = normalize(problem.sector);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(problem);
  }

  return [...map.entries()]
    .map(([name, groupedProblems]) => ({
      name,
      color: getSectorColor(name.toUpperCase()),
      problems: groupedProblems,
      totalOpportunity: groupedProblems.reduce((sum, problem) => sum + problem.opportunityScore, 0),
    }))
    .sort((a, b) => b.totalOpportunity - a.totalOpportunity);
}

function getScorePill(problem: Problem, tab: Exclude<TabId, "overview">): { label: string; score: number } {
  switch (tab) {
    case "trending":
      return { label: "Rising", score: problem.opportunityScore };
    case "opportunity":
      return { label: `${problem.opportunityScore}/10`, score: problem.opportunityScore };
    case "ai":
      return { label: `AI ${problem.scores.aiFeasibility}/10`, score: problem.scores.aiFeasibility };
    case "sectors":
      return { label: `${problem.opportunityScore}/10`, score: problem.opportunityScore };
  }
}

export function Dashboard({
  onCardTap,
  onGoToFeed,
  onSavedTap,
  onDashboardTap,
  onSearchTap,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { C } = useTheme();
  const { problems } = useProblems();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    overview: null,
    trending: null,
    opportunity: null,
    ai: null,
    sectors: null,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftPos(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const moveTabFocus = (direction: 1 | -1) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <main
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: C.appBg,
        fontFamily: "'Inter', sans-serif",
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
          backgroundColor: C.appBg,
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
          Dashboard
        </span>
        <button
          onClick={onSearchTap}
          aria-label="Search problems"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.textDim,
            display: "flex",
            alignItems: "center",
            minWidth: "40px",
            minHeight: "40px",
            justifyContent: "center",
          }}
        >
          <Search size={22} />
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Dashboard sections"
        className="hide-scrollbar"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{
          width: "100%",
          height: "48px",
          flexShrink: 0,
          borderBottom: `1px solid ${C.borderSubtle}`,
          overflowX: "auto",
          overflowY: "hidden",
          backgroundColor: C.appBg,
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            padding: "0 20px", // Perfect padding on both left and right
            gap: "8px",
            width: "max-content", // Forces this inner box to be exactly as wide as the tabs
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveTabFocus(1);
                  }
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveTabFocus(-1);
                  }
                }}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: isActive ? C.cardBg : "transparent",
                  color: isActive ? C.textPrimary : C.textDim,
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  boxShadow: isActive ? `inset 0 -2px 0 ${C.accent}` : "none",
                }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            <p
              style={{
                color: C.textFaint,
                fontSize: "13px",
                lineHeight: 1.4,
                margin: "16px 20px 16px",
              }}
            >
              {TAB_DESCRIPTIONS[activeTab]}
            </p>

            {activeTab === "overview" ? (
              <Suspense fallback={<AnalyticsSkeleton />}>
                <AnalyticsOverview />
              </Suspense>
            ) : activeTab !== "sectors" ? (
              <FlatCardList tab={activeTab} problems={problems} onCardTap={onCardTap} />
            ) : (
              <SectorsView problems={problems} onCardTap={onCardTap} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav
        active="dashboard"
        onFeedTap={onGoToFeed}
        onSavedTap={onSavedTap}
        onDashboardTap={onDashboardTap}
      />
    </main>
  );
}

function FlatCardList({
  tab,
  problems,
  onCardTap,
}: {
  tab: Exclude<TabId, "overview" | "sectors">;
  problems: Problem[];
  onCardTap: (id: string) => void;
}) {
  let tabProblems: Problem[];
  if (tab === "trending") tabProblems = getTrendingProblems(problems);
  else if (tab === "opportunity") tabProblems = getHighOpportunityProblems(problems);
  else tabProblems = getAISolvableProblems(problems);

  if (tabProblems.length === 0) return <EmptyState tab={tab} />;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {tabProblems.map((problem) => (
        <CompactCard key={problem.id} problem={problem} tab={tab} onTap={() => onCardTap(problem.id)} />
      ))}
    </div>
  );
}

function CompactCard({
  problem,
  tab,
  onTap,
}: {
  problem: Problem;
  tab: Exclude<TabId, "overview">;
  onTap: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const { C } = useTheme();
  const { isBookmarked } = useBookmarks();
  const { hasNote } = useNotes();
  const sectorColor = getSectorColor(problem.sector.toUpperCase());
  const pill = getScorePill(problem, tab);
  const gradient = getScoreGradient(pill.score);

  return (
    <motion.div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onTap}
      animate={{ backgroundColor: pressed ? C.cardBgHover : C.cardBg }}
      transition={{ duration: 0.1 }}
      style={{
        borderRadius: "16px",
        border: `1px solid ${C.borderSubtle}`,
        padding: "18px",
        marginBottom: "12px",
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
              letterSpacing: "0.4px",
              textTransform: "uppercase",
            }}
          >
            {problem.sector}
          </span>
          {isBookmarked(problem.id) && <Bookmark size={14} color={C.accent} fill={C.accent} />}
          {hasNote(problem.id) && <FileText size={14} color={C.textDim} />}
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            borderRadius: "20px",
            padding: "4px 10px",
          }}
        >
          <span style={{ color: "#FFFFFF", fontSize: "11px", fontWeight: 700 }}>{pill.label}</span>
        </div>
      </div>

      <p
        style={{
          color: C.textPrimary,
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: 1.35,
          margin: "12px 0 0 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {problem.title}
      </p>

      <p
        style={{
          color: C.textMuted,
          fontSize: "13px",
          lineHeight: 1.4,
          margin: "6px 0 0 0",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {problem.painSummary}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {problem.tags.slice(1, 3).map((tag) => (
            <div
              key={tag}
              style={{
                border: `1px solid ${C.borderDefault}`,
                borderRadius: "6px",
                padding: "4px 8px",
              }}
            >
              <span style={{ color: C.textDim, fontSize: "10px", fontWeight: 500 }}>{tag}</span>
            </div>
          ))}
        </div>
        <ChevronRight size={16} color={C.textFaint} />
      </div>
    </motion.div>
  );
}

function SectorsView({ problems, onCardTap }: { problems: Problem[]; onCardTap: (id: string) => void }) {
  const groups = getSectorGroups(problems);
  const { C } = useTheme();
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set(groups.map((group) => group.name)));

  const toggleSector = (name: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div style={{ paddingBottom: "20px" }}>
      {groups.map((group) => {
        const isExpanded = expandedSectors.has(group.name);
        return (
          <div key={group.name} style={{ marginBottom: "8px" }}>
            <button
              onClick={() => toggleSector(group.name)}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${group.name}`}
              style={{
                width: "100%",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: group.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: C.textPrimary, fontSize: "16px", fontWeight: 600 }}>{group.name}</span>
                <span style={{ color: C.textDim, fontSize: "14px" }}>({group.problems.length})</span>
              </div>
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={16} color={C.textFaint} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "8px 20px 0" }}>
                    {group.problems.map((problem) => (
                      <CompactCard key={problem.id} problem={problem} tab="sectors" onTap={() => onCardTap(problem.id)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ tab }: { tab: Exclude<TabId, "overview"> }) {
  const { C } = useTheme();
  const icons: Record<Exclude<TabId, "overview">, string> = {
    trending: "🔥",
    opportunity: "🏆",
    ai: "🤖",
    sectors: "📁",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "48px", filter: "grayscale(1)", opacity: 0.3 }}>{icons[tab]}</div>
      <p style={{ color: C.textDim, fontSize: "16px", fontWeight: 500, margin: 0 }}>No problems found</p>
      <p style={{ color: C.textFaint, fontSize: "13px", textAlign: "center", lineHeight: 1.4, margin: 0 }}>
        Check back soon - new problems are discovered daily
      </p>
    </div>
  );
}

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  CreditCard,
  FileText,
  Heart,
  Landmark,
  Leaf,
  Moon,
  Palette,
  Search,
  SlidersHorizontal,
  Sprout,
  Sun,
  Truck,
  GraduationCap,
  Wind,
} from "lucide-react";
import { formatAddedDate, formatCompactDate } from "../utils/dateFormat";
import { getScoreGradient, getSectorColor } from "../data/problems";
import type { Problem } from "../data/problems";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useNotes } from "../contexts/NotesContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNewProblemsPoller } from "../hooks/useNewProblemsPoller";
import { T } from "../tokens";
import { getDeepLinkProblemId } from "../utils/deepLink";
import { searchProblems, loadRecentSearches, saveRecentSearch } from "../utils/search";
import { AnalyticsSkeleton } from "./analytics";
import { DeepDive } from "./DeepDive";
import { DEFAULT_FILTERS, isFilterActive, countMatchingProblems } from "./FiltersSheet";
import type { FilterState } from "./FiltersSheet";
import { LogoMark } from "./LogoMark";
import { NewProblemsBanner } from "./NewProblemsBanner";
import { Onboarding } from "./Onboarding";

const AnalyticsOverview = lazy(() =>
  import("./analytics/AnalyticsOverview").then((module) => ({ default: module.AnalyticsOverview }))
);

type NavTab = "feed" | "saved" | "dashboard";
type DashTab = "overview" | "trending" | "opportunity" | "ai" | "sectors";

interface DesktopLayoutProps {
  appliedFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onboardingDone: boolean;
  onOnboardingComplete: () => void;
  onAnnounce: (message: string) => void;
}

const SECTOR_CHIPS = [
  { label: "Healthcare", color: T.sector.healthcare },
  { label: "Fintech", color: T.sector.fintech },
  { label: "Education", color: T.sector.education },
  { label: "Agriculture", color: T.sector.agriculture },
  { label: "GovTech", color: T.sector.govtech },
  { label: "CleanTech", color: T.sector.cleantech },
  { label: "Employment", color: T.sector.employment },
  { label: "Creator Economy", color: T.sector.creator },
  { label: "Retail", color: T.sector.retail },
  { label: "Technology", color: T.sector.technology },
];

const DASH_TABS: { id: DashTab; emoji: string; label: string }[] = [
  { id: "overview", emoji: "📊", label: "Overview" },
  { id: "trending", emoji: "🔥", label: "Trending" },
  { id: "sectors", emoji: "🧠", label: "Sectors" },
  { id: "opportunity", emoji: "💰", label: "High Opp" },
  { id: "ai", emoji: "🤖", label: "AI" },
];

function applyFilters(problems: Problem[], filters: FilterState): Problem[] {
  if (!isFilterActive(filters)) return problems;
  return problems.filter((problem) => {
    if (filters.sectors.length > 0) {
      const match = filters.sectors.some((sector) => problem.sector.toLowerCase().includes(sector.toLowerCase()));
      if (!match) return false;
    }
    if (filters.geography.trim() && filters.geography.trim().toLowerCase() !== "india") {
      if (!problem.geography.toLowerCase().includes(filters.geography.trim().toLowerCase())) return false;
    }
    if (filters.aiSolvableOnly && problem.scores.aiFeasibility < 7) return false;
    if (problem.opportunityScore < filters.minOpportunity) return false;
    return true;
  });
}

function getDashProblems(tab: DashTab, problems: Problem[]): Problem[] {
  switch (tab) {
    case "overview":
      return [];
    case "trending":
      return [...problems].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
    case "opportunity":
      return [...problems]
        .filter((problem) => problem.opportunityScore >= 8)
        .sort((a, b) => b.opportunityScore - a.opportunityScore);
    case "ai":
      return [...problems]
        .filter((problem) => problem.scores.aiFeasibility >= 8)
        .sort((a, b) => b.scores.aiFeasibility - a.scores.aiFeasibility);
    case "sectors":
      return problems;
  }
}

interface SectorGroup {
  name: string;
  color: string;
  problems: Problem[];
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
    .map(([name, grouped]) => ({
      name,
      color: getSectorColor(name.toUpperCase()),
      problems: grouped,
    }))
    .sort((a, b) => {
      const aScore = a.problems.reduce((sum, problem) => sum + problem.opportunityScore, 0);
      const bScore = b.problems.reduce((sum, problem) => sum + problem.opportunityScore, 0);
      return bScore - aScore;
    });
}

export function DesktopLayout({
  appliedFilters,
  onApplyFilters,
  onboardingDone,
  onOnboardingComplete,
  onAnnounce,
}: DesktopLayoutProps) {
  const { C } = useTheme();
  const { problems } = useProblems();
  const { bookmarks } = useBookmarks();
  const { newCount, dismiss } = useNewProblemsPoller();
  const [activeNav, setActiveNav] = useState<NavTab>("feed");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(appliedFilters);
  const [dashTab, setDashTab] = useState<DashTab>("overview");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const filteredFeedProblems = useMemo(() => applyFilters(problems, appliedFilters), [appliedFilters, problems]);
  const savedProblems = useMemo(
    () => problems.filter((problem) => bookmarks.has(problem.id)),
    [bookmarks, problems]
  );
  const dashProblems = useMemo(() => getDashProblems(dashTab, problems), [dashTab, problems]);
  const searchResults = useMemo(() => searchProblems(problems, searchQuery), [problems, searchQuery]);
  const resultCount = useMemo(() => countMatchingProblems(localFilters, problems), [localFilters, problems]);

  const [feedSelectedId, setFeedSelectedId] = useState<string>(problems[0]?.id ?? "");
  const [savedSelectedId, setSavedSelectedId] = useState<string>("");
  const [dashSelectedId, setDashSelectedId] = useState<string>(problems[0]?.id ?? "");

  useEffect(() => setLocalFilters(appliedFilters), [appliedFilters]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  useEffect(() => {
    const deepLinkedId = getDeepLinkProblemId();
    if (!deepLinkedId) return;
    if (bookmarks.has(deepLinkedId)) {
      setActiveNav("saved");
      setSavedSelectedId(deepLinkedId);
    } else {
      setActiveNav("feed");
      setFeedSelectedId(deepLinkedId);
    }
  }, [bookmarks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchFocused(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (filteredFeedProblems.length > 0 && !filteredFeedProblems.some((problem) => problem.id === feedSelectedId)) {
      setFeedSelectedId(filteredFeedProblems[0].id);
    }
  }, [feedSelectedId, filteredFeedProblems]);

  useEffect(() => {
    if (savedProblems.length > 0 && !savedProblems.some((problem) => problem.id === savedSelectedId)) {
      setSavedSelectedId(savedProblems[0].id);
    }
    if (savedProblems.length === 0) setSavedSelectedId("");
  }, [savedProblems, savedSelectedId]);

  useEffect(() => {
    if (dashTab === "overview") return;
    const list = dashTab === "sectors" ? problems : dashProblems;
    if (list.length > 0) setDashSelectedId(list[0].id);
  }, [dashProblems, dashTab, problems]);

  const searchSuggestions = searchQuery.trim() ? searchResults.slice(0, 8) : [];
  const recentSuggestions = !searchQuery.trim() ? recentSearches : [];

  const activeList =
    activeNav === "feed"
      ? filteredFeedProblems
      : activeNav === "saved"
        ? savedProblems
        : dashTab === "overview"
          ? []
          : dashTab === "sectors"
            ? problems
            : dashProblems;

  const selectedId =
    activeNav === "feed"
      ? feedSelectedId
      : activeNav === "saved"
        ? savedSelectedId
        : dashSelectedId;

  const selectedProblem =
    problems.find((problem) => problem.id === selectedId) ??
    activeList[0] ??
    savedProblems[0] ??
    filteredFeedProblems[0] ??
    problems[0];

  const handleApplyFilters = () => {
    onApplyFilters(localFilters);
    setFilterPanelOpen(false);
  };

  const handleResetFilters = () => setLocalFilters(DEFAULT_FILTERS);

  const toggleSector = (label: string) =>
    setLocalFilters((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(label)
        ? prev.sectors.filter((sector) => sector !== label)
        : [...prev.sectors, label],
    }));

  const handleSearchSelect = (problem: Problem) => {
    setRecentSearches(saveRecentSearch(searchQuery || problem.title));
    setSearchFocused(false);
    if (bookmarks.has(problem.id)) {
      setActiveNav("saved");
      setSavedSelectedId(problem.id);
    } else {
      setActiveNav("feed");
      setFeedSelectedId(problem.id);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: C.appBg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: T.font.sans,
      }}
    >
      <DesktopTopNav
        activeNav={activeNav}
        onNavChange={(tab) => {
          setActiveNav(tab);
          if (tab !== "feed") setFilterPanelOpen(false);
        }}
        filterActive={isFilterActive(appliedFilters)}
        filterOpen={filterPanelOpen && activeNav === "feed"}
        onFilterToggle={() => activeNav === "feed" && setFilterPanelOpen((prev) => !prev)}
        searchRef={searchRef}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchFocused={searchFocused}
        onSearchFocus={() => setSearchFocused(true)}
        recentSearches={recentSuggestions}
        searchResults={searchSuggestions}
        onRecentSelect={(value) => {
          setSearchQuery(value);
          setRecentSearches(saveRecentSearch(value));
        }}
        onResultSelect={handleSearchSelect}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          style={{
            width: "400px",
            flexShrink: 0,
            borderRight: `1px solid ${C.borderSubtle}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: C.appBg,
            position: "relative",
          }}
        >
          {activeNav === "feed" && (
            <NewProblemsBanner
              count={newCount}
              onDismiss={async () => {
                const announced = await dismiss();
                onAnnounce(`Feed updated with ${announced} new problem${announced !== 1 ? "s" : ""}`);
              }}
            />
          )}
          <AnimatePresence initial={false}>
            {filterPanelOpen && activeNav === "feed" && (
              <motion.div
                key="filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden", flexShrink: 0 }}
              >
                <DesktopFilterPanel
                  filters={localFilters}
                  onToggleSector={toggleSector}
                  onChange={setLocalFilters}
                  onApply={handleApplyFilters}
                  onReset={handleResetFilters}
                  resultCount={resultCount}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {activeNav === "dashboard" && <DashboardSubTabs activeTab={dashTab} onTabChange={setDashTab} />}

          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
            {activeNav === "feed" ? (
              filteredFeedProblems.length > 0 ? (
                filteredFeedProblems.map((problem) => (
                  <DesktopListCard
                    key={problem.id}
                    problem={problem}
                    isActive={problem.id === feedSelectedId}
                    scoreValue={problem.opportunityScore}
                    onSelect={() => setFeedSelectedId(problem.id)}
                  />
                ))
              ) : (
                <DesktopEmptyState onAdjustFilters={() => setFilterPanelOpen(true)} />
              )
            ) : activeNav === "saved" ? (
              savedProblems.length > 0 ? (
                savedProblems.map((problem) => (
                  <DesktopListCard
                    key={problem.id}
                    problem={problem}
                    isActive={problem.id === savedSelectedId}
                    scoreValue={problem.opportunityScore}
                    onSelect={() => setSavedSelectedId(problem.id)}
                  />
                ))
              ) : (
                <DesktopSavedEmptyState />
              )
            ) : dashTab === "overview" ? (
              <DesktopOverviewList problems={problems} savedCount={savedProblems.length} />
            ) : dashTab === "sectors" ? (
              <DesktopSectorsView problems={problems} selectedId={dashSelectedId} onSelect={setDashSelectedId} />
            ) : (
              dashProblems.map((problem) => (
                <DesktopListCard
                  key={problem.id}
                  problem={problem}
                  isActive={problem.id === dashSelectedId}
                  scoreValue={dashTab === "ai" ? problem.scores.aiFeasibility : problem.opportunityScore}
                  scoreLabel={dashTab === "ai" ? "AI" : undefined}
                  onSelect={() => setDashSelectedId(problem.id)}
                />
              ))
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
            backgroundColor: C.appBg,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav === "dashboard" && dashTab === "overview" ? "overview" : selectedProblem?.id ?? "empty"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ minHeight: "100%" }}
            >
              {activeNav === "dashboard" && dashTab === "overview" ? (
                <Suspense fallback={<AnalyticsSkeleton />}>
                  <AnalyticsOverview />
                </Suspense>
              ) : selectedProblem ? (
                <DeepDive problemId={selectedProblem.id} onBack={() => {}} hideBack />
              ) : (
                <DesktopSavedEmptyState />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!onboardingDone && (
          <motion.div
            key="onboarding-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              backgroundColor: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onOnboardingComplete}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                width: "480px",
                height: "640px",
                borderRadius: "24px",
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <Onboarding onComplete={onOnboardingComplete} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TopNavProps {
  activeNav: NavTab;
  onNavChange: (tab: NavTab) => void;
  filterActive: boolean;
  filterOpen: boolean;
  onFilterToggle: () => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchFocused: boolean;
  onSearchFocus: () => void;
  recentSearches: string[];
  searchResults: Problem[];
  onRecentSelect: (value: string) => void;
  onResultSelect: (problem: Problem) => void;
}

function DesktopTopNav({
  activeNav,
  onNavChange,
  filterActive,
  filterOpen,
  onFilterToggle,
  searchRef,
  searchQuery,
  onSearchQueryChange,
  searchFocused,
  onSearchFocus,
  recentSearches,
  searchResults,
  onRecentSelect,
  onResultSelect,
}: TopNavProps) {
  const { C, theme, toggleTheme } = useTheme();
  const { isBookmarked } = useBookmarks();
  const { hasNote } = useNotes();

  return (
    <div
      style={{
        height: "56px",
        flexShrink: 0,
        backgroundColor: C.appBg,
        borderBottom: `1px solid ${C.borderSubtle}`,
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <LogoMark size={24} />
        <span
          style={{
            fontFamily: T.font.display,
            fontSize: "18px",
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: "-0.3px",
          }}
        >
          ProblemLens
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        {(["feed", "saved", "dashboard"] as const).map((tab) => {
          const isActive = tab === activeNav;
          return (
            <button
              key={tab}
              onClick={() => onNavChange(tab)}
              aria-label={`Open ${tab}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isActive ? C.textPrimary : C.textDim,
                fontSize: "15px",
                fontWeight: isActive ? 600 : 400,
                padding: "4px 0 6px",
                borderBottom: `2px solid ${isActive ? C.accent : "transparent"}`,
                transition: "color 0.15s, border-color 0.15s",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div ref={searchRef} style={{ position: "relative", width: "320px" }}>
        <div
          style={{
            height: "38px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "12px",
            border: `1px solid ${searchFocused ? C.accent : C.borderDefault}`,
            backgroundColor: C.cardBg,
            padding: "0 12px",
          }}
        >
          <Search size={15} color={searchFocused ? C.accent : C.textFaint} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onFocus={onSearchFocus}
            placeholder="Search problems..."
            aria-label="Search problems"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.textPrimary,
              fontSize: "13px",
              fontFamily: T.font.sans,
            }}
          />
        </div>

        <AnimatePresence>
          {searchFocused && (searchQuery.trim() ? searchResults.length > 0 : recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              style={{
                position: "absolute",
                top: "46px",
                left: 0,
                right: 0,
                borderRadius: "14px",
                border: `1px solid ${C.borderSubtle}`,
                backgroundColor: C.cardBg,
                boxShadow: "0 18px 48px rgba(0,0,0,0.18)",
                overflow: "auto",
                zIndex: 100,
                maxHeight: "360px",
              }}
            >
              {searchQuery.trim() ? (
                searchResults.map((problem) => (
                  <button
                    key={problem.id}
                    onClick={() => onResultSelect(problem)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      padding: "12px 14px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${C.borderSubtle}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <span style={{ color: C.textPrimary, fontSize: "13px", fontWeight: 600 }}>
                        {problem.title}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isBookmarked(problem.id) && <Bookmark size={14} color={C.accent} fill={C.accent} />}
                        {hasNote(problem.id) && <FileText size={14} color={C.textDim} />}
                      </div>
                    </div>
                    <span
                      style={{
                        color: C.textDim,
                        fontSize: "12px",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginTop: "4px",
                      }}
                    >
                      {problem.painSummary}
                    </span>
                  </button>
                ))
              ) : (
                <div style={{ padding: "10px" }}>
                  <div
                    style={{
                      color: C.textFaint,
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      margin: "4px 4px 8px",
                    }}
                  >
                    Recent searches
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        onClick={() => onRecentSelect(search)}
                        style={{
                          height: "32px",
                          padding: "0 12px",
                          borderRadius: "999px",
                          border: "none",
                          backgroundColor: C.subtleBg,
                          color: C.textDim,
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {activeNav === "feed" && (
          <div style={{ position: "relative" }}>
            <button
              onClick={onFilterToggle}
              aria-label="Toggle filters"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "34px",
                padding: "0 14px",
                borderRadius: T.radius.lg,
                border: `1px solid ${filterOpen ? C.accent : C.borderDefault}`,
                backgroundColor: filterOpen ? `${C.accent}15` : "transparent",
                color: filterOpen || filterActive ? C.accent : C.textDim,
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>
            {filterActive && !filterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "-3px",
                  right: "-3px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: C.accent,
                }}
              />
            )}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.15 }}
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to daylight mode" : "Switch to night mode"}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            background: "none",
            border: `1px solid ${C.borderDefault}`,
            borderRadius: T.radius.lg,
            cursor: "pointer",
            width: "36px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme === "dark" ? "#FFB300" : C.textDim,
          }}
        >
          {theme === "dark" ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </motion.button>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  filters: FilterState;
  onToggleSector: (label: string) => void;
  onChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  resultCount: number;
}

function DesktopFilterPanel({
  filters,
  onToggleSector,
  onChange,
  onApply,
  onReset,
  resultCount,
}: FilterPanelProps) {
  const { C } = useTheme();
  return (
    <div
      style={{
        borderBottom: `1px solid ${C.borderSubtle}`,
        padding: "14px 16px 12px",
        backgroundColor: C.subtleBg,
        flexShrink: 0,
      }}
    >
      <p
        style={{
          color: C.textFaint,
          fontSize: "11px",
          fontWeight: 600,
          margin: "0 0 8px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Sectors
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        {SECTOR_CHIPS.map(({ label, color }) => {
          const active = filters.sectors.includes(label);
          return (
            <button
              key={label}
              onClick={() => onToggleSector(label)}
              style={{
                height: "28px",
                padding: "0 10px",
                borderRadius: T.radius.lg,
                border: `1px solid ${active ? color : C.borderDefault}`,
                backgroundColor: active ? `${color}1A` : "transparent",
                color: active ? color : C.textDim,
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500, margin: "0 0 4px" }}>
            Geography
          </p>
          <input
            type="text"
            value={filters.geography}
            onChange={(event) => onChange({ ...filters, geography: event.target.value })}
            style={{
              width: "100%",
              height: "30px",
              backgroundColor: C.cardBg,
              border: `1px solid ${C.borderDefault}`,
              borderRadius: T.radius.md,
              padding: "0 10px",
              color: C.textPrimary,
              fontSize: "13px",
              outline: "none",
              fontFamily: T.font.sans,
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "3px" }}>
          <span style={{ color: C.textDim, fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
            AI only
          </span>
          <div
            onClick={() => onChange({ ...filters, aiSolvableOnly: !filters.aiSolvableOnly })}
            style={{
              width: "38px",
              height: "22px",
              backgroundColor: filters.aiSolvableOnly ? C.accent : C.toggleOff,
              borderRadius: T.radius.full,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: filters.aiSolvableOnly ? "18px" : "2px",
                width: "18px",
                height: "18px",
                backgroundColor: "#FFFFFF",
                borderRadius: "50%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <p style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500, margin: 0 }}>
            Min Opportunity Score
          </p>
          <span style={{ color: C.accent, fontSize: "13px", fontWeight: 700 }}>{filters.minOpportunity}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={filters.minOpportunity}
          onChange={(event) => onChange({ ...filters, minOpportunity: +event.target.value })}
          style={{ width: "100%", accentColor: C.accent, cursor: "pointer", height: "4px" }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onReset}
          style={{
            height: "34px",
            padding: "0 14px",
            background: "none",
            border: `1px solid ${C.borderDefault}`,
            borderRadius: T.radius.md,
            color: C.textDim,
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
        <button
          onClick={onApply}
          style={{
            flex: 1,
            height: "34px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            border: "none",
            borderRadius: T.radius.md,
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 4px 12px ${C.accentGlow}`,
          }}
        >
          Apply ({resultCount})
        </button>
      </div>
    </div>
  );
}

function DashboardSubTabs({ activeTab, onTabChange }: { activeTab: DashTab; onTabChange: (tab: DashTab) => void }) {
  const { C } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDown: false, active: false, startX: 0, scrollLeft: 0, pointerId: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    dragState.current = { isDown: true, active: false, startX: e.clientX, scrollLeft: scrollRef.current.scrollLeft, pointerId: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.isDown || !scrollRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    if (!dragState.current.active) {
      if (Math.abs(dx) < 5) return;
      dragState.current.active = true;
      scrollRef.current.setPointerCapture(dragState.current.pointerId);
    }
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState.current.active && scrollRef.current) {
      scrollRef.current.releasePointerCapture(e.pointerId);
    }
    dragState.current = { isDown: false, active: false, startX: 0, scrollLeft: 0, pointerId: 0 };
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        height: "44px",
        flexShrink: 0,
        overflowX: "auto",
        overflowY: "hidden",
        borderBottom: `1px solid ${C.borderSubtle}`,
        cursor: "grab",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          padding: "0 12px",
          gap: "4px",
          width: "max-content",
        }}
      >
        {DASH_TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                height: "30px",
                padding: "0 10px",
                borderRadius: T.radius.lg,
                border: "none",
                backgroundColor: active ? C.cardBg : "transparent",
                color: active ? C.textPrimary : C.textDim,
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow: active ? `inset 0 -2px 0 ${C.accent}` : "none",
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesktopOverviewList({ problems, savedCount }: { problems: Problem[]; savedCount: number }) {
  const { C } = useTheme();
  const highOpp = problems.filter((problem) => problem.opportunityScore >= 8).length;
  const rising = problems.filter((problem) => problem.trendStatus === "Rising").length;

  return (
    <div style={{ padding: "18px 16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ color: C.textPrimary, fontSize: "16px", fontWeight: 700, margin: 0 }}>Intelligence Overview</p>
      <p style={{ color: C.textDim, fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
        Sector mix, score distribution, trend health, recent activity, and your saved queue all live here.
      </p>
      <div
        style={{
          borderRadius: T.radius.lg,
          border: `1px solid ${C.borderSubtle}`,
          backgroundColor: C.cardBg,
          padding: "14px",
          display: "grid",
          gap: "10px",
        }}
      >
        <OverviewMiniStat label="Total problems" value={String(problems.length)} />
        <OverviewMiniStat label="High opp (8+)" value={String(highOpp)} />
        <OverviewMiniStat label="Rising now" value={String(rising)} />
        <OverviewMiniStat label="Saved" value={String(savedCount)} />
      </div>
    </div>
  );
}

function OverviewMiniStat({ label, value }: { label: string; value: string }) {
  const { C } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ color: C.textDim, fontSize: "12px", fontWeight: 500 }}>{label}</span>
      <span style={{ color: C.textPrimary, fontSize: "16px", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

interface ListCardProps {
  problem: Problem;
  isActive: boolean;
  scoreValue: number;
  scoreLabel?: string;
  onSelect: () => void;
}

function DesktopListCard({ problem, isActive, scoreValue, scoreLabel, onSelect }: ListCardProps) {
  const { C } = useTheme();
  const { isBookmarked } = useBookmarks();
  const { hasNote } = useNotes();
  const sectorColor = getSectorColor(problem.sector.toUpperCase());
  const gradient = getScoreGradient(scoreValue);

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "12px 16px 12px 13px",
        borderLeft: `3px solid ${isActive ? C.accent : "transparent"}`,
        backgroundColor: isActive ? C.cardBgHover : "transparent",
        borderBottom: `1px solid ${C.borderSubtle}`,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px", gap: "12px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: `${sectorColor}22`,
            border: `1px solid ${sectorColor}40`,
            borderRadius: T.radius.sm,
            padding: "3px 8px",
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
            borderRadius: T.radius.md,
            padding: "3px 8px",
          }}
        >
          <span style={{ color: "#FFFFFF", fontSize: "11px", fontWeight: 700 }}>
            {scoreLabel ? `${scoreLabel} ${scoreValue}/10` : `${scoreValue}/10`}
          </span>
        </div>
      </div>
      <p
        style={{
          color: C.textPrimary,
          fontSize: "15px",
          fontWeight: 600,
          lineHeight: 1.3,
          margin: "0 0 4px",
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
          fontSize: "12px",
          lineHeight: 1.4,
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {problem.painSummary}
      </p>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          marginTop: "6px",
        }}
      >
        <Calendar size={10} color={C.textFaint} />
        <span style={{ color: C.textFaint, fontSize: "10px", fontWeight: 500 }}>
          {formatCompactDate(problem.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ── Sector icon map ─────────────────────────────────────── */
const SECTOR_ICON_MAP: Record<string, React.ReactNode> = {
  "Technology":        <Cpu size={28} />,
  "Fintech / Retail":  <CreditCard size={28} />,
  "Legal / GovTech":   <Landmark size={28} />,
  "Healthcare":        <Heart size={28} />,
  "Employment / EdTech": <Briefcase size={28} />,
  "Education":         <GraduationCap size={28} />,
  "Agriculture":       <Sprout size={28} />,
  "CleanTech":         <Wind size={28} />,
  "Transportation":    <Truck size={28} />,
  "Creator Economy":   <Palette size={28} />,
  "Rare Disease":      <Heart size={28} />,
  "Retail":            <CreditCard size={28} />,
};

function getSectorIcon(name: string): React.ReactNode {
  return SECTOR_ICON_MAP[name] || <Leaf size={28} />;
}

function DesktopSectorsView({
  problems,
  selectedId,
  onSelect,
}: {
  problems: Problem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const groups = getSectorGroups(problems);
  const { C, theme } = useTheme();
  const [activeSector, setActiveSector] = useState<string | null>(null);

  const activeGroup = activeSector ? groups.find((g) => g.name === activeSector) : null;

  // When a sector is selected and its problems list loads, auto-select the first problem
  useEffect(() => {
    if (activeGroup && activeGroup.problems.length > 0) {
      const first = activeGroup.problems[0];
      if (!activeGroup.problems.some((p) => p.id === selectedId)) {
        onSelect(first.id);
      }
    }
  }, [activeSector]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: "0" }}>
      <AnimatePresence mode="wait">
        {activeSector === null ? (
          /* ── GRID VIEW ─────────────────────────────────────── */
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {/* Grid header */}
            <div
              style={{
                padding: "16px 16px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  color: C.textDim,
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Browse by sector
              </span>
              <span
                style={{
                  color: C.textFaint,
                  fontSize: "11px",
                  fontWeight: 500,
                }}
              >
                {groups.length} sectors
              </span>
            </div>

            {/* Sector icon grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                padding: "8px 14px 16px",
              }}
            >
              {groups.map((group) => {
                const icon = getSectorIcon(group.name);
                return (
                  <motion.button
                    key={group.name}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setActiveSector(group.name)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "16px 6px 14px",
                      borderRadius: T.radius["2xl"],
                      border: `1px solid ${group.color}30`,
                      backgroundColor:
                        theme === "dark"
                          ? `${group.color}12`
                          : `${group.color}0A`,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Subtle radial glow behind the icon */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-10px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${group.color}18 0%, transparent 70%)`,
                        pointerEvents: "none",
                      }}
                    />

                    {/* Icon container */}
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        backgroundColor: `${group.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: group.color,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {icon}
                    </div>

                    {/* Sector name */}
                    <span
                      style={{
                        color: C.textPrimary,
                        fontSize: "11px",
                        fontWeight: 600,
                        textAlign: "center",
                        lineHeight: 1.2,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {group.name}
                    </span>

                    {/* Problem count badge */}
                    <span
                      style={{
                        color: group.color,
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: `${group.color}18`,
                        padding: "2px 8px",
                        borderRadius: T.radius.full,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {group.problems.length}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : activeGroup ? (
          /* ── PROBLEM LIST VIEW (after sector tap) ──────────── */
          <motion.div
            key={`list-${activeSector}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            {/* Back button + sector header */}
            <button
              onClick={() => setActiveSector(null)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                background: "none",
                border: "none",
                borderBottom: `1px solid ${C.borderSubtle}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  backgroundColor: `${activeGroup.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: activeGroup.color,
                }}
              >
                <ChevronLeft size={16} />
              </div>

              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: `${activeGroup.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: activeGroup.color,
                }}
              >
                {getSectorIcon(activeGroup.name)}
              </div>

              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ color: C.textPrimary, fontSize: "14px", fontWeight: 700 }}>
                  {activeGroup.name}
                </div>
                <div style={{ color: C.textDim, fontSize: "11px", fontWeight: 500 }}>
                  {activeGroup.problems.length} problem{activeGroup.problems.length !== 1 ? "s" : ""} found
                </div>
              </div>
            </button>

            {/* Problem cards list */}
            {activeGroup.problems.map((problem) => (
              <DesktopListCard
                key={problem.id}
                problem={problem}
                isActive={problem.id === selectedId}
                scoreValue={problem.opportunityScore}
                onSelect={() => onSelect(problem.id)}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DesktopEmptyState({ onAdjustFilters }: { onAdjustFilters: () => void }) {
  const { C } = useTheme();
  return (
    <div
      style={{
        padding: "48px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: C.emptyIconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SlidersHorizontal size={22} color={C.textGhost} />
      </div>
      <p style={{ color: C.textMuted, fontSize: "15px", fontWeight: 500, margin: 0 }}>
        No problems match your filters
      </p>
      <button
        onClick={onAdjustFilters}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: C.accent,
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "underline",
          textUnderlineOffset: "3px",
          padding: 0,
        }}
      >
        Adjust filters
      </button>
    </div>
  );
}

function DesktopSavedEmptyState() {
  const { C } = useTheme();
  return (
    <div
      style={{
        padding: "48px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: C.emptyIconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bookmark size={22} color={C.accent} fill={C.accent} />
      </div>
      <p style={{ color: C.textMuted, fontSize: "15px", fontWeight: 500, margin: 0 }}>
        No saved problems yet
      </p>
      <p style={{ color: C.textDim, fontSize: "13px", lineHeight: 1.5, margin: 0, maxWidth: "220px" }}>
        Bookmark any problem to keep it handy here.
      </p>
    </div>
  );
}

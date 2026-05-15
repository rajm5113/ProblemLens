import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal, ChevronRight, Sun, Moon } from "lucide-react";
import { PROBLEMS, getSectorColor, getScoreGradient } from "../data/problems";
import type { Problem } from "../data/problems";
import {
  DEFAULT_FILTERS,
  isFilterActive,
  countMatchingProblems,
} from "./FiltersSheet";
import type { FilterState } from "./FiltersSheet";
import { DeepDive } from "./DeepDive";
import { Onboarding } from "./Onboarding";
import { LogoMark } from "./LogoMark";
import { T } from "../tokens";
import { useTheme } from "../contexts/ThemeContext";

/* ── Types ─────────────────────────────────────────────── */
type NavTab = "feed" | "dashboard";
type DashTab = "trending" | "opportunity" | "ai" | "sectors";

interface DesktopLayoutProps {
  appliedFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onboardingDone: boolean;
  onOnboardingComplete: () => void;
}

/* ── Sector chips ─────────────────────────────────────── */
const SECTOR_CHIPS = [
  { label: "Healthcare",      color: T.sector.healthcare  },
  { label: "Fintech",         color: T.sector.fintech     },
  { label: "Education",       color: T.sector.education   },
  { label: "Agriculture",     color: T.sector.agriculture },
  { label: "GovTech",         color: T.sector.govtech     },
  { label: "CleanTech",       color: T.sector.cleantech   },
  { label: "Employment",      color: T.sector.employment  },
  { label: "Creator Economy", color: T.sector.creator     },
  { label: "Retail",          color: T.sector.retail      },
  { label: "Technology",      color: T.sector.technology  },
];

/* ── Dashboard tab config ─────────────────────────────── */
const DASH_TABS: { id: DashTab; emoji: string; label: string }[] = [
  { id: "trending",    emoji: "🔥", label: "Trending"  },
  { id: "opportunity", emoji: "💰", label: "High Opp"  },
  { id: "ai",          emoji: "🤖", label: "AI"         },
  { id: "sectors",     emoji: "🧠", label: "Sectors"   },
];

/* ── Filter logic ─────────────────────────────────────── */
function applyFilters(problems: Problem[], f: FilterState): Problem[] {
  if (!isFilterActive(f)) return problems;
  return problems.filter((p) => {
    if (f.sectors.length > 0) {
      const match = f.sectors.some((s) =>
        p.sector.toLowerCase().includes(s.toLowerCase())
      );
      if (!match) return false;
    }
    if (f.geography.trim() && f.geography.trim().toLowerCase() !== "india") {
      if (!p.geography.toLowerCase().includes(f.geography.trim().toLowerCase()))
        return false;
    }
    if (f.aiSolvableOnly && p.scores.aiFeasibility < 7) return false;
    if (p.opportunityScore < f.minOpportunity) return false;
    return true;
  });
}

/* ── Dashboard data per tab ───────────────────────────── */
function getDashProblems(tab: DashTab): Problem[] {
  switch (tab) {
    case "trending":
      return [...PROBLEMS].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
    case "opportunity":
      return [...PROBLEMS].filter((p) => p.opportunityScore >= 8).sort((a, b) => b.opportunityScore - a.opportunityScore);
    case "ai":
      return [...PROBLEMS].filter((p) => p.scores.aiFeasibility >= 8).sort((a, b) => b.scores.aiFeasibility - a.scores.aiFeasibility);
    case "sectors":
      return PROBLEMS;
  }
}

/* ── Sector grouping ──────────────────────────────────── */
interface SectorGroup { name: string; color: string; problems: Problem[] }
function getSectorGroups(): SectorGroup[] {
  const map = new Map<string, Problem[]>();
  const normalize = (s: string) => {
    const u = s.toUpperCase();
    if (u.includes("HEALTHCARE")) return "Healthcare";
    if (u.includes("FINTECH"))    return "Fintech / Retail";
    if (u.includes("AGRICULTURE")) return "Agriculture";
    if (u.includes("EMPLOYMENT") || u.includes("EDTECH")) return "Employment / EdTech";
    if (u.includes("CLEANTECH"))  return "CleanTech";
    if (u.includes("LEGAL") || u.includes("GOVTECH")) return "Legal / GovTech";
    if (u.includes("EDUCATION"))  return "Education";
    if (u.includes("CREATOR"))    return "Creator Economy";
    return s;
  };
  for (const p of PROBLEMS) {
    const key = normalize(p.sector);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .map(([name, problems]) => ({ name, problems, color: getSectorColor(name.toUpperCase()) }))
    .sort((a, b) => {
      const aScore = a.problems.reduce((s, p) => s + p.opportunityScore, 0);
      const bScore = b.problems.reduce((s, p) => s + p.opportunityScore, 0);
      return bScore - aScore;
    });
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export function DesktopLayout({
  appliedFilters,
  onApplyFilters,
  onboardingDone,
  onOnboardingComplete,
}: DesktopLayoutProps) {
  const { C } = useTheme();
  const [activeNav, setActiveNav] = useState<NavTab>("feed");
  const [feedSelectedId, setFeedSelectedId] = useState<number>(PROBLEMS[0].id);
  const [dashSelectedId, setDashSelectedId] = useState<number>(PROBLEMS[0].id);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(appliedFilters);
  const [dashTab, setDashTab] = useState<DashTab>("trending");

  useEffect(() => setLocalFilters(appliedFilters), [appliedFilters]);

  const filteredFeedProblems = useMemo(() => applyFilters(PROBLEMS, appliedFilters), [appliedFilters]);
  const dashProblems = useMemo(() => getDashProblems(dashTab), [dashTab]);
  const selectedId = activeNav === "feed" ? feedSelectedId : dashSelectedId;
  const resultCount = useMemo(() => countMatchingProblems(localFilters), [localFilters]);

  useEffect(() => {
    if (filteredFeedProblems.length === 0) return;
    if (!filteredFeedProblems.some((p) => p.id === feedSelectedId)) {
      setFeedSelectedId(filteredFeedProblems[0].id);
    }
  }, [filteredFeedProblems]);

  useEffect(() => {
    const list = getDashProblems(dashTab);
    if (list.length > 0) setDashSelectedId(list[0].id);
  }, [dashTab]);

  const handleApplyFilters = () => { onApplyFilters(localFilters); setFilterPanelOpen(false); };
  const handleResetFilters = () => setLocalFilters(DEFAULT_FILTERS);
  const toggleSector = (label: string) =>
    setLocalFilters((f) => ({
      ...f,
      sectors: f.sectors.includes(label)
        ? f.sectors.filter((s) => s !== label)
        : [...f.sectors, label],
    }));

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
          if (tab === "dashboard") setFilterPanelOpen(false);
        }}
        filterActive={isFilterActive(appliedFilters)}
        filterOpen={filterPanelOpen && activeNav === "feed"}
        onFilterToggle={() => activeNav === "feed" && setFilterPanelOpen((p) => !p)}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ── LEFT PANEL ── */}
        <div
          style={{
            width: "400px",
            flexShrink: 0,
            borderRight: `1px solid ${C.borderSubtle}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: C.appBg,
          }}
        >
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

          {activeNav === "dashboard" && (
            <DashboardSubTabs activeTab={dashTab} onTabChange={setDashTab} />
          )}

          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
            {activeNav === "feed" ? (
              filteredFeedProblems.length > 0 ? (
                filteredFeedProblems.map((p) => (
                  <DesktopListCard
                    key={p.id} problem={p}
                    isActive={p.id === feedSelectedId}
                    scoreValue={p.opportunityScore}
                    onSelect={() => setFeedSelectedId(p.id)}
                  />
                ))
              ) : (
                <DesktopEmptyState onAdjustFilters={() => setFilterPanelOpen(true)} />
              )
            ) : dashTab === "sectors" ? (
              <DesktopSectorsView selectedId={dashSelectedId} onSelect={setDashSelectedId} />
            ) : (
              dashProblems.map((p) => (
                <DesktopListCard
                  key={p.id} problem={p}
                  isActive={p.id === dashSelectedId}
                  scoreValue={dashTab === "ai" ? p.scores.aiFeasibility : p.opportunityScore}
                  scoreLabel={dashTab === "ai" ? "AI" : undefined}
                  onSelect={() => setDashSelectedId(p.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
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
              key={selectedId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ minHeight: "100%" }}
            >
              <DeepDive problemId={selectedId} onBack={() => {}} hideBack />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Onboarding modal ── */}
      <AnimatePresence>
        {!onboardingDone && (
          <motion.div
            key="onboarding-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              backgroundColor: "rgba(0,0,0,0.75)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={onOnboardingComplete}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                width: "480px", height: "640px",
                borderRadius: "24px", overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Onboarding onComplete={onOnboardingComplete} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DESKTOP TOP NAV
══════════════════════════════════════════════════════════ */
interface TopNavProps {
  activeNav: NavTab;
  onNavChange: (tab: NavTab) => void;
  filterActive: boolean;
  filterOpen: boolean;
  onFilterToggle: () => void;
}

function DesktopTopNav({ activeNav, onNavChange, filterActive, filterOpen, onFilterToggle }: TopNavProps) {
  const { C, theme, toggleTheme } = useTheme();
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
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "40px" }}>
        <LogoMark size={24} />
        <span style={{ fontFamily: T.font.display, fontSize: "18px", fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.3px" }}>
          ProblemLens
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        {(["feed", "dashboard"] as const).map((tab) => {
          const isActive = tab === activeNav;
          return (
            <button
              key={tab}
              onClick={() => onNavChange(tab)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: isActive ? C.textPrimary : C.textDim,
                fontSize: "15px", fontWeight: isActive ? 600 : 400,
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

      <div style={{ flex: 1 }} />

      {/* Right zone: filter toggle + theme toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Filter toggle — Feed only */}
        {activeNav === "feed" && (
          <div style={{ position: "relative" }}>
            <button
              onClick={onFilterToggle}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                height: "34px", padding: "0 14px", borderRadius: T.radius.lg,
                border: `1px solid ${filterOpen ? C.accent : C.borderDefault}`,
                backgroundColor: filterOpen ? `${C.accent}15` : "transparent",
                color: filterOpen || filterActive ? C.accent : C.textDim,
                fontSize: "13px", fontWeight: 500, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>
            {filterActive && !filterOpen && (
              <div
                style={{
                  position: "absolute", top: "-3px", right: "-3px",
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: C.accent, pointerEvents: "none",
                }}
              />
            )}
          </div>
        )}

        {/* ── Theme toggle (sun / moon) ── */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.15 }}
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to daylight mode" : "Switch to night mode"}
          style={{
            background: "none",
            border: `1px solid ${C.borderDefault}`,
            borderRadius: T.radius.lg,
            cursor: "pointer",
            width: "36px", height: "34px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: theme === "dark" ? "#FFB300" : C.textDim,
            transition: "all 0.15s",
          }}
        >
          {theme === "dark" ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DESKTOP FILTER PANEL
══════════════════════════════════════════════════════════ */
interface FilterPanelProps {
  filters: FilterState;
  onToggleSector: (label: string) => void;
  onChange: (f: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  resultCount: number;
}

function DesktopFilterPanel({ filters, onToggleSector, onChange, onApply, onReset, resultCount }: FilterPanelProps) {
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
      <p style={{ color: C.textFaint, fontSize: "11px", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Sectors
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        {SECTOR_CHIPS.map(({ label, color }) => {
          const isActive = filters.sectors.includes(label);
          return (
            <button
              key={label}
              onClick={() => onToggleSector(label)}
              style={{
                height: "28px", padding: "0 10px",
                borderRadius: T.radius.lg,
                border: `1px solid ${isActive ? color : C.borderDefault}`,
                backgroundColor: isActive ? `${color}1A` : "transparent",
                color: isActive ? color : C.textDim,
                fontSize: "12px", fontWeight: 500, cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Geography + AI row */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500, margin: "0 0 4px" }}>Geography</p>
          <input
            type="text" value={filters.geography}
            onChange={(e) => onChange({ ...filters, geography: e.target.value })}
            style={{
              width: "100%", height: "30px",
              backgroundColor: C.cardBg, border: `1px solid ${C.borderDefault}`,
              borderRadius: T.radius.md, padding: "0 10px",
              color: C.textPrimary, fontSize: "13px", outline: "none",
              fontFamily: T.font.sans,
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "3px" }}>
          <span style={{ color: C.textDim, fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>AI only</span>
          <div
            onClick={() => onChange({ ...filters, aiSolvableOnly: !filters.aiSolvableOnly })}
            style={{
              width: "38px", height: "22px",
              backgroundColor: filters.aiSolvableOnly ? C.accent : C.toggleOff,
              borderRadius: T.radius.full, cursor: "pointer",
              position: "relative", transition: "background-color 0.2s", flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute", top: "2px",
                left: filters.aiSolvableOnly ? "18px" : "2px",
                width: "18px", height: "18px",
                backgroundColor: "#FFFFFF", borderRadius: "50%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.2s",
              }}
            />
          </div>
        </div>
      </div>

      {/* Min opportunity */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <p style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500, margin: 0 }}>Min Opportunity Score</p>
          <span style={{ color: C.accent, fontSize: "13px", fontWeight: 700 }}>{filters.minOpportunity}</span>
        </div>
        <input
          type="range" min="1" max="10"
          value={filters.minOpportunity}
          onChange={(e) => onChange({ ...filters, minOpportunity: +e.target.value })}
          style={{ width: "100%", accentColor: C.accent, cursor: "pointer", height: "4px" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.textGhost, fontSize: "10px" }}>1</span>
          <span style={{ color: C.textGhost, fontSize: "10px" }}>10</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onReset}
          style={{
            height: "34px", padding: "0 14px",
            background: "none", border: `1px solid ${C.borderDefault}`,
            borderRadius: T.radius.md, color: C.textDim,
            fontSize: "12px", fontWeight: 500, cursor: "pointer",
          }}
        >
          Reset
        </button>
        <button
          onClick={onApply}
          style={{
            flex: 1, height: "34px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            border: "none", borderRadius: T.radius.md,
            color: "#FFFFFF", fontSize: "13px", fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 12px ${C.accentGlow}`,
          }}
        >
          Apply ({resultCount})
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD SUB-TABS
══════════════════════════════════════════════════════════ */
function DashboardSubTabs({ activeTab, onTabChange }: { activeTab: DashTab; onTabChange: (t: DashTab) => void }) {
  const { C } = useTheme();
  return (
    <div
      style={{
        height: "44px", flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 12px", gap: "4px",
        borderBottom: `1px solid ${C.borderSubtle}`,
      }}
    >
      {DASH_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              height: "30px", padding: "0 10px",
              borderRadius: T.radius.lg, border: "none",
              backgroundColor: isActive ? C.cardBg : "transparent",
              color: isActive ? C.textPrimary : C.textDim,
              fontSize: "12px", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px",
              boxShadow: isActive ? `inset 0 -2px 0 ${C.accent}` : "none",
              transition: "all 0.12s",
            }}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DESKTOP LIST CARD
══════════════════════════════════════════════════════════ */
interface ListCardProps {
  problem: Problem;
  isActive: boolean;
  scoreValue: number;
  scoreLabel?: string;
  onSelect: () => void;
}

function DesktopListCard({ problem, isActive, scoreValue, scoreLabel, onSelect }: ListCardProps) {
  const { C } = useTheme();
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
        transition: "background-color 0.1s, border-color 0.1s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center",
            backgroundColor: `${sectorColor}22`, border: `1px solid ${sectorColor}40`,
            borderRadius: T.radius.sm, padding: "3px 8px",
          }}
        >
          <span style={{ color: sectorColor, fontSize: "10px", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>
            {problem.sector}
          </span>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, borderRadius: T.radius.md, padding: "3px 8px" }}>
          <span style={{ color: "#FFFFFF", fontSize: "11px", fontWeight: 700 }}>
            {scoreLabel ? `${scoreLabel} ${scoreValue}/10` : `${scoreValue}/10`}
          </span>
        </div>
      </div>
      <p style={{ color: C.textPrimary, fontSize: "15px", fontWeight: 600, lineHeight: 1.3, margin: "0 0 4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {problem.title}
      </p>
      <p style={{ color: C.textMuted, fontSize: "12px", fontWeight: 400, lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {problem.painSummary}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DESKTOP SECTORS VIEW
══════════════════════════════════════════════════════════ */
function DesktopSectorsView({ selectedId, onSelect }: { selectedId: number; onSelect: (id: number) => void }) {
  const groups = getSectorGroups();
  const { C } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map((g) => g.name)));
  const toggleGroup = (name: string) =>
    setExpanded((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });

  return (
    <div>
      {groups.map((group) => {
        const isExpanded = expanded.has(group.name);
        return (
          <div key={group.name}>
            <button
              onClick={() => toggleGroup(group.name)}
              style={{
                width: "100%", height: "40px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", background: "none", border: "none",
                borderBottom: `1px solid ${C.borderSubtle}`, cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: group.color, flexShrink: 0 }} />
                <span style={{ color: C.textPrimary, fontSize: "14px", fontWeight: 600 }}>{group.name}</span>
                <span style={{ color: C.textDim, fontSize: "12px" }}>({group.problems.length})</span>
              </div>
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} color={C.textFaint} />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                  {group.problems.map((p) => (
                    <DesktopListCard key={p.id} problem={p} isActive={p.id === selectedId} scoreValue={p.opportunityScore} onSelect={() => onSelect(p.id)} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DESKTOP EMPTY STATE
══════════════════════════════════════════════════════════ */
function DesktopEmptyState({ onAdjustFilters }: { onAdjustFilters: () => void }) {
  const { C } = useTheme();
  return (
    <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "12px" }}>
      <div
        style={{
          width: "56px", height: "56px", borderRadius: "50%",
          backgroundColor: C.emptyIconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <SlidersHorizontal size={22} color={C.textGhost} />
      </div>
      <p style={{ color: C.textMuted, fontSize: "15px", fontWeight: 500, margin: 0 }}>No problems match your filters</p>
      <button
        onClick={onAdjustFilters}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.accent, fontSize: "13px", fontWeight: 500,
          textDecoration: "underline", textUnderlineOffset: "3px", padding: 0,
        }}
      >
        Adjust filters
      </button>
    </div>
  );
}
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronRight } from "lucide-react";
import { PROBLEMS, getSectorColor, getScoreGradient } from "../data/problems";
import type { Problem } from "../data/problems";
import { BottomNav } from "./BottomNav";
import { useTheme } from "../contexts/ThemeContext";

/* ── Types ── */
type TabId = "trending" | "opportunity" | "ai" | "sectors";

interface DashboardProps {
  onCardTap: (problemId: number) => void;
  onGoToFeed: () => void;
  onDashboardTap: () => void;
}

/* ── Tab definitions ── */
const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: "trending", emoji: "🔥", label: "Trending" },
  { id: "opportunity", emoji: "💰", label: "High Opportunity" },
  { id: "ai", emoji: "🤖", label: "AI-Solvable" },
  { id: "sectors", emoji: "🧠", label: "Sectors" },
];

/* ── Tab descriptions ── */
const TAB_DESCRIPTIONS: Record<TabId, string> = {
  trending: "Problems gaining attention across sources",
  opportunity: "High pain, low competition — best startup bets",
  ai: "Best candidates for AI-powered solutions",
  sectors: "Explore problems by industry vertical",
};

/* ── Frequency sort order ── */
const FREQ_ORDER: Record<string, number> = {
  "Very High": 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

/* ── Tab data derivation ── */
function getTrendingProblems(): Problem[] {
  return [...PROBLEMS]
    .sort((a, b) => {
      if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
      return (FREQ_ORDER[b.frequency] || 0) - (FREQ_ORDER[a.frequency] || 0);
    })
    .slice(0, 5);
}

function getHighOpportunityProblems(): Problem[] {
  return [...PROBLEMS]
    .filter((p) => p.opportunityScore >= 8)
    .sort((a, b) => {
      if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
      return a.scores.competition - b.scores.competition;
    });
}

function getAISolvableProblems(): Problem[] {
  return [...PROBLEMS]
    .filter((p) => p.scores.aiFeasibility >= 8)
    .sort((a, b) => b.scores.aiFeasibility - a.scores.aiFeasibility);
}

interface SectorGroup {
  name: string;
  color: string;
  problems: Problem[];
  totalOpportunity: number;
}

function getSectorGroups(): SectorGroup[] {
  const map = new Map<string, Problem[]>();

  // Normalize sector names for grouping
  const normalizeSector = (s: string) => {
    const u = s.toUpperCase();
    if (u.includes("HEALTHCARE")) return "Healthcare";
    if (u.includes("FINTECH")) return "Fintech / Retail";
    if (u.includes("AGRICULTURE")) return "Agriculture";
    if (u.includes("EMPLOYMENT") || u.includes("EDTECH")) return "Employment / EdTech";
    if (u.includes("CLEANTECH")) return "CleanTech";
    if (u.includes("LEGAL") || u.includes("GOVTECH")) return "Legal / GovTech";
    if (u.includes("EDUCATION")) return "Education";
    if (u.includes("CREATOR")) return "Creator Economy";
    return s;
  };

  for (const p of PROBLEMS) {
    const key = normalizeSector(p.sector);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const groups: SectorGroup[] = [];
  for (const [name, problems] of map) {
    const totalOpportunity = problems.reduce((s, p) => s + p.opportunityScore, 0);
    const color = getSectorColor(name.toUpperCase());
    groups.push({ name, color, problems, totalOpportunity });
  }

  return groups.sort((a, b) => b.totalOpportunity - a.totalOpportunity);
}

/* ── Score pill content per tab ── */
function getScorePill(problem: Problem, tab: TabId): { label: string; score: number } {
  switch (tab) {
    case "trending":
      return { label: "🔥 Rising", score: problem.opportunityScore };
    case "opportunity":
      return { label: `${problem.opportunityScore}/10`, score: problem.opportunityScore };
    case "ai":
      return {
        label: `🤖 ${problem.scores.aiFeasibility}/10`,
        score: problem.scores.aiFeasibility,
      };
    case "sectors":
      return { label: `${problem.opportunityScore}/10`, score: problem.opportunityScore };
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export function Dashboard({ onCardTap, onGoToFeed, onDashboardTap }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("trending");
  const { C } = useTheme();

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
      }}
    >
      {/* ── Header ── */}
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
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.textDim,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search size={22} />
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div
        style={{
          height: "48px",
          flexShrink: 0,
          borderBottom: `1px solid ${C.borderSubtle}`,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          display: "flex",
          alignItems: "center",
          paddingLeft: "20px",
          gap: "6px",
          backgroundColor: C.appBg,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                position: "relative",
                transition: "background-color 0.15s, color 0.15s",
                boxShadow: isActive ? `inset 0 -2px 0 ${C.accent}` : "none",
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
        {/* Right fade hint */}
        <div
          style={{
            position: "sticky",
            right: 0,
            width: "32px",
            height: "48px",
            flexShrink: 0,
            background: `linear-gradient(to right, transparent, ${C.appBg})`,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Scrollable Content ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            {/* View description */}
            <p
              style={{
                color: C.textFaint,
                fontSize: "13px",
                fontWeight: 400,
                lineHeight: 1.4,
                margin: "16px 20px 16px",
              }}
            >
              {TAB_DESCRIPTIONS[activeTab]}
            </p>

            {activeTab !== "sectors" ? (
              <FlatCardList tab={activeTab} onCardTap={onCardTap} />
            ) : (
              <SectorsView onCardTap={onCardTap} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Nav Bar ── */}
      <BottomNav
        active="dashboard"
        onFeedTap={onGoToFeed}
        onDashboardTap={onDashboardTap}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FLAT CARD LIST (Trending / Opportunity / AI tabs)
───────────────────────────────────────────────────────── */
function FlatCardList({ tab, onCardTap }: { tab: TabId; onCardTap: (id: number) => void }) {
  let problems: Problem[];
  if (tab === "trending") problems = getTrendingProblems();
  else if (tab === "opportunity") problems = getHighOpportunityProblems();
  else problems = getAISolvableProblems();

  if (problems.length === 0) return <EmptyState tab={tab} />;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {problems.map((p) => (
        <CompactCard key={p.id} problem={p} tab={tab} onTap={() => onCardTap(p.id)} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   COMPACT PROBLEM CARD
───────────────────────────────────────────────────────── */
function CompactCard({
  problem,
  tab,
  onTap,
}: {
  problem: Problem;
  tab: TabId;
  onTap: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const { C } = useTheme();
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
      {/* Row 1: Sector badge + Score pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
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
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            borderRadius: "20px",
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            {pill.label}
          </span>
        </div>
      </div>

      {/* Row 2: Title */}
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

      {/* Row 3: Pain summary */}
      <p
        style={{
          color: C.textMuted,
          fontSize: "13px",
          fontWeight: 400,
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

      {/* Row 4: Tags + arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "14px",
        }}
      >
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
              <span style={{ color: C.textDim, fontSize: "10px", fontWeight: 500 }}>
                {tag}
              </span>
            </div>
          ))}
        </div>
        <ChevronRight size={16} color={C.textFaint} />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   SECTORS VIEW
───────────────────────────────────────────────────────── */
function SectorsView({ onCardTap }: { onCardTap: (id: number) => void }) {
  const groups = getSectorGroups();
  const { C } = useTheme();
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(
    new Set(groups.map((g) => g.name))
  );

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
            {/* Sector header */}
            <button
              onClick={() => toggleSector(group.name)}
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
                <span
                  style={{
                    color: C.textPrimary,
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  {group.name}
                </span>
                <span
                  style={{
                    color: C.textDim,
                    fontSize: "14px",
                    fontWeight: 400,
                  }}
                >
                  ({group.problems.length})
                </span>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} color={C.textFaint} />
              </motion.div>
            </button>

            {/* Sector cards */}
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
                    {group.problems.map((p) => (
                      <CompactCard
                        key={p.id}
                        problem={p}
                        tab="sectors"
                        onTap={() => onCardTap(p.id)}
                      />
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

/* ─────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────── */
function EmptyState({ tab }: { tab: TabId }) {
  const { C } = useTheme();
  const icons: Record<TabId, string> = {
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
      <div
        style={{
          fontSize: "48px",
          filter: "grayscale(1)",
          opacity: 0.3,
        }}
      >
        {icons[tab]}
      </div>
      <p style={{ color: C.textDim, fontSize: "16px", fontWeight: 500, margin: 0 }}>
        No problems found
      </p>
      <p
        style={{
          color: C.textFaint,
          fontSize: "13px",
          fontWeight: 400,
          margin: 0,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        Check back soon — new problems are discovered daily
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   BOTTOM NAV BAR — removed (now using shared BottomNav)
───────────────────────────────────────────────────────── */
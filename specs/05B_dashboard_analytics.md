# Spec 5B: Dashboard Analytics — Charts, Sparklines & Intelligence Overview

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 5A (Backend Enhancements) ✅
> **Produces:** Analytics dashboard with live charts, sector distribution, score radar, pipeline activity, and trend sparklines

---

## 1. Purpose

The current dashboard is a **filtered card list** — Trending, High Opportunity, AI-Solvable, and Sectors. It works, but it doesn't feel like an *analytics dashboard*. It has no charts, no visual data storytelling, no pipeline visibility.

This spec transforms the Dashboard into a **data-rich intelligence hub** with:

- Summary stat cards showing total problems, average opportunity, pipeline activity
- A sector distribution donut chart
- A score radar chart for the top problem
- Trend status sparklines showing the health of the card inventory
- Pipeline activity feed from the new `/api/pipeline/runs` endpoint
- All built with `recharts` (already installed) and the existing design system

### Design Principle

These are **additive enhancements** — the existing 4 dashboard tabs (Trending, Opportunity, AI, Sectors) remain unchanged. We add a new **"Overview"** tab as the default landing, plus enrich the existing tabs with visual elements.

---

## 2. New "Overview" Tab

### 2.1 Layout (Mobile)

```
┌────────────────────────────────┐
│  📊 Overview tab (default)     │
├────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │ Total│ │ Avg  │ │Rising│    │  ← Summary stat cards (horizontal scroll)
│ │  23  │ │ 7.8  │ │  5   │    │
│ └──────┘ └──────┘ └──────┘    │
├────────────────────────────────┤
│  Sector Distribution           │  ← Donut chart (recharts PieChart)
│         [donut]                │
│  Healthcare 5 ● Fintech 4 ●   │  ← Legend below
├────────────────────────────────┤
│  Score Distribution            │  ← Bar chart (recharts BarChart)
│  █ █ █ █ █ █ █ █ █ █          │
│  1 2 3 4 5 6 7 8 9 10         │
├────────────────────────────────┤
│  Trend Health                  │  ← Horizontal stacked bar
│  ████ New  ██ Rising ██ Stable │
├────────────────────────────────┤
│  Recent Pipeline Runs          │  ← Activity feed from /api/pipeline/runs
│  • 2h ago: 3 new, 1 merged     │
│  • 8h ago: 5 new, 2 merged     │
│  • 14h ago: 1 new, 0 merged    │
└────────────────────────────────┘
```

### 2.2 Layout (Desktop — right panel)

On desktop, the Overview tab content appears in the existing dashboard right panel. The layout is the same but wider, allowing the donut and bar chart to sit side-by-side.

---

## 3. Frontend Components

### 3.1 New File: `AnalyticsOverview.tsx`

This is the main container for the Overview tab content.

```tsx
// src/app/components/analytics/AnalyticsOverview.tsx

import { useState, useEffect } from "react";
import { useProblems } from "../../contexts/ProblemsContext";
import { useTheme } from "../../contexts/ThemeContext";
import { StatCards } from "./StatCards";
import { SectorDonut } from "./SectorDonut";
import { ScoreDistribution } from "./ScoreDistribution";
import { TrendHealth } from "./TrendHealth";
import { PipelineActivity } from "./PipelineActivity";

export function AnalyticsOverview() {
  const { problems } = useProblems();
  const { C } = useTheme();

  return (
    <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <StatCards problems={problems} />
      <SectorDonut problems={problems} />
      <ScoreDistribution problems={problems} />
      <TrendHealth problems={problems} />
      <PipelineActivity />
    </div>
  );
}
```

### 3.2 `StatCards.tsx` — Summary Metrics

A horizontal scrolling row of glassmorphic stat cards:

```tsx
// src/app/components/analytics/StatCards.tsx

interface StatCardData {
  label: string;
  value: string;
  emoji: string;
  color: string;
}

function computeStats(problems: Problem[]): StatCardData[] {
  const total = problems.length;
  const avgOpp = total > 0
    ? (problems.reduce((s, p) => s + p.opportunityScore, 0) / total).toFixed(1)
    : "0";
  const rising = problems.filter(p => p.trendStatus === "Rising").length;
  const highOpp = problems.filter(p => p.opportunityScore >= 8).length;
  const aiSolvable = problems.filter(p => p.scores.aiFeasibility >= 8).length;

  return [
    { label: "Total Problems", value: String(total), emoji: "📊", color: "#6366F1" },
    { label: "Avg Opportunity", value: avgOpp, emoji: "💰", color: "#F59E0B" },
    { label: "Rising", value: String(rising), emoji: "🔥", color: "#EF4444" },
    { label: "High Opp (8+)", value: String(highOpp), emoji: "🏆", color: "#10B981" },
    { label: "AI-Solvable", value: String(aiSolvable), emoji: "🤖", color: "#8B5CF6" },
  ];
}
```

**Styling:** Each card uses glassmorphism — `backdrop-filter: blur(12px)`, semi-transparent background from the theme, subtle border. The value text uses `fontSize: 28px` with `fontWeight: 800` for impact.

### 3.3 `SectorDonut.tsx` — Sector Distribution

Uses `recharts` `PieChart` with `innerRadius` for the donut hole:

```tsx
// src/app/components/analytics/SectorDonut.tsx

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getSectorColor } from "../../data/problems";

// Data derivation:
function getSectorData(problems: Problem[]): { name: string; value: number; color: string }[] {
  const map = new Map<string, number>();
  for (const p of problems) {
    const key = normalizeSector(p.sector); // reuse existing normalizer
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: getSectorColor(name.toUpperCase()),
    }))
    .sort((a, b) => b.value - a.value);
}
```

**Chart config:**

- `PieChart` with `innerRadius={50}`, `outerRadius={80}`
- Custom tooltip with dark background
- Legend rendered manually as colored dots with labels below the chart
- Total count displayed in the center of the donut via an absolute-positioned element

### 3.4 `ScoreDistribution.tsx` — Opportunity Score Histogram

Shows how many problems fall in each score bucket (1-10):

```tsx
// src/app/components/analytics/ScoreDistribution.tsx

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function getScoreBuckets(problems: Problem[]): { score: number; count: number }[] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: 0 }));
  for (const p of problems) {
    const idx = Math.max(0, Math.min(9, Math.round(p.opportunityScore) - 1));
    buckets[idx].count++;
  }
  return buckets;
}
```

**Chart config:**

- `BarChart` with `ResponsiveContainer` height 180px
- Bars colored by score: green (8+), amber (5-7), red (<5)
- No Y-axis line, minimal X-axis labels (1, 5, 10)
- Rounded bar tops via `radius={[4, 4, 0, 0]}`

### 3.5 `TrendHealth.tsx` — Trend Status Breakdown

A horizontal stacked progress bar showing what percentage of cards are New / Rising / Stable / Declining:

```tsx
// src/app/components/analytics/TrendHealth.tsx

const TREND_COLORS = {
  New: "#6366F1",       // Indigo
  Rising: "#EF4444",    // Red
  Stable: "#10B981",    // Green
  Declining: "#6B7280", // Gray
};

function getTrendData(problems: Problem[]) {
  const counts = { New: 0, Rising: 0, Stable: 0, Declining: 0 };
  for (const p of problems) {
    if (p.trendStatus in counts) counts[p.trendStatus as keyof typeof counts]++;
  }
  const total = problems.length || 1;
  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    pct: Math.round((count / total) * 100),
    color: TREND_COLORS[status as keyof typeof TREND_COLORS],
  }));
}
```

**Rendering:**

- Single horizontal bar, 12px tall, rounded ends, sections proportional to count
- Below the bar: a row of `● Status: N (X%)` labels
- Uses CSS flexbox with percentage widths, no recharts needed

### 3.6 `PipelineActivity.tsx` — Recent Runs Feed

Fetches from the new `/api/pipeline/runs` endpoint:

```tsx
// src/app/components/analytics/PipelineActivity.tsx

interface PipelineRun {
  runId: string;
  stage: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  signalCount: number;
  hasCard: boolean;
}

export function PipelineActivity() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/pipeline/runs?limit=5`)
      .then(r => r.json())
      .then(setRuns)
      .catch(() => {});
  }, []);

  // Render as a timeline with dots and relative timestamps
  // "2h ago: 3 signals → 2 new cards, 1 merged"
}
```

**Styling:**

- Vertical timeline with colored dots (green = success, amber = merged, red = error)
- Relative timestamps using `date-fns` `formatDistanceToNow()`
- "No pipeline runs yet" empty state if no runs exist

---

## 4. API Additions

### 4.1 Expanded Stats Endpoint

Update the existing `GET /api/stats` to include trend and sector breakdowns:

```python
# api/models.py — update StatsResponse
class StatsResponse(CamelModel):
    total_problems: int
    average_opportunity: float
    top_sector: str
    sector_counts: dict[str, int]       # NEW
    trend_counts: dict[str, int]        # NEW
    score_distribution: list[int]        # NEW — 10 buckets, index 0 = score 1

    @classmethod
    def from_cards(cls, cards):
        sector_counts = {}
        trend_counts = {"New": 0, "Rising": 0, "Stable": 0, "Declining": 0}
        score_dist = [0] * 10
        for c in cards:
            sector_counts[c.sector.value] = sector_counts.get(c.sector.value, 0) + 1
            trend_counts[c.trend_status.value] = trend_counts.get(c.trend_status.value, 0) + 1
            idx = max(0, min(9, round(c.opportunity_score) - 1))
            score_dist[idx] += 1
        # ... rest of existing logic
```

### 4.2 New API Service Functions

```ts
// src/app/services/api.ts — add
export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/stats`);
  return readJson<StatsResponse>(res, "Failed to load stats");
}

export async function fetchPipelineRuns(limit = 5): Promise<PipelineRun[]> {
  const res = await fetch(`${API_BASE}/pipeline/runs?limit=${limit}`);
  return readJson<PipelineRun[]>(res, "Failed to load pipeline runs");
}
```

---

## 5. Integration Points

### 5.1 Dashboard Tab Update

Add "Overview" as the new default tab:

```tsx
// Dashboard.tsx — update
type TabId = "overview" | "trending" | "opportunity" | "ai" | "sectors";

const TABS = [
  { id: "overview",    emoji: "📊", label: "Overview" },    // NEW — default
  { id: "trending",    emoji: "🔥", label: "Trending" },
  { id: "opportunity", emoji: "💰", label: "High Opportunity" },
  { id: "ai",          emoji: "🤖", label: "AI-Solvable" },
  { id: "sectors",     emoji: "🧠", label: "Sectors" },
];

// In render:
{activeTab === "overview" ? (
  <AnalyticsOverview />
) : activeTab !== "sectors" ? (
  <FlatCardList tab={activeTab} problems={problems} onCardTap={onCardTap} />
) : (
  <SectorsView problems={problems} onCardTap={onCardTap} />
)}
```

### 5.2 DesktopLayout Tab Update

Same change in `DesktopLayout.tsx` — add Overview to `DASH_TABS` and render `AnalyticsOverview` when active.

### 5.3 Chart Theming

All `recharts` components must respect the current theme (dark/light):

```tsx
// Charts should use these from useTheme().C:
// - C.textPrimary for axis labels
// - C.textDim for secondary labels
// - C.cardBg for tooltip background
// - C.borderSubtle for grid lines
// - C.appBg for chart background

// Example recharts tooltip style:
const tooltipStyle = {
  backgroundColor: C.cardBg,
  border: `1px solid ${C.borderSubtle}`,
  borderRadius: "8px",
  color: C.textPrimary,
  fontSize: "12px",
};
```

---

## 6. Design Requirements

### 6.1 Glassmorphic Stat Cards

```css
/* Each stat card */
background: rgba(255, 255, 255, 0.04);  /* dark mode */
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16px;
padding: 20px;
```

### 6.2 Chart Container Pattern

Every chart section follows this wrapper pattern:

```tsx
<div style={{
  backgroundColor: C.cardBg,
  borderRadius: "16px",
  border: `1px solid ${C.borderSubtle}`,
  padding: "16px",
}}>
  <h3 style={{ color: C.textPrimary, fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>
    Section Title
  </h3>
  {/* chart content */}
</div>
```

### 6.3 Animation Requirements

- Stat card numbers count up on mount using `motion.span` with `animate={{ opacity: [0, 1] }}`
- Charts fade in with `motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}`
- Donut segments animate from 0° to final angle on mount (recharts `animationDuration={800}`)

### 6.4 Responsive Behavior

- **Mobile (< 768px):** All sections stack vertically, full width
- **Desktop (≥ 768px):** Stat cards in a single row, donut + score histogram side-by-side (2 columns via CSS grid)

---

## 7. File Deliverables

| File                                                       | Action                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/src/app/components/analytics/AnalyticsOverview.tsx` | **Create** — overview container                            |
| `app/src/app/components/analytics/StatCards.tsx`         | **Create** — summary metric cards                          |
| `app/src/app/components/analytics/SectorDonut.tsx`       | **Create** — sector pie chart                              |
| `app/src/app/components/analytics/ScoreDistribution.tsx` | **Create** — opportunity histogram                         |
| `app/src/app/components/analytics/TrendHealth.tsx`       | **Create** — trend status bar                              |
| `app/src/app/components/analytics/PipelineActivity.tsx`  | **Create** — recent runs feed                              |
| `app/src/app/components/analytics/index.ts`              | **Create** — barrel export                                 |
| `app/src/app/components/Dashboard.tsx`                   | **Update** — add Overview tab, import analytics            |
| `app/src/app/components/DesktopLayout.tsx`               | **Update** — add Overview tab to desktop dashboard         |
| `app/src/app/services/api.ts`                            | **Update** — add `fetchStats()`, `fetchPipelineRuns()` |
| `backend/api/models.py`                                  | **Update** — expand `StatsResponse` with new fields      |
| `backend/api/routes/stats.py`                            | **Update** — compute new stats fields                      |

---

## 8. Testing Strategy

### 8.1 Frontend

| Test              | What It Validates                                        |
| ----------------- | -------------------------------------------------------- |
| Visual smoke test | Overview tab renders all 5 sections without errors       |
| Empty state       | Dashboard with 0 problems shows "No data yet" gracefully |
| Theme switching   | All charts switch dark/light correctly                   |
| Mobile layout     | Sections stack vertically on narrow viewport             |
| Desktop layout    | Sections use grid layout on wide viewport                |

### 8.2 Backend

| Test                                       | What It Validates                                  |
| ------------------------------------------ | -------------------------------------------------- |
| `test_stats_includes_sector_counts`      | StatsResponse has `sectorCounts` dict            |
| `test_stats_includes_trend_counts`       | StatsResponse has `trendCounts` dict             |
| `test_stats_includes_score_distribution` | StatsResponse has 10-element `scoreDistribution` |
| `test_pipeline_runs_camelcase`           | `/api/pipeline/runs` returns camelCase keys      |

### 8.3 Verification Commands

```bash
# Backend
cd backend
.venv\Scripts\python.exe -m pytest -q

# Frontend
cd app
npm run build
```

---

## 9. Exit Conditions

- [ ] "Overview" tab is the default landing on the Dashboard
- [ ] Summary stat cards show total, avg opportunity, rising, high opp, AI-solvable counts
- [ ] Sector donut chart renders with correct colors and legend
- [ ] Score distribution bar chart shows 10 buckets with color coding
- [ ] Trend health bar shows New/Rising/Stable/Declining proportions
- [ ] Pipeline activity feed shows recent runs with relative timestamps
- [ ] All charts respect dark/light theme
- [ ] Responsive: stacks on mobile, grids on desktop
- [ ] `GET /api/stats` returns expanded response with `sectorCounts`, `trendCounts`, `scoreDistribution`
- [ ] `npm run build` passes
- [ ] `pytest` passes (no regressions)
- [ ] Existing 4 tabs (Trending, Opportunity, AI, Sectors) still work identically

---

## 10. What's Next

| Spec         | Scope                                           |
| ------------ | ----------------------------------------------- |
| **5C** | User features — bookmarks, notes, search, auth |

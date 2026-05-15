# Screen 4: Dashboard Views

## Context for Figma AI
You are designing the **dashboard screen** for the Problem Intelligence Platform — an app that presents real-world problems as structured startup opportunities. While the Feed screen (Screen 1) lets users swipe through problems one at a time, the Dashboard gives users **curated, filtered lenses** to explore problems strategically.

Think of this as the **"Explore" tab** — similar to how Spotify has curated playlists beyond the home feed, or how a stock trading app has watchlists, top movers, and sector views. Each view answers a different strategic question.

---

## Screen Purpose
The Feed answers: "What problems exist?"
The Dashboard answers: **"Which problems should I pay attention to right now?"**

It provides four curated views:
- 🔥 **Trending** — Problems gaining attention rapidly
- 💰 **High Opportunity** — High pain + low competition sweet spot
- 🤖 **AI-Solvable** — Best candidates for AI-powered startups
- 🧠 **Sector Insights** — Explore by industry vertical

Each view is a pre-filtered, pre-sorted lens on the same underlying data. Users do NOT set these filters manually — the platform curates them.

---

## Platform
- **Primary**: Mobile (375 × 812px — iPhone 13/14 viewport)
- **Behavior**: Vertically scrollable within each tab view

---

## Layout Architecture

The screen has a **fixed top zone** (header + tab bar) and a **scrollable content zone** below it. The content zone changes based on which tab is active.

```
┌─────────────────────────────────┐
│         TOP HEADER              │  ← Fixed, 56px
├─────────────────────────────────┤
│    TAB BAR (horizontal scroll)  │  ← Fixed, 48px
├─────────────────────────────────┤
│                                 │
│                                 │
│    SCROLLABLE CONTENT           │  ← Changes per active tab
│    (list of compact cards)      │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│       BOTTOM NAV BAR            │  ← Fixed, 64px
└─────────────────────────────────┘
```

---

## Component Breakdown

### 1. Top Header
- **Height**: 56px
- **Background**: Screen background (#0D0D1A), seamless
- **Horizontal padding**: 20px
- **Layout**: Flex row, space-between, vertically centered

| Position | Element | Details |
|----------|---------|---------|
| Left | Screen Title | "Dashboard" in 22px, bold (700), white |
| Right | Search Icon (optional) | Magnifying glass, 22px, muted grey (#808090). Future feature — can be present but non-functional for MVP. |

---

### 2. Tab Bar (Horizontal Scrollable)
- **Height**: 48px
- **Position**: Fixed below header
- **Background**: Same as screen background
- **Layout**: Horizontal scroll row, no wrap. Tabs extend beyond viewport if needed — user scrolls horizontally.
- **Horizontal padding**: 20px (left), then tabs flow naturally
- **Gap between tabs**: 6px
- **Bottom border**: 1px solid rgba(255,255,255,0.06) at the very bottom of the tab bar zone

#### Individual Tab
- **Height**: 36px
- **Padding**: 0px 16px
- **Border-radius**: 10px
- **Typography**: 13px, medium weight (500)

Each tab has an **emoji icon** on the left and **label text** on the right, with 6px gap between them.

**Tab list:**

| Tab | Icon | Label |
|-----|------|-------|
| Tab 1 | 🔥 | Trending |
| Tab 2 | 💰 | High Opportunity |
| Tab 3 | 🤖 | AI-Solvable |
| Tab 4 | 🧠 | Sectors |

**Two states:**

| State | Background | Text Color |
|-------|-----------|------------|
| Inactive | Transparent | #808090 |
| Active | #1A1A2E (elevated) | #FFFFFF |

- **Active tab** also has a subtle bottom accent: 2px solid #00E676 at the bottom edge of the tab pill (inside the border-radius).
- **Default active tab**: "Trending" (first tab) on initial load.
- **Tap behavior**: Switching tabs changes the content below with a subtle crossfade (no slide animation between tab contents).

---

### 3. Scrollable Content Area

This zone fills the remaining viewport between the tab bar and the bottom nav bar. Content here changes based on the active tab. All four tab views use **compact problem cards** in a vertical list — NOT the full-screen swipe cards from the Feed.

---

### 4. Compact Problem Card (Shared Component)

This is the **core reusable component** across all dashboard views. It shows a condensed version of a problem that fits multiple cards on screen at once.

#### Card Container
- **Width**: 100% (minus 20px horizontal padding on each side)
- **Height**: Auto (content-driven, approximately 130–150px)
- **Background**: #1A1A2E
- **Border**: 1px solid rgba(255,255,255,0.06)
- **Border-radius**: 16px
- **Padding**: 18px
- **Margin-bottom**: 12px (gap between cards)
- **Tap target**: Entire card is tappable — navigates to Deep Dive (Screen 2)

#### Card Internal Layout

```
┌──────────────────────────────────────┐
│  [Sector Badge]          [Score Pill] │  ← Row 1: metadata
│                                      │
│  Problem Title (max 2 lines)         │  ← Row 2: title
│                                      │
│  Pain summary (1 line, truncated)    │  ← Row 3: teaser
│                                      │
│  [Tag] [Tag] [Tag]      [→ arrow]   │  ← Row 4: tags + CTA
└──────────────────────────────────────┘
```

#### Row 1: Top Metadata
- **Layout**: Flex row, space-between
- **Left — Sector Badge**: Same chip style as Feed screen. Small pill, sector-colored background at 15% opacity, sector accent text, 10px font, uppercase.
- **Right — Score Pill**: Depends on the active tab view:
  - Trending tab → Shows "🔥 Rising" or signal count
  - High Opportunity tab → Shows Opportunity score (e.g., "9/10")
  - AI-Solvable tab → Shows AI Feasibility score (e.g., "AI: 9/10")
  - Sectors tab → Shows Opportunity score (e.g., "8/10")
- **Score Pill style**: Rounded pill, background color-coded (green for high, amber for medium), 11px bold text, padding 4px 10px

#### Row 2: Problem Title
- **Top margin**: 12px below Row 1
- **Typography**: 16px, semi-bold (600), white (#FFFFFF), line-height 1.35
- **Max lines**: 2, with ellipsis truncation ("...") if it exceeds
- This is smaller than the Feed title (26px) because we are showing multiple cards

#### Row 3: Pain Summary
- **Top margin**: 6px below title
- **Typography**: 13px, regular (400), color #A0A0B0, line-height 1.4
- **Max lines**: 1, with ellipsis truncation
- Shows the most impactful pain point as a teaser

#### Row 4: Bottom Bar
- **Top margin**: 14px below summary
- **Layout**: Flex row, space-between, vertically centered
- **Left — Tags**: 2 small outlined tags max (e.g., "India", "Very High"). Same style as Feed tags but smaller — 10px text, padding 4px 8px, border 1px #333345, radius 6px, color #707080.
- **Right — Arrow**: Small right-pointing chevron (→), 16px, color #505060. Visual hint that the card is tappable.

#### Card Press State
- On press/hold: Background shifts to #222240 (slightly lighter), 100ms transition
- On release: Returns to #1A1A2E

---

### 5. Tab-Specific Content

#### 5a. 🔥 Trending Tab
**Sorting logic**: Problems sorted by signal growth rate (in MVP, use signal_count descending as proxy).
**Score pill shows**: A "trending" indicator — small flame emoji + "Rising" text, or signal_count value.
**Header text** (optional, below tab bar): "Problems gaining attention across sources" in 13px, color #606070, padding 20px horizontal, 16px top margin.

**Cards to show (from seed data, ordered by opportunity + frequency):**
1. PIP-002 — ASHA workers (Opp: 9, Freq: Very High)
2. PIP-004 — Farmer advisory (Opp: 9, Freq: High)
3. PIP-009 — Sickle Cell care (Opp: 9, Freq: High)
4. PIP-003 — Kirana credit (Opp: 8, Freq: Very High)
5. PIP-005 — Tier 2/3 job seekers (Opp: 8, Freq: Very High)

#### 5b. 💰 High Opportunity Tab
**Sorting logic**: Problems sorted by opportunity_score descending, then by inverse competition (lowest competition first).
**Score pill shows**: Opportunity score (e.g., "9/10" in green).
**Header text**: "High pain, low competition — best startup bets" in 13px, color #606070.

**Cards to show (Opportunity ≥ 8, sorted):**
1. PIP-002 — ASHA workers (Opp: 9, Comp: 3)
2. PIP-004 — Farmer advisory (Opp: 9, Comp: 5)
3. PIP-009 — Sickle Cell care (Opp: 9, Comp: 2)
4. PIP-003 — Kirana credit (Opp: 8, Comp: 7)
5. PIP-006 — Hospital OPD (Opp: 8, Comp: 6)
6. PIP-007 — Waste segregation (Opp: 8, Comp: 3)
7. PIP-008 — Legal aid (Opp: 8, Comp: 4)

#### 5c. 🤖 AI-Solvable Tab
**Sorting logic**: Problems sorted by ai_feasibility descending.
**Score pill shows**: AI Feasibility score with robot prefix (e.g., "🤖 9/10").
**Header text**: "Best candidates for AI-powered solutions" in 13px, color #606070.

**Cards to show (AI Feasibility ≥ 8, sorted):**
1. PIP-005 — Tier 2/3 job seekers (AI: 9)
2. PIP-001 — Student deadlines (AI: 8)
3. PIP-002 — ASHA workers (AI: 8)
4. PIP-006 — Hospital OPD (AI: 8)
5. PIP-007 — Waste segregation (AI: 8)
6. PIP-008 — Legal aid (AI: 8)
7. PIP-009 — Sickle Cell care (AI: 8)
8. PIP-010 — Creator monetization (AI: 8)

#### 5d. 🧠 Sectors Tab
This tab is **different from the other three**. Instead of showing a flat list of cards, it shows **sector groups** — collapsible sections, each containing the problems in that sector.

**Layout:**

```
┌──────────────────────────────────────┐
│                                      │
│  SECTOR HEADER: Healthcare (3)       │  ← Tappable section
│  ├── Compact Card: PIP-002           │
│  ├── Compact Card: PIP-006           │
│  └── Compact Card: PIP-009           │
│                                      │
│  SECTOR HEADER: Fintech (2)          │
│  ├── Compact Card: PIP-003           │
│  └── Compact Card: PIP-010           │
│                                      │
│  SECTOR HEADER: Agriculture (1)      │
│  └── Compact Card: PIP-004           │
│                                      │
│  ... more sectors ...                │
│                                      │
└──────────────────────────────────────┘
```

**Sector Header:**
- **Height**: 48px
- **Background**: Transparent
- **Layout**: Flex row, space-between, vertically centered
- **Horizontal padding**: 20px
- **Left content**:
  - Sector color dot (8px circle, sector accent color) + 10px gap
  - Sector name in 16px, semi-bold (600), white
  - Problem count in 14px, regular weight, #808090, e.g., "(3)"
- **Right content**: Chevron icon (▼ when expanded, ▶ when collapsed), 14px, #606070
- **Default state**: All sectors expanded
- **Tap behavior**: Toggles collapse/expand for that sector's cards. Chevron rotates 90° over 200ms.
- **Top margin between sectors**: 8px

**Sector ordering**: By total opportunity score sum descending (sectors with the most promising problems appear first):
1. Healthcare (3 problems — Opp: 9+8+9 = 26)
2. Fintech / Retail (2 — Opp: 8+7 = 15)
3. Agriculture (1 — Opp: 9)
4. Employment / EdTech (1 — Opp: 8)
5. CleanTech (1 — Opp: 8)
6. Legal / GovTech (1 — Opp: 8)
7. Education (1 — Opp: 7)

---

### 6. Bottom Navigation Bar
This is the **only screen with a persistent bottom nav bar**, because the Dashboard is a primary destination alongside the Feed.

- **Height**: 64px
- **Background**: #0D0D1A with a top border: 1px solid rgba(255,255,255,0.06)
- **Layout**: Two items, evenly distributed horizontally, centered vertically
- **Horizontal padding**: 40px on each side

#### Nav Items

| Item | Icon | Label | State on This Screen |
|------|------|-------|---------------------|
| Feed | Grid/cards icon (outline) | "Feed" | Inactive |
| Dashboard | Chart/bar-graph icon (filled) | "Dashboard" | Active |

**Individual nav item layout**: Vertical stack — icon (22px) on top, label (10px) below, 4px gap.

| State | Icon Color | Label Color |
|-------|-----------|-------------|
| Inactive | #606070 | #606070 |
| Active | #00E676 | #00E676 |

- **Active indicator**: Small dot (4px circle, #00E676) centered below the label, 4px gap.
- **Tap behavior**: Tapping "Feed" navigates back to the Feed screen (Screen 1) with a slide-left transition.

---

## Empty States

If a tab view has no matching problems (unlikely with seed data but important for Figma completeness):

- **Illustration**: Simple outlined icon relevant to the tab (flame for Trending, trophy for High Opportunity, robot for AI-Solvable, folder for Sectors) — 48px, color #333345
- **Text line 1**: "No problems found" in 16px, medium weight, #808090
- **Text line 2**: "Check back soon — new problems are discovered daily" in 13px, regular, #606070
- **Centered vertically and horizontally** in the content area

---

## Real Data Examples (Use These in the Design)

### Compact Card Example 1 (For Trending/High Opportunity tabs)
```
Sector Badge:    HEALTHCARE
Score Pill:      9/10 (green)
Title:           Rural ASHA workers lack digital tools to record and report patient data accurately
Pain Summary:    Paper-based records get lost or damaged in field conditions...
Tags:            India  ·  Very High
```

### Compact Card Example 2
```
Sector Badge:    AGRICULTURE
Score Pill:      9/10 (green)
Title:           Farmers receive inaccurate or delayed weather and crop advisory information
Pain Summary:    Generic advisories not tailored to local soil or microclimate...
Tags:            India  ·  High
```

### Compact Card Example 3
```
Sector Badge:    EMPLOYMENT
Score Pill:      🤖 9/10 (green)
Title:           First-time job seekers in Tier 2/3 cities cannot navigate the interview process
Pain Summary:    No access to career counselors or professional networks...
Tags:            India  ·  Very High
```

### Compact Card Example 4
```
Sector Badge:    CLEANTECH
Score Pill:      8/10 (green)
Title:           Municipal solid waste segregation at source remains near-zero despite mandates
Pain Summary:    Residents don't know or follow dry/wet/hazardous classification rules...
Tags:            India  ·  Very High
```

---

## Color System

Inherits from Screens 1–3. Key additions:

| Element | Color | Hex |
|---------|-------|-----|
| Screen Background | Deep navy/black | #0D0D1A |
| Tab — Inactive BG | Transparent | — |
| Tab — Active BG | Elevated surface | #1A1A2E |
| Tab — Inactive Text | Muted | #808090 |
| Tab — Active Text | White | #FFFFFF |
| Tab — Active Accent Bar | Green | #00E676 |
| Compact Card BG | Elevated surface | #1A1A2E |
| Compact Card Border | Ultra-subtle | rgba(255,255,255,0.06) |
| Compact Card — Pressed BG | Lighter surface | #222240 |
| Sector Header Dot | Sector accent color | Varies |
| Sector Chevron | Dim | #606070 |
| Bottom Nav — Inactive | Dim | #606070 |
| Bottom Nav — Active | Green | #00E676 |
| Bottom Nav — Active Dot | Green | #00E676 |
| View Description Text | Dim label | #606070 |
| Empty State Icon | Very dim | #333345 |

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Header "Dashboard" | Inter or Outfit | 22px | 700 | 1.2 |
| Tab Label | Inter | 13px | 500 | 1.0 |
| View Description (below tabs) | Inter | 13px | 400 | 1.4 |
| Compact Card — Title | Inter | 16px | 600 | 1.35 |
| Compact Card — Pain Summary | Inter | 13px | 400 | 1.4 |
| Compact Card — Sector Badge | Inter | 10px | 600 | 1.0 |
| Compact Card — Score Pill | Inter | 11px | 700 | 1.0 |
| Compact Card — Tags | Inter | 10px | 500 | 1.0 |
| Sector Header — Name | Inter | 16px | 600 | 1.2 |
| Sector Header — Count | Inter | 14px | 400 | 1.2 |
| Bottom Nav — Label | Inter | 10px | 500 | 1.0 |
| Empty State — Line 1 | Inter | 16px | 500 | 1.4 |
| Empty State — Line 2 | Inter | 13px | 400 | 1.4 |

---

## Section Spacing Summary

| Between | Gap |
|---------|-----|
| Screen top → Header | 0px (header starts at top) |
| Header → Tab Bar | 0px (directly below) |
| Tab Bar → View Description | 16px |
| View Description → First Card | 16px |
| Card → Card | 12px |
| Last Card → Bottom Nav | 20px (min breathing room) |
| Sector Header → First Card in sector | 8px |
| Last Card in sector → Next Sector Header | 8px |

---

## Interaction Notes (For Figma Prototype)

- **Tab switching**: Tap a tab to switch views. Content area crossfades (150ms, ease). Active tab style updates instantly.
- **Horizontal tab scroll**: If all 4 tabs don't fit on screen, the tab bar scrolls horizontally. Show a subtle fade gradient on the right edge to hint at more tabs.
- **Card tap**: Tapping any compact card navigates to the Deep Dive screen (Screen 2) with a slide-right transition (300ms, ease-out).
- **Card press feedback**: On press, card background shifts to #222240. On release, returns to #1A1A2E (100ms transition).
- **Sector collapse/expand**: Tapping a sector header toggles its cards with a height animation (200ms, ease). Chevron rotates 90°.
- **Bottom nav — Feed**: Tapping "Feed" navigates to Screen 1 with a slide-left transition.
- **Scroll**: Standard vertical scroll within the content area. Header, tab bar, and bottom nav remain fixed.
- **Entry transition**: If coming from the Feed via bottom nav, the screen slides in from the right (300ms, ease-out).

---

## What NOT to Do
- ❌ Do NOT use the full-screen swipe card layout here — this is a LIST of compact cards, not a one-at-a-time feed
- ❌ Do NOT add filter controls on this screen — the views are pre-curated, not user-filtered (filters belong on Screen 3)
- ❌ Do NOT use horizontal card carousels within tabs — keep it as a simple vertical scrolling list
- ❌ Do NOT show all score metrics on the compact card — only show the ONE most relevant score per tab view
- ❌ Do NOT add a search bar in the content area — keep it in the header only (and non-functional for MVP)
- ❌ Do NOT make the bottom nav bar transparent or floating — it should be solid with a clear top border
- ❌ Do NOT use light mode — dark mode only
- ❌ Do NOT show more than 2 metadata tags on the compact card — keep it minimal

---

## Design Mood References
- **Robinhood** sector/watchlist views (dark, compact cards, clear metrics)
- **Spotify** Browse/Explore tabs (horizontal tab bar, curated content per tab)
- **Linear** project views (clean list cards, grouped sections)
- **Coinbase** market movers screen (compact crypto cards with key metric, sorted lists)

---

## Deliverable Checklist
- [ ] Full viewport mobile frame (375 × 812) with header, tab bar, content, bottom nav
- [ ] Tab bar with 4 tabs — show active state on "Trending" tab
- [ ] Compact problem card component with all 4 rows (metadata, title, summary, tags+arrow)
- [ ] 🔥 Trending tab — 5 cards with real data, score pills showing trending indicator
- [ ] 💰 High Opportunity tab — 7 cards sorted by opportunity, green score pills
- [ ] 🤖 AI-Solvable tab — 8 cards sorted by AI feasibility, robot emoji in score pills
- [ ] 🧠 Sectors tab — grouped by sector with collapsible headers, at least 3 sectors shown
- [ ] Bottom nav bar with Feed (inactive) and Dashboard (active) items
- [ ] Empty state design (one frame)
- [ ] Card pressed state variant
- [ ] Dark mode only
- [ ] At least 4 frames (one per tab view) + 1 empty state

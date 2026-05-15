# Problem Intelligence Platform — Project Phases

> **"Don't help users find ideas. Help them identify which problems are worth solving."**

This document defines the complete build order, phase-by-phase. Every phase has a clear purpose, tasks, deliverables, and exit condition. No phase should be started until the previous phase is complete.

---

## How Each Phase Works

Every phase follows the same iterative cycle:

```
Spec → Implement → Test → ✅ Move to next phase
```

1. **Spec**: Write the detailed specification for the phase (the `.md` file).
2. **Implement**: Build exactly what the spec describes — no more, no less.
3. **Test**: Validate that the implementation matches the spec and works correctly.
4. **Move forward**: Only after the phase is tested and validated do we start the next phase's spec.

There is no separate "codegen" phase at the end. Code is written incrementally inside each phase, right after its spec is complete. This keeps the feedback loop tight and prevents specs from drifting away from reality.

---

## Core Vision Recap

We are building a platform that transforms real-world problems into structured, analyzable, and actionable startup opportunities. Problems today are scattered across government portals, research papers, Reddit, reports — unstructured, unprioritized, and never translated into actionable insight. This platform fixes that by converting chaos into **Problem Intelligence Cards** — the core unit of value.

This is **not** a tool, **not** a scraper, **not** just AI agents. It is a **decision-making engine for startup ideas** — a system that converts real-world chaos into startup clarity.

---

## Build Order

| Phase | Name | Core Question | Cycle |
|-------|------|---------------|-------|
| 0 | Product Framing | What are we building and why? | Spec → Validate ✅ |
| 1 | UI Spec | How should users see and interact with this? | Spec → Figma → Test |
| 2 | Problem Schema | What is the exact data structure of one problem card? | Spec → Implement → Test |
| 3 | Agent System | How do AI agents discover, classify, and analyze problems? | Spec → Implement → Test |
| 4 | Backend Flow | How does data flow from source to screen? | Spec → Implement → Test |
| 5 | Scoring Engine | How are problems scored, ranked, and prioritized? | Spec → Implement → Test |
| 6 | Dashboard Behavior | How does the UI behave, respond, and transition? | Spec → Implement → Test |

---

---

## Phase 0: Product Framing

### Status: ✅ COMPLETED

### Purpose
Define the complete product vision, target users, value proposition, and philosophy before touching any design or code.

### What Was Done
1. **Defined the core vision**: A centralized intelligence platform that collects, structures, analyzes, scores, and presents real-world problems as startup opportunities.
2. **Identified the gap**: Aspiring entrepreneurs feel lost because problems are scattered, unstructured, and never prioritized.
3. **Defined the solution**: Problem Intelligence Cards — each answering: What is the problem? Who is affected? How severe? Can AI solve it? Is it worth a startup?
4. **Defined UX philosophy**: Inshorts-style news feed (Layer 1: Discovery, Layer 2: Deep Dive).
5. **Identified target users**:
   - Primary: Aspiring entrepreneurs, students, builders, developers
   - Secondary: Startup founders, investors, researchers
6. **Defined the moat**: Problem scoring + multi-source validation + AI insights + opportunity detection. Not a news app, not a scraper, not a problem list.
7. **Defined long-term vision**: Startup idea marketplace → Founder-problem matching → AI co-founder assistant → Innovation intelligence engine.
8. **Identified risks and mitigations**:
   - Low-quality data → scoring + filtering
   - No user retention → news-like UX + daily updates
   - Generic insights → strong AI analysis layer
9. **Manually curated 10 Problem Intelligence Cards** across sectors (Education, Healthcare, Fintech, Agriculture, Employment, CleanTech, Legal, Rare Disease, Creator Economy, Technology) to learn what "good data" looks like.

### Deliverables
- `00_project_overview.md` — Full product vision document (15 sections)
- `PIP_Problem_Dataset_v1.docx` — 10 manually curated, scored problem cards (seed dataset)

### Exit Condition
✅ Anyone new to the project can read the overview and fully understand what we are building, why, and for whom.

---

---

## Phase 1: UI Spec (Figma AI)

### Status: 🔄 NEXT

### Purpose
Design every screen of the product using Figma AI, guided by precise, screen-specific Markdown spec files. Each spec file is self-contained so Figma AI gets focused context and does not hallucinate.

### Why Separate Spec Files
One massive prompt → Figma AI generates generic, blended layouts.
One focused spec per screen → Figma AI generates exactly what we describe.

### Screens to Spec

#### Screen 1: Problem Feed (Discovery Mode)
- Inshorts-style vertical swipe interface
- One problem card per screen, full viewport
- Content: Sector badge, problem title, one-line pain summary, opportunity score pill
- Actions: Swipe up/down, tap to deep dive, filter icon in nav
- Mood: Minimal, clean, high contrast, feels like scanning headlines

#### Screen 2: Problem Deep Dive (Analysis Mode)
- Full analytical breakdown of a single problem
- Sections:
  - Hero: Title + metadata tags (user, geography, frequency)
  - Scores Dashboard: Grid of metric cards (Severity, AI Feasibility, Market Potential, Competition) with visual progress bars + highlighted Opportunity Score
  - Pain Points: Bulleted list with red icons
  - Possible Solutions: Bulleted list with green icons
  - Sources & Confidence: Footer metadata
- Actions: Back, share, bookmark
- Mood: Analytical, dashboard-like, intelligence brief

#### Screen 3: Filters
- Bottom sheet or full-screen modal
- Controls: Sector chips (multi-select), Geography input (default India), AI-Solvable toggle (feasibility > 7), Min Opportunity slider (1–10)
- Actions: Apply (with result count), Reset
- Mood: Clean, functional, no clutter

#### Screen 4: Dashboard Views
- Multiple curated views beyond the feed:
  - 🔥 Trending Problems — gaining attention rapidly
  - 💰 High Opportunity — high pain + low competition
  - 🤖 AI-Solvable — best for AI-based startups
  - 🧠 Sector Insights — deep dive into industries

#### Screen 5: Onboarding / Splash (Optional)
- 2–3 slide horizontal carousel
- Explain what the platform does
- CTA: "Start Discovering"

### Design System Decisions (Separate Spec File)
- Theme: Dark mode primary
- Typography: Modern sans-serif (Inter, Outfit)
- Colors: Deep dark backgrounds, crisp white text, vibrant accent for scores/CTAs
- Cards: Rounded corners, subtle elevation, glassmorphism
- Spacing: 4/8/16/24/32px grid
- Icons: Outlined, consistent stroke weight

### File Structure
```
Figma_UI_specs/
├── 01_feed_screen.md
├── 02_deep_dive_screen.md
├── 03_filters_screen.md
├── 04_dashboard_views.md
├── 05_onboarding_screen.md
├── 06_design_system.md
├── 07_navigation_and_flow.md
└── 08_responsive_behavior.md
```

### Deliverables
- 6–8 individual `.md` spec files inside `Figma_UI_specs/`
- Each file ready to paste directly into Figma AI
- Real data examples from the 10 seed cards embedded in every spec
- Completed Figma designs for all screens

### Exit Condition
- All screens designed in Figma from the spec files.
- Visual design reviewed and finalized.
- Component library established.

---

---

## Phase 2: Problem Schema

### Status: ⏳ NOT STARTED

### Purpose
Formalize the exact data model for the Problem Intelligence Card. This becomes the contract that the UI, backend, AI agents, and scoring engine all conform to.

### Why This Is Separate From Phase 0
Phase 0 was about learning what fields matter through manual curation. Phase 2 takes those learnings and creates a production-grade, rigid schema with data types, constraints, enums, and relationships.

### What Will Be Done

#### 2.1 Finalize Field Definitions
Every field gets: name, data type, required/optional, default value, validation rules, and description.

```
Problem Intelligence Card {
  id              : string    (PK, auto, format: PIP-XXX)
  title           : string    (required, max 200 chars)
  description     : string    (optional, longer narrative)
  sector          : enum      (required — Healthcare, Education, Fintech, Agriculture, GovTech, Legal, Retail, CleanTech, Transportation, Creator Economy, Technology, etc.)
  user_type       : string    (required — who is affected)
  geography       : string    (required, default: "India")
  frequency       : enum      (Low, Medium, High, Very High)
  source          : string    (where signal was found)
  confidence      : enum      (Low, Medium, High)
  pain_points     : string[]  (2–4 items, required)
  root_cause      : string    (optional)
  possible_solutions : string[] (2–4 items, required)
  severity_score     : int    (1–10, required)
  market_potential   : int    (1–10, required)
  ai_feasibility     : int   (1–10, required)
  competition_level  : int   (1–10, required)
  opportunity_score  : int   (1–10, computed or manual)
  signal_count       : int   (default: 1)
  trend_status       : enum  (Rising, Stable, Declining, New)
  created_at         : timestamp
  updated_at         : timestamp
}
```

#### 2.2 Define Enums and Taxonomies
- Sector taxonomy (finite list, expandable)
- Frequency scale definitions
- Confidence criteria (what makes a source High vs Medium vs Low)
- Score range meaning (8–10: Strong Signal, 5–7: Moderate, 1–4: Weak)

#### 2.3 Define Relationships
- One problem → many pain points
- One problem → many solutions
- One problem → many sources (future: multi-source validation)

#### 2.4 Define Computed Fields
- `opportunity_score` formula: weighted combination of severity, market_potential, ai_feasibility, and inverse of competition
- `trend_status` logic: based on signal_count changes over time

### Deliverables
- `02_problem_schema.md` — Complete, production-grade schema specification
- Field dictionary with types, constraints, and descriptions
- Enum definitions and taxonomies
- Scoring formula documentation

### Exit Condition
- Every field has a clear type, constraint, and purpose.
- No ambiguity remains about what data a Problem Intelligence Card contains.
- The schema can be directly translated into a database table and API response shape.

---

---

## Phase 3: Agent System

### Status: ⏳ NOT STARTED

### Purpose
Design the complete multi-agent AI architecture that powers problem discovery, extraction, classification, analysis, and enrichment.

### Agent Definitions

| # | Agent | Role | Input | Output |
|---|-------|------|-------|--------|
| 1 | **Source Collector** | Finds raw problem signals from platforms | Source URLs, keywords, subreddits | Raw text snippets + source metadata |
| 2 | **Extractor** | Pulls clean problem statements from noisy text | Raw text from Collector | Clean problem statement + context |
| 3 | **Classifier** | Assigns sector, user type, geography, frequency | Clean problem text | Structured metadata fields |
| 4 | **Insight Generator** | Explains pain points, root causes, real-world consequences | Classified problem | pain_points[], root_cause |
| 5 | **Scoring Agent** | Evaluates severity, market potential, AI feasibility, competition | Analyzed problem | All score fields (1–10) |
| 6 | **Solution Agent** | Suggests AI-based ideas, process improvements, startup directions | Full problem context | possible_solutions[] |
| 7 | **Trend Agent** | Detects signal growth and repetition patterns | Historical data + new signals | trend_status, signal_count |
| 8 | **Deduplication Agent** | Detects if a problem is duplicate or variant of existing | New card + existing DB | Merge / Skip / New entry decision |

### Pipeline Flow
```
Sources → Collector → Extractor → Classifier → Insight Generator → Scoring Agent → Solution Agent → Dedup Agent → Database
                                                                                                          ↓
                                                                                              Trend Agent (periodic)
```

### Source Integrations
- Reddit: r/india, r/startups, r/IndianStreetBets, r/developersindia
- Government: Smart India Hackathon, NITI Aayog, Digital India
- Research: PubMed, arXiv, SSRN
- Startup Ecosystem: YC RFS, Startup India, Product Hunt
- News: Google News sector alerts
- Twitter/X: Keyword-based complaint monitoring

### Quality Control
- Confidence thresholds for auto-publish vs human review queue
- Accuracy tracking: AI scores vs manual scores comparison
- Feedback loop: human corrections improve agent outputs over time

### Deliverables
- `03_agent_system.md` — Complete agent architecture spec
- Agent role definitions with input/output contracts
- Pipeline flow diagram
- Source integration plan
- Quality control strategy

### Exit Condition
- Every agent has a defined role, input, output, and failure handling strategy.
- The pipeline from raw source to database entry is fully specified.

---

---

## Phase 4: Backend Flow

### Status: ⏳ NOT STARTED

### Purpose
Design the complete backend architecture: how data flows from source to screen, including API design, database structure, ingestion pipeline, and frontend connection.

### What Will Be Done

#### 4.1 Database Design
- Translate Phase 2 schema into actual database tables
- Choose database (PostgreSQL for structured data, or Supabase/Firebase for rapid prototyping)
- Seed with all 10 problem cards from Phase 0

#### 4.2 API Design
```
GET    /api/problems          → List problems (pagination, sorting, filtering)
GET    /api/problems/:id      → Single problem detail
GET    /api/problems/trending  → Trending problems
GET    /api/problems/filters   → Available filter options
POST   /api/problems          → Create new problem (used by agents)
PUT    /api/problems/:id      → Update existing problem
POST   /api/problems/process  → Submit raw text for AI processing
```
- Query params: `?sector=Healthcare&min_opportunity=7&ai_feasible=true&geo=India`

#### 4.3 Ingestion Pipeline
```
Raw Source → Collector Agent → Processing Queue → AI Agent Pipeline → Validation → Database → API → Frontend
```

#### 4.4 Data Validation
- Input validation on API layer (scores 1–10, required fields present)
- Deduplication before insert
- Confidence-based routing (high confidence → auto-publish, low → review queue)

#### 4.5 Frontend Connection
- Replace static JSON with live API calls
- Implement loading, error, and empty states

### Deliverables
- `04_backend_flow.md` — Complete backend architecture spec
- Database schema (SQL or equivalent)
- API endpoint documentation with request/response shapes
- Ingestion pipeline design
- Data validation rules

### Exit Condition
- The full data path from source to screen is specified with no gaps.
- API contracts are defined and ready for implementation.

---

---

## Phase 5: Scoring Engine

### Status: ⏳ NOT STARTED

### Purpose
Define the exact logic for how problems are scored, ranked, weighted, and compared. This is the intelligence layer that separates the platform from a simple list.

### What Will Be Done

#### 5.1 Individual Score Definitions
For each score (1–10), define exactly what each number means:

- **Severity**: How painful is this problem? (1 = minor inconvenience, 10 = life-threatening / business-critical)
- **Market Potential**: How large is the addressable market? (1 = niche < 10K users, 10 = 100M+ users)
- **AI Feasibility**: How solvable is this with current AI tech? (1 = AI barely applicable, 10 = straightforward AI solution exists)
- **Competition Level**: How crowded is the solution space? (1 = no competitors, 10 = highly saturated — note: lower competition = higher opportunity)

#### 5.2 Opportunity Score Formula
Define the composite formula:
```
opportunity = (severity × w1) + (market_potential × w2) + (ai_feasibility × w3) + ((10 - competition) × w4)
```
- Define weights (w1, w2, w3, w4) and normalization
- Document why these weights were chosen
- Allow weight adjustment for different use cases (e.g., "AI-first filter" increases w3)

#### 5.3 Ranking Logic
- Default feed order: by opportunity_score descending
- Trending: by signal_count growth rate
- Dashboard views: pre-filtered and sorted by specific criteria

#### 5.4 Score Calibration
- Use the 10 manually scored cards as calibration benchmarks
- Define anchor problems: "A problem like PIP-002 (ASHA workers) is a 9/10 severity. Use this as reference."

### Deliverables
- `05_scoring_engine.md` — Complete scoring specification
- Score rubrics for each dimension
- Opportunity formula with weights
- Ranking logic for all views
- Calibration benchmarks

### Exit Condition
- Any person (or AI agent) can read the scoring spec and assign consistent scores to a new problem.
- The opportunity formula is defined and testable.

---

---

## Phase 6: Dashboard Behavior

### Status: ⏳ NOT STARTED

### Purpose
Define how the entire UI behaves — interactions, state management, transitions, animations, responsive behavior, and edge cases. This is NOT what the UI looks like (that's Phase 1). This is HOW it behaves.

### What Will Be Done

#### 6.1 Screen States
For every screen, define:
- **Default state**: What shows on first load
- **Loading state**: Skeleton/shimmer while data loads
- **Empty state**: No results after filtering, no problems yet
- **Error state**: API failure, network error
- **Success state**: Data loaded, interactions enabled

#### 6.2 Navigation Flow
```
Splash/Onboarding → Feed (Home)
Feed → Deep Dive (tap card)
Feed → Filters (tap filter icon)
Feed → Dashboard Views (tap dashboard tab)
Deep Dive → Back to Feed
Filters → Apply → Feed (filtered)
Dashboard View → Deep Dive (tap any card)
```

#### 6.3 Interactions & Gestures
- Feed: Swipe up/down for next/previous card
- Deep Dive: Scroll vertically, tap back, tap share, tap bookmark
- Filters: Tap chips to toggle, drag slider, tap apply/reset
- Dashboard: Tap tabs to switch views, tap card to deep dive

#### 6.4 Animations & Transitions
- Card transitions: Slide up/down with easing
- Screen transitions: Slide right for deep dive, slide up for filters
- Score bars: Animate fill on load
- Chip selection: Scale + color transition
- Micro-interactions: Button press feedback, toggle snap

#### 6.5 Responsive Behavior
- Mobile (< 768px): Single column, full-screen cards, bottom navigation
- Tablet (768–1024px): Wider cards with more metadata visible
- Desktop (> 1024px): Split view — feed list on left, deep dive on right

#### 6.6 Real-Time Updates
- New problems appear at top of feed with subtle indicator ("3 new problems")
- Trend status updates in background
- Score changes reflected without full page reload

### Deliverables
- `06_dashboard_behavior.md` — Complete interaction and behavior spec
- State diagrams for every screen
- Navigation flow map
- Animation and transition definitions
- Responsive breakpoint behavior
- Edge case handling

### Exit Condition
- Every possible user action and system state is documented.
- A developer can implement the frontend behavior without guessing.

---

---

## Phase Dependency Map

```
Phase 0 (Product Framing)        ← Spec → Validate ✅
    ↓
Phase 1 (UI Spec)                ← Spec → Figma → Test
    ↓
Phase 2 (Problem Schema)         ← Spec → Implement → Test
    ↓
Phase 3 (Agent System)           ← Spec → Implement → Test
    ↓
Phase 4 (Backend Flow)           ← Spec → Implement → Test
    ↓
Phase 5 (Scoring Engine)         ← Spec → Implement → Test
    ↓
Phase 6 (Dashboard Behavior)     ← Spec → Implement → Test
```

---

## Guiding Principles

1. **Never skip a phase.** Each phase validates the assumptions of the next.
2. **Data shape flows downward.** The schema dictates everything below it.
3. **Manual before automated.** If you cannot do it by hand, you cannot teach AI to do it.
4. **Real data always.** Use the actual 10 seed problem cards, never placeholders.
5. **One spec, one purpose.** Every document does one thing well.
6. **India-first, global-ready.** Start with India, design for expansion.
7. **The card is king.** If something doesn't make the Problem Intelligence Card better, question if it belongs.
8. **Chaos → Clarity.** Every layer of this system exists to convert noise into structured, actionable insight.

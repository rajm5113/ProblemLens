# Phase 2: Problem Schema Specification

> **Status:** 🔄 IN PROGRESS  
> **Depends on:** Phase 1 (UI Spec) ✅ — Figma designs built and code exported  
> **Produces:** The single source of truth for every field in a Problem Intelligence Card

---

## 1. Purpose

This spec formalizes the **Problem Intelligence Card** — the atomic data unit of the entire platform. Every screen, every API endpoint, every AI agent, and every scoring formula speaks this schema.

Phase 0 taught us what fields matter through manual curation. Phase 1 showed how those fields render in the UI. This phase **locks the contract** so that:

- The UI knows exactly what shape to expect
- The backend knows exactly what to store and validate
- The AI agents know exactly what to produce
- The scoring engine knows exactly what to compute

No ambiguity. No guessing.

---

## 2. Design Principles

1. **UI-backward compatible** — The schema MUST support every field the current Figma export (`app/src/app/data/problems.ts`) already uses. We extend, never break.
2. **Enum-heavy** — Strings that come from a known set are enums, not free text. This prevents garbage data from entering the system.
3. **Scores are integers 1–10** — No floats, no 0s, no 11s. Every score has a defined rubric.
4. **Computed fields are marked** — Fields the system calculates (not the user or agent) are clearly labeled as computed.
5. **Timestamps always** — Every record tracks when it was created and last modified.
6. **India-first, global-ready** — Geography defaults to India but accepts any value.

---

## 3. Complete Field Dictionary

### 3.1 Identity Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | `string` | Yes (auto) | PK, format: `PIP-XXX` (zero-padded, e.g., `PIP-001`) | Unique identifier for every problem card. Auto-generated, never user-provided. |
| `numericId` | `integer` | Yes (auto) | Auto-increment, unique | Internal integer ID for sorting, pagination, and array indexing. Maps 1:1 with `id`. |
| `createdAt` | `ISO 8601 timestamp` | Yes (auto) | UTC, set on creation | When this card was first added to the system. |
| `updatedAt` | `ISO 8601 timestamp` | Yes (auto) | UTC, updated on every mutation | When this card was last modified (score change, field update, etc.). |

### 3.2 Core Problem Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `title` | `string` | Yes | Min 10 chars, max 200 chars | The problem statement. Should be a clear, specific sentence describing what the problem is. Must not be a question. |
| `painSummary` | `string` | Yes | Min 20 chars, max 300 chars | A one-liner that explains why this problem hurts. Used as the subtitle on feed cards. |
| `description` | `string` | No | Max 2000 chars | A longer narrative explaining the full context. Used in deep dive view if available. Falls back to `painSummary` if empty. |

### 3.3 Classification Fields

| Field | Type | Required | Constraints | Default | Description |
|-------|------|----------|-------------|---------|-------------|
| `sector` | `Sector` (enum) | Yes | Must be a valid Sector value | — | The industry vertical this problem belongs to. See §4.1 for full enum. |
| `userType` | `string[]` | Yes | 1–5 items, each max 60 chars | — | Who is directly affected by this problem. Examples: `["ASHA Workers", "Rural Patients"]` |
| `geography` | `string` | Yes | Max 100 chars | `"India"` | Where this problem primarily occurs. Can be country, state, city, or region. |
| `frequency` | `Frequency` (enum) | Yes | Must be a valid Frequency value | — | How often this problem occurs for the affected user group. See §4.2. |
| `tags` | `string[]` | Yes (computed) | Exactly 3 items | — | Derived display tags: `[userType[0], geography, frequency]`. Used on feed cards for quick scanning. |

### 3.4 Analysis Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `painPoints` | `string[]` | Yes | 2–5 items, each max 200 chars | Specific, concrete manifestations of the problem. Each item should describe a distinct pain. |
| `rootCause` | `string` | No | Max 500 chars | The underlying systemic reason this problem persists. |
| `solutions` | `string[]` | Yes | 2–5 items, each max 200 chars | Possible solution directions. Should include at least one AI-applicable and one non-AI approach. |

### 3.5 Source & Confidence Fields

| Field | Type | Required | Constraints | Default | Description |
|-------|------|----------|-------------|---------|-------------|
| `source` | `string` | Yes | Max 200 chars | — | Where the problem signal was discovered. Examples: `"Reddit (r/india), Startup India"` |
| `confidence` | `Confidence` (enum) | Yes | Must be a valid Confidence value | `"Medium"` | How trustworthy the signal is based on source quality and corroboration. See §4.3. |
| `signalCount` | `integer` | Yes | Min 1, no max | `1` | How many independent sources have reported this problem. Higher = more validated. |

### 3.6 Score Fields

| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `scores.severity` | `integer` | Yes | 1–10 | How painful is this problem for the affected users? See §5.1 for rubric. |
| `scores.marketPotential` | `integer` | Yes | 1–10 | How large is the addressable market? See §5.2. |
| `scores.aiFeasibility` | `integer` | Yes | 1–10 | How solvable is this with current AI technology? See §5.3. |
| `scores.competition` | `integer` | Yes | 1–10 | How crowded is the solution space? **Note: lower = better opportunity.** See §5.4. |
| `opportunityScore` | `integer` | Yes (computed) | 1–10 | Composite score. See §6 for formula. |

### 3.7 Trend Fields

| Field | Type | Required | Constraints | Default | Description |
|-------|------|----------|-------------|---------|-------------|
| `trendStatus` | `TrendStatus` (enum) | Yes | Must be a valid TrendStatus value | `"New"` | Current trajectory of this problem's relevance. See §4.4. |

---

## 4. Enum Definitions

### 4.1 Sector

The platform organizes problems into these industry verticals. Each sector has a dedicated accent color defined in the design system (`tokens.ts`).

| Value | Token Color | Hex | Description |
|-------|-------------|-----|-------------|
| `Healthcare` | `sector.healthcare` | `#26C6DA` | Hospitals, diagnostics, patient care, public health, disease management |
| `Fintech` | `sector.fintech` | `#FFB300` | Payments, credit, banking, insurance, financial inclusion |
| `Education` | `sector.education` | `#7C4DFF` | Schools, universities, LMS, EdTech, skill training |
| `Agriculture` | `sector.agriculture` | `#66BB6A` | Farming, crop advisory, supply chain, agri-fintech |
| `GovTech` | `sector.govtech` | `#42A5F5` | Government services, civic tech, public infrastructure |
| `Legal` | `sector.govtech` | `#42A5F5` | Legal aid, court systems, compliance, regulatory tech |
| `CleanTech` | `sector.cleantech` | `#26A69A` | Waste management, energy, sustainability, environmental tech |
| `Employment` | `sector.employment` | `#EC407A` | Job seeking, hiring, career development, workforce skilling |
| `Creator Economy` | `sector.creator` | `#FFA726` | Content creation, monetization, cross-border payments for creators |
| `Retail` | `sector.retail` | `#FFB300` | E-commerce, local retail, kirana stores, supply chain |
| `Rare Disease` | `sector.rareDisease` | `#EF5350` | Orphan drugs, specialist care, patient registries |
| `Technology` | `sector.technology` | `#5C6BC0` | Cloud, DevOps, developer tools, infrastructure, SaaS |
| `Transportation` | — (future) | TBD | Logistics, last-mile delivery, urban mobility |

**Compound sectors:** Some problems span two verticals. Use a slash-separated format: `"Fintech / Retail"`, `"Legal / GovTech"`, `"Employment / EdTech"`. The UI's sector color resolver handles these by matching the **first** keyword.

**Extensibility:** New sectors can be added by:
1. Adding the value to this enum
2. Adding a color entry in `tokens.ts` → `sector` object
3. Adding a CSS variable `--pl-sector-{name}` in `theme.css`
4. Adding the chip in `FiltersSheet.tsx` → `SECTOR_CHIPS` array

### 4.2 Frequency

How often the affected user group encounters this problem.

| Value | Meaning | Guideline |
|-------|---------|-----------|
| `Low` | Rarely / seasonally | Happens a few times per year. Not top-of-mind for users. |
| `Medium` | Monthly / occasionally | Happens regularly but not frequently enough to be a daily frustration. |
| `High` | Weekly / regularly | A persistent, recurring problem that users are aware of. |
| `Very High` | Daily / constantly | A constant, inescapable part of the user's routine. Active source of friction. |

### 4.3 Confidence

How trustworthy the problem signal is based on source quality and corroboration.

| Value | Criteria |
|-------|----------|
| `Low` | Single informal source (e.g., one Reddit comment). No corroboration. Anecdotal. |
| `Medium` | Multiple informal sources OR one credible source (e.g., Product Hunt thread, news article). Some corroboration. |
| `High` | Government data, research paper, multiple independent sources, or validated by domain experts. Strong corroboration. |

### 4.4 TrendStatus

The current trajectory of problem relevance over time.

| Value | Meaning | How Determined |
|-------|---------|----------------|
| `New` | Recently discovered | Card was created within the last 7 days. Default for all new entries. |
| `Rising` | Gaining attention | `signalCount` increased ≥ 2× in the last 30 days. |
| `Stable` | Consistent relevance | `signalCount` change < 2× in the last 30 days. Problem has existed > 7 days. |
| `Declining` | Losing relevance | `signalCount` decreased or problem is being solved by existing solutions. |

---

## 5. Score Rubrics

Every score is an integer from 1 to 10. These rubrics define what each value means so that humans and AI agents assign **consistent, calibrated** scores.

### 5.1 Severity (How painful is this?)

| Score | Level | Definition | Calibration Example |
|-------|-------|------------|---------------------|
| 1–2 | Trivial | Minor inconvenience. Users barely notice. | App UI annoyance |
| 3–4 | Mild | Noticeable friction. Users work around it. | Slow website loading |
| 5–6 | Moderate | Real pain. Users actively complain. | PIP-001: Students missing deadlines (7) |
| 7–8 | Severe | Significant impact on daily life/work. Users spend money/time to cope. | PIP-006: 4-6 hour hospital waits (8) |
| 9–10 | Critical | Life-threatening, livelihood-destroying, or systemic. No workaround exists. | PIP-002: ASHA worker data loss delaying outbreak detection (9) |

### 5.2 Market Potential (How large is the addressable market?)

| Score | Level | Estimated Users | Calibration Example |
|-------|-------|----------------|---------------------|
| 1–2 | Niche | < 10K users | Ultra-specialized professional tool |
| 3–4 | Small | 10K–100K users | Regional-specific service |
| 5–6 | Medium | 100K–1M users | PIP-001: Indian college students using LMS (7) |
| 7–8 | Large | 1M–50M users | PIP-003: Kirana store owners (9) |
| 9–10 | Massive | 50M+ users | PIP-004: Indian smallholder farmers (9) |

### 5.3 AI Feasibility (How solvable with current AI?)

| Score | Level | Definition | Calibration Example |
|-------|-------|------------|---------------------|
| 1–2 | Not applicable | Problem requires physical infrastructure, policy change, or human judgment AI cannot replicate | Road construction |
| 3–4 | Barely applicable | AI could assist but cannot be the primary solution | Complex legal disputes |
| 5–6 | Partially solvable | AI can automate parts but needs significant human oversight | PIP-003: Credit scoring from sales data (7) |
| 7–8 | Highly solvable | AI can be the core solution engine with minimal human oversight | PIP-005: AI mock interview coach (9) |
| 9–10 | Perfectly suited | Straightforward NLP/ML/vision application. Data exists, models exist. | PIP-011: AI infra copilot for cloud config (9) |

### 5.4 Competition (How crowded is the solution space?)

**⚠️ INVERTED: Lower competition = HIGHER opportunity.**

| Score | Level | Definition | Calibration Example |
|-------|-------|------------|---------------------|
| 1–2 | No competition | No known solution exists. Greenfield opportunity. | PIP-009: Sickle cell management for tribal India (2) |
| 3–4 | Low competition | 1–3 niche players, no dominant solution | PIP-007: AI waste classification (3) |
| 5–6 | Moderate | Several players exist but market is fragmented | PIP-004: Crop advisory services (5) |
| 7–8 | High | Established players with traction. Differentiation needed. | PIP-003: Fintech lending (7) |
| 9–10 | Saturated | Dominated by well-funded incumbents. Very hard to compete. | Generic food delivery |

---

## 6. Opportunity Score Formula

The `opportunityScore` is the **composite metric** that ranks problems by startup potential. It is computed, never manually set.

### 6.1 Formula

```
opportunityScore = round(
  (severity × 0.30) +
  (marketPotential × 0.25) +
  (aiFeasibility × 0.20) +
  ((10 - competition) × 0.25)
)
```

### 6.2 Weight Rationale

| Weight | Factor | Why |
|--------|--------|-----|
| **0.30** | Severity | Pain drives urgency. Users pay to solve severe problems. This is the strongest signal. |
| **0.25** | Market Potential | Scale determines business viability. A severe but tiny problem is not startup-worthy. |
| **0.20** | AI Feasibility | This platform specifically surfaces AI-solvable opportunities. Important but not dominant. |
| **0.25** | Inverse Competition | Low competition = higher opportunity. Weighted equally with market potential because timing matters as much as TAM. |

### 6.3 Score Band Interpretation

| Band | Label | Color | Meaning |
|------|-------|-------|---------|
| 8–10 | Strong Signal | `#00E676` (green) | High-priority opportunity. Worth deep investigation. |
| 5–7 | Moderate Signal | `#FFB300` (amber) | Has potential but one or more dimensions are weak. |
| 1–4 | Weak Signal | `#FF5252` (red) | Not currently promising. May improve with new data. |

### 6.4 Validation Against Seed Data

Cross-checking the formula against manually scored cards:

| PIP | Severity | Market | AI | Competition | Manual Score | Formula Score | Match? |
|-----|----------|--------|----|-------------|-------------|---------------|--------|
| PIP-001 | 7 | 7 | 8 | 6 | 7 | round(2.1 + 1.75 + 1.6 + 1.0) = **7** | ✅ |
| PIP-002 | 9 | 8 | 8 | 3 | 9 | round(2.7 + 2.0 + 1.6 + 1.75) = **8** | ≈ (within 1) |
| PIP-003 | 8 | 9 | 7 | 7 | 8 | round(2.4 + 2.25 + 1.4 + 0.75) = **7** | ≈ (within 1) |
| PIP-004 | 9 | 9 | 7 | 5 | 9 | round(2.7 + 2.25 + 1.4 + 1.25) = **8** | ≈ (within 1) |
| PIP-005 | 8 | 9 | 9 | 4 | 8 | round(2.4 + 2.25 + 1.8 + 1.5) = **8** | ✅ |
| PIP-009 | 9 | 8 | 8 | 2 | 9 | round(2.7 + 2.0 + 1.6 + 2.0) = **8** | ≈ (within 1) |
| PIP-011 | 8 | 9 | 9 | 5 | 9 | round(2.4 + 2.25 + 1.8 + 1.25) = **8** | ≈ (within 1) |

**Result:** Formula produces values within ±1 of manual scores. Acceptable. The slight downward bias occurs because the formula does not reward "multiple strong dimensions" with a bonus. We can add a bonus modifier in Phase 5 if needed, but the current formula is sufficient for MVP.

---

## 7. Relationships

```
ProblemIntelligenceCard
  │
  ├── 1 : N ── painPoints[]       (embedded array, 2–5 strings)
  ├── 1 : N ── solutions[]        (embedded array, 2–5 strings)
  ├── 1 : N ── userType[]         (embedded array, 1–5 strings)
  ├── 1 : N ── tags[]             (computed array, exactly 3 strings)
  ├── 1 : 1 ── scores {}          (embedded object, 4 integer fields)
  │
  └── Future extensions:
      ├── 1 : N ── sources[]      (when multi-source tracking is added in Phase 3)
      └── N : M ── relatedCards[] (when similarity detection is added)
```

**For MVP (Phases 2–4):** All relationships are embedded (arrays inside the document). No separate tables. This keeps the schema flat, simple, and maps directly to the current UI data structure.

**For Scale (Phase 5+):** `sources[]` may become a separate collection/table with its own schema (URL, platform, date scraped, snippet, confidence contribution).

---

## 8. TypeScript Contract

This is the production interface that will replace the current one in `app/src/app/data/problems.ts`. It maintains backward compatibility while adding the new fields.

```typescript
/* ── Enums ── */

export type Sector =
  | "Healthcare"
  | "Fintech"
  | "Education"
  | "Agriculture"
  | "GovTech"
  | "Legal"
  | "CleanTech"
  | "Employment"
  | "Creator Economy"
  | "Retail"
  | "Rare Disease"
  | "Technology"
  | "Transportation"
  // Compound sectors
  | "Fintech / Retail"
  | "Fintech / Creator"
  | "Legal / GovTech"
  | "GovTech / Legal"
  | "Employment / EdTech";

export type Frequency = "Low" | "Medium" | "High" | "Very High";

export type Confidence = "Low" | "Medium" | "High";

export type TrendStatus = "New" | "Rising" | "Stable" | "Declining";

/* ── Score Object ── */

export interface ProblemScores {
  severity: number;        // 1–10
  marketPotential: number; // 1–10
  aiFeasibility: number;   // 1–10
  competition: number;     // 1–10 (lower = better opportunity)
}

/* ── Problem Intelligence Card ── */

export interface ProblemIntelligenceCard {
  // Identity
  id: string;              // "PIP-001"
  numericId: number;       // 1
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601

  // Core
  title: string;           // max 200 chars
  painSummary: string;     // max 300 chars
  description?: string;    // max 2000 chars, optional

  // Classification
  sector: Sector;
  userType: string[];      // 1–5 items
  geography: string;       // default "India"
  frequency: Frequency;
  tags: string[];          // computed: [userType[0], geography, frequency]

  // Analysis
  painPoints: string[];    // 2–5 items
  rootCause?: string;      // optional
  solutions: string[];     // 2–5 items

  // Source & Confidence
  source: string;
  confidence: Confidence;
  signalCount: number;     // default 1

  // Scores
  scores: ProblemScores;
  opportunityScore: number; // computed, 1–10

  // Trend
  trendStatus: TrendStatus; // default "New"
}
```

### 8.1 Backward Compatibility Map

The current UI uses an older `Problem` interface. Here's how the fields map:

| Current (`Problem`) | New (`ProblemIntelligenceCard`) | Change |
|---------------------|-------------------------------|--------|
| `id: number` | `numericId: number` | Renamed. `id` is now the string `PIP-XXX`. |
| `pipId: string` | `id: string` | `pipId` becomes the primary `id`. |
| `sector: string` | `sector: Sector` | Typed as enum (was free string). |
| `opportunityScore: number` | `opportunityScore: number` | No change, now computed. |
| `title: string` | `title: string` | No change. |
| `painSummary: string` | `painSummary: string` | No change. |
| `tags: string[]` | `tags: string[]` | No change (now formally computed). |
| `userType: string[]` | `userType: string[]` | No change. |
| `geography: string` | `geography: string` | No change. |
| `frequency: string` | `frequency: Frequency` | Typed as enum (was free string). |
| `source: string` | `source: string` | No change. |
| `confidence` | `confidence: Confidence` | No change. |
| `painPoints: string[]` | `painPoints: string[]` | No change. |
| `solutions: string[]` | `solutions: string[]` | No change. |
| `scores.severity` | `scores.severity` | No change. |
| `scores.marketPotential` | `scores.marketPotential` | No change. |
| `scores.aiFeasibility` | `scores.aiFeasibility` | No change. |
| `scores.competition` | `scores.competition` | No change. |
| — | `description?: string` | **NEW** — optional long description. |
| — | `rootCause?: string` | **NEW** — optional root cause analysis. |
| — | `signalCount: number` | **NEW** — defaults to 1. |
| — | `trendStatus: TrendStatus` | **NEW** — defaults to "New". |
| — | `createdAt: string` | **NEW** — auto-set on creation. |
| — | `updatedAt: string` | **NEW** — auto-set on mutation. |

---

## 9. Validation Rules

These rules apply when creating or updating a Problem Intelligence Card, whether by human input or AI agent output.

### 9.1 Required Field Validation

```
title:         length ≥ 10 AND length ≤ 200
painSummary:   length ≥ 20 AND length ≤ 300
sector:        must be valid Sector enum value
userType:      array length ≥ 1 AND ≤ 5
geography:     non-empty, length ≤ 100
frequency:     must be valid Frequency enum value
source:        non-empty, length ≤ 200
confidence:    must be valid Confidence enum value
painPoints:    array length ≥ 2 AND ≤ 5, each item length ≤ 200
solutions:     array length ≥ 2 AND ≤ 5, each item length ≤ 200
scores.*:      integer, ≥ 1 AND ≤ 10 (all four sub-fields)
```

### 9.2 Computed Field Rules

```
tags:              auto-derived as [userType[0], geography, frequency]
opportunityScore:  auto-computed using formula in §6.1
trendStatus:       defaults to "New", updated by Trend Agent in Phase 3
signalCount:       defaults to 1, incremented on source corroboration
id:                auto-generated as "PIP-" + zero-padded numericId
createdAt:         auto-set to current UTC timestamp
updatedAt:         auto-set on every write
```

### 9.3 What Fails Validation (Examples)

| Input | Rule Violated | Error |
|-------|---------------|-------|
| `title: "Bad"` | Min length 10 | `title must be at least 10 characters` |
| `scores.severity: 0` | Min value 1 | `severity must be between 1 and 10` |
| `scores.competition: 11` | Max value 10 | `competition must be between 1 and 10` |
| `sector: "Biotech"` | Invalid enum | `sector must be one of: Healthcare, Fintech, ...` |
| `painPoints: ["only one"]` | Min 2 items | `painPoints must have 2–5 items` |
| `frequency: "Always"` | Invalid enum | `frequency must be one of: Low, Medium, High, Very High` |

---

## 10. Migration Plan

How the current hardcoded data in `app/src/app/data/problems.ts` evolves across phases.

### Phase 2 (This Phase) — Schema Lock

1. Create `app/src/app/types/schema.ts` — export all enums + `ProblemIntelligenceCard` interface
2. Update `app/src/app/data/problems.ts` — add new fields (`description`, `rootCause`, `signalCount`, `trendStatus`, `createdAt`, `updatedAt`) to each card object
3. Create `app/src/app/utils/scoring.ts` — implement `computeOpportunityScore()` function
4. Create `app/src/app/utils/validation.ts` — implement `validateProblemCard()` function
5. Verify all 11 seed cards pass validation
6. Verify computed opportunity scores match existing values (within ±1)

### Phase 3 (Agent System) — No Data Changes

Agents will produce data that conforms to this schema. No migration needed.

### Phase 4 (Backend) — Database Migration

1. Replace `PROBLEMS` array with API calls: `GET /api/problems`
2. Seed database with 11 validated cards from Phase 2
3. API response shape matches `ProblemIntelligenceCard` exactly

### Phase 5 (Scoring Engine) — Formula Refinement

1. Potentially add weight presets for different views (e.g., "AI-first" mode increases `aiFeasibility` weight)
2. Add bonus/penalty modifiers if formula accuracy needs improvement

---

## 11. File Deliverables (Implementation)

When we implement Phase 2, these files will be created or modified:

```
app/src/app/
├── types/
│   └── schema.ts              ← NEW: All enums + ProblemIntelligenceCard interface
├── utils/
│   ├── scoring.ts             ← NEW: computeOpportunityScore()
│   └── validation.ts          ← NEW: validateProblemCard()
├── data/
│   └── problems.ts            ← MODIFIED: Add new fields to 11 seed cards
└── components/
    └── (no changes)           ← UI components remain untouched in Phase 2
```

---

## 12. Exit Conditions

Phase 2 is complete when ALL of the following are true:

- [ ] `schema.ts` exports all types and enums — no `any` types, no loose strings
- [ ] All 11 seed cards in `problems.ts` have every required field populated
- [ ] `computeOpportunityScore()` produces values within ±1 of current manual scores
- [ ] `validateProblemCard()` correctly rejects invalid input (tested with edge cases)
- [ ] No existing UI component breaks — the app still runs and looks identical
- [ ] A new team member can read this spec and add a PIP-012 card without asking questions

---

## 13. What NOT to Do

- **Do NOT change any UI components** — Phase 2 is schema only. Visual changes happen in Phase 6.
- **Do NOT create a database** — That's Phase 4. Data stays in the TypeScript file for now.
- **Do NOT build an API** — That's Phase 4. The UI continues to import directly from `problems.ts`.
- **Do NOT build agent logic** — That's Phase 3. The scoring function is a pure utility, not an agent.
- **Do NOT rename the `Problem` interface** — Keep the old interface as a type alias for backward compatibility until Phase 4 migrates everything.

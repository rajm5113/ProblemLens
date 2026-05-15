# Screen 2: Problem Deep Dive (Analysis Mode)

## Context for Figma AI
You are designing the **detail/analysis screen** for the Problem Intelligence Platform — an app that presents real-world problems as structured startup opportunities. The user arrives here by tapping a problem card from the Feed screen (Screen 1). This screen shows the **complete breakdown** of a single problem: what it is, who it affects, how severe it is, what could solve it, and whether it's worth building a startup around.

Think of this as an **intelligence brief** — structured, analytical, data-rich, but still easy to scan. It is NOT a wall of text. It is a series of clearly separated sections, each answering a specific question.

---

## Screen Purpose
This is where **evaluation and decision-making happen**. The Feed screen is for scanning. This screen is for thinking. After reading a Deep Dive, a user should be able to say:
- "This problem is real and severe."
- "There's a gap in the market."
- "AI can solve this."
- "I want to explore building something here."

Or the opposite — and move on.

---

## Platform
- **Primary**: Mobile (375 × 812px — iPhone 13/14 viewport)
- **Behavior**: Vertically scrollable — this screen has more content than one viewport

---

## Layout Architecture

The screen is a **vertically scrollable page** with a fixed header at the top. Content is organized into clearly separated sections with consistent spacing between them.

```
┌─────────────────────────────────┐
│         STICKY HEADER           │  ← Fixed, 56px
├─────────────────────────────────┤
│                                 │
│  HERO SECTION                   │  ← Title + metadata tags
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  SCORES DASHBOARD               │  ← 2×2 grid + opportunity bar
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  PAIN POINTS SECTION            │  ← Bulleted pain list
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  SOLUTIONS SECTION              │  ← Bulleted solution list
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  SOURCE & CONFIDENCE FOOTER     │  ← Signal metadata
│                                 │
└─────────────────────────────────┘
        (scrollable content)
```

---

## Component Breakdown

### 1. Sticky Header
- **Height**: 56px
- **Background**: Screen background color with a subtle blur/frosted glass effect when scrolling (backdrop-filter: blur)
- **Position**: Fixed at top, stays visible during scroll
- **Layout**: Three elements in a row — left, center, right

| Position | Element | Details |
|----------|---------|---------|
| Left | Back Arrow | Chevron-left icon (← ), 24px, white. Tapping returns to Feed. |
| Center | Screen Label | "Problem Details" in 16px, semi-bold, white. |
| Right — Icon 1 | Bookmark Icon | Outlined bookmark, 22px, muted grey. Filled state when saved. |
| Right — Icon 2 | Share Icon | Standard share/export icon, 22px, muted grey. 12px gap from bookmark. |

- **Bottom border**: 1px solid rgba(255,255,255,0.06) — barely visible separator

---

### 2. Hero Section
The first content section below the header. No card container here — content sits directly on the background for an immersive feel.

- **Padding**: 20px horizontal, 24px top (below header)

#### 2a. Sector Badge
- Same style as Feed screen — small rounded pill with sector-colored background
- Positioned at the very top of the hero section
- Example: "HEALTHCARE" in cyan on rgba(38,198,218,0.15) background

#### 2b. Problem Title
- **Top margin**: 16px below the sector badge
- **Typography**: 24px, bold (700), line-height 1.35
- **Color**: Pure white (#FFFFFF)
- Full title, no truncation — allow it to wrap to 3–4 lines if needed

#### 2c. Metadata Tags Row
- **Top margin**: 16px below the title
- **Layout**: Horizontal row, flex-wrap, gap 8px
- **Tag style**: Small outlined chips with icons

Each tag has a **tiny icon** (12px) on the left and text on the right:

| Tag | Icon | Example Text |
|-----|------|-------------|
| User Type | 👤 Person icon | ASHA Workers, Rural Patients |
| Geography | 📍 Pin icon | India |
| Frequency | 🔄 Repeat icon | Very High |
| Source | 🔗 Link icon | Startup India, Smart India Hackathon |
| Confidence | ✓ Checkmark icon | High |

- **Chip style**: 1px border (#333345), transparent background, border-radius 8px, padding 6px 10px
- **Text**: 11px, medium weight (500), color #9090A5
- **Icon color**: Same muted grey as text

---

### 3. Scores Dashboard
This is the **most critical visual section** of the Deep Dive. It communicates the analytical assessment of the problem at a glance.

- **Top margin**: 32px below the metadata tags
- **Section heading**: "Scores" in 13px, uppercase, semi-bold, letter-spacing 1px, color #606070. Left-aligned.
- **Top margin of grid from heading**: 16px

#### 3a. Score Grid (2 × 2)
Four metric cards arranged in a 2-column, 2-row grid with 12px gaps.

**Individual Score Card:**
- **Size**: Equal width, each takes ~48% of the row
- **Background**: #1A1A2E (elevated surface, same as Feed card)
- **Border**: 1px solid rgba(255,255,255,0.06)
- **Border Radius**: 14px
- **Padding**: 16px
- **Layout**: Vertical stack inside each card

| Sub-element | Style |
|-------------|-------|
| Score Label | 11px, medium weight, muted grey (#808090), uppercase |
| Score Value | 32px, bold (700), white (#FFFFFF) |
| Score Suffix | "/10" in 16px, regular weight, appended to value, color #606070 |
| Progress Bar | Full-width horizontal bar below the value. Height: 4px. Border-radius: 2px. Background track: #2A2A3E. Fill: color-coded (green/amber/red based on value). |

**The four scores in the grid:**

| Position | Label | Example Value | Bar Color |
|----------|-------|---------------|-----------|
| Top-Left | SEVERITY | 9/10 | #00E676 (green) |
| Top-Right | MARKET POTENTIAL | 8/10 | #00E676 (green) |
| Bottom-Left | AI FEASIBILITY | 8/10 | #00E676 (green) |
| Bottom-Right | COMPETITION | 3/10 | #00E676 (green — low competition is good) |

**Progress bar fill logic:**
- Score 8–10 → Green (#00E676), bar fills 80–100%
- Score 5–7 → Amber (#FFB300), bar fills 50–70%
- Score 1–4 → Red (#FF5252), bar fills 10–40%
- **Exception — Competition**: Invert the color logic. Low competition (1–4) gets green because low competition = high opportunity. High competition (8–10) gets red.

#### 3b. Opportunity Score Bar (Full Width, Below Grid)
- **Top margin**: 12px below the grid
- **Layout**: Full-width card spanning both columns
- **Background**: Gradient from #00E676 to #00C853 (for high scores) or amber gradient for medium
- **Border Radius**: 14px
- **Padding**: 20px
- **Content**:
  - Left: "OPPORTUNITY SCORE" in 11px, uppercase, semi-bold, white with slight opacity (0.8)
  - Right: "9/10" in 36px, bold, pure white
- **This is the hero metric** — it should feel visually dominant and confident

---

### 4. Pain Points Section
- **Top margin**: 32px below the scores dashboard
- **Section heading**: "Pain Points" in 13px, uppercase, semi-bold, letter-spacing 1px, color #606070
- **Top margin of list from heading**: 16px

#### Pain Point Item (Repeated 3 times)
- **Layout**: Horizontal row — icon on left, text on right
- **Icon**: Small red circle or red warning triangle, 8px, color #FF5252
- **Text**: 15px, regular weight (400), line-height 1.6, color #D0D0E0
- **Spacing between items**: 14px vertical gap
- **Left icon margin-right**: 12px

**No card container for this section** — items sit directly on the background with just the icon + text. Keep it clean.

---

### 5. Possible Solutions Section
- **Top margin**: 32px below pain points
- **Section heading**: "Possible Solutions" in 13px, uppercase, semi-bold, letter-spacing 1px, color #606070
- **Top margin of list from heading**: 16px

#### Solution Item (Repeated 3 times)
- **Layout**: Horizontal row — icon on left, text on right
- **Icon**: Small green circle or green lightbulb, 8px, color #00E676
- **Text**: 15px, regular weight (400), line-height 1.6, color #D0D0E0
- **Spacing between items**: 14px vertical gap
- **Left icon margin-right**: 12px

Same visual structure as Pain Points, but with green icons instead of red to create a clear visual contrast between "what's broken" and "what could fix it."

---

### 6. Source & Confidence Footer
- **Top margin**: 32px below solutions
- **Bottom padding**: 40px (breathing room at the end of scroll)
- **Layout**: A subtle card or container with very faint background

- **Container style**: Background #13132A, border 1px solid rgba(255,255,255,0.04), border-radius 12px, padding 16px
- **Content layout**: Two rows inside

| Row | Left | Right |
|-----|------|-------|
| Row 1 | "Source" label (11px, muted grey) | Source value (13px, white, e.g., "Startup India, Smart India Hackathon") |
| Row 2 | "Confidence" label (11px, muted grey) | Confidence badge — small pill with color coding |

**Confidence badge colors:**
- High → Green pill (#00E676 background at 15% opacity, #00E676 text)
- Medium → Amber pill (#FFB300 background at 15% opacity, #FFB300 text)
- Low → Red pill (#FF5252 background at 15% opacity, #FF5252 text)

---

## Real Data Example (Use This in the Design)

Design the full screen using **PIP-002** as the primary example:

```
Sector:          HEALTHCARE
Title:           Rural ASHA workers lack digital tools to record and report patient data accurately
User Type:       ASHA Workers, Rural Patients
Geography:       India
Frequency:       Very High
Source:          Startup India, Smart India Hackathon
Confidence:      High

Pain Points:
  🔴 Paper-based records get lost or damaged in field conditions
  🔴 No real-time reporting to PHCs — delays outbreak detection
  🔴 Low digital literacy makes complex apps unusable

Possible Solutions:
  🟢 Voice-first Hindi app with offline data sync
  🟢 WhatsApp-based symptom reporting via structured chat
  🟢 AI agent to auto-summarize field reports for PHC doctors

Scores:
  Severity:         9/10
  Market Potential:  8/10
  AI Feasibility:    8/10
  Competition:       3/10
  Opportunity:       9/10
```

### Secondary Example (For a Second Frame Variation)

Use **PIP-003** for a second frame to show how a different problem looks:

```
Sector:          FINTECH / RETAIL
Title:           Small kirana store owners cannot access credit due to lack of formal financial records
User Type:       Kirana Store Owners
Geography:       India
Frequency:       Very High
Source:          Reddit (r/india), Startup India
Confidence:      High

Pain Points:
  🔴 No GST filing or digital transaction history to show lenders
  🔴 Forced to rely on high-interest informal moneylenders
  🔴 Cash-based operations invisible to formal credit systems

Possible Solutions:
  🟢 AI-powered bookkeeping app that auto-generates credit profiles
  🟢 UPI transaction analysis to build alternative credit scores
  🟢 Vernacular-language onboarding for low-literacy users

Scores:
  Severity:         8/10
  Market Potential:  9/10
  AI Feasibility:    7/10
  Competition:       7/10
  Opportunity:       8/10
```

---

## Color System

Inherits entirely from Screen 1 (Feed) color system. Key additions for this screen:

| Element | Color | Hex |
|---------|-------|-----|
| Screen Background | Deep navy/black | #0D0D1A |
| Score Card Background | Elevated surface | #1A1A2E |
| Score Card Border | Ultra-subtle white | rgba(255,255,255,0.06) |
| Progress Bar Track | Dark track | #2A2A3E |
| Progress Bar Fill — High (8–10) | Green | #00E676 |
| Progress Bar Fill — Medium (5–7) | Amber | #FFB300 |
| Progress Bar Fill — Low (1–4) | Red | #FF5252 |
| Opportunity Bar BG — High | Green gradient | #00E676 → #00C853 |
| Opportunity Bar BG — Medium | Amber gradient | #FFB300 → #F57C00 |
| Section Heading Text | Dim label | #606070 |
| Pain Point Icon | Red dot | #FF5252 |
| Solution Icon | Green dot | #00E676 |
| Body Text (Pain/Solution) | Light readable | #D0D0E0 |
| Footer Container BG | Deep subtle | #13132A |

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Header — "Problem Details" | Inter | 16px | 600 | 1.2 |
| Sector Badge | Inter | 11px | 600 | 1.0 |
| Problem Title | Inter or Outfit | 24px | 700 | 1.35 |
| Metadata Tag Text | Inter | 11px | 500 | 1.0 |
| Section Heading (SCORES, PAIN POINTS, etc.) | Inter | 13px | 600 | 1.0 |
| Score Label (inside card) | Inter | 11px | 500 | 1.0 |
| Score Value (inside card) | Inter | 32px | 700 | 1.0 |
| Score Suffix (/10) | Inter | 16px | 400 | 1.0 |
| Opportunity Score Value | Inter | 36px | 700 | 1.0 |
| Opportunity Label | Inter | 11px | 600 | 1.0 |
| Pain/Solution Body Text | Inter | 15px | 400 | 1.6 |
| Source/Confidence Labels | Inter | 11px | 500 | 1.0 |
| Source Value Text | Inter | 13px | 500 | 1.4 |

---

## Section Spacing Summary

| Between | Gap |
|---------|-----|
| Header → Hero Section | 24px |
| Sector Badge → Title | 16px |
| Title → Metadata Tags | 16px |
| Metadata Tags → Scores Section | 32px |
| Section Heading → Section Content | 16px |
| Scores Section → Pain Points Section | 32px |
| Pain Points Section → Solutions Section | 32px |
| Solutions Section → Source Footer | 32px |
| Source Footer → Bottom of scroll | 40px |

---

## Interaction Notes (For Figma Prototype)
- **Back Arrow (←)**: Returns to the Feed screen with a slide-left transition (reverse of the slide-right entry)
- **Bookmark Icon**: Toggles between outlined (unsaved) and filled (saved) state on tap. Subtle scale animation (1.0 → 1.2 → 1.0) over 200ms.
- **Share Icon**: Opens native share sheet (just indicate the tap target in Figma)
- **Score Progress Bars**: Animate from 0% to final width on screen load. Stagger: each bar starts 100ms after the previous. Duration: 600ms each, ease-out.
- **Scroll**: Standard vertical scroll. Header stays fixed with blur backdrop.
- **Entry Transition**: Screen slides in from the right (push navigation from Feed). Duration: 300ms, ease-out.

---

## What NOT to Do
- ❌ Do NOT put all content in one giant card — use clear section breaks with spacing
- ❌ Do NOT use tabs or horizontal scrolling within this screen — everything is in a single vertical scroll
- ❌ Do NOT hide scores behind taps or accordions — all scores must be immediately visible
- ❌ Do NOT use pie charts, radar charts, or complex visualizations — simple progress bars only
- ❌ Do NOT add a "similar problems" section — keep this screen focused on ONE problem
- ❌ Do NOT use light mode — dark mode only
- ❌ Do NOT add a bottom navigation bar — this is a detail screen, not a tab destination
- ❌ Do NOT make the opportunity score the same visual weight as other scores — it must stand out as the hero metric

---

## Design Mood References
- **Revolut** card details screen (dark, structured, data-rich)
- **Linear** issue detail view (clean sections, minimal chrome)
- **Notion** database record view (structured fields, clear hierarchy)
- **Apple Health** metrics cards (progress bars, score grids)

---

## Deliverable Checklist
- [ ] Full viewport mobile frame (375 × 812), scrollable content
- [ ] Sticky header with back arrow, title, bookmark, share
- [ ] Hero section with sector badge, full title, 5 metadata tags with icons
- [ ] Scores dashboard: 2×2 grid with animated progress bars + full-width opportunity bar
- [ ] Pain Points section: 3 items with red icons
- [ ] Possible Solutions section: 3 items with green icons
- [ ] Source & Confidence footer with color-coded confidence badge
- [ ] All real data from PIP-002 populated
- [ ] Second frame with PIP-003 data as variation
- [ ] Dark mode only
- [ ] Consistent spacing (32px between sections, 16px heading-to-content)

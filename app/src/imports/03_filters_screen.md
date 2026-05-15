# Screen 3: Filters

## Context for Figma AI
You are designing the **filter screen** for the Problem Intelligence Platform — an app that presents real-world problems as structured startup opportunities. The user opens this screen by tapping the filter icon (sliders/tune icon) on the top-right of the Feed screen (Screen 1). It lets users narrow down which problems appear in their feed based on sector, geography, scores, and AI-solvability.

This screen should feel like a **control panel** — precise, functional, and satisfying to use. Every control directly changes what the user sees in the feed. It is NOT a settings page. It is a live filtering tool.

---

## Screen Purpose
Let users answer: **"Show me only the problems I care about."**

Specifically, a user should be able to:
- Focus on a specific sector (e.g., only Healthcare)
- Focus on a specific geography (default: India)
- See only problems that AI can realistically solve
- Set a minimum quality bar (e.g., only Opportunity 7+)
- See how many results match their current filters before applying
- Reset everything to defaults with one tap

---

## Platform
- **Primary**: Mobile (375 × 812px — iPhone 13/14 viewport)
- **Presentation**: Bottom sheet that slides up from the bottom of the Feed screen, covering ~85% of the viewport. The top 15% shows the dimmed Feed behind it, reinforcing that this is a temporary overlay — not a separate destination.

---

## Layout Architecture

The screen is a **bottom sheet overlay** on top of the Feed. It slides up and can be dismissed by swiping down or tapping "Apply" / the dimmed area above.

```
┌─────────────────────────────────┐
│   ░░░░░ DIMMED FEED ░░░░░░░░░  │  ← 15% — tappable to dismiss
├─────────────────────────────────┤
│  ▔▔▔  DRAG HANDLE  ▔▔▔         │  ← 4px × 36px rounded bar
├─────────────────────────────────┤
│  HEADER (Filters + Reset)       │
├─────────────────────────────────┤
│                                 │
│  SECTOR FILTER                  │  ← Multi-select chips
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  GEOGRAPHY FILTER               │  ← Text input / dropdown
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  AI-SOLVABLE TOGGLE             │  ← Switch toggle
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│                                 │
│  MINIMUM OPPORTUNITY SLIDER     │  ← Range slider
│                                 │
├─────────────────────────────────┤
│  APPLY BUTTON (sticky bottom)   │  ← Full-width CTA
└─────────────────────────────────┘
```

---

## Component Breakdown

### 0. Dimmed Overlay (Behind the Sheet)
- The Feed screen is still visible behind the bottom sheet but covered with a dark overlay
- **Overlay color**: rgba(0, 0, 0, 0.55)
- **Tap behavior**: Tapping the dimmed area dismisses the filter sheet without applying changes

### 1. Drag Handle
- **Position**: Centered at the very top of the bottom sheet
- **Size**: 36px wide × 4px tall
- **Color**: #505060
- **Border-radius**: 2px (fully rounded)
- **Top margin**: 12px from the top edge of the sheet
- **Purpose**: Visual affordance that this is a draggable sheet. Swiping down on the handle dismisses the sheet.

### 2. Header Row
- **Top margin**: 20px below the drag handle
- **Horizontal padding**: 20px
- **Layout**: Flex row, space-between, vertically centered

| Position | Element | Details |
|----------|---------|---------|
| Left | Title | "Filters" in 22px, bold (700), white (#FFFFFF) |
| Right | Reset Button | "Reset" in 14px, medium weight (500), accent color (#00E676). Tapping clears all filters to defaults. No background, just text. |

### 3. Sector Filter (Multi-Select Chips)

- **Top margin**: 28px below header
- **Section label**: "Sector" in 13px, uppercase, semi-bold (600), letter-spacing 1px, color #606070
- **Label-to-chips gap**: 14px

#### Chip Grid
- **Layout**: Flex-wrap row, gap 10px (horizontal and vertical)
- **Chips wrap to multiple rows** as needed — expect 2–3 rows for 9 sectors

#### Individual Chip
- **Height**: 38px
- **Padding**: 0px 16px
- **Border-radius**: 10px
- **Typography**: 13px, medium weight (500)

**Two states:**

| State | Background | Border | Text Color |
|-------|-----------|--------|------------|
| Inactive (default) | Transparent | 1px solid #333345 | #808090 |
| Active (selected) | Sector accent color at 15% opacity | 1px solid sector accent color | Sector accent color |

**Chips to include (matching the Phase 0 dataset sectors):**

| Chip Label | Accent When Active |
|------------|-------------------|
| Healthcare | #26C6DA (Cyan) |
| Fintech | #FFB300 (Amber) |
| Education | #7C4DFF (Purple) |
| Agriculture | #66BB6A (Green) |
| GovTech | #42A5F5 (Blue) |
| CleanTech | #26A69A (Teal) |
| Employment | #EC407A (Pink) |
| Creator Economy | #FFA726 (Orange) |
| Retail | #FFB300 (Amber) |

- **Multi-select**: Users can select multiple sectors. Each tapped chip toggles independently.
- **Default state**: No chips selected (meaning "show all sectors")
- **Tap animation**: Quick scale pulse (1.0 → 1.05 → 1.0) over 150ms on toggle

---

### 4. Geography Filter

- **Top margin**: 28px below sector chips
- **Section label**: "Geography" in 13px, uppercase, semi-bold (600), letter-spacing 1px, color #606070
- **Label-to-input gap**: 14px

#### Input Field
- **Width**: 100%
- **Height**: 48px
- **Background**: #1A1A2E
- **Border**: 1px solid #333345
- **Border-radius**: 12px
- **Padding**: 0px 16px
- **Typography**: 15px, regular weight (400), white (#FFFFFF)
- **Placeholder text**: "e.g., India, Maharashtra, Delhi" in 15px, color #505060

**Left icon**: Small location pin (📍) icon, 16px, color #606070, margin-right 10px

**Default value**: "India" — pre-filled since the product is India-first. Users can clear it and type a different geography or leave it as "India."

**Focus state**: Border color changes to accent (#00E676), subtle glow (0 0 0 2px rgba(0,230,118,0.15))

---

### 5. AI-Solvable Toggle

- **Top margin**: 28px below geography input
- **Layout**: Flex row, space-between, vertically centered
- **Full-width container**: No section label above — the label is inline

| Position | Element | Details |
|----------|---------|---------|
| Left | Label + Description | Two lines stacked vertically |
| Right | Toggle Switch | Standard iOS-style toggle |

**Left content:**
- **Line 1**: "AI-Solvable Only" in 15px, medium weight (500), white (#FFFFFF)
- **Line 2**: "Show problems with AI Feasibility ≥ 7" in 12px, regular weight (400), color #808090

**Toggle Switch (Right):**
- **Size**: 50px wide × 28px tall
- **Border-radius**: 14px (fully rounded)
- **Thumb**: 24px circle, white, with subtle shadow

| State | Track Color | Thumb Position |
|-------|------------|----------------|
| Off (default) | #333345 | Left |
| On | #00E676 | Right |

- **Tap animation**: Thumb slides from left to right (or reverse) over 200ms, ease-in-out. Track color fades between states.

---

### 6. Minimum Opportunity Score Slider

- **Top margin**: 28px below toggle
- **Section label**: "Min. Opportunity Score" in 13px, uppercase, semi-bold (600), letter-spacing 1px, color #606070
- **Label-to-slider gap**: 20px

#### Slider Component
- **Width**: 100%
- **Track height**: 4px
- **Track background (inactive portion)**: #2A2A3E
- **Track fill (active portion, left of thumb)**: Gradient from #00E676 to #00C853
- **Track border-radius**: 2px

**Thumb:**
- **Size**: 24px circle
- **Background**: White (#FFFFFF)
- **Border**: 2px solid #00E676
- **Shadow**: 0 2px 8px rgba(0,0,0,0.3)
- **On drag**: Slight scale up (1.0 → 1.15) and shadow increase

**Value Label (Above Thumb):**
- A small floating bubble/tooltip that follows the thumb position
- **Background**: #00E676
- **Border-radius**: 8px
- **Padding**: 4px 10px
- **Text**: Current value (e.g., "7") in 13px, bold, white
- **Tail**: Small triangle/caret pointing down toward the thumb
- **Visibility**: Always visible while interacting. Fades out 1 second after the user releases the thumb.

**Scale markers:**
- Below the track, show the range endpoints
- Left: "1" in 11px, color #505060
- Right: "10" in 11px, color #505060

**Default value**: 1 (no minimum filter — show all problems)

---

### 7. Apply Button (Sticky Bottom)

- **Position**: Fixed to the bottom of the sheet
- **Bottom padding**: 32px (accounts for safe area / home indicator)
- **Horizontal padding**: 20px
- **Background behind button**: Gradient fade from transparent to sheet background color (#0D0D1A) — prevents content from awkwardly cutting off behind the button

#### Button Specs
- **Width**: 100% (minus horizontal padding)
- **Height**: 54px
- **Background**: Gradient from #00E676 to #00C853
- **Border-radius**: 14px
- **Shadow**: 0 4px 16px rgba(0,230,118,0.25)

**Text:**
- "Apply Filters" in 16px, bold (700), white (#FFFFFF), centered
- Below or beside the text: result count in parentheses — e.g., "(8 problems)" in 13px, medium weight, white at 80% opacity

**Dynamic behavior:**
- The result count updates **live** as the user changes filters (before tapping Apply)
- If zero results: Text changes to "No problems match" and button becomes disabled (opacity 0.4, non-interactive)

**Tap animation**: Quick press-down scale (1.0 → 0.97 → 1.0) over 150ms

---

## Real Data Context (For Result Count Logic)

The 10 seed problems from Phase 0 fall into these sectors:

| Sector | Count | Problem IDs |
|--------|-------|-------------|
| Healthcare | 3 | PIP-002, PIP-006, PIP-009 |
| Fintech / Retail | 2 | PIP-003, PIP-010 |
| Education | 1 | PIP-001 |
| Agriculture | 1 | PIP-004 |
| Employment / EdTech | 1 | PIP-005 |
| CleanTech | 1 | PIP-007 |
| Legal / GovTech | 1 | PIP-008 |

**All 10 problems have Geography = India.**

**AI Feasibility scores**: 8, 8, 7, 7, 9, 8, 8, 8, 8, 8 — so with AI-Solvable toggle ON (≥7), all 10 problems pass.

**Opportunity scores**: 7, 9, 8, 9, 8, 8, 8, 8, 9, 7 — so with Min Opportunity ≥ 8, 7 of 10 pass.

Use these numbers to populate realistic result counts in the Apply button.

**Design example states:**
- Default (no filters): "Apply Filters (10 problems)"
- Healthcare selected: "Apply Filters (3 problems)"
- Healthcare + Min Opportunity 9: "Apply Filters (1 problem)"
- Agriculture + Min Opportunity 10: "No problems match"

---

## Color System

Inherits from Screen 1 and Screen 2. Key additions:

| Element | Color | Hex |
|---------|-------|-----|
| Sheet Background | Same as screen bg | #0D0D1A |
| Dimmed Overlay | Black semi-transparent | rgba(0,0,0,0.55) |
| Drag Handle | Muted grey | #505060 |
| Input Field BG | Elevated surface | #1A1A2E |
| Input Field Border — Default | Subtle border | #333345 |
| Input Field Border — Focus | Accent | #00E676 |
| Inactive Chip Border | Subtle border | #333345 |
| Inactive Chip Text | Muted | #808090 |
| Active Chip BG | Sector color at 15% | rgba(sector_color, 0.15) |
| Active Chip Border | Sector color | Sector accent |
| Active Chip Text | Sector color | Sector accent |
| Toggle Track — Off | Dark | #333345 |
| Toggle Track — On | Green | #00E676 |
| Toggle Thumb | White | #FFFFFF |
| Slider Track — Inactive | Dark | #2A2A3E |
| Slider Track — Active Fill | Green gradient | #00E676 → #00C853 |
| Slider Thumb | White + green border | #FFFFFF / #00E676 |
| Slider Value Bubble | Green | #00E676 |
| Apply Button BG | Green gradient | #00E676 → #00C853 |
| Apply Button — Disabled | Faded | opacity 0.4 |
| Reset Text | Accent | #00E676 |

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Title "Filters" | Inter or Outfit | 22px | 700 | 1.2 |
| "Reset" button | Inter | 14px | 500 | 1.0 |
| Section Labels (SECTOR, GEOGRAPHY, etc.) | Inter | 13px | 600 | 1.0 |
| Chip Text | Inter | 13px | 500 | 1.0 |
| Input Field Text | Inter | 15px | 400 | 1.0 |
| Input Placeholder | Inter | 15px | 400 | 1.0 |
| Toggle Label "AI-Solvable Only" | Inter | 15px | 500 | 1.4 |
| Toggle Description | Inter | 12px | 400 | 1.4 |
| Slider Value Bubble | Inter | 13px | 700 | 1.0 |
| Slider Scale Markers (1, 10) | Inter | 11px | 400 | 1.0 |
| Apply Button Text | Inter | 16px | 700 | 1.0 |
| Apply Button Result Count | Inter | 13px | 500 | 1.0 |

---

## Section Spacing Summary

| Between | Gap |
|---------|-----|
| Sheet top edge → Drag handle | 12px |
| Drag handle → Header row | 20px |
| Header row → Sector section | 28px |
| Section label → Section content | 14px |
| Sector section → Geography section | 28px |
| Geography section → AI-Solvable toggle | 28px |
| AI-Solvable toggle → Opportunity slider | 28px |
| Opportunity slider → Apply button zone | 32px |
| Apply button → Bottom edge (safe area) | 32px |

---

## Interaction Notes (For Figma Prototype)

- **Entry**: Sheet slides up from the bottom over 300ms, ease-out. Dimmed overlay fades in simultaneously.
- **Dismiss — Swipe down**: User can swipe the sheet down to dismiss. If swiped past 30% of sheet height, it dismisses. Otherwise it snaps back.
- **Dismiss — Tap overlay**: Tapping the dimmed area above the sheet dismisses without applying.
- **Dismiss — Apply**: Tapping "Apply Filters" dismisses the sheet AND applies the filters to the feed.
- **Chip toggle**: Tap to select/deselect. Multiple chips can be active simultaneously. Quick scale pulse on toggle.
- **Geography input**: Tap to focus, keyboard appears (not designed here — standard system keyboard).
- **AI-Solvable toggle**: Tap anywhere on the row (label or switch) to toggle.
- **Slider drag**: Drag the thumb left/right. Value bubble follows the thumb and updates in real time.
- **Live result count**: The "(X problems)" text in the Apply button updates immediately as any filter changes. No need to tap Apply to see the count.
- **Reset**: Tapping "Reset" clears all chip selections, resets geography to "India", turns off AI-Solvable toggle, and resets slider to 1. Result count updates to "(10 problems)".
- **Exit transition**: Sheet slides down over 250ms, ease-in. Overlay fades out.

---

## What NOT to Do
- ❌ Do NOT make this a full-screen page with its own navigation bar — it is a bottom sheet overlay
- ❌ Do NOT use dropdown menus for sector selection — use tappable chips for speed and visibility
- ❌ Do NOT add a "Sort by" option here — sorting is separate from filtering
- ❌ Do NOT include advanced/complex filters (date range, source type, confidence) — keep it simple for MVP
- ❌ Do NOT place the Apply button inline with the content — it must be sticky at the bottom, always visible
- ❌ Do NOT use a stepper (+ / −) for the opportunity score — use a smooth slider for fluid feel
- ❌ Do NOT show the filter results list inside this sheet — the sheet is only for setting filters, results appear in the Feed after applying
- ❌ Do NOT use light mode — dark mode only
- ❌ Do NOT allow the geography input to be empty — if cleared, show placeholder but treat as "All geographies"

---

## Design Mood References
- **Spotify** filter bottom sheet (dark, chip-based genre selection)
- **Airbnb** filter sheet (clean sections, live result count in apply button)
- **YouTube Music** filter chips (dark theme, multi-select, colored active states)
- **Apple Maps** bottom sheet behavior (drag handle, partial overlay, smooth dismiss)

---

## Deliverable Checklist
- [ ] Bottom sheet overlay on a dimmed Feed background (375 × 812 frame)
- [ ] Drag handle centered at top of sheet
- [ ] Header with "Filters" title and "Reset" button
- [ ] Sector chips — 9 chips in flex-wrap layout, show both active and inactive states
- [ ] Geography input with pin icon, pre-filled "India", focus state variant
- [ ] AI-Solvable toggle with label + description, show ON and OFF states
- [ ] Opportunity slider with thumb, track fill, and floating value bubble
- [ ] Sticky Apply button with live result count — show normal state and disabled/zero state
- [ ] At least 2 frames: one with default state (no filters), one with filters applied (e.g., Healthcare + AI-Solvable ON + Min Opportunity 8)
- [ ] Dark mode only
- [ ] Consistent spacing (28px between sections, 14px label-to-content)

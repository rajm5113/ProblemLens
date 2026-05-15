# Screen 1: Problem Feed (Discovery Mode)

## Context for Figma AI
You are designing a mobile-first problem discovery feed for the **Problem Intelligence Platform** — an app that presents real-world problems as structured startup opportunities. Think of it as **Inshorts, but for startup-worthy problems instead of news**. The user scrolls through one problem at a time, scanning for something worth exploring deeper.

---

## Screen Purpose
This is the **primary discovery surface** of the entire product. Users spend most of their time here. The goal is to let someone scan 10–20 problems in under 2 minutes and instantly know:
- What sector this problem belongs to
- What the problem is (one sentence)
- How painful it is (one supporting line)
- How big the opportunity is (a score)

If a problem interests them, they tap to see the full breakdown (that's a different screen — not this one).

---

## Platform
- **Primary**: Mobile (375 × 812px — iPhone 13/14 viewport)
- **Secondary**: Should scale to tablet and desktop later, but design mobile-first

---

## Layout Architecture

The screen is divided into **3 vertical zones** stacked top to bottom, filling the full viewport. One problem card is visible at a time — no partial cards, no scrolling list. The user swipes up to see the next problem.

```
┌─────────────────────────────────┐
│         TOP NAV BAR             │  ← Fixed, 56px height
├─────────────────────────────────┤
│                                 │
│                                 │
│                                 │
│       PROBLEM CARD AREA         │  ← Fills remaining space
│       (one card at a time)      │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│       BOTTOM ACTION BAR         │  ← Fixed, 80px height
└─────────────────────────────────┘
```

---

## Component Breakdown

### 1. Top Navigation Bar
- **Height**: 56px
- **Background**: Same as screen background (seamless, no border)
- **Left**: App logo or wordmark — "ProblemLens" in bold, modern sans-serif. Keep it small and understated.
- **Right**: Filter icon (sliders/tune icon). Tapping this opens the Filter screen (separate spec). Add a small dot indicator on the icon if any filter is active.
- **Alignment**: Vertically centered, horizontal padding 20px

### 2. Problem Card (Main Content Area)
This is the hero of the screen. It fills roughly 75–80% of the viewport height.

#### 2a. Card Container
- **Background**: Slightly lighter than the screen background (e.g., #1A1A2E or #1E1E2E on a #0D0D1A background). Use a subtle gradient or glassmorphism effect to give depth.
- **Border Radius**: 20px
- **Margin**: 16px horizontal, vertically centered in available space
- **Padding**: 28px inside
- **Shadow**: Very subtle dark shadow for depth (0 4px 24px rgba(0,0,0,0.3))

#### 2b. Top Metadata Row (Inside Card)
A horizontal row at the top of the card with two elements:

- **Left — Sector Badge**:
  - Small rounded pill (border-radius: 8px)
  - Background: Semi-transparent accent color matching the sector (e.g., teal for Healthcare, amber for Fintech, green for Agriculture)
  - Text: Sector name in uppercase, 11px, semi-bold, letter-spacing 0.5px
  - Padding: 6px 12px
  - Examples: "HEALTHCARE", "FINTECH", "EDUCATION", "AGRICULTURE"

- **Right — Opportunity Score**:
  - Circular badge or bold pill
  - Background: Accent gradient (e.g., from #00E676 to #00C853 for high scores, or #FF9800 to #F57C00 for medium)
  - Text: "9/10" in bold white, 14px
  - Below or beside it: tiny label "Opportunity" in 9px muted text

#### 2c. Problem Title (Inside Card)
- **Position**: Below the metadata row, with 24px top margin
- **Typography**: 24–28px, bold (font-weight 700), line-height 1.3
- **Color**: Pure white (#FFFFFF)
- **Max lines**: 3–4 (title should be fully visible without truncation for most problems)
- This is the most visually dominant element on the card.

#### 2d. Pain Summary Line (Inside Card)
- **Position**: Below the title, with 16px top margin
- **Typography**: 15–16px, regular weight (400), line-height 1.5
- **Color**: Muted light grey (#A0A0B0)
- **Max lines**: 2
- This is ONE of the pain points from the problem — the most impactful one, picked as a teaser.

#### 2e. Bottom Metadata Tags (Inside Card)
- **Position**: Pinned to the bottom of the card, with auto top margin pushing it down
- **Layout**: Horizontal row with 8px gaps, flex-wrap allowed
- **Tag Style**: Small outlined chips (1px border, transparent background, rounded corners 6px)
- **Tag Text**: 11px, muted grey (#808090)
- **Content**: 2–3 tags max from: User type, Geography, Frequency
- Examples: "College Students", "India", "High Frequency"

### 3. Bottom Action Bar
- **Height**: 80px
- **Background**: Same as screen background (seamless)
- **Layout**: Centered content

- **Primary Element — Swipe Indicator**:
  - A subtle upward-pointing chevron icon (^) with text "Swipe up for next" below it
  - Color: Very muted (#505060), 12px
  - Gently pulses or bobs up/down with a slow animation (hint to the user)

- **Secondary Element — Tap Hint** (optional):
  - Very faint text: "Tap card to explore" at 10px, barely visible
  - Only shown for the first 2–3 cards (onboarding hint)

---

## Real Data Examples (Use These in the Design)

Design the screen with **at least 2–3 card variations** using this real data:

### Card Example 1 (High Opportunity)
```
Sector Badge:    HEALTHCARE
Opportunity:     9/10
Title:           Rural ASHA workers lack digital tools to record and report patient data accurately
Pain Summary:    Paper-based records get lost or damaged in field conditions, delaying outbreak detection.
Tags:            ASHA Workers  ·  India  ·  Very High
```

### Card Example 2 (Medium-High Opportunity)
```
Sector Badge:    FINTECH / RETAIL
Opportunity:     8/10
Title:           Small kirana store owners cannot access credit due to lack of formal financial records
Pain Summary:    Forced to rely on high-interest informal moneylenders due to invisible cash-based operations.
Tags:            Kirana Store Owners  ·  India  ·  Very High
```

### Card Example 3 (Medium Opportunity)
```
Sector Badge:    EDUCATION
Opportunity:     7/10
Title:           Students struggle to track multiple course deadlines across platforms
Pain Summary:    No single unified view of tasks across LMS platforms leads to missed assignments.
Tags:            College Students  ·  India  ·  High
```

---

## Color System

| Element | Color | Hex |
|---------|-------|-----|
| Screen Background | Deep navy/black | #0D0D1A |
| Card Background | Dark elevated surface | #1A1A2E |
| Card Background Hover | Slightly lighter | #222240 |
| Primary Text (Title) | Pure white | #FFFFFF |
| Secondary Text (Summary) | Muted grey | #A0A0B0 |
| Tertiary Text (Tags, hints) | Dim grey | #808090 |
| Accent — High Score (8–10) | Vibrant green | #00E676 |
| Accent — Medium Score (5–7) | Warm amber | #FFB300 |
| Accent — Low Score (1–4) | Soft red | #FF5252 |
| Sector Badge BG | Semi-transparent sector color | rgba(sector_color, 0.15) |
| Sector Badge Text | Sector accent color | Varies per sector |

### Sector Color Map
| Sector | Accent Color |
|--------|-------------|
| Healthcare | #26C6DA (Cyan) |
| Fintech | #FFB300 (Amber) |
| Education | #7C4DFF (Purple) |
| Agriculture | #66BB6A (Green) |
| GovTech / Legal | #42A5F5 (Blue) |
| CleanTech | #26A69A (Teal) |
| Employment / EdTech | #EC407A (Pink) |
| Creator Economy | #FFA726 (Orange) |
| Rare Disease | #EF5350 (Red) |

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| App Title (Nav) | Inter or Outfit | 18px | 700 | 1.2 |
| Sector Badge | Inter | 11px | 600 | 1.0 |
| Opportunity Score | Inter | 14px | 700 | 1.0 |
| Problem Title | Inter or Outfit | 26px | 700 | 1.3 |
| Pain Summary | Inter | 15px | 400 | 1.5 |
| Metadata Tags | Inter | 11px | 500 | 1.0 |
| Swipe Hint | Inter | 12px | 400 | 1.0 |

---

## Interaction Notes (For Figma Prototype)
- **Swipe Up**: Transitions to the next problem card with a vertical slide animation
- **Swipe Down**: Transitions to the previous problem card
- **Tap Card**: Navigates to the Deep Dive screen (Screen 2) with a slide-right transition
- **Tap Filter Icon**: Opens the Filter screen (Screen 3) as a bottom sheet or overlay
- **Card Transition**: The outgoing card slides up and fades out. The incoming card slides up from below and fades in. Duration: 300ms, ease-out curve.

---

## What NOT to Do
- ❌ Do NOT show multiple cards on screen at once — this is one-card-at-a-time
- ❌ Do NOT use a scrollable list — this is a swipe-based feed
- ❌ Do NOT add a bottom tab bar on this screen — keep it immersive
- ❌ Do NOT show all scores on the feed card — only Opportunity Score. All other scores (severity, AI feasibility, etc.) are reserved for the Deep Dive screen
- ❌ Do NOT truncate the problem title with "..." — size the card to fit 3–4 lines
- ❌ Do NOT use generic stock imagery or illustrations — this is a text-and-data-first interface
- ❌ Do NOT use light mode — dark mode only for this screen

---

## Design Mood References
- **Inshorts** (news card swiping UX)
- **Spotify** (dark theme, clean typography, content-first)
- **Revolut** (dark fintech dashboard, crisp data presentation)
- **Arc Browser** (modern, minimal, intelligent UI)

---

## Deliverable Checklist
- [ ] Full viewport mobile frame (375 × 812)
- [ ] Top nav bar with logo + filter icon
- [ ] Problem card with all 5 sub-components (sector badge, opportunity score, title, pain summary, tags)
- [ ] Bottom swipe indicator
- [ ] At least 2–3 card variations with real data from examples above
- [ ] Color-coded sector badges
- [ ] Score-based opportunity badge color (green for 8+, amber for 5–7)
- [ ] Dark mode only

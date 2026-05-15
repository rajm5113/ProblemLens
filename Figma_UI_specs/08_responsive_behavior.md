# Responsive Behavior

## Context for Figma AI
This document defines **how every screen and component in ProblemLens adapts across different screen sizes**. The app is designed mobile-first — mobile is the primary experience. Tablet and desktop are progressive enhancements that take advantage of extra space without redesigning the core interaction model.

This spec works alongside the screen specs (01–05), design system (06), and navigation flow (07). If a screen spec defines the mobile layout and this document describes a different layout for desktop, the desktop layout in this document takes precedence for that breakpoint.

---

## 1. Breakpoint Definitions

Three breakpoints. No in-between. Design for exactly these three.

| Breakpoint | Name | Width Range | Target Devices |
|------------|------|-------------|----------------|
| Mobile | `mobile` | 320px – 767px | iPhone SE through iPhone 15 Pro Max, most Android phones |
| Tablet | `tablet` | 768px – 1023px | iPad Mini, iPad Air, iPad Pro (portrait), Android tablets |
| Desktop | `desktop` | 1024px+ | Laptops, desktops, iPad Pro (landscape) |

**Design frames to produce in Figma:**

| Frame | Width | Height |
|-------|-------|--------|
| Mobile (primary) | 375px | 812px |
| Mobile (small) | 320px | 568px |
| Tablet | 768px | 1024px |
| Desktop | 1440px | 900px |

---

## 2. Layout Strategy Per Breakpoint

### Mobile (320–767px) — Single Column, Full Immersion

This is the **primary design target**. Every screen spec (01–05) describes this layout.

- **Layout**: Single column, full-width content
- **Feed**: Full-screen swipe, one card per viewport
- **Deep Dive**: Full-screen scrollable detail
- **Filters**: Bottom sheet overlay (85% viewport)
- **Dashboard**: Full-width tab bar + vertical card list
- **Navigation**: Bottom nav bar (Feed + Dashboard)
- **Onboarding**: Full-screen carousel
- **Content max-width**: None (full viewport width)
- **Horizontal padding**: 20px

### Tablet (768–1023px) — Centered Column, More Breathing Room

The app looks and behaves like mobile, but with a **constrained content width** centered on screen. More whitespace, cards feel more spacious, but the core flow is identical.

- **Layout**: Single column, content centered with max-width
- **Content max-width**: 600px, centered horizontally
- **Feed**: Same one-card-at-a-time swipe, but card has more horizontal padding and feels more spacious
- **Deep Dive**: Same scrollable layout, centered content column
- **Filters**: Bottom sheet, but narrower (max-width 600px, centered)
- **Dashboard**: Same tab bar + card list, content centered
- **Navigation**: Bottom nav bar (same as mobile)
- **Onboarding**: Same carousel, centered content
- **Horizontal padding**: 32px (within the content column)
- **Background**: `--bg-base` fills the full screen width behind the centered column

### Desktop (1024px+) — Split View, Master-Detail

The layout fundamentally changes to a **two-panel master-detail view**. The left panel shows a scrollable list (Feed or Dashboard), and the right panel shows the Deep Dive of the selected problem. No more full-screen swipe cards — the Feed becomes a compact list similar to an email client.

- **Layout**: Two-column split view
- **Left panel**: 400px fixed width, scrollable problem list
- **Right panel**: Remaining width (flex-grow), shows Deep Dive of selected problem
- **Navigation**: Top nav bar replaces bottom nav bar
- **Filters**: Sidebar or inline panel above the list (no bottom sheet)
- **Onboarding**: Centered modal overlay (max-width 480px) instead of full-screen

---

## 3. Screen-by-Screen Responsive Rules

### 3a. Splash Screen (S0)

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Layout | Centered on full screen | Centered on full screen | Centered on full screen |
| Logo size | 64px | 80px | 96px |
| App name size | 28px | 32px | 36px |
| Tagline size | 14px | 15px | 16px |
| Behavior | Identical across all — just scales up slightly |

---

### 3b. Onboarding (S1)

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Layout | Full-screen carousel | Full-screen carousel, content max-width 600px | Centered modal (max-width 480px, max-height 640px) on dimmed bg |
| Visual zone | 50% viewport | 45% viewport | 40% of modal height |
| Headline size | 26px | 28px | 28px |
| Subtext size | 15px | 16px | 16px |
| CTA button width | 280px | 320px | 100% of modal width (with 32px padding) |
| Skip position | Top-right | Top-right | Top-right of modal |
| Page dots | Centered, 100px from bottom | Centered, 120px from bottom | Centered, 60px from modal bottom |
| Dismiss | Complete carousel | Complete carousel | Can also click outside modal to skip |

---

### 3c. Feed Screen (S2)

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Layout | Full-screen swipe cards | Full-screen swipe, max-width 600px centered | Left panel: scrollable compact card LIST |
| Card style | Full viewport card (one at a time) | Full viewport card, more padding | Compact list cards (same as Dashboard compact cards) |
| Card interaction | Swipe up/down | Swipe up/down | Click to select (highlights card, loads detail in right panel) |
| Card tap → Deep Dive | Push navigation (full screen) | Push navigation (full screen) | Loads in right panel (no navigation) |
| Nav bar | Bottom nav | Bottom nav | Top nav bar |
| Filter access | Tap filter icon → bottom sheet | Tap filter icon → bottom sheet (600px wide) | Filter panel above the list OR collapsible sidebar |
| Content padding | 20px horizontal | 32px horizontal | 16px horizontal (within 400px panel) |
| Swipe behavior | Yes — primary interaction | Yes — primary interaction | No swipe. Scroll + click. |

**Desktop Feed — Left Panel Detail:**
```
┌──────────────────────────────────────────────────────┐
│  TOP NAV BAR                                         │
│  [Logo]  [Feed]  [Dashboard]        [Filter ⚙]      │
├────────────────┬─────────────────────────────────────┤
│                │                                     │
│  FEED LIST     │  DEEP DIVE (right panel)            │
│  (scrollable)  │  (scrollable)                       │
│                │                                     │
│  ┌──────────┐  │  Problem Title                      │
│  │ Card 1   │◄─│  Metadata Tags                      │
│  │ (active) │  │                                     │
│  └──────────┘  │  Scores Dashboard                   │
│  ┌──────────┐  │    [Sev: 9] [Mkt: 8]               │
│  │ Card 2   │  │    [AI: 8]  [Comp: 3]              │
│  └──────────┘  │    [Opportunity: 9/10]              │
│  ┌──────────┐  │                                     │
│  │ Card 3   │  │  Pain Points                        │
│  └──────────┘  │  • Point 1                          │
│  ┌──────────┐  │  • Point 2                          │
│  │ Card 4   │  │                                     │
│  └──────────┘  │  Solutions                          │
│                │  • Solution 1                        │
│  ... scroll    │  • Solution 2                        │
│                │                                     │
│                │  Source & Confidence                 │
├────────────────┴─────────────────────────────────────┤
│  (no bottom nav on desktop)                          │
└──────────────────────────────────────────────────────┘
```

**Active card in list**: When a card is selected (clicked), it gets a left border accent (3px solid `--accent-primary`) and slightly lighter background (`--bg-surface-hover`). This indicates which problem is shown in the right panel.

**Default state**: On first load, the first card in the list is auto-selected and its Deep Dive is shown in the right panel.

---

### 3d. Deep Dive Screen (S3)

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Layout | Full-screen scrollable page | Full-screen scrollable, max-width 600px centered | Embedded in right panel of split view |
| Header | Sticky header with back arrow | Sticky header with back arrow | No header (already in context — list is visible on left) |
| Back navigation | Back arrow / swipe from left | Back arrow / swipe from left | Click different card in left panel (no explicit "back") |
| Scores grid | 2×2 | 2×2 (wider cards) | 2×2 or 4×1 horizontal row (more width available) |
| Opportunity bar | Full-width | Full-width (within 600px) | Full-width (within right panel) |
| Section spacing | 32px | 36px | 40px |
| Content padding | 20px | 32px | 32px |
| Bookmark / Share | In sticky header (top-right) | In sticky header (top-right) | Floating action row at top of right panel |

---

### 3e. Filters (S4)

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Presentation | Bottom sheet (85% viewport) | Bottom sheet (max-width 600px, centered) | Inline panel above the left list panel, or collapsible sidebar |
| Drag handle | Yes | Yes | No (not a sheet) |
| Overlay | Yes (dimmed feed) | Yes (dimmed feed) | No overlay — filters are part of the page layout |
| Apply button | Sticky at bottom of sheet | Sticky at bottom of sheet | Inline at bottom of filter panel |
| Chip layout | Flex-wrap, full width | Flex-wrap, within 600px | Flex-wrap, within ~380px panel |
| Dismiss | Swipe down / tap overlay | Swipe down / tap overlay | Click "Close" icon or toggle filter panel visibility |

**Desktop filter panel layout:**
```
┌────────────────┐
│  FILTER PANEL  │  ← Collapsible, above the card list
│  [Healthcare]  │
│  [Fintech] ... │
│  Geography: __ │
│  AI Toggle: ○  │
│  Min Score: ─●─│
│  [Apply (8)]   │
├────────────────┤
│  FEED LIST     │
│  Card 1        │
│  Card 2        │
│  ...           │
└────────────────┘
```

---

### 3f. Dashboard (S5)

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Layout | Full-width tab bar + card list | Tab bar + card list, max-width 600px centered | Same split view as Feed — list on left, detail on right |
| Tab bar | Horizontal scroll | Horizontal, all tabs visible (no scroll needed) | Horizontal, all tabs visible, within left panel |
| Compact cards | Full-width | Full-width within 600px | Full-width within 400px left panel |
| Card tap | Push to Deep Dive (full screen) | Push to Deep Dive (full screen) | Loads in right panel |
| Sectors tab | Collapsible sections, full width | Collapsible sections, within 600px | Collapsible sections, within left panel |
| Nav bar | Bottom nav | Bottom nav | Top nav |

---

## 4. Navigation Changes by Breakpoint

### Mobile & Tablet: Bottom Nav Bar
```
┌──────────────────────────────────┐
│  [Grid icon]    [Chart icon]     │
│   Feed           Dashboard       │
└──────────────────────────────────┘
```
- Fixed at bottom, 64px height
- 2 items: Feed + Dashboard
- As defined in specs 04 and 07

### Desktop: Top Nav Bar
```
┌──────────────────────────────────────────────────────┐
│  [Logo]  ProblemLens     Feed  Dashboard    [⚙ Filter] │
└──────────────────────────────────────────────────────┘
```
- Fixed at top, 56px height
- **Left zone**: Logo mark (24px) + "ProblemLens" text (18px, bold, white)
- **Center zone**: Nav links — "Feed" and "Dashboard" as text links
  - Active: White text, underline accent (2px, `--accent-primary`)
  - Inactive: `--text-dim`, no underline
  - Gap between links: 32px
- **Right zone**: Filter icon (toggles filter panel) + Bookmark icon (future) + Profile icon (future)
- **Background**: `--bg-base` with bottom border `--border-subtle`

---

## 5. Component Adaptations

### 5a. Feed Problem Card

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Type | Full-screen immersive | Full-screen immersive | Compact list card |
| Title font | 26px | 26px | 16px |
| Pain summary font | 15px | 15px | 13px |
| Sector badge font | 11px | 11px | 10px |
| Card padding | 28px | 32px | 16px |
| Card radius | 20px | 20px | 12px |
| Card height | ~80% viewport | ~80% viewport | Auto (~120px) |
| Opportunity score | Large pill | Large pill | Small pill |
| Metadata tags | 3 tags | 3 tags | 2 tags |

### 5b. Score Dashboard (Deep Dive)

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Grid layout | 2×2 | 2×2 (wider) | 4×1 horizontal row OR 2×2 |
| Score card padding | 16px | 20px | 16px |
| Score value size | 32px | 36px | 28px |
| Progress bar height | 4px | 4px | 4px |
| Opportunity bar padding | 20px | 24px | 20px |
| Opportunity value size | 36px | 40px | 32px |

### 5c. Filter Chips

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Chip height | 38px | 38px | 34px |
| Chip padding | 0 16px | 0 16px | 0 14px |
| Chip font | 13px | 13px | 12px |
| Grid gap | 10px | 10px | 8px |

### 5d. Bottom Nav / Top Nav

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Type | Bottom bar | Bottom bar | Top bar |
| Height | 64px | 64px | 56px |
| Items | Icon + label (vertical) | Icon + label (vertical) | Text links (horizontal) |
| Position | Fixed bottom | Fixed bottom | Fixed top |

### 5e. Dashboard Compact Card

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Width | Full (minus 40px padding) | Max 600px centered | Full width within 400px panel |
| Title font | 16px | 16px | 15px |
| Summary font | 13px | 13px | 12px |
| Card padding | 18px | 20px | 14px |
| Card gap (between) | 12px | 12px | 8px |
| Tags shown | 2 | 2–3 | 1–2 |

---

## 6. Touch vs Pointer Behavior

| Interaction | Mobile (Touch) | Desktop (Pointer) |
|-------------|---------------|-------------------|
| Card navigation (Feed) | Swipe up/down | Scroll list + click |
| Card detail | Tap → push | Click → load in right panel |
| Filter sheet | Swipe down to dismiss | Click "Close" button |
| Slider | Touch-drag thumb | Click-drag thumb |
| Toggle | Tap anywhere on row | Click anywhere on row |
| Chip select | Tap | Click |
| Hover states | None | Cards: bg shifts to `--bg-surface-hover`. Buttons: subtle brightness increase. Chips: border lightens. |
| Cursor | Default (finger) | Pointer on all interactive elements |
| Right-click | N/A | No custom context menus (default browser) |

---

## 7. Content Width & Padding Reference

| Breakpoint | Screen Width | Content Max-Width | Horizontal Padding | Effective Content Width |
|------------|-------------|-------------------|--------------------|-----------------------|
| Mobile (small) | 320px | None (full) | 20px × 2 | 280px |
| Mobile (standard) | 375px | None (full) | 20px × 2 | 335px |
| Mobile (large) | 428px | None (full) | 20px × 2 | 388px |
| Tablet | 768px | 600px | 32px × 2 | 536px |
| Desktop (left panel) | 400px fixed | None | 16px × 2 | 368px |
| Desktop (right panel) | Remaining | 680px | 32px × 2 | 616px |

---

## 8. Typography Scaling

Fonts stay mostly the same across breakpoints. Only a few key elements scale:

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Feed card title | 26px | 26px | 16px (compact list) |
| Deep dive title | 24px | 26px | 24px |
| Screen headers | 22px | 24px | 20px |
| Onboarding headlines | 26px | 28px | 28px |
| Body text | 15px | 15px | 15px |
| Captions / labels | 13px | 13px | 13px |
| Micro text | 11px | 11px | 11px |

**Rule**: Body text, captions, and micro text do NOT scale. Only display-level text (titles, headlines) may increase slightly on larger screens.

---

## 9. Image & Visual Scaling

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Splash logo | 64px | 80px | 96px |
| Onboarding visuals | 50% viewport height | 45% viewport height | 40% modal height |
| Empty state icon | 48px | 56px | 64px |
| Sector color dot (Dashboard) | 8px | 8px | 8px |
| Page indicator dots | 8px (active: 16×8 pill) | 10px (active: 20×10) | 8px (active: 16×8) |

---

## 10. Orientation Rules

| Device | Allowed Orientations |
|--------|---------------------|
| Mobile | **Portrait only** — lock to portrait. No landscape support. |
| Tablet | **Both** — portrait is primary. Landscape uses same layout but wider content column (max-width 680px). |
| Desktop | **Landscape only** — always landscape (natural state). |

**Tablet landscape specifics:**
- Content max-width increases from 600px to 680px
- Tab bar shows all 4 tabs without scrolling
- Onboarding visual zone shrinks to 35% viewport height (less vertical space)
- Everything else stays the same

---

## 11. Performance Considerations

| Concern | Rule |
|---------|------|
| Lazy loading | Only load problem cards that are in viewport + 2 cards ahead (Feed). Dashboard lists: load first 10, lazy-load rest on scroll. |
| Image loading | No images in MVP — text-and-data only. Future: lazy-load with skeleton placeholders. |
| Animation | On mobile: keep all animations. On desktop: animations are optional (respect `prefers-reduced-motion`). Score bar animations play on every load (not just first). |
| Font loading | Use `font-display: swap` for Inter and Outfit. Show system font immediately, swap when loaded. No FOIT (flash of invisible text). |
| Breakpoint detection | Use CSS media queries only. No JavaScript-based breakpoint detection for layout changes. JS only for interaction differences (swipe vs click). |

---

## What NOT to Do
- ❌ Do NOT design tablet as a completely different app — it's mobile with more space
- ❌ Do NOT use horizontal card carousels on any breakpoint — always vertical lists
- ❌ Do NOT show both bottom nav AND top nav simultaneously — one or the other per breakpoint
- ❌ Do NOT allow landscape on mobile — portrait lock only
- ❌ Do NOT add a sidebar navigation on tablet — tablet uses bottom nav like mobile
- ❌ Do NOT scale all font sizes up on tablet/desktop — only display text scales, body stays the same
- ❌ Do NOT make the desktop right panel scrollable independently from the left panel — both panels scroll independently (this is correct), but do NOT synchronize their scroll positions
- ❌ Do NOT hide the left panel on desktop when Deep Dive is open — both panels are always visible

---

## Deliverable Checklist
- [ ] Mobile frame: 375 × 812 (primary — already completed in specs 01–05)
- [ ] Mobile small frame: 320 × 568 (validate nothing breaks on smallest target)
- [ ] Tablet frame: 768 × 1024 — Feed, Deep Dive, Dashboard, Filters adapted
- [ ] Desktop frame: 1440 × 900 — Split view with left list + right detail
- [ ] Desktop top nav bar component
- [ ] Desktop filter panel (inline, not bottom sheet)
- [ ] Desktop active card indicator (left border accent)
- [ ] Tablet centered content column (600px max-width visible)
- [ ] All 4 breakpoint frames for at least the Feed + Deep Dive screens
- [ ] Dark mode only across all breakpoints

# Design System: ProblemLens

## Context for Figma AI
This document defines the **complete design system** for the Problem Intelligence Platform (ProblemLens). Every screen, component, and interaction in the app must draw from the tokens and patterns defined here. This is the single source of truth for visual consistency.

If a screen spec (01–05) references a color, font size, spacing value, or component — it should match what is defined in this document. If there is a conflict, this document wins.

---

## 1. Brand Identity

### App Name
**ProblemLens**

### Tagline
"Discover problems worth solving"

### Logo Mark
- A minimal, geometric abstract mark — a lens or compass-inspired shape
- Primary color: #00E676 on dark backgrounds
- Monochrome variant: #FFFFFF on dark, #0D0D1A on light
- Minimum size: 24px × 24px
- Clear space: Minimum 8px padding around all sides

### Brand Voice (Guides Copy Tone)
- Intelligent but not academic
- Direct but not aggressive
- Confident but not arrogant
- Think: a sharp mentor who respects your time

---

## 2. Color System

### 2a. Core Palette

#### Backgrounds (Dark Theme — Primary)

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--bg-base` | Base Background | #0D0D1A | Screen backgrounds, page canvas |
| `--bg-surface` | Elevated Surface | #1A1A2E | Cards, bottom sheets, modals |
| `--bg-surface-hover` | Surface Hover | #222240 | Card press/hover state |
| `--bg-surface-subtle` | Subtle Surface | #13132A | Footer containers, secondary panels |
| `--bg-overlay` | Overlay | rgba(0,0,0,0.55) | Behind bottom sheets, modals |

#### Text Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--text-primary` | Primary Text | #FFFFFF | Titles, headlines, important labels |
| `--text-secondary` | Secondary Text | #D0D0E0 | Body text, pain points, solutions |
| `--text-muted` | Muted Text | #A0A0B0 | Descriptions, summaries, subtexts |
| `--text-dim` | Dim Text | #808090 | Metadata tags, placeholders, hints |
| `--text-faint` | Faint Text | #606070 | Section labels, scale markers, timestamps |
| `--text-ghost` | Ghost Text | #505060 | Swipe hints, placeholders, disabled text |

#### Borders & Dividers

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--border-subtle` | Subtle Border | rgba(255,255,255,0.06) | Card borders, section dividers, nav borders |
| `--border-default` | Default Border | #333345 | Input fields, inactive chips, outlined tags |
| `--border-focus` | Focus Border | #00E676 | Input focus states, active selections |

#### Accent Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--accent-primary` | Primary Accent | #00E676 | CTAs, active toggles, primary scores, links |
| `--accent-primary-dark` | Accent Dark | #00C853 | Gradient end-point for buttons, score bars |
| `--accent-primary-glow` | Accent Glow | rgba(0,230,118,0.15) | Focus rings, subtle glows |
| `--accent-primary-shadow` | Accent Shadow | rgba(0,230,118,0.25) | Button shadows, CTA elevation |

#### Semantic Score Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--score-high` | High Score (8–10) | #00E676 | Green — strong signal |
| `--score-medium` | Medium Score (5–7) | #FFB300 | Amber — moderate signal |
| `--score-low` | Low Score (1–4) | #FF5252 | Red — weak signal |

#### UI Element Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--track-bg` | Progress Track BG | #2A2A3E | Slider tracks, progress bar backgrounds |
| `--toggle-off` | Toggle Off Track | #333345 | Inactive toggle switch track |
| `--toggle-on` | Toggle On Track | #00E676 | Active toggle switch track |
| `--dot-inactive` | Inactive Dot | #333345 | Page indicator dots, loading dots |
| `--dot-active` | Active Dot | #00E676 | Current page indicator |
| `--empty-icon` | Empty State Icon | #333345 | Empty state illustrations |

### 2b. Sector Color Map

Each sector has a unique accent color used for badges, chip active states, and sector headers.

| Sector | Accent Color | Hex | BG (15% opacity) |
|--------|-------------|-----|-------------------|
| Healthcare | Cyan | #26C6DA | rgba(38,198,218,0.15) |
| Fintech | Amber | #FFB300 | rgba(255,179,0,0.15) |
| Education | Purple | #7C4DFF | rgba(124,77,255,0.15) |
| Agriculture | Green | #66BB6A | rgba(102,187,106,0.15) |
| GovTech / Legal | Blue | #42A5F5 | rgba(66,165,245,0.15) |
| CleanTech | Teal | #26A69A | rgba(38,166,154,0.15) |
| Employment / EdTech | Pink | #EC407A | rgba(236,64,122,0.15) |
| Creator Economy | Orange | #FFA726 | rgba(255,167,38,0.15) |
| Retail | Amber | #FFB300 | rgba(255,179,0,0.15) |
| Rare Disease | Red | #EF5350 | rgba(239,83,80,0.15) |

---

## 3. Typography

### 3a. Font Family
- **Primary**: Inter (Google Fonts)
- **Display / Headlines**: Outfit (Google Fonts) — used for large titles and hero text where a slightly rounder, more modern feel is desired
- **Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Monospace** (for scores, data): JetBrains Mono or SF Mono — used sparingly for score values if a data-heavy look is desired

### 3b. Type Scale

| Token | Name | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|------|--------|-------------|----------------|-------|
| `--text-4xl` | Display | 36px | 700 | 1.2 | -0.5px | Opportunity score hero value |
| `--text-3xl` | Hero | 28px | 700 | 1.25 | -0.3px | Splash app name, CTA headlines |
| `--text-2xl` | Title Large | 26px | 700 | 1.3 | -0.2px | Onboarding headlines, feed card title |
| `--text-xl` | Title | 24px | 700 | 1.35 | 0 | Deep dive problem title |
| `--text-lg` | Title Small | 22px | 700 | 1.2 | 0 | Screen headers ("Filters", "Dashboard") |
| `--text-base` | Body Large | 16px | 600 | 1.35 | 0 | Compact card title, sector header name |
| `--text-sm` | Body | 15px | 400 | 1.5–1.6 | 0 | Pain summaries, solution text, subtexts |
| `--text-xs` | Caption Large | 14px | 500 | 1.4 | 0 | Reset button, score suffix (/10), nav labels |
| `--text-2xs` | Caption | 13px | 500–600 | 1.0–1.4 | 0–1px | Section labels, chip text, result counts |
| `--text-3xs` | Micro | 11px | 500–600 | 1.0 | 0.5–1px | Sector badges, metadata tags, score labels |
| `--text-4xs` | Nano | 10px | 500 | 1.0 | 0 | Bottom nav labels, compact card tags |

### 3c. Font Weight Reference

| Weight | Value | Name | Usage |
|--------|-------|------|-------|
| Regular | 400 | Regular | Body text, descriptions, subtexts |
| Medium | 500 | Medium | Tags, captions, secondary labels |
| Semi-Bold | 600 | Semi-Bold | Section headings, compact card titles, badges |
| Bold | 700 | Bold | Titles, headlines, scores, CTAs |

---

## 4. Spacing System

All spacing uses a **4px base unit**. Only these values are used throughout the app.

| Token | Value | Common Usage |
|-------|-------|-------------|
| `--space-1` | 4px | Micro gaps (icon-to-dot, dot gaps) |
| `--space-2` | 6px | Chip padding vertical, badge padding vertical |
| `--space-3` | 8px | Tag gaps, sector header to cards, small margins |
| `--space-4` | 10px | Chip gaps, icon-to-text gaps |
| `--space-5` | 12px | Card-to-card gap, score grid gaps, chip padding horizontal |
| `--space-6` | 14px | Section label to content, pain point item spacing |
| `--space-7` | 16px | Title to metadata, description gaps, tab bar to content |
| `--space-8` | 20px | Screen horizontal padding, header padding, drag handle to header |
| `--space-9` | 24px | Card internal padding, hero section top padding |
| `--space-10` | 28px | Section-to-section in filters, chip grid to next section |
| `--space-11` | 32px | Section-to-section in deep dive, slider to button |
| `--space-12` | 40px | Visual to headline (onboarding), CTA gaps, scroll bottom padding |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small tags, metadata chips |
| `--radius-md` | 8px | Sector badges, confidence pills |
| `--radius-lg` | 10px | Tab pills, filter chips |
| `--radius-xl` | 12px | Input fields, footer containers |
| `--radius-2xl` | 14px | Buttons, score cards, opportunity bar, toggle switch |
| `--radius-3xl` | 16px | Compact dashboard cards |
| `--radius-4xl` | 20px | Feed problem cards |
| `--radius-full` | 9999px | Circular elements (dots, thumbs, avatars) |

---

## 6. Elevation & Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-none` | none | Flat elements |
| `--shadow-sm` | 0 2px 8px rgba(0,0,0,0.2) | Small floating elements, tooltips |
| `--shadow-md` | 0 4px 16px rgba(0,0,0,0.25) | Buttons, score pills |
| `--shadow-lg` | 0 4px 24px rgba(0,0,0,0.3) | Feed cards, floating cards |
| `--shadow-glow` | 0 4px 20px rgba(0,230,118,0.25) | Primary CTA buttons |
| `--shadow-slider` | 0 2px 8px rgba(0,0,0,0.3) | Slider thumb |

---

## 7. Icon System

### Style
- **Type**: Outlined (stroke-based, not filled)
- **Stroke width**: 1.5px consistently
- **Default size**: 22px × 22px (nav, header actions)
- **Small size**: 16px × 16px (metadata tag icons, inline icons)
- **Micro size**: 12px × 12px (tag icons in metadata row)
- **Default color**: `--text-dim` (#808090)
- **Active color**: `--accent-primary` (#00E676) or `--text-primary` (#FFFFFF)

### Icon Inventory

| Icon | Usage | Screen(s) |
|------|-------|-----------|
| Sliders / Tune | Filter button | Feed |
| Chevron Left (←) | Back navigation | Deep Dive |
| Chevron Right (→) | Card tap hint, next arrow | Dashboard, Onboarding |
| Chevron Up (^) | Swipe up hint | Feed |
| Chevron Down (▼/▶) | Sector collapse/expand | Dashboard |
| Bookmark (outline) | Save problem (unsaved) | Deep Dive |
| Bookmark (filled) | Save problem (saved) | Deep Dive |
| Share / Export | Share problem | Deep Dive |
| Search / Magnifier | Search (future) | Dashboard |
| Grid / Cards | Feed nav icon | Bottom Nav |
| Bar Chart | Dashboard nav icon | Bottom Nav |
| Person (👤) | User type tag | Deep Dive |
| Pin / Location (📍) | Geography tag | Deep Dive, Filters |
| Repeat / Refresh (🔄) | Frequency tag | Deep Dive |
| Link (🔗) | Source tag | Deep Dive |
| Checkmark (✓) | Confidence tag | Deep Dive |
| Red dot / Warning (●) | Pain point bullet | Deep Dive |
| Green dot / Bulb (●) | Solution bullet | Deep Dive |

---

## 8. Component Library

### 8a. Buttons

#### Primary Button (CTA)
```
Width:        Full-width or fixed (context-dependent)
Height:       54px
Background:   Gradient --accent-primary → --accent-primary-dark
Border:       None
Radius:       --radius-2xl (14px)
Shadow:       --shadow-glow
Text:         --text-2xs to --text-base depending on context, 700 weight, white
```
**States:**
| State | Change |
|-------|--------|
| Default | As above |
| Pressed | scale(0.97), shadow reduces slightly |
| Disabled | opacity: 0.4, non-interactive |

#### Text Button (Secondary)
```
Background:   Transparent
Text:         --accent-primary or --text-dim
Weight:       500
Size:         13–14px
```
**States:** Underline on press, color unchanged.

### 8b. Sector Badge
```
Height:       Auto (content-driven)
Padding:      6px 12px
Background:   Sector color at 15% opacity
Border:       None
Radius:       --radius-md (8px)
Text:         Sector accent color, 11px, 600 weight, uppercase, letter-spacing 0.5px
```

### 8c. Score Pill
```
Height:       Auto
Padding:      4px 10px
Background:   Score-coded color (green/amber/red) — solid or at 15% opacity depending on context
Radius:       --radius-md (8px)
Text:         White or score color, 11–14px, 700 weight
```

### 8d. Metadata Tag (Outlined Chip)
```
Height:       Auto
Padding:      4px 8px (compact) or 6px 10px (regular)
Background:   Transparent
Border:       1px solid --border-default (#333345)
Radius:       --radius-sm (6px)
Text:         --text-dim (#808090), 10–11px, 500 weight
Icon:         12px, same color as text, 6px gap to text
```

### 8e. Filter Chip (Selectable)
```
Height:       38px
Padding:      0px 16px
Radius:       --radius-lg (10px)
Text:         13px, 500 weight
```
| State | Background | Border | Text Color |
|-------|-----------|--------|------------|
| Inactive | Transparent | 1px solid #333345 | #808090 |
| Active | Sector color at 15% | 1px solid sector color | Sector accent |

### 8f. Score Card (Dashboard Grid)
```
Background:   --bg-surface (#1A1A2E)
Border:       1px solid --border-subtle
Radius:       --radius-2xl (14px)
Padding:      16px
Layout:       Vertical — label, value, progress bar
```
- Label: 11px, 500, `--text-dim`, uppercase
- Value: 32px, 700, `--text-primary`
- Suffix: 16px, 400, `--text-faint`
- Progress bar: 4px height, `--track-bg` background, score-colored fill, `--radius-full` on both track and fill

### 8g. Opportunity Bar (Full-Width Hero Score)
```
Background:   Gradient --accent-primary → --accent-primary-dark (high) or amber gradient (medium)
Radius:       --radius-2xl (14px)
Padding:      20px
Layout:       Flex row, space-between
```
- Left: "OPPORTUNITY SCORE" — 11px, 600, white at 80%
- Right: Score value — 36px, 700, white

### 8h. Input Field
```
Width:        100%
Height:       48px
Background:   --bg-surface (#1A1A2E)
Border:       1px solid --border-default (#333345)
Radius:       --radius-xl (12px)
Padding:      0px 16px
Text:         15px, 400, --text-primary
Placeholder:  15px, 400, --text-ghost (#505060)
Icon (left):  16px, --text-faint, 10px margin-right
```
**Focus state:** Border → `--border-focus` (#00E676), glow: 0 0 0 2px `--accent-primary-glow`

### 8i. Toggle Switch
```
Track Width:   50px
Track Height:  28px
Track Radius:  --radius-2xl (14px)
Thumb Size:    24px circle
Thumb Color:   #FFFFFF
Thumb Shadow:  --shadow-sm
```
| State | Track Color |
|-------|------------|
| Off | --toggle-off (#333345) |
| On | --toggle-on (#00E676) |

Transition: Thumb slides + track color fades over 200ms, ease-in-out.

### 8j. Slider
```
Track Height:   4px
Track BG:       --track-bg (#2A2A3E)
Track Fill:     Gradient --accent-primary → --accent-primary-dark
Track Radius:   --radius-full
Thumb Size:     24px circle
Thumb BG:       #FFFFFF
Thumb Border:   2px solid --accent-primary
Thumb Shadow:   --shadow-slider
```
- Value bubble: `--accent-primary` bg, 8px radius, 4px 10px padding, 13px bold white text, caret pointing down

### 8k. Bottom Navigation Item
```
Layout:        Vertical — icon (22px) + label (10px) + optional dot (4px)
Gap:           4px between each
```
| State | Icon/Label Color |
|-------|-----------------|
| Inactive | --text-faint (#606070) |
| Active | --accent-primary (#00E676) + dot below |

---

## 9. Motion & Animation

### 9a. Timing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 100ms | Press feedback, color transitions |
| `--duration-normal` | 200ms | Toggle, chip select, chevron rotate |
| `--duration-smooth` | 300ms | Screen transitions, sheet entry/exit, card swipe |
| `--duration-slow` | 600ms | Score bar fill animation |

### 9b. Easing Curves

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | cubic-bezier(0.0, 0.0, 0.2, 1) | Entrances, slides in |
| `--ease-in` | cubic-bezier(0.4, 0.0, 1, 1) | Exits, slides out |
| `--ease-standard` | cubic-bezier(0.4, 0.0, 0.2, 1) | General transitions |
| `--ease-bounce` | cubic-bezier(0.34, 1.56, 0.64, 1) | Playful micro-interactions (optional) |

### 9c. Standard Animations

| Animation | Duration | Easing | Description |
|-----------|----------|--------|-------------|
| Button press | 150ms | ease-standard | scale(1) → scale(0.97) → scale(1) |
| Chip toggle | 150ms | ease-standard | scale(1) → scale(1.05) → scale(1) + color change |
| Card press | 100ms | ease-standard | bg-surface → bg-surface-hover |
| Screen slide (push) | 300ms | ease-out | translateX(100%) → translateX(0) |
| Screen slide (pop) | 250ms | ease-in | translateX(0) → translateX(100%) |
| Bottom sheet enter | 300ms | ease-out | translateY(100%) → translateY(0) + overlay fade in |
| Bottom sheet exit | 250ms | ease-in | translateY(0) → translateY(100%) + overlay fade out |
| Score bar fill | 600ms | ease-out | width(0%) → width(final%), staggered 100ms between bars |
| Fade in | 300ms | ease-out | opacity(0) → opacity(1) |
| Fade out | 250ms | ease-in | opacity(1) → opacity(0) |
| Chevron rotate | 200ms | ease-standard | rotate(0deg) → rotate(90deg) or reverse |
| Toggle slide | 200ms | ease-in-out | thumb left ↔ right + track color fade |
| Page dot morph | 200ms | ease-standard | circle(8px) → pill(16px×8px) or reverse |
| Bookmark toggle | 200ms | ease-bounce | scale(1) → scale(1.2) → scale(1) + outline ↔ filled |

---

## 10. Responsive Breakpoints

| Breakpoint | Name | Width | Layout Behavior |
|------------|------|-------|-----------------|
| Mobile | `--bp-mobile` | < 768px | Default. Single column. Full-screen cards. Bottom nav. |
| Tablet | `--bp-tablet` | 768–1024px | Wider cards, more metadata visible. Content max-width 600px centered. |
| Desktop | `--bp-desktop` | > 1024px | Split view: feed/list on left (40%), deep dive on right (60%). Top nav replaces bottom nav. |

---

## 11. Accessibility Minimums

| Guideline | Requirement |
|-----------|------------|
| Color contrast | All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text) against `--bg-base` |
| Tap targets | Minimum 44px × 44px for all interactive elements |
| Focus indicators | All interactive elements show `--border-focus` ring on keyboard focus |
| Motion | Respect `prefers-reduced-motion` — disable animations, show final states instantly |
| Text scaling | Support up to 200% system font scaling without layout breaking |
| Color independence | Never use color alone to convey meaning — always pair with text, icons, or patterns |

---

## 12. Design Tokens — Quick Reference Sheet

```
BACKGROUNDS
  base:           #0D0D1A
  surface:        #1A1A2E
  surface-hover:  #222240
  surface-subtle: #13132A
  overlay:        rgba(0,0,0,0.55)

TEXT
  primary:        #FFFFFF
  secondary:      #D0D0E0
  muted:          #A0A0B0
  dim:            #808090
  faint:          #606070
  ghost:          #505060

BORDERS
  subtle:         rgba(255,255,255,0.06)
  default:        #333345
  focus:          #00E676

ACCENT
  primary:        #00E676
  primary-dark:   #00C853
  glow:           rgba(0,230,118,0.15)
  shadow:         rgba(0,230,118,0.25)

SCORES
  high:           #00E676
  medium:         #FFB300
  low:            #FF5252

UI
  track-bg:       #2A2A3E
  toggle-off:     #333345
  toggle-on:      #00E676
  dot-inactive:   #333345
  dot-active:     #00E676

SPACING (4px base)
  4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40

RADIUS
  6, 8, 10, 12, 14, 16, 20, 9999

FONT SIZES
  10, 11, 13, 14, 15, 16, 22, 24, 26, 28, 36

FONT WEIGHTS
  400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)

DURATIONS
  100ms, 150ms, 200ms, 250ms, 300ms, 600ms
```

---

## Deliverable Checklist
- [ ] Figma color styles matching all tokens above (backgrounds, text, borders, accents, scores, sectors, UI)
- [ ] Figma text styles for all 11 type scale entries
- [ ] Component variants for: Button (primary, disabled), Sector Badge (per sector), Score Pill (high, medium, low), Metadata Tag, Filter Chip (active, inactive per sector), Score Card, Opportunity Bar, Input Field (default, focus), Toggle (on, off), Slider (with value bubble), Bottom Nav Item (active, inactive)
- [ ] Spacing guidelines documented in Figma with auto-layout settings
- [ ] Icon set (outlined, 1.5px stroke) with all icons listed in section 7
- [ ] Motion specs documented as component descriptions or in a separate "Motion" page
- [ ] Responsive frame examples: Mobile (375px), Tablet (768px), Desktop (1280px)

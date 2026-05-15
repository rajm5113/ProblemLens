# Navigation & Flow

## Context for Figma AI
This document defines **how every screen connects to every other screen** in the Problem Intelligence Platform (ProblemLens). It is the map of the entire app. Use this when building the Figma prototype — every tap, swipe, and transition described here should be wired as a prototype interaction.

This is NOT about what screens look like (that's specs 01–05) or what design tokens to use (that's spec 06). This is purely about **movement between screens, navigation patterns, and information architecture**.

---

## 1. Screen Inventory

The app has **7 distinct screen states** that a user can be in:

| ID | Screen | Type | Entry Point |
|----|--------|------|-------------|
| S0 | Splash | Transient | App launch |
| S1 | Onboarding (Slides 1–4) | Transient | After splash (first launch only) |
| S2 | Feed | Primary destination | After onboarding / bottom nav |
| S3 | Deep Dive | Detail view | Tap problem card (from Feed or Dashboard) |
| S4 | Filters | Overlay | Tap filter icon (from Feed) |
| S5 | Dashboard | Primary destination | Bottom nav |
| S6 | Empty State | Conditional | Shown within Feed or Dashboard when no results |

**Transient screens** (S0, S1) are shown once and never returned to during normal usage.
**Primary destinations** (S2, S5) are the main tabs of the app, accessible via the bottom nav bar.
**Detail/Overlay screens** (S3, S4) are opened on top of a destination and dismissed back to it.

---

## 2. Complete Navigation Map

```
                    ┌─────────────┐
                    │   S0: Splash │
                    └──────┬──────┘
                           │ auto (2s)
                           ▼
                    ┌─────────────┐
                    │ S1: Onboard  │
                    │ (first only) │
                    └──────┬──────┘
                           │ "Start" / "Skip"
                           ▼
          ┌────────────────────────────────────┐
          │                                    │
          │        BOTTOM NAV BAR              │
          │    ┌──────────┬──────────┐         │
          │    │  S2:Feed │S5:Dash   │         │
          │    │ (active) │(inactive)│         │
          │    └────┬─────┴────┬─────┘         │
          │         │          │               │
          └─────────┼──────────┼───────────────┘
                    │          │
         ┌──────────┴──┐  ┌───┴──────────┐
         │  S2: FEED   │  │ S5: DASHBOARD │
         │             │  │              │
         │ [filter ⚙]──┼──┼─→ S4: Filter │
         │             │  │   (overlay)  │
         │ [tap card]──┼──┼─→ S3: Detail │
         │             │  │   (push)     │
         └─────────────┘  │              │
                          │ [tap card]───┼─→ S3: Detail
                          │              │   (push)
                          └──────────────┘
```

---

## 3. Navigation Patterns Used

The app uses **4 distinct navigation patterns**. Each serves a specific purpose.

### Pattern 1: Auto-Transition (Splash Only)
- **Used for**: S0 → S1
- **Trigger**: Timer (2 seconds)
- **Animation**: Fade out splash (300ms) → Fade in onboarding (300ms)
- **User control**: None — this is automatic
- **Returns to**: Never

### Pattern 2: Bottom Tab Navigation
- **Used for**: S2 ↔ S5
- **Trigger**: Tap bottom nav item
- **Animation**: Crossfade (200ms, ease-standard) — no slide, just content swap
- **User control**: Tap the inactive tab to switch
- **State preservation**: Each tab remembers its scroll position. Switching back restores where the user left off.
- **Active indicator**: Green icon + label + dot on active tab

### Pattern 3: Push Navigation (Screen Stack)
- **Used for**: S2 → S3, S5 → S3
- **Trigger**: Tap a problem card
- **Animation**: New screen slides in from the right (300ms, ease-out)
- **Return**: Back arrow (←) on S3 — screen slides out to the right (250ms, ease-in), revealing the previous screen underneath
- **Stack behavior**: Only 1 level deep. Feed/Dashboard → Deep Dive. No deeper nesting.
- **Swipe-to-go-back**: User can swipe from the left edge of S3 to go back (same as back arrow behavior)

### Pattern 4: Overlay / Bottom Sheet
- **Used for**: S2 → S4
- **Trigger**: Tap filter icon on Feed
- **Animation**: Sheet slides up from bottom (300ms, ease-out), dimmed overlay fades in
- **Return — Apply**: Tap "Apply Filters" — sheet slides down (250ms, ease-in), overlay fades out, Feed updates with filtered results
- **Return — Dismiss**: Swipe sheet down past 30% threshold, OR tap the dimmed overlay area
- **State**: Filter selections are preserved between opens. Only reset when "Reset" is explicitly tapped.

---

## 4. Flow-by-Flow Breakdown

### Flow A: First Launch (New User)
```
S0 (Splash)
  │ auto 2s
  ▼
S1 (Onboarding Slide 1)
  │ swipe left
  ▼
S1 (Onboarding Slide 2)
  │ swipe left
  ▼
S1 (Onboarding Slide 3)
  │ swipe left
  ▼
S1 (Onboarding Slide 4 — CTA)
  │ tap "Start Discovering"
  ▼
S2 (Feed) ← user lands here, bottom nav visible
```

**Shortcut**: User can tap "Skip" on any slide (1–3) to jump directly to S2.

**After first launch**: S0 and S1 are never shown again. App opens directly to S2 on subsequent launches.

---

### Flow B: Returning User (App Open)
```
S2 (Feed) ← app opens directly here
```

No splash, no onboarding. Straight to the Feed with the latest problems.

---

### Flow C: Feed → Deep Dive → Back
```
S2 (Feed)
  │ tap problem card
  ▼
S3 (Deep Dive) ← slides in from right
  │ tap back arrow (←) OR swipe from left edge
  ▼
S2 (Feed) ← restored at same scroll/card position
```

**Key detail**: When returning from S3 to S2, the Feed should be in the exact same state — same card visible, same scroll position. The user should not lose their place.

---

### Flow D: Feed → Filters → Apply → Feed
```
S2 (Feed)
  │ tap filter icon (⚙)
  ▼
S4 (Filters) ← slides up as bottom sheet
  │ user adjusts: selects "Healthcare", sets Min Opportunity to 8
  │ result count updates live: "(3 problems)"
  │ tap "Apply Filters"
  ▼
S2 (Feed) ← now showing only filtered results (3 cards)
  │ filter icon now shows active indicator (dot)
```

**Dismiss without applying**: If user swipes the sheet down or taps the overlay, the sheet closes and NO filter changes are applied. The Feed stays as it was.

**Filter persistence**: Applied filters persist across tab switches. If the user goes to Dashboard and comes back to Feed, the filters are still active.

**Clear filters**: User re-opens Filters sheet and taps "Reset" → all filters clear → taps "Apply" → Feed shows all problems again. Filter icon dot disappears.

---

### Flow E: Feed → Dashboard → Deep Dive → Back
```
S2 (Feed)
  │ tap "Dashboard" in bottom nav
  ▼
S5 (Dashboard — Trending tab active)
  │ tap a compact problem card
  ▼
S3 (Deep Dive) ← slides in from right
  │ tap back arrow (←)
  ▼
S5 (Dashboard) ← restored at same tab and scroll position
```

**Key detail**: The back arrow on S3 always returns to the **screen that opened it** — either S2 or S5. It does NOT always go to Feed.

---

### Flow F: Dashboard Tab Switching
```
S5 (Dashboard — Trending tab)
  │ tap "High Opportunity" tab
  ▼
S5 (Dashboard — High Opportunity tab) ← content crossfades, no slide
  │ tap "AI-Solvable" tab
  ▼
S5 (Dashboard — AI-Solvable tab) ← content crossfades
  │ tap "Sectors" tab
  ▼
S5 (Dashboard — Sectors tab) ← content crossfades, grouped layout
```

**Tab state**: Each tab remembers its scroll position independently. Switching back restores it.

---

### Flow G: Empty State Encounters
```
S2 (Feed)
  │ tap filter icon
  ▼
S4 (Filters)
  │ select "Agriculture" + set Min Opportunity to 10
  │ result count shows "(0 problems)"
  │ Apply button disabled, shows "No problems match"
  │ user taps "Apply" anyway (or the button is non-tappable)
  ▼
S2 (Feed — Empty State)
  │ shows empty state: icon + "No problems match your filters" + "Try adjusting your filters" link
  │ tap "Adjust filters" link
  ▼
S4 (Filters) ← re-opens so user can change filters
```

**Dashboard empty state**: If a dashboard tab has zero problems (unlikely with seed data), show the tab-specific empty state within the tab content area. Bottom nav and tabs remain visible.

---

## 5. Transition Reference Table

Every possible transition in the app, in one table:

| From | To | Trigger | Animation | Duration | Easing |
|------|----|---------|-----------|----------|--------|
| S0 | S1 | Auto (2s timer) | Fade out → Fade in | 300ms + 300ms | ease-out |
| S1 | S1 (next slide) | Swipe left | Smart animate / slide left | 300ms | ease-out |
| S1 | S1 (prev slide) | Swipe right | Smart animate / slide right | 300ms | ease-out |
| S1 | S2 | Tap "Start" or "Skip" | Fade out → Fade in | 300ms | ease-out |
| S2 | S3 | Tap card | Push right (slide in from right) | 300ms | ease-out |
| S3 | S2 | Tap back / swipe left edge | Pop left (slide out to right) | 250ms | ease-in |
| S2 | S4 | Tap filter icon | Sheet slides up + overlay fades in | 300ms | ease-out |
| S4 | S2 | Tap Apply / swipe down / tap overlay | Sheet slides down + overlay fades out | 250ms | ease-in |
| S2 | S5 | Tap Dashboard nav | Crossfade | 200ms | ease-standard |
| S5 | S2 | Tap Feed nav | Crossfade | 200ms | ease-standard |
| S5 | S3 | Tap compact card | Push right (slide in from right) | 300ms | ease-out |
| S3 | S5 | Tap back (if from Dashboard) | Pop left (slide out to right) | 250ms | ease-in |
| S5 tab | S5 tab | Tap different tab | Content crossfade | 150ms | ease-standard |

---

## 6. Bottom Nav Bar Visibility Rules

The bottom nav bar is NOT shown on every screen. Here are the exact rules:

| Screen | Bottom Nav Visible? | Reason |
|--------|-------------------|--------|
| S0 (Splash) | ❌ No | Transient screen, immersive |
| S1 (Onboarding) | ❌ No | Transient screen, immersive |
| S2 (Feed) | ✅ Yes | Primary destination |
| S3 (Deep Dive) | ❌ No | Detail view, full immersion |
| S4 (Filters) | ❌ No | Overlay on top of Feed |
| S5 (Dashboard) | ✅ Yes | Primary destination |
| S6 (Empty State) | ✅ Yes (within S2/S5) | Part of the primary destination |

---

## 7. Back Navigation Rules

What happens when the user presses the system back button (Android) or swipes from the left edge (iOS)?

| Current Screen | Back Action | Result |
|---------------|-------------|--------|
| S0 (Splash) | N/A | Nothing (auto-transitions) |
| S1 (Onboarding) | Previous slide or exit app | Swipe right → previous slide. On slide 1 → exit app. |
| S2 (Feed) | Exit app | Standard app exit behavior |
| S3 (Deep Dive) | Go to parent | Return to whichever screen opened it (S2 or S5) |
| S4 (Filters) | Dismiss without applying | Close sheet, no filter changes applied |
| S5 (Dashboard) | Switch to Feed | Go to S2 (Feed is the "home" tab) |

---

## 8. State Preservation Rules

What state is remembered when navigating away and back?

| Screen | State Preserved? | What Is Preserved |
|--------|-----------------|-------------------|
| S2 (Feed) | ✅ Yes | Current card position, applied filters, scroll offset |
| S3 (Deep Dive) | ❌ No | Scroll resets to top on each open (always show hero first) |
| S4 (Filters) | ✅ Yes | All filter selections persist between opens (until Reset) |
| S5 (Dashboard) | ✅ Yes | Active tab, scroll position per tab |

---

## 9. Deep Link Entry Points (Future)

These are direct URLs or deep links that can open the app to a specific state. Not for MVP, but the navigation architecture should not block them.

| Deep Link | Destination |
|-----------|-------------|
| `/` | S2 (Feed) |
| `/problem/:id` | S3 (Deep Dive for specific problem) |
| `/dashboard` | S5 (Dashboard) |
| `/dashboard/trending` | S5 with Trending tab active |
| `/dashboard/ai-solvable` | S5 with AI-Solvable tab active |

---

## 10. Edge Cases & Error States

| Scenario | Behavior |
|----------|----------|
| User rapidly taps multiple cards | Only the first tap registers. Ignore subsequent taps during transition. |
| User swipes back during a push transition | Allow interruption. Reverse the animation smoothly. |
| Network error loading Feed | Show error state on S2: "Something went wrong" + "Retry" button. Bottom nav stays visible. |
| Network error loading Deep Dive | Show error state on S3: "Couldn't load problem details" + "Go back" button. |
| User rotates device | App stays portrait-locked on mobile. On tablet, allow landscape with adapted layout. |
| Filter returns 0 results | S2 shows empty state. Filter icon still shows active dot. |
| User force-quits during onboarding | On next launch, restart from S0 → S1 (onboarding not marked complete). |
| User completes onboarding | Flag stored locally. S0/S1 never shown again on this device. |

---

## 11. Figma Prototype Wiring Checklist

Use this checklist when wiring the Figma prototype:

### Splash & Onboarding
- [ ] S0 → S1 (Slide 1): After delay 2000ms, fade transition
- [ ] S1 Slide 1 → Slide 2: Swipe left, smart animate
- [ ] S1 Slide 2 → Slide 3: Swipe left, smart animate
- [ ] S1 Slide 3 → Slide 4: Swipe left, smart animate
- [ ] S1 Slide 2 → Slide 1: Swipe right, smart animate
- [ ] S1 Slide 3 → Slide 2: Swipe right, smart animate
- [ ] S1 "Skip" (any slide) → S2: Tap, dissolve
- [ ] S1 Slide 4 "Start Discovering" → S2: Tap, dissolve

### Feed
- [ ] S2 Feed card swipe up → next card: Swipe up, smart animate
- [ ] S2 Feed card swipe down → prev card: Swipe down, smart animate
- [ ] S2 Feed card tap → S3: Tap, slide in from right
- [ ] S2 Filter icon tap → S4: Tap, slide up (overlay)

### Deep Dive
- [ ] S3 Back arrow tap → S2 or S5: Tap, slide out to right
- [ ] S3 Bookmark tap → toggle state: Tap, component swap
- [ ] S3 Share tap → no prototype action (just show tap feedback)

### Filters
- [ ] S4 Chip tap → toggle active/inactive: Tap, component swap
- [ ] S4 Toggle tap → switch on/off: Tap, smart animate
- [ ] S4 "Apply Filters" tap → S2: Tap, slide down
- [ ] S4 Overlay area tap → S2: Tap, slide down (dismiss without applying)
- [ ] S4 "Reset" tap → reset all controls: Tap, component swap to defaults

### Bottom Nav
- [ ] S2 "Dashboard" nav tap → S5: Tap, dissolve
- [ ] S5 "Feed" nav tap → S2: Tap, dissolve

### Dashboard
- [ ] S5 Tab tap → switch content: Tap, dissolve (content area only)
- [ ] S5 Compact card tap → S3: Tap, slide in from right
- [ ] S5 Sector header tap → collapse/expand: Tap, smart animate

---

## What NOT to Do
- ❌ Do NOT use slide transitions for tab switching — use crossfade/dissolve only
- ❌ Do NOT allow S3 (Deep Dive) to open another S3 — only one level of detail
- ❌ Do NOT show bottom nav during onboarding, deep dive, or filters
- ❌ Do NOT lose Feed card position when returning from Deep Dive or Filters
- ❌ Do NOT auto-dismiss the filter sheet — only dismiss on explicit user action
- ❌ Do NOT mix push and modal navigation — cards always push, filters always overlay
- ❌ Do NOT create circular navigation loops (e.g., Deep Dive → another Deep Dive)

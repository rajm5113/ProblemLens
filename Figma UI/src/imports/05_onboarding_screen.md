# Screen 5: Onboarding & Splash

## Context for Figma AI
You are designing the **first-time user experience** for the Problem Intelligence Platform — an app that presents real-world problems as structured startup opportunities. This is the very first thing a new user sees when they open the app. It must accomplish three goals in under 15 seconds:

1. **Communicate what this app does** — in one glance, not a paragraph
2. **Make the user feel excited** — this is not a boring tool, it is an intelligence engine
3. **Get them into the Feed as fast as possible** — minimal friction, no sign-up walls

Think of this as the **movie trailer** for the product. Short, punchy, visually striking, and it leaves you wanting more.

---

## Screen Purpose
Convert a curious first-time visitor into an engaged user who understands the product's value before they even see their first problem card.

After onboarding, the user should think:
- "This app finds real-world problems for me."
- "It scores and ranks them."
- "I can find startup ideas here."
- "Let me start browsing."

---

## Platform
- **Primary**: Mobile (375 × 812px — iPhone 13/14 viewport)
- **Behavior**: Horizontal swipe between 3 slides + final CTA slide

---

## Flow Architecture

The onboarding is a **4-step horizontal carousel**. Three content slides followed by a final action slide. A splash screen appears briefly before the onboarding starts.

```
[Splash] → [Slide 1] → [Slide 2] → [Slide 3] → [Slide 4: CTA]
              ←  horizontal swipe  →
```

The user can:
- Swipe left/right between slides
- Tap "Skip" to jump directly to the Feed
- Tap "Get Started" on the final slide to enter the Feed

---

## Component Breakdown

### 0. Splash Screen (Pre-Onboarding)

Appears for **2 seconds** when the app is first launched, then auto-transitions to Slide 1.

- **Background**: Solid #0D0D1A (deep navy/black)
- **Center content** (vertically and horizontally centered):
  - **App Icon / Logo Mark**: A minimal, geometric logo representing "problem discovery." Design a simple abstract mark — think a compass needle, a lens, or intersecting signal waves. Size: 64px × 64px. Color: #00E676 (accent green).
  - **Below logo (12px gap)**: App name "ProblemLens" in 28px, bold (700), white (#FFFFFF), letter-spacing 0.5px
  - **Below name (8px gap)**: Tagline "Discover problems worth solving" in 14px, regular (400), #808090

- **Bottom of screen**: Subtle animated loading indicator — three small dots pulsing in sequence (each dot 6px, color #333345, pulse to #606070). Centered horizontally, 60px from bottom.

- **Transition to Slide 1**: After 2 seconds, the splash fades out (300ms) and Slide 1 fades in (300ms).

---

### 1. Slide 1 — "Real Problems, Real People"

**Core message**: The app collects real-world problems from real sources — not random ideas.

#### Layout (Top to Bottom)

**Top Zone (50% of viewport) — Visual**
- **Background**: Full-width abstract illustration or graphic
- **Visual concept**: A network of scattered, glowing signal dots (representing Reddit posts, research papers, government reports, news) converging into a single focused point of light in the center. The dots are multi-colored (sector colors: cyan, amber, purple, green) on the dark background, with faint connecting lines between nearby dots.
- **Style**: Abstract, minimal, geometric. NOT a cartoon character or stock illustration. Think data visualization art — elegant, intelligent, slightly futuristic.
- **Implementation note for Figma AI**: Generate an abstract pattern of scattered colored dots (8–12 dots in sector colors) converging toward a central bright green point (#00E676). Use subtle connecting lines (1px, rgba(255,255,255,0.08)). Background: radial gradient from #0D0D1A center to #0A0A14 edges.

**Bottom Zone (50% of viewport) — Text + Controls**
- **Horizontal padding**: 28px
- **Headline**: "Real Problems, Real People" in 26px, bold (700), white, centered
- **Top margin from visual**: 40px
- **Subtext**: "We collect pain points from forums, research, government reports, and communities — problems that real people actually face." in 15px, regular (400), #A0A0B0, centered, line-height 1.6, max 3 lines
- **Top margin from headline**: 14px

---

### 2. Slide 2 — "Structured & Scored"

**Core message**: Every problem is turned into a structured intelligence card with scores.

#### Layout

**Top Zone (50%) — Visual**
- **Visual concept**: A stylized Problem Intelligence Card floating in space with a subtle tilt (3D perspective). The card should look like a dark UI card (#1A1A2E background) with visible elements:
  - A sector badge pill at the top ("HEALTHCARE" in cyan)
  - A title line (use a couple of white horizontal bars to represent text)
  - A row of 4 small score bars at different fill levels (colored green/amber)
  - An opportunity score "9/10" prominently visible
- **Style**: The card should have a subtle glow/shadow around it (#00E676 at 5% opacity, spread 20px). It should feel like a floating holographic card. Slight rotation (rotateY -5deg, rotateX 3deg) for depth.
- **Behind the card**: 2–3 more cards stacked behind it, progressively more faded and offset, suggesting depth and volume ("there are many problems to discover").

**Bottom Zone (50%) — Text + Controls**
- **Headline**: "Structured & Scored" in 26px, bold, white, centered
- **Subtext**: "Every problem is analyzed, classified by sector, and scored on severity, market potential, AI feasibility, and opportunity." in 15px, regular, #A0A0B0, centered, line-height 1.6
- **Top margins**: Same as Slide 1

---

### 3. Slide 3 — "Find What's Worth Building"

**Core message**: Use the platform to discover startup-worthy opportunities.

#### Layout

**Top Zone (50%) — Visual**
- **Visual concept**: A simplified Feed screen mockup showing the problem swipe interface. Display a card mid-swipe — one card sliding up and fading out while the next card is sliding in from below. Include the sector badge and opportunity score visible on the incoming card.
- **Style**: Render it as a floating phone-screen frame (just the screen area, no phone hardware chrome) with rounded corners, subtle shadow, on the dark background. The mockup should be ~60% scale, centered. Apply a subtle glow on the edges.
- **Content in the mockup**: Use PIP-002 (ASHA workers) card data — "HEALTHCARE" badge, "9/10" score, the title text partially visible.

**Bottom Zone (50%) — Text + Controls**
- **Headline**: "Find What's Worth Building" in 26px, bold, white, centered
- **Subtext**: "Swipe through problems like news. Tap to dive deep. Filter by sector, geography, and AI-solvability." in 15px, regular, #A0A0B0, centered, line-height 1.6
- **Top margins**: Same as Slide 1

---

### 4. Slide 4 — CTA (Final Slide)

**Core message**: You're ready — start discovering.

#### Layout

This slide is **different from slides 1–3**. It has no illustration at the top. Instead, the content is vertically centered on the full screen for maximum impact.

**Content (vertically centered, horizontally centered):**

- **Large icon**: The same app logo mark from the Splash screen, but larger — 80px × 80px, color #00E676
- **Below (20px gap)**: "Ready to discover?" in 28px, bold (700), white, centered
- **Below (12px gap)**: "Real problems. Real scores. Real opportunity." in 15px, regular (400), #A0A0B0, centered
- **Below (40px gap)**: Primary CTA button

**CTA Button:**
- **Width**: 280px (centered)
- **Height**: 56px
- **Background**: Gradient #00E676 → #00C853
- **Border-radius**: 14px
- **Shadow**: 0 4px 20px rgba(0,230,118,0.3)
- **Text**: "Start Discovering" in 17px, bold (700), white, centered
- **Tap animation**: Scale 1.0 → 0.96 → 1.0 over 150ms, then navigate to Feed

**Below button (16px gap):**
- Secondary text link: "I'll explore on my own" in 13px, medium (500), #808090, centered, underline on tap. Also navigates to Feed.

---

### 5. Persistent Onboarding Controls (Present on Slides 1–3)

These elements appear on slides 1, 2, and 3 but NOT on the Splash or Slide 4 (CTA).

#### 5a. Page Indicator Dots
- **Position**: Centered horizontally, 100px from the bottom of the viewport
- **Layout**: Horizontal row of 4 dots, gap 10px
- **Dot size**: 8px circles
- **Active dot**: #00E676, slightly larger (10px) or elongated (16px × 8px pill shape)
- **Inactive dots**: #333345

#### 5b. Skip Button
- **Position**: Top-right corner, 20px from right, 56px from top (aligned with status bar area)
- **Text**: "Skip" in 14px, medium (500), #808090
- **Tap behavior**: Immediately navigates to the Feed screen, skipping all remaining slides
- **No background**: Just text, no button chrome

#### 5c. Next Arrow (Optional)
- **Position**: Bottom-right, 28px from right, aligned with page dots vertically
- **Icon**: Right-pointing arrow (→) in 20px, #FFFFFF
- **Tap behavior**: Advances to the next slide
- **On Slide 3**: The arrow is replaced with nothing (the next swipe leads to the CTA slide which has its own button)

---

## Color System

| Element | Color | Hex |
|---------|-------|-----|
| Background (all slides) | Deep navy/black | #0D0D1A |
| Logo Mark | Accent green | #00E676 |
| App Name Text | White | #FFFFFF |
| Tagline Text | Muted | #808090 |
| Headline Text | White | #FFFFFF |
| Subtext | Light grey | #A0A0B0 |
| Dot — Active | Green | #00E676 |
| Dot — Inactive | Dark grey | #333345 |
| Skip Text | Muted | #808090 |
| CTA Button BG | Green gradient | #00E676 → #00C853 |
| CTA Button Shadow | Green glow | rgba(0,230,118,0.3) |
| CTA Button Text | White | #FFFFFF |
| Secondary Link | Muted | #808090 |
| Splash Loading Dots | Dim → medium | #333345 → #606070 |
| Visual Signal Dots | Sector colors | Cyan, Amber, Purple, Green |
| Card Glow (Slide 2) | Green at 5% | rgba(0,230,118,0.05) |

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| App Name (Splash) | Inter or Outfit | 28px | 700 | 1.2 |
| Splash Tagline | Inter | 14px | 400 | 1.4 |
| Slide Headline | Inter or Outfit | 26px | 700 | 1.3 |
| Slide Subtext | Inter | 15px | 400 | 1.6 |
| Skip Button | Inter | 14px | 500 | 1.0 |
| CTA "Ready to discover?" | Inter or Outfit | 28px | 700 | 1.3 |
| CTA Subtext | Inter | 15px | 400 | 1.4 |
| CTA Button Text | Inter | 17px | 700 | 1.0 |
| Secondary Link | Inter | 13px | 500 | 1.0 |

---

## Spacing Summary

| Between | Gap |
|---------|-----|
| Top of screen → Skip button | 56px |
| Visual zone height | ~50% of viewport |
| Visual → Headline | 40px |
| Headline → Subtext | 14px |
| Page dots → Bottom of screen | 100px from bottom |
| Logo (Slide 4) → "Ready to discover?" | 20px |
| Headline (Slide 4) → Subtext | 12px |
| Subtext (Slide 4) → CTA Button | 40px |
| CTA Button → Secondary link | 16px |

---

## Interaction Notes (For Figma Prototype)

- **Splash → Slide 1**: Auto-transition after 2 seconds. Splash fades out (300ms), Slide 1 fades in (300ms).
- **Slide navigation**: Horizontal swipe left to advance, swipe right to go back. Smart animate between slides (300ms, ease-out).
- **Page dots**: Update on each slide transition. Active dot animates width (8px → 16px pill) over 200ms.
- **Skip**: Available on slides 1–3. Navigates directly to Feed with a fade transition (250ms).
- **CTA button tap**: Scale press animation (150ms), then navigate to Feed with a fade + slight zoom-in transition (300ms).
- **Secondary link tap**: Underline appears on press (100ms), then navigates to Feed with same transition as CTA.
- **Visual animations (optional enhancement)**:
  - Slide 1: Signal dots gently pulse in brightness (slow, 2-second cycle)
  - Slide 2: Floating card has a subtle slow hover animation (translateY ±4px over 3 seconds, infinite loop)
  - Slide 3: The mid-swipe card has a frozen mid-motion feel (static, no animation — the motion is implied by positioning)

---

## What NOT to Do
- ❌ Do NOT add a sign-up or login step — the app should be immediately accessible
- ❌ Do NOT use more than 4 slides (including CTA) — attention dies after 3 content slides
- ❌ Do NOT use paragraph-length text on any slide — max 2 sentences per subtext
- ❌ Do NOT use cartoon characters, mascots, or stock photos — use abstract, data-inspired visuals
- ❌ Do NOT make the Skip button prominent — it should be subtle, not competing with the content
- ❌ Do NOT auto-advance slides (except Splash → Slide 1) — let the user control the pace
- ❌ Do NOT use light mode — dark mode only, consistent with all other screens
- ❌ Do NOT show the bottom nav bar during onboarding — this is a full-screen immersive flow
- ❌ Do NOT add terms of service, privacy policy links, or legal text — save that for a settings screen later
- ❌ Do NOT show a progress bar — the page dots are sufficient

---

## Design Mood References
- **Notion** onboarding (clean, minimal, focused messaging)
- **Linear** first-launch experience (dark, elegant, fast)
- **Stripe** product pages (abstract visuals, sharp typography, dark backgrounds)
- **Revolut** onboarding carousel (financial product, dark mode, clear CTA)
- **Raycast** splash screen (minimal logo, tagline, immediate access)

---

## Deliverable Checklist
- [ ] Splash screen frame — logo, app name, tagline, loading dots (375 × 812)
- [ ] Slide 1 frame — abstract signal dots visual + "Real Problems, Real People" headline
- [ ] Slide 2 frame — floating intelligence card visual + "Structured & Scored" headline
- [ ] Slide 3 frame — mini feed mockup visual + "Find What's Worth Building" headline
- [ ] Slide 4 (CTA) frame — centered logo + "Ready to discover?" + CTA button + secondary link
- [ ] Page indicator dots shown on slides 1–3 (correct active state per slide)
- [ ] Skip button on slides 1–3
- [ ] CTA button with green gradient and shadow on slide 4
- [ ] Dark mode only across all frames
- [ ] At least 5 frames total (splash + 4 slides)
- [ ] Consistent typography and spacing across all slides

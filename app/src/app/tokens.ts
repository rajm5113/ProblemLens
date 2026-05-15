/**
 * ProblemLens Design Tokens — TypeScript
 *
 * Single source of truth for all inline-style values in the app.
 * Mirrors /src/styles/theme.css --pl-* custom properties exactly.
 * Import from here instead of scattering raw hex strings in components.
 *
 * Usage:
 *   import { T } from "../tokens";
 *   style={{ backgroundColor: T.bg.surface, color: T.text.primary }}
 */

/* ── Backgrounds ─────────────────────────────────────────── */
const bg = {
  base:          "#0D0D1A",   // Screen canvas
  surface:       "#1A1A2E",   // Cards, sheets, modals
  surfaceHover:  "#222240",   // Card press / hover
  surfaceSubtle: "#13132A",   // Footer containers, secondary panels
  overlay:       "rgba(0,0,0,0.55)", // Behind sheets / modals
} as const;

/* ── Text ─────────────────────────────────────────────────── */
const text = {
  primary:   "#FFFFFF",  // Titles, headlines, important labels
  secondary: "#D0D0E0",  // Body text, pain points, solutions
  muted:     "#A0A0B0",  // Descriptions, summaries, subtexts
  dim:       "#808090",  // Metadata tags, placeholders, hints
  faint:     "#606070",  // Section labels, scale markers
  ghost:     "#505060",  // Swipe hints, placeholders, disabled
} as const;

/* ── Borders ─────────────────────────────────────────────── */
const border = {
  subtle:  "rgba(255,255,255,0.06)", // Card borders, nav borders
  default: "#333345",                // Inputs, inactive chips
  focus:   "#00E676",                // Active selections, focus ring
} as const;

/* ── Accent ──────────────────────────────────────────────── */
const accent = {
  primary:     "#00E676",              // CTAs, active states, scores
  primaryDark: "#00C853",              // Gradient endpoint
  glow:        "rgba(0,230,118,0.15)", // Focus rings, subtle glows
  shadow:      "rgba(0,230,118,0.25)", // Button elevation
} as const;

/* ── Score Colors ────────────────────────────────────────── */
const score = {
  high:   "#00E676", // 8–10 — strong signal
  medium: "#FFB300", // 5–7  — moderate signal
  low:    "#FF5252", // 1–4  — weak signal
} as const;

/* ── UI Elements ─────────────────────────────────────────── */
const ui = {
  trackBg:     "#2A2A3E", // Slider / progress track background
  toggleOff:   "#333345", // Inactive toggle track
  toggleOn:    "#00E676", // Active toggle track
  dotInactive: "#333345", // Page indicator dots
  dotActive:   "#00E676", // Current page dot
  emptyIcon:   "#333345", // Empty state illustrations
} as const;

/* ── Sector Colors ───────────────────────────────────────── */
const sector = {
  healthcare:  "#26C6DA",
  fintech:     "#FFB300",
  education:   "#7C4DFF",
  agriculture: "#66BB6A",
  govtech:     "#42A5F5",
  cleantech:   "#26A69A",
  employment:  "#EC407A",
  creator:     "#FFA726",
  retail:      "#FFB300",
  rareDisease: "#EF5350",
  technology:  "#5C6BC0",   // indigo — distinct from govtech blue
} as const;

/* ── Spacing (4px base unit) ─────────────────────────────── */
const space = {
  1:  "4px",
  2:  "6px",
  3:  "8px",
  4:  "10px",
  5:  "12px",
  6:  "14px",
  7:  "16px",
  8:  "20px",
  9:  "24px",
  10: "28px",
  11: "32px",
  12: "40px",
} as const;

/* ── Border Radius ───────────────────────────────────────── */
const radius = {
  sm:   "6px",
  md:   "8px",
  lg:   "10px",
  xl:   "12px",
  "2xl": "14px",
  "3xl": "16px",
  "4xl": "20px",
  full: "9999px",
} as const;

/* ── Shadows ─────────────────────────────────────────────── */
const shadow = {
  none:   "none",
  sm:     "0 2px 8px rgba(0,0,0,0.20)",
  md:     "0 4px 16px rgba(0,0,0,0.25)",
  lg:     "0 4px 24px rgba(0,0,0,0.30)",
  glow:   "0 4px 20px rgba(0,230,118,0.25)",
  slider: "0 2px 8px rgba(0,0,0,0.30)",
} as const;

/* ── Type Scale (px) ─────────────────────────────────────── */
const fontSize = {
  "4xl": "36px",  // Display — opportunity score hero
  "3xl": "28px",  // Hero — splash name, CTA headlines
  "2xl": "26px",  // Title Large — onboarding, feed card title
  xl:    "24px",  // Title — deep dive headline
  lg:    "22px",  // Title Small — screen headers
  base:  "16px",  // Body Large — compact card title
  sm:    "15px",  // Body — pain summaries, subtexts
  xs:    "14px",  // Caption Large — labels, nav
  "2xs": "13px",  // Caption — section labels, chips
  "3xs": "11px",  // Micro — badges, score labels
  "4xs": "10px",  // Nano — bottom nav, compact tags
} as const;

/* ── Font Families ───────────────────────────────────────── */
const font = {
  sans:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "'Outfit', 'Inter', -apple-system, sans-serif",
  mono:    "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

/* ── Animation Durations (ms) ────────────────────────────── */
const duration = {
  fast:   "100ms", // Press feedback
  normal: "200ms", // Toggles, chevrons, chip select
  smooth: "300ms", // Screen transitions, sheet entry
  slow:   "600ms", // Score bar fill
} as const;

/* ── Easing Curves ───────────────────────────────────────── */
const easing = {
  out:      "cubic-bezier(0.0,  0.0, 0.2, 1)",  // Entrances
  in:       "cubic-bezier(0.4,  0.0, 1.0, 1)",  // Exits
  standard: "cubic-bezier(0.4,  0.0, 0.2, 1)",  // General
  bounce:   "cubic-bezier(0.34, 1.56, 0.64, 1)",// Playful micro
} as const;

/* ── Gradient Helpers ────────────────────────────────────── */
const gradient = {
  /** Primary CTA / slider fill */
  accent: `linear-gradient(135deg, ${accent.primary}, ${accent.primaryDark})`,
  /** Amber-toned medium score */
  medium: "linear-gradient(135deg, #FFB300, #F57C00)",
  /** Score-coded by value */
  forScore(score: number): string {
    if (score >= 8) return this.accent;
    if (score >= 5) return this.medium;
    return "linear-gradient(135deg, #FF5252, #D32F2F)";
  },
} as const;

/* ── Sector helper ───────────────────────────────────────── */
const SECTOR_MAP: Record<string, string> = {
  HEALTHCARE:           sector.healthcare,
  FINTECH:              sector.fintech,
  "FINTECH / RETAIL":   sector.fintech,
  "FINTECH / CREATOR":  sector.fintech,
  EDUCATION:            sector.education,
  AGRICULTURE:          sector.agriculture,
  "GOVTECH / LEGAL":    sector.govtech,
  "LEGAL / GOVTECH":    sector.govtech,
  CLEANTECH:            sector.cleantech,
  "EMPLOYMENT / EDTECH":sector.employment,
  "CREATOR ECONOMY":    sector.creator,
  "RARE DISEASE":       sector.rareDisease,
  TECHNOLOGY:           sector.technology,
};

function sectorColor(sectorName: string): string {
  return SECTOR_MAP[sectorName.toUpperCase()] ?? sector.education;
}

function sectorBg(sectorName: string): string {
  const c = sectorColor(sectorName);
  return `${c}26`; // ~15% opacity hex
}

/* ── Score helper ────────────────────────────────────────── */
function scoreColor(value: number): string {
  if (value >= 8) return score.high;
  if (value >= 5) return score.medium;
  return score.low;
}

/* ── Main export ─────────────────────────────────────────── */
export const T = {
  bg,
  text,
  border,
  accent,
  score,
  ui,
  sector,
  space,
  radius,
  shadow,
  fontSize,
  font,
  duration,
  easing,
  gradient,
  // helpers
  sectorColor,
  sectorBg,
  scoreColor,
} as const;

/* Named re-exports for convenience */
export { sectorColor, sectorBg, scoreColor };
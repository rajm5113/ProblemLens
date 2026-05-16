import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ── Theme type ─────────────────────────────────────────── */
export type Theme = "dark" | "light";

/* ── Color palettes ──────────────────────────────────────── */
export interface ThemeColors {
  /* Page / structural backgrounds */
  pageBg: string;         // outermost wrapper
  appBg: string;          // screen root, nav bars
  cardBg: string;         // cards, sheets
  cardBgHover: string;    // hovered card
  subtleBg: string;       // subtle surface, filter panel bg
  cardGradient: string;   // feed card background gradient
  scoreCardBg: string;    // deep-dive score cell bg

  /* Text */
  textPrimary: string;
  textMuted: string;
  textDim: string;
  textFaint: string;
  textGhost: string;

  /* Borders */
  borderSubtle: string;
  borderDefault: string;

  /* Accent */
  accent: string;
  accentDark: string;
  accentGlow: string;

  /* Misc UI */
  toggleOff: string;      // toggle track (off state)
  emptyIconBg: string;    // empty-state icon circle bg
}

/* ─────────────────────  DARK  ───────────────────────────── */
const DARK: ThemeColors = {
  pageBg:          "#080810",
  appBg:           "#0D0D1A",
  cardBg:          "#1A1A2E",
  cardBgHover:     "#222240",
  subtleBg:        "#141422",
  cardGradient:    "linear-gradient(160deg, #1E1E38 0%, #1A1A2E 60%, #161628 100%)",
  scoreCardBg:     "#161626",

  textPrimary:  "#FFFFFF",
  textMuted:    "#A0A0B0",
  textDim:      "#808090",
  textFaint:    "#606070",
  textGhost:    "#404055",

  borderSubtle:  "rgba(255,255,255,0.06)",
  borderDefault: "rgba(255,255,255,0.10)",

  accent:      "#00E676",
  accentDark:  "#00C853",
  accentGlow:  "rgba(0,230,118,0.25)",

  toggleOff:    "#333345",
  emptyIconBg:  "#333345",
};

/* ─────────────────────  LIGHT  ──────────────────────────── */
const LIGHT: ThemeColors = {
  pageBg:       "#DDE3EE",
  appBg:        "#F2F4F9",
  cardBg:       "#FFFFFF",
  cardBgHover:  "#F7F8FF",
  subtleBg:     "#F8F9FC",
  cardGradient: "linear-gradient(160deg, #FAFBFF 0%, #FFFFFF 60%, #F5F7FE 100%)",
  scoreCardBg:  "#F0F2F8",

  textPrimary: "#0F1117",
  textMuted:   "#4B5563",
  textDim:     "#6B7280",
  textFaint:   "#9CA3AF",
  textGhost:   "#CBD5E1",

  borderSubtle:  "rgba(0,0,0,0.07)",
  borderDefault: "rgba(0,0,0,0.13)",

  accent:     "#00A040",   // slightly darker green — better contrast on white
  accentDark: "#007A30",
  accentGlow: "rgba(0,160,64,0.20)",

  toggleOff:   "#D1D5DB",
  emptyIconBg: "#E8ECF4",
};

/* ── Context ─────────────────────────────────────────────── */
interface ThemeContextValue {
  theme: Theme;
  C: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* ── Provider ────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("pl_theme") as Theme) || "light";
    } catch {
      return "light";
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("pl_theme", next);
      } catch { /* noop */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, C: theme === "dark" ? DARK : LIGHT, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────── */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ProblemFeed } from "./components/ProblemFeed";
import { DeepDive } from "./components/DeepDive";
import { Dashboard } from "./components/Dashboard";
import { Onboarding } from "./components/Onboarding";
import { FiltersSheet, DEFAULT_FILTERS, isFilterActive } from "./components/FiltersSheet";
import { DesktopLayout } from "./components/DesktopLayout";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import type { FilterState } from "./components/FiltersSheet";

type Tab = "feed" | "dashboard";
type Screen =
  | { name: "feed" }
  | { name: "dashboard" }
  | { name: "deepdive"; problemId: number; from: Tab };

/* ══════════════════════════════════════════════════════════
   APP ROOT
   Responsive breakpoints:
     mobile  (< 768px) : full-screen single column
     tablet  (768–1023px): centered column, max-width 600px
     desktop (≥ 1024px): split-view — delegates to DesktopLayout
══════════════════════════════════════════════════════════ */
export default function App() {
  return (
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  );
}

function AppRoot() {
  const bp = useBreakpoint();
  const { C } = useTheme();

  /* ── Shared state (used by mobile/tablet AND desktop) ── */
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    try { return localStorage.getItem("pl_onboarded") === "true"; } catch { return false; }
  });
  const handleOnboardingComplete = useCallback(() => {
    try { localStorage.setItem("pl_onboarded", "true"); } catch { /* noop */ }
    setOnboardingDone(true);
  }, []);

  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  /* ── Desktop: delegate entirely ── */
  if (bp === "desktop") {
    return (
      <DesktopLayout
        appliedFilters={appliedFilters}
        onApplyFilters={setAppliedFilters}
        onboardingDone={onboardingDone}
        onOnboardingComplete={handleOnboardingComplete}
      />
    );
  }

  /* ── Mobile + Tablet ── */
  return (
    <MobileTabletApp
      bp={bp}
      onboardingDone={onboardingDone}
      onOnboardingComplete={handleOnboardingComplete}
      appliedFilters={appliedFilters}
      onApplyFilters={setAppliedFilters}
    />
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE / TABLET SHELL
   Architecture: Feed + Dashboard are always mounted (keep-alive).
   Opacity + pointer-events crossfade for tab switching (200ms).
   DeepDive slides over them via AnimatePresence.
   Tablet: content constrained to max-width 600px, centered.
══════════════════════════════════════════════════════════ */
interface MobileTabletProps {
  bp: "mobile" | "tablet";
  onboardingDone: boolean;
  onOnboardingComplete: () => void;
  appliedFilters: FilterState;
  onApplyFilters: (f: FilterState) => void;
}

function MobileTabletApp({
  bp,
  onboardingDone,
  onOnboardingComplete,
  appliedFilters,
  onApplyFilters,
}: MobileTabletProps) {
  const { C } = useTheme();
  const [screen, setScreen] = useState<Screen>({ name: "feed" });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const transitionGuard = useRef(false);

  const isDeepDive = screen.name === "deepdive";
  const feedVisible =
    screen.name === "feed" ||
    (screen.name === "deepdive" && screen.from === "feed");
  const dashVisible =
    screen.name === "dashboard" ||
    (screen.name === "deepdive" && screen.from === "dashboard");

  const goToDeepDive = useCallback((problemId: number, from: Tab) => {
    if (transitionGuard.current) return;
    transitionGuard.current = true;
    setScreen({ name: "deepdive", problemId, from });
    setTimeout(() => { transitionGuard.current = false; }, 400);
  }, []);

  const goBack = useCallback(() => {
    if (screen.name !== "deepdive") return;
    setScreen({ name: screen.from });
  }, [screen]);

  const goToFeed = useCallback(() => {
    setFilterSheetOpen(false);
    setScreen({ name: "feed" });
  }, []);

  const goToDashboard = useCallback(() => {
    setFilterSheetOpen(false);
    setScreen({ name: "dashboard" });
  }, []);

  const handleApply = useCallback((f: FilterState) => {
    onApplyFilters(f);
    setFilterSheetOpen(false);
  }, [onApplyFilters]);

  /* ── Tablet: center the content column (max-width 600px) ── */
  const isTablet = bp === "tablet";

  return (
    /* Outer: fills viewport, bg color bleeds to edges on tablet */
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: C.appBg,
        overflow: "hidden",
        display: "flex",
        justifyContent: isTablet ? "center" : "flex-start",
      }}
    >
      {/* Content column — max-width on tablet, full on mobile */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isTablet ? "600px" : "none",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ── Layer 1: Feed (always mounted) ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: feedVisible ? 1 : 0,
            pointerEvents:
              screen.name === "feed" && !isDeepDive ? "auto" : "none",
            transition: "opacity 0.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <ProblemFeed
            onCardTap={(id) => goToDeepDive(id, "feed")}
            onFilterTap={() => setFilterSheetOpen(true)}
            onDashboardTap={goToDashboard}
            filterActive={isFilterActive(appliedFilters)}
            appliedFilters={appliedFilters}
          />
        </div>

        {/* ── Layer 2: Dashboard (always mounted) ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: dashVisible ? 1 : 0,
            pointerEvents:
              screen.name === "dashboard" && !isDeepDive ? "auto" : "none",
            transition: "opacity 0.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Dashboard
            onCardTap={(id) => goToDeepDive(id, "dashboard")}
            onGoToFeed={goToFeed}
            onDashboardTap={() => { /* already here */ }}
          />
        </div>

        {/* ── Layer 3: Deep Dive (push/pop slide) ── */}
        <AnimatePresence>
          {isDeepDive && screen.name === "deepdive" && (
            <motion.div
              key={`deepdive-${screen.problemId}`}
              initial={{ x: "100%" }}
              animate={{
                x: 0,
                transition: { duration: 0.3, ease: [0, 0, 0.2, 1] },
              }}
              exit={{
                x: "100%",
                transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
              }}
              style={{ position: "absolute", inset: 0, zIndex: 10 }}
            >
              <DeepDive problemId={screen.problemId} onBack={goBack} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Layer 4: Filters sheet (Feed only) ── */}
        <FiltersSheet
          open={filterSheetOpen && screen.name === "feed"}
          initialFilters={appliedFilters}
          onApply={handleApply}
          onDismiss={() => setFilterSheetOpen(false)}
        />

        {/* ── Layer 5: Onboarding overlay ── */}
        <AnimatePresence>
          {!onboardingDone && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.35, ease: "easeIn" }}
              style={{ position: "absolute", inset: 0, zIndex: 100 }}
            >
              <Onboarding onComplete={onOnboardingComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { DeepDive } from "./components/DeepDive";
import { DesktopLayout } from "./components/DesktopLayout";
import { ErrorScreen } from "./components/ErrorScreen";
import { FiltersSheet, DEFAULT_FILTERS, isFilterActive } from "./components/FiltersSheet";
import { LoadingScreen } from "./components/LoadingScreen";
import { Onboarding } from "./components/Onboarding";
import { ProblemFeed } from "./components/ProblemFeed";
import { SavedScreen } from "./components/SavedScreen";
import { SearchOverlay } from "./components/SearchOverlay";
import { BookmarksProvider } from "./contexts/BookmarksContext";
import { NotesProvider } from "./contexts/NotesContext";
import { ProblemsProvider, useProblems } from "./contexts/ProblemsContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { getDeepLinkProblemId } from "./utils/deepLink";
import type { FilterState } from "./components/FiltersSheet";

type Tab = "feed" | "saved" | "dashboard";
type Screen =
  | { name: "feed" }
  | { name: "saved" }
  | { name: "dashboard" }
  | { name: "deepdive"; problemId: string; from: Tab };

export default function App() {
  return (
    <ThemeProvider>
      <ProblemsProvider>
        <BookmarksProvider>
          <NotesProvider>
            <AppRoot />
          </NotesProvider>
        </BookmarksProvider>
      </ProblemsProvider>
    </ThemeProvider>
  );
}

function AppRoot() {
  const bp = useBreakpoint();
  const { isLoading, error, refresh } = useProblems();
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const announce = useCallback((message: string) => {
    setAnnouncementMessage("");
    window.setTimeout(() => setAnnouncementMessage(message), 40);
  }, []);

  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pl_onboarded") === "true";
    } catch {
      return false;
    }
  });

  const handleOnboardingComplete = useCallback(() => {
    try {
      localStorage.setItem("pl_onboarded", "true");
    } catch {
      // noop
    }
    setOnboardingDone(true);
  }, []);

  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refresh} />;

  return (
    <>
      {bp === "desktop" ? (
        <DesktopLayout
          appliedFilters={appliedFilters}
          onApplyFilters={setAppliedFilters}
          onboardingDone={onboardingDone}
          onOnboardingComplete={handleOnboardingComplete}
          onAnnounce={announce}
        />
      ) : (
        <MobileTabletApp
          bp={bp}
          onboardingDone={onboardingDone}
          onOnboardingComplete={handleOnboardingComplete}
          appliedFilters={appliedFilters}
          onApplyFilters={setAppliedFilters}
          onAnnounce={announce}
        />
      )}

      <Toaster position="top-center" richColors />
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        {announcementMessage}
      </div>
    </>
  );
}

interface MobileTabletProps {
  bp: "mobile" | "tablet";
  onboardingDone: boolean;
  onOnboardingComplete: () => void;
  appliedFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onAnnounce: (message: string) => void;
}

function MobileTabletApp({
  bp,
  onboardingDone,
  onOnboardingComplete,
  appliedFilters,
  onApplyFilters,
  onAnnounce,
}: MobileTabletProps) {
  const { C } = useTheme();
  const [screen, setScreen] = useState<Screen>({ name: "feed" });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const transitionGuard = useRef(false);

  useEffect(() => {
    const deepLinkedId = getDeepLinkProblemId();
    if (deepLinkedId) setScreen({ name: "deepdive", problemId: deepLinkedId, from: "feed" });
  }, []);

  const isDeepDive = screen.name === "deepdive";
  const feedVisible = screen.name === "feed" || (screen.name === "deepdive" && screen.from === "feed");
  const savedVisible = screen.name === "saved" || (screen.name === "deepdive" && screen.from === "saved");
  const dashboardVisible =
    screen.name === "dashboard" || (screen.name === "deepdive" && screen.from === "dashboard");

  const goToDeepDive = useCallback((problemId: string, from: Tab) => {
    if (transitionGuard.current) return;
    transitionGuard.current = true;
    setScreen({ name: "deepdive", problemId, from });
    window.setTimeout(() => {
      transitionGuard.current = false;
    }, 400);
  }, []);

  const goBack = useCallback(() => {
    if (screen.name !== "deepdive") return;
    setScreen({ name: screen.from });
  }, [screen]);

  const goToFeed = useCallback(() => {
    setFilterSheetOpen(false);
    setSearchOpen(false);
    setScreen({ name: "feed" });
  }, []);

  const goToSaved = useCallback(() => {
    setFilterSheetOpen(false);
    setSearchOpen(false);
    setScreen({ name: "saved" });
  }, []);

  const goToDashboard = useCallback(() => {
    setFilterSheetOpen(false);
    setSearchOpen(false);
    setScreen({ name: "dashboard" });
  }, []);

  const handleApply = useCallback(
    (filters: FilterState) => {
      onApplyFilters(filters);
      setFilterSheetOpen(false);
    },
    [onApplyFilters]
  );

  const isTablet = bp === "tablet";

  return (
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
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isTablet ? "600px" : "none",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: feedVisible ? 1 : 0,
            pointerEvents: screen.name === "feed" && !isDeepDive ? "auto" : "none",
            transition: "opacity 0.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <ProblemFeed
            onCardTap={(id) => goToDeepDive(id, "feed")}
            onFilterTap={() => setFilterSheetOpen(true)}
            onSavedTap={goToSaved}
            onDashboardTap={goToDashboard}
            filterActive={isFilterActive(appliedFilters)}
            appliedFilters={appliedFilters}
            onAnnounce={onAnnounce}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: savedVisible ? 1 : 0,
            pointerEvents: screen.name === "saved" && !isDeepDive ? "auto" : "none",
            transition: "opacity 0.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <SavedScreen
            onCardTap={(id) => goToDeepDive(id, "saved")}
            onGoToFeed={goToFeed}
            onDashboardTap={goToDashboard}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: dashboardVisible ? 1 : 0,
            pointerEvents: screen.name === "dashboard" && !isDeepDive ? "auto" : "none",
            transition: "opacity 0.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Dashboard
            onCardTap={(id) => goToDeepDive(id, "dashboard")}
            onGoToFeed={goToFeed}
            onSavedTap={goToSaved}
            onDashboardTap={() => {}}
            onSearchTap={() => setSearchOpen(true)}
          />
        </div>

        <AnimatePresence>
          {isDeepDive && screen.name === "deepdive" && (
            <motion.div
              key={`deepdive-${screen.problemId}`}
              initial={{ x: "100%" }}
              animate={{ x: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } }}
              exit={{ x: "100%", transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }}
              style={{ position: "absolute", inset: 0, zIndex: 10 }}
            >
              <DeepDive problemId={screen.problemId} onBack={goBack} />
            </motion.div>
          )}
        </AnimatePresence>

        <SearchOverlay
          open={searchOpen && screen.name === "dashboard"}
          onClose={() => setSearchOpen(false)}
          onCardTap={(id) => {
            setSearchOpen(false);
            goToDeepDive(id, "dashboard");
          }}
        />

        <FiltersSheet
          open={filterSheetOpen && screen.name === "feed"}
          initialFilters={appliedFilters}
          onApply={handleApply}
          onDismiss={() => setFilterSheetOpen(false)}
        />

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

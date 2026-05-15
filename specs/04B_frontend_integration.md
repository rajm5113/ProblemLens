# Spec 4B: Frontend API Integration

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 4A (FastAPI Server) ✅
> **Produces:** React frontend consuming live data from the FastAPI backend

---

## 1. Purpose

Replace the hardcoded `PROBLEMS` array in the React frontend with live `fetch()` calls to the FastAPI server. After this spec, the frontend displays data from the Python agent pipeline's SQLite store.

---

## 2. Current State Audit

The hardcoded `PROBLEMS` array is imported in **5 component files**. Every one of them must be updated.

| File | How It Uses `PROBLEMS` |
|------|----------------------|
| `data/problems.ts` | **Defines** the `PROBLEMS` array (lines 43-386) |
| `ProblemFeed.tsx` | Imports `PROBLEMS` directly, filters/indexes into it |
| `Dashboard.tsx` | Imports `PROBLEMS` directly, sorts/filters for tabs |
| `DesktopLayout.tsx` | Imports `PROBLEMS` directly, filters for feed + dashboard tabs + sectors |
| `DeepDive.tsx` | Imports `PROBLEMS`, does `PROBLEMS.find(p => p.id === problemId)` |
| `FiltersSheet.tsx` | Imports `PROBLEMS`, uses it in `countMatchingProblems()` |

### The Problem

Every component independently imports `PROBLEMS` and operates on it locally. There is no single source of truth — the data is duplicated across 5 import sites. This makes it impossible to simply "swap the source" without touching every file.

---

## 3. Architecture Decision: React Context

Instead of passing `problems` as a prop through every component (which would require changing 10+ component signatures and breaking the keep-alive layout architecture in `App.tsx`), use a **React Context**.

```
ProblemsProvider (fetches data once, holds state)
  ├── App.tsx
  │   ├── ProblemFeed (reads from context)
  │   ├── Dashboard (reads from context)
  │   ├── DeepDive (reads from context)
  │   ├── DesktopLayout (reads from context)
  │   └── FiltersSheet (reads from context)
```

**Why Context instead of prop drilling:**
- `App.tsx` has a complex keep-alive architecture (Feed + Dashboard are always mounted). Prop drilling would require changing `MobileTabletApp`, `DesktopLayout`, and every child.
- `FiltersSheet.tsx` has a `countMatchingProblems()` function that runs independently — it needs access to the array without receiving it as a prop.
- Context is the idiomatic React pattern for "data that many components at different nesting levels need."

---

## 4. File-by-File Changes

### 4.1 CREATE: `app/src/app/services/api.ts`

The API client. Uses native `fetch`. Points to `http://localhost:8000/api`.

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export async function fetchProblems(): Promise<ProblemIntelligenceCard[]> {
  const res = await fetch(`${API_BASE}/problems`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchProblemById(id: string): Promise<ProblemIntelligenceCard> {
  const res = await fetch(`${API_BASE}/problems/${id}`);
  if (!res.ok) throw new Error(`Problem ${id} not found`);
  return res.json();
}
```

### 4.2 CREATE: `app/src/app/contexts/ProblemsContext.tsx`

The central data provider. Fetches once on mount, exposes `problems`, `isLoading`, `error`, and a `refresh()` function.

```typescript
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ProblemIntelligenceCard } from "../types/schema";
import { fetchProblems } from "../services/api";

interface ProblemsContextValue {
  problems: ProblemIntelligenceCard[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const ProblemsContext = createContext<ProblemsContextValue>({
  problems: [],
  isLoading: true,
  error: null,
  refresh: () => {},
});

export function ProblemsProvider({ children }: { children: React.ReactNode }) {
  const [problems, setProblems] = useState<ProblemIntelligenceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchProblems();
      setProblems(data);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ProblemsContext.Provider value={{ problems, isLoading, error, refresh: load }}>
      {children}
    </ProblemsContext.Provider>
  );
}

export function useProblems() {
  return useContext(ProblemsContext);
}
```

### 4.3 UPDATE: `app/src/app/data/problems.ts`

**Delete** the entire `PROBLEMS` array (lines 43-386). **Keep** all the utility functions (`SECTOR_COLORS`, `getSectorColor`, `getScoreGradient`, `getBarColor`).

```typescript
// KEEP these:
export type Problem = ProblemIntelligenceCard;
export const SECTOR_COLORS: Record<string, string> = { ... };
export function getSectorColor(sector: string): string { ... }
export function getScoreGradient(value: number): { ... } { ... }
export function getBarColor(value: number, invert = false): string { ... }

// DELETE this entire block:
// export const PROBLEMS: Problem[] = [ ... ];
```

### 4.4 UPDATE: `app/src/app/App.tsx`

Wrap the entire app in `ProblemsProvider`. Add loading/error states.

```typescript
import { ProblemsProvider, useProblems } from "./contexts/ProblemsContext";

export default function App() {
  return (
    <ThemeProvider>
      <ProblemsProvider>
        <AppRoot />
      </ProblemsProvider>
    </ThemeProvider>
  );
}

function AppRoot() {
  const { isLoading, error, refresh } = useProblems();

  // Show loading screen while fetching
  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refresh} />;

  // ... rest of existing AppRoot logic unchanged ...
}
```

### 4.5 UPDATE: `app/src/app/components/Dashboard.tsx`

Replace the `PROBLEMS` import with `useProblems()` hook.

```diff
- import { PROBLEMS, getSectorColor, getScoreGradient } from "../data/problems";
+ import { getSectorColor, getScoreGradient } from "../data/problems";
+ import { useProblems } from "../contexts/ProblemsContext";

  export function Dashboard({ onCardTap, onGoToFeed, onDashboardTap }: DashboardProps) {
+   const { problems } = useProblems();
    // ...
  }

  // Update ALL helper functions to use the `problems` parameter:
- function getTrendingProblems(): Problem[] {
-   return [...PROBLEMS].sort(...).slice(0, 5);
+ function getTrendingProblems(problems: Problem[]): Problem[] {
+   return [...problems].sort(...).slice(0, 5);

- function getSectorGroups(): SectorGroup[] {
+ function getSectorGroups(problems: Problem[]): SectorGroup[] {
-   for (const p of PROBLEMS) {
+   for (const p of problems) {

  // And call them with the problems array:
- problems = getTrendingProblems();
+ problems = getTrendingProblems(allProblems);
```

### 4.6 UPDATE: `app/src/app/components/ProblemFeed.tsx`

Same pattern — replace `PROBLEMS` import with `useProblems()`.

```diff
- import { PROBLEMS, getSectorColor, getScoreGradient } from "../data/problems";
+ import { getSectorColor, getScoreGradient } from "../data/problems";
+ import { useProblems } from "../contexts/ProblemsContext";

  export function ProblemFeed({ ... }: ProblemFeedProps) {
+   const { problems: PROBLEMS } = useProblems();
    // ... rest works as-is since the variable name stays PROBLEMS
  }

- interface ProblemCardProps {
-   problem: (typeof PROBLEMS)[0];
+ interface ProblemCardProps {
+   problem: Problem;
```

### 4.7 UPDATE: `app/src/app/components/DesktopLayout.tsx`

This is the most complex file. It imports `PROBLEMS` in 4 places: `getDashProblems()`, `getSectorGroups()`, the feed filter, and the initial selected ID.

```diff
- import { PROBLEMS, getSectorColor, getScoreGradient } from "../data/problems";
+ import { getSectorColor, getScoreGradient } from "../data/problems";
+ import { useProblems } from "../contexts/ProblemsContext";

  export function DesktopLayout({ ... }: DesktopLayoutProps) {
+   const { problems } = useProblems();
    // ...
-   const [feedSelectedId, setFeedSelectedId] = useState<string>(PROBLEMS[0].id);
-   const [dashSelectedId, setDashSelectedId] = useState<string>(PROBLEMS[0].id);
+   const [feedSelectedId, setFeedSelectedId] = useState<string>(problems[0]?.id ?? "");
+   const [dashSelectedId, setDashSelectedId] = useState<string>(problems[0]?.id ?? "");

-   const filteredFeedProblems = useMemo(() => applyFilters(PROBLEMS, appliedFilters), [appliedFilters]);
+   const filteredFeedProblems = useMemo(() => applyFilters(problems, appliedFilters), [problems, appliedFilters]);
  }

  // Update helper functions:
- function getDashProblems(tab: DashTab): Problem[] {
+ function getDashProblems(tab: DashTab, problems: Problem[]): Problem[] {
    switch (tab) {
      case "trending":
-       return [...PROBLEMS].sort(...).slice(0, 5);
+       return [...problems].sort(...).slice(0, 5);
      // ... same for other cases

- function getSectorGroups(): SectorGroup[] {
+ function getSectorGroups(problems: Problem[]): SectorGroup[] {
-   for (const p of PROBLEMS) {
+   for (const p of problems) {
```

### 4.8 UPDATE: `app/src/app/components/DeepDive.tsx`

```diff
- import { PROBLEMS, getSectorColor, getScoreGradient, getBarColor } from "../data/problems";
+ import { getSectorColor, getScoreGradient, getBarColor } from "../data/problems";
+ import { useProblems } from "../contexts/ProblemsContext";

  export function DeepDive({ problemId, onBack, hideBack = false }: DeepDiveProps) {
-   const problem = PROBLEMS.find((p) => p.id === problemId) || PROBLEMS[0];
+   const { problems } = useProblems();
+   const problem = problems.find((p) => p.id === problemId) || problems[0];
```

### 4.9 UPDATE: `app/src/app/components/FiltersSheet.tsx`

```diff
- import { PROBLEMS } from "../data/problems";
+ import { useProblems } from "../contexts/ProblemsContext";

- export function countMatchingProblems(f: FilterState): number {
-   return PROBLEMS.filter((p) => {
+ // This becomes a hook-dependent function, or we pass problems as a parameter:
+ export function countMatchingProblems(f: FilterState, problems: Problem[]): number {
+   return problems.filter((p) => {
      // ... same filter logic ...
    }).length;
  }
```

**Important:** Since `countMatchingProblems` is called from `ProblemFeed.tsx` and `DesktopLayout.tsx`, those call sites must also pass the `problems` array:

```diff
- const hasResults = countMatchingProblems(appliedFilters) > 0;
+ const hasResults = countMatchingProblems(appliedFilters, problems) > 0;
```

### 4.10 CREATE: `app/src/app/components/LoadingScreen.tsx`

A themed loading screen matching the app's design system.

### 4.11 CREATE: `app/src/app/components/ErrorScreen.tsx`

A themed error screen with retry button.

---

## 5. Environment Variable

Add a `.env` file for the API base URL so it can be configured for production later:

```bash
# app/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 6. Fallback Behavior

If the FastAPI server is not running:
1. `fetchProblems()` throws an error
2. `ProblemsContext` catches it and sets `error`
3. `AppRoot` renders `ErrorScreen` with a "Retry" button
4. User starts the server and clicks "Retry" → data loads

**No silent failures.** The user always knows why data isn't showing.

---

## 7. File Deliverables

| File | Action |
|------|--------|
| `app/src/app/services/api.ts` | **Create** — API client |
| `app/src/app/contexts/ProblemsContext.tsx` | **Create** — data provider + hook |
| `app/src/app/components/LoadingScreen.tsx` | **Create** — loading UI |
| `app/src/app/components/ErrorScreen.tsx` | **Create** — error UI with retry |
| `app/.env` | **Create** — `VITE_API_BASE_URL` |
| `app/src/app/data/problems.ts` | **Update** — delete `PROBLEMS` array, keep utilities |
| `app/src/app/App.tsx` | **Update** — wrap in `ProblemsProvider`, add loading/error |
| `app/src/app/components/Dashboard.tsx` | **Update** — use `useProblems()` hook |
| `app/src/app/components/ProblemFeed.tsx` | **Update** — use `useProblems()` hook |
| `app/src/app/components/DesktopLayout.tsx` | **Update** — use `useProblems()` hook |
| `app/src/app/components/DeepDive.tsx` | **Update** — use `useProblems()` hook |
| `app/src/app/components/FiltersSheet.tsx` | **Update** — accept `problems` parameter |

---

## 8. Exit Conditions

- [ ] `PROBLEMS` array is fully deleted from `problems.ts`
- [ ] No file in `app/src/` imports `PROBLEMS` from `data/problems`
- [ ] All 5 components use `useProblems()` hook or receive `problems` as parameter
- [ ] `npm run build` passes with zero errors
- [ ] With FastAPI running: frontend loads and displays all 11 seed cards
- [ ] With FastAPI stopped: frontend shows `ErrorScreen` with "Retry" button
- [ ] Clicking "Retry" after starting the server loads data successfully
- [ ] Dashboard tabs (Trending, High Opp, AI, Sectors) all work with live data
- [ ] ProblemFeed swipe navigation works with live data
- [ ] DeepDive opens correctly for any card
- [ ] Desktop split-view layout works with live data
- [ ] Filters work correctly with live data
- [ ] `countMatchingProblems()` works with the passed `problems` array

---

## 9. Testing Checklist (Manual)

Run two terminals simultaneously:

```bash
# Terminal 1: Backend
cd backend && .venv\Scripts\python.exe -m uvicorn api.main:app --port 8000

# Terminal 2: Frontend
cd app && npm run dev
```

Then verify:
1. Open `http://localhost:5173` → see "Loading..." briefly → cards appear
2. Switch to Dashboard → tabs show correct cards
3. Click a card → DeepDive opens with correct data
4. Apply a filter → feed updates correctly
5. Stop the backend (Ctrl+C Terminal 1) → refresh browser → see error screen
6. Restart backend → click "Retry" → data loads

---

## 10. What This Spec Does NOT Cover

| Topic | Covered In |
|-------|-----------|
| Live pipeline with real API keys | Spec 4C |
| Trend status computation | Spec 4C |
| Scheduled pipeline runs | Spec 4C |
| Production deployment | Phase 6 |

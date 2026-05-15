# Spec 6A: Frontend Polish & Performance

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 5C (User Features) ✅
> **Zero backend changes** — all work is frontend-only
> **Verification:** `npm run build` (chunk sizes) + browser smoke test

---

## 1. Purpose

The app is functionally complete after Phase 5. This spec addresses the **quality gap** between "it works" and "it's production-ready":

1. **Bundle bloat** — A single 781 kB JS chunk is a real first-load penalty. Lazy loading the analytics panel eliminates the biggest offender (`recharts` + `d3`).
2. **No PWA** — Users on mobile cannot install the app. There's no offline fallback, no app icon.
3. **No deep links** — Sharing a specific problem card means sharing the homepage URL and telling someone to "look for Healthcare > Rural Access". Sharing should be a single URL.
4. **No real-time awareness** — If the backend pipeline runs while a user has the app open, new problems appear only on refresh. A subtle banner removes this friction.
5. **Accessibility gaps** — Interactive elements are missing ARIA labels and keyboard support, which affects screen readers and power-users.

---

## 2. Code Splitting (Bundle Optimization)

### 2.1 The Problem

Vite currently emits one monolithic JS chunk containing everything — the app logic, `motion`, `recharts`, and all of `d3`. The build warning:

```
dist/assets/index-[hash].js   781.32 kB │ gzip: 218.45 kB
(!) Some chunks are larger than 500 kB after minification
```

The `recharts` + `d3` dependency tree accounts for ~320 kB of this. A user who opens the Feed tab never uses this code, but they pay the download cost anyway.

### 2.2 Solution: Lazy-Load the Analytics Panel

The analytics code is only needed when the user navigates to the **Overview** dashboard tab. We lazy-load it with `React.lazy` + `Suspense`.

### 2.3 Implementation

**`app/src/app/components/analytics/index.ts`** — already exists as a barrel. Replace the named export with a lazy wrapper approach.

**`app/src/app/components/Dashboard.tsx`** — change the import:

```tsx
// BEFORE (eager import — always in the bundle):
import { AnalyticsOverview } from "./analytics";

// AFTER (lazy import — separate chunk, loaded on demand):
import { lazy, Suspense } from "react";
const AnalyticsOverview = lazy(() =>
  import("./analytics/AnalyticsOverview").then(m => ({ default: m.AnalyticsOverview }))
);
```

Wrap the render with `Suspense`:

```tsx
// In the tab render section:
{activeTab === "overview" ? (
  <Suspense fallback={<AnalyticsSkeleton />}>
    <AnalyticsOverview />
  </Suspense>
) : ...}
```

**`app/src/app/components/DesktopLayout.tsx`** — same change for the desktop analytics render path.

### 2.4 `AnalyticsSkeleton` Component

A lightweight loading placeholder shown while the chunk downloads (~200ms on a fast connection):

```tsx
// src/app/components/analytics/AnalyticsSkeleton.tsx

export function AnalyticsSkeleton() {
  const { C } = useTheme();

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 5 placeholder cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? "90px" : "180px",
            borderRadius: "16px",
            backgroundColor: C.cardBg,
            border: `1px solid ${C.borderSubtle}`,
            animation: "pl-pulse 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
```

Add the `pl-pulse` keyframe to the global stylesheet:

```css
/* src/styles/theme.css — append */
@keyframes pl-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

### 2.5 Vite Manual Chunks Config

Update `vite.config.ts` to guide chunk splitting for other large vendors:

```ts
// vite.config.ts
export default defineConfig({
  // ... existing plugins, resolve, assetsInclude ...
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // recharts + d3 in a dedicated async chunk
          "vendor-charts": ["recharts"],
          // motion in its own chunk (shared by all screens but still splits main)
          "vendor-motion": ["motion"],
          // React core always in the main bundle (tiny, needed immediately)
        },
      },
    },
    // Raise the warning threshold to 600kB; we'll verify actual sizes post-split
    chunkSizeWarningLimit: 600,
  },
});
```

### 2.6 Expected Outcome

| Chunk | Before | After (target) |
|-------|--------|----------------|
| `index.js` (main) | 781 kB | ~320 kB |
| `vendor-charts.js` | — | ~280 kB (lazy, not on first load) |
| `vendor-motion.js` | — | ~110 kB |

First-load parse cost drops by ~55%. The analytics chunk is fetched only when the user opens the Overview tab.

---

## 3. Progressive Web App (PWA)

### 3.1 What We're Adding

- **Web App Manifest** — enables "Add to Home Screen" on Android/iOS
- **Service Worker** — caches the app shell for instant reloads; provides offline fallback
- **Meta tags** — correct theme color, apple-touch-icon, standalone mode

### 3.2 Manifest

New file: **`app/public/manifest.json`**

```json
{
  "name": "ProblemLens",
  "short_name": "ProblemLens",
  "description": "Discover real-world problems worth solving — curated for builders and founders.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0F14",
  "theme_color": "#6366F1",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 3.3 App Icons

Generate two PNG icons and place in **`app/public/icons/`**:
- `icon-192.png` (192×192) — the LogoMark on a deep indigo (`#0D0F14`) background
- `icon-512.png` (512×512) — same, larger

The LogoMark SVG is already in `LogoMark.tsx`. Use it as the source.

### 3.4 `index.html` Updates

```html
<!-- app/index.html — add to <head> -->
<meta name="description" content="Discover real-world problems worth solving — curated for builders and founders." />
<meta name="theme-color" content="#6366F1" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ProblemLens" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<link rel="manifest" href="/manifest.json" />
```

### 3.5 Service Worker (App Shell Cache Strategy)

New file: **`app/public/sw.js`**

```js
// sw.js — App Shell Cache (Cache First for assets, Network First for API)

const CACHE_NAME = "problemlens-shell-v1";

// App shell assets to precache
const PRECACHE_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: always network, never cache
  if (url.pathname.startsWith("/api/")) return;

  // App shell: Cache First
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          // Cache successful GET responses for static assets
          if (
            event.request.method === "GET" &&
            response.status === 200 &&
            url.pathname.match(/\.(js|css|png|svg|woff2?)$/)
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
    )
  );
});
```

Register the service worker in **`app/src/main.tsx`**:

```tsx
// main.tsx — add after ReactDOM.createRoot(...)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failure is non-fatal
    });
  });
}
```

> **Why `import.meta.env.PROD` guard?** Service workers in dev mode cause Vite HMR issues. We only register in the production build.

### 3.6 Offline Fallback

The cached `/index.html` serves as the offline fallback. The app will load from cache and show the problems that are stored in `ProblemsContext` from the previous session's `localStorage`... but wait — problems come from the API, not localStorage.

**Handle gracefully:** When the network is unavailable, `fetchProblems()` will throw. The existing `ErrorScreen` already handles this with the message "Failed to load problems: Failed to fetch". We improve the message:

```tsx
// src/app/components/ErrorScreen.tsx — detect offline
const isOffline = !navigator.onLine;
const displayMessage = isOffline
  ? "You're offline. Connect to the internet to load the latest problems."
  : message;
```

---

## 4. Deep Links (URL-Based Problem Sharing)

### 4.1 The Problem

The app uses React state for navigation — no URL changes happen when you navigate between screens or open a problem. This means:
- You can't share a specific problem card
- Browser back button doesn't work
- Refreshing the page always goes back to the feed

### 4.2 Solution: Hash-Based Routing (Minimal Change)

We use **URL hash** (`#problem/pip-001`) instead of full path-based routing. This requires zero server configuration changes — the server always serves `index.html`, and the app reads the hash on load.

**Why hash not path routing?**
- The app is served as a static site from Vite. Path-based routing requires the server to serve `index.html` for all routes. We'd need nginx config or equivalent.
- Hash routing works without any server changes — it's handled entirely client-side.
- Adding `react-router` for just this purpose is overkill; hash manipulation is 20 lines.

### 4.3 Implementation

New utility: **`app/src/app/utils/deepLink.ts`**

```ts
// Deep link utilities

export function getDeepLinkProblemId(): string | null {
  const hash = window.location.hash; // e.g. "#problem/pip-001"
  const match = hash.match(/^#problem\/(.+)$/);
  return match ? match[1] : null;
}

export function setDeepLink(problemId: string): void {
  window.history.replaceState(null, "", `#problem/${encodeURIComponent(problemId)}`);
}

export function clearDeepLink(): void {
  window.history.replaceState(null, "", window.location.pathname);
}
```

**`app/src/app/App.tsx`** — read hash on mount and open DeepDive if present:

```tsx
// In MobileTabletApp, after useState for screen:
useEffect(() => {
  const id = getDeepLinkProblemId();
  if (id) {
    setScreen({ name: "deepdive", problemId: id, from: "feed" });
  }
}, []); // only on mount
```

**`app/src/app/components/DeepDive.tsx`** — set hash when a problem opens, clear on back:

```tsx
// In DeepDive, after problem is confirmed:
useEffect(() => {
  setDeepLink(problemId);
  return () => clearDeepLink(); // clear when component unmounts
}, [problemId]);
```

### 4.4 Share Button in DeepDive

The `Share2` icon is already imported in `DeepDive.tsx` but likely just copies a static URL. Wire it to the Web Share API with the deep link:

```tsx
// DeepDive.tsx — update share handler
const handleShare = async () => {
  const url = `${window.location.origin}${window.location.pathname}#problem/${encodeURIComponent(problemId)}`;
  const text = `Check out this problem opportunity: ${problem.title}`;

  if (navigator.share) {
    // Native share sheet (mobile)
    await navigator.share({ title: problem.title, text, url }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url).catch(() => {});
    // Show "Link copied!" toast using the Sonner library (already installed)
    toast("Link copied to clipboard!");
  }
};
```

`sonner` is already in `package.json` (line 62). Add `<Toaster />` to `App.tsx` if not already present.

### 4.5 Desktop Deep Links

In `DesktopLayout.tsx`, apply the same `useEffect` on mount to read the hash and auto-select the problem in the right panel.

---

## 5. Real-Time Feed Updates Banner

### 5.1 Purpose

When the backend scheduler runs (every 6 hours), new problems are added to the database. A user who has the app open won't see them until they manually refresh.

Add a **polling mechanism** that detects new problems and shows a non-intrusive banner: *"3 new problems found — tap to refresh"*.

### 5.2 Polling Strategy

Poll `GET /api/stats` every **5 minutes**. Compare `totalProblems` count against the count at last load. This is lightweight (stats are cheap to compute) and doesn't hammer the API.

```
Poll interval: 5 minutes (300,000 ms)
Endpoint: GET /api/stats
Check: stats.totalProblems > problems.length
Banner: shown when new problems detected
Dismiss: tap banner → calls refresh() from ProblemsContext
```

### 5.3 New Hook: `useNewProblemsPoller`

**`app/src/app/hooks/useNewProblemsPoller.ts`**

```ts
import { useEffect, useRef, useState } from "react";
import { useProblems } from "../contexts/ProblemsContext";
import { fetchStats } from "../services/api";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useNewProblemsPoller() {
  const { problems, refresh } = useProblems();
  const [newCount, setNewCount] = useState(0);
  const baselineRef = useRef(problems.length);

  // Update baseline when problems are refreshed
  useEffect(() => {
    if (newCount === 0) {
      baselineRef.current = problems.length;
    }
  }, [problems.length, newCount]);

  useEffect(() => {
    const poll = async () => {
      try {
        const stats = await fetchStats();
        const diff = stats.totalProblems - baselineRef.current;
        if (diff > 0) setNewCount(diff);
      } catch {
        // Polling failure is non-fatal — fail silently
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setNewCount(0);
    baselineRef.current = problems.length + newCount;
    refresh();
  };

  return { newCount, dismiss };
}
```

### 5.4 Banner Component

**`app/src/app/components/NewProblemsBanner.tsx`**

```tsx
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface NewProblemsBannerProps {
  count: number;
  onDismiss: () => void;
}

export function NewProblemsBanner({ count, onDismiss }: NewProblemsBannerProps) {
  const { C } = useTheme();
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: C.accent,
          color: "#FFFFFF",
          border: "none",
          borderRadius: "24px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        <RefreshCw size={14} />
        {count} new problem{count !== 1 ? "s" : ""} — tap to refresh
      </motion.button>
    </AnimatePresence>
  );
}
```

### 5.5 Integration

Use the hook in `ProblemFeed.tsx` and render the banner inside the feed container (which has `position: relative`):

```tsx
// ProblemFeed.tsx
const { newCount, dismiss } = useNewProblemsPoller();

// In JSX, inside the outer container div:
<NewProblemsBanner count={newCount} onDismiss={dismiss} />
```

Same integration in `DesktopLayout.tsx` for the feed panel.

---

## 6. Accessibility (A11y)

### 6.1 Scope

We focus on **high-impact, low-effort** a11y improvements. Full WCAG 2.1 AA compliance is beyond scope here; this covers the most common gaps found in a React SPA.

### 6.2 Improvements

#### Interactive Elements Without Labels

All `<button>` elements that contain only icons must have `aria-label`:

```tsx
// Example: bookmark button in DeepDive
<button
  aria-label={bookmarked ? "Remove bookmark" : "Save problem"}
  onClick={() => toggleBookmark(problemId)}
>
  <Bookmark />
</button>

// Share button:
<button aria-label="Share this problem" onClick={handleShare}>
  <Share2 />
</button>

// Theme toggle:
<button aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={toggleTheme}>
  {theme === "dark" ? <Sun /> : <Moon />}
</button>

// Close/back buttons, filter icon, search icon — all need aria-label
```

#### Swipeable Feed: Keyboard Navigation

The `ProblemFeed` swipe interface has no keyboard support. Add arrow key handlers:

```tsx
// ProblemFeed.tsx — add to the outer div:
<div
  role="main"
  aria-label="Problem feed"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "ArrowUp") goToPrevious();
    if (e.key === "ArrowDown") goToNext();
    if (e.key === "Enter" || e.key === " ") onCardTap(currentProblem.id);
  }}
>
```

#### Dashboard Tab Navigation

Tabs should be navigable with arrow keys per ARIA tabs pattern:

```tsx
// Tab buttons:
<button
  role="tab"
  aria-selected={activeTab === tab.id}
  aria-controls={`tabpanel-${tab.id}`}
  id={`tab-${tab.id}`}
  onKeyDown={(e) => {
    if (e.key === "ArrowRight") focusNextTab();
    if (e.key === "ArrowLeft") focusPrevTab();
  }}
>
```

Tab panel wrapper:

```tsx
<div
  role="tabpanel"
  id={`tabpanel-${activeTab}`}
  aria-labelledby={`tab-${activeTab}`}
>
```

#### Screen Reader Announcements for Dynamic Content

When problems refresh (after tapping the banner), announce to screen readers:

```tsx
// Add an aria-live region in App.tsx:
<div aria-live="polite" aria-atomic="true" style={{ position: "absolute", left: "-9999px" }}>
  {announcementMessage}
</div>

// Set announcementMessage = "Feed updated with X new problems" after refresh
```

#### Semantic HTML

- `<main>` wrapper for the primary content area in each screen
- `<nav>` for the BottomNav
- `<h1>` on the Feed screen for "Problem Feed" (visually hidden if design requires)

```tsx
// BottomNav.tsx:
<nav aria-label="Main navigation">
  {ITEMS.map(...)}
</nav>
```

#### Focus Management

When navigating to DeepDive, move focus to the top of the panel:

```tsx
// DeepDive.tsx:
const headingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => {
  headingRef.current?.focus();
}, [problemId]);

// On the title element:
<h1 ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
  {problem.title}
</h1>
```

---

## 7. File Deliverables

| File | Action |
|------|--------|
| `app/vite.config.ts` | **Update** — add `build.rollupOptions.output.manualChunks` |
| `app/index.html` | **Update** — add PWA meta tags, manifest link, description |
| `app/public/manifest.json` | **Create** — web app manifest |
| `app/public/icons/icon-192.png` | **Create** — 192×192 PWA icon |
| `app/public/icons/icon-512.png` | **Create** — 512×512 PWA icon |
| `app/public/sw.js` | **Create** — service worker (app shell cache) |
| `app/src/main.tsx` | **Update** — register service worker in PROD |
| `app/src/styles/theme.css` | **Update** — add `@keyframes pl-pulse` for skeleton |
| `app/src/app/components/analytics/AnalyticsSkeleton.tsx` | **Create** — loading placeholder for charts |
| `app/src/app/components/analytics/index.ts` | **Update** — ensure `AnalyticsSkeleton` is exported |
| `app/src/app/components/Dashboard.tsx` | **Update** — lazy import `AnalyticsOverview`, `Suspense` wrap |
| `app/src/app/components/DesktopLayout.tsx` | **Update** — lazy import, deep link on mount, banner |
| `app/src/app/utils/deepLink.ts` | **Create** — hash read/write utilities |
| `app/src/app/components/DeepDive.tsx` | **Update** — `setDeepLink`/`clearDeepLink`, share handler, `aria-label`s, focus management |
| `app/src/app/hooks/useNewProblemsPoller.ts` | **Create** — 5-min polling hook |
| `app/src/app/components/NewProblemsBanner.tsx` | **Create** — spring-animated refresh banner |
| `app/src/app/components/ProblemFeed.tsx` | **Update** — banner integration, keyboard nav, `aria-label`s |
| `app/src/app/components/BottomNav.tsx` | **Update** — `<nav>` semantic wrapper |
| `app/src/app/components/ErrorScreen.tsx` | **Update** — offline detection message |
| `app/src/app/App.tsx` | **Update** — hash deep link on mount, `<Toaster />`, aria-live region |

---

## 8. Testing Strategy

### 8.1 Build Verification

```bash
cd app
npm run build
```

**Check chunk sizes in output.** Expect:
- Main chunk < 400 kB
- `vendor-charts` chunk appears as a separate file
- No chunk > 600 kB warning (or significantly reduced)

### 8.2 PWA Verification

1. Run `npm run build && npx serve dist` (or equivalent)
2. Open Chrome DevTools → Application → Manifest — should show name, icons, theme color
3. Application → Service Workers — should show `sw.js` as active
4. Lighthouse → PWA audit — target: "Installable" check passes

### 8.3 Deep Link Verification

1. Navigate to any problem in DeepDive
2. URL hash changes to `#problem/[id]`
3. Copy the URL → open in new tab → app loads and shows that problem directly
4. Tap Share button → native share sheet appears (mobile) or "Link copied!" toast (desktop)

### 8.4 Banner Verification

Since polling is 5 minutes, test by temporarily lowering `POLL_INTERVAL_MS` to `5000` (5 seconds) and manually adding a problem via the backend pipeline during the test.

### 8.5 A11y Verification

1. Tab through the entire app — every interactive element must receive visible focus
2. Screen reader test (Windows Narrator or NVDA): navigate to Feed, hear "Problem feed" landmark; navigate to a problem, hear its title
3. Arrow keys on Feed → navigates between problems
4. Arrow keys on Dashboard tabs → cycles through tabs

---

## 9. Exit Conditions

- [ ] `npm run build` emits no chunk > 600 kB
- [ ] `vendor-charts` is a separate chunk (not in main bundle)
- [ ] `AnalyticsSkeleton` shown while charts chunk loads
- [ ] `manifest.json` present and valid (Chrome DevTools → Application → Manifest)
- [ ] Service worker registered and active in production build
- [ ] Offline: app loads from cache and shows friendly "You're offline" message
- [ ] Opening `#problem/[id]` URL directly shows the correct DeepDive screen
- [ ] Share button produces a valid deep link URL
- [ ] "Copy to clipboard" toast shows on desktop share
- [ ] New problems banner appears when `totalProblems` count increases
- [ ] Tapping banner calls `refresh()` and dismisses banner
- [ ] All icon-only buttons have `aria-label`
- [ ] Feed responds to `ArrowUp` / `ArrowDown` keyboard events
- [ ] Dashboard tabs respond to `ArrowLeft` / `ArrowRight` keyboard events
- [ ] DeepDive title receives focus on open
- [ ] BottomNav wrapped in `<nav aria-label="Main navigation">`

---

## 10. What This Doesn't Include (Deferred to 6B/6C)

| Item | Phase |
|------|-------|
| API rate limiting, CORS hardening | 6B |
| Docker, CI/CD pipeline | 6C |
| Full WCAG 2.1 AA audit | Post-6C |
| Push notifications for new problems | Post-6C |

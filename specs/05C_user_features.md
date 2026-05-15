# Spec 5C: User Features — Bookmarks, Notes, Search & Saved Views

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 5B (Dashboard Analytics) ✅
> **Produces:** Persistent bookmarks, user notes on cards, full-text search, and a "Saved" tab in the bottom nav

---

## 1. Purpose

The app currently lets you browse, filter, and deep-dive into problems — but there's **no way to save your work**. If you find a high-opportunity problem you want to revisit, you have to remember it. If you have an insight about a problem, there's nowhere to write it down.

This spec adds the **personal productivity layer**:
- **Bookmarks** — save cards for later; bookmark state persists across sessions
- **Notes** — add free-text notes to any problem card (stored in `localStorage`)
- **Search** — full-text search across problem titles, summaries, tags, and sectors
- **Saved tab** — a new bottom nav destination showing all your bookmarked cards

### Design Decision: localStorage-Only (No Auth)

All user data lives in `localStorage`. This keeps the spec self-contained with **zero backend changes** — no database migrations, no auth system, no session management. The tradeoff is data doesn't sync across devices, which is acceptable for a single-user intelligence tool.

If multi-user sync is needed later, the context layer we build here can swap its storage backend from `localStorage` to an API without touching any UI components.

---

## 2. Bookmarks

### 2.1 Current State

`DeepDive.tsx` already has:
- A `Bookmark` icon imported from `lucide-react` (line 5)
- A local `bookmarked` state (line 27): `const [bookmarked, setBookmarked] = useState(false)`

**Problem:** This resets on every mount. No persistence, no global awareness.

### 2.2 Architecture: BookmarksContext

```
BookmarksProvider (wraps App)
├── bookmarks: Set<string>          ← problem IDs
├── toggleBookmark(id: string)      ← add/remove
├── isBookmarked(id: string)        ← check
├── getBookmarkedProblems()         ← filtered list
└── Persistence: localStorage("pl_bookmarks")
```

### 2.3 Implementation

```tsx
// src/app/contexts/BookmarksContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface BookmarksContextType {
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  bookmarkCount: number;
}

const BookmarksContext = createContext<BookmarksContextType | null>(null);

const STORAGE_KEY = "pl_bookmarks";

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveBookmarks(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* quota exceeded — silent fail */ }
}

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => bookmarks.has(id), [bookmarks]);

  return (
    <BookmarksContext.Provider value={{
      bookmarks,
      toggleBookmark,
      isBookmarked,
      bookmarkCount: bookmarks.size,
    }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarksProvider");
  return ctx;
}
```

### 2.4 Integration Points

**`DeepDive.tsx`** — replace local state with context:
```tsx
// BEFORE:
const [bookmarked, setBookmarked] = useState(false);

// AFTER:
const { isBookmarked, toggleBookmark } = useBookmarks();
const bookmarked = isBookmarked(problemId);
// onClick: () => toggleBookmark(problemId)
```

**`ProblemFeed.tsx`** — show a small bookmark indicator on bookmarked cards:
```tsx
// On each card, if isBookmarked(problem.id):
// Show a tiny filled bookmark icon in the top-right corner
```

**`Dashboard.tsx`** — same small indicator on CompactCard for bookmarked items.

**`DesktopLayout.tsx`** — same indicator on the card list.

---

## 3. Notes

### 3.1 Architecture: NotesContext

```
NotesProvider (wraps App)
├── notes: Map<problemId, Note>
├── setNote(id: string, text: string)
├── getNote(id: string): string | undefined
├── deleteNote(id: string)
├── hasNote(id: string): boolean
└── Persistence: localStorage("pl_notes")
```

### 3.2 Implementation

```tsx
// src/app/contexts/NotesContext.tsx

interface Note {
  text: string;
  updatedAt: string;  // ISO timestamp
}

const STORAGE_KEY = "pl_notes";

// Same pattern as BookmarksContext:
// - Load from localStorage on mount
// - Save to localStorage on every change
// - Provide via context
```

### 3.3 Note Editor in DeepDive

Add a collapsible "My Notes" section at the bottom of the DeepDive view:

```
┌─────────────────────────────────┐
│  📝 My Notes                    │
│  ┌─────────────────────────────┐│
│  │ Auto-expanding textarea     ││
│  │ with auto-save on blur      ││
│  └─────────────────────────────┘│
│  Last saved: 2 min ago          │
└─────────────────────────────────┘
```

**Behavior:**
- Textarea with `placeholder="Add your notes about this problem..."`
- **Auto-save** on blur (when the user clicks away) — no save button needed
- Show "Saved ✓" indicator briefly after save
- `date-fns` `formatDistanceToNow()` for "Last saved" timestamp
- If note is empty and user hasn't typed anything, section shows collapsed with a "+" button

### 3.4 Note Indicator on Cards

On any card (Feed, Dashboard, Desktop) that has a note, show a small `📝` emoji or `FileText` icon next to the bookmark indicator. This gives visual feedback that you've already annotated this problem.

---

## 4. Search

### 4.1 Architecture

Search is **client-side only** — all problems are already loaded into the `ProblemsContext`. No backend endpoint needed.

```
SearchContext (optional — or just a local state in the search component)
├── query: string
├── results: Problem[]         ← filtered by text match
└── isSearchOpen: boolean
```

### 4.2 Search Logic

```tsx
// src/app/utils/search.ts

export function searchProblems(problems: Problem[], query: string): Problem[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return problems.filter(p => {
    const haystack = [
      p.title,
      p.painSummary,
      p.sector,
      p.description || "",
      p.rootCause || "",
      ...p.tags,
      ...p.painPoints,
      ...p.solutions,
      ...p.userType,
    ].join(" ").toLowerCase();

    return terms.every(term => haystack.includes(term));
  });
}
```

### 4.3 Search UI — Mobile/Tablet

The Dashboard header already has a `<Search>` icon button (line 178 in Dashboard.tsx). Wire it to open a full-screen search overlay:

```
┌─────────────────────────────────┐
│ ← 🔍 [ Search problems...    ] │  ← Auto-focused input
├─────────────────────────────────┤
│  3 results for "healthcare"     │
│                                 │
│  ┌─ CompactCard ──────────────┐ │
│  │ Rural Healthcare Access    │ │
│  └────────────────────────────┘ │
│  ┌─ CompactCard ──────────────┐ │
│  │ Mental Health Stigma       │ │
│  └────────────────────────────┘ │
│  ...                            │
├─────────────────────────────────┤
│  Recent searches (localStorage) │
│  • healthcare                   │
│  • fintech fraud                │
└─────────────────────────────────┘
```

**Components:**
```tsx
// src/app/components/SearchOverlay.tsx

interface SearchOverlayProps {
  onClose: () => void;
  onCardTap: (problemId: string) => void;
}

export function SearchOverlay({ onClose, onCardTap }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const { problems } = useProblems();
  const results = useMemo(() => searchProblems(problems, query), [problems, query]);
  const recentSearches = useRecentSearches(); // from localStorage

  // - AnimatePresence slide-up from bottom
  // - Input auto-focused on mount
  // - Debounced search (300ms)
  // - On submit: save to recent searches
  // - On card tap: close overlay, navigate to deep dive
}
```

### 4.4 Search UI — Desktop

On desktop, the search goes in the top bar of the `DesktopLayout`. Replace the existing search icon with an expandable search input:

```
┌──────────────────────────────────────────┐
│ ProblemLens   [🔍 Search problems... ]   │
│               ↑ Click to expand          │
└──────────────────────────────────────────┘
```

When active, results appear in a dropdown below the input (like a command palette). Clicking a result selects it in the main panel.

### 4.5 Recent Searches

Store the last 5 search queries in `localStorage("pl_recent_searches")`. Show them when the search input is focused but empty.

---

## 5. Saved Tab (Bottom Nav)

### 5.1 Purpose

Add a third tab to the bottom navigation: **Saved**. This shows all bookmarked problems in a clean list with note indicators.

### 5.2 BottomNav Update

```tsx
// BottomNav.tsx — update ITEMS:
const ITEMS = [
  { id: "feed" as const,      Icon: LayoutGrid, label: "Feed" },
  { id: "saved" as const,     Icon: Bookmark,   label: "Saved" },
  { id: "dashboard" as const, Icon: BarChart2,   label: "Dashboard" },
];
```

### 5.3 Saved Screen Component

```tsx
// src/app/components/SavedScreen.tsx

export function SavedScreen({ onCardTap }: { onCardTap: (id: string) => void }) {
  const { bookmarks } = useBookmarks();
  const { problems } = useProblems();
  const { hasNote } = useNotes();

  const saved = problems.filter(p => bookmarks.has(p.id));

  if (saved.length === 0) {
    return <EmptyBookmarks />;  // "Tap ★ on any problem to save it here"
  }

  return (
    <div>
      <h2>Saved ({saved.length})</h2>
      {saved.map(p => (
        <CompactCard
          key={p.id}
          problem={p}
          hasNote={hasNote(p.id)}
          onTap={() => onCardTap(p.id)}
        />
      ))}
    </div>
  );
}
```

### 5.4 App Shell Update

Update `App.tsx` to handle the new "saved" screen:

```tsx
type Tab = "feed" | "saved" | "dashboard";
type Screen =
  | { name: "feed" }
  | { name: "saved" }
  | { name: "dashboard" }
  | { name: "deepdive"; problemId: string; from: Tab };
```

### 5.5 Desktop Layout

On desktop, add a "Saved" section to the left sidebar navigation. When clicked, the main panel shows the saved list. The detail panel still shows DeepDive when a card is selected.

---

## 6. File Deliverables

| File | Action |
|------|--------|
| `app/src/app/contexts/BookmarksContext.tsx` | **Create** — bookmark state + localStorage persistence |
| `app/src/app/contexts/NotesContext.tsx` | **Create** — notes state + localStorage persistence |
| `app/src/app/components/SearchOverlay.tsx` | **Create** — full-screen mobile search |
| `app/src/app/components/SavedScreen.tsx` | **Create** — bookmarked cards list |
| `app/src/app/components/NoteEditor.tsx` | **Create** — auto-save textarea for DeepDive |
| `app/src/app/utils/search.ts` | **Create** — client-side full-text search |
| `app/src/app/App.tsx` | **Update** — add BookmarksProvider, NotesProvider, "saved" screen |
| `app/src/app/components/DeepDive.tsx` | **Update** — use BookmarksContext, add NoteEditor |
| `app/src/app/components/ProblemFeed.tsx` | **Update** — bookmark indicator on cards |
| `app/src/app/components/Dashboard.tsx` | **Update** — wire search icon, bookmark indicator |
| `app/src/app/components/DesktopLayout.tsx` | **Update** — Saved nav, search input, bookmark/note indicators |
| `app/src/app/components/BottomNav.tsx` | **Update** — add "Saved" tab |

---

## 7. Design Requirements

### 7.1 Bookmark Animation

When toggling a bookmark, animate the icon with a spring scale:

```tsx
<motion.div
  animate={{ scale: bookmarked ? [1, 1.3, 1] : 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  <Bookmark
    size={20}
    fill={bookmarked ? C.accent : "none"}
    color={bookmarked ? C.accent : C.textDim}
  />
</motion.div>
```

### 7.2 Search Overlay Transitions

- **Mobile:** Slide up from bottom with `motion.div initial={{ y: "100%" }}`
- **Desktop:** Fade-in dropdown with `motion.div initial={{ opacity: 0, y: -8 }}`

### 7.3 Note Editor Styling

```css
/* Auto-expanding textarea */
textarea {
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--text-primary);
  resize: none;
  min-height: 60px;
  width: 100%;
  transition: border-color 0.2s;
}
textarea:focus {
  border-color: var(--accent);
  outline: none;
}
```

### 7.4 Empty State for Saved Screen

```
┌─────────────────────────────────┐
│          ★                      │
│    No saved problems yet        │
│                                 │
│  Tap the bookmark icon on any   │
│  problem card to save it here   │
│  for quick access later.        │
└─────────────────────────────────┘
```

### 7.5 Card Indicators

On every card (Feed, Dashboard, Saved), show small indicators in the top-right:

```
┌────────────────────────────────┐
│ Healthcare        ★ 📝  8/10  │  ← bookmark + note indicators
│ Rural Healthcare Access Gap    │
│ ...                            │
└────────────────────────────────┘
```

- `★` filled = bookmarked (uses `C.accent` color)
- `📝` = has note (uses `C.textDim` color)
- Both are 14px, subtle, non-intrusive

---

## 8. Testing Strategy

### 8.1 Unit Tests (manual verification)

| Test | What It Validates |
|------|------------------|
| Bookmark toggles | Click bookmark → icon fills; click again → icon unfills |
| Bookmark persists | Bookmark a card → refresh page → card still bookmarked |
| Saved tab shows bookmarked | Bookmark 3 cards → Saved tab shows exactly 3 |
| Saved tab empty state | No bookmarks → shows empty state message |
| Note saves on blur | Type note → click away → reload → note still there |
| Note indicator shows | Add note to card → card shows 📝 indicator in feed |
| Search finds by title | Search "healthcare" → shows healthcare cards |
| Search finds by tag | Search "UPI" → shows cards tagged with UPI |
| Search multi-word | Search "healthcare rural" → shows intersection |
| Search no results | Search "xyzabc" → shows "No results" |
| Recent searches | Search "fintech" → close → reopen → "fintech" in recent |
| Desktop search | Click search bar → type → dropdown shows results |

### 8.2 Build Verification

```bash
cd app
npm run build
```

No backend changes — no backend tests needed for this spec.

---

## 9. Exit Conditions

- [ ] BookmarksContext persists bookmarks in localStorage
- [ ] DeepDive uses BookmarksContext (not local state)
- [ ] Bookmark icon animates with spring scale on toggle
- [ ] NotesContext persists notes in localStorage
- [ ] NoteEditor auto-saves on blur with "Saved ✓" indicator
- [ ] Note indicator (📝) visible on cards with notes
- [ ] Search overlay opens from Dashboard search icon (mobile)
- [ ] Search expands in top bar (desktop)
- [ ] Search matches title, summary, tags, sector, solutions
- [ ] Recent searches stored and displayed
- [ ] "Saved" tab added to BottomNav (3 tabs: Feed, Saved, Dashboard)
- [ ] Saved screen shows all bookmarked cards
- [ ] Saved screen empty state renders correctly
- [ ] Desktop sidebar has "Saved" navigation
- [ ] All features work in both dark and light theme
- [ ] `npm run build` passes with no errors

---

## 10. What This Doesn't Include (Future Work)

| Feature | Why Deferred |
|---------|-------------|
| **Auth / Login** | No multi-user need yet; adds significant complexity |
| **Cloud sync** | Requires user accounts; localStorage is fine for single-user |
| **Export bookmarks** | Nice-to-have; can be added as a simple JSON download later |
| **Collaborative notes** | Requires real-time sync infrastructure |

---

## 11. Architecture Diagram

```
App.tsx
├── ThemeProvider
├── ProblemsProvider (API fetch)
├── BookmarksProvider (localStorage)     ← NEW
├── NotesProvider (localStorage)         ← NEW
│
├── Mobile/Tablet
│   ├── ProblemFeed (★ 📝 indicators)
│   ├── Dashboard (search → SearchOverlay)
│   ├── SavedScreen                      ← NEW
│   ├── DeepDive (bookmark toggle + NoteEditor)
│   └── BottomNav (Feed | Saved | Dashboard)
│
└── Desktop
    ├── DesktopLayout
    │   ├── Sidebar (Feed | Saved | Dashboard nav)
    │   ├── SearchInput (top bar)        ← NEW
    │   ├── CardList (★ 📝 indicators)
    │   └── DeepDive (bookmark + NoteEditor)
```

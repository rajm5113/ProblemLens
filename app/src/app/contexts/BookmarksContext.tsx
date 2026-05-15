import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface BookmarksContextValue {
  bookmarks: Set<string>;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  bookmarkCount: number;
}

const STORAGE_KEY = "pl_bookmarks";

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveBookmarks(bookmarks: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks]));
  } catch {
    // Ignore quota or storage errors.
  }
}

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => bookmarks.has(id), [bookmarks]);

  const value = useMemo(
    () => ({
      bookmarks,
      toggleBookmark,
      isBookmarked,
      bookmarkCount: bookmarks.size,
    }),
    [bookmarks, isBookmarked, toggleBookmark]
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context) throw new Error("useBookmarks must be used within <BookmarksProvider>");
  return context;
}

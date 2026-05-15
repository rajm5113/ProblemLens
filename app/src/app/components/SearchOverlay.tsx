import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Bookmark, FileText, Search } from "lucide-react";
import { getScoreGradient, getSectorColor } from "../data/problems";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useNotes } from "../contexts/NotesContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";
import { loadRecentSearches, saveRecentSearch, searchProblems } from "../utils/search";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onCardTap: (problemId: string) => void;
}

export function SearchOverlay({ open, onClose, onCardTap }: SearchOverlayProps) {
  const { C } = useTheme();
  const { problems } = useProblems();
  const { isBookmarked } = useBookmarks();
  const { hasNote } = useNotes();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRecentSearches(loadRecentSearches());
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () => searchProblems(problems, debouncedQuery),
    [debouncedQuery, problems]
  );

  const commitSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecentSearches(saveRecentSearch(trimmed));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            backgroundColor: C.appBg,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: "56px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0 16px",
              borderBottom: `1px solid ${C.borderSubtle}`,
            }}
          >
            <button
              onClick={onClose}
              aria-label="Close search"
              style={{
                background: "none",
                border: "none",
                color: C.textPrimary,
                cursor: "pointer",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <div
              style={{
                flex: 1,
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "12px",
                border: `1px solid ${C.borderDefault}`,
                backgroundColor: C.cardBg,
                padding: "0 12px",
              }}
            >
              <Search size={16} color={C.textFaint} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitSearch(query);
                }}
                placeholder="Search problems..."
                aria-label="Search problems"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: C.textPrimary,
                  fontSize: "14px",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
            {debouncedQuery.trim() ? (
              <>
                <p style={{ color: C.textDim, fontSize: "13px", fontWeight: 500, margin: "0 0 14px 0" }}>
                  {results.length} result{results.length === 1 ? "" : "s"} for "{debouncedQuery.trim()}"
                </p>

                {results.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {results.map((problem) => (
                      <SearchResultCard
                        key={problem.id}
                        title={problem.title}
                        summary={problem.painSummary}
                        sector={problem.sector}
                        opportunityScore={problem.opportunityScore}
                        bookmarked={isBookmarked(problem.id)}
                        noted={hasNote(problem.id)}
                        onTap={() => {
                          commitSearch(debouncedQuery);
                          onCardTap(problem.id);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <NoSearchResults />
                )}
              </>
            ) : (
              <RecentSearches
                searches={recentSearches}
                onSelect={(value) => {
                  setQuery(value);
                  window.setTimeout(() => commitSearch(value), 0);
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RecentSearches({
  searches,
  onSelect,
}: {
  searches: string[];
  onSelect: (value: string) => void;
}) {
  const { C } = useTheme();
  if (searches.length === 0) {
    return (
      <p style={{ color: C.textDim, fontSize: "13px", margin: "4px 0 0 0" }}>
        Start typing to search across titles, sectors, pain points, and solutions.
      </p>
    );
  }

  return (
    <div>
      <p
        style={{
          color: C.textFaint,
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          margin: "0 0 12px 0",
        }}
      >
        Recent searches
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {searches.map((search) => (
          <button
            key={search}
            onClick={() => onSelect(search)}
            style={{
              height: "34px",
              padding: "0 12px",
              borderRadius: "999px",
              border: "1px solid transparent",
              backgroundColor: "transparent",
              color: C.textDim,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}

function NoSearchResults() {
  const { C } = useTheme();
  return (
    <div style={{ paddingTop: "36px", textAlign: "center" }}>
      <p style={{ color: C.textPrimary, fontSize: "16px", fontWeight: 600, margin: 0 }}>
        No results
      </p>
      <p style={{ color: C.textDim, fontSize: "13px", lineHeight: 1.5, margin: "8px 0 0 0" }}>
        Try a broader keyword or another combination of terms.
      </p>
    </div>
  );
}

function SearchResultCard({
  title,
  summary,
  sector,
  opportunityScore,
  bookmarked,
  noted,
  onTap,
}: {
  title: string;
  summary: string;
  sector: string;
  opportunityScore: number;
  bookmarked: boolean;
  noted: boolean;
  onTap: () => void;
}) {
  const { C } = useTheme();
  const sectorColor = getSectorColor(sector.toUpperCase());
  const gradient = getScoreGradient(opportunityScore);

  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "16px",
        border: `1px solid ${C.borderSubtle}`,
        backgroundColor: C.cardBg,
        padding: "16px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: `${sectorColor}22`,
            border: `1px solid ${sectorColor}44`,
            borderRadius: "6px",
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              color: sectorColor,
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {sector}
          </span>
          {bookmarked && <Bookmark size={14} color={C.accent} fill={C.accent} />}
          {noted && <FileText size={14} color={C.textDim} />}
        </div>
        <div
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            borderRadius: "20px",
            padding: "4px 10px",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {opportunityScore}/10
        </div>
      </div>

      <p style={{ color: C.textPrimary, fontSize: "15px", fontWeight: 600, margin: "12px 0 0 0" }}>
        {title}
      </p>
      <p
        style={{
          color: C.textMuted,
          fontSize: "13px",
          lineHeight: 1.45,
          margin: "6px 0 0 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {summary}
      </p>
    </button>
  );
}

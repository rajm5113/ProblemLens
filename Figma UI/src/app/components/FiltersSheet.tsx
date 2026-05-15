import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin } from "lucide-react";
import { PROBLEMS } from "../data/problems";
import { T } from "../tokens";
import { useTheme } from "../contexts/ThemeContext";

/* ── Types ── */
export interface FilterState {
  sectors: string[];
  geography: string;
  aiSolvableOnly: boolean;
  minOpportunity: number;
}

export const DEFAULT_FILTERS: FilterState = {
  sectors: [],
  geography: "India",
  aiSolvableOnly: false,
  minOpportunity: 1,
};

export function isFilterActive(f: FilterState): boolean {
  return (
    f.sectors.length > 0 ||
    (f.geography !== "India" && f.geography.trim() !== "") ||
    f.aiSolvableOnly ||
    f.minOpportunity > 1
  );
}

export function countMatchingProblems(f: FilterState): number {
  return PROBLEMS.filter((p) => {
    if (f.sectors.length > 0) {
      const sectorLower = p.sector.toLowerCase();
      const matches = f.sectors.some((s) => sectorLower.includes(s.toLowerCase()));
      if (!matches) return false;
    }
    if (
      f.geography.trim() !== "" &&
      f.geography.trim().toLowerCase() !== "india" &&
      !p.geography.toLowerCase().includes(f.geography.trim().toLowerCase())
    ) {
      return false;
    }
    if (f.aiSolvableOnly && p.scores.aiFeasibility < 7) return false;
    if (p.opportunityScore < f.minOpportunity) return false;
    return true;
  }).length;
}

/* ── Sector chips data ── */
const SECTOR_CHIPS = [
  { label: "Healthcare",      color: T.sector.healthcare  },
  { label: "Fintech",         color: T.sector.fintech     },
  { label: "Education",       color: T.sector.education   },
  { label: "Agriculture",     color: T.sector.agriculture },
  { label: "GovTech",         color: T.sector.govtech     },
  { label: "CleanTech",       color: T.sector.cleantech   },
  { label: "Employment",      color: T.sector.employment  },
  { label: "Creator Economy", color: T.sector.creator     },
  { label: "Retail",          color: T.sector.retail      },
  { label: "Technology",      color: T.sector.technology  },
];

/* ── Props ── */
interface FiltersSheetProps {
  open: boolean;
  initialFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onDismiss: () => void;
}

export function FiltersSheet({ open, initialFilters, onApply, onDismiss }: FiltersSheetProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const resultCount = countMatchingProblems(filters);
  const noResults = resultCount === 0;
  const { C } = useTheme();

  /* Sync initial filters when sheet opens */
  useEffect(() => {
    if (open) setFilters(initialFilters);
  }, [open]);

  /* Drag-to-dismiss */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragY = useRef(0);

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  const toggleSector = (label: string) => {
    setFilters((f) => ({
      ...f,
      sectors: f.sectors.includes(label)
        ? f.sectors.filter((s) => s !== label)
        : [...f.sectors, label],
    }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dim overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onDismiss}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
              zIndex: 30,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.25 }}
            onDrag={(_, info) => { dragY.current = info.offset.y; }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 400) {
                onDismiss();
              }
            }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "87%",
              backgroundColor: C.appBg,
              borderRadius: "24px 24px 0 0",
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              touchAction: "none",
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: "12px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "4px",
                  backgroundColor: C.textFaint,
                  borderRadius: "2px",
                }}
              />
            </div>

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 20px 0",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: C.textPrimary,
                  fontSize: "22px",
                  fontWeight: 700,
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                }}
              >
                Filters
              </span>
              <button
                onClick={handleReset}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.accent,
                  fontSize: "14px",
                  fontWeight: 500,
                  padding: "4px 0",
                }}
              >
                Reset
              </button>
            </div>

            {/* Scrollable content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "28px 20px 0",
                scrollbarWidth: "none",
                touchAction: "pan-y",
              }}
            >
              {/* SECTOR */}
              <SectionLabel>Sector</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "14px",
                }}
              >
                {SECTOR_CHIPS.map((chip) => {
                  const active = filters.sectors.includes(chip.label);
                  return (
                    <SectorChip
                      key={chip.label}
                      label={chip.label}
                      color={chip.color}
                      active={active}
                      onToggle={() => toggleSector(chip.label)}
                    />
                  );
                })}
              </div>

              {/* GEOGRAPHY */}
              <div style={{ marginTop: "28px" }}>
                <SectionLabel>Geography</SectionLabel>
                <GeographyInput
                  value={filters.geography}
                  onChange={(v) => setFilters((f) => ({ ...f, geography: v }))}
                />
              </div>

              {/* AI-SOLVABLE TOGGLE */}
              <div style={{ marginTop: "28px" }}>
                <AISolvableToggle
                  value={filters.aiSolvableOnly}
                  onChange={(v) => setFilters((f) => ({ ...f, aiSolvableOnly: v }))}
                />
              </div>

              {/* OPPORTUNITY SLIDER */}
              <div style={{ marginTop: "28px", paddingBottom: "140px" }}>
                <SectionLabel>Min. Opportunity Score</SectionLabel>
                <OpportunitySlider
                  value={filters.minOpportunity}
                  onChange={(v) => setFilters((f) => ({ ...f, minOpportunity: v }))}
                />
              </div>
            </div>

            {/* Sticky Apply Button */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "0 20px 32px",
                background:
                   `linear-gradient(to bottom, transparent 0%, ${C.appBg} 30%)`,
                paddingTop: "24px",
                flexShrink: 0,
              }}
            >
              <motion.button
                whileTap={noResults ? {} : { scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={noResults ? undefined : handleApply}
                style={{
                  width: "100%",
                  height: "54px",
                  background: noResults
                    ? "rgba(128,128,144,0.3)"
                    : `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                  borderRadius: "14px",
                  border: "none",
                  cursor: noResults ? "not-allowed" : "pointer",
                  opacity: noResults ? 0.4 : 1,
                  boxShadow: noResults
                    ? "none"
                    : `0 4px 16px ${C.accentGlow}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "opacity 0.2s",
                }}
              >
                <span
                  style={{
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {noResults ? "No problems match" : "Apply Filters"}
                </span>
                {!noResults && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    ({resultCount} {resultCount === 1 ? "problem" : "problems"})
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Section Label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  const { C } = useTheme();
  return (
    <p
      style={{
        color: C.textFaint,
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "1px",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

/* ── Sector Chip ── */
function SectorChip({ label, color, active, onToggle }: { label: string; color: string; active: boolean; onToggle: () => void }) {
  const { C } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 1.05 }}
      transition={{ duration: 0.15 }}
      onClick={onToggle}
      style={{
        height: "38px",
        padding: "0 16px",
        borderRadius: "10px",
        border: active ? `1px solid ${color}` : `1px solid ${C.borderDefault}`,
        backgroundColor: active ? `${color}26` : "transparent",
        color: active ? color : C.textDim,
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </motion.button>
  );
}

/* ── Geography Input ── */
function GeographyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const { C } = useTheme();

  return (
    <div style={{ position: "relative", marginTop: "14px" }}>
      <div
        style={{
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          color: C.textFaint,
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <MapPin size={16} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="e.g., India, Maharashtra, Delhi"
        style={{
          width: "100%",
          height: "48px",
          backgroundColor: C.cardBg,
          border: focused ? `1px solid ${C.accent}` : `1px solid ${C.borderDefault}`,
          borderRadius: "12px",
          padding: "0 16px 0 42px",
          color: C.textPrimary,
          fontSize: "15px",
          fontWeight: 400,
          fontFamily: "'Inter', sans-serif",
          outline: "none",
          boxSizing: "border-box",
          boxShadow: focused ? `0 0 0 2px ${C.accentGlow}` : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      />
    </div>
  );
}

/* ── AI-Solvable Toggle ── */
function AISolvableToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { C } = useTheme();
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
    >
      <div>
        <p style={{ color: C.textPrimary, fontSize: "15px", fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
          AI-Solvable Only
        </p>
        <p style={{ color: C.textDim, fontSize: "12px", fontWeight: 400, margin: "3px 0 0 0", lineHeight: 1.4 }}>
          Show problems with AI Feasibility ≥ 7
        </p>
      </div>
      <div
        style={{
          width: "50px",
          height: "28px",
          borderRadius: "14px",
          backgroundColor: value ? C.accent : C.toggleOff,
          position: "relative",
          flexShrink: 0,
          transition: "background-color 0.2s ease-in-out",
        }}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            position: "absolute",
            top: "2px",
            width: "24px",
            height: "24px",
            borderRadius: "12px",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </div>
  );
}

/* ── Opportunity Slider ── */
function OpportunitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { C } = useTheme();

  const MIN = 1;
  const MAX = 10;
  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  const getValueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pos * (MAX - MIN) + MIN);
    },
    [value]
  );

  const showBubbleTemporarily = () => {
    setShowBubble(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowBubble(false), 1200);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setShowBubble(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const newVal = getValueFromClientX(e.clientX);
    onChange(newVal);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newVal = getValueFromClientX(e.clientX);
    onChange(newVal);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    showBubbleTemporarily();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Track area with thumb */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "relative",
          height: "44px",
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "4px",
            backgroundColor: C.scoreCardBg,
            borderRadius: "2px",
          }}
        />
        {/* Track fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            height: "4px",
            background: `linear-gradient(90deg, ${C.accent}, ${C.accentDark})`,
            borderRadius: "2px",
            transition: isDragging ? "none" : "width 0.1s",
          }}
        />

        {/* Value bubble */}
        <AnimatePresence>
          {(showBubble || isDragging) && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                left: `calc(${pct}% - 18px)`,
                bottom: "34px",
                backgroundColor: C.accent,
                borderRadius: "8px",
                padding: "4px 10px",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              <span style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: 700 }}>{value}</span>
              <div
                style={{
                  position: "absolute",
                  bottom: "-5px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `5px solid ${C.accent}`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thumb */}
        <motion.div
          animate={{ scale: isDragging ? 1.15 : 1 }}
          transition={{ duration: 0.1 }}
          style={{
            position: "absolute",
            left: `calc(${pct}% - 12px)`,
            width: "24px",
            height: "24px",
            borderRadius: "12px",
            backgroundColor: "#FFFFFF",
            border: `2px solid ${C.accent}`,
            boxShadow: isDragging ? "0 4px 16px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Scale markers */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        <span style={{ color: "#505060", fontSize: "11px" }}>1</span>
        <span style={{ color: "#505060", fontSize: "11px" }}>10</span>
      </div>
    </div>
  );
}
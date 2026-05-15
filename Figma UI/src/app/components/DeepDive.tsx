import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  Bookmark,
  Share2,
  User,
  MapPin,
  RefreshCw,
  Link,
  CheckCircle,
} from "lucide-react";
import { PROBLEMS, getSectorColor, getScoreGradient, getBarColor } from "../data/problems";
import { useTheme } from "../contexts/ThemeContext";

interface DeepDiveProps {
  problemId: number;
  onBack: () => void;
  /** Desktop mode: hides the back button; shows only bookmark + share. */
  hideBack?: boolean;
}

export function DeepDive({ problemId, onBack, hideBack = false }: DeepDiveProps) {
  const problem = PROBLEMS.find((p) => p.id === problemId) || PROBLEMS[0];
  const [bookmarked, setBookmarked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { C, theme } = useTheme();

  const sectorColor = getSectorColor(problem.sector.toUpperCase());
  const scoreGradient = getScoreGradient(problem.opportunityScore);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Reset scroll to top whenever a new problem loads
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    setScrolled(false);
  }, [problemId]);

  const metaTags = [
    { icon: <User size={11} />, text: problem.userType.join(", ") },
    { icon: <MapPin size={11} />, text: problem.geography },
    { icon: <RefreshCw size={11} />, text: problem.frequency },
    { icon: <Link size={11} />, text: problem.source },
    { icon: <CheckCircle size={11} />, text: problem.confidence },
  ];

  const scoreGrid = [
    { label: "SEVERITY", value: problem.scores.severity, invert: false },
    { label: "MARKET POTENTIAL", value: problem.scores.marketPotential, invert: false },
    { label: "AI FEASIBILITY", value: problem.scores.aiFeasibility, invert: false },
    { label: "COMPETITION", value: problem.scores.competition, invert: true },
  ];

  const confidenceColors: Record<string, string> = {
    High: "#00E676",
    Medium: "#FFB300",
    Low: "#FF5252",
  };
  const confColor = confidenceColors[problem.confidence] || "#00E676";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: C.appBg,
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          height: "56px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: hideBack ? "16px" : "4px",
          paddingRight: "16px",
          backgroundColor: scrolled
            ? (theme === "dark" ? "rgba(13,13,26,0.88)" : "rgba(241,245,249,0.92)")
            : C.appBg,
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid transparent",
          transition: "background-color 0.2s, border-color 0.2s",
          zIndex: 20,
        }}
      >
        {/* Back — hidden on desktop */}
        {!hideBack && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              color: C.textPrimary,
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Title — hidden on desktop */}
        {!hideBack && (
          <span
            style={{
              color: C.textPrimary,
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Problem Details
          </span>
        )}

        {/* Spacer so icons push right when back is hidden */}
        {hideBack && <div style={{ flex: 1 }} />}

        {/* Action icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <motion.button
            onClick={() => setBookmarked((b) => !b)}
            whileTap={{ scale: 1.25 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              color: bookmarked ? C.accent : C.textDim,
            }}
          >
            <Bookmark size={20} fill={bookmarked ? "#00E676" : "none"} />
          </motion.button>

          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              color: C.textDim,
            }}
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {/* Hero Section */}
        <div style={{ padding: "24px 20px 0" }}>
          {/* Sector Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: `${sectorColor}22`,
              border: `1px solid ${sectorColor}44`,
              borderRadius: "8px",
              padding: "6px 12px",
            }}
          >
            <span
              style={{
                color: sectorColor,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {problem.sector}
            </span>
          </div>

          {/* Problem Title */}
          <h1
            style={{
              color: C.textPrimary,
              fontSize: "24px",
              fontWeight: 700,
              lineHeight: 1.35,
              marginTop: "16px",
              margin: "16px 0 0 0",
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            {problem.title}
          </h1>

          {/* Metadata Tags */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            {metaTags.map((tag, i) => (
              <div
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  border: `1px solid ${C.borderDefault}`,
                  borderRadius: "8px",
                  padding: "6px 10px",
                  backgroundColor: "transparent",
                }}
              >
                <span style={{ color: C.textFaint, display: "flex", alignItems: "center" }}>
                  {tag.icon}
                </span>
                <span
                  style={{
                    color: C.textFaint,
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  {tag.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <Divider />

        {/* Scores Dashboard */}
        <div style={{ padding: "0 20px" }}>
          <SectionHeading>Scores</SectionHeading>

          {/* 2×2 Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {scoreGrid.map((item, i) => (
              <ScoreCard
                key={item.label}
                label={item.label}
                value={item.value}
                invert={item.invert}
                delay={i * 100}
              />
            ))}
          </div>

          {/* Opportunity Score Bar */}
          <OpportunityBar score={problem.opportunityScore} gradient={scoreGradient} />
        </div>

        <Divider />

        {/* Pain Points */}
        <div style={{ padding: "0 20px" }}>
          <SectionHeading>Pain Points</SectionHeading>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {problem.painPoints.map((point, i) => (
              <BulletItem key={i} text={point} color="#FF5252" />
            ))}
          </div>
        </div>

        <Divider />

        {/* Solutions */}
        <div style={{ padding: "0 20px" }}>
          <SectionHeading>Possible Solutions</SectionHeading>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {problem.solutions.map((sol, i) => (
              <BulletItem key={i} text={sol} color="#00E676" />
            ))}
          </div>
        </div>

        <Divider />

        {/* Source & Confidence Footer */}
        <div style={{ padding: "0 20px", paddingBottom: "40px" }}>
          <div
            style={{
              backgroundColor: C.scoreCardBg,
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            {/* Source Row */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span style={{ color: C.textDim, fontSize: "11px", fontWeight: 500, paddingTop: "1px" }}>
                Source
              </span>
              <span
                style={{
                  color: C.textPrimary,
                  fontSize: "13px",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  textAlign: "right",
                  maxWidth: "220px",
                }}
              >
                {problem.source}
              </span>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                backgroundColor: C.borderSubtle,
                marginBottom: "12px",
              }}
            />

            {/* Confidence Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: C.textDim, fontSize: "11px", fontWeight: 500 }}>
                Confidence
              </span>
              <div
                style={{
                  backgroundColor: `${confColor}26`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                }}
              >
                <span
                  style={{
                    color: confColor,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.3px",
                  }}
                >
                  {problem.confidence}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Divider() {
  const { C } = useTheme();
  return (
    <div style={{ height: "32px", display: "flex", alignItems: "center", padding: "0 20px" }}>
      <div style={{ height: "1px", width: "100%", backgroundColor: C.borderSubtle }} />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
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

function ScoreCard({
  label,
  value,
  invert,
  delay,
}: {
  label: string;
  value: number;
  invert: boolean;
  delay: number;
}) {
  const { C } = useTheme();
  const barColor = getBarColor(value, invert);
  const pct = (value / 10) * 100;

  return (
    <div
      style={{
        backgroundColor: C.cardBg,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <p
        style={{
          color: C.textDim,
          fontSize: "11px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.3px",
          margin: 0,
        }}
      >
        {label}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "2px", marginTop: "8px" }}>
        <span
          style={{
            color: C.textPrimary,
            fontSize: "32px",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span style={{ color: C.textFaint, fontSize: "16px", fontWeight: 400 }}>/10</span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: "4px",
          backgroundColor: C.scoreCardBg,
          borderRadius: "2px",
          marginTop: "10px",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: delay / 1000 }}
          style={{
            height: "100%",
            backgroundColor: barColor,
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
}

function OpportunityBar({
  score,
  gradient,
}: {
  score: number;
  gradient: { from: string; to: string };
}) {
  return (
    <div
      style={{
        marginTop: "12px",
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        borderRadius: "14px",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
        }}
      >
        Opportunity Score
      </span>
      <span
        style={{
          color: "#FFFFFF",
          fontSize: "36px",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {score}
        <span style={{ fontSize: "18px", fontWeight: 400, opacity: 0.7 }}>/10</span>
      </span>
    </div>
  );
}

function BulletItem({ text, color }: { text: string; color: string }) {
  const { C } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
          marginTop: "6px",
        }}
      />
      <p
        style={{
          color: C.textMuted,
          fontSize: "15px",
          fontWeight: 400,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Bookmark,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Link,
  MapPin,
  RefreshCw,
  Share2,
  User,
} from "lucide-react";
import { formatAddedDate } from "../utils/dateFormat";
import { getBarColor, getScoreGradient, getSectorColor } from "../data/problems";
import { useBookmarks } from "../contexts/BookmarksContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useTheme } from "../contexts/ThemeContext";
import { clearDeepLink, setDeepLink } from "../utils/deepLink";
import { NoteEditor } from "./NoteEditor";

interface DeepDiveProps {
  problemId: string;
  onBack: () => void;
  hideBack?: boolean;
}

export function DeepDive({ problemId, onBack, hideBack = false }: DeepDiveProps) {
  const { problems } = useProblems();
  const { C, theme } = useTheme();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const problem = problems.find((item) => item.id === problemId) || problems[0];
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => setScrolled(element.scrollTop > 8);
    element.addEventListener("scroll", onScroll);
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    setScrolled(false);
    headingRef.current?.focus();
  }, [problemId]);

  useEffect(() => {
    setDeepLink(problemId);
    return () => clearDeepLink();
  }, [problemId]);

  if (!problem) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: C.appBg,
          color: C.textDim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        No problem selected
      </div>
    );
  }

  const bookmarked = isBookmarked(problem.id);
  const sectorColor = getSectorColor(problem.sector.toUpperCase());
  const scoreGradient = getScoreGradient(problem.opportunityScore);
  const metaTags = [
    { icon: <Calendar size={11} />, text: formatAddedDate(problem.createdAt) },
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
  const confidenceColor = confidenceColors[problem.confidence] || "#00E676";

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#problem/${encodeURIComponent(problemId)}`;
    const text = `Check out this problem opportunity: ${problem.title}`;

    if (navigator.share) {
      await navigator.share({ title: problem.title, text, url }).catch(() => {});
      return;
    }

    await navigator.clipboard.writeText(url).catch(() => {});
    toast("Link copied to clipboard!");
  };

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
            ? theme === "dark"
              ? "rgba(13,13,26,0.88)"
              : "rgba(241,245,249,0.92)"
            : C.appBg,
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
          transition: "background-color 0.2s, border-color 0.2s",
          zIndex: 20,
        }}
      >
        {!hideBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
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

        {!hideBack && (
          <span style={{ color: C.textPrimary, fontSize: "16px", fontWeight: 600, lineHeight: 1.2 }}>
            Problem Details
          </span>
        )}

        {hideBack && <div style={{ flex: 1 }} />}

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <motion.button
            onClick={() => toggleBookmark(problem.id)}
            whileTap={{ scale: 1.15 }}
            transition={{ duration: 0.2 }}
            aria-label={bookmarked ? "Remove bookmark" : "Save problem"}
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
            <motion.div
              initial={false}
              animate={{ scale: bookmarked ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Bookmark size={20} fill={bookmarked ? C.accent : "none"} />
            </motion.div>
          </motion.button>

          <button
            onClick={() => {
              void handleShare();
            }}
            aria-label="Share this problem"
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

        <div style={{ padding: "24px 20px 0" }}>
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

          <h1
            ref={headingRef}
            tabIndex={-1}
            style={{
              color: C.textPrimary,
              fontSize: "24px",
              fontWeight: 700,
              lineHeight: 1.35,
              margin: "16px 0 0 0",
              fontFamily: "'Outfit', 'Inter', sans-serif",
              outline: "none",
            }}
          >
            {problem.title}
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
            {metaTags.map((tag, index) => (
              <div
                key={index}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  border: `1px solid ${C.borderDefault}`,
                  borderRadius: "8px",
                  padding: "6px 10px",
                }}
              >
                <span style={{ color: C.textFaint, display: "flex", alignItems: "center" }}>{tag.icon}</span>
                <span style={{ color: C.textFaint, fontSize: "11px", fontWeight: 500 }}>{tag.text}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div style={{ padding: "0 20px" }}>
          <SectionHeading>Scores</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {scoreGrid.map((item, index) => (
              <ScoreCard
                key={item.label}
                label={item.label}
                value={item.value}
                invert={item.invert}
                delay={index * 100}
              />
            ))}
          </div>
          <OpportunityBar score={problem.opportunityScore} gradient={scoreGradient} />
        </div>

        <Divider />

        <div style={{ padding: "0 20px" }}>
          <SectionHeading>Pain Points</SectionHeading>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {problem.painPoints.map((point, index) => (
              <BulletItem key={index} text={point} color="#FF5252" />
            ))}
          </div>
        </div>

        <Divider />

        <div style={{ padding: "0 20px" }}>
          <SectionHeading>Possible Solutions</SectionHeading>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {problem.solutions.map((solution, index) => (
              <BulletItem key={index} text={solution} color="#00E676" />
            ))}
          </div>
        </div>

        <Divider />

        <div style={{ padding: "0 20px" }}>
          <NoteEditor problemId={problem.id} />
        </div>

        <Divider />

        <div style={{ padding: "0 20px", paddingBottom: "40px" }}>
          <div
            style={{
              backgroundColor: C.scoreCardBg,
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: "12px",
              padding: "16px",
            }}
          >
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

            <div style={{ height: "1px", backgroundColor: C.borderSubtle, marginBottom: "12px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: C.textDim, fontSize: "11px", fontWeight: 500 }}>Confidence</span>
              <div
                style={{
                  backgroundColor: `${confidenceColor}26`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                }}
              >
                <span
                  style={{
                    color: confidenceColor,
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
        <span style={{ color: C.textPrimary, fontSize: "32px", fontWeight: 700, lineHeight: 1 }}>{value}</span>
        <span style={{ color: C.textFaint, fontSize: "16px", fontWeight: 400 }}>/10</span>
      </div>
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
          style={{ height: "100%", backgroundColor: barColor, borderRadius: "2px" }}
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
      <span style={{ color: "#FFFFFF", fontSize: "36px", fontWeight: 700, lineHeight: 1 }}>
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
      <p style={{ color: C.textMuted, fontSize: "15px", fontWeight: 400, lineHeight: 1.6, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

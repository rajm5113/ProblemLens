import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "./LogoMark";

interface OnboardingProps {
  onComplete: () => void;
}

/* ══════════════════════════════════════════════════════════
   SPLASH SCREEN
══════════════════════════════════════════════════════════ */
function SplashScreen() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0D0D1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <LogoMark size={64} />
        <p
          style={{
            color: "#FFFFFF",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            fontFamily: "'Outfit', 'Inter', sans-serif",
            margin: "12px 0 0 0",
          }}
        >
          ProblemLens
        </p>
        <p
          style={{
            color: "#808090",
            fontSize: "14px",
            fontWeight: 400,
            margin: "8px 0 0 0",
          }}
        >
          Discover problems worth solving
        </p>
      </motion.div>

      {/* Pulsing loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        style={{
          position: "absolute",
          bottom: "60px",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ backgroundColor: ["#333345", "#606070", "#333345"] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.22,
              ease: "easeInOut",
            }}
            style={{ width: "6px", height: "6px", borderRadius: "50%" }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SLIDE 1 VISUAL — Signal Network
══════════════════════════════════════════════════════════ */
const SIGNAL_DOTS = [
  { x: 62,  y: 54,  color: "#26C6DA", r: 5, opacity: 0.85 },
  { x: 288, y: 68,  color: "#FFB300", r: 4, opacity: 0.8  },
  { x: 46,  y: 172, color: "#7C4DFF", r: 6, opacity: 0.75 },
  { x: 312, y: 148, color: "#66BB6A", r: 4, opacity: 0.8  },
  { x: 108, y: 296, color: "#26C6DA", r: 5, opacity: 0.7  },
  { x: 260, y: 272, color: "#FFB300", r: 4, opacity: 0.75 },
  { x: 160, y: 38,  color: "#EC407A", r: 4, opacity: 0.7  },
  { x: 222, y: 308, color: "#7C4DFF", r: 5, opacity: 0.65 },
  { x: 338, y: 234, color: "#26A69A", r: 3, opacity: 0.7  },
  { x: 86,  y: 128, color: "#66BB6A", r: 3, opacity: 0.65 },
  { x: 186, y: 80,  color: "#FFB300", r: 3, opacity: 0.6  },
];
const CENTER = { x: 188, y: 178 };
const CONNECTIONS = [[0,9],[1,3],[4,7],[2,9],[5,8],[3,8],[10,6],[10,1]];

function SignalNetworkVisual() {
  return (
    <div style={{ width: "375px", height: "340px", position: "relative", overflow: "hidden" }}>
      {/* Radial gradient bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 55% at 50% 52%, #0D1A14 0%, #0A0A14 100%)",
        }}
      />

      <svg
        width="375"
        height="340"
        viewBox="0 0 375 340"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Center glow */}
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={CENTER.x} cy={CENTER.y} rx={50} ry={50} fill="url(#centerGlow)" />

        {/* Lines: dot-to-dot */}
        {CONNECTIONS.map(([a, b], i) => {
          const d1 = SIGNAL_DOTS[a];
          const d2 = SIGNAL_DOTS[b];
          return (
            <line
              key={`cc-${i}`}
              x1={d1.x} y1={d1.y}
              x2={d2.x} y2={d2.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Lines: dot-to-center */}
        {SIGNAL_DOTS.map((d, i) => (
          <line
            key={`lc-${i}`}
            x1={d.x} y1={d.y}
            x2={CENTER.x} y2={CENTER.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.8}
            strokeDasharray="4 6"
          />
        ))}

        {/* Outer signal dots */}
        {SIGNAL_DOTS.map((d, i) => (
          <motion.circle
            key={`dot-${i}`}
            cx={d.x} cy={d.y} r={d.r}
            fill={d.color}
            opacity={d.opacity}
            animate={{ opacity: [d.opacity, d.opacity * 1.35, d.opacity] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Center focal ring 1 */}
        <motion.circle
          cx={CENTER.x} cy={CENTER.y} r={22}
          stroke="#00E676"
          strokeWidth={1}
          fill="none"
          opacity={0.25}
          animate={{ r: [20, 24, 20], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Center focal ring 2 */}
        <circle cx={CENTER.x} cy={CENTER.y} r={10} stroke="#00E676" strokeWidth={1} fill="none" opacity={0.5} />
        {/* Center dot */}
        <circle cx={CENTER.x} cy={CENTER.y} r={5} fill="#00E676" opacity={1} />
        <circle cx={CENTER.x} cy={CENTER.y} r={3} fill="#FFFFFF" opacity={0.9} />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SLIDE 2 VISUAL — Floating Intelligence Card
══════════════════════════════════════════════════════════ */
function FloatingCardVisual() {
  return (
    <div
      style={{
        width: "375px",
        height: "340px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "800px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,230,118,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Stacked card 3 (furthest) */}
      <div
        style={{
          position: "absolute",
          width: "240px",
          height: "148px",
          backgroundColor: "#111122",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.04)",
          transform: "perspective(800px) rotateY(-5deg) rotateX(3deg) translate(28px, 28px)",
          opacity: 0.25,
        }}
      />
      {/* Stacked card 2 */}
      <div
        style={{
          position: "absolute",
          width: "240px",
          height: "148px",
          backgroundColor: "#141426",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.05)",
          transform: "perspective(800px) rotateY(-5deg) rotateX(3deg) translate(14px, 14px)",
          opacity: 0.45,
        }}
      />

      {/* Main card — animated hover */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "240px",
          height: "148px",
          backgroundColor: "#1A1A2E",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.09)",
          transform: "perspective(800px) rotateY(-5deg) rotateX(3deg)",
          boxShadow: "0 8px 40px rgba(0,230,118,0.08), 0 4px 20px rgba(0,0,0,0.5)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Row 1: sector badge + score */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              backgroundColor: "rgba(38,198,218,0.15)",
              border: "1px solid rgba(38,198,218,0.3)",
              borderRadius: "5px",
              padding: "3px 8px",
            }}
          >
            <span style={{ color: "#26C6DA", fontSize: "8px", fontWeight: 700, letterSpacing: "0.5px" }}>
              HEALTHCARE
            </span>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #00E676, #00C853)",
              borderRadius: "10px",
              padding: "3px 8px",
            }}
          >
            <span style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>9/10</span>
          </div>
        </div>

        {/* Row 2: title bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{ height: "7px", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: "3px", width: "92%" }} />
          <div style={{ height: "7px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "3px", width: "76%" }} />
        </div>

        {/* Row 3: score bars */}
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
          {[
            { h: 22, color: "#00E676" },
            { h: 18, color: "#00C853" },
            { h: 26, color: "#00E676" },
            { h: 14, color: "#FFB300" },
          ].map((bar, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
              <div
                style={{
                  height: `${bar.h}px`,
                  backgroundColor: `${bar.color}99`,
                  borderRadius: "3px 3px 0 0",
                  border: `1px solid ${bar.color}44`,
                }}
              />
              <div style={{ height: "2px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "1px" }} />
            </div>
          ))}
        </div>

        {/* Row 4: tags */}
        <div style={{ display: "flex", gap: "5px" }}>
          {["India", "Very High"].map((tag) => (
            <div
              key={tag}
              style={{
                border: "1px solid #2A2A45",
                borderRadius: "4px",
                padding: "2px 6px",
              }}
            >
              <span style={{ color: "#606070", fontSize: "8px", fontWeight: 500 }}>{tag}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SLIDE 3 VISUAL — Mini Feed Mockup
══════════════════════════════════════════════════════════ */
function FeedMockupVisual() {
  return (
    <div
      style={{
        width: "375px",
        height: "340px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, rgba(0,230,118,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Phone screen frame */}
      <div
        style={{
          width: "210px",
          height: "290px",
          backgroundColor: "#0D0D1A",
          borderRadius: "22px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mini nav bar */}
        <div
          style={{
            height: "28px",
            backgroundColor: "#0D0D1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#FFFFFF", fontSize: "8px", fontWeight: 700 }}>ProblemLens</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#1A1A2E" }} />
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#1A1A2E" }} />
          </div>
        </div>

        {/* Exiting card (sliding up, fading) */}
        <motion.div
          initial={{ y: 0, opacity: 0.5 }}
          animate={{ y: -20, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: "32px",
            left: "8px",
            right: "8px",
            height: "220px",
            backgroundColor: "#1A1A2E",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <MiniCardContent
            sector="AGRICULTURE"
            sectorColor="#66BB6A"
            score="9/10"
            line1="Farmers receive inaccurate"
            line2="weather advisory data"
          />
        </motion.div>

        {/* Entering card (sliding up from below) */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, delay: 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "32px",
            left: "8px",
            right: "8px",
            height: "220px",
            backgroundColor: "#1A1A2E",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <MiniCardContent
            sector="HEALTHCARE"
            sectorColor="#26C6DA"
            score="9/10"
            line1="Rural ASHA workers lack"
            line2="digital tools for patient data"
          />
        </motion.div>

        {/* Bottom action zone */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "28px",
            backgroundColor: "#0D0D1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: i === 0 ? "14px" : "4px",
                height: "4px",
                borderRadius: "2px",
                backgroundColor: i === 0 ? "#FFFFFF" : "#303045",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCardContent({
  sector, sectorColor, score, line1, line2,
}: {
  sector: string; sectorColor: string; score: string; line1: string; line2: string;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            backgroundColor: `${sectorColor}22`,
            border: `1px solid ${sectorColor}44`,
            borderRadius: "4px",
            padding: "2px 6px",
          }}
        >
          <span style={{ color: sectorColor, fontSize: "6px", fontWeight: 700 }}>{sector}</span>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg,#00E676,#00C853)",
            borderRadius: "6px",
            padding: "2px 6px",
          }}
        >
          <span style={{ color: "#fff", fontSize: "7px", fontWeight: 700 }}>{score}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "6px" }}>
        <span style={{ color: "#FFFFFF", fontSize: "8px", fontWeight: 600 }}>{line1}</span>
        <span style={{ color: "#FFFFFF", fontSize: "8px", fontWeight: 600 }}>{line2}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: "4px" }}>
        {["India", "Very High"].map((t) => (
          <div key={t} style={{ border: "1px solid #2A2A45", borderRadius: "3px", padding: "1px 4px" }}>
            <span style={{ color: "#606070", fontSize: "6px", fontWeight: 500 }}>{t}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   SLIDE CONTENT
══════════════════════════════════════════════════════════ */
const SLIDES = [
  {
    visual: <SignalNetworkVisual />,
    headline: "Real Problems, Real People",
    subtext:
      "We collect pain points from forums, research, government reports, and communities — problems that real people actually face.",
  },
  {
    visual: <FloatingCardVisual />,
    headline: "Structured & Scored",
    subtext:
      "Every problem is analyzed, classified by sector, and scored on severity, market potential, AI feasibility, and opportunity.",
  },
  {
    visual: <FeedMockupVisual />,
    headline: "Find What's Worth Building",
    subtext:
      "Swipe through problems like news. Tap to dive deep. Filter by sector, geography, and AI-solvability.",
  },
];

/* ══════════════════════════════════════════════════════════
   PAGE DOTS
══════════════════════════════════════════════════════════ */
function PageDots({ count, active }: { count: number; active: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === active ? "16px" : "8px",
            height: "8px",
            backgroundColor: i === active ? "#00E676" : "#333345",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ borderRadius: "4px" }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CAROUSEL (SLIDES 0–3)
══════════════════════════════════════════════════════════ */
function SlideCarousel({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const dragX = useRef(0);

  const goTo = (next: number, d: 1 | -1) => {
    if (next < 0 || next > 3) return;
    setDir(d);
    setIndex(next);
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -60 && index < 3) goTo(index + 1, 1);
    else if (info.offset.x > 60 && index > 0) goTo(index - 1, -1);
  };

  const isCTA = index === 3;

  const slideVariants = {
    enter: (d: 1 | -1) => ({ x: d === 1 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: 1 | -1) => ({ x: d === 1 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0D0D1A",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Skip button — slides 0-2 */}
      <AnimatePresence>
        {!isCTA && (
          <motion.button
            key="skip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onComplete}
            style={{
              position: "absolute",
              top: "56px",
              right: "20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#808090",
              fontSize: "14px",
              fontWeight: 500,
              zIndex: 20,
              padding: "4px 0",
            }}
          >
            Skip
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.15 }}
        onDragEnd={handleDragEnd}
        style={{ width: "100%", height: "100%", cursor: "grab" }}
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            {isCTA ? (
              <CTASlide onComplete={onComplete} />
            ) : (
              <ContentSlide slide={SLIDES[index]} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Page dots — slides 0-2 */}
      <AnimatePresence>
        {!isCTA && (
          <motion.div
            key="dots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              bottom: "100px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 20,
            }}
          >
            <PageDots count={4} active={index} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next arrow — slides 0-1 */}
      <AnimatePresence>
        {index < 2 && (
          <motion.button
            key="next-arrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => goTo(index + 1, 1)}
            style={{
              position: "absolute",
              bottom: "96px",
              right: "28px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              zIndex: 20,
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowRight size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Content slide (slides 0–2) ── */
function ContentSlide({ slide }: { slide: (typeof SLIDES)[0] }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "560px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0D0D1A",
      }}
    >
      {/* Top visual zone */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", overflow: "hidden" }}>
        {slide.visual}
      </div>

      {/* Bottom text zone */}
      <div
        style={{
          flex: 1,
          padding: "40px 28px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: "26px",
            fontWeight: 700,
            lineHeight: 1.3,
            margin: 0,
            textAlign: "center",
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}
        >
          {slide.headline}
        </h2>
        <p
          style={{
            color: "#A0A0B0",
            fontSize: "15px",
            fontWeight: 400,
            lineHeight: 1.6,
            margin: "14px 0 0 0",
            textAlign: "center",
          }}
        >
          {slide.subtext}
        </p>
      </div>
    </div>
  );
}

/* ── CTA slide (slide 3) ── */
function CTASlide({ onComplete }: { onComplete: () => void }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "560px",
        backgroundColor: "#0D0D1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
      }}
    >
      {/* Subtle bg glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(0,230,118,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        <LogoMark size={80} />

        <h2
          style={{
            color: "#FFFFFF",
            fontSize: "28px",
            fontWeight: 700,
            lineHeight: 1.3,
            margin: "20px 0 0 0",
            textAlign: "center",
            fontFamily: "'Outfit', 'Inter', sans-serif",
          }}
        >
          Ready to discover?
        </h2>

        <p
          style={{
            color: "#A0A0B0",
            fontSize: "15px",
            fontWeight: 400,
            margin: "12px 0 0 0",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Real problems. Real scores. Real opportunity.
        </p>

        {/* CTA Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
          onClick={onComplete}
          style={{
            marginTop: "40px",
            width: "280px",
            height: "56px",
            background: "linear-gradient(135deg, #00E676, #00C853)",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,230,118,0.3)",
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: "17px",
              fontWeight: 700,
            }}
          >
            Start Discovering
          </span>
        </motion.button>

        {/* Secondary link */}
        <button
          onClick={onComplete}
          style={{
            marginTop: "16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#808090",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          I'll explore on my own
        </button>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOT ONBOARDING COMPONENT
══════════════════════════════════════════════════════════ */
export function Onboarding({ onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<"splash" | "slides">("splash");

  // Auto-advance splash → slides after 2s
  useEffect(() => {
    const t = setTimeout(() => setPhase("slides"), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0D0D1A",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <AnimatePresence mode="wait">
        {phase === "splash" ? (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <SplashScreen />
          </motion.div>
        ) : (
          <motion.div
            key="slides"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <SlideCarousel onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
interface LogoMarkProps {
  size?: number;
}

/** Geometric lens/compass mark — the ProblemLens brand icon. */
export function LogoMark({ size = 64 }: LogoMarkProps) {
  const s = size;
  const cx = s / 2;
  const r1 = s * 0.44;
  const r2 = s * 0.28;
  const r3 = s * 0.07;
  const gap = s * 0.28;
  const sw1 = s * 0.031;
  const sw2 = s * 0.024;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      {/* Outer ring */}
      <circle cx={cx} cy={cx} r={r1} stroke="#00E676" strokeWidth={sw1} opacity={0.35} />
      {/* Inner ring */}
      <circle cx={cx} cy={cx} r={r2} stroke="#00E676" strokeWidth={sw2} opacity={0.6} />
      {/* Center dot */}
      <circle cx={cx} cy={cx} r={r3} fill="#00E676" />
      {/* Crosshair ticks */}
      <line x1={cx} y1={s * 0.06} x2={cx} y2={cx - gap} stroke="#00E676" strokeWidth={sw2} strokeLinecap="round" opacity={0.5} />
      <line x1={cx} y1={cx + gap} x2={cx} y2={s * 0.94} stroke="#00E676" strokeWidth={sw2} strokeLinecap="round" opacity={0.5} />
      <line x1={s * 0.06} y1={cx} x2={cx - gap} y2={cx} stroke="#00E676" strokeWidth={sw2} strokeLinecap="round" opacity={0.5} />
      <line x1={cx + gap} y1={cx} x2={s * 0.94} y2={cx} stroke="#00E676" strokeWidth={sw2} strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

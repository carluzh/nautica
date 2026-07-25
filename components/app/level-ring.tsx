/** Compact XP ring with the current level centered inside it. */
export function LevelRing({
  level,
  progress,
  size = 36,
}: {
  level: number;
  progress: number;
  size?: number;
}) {
  const R = 15.5;
  const C = 2 * Math.PI * R;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth={3} className="stroke-primary/15" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span
        className="tnum absolute font-semibold leading-none"
        style={{ fontSize: Math.round(size * 0.34) }}
      >
        {level}
      </span>
    </span>
  );
}

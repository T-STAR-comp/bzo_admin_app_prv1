export function Logo({
  className = "",
  light = false,
  compact = false,
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        className="h-12 w-12 shrink-0 sm:h-14 sm:w-14 md:h-16 md:w-16"
        aria-hidden
      >
        <rect x="2" y="2" width="22" height="44" rx="2" fill="var(--ink)" />
        <rect x="24" y="2" width="22" height="44" rx="2" fill="var(--signal)" />
        <path
          d="M24 6 L30 22 L46 24 L30 26 L24 42 L18 26 L2 24 L18 22 Z"
          fill="var(--ivory)"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`text-xl font-bold tracking-tight sm:text-2xl md:text-3xl ${light ? "text-white" : "text-ink"}`}
        >
          BIAZO
        </span>
        {!compact && (
          <span
            className={`text-[11px] font-medium uppercase tracking-[0.18em] md:text-xs ${
              light ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            Traveling Agency
          </span>
        )}
      </div>
    </div>
  );
}

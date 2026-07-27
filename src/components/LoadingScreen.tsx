export function LoadingScreen({ label = "Loading", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${compact ? "py-16" : "min-h-[min(360px,50vh)] py-20"}`}
      role="status"
      aria-live="polite"
    >
      <div className="biazo-loader" aria-hidden>
        <div className="biazo-loader-orbit" />
        <div className="biazo-loader-plane">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-signal">
            <path d="M10.18 9.05 3 10.5l7.18 1.45 2.27 6.27 1.45-1.45-1.82-5.09 5.09-1.82-1.45-1.45-6.27 2.27z" />
          </svg>
        </div>
      </div>
      <p className="mt-6 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-3 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="biazo-loader-dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export function LoadingOverlay({ label = "Please wait" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/80 backdrop-blur-sm">
      <LoadingScreen label={label} compact />
    </div>
  );
}

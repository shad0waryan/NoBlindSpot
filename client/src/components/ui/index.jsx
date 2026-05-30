// ── Spinner ───────────────────────────────────
export const Spinner = ({ size = "md" }) => {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return (
    <div className={`${sizes[size]} border-2 border-brand-500 border-t-transparent rounded-full animate-spin`} />
  );
};

// ── Alert ─────────────────────────────────────
export const Alert = ({ type = "error", message, onDismiss }) => {
  if (!message) return null;
  const styles = {
    error:   "bg-red-500/10 border-red-500/30 text-red-400",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    info:    "bg-brand-500/10 border-brand-500/30 text-brand-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  };
  const icons = {
    error:   <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    success: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    info:    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    warning: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  };
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm font-body flex items-start gap-3 mb-3 ${styles[type]}`}>
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {icons[type]}
      </svg>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
};

// ── Progress Bar ──────────────────────────────
export const ProgressBar = ({ known = 0, partial = 0, total = 1 }) => {
  const safeTotal = Math.max(total, 1);
  const knownPct   = Math.round((known / safeTotal) * 100);
  const partialPct = Math.round((partial / safeTotal) * 100);
  const unknownPct = 100 - knownPct - partialPct;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-800 gap-0.5" title={`${knownPct}% known · ${partialPct}% partial · ${unknownPct}% unknown`}>
        {knownPct > 0 && (
          <div className="bg-emerald-500 transition-all duration-500 rounded-l-full" style={{ width: `${knownPct}%` }} />
        )}
        {partialPct > 0 && (
          <div className="bg-amber-500 transition-all duration-500" style={{ width: `${partialPct}%` }} />
        )}
        {unknownPct > 0 && (
          <div className="bg-slate-700 transition-all duration-500 rounded-r-full" style={{ width: `${unknownPct}%` }} />
        )}
      </div>
      <div className="flex gap-4 text-xs font-body text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {knownPct}% known
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          {partialPct}% partial
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
          {unknownPct}% to learn
        </span>
      </div>
    </div>
  );
};

// ── Progress Ring (Donut) ─────────────────────
export const ProgressRing = ({ known = 0, partial = 0, total = 1, size = 48 }) => {
  const safeTotal = Math.max(total, 1);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const knownFrac   = known / safeTotal;
  const partialFrac = partial / safeTotal;
  const unknownFrac = 1 - knownFrac - partialFrac;

  const knownLen   = knownFrac * circumference;
  const partialLen = partialFrac * circumference;
  const unknownLen = unknownFrac * circumference;

  const knownOffset   = 0;
  const partialOffset = knownLen;
  const unknownOffset = knownLen + partialLen;

  const pct = Math.round(((known + partial * 0.5) / safeTotal) * 100);

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={4} className="stroke-slate-800" />
        {/* Unknown */}
        {unknownLen > 0 && (
          <circle
            cx={center} cy={center} r={radius}
            fill="none" strokeWidth={4}
            className="stroke-slate-700"
            strokeDasharray={`${unknownLen} ${circumference - unknownLen}`}
            strokeDashoffset={-unknownOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        )}
        {/* Partial */}
        {partialLen > 0 && (
          <circle
            cx={center} cy={center} r={radius}
            fill="none" strokeWidth={4}
            className="stroke-amber-500"
            strokeDasharray={`${partialLen} ${circumference - partialLen}`}
            strokeDashoffset={-partialOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        )}
        {/* Known */}
        {knownLen > 0 && (
          <circle
            cx={center} cy={center} r={radius}
            fill="none" strokeWidth={4}
            className="stroke-emerald-500"
            strokeDasharray={`${knownLen} ${circumference - knownLen}`}
            strokeDashoffset={-knownOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        )}
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-400">{pct}%</span>
    </div>
  );
};

// ── Status Badge ──────────────────────────────
export const StatusBadge = ({ status }) => {
  const styles = {
    unknown: "bg-slate-700 text-slate-400 border-slate-600",
    partial: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    known:   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };
  const icons = { unknown: "○", partial: "◐", known: "●" };
  const labels = { unknown: "Unknown", partial: "Partial", known: "Known" };
  return (
    <span className={`text-xs font-display font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${styles[status]}`}>
      <span className="text-[10px]">{icons[status]}</span>
      {labels[status]}
    </span>
  );
};

// ── Empty State ───────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
    <div className="mb-4">{icon}</div>
    <h3 className="font-display font-semibold text-white text-lg mb-2">{title}</h3>
    <p className="text-slate-400 font-body text-sm max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

// ── Skeleton ──────────────────────────────────
export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-surface-hover ${className}`} />
);

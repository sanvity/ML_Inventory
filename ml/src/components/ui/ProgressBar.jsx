export default function ProgressBar({ pct = 0, color = 'var(--accent)', height = 5, animated = false, label }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>{label}</span>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div style={{ background: 'rgba(148,163,184,0.10)', borderRadius: 99, height, overflow: 'hidden' }}>
        <div style={{
          width: `${clamped}%`, height: '100%', borderRadius: 99,
          background: color,
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          ...(animated && clamped < 100 ? {
            backgroundImage: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s ease infinite',
          } : {}),
        }} />
      </div>
    </div>
  );
}

/** Circular progress indicator */
export function CircularProgress({ pct = 0, size = 56, strokeWidth = 4, color = 'var(--accent)', children }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(148,163,184,0.10)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      )}
    </div>
  );
}

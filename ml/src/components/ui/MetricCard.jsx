export default function MetricCard({ label, value, sub, icon, variant = 'default', trend, size = 'md' }) {
  const variants = {
    default: { border: 'rgba(148,163,184,0.08)', accent: '#94a3b8' },
    success: { border: 'rgba(16,185,129,0.25)',  accent: '#10b981' },
    warning: { border: 'rgba(245,158,11,0.25)',  accent: '#f59e0b' },
    error:   { border: 'rgba(244,63,94,0.25)',   accent: '#f43f5e' },
    accent:  { border: 'rgba(99,102,241,0.30)',  accent: '#818cf8' },
  };
  const v = variants[variant] || variants.default;
  const valueSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;

  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: `1px solid ${v.border}`,
      borderRadius: 12, padding: size === 'sm' ? '12px 14px' : '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 15, color: v.accent }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: valueSize, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {trend !== undefined && (
          <span style={{ fontSize: 12, color: trend >= 0 ? '#10b981' : '#f43f5e', fontWeight: 500 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</span>}
    </div>
  );
}

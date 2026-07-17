import { useState } from 'react';

const VARIANTS = {
  default: { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
  success: { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', border: 'rgba(16,185,129,0.25)' },
  warning: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  error:   { bg: 'rgba(244,63,94,0.12)',   text: '#f43f5e', border: 'rgba(244,63,94,0.25)'  },
  info:    { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', border: 'rgba(56,189,248,0.25)' },
  accent:  { bg: 'var(--accent-bg)',        text: 'var(--text-primary)', border: 'var(--accent-border)' },
};

export default function Badge({ label, variant = 'default', icon, size = 'sm', style = {} }) {
  const c = VARIANTS[variant] || VARIANTS.default;
  const sz = size === 'xs' ? { fontSize: 10, padding: '2px 6px' }
           : size === 'sm' ? { fontSize: 11, padding: '3px 8px' }
           :                 { fontSize: 12, padding: '4px 10px' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 99, fontWeight: 500, letterSpacing: '0.01em',
      whiteSpace: 'nowrap', ...sz, ...style,
    }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: sz.fontSize + 1 }} />}
      {label}
    </span>
  );
}

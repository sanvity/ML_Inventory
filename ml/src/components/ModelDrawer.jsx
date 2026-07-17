import { useEffect } from 'react';
import Badge from './ui/Badge.jsx';
import { SPEED_BADGE_STYLES } from '../data/modelRegistry.js';

const CAT_COLOR = {
  supervised:   '#FFE600',
  unsupervised: '#C4C4CD',
  timeseries:   '#747480',
  simulation:   '#5C768D',
};

export default function ModelDrawer({ model, onClose, onSelect }) {
  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!model) return null;

  const catColor = CAT_COLOR[model.category] || 'var(--accent)';
  const spd = SPEED_BADGE_STYLES[model.speed];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 998, animation: 'fadeIn 0.2s ease',
        backdropFilter: 'blur(2px)',
      }} />

      {/* Drawer panel */}
      <aside style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: '100%', maxWidth: 420,
        background: 'var(--bg-raised)',
        borderLeft: '1px solid var(--border-strong)',
        zIndex: 999, display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.28s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          background: `linear-gradient(135deg, ${catColor}10 0%, transparent 100%)`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `${catColor}20`, border: `1px solid ${catColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ti-${model.icon}`} style={{ fontSize: 22, color: catColor }} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {model.name}
                </h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                    background: spd.bg, color: spd.text, border: `1px solid ${spd.border}`,
                  }}>{model.badge}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: `${catColor}15`, color: catColor,
                    border: `1px solid ${catColor}25`, fontWeight: 500,
                    textTransform: 'capitalize',
                  }}>{model.category}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 6, borderRadius: 8, flexShrink: 0,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
              <i className="ti ti-x" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Description */}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
            {model.description}
          </p>

          {/* What it's good for */}
          <Section title="What it's good for" icon="check-circle" color={catColor}>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {model.goodFor.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                  <i className="ti ti-circle-dot" style={{ color: catColor, fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Pros */}
          <Section title="Strengths" icon="thumb-up" color="#10b981">
            {model.pros.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start', fontSize: 13 }}>
                <i className="ti ti-plus" style={{ color: '#10b981', fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>{p}</span>
              </div>
            ))}
          </Section>

          {/* Cons */}
          <Section title="Limitations" icon="thumb-down" color="#f43f5e">
            {model.cons.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start', fontSize: 13 }}>
                <i className="ti ti-minus" style={{ color: '#f43f5e', fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>{c}</span>
              </div>
            ))}
          </Section>

          {/* Data requirements */}
          <Section title="Data Requirements" icon="database" color="#38bdf8">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              {model.dataRequirements}
            </p>
          </Section>
        </div>

        {/* Footer CTA */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          flexShrink: 0, display: 'flex', gap: 10,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '1px solid var(--border-strong)',
            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}>
            Close
          </button>
          <button onClick={() => { onSelect(model); onClose(); }} style={{
            flex: 2, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: catColor, border: 'none',
            color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <i className="ti ti-check" style={{ fontSize: 14 }} />
            Select this model
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <div style={{
          width: 20, height: 20, borderRadius: 5,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ti-${icon}`} style={{ fontSize: 11, color }} />
        </div>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

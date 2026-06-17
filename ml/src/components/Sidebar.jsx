import { useState } from 'react';
import { MODELS_BY_CATEGORY, SPEED_BADGE_STYLES } from '../data/modelRegistry.js';
import Badge from './ui/Badge.jsx';

const CAT_COLOR = {
  supervised:   '#6366f1',
  unsupervised: '#10b981',
  timeseries:   '#f59e0b',
  simulation:   '#f43f5e',
};

export default function Sidebar({ onModelSelect, selectedModelIds = [], onClose }) {
  const [collapsed, setCollapsed]       = useState(false);
  const [query, setQuery]               = useState('');
  const [expandedCats, setExpandedCats] = useState({ supervised: true, unsupervised: false, timeseries: false, simulation: false });

  const toggle = cat => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }));

  const filterModel = m =>
    !query || m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.description.toLowerCase().includes(query.toLowerCase());

  return (
    <aside style={{
      width: collapsed ? 52 : 272,
      minWidth: collapsed ? 52 : 272,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s',
      overflow: 'hidden', height: '100vh', position: 'sticky', top: 0,
      zIndex: 10, flexShrink: 0,
    }}>

      {/* Sidebar header */}
      <div style={{
        padding: collapsed ? '14px 10px' : '16px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0,
      }}>
        <button onClick={() => setCollapsed(p => !p)} style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', padding: 4, borderRadius: 6,
          display: 'flex', flexShrink: 0,
          transition: 'color 0.15s',
        }}
          title={collapsed ? 'Expand Model Inventory' : 'Collapse sidebar'}>
          <i className={`ti ti-${collapsed ? 'layout-sidebar-right-expand' : 'layout-sidebar-left-collapse'}`}
            style={{ fontSize: 18 }} />
        </button>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Model Inventory
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              22 models across 4 categories
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: '10px 12px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              placeholder="Search models…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 8, fontSize: 12, borderRadius: 8 }}
            />
          </div>
        </div>
      )}

      {/* Model list */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '8px 6px' : '4px 8px 16px' }}>
        {Object.entries(MODELS_BY_CATEGORY).map(([catId, cat]) => {
          const filteredModels = cat.models.filter(filterModel);
          if (filteredModels.length === 0) return null;
          const catColor = CAT_COLOR[catId];
          const isExpanded = expandedCats[catId];

          if (collapsed) {
            return (
              <div key={catId} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => { setCollapsed(false); setExpandedCats(p => ({ ...p, [catId]: true })); }}
                  title={cat.label}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: catColor, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <i className={`ti ti-${cat.icon}`} style={{ fontSize: 18 }} />
                </button>
              </div>
            );
          }

          return (
            <div key={catId} style={{ marginBottom: 4 }}>
              {/* Category header */}
              <button
                onClick={() => toggle(catId)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--text-secondary)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ti-${cat.icon}`} style={{ fontSize: 13, color: catColor }} />
                </div>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, textAlign: 'left', color: 'var(--text-primary)' }}>
                  {cat.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>
                  {filteredModels.length}
                </span>
                <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`}
                  style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>

              {/* Model list */}
              {isExpanded && (
                <div style={{ paddingLeft: 6 }}>
                  {filteredModels.map(model => {
                    const isSelected = selectedModelIds?.includes(model.id);
                    const spd = SPEED_BADGE_STYLES[model.speed];
                    return (
                      <button
                        key={model.id}
                        onClick={() => onModelSelect(model)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 10px',
                          borderRadius: 8, border: `1px solid ${isSelected ? `${catColor}50` : 'transparent'}`,
                          background: isSelected ? `${catColor}12` : 'transparent',
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', gap: 3,
                          marginBottom: 1,
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className={`ti ti-${model.icon}`} style={{ fontSize: 13, color: catColor, flexShrink: 0 }} />
                            {model.name}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 99, flexShrink: 0,
                            background: spd.bg, color: spd.text, border: `1px solid ${spd.border}`,
                          }}>{model.badge}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35, paddingLeft: 18 }}>
                          {model.description.length > 70 ? model.description.slice(0, 68) + '…' : model.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {query && Object.values(MODELS_BY_CATEGORY).flatMap(c => c.models).filter(filterModel).length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
            <i className="ti ti-search-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            No models match "{query}"
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!collapsed && (
        <div style={{
          padding: '10px 14px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
        }}>
          <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
          Click any model for details. Select via Tab 1.
        </div>
      )}
    </aside>
  );
}

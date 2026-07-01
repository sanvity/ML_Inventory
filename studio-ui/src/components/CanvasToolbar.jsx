import React from 'react';

export default function CanvasToolbar({ selectedLayer, zoom, setZoom, layers }) {
  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    if (!selectedLayer) return ['Workspace'];
    const path = [];
    let current = selectedLayer;
    while (current) {
      path.unshift(current.name);
      current = layers.find(l => l.id === current.parentId);
    }
    path.unshift('Canvas');
    return path;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div style={{
      height: '38px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      backgroundColor: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0
    }}>
      {/* Left: Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <i className="ti ti-chevron-right" style={{ fontSize: '9px', color: 'var(--text-muted)' }}></i>
            )}
            <span style={{
              fontSize: '11px',
              color: idx === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: 500
            }}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Middle: Canvas Options (Active states) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary)',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }} title="Grid Settings">
          <i className="ti ti-grid-dots" style={{ fontSize: '12px' }}></i>
          <span style={{ fontSize: '10px' }}>22px</span>
        </button>
        <div style={{ width: '1px', height: '12px', backgroundColor: 'var(--border-subtle)' }} />
        <button style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary)',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }} title="Snap to Pixel Grid">
          <i className="ti ti-magnet" style={{ fontSize: '12px', color: '#FFD000' }}></i>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Pixel snap</span>
        </button>
      </div>

      {/* Right: Zoom Selector Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button 
          onClick={() => setZoom(Math.max(50, zoom - 25))}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            padding: '2px 6px',
            cursor: 'pointer'
          }}
        >
          <i className="ti ti-minus" style={{ fontSize: '10px' }}></i>
        </button>
        
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-hover)',
          padding: '2px 8px',
          borderRadius: '9999px',
          minWidth: '38px',
          textAlign: 'center'
        }}>
          {zoom}%
        </div>

        <button 
          onClick={() => setZoom(Math.min(200, zoom + 25))}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            padding: '2px 6px',
            cursor: 'pointer'
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: '10px' }}></i>
        </button>
      </div>
    </div>
  );
}

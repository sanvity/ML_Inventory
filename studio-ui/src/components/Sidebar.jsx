import React from 'react';

export default function Sidebar({ activeTool, setActiveTool }) {
  const tools = [
    { id: 'select', name: 'Select Tool', icon: 'ti-pointer' },
    { id: 'frame', name: 'Frame Tool', icon: 'ti-crop' },
    { id: 'rectangle', name: 'Rectangle Tool', icon: 'ti-square' },
    { id: 'text', name: 'Text Tool', icon: 'ti-typography' },
    { id: 'pen', name: 'Pen Tool', icon: 'ti-feather' }
  ];

  return (
    <aside style={{
      width: '46px',
      backgroundColor: 'var(--bg-raised)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: '8px',
      flexShrink: 0
    }}>
      {/* Top tools list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        {tools.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={tool.name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive ? '#FFD000' : 'transparent',
                color: isActive ? '#111111' : 'var(--text-disabled)',
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <i className={`ti ${tool.icon}`} style={{ fontSize: '16px' }}></i>
            </button>
          );
        })}
      </div>

      {/* Separator line */}
      <div style={{
        width: '20px',
        height: '1px',
        backgroundColor: 'var(--border-subtle)',
        margin: '6px 0'
      }} />

      {/* Bottom tools (like settings, help) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
        <button
          onClick={() => setActiveTool('settings')}
          title="Settings"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: activeTool === 'settings' ? '#FFD000' : 'transparent',
            color: activeTool === 'settings' ? '#111111' : 'var(--text-disabled)',
            transition: 'all 0.15s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (activeTool !== 'settings') {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTool !== 'settings') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <i className="ti ti-settings" style={{ fontSize: '16px' }}></i>
        </button>
      </div>
    </aside>
  );
}

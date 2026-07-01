import React from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function StatusBar({ activeTool, layers }) {
  const { theme } = useTheme();

  // List of mock collaborators
  const collaborators = [
    { name: 'Sarah Connor', init: 'SC', color: '#E28413' },
    { name: 'John Doe', init: 'JD', color: '#107E58' },
    { name: 'Ada Lovelace', init: 'AL', color: '#B33951' }
  ];

  return (
    <footer style={{
      height: '26px',
      backgroundColor: 'var(--bg-raised)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: '10px',
      color: 'var(--text-tertiary)',
      flexShrink: 0
    }}>
      {/* Left: Active Tool Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <i className="ti ti-activity" style={{ fontSize: '11px', color: '#FFD000' }}></i>
        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
          Tool: {activeTool}
        </span>
      </div>

      {/* Middle: Canvas Coordinates/Resolution & Layer Count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>Frame Size: <strong style={{ color: 'var(--text-primary)' }}>240 × 480 px</strong></span>
        <div style={{ width: '1px', height: '10px', backgroundColor: 'var(--border-subtle)' }} />
        <span>Layers: <strong style={{ color: 'var(--text-primary)' }}>{layers.length}</strong></span>
      </div>

      {/* Right: Collaborator Stack & Network status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Connection status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#107E58', // Online Green indicator
            display: 'inline-block'
          }}></span>
          <span>LiveSync</span>
        </div>

        <div style={{ width: '1px', height: '10px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Collaborators Avatar Stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {collaborators.map((col, idx) => (
            <div
              key={idx}
              title={col.name}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: col.color,
                color: '#FFFFFF',
                fontSize: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--bg-raised)',
                marginLeft: idx > 0 ? '-4px' : '0px',
                zIndex: collaborators.length - idx,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {col.init}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

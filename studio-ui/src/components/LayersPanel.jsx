import React from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function LayersPanel({ layers, selectedLayerId, setSelectedLayerId, toggleVisibility }) {
  const { theme } = useTheme();

  // Helper to get type icon class
  const getIconClass = (type) => {
    switch (type) {
      case 'canvas': return 'ti-box-multiple';
      case 'frame': return 'ti-device-mobile';
      case 'rectangle': return 'ti-square';
      case 'text': return 'ti-typography';
      case 'button': return 'ti-hand-finger';
      case 'badge': return 'ti-tag';
      default: return 'ti-square';
    }
  };

  return (
    <div style={{
      width: '210px',
      backgroundColor: 'var(--bg-raised)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%'
    }}>
      {/* Title */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Layers
        </span>
        <i className="ti ti-layers-subtract" style={{ fontSize: '12px', color: 'var(--text-muted)' }}></i>
      </div>

      {/* Layers list */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '6px 0'
      }}>
        {layers.map(layer => {
          const isSelected = selectedLayerId === layer.id;
          const indent = layer.depth * 12;

          // Compute selected row background & text colors based on design specifications
          let rowStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            cursor: 'pointer',
            borderLeft: '2px solid transparent',
            userSelect: 'none',
            transition: 'background-color 0.1s ease'
          };

          if (isSelected) {
            if (theme === 'dark') {
              rowStyle = {
                ...rowStyle,
                backgroundColor: '#1A1600',
                borderLeft: '2px solid #FFD000',
                color: '#FFD000'
              };
            } else {
              rowStyle = {
                ...rowStyle,
                backgroundColor: '#FFF8D0',
                borderLeft: '2px solid #FFD000',
                color: '#5A4800'
              };
            }
          } else {
            rowStyle = {
              ...rowStyle,
              color: 'var(--text-secondary)'
            };
          }

          return (
            <div
              key={layer.id}
              onClick={() => setSelectedLayerId(layer.id)}
              style={rowStyle}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Left side: Icon + Name (indented) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingLeft: `${indent}px`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexGrow: 1
              }}>
                <i className={`ti ${getIconClass(layer.type)}`} style={{
                  fontSize: '12px',
                  color: isSelected ? 'inherit' : 'var(--text-tertiary)',
                  flexShrink: 0
                }}></i>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {layer.name}
                </span>
              </div>

              {/* Right side: Action (visibility toggle) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(layer.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  color: layer.visible ? 'var(--text-tertiary)' : 'var(--text-disabled)',
                  opacity: layer.visible ? 0.6 : 1
                }}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                <i className={layer.visible ? 'ti ti-eye' : 'ti ti-eye-off'} style={{ fontSize: '11px' }}></i>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

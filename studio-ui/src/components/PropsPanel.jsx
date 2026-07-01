import React from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function PropsPanel({ selectedLayer, updateLayerProperty, onAlign }) {
  const { theme } = useTheme();

  if (!selectedLayer) {
    return (
      <div style={{
        width: '240px',
        backgroundColor: 'var(--bg-raised)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        color: 'var(--text-disabled)',
        fontSize: '11px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        <i className="ti ti-select" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
        Select a layer or element to edit its properties.
      </div>
    );
  }

  // Predefined swatches matching the brand guidelines
  const colorSwatches = [
    { name: 'Accent Yellow', value: '#FFD000' },
    { name: 'Brand Black', value: '#0D0D0D' },
    { name: 'Panel Grey', value: '#111111' },
    { name: 'Neutral Grey', value: '#888888' },
    { name: 'Plain White', value: '#FFFFFF' },
    { name: 'Beige Tint', value: '#FFF8D0' }
  ];

  const handleGeometryChange = (prop, val) => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed)) parsed = 0;
    updateLayerProperty(selectedLayer.id, prop, parsed);
  };

  const isTextElement = ['text', 'button', 'badge'].includes(selectedLayer.type);

  // Group styles
  const sectionTitleStyle = {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const inputGroupStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '14px'
  };

  const inputWrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '4px 6px',
    gap: '4px'
  };

  const labelStyle = {
    fontSize: '9px',
    color: 'var(--text-muted)',
    width: '12px',
    textAlign: 'center',
    fontWeight: 500
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '11px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Inter, sans-serif'
  };

  return (
    <div style={{
      width: '240px',
      backgroundColor: 'var(--bg-raised)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Header */}
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
          Properties
        </span>
        <span style={{
          fontSize: '9px',
          color: '#FFD000',
          backgroundColor: theme === 'dark' ? '#1A1600' : '#FFF8D0',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {selectedLayer.type.toUpperCase()}
        </span>
      </div>

      <div style={{ padding: '12px' }}>
        {/* Quick Alignments (if applicable to movable sub-items) */}
        {selectedLayer.id !== 'canvas' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionTitleStyle}>Alignment</div>
            <div style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '2px'
            }}>
              {[
                { action: 'left', icon: 'ti-align-left-2', title: 'Align Left' },
                { action: 'h-center', icon: 'ti-align-center-2', title: 'Align Center Horizontal' },
                { action: 'right', icon: 'ti-align-right-2', title: 'Align Right' },
                { action: 'top', icon: 'ti-align-top-2', title: 'Align Top' },
                { action: 'v-center', icon: 'ti-align-middle-2', title: 'Align Center Vertical' },
                { action: 'bottom', icon: 'ti-align-bottom-2', title: 'Align Bottom' }
              ].map(btn => (
                <button
                  key={btn.action}
                  onClick={() => onAlign(btn.action)}
                  title={btn.title}
                  style={{
                    flexGrow: 1,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 0',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className={`ti ${btn.icon}`} style={{ fontSize: '12px' }}></i>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout Coordinates */}
        {selectedLayer.id !== 'canvas' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionTitleStyle}>Geometry</div>
            <div style={inputGroupStyle}>
              <div style={inputWrapperStyle}>
                <span style={labelStyle}>X</span>
                <input
                  type="number"
                  value={selectedLayer.x ?? 0}
                  onChange={e => handleGeometryChange('x', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={inputWrapperStyle}>
                <span style={labelStyle}>Y</span>
                <input
                  type="number"
                  value={selectedLayer.y ?? 0}
                  onChange={e => handleGeometryChange('y', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <div style={inputWrapperStyle}>
                <span style={labelStyle}>W</span>
                <input
                  type="number"
                  value={selectedLayer.width ?? 0}
                  onChange={e => handleGeometryChange('width', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={inputWrapperStyle}>
                <span style={labelStyle}>H</span>
                <input
                  type="number"
                  value={selectedLayer.height ?? 0}
                  onChange={e => handleGeometryChange('height', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {selectedLayer.radius !== undefined && (
              <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Corner Radius</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{selectedLayer.radius}px</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={selectedLayer.radius}
                    onChange={e => updateLayerProperty(selectedLayer.id, 'radius', parseInt(e.target.value, 10))}
                    style={{
                      flexGrow: 1,
                      accentColor: '#FFD000',
                      cursor: 'pointer',
                      height: '3px'
                    }}
                  />
                  <input
                    type="number"
                    value={selectedLayer.radius}
                    onChange={e => updateLayerProperty(selectedLayer.id, 'radius', Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{
                      ...inputWrapperStyle,
                      width: '40px',
                      padding: '2px 4px',
                      fontSize: '10px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text values */}
        {isTextElement && (
          <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <div style={sectionTitleStyle}>Content & Text</div>
            <div style={{ ...inputWrapperStyle, marginBottom: '8px' }}>
              <input
                type="text"
                value={selectedLayer.text ?? ''}
                onChange={e => updateLayerProperty(selectedLayer.id, 'text', e.target.value)}
                placeholder="Text value..."
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Text Color</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={selectedLayer.textColor ?? '#000000'}
                  onChange={e => updateLayerProperty(selectedLayer.id, 'textColor', e.target.value)}
                  style={{
                    border: 'none',
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                  {selectedLayer.textColor}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Colors / Fills */}
        {selectedLayer.fill !== undefined && (
          <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <div style={sectionTitleStyle}>Fill Color</div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <input
                type="color"
                value={selectedLayer.fill.startsWith('#') ? selectedLayer.fill : '#FFD000'}
                onChange={e => updateLayerProperty(selectedLayer.id, 'fill', e.target.value)}
                style={{
                  border: 'none',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent'
                }}
              />
              <input
                type="text"
                value={selectedLayer.fill}
                onChange={e => updateLayerProperty(selectedLayer.id, 'fill', e.target.value)}
                style={{
                  ...inputWrapperStyle,
                  flexGrow: 1,
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  padding: '4px 8px',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            {/* Custom styled color swatches with active outline 2px offset */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '8px',
              padding: '4px 0'
            }}>
              {colorSwatches.map(swatch => {
                const isActive = selectedLayer.fill.toLowerCase() === swatch.value.toLowerCase();
                return (
                  <button
                    key={swatch.value}
                    onClick={() => updateLayerProperty(selectedLayer.id, 'fill', swatch.value)}
                    title={swatch.name}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: swatch.value,
                      border: swatch.value.toLowerCase() === '#ffffff' ? '1px solid var(--border-normal)' : 'none',
                      cursor: 'pointer',
                      padding: 0,
                      outline: isActive ? '2px solid #FFD000' : 'none',
                      outlineOffset: isActive ? '2px' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

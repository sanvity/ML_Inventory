import React from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function PhoneFrame({ layers, selectedLayerId, setSelectedLayerId, activeTool, onAddElement }) {
  const { theme } = useTheme();

  // Find the phone frame layer properties
  const phoneLayer = layers.find(l => l.id === 'phone-frame') || {
    width: 240,
    height: 480,
    radius: 24,
    fill: '#0D0D0D'
  };

  // Filter elements that reside inside the phone frame (i.e. children layers)
  const childLayers = layers.filter(l => l.id !== 'canvas' && l.id !== 'phone-frame');

  // Handle layer selection click
  const handleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedLayerId(id);
  };

  // Handles clicking the main phone frame screen area
  const handleDisplayClick = (e) => {
    e.stopPropagation();
    if (activeTool && activeTool !== 'select' && activeTool !== 'settings') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = Math.round(e.clientX - rect.left);
      const clickY = Math.round(e.clientY - rect.top);
      onAddElement(activeTool, clickX, clickY);
    } else {
      setSelectedLayerId('phone-frame');
    }
  };

  // Selection Ring helper
  const renderSelectionRing = (width, height, radius) => {
    const handleStyle = {
      position: 'absolute',
      width: '6px',
      height: '6px',
      backgroundColor: '#FFD000',
      border: '1px solid #0D0D0D',
      zIndex: 100
    };

    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: '1.5px solid #FFD000',
        borderRadius: `${radius}px`,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        zIndex: 99
      }}>
        {/* Handles */}
        <div style={{ ...handleStyle, top: '-3px', left: '-3px', cursor: 'nwse-resize' }} />
        <div style={{ ...handleStyle, top: '-3px', right: '-3px', cursor: 'nesw-resize' }} />
        <div style={{ ...handleStyle, bottom: '-3px', left: '-3px', cursor: 'nesw-resize' }} />
        <div style={{ ...handleStyle, bottom: '-3px', right: '-3px', cursor: 'nwse-resize' }} />
      </div>
    );
  };

  const isPhoneSelected = selectedLayerId === 'phone-frame';

  return (
    <div
      onClick={(e) => handleSelect(e, 'phone-frame')}
      style={{
        position: 'relative',
        width: `${phoneLayer.width}px`,
        height: `${phoneLayer.height}px`,
        borderRadius: `${phoneLayer.radius}px`,
        backgroundColor: phoneLayer.fill,
        border: isPhoneSelected ? '2px solid #FFD000' : '4px solid var(--border-normal)',
        boxShadow: theme === 'dark' 
          ? '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 24px 48px -12px rgba(13, 13, 13, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border 0.15s ease, background-color 0.2s ease',
        cursor: activeTool !== 'select' && activeTool !== 'settings' ? 'crosshair' : 'pointer'
      }}
    >
      {/* Phone Camera Notch */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '56px',
        height: '14px',
        backgroundColor: '#0D0D0D',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        zIndex: 50,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1A1A1A' }}></div>
        <div style={{ width: '12px', height: '2px', borderRadius: '1px', backgroundColor: '#1A1A1A' }}></div>
      </div>

      {/* Interactive Display Area */}
      <div 
        onClick={handleDisplayClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {childLayers.map(layer => {
          if (!layer.visible) return null;

          const isSelected = selectedLayerId === layer.id;

          // Inline styling according to the dynamic state of each layer
          const layerStyle = {
            position: 'absolute',
            left: `${layer.x}px`,
            top: `${layer.y}px`,
            width: `${layer.width}px`,
            height: `${layer.height}px`,
            borderRadius: layer.radius ? `${layer.radius}px` : '0px',
            backgroundColor: layer.fill,
            color: layer.textColor || 'inherit',
            display: 'flex',
            alignItems: layer.type === 'text' ? 'flex-start' : 'center',
            justifyContent: layer.type === 'text' ? 'flex-start' : 'center',
            cursor: 'pointer',
            boxSizing: 'border-box',
            fontSize: layer.type === 'badge' ? '10px' : layer.type === 'text' ? '11px' : '12px',
            fontWeight: 500,
            overflow: 'hidden',
            pointerEvents: 'auto',
            border: layer.type === 'rectangle' && layer.fill === '#111111' ? '0.5px solid var(--border-subtle)' : 'none'
          };

          return (
            <div
              key={layer.id}
              onClick={(e) => handleSelect(e, layer.id)}
              style={layerStyle}
            >
              {/* If text-based, show text value */}
              {layer.text && (
                <span style={{
                  padding: layer.type === 'text' ? '0' : '4px 8px',
                  width: '100%',
                  textAlign: layer.type === 'text' ? 'left' : 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {layer.text}
                </span>
              )}

              {/* Render special child components if they are containers */}
              {layer.id === 'bottom-nav' && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  borderTop: '0.5px solid var(--border-subtle)'
                }}>
                  <i className="ti ti-smart-home" style={{ fontSize: '14px', color: selectedLayerId === 'nav-home' ? '#FFD000' : 'var(--text-tertiary)' }} />
                  <i className="ti ti-layers-intersect" style={{ fontSize: '14px', color: selectedLayerId === 'nav-layers' ? '#FFD000' : 'var(--text-tertiary)' }} />
                  <i className="ti ti-settings" style={{ fontSize: '14px', color: selectedLayerId === 'nav-settings' ? '#FFD000' : 'var(--text-tertiary)' }} />
                </div>
              )}

              {/* Selection Ring for the child item */}
              {isSelected && renderSelectionRing(layer.width, layer.height, layer.radius ?? 0)}
            </div>
          );
        })}
      </div>

      {/* Outer Selection Ring for the Phone Frame itself */}
      {isPhoneSelected && renderSelectionRing(phoneLayer.width, phoneLayer.height, phoneLayer.radius)}
    </div>
  );
}

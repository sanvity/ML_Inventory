import React from 'react';
import PhoneFrame from './PhoneFrame';
import { useTheme } from '../theme/ThemeContext';

export default function CanvasViewport({
  layers,
  selectedLayerId,
  setSelectedLayerId,
  zoom,
  activeTool,
  onAddElement
}) {
  const { theme } = useTheme();

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedLayerId('canvas');
    }
  };

  return (
    <div
      onClick={handleCanvasClick}
      style={{
        flexGrow: 1,
        position: 'relative',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
        // 22px spacing radial dots grid background
        backgroundImage: theme === 'dark'
          ? 'radial-gradient(#1f1f1f 1.2px, transparent 1.2px)'
          : 'radial-gradient(#dcd9cf 1.2px, transparent 1.2px)',
        backgroundSize: '22px 22px',
        padding: '60px',
        userSelect: 'none',
        minHeight: 0 // avoids flex overflow issues
      }}
    >
      {/* Zoomable Container wrapper */}
      <div style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'center center',
        transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <PhoneFrame
          layers={layers}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
          activeTool={activeTool}
          onAddElement={onAddElement}
        />
      </div>
    </div>
  );
}

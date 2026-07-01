import React, { useState } from 'react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import LayersPanel from './components/LayersPanel';
import CanvasToolbar from './components/CanvasToolbar';
import CanvasViewport from './components/CanvasViewport';
import PropsPanel from './components/PropsPanel';
import StatusBar from './components/StatusBar';

export default function App() {
  const [activeTool, setActiveTool] = useState('select');
  const [selectedLayerId, setSelectedLayerId] = useState('phone-frame');
  const [zoom, setZoom] = useState(100);

  // Initial mockup template matching design system specification
  const [layers, setLayers] = useState([
    { id: 'canvas', name: 'Infinite Canvas', type: 'canvas', depth: 0, visible: true },
    { id: 'phone-frame', name: 'Phone Frame', type: 'frame', depth: 1, visible: true, x: 100, y: 50, width: 240, height: 480, radius: 24, fill: '#0D0D0D' },
    
    // Brand Hero Banner component
    { id: 'hero-banner', name: 'Hero Banner', type: 'rectangle', depth: 2, visible: true, x: 12, y: 40, width: 216, height: 130, radius: 12, fill: '#FFD000', parentId: 'phone-frame' },
    { id: 'hero-title', name: 'Banner Title', type: 'text', depth: 3, visible: true, x: 24, y: 60, width: 192, height: 20, fill: 'transparent', textColor: '#5A4800', text: 'Studio System', parentId: 'hero-banner' },
    { id: 'cta-button', name: 'CTA Button', type: 'button', depth: 3, visible: true, x: 24, y: 115, width: 100, height: 32, radius: 16, fill: '#0D0D0D', textColor: '#FFD000', text: 'Get Started', parentId: 'hero-banner' },
    
    // Feature row list item 1
    { id: 'list-item-1', name: 'Feature Row 1', type: 'rectangle', depth: 2, visible: true, x: 12, y: 186, width: 216, height: 50, radius: 8, fill: '#111111', parentId: 'phone-frame' },
    { id: 'item-1-title', name: 'Row 1 Title', type: 'text', depth: 3, visible: true, x: 24, y: 202, width: 120, height: 16, fill: 'transparent', textColor: '#FFFFFF', text: 'Dynamic Layouts', parentId: 'list-item-1' },
    { id: 'new-badge', name: 'New Badge', type: 'badge', depth: 3, visible: true, x: 168, y: 201, width: 44, height: 18, radius: 9, fill: '#FFD000', textColor: '#111111', text: 'NEW', parentId: 'list-item-1' },
    
    // Feature row list item 2
    { id: 'list-item-2', name: 'Feature Row 2', type: 'rectangle', depth: 2, visible: true, x: 12, y: 246, width: 216, height: 50, radius: 8, fill: '#111111', parentId: 'phone-frame' },
    { id: 'item-2-title', name: 'Row 2 Title', type: 'text', depth: 3, visible: true, x: 24, y: 262, width: 120, height: 16, fill: 'transparent', textColor: '#FFFFFF', text: 'Typography', parentId: 'list-item-2' },
    { id: 'done-badge', name: 'Done Badge', type: 'badge', depth: 3, visible: true, x: 168, y: 261, width: 44, height: 18, radius: 9, fill: '#1F1F1F', textColor: '#888888', text: 'DONE', parentId: 'list-item-2' },
    
    // Feature row list item 3
    { id: 'list-item-3', name: 'Feature Row 3', type: 'rectangle', depth: 2, visible: true, x: 12, y: 306, width: 216, height: 50, radius: 8, fill: '#111111', parentId: 'phone-frame' },
    { id: 'item-3-title', name: 'Row 3 Title', type: 'text', depth: 3, visible: true, x: 24, y: 322, width: 120, height: 16, fill: 'transparent', textColor: '#FFFFFF', text: 'Dark Theme', parentId: 'list-item-3' },
    
    // Floating Action Button
    { id: 'fab', name: 'FAB Plus', type: 'button', depth: 2, visible: true, x: 180, y: 374, width: 44, height: 44, radius: 22, fill: '#FFD000', textColor: '#0D0D0D', text: '+', parentId: 'phone-frame' },
    
    // Navigation bar & Home tabs
    { id: 'bottom-nav', name: 'Navigation Bar', type: 'rectangle', depth: 2, visible: true, x: 0, y: 430, width: 240, height: 50, radius: 0, fill: '#111111', parentId: 'phone-frame' },
    { id: 'nav-home', name: 'Home Tab Icon', type: 'button', depth: 3, visible: true, x: 30, y: 442, width: 26, height: 26, radius: 6, fill: '#FFD000', textColor: '#0D0D0D', text: 'H', parentId: 'bottom-nav' },
    { id: 'nav-layers', name: 'Layers Tab Icon', type: 'button', depth: 3, visible: true, x: 107, y: 442, width: 26, height: 26, radius: 6, fill: 'transparent', textColor: '#888888', text: 'L', parentId: 'bottom-nav' },
    { id: 'nav-settings', name: 'Settings Tab Icon', type: 'button', depth: 3, visible: true, x: 184, y: 442, width: 26, height: 26, radius: 6, fill: 'transparent', textColor: '#888888', text: 'S', parentId: 'bottom-nav' }
  ]);

  // Find currently selected layer details
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Property edit callback
  const updateLayerProperty = (id, property, value) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === id) {
        return { ...layer, [property]: value };
      }
      return layer;
    }));
  };

  // Alignment callback
  const handleAlign = (action) => {
    if (!selectedLayerId || selectedLayerId === 'canvas' || selectedLayerId === 'phone-frame') return;
    
    const selected = layers.find(l => l.id === selectedLayerId);
    if (!selected) return;

    // Find parent properties (defaults to phone frame size if missing)
    const parent = layers.find(l => l.id === selected.parentId) || { width: 240, height: 480 };
    const pWidth = parent.width || 240;
    const pHeight = parent.height || 480;

    let newX = selected.x;
    let newY = selected.y;

    switch (action) {
      case 'left':
        newX = 0;
        break;
      case 'h-center':
        newX = Math.round((pWidth - selected.width) / 2);
        break;
      case 'right':
        newX = pWidth - selected.width;
        break;
      case 'top':
        newY = 0;
        break;
      case 'v-center':
        newY = Math.round((pHeight - selected.height) / 2);
        break;
      case 'bottom':
        newY = pHeight - selected.height;
        break;
      default:
        break;
    }

    setLayers(prev => prev.map(layer => {
      if (layer.id === selectedLayerId) {
        return { ...layer, x: newX, y: newY };
      }
      return layer;
    }));
  };

  // Visibility toggle
  const toggleVisibility = (id) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === id) {
        return { ...layer, visible: !layer.visible };
      }
      return layer;
    }));
  };

  // Interactive addition of elements via toolbar
  const handleAddElement = (type, clickX, clickY) => {
    const newId = `${type}-${Date.now().toString().slice(-4)}`;
    
    let w = 80;
    let h = 32;
    let r = 6;
    let fill = '#FFD000';
    let text = '';
    let textColor = '#0D0D0D';

    if (type === 'text') {
      w = 120;
      h = 16;
      fill = 'transparent';
      text = 'New Text Layer';
      textColor = '#FFFFFF';
    } else if (type === 'button') {
      w = 90;
      h = 32;
      r = 16;
      text = 'Button Action';
      textColor = '#0D0D0D';
    } else if (type === 'badge') {
      w = 44;
      h = 18;
      r = 9;
      text = 'TAG';
      textColor = '#FFD000';
      fill = '#1A1600';
    }

    const newElement = {
      id: newId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${layers.length - 1}`,
      type: type,
      depth: 2,
      visible: true,
      x: Math.max(0, Math.min(clickX - Math.round(w / 2), 240 - w)),
      y: Math.max(0, Math.min(clickY - Math.round(h / 2), 480 - h)),
      width: w,
      height: h,
      radius: r,
      fill: fill,
      text: text,
      textColor: textColor,
      parentId: 'phone-frame'
    };

    setLayers(prev => [...prev, newElement]);
    setSelectedLayerId(newId);
    setActiveTool('select'); // revert back to selection tool
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-base)'
    }}>
      {/* 1. Header Topbar */}
      <Topbar />

      {/* 2. Middle Content Grid */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexGrow: 1,
        minHeight: 0, // prevents overflow scrolling
        overflow: 'hidden'
      }}>
        {/* Leftmost Sidebar Navigation */}
        <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />

        {/* Hierarchical Layers tree list */}
        <LayersPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
          toggleVisibility={toggleVisibility}
        />

        {/* Workspace Canvas / Center Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          height: '100%'
        }}>
          {/* Sub-Header Toolbar */}
          <CanvasToolbar
            selectedLayer={selectedLayer}
            zoom={zoom}
            setZoom={setZoom}
            layers={layers}
          />

          {/* Dotted Infinite Grid Viewport */}
          <CanvasViewport
            layers={layers}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
            zoom={zoom}
            activeTool={activeTool}
            onAddElement={handleAddElement}
          />
        </div>

        {/* Rightmost Properties Inspector */}
        <PropsPanel
          selectedLayer={selectedLayer}
          updateLayerProperty={updateLayerProperty}
          onAlign={handleAlign}
        />
      </div>

      {/* 3. Footer Status Bar */}
      <StatusBar activeTool={activeTool} layers={layers} />
    </div>
  );
}

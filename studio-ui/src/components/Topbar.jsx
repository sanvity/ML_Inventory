import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Design');

  const navs = ['Design', 'Prototype', 'Inspect'];

  return (
    <header style={{
      height: '46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      backgroundColor: 'var(--bg-raised)',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0
    }}>
      {/* Left section: Logo + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          backgroundColor: '#FFD000',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <i className="ti ti-vector-triangle" style={{ fontSize: '14px', color: '#0D0D0D' }}></i>
        </div>
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '0.1px'
        }}>
          Studio UI
        </span>
      </div>

      {/* Middle section: Nav Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navs.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '4px 14px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? '#FFD000' : 'transparent',
                color: isActive ? '#111111' : 'var(--text-tertiary)',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Right section: Theme Toggle + Primary + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Theme Switcher Ghost Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 500,
            padding: '4px 10px',
            borderRadius: '9999px',
            border: '1px solid var(--border-normal)',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer'
          }}
        >
          <i className={theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon'} style={{ fontSize: '12px' }}></i>
          <span style={{ fontSize: '10px' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* Primary Pill Button */}
        <button style={{
          fontSize: '11px',
          fontWeight: 500,
          padding: '4px 16px',
          borderRadius: '9999px',
          backgroundColor: '#FFD000',
          color: '#111111',
          border: 'none',
          cursor: 'pointer'
        }}>
          Export
        </button>

        {/* Avatar */}
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: '1.5px solid #FFD000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 500,
          backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFF8D0',
          color: theme === 'dark' ? '#FFD000' : '#8B6A00',
          cursor: 'pointer'
        }}>
          SJ
        </div>
      </div>
    </header>
  );
}

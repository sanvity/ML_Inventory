import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ content, children, placement = 'top', maxWidth = 260 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef();

  if (!content) return children;

  const placements = {
    top:    { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
              arrow: { top: '100%', left: '50%', transform: 'translateX(-50%)',
                       border: '5px solid transparent', borderTopColor: '#1e1e26' } },
    bottom: { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
              arrow: { bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                       border: '5px solid transparent', borderBottomColor: '#1e1e26' } },
    right:  { top: '50%', left: 'calc(100% + 8px)', transform: 'translateY(-50%)',
              arrow: { top: '50%', right: '100%', transform: 'translateY(-50%)',
                       border: '5px solid transparent', borderRightColor: '#1e1e26' } },
    left:   { top: '50%', right: 'calc(100% + 8px)', transform: 'translateY(-50%)',
              arrow: { top: '50%', left: '100%', transform: 'translateY(-50%)',
                       border: '5px solid transparent', borderLeftColor: '#1e1e26' } },
  };

  const { arrow, ...pos } = placements[placement] || placements.top;

  return (
    <div ref={ref}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div style={{
          position: 'absolute', zIndex: 9999, pointerEvents: 'none',
          background: '#1e1e26', color: '#f1f5f9',
          padding: '10px 13px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
          width: maxWidth, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          border: '1px solid rgba(148,163,184,0.10)', whiteSpace: 'normal',
          animation: 'fadeIn 0.12s ease', ...pos,
        }}>
          {content}
          <div style={{ position: 'absolute', width: 0, height: 0, ...arrow }} />
        </div>
      )}
    </div>
  );
}

/** Inline help "?" icon that shows a tooltip */
export function HelpIcon({ content, placement }) {
  return (
    <Tooltip content={content} placement={placement}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%',
        background: 'rgba(148,163,184,0.12)', color: '#94a3b8',
        fontSize: 10, fontWeight: 700, cursor: 'help', userSelect: 'none',
        marginLeft: 4, flexShrink: 0,
      }}>?</span>
    </Tooltip>
  );
}

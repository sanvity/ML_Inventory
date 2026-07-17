import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ content, children, placement = 'top', maxWidth = 260, trigger = 'hover' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!visible) return;

    const handleInteraction = (event) => {
      if (
        ref.current && !ref.current.contains(event.target) &&
        tooltipRef.current && !tooltipRef.current.contains(event.target)
      ) {
        setVisible(false);
      }
    };

    document.addEventListener('mousedown', handleInteraction);
    return () => {
      document.removeEventListener('mousedown', handleInteraction);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !ref.current) return;

    const updatePosition = () => {
      const rect = ref.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      if (placement === 'top') {
        left = rect.left + scrollX + rect.width / 2;
        top = rect.top + scrollY - 8;
      } else if (placement === 'bottom') {
        left = rect.left + scrollX + rect.width / 2;
        top = rect.bottom + scrollY + 8;
      } else if (placement === 'right') {
        left = rect.right + scrollX + 8;
        top = rect.top + scrollY + rect.height / 2;
      } else if (placement === 'left') {
        left = rect.left + scrollX - 8;
        top = rect.top + scrollY + rect.height / 2;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [visible, placement]);

  if (!content) return children;

  const placements = {
    top:    { transform: 'translate(-50%, -100%)',
              arrow: { top: '100%', left: '50%', transform: 'translateX(-50%)',
                       border: '5px solid transparent', borderTopColor: '#1e1e26' } },
    bottom: { transform: 'translateX(-50%)',
              arrow: { bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                       border: '5px solid transparent', borderBottomColor: '#1e1e26' } },
    right:  { transform: 'translateY(-50%)',
              arrow: { top: '50%', right: '100%', transform: 'translateY(-50%)',
                       border: '5px solid transparent', borderRightColor: '#1e1e26' } },
    left:   { transform: 'translate(-100%, -50%)',
              arrow: { top: '50%', left: '100%', transform: 'translateY(-50%)',
                       border: '5px solid transparent', borderLeftColor: '#1e1e26' } },
  };

  const { arrow, transform } = placements[placement] || placements.top;

  const handleToggle = (e) => {
    if (trigger === 'click') {
      e.stopPropagation();
      setVisible(prev => !prev);
    }
  };

  const hoverProps = trigger === 'hover' ? {
    onMouseEnter: () => setVisible(true),
    onMouseLeave: () => setVisible(false),
  } : {};

  return (
    <div ref={ref}
      style={{ position: 'relative', display: 'inline-flex' }}
      onClick={handleToggle}
      {...hoverProps}>
      {children}
      {visible && createPortal(
        <div ref={tooltipRef} style={{
          position: 'absolute', zIndex: 99999,
          background: '#1e1e26', color: '#f1f5f9',
          padding: '10px 13px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
          width: maxWidth, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          border: '1px solid rgba(148,163,184,0.10)', whiteSpace: 'normal',
          animation: 'fadeIn 0.12s ease',
          top: coords.top, left: coords.left, transform,
        }}>
          {content}
          <div style={{ position: 'absolute', width: 0, height: 0, ...arrow }} />
        </div>,
        document.body
      )}
    </div>
  );
}

/** Inline help "?" icon that shows a tooltip */
export function HelpIcon({ content, placement, maxWidth = 280, iconType = 'info' }) {
  const iconChar = iconType === 'info' ? 'i' : '?';
  return (
    <Tooltip content={content} placement={placement} maxWidth={maxWidth} trigger="click">
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%',
        background: 'rgba(148,163,184,0.12)', color: '#94a3b8',
        fontSize: 10, fontWeight: 700, cursor: 'pointer', userSelect: 'none',
        marginLeft: 4, flexShrink: 0,
      }}>{iconChar}</span>
    </Tooltip>
  );
}

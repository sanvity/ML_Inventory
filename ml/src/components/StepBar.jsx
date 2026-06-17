const STEPS = [
  { id: 0, label: 'Use Case & Model', icon: 'target',    description: 'Choose your goal and select a model' },
  { id: 1, label: 'Feature Engineering', icon: 'wand',  description: 'Configure your data and training settings' },
  { id: 2, label: 'Train & Results', icon: 'chart-bar', description: 'Train your model and analyse results' },
];

export default function StepBar({ activeStep, unlockedStep, onStepClick }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '0 0 24px 0', position: 'relative',
      overflowX: 'auto', maxWidth: '100%',
    }}>
      {STEPS.map((step, idx) => {
        const done    = idx < activeStep;
        const active  = idx === activeStep;
        const locked  = idx > unlockedStep;

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : undefined }}>
            {/* Step pill */}
            <button
              onClick={() => !locked && onStepClick(idx)}
              disabled={locked}
              title={locked ? 'Complete the previous step first' : step.description}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', borderRadius: 99,
                border: `1px solid ${active ? 'rgba(99,102,241,0.50)' : done ? 'rgba(16,185,129,0.35)' : 'var(--border-strong)'}`,
                background: active ? 'rgba(99,102,241,0.12)' : done ? 'rgba(16,185,129,0.08)' : 'transparent',
                color: active ? '#818cf8' : done ? '#10b981' : locked ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.45 : 1,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
              {/* Circle */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: done ? '#10b981' : active ? 'var(--accent)' : 'rgba(148,163,184,0.10)',
                color: (done || active) ? '#fff' : 'var(--text-muted)',
              }}>
                {done ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : idx + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{step.label}</span>
            </button>

            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, margin: '0 6px',
                background: done ? 'rgba(16,185,129,0.40)' : 'var(--border-strong)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

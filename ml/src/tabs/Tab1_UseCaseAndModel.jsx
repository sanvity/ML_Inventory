import { useState, useRef, useCallback } from 'react';
import { GOAL_TYPES, getRecommendations, SPEED_BADGE_STYLES, MODELS } from '../data/modelRegistry.js';
import Badge from '../components/ui/Badge.jsx';
import Tooltip, { HelpIcon } from '../components/ui/Tooltip.jsx';

const API = 'http://localhost:7860';

const CAT_COLOR = { supervised:'#6366f1', unsupervised:'#10b981', timeseries:'#f59e0b', simulation:'#f43f5e' };

// ── Upload Drop Zone ───────────────────────────────────────────────────────────
function UploadZone({ onLoaded }) {
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const inputRef = useRef();

  const handleFile = useCallback(async file => {
    if (!file) return;
    const ok = file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!ok) { setError('Please upload a CSV or Excel (.xlsx / .xls) file.'); return; }
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      onLoaded(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onLoaded]);

  return (
    <div style={{ animation: 'slideUp 0.3s ease' }}>
      {/* Hero text */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12,
          background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 99, padding: '5px 14px',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse-slow 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 500 }}>Step 1 of 3 — Start with your data</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10 }}>
          Turn your data into a
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginLeft: 8,
          }}>trained model</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
          Upload a CSV or Excel file to begin. No coding required — ML Playground guides you through every decision.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 20, padding: '52px 32px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(99,102,241,0.07)' : 'var(--bg-raised)',
          transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
        }}>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border-strong)',
              borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite',
            }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Reading your file…</span>
          </div>
        ) : (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
              background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-cloud-upload" style={{ fontSize: 28, color: 'var(--accent)' }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              Drop your dataset here
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              or <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>click to browse</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['.CSV', '.XLSX', '.XLS'].map(f => (
                <span key={f} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 600,
                  background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)',
                  color: 'var(--text-muted)',
                }}>{f}</span>
              ))}
            </div>
          </>
        )}
      </div>
      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)',
          border: '1px solid rgba(244,63,94,0.25)', color: 'var(--error)', fontSize: 13,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <i className="ti ti-alert-circle" />
          {error}
        </div>
      )}

      {/* Feature row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 24 }}>
        {[
          { icon: 'lock', title: 'Your data stays private', desc: 'Processed locally — never sent to the cloud.' },
          { icon: 'wand', title: 'Smart auto-configuration', desc: 'Recommended model selected based on your data.' },
          { icon: 'rocket', title: 'Results in minutes', desc: 'Train and evaluate multiple models at once.' },
        ].map((f, i) => (
          <div key={i} style={{
            padding: '14px 16px', borderRadius: 12, background: 'var(--bg-raised)',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <i className={`ti ti-${f.icon}`} style={{ fontSize: 20, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Data Summary Card ───────────────────────────────────────────────────────────
function DataSummaryCard({ data, onReset }) {
  return (
    <div style={{
      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
      borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
      marginBottom: 28, animation: 'slideUp 0.25s ease',
    }}>
      <i className="ti ti-circle-check" style={{ fontSize: 24, color: '#10b981', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          {data.filename} loaded
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {data.rows?.toLocaleString()} rows · {data.cols} columns · {data.numeric_cols} numeric
        </div>
      </div>
      <button onClick={onReset} style={{
        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-strong)',
        background: 'transparent', color: 'var(--text-secondary)', fontSize: 12,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}>
        <i className="ti ti-refresh" style={{ marginRight: 4 }} />Change file
      </button>
    </div>
  );
}

// ── Goal Selector ───────────────────────────────────────────────────────────────
function GoalSelector({ selected, onSelect }) {
  return (
    <div style={{ animation: 'slideUp 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
          What do you want to do with your data?
        </h2>
        <p style={{ margin: 0 }}>
          Choose the goal that best describes your task — we'll recommend the right model.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {GOAL_TYPES.map(goal => {
          const isSelected = selected === goal.id;
          return (
            <button key={goal.id} onClick={() => onSelect(goal.id)} style={{
              padding: '18px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${isSelected ? goal.color + '60' : 'var(--border-strong)'}`,
              background: isSelected ? `${goal.color}12` : 'var(--bg-raised)',
              transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', gap: 10,
              boxShadow: isSelected ? `0 0 0 3px ${goal.color}20` : 'none',
            }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = goal.color + '35'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${goal.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ti-${goal.icon}`} style={{ fontSize: 20, color: goal.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{goal.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{goal.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Recommendation Panel ────────────────────────────────────────────────────────
function RecommendationPanel({ goalId, datasetMeta, confirmedModels = [], onConfirm }) {
  const { primary, why, alternatives } = getRecommendations(goalId, datasetMeta);
  const isPrimarySelected = confirmedModels.some(m => m.id === primary.id);

  return (
    <div style={{ animation: 'slideUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Our recommendations</h2>
        <p style={{ margin: 0 }}>Select one or more models to train and compare results.</p>
      </div>

      {/* Primary recommendation */}
      <div style={{
        background: 'var(--bg-raised)', borderRadius: 16,
        border: `1.5px solid ${isPrimarySelected ? 'var(--accent)' : 'var(--border-strong)'}`,
        overflow: 'hidden',
        boxShadow: isPrimarySelected ? '0 0 0 3px rgba(99,102,241,0.12)' : '0 0 20px rgba(99,102,241,0.08)',
      }}>
        {/* Recommended ribbon */}
        <div style={{
          padding: '8px 20px', background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-sparkles" style={{ fontSize: 14, color: '#fff' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.03em' }}>
            RECOMMENDED FOR YOUR TASK (PRIMARY)
          </span>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: `${CAT_COLOR[primary.category]}18`,
              border: `1px solid ${CAT_COLOR[primary.category]}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ti-${primary.icon}`} style={{ fontSize: 24, color: CAT_COLOR[primary.category] }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{primary.name}</h3>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
                  background: SPEED_BADGE_STYLES[primary.speed].bg,
                  color: SPEED_BADGE_STYLES[primary.speed].text,
                  border: `1px solid ${SPEED_BADGE_STYLES[primary.speed].border}`,
                }}>{primary.badge}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                {primary.description}
              </p>
            </div>
          </div>

          {/* Why recommendation */}
          <div style={{
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 18,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <i className="ti ti-bulb" style={{ color: '#818cf8', fontSize: 16, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why this model? </strong>{why}
            </p>
          </div>

          <button onClick={() => onConfirm(primary)} style={{
            width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
            background: isPrimarySelected
              ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: isPrimarySelected ? '#10b981' : '#fff',
            cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <i className={`ti ti-${isPrimarySelected ? 'check-circle' : 'plus'}`} />
            {isPrimarySelected ? 'Selected (Recommended)' : `Add ${primary.name}`}
          </button>
        </div>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Alternative models (Select to train alongside recommended model)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
            {alternatives.map(alt => {
              const isSelected = confirmedModels.some(m => m.id === alt.id);
              const color = CAT_COLOR[alt.category];
              return (
                <div key={alt.id} style={{
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--bg-raised)',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.1)' : 'none',
                }}
                  onClick={() => onConfirm(alt)}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <i className={`ti ti-${alt.icon}`} style={{ fontSize: 16, color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{alt.name}</span>
                    {isSelected && <i className="ti ti-check-circle" style={{ color: '#10b981', marginLeft: 'auto' }} />}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {alt.comparisonNote}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Confirmation Banner ─────────────────────────────────────────────────────────
function ConfirmationBanner({ models = [], datasetMeta, onContinue }) {
  const goalLabel = datasetMeta?.suggested_target
    ? `predict ${datasetMeta.suggested_target}`
    : 'analyse your data';

  const names = models.map(m => m.name).join(', ');

  return (
    <div style={{
      marginTop: 24, padding: '18px 22px', borderRadius: 14, animation: 'slideUp 0.25s ease',
      background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.30)',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <i className="ti ti-circle-check" style={{ fontSize: 26, color: '#10b981', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Ready to configure</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          You're training <strong style={{ color: 'var(--text-primary)' }}>{models.length} model{models.length !== 1 ? 's' : ''}</strong> ({names}) to {goalLabel}.
        </div>
      </div>
      <button onClick={onContinue} style={{
        padding: '10px 22px', borderRadius: 10, border: 'none',
        background: '#10b981', color: '#fff', fontWeight: 600, fontSize: 14,
        cursor: 'pointer', transition: 'opacity 0.15s', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 7,
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        Configure features
        <i className="ti ti-arrow-right" style={{ fontSize: 15 }} />
      </button>
    </div>
  );
}

// ── Tab 1 Root ──────────────────────────────────────────────────────────────────
export default function Tab1({ session, onSessionLoaded, confirmedModels = [], onModelsConfirmed, onContinue }) {
  const [goalId, setGoalId] = useState(null);

  const handleGoalSelect = id => {
    setGoalId(id);
    const { primary } = getRecommendations(id, session);
    onModelsConfirmed([primary]);
  };

  const handleConfirm = model => {
    const exists = confirmedModels.some(m => m.id === model.id);
    let next;
    if (exists) {
      if (confirmedModels.length > 1) {
        next = confirmedModels.filter(m => m.id !== model.id);
      } else {
        next = confirmedModels;
      }
    } else {
      next = [...confirmedModels, model];
    }
    onModelsConfirmed(next);
  };

  const handleReset = () => {
    onSessionLoaded(null);
    setGoalId(null);
    onModelsConfirmed([]);
  };

  const showGoal     = !!session;
  const showRecommen = showGoal && !!goalId;

  return (
    <div style={{ maxWidth: 780, animation: 'fadeIn 0.3s ease' }}>

      {/* Upload or loaded summary */}
      {!session ? (
        <UploadZone onLoaded={onSessionLoaded} />
      ) : (
        <>
          <DataSummaryCard data={session} onReset={handleReset} />

          {/* Goal question */}
          <GoalSelector selected={goalId} onSelect={handleGoalSelect} />

          {/* Recommendation */}
          {showRecommen && (
            <div style={{ marginTop: 28 }}>
              <RecommendationPanel
                goalId={goalId}
                datasetMeta={session}
                confirmedModels={confirmedModels}
                onConfirm={handleConfirm}
              />

              {/* Confirmation + proceed */}
              {confirmedModels.length > 0 && (
                <ConfirmationBanner
                  models={confirmedModels}
                  datasetMeta={session}
                  onContinue={onContinue}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}


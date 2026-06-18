import { useState, useEffect, useRef, useCallback } from 'react';
import MetricCard from '../components/ui/MetricCard.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { HelpIcon } from '../components/ui/Tooltip.jsx';

const API = 'http://localhost:7860';

const FRIENDLY_MESSAGES = [
  'Preparing your dataset…',
  'Building feature pipelines…',
  'Auto-tuning hyperparameters with Optuna…',
  'Running Bayesian optimisation trials…',
  'Fitting final model with best parameters…',
  'Running cross-validation…',
  'Evaluating on held-out test data…',
  'Calculating feature importance…',
  'Almost there — wrapping up results…',
];

const BAND_INTERP = {
  Excellent: { color: '#10b981', bg: 'rgba(16,185,129,0.10)', text: 'Excellent! Your model explains a large portion of the variation — this is a strong result.', icon: 'trophy' },
  Good:      { color: '#818cf8', bg: 'rgba(99,102,241,0.10)', text: 'Good result. The model captures real signal in your data and should be useful for predictions.', icon: 'thumb-up' },
  Fair:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', text: 'Fair accuracy. The model finds some patterns but there\'s room to improve — try adding more features or a different model.', icon: 'adjustments' },
  Weak:      { color: '#f43f5e', bg: 'rgba(244,63,94,0.10)', text: 'Weak accuracy. Consider reviewing your features, trying a different model, or gathering more data.', icon: 'alert-circle' },
};

function getInterpretation(metricName, value) {
  if (metricName === 'r2') {
    const pct = (value * 100).toFixed(0);
    if (value >= 0.85) return `Your model explains ${pct}% of the variation — that's excellent for this type of data.`;
    if (value >= 0.70) return `Your model explains ${pct}% of the variation — a solid, usable result.`;
    if (value >= 0.50) return `Your model explains ${pct}% of the variation — moderate, but there's room to improve.`;
    return `Your model explains only ${pct}% of the variation — consider different features or a more powerful model.`;
  }
  if (metricName === 'rmse') return `On average, predictions are off by ±${value.toFixed(3)} units from the actual value.`;
  if (metricName === 'mae')  return `The typical prediction error is ${value.toFixed(3)} units.`;
  return '';
}

// ── Training Progress Screen ────────────────────────────────────────────────────
function TrainingScreen({ models, progress, friendlyMsg, confirmedModels = [] }) {
  const overall = models.length
    ? Math.round(Object.values(progress).reduce((s, p) => s + (p.pct ?? 0), 0) / models.length)
    : 0;

  const getModelName = key => {
    const found = confirmedModels.find(m => m.backendKey === key);
    return found ? found.name : key;
  };

  const getPhaseLabel = (status, pct) => {
    if (status === 'tuning') return '🔬 Auto-tuning…';
    if (status === 'training') return pct >= 80 ? '📊 Cross-validating…' : '⚙️ Fitting model…';
    if (status === 'done') return '✅ Done';
    if (status === 'error') return '❌ Error';
    return '⏳ Queued';
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 0', animation: 'fadeIn 0.3s ease' }}>
      {/* Overall progress */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div
          style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
            background: `conic-gradient(var(--accent) 0%, var(--accent) ${overall * 3.6}deg, var(--bg-overlay) 0%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}
          ref={el => { if (el) el.style.setProperty('--pct', String(overall)); }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'var(--accent)',
          }}>{overall}%</div>
        </div>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Training your model</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
          {friendlyMsg}
        </p>
      </div>

      {/* Per-model progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {models.map(m => {
          const p = progress[m] ?? { pct: 0, status: 'queued' };
          const isTuning = p.status === 'tuning';
          const color = p.status === 'done' ? '#10b981' : p.status === 'error' ? '#f43f5e' : isTuning ? '#f59e0b' : 'var(--accent)';
          const statusIcon = p.status === 'done' ? 'check-circle' : p.status === 'error' ? 'alert-circle' : isTuning ? 'wand' : 'loader';
          return (
            <div key={m} style={{
              background: 'var(--bg-raised)', borderRadius: 12, padding: '14px 18px',
              border: `1px solid ${p.status === 'done' ? 'rgba(16,185,129,0.25)' : p.status === 'error' ? 'rgba(244,63,94,0.25)' : isTuning ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{getModelName(m)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isTuning && (
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
                      background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                    }}>Optuna tuning</span>
                  )}
                  {p.status === 'done' && p.metrics?.band && (
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
                      background: BAND_INTERP[p.metrics.band]?.bg,
                      color: BAND_INTERP[p.metrics.band]?.color,
                    }}>{p.metrics.band}</span>
                  )}
                  <i className={`ti ti-${statusIcon} ${(p.status === 'training' || isTuning) ? 'animate-spin' : ''}`}
                    style={{ fontSize: 15, color }} />
                </div>
              </div>
              {/* Phase label */}
              {p.status !== 'queued' && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  {p.message || getPhaseLabel(p.status, p.pct)}
                </div>
              )}
              <ProgressBar pct={p.pct ?? 0} color={color} animated={p.status === 'training' || isTuning} />
              {p.status === 'done' && p.metrics && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 14 }}>
                  <span>R² <strong style={{ color: 'var(--text-primary)' }}>{p.metrics.r2?.toFixed(3)}</strong></span>
                  <span>RMSE <strong style={{ color: 'var(--text-primary)' }}>{p.metrics.rmse?.toFixed(3)}</strong></span>
                  <span>MAE <strong style={{ color: 'var(--text-primary)' }}>{p.metrics.mae?.toFixed(3)}</strong></span>
                  {p.metrics.optuna_used && (
                    <span style={{ marginLeft: 'auto', color: '#f59e0b', fontWeight: 600 }}>
                      <i className="ti ti-sparkles" style={{ fontSize: 10, marginRight: 3 }} />
                      Optuna tuned
                    </span>
                  )}
                </div>
              )}
              {p.status === 'error' && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#f43f5e' }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight: 5 }} />
                  {p.error || 'Training failed for this model'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Results Dashboard ───────────────────────────────────────────────────────────
function ResultsDashboard({ results, featureImportance, forecast, pipelineReport, sessionId, config, onTryAnother, onSaveRun, confirmedModels = [] }) {
  const chartRef  = useRef();
  const [expandedParams, setExpandedParams] = useState({});
  const [expandedPipeline, setExpandedPipeline] = useState(true);
  const fiRef     = useRef();
  const residRef  = useRef();
  const [activeModel, setActiveModel] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Pick best model by default
  const bestModelKey = Object.keys(results).find(k => results[k].is_best) || Object.keys(results)[0];
  const modelKey = activeModel || bestModelKey;
  const r = results[modelKey];

  const bestBand  = r ? BAND_INTERP[r.band] || BAND_INTERP.Fair : null;

  const modelNames = (config.models ?? []).reduce((acc, key) => {
    const found = confirmedModels.find(m => m.backendKey === key);
    acc[key] = found ? found.name : key;
    return acc;
  }, {});

  useEffect(() => {
    if (!r) return;
    // Predicted vs Actual chart
    if (chartRef.current && r.test_predictions && r.test_actuals) {
      if (window.Chart) {
        const existing = window.Chart.getChart(chartRef.current);
        if (existing) existing.destroy();
        new window.Chart(chartRef.current, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Predicted vs Actual',
              data: r.test_actuals.map((a, i) => ({ x: a, y: r.test_predictions[i] })),
              backgroundColor: 'rgba(99,102,241,0.5)',
              pointRadius: 4, pointHoverRadius: 6,
            }, {
              label: 'Perfect Fit',
              data: (() => {
                const mn = Math.min(...r.test_actuals);
                const mx = Math.max(...r.test_actuals);
                return [{ x: mn, y: mn }, { x: mx, y: mx }];
              })(),
              type: 'line', borderColor: '#10b981', borderDash: [4, 4], pointRadius: 0, fill: false,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
              x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8', font: { size: 11 } }, title: { display: true, text: 'Actual', color: '#94a3b8' } },
              y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8', font: { size: 11 } }, title: { display: true, text: 'Predicted', color: '#94a3b8' } },
            },
          },
        });
      }
    }

    // Feature importance chart
    if (fiRef.current && featureImportance?.length) {
      if (window.Chart) {
        const existing = window.Chart.getChart(fiRef.current);
        if (existing) existing.destroy();
        const top = featureImportance.slice(0, 10);
        new window.Chart(fiRef.current, {
          type: 'bar',
          data: {
            labels: top.map(f => f.feature),
            datasets: [{
              label: 'Importance',
              data: top.map(f => f.importance),
              backgroundColor: top.map((_, i) => `hsla(${240 + i * 15}, 70%, 65%, 0.75)`),
              borderRadius: 6,
            }],
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
              y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
            },
          },
        });
      }
    }

    // Residuals chart
    if (residRef.current && r.test_predictions && r.test_actuals) {
      if (window.Chart) {
        const existing = window.Chart.getChart(residRef.current);
        if (existing) existing.destroy();
        const residuals = r.test_actuals.map((a, i) => ({ x: r.test_predictions[i], y: a - r.test_predictions[i] }));
        new window.Chart(residRef.current, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Residuals',
              data: residuals,
              backgroundColor: 'rgba(245,158,11,0.5)',
              pointRadius: 4,
            }, {
              label: 'Zero Line',
              data: [{ x: Math.min(...r.test_predictions), y: 0 }, { x: Math.max(...r.test_predictions), y: 0 }],
              type: 'line', borderColor: '#f43f5e', borderDash: [4, 4], pointRadius: 0, fill: false,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
              x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Predicted', color: '#94a3b8' } },
              y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Residual (Actual - Predicted)', color: '#94a3b8' } },
            },
          },
        });
      }
    }
  }, [r, featureImportance]);

  const downloadPredictions = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/api/batch_predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const d = await res.json();
      if (d.batch) {
        const rows = Object.entries(d.batch).map(([model, s]) =>
          `${model},${s.mean},${s.std},${s.min},${s.max}`
        );
        const csv = ['model,mean,std,min,max', ...rows].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = 'ml_playground_predictions.csv';
        a.click(); URL.revokeObjectURL(url);
      }
    } finally { setDownloading(false); }
  };

  if (!r) return <div style={{ color: 'var(--text-muted)', padding: 32 }}>No results yet.</div>;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Training Complete!</h2>
          <p style={{ margin: 0, fontSize: 13 }}>
            {Object.keys(results).length} model{Object.keys(results).length !== 1 ? 's' : ''} trained · target: <strong>{config.target}</strong>
          </p>
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onTryAnother} style={{
            padding: '9px 16px', borderRadius: 9, border: '1px solid var(--border-strong)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
          }}>
            <i className="ti ti-refresh" />Try another model
          </button>
          <button onClick={downloadPredictions} disabled={downloading} style={{
            padding: '9px 16px', borderRadius: 9, border: '1px solid var(--border-strong)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
          }}>
            <i className={`ti ti-${downloading ? 'loader animate-spin' : 'download'}`} />Download predictions
          </button>
          <button onClick={onSaveRun} style={{
            padding: '9px 16px', borderRadius: 9, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s',
          }}>
            <i className="ti ti-bookmark" />Save to history
          </button>
        </div>
      </div>

      {/* Model selector tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(results).map(([key, res]) => {
          const active = key === modelKey;
          const band   = BAND_INTERP[res.band] || BAND_INTERP.Fair;
          return (
            <button key={key} onClick={() => setActiveModel(key)} style={{
              padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${active ? band.color + '60' : 'var(--border-strong)'}`,
              background: active ? band.bg : 'var(--bg-raised)',
              color: active ? band.color : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {res.is_best && <i className="ti ti-crown" style={{ fontSize: 12 }} />}
              {modelNames[key] || key}
              <span style={{ fontSize: 10, opacity: 0.8 }}>R² {res.r2?.toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      {/* Quality band banner */}
      {bestBand && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, background: bestBand.bg,
          border: `1px solid ${bestBand.color}30`, display: 'flex', gap: 12, alignItems: 'center',
          animation: 'slideUp 0.25s ease',
        }}>
          <i className={`ti ti-${bestBand.icon}`} style={{ fontSize: 22, color: bestBand.color, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
            {bestBand.text}
          </p>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
        <MetricCard label="R² Score" value={r.r2?.toFixed(3)} icon="chart-line"
          variant={r.r2 >= 0.85 ? 'success' : r.r2 >= 0.70 ? 'accent' : r.r2 >= 0.50 ? 'warning' : 'error'}
          sub={<HelpTooltip text={getInterpretation('r2', r.r2)} />} />
        <MetricCard label="RMSE" value={r.rmse?.toFixed(3)} icon="ruler" variant="default"
          sub={<HelpTooltip text={getInterpretation('rmse', r.rmse)} />} />
        <MetricCard label="MAE" value={r.mae?.toFixed(3)} icon="target" variant="default"
          sub={<HelpTooltip text={getInterpretation('mae', r.mae)} />} />
        {r.cv_r2 !== undefined && (
          <MetricCard label="CV R² (avg)" value={r.cv_r2?.toFixed(3)} icon="rotate" variant="default"
            sub={<HelpTooltip text="Cross-validation score averaged across all folds — more reliable than a single test split." />} />
        )}
        {r.train_r2 !== undefined && (
          <MetricCard label="Train R²" value={r.train_r2?.toFixed(3)} icon="activity" variant="default"
            sub={<HelpTooltip text={r.train_r2 - r.r2 > 0.15 ? '⚠️ Large gap between train and test — the model may be overfitting.' : 'Training and test scores are close — good generalisation.'} />} />
        )}
      </div>

      {/* ── Feature Selection Pipeline Report ─────────────────────────── */}
      {pipelineReport && (
        <div style={{
          borderRadius: 14, border: '1px solid rgba(99,102,241,0.25)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.04) 100%)',
          overflow: 'hidden', boxShadow: '0 4px 20px rgba(99,102,241,0.05)',
          animation: 'fadeIn 0.4s ease', marginBottom: 16
        }}>
          <button
            onClick={() => setExpandedPipeline(!expandedPipeline)}
            style={{
              width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-layers" style={{ fontSize: 18, color: 'var(--accent)' }} />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 700, display: 'block' }}>Feature Selection & Preprocessing Report</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Automated pipeline funnel and SHAP relative importances</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 10, padding: '2.5px 8px', borderRadius: 99, fontWeight: 600,
                background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
              }}>
                {pipelineReport.selected_features?.length || 0} features selected
              </span>
              <i className={`ti ti-chevron-${expandedPipeline ? 'up' : 'down'}`} style={{ fontSize: 14, color: 'var(--text-muted)' }} />
            </div>
          </button>

          {expandedPipeline && (
            <div style={{
              padding: '18px', borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 24, background: 'rgba(255,255,255,0.01)'
            }}>
              {/* Funnel progression row */}
              <div>
                <h5 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Pipeline Funnel Progression
                </h5>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: 12, alignItems: 'center'
                }}>
                  {[
                    { label: 'Original', val: pipelineReport.stage0_original, color: 'var(--text-secondary)' },
                    { label: 'Generated', val: (pipelineReport.stage0_original || 0) + (pipelineReport.stage1_generated || 0), color: 'var(--accent)' },
                    { label: 'Variance Filter', val: pipelineReport.stage2_after_variance, color: '#f59e0b' },
                    { label: 'Correlation Filter', val: pipelineReport.stage3_after_correlation, color: '#f43f5e' },
                    { label: 'Mutual Info Final', val: pipelineReport.stage4_after_mi, color: '#10b981', active: true }
                  ].map((step, idx, arr) => (
                    <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        flex: 1, padding: '10px', borderRadius: 10, textAlign: 'center',
                        background: step.active ? 'rgba(16,185,129,0.08)' : 'var(--bg-raised)',
                        border: `1.5px solid ${step.active ? '#10b981' : 'var(--border)'}`,
                        boxShadow: step.active ? '0 2px 10px rgba(16,185,129,0.05)' : 'none'
                      }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>{step.label}</span>
                        <strong style={{ fontSize: 14, color: step.active ? '#10b981' : 'var(--text-primary)', display: 'block', marginTop: 4 }}>
                          {step.val != null ? step.val : '—'}
                        </strong>
                      </div>
                      {idx < arr.length - 1 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--border-strong)', padding: '0 4px', fontSize: 12
                        }}>
                          <i className="ti ti-chevron-right" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle Row: First pass LGBM model evaluation & SHAP Importance */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {/* Stage 5: First pass LightGBM performance */}
                <div style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px'
                }}>
                  <h5 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-flame" style={{ color: '#f59e0b' }} />
                    First-Pass Evaluator ({pipelineReport.first_pass_model || 'LightGBM'})
                  </h5>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                    A quick-fit GBDT model was run on the selected features to validate the subsets and compute SHAP interaction coefficients.
                  </p>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block' }}>R² SCORE</span>
                      <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                        {pipelineReport.first_pass_metrics?.r2 != null ? pipelineReport.first_pass_metrics.r2.toFixed(3) : '—'}
                      </strong>
                    </div>
                    <div style={{ width: 1.5, background: 'var(--border)', alignSelf: 'stretch' }} />
                    <div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block' }}>RMSE</span>
                      <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                        {pipelineReport.first_pass_metrics?.rmse != null ? pipelineReport.first_pass_metrics.rmse.toFixed(2) : '—'}
                      </strong>
                    </div>
                    <div style={{ width: 1.5, background: 'var(--border)', alignSelf: 'stretch' }} />
                    <div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block' }}>MAE</span>
                      <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                        {pipelineReport.first_pass_metrics?.mae != null ? pipelineReport.first_pass_metrics.mae.toFixed(2) : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Stage 6: SHAP importances list */}
                <div style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column'
                }}>
                  <h5 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-chart-bar" style={{ color: 'var(--accent)' }} />
                    SHAP Relative Feature Importances
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                    {pipelineReport.shap_rankings && pipelineReport.shap_rankings.length > 0 ? (
                      (() => {
                        const maxVal = Math.max(...pipelineReport.shap_rankings.map(s => s.importance), 0.0001);
                        return pipelineReport.shap_rankings.map((item, idx) => {
                          const pct = (item.importance / maxVal) * 100;
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5 }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.feature}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 9.5 }}>{item.importance.toFixed(4)}</span>
                              </div>
                              <div style={{ width: '100%', height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${pct}%`, height: '100%', borderRadius: 3,
                                  background: 'linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%)'
                                }} />
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No features processed.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Optuna Best Parameters Card ─────────────────────────────── */}
      {r.optuna_used && r.tuned_params && Object.keys(r.tuned_params).length > 0 && (() => {
        const isExpanded = expandedParams[modelKey];
        return (
          <div style={{
            borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.05)', overflow: 'hidden',
          }}>
            <button
              onClick={() => setExpandedParams(p => ({ ...p, [modelKey]: !p[modelKey] }))}
              style={{
                width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 16, color: '#f59e0b' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Best Parameters Found by Optuna</span>
                {r.optuna_best_score != null && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                  }}>CV R² {r.optuna_best_score.toFixed(3)}</span>
                )}
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99,
                  background: 'rgba(245,158,11,0.10)', color: '#b45309', fontWeight: 500,
                }}>{r.optuna_trials} trials</span>
              </div>
              <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 14, color: 'var(--text-muted)' }} />
            </button>
            {isExpanded && (
              <div style={{ padding: '4px 16px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(r.tuned_params).map(([k, v]) => (
                  <div key={k} style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    fontSize: 12,
                  }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{k}</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {typeof v === 'number' ? (v % 1 !== 0 ? v.toFixed(5) : v) : String(v)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20 }}>
        {r.test_predictions && (
          <ChartCard title="Predicted vs Actual" icon="chart-dots" help="Each dot is a test sample. Points close to the dashed green line = accurate predictions.">
            <canvas ref={chartRef} style={{ maxHeight: 250 }} />
          </ChartCard>
        )}
        {featureImportance?.length > 0 && (
          <ChartCard title="Feature Importance" icon="chart-bar" help="Correlation strength between each feature and the target — taller bars contribute more to the model.">
            <canvas ref={fiRef} style={{ maxHeight: 250 }} />
          </ChartCard>
        )}
        {r.test_predictions && (
          <ChartCard title="Residual Plot" icon="activity" help="Residuals = actual − predicted. Points near the red dashed line mean small errors. Patterns in the residuals hint at missing features.">
            <canvas ref={residRef} style={{ maxHeight: 250 }} />
          </ChartCard>
        )}
      </div>
    </div>
  );
}

// ── Run History Panel ───────────────────────────────────────────────────────────
function RunHistoryPanel({ history, onClose }) {
  return (
    <div style={{ padding: '20px 24px', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Run History</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: 18, padding: 4, borderRadius: 6,
        }}>×</button>
      </div>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
          <i className="ti ti-history" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
          No saved runs yet. Train a model and click "Save to history".
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((run, i) => (
            <div key={run.id || i} style={{
              background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 16px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{run.model_name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(run.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 14 }}>
                <span>Target: {run.target_column}</span>
                <span>R² {run.metrics?.r2?.toFixed(3)}</span>
                <span>RMSE {run.metrics?.rmse?.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 3 Root ──────────────────────────────────────────────────────────────────
export default function Tab3({ sessionId, config, confirmedModels = [], onTryAnother }) {
  const [phase,     setPhase]     = useState('pretrain');  // pretrain | training | results
  const [progress,  setProgress]  = useState({});
  const [results,   setResults]   = useState(null);
  const [featureImportance, setFI] = useState([]);
  const [forecast,  setForecast]  = useState([]);
  const [pipelineReport, setPipelineReport] = useState(null);
  const [msgIdx,    setMsgIdx]    = useState(0);
  const [error,     setError]     = useState(null);
  const [history,   setHistory]   = useState([]);
  const [showHist,  setShowHist]  = useState(false);
  const pollRef = useRef();
  const msgRef  = useRef();

  // Model display names (use confirmedModel name or backend key)
  const modelNames = (config.models ?? []).reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {});

  const startTraining = useCallback(async () => {
    if (!sessionId || !config.target || !config.features?.length || !config.models?.length) {
      setError('Please check: session, target column, features, and at least one model must be set.');
      return;
    }
    setPhase('training');
    setError(null);
    setMsgIdx(0);

    // Cycle friendly messages
    msgRef.current = setInterval(() => setMsgIdx(i => (i + 1) % FRIENDLY_MESSAGES.length), 2500);

    try {
      const r = await fetch(`${API}/api/train`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, ...config }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);

      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/progress/${sessionId}`);
          const pd = await pr.json();
          setProgress(pd);
          const allDone = Object.keys(pd).length > 0 && Object.values(pd).every(v => v.status === 'done' || v.status === 'error');
          if (allDone) {
            clearInterval(pollRef.current);
            clearInterval(msgRef.current);
            const res = await fetch(`${API}/api/results/${sessionId}`);
            const rd  = await res.json();
            if (rd.error) throw new Error(rd.error);
            setResults(rd.results);
            setFI(rd.feature_importance ?? []);
            setForecast(rd.forecast ?? []);
            setPipelineReport(rd.feature_pipeline_report ?? null);
            setTimeout(() => setPhase('results'), 600);
          }
        } catch (_) {}
      }, 500);
    } catch (e) {
      setError(e.message);
      clearInterval(msgRef.current);
      setPhase('pretrain');
    }
  }, [sessionId, config]);

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearInterval(msgRef.current);
  }, []);

  const saveRun = async () => {
    const bestKey = Object.keys(results ?? {}).find(k => results[k].is_best) || Object.keys(results ?? {})[0];
    const bestModelObj = confirmedModels.find(m => m.backendKey === bestKey);
    const payload = {
      model_name: bestModelObj?.name || bestKey,
      dataset_name: 'uploaded_dataset',
      target_column: config.target,
      metrics: results?.[bestKey],
      config: { features: config.features, split: config.split },
      feature_count: config.features?.length ?? 0,
    };
    try {
      const r = await fetch(`${API}/api/history`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.id) {
        setHistory(h => [d, ...h]);
        setShowHist(true);
      }
    } catch (_) {}
  };

  const loadHistory = async () => {
    try {
      const r = await fetch(`${API}/api/history`);
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch (_) {}
    setShowHist(p => !p);
  };

  // Pre-train summary
  if (phase === 'pretrain') {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
        {/* Pre-train summary card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, var(--bg-raised) 60%)',
          borderRadius: 20, padding: '32px 36px',
          border: '1px solid var(--border-strong)', marginBottom: 20,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
            background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-rocket" style={{ fontSize: 28, color: 'var(--accent)' }} />
          </div>
          <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Ready to train</h2>
          <p style={{ textAlign: 'center', margin: '0 0 24px', color: 'var(--text-secondary)', fontSize: 13 }}>
            You're training <strong style={{ color: 'var(--text-primary)' }}>
              {confirmedModels.length > 0 ? confirmedModels.map(m => m.name).join(', ') : `${config.models?.length} model(s)`}
            </strong> to predict <strong style={{ color: 'var(--text-primary)' }}>{config.target}</strong>{' '}
            using <strong style={{ color: 'var(--text-primary)' }}>{config.features?.length} feature{config.features?.length !== 1 ? 's' : ''}</strong> with an{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{Math.round((1 - config.split) * 100)}/{Math.round(config.split * 100)}</strong> split.
          </p>

          {/* Config pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {[
              { label: `${config.features?.length} features`, icon: 'columns-3' },
              { label: `${Math.round((1 - config.split) * 100)}/${Math.round(config.split * 100)} split`, icon: 'divide' },
              { label: `${config.cv_folds}-fold CV`, icon: 'rotate' },
              { label: config.normalization === 'none' ? 'No scaling' : config.normalization, icon: 'arrows-maximize' },
              ...(config.use_optuna !== false ? [{ label: `Optuna · ${config.optuna_trials ?? 25} trials`, icon: 'sparkles', color: '#f59e0b' }] : []),
            ].map((pill, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 99, fontSize: 12,
                background: pill.color ? 'rgba(245,158,11,0.10)' : 'var(--bg-overlay)',
                border: `1px solid ${pill.color ? 'rgba(245,158,11,0.3)' : 'var(--border-strong)'}`,
                color: pill.color || 'var(--text-secondary)',
              }}>
                <i className={`ti ti-${pill.icon}`} style={{ fontSize: 12 }} />
                {pill.label}
              </span>
            ))}
          </div>

          <button onClick={startTraining} style={{
            width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <i className="ti ti-player-play-filled" style={{ fontSize: 18 }} />
            Train model
          </button>
          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--error-bg)',
              border: '1px solid rgba(244,63,94,0.25)', color: 'var(--error)', fontSize: 12 }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
            </div>
          )}
        </div>

        {/* History button */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={loadHistory} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          }}>
            <i className="ti ti-history" />View run history
          </button>
        </div>
        {showHist && <RunHistoryPanel history={history} onClose={() => setShowHist(false)} />}
      </div>
    );
  }

  if (phase === 'training') {
    return (
      <TrainingScreen
        models={config.models ?? []}
        progress={progress}
        friendlyMsg={FRIENDLY_MESSAGES[msgIdx]}
        confirmedModels={confirmedModels}
      />
    );
  }

  return (
    <div>
      <ResultsDashboard
        results={results ?? {}}
        featureImportance={featureImportance}
        forecast={forecast}
        pipelineReport={pipelineReport}
        sessionId={sessionId}
        config={config}
        onTryAnother={onTryAnother}
        onSaveRun={saveRun}
        confirmedModels={confirmedModels}
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button onClick={loadHistory} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-history" />View run history
        </button>
      </div>
      {showHist && <RunHistoryPanel history={history} onClose={() => setShowHist(false)} />}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function ChartCard({ title, icon, help, children }) {
  return (
    <div style={{ background: 'var(--bg-raised)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 15, color: 'var(--text-muted)' }} />
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{title}</h4>
        {help && <HelpIcon content={help} />}
      </div>
      <div style={{ height: 250, position: 'relative' }}>{children}</div>
    </div>
  );
}

function HelpTooltip({ text }) {
  return <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{text}</span>;
}

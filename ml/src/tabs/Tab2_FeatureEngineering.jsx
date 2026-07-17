import { useState, useEffect } from 'react';
import { HelpIcon } from '../components/ui/Tooltip.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

const TYPE_BADGE = {
  numeric:     { label: 'Numeric',     bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', icon: 'number-123' },
  categorical: { label: 'Categorical', bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', icon: 'category'  },
  datetime:    { label: 'Date',        bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', icon: 'calendar'  },
};

// ── Column type badge ───────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const s = TYPE_BADGE[type] || TYPE_BADGE.categorical;
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500,
      background: s.bg, color: s.text, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <i className={`ti ti-${s.icon}`} style={{ fontSize: 11 }} />
      {s.label}
    </span>
  );
}

// ── Toggle Group ────────────────────────────────────────────────────────────────
function ToggleGroup({ value, options, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 3, background: 'var(--bg-surface)', padding: 3,
      borderRadius: 8, border: '1px solid var(--border-strong)', flexWrap: 'wrap',
    }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, minWidth: 50, padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 12,
            background: active ? 'var(--accent)' : 'transparent',
            color: active ? '#fff' : 'var(--text-secondary)',
            fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

// ── Feature card ────────────────────────────────────────────────────────────────
function FeatureCard({ col, meta, isSelected, corr, target, config, onToggle, session }) {
  const absCorr = Math.abs(corr ?? 0);
  const leaks   = absCorr >= 0.97;
  const weak    = absCorr < 0.05 && meta?.type === 'numeric';

  // Categorical overfitting hazard: high cardinality
  const isOverfitCat = meta?.type === 'categorical' && (meta.cardinality > 25 || meta.cardinality >= session?.rows * 0.9);

  const hasWarning = leaks || isOverfitCat;
  const hasHint    = weak;

  return (
    <div onClick={onToggle} style={{
      background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
      border: `1px solid ${isSelected ? (hasWarning ? 'rgba(244,63,94,0.50)' : 'var(--accent)') : 'var(--border)'}`,
      transition: 'all 0.15s',
      boxShadow: isSelected ? (hasWarning ? '0 0 0 2px rgba(244,63,94,0.12)' : '0 0 0 2px rgba(99,102,241,0.10)') : 'none',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input type="checkbox" checked={isSelected} readOnly
          style={{ cursor: 'pointer', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {col}
        </span>
        {meta?.type && <TypeBadge type={meta.type} />}
      </div>

      {/* Pearson Correlation display */}
      {meta?.type === 'numeric' && target && corr !== undefined ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: 'var(--text-muted)' }}>
            <span>Pearson correlation (r)</span>
            <span style={{ fontWeight: 600, color: corr > 0 ? '#10b981' : corr < 0 ? '#f43f5e' : 'var(--text-muted)' }}>
              r = {corr > 0 ? '+' : ''}{corr.toFixed(3)}
            </span>
          </div>
          <ProgressBar
            pct={absCorr * 100}
            height={4}
            color={corr > 0 ? '#10b981' : corr < 0 ? '#f43f5e' : 'var(--text-muted)'}
          />
        </div>
      ) : (
        <div style={{ marginBottom: 8, fontSize: 10, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Pearson correlation</span>
          <span style={{ fontWeight: 500 }}>N/A (Categorical)</span>
        </div>
      )}

      {/* Warnings & hints */}
      {leaks && (
        <div style={{ fontSize: 10, color: '#f43f5e', display: 'flex', gap: 4, alignItems: 'center' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />
          Near-perfect correlation — likely target leak
        </div>
      )}
      {isOverfitCat && (
        <div style={{ fontSize: 10, color: '#f43f5e', display: 'flex', gap: 4, alignItems: 'center' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />
          High cardinality ({meta.cardinality} values) — will cause overfitting
        </div>
      )}
      {weak && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
          <i className="ti ti-minus" style={{ fontSize: 11 }} />
          Low correlation — likely noise
        </div>
      )}
      {/* Encoding status */}
      {meta?.type === 'categorical' && (
        <div style={{ fontSize: 10, color: config?.onehot_columns?.includes(col) ? '#818cf8' : 'var(--text-muted)',
          display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
          <i className="ti ti-code" style={{ fontSize: 11 }} />
          {config?.onehot_columns?.includes(col) ? 'Will be one-hot encoded' : 'Enable to auto-encode'}
        </div>
      )}
    </div>
  );
}

// ── Code preview ────────────────────────────────────────────────────────────────
function CodePreview({ config }) {
  const [open, setOpen] = useState(false);

  const code = `from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
import pandas as pd

df = pd.read_csv("your_data.csv")

# Features & target
X = df[${JSON.stringify(config.features)}]
y = df["${config.target}"]

# Preprocessing
preprocessor = ColumnTransformer([
    ("num", StandardScaler(), ${JSON.stringify(config.features.filter((_, i) => true))}),
${config.onehot_columns?.length ? `    ("cat", OneHotEncoder(), ${JSON.stringify(config.onehot_columns)}),` : ''}
])

# Train/test split (${Math.round((1 - config.split) * 100)}/${Math.round(config.split * 100)})
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=${config.split}, random_state=42)
`;

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, padding: '4px 0',
      }}>
        <i className={`ti ti-code ${open ? '' : ''}`} style={{ fontSize: 14 }} />
        {open ? 'Hide' : 'View'} generated Python code
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 12 }} />
      </button>
      {open && (
        <pre style={{ marginTop: 10, fontSize: 11, lineHeight: 1.5, overflowX: 'auto', padding: 14,
          borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)',
          color: '#a5f3fc', animation: 'slideUp 0.2s ease' }}>
          {code}
        </pre>
      )}
    </div>
  );
}

// ── Live Summary Panel ──────────────────────────────────────────────────────────
function LiveSummary({ config, models = [], rows }) {
  const feats = config.features?.length ?? 0;
  const trainRows = Math.round(rows * (1 - (config.split ?? 0.2)));
  const testRows  = rows - trainRows;

  const modelNames = models.map(m => m.name).join(', ') || '—';

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border-strong)',
      borderRadius: 14, padding: '18px 20px', position: 'sticky', top: 16,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.07em', marginBottom: 14 }}>Training Summary</div>

      {[
        { label: models.length <= 1 ? 'Model' : 'Models',    value: modelNames,         icon: 'cpu' },
        { label: 'Target',   value: config.target || '—',       icon: 'target' },
        { label: 'Features', value: `${feats} column${feats !== 1 ? 's' : ''}`, icon: 'columns-3' },
        { label: 'Split',    value: `${Math.round((1 - config.split) * 100)}/${Math.round(config.split * 100)} train/test`, icon: 'divide' },
        { label: 'Train rows', value: trainRows.toLocaleString(), icon: 'database' },
        { label: 'Test rows',  value: testRows.toLocaleString(),  icon: 'flask' },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7,
            background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ti-${row.icon}`} style={{ fontSize: 13, color: 'var(--text-muted)' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{row.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Split Data Highlights ───────────────────────────────────────────────────────
function SplitHighlights({ trainSample, testSample, displayCols, config, MiniTable, trainCount, testCount, totalRows, testFrac }) {
  const [open, setOpen] = useState(false);
  const trainPct  = Math.round((1 - testFrac) * 100);
  const testPct   = Math.round(testFrac * 100);

  return (
    <div style={{ marginTop: 12, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', background: 'var(--bg-raised)', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-table-row" style={{ fontSize: 13, color: 'var(--text-muted)' }} />
          <span>Split Data Highlights</span>
          {/* Pill counts */}
          <span style={{ display: 'flex', gap: 5 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: 'rgba(16,185,129,0.14)', color: '#10b981'
            }}>
              Train — {trainCount.toLocaleString()} rows ({trainPct}%)
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: 'rgba(99,102,241,0.13)', color: '#818cf8'
            }}>
              Test — {testCount.toLocaleString()} rows ({testPct}%)
            </span>
          </span>
        </div>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 13, color: 'var(--text-muted)' }} />
      </button>

      {/* Collapsible body */}
      {open && (
        <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
            Showing sample rows from each partition (target column highlighted). Columns shown: {displayCols.join(', ')}.
          </p>

          {/* Train sample */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block'
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>Training Set</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— first {trainSample.length} rows of {trainCount.toLocaleString()} total</span>
            </div>
            <MiniTable rows={trainSample} accent="#10b981" />
          </div>

          {/* Test sample */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#818cf8', display: 'inline-block'
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>Test Set</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— last {testSample.length} rows of {testCount.toLocaleString()} total</span>
            </div>
            <MiniTable rows={testSample} accent="#818cf8" />
          </div>

          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
            ⓘ Preview rows are drawn from the uploaded dataset before shuffling. Actual split assignment depends on the chosen split method.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tab 2 Root ──────────────────────────────────────────────────────────────────
export default function Tab2({ session, config, setConfig, confirmedModels = [], onContinue }) {
  const cols   = session?.columns ?? [];
  const metas  = session?.columns_metadata ?? [];

  // Initialize smart, favourable defaults based on target, models, and metadata
  useEffect(() => {
    if (session && confirmedModels.length > 0) {
      const target = config.target || session.suggested_target || cols[0];
      const primaryModel = confirmedModels[0];
      const category = primaryModel?.category;

      const features = [];
      const onehot = [];
      const periodic = [];

      metas.forEach(col => {
        if (col.name === target) return;

        // Categorical checks
        if (col.type === 'categorical') {
          if (col.cardinality <= 1 || col.cardinality > 25 || col.cardinality >= session.rows * 0.9) return;
          onehot.push(col.name);
        }

        // Numeric checks
        if (col.type === 'numeric') {
          const corr = session.correlations?.[target]?.[col.name];
          const absCorr = corr !== undefined ? Math.abs(corr) : 0;

          // Exclude target leakage (corr >= 0.97)
          if (absCorr >= 0.97) return;

          // Exclude low correlation / noise features (overfitting prevention)
          if (absCorr < 0.05) return;
        }

        // Datetime columns
        if (col.type === 'datetime') {
          periodic.push({ column: col.name, type: 'datetime', period_type: 'auto' });
        }

        features.push(col.name);
      });

      const needsNormalize = confirmedModels.some(m =>
        ['linear', 'ridge', 'nn', 'kmeans', 'dbscan', 'pca', 'arima', 'lstm'].includes(m.backendKey)
      );
      const normalization = needsNormalize ? 'zscore' : 'none';
      const split_method = (category === 'timeseries') ? 'chronological' : 'random';

      setConfig(c => ({
        ...c,
        target,
        features,
        normalization,
        split_method,
        onehot_columns: onehot,
      }));
    }
  }, [session, confirmedModels, config.target]);

  const toggleFeature = col => {
    const meta = metas.find(m => m.name === col);
    setConfig(c => {
      const has = c.features.includes(col);
      const newFeats = has ? c.features.filter(f => f !== col) : [...c.features, col];
      let ohe = c.onehot_columns ?? [];
      let per = c.periodic_columns ?? [];
      if (!has && meta?.type === 'categorical' && !ohe.includes(col)) ohe = [...ohe, col];
      else if (has && meta?.type === 'categorical') ohe = ohe.filter(x => x !== col);
      if (!has && meta?.type === 'datetime' && !per.some(p => p.column === col))
        per = [...per, { column: col, type: 'datetime', period_type: 'auto' }];
      else if (has && meta?.type === 'datetime') per = per.filter(p => p.column !== col);
      return { ...c, features: newFeats, onehot_columns: ohe, periodic_columns: per };
    });
  };

  const setTarget = col => {
    setConfig(c => ({ ...c, target: col, features: [] }));
  };

  const canContinue = config.target && config.features?.length > 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Two-column layout: main + sticky summary */}
      <div className="tab2-main-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Dataset Preview */}
          <Section title="Dataset Preview" icon="table" description="First 8 rows of your dataset">
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table>
                <thead>
                  <tr>
                    {cols.map(c => (
                      <th key={c} style={{ color: c === config.target ? '#10b981' : undefined }}>
                        {c}
                        {c === config.target && <i className="ti ti-target" style={{ marginLeft: 5, fontSize: 11 }} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(session?.preview ?? []).map((row, i) => (
                    <tr key={i}>
                      {cols.map(c => (
                        <td key={c} style={{ color: c === config.target ? '#10b981' : undefined }}>
                          {row[c] == null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span> : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Target Column */}
          <Section title="Target Column" icon="target"
            description="The column your model will learn to predict"
            help="The target (or 'label') is the value you want the model to predict for new, unseen data.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cols.map(col => {
                const active = config.target === col;
                const suggested = col === session?.suggested_target;
                return (
                  <button key={col} onClick={() => setTarget(col)} style={{
                    padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: `1.5px solid ${active ? '#10b981' : 'var(--border-strong)'}`,
                    background: active ? 'rgba(16,185,129,0.12)' : 'var(--bg-raised)',
                    color: active ? '#10b981' : 'var(--text-secondary)', transition: 'all 0.15s',
                  }}>
                    {active && <i className="ti ti-check" style={{ marginRight: 5, fontSize: 12 }} />}
                    {col}
                    {suggested && !active && <span style={{ marginLeft: 5, fontSize: 10, color: '#f59e0b' }}>★</span>}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Feature Columns */}
          <Section title="Feature Columns" icon="columns-3"
            description={`${config.features?.length ?? 0} of ${cols.filter(c => c !== config.target).length} columns selected`}
            help="Features are the inputs the model uses to learn patterns. More isn't always better — irrelevant features can hurt accuracy.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
              {cols.filter(c => c !== config.target).map(col => {
                const meta = metas.find(m => m.name === col);
                const corr = session?.correlations?.[config.target]?.[col];
                return (
                  <FeatureCard key={col} col={col} meta={meta}
                    isSelected={config.features?.includes(col)}
                    corr={corr} target={config.target} config={config}
                    onToggle={() => toggleFeature(col)}
                    session={session} />
                );
              })}
            </div>
          </Section>

          {/* Feature Engineering */}
          <Section title="Feature Engineering" icon="wand"
            description="Preprocessing transforms applied before training">

            {/* Scaling */}
            <EngRow title="Scaling" icon="arrows-maximize" help="Scaling normalises numeric features to the same range so no single column dominates the model. Use Z-Score for normally distributed data, Min-Max for bounded ranges.">
              <ToggleGroup value={config.normalization ?? 'none'} onChange={v => setConfig(c => ({ ...c, normalization: v }))}
                options={[{ value:'none',label:'None' },{ value:'zscore',label:'Z-Score' },{ value:'minmax',label:'Min-Max' }]} />
            </EngRow>

            {/* Missing values */}
            <EngRow title="Missing Values" icon="circle-dotted" help="How to fill in missing data points. Mean/Median imputation keeps all rows; Drop Rows removes any row with at least one null.">
              <ToggleGroup value={config.missing ?? 'mean'} onChange={v => setConfig(c => ({ ...c, missing: v }))}
                options={[{ value:'mean',label:'Fill with Mean' },{ value:'median',label:'Fill with Median' },{ value:'drop',label:'Drop Rows' }]} />
            </EngRow>

            {/* One-hot encoding */}
            {metas.filter(m => m.type === 'categorical').length > 0 && (
              <EngRow title="One-Hot Encoding" icon="code" help="Converts categorical text columns into numeric binary columns — required for most ML models. e.g. 'Red/Blue/Green' → three 0/1 columns.">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {metas.filter(m => m.type === 'categorical').map(col => {
                    const on = config.onehot_columns?.includes(col.name);
                    return (
                      <label key={col.name} style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px',
                        borderRadius: 8, border: `1px solid ${on ? 'rgba(99,102,241,0.40)' : 'var(--border-strong)'}`,
                        background: on ? 'rgba(99,102,241,0.08)' : 'var(--bg-raised)',
                        cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
                      }}>
                        <input type="checkbox" checked={on} onChange={() => setConfig(c => {
                          const list = c.onehot_columns ?? [];
                          const newList = list.includes(col.name) ? list.filter(x => x !== col.name) : [...list, col.name];
                          let feats = c.features ?? [];
                          if (!on && !feats.includes(col.name)) feats = [...feats, col.name];
                          return { ...c, onehot_columns: newList, features: feats };
                        })} />
                        {col.name}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({col.cardinality} values)</span>
                      </label>
                    );
                  })}
                </div>
              </EngRow>
            )}

            {/* Date decomposition */}
            {metas.filter(m => m.type === 'datetime').length > 0 && (
              <EngRow title="Date Decomposition" icon="calendar-event" help="Extracts month, day-of-week etc. as sine/cosine pairs — this preserves the circular nature of time (January is close to December, not far from it).">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {metas.filter(m => m.type === 'datetime').map(col => {
                    const on = config.periodic_columns?.some(p => p.column === col.name);
                    return (
                      <label key={col.name} style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8,
                        border: `1px solid ${on ? 'rgba(56,189,248,0.40)' : 'var(--border-strong)'}`,
                        background: on ? 'rgba(56,189,248,0.08)' : 'var(--bg-raised)',
                        cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
                      }}>
                        <input type="checkbox" checked={on} onChange={() => setConfig(c => {
                          const list = c.periodic_columns ?? [];
                          const idx = list.findIndex(p => p.column === col.name);
                          const newList = idx >= 0 ? list.filter(p => p.column !== col.name)
                            : [...list, { column: col.name, type: 'datetime', period_type: 'auto' }];
                          let feats = c.features ?? [];
                          if (idx < 0 && !feats.includes(col.name)) feats = [...feats, col.name];
                          return { ...c, periodic_columns: newList, features: feats };
                        })} />
                        {col.name}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>sin/cos</span>
                      </label>
                    );
                  })}
                </div>
              </EngRow>
            )}

            <CodePreview config={config} />
          </Section>

          {/* Training Settings */}
          <Section title="Training Settings" icon="settings"
            description="Control how the model is trained and validated">

            {/* Train/Test Split slider */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Train / Test Split</span>
                  <HelpIcon content="Training data teaches the model; test data measures how well it generalises to new examples. A common default is 80/20." />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {Math.round((1 - config.split) * 100)}% train / {Math.round(config.split * 100)}% test
                </span>
              </div>
              <input type="range" min="0.05" max="0.45" step="0.05" value={config.split ?? 0.2}
                onChange={e => setConfig(c => ({ ...c, split: +e.target.value }))} />
              {/* Visual split bar */}
              <div style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden', marginTop: 8, fontSize: 10, fontWeight: 600 }}>
                <div style={{ flex: 1 - (config.split ?? 0.2), background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#10b981', borderRadius: '8px 0 0 8px' }}>
                  Train ({Math.round(session?.rows * (1 - (config.split ?? 0.2))).toLocaleString()} rows)
                </div>
                <div style={{ flex: config.split ?? 0.2, background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.30)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#818cf8', borderRadius: '0 8px 8px 0' }}>
                  Test ({Math.round(session?.rows * (config.split ?? 0.2)).toLocaleString()})
                </div>
              </div>

              {/* Split Data Highlights */}
              {(() => {
                const preview = session?.preview ?? [];
                const totalRows = session?.rows ?? preview.length;
                const testFrac = config.split ?? 0.2;
                const trainCount = Math.round(totalRows * (1 - testFrac));
                // From the preview array, approximate train = first rows, test = last rows
                const previewLen = preview.length;
                const splitIdx = Math.round(previewLen * (1 - testFrac));
                const trainSample = preview.slice(0, Math.min(3, splitIdx));
                const testSample  = preview.slice(Math.max(0, splitIdx - 1)).slice(-3);
                // Display columns: selected features + target, fall back to all session cols
                const featCols = (config.features ?? []).filter(f => f !== config.target);
                const allCols = session?.columns ?? [];
                const preferredCols = [
                  ...(config.target ? [config.target] : []),
                  ...featCols
                ];
                const displayCols = (preferredCols.length > 0 ? preferredCols : allCols).slice(0, 5);
                if (!preview.length) return null;

                const MiniTable = ({ rows, accent }) => (
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${accent}30` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead>
                        <tr style={{ background: `${accent}12` }}>
                          {displayCols.map(c => (
                            <th key={c} style={{
                              padding: '4px 8px', textAlign: 'left', fontWeight: 700,
                              color: c === config.target ? accent : 'var(--text-muted)',
                              whiteSpace: 'nowrap', borderBottom: `1px solid ${accent}25`
                            }}>
                              {c === config.target && <i className="ti ti-target" style={{ marginRight: 3, fontSize: 9 }} />}
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${accent}15` }}>
                            {displayCols.map(c => (
                              <td key={c} style={{
                                padding: '4px 8px', fontWeight: c === config.target ? 600 : 400,
                                color: c === config.target ? accent : 'var(--text-secondary)',
                                whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis'
                              }}>
                                {row[c] == null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span> : String(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

                return (
                  <SplitHighlights
                    trainSample={trainSample}
                    testSample={testSample}
                    displayCols={displayCols}
                    config={config}
                    MiniTable={MiniTable}
                    trainCount={trainCount}
                    testCount={Math.round(totalRows * testFrac)}
                    totalRows={totalRows}
                    testFrac={testFrac}
                  />
                );
              })()}
            </div>

            {/* Split method */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 500 }}>
                  Split Method
                  <HelpIcon content="Random: rows shuffled before splitting — best for most cases. Chronological: keeps time order — use for time series to avoid future data leaking into training." />
                </div>
                <ToggleGroup value={config.split_method ?? 'random'} onChange={v => setConfig(c => ({ ...c, split_method: v }))}
                  options={[{ value:'random',label:'Random' },{ value:'chronological',label:'Chronological' }]} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 500 }}>
                  Cross-Validation
                  <HelpIcon content="Cross-validation trains the model multiple times on different portions of the data to give a more reliable accuracy estimate." />
                </div>
                <ToggleGroup value={config.cv_folds ?? 5} onChange={v => setConfig(c => ({ ...c, cv_folds: v }))}
                  options={[{ value:3,label:'3 Folds' },{ value:5,label:'5 Folds' },{ value:10,label:'10 Folds' }]} />
              </div>
            </div>

            {/* Hyperparameter presets */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 500 }}>
                Hyperparameter Preset
                <HelpIcon content="Simple: fast, fewer trees. Balanced: recommended for most cases. Advanced: more complexity, slower but potentially better accuracy." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {[
                  { id:'simple',  label:'Simple',   desc:'Fewer trees, fast results',       n:50,  lr:0.15, icon:'bolt' },
                  { id:'balanced',label:'Balanced',  desc:'Recommended starting point',      n:100, lr:0.10, icon:'adjustments-horizontal' },
                  { id:'advanced',label:'Advanced',  desc:'More trees, slower but stronger', n:200, lr:0.05, icon:'brain' },
                ].map(preset => {
                  const active = config.n_estimators === preset.n && config.learning_rate === preset.lr;
                  return (
                    <button key={preset.id} onClick={() => setConfig(c => ({ ...c, n_estimators: preset.n, learning_rate: preset.lr }))}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-raised)',
                        color: 'var(--text-primary)', transition: 'all 0.15s',
                        boxShadow: active ? '0 0 0 2px rgba(99,102,241,0.12)' : 'none',
                      }}>
                      <i className={`ti ti-${preset.icon}`} style={{ fontSize: 16, color: active ? 'var(--accent)' : 'var(--text-muted)', display: 'block', marginBottom: 6 }} />
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{preset.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Continue CTA */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button onClick={onContinue} disabled={!canContinue} style={{
              padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
              background: canContinue ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-overlay)',
              color: canContinue ? '#fff' : 'var(--text-muted)',
              cursor: canContinue ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Start training
              <i className="ti ti-arrow-right" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        {/* Sticky summary */}
        <LiveSummary config={config} models={confirmedModels} rows={session?.rows ?? 0} />
      </div>
    </div>
  );
}

function Section({ title, icon, description, help, children }) {
  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ti-${icon}`} style={{ fontSize: 14, color: 'var(--accent)' }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            {title}
            {help && <HelpIcon content={help} />}
          </h3>
        </div>
        {description && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 36 }}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EngRow({ title, icon, help, children }) {
  return (
    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 14, color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
        {help && <HelpIcon content={help} />}
      </div>
      {children}
    </div>
  );
}

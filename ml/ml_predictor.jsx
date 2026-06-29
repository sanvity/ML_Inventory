import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:7860";

const PURPOSES = {
  classification: {
    label: "Classification",
    icon: "category",
    description: "Predict discrete class labels or categories"
  },
  prediction: {
    label: "Prediction (Regression)",
    icon: "chart-line",
    description: "Estimate continuous numeric quantities"
  },
  projection: {
    label: "Projection (Forecasting)",
    icon: "trending-up",
    description: "Project sequential values or step forecasts"
  },
  recommendation: {
    label: "Recommendation",
    icon: "thumb-up",
    description: "Map preference values or user rankings"
  }
};

const PURPOSE_CONFIGS = {
  classification: {
    models: ["rf", "gbm", "nn"],
    split_method: "random",
    cv_folds: 5,
    normalization: "none",
    learning_rate: 0.1,
    reasoning: "Classification tasks require robust non-linear boundaries. Random Forest, Gradient Boosting, and Neural Networks are selected by default as they handle multi-class partitions natively. Settings use a standard random split and 5-fold cross-validation to assess label generalizability without structural bias."
  },
  prediction: {
    models: ["linear", "rf", "gbm"],
    split_method: "random",
    cv_folds: 5,
    normalization: "none",
    learning_rate: 0.1,
    reasoning: "Continuous predictions are best modeled by a combination of simple linear trends and complex tree ensembles. Linear Regression, Random Forest, and Gradient Boosting are selected by default. Settings use a standard random split to measure general numeric accuracy."
  },
  projection: {
    models: ["ridge", "gbm", "nn"],
    split_method: "chronological",
    cv_folds: 5,
    normalization: "zscore",
    learning_rate: 0.05,
    reasoning: "Forecasting requires respecting the time arrow. A chronological split method is selected automatically to avoid future-data leakage. Ridge, GBM, and Neural Network are chosen to model time lag relationships, with Z-Score normalization to scale trend variables correctly."
  },
  recommendation: {
    models: ["ridge", "nn"],
    split_method: "random",
    cv_folds: 3,
    normalization: "zscore",
    learning_rate: 0.05,
    reasoning: "Recommendation is treated as a regularized matrix rating prediction or user-item embedding regression. Ridge regression (L2 regularization) avoids overfitting on sparse interaction matrices, while Neural Networks model deep collaborative interactions. Z-score scaling standardizes diverse rating systems."
  }
};

const MODEL_LABELS = {
  linear: "Linear Regression",
  ridge: "Ridge Regression",
  rf: "Random Forest",
  gbm: "Gradient Boosting",
  adaboost: "AdaBoost",
  nn: "Neural Network",
};

const BAND_COLORS = {
  Excellent: { bg: "#eaf3de", text: "#3B6D11", border: "#639922" },
  Good: { bg: "#e6f1fb", text: "#185FA5", border: "#378ADD" },
  Fair: { bg: "#faeeda", text: "#854F0B", border: "#EF9F27" },
  Weak: { bg: "#fcebeb", text: "#A32D2D", border: "#E24B4A" },
};
const TIER_COLORS = {
  Good: { bg: "#eaf3de", text: "#3B6D11" },
  "At Risk": { bg: "#faeeda", text: "#854F0B" },
  Poor: { bg: "#fcebeb", text: "#A32D2D" },
};

function Badge({ label, style }) {
  const colors = BAND_COLORS[label] || { bg: "#f1efe8", text: "#5f5e5a", border: "#b4b2a9" };
  return (
    <span style={{
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500, ...style
    }}>
      {label}
    </span>
  );
}

function TierBadge({ label }) {
  const c = TIER_COLORS[label] || TIER_COLORS["At Risk"];
  return (
    <span style={{
      background: c.bg, color: c.text, borderRadius: 6, padding: "2px 8px",
      fontSize: 12, fontWeight: 500
    }}>{label}</span>
  );
}

function ProgressBar({ pct, color = "#378ADD", height = 6 }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, pct))}%`, background: color,
        height: "100%", borderRadius: 99, transition: "width 0.4s ease"
      }} />
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)", borderRadius: 8,
      padding: "12px 16px", textAlign: "center"
    }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Tooltip({ content, children, position = "top", style = {} }) {
  const [visible, setVisible] = useState(false);
  const showTooltip = !!content;

  return (
    <div
      style={{ position: "relative", display: "inline-block", ...style }}
      onMouseEnter={() => showTooltip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => showTooltip && setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {showTooltip && visible && (
        <div style={{
          position: "absolute",
          bottom: position === "top" ? "calc(100% + 8px)" : "auto",
          top: position === "bottom" ? "calc(100% + 8px)" : "auto",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1e293b",
          color: "#ffffff",
          padding: "10px 14px",
          borderRadius: "6px",
          fontSize: "11px",
          lineHeight: "1.4",
          width: "240px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 9999,
          pointerEvents: "none",
          textAlign: "left",
          whiteSpace: "normal"
        }}>
          {content}
          <div style={{
            position: "absolute",
            top: position === "top" ? "100%" : "auto",
            bottom: position === "bottom" ? "100%" : "auto",
            left: "50%",
            transform: "translateX(-50%)",
            borderWidth: "5px",
            borderStyle: "solid",
            borderColor: position === "top"
              ? "#1e293b transparent transparent transparent"
              : "transparent transparent #1e293b transparent",
          }} />
        </div>
      )}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ["Data", "Configure", "Train", "Results", "Predict", "History"];

function StepBar({ active, unlocked, onGo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, overflowX: "auto" }}>
      {STEPS.map((s, i) => {
        const done = i < active;
        const cur = i === active;
        const ok = i <= unlocked || i === 5;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
            <button
              disabled={!ok}
              onClick={() => ok && onGo(i)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 4px", border: "none", background: "none", cursor: ok ? "pointer" : "not-allowed",
                flex: 1, minWidth: 0, opacity: ok ? 1 : 0.4
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500,
                background: cur ? "#378ADD" : done ? "#639922" : "var(--color-background-secondary)",
                color: (cur || done) ? "#fff" : "var(--color-text-secondary)",
                border: cur ? "2px solid #185FA5" : done ? "2px solid #3B6D11" : "0.5px solid var(--color-border-tertiary)"
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 11, color: cur ? "#185FA5" : "var(--color-text-secondary)",
                fontWeight: cur ? 500 : 400, whiteSpace: "nowrap"
              }}>{s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div style={{
                height: 1, flex: 1, background: done ? "#639922" : "var(--color-border-tertiary)",
                margin: "0 2px", marginBottom: 20, minWidth: 10
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 0: Data Upload ────────────────────────────────────────────────────────
function DataTab({ onLoaded }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    const isCsvOrExcel = file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isCsvOrExcel) { setError("Please upload a CSV or Excel file."); return; }
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      onLoaded(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#378ADD" : "var(--color-border-secondary)"}`,
          borderRadius: 12, padding: "48px 32px", textAlign: "center", cursor: "pointer",
          background: dragging ? "var(--color-background-info)" : "var(--color-background-secondary)",
          transition: "all 0.2s"
        }}>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} />
        <i className="ti ti-upload" aria-hidden style={{ fontSize: 36, color: "#378ADD", display: "block", marginBottom: 12 }} />
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Drop a CSV or Excel file here</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>or click to browse — any domain works</div>
      </div>
      {loading && <div style={{ textAlign: "center", marginTop: 20, color: "var(--color-text-secondary)" }}>Parsing…</div>}
      {error && <div style={{ marginTop: 12, color: "#A32D2D", fontSize: 13 }}>{error}</div>}
    </div>
  );
}

// ── Tab 0: Data Preview ───────────────────────────────────────────────────────
function DataPreview({ data }) {
  if (!data) return null;
  const cols = data.columns || [];
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <MetricCard label="Total rows" value={data.rows?.toLocaleString()} />
        <MetricCard label="Total columns" value={data.cols} />
        <MetricCard label="Numeric cols" value={data.numeric_cols} />
        <MetricCard label="File" value={data.filename?.split("/").pop()} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>First 8 rows</div>
      <div style={{ overflowX: "auto", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  padding: "8px 10px", textAlign: "left", borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-secondary)", fontWeight: 500, whiteSpace: "nowrap"
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.preview || []).map((row, i) => (
              <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                {cols.map(c => (
                  <td key={c} style={{
                    padding: "6px 10px", whiteSpace: "nowrap",
                    color: "var(--color-text-primary)"
                  }}>
                    {row[c] === null || row[c] === undefined ? <span style={{ color: "var(--color-text-secondary)" }}>—</span> : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ID_KEYWORDS = ["id", "uuid", "row_num", "rownum", "serial", "seq", "key", "unnamed"];

const TARGET_KEYWORDS = [
  "price", "cost", "value", "target", "label", "output", "result",
  "revenue", "sales", "profit", "loss", "income", "salary", "wage",
  "score", "rating", "rate", "return", "yield", "amount", "total",
  "expense", "budget", "forecast", "prediction", "close", "closing",
  "temperature", "pressure", "failure", "defect", "quality", "ebidta", "finance",
];

function isPossibleTarget(col) {
  const nameLower = col.toLowerCase();
  const isIdLike = ID_KEYWORDS.some(
    kw => nameLower === kw || nameLower.includes(kw + "_") || nameLower.includes("_" + kw)
  );
  if (isIdLike) return false;
  return TARGET_KEYWORDS.some(kw => nameLower.includes(kw));
}

function ToggleGroup({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "var(--color-background-secondary)", padding: 4, borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", marginTop: 4 }}>
      {options.map(opt => {
        const active = opt.value === value;
        const buttonElement = (
          <button
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 6,
              cursor: "pointer",
              border: "none",
              background: active ? "#378ADD" : "transparent",
              color: active ? "#fff" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}>
            {opt.label}
          </button>
        );

        return (
          <Tooltip
            key={opt.value}
            content={opt.tooltip}
            style={{ flex: 1, minWidth: 48, display: "flex" }}
          >
            {buttonElement}
          </Tooltip>
        );
      })}
    </div>
  );
}

function getDefaultFeatures(target, cols, correlations) {
  if (!correlations || !correlations[target]) {
    return cols.filter(x => x !== target);
  }
  return cols.filter(col => {
    if (col === target) return false;

    // Filter out common ID/index columns to prevent data leakage
    const nameLower = col.toLowerCase();
    const isIdLike = ID_KEYWORDS.some(
      kw => nameLower === kw || nameLower.includes(kw + "_") || nameLower.includes("_" + kw)
    );
    if (isIdLike) return false;

    const r = correlations[target]?.[col];
    if (r === undefined) return true;

    const absR = Math.abs(r);
    // Data leakage check (exclude columns that correlate perfectly/leak target)
    if (absR >= 0.98) return false;

    // Filter out noise columns (r < 0.1) if there are enough columns overall
    if (absR < 0.1 && cols.length > 5) return false;

    return true;
  });
}

function getFeatureProsCons(col, target, correlations) {
  const corr = correlations?.[target]?.[col] ?? 0;
  const absCorr = Math.abs(corr);
  const nameLower = col.toLowerCase();

  const isIdLike = ID_KEYWORDS.some(
    kw => nameLower === kw || nameLower.includes(kw + "_") || nameLower.includes("_" + kw)
  );

  let pros = [];
  let cons = [];

  if (isIdLike) {
    cons.push("Potential Index/ID: high risk of index leakage.");
  }

  if (absCorr >= 0.98) {
    cons.push("Extreme correlation: likely target duplicate (severe leak risk).");
  } else if (absCorr >= 0.6) {
    pros.push("Strong signal: highly predictive of target.");
  } else if (absCorr >= 0.2) {
    pros.push("Moderate signal: useful supplementary predictor.");
  } else if (absCorr > 0) {
    cons.push("Weak correlation: low linear predictive value (noise).");
  } else {
    cons.push("Zero variance/correlation: constant or empty column.");
  }

  if (absCorr > 0 && absCorr < 0.95 && !isIdLike) {
    pros.push("Safe feature: clean, independent input.");
  }

  return { pros, cons };
}

// ── Tab 1: Configure ──────────────────────────────────────────────────────────
function ConfigTab({ data, config, setConfig }) {
  const numCols = data?.numeric_columns || [];
  const suggested = data?.suggested_target;

  useEffect(() => {
    if (!config.target && suggested) {
      const defFeatures = getDefaultFeatures(suggested, numCols, data?.correlations);
      setConfig(c => ({
        ...c,
        target: suggested,
        features: defFeatures,
      }));
    }
  }, [suggested, data?.correlations, numCols]);

  function toggleFeature(col) {
    const colMeta = data?.columns_metadata?.find(m => m.name === col);
    setConfig(c => {
      const has = c.features.includes(col);
      const newFeatures = has ? c.features.filter(x => x !== col) : [...c.features, col];
      
      // Auto-toggle corresponding engineering setups
      let onehotList = c.onehot_columns || [];
      let periodicList = c.periodic_columns || [];
      
      if (colMeta?.type === "categorical") {
        if (!has) {
          if (!onehotList.includes(col)) onehotList = [...onehotList, col];
        } else {
          onehotList = onehotList.filter(x => x !== col);
        }
      } else if (colMeta?.type === "datetime") {
        if (!has) {
          if (!periodicList.some(p => p.column === col)) {
            periodicList = [...periodicList, { column: col, type: "datetime", period_type: "auto" }];
          }
        } else {
          periodicList = periodicList.filter(p => p.column !== col);
        }
      }
      
      return {
        ...c,
        features: newFeatures,
        onehot_columns: onehotList,
        periodic_columns: periodicList
      };
    });
  }

  function setTarget(col) {
    const defFeatures = getDefaultFeatures(col, numCols, data?.correlations);
    setConfig(c => ({ ...c, target: col, features: defFeatures }));
  }

  function handlePurposeChange(purposeKey) {
    const defaultSettings = PURPOSE_CONFIGS[purposeKey];
    setConfig(c => ({
      ...c,
      purpose: purposeKey,
      models: defaultSettings.models,
      split_method: defaultSettings.split_method,
      cv_folds: defaultSettings.cv_folds,
      normalization: defaultSettings.normalization,
      learning_rate: defaultSettings.learning_rate,
    }));
  }

  const currentPurpose = config.purpose || "prediction";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Model Purpose / Objective Selection */}
      <section style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: 20, border: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "var(--color-text-primary)" }}>
          What is your model's primary purpose?
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          Select the objective to automatically configure the most suitable ML algorithms and training parameters with expert rationale.
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
          {Object.entries(PURPOSES).map(([key, item]) => {
            const active = currentPurpose === key;
            return (
              <div
                key={key}
                onClick={() => handlePurposeChange(key)}
                style={{
                  background: active ? "var(--color-background-info)" : "var(--color-background-primary)",
                  border: `1.5px solid ${active ? "#378ADD" : "var(--color-border-secondary)"}`,
                  borderRadius: 8,
                  padding: "16px 12px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "center",
                  boxShadow: active ? "0 4px 12px rgba(55,138,221,0.08)" : "none",
                  transition: "all 0.15s ease",
                  outline: "none"
                }}
              >
                <i className={`ti ti-${item.icon}`} style={{ fontSize: 22, color: active ? "#378ADD" : "var(--color-text-secondary)" }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)" }}>{item.label}</div>
                <div style={{ fontSize: 10.5, color: "var(--color-text-secondary)", lineHeight: "1.3" }}>{item.description}</div>
              </div>
            );
          })}
        </div>

        {/* Tailored Reasoning Box */}
        <div style={{
          background: "var(--color-background-primary)",
          borderLeft: "4px solid #378ADD",
          borderRadius: "0 6px 6px 0",
          padding: "12px 14px",
          fontSize: 12,
          lineHeight: "1.5",
          color: "var(--color-text-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderLeftWidth: 4
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6, color: "#185FA5" }}>
            <i className="ti ti-bulb" style={{ fontSize: 14 }} />
            Tailored Configuration Strategy
          </div>
          {PURPOSE_CONFIGS[currentPurpose].reasoning}
        </div>
      </section>

      {/* Target */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 10 }}>Prediction target</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {numCols.map(col => {
            const isSuggested = col === suggested;
            const isPossible = isPossibleTarget(col);
            const star = isSuggested ? "★ (Suggested)" : isPossible ? "★" : "";
            return (
              <button key={col} onClick={() => setTarget(col)}
                style={{
                  padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${config.target === col ? "#378ADD" : "var(--color-border-secondary)"}`,
                  background: config.target === col ? "#e6f1fb" : "var(--color-background-primary)",
                  color: config.target === col ? "#185FA5" : "var(--color-text-primary)",
                  cursor: "pointer", fontSize: 13, fontWeight: config.target === col ? 500 : 400
                }}>
                {col} {star}
              </button>
            );
          })}
        </div>
      </section>

      {/* ✦ Feature Engineering PANEL */}
      <section style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: 20, border: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-wand" style={{ color: "#378ADD" }} />
          Feature Engineering & Transformations
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          Configure custom pre-processing to translate non-numeric categories, cyclic calendar components, and group data.
        </div>
        
        {/* Row Aggregation */}
        <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4 }}>
            1. Row Aggregation / Subcategory Grouping (Optional)
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Summarize the dataset by grouping rows on a subcategory/ID column.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <select
                value={config.group_by_column || ""}
                onChange={e => setConfig(c => ({ ...c, group_by_column: e.target.value }))}
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6 }}
              >
                <option value="">-- No Aggregation (Keep individual rows) --</option>
                {(data.columns || []).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            {config.group_by_column && (
              <div style={{ minWidth: 120 }}>
                <select
                  value={config.agg_method || "mean"}
                  onChange={e => setConfig(c => ({ ...c, agg_method: e.target.value }))}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6 }}
                >
                  <option value="mean">Mean (Average)</option>
                  <option value="median">Median</option>
                  <option value="sum">Sum (Total)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* One-Hot Encoding */}
        <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4 }}>
            2. Categorical One-Hot Encoding
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Convert labels into binary column vectors. Auto-enabled when selecting a categorical feature.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {(data.columns_metadata || []).filter(c => c.type === "categorical").map(col => {
              const on = config.onehot_columns?.includes(col.name);
              return (
                <label key={col.name} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)",
                  background: on ? "#e6f1fb" : "var(--color-background-primary)",
                  cursor: "pointer", fontSize: 12
                }}>
                  <input type="checkbox" checked={on} onChange={() => {
                    setConfig(c => {
                      const list = c.onehot_columns || [];
                      const active = list.includes(col.name);
                      const newList = active ? list.filter(x => x !== col.name) : [...list, col.name];
                      // Auto-sync selection to features
                      let feats = c.features || [];
                      if (!active && !feats.includes(col.name)) feats = [...feats, col.name];
                      return { ...c, onehot_columns: newList, features: feats };
                    });
                  }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{col.name}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                      {col.cardinality} categories: {col.sample_values?.slice(0, 3).join(", ")}
                    </div>
                  </div>
                </label>
              );
            })}
            {(data.columns_metadata || []).filter(c => c.type === "categorical").length === 0 && (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                No categorical fields detected.
              </div>
            )}
          </div>
        </div>

        {/* Sin-Cos Encoding */}
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4 }}>
            3. Periodic Sin-Cos Encoding (Cyclical/Temporal)
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Encode calendar cycles as periodic sine/cosine coordinates to capture time-based intervals.
          </div>

          {/* Smart Temporal Feature Pipeline Card */}
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.25)",
            marginBottom: 12,
            fontSize: 11,
            lineHeight: "1.5",
            color: "var(--color-text-primary)"
          }}>
            <div style={{ fontWeight: 600, color: "#4f46e5", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span>🧠</span> Smart Temporal Feature Pipeline Engaged
            </div>
            <p style={{ color: "var(--color-text-secondary)", margin: "0 0 8px 0" }}>
              Separate calendar columns (e.g. Year, Month) are auto-detected. The backend automatically coordinates:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, margin: "0 0 8px 0" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#4f46e5" }}>✓</span>
                <div>
                  <strong>Chronological Sort:</strong>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Ranks observations chronologically for leakage-free validation.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#4f46e5" }}>✓</span>
                <div>
                  <strong>Elapsed Time:</strong>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Creates a continuous trend index from dataset start reference.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#4f46e5" }}>✓</span>
                <div>
                  <strong>Cyclical Encoding:</strong>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Converts cyclic units to sin/cos to preserve seasonal boundaries.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#4f46e5" }}>✓</span>
                <div>
                  <strong>Target Lags:</strong>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Generates target lag & rolling means shifted by 1 to prevent leakage.</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", fontStyle: "italic" }}>
              ℹ️ Model cross-validation compares raw vs combined time dimensions to select the optimal model.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data.columns_metadata || []).filter(c => c.type === "datetime" || c.name.toLowerCase().includes("hour") || c.name.toLowerCase().includes("month") || c.name.toLowerCase().includes("week")).map(col => {
              const periodicCfg = config.periodic_columns?.find(p => p.column === col.name);
              const on = !!periodicCfg;
              const periodType = periodicCfg?.period_type || "auto";
              
              return (
                <div key={col.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px",
                  borderRadius: 6, border: "0.5px solid var(--color-border-tertiary)",
                  background: on ? "#e6f1fb" : "var(--color-background-primary)",
                  fontSize: 12
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                    <input type="checkbox" checked={on} onChange={() => {
                      setConfig(c => {
                        const list = c.periodic_columns || [];
                        const idx = list.findIndex(p => p.column === col.name);
                        let newList;
                        if (idx >= 0) {
                          newList = list.filter(p => p.column !== col.name);
                        } else {
                          newList = [...list, { column: col.name, type: col.type, period_type: "auto" }];
                        }
                        // Auto-sync selection to features
                        let feats = c.features || [];
                        if (idx < 0 && !feats.includes(col.name)) feats = [...feats, col.name];
                        return { ...c, periodic_columns: newList, features: feats };
                      });
                    }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{col.name}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                        Type: {col.type} | Periodic extraction suggestions
                      </div>
                    </div>
                  </label>
                  {on && (
                    <div style={{ width: 140 }}>
                      <select
                        value={periodType}
                        onChange={e => {
                          const val = e.target.value;
                          setConfig(c => {
                            const list = (c.periodic_columns || []).map(p => {
                              if (p.column === col.name) {
                                return { ...p, period_type: val };
                              }
                              return p;
                            });
                            return { ...c, periodic_columns: list };
                          });
                        }}
                        style={{ width: "100%", padding: "4px 8px", borderRadius: 4, fontSize: 11 }}
                      >
                        <option value="auto">Auto (Month + Dow)</option>
                        <option value="month">Month Only (Yearly)</option>
                        <option value="dayofweek">Day of Week Only</option>
                        <option value="hour">Hour of Day (Daily)</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
            {(data.columns_metadata || []).filter(c => c.type === "datetime" || c.name.toLowerCase().includes("hour") || c.name.toLowerCase().includes("month") || c.name.toLowerCase().includes("week")).length === 0 && (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                No date-time or cyclical fields detected.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Feature columns
          <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>
            ({config.features?.length || 0} selected)</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Select features and analyze their linear dependence or engineering transformation settings
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {(data.columns || []).filter(c => c !== config.target).map(col => {
            const on = config.features?.includes(col);
            const colMeta = data?.columns_metadata?.find(m => m.name === col);
            const isNumeric = colMeta?.type === "numeric";
            const isCategorical = colMeta?.type === "categorical";
            const isDatetime = colMeta?.type === "datetime";
            
            const corr = data?.correlations?.[config.target]?.[col] ?? 0;
            const absCorr = Math.abs(corr);
            const barPct = absCorr * 100;
            const barColor = corr > 0 ? "#639922" : corr < 0 ? "#E24B4A" : "#8e8d88";
            const { pros, cons } = getFeatureProsCons(col, config.target, data?.correlations);
            
            return (
              <div key={col} onClick={() => toggleFeature(col)}
                style={{
                  background: "var(--color-background-secondary)",
                  border: `1px solid ${on ? "#378ADD" : "var(--color-border-tertiary)"}`,
                  borderRadius: 8, padding: "10px 14px", cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 6,
                  boxShadow: on ? "0 2px 6px rgba(55,138,221,0.06)" : "none",
                  transition: "all 0.15s ease"
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 500, fontSize: 13, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={on} readOnly style={{ cursor: "pointer" }} />
                    {col}
                  </span>
                  {isNumeric ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: barColor }}>
                      r: {corr.toFixed(2)}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: "1px 6px", borderRadius: 4,
                      background: isCategorical ? "#fef3c7" : "#dbeafe",
                      color: isCategorical ? "#b45309" : "#1e40af"
                    }}>
                      {isCategorical ? "Categorical" : "Datetime"}
                    </span>
                  )}
                </div>
                
                {isNumeric ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, background: "var(--color-border-tertiary)", height: 5, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, background: barColor, height: "100%", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--color-text-secondary)", minWidth: 26, textAlign: "right" }}>
                      {barPct.toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-settings" style={{ fontSize: 12 }} />
                    <span>
                      {isCategorical 
                        ? (config.onehot_columns?.includes(col) ? "Auto One-Hot Encoded" : "Click to select & encode")
                        : (config.periodic_columns?.some(p => p.column === col) ? "Auto Sin-Cos Encoded" : "Click to select & encode")
                      }
                    </span>
                  </div>
                )}
                
                {/* Pros & Cons Section */}
                <div style={{ fontSize: 10, display: "flex", flexDirection: "column", gap: 3, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 6, marginTop: 2 }}>
                  {isNumeric ? (
                    <>
                      {pros.map((p, idx) => (
                        <div key={idx} style={{ color: "#3B6D11", display: "flex", gap: 4, alignItems: "start" }}>
                          <span style={{ fontWeight: 600 }}>+</span>
                          <span>{p}</span>
                        </div>
                      ))}
                      {cons.map((c, idx) => (
                        <div key={idx} style={{ color: "#A32D2D", display: "flex", gap: 4, alignItems: "start" }}>
                          <span style={{ fontWeight: 600 }}>–</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </>
                  ) : isCategorical ? (
                    <div style={{ color: "var(--color-text-secondary)" }}>
                      Cardinality: {colMeta?.cardinality}. Non-numeric categorical values.
                    </div>
                  ) : (
                    <div style={{ color: "var(--color-text-secondary)" }}>
                      Periodic event column (date/time format).
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Models */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 10 }}>ML models <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-text-secondary)" }}>(select all to compare)</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 8 }}>
          {Object.entries(MODEL_LABELS).map(([key, label]) => {
            const on = config.models?.includes(key);
            return (
              <button key={key} onClick={() => setConfig(c => ({
                ...c,
                models: on ? c.models.filter(m => m !== key) : [...(c.models || []), key]
              }))}
                style={{
                  padding: "10px 14px", borderRadius: 8, textAlign: "left",
                  border: `1.5px solid ${on ? "#378ADD" : "var(--color-border-secondary)"}`,
                  background: on ? "#e6f1fb" : "var(--color-background-primary)",
                  color: on ? "#185FA5" : "var(--color-text-primary)", cursor: "pointer", fontSize: 13
                }}>
                <i className={`ti ti-${key === "nn" ? "brain" : key === "rf" ? "trees" : key === "gbm" ? "trending-up" : "math-function"}`}
                  aria-hidden style={{ marginRight: 8 }} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Training settings */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 12 }}>Training settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16 }}>
          <div style={{ gridColumn: "span 2", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Train/Test Split</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>
                Train {((1 - config.split) * 100).toFixed(0)}% / Test {(config.split * 100).toFixed(0)}%
              </div>
            </div>
            <input type="range" min="0.05" max="0.50" step="0.05" value={config.split}
              onChange={e => setConfig(c => ({ ...c, split: +e.target.value }))}
              style={{ width: "100%", height: 6, borderRadius: 3, outline: "none", cursor: "pointer" }} />

            {/* Segmented bar displaying actual counts */}
            {(() => {
              const total = data?.rows ?? 0;
              const trainCount = Math.round(total * (1 - config.split));
              const testCount = total - trainCount;
              const trainPct = (1 - config.split) * 100;
              const testPct = config.split * 100;
              return (
                <div>
                  <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "var(--color-border-tertiary)", marginTop: 2 }}>
                    <div style={{ width: `${trainPct}%`, background: "#eaf3de", borderRight: "1.5px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#3B6D11", fontWeight: 500, whiteSpace: "nowrap", padding: "0 4px" }}>
                      Train: {trainCount.toLocaleString()} ({trainPct.toFixed(0)}%)
                    </div>
                    <div style={{ width: `${testPct}%`, background: "#e6f1fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#185FA5", fontWeight: 500, whiteSpace: "nowrap", padding: "0 4px" }}>
                      Test: {testCount.toLocaleString()} ({testPct.toFixed(0)}%)
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textAlign: "right", marginTop: 4 }}>
                    Total dataset: <strong>{total.toLocaleString()}</strong> rows
                  </div>
                </div>
              );
            })()}
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 4 }}>Split method</div>
            <ToggleGroup
              value={config.split_method || "random"}
              onChange={val => setConfig(c => ({ ...c, split_method: val }))}
              options={[
                { value: "random", label: "Random" },
                { value: "chronological", label: "Chronological" }
              ]}
            />
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 4 }}>Cross-validation folds</div>
            <ToggleGroup
              value={config.cv_folds}
              onChange={val => setConfig(c => ({ ...c, cv_folds: val }))}
              options={[
                {
                  value: 3,
                  label: "3 Folds",
                  tooltip: (
                    <div>
                      <strong>3 Folds (Baseline Check)</strong>
                      <ul style={{ margin: "6px 0 0 0", paddingLeft: 14 }}>
                        <li style={{ marginBottom: 4 }}>Fastest validation cycle.</li>
                        <li style={{ marginBottom: 4 }}>Verifies baseline model compilation and execution stability.</li>
                        <li>Evaluates generalization on a larger test subset (33.3% validation data).</li>
                      </ul>
                    </div>
                  )
                },
                {
                  value: 5,
                  label: "5 Folds",
                  tooltip: (
                    <div>
                      <strong>5 Folds (Standard Check)</strong>
                      <ul style={{ margin: "6px 0 0 0", paddingLeft: 14 }}>
                        <li style={{ marginBottom: 4 }}>Industry standard validation split.</li>
                        <li style={{ marginBottom: 4 }}>Checks model generalizability and detects overfitting risk.</li>
                        <li>Estimates variance of metrics across 5 distinct test segments (20% validation data).</li>
                      </ul>
                    </div>
                  )
                },
                {
                  value: 10,
                  label: "10 Folds",
                  tooltip: (
                    <div>
                      <strong>10 Folds (Precision Check)</strong>
                      <ul style={{ margin: "6px 0 0 0", paddingLeft: 14 }}>
                        <li style={{ marginBottom: 4 }}>High-precision evaluation for medium/small datasets.</li>
                        <li style={{ marginBottom: 4 }}>Performs detailed sensitivity checks against minor data perturbations.</li>
                        <li>Detects subtle localized overfitting patterns, but requires 10x training cycles.</li>
                      </ul>
                    </div>
                  )
                }
              ]}
            />
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 4 }}>Normalization</div>
            <ToggleGroup
              value={config.normalization}
              onChange={val => setConfig(c => ({ ...c, normalization: val }))}
              options={[
                { value: "none", label: "None" },
                { value: "minmax", label: "Min-Max" },
                { value: "zscore", label: "Z-Score" }
              ]}
            />
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 4 }}>Missing values</div>
            <ToggleGroup
              value={config.missing}
              onChange={val => setConfig(c => ({ ...c, missing: val }))}
              options={[
                { value: "mean", label: "Mean" },
                { value: "median", label: "Median" },
                { value: "drop", label: "Drop Rows" }
              ]}
            />
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
              Learning rate
              <Tooltip
                content={
                  <div>
                    <strong>Learning Rate Impact</strong>
                    <div style={{ margin: "4px 0", color: "#cbd5e1" }}>Controls parameter step-size per iteration:</div>
                    <div style={{ marginTop: 6 }}>
                      <strong>High (Increasing):</strong> Speeds up convergence, but risks overshooting optimal weights or causing divergence.
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <strong>Low (Decreasing):</strong> Yields high fine-tuning precision, but requires more estimators/epochs and runs slower.
                    </div>
                  </div>
                }
              >
                <i className="ti ti-info-circle" style={{ cursor: "pointer", color: "#378ADD", fontSize: 13 }} />
              </Tooltip>
            </div>
            <input type="range" min="0.01" max="0.5" step="0.01" value={config.learning_rate}
              onChange={e => setConfig(c => ({ ...c, learning_rate: +e.target.value }))}
              style={{ width: "100%", height: 6, borderRadius: 3, cursor: "pointer", marginTop: 8 }} />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{config.learning_rate?.toFixed(2)}</div>
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ color: "var(--color-text-secondary)", marginBottom: 4 }}>Estimators / epochs</div>
            <ToggleGroup
              value={config.n_estimators}
              onChange={val => setConfig(c => ({ ...c, n_estimators: val }))}
              options={[
                { value: 50, label: "50" },
                { value: 100, label: "100" },
                { value: 200, label: "200" }
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Tab 2: Train ──────────────────────────────────────────────────────────────
function TrainTab({ sessionId, config, onDone }) {
  const [progress, setProgress] = useState({});
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef();

  const startTraining = useCallback(async () => {
    if (!sessionId || !config.target || !config.features?.length || !config.models?.length) {
      setError("Check config: target, features and at least one model must be set.");
      return;
    }
    setStarted(true); setError(null);
    try {
      const r = await fetch(`${API}/api/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...config }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/api/progress/${sessionId}`);
          const pd = await pr.json();
          setProgress(pd);
          const allDone = Object.values(pd).every(v => v.status === "done" || v.status === "error");
          if (allDone && Object.keys(pd).length > 0) {
            clearInterval(pollRef.current);
            setTimeout(() => onDone(), 800);
          }
        } catch (_) { }
      }, 500);
    } catch (e) {
      setError(e.message);
      setStarted(false);
    }
  }, [sessionId, config]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  return (
    <div>
      {!started ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <i className="ti ti-rocket" aria-hidden style={{ fontSize: 48, color: "#378ADD", display: "block", marginBottom: 16 }} />
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Ready to train</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
            {config.models?.length || 0} models × {config.features?.length || 0} features → target: <strong>{config.target}</strong>
          </div>
          <button onClick={startTraining}
            style={{
              padding: "12px 32px", borderRadius: 8, background: "#378ADD", color: "#fff",
              border: "none", fontWeight: 500, fontSize: 15, cursor: "pointer"
            }}>
            Start training
          </button>
          {error && <div style={{ marginTop: 12, color: "#A32D2D", fontSize: 13 }}>{error}</div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Training in progress…</div>
          {(config.models || []).map(m => {
            const p = progress[m] || { pct: 0, status: "queued" };
            const pct = p.pct || 0;
            const color = p.status === "done" ? "#639922" : p.status === "error" ? "#E24B4A" : "#378ADD";
            return (
              <div key={m} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{MODEL_LABELS[m]}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.status === "done" && p.metrics && <Badge label={p.metrics.band} />}
                    <span style={{ fontSize: 12, color }}>{pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={color} />
                {p.status === "done" && p.metrics && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-text-secondary)" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--color-text-primary)", marginRight: 8 }}>Test:</span>
                      <span style={{ marginRight: 12 }}>R² {p.metrics.r2?.toFixed(3)}</span>
                      <span style={{ marginRight: 12 }}>RMSE {p.metrics.rmse?.toFixed(3)}</span>
                      <span>MAE {p.metrics.mae?.toFixed(3)}</span>
                    </div>
                    {p.metrics.train_r2 !== undefined && (
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)", marginRight: 8 }}>Train:</span>
                        <span style={{ marginRight: 12 }}>R² {p.metrics.train_r2?.toFixed(3)}</span>
                        <span style={{ marginRight: 12 }}>RMSE {p.metrics.train_rmse?.toFixed(3)}</span>
                        <span>MAE {p.metrics.train_mae?.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                )}
                {p.status === "error" && <div style={{ marginTop: 4, fontSize: 12, color: "#A32D2D" }}>{p.error || "Training failed"}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Results ────────────────────────────────────────────────────────────
function ResultsTab({ sessionId, config }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiNote, setAiNote] = useState(null);
  const [aiLoad, setAiLoad] = useState(false);
  const chartRef = useRef();
  const fcastRef = useRef();

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${API}/api/results/${sessionId}`);
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        setData(d);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  // draw comparison chart
  useEffect(() => {
    if (!data?.results || !chartRef.current) return;
    const Chart = window.Chart;
    if (!Chart) return;
    const existing = Chart.getChart(chartRef.current);
    if (existing) existing.destroy();
    const models = Object.keys(data.results);
    const train_r2vals = models.map(m => +(data.results[m].train_r2 !== undefined ? data.results[m].train_r2 : 0).toFixed(3));
    const r2vals = models.map(m => +(data.results[m].r2 || 0).toFixed(3));
    const train_rmsevals = models.map(m => +(data.results[m].train_rmse !== undefined ? data.results[m].train_rmse : 0).toFixed(3));
    const rmsevals = models.map(m => +(data.results[m].rmse || 0).toFixed(3));
    new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: models.map(m => MODEL_LABELS[m] || m),
        datasets: [
          { label: "Train R²", data: train_r2vals, backgroundColor: "#639922", borderRadius: 4 },
          { label: "Test R²", data: r2vals, backgroundColor: "#378ADD", borderRadius: 4 },
          { label: "Train RMSE", data: train_rmsevals, backgroundColor: "#FCD34D", borderRadius: 4, yAxisID: "y2" },
          { label: "Test RMSE", data: rmsevals, backgroundColor: "#EF9F27", borderRadius: 4, yAxisID: "y2" },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 1, title: { display: true, text: "R²" } },
          y2: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "RMSE" } }
        },
        plugins: { legend: { display: false } },
      },
    });
  }, [data]);

  // forecast chart
  useEffect(() => {
    if (!data?.forecast?.length || !fcastRef.current) return;
    const Chart = window.Chart;
    if (!Chart) return;
    const existing = Chart.getChart(fcastRef.current);
    if (existing) existing.destroy();
    new Chart(fcastRef.current, {
      type: "line",
      data: {
        labels: data.forecast.map(f => `T+${f.step}`),
        datasets: [{
          label: "Forecast", data: data.forecast.map(f => f.value),
          borderColor: "#378ADD", backgroundColor: "rgba(55,138,221,0.1)",
          fill: true, tension: 0.3, pointRadius: 4
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { title: { display: true, text: "Predicted value" } } },
      },
    });
  }, [data]);

  async function getAiInterpretation() {
    if (!data) return;
    setAiLoad(true);
    try {
      const summary = Object.entries(data.results).map(([k, v]) =>
        `${MODEL_LABELS[k]}: Test R²=${v.r2}, Train R²=${v.train_r2 ?? "N/A"}, Test RMSE=${v.rmse}, Train RMSE=${v.train_rmse ?? "N/A"}, Test MAE=${v.mae}, Train MAE=${v.train_mae ?? "N/A"} (${v.band})`).join("\n");
      const fi = (data.feature_importance || []).slice(0, 5).map(f => `${f.feature}: ${f.importance}`).join(", ");
      const prompt = `You are a data science analyst. A user trained ML regression models on their dataset. Summarize the results in 3-4 sentences. Highlight the best model, what the metrics mean, compare train and test performance (mention if there is any overfitting/underfitting), and top features.\n\nModel results:\n${summary}\n\nTop features: ${fi}\n\nTarget: ${config.target}`;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      const d = await r.json();
      const txt = d.content?.map(b => b.text || "").join("") || "";
      setAiNote(txt);
    } catch (e) {
      setAiNote("AI interpretation unavailable.");
    } finally {
      setAiLoad(false);
    }
  }

  if (loading) return <div style={{ color: "var(--color-text-secondary)", padding: "32px 0", textAlign: "center" }}>Loading results…</div>;
  if (error) return <div style={{ color: "#A32D2D", padding: "16px 0" }}>{error}</div>;
  if (!data) return null;

  const results = data.results || {};
  const fi = data.feature_importance || [];
  const models = Object.keys(results);
  const best = models.reduce((a, b) => (results[a]?.r2 > results[b]?.r2 ? a : b), models[0]);
  const bestR = results[best] || {};
  const tierData = bestR.tiers || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
        {models.map(m => (
          <div key={m} style={{
            background: "var(--color-background-secondary)", borderRadius: 8,
            padding: "12px 14px", border: m === best ? "1.5px solid #378ADD" : "0.5px solid var(--color-border-tertiary)",
            position: "relative"
          }}>
            {m === best && <span style={{
              position: "absolute", top: -8, left: 12, background: "#e6f1fb",
              color: "#185FA5", border: "1px solid #378ADD", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 500
            }}>Best</span>}
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{MODEL_LABELS[m]}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{(results[m].r2 * 100).toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Test R²</div>
              </div>
              {results[m].train_r2 !== undefined && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)" }}>{(results[m].train_r2 * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Train R²</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 10 }}><Badge label={results[m].band} /></div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 10 }}>Model comparison</div>
        <div style={{ overflowX: "auto", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                {["Model", "Train R²", "Test R²", "Train RMSE", "Test RMSE", "Train MAE", "Test MAE", "CV R²", "Band", "Test R² Bar"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.sort((a, b) => (results[b].r2 || 0) - (results[a].r2 || 0)).map(m => {
                const r = results[m];
                return (
                  <tr key={m} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: m === best ? 500 : 400 }}>
                      {MODEL_LABELS[m]} {m === best ? "⭐" : ""}
                    </td>
                    <td style={{ padding: "8px 12px" }}>{r.train_r2 !== undefined ? r.train_r2.toFixed(3) : "—"}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.r2?.toFixed(3)}</td>
                    <td style={{ padding: "8px 12px" }}>{r.train_rmse !== undefined ? r.train_rmse.toFixed(3) : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{r.rmse?.toFixed(3)}</td>
                    <td style={{ padding: "8px 12px" }}>{r.train_mae !== undefined ? r.train_mae.toFixed(3) : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{r.mae?.toFixed(3)}</td>
                    <td style={{ padding: "8px 12px" }}>{r.cv_r2?.toFixed(3)}</td>
                    <td style={{ padding: "8px 12px" }}><Badge label={r.band} /></td>
                    <td style={{ padding: "8px 12px", minWidth: 100 }}>
                      <ProgressBar pct={(r.r2 || 0) * 100} color="#378ADD" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Chart */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Performance overview</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#639922", borderRadius: 2, marginRight: 4 }} />Train R²</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#378ADD", borderRadius: 2, marginRight: 4 }} />Test R²</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#FCD34D", borderRadius: 2, marginRight: 4 }} />Train RMSE</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#EF9F27", borderRadius: 2, marginRight: 4 }} />Test RMSE</span>
        </div>
        <div style={{ position: "relative", height: 260 }}>
          <canvas id="resultsChart" ref={chartRef} role="img" aria-label="Bar chart comparing R2 and RMSE across all trained models">Model performance comparison</canvas>
        </div>
      </section>

      {/* Tier distribution */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Health classification (best model: {MODEL_LABELS[best]})</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 }}>
          {["Good", "At Risk", "Poor"].map(t => {
            const td = tierData[t];
            return (
              <div key={t} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                <TierBadge label={t} />
                <div style={{ fontSize: 22, fontWeight: 500, marginTop: 8 }}>{td?.pct ?? 0}%</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{td?.count ?? 0} records</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature importance */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 10 }}>Feature importance (Pearson correlation)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fi.slice(0, 12).map(f => (
            <div key={f.feature}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{f.feature}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>{(f.importance * 100).toFixed(1)}%</span>
              </div>
              <ProgressBar pct={f.importance * 100} color="#534AB7" />
            </div>
          ))}
        </div>
      </section>

      {/* Forecast */}
      {data.forecast?.length > 0 && (
        <section>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Forecast (next 10 steps)</div>
          <div style={{ position: "relative", height: 200 }}>
            <canvas ref={fcastRef} role="img" aria-label="Line chart showing forecast for next 10 time steps">Forecast values</canvas>
          </div>
        </section>
      )}

      {/* AI Interpretation */}
      <section>
        <button onClick={getAiInterpretation} disabled={aiLoad}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)", cursor: "pointer", fontWeight: 500, fontSize: 13
          }}>
          {aiLoad ? "Generating…" : "✦ AI interpretation of results ↗"}
        </button>
        {aiNote && (
          <div style={{
            marginTop: 12, padding: "16px", borderRadius: 8, background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap"
          }}>
            {aiNote}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Tab 4: Predict ────────────────────────────────────────────────────────────
function PredictTab({ sessionId, config }) {
  const [colStats, setColStats] = useState({});
  const [values, setValues] = useState({});
  const [preds, setPreds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState(null);
  const [batchLoad, setBatchLoad] = useState(false);
  const [aiNote, setAiNote] = useState(null);
  const [aiLoad, setAiLoad] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const r = await fetch(`${API}/api/column_stats/${sessionId}`);
        const d = await r.json();
        setColStats(d);
        const init = {};
        (config.features || []).forEach(f => {
          if (d[f]?.type === "categorical") {
            init[f] = d[f]?.mode ?? (d[f]?.categories?.[0] || "");
          } else if (d[f]?.type === "datetime") {
            init[f] = d[f]?.max ?? "";
          } else {
            init[f] = d[f]?.mean ?? 0;
          }
        });
        setValues(init);
      } catch (_) { }
    }
    if (sessionId) loadStats();
  }, [sessionId, config.features]);

  async function handlePredict() {
    setLoading(true); setPreds(null);
    try {
      const r = await fetch(`${API}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, values }),
      });
      const d = await r.json();
      setPreds(d.predictions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleBatch() {
    setBatchLoad(true);
    try {
      const r = await fetch(`${API}/api/batch_predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const d = await r.json();
      setBatchData(d);
    } catch (_) { }
    finally { setBatchLoad(false); }
  }

  async function getAiBatch() {
    if (!batchData) return;
    setAiLoad(true);
    try {
      const summary = Object.entries(batchData.batch).map(([m, s]) =>
        `${MODEL_LABELS[m]}: mean=${s.mean}, std=${s.std}, Good=${s.tiers.Good?.pct ?? 0}%, At Risk=${s.tiers["At Risk"]?.pct ?? 0}%, Poor=${s.tiers.Poor?.pct ?? 0}%`
      ).join("\n");
      const prompt = `You are a data science analyst. Give a 3-sentence plain-language interpretation of these batch prediction results for ${batchData.total_rows} records (target: ${config.target}):\n\n${summary}`;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      const d = await r.json();
      setAiNote(d.content?.map(b => b.text || "").join("") || "");
    } catch (_) { setAiNote("AI unavailable."); }
    finally { setAiLoad(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Single record */}
      <section>
        <div style={{ fontWeight: 500, marginBottom: 12 }}>Single-record prediction</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {(config.features || []).map(f => {
            const stat = colStats[f];
            const isCat = stat?.type === "categorical";
            const isDt = stat?.type === "datetime";
            
            return (
              <label key={f} style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{f}</div>
                {isCat ? (
                  <select
                    value={values[f] ?? ""}
                    onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: 6,
                      border: "1px solid var(--color-border-secondary)",
                      backgroundColor: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)"
                    }}
                  >
                    <option value="">-- Select category --</option>
                    {(stat?.categories || []).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : isDt ? (
                  <input
                    type="date"
                    value={values[f] ?? ""}
                    onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: 6,
                      border: "1px solid var(--color-border-secondary)",
                      backgroundColor: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)"
                    }}
                  />
                ) : (
                  <input
                    type="number"
                    value={values[f] ?? 0}
                    onChange={e => setValues(v => ({ ...v, [f]: +e.target.value }))}
                    style={{ width: "100%" }}
                  />
                )}
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {isCat ? `mode: ${stat?.mode}` : isDt ? `range: ${stat?.min} to ${stat?.max}` : `avg ${stat?.mean?.toFixed(2) ?? "—"}`}
                </div>
              </label>
            );
          })}
        </div>
        <button onClick={handlePredict} disabled={loading}
          style={{
            marginTop: 16, padding: "10px 28px", borderRadius: 8, background: "#378ADD",
            color: "#fff", border: "none", fontWeight: 500, cursor: "pointer", fontSize: 14
          }}>
          {loading ? "Predicting…" : "Predict"}
        </button>
      </section>

      {/* Prediction results */}
      {preds && (
        <section>
          <div style={{ fontWeight: 500, marginBottom: 10 }}>Predictions from all models</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
            {Object.entries(preds).map(([m, p]) => (
              <div key={m} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{MODEL_LABELS[m]}</div>
                <div style={{ fontSize: 22, fontWeight: 500 }}>{p.value?.toFixed(3)}</div>
                <div style={{ marginTop: 6 }}><TierBadge label={p.tier || "—"} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Batch */}
      <section style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Batch prediction</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Run predictions on the full uploaded dataset
        </div>
        <button onClick={handleBatch} disabled={batchLoad}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)", cursor: "pointer", fontWeight: 500, fontSize: 13
          }}>
          {batchLoad ? "Running…" : "Run batch prediction"}
        </button>

        {batchData && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              Results across {batchData.total_rows?.toLocaleString()} records
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)" }}>
                    {["Model", "Mean", "Std", "Min", "Max", "Good %", "At Risk %", "Poor %"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(batchData.batch).map(([m, s]) => (
                    <tr key={m} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 500 }}>{MODEL_LABELS[m]}</td>
                      <td style={{ padding: "8px 12px" }}>{s.mean?.toFixed(3)}</td>
                      <td style={{ padding: "8px 12px" }}>{s.std?.toFixed(3)}</td>
                      <td style={{ padding: "8px 12px" }}>{s.min?.toFixed(3)}</td>
                      <td style={{ padding: "8px 12px" }}>{s.max?.toFixed(3)}</td>
                      <td style={{ padding: "8px 12px", color: "#3B6D11" }}>{s.tiers.Good?.pct ?? 0}%</td>
                      <td style={{ padding: "8px 12px", color: "#854F0B" }}>{s.tiers["At Risk"]?.pct ?? 0}%</td>
                      <td style={{ padding: "8px 12px", color: "#A32D2D" }}>{s.tiers.Poor?.pct ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={getAiBatch} disabled={aiLoad}
              style={{
                marginTop: 12, padding: "10px 20px", borderRadius: 8,
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)", cursor: "pointer", fontWeight: 500, fontSize: 13
              }}>
              {aiLoad ? "Generating…" : "✦ AI interpretation ↗"}
            </button>
            {aiNote && (
              <div style={{
                marginTop: 12, padding: "16px", borderRadius: 8,
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)", fontSize: 14, lineHeight: 1.7
              }}>
                {aiNote}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Tab 5: History ───────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/history`);
      if (!r.ok) throw new Error("Failed to fetch run history");
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteRun = async (runId) => {
    try {
      const r = await fetch(`${API}/api/history/${runId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete run");
      setHistory(prev => prev.filter(run => run.id !== runId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: 20, border: "0.5px solid var(--color-border-tertiary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>
          Training Run History
        </div>
        <button onClick={fetchHistory} style={{
          padding: "4px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer",
          background: "#378ADD", color: "#fff", border: "none"
        }}>
          Refresh
        </button>
      </div>

      {loading && <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Loading runs…</div>}
      {error && <div style={{ color: "#A32D2D", fontSize: 13 }}>Error: {error}</div>}

      {!loading && history.length === 0 ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          No saved runs yet. Train a model to save history.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {history.map(run => (
            <div key={run.id} style={{
              background: "var(--color-background-primary)", borderRadius: 8, padding: "14px 18px",
              border: "0.5px solid var(--color-border-tertiary)", position: "relative"
            }}>
              <button 
                onClick={() => deleteRun(run.id)}
                style={{
                  position: "absolute", top: 12, right: 12, background: "none", border: "none",
                  color: "#A32D2D", cursor: "pointer", fontSize: 12, fontWeight: 500
                }}
              >
                Delete
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, paddingRight: 60 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)" }}>
                  {run.model_name}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {run.created_at ? new Date(run.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "flex", flexWrap: "wrap", gap: 14 }}>
                {run.dataset_name && <span>Dataset: {run.dataset_name}</span>}
                <span>Target: {run.target_column}</span>
                <span>Features: {run.feature_count}</span>
              </div>
              {run.metrics && Object.keys(run.metrics).length > 0 && (
                <div style={{ display: "flex", gap: 10, marginTop: 8, paddingTop: 8, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  {Object.entries(run.metrics).slice(0, 4).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 11 }}>
                      <span style={{ color: "var(--color-text-secondary)", marginRight: 4 }}>{k}:</span>
                      <strong style={{ color: "var(--color-text-primary)" }}>
                        {typeof v === 'number' ? v.toFixed(4) : String(v)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [uploadData, setUploadData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [config, setConfig] = useState({
    purpose: "prediction",
    target: "",
    features: [],
    models: ["linear", "rf", "gbm"],
    split: 0.2,
    split_method: "random",
    cv_folds: 5,
    normalization: "none",
    missing: "mean",
    learning_rate: 0.1,
    n_estimators: 100,
    onehot_columns: [],
    periodic_columns: [],
    group_by_column: "",
    agg_method: "mean",
  });

  function handleUploaded(data) {
    setUploadData(data);
    setSessionId(data.session_id);
    setUnlocked(1);
    setStep(1);
  }

  function handleConfigDone() {
    if (!config.target || !config.features.length || !config.models.length) {
      alert("Set a target, select features, and choose at least one model.");
      return;
    }
    setUnlocked(2);
    setStep(2);
  }

  function handleTrainDone() {
    setUnlocked(4);
    setStep(3);
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 60px" }}>
      <h2 aria-hidden style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
        <i className="ti ti-chart-dots" aria-hidden style={{ marginRight: 10, color: "#378ADD" }} />
        ML Prediction Studio
      </h2>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Upload a CSV or Excel file → configure features → train multiple models → analyze results
      </p>

      <StepBar active={step} unlocked={unlocked} onGo={setStep} />

      {/* Tab 0: Data */}
      {step === 0 && (
        <div>
          <DataTab onLoaded={handleUploaded} />
          {uploadData && <DataPreview data={uploadData} />}
          {uploadData && (
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button onClick={() => { setUnlocked(1); setStep(1); }}
                style={{
                  padding: "10px 24px", borderRadius: 8, background: "#378ADD",
                  color: "#fff", border: "none", fontWeight: 500, cursor: "pointer"
                }}>
                Continue to configure →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Configure */}
      {step === 1 && uploadData && (
        <div>
          <ConfigTab data={uploadData} config={config} setConfig={setConfig} />
          <div style={{ marginTop: 24, textAlign: "right" }}>
            <button onClick={handleConfigDone}
              style={{
                padding: "10px 24px", borderRadius: 8, background: "#378ADD",
                color: "#fff", border: "none", fontWeight: 500, cursor: "pointer"
              }}>
              Continue to train →
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Train */}
      {step === 2 && (
        <TrainTab sessionId={sessionId} config={config} onDone={handleTrainDone} />
      )}

      {/* Tab 3: Results */}
      {step === 3 && (
        <div>
          <ResultsTab sessionId={sessionId} config={config} />
          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button onClick={() => { setUnlocked(4); setStep(4); }}
              style={{
                padding: "10px 24px", borderRadius: 8, background: "#378ADD",
                color: "#fff", border: "none", fontWeight: 500, cursor: "pointer"
              }}>
              Continue to predict →
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Predict */}
      {step === 4 && <PredictTab sessionId={sessionId} config={config} />}

      {/* Tab 5: History */}
      {step === 5 && <HistoryTab />}

      {/* Chart.js CDN */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" />
    </div>
  );
}

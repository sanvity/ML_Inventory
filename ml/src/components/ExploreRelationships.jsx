import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { inferAggFunction } from '../App';

const ER_MONTH_MAP = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
};
const ER_TARGET_COLORS = ['#FFDF00', '#747480', '#007A87', '#2E2E38', '#5C768D'];
const ER_FACTOR_COLORS = ['#FFF59D', '#C4C4CD', '#64B5F6', '#90A4AE', '#B0BEC5'];

function erAggregate(vals, metric) {
  const nums = vals.map(Number).filter(v => !isNaN(v));
  if (nums.length === 0) return null;
  switch (metric) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'count': return nums.length;
    case 'latest': return nums[nums.length - 1];
    case 'median': { const s = [...nums].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    default: return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}

function erParseDateValue(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) { const y = parseInt(isoMatch[1], 10), m = parseInt(isoMatch[2], 10); return { year: y, month: m, quarter: Math.ceil(m / 3), sortKey: y * 100 + m }; }
  const myMatch = s.match(/^([a-zA-Z]{3,9})[\s\-](\d{4})$/);
  if (myMatch) { const m = ER_MONTH_MAP[myMatch[1].toLowerCase().substring(0, 3)] || 1, y = parseInt(myMatch[2], 10); return { year: y, month: m, quarter: Math.ceil(m / 3), sortKey: y * 100 + m }; }
  if (/^\d{4}$/.test(s)) { const y = parseInt(s, 10); return { year: y, month: 1, quarter: 1, sortKey: y * 100 + 1 }; }
  const qMatch = s.match(/(\d{4})[\-\s]?Q(\d)/i);
  if (qMatch) { const y = parseInt(qMatch[1], 10), q = parseInt(qMatch[2], 10); return { year: y, month: (q - 1) * 3 + 1, quarter: q, sortKey: y * 10 + q }; }
  const d = new Date(s);
  if (!isNaN(d.getTime())) { const y = d.getFullYear(), m = d.getMonth() + 1; return { year: y, month: m, quarter: Math.ceil(m / 3), sortKey: y * 100 + m }; }
  return null;
}

function erBucketLabel(parsed, gran) {
  if (!parsed) return null;
  if (gran === 'year') return String(parsed.year);
  if (gran === 'quarter') return `${parsed.year}-Q${parsed.quarter}`;
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
}

function erBucketSortKey(parsed, gran) {
  if (!parsed) return 0;
  if (gran === 'year') return parsed.year;
  if (gran === 'quarter') return parsed.year * 10 + parsed.quarter;
  return parsed.sortKey;
}

export default function ExploreRelationships({ dataset, darkMode }) {
  const [targetCols, setTargetCols] = useState([]);
  const [factorCols, setFactorCols] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [granularity, setGranularity] = useState('month');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  // catValues: { [catColName]: string[] } — selected distinct values per categorical column
  const [catValues, setCatValues] = useState({});
  // catCapMsg: shown when user tries to exceed CAT_VAL_CAP
  const [catCapMsg, setCatCapMsg] = useState({});
  const [hiddenLines, setHiddenLines] = useState(new Set());
  const CAT_VAL_CAP = 6;

  const timeColKey = dataset.virtualDateColKey || dataset.sortedByCol || null;
  const numericCols = dataset.columnsInfo.filter(c => c.type === 'numeric');
  const otherCols = dataset.columnsInfo.filter(c => c.type !== 'numeric');

  const [xAxisCol, setXAxisCol] = useState(() => {
    if (timeColKey) return '__time__';
    if (numericCols.length > 0) return numericCols[0].name;
    return '__row__';
  });

  // Sync X-Axis choice when dataset / timeColKey changes
  useEffect(() => {
    if (timeColKey) {
      setXAxisCol('__time__');
    } else if (numericCols.length > 0) {
      setXAxisCol(numericCols[0].name);
    } else {
      setXAxisCol('__row__');
    }
  }, [dataset, timeColKey]);

  // Automatically select the first numeric column as target on mount
  useEffect(() => {
    if (targetCols.length === 0 && numericCols.length > 0) {
      const defaultTarget = numericCols.find(c => c.name !== timeColKey) || numericCols[0];
      if (defaultTarget) {
        // We can't call addCol directly as it has state closures, but we can set state
        setTargetCols([defaultTarget.name]);
        const m = inferAggFunction(defaultTarget.name, defaultTarget.type || 'numeric', dataset);
        setMetrics(p => ({ ...p, [defaultTarget.name]: m }));
      }
    }
  }, [dataset, timeColKey]);

  // Determine if a column is categorical (non-numeric)
  function isCatCol(colName) {
    const meta = dataset.columnsInfo.find(c => c.name === colName);
    return meta && meta.type !== 'numeric';
  }

  // Distinct values for a categorical column (top 20 by frequency)
  function distinctVals(colName) {
    const freq = {};
    dataset.sampleRows.forEach(r => {
      const v = r[colName];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const k = String(v).trim();
        freq[k] = (freq[k] || 0) + 1;
      }
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(e => e[0]);
  }

  function defaultMetric(colName) {
    const col = dataset.columnsInfo.find(c => c.name === colName);
    return inferAggFunction(colName, col?.type || 'numeric', dataset);
  }
  function addCol(colName, role) {
    if (role === 'target' && !targetCols.includes(colName)) setTargetCols(p => [...p, colName]);
    else if (role === 'factor' && !factorCols.includes(colName)) setFactorCols(p => [...p, colName]);
    if (!metrics[colName]) setMetrics(p => ({ ...p, [colName]: defaultMetric(colName) }));
    // For categorical cols: auto-select top 3 values as default
    if (isCatCol(colName) && !catValues[colName]) {
      const top = distinctVals(colName).slice(0, 3);
      setCatValues(p => ({ ...p, [colName]: top }));
    }
  }
  function removeCol(colName, role) {
    if (role === 'target') setTargetCols(p => p.filter(c => c !== colName));
    else setFactorCols(p => p.filter(c => c !== colName));
    setCatValues(p => { const n = { ...p }; delete n[colName]; return n; });
    setCatCapMsg(p => { const n = { ...p }; delete n[colName]; return n; });
    setHiddenLines(prev => {
      const next = new Set(prev);
      for (const key of next) {
        if (key === colName || key.startsWith(colName + ' —')) {
          next.delete(key);
        }
      }
      return next;
    });
  }
  function toggleCatValue(colName, val) {
    setCatValues(prev => {
      const cur = prev[colName] || [];
      if (cur.includes(val)) {
        return { ...prev, [colName]: cur.filter(v => v !== val) };
      }
      if (cur.length >= CAT_VAL_CAP) {
        setCatCapMsg(p => ({ ...p, [colName]: `Max ${CAT_VAL_CAP} values allowed` }));
        setTimeout(() => setCatCapMsg(p => ({ ...p, [colName]: '' })), 2500);
        return prev;
      }
      setCatCapMsg(p => ({ ...p, [colName]: '' }));
      return { ...prev, [colName]: [...cur, val] };
    });
  }

  // Numeric cols currently selected (targets or factors)
  const numericSelected = useMemo(() => [...targetCols, ...factorCols].filter(c => !isCatCol(c)), [targetCols, factorCols, dataset]);
  // Categorical cols currently selected
  const catSelected = useMemo(() => [...targetCols, ...factorCols].filter(c => isCatCol(c)), [targetCols, factorCols, dataset]);

  // Expanded line keys — one per (numericCol × catValue) for each active categorical col,
  // plus plain numeric lines for numeric cols when no cat breakdown is active.
  // Key format: plain numeric → colName; cat breakdown → "numCol — catVal"
  const expandedLines = useMemo(() => {
    const lines = []; // { key, numCol, catCol, catVal, role }
    const role = col => targetCols.includes(col) ? 'target' : 'factor';

    if (catSelected.length === 0) {
      // No categoricals — plain numeric lines only
      numericSelected.forEach(col => lines.push({ key: col, numCol: col, catCol: null, catVal: null, role: role(col) }));
    } else {
      // For each numeric col, produce one line per selected cat value (per each cat col)
      numericSelected.forEach(numCol => {
        if (catSelected.length === 0) {
          lines.push({ key: numCol, numCol, catCol: null, catVal: null, role: role(numCol) });
        } else {
          catSelected.forEach(catCol => {
            const vals = catValues[catCol] || [];
            if (vals.length === 0) {
              // No values selected yet — show placeholder
              lines.push({ key: `${numCol} — (pick values for ${catCol})`, numCol, catCol, catVal: null, role: role(catCol) });
            } else {
              vals.forEach(val => {
                lines.push({ key: `${numCol} — ${val}`, numCol, catCol, catVal: val, role: role(catCol) });
              });
            }
          });
        }
      });
      // Also render pure categorical cols as their own count lines (if no numeric selected)
      if (numericSelected.length === 0) {
        catSelected.forEach(catCol => {
          const vals = catValues[catCol] || [];
          vals.forEach(val => lines.push({ key: `${catCol} — ${val}`, numCol: catCol, catCol, catVal: val, role: role(catCol) }));
        });
      }
    }
    return lines;
  }, [targetCols, factorCols, numericSelected, catSelected, catValues, dataset]);

  const chartData = useMemo(() => {
    if (expandedLines.length === 0 || !timeColKey) return [];
    const buckets = {};
    dataset.sampleRows.forEach(row => {
      const parsed = erParseDateValue(row[timeColKey]);
      if (!parsed) return;
      const label = erBucketLabel(parsed, granularity);
      const sortKey = erBucketSortKey(parsed, granularity);
      if (!label) return;
      if (dateStart && label < dateStart) return;
      if (dateEnd && label > dateEnd) return;
      if (!buckets[label]) buckets[label] = { label, sortKey, vals: {} };
      expandedLines.forEach(({ key, numCol, catCol, catVal }) => {
        if (catVal !== null && catVal !== undefined) {
          // Filter rows where catCol === catVal, then collect numCol values
          if (String(row[catCol]).trim() !== String(catVal).trim()) return;
        }
        if (!buckets[label].vals[key]) buckets[label].vals[key] = [];
        const v = row[numCol];
        if (v !== null && v !== undefined && String(v).trim() !== '') buckets[label].vals[key].push(v);
      });
    });
    return Object.values(buckets).sort((a, b) => a.sortKey - b.sortKey).map(b => {
      const pt = { label: b.label };
      expandedLines.forEach(({ key, numCol }) => {
        const m = metrics[numCol] || 'mean';
        pt[key] = erAggregate(b.vals[key] || [], m);
      });
      return pt;
    });
  }, [expandedLines, metrics, granularity, dateStart, dateEnd, dataset, timeColKey]);

  const nonTemporalChartData = useMemo(() => {
    if (expandedLines.length === 0 || xAxisCol === '__time__') return [];
    
    let sortedRows = [...dataset.sampleRows];
    if (xAxisCol !== '__row__') {
      sortedRows.sort((a, b) => {
        const valA = Number(a[xAxisCol]);
        const valB = Number(b[xAxisCol]);
        if (isNaN(valA) || isNaN(valB)) return 0;
        return valA - valB;
      });
    }

    return sortedRows.map((row, idx) => {
      const pt = {
        label: xAxisCol === '__row__' ? `Row ${idx + 1}` : String(row[xAxisCol])
      };
      expandedLines.forEach(({ key, numCol, catCol, catVal }) => {
        if (catVal !== null && catVal !== undefined) {
          if (String(row[catCol]).trim() !== String(catVal).trim()) {
            pt[key] = null;
            return;
          }
        }
        const v = row[numCol];
        pt[key] = (v !== null && v !== undefined && String(v).trim() !== '') ? Number(v) : null;
      });
      return pt;
    });
  }, [expandedLines, xAxisCol, dataset]);

  const activeChartData = xAxisCol === '__time__' ? chartData : nonTemporalChartData;

  const axisGroups = useMemo(() => {
    if (expandedLines.length === 0 || activeChartData.length === 0) return {};
    const orderToAxis = {}, axisMap = {};
    let next = 0;
    expandedLines.forEach(({ key, numCol }) => {
      const vals = activeChartData.map(d => d[key]).filter(v => v !== null && !isNaN(Number(v)));
      const max = vals.length ? Math.max(...vals.map(v => Math.abs(Number(v)))) : 0;
      const ord = max === 0 ? 0 : Math.floor(Math.log10(max + 1));
      // Group by numCol so all breakdowns of same numeric col share an axis
      const groupKey = numCol + '__' + ord;
      if (axisMap[groupKey] === undefined) {
        const existing = Object.keys(orderToAxis).find(k => Math.abs(Number(k.split('__')[1] || k) - ord) <= 1);
        if (existing !== undefined) { orderToAxis[groupKey] = orderToAxis[existing]; axisMap[groupKey] = orderToAxis[existing]; }
        else { orderToAxis[groupKey] = next; axisMap[groupKey] = next; next++; }
      }
      axisMap[key] = axisMap[groupKey];
    });
    return axisMap;
  }, [expandedLines, activeChartData]);

  const distinctAxes = [...new Set(Object.values(axisGroups).filter(v => typeof v === 'number'))].sort((a, b) => a - b);
  const gc = darkMode ? '#1e293b' : '#f1f5f9';
  const tc = darkMode ? '#94a3b8' : '#64748b';
  const sel = "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none";
  const MOPTS = [{ v: 'sum', l: 'Sum' }, { v: 'mean', l: 'Avg' }, { v: 'median', l: 'Med' }, { v: 'min', l: 'Min' }, { v: 'max', l: 'Max' }, { v: 'count', l: 'Cnt' }, { v: 'latest', l: 'Last' }];

  // ColPill: shows each selected column with its metric dropdown and remove button
  function ColPill({ colName, role, idx }) {
    const colors = role === 'target' ? ER_TARGET_COLORS : ER_FACTOR_COLORS;
    const color = colors[idx % colors.length];
    const m = metrics[colName] || 'mean';
    const isCat = isCatCol(colName);
    // For numeric cols show axis; cat cols don't directly map to an axis
    const axId = isCat ? null : ((axisGroups[colName] ?? 0) + 1);
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold flex-shrink-0"
        style={{ borderColor: color + '55', background: color + '14', color }}>
        <span className="truncate max-w-[80px]" title={colName}>{colName}</span>
        {!isCat && (
          <select value={m} onChange={e => { e.stopPropagation(); setMetrics(p => ({ ...p, [colName]: e.target.value })) }}
            onClick={e => e.stopPropagation()}
            style={{ color, background: 'transparent', border: 'none', fontSize: '9px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
            {MOPTS.map(o => <option key={o.v} value={o.v} style={{ background: darkMode ? '#0f172a' : '#fff', color: darkMode ? '#f8fafc' : '#0f172a' }}>{o.l}</option>)}
          </select>
        )}
        {isCat && <span style={{ fontSize: '9px', opacity: 0.7 }}>breakdown</span>}
        {axId !== null && <span style={{ fontSize: '8px', opacity: 0.6 }}>Y{axId}</span>}
        <button onClick={() => removeCol(colName, role)} style={{ opacity: .5, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', color, fontSize: '10px' }} title="Remove">✕</button>
      </div>
    );
  }

  // fmt helper
  function fmtVal(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '—';
    const v = Number(n);
    return Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(2) + 'k' : v.toFixed(2);
  }
  function fmtTick(v) {
    if (!v && v !== 0) return '';
    const n = Number(v);
    return Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(2);
  }

  const noData = targetCols.length === 0;
  const allSelected = [...targetCols, ...factorCols];

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            Explore Relationships
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Raw uncleaned data</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Compare columns over time. Targets = solid lines; factors = dashed lines. Add a categorical column to break numeric lines out per value.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* X-Axis Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">X-Axis:</span>
            <select value={xAxisCol} onChange={e => setXAxisCol(e.target.value)} className={sel}>
              {timeColKey && <option value="__time__">Time Axis ({timeColKey})</option>}
              {numericCols.map(c => <option key={c.name} value={c.name}>{c.name} (Numeric)</option>)}
              <option value="__row__">Row-wise (Index)</option>
            </select>
          </div>

          {xAxisCol === '__time__' && timeColKey && (
            <div className="flex flex-wrap items-center gap-2">
              <select value={granularity} onChange={e => setGranularity(e.target.value)} className={sel}>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
              <input type="text" placeholder="Start (YYYY-MM)" value={dateStart} onChange={e => setDateStart(e.target.value)} className={sel + " w-32"} />
              <span className="text-xs text-slate-400">to</span>
              <input type="text" placeholder="End (YYYY-MM)" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={sel + " w-32"} />
            </div>
          )}
        </div>
      </div>

      {/* Column selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{ role: 'target', cols: targetCols, label: 'Target columns', hint: '(solid lines)' }, { role: 'factor', cols: factorCols, label: 'Influencing factors', hint: '(dashed lines)' }].map(({ role, cols, label, hint }) => (
          <div key={role} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
              <span className="text-[9px] text-slate-400">{hint}</span>
            </div>
            <select value="" onChange={e => { if (e.target.value) addCol(e.target.value, role); }} className={sel + " w-full"}>
              <option value="">+ Add {role === 'target' ? 'target' : 'factor'} column…</option>
              <optgroup label="Numeric">
                {numericCols.filter(c => !allSelected.includes(c.name)).map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Categorical / Date">
                {otherCols.filter(c => !allSelected.includes(c.name)).map(c => (
                  <option key={c.name} value={c.name}>{c.name} (breakdown)</option>
                ))}
              </optgroup>
            </select>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {cols.map((col, i) => <ColPill key={col} colName={col} role={role} idx={i} />)}
            </div>
          </div>
        ))}
      </div>

      {/* Categorical value selectors — shown for each categorical column added */}
      {catSelected.length > 0 && (
        <div className="space-y-3">
          {catSelected.map(catCol => {
            const vals = distinctVals(catCol);
            const selected = catValues[catCol] || [];
            const role = targetCols.includes(catCol) ? 'target' : 'factor';
            const colors = role === 'target' ? ER_TARGET_COLORS : ER_FACTOR_COLORS;
            const numPairs = numericSelected.length > 0
              ? numericSelected.join(', ')
              : '(add a numeric target/factor column)';
            return (
              <div key={catCol} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span style={{ color: colors[catSelected.indexOf(catCol) % colors.length] }}>{catCol}</span>
                    <span className="text-slate-400 font-normal ml-1">breaks down: <strong className="text-slate-600 dark:text-slate-300">{numPairs}</strong></span>
                  </span>
                  <span className="text-[9px] text-slate-400">{selected.length}/{CAT_VAL_CAP} values selected</span>
                </div>
                {catCapMsg[catCol] && (
                  <p className="text-[9px] font-bold text-rose-500">{catCapMsg[catCol]}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {vals.map(val => {
                    const isOn = selected.includes(val);
                    const colIdx = selected.indexOf(val);
                    const color = isOn ? colors[colIdx % colors.length] : null;
                    return (
                      <button key={val} onClick={() => toggleCatValue(catCol, val)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition cursor-pointer"
                        style={isOn
                          ? { borderColor: color + '55', background: color + '18', color }
                          : { borderColor: '#e2e8f0', background: 'transparent', color: '#94a3b8' }
                        }>
                        {val}
                        {isOn && <span className="ml-1 opacity-60">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {noData ? (
        <div className="flex flex-col items-center justify-center h-44 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-600 gap-2">
          <TrendingUp className="w-9 h-9 opacity-25" />
          <span className="text-xs font-semibold">Select at least one target column to render the chart</span>
        </div>
      ) : (xAxisCol === '__time__' && !timeColKey) ? (
        <div className="flex flex-col items-center justify-center h-32 border border-dashed border-amber-200 dark:border-amber-800 rounded-xl text-amber-600 gap-1">
          <span className="text-xs font-semibold">⚠ No date/time column detected — time-axis chart unavailable</span>
        </div>
      ) : activeChartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 gap-1">
          <span className="text-xs font-semibold">No data after applying current filters</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={activeChartData} margin={{ top: 8, right: distinctAxes.length > 1 ? 70 : 20, left: 10, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gc} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: tc }} angle={-30} textAnchor="end" height={44} interval="preserveStartEnd" />

              {distinctAxes.map((axIdx, i) => {
                // Label axis with the numeric cols that map to it
                const keysOnAxis = expandedLines.filter(l => (axisGroups[l.key] ?? 0) === axIdx);
                const uniqueNumCols = [...new Set(keysOnAxis.map(l => l.numCol))];
                const m = metrics[uniqueNumCols[0]] || 'mean';
                const axLabel = uniqueNumCols.slice(0, 2).join(', ') + (uniqueNumCols.length > 2 ? '…' : '') + (` (${m})`);
                return (
                  <YAxis key={axIdx} yAxisId={axIdx} orientation={i === 0 ? 'left' : 'right'}
                    tick={{ fontSize: 9, fill: tc }} width={i === 0 ? 54 : 50}
                    tickFormatter={fmtTick}
                    label={{ value: axLabel, angle: -90, position: i === 0 ? 'insideLeft' : 'insideRight', offset: i === 0 ? 10 : -10, style: { fontSize: 8, fill: tc } }}
                  />
                );
              })}

              <ChartTooltip
                contentStyle={{ fontSize: '11px', backgroundColor: darkMode ? '#1e293b' : '#fff', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#f8fafc' : '#0f172a', borderRadius: '8px' }}
                formatter={(value, name) => {
                  const line = expandedLines.find(l => l.key === name);
                  const m = line ? (metrics[line.numCol] || 'mean') : 'mean';
                  const axId = (axisGroups[name] ?? 0) + 1;
                  return [fmtVal(value), `${name} · ${m} · Y${axId}`];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px', cursor: 'pointer' }}
                onClick={(e) => {
                  const dataKey = e.dataKey;
                  setHiddenLines(prev => {
                    const next = new Set(prev);
                    if (next.has(dataKey)) {
                      next.delete(dataKey);
                    } else {
                      next.add(dataKey);
                    }
                    return next;
                  });
                }}
                formatter={v => {
                  const line = expandedLines.find(l => l.key === v);
                  const m = line ? (metrics[line.numCol] || 'mean') : 'mean';
                  const isHidden = hiddenLines.has(v);
                  return (
                    <span style={{ textDecoration: isHidden ? 'line-through' : 'none', opacity: isHidden ? 0.45 : 1 }}>
                      {v} · {m} · Y{(axisGroups[v] ?? 0) + 1}
                    </span>
                  );
                }} />

              {/* Target lines */}
              {expandedLines.filter(l => l.role === 'target').map((line, i) => (
                <Line key={line.key} yAxisId={axisGroups[line.key] ?? 0}
                  type="monotone" dataKey={line.key}
                  stroke={ER_TARGET_COLORS[i % ER_TARGET_COLORS.length]} strokeWidth={2.5}
                  dot={{ r: 2.5, strokeWidth: 1.5, fill: ER_TARGET_COLORS[i % ER_TARGET_COLORS.length] }}
                  connectNulls isAnimationActive={false}
                  hide={hiddenLines.has(line.key)} />
              ))}
              {/* Factor lines */}
              {expandedLines.filter(l => l.role === 'factor').map((line, i) => (
                <Line key={line.key} yAxisId={axisGroups[line.key] ?? 0}
                  type="monotone" dataKey={line.key}
                  stroke={ER_FACTOR_COLORS[i % ER_FACTOR_COLORS.length]} strokeWidth={1.5}
                  strokeDasharray="4 2" strokeOpacity={0.65}
                  dot={{ r: 1.5, strokeWidth: 1, fill: ER_FACTOR_COLORS[i % ER_FACTOR_COLORS.length], fillOpacity: 0.65 }}
                  connectNulls isAnimationActive={false}
                  hide={hiddenLines.has(line.key)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

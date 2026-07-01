/**
 * Data Readiness Calculator
 *
 * An enterprise-grade, highly configurable utility for evaluating three-pillar data quality:
 * 1. Granularity Score
 * 2. Historicity Score
 * 3. Value & Quality Score
 *
 * Designed to handle edge cases like Daylight Saving Time (DST) shifts, timezones,
 * mixed null types, sparse data matrices, and statistical data drift.
 */

// Helper: Standardized Null Check covering mixed formats and empty values
export const isNullOrEmpty = (val) => {
  if (val === null || val === undefined) return true;
  const str = String(val).trim();
  if (str === '') return true;
  const lower = str.toLowerCase();
  return lower === 'null' || lower === 'na' || lower === 'n/a' || lower === 'nan' || lower === 'undefined';
};

// Helper: DST-Safe Date Difference (in UTC days)
export const getUtcDayDifference = (d1, d2) => {
  const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
  const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
};

// Helper: Calculate Mean and Standard Deviation
export const getStats = (values) => {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
};

/**
 * Calculates readiness scores for Granularity, Historicity, and Value
 * 
 * @param {Array<Object>} rows Sorted array of dataset rows.
 * @param {Array<string>} features List of feature column names.
 * @param {string} targetColumn Target column name.
 * @param {string} dateColumn Date/time column name.
 * @param {Array<Object>} activeAnomalies Active unresolved anomalies.
 * @param {string} goal Modeling goal (e.g. 'forecasting').
 * @param {Object} options Configuration parameters.
 */
export const calculateReadiness = (
  rows,
  features,
  targetColumn,
  dateColumn,
  activeAnomalies = [],
  goal = 'forecasting',
  options = {}
) => {
  // ── Input Configuration Schema with fallbacks ──────────────────────────────
  const config = {
    referenceDate: options.referenceDate ? new Date(options.referenceDate) : new Date(),
    granularityThresholds: {
      minCardinalityRatio: 0.8,
      regularIntervalRatio: 0.7,
      ...(options.granularityThresholds || {})
    },
    historicityThresholds: {
      freshDaysMax: 30,
      criticalSpanDays: 90,
      optimalSpanDays: 365,
      ...(options.historicityThresholds || {})
    },
    driftThreshold: options.driftThreshold !== undefined ? options.driftThreshold : 0.3,
    weights: {
      highSeverityAnomaly: 5,
      mediumSeverityAnomaly: 2,
      driftPenalty: 10,
      ...(options.weights || {})
    }
  };

  const metadata = {
    totalCells: rows.length * features.length,
    totalNulls: 0,
    detectedIntervalDays: null,
    dataSpanDays: 0
  };

  // Base return object structure
  const result = {
    scores: { granularity: 100, historicity: 100, valueScore: 100, overallReadiness: 100 },
    metadata
  };

  if (!rows || rows.length === 0 || features.length === 0) {
    result.scores = { granularity: 0, historicity: 0, valueScore: 0, overallReadiness: 0 };
    return result;
  }

  // Standardize parsing of dates upfront
  const parsedDates = [];
  const uniqueDatesSet = new Set();
  
  if (dateColumn) {
    rows.forEach(r => {
      const val = r[dateColumn];
      if (!isNullOrEmpty(val)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          parsedDates.push(d);
          uniqueDatesSet.add(d.toISOString().substring(0, 10)); // Timezone-agnostic UTC representation
        }
      }
    });
  }

  // Count global nulls
  rows.forEach(r => {
    features.forEach(f => {
      if (isNullOrEmpty(r[f])) {
        metadata.totalNulls++;
      }
    });
  });

  const uniqueDatesCount = uniqueDatesSet.size;

  // =========================================================================
  // 1. GRANULARITY PILLAR
  // =========================================================================
  let granularity = 100;
  if (goal === 'forecasting') {
    if (!dateColumn || parsedDates.length === 0) {
      granularity = 40;
    } else if (parsedDates.length < 10) {
      granularity = 30;
    } else {
      // Cardinality check (frequency / length ratio)
      const cardinalityRatio = uniqueDatesCount / rows.length;
      const targetCard = config.granularityThresholds.minCardinalityRatio;
      
      if (cardinalityRatio < targetCard) {
        // Dynamic scale penalty: Deduct proportionally to how far below the threshold the ratio falls
        const distanceRatio = (targetCard - cardinalityRatio) / targetCard;
        granularity -= Math.round(distanceRatio * 50);
      }

      // Interval regularity check
      const intervals = [];
      for (let i = 1; i < parsedDates.length; i++) {
        const gap = getUtcDayDifference(parsedDates[i - 1], parsedDates[i]);
        intervals.push(gap);
      }

      if (intervals.length > 0) {
        // Compute frequencies of interval gaps
        const gapFrequencies = {};
        intervals.forEach(g => {
          gapFrequencies[g] = (gapFrequencies[g] || 0) + 1;
        });

        // Find dominant interval (mode)
        let dominantGap = 1;
        let maxCount = 0;
        Object.entries(gapFrequencies).forEach(([gap, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantGap = Number(gap);
          }
        });

        metadata.detectedIntervalDays = dominantGap;

        const regularIntervalRatio = maxCount / intervals.length;
        const targetReg = config.granularityThresholds.regularIntervalRatio;

        if (regularIntervalRatio < targetReg) {
          // Dynamic scale penalty
          const distanceReg = (targetReg - regularIntervalRatio) / targetReg;
          granularity -= Math.round(distanceReg * 30);
        }

        // Sparsity constraints relative to detected monthly (28-31) or weekly (6-8) scales
        if (dominantGap >= 28 && dominantGap <= 31 && uniqueDatesCount < 12) {
          granularity -= 40;
        } else if (dominantGap >= 6 && dominantGap <= 8 && uniqueDatesCount < 10) {
          granularity -= 40;
        }
      }
    }
  }
  result.scores.granularity = Math.max(0, Math.min(100, Math.round(granularity)));

  // =========================================================================
  // 2. HISTORICITY PILLAR
  // =========================================================================
  let historicity = 100;
  if (goal === 'forecasting') {
    if (!dateColumn || parsedDates.length === 0) {
      historicity = 50;
    } else {
      // Ensure chronological ordering verification
      const minDate = parsedDates[0];
      const maxDate = parsedDates[parsedDates.length - 1];
      const isChronological = maxDate >= minDate;

      if (!isChronological) {
        // If sorting check fails, force validation penalty
        historicity -= 25;
      }

      // Age of last update/freshness
      const ageDays = getUtcDayDifference(maxDate, config.referenceDate);
      const freshMax = config.historicityThresholds.freshDaysMax;
      
      if (ageDays > freshMax) {
        // Dynamic scaling penalty based on age
        const staleExcess = ageDays - freshMax;
        historicity -= Math.min(30, Math.round(staleExcess * 0.1));
      }

      // Total coverage span evaluation
      const spanDays = getUtcDayDifference(minDate, maxDate);
      metadata.dataSpanDays = spanDays;

      const critSpan = config.historicityThresholds.criticalSpanDays;
      const optSpan = config.historicityThresholds.optimalSpanDays;

      if (spanDays < critSpan) {
        historicity -= 30;
      } else if (spanDays < optSpan) {
        // Linear scale penalty between critical and optimal span thresholds
        const spanDeficit = (optSpan - spanDays) / (optSpan - critSpan);
        historicity -= Math.round(spanDeficit * 15);
      }

      // Null rate chronological degradation (comparing chunk1 vs chunk3)
      const n = rows.length;
      if (n >= 3) {
        const chunk1 = rows.slice(0, Math.floor(n / 3));
        const chunk3 = rows.slice(Math.floor((2 * n) / 3));

        const getChunkNullRate = (chunk) => {
          let nullCount = 0;
          chunk.forEach(r => {
            features.forEach(f => {
              if (isNullOrEmpty(r[f])) nullCount++;
            });
          });
          return nullCount / (chunk.length * features.length || 1);
        };

        const rate1 = getChunkNullRate(chunk1);
        const rate3 = getChunkNullRate(chunk3);

        // Degradation check using standard statistical significance limit
        if (rate3 > rate1 + 0.05) {
          // Dynamic penalty scaled relative to absolute drift percentage change
          const excessNullRate = rate3 - rate1;
          historicity -= Math.round(excessNullRate * 100);
        }
      }
    }
  }
  result.scores.historicity = Math.max(0, Math.min(100, Math.round(historicity)));

  // =========================================================================
  // 3. VALUE & QUALITY SCORE PILLAR
  // =========================================================================
  let valueScore = 100;

  // 1. Missing cells penalty
  if (metadata.totalCells > 0) {
    const nullPct = metadata.totalNulls / metadata.totalCells;
    valueScore -= nullPct * 100;
  }

  // 2. Active anomalies penalty
  const highSeverityCount = activeAnomalies.filter(a => a.severity === 'High').length;
  const mediumSeverityCount = activeAnomalies.filter(a => a.severity === 'Medium').length;
  valueScore -= (
    highSeverityCount * config.weights.highSeverityAnomaly +
    mediumSeverityCount * config.weights.mediumSeverityAnomaly
  );

  // 3. Data Drift Check: Scale-invariant statistical drift evaluation (similar to normalized mean deviation)
  let stabilityPenalties = 0;
  const n = rows.length;

  if (n >= 10) {
    const half = Math.floor(n / 2);
    
    features.forEach(f => {
      // Exclude standard date/time index, seasonality indices or cyclic variables to guard against seasonality false positives
      const nameLower = f.toLowerCase();
      if (
        nameLower.includes('sin') ||
        nameLower.includes('cos') ||
        nameLower.includes('month') ||
        nameLower.includes('week') ||
        nameLower.includes('quarter') ||
        nameLower.includes('dayofweek') ||
        nameLower.includes('hour')
      ) {
        return;
      }

      // Collect numeric values
      const vals1 = rows.slice(0, half).map(r => Number(r[f])).filter(v => !isNaN(v) && v !== null);
      const vals2 = rows.slice(half).map(r => Number(r[f])).filter(v => !isNaN(v) && v !== null);

      if (vals1.length > 5 && vals2.length > 5) {
        const stats1 = getStats(vals1);
        const stats2 = getStats(vals2);

        // Compute Pooed Standard Deviation to represent data scale
        const pooledStd = Math.sqrt((Math.pow(stats1.std, 2) + Math.pow(stats2.std, 2)) / 2);
        
        // Scale-invariant Mean Drift (Cohen's d style)
        let driftValue = 0;
        if (pooledStd > 1e-6) {
          driftValue = Math.abs(stats1.mean - stats2.mean) / pooledStd;
        } else {
          // If both stds are 0 (e.g. constant value), check if mean changed directly
          const maxAbsMean = Math.max(Math.abs(stats1.mean), Math.abs(stats2.mean));
          if (maxAbsMean > 1e-6) {
            driftValue = Math.abs(stats1.mean - stats2.mean) / maxAbsMean;
          }
        }

        // Compare against coefficient threshold
        if (driftValue > config.driftThreshold) {
          stabilityPenalties += config.weights.driftPenalty;
        }
      }
    });
  }

  valueScore -= stabilityPenalties;
  result.scores.valueScore = Math.max(0, Math.min(100, Math.round(valueScore)));

  // Calculate Overall Readiness
  result.scores.overallReadiness = Math.round(
    (result.scores.granularity + result.scores.historicity + result.scores.valueScore) / 3
  );

  return result;
};

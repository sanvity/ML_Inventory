/**
 * ML Playground — Model Registry
 * Static catalog of all 22 supported models, grouped by category.
 * This is the single source of truth for the Sidebar, Drawer, and Tab1 recommendations.
 */

export const CATEGORIES = {
  supervised: {
    id: 'supervised',
    label: 'Supervised Learning',
    icon: 'target',
    color: '#6366f1',
    description: 'Learn from labelled examples to predict outputs for new data.',
  },
  unsupervised: {
    id: 'unsupervised',
    label: 'Unsupervised Learning',
    icon: 'circles-relation',
    color: '#10b981',
    description: 'Discover hidden patterns and structure without labelled data.',
  },
  timeseries: {
    id: 'timeseries',
    label: 'Time Series',
    icon: 'timeline',
    color: '#f59e0b',
    description: 'Forecast future values from sequentially ordered historical data.',
  },
  simulation: {
    id: 'simulation',
    label: 'Simulation & Optimization',
    icon: 'atom-2',
    color: '#f43f5e',
    description: 'Model uncertainty and search for optimal decisions under constraints.',
  },
};

export const GOAL_TYPES = [
  {
    id: 'regression',
    label: 'Predict a number',
    description: 'Estimate a continuous value — price, revenue, temperature, score…',
    icon: 'chart-line',
    color: '#6366f1',
    examples: ['Predict house price', 'Forecast revenue', 'Estimate employee salary'],
  },
  {
    id: 'classification',
    label: 'Predict a category',
    description: 'Classify into groups — yes/no, spam/not-spam, customer tier…',
    icon: 'tags',
    color: '#10b981',
    examples: ['Classify loan default', 'Detect churn', 'Label sentiment'],
  },
  {
    id: 'clustering',
    label: 'Group similar things',
    description: 'Discover natural segments or clusters in your data.',
    icon: 'circles-relation',
    color: '#8b5cf6',
    examples: ['Segment customers', 'Group products', 'Find behavior patterns'],
  },
  {
    id: 'anomaly',
    label: 'Detect anomalies',
    description: 'Find unusual observations — fraud, equipment faults, outliers…',
    icon: 'alert-triangle',
    color: '#f43f5e',
    examples: ['Detect fraud', 'Find faulty sensors', 'Flag unusual orders'],
  },
  {
    id: 'forecasting',
    label: 'Forecast over time',
    description: 'Predict future steps in a time-ordered sequence.',
    icon: 'trending-up',
    color: '#f59e0b',
    examples: ['Forecast sales', 'Predict demand', 'Project stock price'],
  },
  {
    id: 'simulation',
    label: 'Run simulations',
    description: 'Model uncertainty and explore a range of possible outcomes.',
    icon: 'atom-2',
    color: '#38bdf8',
    examples: ['Monte Carlo risk analysis', 'Bayesian hyperparameter tuning'],
  },
];

export const MODELS = {

  /* ── SUPERVISED ──────────────────────────────────────── */

  linear_regression: {
    id: 'linear_regression',
    backendKey: 'linear',
    category: 'supervised',
    name: 'Linear Regression',
    description: 'Predicts a number by drawing the best straight line through your data.',
    badge: 'Fast',
    badgeVariant: 'success',
    icon: 'math-function',
    goalTypes: ['regression'],
    goodFor: ['Simple numeric prediction', 'Interpreting feature impact', 'Small datasets', 'Baseline comparisons'],
    pros: ['Fastest to train — results in seconds', 'Completely transparent — every coefficient has a clear meaning', 'Works well with limited data (even 50 rows)'],
    cons: ['Only captures straight-line relationships', 'Sensitive to outliers', 'Struggles when features interact in complex ways'],
    dataRequirements: 'As few as 20 rows. Works best with numeric features and a clear linear trend.',
    speed: 'fast',
    difficulty: 'beginner',
    comparisonNote: 'Simplest and most explainable — good starting point',
  },
  ridge_regression: {
    id: 'ridge_regression',
    backendKey: 'ridge',
    category: 'supervised',
    name: 'Ridge Regression',
    description: 'Linear Regression with a penalty that prevents over-reliance on any single feature.',
    badge: 'Fast',
    badgeVariant: 'success',
    icon: 'math-function',
    goalTypes: ['regression'],
    goodFor: ['Many correlated features', 'Preventing overfitting', 'Stable predictions'],
    pros: ['Handles correlated features gracefully', 'More robust than plain Linear Regression', 'Still very fast to train'],
    cons: ['Slightly less interpretable than plain linear', 'Still limited to linear relationships'],
    dataRequirements: 'At least 30 rows. Shines when you have many features with overlapping information.',
    speed: 'fast',
    difficulty: 'beginner',
    comparisonNote: 'Safer version of Linear Regression for messy data',
  },
  decision_tree: {
    id: 'decision_tree',
    backendKey: 'dt',
    category: 'supervised',
    name: 'Decision Tree',
    description: 'Learns a series of if-then-else rules to split your data into prediction buckets.',
    badge: 'Fast',
    badgeVariant: 'success',
    icon: 'binary-tree',
    goalTypes: ['regression', 'classification'],
    goodFor: ['Understanding decision logic', 'Mixed numeric + categorical features', 'Quick explanations'],
    pros: ['Extremely interpretable — you can follow the path', 'No feature scaling needed', 'Handles both numbers and categories natively'],
    cons: ['Prone to overfitting on training data', 'Unstable — small data changes can alter the tree completely'],
    dataRequirements: 'At least 50 rows. Needs enough data to split meaningfully.',
    speed: 'fast',
    difficulty: 'beginner',
    comparisonNote: 'Interpretable but less accurate than ensembles',
  },
  random_forest: {
    id: 'random_forest',
    backendKey: 'rf',
    category: 'supervised',
    name: 'Random Forest',
    description: 'Builds hundreds of Decision Trees and averages their answers — "wisdom of the crowd" for ML.',
    badge: 'Balanced',
    badgeVariant: 'warning',
    icon: 'trees',
    goalTypes: ['regression', 'classification'],
    goodFor: ['General-purpose prediction', 'Mixed feature types', 'Robust results without tuning'],
    pros: ['Strong out-of-the-box accuracy', 'Built-in feature importance ranking', 'Handles missing values and outliers well'],
    cons: ['Slower than a single decision tree', 'Less interpretable than linear models', 'Large models can use significant memory'],
    dataRequirements: '200+ rows for best results. Works with fewer but accuracy improves with more data.',
    speed: 'medium',
    difficulty: 'intermediate',
    comparisonNote: 'Best default choice — strong accuracy with no tuning',
  },
  xgboost: {
    id: 'xgboost',
    backendKey: 'xgboost',
    category: 'supervised',
    name: 'XGBoost',
    description: 'Builds trees sequentially, each one correcting the errors of the last — a Kaggle competition favourite.',
    badge: 'High Accuracy',
    badgeVariant: 'info',
    icon: 'bolt',
    goalTypes: ['regression', 'classification'],
    goodFor: ['Competitive accuracy on structured data', 'Handling complex patterns', 'Medium to large datasets'],
    pros: ['Often highest accuracy on tabular data', 'Built-in regularization prevents overfitting', 'Fast GPU-accelerated training available'],
    cons: ['More hyperparameters to tune', 'Harder to interpret than linear models', 'Slower than Random Forest at default settings'],
    dataRequirements: '500+ rows ideal. Can work with less but shines with more data.',
    speed: 'medium',
    difficulty: 'intermediate',
    comparisonNote: 'More accurate than RF but needs more tuning',
  },
  lightgbm: {
    id: 'lightgbm',
    backendKey: 'lgbm',
    category: 'supervised',
    name: 'LightGBM',
    description: 'A faster, memory-efficient gradient boosting model built for large datasets.',
    badge: 'Fast + Accurate',
    badgeVariant: 'success',
    icon: 'bolt',
    goalTypes: ['regression', 'classification'],
    goodFor: ['Large datasets (100k+ rows)', 'Categorical features', 'Speed-constrained environments'],
    pros: ['Fastest gradient boosting algorithm', 'Lower memory footprint', 'Excellent categorical feature handling'],
    cons: ['Can overfit on small datasets', 'Less intuitive than Random Forest'],
    dataRequirements: '1000+ rows to leverage speed advantage. Works with less but LightGBM really shines at scale.',
    speed: 'fast',
    difficulty: 'intermediate',
    comparisonNote: 'Fastest boosting method — great for large data',
  },
  catboost: {
    id: 'catboost',
    backendKey: 'catboost',
    category: 'supervised',
    name: 'CatBoost',
    description: 'Gradient boosting designed to handle categorical features natively, without manual encoding.',
    badge: 'Smart Encoding',
    badgeVariant: 'info',
    icon: 'bolt',
    goalTypes: ['regression', 'classification'],
    goodFor: ['Datasets with many categorical columns', 'Minimal preprocessing', 'Robust predictions'],
    pros: ['Handles categories without one-hot encoding', 'Competitive accuracy with fewer hyperparameters', 'Less prone to overfitting than XGBoost'],
    cons: ['Slower training than LightGBM', 'Larger model size on disk'],
    dataRequirements: '300+ rows. Especially valuable when you have many categorical columns.',
    speed: 'medium',
    difficulty: 'intermediate',
    comparisonNote: 'Best when you have many categorical columns',
  },
  mlp: {
    id: 'mlp',
    backendKey: 'nn',
    category: 'supervised',
    name: 'Neural Network (MLP)',
    description: 'A multi-layer network of artificial neurons that learns complex, non-linear patterns.',
    badge: 'Advanced',
    badgeVariant: 'error',
    icon: 'brain',
    goalTypes: ['regression', 'classification'],
    goodFor: ['Complex non-linear patterns', 'Large datasets', 'When ensembles plateau'],
    pros: ['Can learn very complex relationships', 'Flexible architecture', 'Often competitive with gradient boosting'],
    cons: ['Needs more data to train well', 'Hardest to interpret', 'Sensitive to scaling and hyperparameters'],
    dataRequirements: '1000+ rows minimum. Needs feature scaling (StandardScaler recommended).',
    speed: 'slow',
    difficulty: 'advanced',
    comparisonNote: 'Most flexible but needs most data and tuning',
  },

  /* ── UNSUPERVISED ────────────────────────────────────── */

  kmeans: {
    id: 'kmeans',
    backendKey: 'kmeans',
    category: 'unsupervised',
    name: 'K-Means Clustering',
    description: 'Groups data points into K clusters by minimising within-cluster distances.',
    badge: 'Fast',
    badgeVariant: 'success',
    icon: 'circles-relation',
    goalTypes: ['clustering'],
    goodFor: ['Customer segmentation', 'Document grouping', 'Data exploration'],
    pros: ['Fast and scalable', 'Easy to interpret cluster centers', 'Works well with spherical clusters'],
    cons: ['Must choose K (number of clusters) in advance', 'Sensitive to outliers', 'Assumes clusters are roughly equal in size'],
    dataRequirements: '100+ rows. Needs numeric features (categorical must be encoded first).',
    speed: 'fast',
    difficulty: 'beginner',
    comparisonNote: 'Classic, fast clustering — best for compact groups',
  },
  dbscan: {
    id: 'dbscan',
    backendKey: 'dbscan',
    category: 'unsupervised',
    name: 'DBSCAN',
    description: 'Finds clusters of any shape and automatically flags outliers as noise.',
    badge: 'Shape-Flexible',
    badgeVariant: 'info',
    icon: 'circles-relation',
    goalTypes: ['clustering', 'anomaly'],
    goodFor: ['Irregularly shaped clusters', 'Outlier detection during clustering', 'Spatial/geographic data'],
    pros: ['No need to specify number of clusters', 'Robust to outliers', 'Finds non-spherical clusters'],
    cons: ['Two parameters to tune (ε, min_samples)', 'Struggles with varying cluster densities', 'Slow on very large datasets'],
    dataRequirements: '200+ rows. Works best with low-dimensional numeric data.',
    speed: 'medium',
    difficulty: 'intermediate',
    comparisonNote: 'Better than K-Means for irregular shapes and outliers',
  },
  pca: {
    id: 'pca',
    backendKey: 'pca',
    category: 'unsupervised',
    name: 'PCA (Dimensionality Reduction)',
    description: 'Compresses many features into a smaller set of principal components, preserving the most information.',
    badge: 'Compression',
    badgeVariant: 'info',
    icon: 'arrows-minimize',
    goalTypes: ['clustering'],
    goodFor: ['Reducing features before clustering', 'Visualising high-dimensional data', 'Removing noise'],
    pros: ['Significantly reduces computation', 'Eliminates redundant correlated features', 'Enables 2D/3D visualisation'],
    cons: ['Components are hard to interpret', 'Some information is always lost', 'Linear transformation only'],
    dataRequirements: '100+ rows. Most useful when you have 10+ highly correlated numeric features.',
    speed: 'fast',
    difficulty: 'intermediate',
    comparisonNote: 'Preprocessing tool, not a standalone model — use before clustering',
  },
  isolation_forest: {
    id: 'isolation_forest',
    backendKey: 'isoforest',
    category: 'unsupervised',
    name: 'Isolation Forest',
    description: 'Detects anomalies by isolating unusual data points that are easy to separate from the rest.',
    badge: 'Anomaly Detection',
    badgeVariant: 'error',
    icon: 'alert-triangle',
    goalTypes: ['anomaly'],
    goodFor: ['Fraud detection', 'Equipment fault detection', 'Quality control'],
    pros: ['Works without labelled anomaly examples', 'Scales well to large datasets', 'Robust to irrelevant features'],
    cons: ['Cannot explain why a point is anomalous', 'Contamination parameter needs tuning'],
    dataRequirements: '500+ rows. Anomalies should be rare (<5% of data).',
    speed: 'medium',
    difficulty: 'intermediate',
    comparisonNote: 'Best default for anomaly detection without labels',
  },
  autoencoder: {
    id: 'autoencoder',
    backendKey: 'autoencoder',
    category: 'unsupervised',
    name: 'Autoencoder',
    description: 'A neural network that learns a compressed representation — anything hard to reconstruct is anomalous.',
    badge: 'Advanced',
    badgeVariant: 'error',
    icon: 'brain',
    goalTypes: ['anomaly', 'clustering'],
    goodFor: ['Complex anomaly patterns', 'High-dimensional data', 'Image/time-series anomalies'],
    pros: ['Captures non-linear anomaly patterns', 'Can handle very high-dimensional data', 'Flexible architecture'],
    cons: ['Needs more data and tuning', 'Reconstruction threshold requires calibration'],
    dataRequirements: '2000+ rows for reliable training.',
    speed: 'slow',
    difficulty: 'advanced',
    comparisonNote: 'More powerful than Isolation Forest but needs more data',
  },

  /* ── TIME SERIES ─────────────────────────────────────── */

  arima: {
    id: 'arima',
    backendKey: 'arima',
    category: 'timeseries',
    name: 'ARIMA',
    description: 'A classical statistical model for forecasting based on past values and past forecast errors.',
    badge: 'Statistical',
    badgeVariant: 'warning',
    icon: 'timeline',
    goalTypes: ['forecasting'],
    goodFor: ['Stationary or differenced time series', 'Short-horizon forecasts', 'Small datasets'],
    pros: ['Well-understood, interpretable', 'Works with small time series (50+ points)', 'Confidence intervals built in'],
    cons: ['Requires stationary data (preprocessing needed)', 'Struggles with seasonality without extension (SARIMA)'],
    dataRequirements: '50+ time steps. Works best with regular, evenly spaced observations.',
    speed: 'fast',
    difficulty: 'intermediate',
    comparisonNote: 'Classical baseline — good for simple stationary series',
  },
  prophet: {
    id: 'prophet',
    backendKey: 'prophet',
    category: 'timeseries',
    name: 'Prophet',
    description: 'Facebook\'s forecasting model that handles seasonality, holidays, and trend changes automatically.',
    badge: 'Auto-Season',
    badgeVariant: 'info',
    icon: 'calendar-stats',
    goalTypes: ['forecasting'],
    goodFor: ['Business metrics with weekly/yearly seasonality', 'Data with holidays or special events', 'Non-expert forecasting'],
    pros: ['Handles multiple seasonalities automatically', 'Robust to outliers and missing data', 'No stationarity requirement'],
    cons: ['Less accurate than ML on complex patterns', 'Not designed for irregular time steps'],
    dataRequirements: '365+ days of daily data ideal. Minimum ~30 observations.',
    speed: 'medium',
    difficulty: 'beginner',
    comparisonNote: 'Best for business time series with clear seasonality',
  },
  xgboost_ts: {
    id: 'xgboost_ts',
    backendKey: 'xgboost_ts',
    category: 'timeseries',
    name: 'XGBoost (Forecasting)',
    description: 'Uses lagged features and rolling statistics as inputs to XGBoost for time series forecasting.',
    badge: 'ML-Powered',
    badgeVariant: 'success',
    icon: 'bolt',
    goalTypes: ['forecasting'],
    goodFor: ['Multivariate forecasting', 'When you have external regressors', 'Medium to large series'],
    pros: ['Captures complex non-linear patterns', 'Can incorporate external covariates easily', 'Parallelised training'],
    cons: ['Feature engineering (lags, rollings) requires care', 'No built-in confidence intervals'],
    dataRequirements: '500+ time steps to create meaningful lag features.',
    speed: 'fast',
    difficulty: 'intermediate',
    comparisonNote: 'Most accurate for multivariate forecasting',
  },
  lstm: {
    id: 'lstm',
    backendKey: 'lstm',
    category: 'timeseries',
    name: 'LSTM',
    description: 'A recurrent neural network with memory cells that learn long-term temporal dependencies.',
    badge: 'Deep Learning',
    badgeVariant: 'error',
    icon: 'brain',
    goalTypes: ['forecasting'],
    goodFor: ['Long-range dependencies', 'Complex multi-step forecasting', 'Large time series datasets'],
    pros: ['Captures very long-range temporal patterns', 'Handles irregular patterns well', 'State-of-the-art on many benchmarks'],
    cons: ['Needs large datasets (1000+ steps)', 'Slow to train', 'Hard to interpret'],
    dataRequirements: '2000+ time steps for reliable learning. GPU recommended.',
    speed: 'slow',
    difficulty: 'advanced',
    comparisonNote: 'Most powerful but needs a lot of data and training time',
  },

  /* ── SIMULATION ──────────────────────────────────────── */

  monte_carlo: {
    id: 'monte_carlo',
    backendKey: 'monte_carlo',
    category: 'simulation',
    name: 'Monte Carlo Simulation',
    description: 'Runs thousands of scenarios to quantify uncertainty and build a distribution of possible outcomes.',
    badge: 'Simulation',
    badgeVariant: 'info',
    icon: 'dice-3',
    goalTypes: ['simulation'],
    goodFor: ['Risk analysis', 'Financial projections', 'Uncertainty quantification', 'Sensitivity analysis'],
    pros: ['No training data needed', 'Provides full distribution of outcomes', 'Highly interpretable'],
    cons: ['Requires defining input distributions', 'Computationally intensive for complex models'],
    dataRequirements: 'Define input distributions from domain knowledge or historical data. No labelled training set required.',
    speed: 'medium',
    difficulty: 'intermediate',
    comparisonNote: 'Best for risk quantification and scenario planning',
  },
  bayesian_opt: {
    id: 'bayesian_opt',
    backendKey: 'bayesian_opt',
    category: 'simulation',
    name: 'Bayesian Optimization',
    description: 'Intelligently searches for optimal parameter settings, balancing exploration and exploitation.',
    badge: 'Optimization',
    badgeVariant: 'info',
    icon: 'target-arrow',
    goalTypes: ['simulation'],
    goodFor: ['Hyperparameter tuning', 'Expensive function optimization', 'Experimental design'],
    pros: ['Finds good solutions with few evaluations', 'Provides uncertainty estimates', 'More efficient than grid/random search'],
    cons: ['Overhead for simple problems', 'Acquisition function choice matters'],
    dataRequirements: 'Define an objective function. No dataset required — works by evaluating parameter combinations.',
    speed: 'medium',
    difficulty: 'advanced',
    comparisonNote: 'Best for optimising hyperparameters or costly experiments',
  },
};

/** Flat array of all models (useful for search/filter) */
export const ALL_MODELS = Object.values(MODELS);

/** Models grouped by category */
export const MODELS_BY_CATEGORY = Object.entries(CATEGORIES).reduce((acc, [catId, cat]) => {
  acc[catId] = { ...cat, models: ALL_MODELS.filter(m => m.category === catId) };
  return acc;
}, {});

/**
 * Given a goal type ID and dataset metadata, returns
 * the top recommendation + up to 3 alternatives.
 */
export function getRecommendations(goalId, datasetMeta) {
  const rows = datasetMeta?.rows ?? 0;
  const numericCols = datasetMeta?.numeric_cols ?? 0;

  const map = {
    regression: {
      primary: rows < 500 ? 'random_forest' : 'xgboost',
      why: rows < 500
        ? 'Random Forest is the best all-rounder for datasets under 500 rows — strong accuracy with no configuration needed.'
        : 'XGBoost typically delivers the highest accuracy on tabular data at this scale.',
      alternatives: ['linear_regression', 'random_forest', 'lightgbm', 'mlp'],
    },
    classification: {
      primary: 'random_forest',
      why: 'Random Forest handles classification out-of-the-box with excellent accuracy and built-in feature importance — the safest starting point.',
      alternatives: ['xgboost', 'lightgbm', 'mlp'],
    },
    clustering: {
      primary: 'kmeans',
      why: 'K-Means is the fastest and most interpretable clustering algorithm — great for getting initial segments quickly.',
      alternatives: ['dbscan', 'pca'],
    },
    anomaly: {
      primary: 'isolation_forest',
      why: 'Isolation Forest works without any labelled anomalies and scales well — the best default for anomaly detection.',
      alternatives: ['dbscan', 'autoencoder'],
    },
    forecasting: {
      primary: 'prophet',
      why: 'Prophet handles seasonality and trend changes automatically with minimal configuration — ideal for business time series.',
      alternatives: ['arima', 'xgboost_ts', 'lstm'],
    },
    simulation: {
      primary: 'monte_carlo',
      why: 'Monte Carlo simulation quantifies uncertainty across thousands of scenarios — the standard tool for risk analysis.',
      alternatives: ['bayesian_opt'],
    },
  };

  const rec = map[goalId] || map['regression'];
  const primary = MODELS[rec.primary];
  const alternatives = rec.alternatives
    .filter(id => id !== rec.primary)
    .slice(0, 3)
    .map(id => MODELS[id])
    .filter(Boolean);

  return { primary, why: rec.why, alternatives };
}

/** Map from backend model key → model id */
export const BACKEND_KEY_TO_ID = Object.values(MODELS).reduce((acc, m) => {
  acc[m.backendKey] = m.id;
  return acc;
}, {});

export const SPEED_BADGE_STYLES = {
  fast:   { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', border: 'rgba(16,185,129,0.25)'  },
  medium: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)'  },
  slow:   { bg: 'rgba(244,63,94,0.12)',   text: '#f43f5e', border: 'rgba(244,63,94,0.25)'   },
};

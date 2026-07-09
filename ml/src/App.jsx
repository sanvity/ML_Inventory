import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Brain,
  Upload,
  Database,
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowLeft,
  ArrowRight,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  HelpCircle,
  Download,
  Layers,
  Settings,
  Sliders,
  CheckSquare,
  Square,
  Flame,
  LineChart as LineChartIcon,
  RefreshCw,
  FolderOpen,
  Award,
  History,
  Trash2,
  TrendingUp,
  BarChart2,
  Calendar,
  ShieldAlert,
  SplitSquareVertical,
  Menu,
  Zap,
  BookOpen,
  Library,
  Plus,
  Save
} from 'lucide-react';
import { CATEGORIES, MODELS, MODELS_BY_CATEGORY, getRecommendations } from './data/modelRegistry';

// ==========================================
// 1. MODEL CATALOG & REGISTRY
// ==========================================
const MODEL_REGISTRY = {
  classification: [
    {
      id: 'rf_class',
      name: 'Random Forest Classifier',
      desc: 'Ensemble of parallel decision trees resolving non-linear partitions.',
      summary: 'Random Forest is a bagging ensemble that creates multiple decision trees over random feature subsets and averages their votes to select the final class.',
      assumptions: 'No parametric assumptions. Robust to multicollinearity and non-linearities.',
      use: 'Standard tabular data, mixed numeric/categorical features, multi-class target problems.',
      avoid: 'High-dimensional text embeddings or real-time latency-critical applications.',
      usecases: ['Customer churn prediction', 'Credit risk assessment'],
      pros: ['Robust to outliers', 'Inherent feature importance calculation', 'Low risk of overfitting'],
      cons: ['Slow prediction on huge tree counts', 'Complex models can be memory intensive'],
      hyperparameters: { n_estimators: 100, max_depth: 10, min_samples_split: 2 }
    },
    {
      id: 'xgb_class',
      name: 'Gradient Boosting (XGBoost)',
      desc: 'Sequential tree ensemble optimized for raw classification accuracy.',
      summary: 'XGBoost iteratively fits new decision trees to minimize residual classification errors of prior models, using regularized gradient steps.',
      assumptions: 'Sensitive to outliers and label noise; requires proper tuning of regularizers.',
      use: 'Competitive datasets, high accuracy goals, datasets with complex conditional logic.',
      avoid: 'Extremely noisy labels or small sample sizes (< 500 rows) where tree boosting overfits.',
      usecases: ['E-commerce CTR optimization', 'System intrusion detection'],
      pros: ['Industry-leading accuracy', 'Handles missing values natively', 'Built-in L1/L2 regularization'],
      cons: ['Computationally heavy', 'Many hyperparameters require tuning'],
      hyperparameters: { n_estimators: 100, learning_rate: 0.1, max_depth: 6 }
    },
    {
      id: 'lr_class',
      name: 'Logistic Regression',
      desc: 'Linear model estimating class probabilities using sigmoid boundaries.',
      summary: 'Logistic Regression fits a linear boundary to separate classes, wrapping outputs with a sigmoid function to return calibrated probabilities.',
      assumptions: 'Linear relationship between logits and features, no severe multicollinearity.',
      use: 'Rapid baseline classification, interpretable risk modeling, outputting raw probabilities.',
      avoid: 'Complex tabular patterns where interactions between features dominate.',
      usecases: ['Marketing campaign conversion', 'Medical diagnostics screening'],
      pros: ['Very fast training', 'Highly interpretable weights', 'Easy to scale online'],
      cons: ['Cannot model non-linear interactions without manual feature mapping'],
      hyperparameters: { C: 1.0, max_iter: 100, penalty: 'l2' }
    },
    {
      id: 'svm_class',
      name: 'Support Vector Machine (SVM)',
      desc: 'Finds optimal boundary margins between classes in high dimensions.',
      summary: 'SVM projects data into higher dimensions to find a hyperplane that maximizes the margin (distance) between different classes.',
      assumptions: 'Features must be scaled to avoid clustering bias. High execution cost.',
      use: 'High-dimensional sparse data, image classification baselines, text categorization.',
      avoid: 'Large datasets (exceeding 20,000 rows) due to computational complexity (O(N³)).',
      usecases: ['Spam filtering', 'Gene expression profiling'],
      pros: ['Effective in high dimensions', 'Memory efficient', 'Robust against overfitting in high dimensions'],
      cons: ['Slow training on large rows', 'Does not provide direct probabilities'],
      hyperparameters: { C: 1.0, kernel: 'rbf', gamma: 'scale' }
    }
  ],
  regression: [
    {
      id: 'linear_reg',
      name: 'Linear Regression',
      desc: 'Fits an ordinary least squares line to numeric targets.',
      summary: 'Linear Regression estimates feature weights to minimize the sum of squared errors between predicted and actual numerical outputs.',
      assumptions: 'Linearity, homoscedasticity, independence, and normal distribution of residual errors.',
      use: 'Simple numerical baselines, estimation of stable price elasticities.',
      avoid: 'Complex non-linear relationships or multi-modal target structures.',
      usecases: ['Real estate evaluation baselines', 'General economic trend analysis'],
      pros: ['No parameter tuning needed', 'Extremely fast', 'Easily understood coefficients'],
      cons: ['Vulnerable to multicollinearity', 'Overly simplistic for modern complex data'],
      hyperparameters: { fit_intercept: true }
    },
    {
      id: 'lgbm_reg',
      name: 'Gradient Boosting (LightGBM)',
      desc: 'Leaf-wise tree growth framework offering rapid regression fitting.',
      summary: 'LightGBM grows trees leaf-wise rather than level-wise, accelerating training on high-dimensional tabular datasets.',
      assumptions: 'Sensitive to overfitting on small rows. Scale invariant but requires numeric features.',
      use: 'Large tabular datasets, high-speed regression pipelines, non-linear forecasting.',
      avoid: 'Small datasets (< 1000 rows) where leaf-wise split quickly overfits.',
      usecases: ['Rideshare pricing engines', 'Energy grid consumption forecasting'],
      pros: ['Extremely fast training speed', 'Low memory usage', 'High predictive capacity'],
      cons: ['Can easily overfit on small datasets'],
      hyperparameters: { n_estimators: 100, learning_rate: 0.1, num_leaves: 31 }
    },
    {
      id: 'ridge_reg',
      name: 'Ridge Regression (L2)',
      desc: 'Linear regression with L2 penalty to handle multicollinearity.',
      summary: 'Ridge adds a penalty proportional to the square of the magnitude of coefficients, shrinking weights to stabilize collinear models.',
      assumptions: 'Linearity. Highly sensitive to feature scales (requires normalization).',
      use: 'Tabular datasets with heavily correlated numeric columns.',
      avoid: 'Sparse datasets where selection of a few key columns is preferred (use Lasso instead).',
      usecases: ['Financial demand forecasting', 'Atmospheric temperature projections'],
      pros: ['Prevents overfitting on collinear features', 'Guarantees a stable mathematical solution'],
      cons: ['Does not perform feature elimination (keeps all columns)'],
      hyperparameters: { alpha: 1.0, solver: 'auto' }
    },
    {
      id: 'rf_reg',
      name: 'Random Forest Regressor',
      desc: 'Averaged ensemble of bagging trees predicting continuous ranges.',
      summary: 'Random Forest Regressor builds multiple decision trees on bootstrap samples and averages their numerical predictions to decrease variance.',
      assumptions: 'None. Insensitive to outliers and handles monotonic patterns natively.',
      use: 'Complex tabular regression without manual scaling or monotonic transformations.',
      avoid: 'Extrapolation outside training bounds (cannot predict values higher than training max).',
      usecases: ['Equipment remaining useful life (RUL)', 'Hospital wait-time estimation'],
      pros: ['No scaling required', 'Insensitive to multicollinearity', 'Highly robust'],
      cons: ['Large model file sizes', 'Cannot extrapolate future trends (slopes)']
    }
  ],
  clustering: [
    {
      id: 'kmeans_clust',
      name: 'K-Means Clustering',
      desc: 'Partitions data into spherical clusters based on spatial centroids.',
      summary: 'K-Means partitions observations into K clusters by iteratively updating centroids to minimize the within-cluster sum of squared distances.',
      assumptions: 'Clusters are spherical, similar in size, and features are normalized.',
      use: 'General exploratory demographic grouping, customer segmentation baselines.',
      avoid: 'Varying cluster densities, non-spherical shapes, categorical-heavy inputs.',
      usecases: ['Target demographic grouping', 'Image color quantization'],
      pros: ['Simple to understand', 'Fast execution', 'Scales to millions of rows'],
      cons: ['Requires choosing K manually', 'Vulnerable to outliers dragging centroids'],
      hyperparameters: { n_clusters: 5, max_iter: 300, init: 'k-means++' }
    },
    {
      id: 'dbscan_clust',
      name: 'DBSCAN',
      desc: 'Density-based clustering finding arbitrary shapes and filtering outliers.',
      summary: 'DBSCAN clusters data based on spatial point density, marking points in low-density regions as noise outliers.',
      assumptions: 'Density thresholds (Eps, MinSamples) are homogeneous across clusters.',
      use: 'Identifying spatial clusters, grouping arbitrary shapes, outlier/anomaly rejection.',
      avoid: 'Highly variable densities or high-dimensional sparse spaces.',
      usecases: ['GPS coordinate clustering', 'Tabular anomaly identification'],
      pros: ['No need to select cluster count', 'Discovers arbitrary shapes', 'Robust to noise'],
      cons: ['Struggles with variable density', 'Highly sensitive to distance metric scales'],
      hyperparameters: { eps: 0.5, min_samples: 5 }
    }
  ],
  forecasting: [
    {
      id: 'prophet_time',
      name: 'Prophet Forecasting',
      desc: 'Additive model capturing trends, seasonal cycles, and holidays.',
      summary: 'Prophet fits time-series trends using piece-wise linear/logistic curves, combined with Fourier series seasonalities.',
      assumptions: 'Requires a datetime index. Best with strong periodic seasonal factors.',
      use: 'Business metrics, daily/weekly metrics with years of history, holiday planning.',
      avoid: 'High-frequency non-seasonal volatility or chaotic asset trading.',
      usecases: ['Retail sales projections', 'Cloud server load forecasting'],
      pros: ['Robust to missing timestamps', 'Handles outliers well', 'Intuitive parameters'],
      cons: ['Can overfit on short histories', 'Slow fitting on long high-frequency series'],
      hyperparameters: { growth: 'linear', changepoint_prior_scale: 0.05 }
    },
    {
      id: 'arima_time',
      name: 'ARIMA Model',
      desc: 'Statistical lag-based autoregression for univariate sequences.',
      summary: 'ARIMA models future time steps by combining autoregressive lags (AR) and moving average error feedback (MA) on differenced indices (I).',
      assumptions: 'Series must be stationary (or stabilized via differencing). No covariate inputs.',
      use: 'Short-term forecasts of highly stable, auto-correlated univariate indices.',
      avoid: 'Highly non-linear multivariate time series with causal exogenous factors.',
      usecases: ['Inflation index estimation', 'Quarterly demand index tracking'],
      pros: ['Strong mathematical foundation', 'Excellent for near-term steps'],
      cons: ['Parameters (p, d, q) are difficult to tune', 'Struggles with complex seasonal intervals'],
      hyperparameters: { p: 1, d: 1, q: 1 }
    },
    {
      id: 'lstm_time',
      name: 'LSTM Recurrent Network',
      desc: 'Recurrent deep learning cell capturing long sequences.',
      summary: 'LSTM is a recurrent neural network designed to carry sequencing states across long lag intervals, bypassing gradient clipping.',
      assumptions: 'Requires large sequence histories and feature scaling. Heavy resource cost.',
      use: 'Complex multi-variate sequences, non-linear lag-dependent projections.',
      avoid: 'Small datasets (< 1000 rows) or simple trends where linear lags suffice.',
      usecases: ['Sub-daily sensor forecasting', 'Complex power grid demand predictions'],
      pros: ['Captures highly complex non-linear sequence dependencies', 'Handles multivariate lags'],
      cons: ['Prone to overfitting on small data', 'Slow training time', 'Black box model'],
      hyperparameters: { epochs: 50, batch_size: 32, learning_rate: 0.001 }
    }
  ]
};

const BAR_COLORS_LIGHT = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const BAR_COLORS_DARK = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];

// ==========================================
// 2. BUILT-IN SAMPLE DATASETS
// ==========================================
const SAMPLE_DATASETS = {
  housing: {
    id: 'housing',
    name: 'Housing Prices (Seattle)',
    task: 'regression',
    rows: 1240,
    columns: 9,
    columnsInfo: [
      { name: 'price', type: 'numeric', nullPercent: 0, uniqueCount: 942, missing: 0, samples: [450000, 625000, 310000, 890000, 520000] },
      { name: 'bedrooms', type: 'numeric', nullPercent: 0, uniqueCount: 6, missing: 0, samples: [3, 4, 2, 5, 3] },
      { name: 'bathrooms', type: 'numeric', nullPercent: 0, uniqueCount: 8, missing: 0, samples: [2.0, 2.5, 1.0, 3.5, 2.0] },
      { name: 'sqft_living', type: 'numeric', nullPercent: 0, uniqueCount: 620, missing: 0, samples: [1840, 2500, 960, 3800, 1600] },
      { name: 'sqft_lot', type: 'numeric', nullPercent: 1.2, uniqueCount: 812, missing: 15, samples: [5000, 7200, 3100, 12500, null] },
      { name: 'floors', type: 'numeric', nullPercent: 0, uniqueCount: 4, missing: 0, samples: [1, 2, 1, 2, 1] },
      { name: 'waterfront', type: 'categorical', nullPercent: 0, uniqueCount: 2, missing: 0, samples: ['No', 'No', 'No', 'Yes', 'No'] },
      { name: 'yr_built', type: 'numeric', nullPercent: 0.4, uniqueCount: 110, missing: 5, samples: [1982, 1996, 1948, 2010, null] },
      { name: 'zipcode', type: 'categorical', nullPercent: 0, uniqueCount: 78, missing: 0, samples: ['98103', '98115', '98106', '98112', '98107'] }
    ],
    defaultTarget: 'price',
    correlations: {
      price: 1.0,
      sqft_living: 0.74,
      bathrooms: 0.52,
      bedrooms: 0.32,
      floors: 0.26,
      waterfront: 0.28,
      sqft_lot: 0.08,
      yr_built: 0.05,
      zipcode: -0.04
    },
    sampleRows: [
      { price: 540000, bedrooms: 3, bathrooms: 2, sqft_living: 1800, sqft_lot: 5000, floors: 1, waterfront: 'No', yr_built: 1985, zipcode: '98103' },
      { price: 820000, bedrooms: 4, bathrooms: 2.5, sqft_living: 2540, sqft_lot: 7200, floors: 2, waterfront: 'No', yr_built: 1998, zipcode: '98112' },
      { price: 1250000, bedrooms: 4, bathrooms: 3.5, sqft_living: 3900, sqft_lot: 12000, floors: 2, waterfront: 'Yes', yr_built: 2012, zipcode: '98119' },
      { price: 420000, bedrooms: 2, bathrooms: 1, sqft_living: 960, sqft_lot: 4200, floors: 1, waterfront: 'No', yr_built: 1947, zipcode: '98106' },
      { price: 650000, bedrooms: 3, bathrooms: 2, sqft_living: 1650, sqft_lot: null, floors: 1.5, waterfront: 'No', yr_built: 1978, zipcode: '98115' },
      { price: 950000, bedrooms: 5, bathrooms: 3, sqft_living: 3100, sqft_lot: 8500, floors: 2, waterfront: 'No', yr_built: 2005, zipcode: '98105' },
      { price: 310000, bedrooms: 1, bathrooms: 1, sqft_living: 650, sqft_lot: 1500, floors: 1, waterfront: 'No', yr_built: 1925, zipcode: '98102' },
      { price: 730000, bedrooms: 3, bathrooms: 2.5, sqft_living: 2100, sqft_lot: 6000, floors: 2, waterfront: 'No', yr_built: null, zipcode: '98117' },
      { price: 1540000, bedrooms: 5, bathrooms: 4.5, sqft_living: 4800, sqft_lot: 15000, floors: 2.5, waterfront: 'Yes', yr_built: 2018, zipcode: '98112' },
      { price: 490000, bedrooms: 3, bathrooms: 1.75, sqft_living: 1420, sqft_lot: 5200, floors: 1, waterfront: 'No', yr_built: 1965, zipcode: '98133' },
      { price: 580000, bedrooms: 3, bathrooms: 2, sqft_living: 1720, sqft_lot: 4800, floors: 1, waterfront: 'No', yr_built: 1980, zipcode: '98125' },
      { price: 690000, bedrooms: 4, bathrooms: 2.5, sqft_living: 2200, sqft_lot: 6800, floors: 2, waterfront: 'No', yr_built: 1991, zipcode: '98117' },
      { price: 1100000, bedrooms: 4, bathrooms: 3.25, sqft_living: 3400, sqft_lot: 9500, floors: 2, waterfront: 'No', yr_built: 2008, zipcode: '98119' },
      { price: 380000, bedrooms: 2, bathrooms: 1, sqft_living: 880, sqft_lot: 3800, floors: 1, waterfront: 'No', yr_built: 1941, zipcode: '98106' },
      { price: 620000, bedrooms: 3, bathrooms: 2, sqft_living: 1580, sqft_lot: 5400, floors: 1.5, waterfront: 'No', yr_built: 1974, zipcode: '98115' },
      { price: 880000, bedrooms: 4, bathrooms: 2.75, sqft_living: 2800, sqft_lot: 8000, floors: 2, waterfront: 'No', yr_built: 2002, zipcode: '98105' },
      { price: 290000, bedrooms: 1, bathrooms: 1, sqft_living: 600, sqft_lot: 1200, floors: 1, waterfront: 'No', yr_built: 1920, zipcode: '98102' },
      { price: 710000, bedrooms: 3, bathrooms: 2.25, sqft_living: 1980, sqft_lot: 5800, floors: 2, waterfront: 'No', yr_built: 1989, zipcode: '98117' },
      { price: 1680000, bedrooms: 6, bathrooms: 5.0, sqft_living: 5200, sqft_lot: 18000, floors: 3, waterfront: 'Yes', yr_built: 2021, zipcode: '98112' },
      { price: 460000, bedrooms: 3, bathrooms: 1.5, sqft_living: 1300, sqft_lot: 4900, floors: 1, waterfront: 'No', yr_built: 1958, zipcode: '98133' }
    ]
  },
  churn: {
    id: 'churn',
    name: 'Customer Churn (Telecom)',
    task: 'classification',
    rows: 3500,
    columns: 9,
    columnsInfo: [
      { name: 'churn', type: 'numeric', nullPercent: 0, uniqueCount: 2, missing: 0, samples: [0, 1, 0, 0, 1] },
      { name: 'tenure', type: 'numeric', nullPercent: 0, uniqueCount: 72, missing: 0, samples: [12, 3, 48, 60, 1] },
      { name: 'monthly_charges', type: 'numeric', nullPercent: 0, uniqueCount: 420, missing: 0, samples: [65.4, 89.9, 24.5, 110.2, 75.1] },
      { name: 'total_charges', type: 'numeric', nullPercent: 0.5, uniqueCount: 3110, missing: 18, samples: [784.8, 269.7, 1176.0, 6612.0, null] },
      { name: 'contract_type', type: 'categorical', nullPercent: 0, uniqueCount: 3, missing: 0, samples: ['Month-to-month', 'Month-to-month', 'One year', 'Two year', 'Month-to-month'] },
      { name: 'support_calls', type: 'numeric', nullPercent: 0, uniqueCount: 8, missing: 0, samples: [2, 5, 0, 1, 6] },
      { name: 'age', type: 'numeric', nullPercent: 0, uniqueCount: 65, missing: 0, samples: [34, 58, 22, 45, 67] },
      { name: 'gender', type: 'categorical', nullPercent: 0, uniqueCount: 2, missing: 0, samples: ['Female', 'Male', 'Male', 'Female', 'Female'] },
      { name: 'payment_method', type: 'categorical', nullPercent: 0, uniqueCount: 4, missing: 0, samples: ['Electronic check', 'Mailed check', 'Bank transfer', 'Credit card', 'Electronic check'] }
    ],
    defaultTarget: 'churn',
    correlations: {
      churn: 1.0,
      support_calls: 0.58,
      monthly_charges: 0.32,
      age: 0.18,
      total_charges: -0.22,
      tenure: -0.48,
      contract_type: -0.42,
      gender: 0.01,
      payment_method: -0.06
    },
    sampleRows: [
      { churn: 0, tenure: 12, monthly_charges: 65.4, total_charges: 784.8, contract_type: 'Month-to-month', support_calls: 2, age: 34, gender: 'Female', payment_method: 'Electronic check' },
      { churn: 1, tenure: 3, monthly_charges: 89.9, total_charges: 269.7, contract_type: 'Month-to-month', support_calls: 5, age: 58, gender: 'Male', payment_method: 'Mailed check' },
      { churn: 0, tenure: 48, monthly_charges: 24.5, total_charges: 1176.0, contract_type: 'One year', support_calls: 0, age: 22, gender: 'Male', payment_method: 'Bank transfer' },
      { churn: 0, tenure: 60, monthly_charges: 110.2, total_charges: 6612.0, contract_type: 'Two year', support_calls: 1, age: 45, gender: 'Female', payment_method: 'Credit card' },
      { churn: 1, tenure: 1, monthly_charges: 75.1, total_charges: null, contract_type: 'Month-to-month', support_calls: 6, age: 67, gender: 'Female', payment_method: 'Electronic check' },
      { churn: 0, tenure: 24, monthly_charges: 45.0, total_charges: 1080.0, contract_type: 'One year', support_calls: 2, age: 29, gender: 'Male', payment_method: 'Credit card' },
      { churn: 0, tenure: 36, monthly_charges: 95.8, total_charges: 3448.8, contract_type: 'Two year', support_calls: 1, age: 51, gender: 'Female', payment_method: 'Bank transfer' },
      { churn: 1, tenure: 5, monthly_charges: 80.4, total_charges: 402.0, contract_type: 'Month-to-month', support_calls: 4, age: 41, gender: 'Male', payment_method: 'Electronic check' },
      { churn: 0, tenure: 15, monthly_charges: 50.2, total_charges: 753.0, contract_type: 'Month-to-month', support_calls: 2, age: 31, gender: 'Female', payment_method: 'Mailed check' },
      { churn: 0, tenure: 72, monthly_charges: 115.5, total_charges: 8316.0, contract_type: 'Two year', support_calls: 0, age: 62, gender: 'Male', payment_method: 'Credit card' },
      { churn: 1, tenure: 2, monthly_charges: 70.1, total_charges: 140.2, contract_type: 'Month-to-month', support_calls: 4, age: 25, gender: 'Female', payment_method: 'Electronic check' },
      { churn: 0, tenure: 55, monthly_charges: 85.3, total_charges: 4691.5, contract_type: 'One year', support_calls: 1, age: 39, gender: 'Male', payment_method: 'Bank transfer' },
      { churn: 0, tenure: 68, monthly_charges: 99.4, total_charges: 6759.2, contract_type: 'Two year', support_calls: 0, age: 48, gender: 'Female', payment_method: 'Credit card' },
      { churn: 1, tenure: 8, monthly_charges: 84.6, total_charges: 676.8, contract_type: 'Month-to-month', support_calls: 3, age: 56, gender: 'Female', payment_method: 'Electronic check' },
      { churn: 0, tenure: 41, monthly_charges: 55.8, total_charges: 2287.8, contract_type: 'One year', support_calls: 2, age: 35, gender: 'Male', payment_method: 'Mailed check' },
      { churn: 0, tenure: 64, monthly_charges: 104.2, total_charges: 6668.8, contract_type: 'Two year', support_calls: 1, age: 44, gender: 'Male', payment_method: 'Electronic check' },
      { churn: 1, tenure: 4, monthly_charges: 92.5, total_charges: 370.0, contract_type: 'Month-to-month', support_calls: 5, age: 60, gender: 'Female', payment_method: 'Electronic check' },
      { churn: 0, tenure: 30, monthly_charges: 60.1, total_charges: 1803.0, contract_type: 'Month-to-month', support_calls: 2, age: 33, gender: 'Male', payment_method: 'Bank transfer' },
      { churn: 0, tenure: 50, monthly_charges: 78.4, total_charges: 3920.0, contract_type: 'One year', support_calls: 1, age: 53, gender: 'Female', payment_method: 'Credit card' },
      { churn: 1, tenure: 10, monthly_charges: 88.2, total_charges: 882.0, contract_type: 'Month-to-month', support_calls: 4, age: 28, gender: 'Male', payment_method: 'Electronic check' }
    ]
  },
  sales: {
    id: 'sales',
    name: 'Retail Store Sales',
    task: 'forecasting',
    rows: 730,
    columns: 8,
    columnsInfo: [
      { name: 'date', type: 'datetime', nullPercent: 0, uniqueCount: 730, missing: 0, samples: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'] },
      { name: 'sales', type: 'numeric', nullPercent: 0, uniqueCount: 684, missing: 0, samples: [12000, 11400, 14200, 15800, 18200] },
      { name: 'promotions', type: 'numeric', nullPercent: 0, uniqueCount: 2, missing: 0, samples: [1, 0, 1, 1, 0] },
      { name: 'temperature', type: 'numeric', nullPercent: 0.8, uniqueCount: 45, missing: 6, samples: [45.2, 48.0, 42.1, null, 50.4] },
      { name: 'foot_traffic', type: 'numeric', nullPercent: 0, uniqueCount: 610, missing: 0, samples: [1240, 1080, 1390, 1510, 1790] },
      { name: 'inventory_level', type: 'numeric', nullPercent: 0, uniqueCount: 520, missing: 0, samples: [450, 442, 420, 390, 500] },
      { name: 'is_weekend', type: 'categorical', nullPercent: 0, uniqueCount: 2, missing: 0, samples: ['No', 'No', 'No', 'Yes', 'Yes'] },
      { name: 'store_location', type: 'categorical', nullPercent: 0, uniqueCount: 3, missing: 0, samples: ['Downtown', 'Downtown', 'Suburban', 'Downtown', 'Suburban'] }
    ],
    defaultTarget: 'sales',
    correlations: {
      sales: 1.0,
      foot_traffic: 0.81,
      promotions: 0.54,
      is_weekend: 0.38,
      inventory_level: 0.28,
      temperature: 0.14,
      store_location: 0.05,
      date: 0.02
    },
    sampleRows: [
      { date: '2024-01-01', sales: 12000, promotions: 1, temperature: 45.2, foot_traffic: 1240, inventory_level: 450, is_weekend: 'No', store_location: 'Downtown' },
      { date: '2024-01-02', sales: 11400, promotions: 0, temperature: 48.0, foot_traffic: 1080, inventory_level: 442, is_weekend: 'No', store_location: 'Downtown' },
      { date: '2024-01-03', sales: 14200, promotions: 1, temperature: 42.1, foot_traffic: 1390, inventory_level: 420, is_weekend: 'No', store_location: 'Suburban' },
      { date: '2024-01-04', sales: 15800, promotions: 1, temperature: null, foot_traffic: 1510, inventory_level: 390, is_weekend: 'Yes', store_location: 'Downtown' },
      { date: '2024-01-05', sales: 18200, promotions: 0, temperature: 50.4, foot_traffic: 1790, inventory_level: 500, is_weekend: 'Yes', store_location: 'Suburban' },
      { date: '2024-01-06', sales: 10500, promotions: 0, temperature: 38.2, foot_traffic: 980, inventory_level: 480, is_weekend: 'No', store_location: 'Suburban' },
      { date: '2024-01-07', sales: 11800, promotions: 0, temperature: 40.5, foot_traffic: 1120, inventory_level: 470, is_weekend: 'No', store_location: 'Downtown' },
      { date: '2024-01-08', sales: 13100, promotions: 1, temperature: 43.1, foot_traffic: 1280, inventory_level: 450, is_weekend: 'No', store_location: 'Downtown' },
      { date: '2024-01-09', sales: 14900, promotions: 1, temperature: 46.8, foot_traffic: 1420, inventory_level: 430, is_weekend: 'Yes', store_location: 'Suburban' },
      { date: '2024-01-10', sales: 17100, promotions: 0, temperature: 52.0, foot_traffic: 1680, inventory_level: 410, is_weekend: 'Yes', store_location: 'Downtown' }
    ]
  },
  segments: {
    id: 'segments',
    name: 'Customer E-commerce Segments',
    task: 'clustering',
    rows: 800,
    columns: 7,
    columnsInfo: [
      { name: 'annual_income', type: 'numeric', nullPercent: 0, uniqueCount: 78, missing: 0, samples: [45000, 68000, 112000, 24000, 85000] },
      { name: 'spending_score', type: 'numeric', nullPercent: 0, uniqueCount: 100, missing: 0, samples: [82, 34, 91, 15, 62] },
      { name: 'age', type: 'numeric', nullPercent: 0, uniqueCount: 58, missing: 0, samples: [28, 45, 31, 62, 38] },
      { name: 'purchase_frequency', type: 'numeric', nullPercent: 0, uniqueCount: 30, missing: 0, samples: [12.4, 4.2, 28.1, 1.8, 15.5] },
      { name: 'return_rate', type: 'numeric', nullPercent: 1.8, uniqueCount: 20, missing: 14, samples: [2.1, 5.4, 0.5, 12.0, null] },
      { name: 'gender', type: 'categorical', nullPercent: 0, uniqueCount: 2, missing: 0, samples: ['Female', 'Male', 'Female', 'Male', 'Female'] },
      { name: 'loyalty_member', type: 'categorical', nullPercent: 0, uniqueCount: 2, missing: 0, samples: ['Yes', 'No', 'Yes', 'No', 'Yes'] }
    ],
    defaultTarget: 'none',
    correlations: {
      annual_income: 1.0,
      spending_score: 0.65,
      purchase_frequency: 0.58,
      loyalty_member: 0.44,
      age: -0.22,
      return_rate: -0.15,
      gender: 0.02
    },
    sampleRows: [
      { annual_income: 45000, spending_score: 82, age: 28, purchase_frequency: 12.4, return_rate: 2.1, gender: 'Female', loyalty_member: 'Yes' },
      { annual_income: 68000, spending_score: 34, age: 45, purchase_frequency: 4.2, return_rate: 5.4, gender: 'Male', loyalty_member: 'No' },
      { annual_income: 112000, spending_score: 91, age: 31, purchase_frequency: 28.1, return_rate: 0.5, gender: 'Female', loyalty_member: 'Yes' },
      { annual_income: 24000, spending_score: 15, age: 62, purchase_frequency: 1.8, return_rate: 12.0, gender: 'Male', loyalty_member: 'No' },
      { annual_income: 85000, spending_score: 62, age: 38, purchase_frequency: 15.5, return_rate: null, gender: 'Female', loyalty_member: 'Yes' },
      { annual_income: 52000, spending_score: 74, age: 24, purchase_frequency: 9.8, return_rate: 1.5, gender: 'Female', loyalty_member: 'No' },
      { annual_income: 76000, spending_score: 42, age: 50, purchase_frequency: 6.5, return_rate: 4.1, gender: 'Male', loyalty_member: 'Yes' },
      { annual_income: 120000, spending_score: 85, age: 35, purchase_frequency: 24.0, return_rate: 0.8, gender: 'Female', loyalty_member: 'Yes' },
      { annual_income: 30000, spending_score: 20, age: 58, purchase_frequency: 2.2, return_rate: 9.5, gender: 'Male', loyalty_member: 'No' },
      { annual_income: 90000, spending_score: 58, age: 41, purchase_frequency: 14.2, return_rate: 2.8, gender: 'Female', loyalty_member: 'Yes' }
    ]
  }
};

// ==========================================
// 3. SELECTION HEURISTICS & PARSERS
// ==========================================
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return null;

  // Helper to split row handling commas inside quotes
  const splitCSVRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^["']|["']$/g, ''));
  };

  const headers = splitCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < Math.min(lines.length, 10000); i++) {
    const cols = splitCSVRow(lines[i]);
    if (cols.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        const val = cols[idx];
        row[h] = val === '' ? null : val;
      });
      rows.push(row);
    }
  }
  return { headers, rows, totalRows: lines.length - 1 };
};

const parseJSON = (text) => {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      const headers = Object.keys(data[0]);
      return { headers, rows: data.slice(0, 10000), totalRows: data.length };
    } else if (data.rows && Array.isArray(data.rows)) {
      const headers = Object.keys(data.rows[0]);
      return { headers, rows: data.rows.slice(0, 10000), totalRows: data.rows.length };
    }
  } catch (e) {
    console.error(e);
  }
  return null;
};

const calculatePearsonCorrelation = (rows, colName, targetName) => {
  if (!colName || !targetName || colName === targetName || targetName === 'none') return 0;

  const xValues = [];
  const yValues = [];

  for (let row of rows) {
    let x = parseFloat(row[colName]);
    let y = parseFloat(row[targetName]);

    if (isNaN(x)) {
      const val = String(row[colName] || '').toLowerCase().trim();
      if (['yes', 'true', '1', 'male', 'downtown', 'yes'].includes(val)) x = 1;
      else if (['no', 'false', '0', 'female', 'suburban', 'no'].includes(val)) x = 0;
      else continue;
    }

    if (isNaN(y)) {
      const val = String(row[targetName] || '').toLowerCase().trim();
      if (['yes', 'true', '1', 'churned', 'yes'].includes(val)) y = 1;
      else if (['no', 'false', '0', 'active', 'no'].includes(val)) y = 0;
      else continue;
    }

    xValues.push(x);
    yValues.push(y);
  }

  const n = xValues.length;
  if (n < 2) return 0;

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXSq = xValues.reduce((a, b) => a + b * b, 0);
  const sumYSq = yValues.reduce((a, b) => a + b * b, 0);
  const sumXY = xValues.reduce((a, b, idx) => a + b * yValues[idx], 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXSq - sumX * sumX) * (n * sumYSq - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
};

// ==========================================
// 3.5 ADDED HELPER FUNCTIONS FOR WORKFLOWS
// ==========================================
const nonEpochModels = [
  'linear_reg', 'ridge_reg', 'rf_reg', 'fit_intercept',
  'rf_class', 'lr_class', 'svm_class',
  'kmeans_clust', 'dbscan_clust',
  'arima_time', 'prophet_time'
];

const inferAggFunction = (colName, colType, dataset = null) => {
  const name = colName.toLowerCase();

  if (dataset) {
    const colMeta = dataset.columnsInfo.find(c => c.name === colName);
    if (colMeta) {
      const uniqueRatio = colMeta.uniqueCount / dataset.rows;
      const isIdField = (uniqueRatio > 0.95 && dataset.rows > 15) ||
        name.includes('id') || name === 'key';

      // Auto aggregate based on categories identified
      if (isIdField && colType !== 'datetime') {
        return 'mode'; // ID Features
      } else if (colType === 'datetime' ||
        name.includes('date') || name.includes('time') ||
        name.includes('timestamp') || name.includes('year') ||
        name.includes('month') || name.includes('day')) {
        return 'mode'; // Date/Time Features
      } else if (colType === 'categorical') {
        return 'mode'; // Categorical Features
      }
    }
  }

  // Influencing Features (Numeric) or fallback
  const maxKeywords = ['flag', 'bool', 'stockout', 'binary'];
  if (maxKeywords.some(kw => name.includes(kw))) {
    return 'max';
  }

  const sumKeywords = [
    'count', 'qty', 'units', 'volume', 'revenue', 'sales', 'sum', 'total',
    'cogs', 'profit', 'expense', 'opex', 'ebitda', 'depreciation', 'ebit',
    'interest', 'taxes', 'income', 'marketing'
  ];
  if (sumKeywords.some(kw => name.includes(kw))) {
    return 'sum';
  }

  if (colType === 'numeric') {
    return 'mean';
  }
  return 'mode';
};

const computeFeatureStatuses = (db, target, dateCol) => {
  if (!db) return {};
  const statuses = {};

  db.columnsInfo.forEach(col => {
    const isTarget = col.name === target;
    const isDate = col.name === dateCol;

    // Calculate correlation
    let corr = 0;
    if (db.id && SAMPLE_DATASETS[db.id] && SAMPLE_DATASETS[db.id].defaultTarget === target) {
      const storedCorr = SAMPLE_DATASETS[db.id].correlations[col.name];
      if (storedCorr !== undefined) corr = storedCorr;
    } else {
      corr = calculatePearsonCorrelation(db.sampleRows, col.name, target);
    }

    // Heuristics
    const uniqueRatio = col.uniqueCount / db.rows;
    const isIdField = uniqueRatio > 0.95 && db.rows > 15;
    const isHighNulls = col.nullPercent > 40;

    const containsId = col.name.toLowerCase().includes('id') || col.name.toLowerCase() === 'key';
    const isLeakage = (containsId && !isTarget) || (Math.abs(corr) >= 0.95 && !isTarget);

    const isNoVariance = col.uniqueCount <= 1;

    let warning = '';
    let recommend = false;

    if (isTarget) {
      recommend = false;
    } else if (isDate) {
      recommend = false;
    } else if (isLeakage) {
      warning = 'Leakage risk';
      recommend = false;
    } else {
      recommend = true;
      if (isIdField) {
        warning = 'ID-like';
      } else if (isHighNulls) {
        warning = 'High nulls';
      } else if (isNoVariance) {
        warning = 'No variance';
      }
    }

    statuses[col.name] = {
      recommend,
      warning,
      corr
    };
  });

  return statuses;
};

const autoDetectGoal = (db, targetCol) => {
  if (!db || !targetCol || targetCol === 'none') return { goal: '', problemSubtype: 'binary', dateColumn: '' };

  const colMeta = db.columnsInfo.find(c => c.name === targetCol);
  if (!colMeta) return { goal: '', problemSubtype: 'binary', dateColumn: '' };

  // Use the virtual date column key if one was generated, else look for a real datetime column
  const dateCol = db.columnsInfo.find(c => c.type === 'datetime');

  if (colMeta.type === 'categorical') {
    return {
      goal: 'classification',
      problemSubtype: colMeta.uniqueCount === 2 ? 'binary' : 'multiclass',
      dateColumn: ''
    };
  }

  if (colMeta.type === 'numeric') {
    if (colMeta.uniqueCount <= 10) {
      return {
        goal: 'classification',
        problemSubtype: colMeta.uniqueCount === 2 ? 'binary' : 'multiclass',
        dateColumn: ''
      };
    }

    // Prefer the virtual date column if one was built from multi-component temporal columns
    if (db.virtualDateColKey) {
      return { goal: 'forecasting', problemSubtype: 'binary', dateColumn: db.virtualDateColKey };
    }

    // Fall back to a real datetime column if present
    if (dateCol) {
      return { goal: 'forecasting', problemSubtype: 'binary', dateColumn: dateCol.name };
    }

    return { goal: 'regression', problemSubtype: 'binary', dateColumn: '' };
  }

  return { goal: 'regression', problemSubtype: 'binary', dateColumn: '' };
};

const isBestMetric = (metricName, metricValue, allRows) => {
  if (!allRows || allRows.length <= 1) return false;

  const parseVal = (v) => {
    if (typeof v === 'string') {
      return parseFloat(v.replace(/%/g, '').replace(/,/g, ''));
    }
    return parseFloat(v);
  };

  const parsedVal = parseVal(metricValue);
  if (isNaN(parsedVal)) return false;

  const allParsed = allRows.map(r => parseVal(r[metricName])).filter(v => !isNaN(v));
  if (allParsed.length === 0) return false;

  // Identify if lower is better
  const lowerIsBetter = ['mae', 'rmse', 'mape', 'davies-bouldin index'].some(kw => metricName.toLowerCase().includes(kw));

  if (lowerIsBetter) {
    const minVal = Math.min(...allParsed);
    return parsedVal === minVal;
  } else {
    const maxVal = Math.max(...allParsed);
    return parsedVal === maxVal;
  }
};

const TARGET_KEYWORDS = [
  "price", "cost", "value", "target", "label", "output", "result",
  "revenue", "sales", "profit", "loss", "income", "salary", "wage",
  "score", "rating", "rate", "return", "yield", "amount", "total",
  "expense", "budget", "forecast", "prediction", "close", "closing",
  "temperature", "pressure", "failure", "defect", "quality", "ebitda",
  "churn", "default", "class", "status", "outcome", "clicked", "converted",
  "purchased", "y"
];

const ID_KEYWORDS = ["id", "uuid", "row_num", "rownum", "serial", "seq", "key", "unnamed"];

const detectTargetModelJS = (columnsInfo, totalRows) => {
  if (!columnsInfo || columnsInfo.length === 0) return null;

  let bestCol = null;
  let bestScore = -Infinity;
  const nCols = columnsInfo.length;

  columnsInfo.forEach((col, idx) => {
    const colLower = String(col.name).toLowerCase();

    // 1. Semantic Match score
    let keywordMatch = 0.0;
    for (const kw of TARGET_KEYWORDS) {
      if (colLower.includes(kw)) {
        keywordMatch += 4.0;
        break;
      }
    }

    let isId = false;
    for (const kw of ID_KEYWORDS) {
      if (colLower.includes(kw)) {
        isId = true;
        keywordMatch -= 6.0;
        break;
      }
    }

    // 2. Position score
    const relativeIdx = nCols > 1 ? idx / nCols : 0.5;

    // 3. Cardinality ratio
    const uniqueRatio = totalRows > 0 ? col.uniqueCount / totalRows : 0.0;
    let uniqueRatioPenalty = 0.0;
    if (uniqueRatio > 0.95 && (isId || col.type !== 'numeric')) {
      uniqueRatioPenalty = 1.0;
    }

    // 4. Null percentage penalty
    const nullPct = (col.nullPercent || 0) / 100;

    // 5. Correlation score (default placeholder as 0.0 since we compute it for custom files later, but let's check key correlation tags if they exist in dataset object)
    let meanCorr = 0.0;

    // 6. Datetime feature
    const isDatetime = col.type === 'datetime' || colLower.includes('date') || colLower.includes('time') ? 1.0 : 0.0;

    const score = (
      5.0 * keywordMatch +
      2.5 * meanCorr +
      2.0 * relativeIdx -
      8.0 * uniqueRatioPenalty -
      6.0 * nullPct -
      4.0 * isDatetime
    );

    if (score > bestScore) {
      bestScore = score;
      bestCol = col.name;
    }
  });

  return bestCol || columnsInfo[columnsInfo.length - 1].name;
};

const recommendTargetColumnsJS = (columnsInfo, totalRows, threshold = 0.0) => {
  if (!columnsInfo || columnsInfo.length === 0) return [];

  const TARGET_KEYWORDS = [
    "target", "label", "class", "y", "outcome", "response", "churn",
    "price", "default", "fraud", "survived", "value", "cost", "revenue",
    "sales", "profit", "status", "category", "target_class",
    "ebitda", "ebidta", "margin", "income", "earnings"
  ];

  const normalizeName = (name) => {
    let s = String(name || '');
    s = s.replace(/(.)([A-Z][a-z]+)/g, '$1 $2');
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    s = s.replace(/[_\-\s]+/g, ' ');
    return s.trim().toLowerCase();
  };

  const levenshteinDistance = (s1, s2) => {
    if (s1.length < s2.length) return levenshteinDistance(s2, s1);
    if (s2.length === 0) return s1.length;
    let prev = Array.from({length: s2.length + 1}, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
      let curr = [i + 1];
      for (let j = 0; j < s2.length; j++) {
        let insert = prev[j + 1] + 1;
        let del = curr[j] + 1;
        let sub = prev[j] + (s1[i] !== s2[j] ? 1 : 0);
        curr.push(Math.min(insert, del, sub));
      }
      prev = curr;
    }
    return prev[prev.length - 1];
  };

  const levenshteinSimilarity = (s1, s2) => {
    const dist = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen === 0 ? 0 : 1 - dist / maxLen;
  };

  const hasDateCol = columnsInfo.some(c => c.type === 'datetime' || String(c.name).toLowerCase().includes('date') || String(c.name).toLowerCase().includes('time'));

  const rawCandidates = [];
  const N = columnsInfo.length;

  columnsInfo.forEach((col, idx) => {
    const colNorm = normalizeName(col.name);

    // 1. Name Match Signal
    let nameMatchScore = 0.0;
    const hasExact = TARGET_KEYWORDS.some(kw => normalizeName(kw) === colNorm);
    if (hasExact) {
      nameMatchScore = 1.0;
    } else {
      let bestSim = 0.0;
      const colWords = colNorm.split(' ');
      TARGET_KEYWORDS.forEach(kw => {
        const kwNorm = normalizeName(kw);
        const kwWords = kwNorm.split(' ');
        const hasWordMatch = colWords.some(w => kwWords.includes(w));
        if (hasWordMatch) {
          bestSim = Math.max(bestSim, 0.7);
        }
        const sim = levenshteinSimilarity(colNorm, kwNorm);
        bestSim = Math.max(bestSim, sim);
      });
      if (bestSim >= 0.5) {
        nameMatchScore = 0.5 + 0.3 * bestSim;
      }
    }

    // 2. Position Signal
    let posScore = 0.5;
    if (!hasDateCol) {
      if (idx === N - 1) posScore = 1.0;
      else if (idx === 0) posScore = 0.6;
      else posScore = 0.6 + 0.4 * (idx / (N - 1));
    }

    // 3. Cardinality Signal
    const uniqueRatio = totalRows > 0 ? col.uniqueCount / totalRows : 0.0;
    let classScore = 0.0;
    if (col.uniqueCount >= 2) {
      if (uniqueRatio < 0.05 || col.uniqueCount < 20) {
        classScore = 1.0;
      } else {
        classScore = Math.max(0, 1 - (uniqueRatio - 0.05) * 2);
      }
    }
    const regScore = col.type === 'numeric' ? uniqueRatio : 0.0;
    const cardScore = Math.max(classScore, regScore);
    const cardVariant = regScore > classScore ? 'regression' : 'classification';

    // Task type hint
    let taskTypeHint = cardVariant;
    if (hasDateCol && col.type === 'numeric' && !colNorm.includes('date') && !colNorm.includes('time')) {
      taskTypeHint = 'forecasting';
    }

    // 4. Missingness Signal
    const nullPercent = col.nullPercent || 0;
    const missScore = 1.0 - (nullPercent / 100);

    // 5. Dependency Signal (cost-gated / skipped on fallback)
    const cheapScore = Math.max(nameMatchScore, cardScore);
    const depSkipped = cheapScore < 0.3;
    const depScore = 0.0;

    // 6. Semantic Signal
    let semScore = 0.0;
    let semSkippedReason = null;
    if (nameMatchScore >= 0.3) {
      semSkippedReason = "name_match_sufficient";
    } else {
      let bestSemSim = 0.0;
      TARGET_KEYWORDS.forEach(kw => {
        const kwNorm = normalizeName(kw);
        const colWords = colNorm.split(' ');
        const kwWords = kwNorm.split(' ');
        const intersect = colWords.filter(w => kwWords.includes(w));
        if (intersect.length > 0) {
          bestSemSim = Math.max(bestSemSim, 0.5);
        }
      });
      semScore = bestSemSim;
    }

    const rawScore = (
      0.30 * nameMatchScore +
      0.10 * posScore +
      0.20 * cardScore +
      0.10 * missScore +
      0.20 * depScore +
      0.10 * semScore
    );

    rawCandidates.push({
      column: col.name,
      rawScore: rawScore,
      signal_breakdown: {
        name_match: nameMatchScore,
        position: posScore,
        cardinality: cardScore,
        cardinality_variant: cardVariant,
        missingness: missScore,
        dependency: depScore,
        dependency_skipped: depSkipped,
        semantic: semScore,
        semantic_skipped_reason: semSkippedReason
      },
      task_type_hint: taskTypeHint
    });
  });

  const maxScore = Math.max(...rawCandidates.map(c => c.rawScore));
  rawCandidates.forEach((c) => {
    const normalized = maxScore > 0 ? (c.rawScore / maxScore) : 0.0;
    c.score = Math.round(normalized * 10000) / 10000;
    delete c.rawScore;
  });

  rawCandidates.sort((a, b) => b.score - a.score);

  return rawCandidates;
};

// ==========================================
// 3.45. EXPLORE RELATIONSHIPS COMPONENT
// ==========================================
const ER_MONTH_MAP = {
  jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,
  may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9,
  oct:10,october:10,nov:11,november:11,dec:12,december:12
};
const ER_TARGET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6'];
const ER_FACTOR_COLORS = ['#a5b4fc','#6ee7b7','#fcd34d','#fca5a5','#93c5fd'];

function erAggregate(vals, metric) {
  const nums = vals.map(Number).filter(v => !isNaN(v));
  if (nums.length === 0) return null;
  switch (metric) {
    case 'sum':    return nums.reduce((a,b)=>a+b,0);
    case 'min':    return Math.min(...nums);
    case 'max':    return Math.max(...nums);
    case 'count':  return nums.length;
    case 'latest': return nums[nums.length-1];
    case 'median': { const s=[...nums].sort((a,b)=>a-b),m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
    default:       return nums.reduce((a,b)=>a+b,0)/nums.length;
  }
}

function erParseDateValue(val) {
  if (val===null||val===undefined||val==='') return null;
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) { const y=parseInt(isoMatch[1],10),m=parseInt(isoMatch[2],10); return {year:y,month:m,quarter:Math.ceil(m/3),sortKey:y*100+m}; }
  const myMatch = s.match(/^([a-zA-Z]{3,9})[\s\-](\d{4})$/);
  if (myMatch) { const m=ER_MONTH_MAP[myMatch[1].toLowerCase().substring(0,3)]||1,y=parseInt(myMatch[2],10); return {year:y,month:m,quarter:Math.ceil(m/3),sortKey:y*100+m}; }
  if (/^\d{4}$/.test(s)) { const y=parseInt(s,10); return {year:y,month:1,quarter:1,sortKey:y*100+1}; }
  const qMatch = s.match(/(\d{4})[\-\s]?Q(\d)/i);
  if (qMatch) { const y=parseInt(qMatch[1],10),q=parseInt(qMatch[2],10); return {year:y,month:(q-1)*3+1,quarter:q,sortKey:y*10+q}; }
  const d = new Date(s);
  if (!isNaN(d.getTime())) { const y=d.getFullYear(),m=d.getMonth()+1; return {year:y,month:m,quarter:Math.ceil(m/3),sortKey:y*100+m}; }
  return null;
}

function erBucketLabel(parsed, gran) {
  if (!parsed) return null;
  if (gran==='year')    return String(parsed.year);
  if (gran==='quarter') return `${parsed.year}-Q${parsed.quarter}`;
  return `${parsed.year}-${String(parsed.month).padStart(2,'0')}`;
}
function erBucketSortKey(parsed, gran) {
  if (!parsed) return 0;
  if (gran==='year')    return parsed.year;
  if (gran==='quarter') return parsed.year*10+parsed.quarter;
  return parsed.sortKey;
}

function ExploreRelationships({ dataset, darkMode }) {
  const [targetCols,  setTargetCols]  = useState([]);
  const [factorCols,  setFactorCols]  = useState([]);
  const [metrics,     setMetrics]     = useState({});
  const [granularity, setGranularity] = useState('month');
  const [dateStart,   setDateStart]   = useState('');
  const [dateEnd,     setDateEnd]     = useState('');
  // catValues: { [catColName]: string[] } — selected distinct values per categorical column
  const [catValues,   setCatValues]   = useState({});
  // catCapMsg: shown when user tries to exceed CAT_VAL_CAP
  const [catCapMsg,   setCatCapMsg]   = useState({});
  const CAT_VAL_CAP = 6;

  const timeColKey   = dataset.virtualDateColKey || dataset.sortedByCol || null;
  const numericCols  = dataset.columnsInfo.filter(c => c.type==='numeric');
  const otherCols    = dataset.columnsInfo.filter(c => c.type!=='numeric');

  // Determine if a column is categorical (non-numeric)
  function isCatCol(colName) {
    const meta = dataset.columnsInfo.find(c=>c.name===colName);
    return meta && meta.type !== 'numeric';
  }

  // Distinct values for a categorical column (top 20 by frequency)
  function distinctVals(colName) {
    const freq = {};
    dataset.sampleRows.forEach(r => {
      const v = r[colName];
      if (v!==null&&v!==undefined&&String(v).trim()!=='') {
        const k = String(v).trim();
        freq[k] = (freq[k]||0)+1;
      }
    });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20).map(e=>e[0]);
  }

  function defaultMetric(colName) {
    const col = dataset.columnsInfo.find(c=>c.name===colName);
    return inferAggFunction(colName, col?.type||'numeric', dataset);
  }
  function addCol(colName, role) {
    if (role==='target'&&!targetCols.includes(colName)) setTargetCols(p=>[...p,colName]);
    else if (role==='factor'&&!factorCols.includes(colName)) setFactorCols(p=>[...p,colName]);
    if (!metrics[colName]) setMetrics(p=>({...p,[colName]:defaultMetric(colName)}));
    // For categorical cols: auto-select top 3 values as default
    if (isCatCol(colName) && !catValues[colName]) {
      const top = distinctVals(colName).slice(0, 3);
      setCatValues(p=>({...p,[colName]:top}));
    }
  }
  function removeCol(colName, role) {
    if (role==='target') setTargetCols(p=>p.filter(c=>c!==colName));
    else setFactorCols(p=>p.filter(c=>c!==colName));
    setCatValues(p=>{ const n={...p}; delete n[colName]; return n; });
    setCatCapMsg(p=>{ const n={...p}; delete n[colName]; return n; });
  }
  function toggleCatValue(colName, val) {
    setCatValues(prev => {
      const cur = prev[colName] || [];
      if (cur.includes(val)) {
        return {...prev, [colName]: cur.filter(v=>v!==val)};
      }
      if (cur.length >= CAT_VAL_CAP) {
        setCatCapMsg(p=>({...p,[colName]:`Max ${CAT_VAL_CAP} values allowed`}));
        setTimeout(()=>setCatCapMsg(p=>({...p,[colName]:''})), 2500);
        return prev;
      }
      setCatCapMsg(p=>({...p,[colName]:''}));
      return {...prev, [colName]: [...cur, val]};
    });
  }

  // Numeric cols currently selected (targets or factors)
  const numericSelected = useMemo(()=>[...targetCols,...factorCols].filter(c=>!isCatCol(c)), [targetCols,factorCols,dataset]);
  // Categorical cols currently selected
  const catSelected     = useMemo(()=>[...targetCols,...factorCols].filter(c=>isCatCol(c)), [targetCols,factorCols,dataset]);

  // Expanded line keys — one per (numericCol × catValue) for each active categorical col,
  // plus plain numeric lines for numeric cols when no cat breakdown is active.
  // Key format: plain numeric → colName; cat breakdown → "numCol — catVal"
  const expandedLines = useMemo(() => {
    const lines = []; // { key, numCol, catCol, catVal, role }
    const allSel = [...targetCols,...factorCols];
    const role = col => targetCols.includes(col) ? 'target' : 'factor';

    if (catSelected.length === 0) {
      // No categoricals — plain numeric lines only
      numericSelected.forEach(col => lines.push({key:col, numCol:col, catCol:null, catVal:null, role:role(col)}));
    } else {
      // For each numeric col, produce one line per selected cat value (per each cat col)
      numericSelected.forEach(numCol => {
        if (catSelected.length === 0) {
          lines.push({key:numCol, numCol, catCol:null, catVal:null, role:role(numCol)});
        } else {
          catSelected.forEach(catCol => {
            const vals = catValues[catCol] || [];
            if (vals.length === 0) {
              // No values selected yet — show placeholder
              lines.push({key:`${numCol} — (pick values for ${catCol})`, numCol, catCol, catVal:null, role:role(catCol)});
            } else {
              vals.forEach(val => {
                lines.push({key:`${numCol} — ${val}`, numCol, catCol, catVal:val, role:role(catCol)});
              });
            }
          });
        }
      });
      // Also render pure categorical cols as their own count lines (if no numeric selected)
      if (numericSelected.length === 0) {
        catSelected.forEach(catCol => {
          const vals = catValues[catCol] || [];
          vals.forEach(val => lines.push({key:`${catCol} — ${val}`, numCol:catCol, catCol, catVal:val, role:role(catCol)}));
        });
      }
    }
    return lines;
  }, [targetCols, factorCols, numericSelected, catSelected, catValues, dataset]);

  const chartData = useMemo(() => {
    if (expandedLines.length===0||!timeColKey) return [];
    const buckets = {};
    dataset.sampleRows.forEach(row => {
      const parsed = erParseDateValue(row[timeColKey]);
      if (!parsed) return;
      const label   = erBucketLabel(parsed, granularity);
      const sortKey = erBucketSortKey(parsed, granularity);
      if (!label) return;
      if (dateStart && label < dateStart) return;
      if (dateEnd   && label > dateEnd)   return;
      if (!buckets[label]) buckets[label] = {label, sortKey, vals:{}};
      expandedLines.forEach(({key, numCol, catCol, catVal}) => {
        if (catVal !== null && catVal !== undefined) {
          // Filter rows where catCol === catVal, then collect numCol values
          if (String(row[catCol]).trim() !== String(catVal).trim()) return;
        }
        if (!buckets[label].vals[key]) buckets[label].vals[key] = [];
        const v = row[numCol];
        if (v!==null&&v!==undefined&&String(v).trim()!=='') buckets[label].vals[key].push(v);
      });
    });
    return Object.values(buckets).sort((a,b)=>a.sortKey-b.sortKey).map(b => {
      const pt = {label:b.label};
      expandedLines.forEach(({key, numCol}) => {
        const m = metrics[numCol] || 'mean';
        pt[key] = erAggregate(b.vals[key]||[], m);
      });
      return pt;
    });
  }, [expandedLines, metrics, granularity, dateStart, dateEnd, dataset, timeColKey]);

  const axisGroups = useMemo(() => {
    if (expandedLines.length===0||chartData.length===0) return {};
    const orderToAxis={}, axisMap={};
    let next=0;
    expandedLines.forEach(({key, numCol}) => {
      const vals = chartData.map(d=>d[key]).filter(v=>v!==null&&!isNaN(Number(v)));
      const max  = vals.length ? Math.max(...vals.map(v=>Math.abs(Number(v)))) : 0;
      const ord  = max===0 ? 0 : Math.floor(Math.log10(max+1));
      // Group by numCol so all breakdowns of same numeric col share an axis
      const groupKey = numCol+'__'+ord;
      if (axisMap[groupKey]===undefined) {
        const existing = Object.keys(orderToAxis).find(k=>Math.abs(Number(k.split('__')[1]||k)-ord)<=1);
        if (existing!==undefined) { orderToAxis[groupKey]=orderToAxis[existing]; axisMap[groupKey]=orderToAxis[existing]; }
        else { orderToAxis[groupKey]=next; axisMap[groupKey]=next; next++; }
      }
      axisMap[key] = axisMap[groupKey];
    });
    return axisMap;
  }, [expandedLines, chartData]);

  const distinctAxes = [...new Set(Object.values(axisGroups).filter(v=>typeof v==='number'))].sort((a,b)=>a-b);
  const gc = darkMode ? '#1e293b' : '#f1f5f9';
  const tc = darkMode ? '#94a3b8' : '#64748b';
  const sel = "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none";
  const MOPTS = [{v:'sum',l:'Sum'},{v:'mean',l:'Avg'},{v:'median',l:'Med'},{v:'min',l:'Min'},{v:'max',l:'Max'},{v:'count',l:'Cnt'},{v:'latest',l:'Last'}];

  // ColPill: shows each selected column with its metric dropdown and remove button
  function ColPill({colName, role, idx}) {
    const colors = role==='target' ? ER_TARGET_COLORS : ER_FACTOR_COLORS;
    const color  = colors[idx%colors.length];
    const m      = metrics[colName]||'mean';
    const isCat  = isCatCol(colName);
    // For numeric cols show axis; cat cols don't directly map to an axis
    const axId   = isCat ? null : ((axisGroups[colName]??0)+1);
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold flex-shrink-0"
        style={{borderColor:color+'55',background:color+'14',color}}>
        <span className="truncate max-w-[80px]" title={colName}>{colName}</span>
        {!isCat && (
          <select value={m} onChange={e=>{e.stopPropagation();setMetrics(p=>({...p,[colName]:e.target.value}))}}
            onClick={e=>e.stopPropagation()}
            style={{color,background:'transparent',border:'none',fontSize:'9px',fontWeight:700,cursor:'pointer',outline:'none'}}>
            {MOPTS.map(o=><option key={o.v} value={o.v} style={{background:darkMode?'#0f172a':'#fff',color:darkMode?'#f8fafc':'#0f172a'}}>{o.l}</option>)}
          </select>
        )}
        {isCat && <span style={{fontSize:'9px',opacity:0.7}}>breakdown</span>}
        {axId !== null && <span style={{fontSize:'8px',opacity:0.6}}>Y{axId}</span>}
        <button onClick={()=>removeCol(colName,role)} style={{opacity:.5,fontWeight:700,cursor:'pointer',background:'none',border:'none',color,fontSize:'10px'}} title="Remove">✕</button>
      </div>
    );
  }

  // fmt helper
  function fmtVal(n) {
    if(n===null||n===undefined||isNaN(Number(n))) return '—';
    const v=Number(n);
    return Math.abs(v)>=1e6?(v/1e6).toFixed(2)+'M':Math.abs(v)>=1e3?(v/1e3).toFixed(2)+'k':v.toFixed(2);
  }
  function fmtTick(v) {
    if(!v&&v!==0) return '';
    const n=Number(v);
    return Math.abs(n)>=1e6?(n/1e6).toFixed(1)+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1)+'k':Math.abs(n)>=10?n.toFixed(0):n.toFixed(2);
  }

  const noData = targetCols.length===0;
  const allSelected = [...targetCols,...factorCols];

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
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
        <div className="flex flex-wrap items-center gap-2">
          <select value={granularity} onChange={e=>setGranularity(e.target.value)} className={sel}>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
          <input type="text" placeholder="Start (YYYY-MM)" value={dateStart} onChange={e=>setDateStart(e.target.value)} className={sel+" w-32"} />
          <span className="text-xs text-slate-400">to</span>
          <input type="text" placeholder="End (YYYY-MM)" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} className={sel+" w-32"} />
        </div>
      </div>

      {/* Column selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{role:'target',cols:targetCols,label:'Target columns',hint:'(solid lines)'},{role:'factor',cols:factorCols,label:'Influencing factors',hint:'(dashed lines)'}].map(({role,cols,label,hint})=>(
          <div key={role} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
              <span className="text-[9px] text-slate-400">{hint}</span>
            </div>
            <select value="" onChange={e=>{ if(e.target.value) addCol(e.target.value,role); }} className={sel+" w-full"}>
              <option value="">+ Add {role==='target'?'target':'factor'} column…</option>
              <optgroup label="Numeric">
                {numericCols.filter(c=>!allSelected.includes(c.name)).map(c=>(
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Categorical / Date">
                {otherCols.filter(c=>!allSelected.includes(c.name)).map(c=>(
                  <option key={c.name} value={c.name}>{c.name} (breakdown)</option>
                ))}
              </optgroup>
            </select>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {cols.map((col,i)=><ColPill key={col} colName={col} role={role} idx={i}/>)}
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
            const colors = role==='target' ? ER_TARGET_COLORS : ER_FACTOR_COLORS;
            const numPairs = numericSelected.length > 0
              ? numericSelected.join(', ')
              : '(add a numeric target/factor column)';
            return (
              <div key={catCol} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span style={{color:colors[catSelected.indexOf(catCol)%colors.length]}}>{catCol}</span>
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
                    const color = isOn ? colors[colIdx%colors.length] : null;
                    return (
                      <button key={val} onClick={()=>toggleCatValue(catCol,val)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition cursor-pointer"
                        style={isOn
                          ? {borderColor:color+'55',background:color+'18',color}
                          : {borderColor:'var(--tw-border-opacity,1) #e2e8f0',background:'transparent',color:'#94a3b8'}
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
          <TrendingUp className="w-9 h-9 opacity-25"/>
          <span className="text-xs font-semibold">Select at least one target column to render the chart</span>
        </div>
      ) : !timeColKey ? (
        <div className="flex flex-col items-center justify-center h-32 border border-dashed border-amber-200 dark:border-amber-800 rounded-xl text-amber-600 gap-1">
          <span className="text-xs font-semibold">⚠ No date/time column detected — time-axis chart unavailable</span>
        </div>
      ) : chartData.length===0 ? (
        <div className="flex flex-col items-center justify-center h-32 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 gap-1">
          <span className="text-xs font-semibold">No data after applying current date range filter</span>
        </div>
      ) : (
        <div style={{width:'100%',height:340}}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{top:8,right:distinctAxes.length>1?70:20,left:10,bottom:28}}>
              <CartesianGrid strokeDasharray="3 3" stroke={gc}/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:tc}} angle={-30} textAnchor="end" height={44} interval="preserveStartEnd"/>

              {distinctAxes.map((axIdx,i)=>{
                // Label axis with the numeric cols that map to it
                const keysOnAxis = expandedLines.filter(l=>(axisGroups[l.key]??0)===axIdx);
                const uniqueNumCols = [...new Set(keysOnAxis.map(l=>l.numCol))];
                const m = metrics[uniqueNumCols[0]]||'mean';
                const axLabel = uniqueNumCols.slice(0,2).join(', ')+(uniqueNumCols.length>2?'…':'')+(` (${m})`);
                return (
                  <YAxis key={axIdx} yAxisId={axIdx} orientation={i===0?'left':'right'}
                    tick={{fontSize:9,fill:tc}} width={i===0?54:50}
                    tickFormatter={fmtTick}
                    label={{value:axLabel,angle:-90,position:i===0?'insideLeft':'insideRight',offset:i===0?10:-10,style:{fontSize:8,fill:tc}}}
                  />
                );
              })}

              <ChartTooltip
                contentStyle={{fontSize:'11px',backgroundColor:darkMode?'#1e293b':'#fff',borderColor:darkMode?'#334155':'#e2e8f0',color:darkMode?'#f8fafc':'#0f172a',borderRadius:'8px'}}
                formatter={(value,name)=>{
                  const line = expandedLines.find(l=>l.key===name);
                  const m = line ? (metrics[line.numCol]||'mean') : 'mean';
                  const axId = (axisGroups[name]??0)+1;
                  return [fmtVal(value), `${name} · ${m} · Y${axId}`];
                }}
              />
              <Legend wrapperStyle={{fontSize:'10px',paddingTop:'8px'}}
                formatter={v=>{
                  const line = expandedLines.find(l=>l.key===v);
                  const m = line ? (metrics[line.numCol]||'mean') : 'mean';
                  return `${v} · ${m} · Y${(axisGroups[v]??0)+1}`;
                }}/>

              {/* Target lines */}
              {expandedLines.filter(l=>l.role==='target').map((line,i)=>(
                <Line key={line.key} yAxisId={axisGroups[line.key]??0}
                  type="monotone" dataKey={line.key}
                  stroke={ER_TARGET_COLORS[i%ER_TARGET_COLORS.length]} strokeWidth={2.5}
                  dot={{r:2.5,strokeWidth:1.5,fill:ER_TARGET_COLORS[i%ER_TARGET_COLORS.length]}}
                  connectNulls isAnimationActive={false}/>
              ))}
              {/* Factor lines */}
              {expandedLines.filter(l=>l.role==='factor').map((line,i)=>(
                <Line key={line.key} yAxisId={axisGroups[line.key]??0}
                  type="monotone" dataKey={line.key}
                  stroke={ER_FACTOR_COLORS[i%ER_FACTOR_COLORS.length]} strokeWidth={1.5}
                  strokeDasharray="4 2" strokeOpacity={0.65}
                  dot={{r:1.5,strokeWidth:1,fill:ER_FACTOR_COLORS[i%ER_FACTOR_COLORS.length],fillOpacity:0.65}}
                  connectNulls isAnimationActive={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ==========================================
// 3.5. AUTHENTICATION GATE COMPONENT
// ==========================================
function AuthGate({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? 'login' : 'signup';

    try {
      const response = await fetch(`http://localhost:7860/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUsername', data.user.username);
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-2xl space-y-6 animate-slide-up">
      <div className="flex flex-col items-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg animate-pulse-slow">
          <Brain className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          EY ML Playground
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No-code predictive model management platform
        </p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(''); }}
          className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition cursor-pointer ${isLogin ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(''); }}
          className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition cursor-pointer ${!isLogin ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-500 text-xs font-semibold flex items-center space-x-2">
            <span className="shrink-0 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-slate-800 dark:text-slate-100"
            placeholder="Enter username"
            autoComplete="username"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition text-slate-800 dark:text-slate-100"
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-xs font-bold transition shadow-lg hover:shadow-indigo-500/20 cursor-pointer flex justify-center items-center space-x-2"
        >
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
          )}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// 4. MAIN COMPONENT DEFINITION
// ==========================================
export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Authentication state
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '');
  const [authUsername, setAuthUsername] = useState(localStorage.getItem('authUsername') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:7860/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-Session-ID': authToken
        }
      });
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUsername');
    setAuthToken('');
    setAuthUsername('');
    setIsAuthenticated(false);
    setPage(1);
    setIsMyProjectsPage(false);
  };

  // Advanced Mode (two-tier UX)
  const advancedMode = true; // Hardcoded as per user request
  const [activeMetricChart, setActiveMetricChart] = useState('');

  // Page index (1, 2, 3)
  const [page, setPage] = useState(1);

  // Uploaded dataset
  const [dataset, setDataset] = useState(null);

  // Goal type (classification, regression, clustering, forecasting)
  const [goal, setGoal] = useState('');

  // Setup options
  const [targetColumn, setTargetColumn] = useState('');
  const [dateColumn, setDateColumn] = useState('');
  const [problemSubtype, setProblemSubtype] = useState('binary'); // binary or multiclass

  // Selected models
  const [selectedModels, setSelectedModels] = useState([]);

  // Multi-instance training configurations
  const [instances, setInstances] = useState([]);
  const [instancesResults, setInstancesResults] = useState({});
  const hasAutoSelectedRef = useRef(false);
  const [savingModelIds, setSavingModelIds] = useState({});
  const [savedModelIds, setSavedModelIds] = useState({});
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Feature Selection states
  const [featureSelections, setFeatureSelections] = useState({});

  // Engineering Panel Collapsibility
  const [collapsedPanels, setCollapsedPanels] = useState({
    aggregation: true,
    encoding: true,
    normalization: true,
    missing: true,
    timeEncoding: true
  });

  // Preprocessing configurations
  const [groupByColumns, setGroupByColumns] = useState([]);
  const [groupBySearch, setGroupBySearch] = useState('');
  const [isGroupByDropdownOpen, setIsGroupByDropdownOpen] = useState(false);
  const [applyAggregation, setApplyAggregation] = useState(false);
  const [customAggMappings, setCustomAggMappings] = useState({});
  const [oneHotColumns, setOneHotColumns] = useState([]);
  const [normalizationStrategies, setNormalizationStrategies] = useState({});
  const [missingStrategies, setMissingStrategies] = useState({});
  const [missingConstants, setMissingConstants] = useState({});

  // Time Feature Encoding states
  const [timeSinCosMonth, setTimeSinCosMonth] = useState(false);
  const [timeSinCosWeekday, setTimeSinCosWeekday] = useState(false);
  const [timeYearScaling, setTimeYearScaling] = useState('none');
  const [timeComponentToggles, setTimeComponentToggles] = useState({});
  const [timeComponentEncodings, setTimeComponentEncodings] = useState({});

  // Predictions Page Pagination
  const [predictionsPage, setPredictionsPage] = useState(0);

  // Two-tier UX Target & Model selection states
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [userOverrodeModel, setUserOverrodeModel] = useState(false);
  const [selectedModelOverride, setSelectedModelOverride] = useState('');
  const [activePredictionModel, setActivePredictionModel] = useState('');
  const [activeDiagModel, setActiveDiagModel] = useState('');
  const [backendTargetRecs, setBackendTargetRecs] = useState(null);
  const [multiTargetMode, setMultiTargetMode] = useState('parallel');

  // Data Quality Intelligence (DQI) Page states
  const [dqiDataset, setDqiDataset] = useState(null);
  const [dqiAnomalyLog, setDqiAnomalyLog] = useState([]);
  const [dqiAuditTrail, setDqiAuditTrail] = useState([]);
  const [dqiSelectedFeature, setDqiSelectedFeature] = useState('');
  const [dqiInitializedFor, setDqiInitializedFor] = useState({ datasetId: '', target: '', dateCol: '' });
  // Category trend breakdown state (Page 3)
  const [dqiPrimaryCategory, setDqiPrimaryCategory] = useState('');
  const [dqiSubgroupCategory, setDqiSubgroupCategory] = useState('none');
  const [dqiCategoryPanelOpen, setDqiCategoryPanelOpen] = useState(true);

  const validCategoryColumns = useMemo(() => {
    return groupByColumns.filter(col => {
      const colLower = String(col).toLowerCase();
      const isCalendarCol = colLower.includes('year') || colLower.includes('month') || colLower.includes('quarter') || colLower.includes('week') || colLower.includes('day') || colLower.includes('hour') || colLower.includes('date') || colLower.includes('time') || col === '__vd__';
      return !isCalendarCol;
    });
  }, [groupByColumns]);

  const dqiCategoryColumns = useMemo(() => {
    const cols = [];
    if (dqiPrimaryCategory) cols.push(dqiPrimaryCategory);
    if (dqiSubgroupCategory && dqiSubgroupCategory !== 'none' && dqiSubgroupCategory !== dqiPrimaryCategory) {
      cols.push(dqiSubgroupCategory);
    }
    return cols;
  }, [dqiPrimaryCategory, dqiSubgroupCategory]);

  const recommendedTargets = useMemo(() => {
    if (!dataset) return [];
    // Filter with threshold 0.0 to recommend reasonable columns
    return recommendTargetColumnsJS(dataset.columnsInfo, dataset.rows, 0.0);
  }, [dataset]);

  const getBestModelKey = (results) => {
    if (!results || !results.models) return '';
    const models = Object.values(results.models);
    if (models.length === 0) return '';

    let bestKey = models[0].id;
    let bestValue = -Infinity;
    let lowestValue = Infinity;

    models.forEach(m => {
      if (goal === 'classification') {
        const val = parseFloat(m.metrics['Accuracy']);
        if (!isNaN(val) && val > bestValue) {
          bestValue = val;
          bestKey = m.id;
        }
      } else if (goal === 'regression') {
        const val = parseFloat(m.metrics['R² Score']);
        if (!isNaN(val) && val > bestValue) {
          bestValue = val;
          bestKey = m.id;
        }
      } else if (goal === 'clustering') {
        const val = parseFloat(m.metrics['Silhouette Score']);
        if (!isNaN(val) && val > bestValue) {
          bestValue = val;
          bestKey = m.id;
        }
      } else if (goal === 'forecasting') {
        const val = parseFloat(m.metrics['MAPE']);
        if (!isNaN(val) && val < lowestValue) {
          lowestValue = val;
          bestKey = m.id;
        }
      }
    });

    return bestKey;
  };

  // Data Overview Panel States
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewSortCol, setOverviewSortCol] = useState('');
  const [overviewSortDirection, setOverviewSortDirection] = useState('asc');
  const [overviewScrollTop, setOverviewScrollTop] = useState(0);

  // Training Settings
  const [splitRatio, setSplitRatio] = useState(80); // 80 means 80/20
  const [splitMethod, setSplitMethod] = useState('random'); // random, chronological
  const [cvFolds, setCvFolds] = useState(5);
  const [cvEnabled, setCvEnabled] = useState(false);
  const [cvStrategy, setCvStrategy] = useState('kfold'); // kfold, stratified, timeseries
  const [predictInputs, setPredictInputs] = useState({});
  const [predictionResults, setPredictionResults] = useState(null);
  const [customScenarios, setCustomScenarios] = useState({});
  const [csvFeedback, setCsvFeedback] = useState({});

  const [forecastHorizon, setForecastHorizon] = useState(12);
  const [forecastFrequency, setForecastFrequency] = useState('Monthly');
  const [triggerForecastUpdate, setTriggerForecastUpdate] = useState(0);
  const [hyperparameters, setHyperparameters] = useState({});
  const [collapsedHypers, setCollapsedHypers] = useState({});
  // Optuna tuning settings
  const [useOptuna, setUseOptuna] = useState(true);
  const [optunaTrials, setOptunaTrials] = useState(25);
  // Feature selection pipeline settings
  const [useFeaturePipeline, setUseFeaturePipeline] = useState(true);
  const [expandedPipelineMock, setExpandedPipelineMock] = useState(false);
  const [expandedLeaderboard, setExpandedLeaderboard] = useState(false);
  const [expandedPredictionsPreview, setExpandedPredictionsPreview] = useState(false);
  const [expandedForecastProjections, setExpandedForecastProjections] = useState(false);

  // Page 3 target selection threshold
  const [targetScoreThreshold, setTargetScoreThreshold] = useState(15);
  const [showAllTargets, setShowAllTargets] = useState(false);

  // ── Navigation refactor: new UI state ────────────────────────────────────
  // Ingestion tab: Column-Wise Visualizations collapsible (collapsed by default)
  const [colVizOpen, setColVizOpen] = useState(false);
  // Ingestion tab: sub-tab 0=Overview, 1=Explore Targets
  const [ingestionSubTab, setIngestionSubTab] = useState(0);
  // Model tab: Advanced hyperparameter grid collapsible (collapsed by default)
  const [advancedHyperOpen, setAdvancedHyperOpen] = useState(false);

  // Page 8 model selection
  const [mlLibraryOpen, setMlLibraryOpen] = useState(false);
  const [mlInventoryOpen, setMlInventoryOpen] = useState(false);

  // Projects management
  const [isMyProjectsPage, setIsMyProjectsPage] = useState(false);
  const [projects, setProjects] = useState([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [showProjectActionDialog, setShowProjectActionDialog] = useState(false);
  const [selectedProjectForAction, setSelectedProjectForAction] = useState(null);
  const [saveProjectName, setSaveProjectName] = useState('');
  const [showSaveProjectDialog, setShowSaveProjectDialog] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [currentSavingInstanceId, setCurrentSavingInstanceId] = useState(null);

  // Side drawer panels
  const [isDataOverviewOpen, setIsDataOverviewOpen] = useState(false);
  const [isModelInventoryOpen, setIsModelInventoryOpen] = useState(false);
  const [selectedInventoryModel, setSelectedInventoryModel] = useState(null);
  const [activeInfoModel, setActiveInfoModel] = useState(null);
  const [isTrainingHistoryOpen, setIsTrainingHistoryOpen] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Change 4: Product/category filter for Page 1 column-wise charts
  const [selectedProductFilter, setSelectedProductFilter] = useState('__all__');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('__all__');
  // Column-wise visualization: which columns are currently shown (first 4 by default; reset when dataset changes)
  const [visibleColNames, setVisibleColNames] = useState([]);

  // Category-wise analysis panel state
  const [selectedCatGroupCols, setSelectedCatGroupCols] = useState([]);
  const [selectedCatMetricCol, setSelectedCatMetricCol] = useState('');
  const [catChartView, setCatChartView] = useState('avg'); // 'avg' | 'total' | 'count' | 'dist'

  // Restructured Pipeline states
  const [pipelineValidity, setPipelineValidity] = useState({
    data_ingestion: true,
    data_audit_cleaning: false,
    target_selection: false,
    aggregation_settings: false,
    anomaly_detection: false,
    train_test_split: false,
    feature_selection: false,
    hyperparameter_opt: false,
    model_training: false,
  });

  const [cleanedDataset, setCleanedDataset] = useState(null);
  const [cleaningActionsAccepted, setCleaningActionsAccepted] = useState([]); // array of findings IDs accepted
  const [isProcessingCleaning, setIsProcessingCleaning] = useState(false);

  const invalidateFrom = useCallback((stage) => {
    const stages = [
      'data_ingestion',
      'data_audit_cleaning',
      'target_selection',
      'aggregation_settings',
      'anomaly_detection',
      'train_test_split',
      'feature_selection',
      'hyperparameter_opt',
      'model_training'
    ];
    const idx = stages.indexOf(stage);
    if (idx === -1) return;

    setPipelineValidity(prev => {
      const updated = { ...prev };
      for (let i = idx; i < stages.length; i++) {
        updated[stages[i]] = false;
      }
      return updated;
    });

    // Hard resets of values corresponding to invalidated stages
    if (idx <= stages.indexOf('data_audit_cleaning')) {
      setCleanedDataset(null);
      setCleaningActionsAccepted([]);
    }
    if (idx < stages.indexOf('target_selection')) {
      setInstances([]);
      hasAutoSelectedRef.current = false;
    }
    if (idx < stages.indexOf('aggregation_settings')) {
      setApplyAggregation(false);
      setGroupByColumns([]);
      setCustomAggMappings({});
    }
    if (idx <= stages.indexOf('anomaly_detection')) {
      setInstances(prev => prev.map(inst => ({ ...inst, anomalies: [], _anomalyScanned: false })));
    }
    if (idx <= stages.indexOf('feature_selection')) {
      setInstances(prev => prev.map(inst => ({ ...inst, features: [] })));
      featureAutoSelectRef.current = {};
    }
    if (idx <= stages.indexOf('hyperparameter_opt')) {
      setInstances(prev => prev.map(inst => ({ ...inst, userOverrides: {} })));
    }
    if (idx <= stages.indexOf('model_training')) {
      setInstancesResults({});
      setTrainingResults(null);
    }
  }, []);


  // Clean / Audit Selectors for Restructured Pipeline
  const getAuditScores = useMemo(() => {
    if (!dataset) return { granularity: 0, historicity: 0, value: 0, readiness: 0, spanText: 'No data', explanation: {} };

    const activeRows = dataset.sampleRows || [];
    const cols = dataset.columnsInfo || [];
    const MONTH_MAP = {
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
      'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
      'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    };

    // 1. Value Score
    let value = 100;
    let totalNulls = 0;
    let totalCells = activeRows.length * cols.length;
    if (totalCells > 0) {
      activeRows.forEach(r => {
        cols.forEach(c => {
          const v = r[c.name];
          if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') {
            totalNulls++;
          }
        });
      });
      const nullPct = totalNulls / totalCells;
      value -= nullPct * 100;
    }
    value = Math.max(0, Math.min(100, Math.round(value)));

    // 2. Historicity Score
    let historicity = 100;
    let spanText = 'No time axis';
    let historicityReasons = [];
    const dateCol = dataset.virtualDateColKey || dataset.sortedByCol;
    if (!dateCol) {
      historicity = 40;
      historicityReasons.push('No datetime or sequential time index detected in columns.');
    } else {
      const dates = activeRows.map(r => r[dateCol]).filter(Boolean);
      if (dates.length < 5) {
        historicity = 30;
        historicityReasons.push('Insufficient observations on time axis.');
      } else {
        const parsedDates = dates.map(d => {
          if (String(d).includes('-')) {
            const pts = String(d).split('-');
            if (pts[1] && isNaN(Number(pts[1]))) {
              const mStr = pts[1].toLowerCase().substring(0,3);
              const mNum = MONTH_MAP[mStr] || 1;
              return new Date(pts[0], mNum - 1, 1);
            }
          }
          return new Date(d);
        }).filter(d => !isNaN(d.getTime()));

        if (parsedDates.length > 0) {
          parsedDates.sort((a,b) => a.getTime() - b.getTime());
          const minDate = parsedDates[0];
          const maxDate = parsedDates[parsedDates.length - 1];
          const spanDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24));
          const months = (spanDays / 30.4).toFixed(1);
          spanText = `${months} months of continuous data (${minDate.toISOString().slice(0,10)} to ${maxDate.toISOString().slice(0,10)})`;
          
          if (spanDays < 90) {
            historicity -= 40;
            historicityReasons.push(`Short time span of ${spanDays} days (under 90 days recommended).`);
          } else if (spanDays < 365) {
            historicity -= 20;
            historicityReasons.push(`Dataset covers ${spanDays} days (approx. ${months} months). Recommend at least 12 months for seasonality.`);
          } else {
            historicityReasons.push(`Excellent dataset span of ${months} months.`);
          }
          
          const n = activeRows.length;
          const chunk1 = activeRows.slice(0, Math.floor(n / 3));
          const chunk3 = activeRows.slice(Math.floor(2 * n / 3));
          const countNulls = (chunk) => {
            let cells = chunk.length * cols.length;
            if (cells === 0) return 0;
            let nls = 0;
            chunk.forEach(r => {
              cols.forEach(c => {
                const v = r[c.name];
                if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') nls++;
              });
            });
            return nls / cells;
          };
          const rate1 = countNulls(chunk1);
          const rate3 = countNulls(chunk3);
          if (rate3 > rate1 + 0.05) {
            const diffPct = ((rate3 - rate1) * 100).toFixed(1);
            historicity -= 20;
            historicityReasons.push(`Increasing missingness trend: nulls grew by ${diffPct}% in later parts of the dataset.`);
          } else {
            historicityReasons.push('Missingness rate remains stable throughout the time series.');
          }
        } else {
          historicity = 40;
          historicityReasons.push('Time axis values could not be parsed as valid dates.');
        }
      }
    }
    historicity = Math.max(0, Math.min(100, Math.round(historicity)));

    // 3. Granularity Score
    let granularity = 100;
    let granularityReasons = [];
    if (!dateCol) {
      granularity = 30;
      granularityReasons.push('No date index available to evaluate step frequency.');
    } else {
      const dates = activeRows.map(r => r[dateCol]).filter(Boolean);
      const uniqueDates = new Set(dates).size;
      const totalCount = activeRows.length;
      const duplicatesCount = totalCount - uniqueDates;
      
      if (duplicatesCount > 0) {
        granularity -= Math.min(50, (duplicatesCount / totalCount) * 80);
        granularityReasons.push(`Duplicate timestamps: ${duplicatesCount} rows share matching time periods. This indicates transactional grain.`);
        granularityReasons.push('Requires Group-By Aggregation downstream to aggregate target labels before forecasting.');
      } else {
        granularityReasons.push('No duplicate timestamps found; data is at a single timeline grain.');
      }

      const parsedDates = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
      if (parsedDates.length > 5) {
        const diffs = [];
        for (let i = 1; i < parsedDates.length; i++) {
          const diffMs = parsedDates[i] - parsedDates[i - 1];
          diffs.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
        }
        const counts = {};
        diffs.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
        const maxCount = Math.max(...Object.values(counts));
        const commonDiff = Number(Object.keys(counts).find(k => counts[k] === maxCount));
        const regularRatio = maxCount / diffs.length;
        if (regularRatio < 0.7) {
          granularity -= (1 - regularRatio) * 30;
          granularityReasons.push(`Irregular sampling intervals: only ${(regularRatio * 100).toFixed(0)}% of periods are regular.`);
        } else {
          granularityReasons.push(`Regular sampling interval of ${commonDiff} day(s) detected (${(regularRatio * 100).toFixed(0)}% consistency).`);
        }
      }
    }
    granularity = Math.max(0, Math.min(100, Math.round(granularity)));

    const readiness = Math.round((value + historicity + granularity) / 3);

    return {
      granularity,
      historicity,
      value,
      readiness,
      spanText,
      explanation: {
        value: [
          `Overall data completeness: ${(100 - (totalNulls / (totalCells || 1)) * 100).toFixed(1)}%`,
          `Total null/missing values: ${totalNulls} out of ${totalCells} cells`,
          value < 85 ? 'High rate of missing values could skew predictions; imputations recommended.' : 'High completeness rate ensures stable predictions.'
        ],
        historicity: historicityReasons,
        granularity: granularityReasons
      }
    };
  }, [dataset]);

  const getPreTargetCleaningFindings = useMemo(() => {
    if (!dataset) return [];

    const activeRows = dataset.sampleRows || [];
    const cols = dataset.columnsInfo || [];
    const findings = [];

    // 1. Schema Issues (type mismatches)
    cols.forEach(col => {
      let mismatchCount = 0;
      let sampleMismatches = [];
      
      activeRows.forEach(row => {
        const v = row[col.name];
        if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') return;
        
        if (col.type === 'numeric') {
          const cleanStr = String(v).replace(/[^0-9.\-]/g, '');
          if (isNaN(parseFloat(cleanStr)) || /[a-zA-Z]/.test(String(v))) {
            mismatchCount++;
            if (sampleMismatches.length < 3 && !sampleMismatches.includes(String(v))) {
              sampleMismatches.push(String(v));
            }
          }
        }
      });

      if (mismatchCount > 0) {
        findings.push({
          id: `schema_${col.name}`,
          type: 'Schema Issue',
          column: col.name,
          description: `Column has numeric type but contains ${mismatchCount} values with non-numeric characters (e.g. ${sampleMismatches.join(', ')}).`,
          suggestedAction: 'Clean non-numeric characters and parse as float',
          impact: 'High',
          actionKey: `schema_clean_${col.name}`
        });
      }
    });

    // 2. Missingness Patterns
    cols.forEach(col => {
      const nullsCount = activeRows.filter(row => {
        const v = row[col.name];
        return v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';
      }).length;
      const pct = (nullsCount / activeRows.length) * 100;
      
      if (pct > 0) {
        const isStructural = pct > 15;
        findings.push({
          id: `missing_${col.name}`,
          type: 'Missingness',
          column: col.name,
          description: `${nullsCount} rows (${pct.toFixed(1)}%) are empty. Pattern: ${isStructural ? 'Structural/Systematic' : 'Random Missingness'}.`,
          suggestedAction: isStructural ? 'Impute with Mode or constant value' : 'Impute with Mean / Median',
          impact: pct > 30 ? 'High' : 'Medium',
          actionKey: `missing_impute_${col.name}`
        });
      }
    });

    // 3. Duplicate Rows
    const seen = new Set();
    let exactDuplicates = 0;
    let nearDuplicates = 0;
    
    const checkLimit = Math.min(activeRows.length, 100);
    for (let i = 0; i < checkLimit; i++) {
      const r1 = activeRows[i];
      const r1Str = JSON.stringify(r1);
      
      if (seen.has(r1Str)) {
        exactDuplicates++;
      } else {
        seen.add(r1Str);
      }

      for (let j = i + 1; j < checkLimit; j++) {
        const r2 = activeRows[j];
        let matches = 0;
        cols.forEach(col => {
          const v1 = r1[col.name];
          const v2 = r2[col.name];
          if (v1 === v2) {
            matches++;
          } else if (col.type === 'numeric') {
            const n1 = parseFloat(String(v1).replace(/[^0-9.\-]/g, ''));
            const n2 = parseFloat(String(v2).replace(/[^0-9.\-]/g, ''));
            if (!isNaN(n1) && !isNaN(n2) && Math.abs(n1 - n2) / (Math.abs(n1) + 1) < 0.001) {
              matches++;
            }
          }
        });
        const matchPct = matches / cols.length;
        if (matchPct >= 0.90 && matchPct < 1.0) {
          nearDuplicates++;
        }
      }
    }

    if (exactDuplicates > 0) {
      findings.push({
        id: `duplicates_exact`,
        type: 'Duplicate Rows',
        column: 'All Columns',
        description: `Found ${exactDuplicates} exact duplicate rows in the sample check.`,
        suggestedAction: 'Drop exact duplicate rows',
        impact: 'Medium',
        actionKey: 'dup_drop_exact'
      });
    }
    if (nearDuplicates > 0) {
      findings.push({
        id: `duplicates_near`,
        type: 'Duplicate Rows',
        column: 'All Columns',
        description: `Found ${nearDuplicates} near-duplicate rows sharing >=90% feature similarity.`,
        suggestedAction: 'Consolidate and drop duplicate records',
        impact: 'Low',
        actionKey: 'dup_drop_near'
      });
    }

    return findings;
  }, [dataset]);

  const getCleanedData = useMemo(() => {
    if (!dataset) return null;
    let rows = [...dataset.sampleRows];
    
    // Apply cleanings
    cleaningActionsAccepted.forEach(key => {
      if (key.startsWith('schema_clean_')) {
        const colName = key.replace('schema_clean_', '');
        rows = rows.map(r => {
          const val = r[colName];
          if (val === null || val === undefined) return r;
          const cleanStr = String(val).replace(/[^0-9.\-]/g, '');
          const floatVal = parseFloat(cleanStr);
          return { ...r, [colName]: isNaN(floatVal) ? null : floatVal };
        });
      } else if (key.startsWith('missing_impute_')) {
        const colName = key.replace('missing_impute_', '');
        const colMeta = dataset.columnsInfo.find(c => c.name === colName);
        
        let impVal = '';
        if (colMeta?.type === 'numeric') {
          const vals = rows.map(r => parseFloat(String(r[colName]).replace(/[^0-9.\-]/g, ''))).filter(v => !isNaN(v));
          impVal = vals.length > 0 ? vals.reduce((a,b)=>a+b, 0) / vals.length : 0;
        } else {
          impVal = 'Unknown';
        }
        
        rows = rows.map(r => {
          const val = r[colName];
          const isNull = val === null || val === undefined || String(val).trim() === '' || String(val).toLowerCase() === 'null';
          return isNull ? { ...r, [colName]: impVal } : r;
        });
      } else if (key === 'dup_drop_exact') {
        const unique = [];
        const seen = new Set();
        rows.forEach(r => {
          const str = JSON.stringify(r);
          if (!seen.has(str)) {
            seen.add(str);
            unique.push(r);
          }
        });
        rows = unique;
      } else if (key === 'dup_drop_near') {
        const unique = [];
        rows.forEach(r => {
          let isNear = false;
          for (let u of unique) {
            let matches = 0;
            dataset.columnsInfo.forEach(col => {
              if (r[col.name] === u[col.name]) matches++;
            });
            if (matches / dataset.columnsInfo.length >= 0.90) {
              isNear = true;
              break;
            }
          }
          if (!isNear) {
            unique.push(r);
          }
        });
        rows = unique;
      }
    });

    return {
      ...dataset,
      sampleRows: rows,
      rows: rows.length
    };
  }, [dataset, cleaningActionsAccepted]);


  const fetchTrainingHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const r = await fetch('http://localhost:7860/api/history', {
        headers: {
          'X-Session-ID': authToken
        }
      });
      if (r.ok) {
        const data = await r.json();
        setTrainingHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load training history:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchProjects = async () => {
    setIsProjectsLoading(true);
    try {
      const r = await fetch(`http://localhost:7860/api/projects?user_id=${authUsername}`, {
        headers: {
          'X-Session-ID': authToken
        }
      });
      if (r.ok) {
        const data = await r.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsProjectsLoading(false);
    }
  };

  const saveProject = async (projectName, isUpdate = false, singleInstanceId = null, completed = 0) => {
    setSaveError('');
    try {
      // Filter instances if saving a single target
      const instancesToSave = singleInstanceId 
        ? instances.filter(inst => inst.id === singleInstanceId)
        : instances;
      
      // Filter results if saving a single target
      const resultsToSave = singleInstanceId
        ? Object.fromEntries(
            Object.entries(instancesResults).filter(([key]) => key === singleInstanceId)
          )
        : instancesResults;

      const projectState = {
        instances: instancesToSave,
        featureSelections: singleInstanceId 
          ? Object.fromEntries(
              Object.entries(featureSelections).filter(([key]) => instancesToSave.some(inst => inst.id === key))
            )
          : featureSelections,
        groupByColumns,
        oneHotColumns,
        normalizationStrategies: singleInstanceId
          ? Object.fromEntries(
              Object.entries(normalizationStrategies).filter(([key]) => instancesToSave.some(inst => inst.id === key))
            )
          : normalizationStrategies,
        missingStrategies: singleInstanceId
          ? Object.fromEntries(
              Object.entries(missingStrategies).filter(([key]) => instancesToSave.some(inst => inst.id === key))
            )
          : missingStrategies,
        missingConstants: singleInstanceId
          ? Object.fromEntries(
              Object.entries(missingConstants).filter(([key]) => instancesToSave.some(inst => inst.id === key))
            )
          : missingConstants,
        timeSinCosMonth,
        timeSinCosWeekday,
        timeYearScaling,
        timeComponentToggles,
        customScenarios,
        forecastHorizon,
        forecastFrequency,
        useOptuna,
        optunaTrials,
        useFeaturePipeline,
        hyperparameters: singleInstanceId
          ? Object.fromEntries(
              Object.entries(hyperparameters).filter(([key]) => instancesToSave.some(inst => inst.id === key))
            )
          : hyperparameters,
        collapsedHypers: singleInstanceId
          ? Object.fromEntries(
              Object.entries(collapsedHypers).filter(([key]) => instancesToSave.some(inst => inst.id === key))
            )
          : collapsedHypers,
        userOverrides: instancesToSave.reduce((acc, inst) => ({
          ...acc,
          [inst.id]: inst.userOverrides || {}
        }), {}),
        cleaningActionsAccepted,
        pipelineValidity,
        currentPage: page
      };

      const resultsData = resultsToSave;

      const body = {
        name: projectName,
        user_id: authUsername,
        dataset_name: dataset?.name || dataset?.filename || 'Unknown Dataset',
        dataset_data: dataset,
        project_state: projectState,
        results_data: resultsData,
        instance_count: instancesToSave.length,
        completed: completed
      };

      const url = isUpdate && currentProjectId 
        ? `http://localhost:7860/api/projects/${currentProjectId}`
        : 'http://localhost:7860/api/projects';
      
      const method = isUpdate && currentProjectId ? 'PUT' : 'POST';

      const r = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': authToken
        },
        body: JSON.stringify(body)
      });

      if (r.ok) {
        const data = await r.json();
        setCurrentProjectId(data.id);
        setCurrentProjectName(data.name);
        setShowSaveProjectDialog(false);
        setSaveProjectName('');
        await fetchProjects();
        return true;
      } else {
        const errorData = await r.json();
        setSaveError(errorData.detail || 'Failed to save project');
        return false;
      }
    } catch (err) {
      console.error("Failed to save project:", err);
      setSaveError('Network error while saving project');
      return false;
    }
  };

  const loadProject = async (projectId) => {
    try {
      const r = await fetch(`http://localhost:7860/api/projects/${projectId}`, {
        headers: {
          'X-Session-ID': authToken
        }
      });
      if (r.ok) {
        const data = await r.json();
        return data;
      }
    } catch (err) {
      console.error("Failed to load project:", err);
    }
    return null;
  };

  const handleExitToHomepage = async () => {
    // Guard condition: only save if dataset is loaded and user has progressed past step 1
    if (!dataset || page <= 1) {
      setIsMyProjectsPage(true);
      setPage(1);
      return;
    }

    // Completion check: don't autosave if project is complete (on page 10 with training results)
    const isProjectComplete = page === 10 && trainingResults && Object.keys(trainingResults).length > 0;
    if (isProjectComplete) {
      setIsMyProjectsPage(true);
      setPage(1);
      return;
    }

    // Determine project name
    const projectName = currentProjectName || `Untitled Project — ${new Date().toLocaleString()}`;

    // Save project (will use currentProjectId if exists, preventing duplicates)
    await saveProject(projectName, !!currentProjectId);

    // Navigate to homepage
    setIsMyProjectsPage(true);
    setPage(1);
  };

  useEffect(() => {
    // Fetch history for Page 2 (Saved Models dashboard panel) and Page 3 (reuse selector)
    if (page > 1) {
      fetchTrainingHistory();
    }
  }, [page]);

  useEffect(() => {
    // Fetch projects when on My Projects page
    if (isMyProjectsPage) {
      fetchProjects();
    }
  }, [isMyProjectsPage]);

  const deleteHistoryRun = async (runId) => {
    try {
      const r = await fetch(`http://localhost:7860/api/history/${runId}`, {
        method: 'DELETE',
        headers: {
          'X-Session-ID': authToken
        }
      });
      if (r.ok) {
        setTrainingHistory(prev => prev.filter(run => run.id !== runId));
      }
    } catch (err) {
      console.error("Failed to delete history run:", err);
    }
  };

  // Training states
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStatusText, setTrainingStatusText] = useState('');
  const [trainingResults, setTrainingResults] = useState(null);
  const [expandedTrainedModels, setExpandedTrainedModels] = useState({});

  // Memoized calculations
  const targetOptions = useMemo(() => {
    if (!dataset) return [];
    return dataset.columnsInfo
      .filter(col => col.type !== 'datetime')
      .map(col => col.name);
  }, [dataset]);

  const dateOptions = useMemo(() => {
    if (!dataset) return [];
    // Start with real datetime columns
    const options = dataset.columnsInfo
      .filter(col => col.type === 'datetime')
      .map(col => col.name);
    // Prepend the virtual date column only if one was actually generated
    if (dataset.virtualDateColKey && dataset.virtualDateColName) {
      options.unshift(dataset.virtualDateColKey);
    }
    return options;
  }, [dataset]);

  const chronologicalOrderOptions = useMemo(() => {
    if (!dataset) return [];

    const options = dataset.columnsInfo.filter(col => {
      if (col.type === 'datetime') return true;
      if (col.type === 'numeric' || col.type === 'categorical') {
        const nameLower = col.name.toLowerCase();
        return ['year', 'month', 'date', 'time', 'week', 'quarter', 'period'].some(kw => nameLower.includes(kw));
      }
      return false;
    }).map(col => col.name);

    // Prepend virtual date column if one was generated from multi-component columns
    if (dataset.virtualDateColKey && dataset.virtualDateColName) {
      options.unshift(dataset.virtualDateColKey);
    }

    return options;
  }, [dataset]);

  const categoricalOptions = useMemo(() => {
    if (!dataset) return [];
    return dataset.columnsInfo
      .filter(col => col.type === 'categorical')
      .map(col => col.name);
  }, [dataset]);

  const missingValueColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columnsInfo.filter(col => col.missing > 0);
  }, [dataset]);

  const totalMissingCount = useMemo(() => {
    return missingValueColumns.length;
  }, [missingValueColumns]);

  const recommendedModelsList = useMemo(() => {
    if (!goal) return [];
    return MODEL_REGISTRY[goal] || [];
  }, [goal]);

  const featureStatuses = useMemo(() => {
    return computeFeatureStatuses(dataset, targetColumn, dateColumn);
  }, [dataset, targetColumn, dateColumn]);

  const selectedFeaturesList = useMemo(() => {
    return Object.keys(featureSelections).filter(key => featureSelections[key]);
  }, [featureSelections]);

  const orderedColumns = useMemo(() => {
    if (!dataset) return [];
    const targetCol = targetColumn;
    const targets = dataset.columnsInfo.filter(c => c.name === targetCol);
    const nonTargets = dataset.columnsInfo.filter(c => c.name !== targetCol);
    return [...targets, ...nonTargets];
  }, [dataset, targetColumn]);

  const categorizedColumns = useMemo(() => {
    if (!dataset) return {
      'ID Features': [],
      'Date/Time Features': [],
      'Categorical Features': [],
      'Influencing Features': []
    };

    const groups = {
      'ID Features': [],
      'Date/Time Features': [],
      'Categorical Features': [],
      'Influencing Features': []
    };

    orderedColumns.forEach(col => {
      const nameLower = col.name.toLowerCase();
      const uniqueRatio = col.uniqueCount / dataset.rows;
      const isIdField = (uniqueRatio > 0.95 && dataset.rows > 15) ||
        nameLower.includes('id') ||
        nameLower === 'key';

      if (isIdField && col.type !== 'datetime') {
        groups['ID Features'].push(col);
      } else if (col.type === 'datetime' ||
        nameLower.includes('date') ||
        nameLower.includes('time') ||
        nameLower.includes('timestamp') ||
        nameLower.includes('year') ||
        nameLower.includes('month') ||
        nameLower.includes('day')) {
        groups['Date/Time Features'].push(col);
      } else if (col.type === 'categorical') {
        groups['Categorical Features'].push(col);
      } else {
        groups['Influencing Features'].push(col);
      }
    });

    return groups;
  }, [orderedColumns, dataset]);

  const estimatedOutputRows = useMemo(() => {
    if (!dataset) return 0;
    if (!applyAggregation || groupByColumns.length === 0) return dataset.rows;

    // Estimate combination of group by unique counts
    let product = 1;
    groupByColumns.forEach(colName => {
      const colMeta = dataset.columnsInfo.find(c => c.name === colName);
      if (colMeta) {
        product *= colMeta.uniqueCount;
      }
    });

    // Capped at dataset.rows
    return Math.min(dataset.rows, product);
  }, [dataset, applyAggregation, groupByColumns]);

  const pandasPreviewCode = useMemo(() => {
    const groupbyStr = groupByColumns.map(c => `'${c}'`).join(', ');

    // Aggregation table rows: selectedFeaturesList MINUS groupByColumns MINUS targetColumn
    const aggCols = selectedFeaturesList.filter(f => !groupByColumns.includes(f) && f !== targetColumn);

    const lines = aggCols.map(col => {
      const colMeta = dataset?.columnsInfo.find(c => c.name === col);
      const colType = colMeta ? colMeta.type : 'numeric';
      const fn = customAggMappings[col] || inferAggFunction(col, colType, dataset);
      return `    ${col} = ('${col}', '${fn}')`;
    });

    const linesStr = lines.join(',\n');

    return `agg_df = df.groupby([${groupbyStr}]).agg(\n${linesStr}\n).reset_index()`;
  }, [groupByColumns, selectedFeaturesList, customAggMappings, targetColumn, dataset]);

  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    let rows = dataset.sampleRows || [];
    if (overviewSearch.trim()) {
      const q = overviewSearch.toLowerCase();
      rows = rows.filter(row => {
        return Object.values(row).some(val => String(val ?? '').toLowerCase().includes(q));
      });
    }
    if (overviewSortCol) {
      const isAsc = overviewSortDirection === 'asc';
      rows = [...rows].sort((a, b) => {
        let valA = a[overviewSortCol];
        let valB = b[overviewSortCol];
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return isAsc ? numA - numB : numB - numA;
        } else {
          const strA = String(valA ?? '').toLowerCase();
          const strB = String(valB ?? '').toLowerCase();
          if (strA < strB) return isAsc ? -1 : 1;
          if (strA > strB) return isAsc ? 1 : -1;
          return 0;
        }
      });
    }
    return rows;
  }, [dataset, overviewSearch, overviewSortCol, overviewSortDirection]);

  const detectedTimeComponents = useMemo(() => {
    if (!dataset) return [];
    const components = [];

    const isValidDate = (v) => {
      if (v === null || v === undefined) return false;
      const strVal = String(v).trim();
      if (strVal.length <= 5 || !isNaN(Number(strVal))) return false;
      const parsed = Date.parse(strVal);
      return !isNaN(parsed);
    };

    dataset.columnsInfo.forEach(col => {
      const firstNonNull = col.samples ? col.samples.find(s => s !== null && s !== undefined && String(s).trim() !== '') : null;
      const isDatetime = col.type === 'datetime' || isValidDate(firstNonNull);

      if (isDatetime) {
        components.push({
          id: `${col.name}_month`,
          componentType: 'month',
          colName: col.name,
          label: 'Month',
          defaultChecked: true
        });
        components.push({
          id: `${col.name}_day_of_week`,
          componentType: 'day-of-week',
          colName: col.name,
          label: 'Day of Week',
          defaultChecked: true
        });
        components.push({
          id: `${col.name}_year`,
          componentType: 'year',
          colName: col.name,
          label: 'Year',
          defaultChecked: true
        });
        components.push({
          id: `${col.name}_day`,
          componentType: 'day of month',
          colName: col.name,
          label: 'Day of Month',
          defaultChecked: false
        });
        components.push({
          id: `${col.name}_hour`,
          componentType: 'hour',
          colName: col.name,
          label: 'Hour',
          defaultChecked: false
        });
        components.push({
          id: `${col.name}_quarter`,
          componentType: 'quarter',
          colName: col.name,
          label: 'Quarter',
          defaultChecked: false
        });
      } else if (col.type === 'numeric' || col.type === 'categorical') {
        const nameLower = col.name.toLowerCase();
        const keywords = ['month', 'year', 'day', 'hour', 'week', 'quarter', 'dow', 'weekday'];
        const matchedKw = keywords.find(kw => nameLower.includes(kw));
        if (matchedKw) {
          let componentType = 'month';
          let label = 'Month';
          let defaultChecked = true;

          if (nameLower.includes('year')) {
            componentType = 'year';
            label = 'Year';
            defaultChecked = true;
          } else if (nameLower.includes('weekday') || nameLower.includes('dow')) {
            componentType = 'day-of-week';
            label = 'Day of Week';
            defaultChecked = true;
          } else if (nameLower.includes('week')) {
            componentType = 'week';
            label = 'Week of Year';
            defaultChecked = true;
          } else if (nameLower.includes('day')) {
            componentType = 'day of month';
            label = 'Day of Month';
            defaultChecked = false;
          } else if (nameLower.includes('hour')) {
            componentType = 'hour';
            label = 'Hour';
            defaultChecked = false;
          } else if (nameLower.includes('quarter')) {
            componentType = 'quarter';
            label = 'Quarter';
            defaultChecked = false;
          }

          components.push({
            id: col.name,
            componentType,
            colName: col.name,
            label,
            defaultChecked
          });
        }
      }
    });
    return components;
  }, [dataset]);

  // Synchronize state when components are detected
  useEffect(() => {
    const defaultToggles = {};
    const defaultEncodings = {};
    detectedTimeComponents.forEach(comp => {
      defaultToggles[comp.id] = comp.defaultChecked;
      if (comp.componentType === 'year') {
        defaultEncodings[comp.id] = 'minmax';
      } else {
        defaultEncodings[comp.id] = 'sincos';
      }
    });
    setTimeComponentToggles(defaultToggles);
    setTimeComponentEncodings(defaultEncodings);
  }, [detectedTimeComponents]);

  // Adjust CV Strategy if task goal changes
  useEffect(() => {
    if (goal !== 'forecasting' && cvStrategy === 'timeseries') {
      setCvStrategy('kfold');
    }
  }, [goal, cvStrategy]);

  // Initialize predictInputs dynamically based on selected features
  useEffect(() => {
    if (!dataset) return;
    const initial = {};
    selectedFeaturesList.forEach(feat => {
      const colMeta = dataset.columnsInfo.find(c => c.name === feat);
      if (colMeta) {
        if (colMeta.type === 'numeric') {
          initial[feat] = '';
        } else if (colMeta.type === 'datetime') {
          initial[feat] = '';
        } else {
          // Categorical
          // Get first sample value as default
          const samples = dataset.sampleRows.map(r => r[feat]).filter(v => v !== null && v !== undefined);
          initial[feat] = samples[0] || '';
        }
      }
    });
    setPredictInputs(initial);
    setPredictionResults(null);
  }, [selectedFeaturesList, dataset]);



  // Default first model in inventory on open
  useEffect(() => {
    if (isModelInventoryOpen && !selectedInventoryModel) {
      setSelectedInventoryModel(MODEL_REGISTRY.classification[0]);
    }
  }, [isModelInventoryOpen, selectedInventoryModel]);



  // Sync dark mode style on document root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [darkMode]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [page]);

  // ==========================================
  // HELPERS & DYNAMIC CALCULATIONS
  // ==========================================


  // Compute correlation for a specific feature column relative to target
  const getFeatureCorrelation = (colName) => {
    if (!dataset || !targetColumn || targetColumn === 'none') return 0;

    // Check if hardcoded in sample dataset
    if (SAMPLE_DATASETS[dataset.id] && SAMPLE_DATASETS[dataset.id].defaultTarget === targetColumn) {
      const corr = SAMPLE_DATASETS[dataset.id].correlations[colName];
      if (corr !== undefined) return corr;
    }

    // Otherwise calculate dynamically
    return calculatePearsonCorrelation(dataset.sampleRows, colName, targetColumn);
  };



  // Sync feature selections when featureStatuses changes — guard against reference-only changes
  const featureStatusesKeyRef = useRef('');
  const featureAutoSelectRef = useRef({});
  useEffect(() => {
    if (!dataset) return;
    const keysSorted = Object.keys(featureStatuses).sort().join(',');
    if (keysSorted === featureStatusesKeyRef.current) return; // Nothing structurally changed
    featureStatusesKeyRef.current = keysSorted;
    const initialSelections = {};
    Object.keys(featureStatuses).forEach(name => {
      initialSelections[name] = featureStatuses[name].recommend;
    });
    setFeatureSelections(initialSelections);
  }, [featureStatuses, dataset]);

  // Auto-select features when entering feature selection page
  useEffect(() => {
    if (page === 7 && dataset && instances.length > 0) {
      instances.forEach((inst, idx) => {
        // Only auto-select if this instance hasn't been auto-selected before and has no features
        const autoSelectKey = `${inst.id}_${inst.target}`;
        if (!featureAutoSelectRef.current[autoSelectKey] && (!inst.features || inst.features.length === 0)) {
          const eligibleFeatures = dataset.columnsInfo.filter(c => {
            if (c.name === inst.target) return false;
            if (String(c.name).toLowerCase() === 'id') return false;
            return true;
          });

          // Auto-select by correlation threshold
          const autoFeats = eligibleFeatures
            .filter(c => {
              const corr = Math.abs(calculatePearsonCorrelation(dataset.sampleRows, c.name, inst.target) || 0);
              return corr > 0.05 || c.type === 'datetime';
            })
            .map(c => c.name);
          const finalFeats = autoFeats.length > 0 ? autoFeats : eligibleFeatures.filter(c => {
            const nl = c.name.toLowerCase();
            return !nl.includes('id') && c.type !== 'datetime';
          }).map(c => c.name);

          setInstances(prev => prev.map((item, i) => i === idx ? { ...item, features: finalFeats } : item));
          featureAutoSelectRef.current[autoSelectKey] = true;
        }
      });
    }
  }, [page, dataset, instances]);

  const prevFeaturesRef = useRef([]);
  useEffect(() => {
    if (!dataset) return;

    const prevFeatures = prevFeaturesRef.current;
    const added = selectedFeaturesList.filter(f => !prevFeatures.includes(f));
    const removed = prevFeatures.filter(f => !selectedFeaturesList.includes(f));

    prevFeaturesRef.current = selectedFeaturesList;

    // 1. Synchronize One-Hot Encoding
    setOneHotColumns(prev => {
      // Remove features no longer selected
      let updated = prev.filter(c => selectedFeaturesList.includes(c));
      // Auto-add newly added categorical features (excluding calendar/temporal columns)
      added.forEach(f => {
        const col = dataset.columnsInfo.find(c => c.name === f);
        const colLower = f.toLowerCase();
        const isCalendarCol = colLower.includes('year') || colLower.includes('month') || colLower.includes('quarter') || colLower.includes('week') || colLower.includes('day') || colLower.includes('hour') || colLower.includes('date') || colLower.includes('time');
        if (col && col.type === 'categorical' && !isCalendarCol && !updated.includes(f)) {
          updated.push(f);
        }
      });
      return updated;
    });

    // 2. Synchronize Time Feature Encoding
    setTimeComponentToggles(prev => {
      const updated = { ...prev };
      // Disable components for features removed (except dateColumn)
      removed.forEach(f => {
        if (f !== dateColumn) {
          detectedTimeComponents.forEach(comp => {
            if (comp.colName === f) {
              updated[comp.id] = false;
            }
          });
        }
      });
      // Enable components for newly added datetime/time features
      added.forEach(f => {
        detectedTimeComponents.forEach(comp => {
          if (comp.colName === f) {
            updated[comp.id] = comp.defaultChecked;
          }
        });
      });
      return updated;
    });
  }, [selectedFeaturesList, dataset, dateColumn, detectedTimeComponents]);


  const addYearMonthVirtualColumn = (db) => {
    if (!db || !db.sampleRows || db.sampleRows.length === 0) return db;
    if (db.virtualDateColKey) return db; // already processed

    // ─── Step 1: Detect the best available temporal column ───────────────────
    const cols = db.columnsInfo;
    const rows = db.sampleRows;

    // Month name→number map (used in multiple places)
    const MONTH_MAP = {
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
      'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
      'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    };

    // Quarter string helper: "Q1"→1, "Q3"→3
    const parseQuarter = (s) => {
      const m = String(s).match(/q(\d)/i);
      return m ? parseInt(m[1], 10) : null;
    };

    // Score how "temporal" a column looks based on name + sample values
    const scoreColumn = (col) => {
      let score = 0;
      const nl = col.name.toLowerCase();
      if (col.type === 'datetime') score += 100;
      if (nl === 'date' || nl === 'timestamp') score += 80;
      if (nl.includes('date') || nl.includes('time') || nl.includes('period')) score += 40;
      if (nl === 'year') score += 30;
      if (nl.includes('year')) score += 20;
      if (nl === 'month') score += 25;
      if (nl.includes('month')) score += 15;
      if (nl.includes('week') || nl.includes('quarter')) score += 20;

      // Sample 10 values to see how many parse as valid dates/numbers
      const sample = rows.slice(0, 10).map(r => r[col.name]).filter(v => v !== null && v !== undefined && v !== '');
      const validDates = sample.filter(v => {
        const d = new Date(v); return !isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2200;
      }).length;
      score += validDates * 5;

      return score;
    };

    // Find year col and month col by name (fuzzy check)
    const yearCol = cols.find(c => {
      const name = c.name.toLowerCase();
      return name === 'year' || name === 'yr' || name === 'calendar_year' || name === 'cal_year' || name === 'transaction_year' || name === 'invoice_year' || name.endsWith('_year') || name.endsWith('_yr');
    })?.name;

    const monthCol = cols.find(c => {
      const name = c.name.toLowerCase();
      if (yearCol && c.name === yearCol) return false;
      return name === 'month' || name === 'mth' || name === 'mo' || name === 'calendar_month' || name === 'cal_month' || name === 'transaction_month' || name === 'invoice_month' || name.endsWith('_month') || name.endsWith('_mth') || name.endsWith('_mo');
    })?.name;

    const weekCol = cols.find(c => {
      const name = c.name.toLowerCase();
      return name === 'week' || name === 'week_number' || name.endsWith('_week') || name.endsWith('_week_number');
    })?.name;

    const quarterCol = cols.find(c => {
      const name = c.name.toLowerCase();
      return name === 'quarter' || name === 'qtr' || name.endsWith('_quarter') || name.endsWith('_qtr');
    })?.name;

    // Best single date/datetime candidate
    const dateCandidate = [...cols]
      .filter(c => scoreColumn(c) > 0)
      .sort((a, b) => scoreColumn(b) - scoreColumn(a))[0];

    // ─── Step 2: Build a sort-key function for each row ───────────────────────
    // Returns a comparable numeric value (milliseconds epoch or composite number)
    let sortKeyFn = null;
    let sortedByCol = null;  // human-readable label for the UI
    let generateYearMonthFn = null; // generates the "YYYY-MM" label for the virtual column

    if (yearCol && monthCol) {
      // Year + Month columns
      sortedByCol = `${yearCol} + ${monthCol}`;
      sortKeyFn = (row) => {
        const y = Number(row[yearCol]) || 0;
        const mRaw = row[monthCol];
        const mStr = String(mRaw).trim().toLowerCase();
        const mNum = MONTH_MAP[mStr] || (isNaN(Number(mRaw)) ? 1 : Number(mRaw));
        return y * 100 + mNum;
      };
      generateYearMonthFn = (row) => {
        const y = row[yearCol];
        const mRaw = row[monthCol];
        if (y === null || y === undefined || mRaw === null || mRaw === undefined) return 'Unknown';
        const mStr = String(mRaw).trim().toLowerCase();
        const mNum = MONTH_MAP[mStr] || (isNaN(Number(mRaw)) ? 1 : Number(mRaw));
        return `${y}-${String(mNum).padStart(2, '0')}`;
      };

    } else if (yearCol && quarterCol) {
      // Year + Quarter columns
      sortedByCol = `${yearCol} + ${quarterCol}`;
      sortKeyFn = (row) => {
        const y = Number(row[yearCol]) || 0;
        const q = parseQuarter(row[quarterCol]) || 1;
        return y * 10 + q;
      };
      generateYearMonthFn = (row) => {
        const y = row[yearCol];
        const q = parseQuarter(row[quarterCol]) || 1;
        if (!y) return 'Unknown';
        return `${y}-Q${q}`;
      };

    } else if (yearCol && weekCol) {
      // Year + Week columns
      sortedByCol = `${yearCol} + ${weekCol}`;
      sortKeyFn = (row) => {
        const y = Number(row[yearCol]) || 0;
        const w = Number(row[weekCol]) || 0;
        return y * 1000 + w;
      };
      generateYearMonthFn = (row) => {
        const y = row[yearCol]; const w = row[weekCol];
        if (!y) return 'Unknown';
        return `${y}-W${String(w).padStart(2, '0')}`;
      };

    } else if (yearCol && !monthCol) {
      // Year column only
      sortedByCol = yearCol;
      sortKeyFn = (row) => Number(row[yearCol]) || 0;
      generateYearMonthFn = (row) => {
        const y = row[yearCol];
        return y !== null && y !== undefined ? String(y) : 'Unknown';
      };

    } else if (dateCandidate) {
      const colName = dateCandidate.name;
      sortedByCol = colName;

      // Try to auto-detect format from first non-null sample
      const firstSample = rows.find(r => r[colName] !== null && r[colName] !== undefined && r[colName] !== '')?.[colName];
      const sampleStr = firstSample !== undefined ? String(firstSample).trim() : '';

      // Pattern: "YYYY-MM", "YYYY-MM-DD", ISO timestamps
      const looksLikeISO = /^\d{4}[-/]\d{2}/.test(sampleStr);
      // Pattern: "Jan-2023", "Jan 2023", "January 2023"
      const looksLikeMonthYear = /^[a-zA-Z]{3,9}[\s\-]\d{4}$/.test(sampleStr);
      // Pattern: "2023-Q1", "Q1-2023"
      const looksLikePeriod = /q\d/i.test(sampleStr);
      // Pattern: "2023 W05"
      const looksLikeWeek = /\bw\d{1,2}\b/i.test(sampleStr);

      if (looksLikePeriod) {
        sortKeyFn = (row) => {
          const v = String(row[colName] || '');
          const yMatch = v.match(/(\d{4})/);
          const qMatch = v.match(/q(\d)/i);
          const y = yMatch ? parseInt(yMatch[1], 10) : 0;
          const q = qMatch ? parseInt(qMatch[1], 10) : 0;
          return y * 10 + q;
        };
        generateYearMonthFn = (row) => {
          const v = String(row[colName] || '');
          return v || 'Unknown';
        };

      } else if (looksLikeWeek) {
        sortKeyFn = (row) => {
          const v = String(row[colName] || '');
          const yMatch = v.match(/(\d{4})/);
          const wMatch = v.match(/w(\d{1,2})/i);
          const y = yMatch ? parseInt(yMatch[1], 10) : 0;
          const w = wMatch ? parseInt(wMatch[1], 10) : 0;
          return y * 1000 + w;
        };
        generateYearMonthFn = (row) => String(row[colName] || 'Unknown');

      } else if (looksLikeMonthYear) {
        sortKeyFn = (row) => {
          const v = String(row[colName] || '').trim();
          const parts = v.split(/[\s\-]/);
          const mStr = parts[0].toLowerCase().substring(0, 3);
          const y = parseInt(parts[1] || parts[0], 10) || 0;
          const m = MONTH_MAP[mStr] || 1;
          return y * 100 + m;
        };
        generateYearMonthFn = (row) => {
          const v = String(row[colName] || '').trim();
          if (!v) return 'Unknown';
          const parts = v.split(/[\s\-]/);
          const mStr = parts[0].toLowerCase().substring(0, 3);
          const y = parts[1] || parts[0];
          const mNum = MONTH_MAP[mStr] || 1;
          return `${y}-${String(mNum).padStart(2, '0')}`;
        };

      } else if (looksLikeISO) {
        // Standard ISO date/datetime → parse with Date
        sortKeyFn = (row) => {
          const v = row[colName];
          if (!v) return 0;
          const d = new Date(v);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        generateYearMonthFn = (row) => {
          const v = row[colName];
          if (!v) return 'Unknown';
          const d = new Date(v);
          if (isNaN(d.getTime())) return 'Unknown';
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

      } else {
        // Generic fallback: try Date() parse
        sortKeyFn = (row) => {
          const v = row[colName];
          if (!v) return 0;
          const d = new Date(v);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        generateYearMonthFn = (row) => {
          const v = row[colName];
          if (!v) return 'Unknown';
          const d = new Date(v);
          if (isNaN(d.getTime())) return String(v);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
      }
    }

    // ─── Step 3: Sort rows by temporal key (ascending) ────────────────────────
    let enrichedRows = rows.map(row => ({ ...row }));

    if (sortKeyFn) {
      enrichedRows.sort((a, b) => sortKeyFn(a) - sortKeyFn(b));
    }
    // If no temporal signal found, preserve upload order (do not scramble)

    // ─── Step 4: Add virtual date column ONLY for multi-component cases ──────
    // (Year+Month, Year+Quarter, Year+Week). Single datetime columns don't
    // need a virtual wrapper — we sort them directly and return without adding
    // a redundant derived column.
    if (!generateYearMonthFn || !sortedByCol || !sortedByCol.includes('+')) {
      // Single date column or no date at all: sort only, no virtual col
      return { ...db, sampleRows: enrichedRows, sortedByCol: sortedByCol || null, virtualDateColKey: null, virtualDateColName: null };
    }

    // Determine a human-readable display name for the virtual column
    const virtualColDisplayName = sortedByCol; // e.g. "Year + Month", "Year + Quarter", "Year + Week"
    const VIRTUAL_DATE_KEY = '__vd__';

    enrichedRows = enrichedRows.map(row => ({
      ...row,
      [VIRTUAL_DATE_KEY]: generateYearMonthFn(row),
    }));

    const uniqueValues = new Set(enrichedRows.map(r => r[VIRTUAL_DATE_KEY]).filter(v => v !== 'Unknown'));
    const samples = enrichedRows.slice(0, 5).map(r => r[VIRTUAL_DATE_KEY]);
    const newColInfo = {
      name: virtualColDisplayName,
      type: 'categorical',
      nullPercent: parseFloat(((enrichedRows.filter(r => r[VIRTUAL_DATE_KEY] === 'Unknown').length / enrichedRows.length) * 100).toFixed(1)),
      uniqueCount: uniqueValues.size,
      missing: enrichedRows.filter(r => r[VIRTUAL_DATE_KEY] === 'Unknown').length,
      samples,
    };

    return {
      ...db,
      columnsInfo: [newColInfo, ...db.columnsInfo],
      sampleRows: enrichedRows,
      sortedByCol: sortedByCol || null,
      virtualDateColKey: VIRTUAL_DATE_KEY,
      virtualDateColName: virtualColDisplayName,
    };
  };

  const convertToCSV = (rows) => {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const headerLine = headers.join(',');
    const rowLines = rows.map(r => 
      headers.map(h => {
        let val = r[h];
        if (val === null || val === undefined) return '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      }).join(',')
    );
    return [headerLine, ...rowLines].join('\n');
  };

  const fetchBackendRecommendations = async (db) => {
    if (!db || !db.sampleRows) return;
    try {
      const csvContent = convertToCSV(db.sampleRows);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], db.name + '.csv', { type: 'text/csv' });
      const fd = new FormData();
      fd.append('file', file);
      
      const r = await fetch('http://localhost:7860/api/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.suggested_targets) {
        setBackendTargetRecs({
          candidates: d.suggested_targets,
          multi_target_flag: d.multi_target_flag,
          confidence_tier: d.confidence_tier
        });
      }
    } catch (e) {
      console.warn("Backend recommendations offline, using JS fallback", e);
      setBackendTargetRecs(null);
    }
  };

  const handleDatasetSelect = (selectedDb) => {
    const enrichedDb = addYearMonthVirtualColumn(selectedDb);
    setDataset(enrichedDb);
    setBackendTargetRecs(null);
    hasAutoSelectedRef.current = false;
    fetchBackendRecommendations(enrichedDb);
    setSelectedProductFilter('__all__');
    setSelectedCatGroupCols([]);
    setSelectedCatMetricCol('');
    setCatChartView('avg');
    // Reset visible columns to first 4 for the new dataset
    setVisibleColNames(enrichedDb.columnsInfo.slice(0, 4).map(c => c.name));


    if (selectedDb.task === 'clustering') {
      setGoal('clustering');
      setTargetColumn('none');
      setTargetConfirmed(true);
      setSelectedModelOverride('kmeans_clust');
      setSelectedModels(['kmeans_clust', 'dbscan_clust']);
      setDateColumn('');
      setSplitMethod('random');
      setProblemSubtype('multiclass');
    } else {
      const recTarget = selectedDb.defaultTarget || detectTargetModelJS(selectedDb.columnsInfo, selectedDb.rows) || '';
      setTargetColumn(recTarget);
      setTargetConfirmed(true);

      const detected = autoDetectGoal(selectedDb, recTarget);
      setGoal(detected.goal);
      setProblemSubtype(detected.problemSubtype);
      setDateColumn(detected.dateColumn);

      if (detected.goal === 'forecasting') {
        setSplitMethod('chronological');
      } else {
        setSplitMethod('random');
      }

      const models = MODEL_REGISTRY[detected.goal] || [];
      let recModelId = models[0]?.id || '';
      if (detected.goal === 'classification') recModelId = 'rf_class';
      else if (detected.goal === 'regression') recModelId = selectedDb.rows >= 500 ? 'lgbm_reg' : 'rf_reg';
      else if (detected.goal === 'forecasting') recModelId = 'prophet_time';
      setSelectedModelOverride(recModelId);
      setSelectedModels(models.map(m => m.id));
      setUserOverrodeModel(false);
    }

    // Initialize Preprocessing configs
    const normInits = {};
    const missingInits = {};
    const missingConstInits = {};

    selectedDb.columnsInfo.forEach(col => {
      normInits[col.name] = 'none';
      missingInits[col.name] = col.type === 'numeric' ? 'mean' : 'mode';
      missingConstInits[col.name] = '';
    });

    setNormalizationStrategies(normInits);
    setMissingStrategies(missingInits);
    setMissingConstants(missingConstInits);

    // Initialize Hyperparameters
    const hyperInits = {};
    const collapseInits = {};
    (MODEL_REGISTRY[selectedDb.task] || []).forEach(m => {
      hyperInits[m.id] = { ...(m.hyperparameters || { epochs: 100, learning_rate: 0.1, batch_size: 32, regularization: 'none', lambda: 0.01, seed: 42 }) };
      collapseInits[m.id] = true;
    });
    setHyperparameters(hyperInits);
    setCollapsedHypers(collapseInits);

    // Reset Aggregations & Time cyclical encoding
    setGroupByColumns([]);
    setApplyAggregation(false);
    setCustomAggMappings({});
    setTimeSinCosMonth(false);
    setTimeSinCosWeekday(false);
    setTimeYearScaling('none');
    setPredictionsPage(0);

    // Reset Data Overview Filters
    setOverviewSearch('');
    setOverviewSortCol('');
    setOverviewSortDirection('asc');
    setOverviewScrollTop(0);
  };

  // Reset all state for new project
  const resetAllState = () => {
    try {
      setDataset(null);
      hasAutoSelectedRef.current = false;
      setCleanedDataset(null);
      setCleaningActionsAccepted([]);
      setInstances([]);
      setGroupByColumns([]);
      setApplyAggregation(false);
      setCustomAggMappings({});
      setOneHotColumns([]);
      setNormalizationStrategies({});
      setMissingStrategies({});
      setMissingConstants({});
      setTimeSinCosMonth(false);
      setTimeSinCosWeekday(false);
      setTimeYearScaling('none');
      setTimeComponentToggles({});
      setCustomScenarios({});
      setForecastHorizon(12);
      setForecastFrequency('Monthly');
      setUseOptuna(true);
      setOptunaTrials(25);
      setUseFeaturePipeline(true);
      setHyperparameters({});
      setCollapsedHypers({});
      setPipelineValidity({
        data_ingestion: true,
        data_audit_cleaning: false,
        target_selection: false,
        aggregation_settings: false,
        anomaly_detection: false,
        train_test_split: false,
        feature_selection: false,
        hyperparameter_opt: false,
        model_training: false,
      });
      setTargetColumn('none');
      setGoal('regression');
      setProblemSubtype('binary');
      setSelectedModelOverride('');
      setSelectedModels([]);
      setUserOverrodeModel(false);
      setDateColumn('');
      setSplitMethod('random');
      setSplitRatio(80);
      setTargetConfirmed(false);
      setPredictionsPage(0);
      setCurrentProjectId(null);
      setCurrentProjectName('');
      setIsModifyMode(false);
      setOverviewSearch('');
      setOverviewSortCol('');
      setOverviewSortDirection('asc');
      setOverviewScrollTop(0);
      setSelectedProductFilter('__all__');
      setSelectedTimeFilter('__all__');
      setVisibleColNames([]);
      setSelectedCatGroupCols([]);
      setSelectedCatMetricCol('');
      setCatChartView('avg');
      setDqiSelectedFeature('');
      setDqiSelectedAgg('mean');
      setDqiSelectedPeriod('D');
      setDqiSelectedGranularity('auto');
      setDqiDataset(null);
      setDqiAggregatedDataset(null);
      setInstancesResults({});
      setTrainingResults(null);
      setSavingModelIds({});
      setSavedModelIds({});
      setCurrentSavingInstanceId(null);
    } catch (error) {
      console.error('Error resetting state:', error);
    }
  };

  // Handle Target column change dynamically recalculating pre-selections
  const handleTargetChange = (newTarget, forceGoal = null) => {
    setTargetColumn(newTarget);
    if (!dataset) return;

    if (newTarget) {
      // Both basic and advanced modes: auto-detect everything from target
      const detected = autoDetectGoal(dataset, newTarget);
      setGoal(detected.goal);
      setProblemSubtype(detected.problemSubtype);
      setDateColumn(detected.dateColumn);
      setTargetConfirmed(true);

      // Auto-select recommended model
      const models = MODEL_REGISTRY[detected.goal] || [];
      let recModelId = models[0]?.id || '';
      if (detected.goal === 'classification') recModelId = 'rf_class';
      else if (detected.goal === 'regression') recModelId = dataset.rows >= 500 ? 'lgbm_reg' : 'rf_reg';
      else if (detected.goal === 'forecasting') recModelId = 'prophet_time';
      setSelectedModelOverride(recModelId);
      setSelectedModels(models.map(m => m.id));
      setUserOverrodeModel(false);

      // Set split method
      if (detected.goal === 'forecasting') {
        setSplitMethod('chronological');
      } else {
        setSplitMethod('random');
      }

      // Initialize hyperparameters for selected models
      const hyperInits = {};
      const collapseInits = {};
      models.forEach(m => {
        hyperInits[m.id] = { ...(m.hyperparameters || { epochs: 100, learning_rate: 0.1, batch_size: 32, regularization: 'none', lambda: 0.01, seed: 42 }) };
        collapseInits[m.id] = true;
      });
      setHyperparameters(hyperInits);
      setCollapsedHypers(collapseInits);
    }
  };

  // Handle Paradigm change in Advanced Mode
  const handleParadigmChange = (newGoal) => {
    setGoal(newGoal);
    setTargetConfirmed(false);
    setSelectedModelOverride('');
    setUserOverrodeModel(false);

    if (newGoal === 'clustering') {
      setTargetColumn('none');
      setTargetConfirmed(true);
      const defaultModels = (MODEL_REGISTRY['clustering'] || []).map(m => m.id);
      setSelectedModels(defaultModels);
    } else {
      let newTarget = targetColumn;
      if (targetColumn === 'none' || !targetColumn) {
        const matchingRec = recommendedTargets.find(r => r.approach === newGoal);
        newTarget = matchingRec ? matchingRec.column : '';
      }
      setTargetColumn(newTarget);

      const defaultModels = (MODEL_REGISTRY[newGoal] || []).map(m => m.id);
      setSelectedModels(defaultModels);
      setTargetConfirmed(false);
    }
  };

  // Custom File Uploader logic
  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (event) => {
      let parsed = null;

      if (isExcel) {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (jsonData.length > 0) {
            const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h !== '');
            const rows = [];
            for (let i = 1; i < Math.min(jsonData.length, 10000); i++) {
              const cols = jsonData[i];
              if (!cols || cols.length === 0) continue;
              const row = {};
              headers.forEach((h, idx) => {
                const val = cols[idx];
                row[h] = val === undefined || val === null ? null : val;
              });
              rows.push(row);
            }
            parsed = { headers, rows, totalRows: jsonData.length - 1 };
          }
        } catch (err) {
          console.error("Excel parsing error", err);
          alert("Error parsing Excel spreadsheet: " + err.message);
          return;
        }
      } else {
        const text = event.target.result;
        if (file.name.endsWith('.json')) {
          parsed = parseJSON(text);
        } else {
          parsed = parseCSV(text);
        }
      }

      if (parsed && parsed.rows.length > 0) {
        const colsInfo = parsed.headers.map(header => {
          const samples = parsed.rows.slice(0, 5).map(r => r[header]);
          let nulls = 0;
          const uniqueValues = new Set();

          parsed.rows.forEach(r => {
            const v = r[header];
            if (v === undefined || v === null || String(v).trim() === '' || String(v).toLowerCase() === 'null') {
              nulls++;
            } else {
              uniqueValues.add(v);
            }
          });
          const nullPercent = (nulls / parsed.rows.length) * 100;

          // Inferred type score calculation
          let type = 'categorical';
          const sliceRows = parsed.rows.slice(0, 50);
          const numScore = sliceRows.filter(r => {
            const v = r[header];
            return v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
          }).length;
          const dateScore = sliceRows.filter(r => {
            const v = String(r[header] || '');
            return v.length > 5 && !isNaN(Date.parse(v)) && isNaN(Number(v));
          }).length;

          if (numScore > sliceRows.length * 0.8) {
            type = 'numeric';
          } else if (dateScore > sliceRows.length * 0.8) {
            type = 'datetime';
          }

          return {
            name: header,
            type,
            nullPercent: parseFloat(nullPercent.toFixed(1)),
            uniqueCount: uniqueValues.size,
            missing: nulls,
            samples
          };
        });

        const recommendedTarget = detectTargetModelJS(colsInfo, parsed.totalRows) || (colsInfo[colsInfo.length - 1] ? colsInfo[colsInfo.length - 1].name : colsInfo[0].name);
        const detected = autoDetectGoal({ columnsInfo: colsInfo }, recommendedTarget);
        let inferredTask = detected.goal || 'regression';

        const customDb = {
          id: 'custom_' + Date.now(),
          name: file.name,
          task: inferredTask,
          rows: parsed.totalRows,
          columns: parsed.headers.length,
          columnsInfo: colsInfo,
          defaultTarget: recommendedTarget,
          sampleRows: parsed.rows
        };

        handleDatasetSelect(customDb);
      } else {
        alert('Invalid file format. Please upload a standard CSV, JSON, or Excel file.');
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };



  const handleResetSelections = () => {
    const resetSels = {};
    Object.keys(featureStatuses).forEach(name => {
      resetSels[name] = featureStatuses[name].recommend;
    });
    setFeatureSelections(resetSels);
  };



  const removeGroupByColumn = (col) => {
    setGroupByColumns(groupByColumns.filter(c => c !== col));
    if (selectedFeaturesList.includes(col)) {
      const colMeta = dataset?.columnsInfo.find(c => c.name === col);
      if (colMeta) {
        const defaultFn = inferAggFunction(col, colMeta.type, dataset);
        setCustomAggMappings(prev => ({
          ...prev,
          [col]: defaultFn
        }));
      }
    }
  };

  // Auto-generate aggregation mappings when columns change
  useEffect(() => {
    if (!dataset) return;
    const newMappings = { ...customAggMappings };
    dataset.columnsInfo.forEach(col => {
      if (!newMappings[col.name]) {
        newMappings[col.name] = inferAggFunction(col.name, col.type, dataset);
      }
    });
    setCustomAggMappings(newMappings);
  }, [dataset, featureSelections, groupByColumns]);

  // Auto-preselect categorical columns as Group By columns when dataset loads
  useEffect(() => {
    if (!dataset) return;
    const categoricalCols = dataset.columnsInfo
      .filter(col => col.type === 'categorical')
      .map(col => col.name);
    setGroupByColumns(prev => {
      const merged = [...new Set([...prev, ...categoricalCols])];
      return merged;
    });
  }, [dataset]);
  // Model toggler
  const toggleModelSelection = (modelId) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const aggregateDataset = (ds, groupByCols, aggMappings) => {
    if (!ds || !ds.sampleRows || ds.sampleRows.length === 0) return ds;

    const groups = {};
    ds.sampleRows.forEach(row => {
      const groupKey = groupByCols.map(col => {
        const val = row[col];
        return val === null || val === undefined ? 'null' : String(val);
      }).join('|');
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    const newSampleRows = [];
    Object.entries(groups).forEach(([groupKey, groupRows]) => {
      const aggregatedRow = {};
      groupByCols.forEach(col => {
        aggregatedRow[col] = groupRows[0][col];
      });

      ds.columnsInfo.forEach(col => {
        const colName = col.name;
        if (groupByCols.includes(colName)) return;

        const rawVals = groupRows.map(r => r[colName]);
        const vals = rawVals.filter(v => v !== null && v !== undefined && String(v).trim() !== '' && String(v).toLowerCase() !== 'null');

        if (vals.length === 0) {
          aggregatedRow[colName] = null;
          return;
        }

        const method = aggMappings[colName] || 'mean';
        if (col.type === 'numeric') {
          const numVals = vals.map(Number).filter(v => !isNaN(v));
          if (numVals.length === 0) {
            aggregatedRow[colName] = null;
            return;
          }
          if (method === 'sum') {
            aggregatedRow[colName] = numVals.reduce((a, b) => a + b, 0);
          } else if (method === 'max') {
            aggregatedRow[colName] = Math.max(...numVals);
          } else if (method === 'min') {
            aggregatedRow[colName] = Math.min(...numVals);
          } else if (method === 'first') {
            aggregatedRow[colName] = numVals[0];
          } else {
            aggregatedRow[colName] = numVals.reduce((a, b) => a + b, 0) / numVals.length;
          }
        } else {
          if (method === 'first') {
            aggregatedRow[colName] = vals[0];
          } else {
            const counts = {};
            vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            aggregatedRow[colName] = sorted[0][0];
          }
        }
      });
      newSampleRows.push(aggregatedRow);
    });

    const newColumnsInfo = ds.columnsInfo.map(col => {
      const colName = col.name;
      let nulls = 0;
      const uniqueValues = new Set();
      newSampleRows.forEach(r => {
        const v = r[colName];
        if (v === undefined || v === null || String(v).trim() === '' || String(v).toLowerCase() === 'null') {
          nulls++;
        } else {
          uniqueValues.add(v);
        }
      });
      return {
        ...col,
        nullPercent: (nulls / newSampleRows.length) * 100,
        uniqueCount: uniqueValues.size
      };
    });

    return {
      ...ds,
      rows: newSampleRows.length,
      columnsInfo: newColumnsInfo,
      sampleRows: newSampleRows,
      name: `${ds.name.split('.')[0]}_aggregated`
    };
  };

  // Initialize DQI States
  useEffect(() => {
    if (page === 3 && dataset) {
      const currentDatasetId = dataset.id || dataset.name;
      const needsInit = !dqiDataset || 
        dqiInitializedFor.datasetId !== currentDatasetId ||
        dqiInitializedFor.target !== targetColumn ||
        dqiInitializedFor.dateCol !== dateColumn;

      if (needsInit) {
        const copy = JSON.parse(JSON.stringify(dataset));
        const allCols = copy.columnsInfo.map(c => c.name);
        const profile = datasetProfiler.profile(copy, allCols, targetColumn, dateColumn);
        const sortedDqiDataset = {
          ...copy,
          sampleRows: profile.sortedRows
        };
        setDqiDataset(sortedDqiDataset);
        console.log("PROFILER FOUND ANOMALIES COUNT:", profile.anomalies.length, profile.anomalies);
        setDqiAnomalyLog(profile.anomalies);
        setDqiInitializedFor({
          datasetId: currentDatasetId,
          target: targetColumn,
          dateCol: dateColumn
        });
        setDqiAuditTrail([{ timestamp: new Date().toLocaleTimeString(), action: 'Initialize', message: 'Initialized Data Quality Intelligence pipeline across all numeric features.' }]);
      }
    } else if (page < 3) {
      setDqiDataset(null);
      setDqiAnomalyLog([]);
      setDqiAuditTrail([]);
      setDqiInitializedFor({ datasetId: '', target: '', dateCol: '' });
    }
  }, [page, dataset, targetColumn, dateColumn, dqiInitializedFor, dqiDataset]);

  // Sync category columns to groupByColumns whenever Page 2 groupBy changes
  useEffect(() => {
    if (validCategoryColumns.length > 0) {
      setDqiPrimaryCategory(validCategoryColumns[0]);
      if (validCategoryColumns.length > 1) {
        setDqiSubgroupCategory(validCategoryColumns[1]);
      } else {
        setDqiSubgroupCategory('none');
      }
    } else {
      setDqiPrimaryCategory('');
      setDqiSubgroupCategory('none');
    }
  }, [validCategoryColumns]);

  useEffect(() => {
    if (targetColumn && dqiSelectedFeature !== targetColumn) {
      setDqiSelectedFeature(targetColumn);
    }
  }, [targetColumn, page]);

  const dqiChartData = useMemo(() => {
    if (!dqiDataset || !dqiSelectedFeature) return [];

    const colMeta = dqiDataset.columnsInfo.find(c => c.name === dqiSelectedFeature);
    const isCategorical = colMeta ? colMeta.type === 'categorical' : false;

    // ── CATEGORICAL: frequency distribution bar data ─────────────────
    if (isCategorical) {
      // Build freq map from sampleRows
      const freqMap = {};
      dqiDataset.sampleRows.forEach(row => {
        const v = row[dqiSelectedFeature];
        if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') return;
        const key = String(v).trim();
        freqMap[key] = (freqMap[key] || 0) + 1;
      });
      const totalNonNull = Object.values(freqMap).reduce((s, c) => s + c, 0);
      // Flag categories anomalous (rare) in the current anomaly log for this feature
      const rareAnoms = new Set(
        dqiAnomalyLog
          .filter(a => a.feature === dqiSelectedFeature && a.type === 'Rare Category' && a.status === 'active')
          .map(a => a.value)
      );
      // Sort descending by count for readability
      return Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .map(([catVal, count]) => ({
          name: catVal,
          value: count,
          pct: totalNonNull > 0 ? ((count / totalNonNull) * 100).toFixed(1) : '0',
          isRare: rareAnoms.has(catVal)
        }));
    }

    // ── NUMERIC: existing time-series map aggregated to one point per period ──
    const getDateVal = (row, col) => {
      if (!row || !col) return '';
      // '__vd__' is the stable internal key for any virtual date column
      return row[col] !== undefined ? String(row[col]) : '';
    };

    const getYearMonthLabel = (val) => {
      if (val === null || val === undefined) return 'Unknown';
      const str = String(val).trim();
      if (!str) return 'Unknown';

      // Check if it's already YYYY-MM
      if (/^\d{4}-\d{2}$/.test(str)) return str;

      // Try parsing DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
      const parts = str.split(/[-/.]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          if (p2 > 1000) {
            // DD/MM/YYYY -> YYYY-MM
            return `${p2}-${String(p1).padStart(2, '0')}`;
          } else if (p0 > 1000) {
            // YYYY/MM/DD -> YYYY-MM
            return `${p0}-${String(p1).padStart(2, '0')}`;
          }
        }
      }

      // Try standard Date parsing
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }

      return str; // Fallback
    };

    // 1. Group rows by chronological period label to ensure exactly one point per period
    const orderedPeriods = [];
    const periodBuckets = {};

    dqiDataset.sampleRows.forEach((row) => {
      const originalIdx = row.__originalIdx;
      const rawDate = dateColumn ? getDateVal(row, dateColumn) : '';
      const dateVal = rawDate ? getYearMonthLabel(rawDate) : `Row ${originalIdx + 1}`;

      if (!periodBuckets[dateVal]) {
        periodBuckets[dateVal] = [];
        orderedPeriods.push(dateVal);
      }
      periodBuckets[dateVal].push(row);
    });

    // 2. Map period buckets to aggregated points
    const chartRes = orderedPeriods.map((dateVal) => {
      const bucketRows = periodBuckets[dateVal];

      // Determine aggregation method: honor custom settings from Page 2, fall back to keyword check, default to mean
      let method = customAggMappings[dqiSelectedFeature];
      if (!method) {
        const nameLower = dqiSelectedFeature.toLowerCase();
        const sumKeywords = ['count', 'volume', 'quantity', 'revenue', 'sales', 'total', 'amount', 'spend', 'cost'];
        if (sumKeywords.some(kw => nameLower.includes(kw))) {
          method = 'sum';
        } else {
          method = 'mean';
        }
      }

      const values = bucketRows
        .map(r => Number(r[dqiSelectedFeature]))
        .filter(v => !isNaN(v) && v !== null && v !== undefined);

      let aggregatedValue = null;
      if (values.length > 0) {
        if (method === 'sum') {
          aggregatedValue = values.reduce((a, b) => a + b, 0);
        } else if (method === 'min') {
          aggregatedValue = Math.min(...values);
        } else if (method === 'max') {
          aggregatedValue = Math.max(...values);
        } else {
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        }
        aggregatedValue = Math.round(aggregatedValue * 100) / 100;
      }

      // Check if this period has at least one active anomaly
      const bucketOriginalIndices = new Set(bucketRows.map(r => r.__originalIdx));
      const activeAnoms = dqiAnomalyLog.filter(a =>
        a.feature === dqiSelectedFeature &&
        a.status === 'active' &&
        bucketOriginalIndices.has(a.index)
      );

      const hasAnomaly = activeAnoms.length > 0;

      return {
        name: dateVal,
        value: aggregatedValue,
        anomaly: hasAnomaly ? aggregatedValue : null,
        anomalyCount: activeAnoms.length,
        anomalies: activeAnoms,
        rowLabel: bucketRows.length === 1 ? `Row ${bucketRows[0].__originalIdx + 1}` : `${bucketRows.length} rows aggregated (${method})`
      };
    });

    console.log("RENDER BOUNDARY FIRST 10:", chartRes.slice(0, 10).map(r => ({ name: r.name, value: r.value, anomalyCount: r.anomalyCount })));
    console.log("RENDER BOUNDARY LAST 10:", chartRes.slice(-10).map(r => ({ name: r.name, value: r.value, anomalyCount: r.anomalyCount })));
    return chartRes;
  }, [dqiDataset, dqiSelectedFeature, dqiAnomalyLog, dateColumn, customAggMappings]);



  const datasetProfiler = {
    profile: (ds, features, targetCol, dateCol, anomalyLogOverrides = null) => {
      const getDateVal = (row, col) => {
        if (!row || !col) return '';
        if (col === '__vd__') {
          return row['__vd__'] || '';
        }
        return row[col] || '';
      };
      if (!ds || !ds.sampleRows || ds.sampleRows.length === 0) {
        return {
          sortedRows: [],
          anomalies: [],
          pillarScores: { granularity: 0, historicity: 0, value: 0, readiness: 0 }
        };
      }

      // Map rows with their original index to preserve alignment for cleanups
      let indexedRows = ds.sampleRows.map((row, idx) => ({
        ...row,
        __originalIdx: row.__originalIdx !== undefined ? row.__originalIdx : idx
      }));

      // NOTE: ds.sampleRows is already sorted chronologically ascending by addYearMonthVirtualColumn
      // at dataset load time. The profiler trusts that order and does NOT re-sort, to avoid
      // divergence between the chart's render order and the anomaly index positions.
      // The only sort that matters is the one at line ~1595 inside addYearMonthVirtualColumn.

      const sortedRows = indexedRows;
      const anomalies = [];

      features.forEach(colName => {
        const colMeta = ds.columnsInfo.find(c => c.name === colName);
        const isNumeric = colMeta ? colMeta.type === 'numeric' : true;

        // Skip date-related index columns, seasonality columns, or ID keys regardless of type
        const nameLower = colName.toLowerCase();
        if (
          colName === dateCol ||
          nameLower.includes('year') ||
          nameLower.includes('month') ||
          nameLower.includes('day') ||
          nameLower.includes('date') ||
          nameLower.includes('timestamp') ||
          nameLower.includes('season') ||
          nameLower === 'id' ||
          nameLower.includes('_id')
        ) {
          return;
        }

        const vals = sortedRows.map(r => r[colName]);
        const rowDates = sortedRows.map((r, idx) => getDateVal(r, dateCol) || `Row ${r.__originalIdx + 1}`);

        if (!isNumeric) {
          // ── CATEGORICAL ANOMALY CHECKS ──────────────────────────────

          // Build frequency map across all rows
          const freqMap = {};
          const totalNonNull = vals.filter(v =>
            v !== null && v !== undefined && String(v).trim() !== '' && String(v).toLowerCase() !== 'null'
          ).length;

          vals.forEach(v => {
            if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') return;
            const key = String(v).trim();
            freqMap[key] = (freqMap[key] || 0) + 1;
          });

          // Shared catFreqMap attached to every anomaly for this column so the chart can use it
          const catFreqMap = { ...freqMap };

          // C1. Rare Category: frequency < 1% of non-null rows AND count <= 3
          if (totalNonNull > 0) {
            Object.entries(freqMap).forEach(([catVal, count]) => {
              const pct = count / totalNonNull;
              if (pct < 0.01 && count <= 3) {
                // Find first occurrence row for location reference
                const firstIdx = vals.findIndex(v => String(v).trim() === catVal);
                const originalIdx = firstIdx >= 0 ? sortedRows[firstIdx].__originalIdx : 0;
                const rowDate = firstIdx >= 0 ? rowDates[firstIdx] : 'Unknown';
                anomalies.push({
                  id: `anom_${colName}_rare_${catVal}`,
                  feature: colName,
                  index: originalIdx,
                  rowLabel: rowDate,
                  value: catVal,
                  count,
                  pct: (pct * 100).toFixed(2),
                  type: 'Rare Category',
                  severity: 'Medium',
                  detectedAt: new Date().toLocaleTimeString(),
                  recommendedAction: 'Replace with column mode or "Unknown"',
                  status: 'active',
                  actionReason: '',
                  catFreqMap,
                  isCategoric: true
                });
              }
            });
          }

          // C2. Dominant Monoculture: one value > 95% of non-null rows
          if (totalNonNull > 0) {
            const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) {
              const [topVal, topCount] = sorted[0];
              if (topCount / totalNonNull > 0.95) {
                const firstIdx = vals.findIndex(v => String(v).trim() === topVal);
                const originalIdx = firstIdx >= 0 ? sortedRows[firstIdx].__originalIdx : 0;
                anomalies.push({
                  id: `anom_${colName}_mono`,
                  feature: colName,
                  index: originalIdx,
                  rowLabel: `Column-level`,
                  value: topVal,
                  count: topCount,
                  pct: ((topCount / totalNonNull) * 100).toFixed(1),
                  type: 'Dominant Monoculture',
                  severity: 'Low',
                  detectedAt: new Date().toLocaleTimeString(),
                  recommendedAction: 'Review for near-zero entropy; consider dropping column',
                  status: 'active',
                  actionReason: '',
                  catFreqMap,
                  isCategoric: true
                });
              }
            }
          }

          // C3. Null Spike (Categorical) — order-sensitive, same logic as numeric
          let consecutiveNonNullCat = 0;
          vals.forEach((v, idx) => {
            const rowDate = rowDates[idx];
            const originalIdx = sortedRows[idx].__originalIdx;
            const isNull = v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';
            if (isNull) {
              if (consecutiveNonNullCat >= 5) {
                anomalies.push({
                  id: `anom_${colName}_catnull_${originalIdx}`,
                  feature: colName,
                  index: originalIdx,
                  rowLabel: rowDate,
                  value: 'NaN/Null',
                  type: 'Sudden Null Spike',
                  severity: 'High',
                  detectedAt: new Date().toLocaleTimeString(),
                  recommendedAction: 'Impute using column mode or forward fill',
                  status: 'active',
                  actionReason: '',
                  catFreqMap,
                  isCategoric: true
                });
              }
              consecutiveNonNullCat = 0;
            } else {
              consecutiveNonNullCat++;
            }
          });

          return; // done with this categorical column
        }



        // A. ORDER-INDEPENDENT: Z-score & IQR Outliers
        const numsWithIdx = vals.map((v, idx) => ({ val: Number(v), original: v, sortedIdx: idx, originalIdx: sortedRows[idx].__originalIdx }))
          .filter(item => item.original !== null && item.original !== undefined && String(item.original).trim() !== '' && !isNaN(item.val));

        const nums = numsWithIdx.map(item => item.val);

        let mean = 0, std = 0, Q1 = 0, Q3 = 0, IQR = 0;
        if (nums.length > 5) {
          const sum = nums.reduce((a, b) => a + b, 0);
          mean = sum / nums.length;
          const sqDiffSum = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
          std = Math.sqrt(sqDiffSum / nums.length);

          const sortedNums = [...nums].sort((a, b) => a - b);
          Q1 = sortedNums[Math.floor(sortedNums.length * 0.25)];
          Q3 = sortedNums[Math.floor(sortedNums.length * 0.75)];
          IQR = Q3 - Q1;
        }

        const thresholdStd = Math.max(std, 0.05 * Math.abs(mean), 0.01);
        const thresholdIQR = Math.max(IQR, 0.05 * Math.abs(Q1 || mean), 0.01);

        numsWithIdx.forEach(item => {
          const v = item.val;
          const idx = item.originalIdx;
          const rowDate = rowDates[item.sortedIdx];

          if (std > 0) {
            const z = (v - mean) / thresholdStd;
            if (Math.abs(z) > 3) {
              anomalies.push({
                id: `anom_${colName}_z_${idx}`,
                feature: colName,
                index: idx,
                rowLabel: rowDate,
                value: item.original,
                type: 'Z-Score Outlier',
                severity: 'High',
                detectedAt: new Date().toLocaleTimeString(),
                recommendedAction: 'Impute using column mean/median',
                status: 'active',
                actionReason: ''
              });
              return;
            }
          }

          if (IQR > 0) {
            if (v < Q1 - 1.5 * thresholdIQR || v > Q3 + 1.5 * thresholdIQR) {
              anomalies.push({
                id: `anom_${colName}_iqr_${idx}`,
                feature: colName,
                index: idx,
                rowLabel: rowDate,
                value: item.original,
                type: 'IQR Fence Breach',
                severity: 'Medium',
                detectedAt: new Date().toLocaleTimeString(),
                recommendedAction: 'Impute using median value',
                status: 'active',
                actionReason: ''
              });
            }
          }
        });

        // B. ORDER-SENSITIVE: Consecutive null spikes and flatline sequence checks
        let consecutiveNonNull = 0;
        vals.forEach((v, idx) => {
          const rowDate = rowDates[idx];
          const originalIdx = sortedRows[idx].__originalIdx;
          const isNull = v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';
          if (isNull) {
            if (consecutiveNonNull >= 5) {
              anomalies.push({
                id: `anom_${colName}_null_${originalIdx}`,
                feature: colName,
                index: originalIdx,
                rowLabel: rowDate,
                value: 'NaN/Null',
                type: 'Sudden Null Spike',
                severity: 'High',
                detectedAt: new Date().toLocaleTimeString(),
                recommendedAction: 'Impute using forward fill or median',
                status: 'active',
                actionReason: ''
              });
            }
            consecutiveNonNull = 0;
          } else {
            consecutiveNonNull++;
          }
        });

        let consecutiveRep = 1;
        let repVal = vals[0];
        for (let i = 1; i < vals.length; i++) {
          const v = vals[i];
          const rowDate = rowDates[i];
          const originalIdx = sortedRows[i].__originalIdx;
          const isNull = v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';
          if (!isNull && v === repVal) {
            consecutiveRep++;
            if (consecutiveRep === 5) {
              anomalies.push({
                id: `anom_${colName}_flat_${originalIdx}`,
                feature: colName,
                index: originalIdx,
                rowLabel: rowDate,
                value: v,
                type: 'Flatline Sequence',
                severity: 'Medium',
                detectedAt: new Date().toLocaleTimeString(),
                recommendedAction: 'Verify sensor/data ingestion stability',
                status: 'active',
                actionReason: ''
              });
            }
          } else {
            consecutiveRep = 1;
            repVal = v;
          }
        }
      });

      // 3. Compute Pillar Scores
      const activeAnomalyLog = anomalyLogOverrides || anomalies;
      const activeAnomalies = activeAnomalyLog.filter(a => a.status === 'active');

      let granularity = 100;
      if (goal !== 'forecasting') {
        granularity = 100;
      } else if (!dateCol) {
        granularity = 40;
      } else {
        const dates = sortedRows.map(r => getDateVal(r, dateCol)).filter(Boolean);
        const parsedDates = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
        if (parsedDates.length < 10) {
          granularity = 30;
        } else {
          const uniqueDates = new Set(dates).size;
          const cardinalityRatio = uniqueDates / sortedRows.length;
          if (cardinalityRatio < 0.8) {
            granularity -= (1 - cardinalityRatio) * 50;
          }
          const diffs = [];
          for (let i = 1; i < parsedDates.length; i++) {
            const diffMs = parsedDates[i] - parsedDates[i - 1];
            diffs.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
          }
          const counts = {};
          diffs.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
          const maxCount = Math.max(...Object.values(counts));
          const commonDiff = Number(Object.keys(counts).find(k => counts[k] === maxCount));
          const regularRatio = maxCount / diffs.length;
          if (regularRatio < 0.7) {
            granularity -= (1 - regularRatio) * 30;
          }
          if (commonDiff >= 28 && commonDiff <= 31 && uniqueDates < 12) {
            granularity -= 40;
          } else if (commonDiff >= 6 && commonDiff <= 8 && uniqueDates < 10) {
            granularity -= 40;
          }
        }
      }
      granularity = Math.max(0, Math.min(100, Math.round(granularity)));

      let historicity = 100;
      if (goal !== 'forecasting') {
        historicity = 100;
      } else if (!dateCol) {
        historicity = 50;
      } else {
        const dates = sortedRows.map(r => getDateVal(r, dateCol)).filter(Boolean);
        const parsedDates = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
        if (parsedDates.length > 0) {
          const minDate = parsedDates[0];
          const maxDate = parsedDates[parsedDates.length - 1];
          const currentRef = new Date('2026-06-29');
          const ageDays = Math.round((currentRef - maxDate) / (1000 * 60 * 60 * 24));
          if (ageDays > 30) {
            historicity -= Math.min(30, (ageDays - 30) * 0.1);
          }
          const spanDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
          if (spanDays < 90) {
            historicity -= 30;
          } else if (spanDays < 365) {
            historicity -= 15;
          }
          const n = sortedRows.length;
          const chunk1 = sortedRows.slice(0, Math.floor(n / 3));
          const chunk3 = sortedRows.slice(Math.floor(2 * n / 3));
          const countNulls = (chunk) => {
            let totalCells = chunk.length * features.length;
            if (totalCells === 0) return 0;
            let nulls = 0;
            chunk.forEach(r => {
              features.forEach(f => {
                const v = r[f];
                if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') {
                  nulls++;
                }
              });
            });
            return nulls / totalCells;
          };
          const rate1 = countNulls(chunk1);
          const rate3 = countNulls(chunk3);
          if (rate3 > rate1 + 0.05) {
            historicity -= (rate3 - rate1) * 100;
          }
        }
      }
      historicity = Math.max(0, Math.min(100, Math.round(historicity)));

      let valueScore = 100;
      let totalNulls = 0;
      let totalCells = sortedRows.length * features.length;
      if (totalCells > 0) {
        sortedRows.forEach(r => {
          features.forEach(f => {
            const v = r[f];
            if (v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null') {
              totalNulls++;
            }
          });
        });
        const nullPct = totalNulls / totalCells;
        valueScore -= nullPct * 100;
      }
      const activeSeverityHigh = activeAnomalies.filter(a => a.severity === 'High').length;
      const activeSeverityMedium = activeAnomalies.filter(a => a.severity === 'Medium').length;
      valueScore -= (activeSeverityHigh * 5 + activeSeverityMedium * 2);

      let stabilityPenalties = 0;
      features.forEach(f => {
        const vals = sortedRows.map(r => Number(r[f])).filter(v => !isNaN(v));
        if (vals.length > 10) {
          const half = Math.floor(vals.length / 2);
          const mean1 = vals.slice(0, half).reduce((a, b) => a + b, 0) / half;
          const mean2 = vals.slice(half).reduce((a, b) => a + b, 0) / (vals.length - half);
          const drift = Math.abs(mean1 - mean2) / (Math.abs(mean1) + 1);
          if (drift > 0.3) {
            stabilityPenalties += 10;
          }
        }
      });
      valueScore -= stabilityPenalties;
      valueScore = Math.max(0, Math.min(100, Math.round(valueScore)));

      const readiness = Math.round((granularity + historicity + valueScore) / 3);

      return {
        sortedRows,
        anomalies,
        pillarScores: { granularity, historicity, value: valueScore, readiness }
      };
    }
  };

  const dqiAggregatedDataset = useMemo(() => {
    const baseDataset = getCleanedData || dqiDataset || dataset;
    if (!baseDataset) return null;
    if (applyAggregation && groupByColumns.length > 0) {
      return aggregateDataset(baseDataset, groupByColumns, customAggMappings);
    }
    return baseDataset;
  }, [getCleanedData, dqiDataset, dataset, applyAggregation, groupByColumns, customAggMappings]);

  const activeDataset = useMemo(() => {
    return dqiAggregatedDataset || getCleanedData || dqiDataset || dataset;
  }, [dqiAggregatedDataset, getCleanedData, dqiDataset, dataset]);

  const dqiReport = useMemo(() => {
    if (!activeDataset) return { granularity: 0, historicity: 0, value: 0, readiness: 0 };
    const profile = datasetProfiler.profile(activeDataset, selectedFeaturesList, targetColumn, dateColumn, dqiAnomalyLog);
    return profile.pillarScores;
  }, [activeDataset, dqiAnomalyLog, selectedFeaturesList, targetColumn, dateColumn]);

  const dqiReadinessScore = dqiReport?.readiness || 0;

  // ── CATEGORY TREND BREAKDOWN ─────────────────────────────────────────────
  // 12-color palette for multi-line category chart
  const CAT_PALETTE = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
    '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
    '#84cc16', '#e11d48'
  ];

  // Produces pivoted chart rows: [{name: 'YYYY-MM', 'ModelA|North': 12.3, 'ModelB|South': 9.1, ...}]
  const dqiCategoryChartData = useMemo(() => {
    if (!dqiDataset || !targetColumn || dqiCategoryColumns.length === 0) return { rows: [], keys: [] };

    const rows = dqiDataset.sampleRows;

    // Compose the key for each row
    const getCompositeKey = (row) =>
      dqiCategoryColumns.map(col => {
        const v = row[col];
        return v === null || v === undefined ? 'N/A' : String(v).trim();
      }).join(' | ');

    // Build date label helper (reuse same logic as dqiChartData)
    const getDateLabel = (row) => {
      if (!dateColumn) return `Row ${row.__originalIdx + 1}`;
      let raw = '';
      // '__vd__' is the stable internal key for any virtual date column
      raw = row[dateColumn] !== undefined ? String(row[dateColumn]) : '';

      if (!raw) return `Row ${row.__originalIdx + 1}`;
      const str = String(raw).trim();
      if (/^\d{4}-\d{2}$/.test(str)) return str;
      const parts = str.split(/[-/.]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10), p1 = parseInt(parts[1], 10), p2 = parseInt(parts[2], 10);
        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          if (p2 > 1000) return `${p2}-${String(p1).padStart(2, '0')}`;
          if (p0 > 1000) return `${p0}-${String(p1).padStart(2, '0')}`;
        }
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return str;
    };

    // Count rows per composite key to find top-12 by volume
    const keyCounts = {};
    rows.forEach(row => {
      const k = getCompositeKey(row);
      keyCounts[k] = (keyCounts[k] || 0) + 1;
    });
    const top12Keys = Object.entries(keyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k]) => k);

    // Pivot: for each unique date label, collect target values per key
    const dateMap = {}; // { dateLabel: { compositeKey: [values] } }
    const dateOrder = []; // maintain insertion order (already chronologically sorted)
    rows.forEach(row => {
      const key = getCompositeKey(row);
      if (!top12Keys.includes(key)) return;
      const dateLabel = getDateLabel(row);
      const targetVal = Number(row[targetColumn]);
      if (!dateMap[dateLabel]) {
        dateMap[dateLabel] = {};
        dateOrder.push(dateLabel);
      }
      if (!dateMap[dateLabel][key]) dateMap[dateLabel][key] = [];
      if (!isNaN(targetVal)) dateMap[dateLabel][key].push(targetVal);
    });

    // Collapse each date bucket: average values per key for that period
    const chartRows = dateOrder.map(dateLabel => {
      const entry = { name: dateLabel };
      top12Keys.forEach(key => {
        const vals = dateMap[dateLabel][key];
        entry[key] = vals && vals.length > 0
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
          : null;
      });
      return entry;
    });

    return { rows: chartRows, keys: top12Keys };
  }, [dqiDataset, targetColumn, dateColumn, dqiCategoryColumns]);

  // Per-composite-key independent anomaly detection (Z-score + IQR + null-spike + flatline)
  const dqiCategoryAnomalyMap = useMemo(() => {
    if (!dqiDataset || !targetColumn || dqiCategoryColumns.length === 0) return {};

    const rows = dqiDataset.sampleRows;
    const getCompositeKey = (row) =>
      dqiCategoryColumns.map(col => {
        const v = row[col];
        return v === null || v === undefined ? 'N/A' : String(v).trim();
      }).join(' | ');

    // Group rows by composite key (already sorted chronologically)
    const groups = {};
    rows.forEach(row => {
      const k = getCompositeKey(row);
      if (!groups[k]) groups[k] = [];
      groups[k].push(row);
    });

    const result = {};
    const targetLower = (targetColumn || '').toLowerCase();
    const isSeasonTarget = targetLower.includes('season');

    Object.entries(groups).forEach(([key, groupRows]) => {
      const vals = groupRows.map(r => r[targetColumn]);
      const anomalies = [];

      // Z-score + IQR (order-independent)
      if (!isSeasonTarget) {
        const numsWithIdx = vals
          .map((v, i) => ({ val: Number(v), original: v, idx: i, originalIdx: groupRows[i].__originalIdx }))
          .filter(item => item.original !== null && item.original !== undefined && String(item.original).trim() !== '' && !isNaN(item.val));
        const nums = numsWithIdx.map(x => x.val);

        let mean = 0, std = 0, Q1 = 0, Q3 = 0, IQR = 0;
        if (nums.length > 5) {
          mean = nums.reduce((a, b) => a + b, 0) / nums.length;
          std = Math.sqrt(nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length);
          const sorted = [...nums].sort((a, b) => a - b);
          Q1 = sorted[Math.floor(sorted.length * 0.25)];
          Q3 = sorted[Math.floor(sorted.length * 0.75)];
          IQR = Q3 - Q1;
        }

        const thresholdStd = Math.max(std, 0.05 * Math.abs(mean), 0.01);
        const thresholdIQR = Math.max(IQR, 0.05 * Math.abs(Q1 || mean), 0.01);

        numsWithIdx.forEach(item => {
          if (std > 0 && Math.abs((item.val - mean) / thresholdStd) > 3) {
            anomalies.push({ originalIdx: item.originalIdx, value: item.original, type: 'Z-Score Outlier', severity: 'High' });
            return;
          }
          if (IQR > 0 && (item.val < Q1 - 1.5 * thresholdIQR || item.val > Q3 + 1.5 * thresholdIQR)) {
            anomalies.push({ originalIdx: item.originalIdx, value: item.original, type: 'IQR Fence Breach', severity: 'Medium' });
          }
        });
      }

      // Null spike (order-sensitive)
      let consec = 0;
      vals.forEach((v, i) => {
        const isNull = v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';
        if (isNull) {
          if (consec >= 5) anomalies.push({ originalIdx: groupRows[i].__originalIdx, value: 'NaN/Null', type: 'Sudden Null Spike', severity: 'High' });
          consec = 0;
        } else { consec++; }
      });

      // Flatline (order-sensitive)
      let rep = 1, repVal = vals[0];
      for (let i = 1; i < vals.length; i++) {
        const v = vals[i];
        const isNull = v === null || v === undefined || String(v).trim() === '' || String(v).toLowerCase() === 'null';
        if (!isNull && v === repVal) {
          rep++;
          if (rep === 5) anomalies.push({ originalIdx: groupRows[i].__originalIdx, value: v, type: 'Flatline Sequence', severity: 'Medium' });
        } else { rep = 1; repVal = v; }
      }

      result[key] = anomalies;
    });

    return result;
  }, [dqiDataset, targetColumn, dqiCategoryColumns]);



  const handleQuarantineAnomaly = (anomaly) => {
    if (!dqiDataset) return;
    const newRows = dqiDataset.sampleRows.filter(row => row.__originalIdx !== anomaly.index);
    const updatedDataset = {
      ...dqiDataset,
      rows: newRows.length,
      sampleRows: newRows
    };
    const auditMsg = `Quarantined record at row index ${anomaly.index + 1} for feature '${anomaly.feature}' due to ${anomaly.type}`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Quarantine', message: auditMsg }]);
    setDqiAnomalyLog(prev => prev.map(a => {
      if (a.id === anomaly.id || a.index === anomaly.index) {
        return { ...a, status: 'quarantined' };
      }
      return a;
    }));
    setDqiDataset(updatedDataset);
  };

  const handleImputeAnomaly = (anomaly) => {
    if (!dqiDataset) return;
    const colName = anomaly.feature;
    const colMeta = dqiDataset.columnsInfo.find(c => c.name === colName);
    const colType = colMeta ? colMeta.type : 'numeric';
    let replacementValue;
    if (colType === 'numeric') {
      const vals = dqiDataset.sampleRows
        .map(r => Number(r[colName]))
        .filter(v => !isNaN(v) && v !== null && v !== undefined);
      if (vals.length > 0) {
        vals.sort((a, b) => a - b);
        replacementValue = vals[Math.floor(vals.length / 2)];
      } else {
        replacementValue = 0;
      }
    } else {
      const counts = {};
      dqiDataset.sampleRows.forEach(r => {
        const v = r[colName];
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          counts[v] = (counts[v] || 0) + 1;
        }
      });
      const sortedModes = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      replacementValue = sortedModes.length > 0 ? sortedModes[0][0] : 'Mode';
    }
    const newRows = dqiDataset.sampleRows.map((row) => {
      if (row.__originalIdx === anomaly.index) {
        return { ...row, [colName]: replacementValue };
      }
      return row;
    });
    const updatedDataset = {
      ...dqiDataset,
      sampleRows: newRows
    };
    const auditMsg = `Imputed anomaly in feature '${colName}' at row index ${anomaly.index + 1} with value: '${replacementValue}'`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Impute', message: auditMsg }]);
    setDqiAnomalyLog(prev => prev.map(a => {
      if (a.id === anomaly.id) {
        return { ...a, status: 'imputed' };
      }
      return a;
    }));
    setDqiDataset(updatedDataset);
  };

  const handleAlertAnomaly = (anomaly) => {
    const auditMsg = `Raised alert notification for feature '${anomaly.feature}' at row index ${anomaly.index + 1} (${anomaly.type})`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Alert', message: auditMsg }]);
    setDqiAnomalyLog(prev => prev.map(a => {
      if (a.id === anomaly.id) {
        return { ...a, status: 'alerted' };
      }
      return a;
    }));
  };
  const handleIgnoreAnomaly = (anomaly, reason) => {
    const auditMsg = `Ignored anomaly in feature '${anomaly.feature}' at row index ${anomaly.index + 1}. Reason: ${reason || 'Not specified'}`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Ignore', message: auditMsg }]);
    setDqiAnomalyLog(prev => prev.map(a => {
      if (a.id === anomaly.id) {
        return { ...a, status: 'ignored', actionReason: reason };
      }
      return a;
    }));
  };

  const handleImputeAllAnomalies = () => {
    if (!dqiDataset) return;
    const activeAnoms = dqiAnomalyLog.filter(a => a.status === 'active');
    if (activeAnoms.length === 0) return;

    let updatedRows = [...dqiDataset.sampleRows];
    const replacementMap = {};

    activeAnoms.forEach(anom => {
      const colName = anom.feature;
      if (replacementMap[colName] === undefined) {
        const colMeta = dqiDataset.columnsInfo.find(c => c.name === colName);
        const colType = colMeta ? colMeta.type : 'numeric';
        if (colType === 'numeric') {
          const vals = dqiDataset.sampleRows
            .map(r => Number(r[colName]))
            .filter(v => !isNaN(v) && v !== null && v !== undefined);
          if (vals.length > 0) {
            vals.sort((a, b) => a - b);
            replacementMap[colName] = vals[Math.floor(vals.length / 2)];
          } else {
            replacementMap[colName] = 0;
          }
        } else {
          const counts = {};
          dqiDataset.sampleRows.forEach(r => {
            const v = r[colName];
            if (v !== null && v !== undefined && String(v).trim() !== '') {
              counts[v] = (counts[v] || 0) + 1;
            }
          });
          const sortedModes = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          replacementMap[colName] = sortedModes.length > 0 ? sortedModes[0][0] : 'Mode';
        }
      }

      const replacementValue = replacementMap[colName];
      const targetRowIdx = updatedRows.findIndex(r => r.__originalIdx === anom.index);
      if (targetRowIdx !== -1) {
        updatedRows[targetRowIdx] = {
          ...updatedRows[targetRowIdx],
          [colName]: replacementValue
        };
      }
    });

    const updatedDataset = {
      ...dqiDataset,
      sampleRows: updatedRows
    };

    const auditMsg = `Bulk imputed ${activeAnoms.length} active anomalies across features.`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Bulk Impute', message: auditMsg }]);

    setDqiAnomalyLog(prev => prev.map(a => {
      if (a.status === 'active') {
        return { ...a, status: 'imputed' };
      }
      return a;
    }));

    setDqiDataset(updatedDataset);
  };

  const handleQuarantineAllAnomalies = () => {
    if (!dqiDataset) return;
    const activeAnoms = dqiAnomalyLog.filter(a => a.status === 'active');
    if (activeAnoms.length === 0) return;

    const indicesToQuarantine = new Set(activeAnoms.map(a => a.index));
    const newRows = dqiDataset.sampleRows.filter(row => !indicesToQuarantine.has(row.__originalIdx));
    const updatedDataset = {
      ...dqiDataset,
      rows: newRows.length,
      sampleRows: newRows
    };

    const auditMsg = `Bulk quarantined ${indicesToQuarantine.size} record rows containing active anomalies.`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Bulk Quarantine', message: auditMsg }]);

    setDqiAnomalyLog(prev => prev.map(a => {
      if (indicesToQuarantine.has(a.index)) {
        return { ...a, status: 'quarantined' };
      }
      return a;
    }));

    setDqiDataset(updatedDataset);
  };

  const handleIgnoreAllAnomalies = (reason) => {
    const activeAnoms = dqiAnomalyLog.filter(a => a.status === 'active');
    if (activeAnoms.length === 0) return;

    const auditMsg = `Bulk ignored ${activeAnoms.length} active anomalies. Reason: ${reason || 'Not specified'}`;
    setDqiAuditTrail(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), action: 'Bulk Ignore', message: auditMsg }]);

    setDqiAnomalyLog(prev => prev.map(a => {
      if (a.status === 'active') {
        return { ...a, status: 'ignored', actionReason: reason };
      }
      return a;
    }));
  };

  const addInstance = useCallback((targetCol) => {
    if (!dataset) return;
    setInstances(prev => {
      if (prev.some(inst => inst.target === targetCol)) return prev;

      // Initialize with empty features - user selects manually on Page 7
      const selectedFeats = [];

      const targetMeta = dataset.columnsInfo.find(c => c.name === targetCol);
      let approach = 'regression';
      let instanceDateCol = dateColumn;
      const hasDateCol = dataset.columnsInfo.some(c => c.type === 'datetime' || String(c.name).toLowerCase().includes('date') || String(c.name).toLowerCase().includes('time'));
      if (targetMeta) {
        if (targetMeta.type === 'categorical' || targetMeta.uniqueCount <= 10) {
          approach = 'classification';
        } else if (hasDateCol) {
          approach = 'forecasting';
          const dateCol = dataset.columnsInfo.find(c => c.type === 'datetime' || String(c.name).toLowerCase().includes('date') || String(c.name).toLowerCase().includes('time'));
          if (dateCol) instanceDateCol = dateCol.name;
        }
      }

      // Use new model registry for auto-selection based on prediction type
      const goalTypeMap = {
        'classification': 'classification',
        'regression': 'regression',
        'forecasting': 'forecasting'
      };
      const goalType = goalTypeMap[approach] || 'regression';
      const recommendations = getRecommendations(goalType, { rows: dataset.rows, numeric_cols: dataset.numeric_cols });
      
      const defaultModels = [recommendations.primary?.id, ...recommendations.alternatives?.slice(0, 2).map(m => m.id)].filter(Boolean);
      const defaultHyperparameters = {};
      defaultModels.forEach(mId => {
        const modelMeta = MODELS[mId];
        defaultHyperparameters[mId] = { ...(modelMeta?.hyperparameters || { epochs: 100, learning_rate: 0.1 }) };
      });

      const newInstance = {
        id: 'inst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        target: targetCol,
        features: selectedFeats,
        approach,
        selectedModels: defaultModels,
        trainingChoice: 'train',
        reuseModelId: '',
        dateColumn: instanceDateCol,
        anomalyConfig: { method: 'iqr', threshold: 1.5 },
        anomalies: [],
        _anomalyScanned: false,
        splitMethod: (approach === 'forecasting' && instanceDateCol) ? 'chronological' : 'random',
        splitRatio: 80,
        hyperparameters: defaultHyperparameters,
        userOverrides: {}
      };

      return [...prev, newInstance];
    });
  }, [dataset, dateColumn]);

  useEffect(() => {
    if (!dataset) return;
    const rawList = backendTargetRecs ? backendTargetRecs.candidates : recommendTargetColumnsJS(dataset.columnsInfo, dataset.rows, -9999.0);
    const maxScore = Math.max(...rawList.map(c => c.score || 0));
    const scoredList = rawList.map(c => ({
      ...c,
      score: maxScore > 0 ? Math.round(((c.score || 0) / maxScore) * 10000) / 10000 : 0.0
    }));
    
    if (scoredList.length > 0 && instances.length === 0 && !targetConfirmed && !hasAutoSelectedRef.current) {
      const topRecs = scoredList.filter(item => item.score >= 0.85);
      if (topRecs.length > 0) {
        topRecs.forEach(item => {
          addInstance(item.column);
        });
      } else {
        addInstance(scoredList[0].column);
      }
      setTargetConfirmed(false);
      hasAutoSelectedRef.current = true;
    }
  }, [dataset, backendTargetRecs, instances.length, targetConfirmed, addInstance]);

  const removeInstance = useCallback((id) => {
    setInstances(prev => prev.filter(inst => inst.id !== id));
  }, []);

  const updateInstanceFeatures = useCallback((id, newFeatures) => {
    setInstances(prev => prev.map(inst => inst.id === id ? { ...inst, features: newFeatures } : inst));
  }, []);

  const updateInstanceModels = (id, newModels) => {
    setInstances(instances.map(inst => {
      if (inst.id === id) {
        // Initialize hyperparameters for any newly added models
        const currentModels = inst.selectedModels || [];
        const addedModels = newModels.filter(m => !currentModels.includes(m));
        
        const newHyperparameters = { ...inst.hyperparameters };
        const newCollapsedHypers = { ...inst.collapsedHypers };
        
        addedModels.forEach(modelId => {
          const modelMeta = MODELS[modelId];
          if (modelMeta && modelMeta.hyperparameters) {
            newHyperparameters[modelId] = { ...modelMeta.hyperparameters };
            newCollapsedHypers[modelId] = true;
          } else {
            // Default hyperparameters if not defined in registry
            newHyperparameters[modelId] = { epochs: 100, learning_rate: 0.1, batch_size: 32, regularization: 'none', lambda: 0.01, seed: 42 };
            newCollapsedHypers[modelId] = true;
          }
        });
        
        return { 
          ...inst, 
          selectedModels: newModels,
          hyperparameters: newHyperparameters,
          collapsedHypers: newCollapsedHypers
        };
      }
      return inst;
    }));
  };

  const updateInstanceTrainingChoice = (id, choice) => {
    setInstances(instances.map(inst => inst.id === id ? { ...inst, trainingChoice: choice } : inst));
  };

  const updateInstanceReuseModel = (id, modelId) => {
    setInstances(instances.map(inst => inst.id === id ? { ...inst, reuseModelId: modelId } : inst));
  };

  const handleSaveModel = async (inst, modelId, modelData) => {
    const key = `${inst.id}-${modelId}`;
    setSavingModelIds(prev => ({ ...prev, [key]: true }));
    try {
      const payload = {
        modality: inst.approach,
        model_name: modelData.name,
        dataset_name: dataset?.name || "dataset",
        target_column: inst.target,
        feature_count: inst.features.length,
        metrics: modelData.metrics,
        config: {
          features: inst.features,
          split: splitRatio / 100,
          split_method: splitMethod || "random"
        },
        model_artifact: JSON.stringify({
          goal: inst.approach,
          targetColumn: inst.target,
          models: {
            [modelId]: modelData
          },
          selectedModels: [modelId],
          features: inst.features
        }),
        user_id: authUsername
      };

      console.log('Saving model with payload:', payload);

      const r = await fetch('http://localhost:7860/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': authToken
        },
        body: JSON.stringify(payload)
      });

      console.log('Save response status:', r.status);

      if (r.ok) {
        const responseData = await r.json();
        console.log('Save response data:', responseData);
        setSavedModelIds(prev => ({ ...prev, [key]: true }));
        await fetchTrainingHistory();
      } else {
        const errorData = await r.json();
        console.error('Save failed:', errorData);
        alert(`Failed to save model: ${errorData.detail || 'Please check connection.'}`);
      }
    } catch (e) {
      console.error('Save error:', e);
      alert("Failed to save model due to network error.");
    } finally {
      setSavingModelIds(prev => ({ ...prev, [key]: false }));
    }
  };

  // Navigations & validations for 10-step wizard
  const isPage1Valid = !!dataset;
  const isPage2Valid = true; // Clean is optional
  const isPage3Valid = instances.length > 0 && targetConfirmed; // Target select is required and must be confirmed
  const isPage4Valid = true; // Aggregation is optional
  const isPage5Valid = true; // Anomalies are optional
  const isPage6Valid = true; // Split is pre-configured
  const isPage7Valid = instances.length > 0 && instances.some(inst => inst.features && inst.features.length > 0); // At least one target needs features selected
  const isPage8Valid = true; // Tuning overrides are optional
  const isPage9Valid = true; // Training execution
  const isPage10Valid = true;

  const isPageValid = (p) => {
    if (p === 1) return isPage1Valid;
    if (p === 2) return isPage2Valid;
    if (p === 3) return isPage3Valid;
    if (p === 4) return isPage4Valid;
    if (p === 5) return isPage5Valid;
    if (p === 6) return isPage6Valid;
    if (p === 7) return isPage7Valid;
    if (p === 8) return isPage8Valid;
    if (p === 9) return isPage9Valid;
    return true;
  };

  const PAGE_SEQUENCE = [1, 2, 3, 7, 5, 4, 6, 8, 9, 10];

  const handleNextPage = () => {
    const idx = PAGE_SEQUENCE.indexOf(page);
    if (idx !== -1 && idx < PAGE_SEQUENCE.length - 1) {
      const nextPage = PAGE_SEQUENCE[idx + 1];
      if (isPageValid(page)) {
        if (page === 9) {
          handleStartTraining();
        } else {
          setPage(nextPage);
        }
      }
    }
  };

  const handlePrevPage = () => {
    const idx = PAGE_SEQUENCE.indexOf(page);
    if (idx > 0) {
      setPage(PAGE_SEQUENCE[idx - 1]);
    }
  };

  // Reset to hyperparameters default helper
  const resetHyperparameters = (modelId) => {
    const model = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
    if (!model) return;
    setHyperparameters(prev => ({
      ...prev,
      [modelId]: { ...(model.hyperparameters || { epochs: 100, learning_rate: 0.1, batch_size: 32, regularization: 'none', lambda: 0.01, seed: 42 }) }
    }));
  };

  const getForecastData = (targetCol) => {
    // Determine the approach from the instance target rather than relying solely on global goal state,
    // since multiple target instances with different tasks can run in multi-instance model testing.
    const inst = instances.find(i => i.target === targetCol);
    const approach = inst ? inst.approach : goal;
    const instanceDateColumn = inst ? inst.dateColumn : dateColumn;
    if (!activeDataset || !targetCol) return [];

    // Get the instance results for this target
    const instResult = instancesResults[inst?.id];
    const selectedModels = inst?.selectedModels || [];

    // Dataset is pre-sorted by addYearMonthVirtualColumn at load time.
    // Still sort here for safety in case dateColumn is a raw col (not the virtual key).
    let sortedRows = [...activeDataset.sampleRows];
    if (instanceDateColumn && instanceDateColumn === '__vd__') {
      // '__vd__' values are already YYYY-MM strings — sort lexicographically (ISO-safe)
      sortedRows.sort((a, b) => String(a['__vd__'] || '').localeCompare(String(b['__vd__'] || '')));
    } else if (instanceDateColumn) {
      sortedRows.sort((a, b) => {
        const valA = a[instanceDateColumn];
        const valB = b[instanceDateColumn];
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        const dateA = Date.parse(String(valA || ''));
        const dateB = Date.parse(String(valB || ''));
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
        return String(valA || '').localeCompare(String(valB || ''));
      });
    }

    const targetValues = sortedRows.map(r => {
      const raw = r[targetCol];
      if (raw === null || raw === undefined || raw === '') return NaN;
      const cleaned = String(raw).replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned);
    }).filter(v => !isNaN(v));

    let dates;
    if (instanceDateColumn && instanceDateColumn === '__vd__') {
      // Virtual col already stores the formatted period string (e.g. "2023-04")
      dates = sortedRows.map(r => String(r['__vd__'] || ''));
    } else if (instanceDateColumn) {
      dates = sortedRows.map(r => String(r[instanceDateColumn] || ''));
    } else {
      dates = sortedRows.map((_, i) => `Row ${i + 1}`);
    }

    const histCount = Math.min(targetValues.length, 60);
    const startIndex = targetValues.length - histCount;
    const historicalValues = targetValues.slice(startIndex);
    const historicalDates = dates.slice(startIndex);

    const chartData = [];

    const lastHistVal = historicalValues[historicalValues.length - 1] || 100;

    const trendSpan = Math.min(historicalValues.length, 10);
    let slope = 0;
    if (trendSpan > 1) {
      const last10 = historicalValues.slice(-trendSpan);
      slope = (last10[last10.length - 1] - last10[0]) / (trendSpan - 1);
    }

    // Generate synthetic predictions for each selected model
    for (let i = 0; i < histCount; i++) {
      const dataPoint = {
        period: historicalDates[i] || `t - ${histCount - 1 - i}`,
        actual: historicalValues[i],
      };

      // Add synthetic predictions for each selected model
      selectedModels.forEach((modelId, idx) => {
        const modelOffset = modelId.charCodeAt(0) || 0;
        const noise = (Math.sin(i * 0.5 + modelOffset) * lastHistVal * 0.05);
        const predVal = historicalValues[i] + slope * (i - histCount/2) + noise;
        dataPoint[modelId] = Math.max(0, Number(predVal.toFixed(2)));
      });

      chartData.push(dataPoint);
    }

    // For forecasting, add future predictions
    if (approach === 'forecasting' && instanceDateColumn) {
      let lastDate = new Date(historicalDates[historicalDates.length - 1] || '2026-06-15');
      if (isNaN(lastDate.getTime())) lastDate = new Date();

      const addPeriod = (d, freq, step) => {
        const newD = new Date(d.getTime());
        if (freq === 'Daily') newD.setDate(newD.getDate() + step);
        else if (freq === 'Weekly') newD.setDate(newD.getDate() + step * 7);
        else if (freq === 'Monthly') newD.setMonth(newD.getMonth() + step);
        else if (freq === 'Quarterly') newD.setMonth(newD.getMonth() + step * 3);
        else if (freq === 'Yearly') newD.setFullYear(newD.getFullYear() + step);
        return newD;
      };

      for (let step = 1; step <= forecastHorizon; step++) {
        const futureDate = addPeriod(lastDate, forecastFrequency, step);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const seasonComponent = Math.sin((step * 2 * Math.PI) / 12) * (lastHistVal * 0.1);
        const noise = (Math.random() - 0.5) * (lastHistVal * 0.02);

        const forecastVal = Math.max(0, lastHistVal + slope * step + seasonComponent + noise);
        const uncertainty = (0.05 * forecastVal + 0.02 * step * forecastVal);

        const dataPoint = {
          period: futureDateStr,
          actual: step === 1 ? lastHistVal : null,
        };

        // Add future predictions for each selected model
        selectedModels.forEach((modelId, idx) => {
          const modelOffset = modelId.charCodeAt(0) || 0;
          const modelMultiplier = 0.95 + (idx * 0.02) + ((modelOffset % 10) * 0.005);
          const modelVal = step === 1 ? lastHistVal : Number((forecastVal * modelMultiplier).toFixed(2));
          dataPoint[modelId] = modelVal;
        });

        dataPoint.range = [
          Number(Math.max(0, forecastVal - uncertainty).toFixed(2)),
          Number((forecastVal + uncertainty).toFixed(2))
        ];

        chartData.push(dataPoint);
      }
    }

    return chartData;
  };

  const forecastData = useMemo(() => {
    return getForecastData(targetColumn);
  }, [activeDataset, targetColumn, dateColumn, goal, forecastHorizon, forecastFrequency, triggerForecastUpdate]);

  const handleRunPredictNewInput = () => {
    if (!activeDataset) return;

    let classes = ['Class A', 'Class B'];
    if (goal === 'classification' && targetColumn) {
      const targetMeta = activeDataset.columnsInfo.find(c => c.name === targetColumn);
      if (targetMeta) {
        const vals = new Set();
        activeDataset.sampleRows.forEach(r => {
          if (r[targetColumn] !== null && r[targetColumn] !== undefined) {
            vals.add(String(r[targetColumn]));
          }
        });
        if (vals.size > 0) {
          classes = Array.from(vals);
        }
      }
    }

    const results = {};

    selectedModels.forEach(modelId => {
      const modelMeta = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
      const modelName = modelMeta ? modelMeta.name : modelId;

      if (goal === 'classification') {
        let sum = 0;
        Object.entries(predictInputs).forEach(([k, v]) => {
          if (!isNaN(Number(v))) sum += Number(v);
          else sum += String(v).charCodeAt(0) || 0;
        });

        const modelOffset = modelId.charCodeAt(0) || 0;
        const idx = Math.abs(Math.round(sum + modelOffset)) % classes.length;
        const predictedClass = classes[idx];

        const probs = {};
        let total = 0;
        classes.forEach((c, i) => {
          if (i === idx) {
            probs[c] = 70 + (Math.abs(Math.round((sum + modelOffset) * 7)) % 21);
          } else {
            probs[c] = 5 + (Math.abs(Math.round((sum + modelOffset) * (i + 1))) % 10);
          }
          total += probs[c];
        });

        classes.forEach(c => {
          probs[c] = Math.round((probs[c] / total) * 100);
        });

        results[modelId] = {
          name: modelName,
          prediction: predictedClass,
          probabilities: probs
        };
      } else if (goal === 'regression') {
        let pred = 0;
        let weightSum = 0;
        selectedFeaturesList.forEach(feat => {
          const val = Number(predictInputs[feat]) || 0;
          const corrVal = featureStatuses[feat]?.corr || 0.1;
          pred += val * corrVal;
          weightSum += Math.abs(corrVal);
        });

        const targetMeta = dataset.columnsInfo.find(c => c.name === targetColumn);
        const targetSamples = targetMeta?.samples ? targetMeta.samples.filter(v => v !== null && v !== undefined) : [];
        const meanTarget = targetSamples.length > 0 ? targetSamples.reduce((a, b) => a + Number(b), 0) / targetSamples.length : 100;

        let predictionVal = meanTarget + (weightSum > 0 ? (pred / weightSum) * (meanTarget * 0.25) : 0);
        if (isNaN(predictionVal)) predictionVal = 100;

        const modelMultiplier = modelId.includes('lgbm') ? 1.01 : modelId.includes('rf') ? 0.99 : 0.97;
        const finalVal = predictionVal * modelMultiplier;

        results[modelId] = {
          name: modelName,
          prediction: Number(finalVal.toFixed(2)),
          range: [
            Number((finalVal * 0.9).toFixed(2)),
            Number((finalVal * 1.1).toFixed(2))
          ]
        };
      } else if (goal === 'forecasting') {
        let sum = 0;
        selectedFeaturesList.forEach(feat => {
          const val = Number(predictInputs[feat]) || 0;
          sum += val;
        });

        const targetMeta = dataset.columnsInfo.find(c => c.name === targetColumn);
        const targetSamples = targetMeta?.samples ? targetMeta.samples.filter(v => v !== null && v !== undefined) : [];
        const meanTarget = targetSamples.length > 0 ? targetSamples.reduce((a, b) => a + Number(b), 0) / targetSamples.length : 100;

        const finalVal = meanTarget + (sum !== 0 ? (sum / selectedFeaturesList.length) * 0.05 : 0);

        results[modelId] = {
          name: modelName,
          prediction: Number(finalVal.toFixed(2)),
          range: [
            Number((finalVal * 0.9).toFixed(2)),
            Number((finalVal * 1.1).toFixed(2))
          ]
        };
      } else {
        results[modelId] = {
          name: modelName,
          prediction: `Cluster ${Math.abs(Math.round(Object.values(predictInputs).reduce((a, b) => a + (Number(b) || 0), 0))) % 5}`
        };
      }
    });

    setPredictionResults(results);
  };

  // Multi-scenario custom prediction playground handlers
  const addScenarioRow = (instanceId, features) => {
    setCustomScenarios(prev => {
      const current = prev[instanceId] || [];
      const newIdx = current.length + 1;
      const initialInputs = {};
      features.forEach(feat => {
        const colMeta = dataset.columnsInfo.find(c => c.name === feat);
        if (colMeta) {
          if (colMeta.type === 'numeric') {
            initialInputs[feat] = '';
          } else {
            const samples = dataset.sampleRows.map(r => r[feat]).filter(v => v !== null && v !== undefined);
            initialInputs[feat] = samples[0] ?? '';
          }
        } else {
          initialInputs[feat] = '';
        }
      });

      const newScenario = {
        id: 'scenario_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `Scenario ${newIdx}`,
        inputs: initialInputs,
        predictions: {}
      };
      return {
        ...prev,
        [instanceId]: [...current, newScenario]
      };
    });
  };

  const removeScenarioRow = (instanceId, scenarioId) => {
    setCustomScenarios(prev => {
      const current = prev[instanceId] || [];
      return {
        ...prev,
        [instanceId]: current.filter(s => s.id !== scenarioId)
      };
    });
  };

  const updateScenarioField = (instanceId, scenarioId, field, value) => {
    setCustomScenarios(prev => {
      const current = prev[instanceId] || [];
      return {
        ...prev,
        [instanceId]: current.map(s => s.id === scenarioId ? { ...s, [field]: value } : s)
      };
    });
  };

  const calculateScenarioPredictions = (inst, inputs) => {
    const goal = inst.approach;
    const targetCol = inst.target;
    const selectedFeats = inst.features;
    const predictions = {};

    inst.selectedModels.forEach(modelId => {
      if (goal === 'classification') {
        let classes = ['Class A', 'Class B'];
        const targetMeta = activeDataset.columnsInfo.find(c => c.name === targetCol);
        if (targetMeta) {
          const vals = new Set();
          activeDataset.sampleRows.forEach(r => {
            if (r[targetCol] !== null && r[targetCol] !== undefined) {
              vals.add(String(r[targetCol]));
            }
          });
          if (vals.size > 0) classes = Array.from(vals);
        }

        let sum = 0;
        Object.entries(inputs).forEach(([k, v]) => {
          if (!isNaN(Number(v))) sum += Number(v);
          else sum += String(v).charCodeAt(0) || 0;
        });

        const modelOffset = modelId.charCodeAt(0) || 0;
        const idx = Math.abs(Math.round(sum + modelOffset)) % classes.length;
        predictions[modelId] = classes[idx];

      } else if (goal === 'regression' || goal === 'forecasting') {
        let pred = 0;
        let weightSum = 0;
        selectedFeats.forEach(feat => {
          const val = Number(inputs[feat]) || 0;
          const corrVal = featureStatuses[feat]?.corr || 0.1;
          pred += val * corrVal;
          weightSum += Math.abs(corrVal);
        });

        const targetMeta = dataset.columnsInfo.find(c => c.name === targetCol);
        const targetSamples = targetMeta?.samples ? targetMeta.samples.filter(v => v !== null && v !== undefined) : [];
        const meanTarget = targetSamples.length > 0 ? targetSamples.reduce((a, b) => a + Number(b), 0) / targetSamples.length : 100;

        let predictionVal = meanTarget + (weightSum > 0 ? (pred / weightSum) * (meanTarget * 0.25) : 0);
        if (isNaN(predictionVal)) predictionVal = 100;

        const modelMultiplier = modelId.includes('lgbm') ? 1.01 : modelId.includes('rf') ? 0.99 : modelId.includes('ridge') ? 0.98 : 1.0;
        predictions[modelId] = Number((predictionVal * modelMultiplier).toFixed(2));

      } else if (goal === 'clustering') {
        let sum = 0;
        Object.values(inputs).forEach(v => {
          sum += Number(v) || 0;
        });
        predictions[modelId] = `Cluster ${Math.abs(Math.round(sum)) % 5}`;
      }
    });

    return predictions;
  };

  const updateScenarioInput = (instanceId, scenarioId, feat, value, inst) => {
    setCustomScenarios(prev => {
      const current = prev[instanceId] || [];
      return {
        ...prev,
        [instanceId]: current.map(s => {
          if (s.id === scenarioId) {
            const nextInputs = { ...s.inputs, [feat]: value };
            const nextPredictions = calculateScenarioPredictions(inst, nextInputs);
            return {
              ...s,
              inputs: nextInputs,
              predictions: nextPredictions
            };
          }
          return s;
        })
      };
    });
  };

  const downloadScenariosCSV = (inst) => {
    const list = customScenarios[inst.id] || [];
    if (list.length === 0) return;

    let headers = ['Scenario Name', ...inst.features];
    inst.selectedModels.forEach(modelId => {
      const modelMeta = MODEL_REGISTRY[inst.approach]?.find(m => m.id === modelId);
      headers.push(modelMeta?.name || modelId);
    });

    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\r\n';

    list.forEach(s => {
      let row = [s.name];
      inst.features.forEach(feat => {
        row.push(s.inputs[feat] ?? '');
      });
      inst.selectedModels.forEach(modelId => {
        row.push(s.predictions[modelId] ?? '');
      });
      csvContent += row.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `custom_predictions_${inst.target}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e, inst) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (event) => {
      try {
        let rawHeaders = [];
        let parsedRows = [];

        if (isExcel) {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (jsonData.length === 0) {
            alert("Error: The uploaded spreadsheet is empty.");
            return;
          }
          // Filter out empty headers
          rawHeaders = jsonData[0].map(h => String(h || '').trim()).filter(h => h !== '');
          for (let i = 1; i < Math.min(jsonData.length, 10000); i++) {
            const cols = jsonData[i];
            if (!cols || cols.length === 0) continue;
            parsedRows.push(cols.map(c => c === undefined || c === null ? '' : String(c).trim()));
          }
        } else {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (lines.length === 0) {
            alert("Error: The uploaded CSV file is empty.");
            return;
          }

          const splitCSVRow = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result.map(v => v.replace(/^["']|["']$/g, ''));
          };

          rawHeaders = splitCSVRow(lines[0]);
          for (let i = 1; i < lines.length; i++) {
            parsedRows.push(splitCSVRow(lines[i]));
          }
        }

        const headersLower = rawHeaders.map(h => String(h || '').toLowerCase().trim());

        // Validate required headers
        const missingRequired = [];
        const nameColIdx = headersLower.findIndex(h => h === 'scenario name' || h === 'name' || h === 'scenario');
        if (nameColIdx === -1) {
          missingRequired.push('Scenario Name');
        }

        const featureColMapping = {};
        inst.features.forEach(feat => {
          const idx = headersLower.findIndex(h => h === feat.toLowerCase().trim());
          if (idx === -1) {
            missingRequired.push(feat);
          } else {
            featureColMapping[feat] = idx;
          }
        });

        if (missingRequired.length > 0) {
          alert(`Error: The uploaded file is missing the following required columns:\n- ${missingRequired.join('\n- ')}`);
          e.target.value = '';
          return;
        }

        const cleanRows = [];
        const errorRows = [];
        const warningRows = [];
        
        const existingNames = new Set(
          (customScenarios[inst.id] || []).map(s => String(s.name || '').toLowerCase().trim())
        );
        const namesInCSV = new Set();

        for (let i = 0; i < parsedRows.length; i++) {
          const rowNum = i + 2; // Spreadsheet row index (2-based)
          const cols = parsedRows[i];
          
          if (cols.length < rawHeaders.length) {
            errorRows.push({
              rowNum,
              message: `Column count mismatch (expected ${rawHeaders.length}, found ${cols.length})`
            });
            continue;
          }

          const scenarioName = cols[nameColIdx] ? cols[nameColIdx].trim() : '';
          if (!scenarioName) {
            errorRows.push({
              rowNum,
              message: "Scenario Name is empty or missing"
            });
            continue;
          }

          // Check duplicate name warnings
          const scenarioNameLower = scenarioName.toLowerCase();
          if (existingNames.has(scenarioNameLower) || namesInCSV.has(scenarioNameLower)) {
            warningRows.push({
              rowNum,
              message: `Scenario name '${scenarioName}' is a duplicate`
            });
          }
          namesInCSV.add(scenarioNameLower);

          // Validate feature values
          const rowInputs = {};
          let hasValError = false;

          for (const feat of inst.features) {
            const colMeta = dataset.columnsInfo.find(c => c.name === feat);
            const valIdx = featureColMapping[feat];
            const val = cols[valIdx] !== undefined ? cols[valIdx].trim() : '';

            if (colMeta?.type === 'numeric') {
              if (val === '') {
                errorRows.push({
                  rowNum,
                  column: feat,
                  message: `Numeric column '${feat}' is empty`
                });
                hasValError = true;
                break;
              }
              const numVal = Number(val);
              if (isNaN(numVal)) {
                errorRows.push({
                  rowNum,
                  column: feat,
                  message: `Numeric column '${feat}' has non-numeric value: '${val}'`
                });
                hasValError = true;
                break;
              }
              rowInputs[feat] = numVal;
            } else {
              // Categorical feature
              if (val === '') {
                errorRows.push({
                  rowNum,
                  column: feat,
                  message: `Categorical column '${feat}' is empty`
                });
                hasValError = true;
                break;
              }
              rowInputs[feat] = val;
            }
          }

          if (hasValError) continue;

          // If clean, store inputs
          cleanRows.push({
            name: scenarioName,
            inputs: rowInputs,
            rowNum
          });
        }

        if (cleanRows.length === 0) {
          alert(`Error: No valid scenario rows could be parsed from the file.\n- Valid rows: 0\n- Error rows: ${errorRows.length}`);
          setCsvFeedback(prev => ({
            ...prev,
            [inst.id]: { successCount: 0, errors: errorRows, warnings: warningRows }
          }));
          e.target.value = '';
          return;
        }

        // confirmation checks
        if (cleanRows.length >= 100) {
          const confirmLarge = window.confirm(`Warning: You are importing a large file with ${cleanRows.length} rows. This might take a few moments. Do you want to proceed?`);
          if (!confirmLarge) {
            e.target.value = '';
            return;
          }
        }

        const summaryMsg = `File Validation Summary:
- Clean rows to import: ${cleanRows.length}
- Rows with errors (will be skipped): ${errorRows.length}
${errorRows.length > 0 ? '\nSpecific Errors:\n' + errorRows.map(e => `  * Row ${e.rowNum}: ${e.message}`).slice(0, 10).join('\n') + (errorRows.length > 10 ? '\n  * ...and more' : '') : ''}
${warningRows.length > 0 ? '\nWarnings:\n' + warningRows.map(w => `  * Row ${w.rowNum}: ${w.message}`).slice(0, 10).join('\n') + (warningRows.length > 10 ? '\n  * ...and more' : '') : ''}

Do you want to import the ${cleanRows.length} clean rows?`;

        const proceed = window.confirm(summaryMsg);
        if (!proceed) {
          e.target.value = '';
          return;
        }

        // Append to state
        const newScenariosToAppend = cleanRows.map((row, idx) => {
          const nextPredictions = calculateScenarioPredictions(inst, row.inputs);
          return {
            id: 'scenario_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) + '_' + idx,
            name: row.name,
            inputs: row.inputs,
            predictions: nextPredictions
          };
        });

        setCustomScenarios(prev => {
          const current = prev[inst.id] || [];
          return {
            ...prev,
            [inst.id]: [...current, ...newScenariosToAppend]
          };
        });

        // Set feedback
        setCsvFeedback(prev => ({
          ...prev,
          [inst.id]: {
            successCount: cleanRows.length,
            errors: errorRows,
            warnings: warningRows
          }
        }));

      } catch (err) {
        console.error("Scenario import error:", err);
        alert("An unexpected error occurred during parsing: " + err.message);
      } finally {
        e.target.value = '';
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };


  // ==========================================
  // 5. MOCK TRAINING SIMULATION ENGINE
  // ==========================================
  const generateMockResultsForInstance = (inst) => {
    const goal = inst.approach;
    const targetColumn = inst.target;
    const selectedModels = inst.selectedModels;
    const selectedFeaturesList = inst.features;

    const trained = {};

    selectedModels.forEach(modelId => {
      const modelMeta = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
      const mName = modelMeta ? modelMeta.name : modelId;
      
      let mape = 2.1;
      let rmse = 48.5;
      if (modelId === 'prophet_time') {
        mape = 1.5 + Math.random() * 1.0;
        rmse = 40 + Math.random() * 20;
      } else if (modelId === 'arima_time') {
        mape = 2.0 + Math.random() * 1.5;
        rmse = 50 + Math.random() * 30;
      } else if (modelId === 'lstm_time') {
        mape = 2.5 + Math.random() * 2.0;
        rmse = 60 + Math.random() * 40;
      } else {
        mape = 3.0 + Math.random() * 2.0;
        rmse = 70 + Math.random() * 50;
      }

      const metrics = {
        'MAPE': mape.toFixed(2) + '%',
        'RMSE': rmse.toFixed(2),
        'R-squared': (0.85 + Math.random() * 0.12).toFixed(3),
        'MAE': (rmse * 0.75).toFixed(2)
      };

      const instHyper = { ...inst.hyperparameters?.[modelId], ...inst.userOverrides?.[modelId] };
      const epochsCount = Number(instHyper.epochs) || 20;
      const lossCurve = [];
      for (let epoch = 1; epoch <= epochsCount; epoch++) {
        const decay = Math.exp(-epoch / (epochsCount * 0.4));
        lossCurve.push({
          epoch,
          trainLoss: parseFloat((0.15 + 0.7 * decay + Math.sin(epoch) * 0.01).toFixed(4)),
          valLoss: parseFloat((0.18 + 0.74 * decay + Math.sin(epoch) * 0.02).toFixed(4))
        });
      }

      const featureImportances = selectedFeaturesList.map((f) => ({
        name: f,
        value: parseFloat((Math.max(5, 100 / selectedFeaturesList.length + (Math.random() - 0.5) * 15)).toFixed(1))
      })).sort((a, b) => b.value - a.value);

      trained[modelId] = {
        id: modelId,
        name: mName,
        desc: modelMeta?.desc || '',
        metrics,
        lossCurve,
        featureImportances,
        overallScore: `MAPE ${mape.toFixed(2)}%`,
        status: 'completed'
      };
    });

    return {
      goal,
      targetColumn,
      models: trained,
      selectedModels,
      features: selectedFeaturesList
    };
  };

  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);

    const steps = [
      { text: 'Preprocessing feature columns & parsing types...', delay: 100 },
      { text: 'Applying one-hot encoding on categorical inputs...', delay: 100 },
      { text: 'Handling missing values and scale normalizations...', delay: 100 },
      { text: 'Running feature selection pipeline...', delay: 100 },
      { text: 'Building model hyperparameters...', delay: 100 },
      { text: 'Evaluating loss values & validation accuracy parameters...', delay: 100 }
    ];

    let currentStep = 0;

    const runStep = async () => {
      if (currentStep < steps.length) {
        setTrainingStatusText(steps[currentStep].text);
        setTrainingProgress(Math.min(((currentStep + 1) / steps.length) * 100, 100));
        setTimeout(() => {
          currentStep++;
          runStep();
        }, steps[currentStep].delay);
      } else {
        // Complete training per instance
        const results = {};
        instances.forEach(inst => {
          if (inst.trainingChoice === 'reuse') {
            const savedRun = trainingHistory.find(r => r.id === parseInt(inst.reuseModelId));
            if (savedRun) {
              try {
                const parsed = typeof savedRun.model_artifact === 'string'
                  ? JSON.parse(savedRun.model_artifact)
                  : savedRun.model_artifact;
                results[inst.id] = parsed;
              } catch (e) {
                console.error("Failed to parse saved run artifact", e);
                results[inst.id] = generateMockResultsForInstance(inst);
              }
            } else {
              results[inst.id] = generateMockResultsForInstance(inst);
            }
          } else {
            results[inst.id] = generateMockResultsForInstance(inst);
          }
        });

        setInstancesResults(results);
        setTrainingResults(results); // Set global trainingResults for isPage3Valid downstream check compatibility
        setIsTraining(false);
        
        // Mark project as completed when training finishes
        const projName = currentProjectName || `Untitled Project — ${new Date().toLocaleString()}`;
        await saveProject(projName, !!currentProjectId, null, 1);
        
        setPage(10);
      }
    };

    runStep();
  };

  // Metrics, charts, predictions simulation
  const generateMockResults = () => {
    // Uses the component-level activeDataset (which applies aggregation after outlier resolution)
    const trained = {};
    const comparisonRows = [];

    // Selected features to calculate importances (automatically expanded to include engineered temporal/cyclical features)
    let expandedFeatures = [...selectedFeaturesList];
    detectedTimeComponents.forEach(comp => {
      if (timeComponentToggles[comp.id]) {
        if (comp.componentType === 'year') {
          if (!expandedFeatures.includes(`${comp.colName}_norm`)) {
            expandedFeatures.push(`${comp.colName}_norm`);
          }
          expandedFeatures = expandedFeatures.filter(f => f !== comp.colName);
        } else {
          if (!expandedFeatures.includes(`${comp.colName}_sin`)) {
            expandedFeatures.push(`${comp.colName}_sin`);
          }
          if (!expandedFeatures.includes(`${comp.colName}_cos`)) {
            expandedFeatures.push(`${comp.colName}_cos`);
          }
          expandedFeatures = expandedFeatures.filter(f => f !== comp.colName);
        }
      }
    });
    const hasYear = detectedTimeComponents.some(c => c.componentType === 'year' && timeComponentToggles[c.id]);
    const hasMonth = detectedTimeComponents.some(c => c.componentType === 'month' && timeComponentToggles[c.id]);
    if (hasYear || hasMonth) {
      if (!expandedFeatures.includes("elapsed_time")) {
        expandedFeatures.push("elapsed_time");
      }
    }
    if (goal === 'forecasting' && targetColumn) {
      const lags = [`${targetColumn}_lag_1`, `${targetColumn}_lag_yoy`, `${targetColumn}_roll_mean_3`, `${targetColumn}_roll_mean_yoy`];
      lags.forEach(l => {
        if (!expandedFeatures.includes(l)) {
          expandedFeatures.push(l);
        }
      });
    }
    const features = expandedFeatures.length > 0 ? expandedFeatures : ['feature_1', 'feature_2'];

    selectedModels.forEach(modelId => {
      const modelMeta = MODEL_REGISTRY[goal].find(m => m.id === modelId);
      const mName = modelMeta ? modelMeta.name : modelId;

      // Seed variation per model
      const multiplier = modelId.includes('xgb') || modelId.includes('lgbm') ? 1.02 : modelId.includes('rf') ? 0.99 : 0.92;

      let metrics = {};
      let lossCurve = [];
      let featureImportances = [];
      let confusionMatrix = null;
      let overallScoreBadge = '';

      // Create realistic learning curves
      const epochsCount = hyperparameters[modelId]?.epochs || 20;
      let trainLoss = 0.85;
      let valLoss = 0.92;
      for (let epoch = 1; epoch <= epochsCount; epoch++) {
        const decay = Math.exp(-epoch / (epochsCount * 0.4));
        const noise = (Math.sin(epoch) * 0.02) * (1 - decay);
        lossCurve.push({
          epoch,
          trainLoss: parseFloat((0.15 + 0.7 * decay + noise * 0.3).toFixed(4)),
          valLoss: parseFloat((0.18 + 0.74 * decay + noise * 0.8).toFixed(4))
        });
      }

      // Feature Importance values
      const sumImp = features.reduce((acc, f) => acc + (Math.abs(getFeatureCorrelation(f)) + Math.random() * 0.1), 0);
      featureImportances = features.map(f => {
        const score = (Math.abs(getFeatureCorrelation(f)) + Math.random() * 0.1) / sumImp;
        return { name: f, value: parseFloat((score * 100).toFixed(1)) };
      }).sort((a, b) => b.value - a.value).slice(0, 10);

      // Populate tasks metrics
      if (goal === 'classification') {
        const acc = Math.min(0.97, Math.max(0.72, 0.88 * multiplier));
        const prec = Math.min(0.98, Math.max(0.70, acc * 1.01 - 0.01));
        const rec = Math.min(0.98, Math.max(0.70, acc * 0.99 + 0.01));
        const f1 = 2 * (prec * rec) / (prec + rec);
        const auc = Math.min(0.99, acc * 1.04);

        metrics = {
          'Accuracy': (acc * 100).toFixed(1) + '%',
          'Precision': (prec * 100).toFixed(1) + '%',
          'Recall': (rec * 100).toFixed(1) + '%',
          'F1-Score': (f1 * 100).toFixed(1) + '%',
          'AUC-ROC': auc.toFixed(3)
        };
        overallScoreBadge = `Accuracy ${(acc * 100).toFixed(1)}%`;

        // Confusion matrix proportions
        const activeRows = (applyAggregation && groupByColumns.length > 0) ? estimatedOutputRows : activeDataset.rows;
        const testSize = Math.round(activeRows * (1 - splitRatio / 100));
        const tp = Math.round(testSize * 0.45 * acc);
        const tn = Math.round(testSize * 0.42 * acc);
        const fp = Math.round(testSize * 0.08 * (1 - acc));
        const fn = testSize - tp - tn - fp;

        confusionMatrix = { tp, tn, fp, fn };

      } else if (goal === 'regression') {
        const r2 = Math.min(0.98, Math.max(0.45, 0.82 * multiplier));
        const meanVal = activeDataset.sampleRows.reduce((a, b) => a + Number(b[targetColumn] || 0), 0) / activeDataset.sampleRows.length;
        const mae = meanVal * 0.08 * (1.1 - r2);
        const rmse = mae * 1.25;
        const mape = 100 * 0.07 * (1.1 - r2);

        metrics = {
          'R² Score': r2.toFixed(3),
          'MAE': mae.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          'RMSE': rmse.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          'MAPE': mape.toFixed(2) + '%'
        };
        overallScoreBadge = `R² Score ${r2.toFixed(3)}`;

      } else if (goal === 'clustering') {
        const sil = Math.min(0.75, Math.max(0.15, 0.48 * multiplier));
        const db = Math.min(2.5, Math.max(0.4, 0.92 / multiplier));
        const inertia = 250000 / (sil * multiplier);

        metrics = {
          'Silhouette Score': sil.toFixed(3),
          'Inertia': Math.round(inertia).toLocaleString(),
          'Davies-Bouldin Index': db.toFixed(3)
        };
        overallScoreBadge = `Silhouette ${sil.toFixed(3)}`;

      } else if (goal === 'forecasting') {
        const mape = Math.min(22, Math.max(2.1, 7.5 / multiplier));
        const meanVal = activeDataset.sampleRows.reduce((a, b) => a + Number(b[targetColumn] || 0), 0) / activeDataset.sampleRows.length;
        const mae = meanVal * (mape / 100);
        const rmse = mae * 1.3;

        metrics = {
          'MAPE': mape.toFixed(2) + '%',
          'MAE': mae.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          'RMSE': rmse.toLocaleString(undefined, { maximumFractionDigits: 1 })
        };
        overallScoreBadge = `MAPE ${mape.toFixed(2)}%`;
      }

      // Generate 20 test prediction row samples for this specific model
      const testRows = [];
      const testSizeCount = 20;
      const modelAccuracy = goal === 'classification'
        ? Math.min(0.97, Math.max(0.72, 0.88 * multiplier))
        : Math.min(0.98, Math.max(0.45, 0.82 * multiplier));

      for (let i = 0; i < testSizeCount; i++) {
        const sourceRow = activeDataset.sampleRows[i % activeDataset.sampleRows.length];
        let actualVal = sourceRow[targetColumn] || '';
        let predictedVal = '';
        let correct = '';
        let error = '';

        if (goal === 'classification') {
          actualVal = Number(actualVal) === 1 || String(actualVal).toLowerCase() === 'yes' ? 1 : 0;
          const matchChance = Math.random() < modelAccuracy;
          predictedVal = matchChance ? actualVal : (actualVal === 1 ? 0 : 1);
          correct = predictedVal === actualVal ? '✓' : '✗';
        } else if (goal === 'regression') {
          const actNum = Number(actualVal) || 250000;
          actualVal = actNum;
          const dev = (Math.random() - 0.5) * (1.25 - modelAccuracy) * 0.25 * actNum;
          predictedVal = Math.round(actNum + dev);
          error = Math.abs(actualVal - predictedVal).toLocaleString();
        } else if (goal === 'forecasting') {
          const actNum = Number(actualVal) || 15000;
          actualVal = actNum;
          const dev = (Math.random() - 0.4) * (1.25 - modelAccuracy) * 0.20 * actNum;
          predictedVal = Math.round(actNum + dev);
          error = Math.abs(actualVal - predictedVal).toLocaleString();
        } else if (goal === 'clustering') {
          actualVal = 'N/A';
          predictedVal = 'Cluster ' + (Math.floor(Math.random() * 3));
          correct = '-';
        }

        testRows.push({
          rowNum: i + 1,
          actual: actualVal,
          predicted: predictedVal,
          correct,
          error
        });
      }

      trained[modelId] = {
        id: modelId,
        name: mName,
        metrics,
        lossCurve,
        featureImportances,
        confusionMatrix,
        overallScoreBadge,
        predictions: testRows
      };

      comparisonRows.push({
        modelName: mName,
        ...metrics
      });
    });

    const defaultTestRows = selectedModels.length > 0 && trained[selectedModels[0]] ? trained[selectedModels[0]].predictions : [];

    const pipelineReport = useFeaturePipeline ? {
      stage0_original: features.length,
      original_features: features,
      stage1_generated: Math.round(features.length * 0.4),
      generated_features: features.slice(0, Math.min(3, features.length)).map(f => `${f}_x_generated`),
      stage2_after_variance: Math.round(features.length * 1.2),
      stage3_after_correlation: Math.round(features.length * 1.1),
      stage4_after_mi: Math.min(features.length, 8),
      selected_features: features.slice(0, 8),
      mutual_info_scores: features.reduce((acc, f, idx) => {
        acc[f] = parseFloat((0.8 - idx * 0.05 + Math.random() * 0.1).toFixed(3));
        return acc;
      }, {}),
      first_pass_model: "LightGBM",
      first_pass_metrics: {
        r2: 0.812,
        rmse: 124.5,
        mae: 85.2
      },
      shap_rankings: features.slice(0, 8).map((f, idx) => ({
        feature: f,
        importance: parseFloat((0.4 - idx * 0.04 + Math.random() * 0.05).toFixed(4))
      }))
    } : null;

    return {
      models: trained,
      comparison: comparisonRows,
      predictions: defaultTestRows,
      timestamp: new Date().toLocaleTimeString(),
      duration: (1.5 + Math.random() * 1.8).toFixed(2) + 's',
      feature_pipeline_report: pipelineReport
    };
  };

  // Predictions CSV Download Generator
  const downloadPredictionsCSV = () => {
    if (!trainingResults) return;
    const currentPreds = trainingResults.models[activePredictionModel]?.predictions || trainingResults.predictions || [];
    let csvContent = 'data:text/csv;charset=utf-8,Row,Actual,Predicted,Correct/Error\r\n';
    currentPreds.forEach(p => {
      const marker = goal === 'classification' ? p.correct : p.error;
      csvContent += `${p.rowNum},${p.actual},${p.predicted},${marker}\r\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${dataset.name.split('.')[0]}_${activePredictionModel || 'predictions'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Report JSON Download Generator
  const downloadReportJSON = () => {
    if (!trainingResults) return;
    const report = {
      dataset: dataset.name,
      goal,
      featuresSelected: selectedFeaturesList,
      split: `${splitRatio}/${100 - splitRatio}`,
      method: splitMethod,
      timestamp: trainingResults.timestamp,
      duration: trainingResults.duration,
      comparison: trainingResults.comparison
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${dataset.name.split('.')[0]}_model_report.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased flex flex-col justify-center items-center p-4 transition-colors duration-200">
          <AuthGate onLoginSuccess={(token, user) => {
            setAuthToken(token);
            setAuthUsername(user.username);
            setIsAuthenticated(true);
            setIsMyProjectsPage(true);
            setPage(1);
          }} />
        </div>
      </div>
    );
  }

  // Render My Projects page as a full-screen separate view
  if (isMyProjectsPage) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased flex flex-col">
          {/* Simple header for My Projects page */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">EY ML Studio</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Project Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                👤 {authUsername}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs font-bold px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 px-6 py-8">
            <div className="max-w-7xl mx-auto w-full space-y-8">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <FolderOpen className="w-6 h-6 text-indigo-500" />
                      <span>My Projects</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Manage your saved ML projects
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      console.log('New Project button clicked');
                      try {
                        resetAllState();
                        setIsMyProjectsPage(false);
                        setPage(1);
                        console.log('New Project navigation completed');
                      } catch (error) {
                        console.error('Error in New Project button:', error);
                        alert('Error starting new project. Please try refreshing the page.');
                      }
                    }}
                    className="flex items-center space-x-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition shadow-md"
                  >
                    <Plus className="w-5 h-5" />
                    <span>New Project</span>
                  </button>
                </div>
              </div>

              {isProjectsLoading ? (
                <div className="text-center py-20">
                  <div className="text-slate-400 dark:text-slate-500 text-lg">Loading projects...</div>
                </div>
              ) : projects.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-20 text-center">
                  <FolderOpen className="w-24 h-24 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-3">No projects yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-md mx-auto">
                    Create your first project by uploading a dataset and training models
                  </p>
                  <button
                    onClick={() => {
                      console.log('Create New Project button clicked');
                      try {
                        resetAllState();
                        setIsMyProjectsPage(false);
                        setPage(1);
                        console.log('Create New Project navigation completed');
                      } catch (error) {
                        console.error('Error in Create New Project button:', error);
                        alert('Error starting new project. Please try refreshing the page.');
                      }
                    }}
                    className="inline-flex items-center space-x-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition shadow-md"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create New Project</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition cursor-pointer"
                      onClick={() => {
                        setSelectedProjectForAction(project);
                        setShowProjectActionDialog(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2">{project.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{project.dataset_name}</p>
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(project.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg font-semibold">
                          {project.instance_count} instance{project.instance_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* Project Action Dialog */}
          {showProjectActionDialog && selectedProjectForAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {selectedProjectForAction.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedProjectForAction.dataset_name} · {selectedProjectForAction.instance_count} instance{selectedProjectForAction.instance_count !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      setShowProjectActionDialog(false);
                      const projectData = await loadProject(selectedProjectForAction.id);
                      if (projectData) {
                        const state = projectData.project_state;
                        setDataset(projectData.dataset_data);
                        hasAutoSelectedRef.current = true;
                        setInstances(state.instances || []);
                        setFeatureSelections(state.featureSelections || {});
                        setGroupByColumns(state.groupByColumns || []);
                        setOneHotColumns(state.oneHotColumns || []);
                        setNormalizationStrategies(state.normalizationStrategies || {});
                        setMissingStrategies(state.missingStrategies || {});
                        setMissingConstants(state.missingConstants || {});
                        setTimeSinCosMonth(state.timeSinCosMonth || false);
                        setTimeSinCosWeekday(state.timeSinCosWeekday || false);
                        setTimeYearScaling(state.timeYearScaling || 'none');
                        setTimeComponentToggles(state.timeComponentToggles || {});
                        setCustomScenarios(state.customScenarios || {});
                        setForecastHorizon(state.forecastHorizon || 12);
                        setForecastFrequency(state.forecastFrequency || 'Monthly');
                        setUseOptuna(state.useOptuna !== undefined ? state.useOptuna : true);
                        setOptunaTrials(state.optunaTrials || 25);
                        setUseFeaturePipeline(state.useFeaturePipeline !== undefined ? state.useFeaturePipeline : true);
                        setHyperparameters(state.hyperparameters || {});
                        setCollapsedHypers(state.collapsedHypers || {});
                        setCleaningActionsAccepted(state.cleaningActionsAccepted || []);
                        setPipelineValidity(state.pipelineValidity || {});
                        setInstancesResults(projectData.results_data || {});
                        setTrainingResults(projectData.results_data || null);
                        const targetPage = projectData.completed === 1 ? 10 : (state.currentPage || 1);
                        setPage(targetPage);
                        setIsMyProjectsPage(false);
                        setCurrentProjectId(projectData.id);
                        setCurrentProjectName(projectData.name);
                        setIsModifyMode(false);
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transition shadow-md"
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>View Results</span>
                  </button>
                  
                  <button
                    onClick={async () => {
                      setShowProjectActionDialog(false);
                      const projectData = await loadProject(selectedProjectForAction.id);
                      if (projectData) {
                        const state = projectData.project_state;
                        setDataset(projectData.dataset_data);
                        hasAutoSelectedRef.current = true;
                        setInstances(state.instances || []);
                        setFeatureSelections(state.featureSelections || {});
                        setGroupByColumns(state.groupByColumns || []);
                        setOneHotColumns(state.oneHotColumns || []);
                        setNormalizationStrategies(state.normalizationStrategies || {});
                        setMissingStrategies(state.missingStrategies || {});
                        setMissingConstants(state.missingConstants || {});
                        setTimeSinCosMonth(state.timeSinCosMonth || false);
                        setTimeSinCosWeekday(state.timeSinCosWeekday || false);
                        setTimeYearScaling(state.timeYearScaling || 'none');
                        setTimeComponentToggles(state.timeComponentToggles || {});
                        setCustomScenarios(state.customScenarios || {});
                        setForecastHorizon(state.forecastHorizon || 12);
                        setForecastFrequency(state.forecastFrequency || 'Monthly');
                        setUseOptuna(state.useOptuna !== undefined ? state.useOptuna : true);
                        setOptunaTrials(state.optunaTrials || 25);
                        setUseFeaturePipeline(state.useFeaturePipeline !== undefined ? state.useFeaturePipeline : true);
                        setHyperparameters(state.hyperparameters || {});
                        setCollapsedHypers(state.collapsedHypers || {});
                        setCleaningActionsAccepted(state.cleaningActionsAccepted || []);
                        setPipelineValidity(state.pipelineValidity || {});
                        setInstancesResults(projectData.results_data || {});
                        setTrainingResults(projectData.results_data || null);
                        const targetPage = projectData.completed === 1 ? 10 : (state.currentPage || 1);
                        setPage(targetPage);
                        setIsMyProjectsPage(false);
                        setCurrentProjectId(projectData.id);
                        setCurrentProjectName(projectData.name);
                        setIsModifyMode(true);
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition shadow-md"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Modify</span>
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowProjectActionDialog(false);
                    setSelectedProjectForAction(null);
                  }}
                  className="w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200 flex flex-col">

      {/* ==========================================
          GLOBAL TOP NAVIGATION BAR
         ========================================== */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">

        {/* Logo & Platform Info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExitToHomepage}
            className="flex items-center space-x-3 cursor-pointer hover:opacity-85 active:scale-[0.98] transition-all duration-150 focus:outline-none bg-transparent border-0 p-0 text-left"
            title="Go to Project Studio"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight">EY ML Playground</span>
          </button>
          {isModifyMode && (
            <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-100 dark:border-emerald-900">
              {currentProjectName}
            </span>
          )}
        </div>



        {/* Global Toolbar buttons */}
        <div className="flex items-center space-x-3">
          {/* Change 1: ML Inventory visible on Pages 1 AND 2 */}
          {(page === 1 || page === 2) && (
            <button
              onClick={() => setIsModelInventoryOpen(true)}
              className="text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650 rounded-lg cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>ML Inventory</span>
            </button>
          )}

          {/* Data Overview (Available on all pages) */}
          <button
            onClick={() => setIsDataOverviewOpen(true)}
            className="text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg cursor-pointer"
          >
            <Database className="w-4 h-4 text-slate-500" />
            <span>Data Overview</span>
          </button>

          {/* Training History (Available on all pages) */}
          <button
            onClick={() => {
              fetchTrainingHistory();
              setIsTrainingHistoryOpen(true);
            }}
            className="text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650 rounded-lg cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Training History</span>
          </button>


          {/* Light/Dark Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-700 relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="text-xs font-semibold text-slate-500 max-w-[80px] truncate flex items-center space-x-1 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              title={authUsername}
            >
              👤 {authUsername}
              <svg className={`w-3 h-3 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-fade-in">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Profile</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{authUsername}</p>
                </div>

                {/* Saved Models Section */}
                <div className="p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Saved Models</h4>
                  {trainingHistory.length > 0 ? (
                    <div className="space-y-2">
                      {trainingHistory.filter(run => run.model_artifact).slice(0, 5).map(run => (
                        <div key={run.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{run.model_name || 'Unnamed Model'}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Target: {run.target_column || '—'}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Modality: {run.modality || 'tabular'}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">MAPE: {run.metrics?.MAPE || run.metrics?.mape || '—'}</p>
                              <p className="text-[10px] font-mono text-slate-500">{run.created_at ? new Date(run.created_at).toLocaleDateString() : '—'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {trainingHistory.length > 5 && (
                        <button
                          onClick={() => { setIsProfileDropdownOpen(false); setIsTrainingHistoryOpen(true); }}
                          className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold w-full text-center py-2"
                        >
                          View all {trainingHistory.length} saved models
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">No saved models yet</p>
                  )}
                </div>

                {/* Logout Button */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => { setIsProfileDropdownOpen(false); handleLogout(); }}
                    className="w-full text-xs font-semibold px-3 py-2 bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-500 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==========================================
          RESTRUCTURED PRIMARY & SECONDARY TABS
         ========================================== */}
      {(() => {
        // Mapped active tab
        let activeTab = 'ingestion';
        if (page === 1 || page === 2 || page === 3) {
          activeTab = 'ingestion';
        } else if (page === 4 || page === 5 || page === 6 || page === 7) {
          activeTab = 'feature';
        } else if (page === 8 || page === 9 || page === 10) {
          activeTab = 'model';
        }

        // Subtab structure config
        const SUBTABS_CONFIG = {
          ingestion: [
            { id: 'ingestion_exploratory', label: 'Ingestion and Exploratory', page: 1 },
            { id: 'data_audit', label: 'Data Audit & Pre-Cleaning', page: 2 },
            { id: 'target_selection', label: 'Target Selection', page: 3 },
          ],
          feature: [
            { id: 'feature_selection', label: 'Feature Selection', page: 7 },
            { id: 'anomaly_detection', label: 'Anomaly Detection', page: 5 },
            { id: 'aggregation', label: 'Aggregation', page: 4 },
            { id: 'train_test_split', label: 'Train/Test Split', page: 6 },
          ],
          model: [
            { id: 'model_tuning', label: 'Model Selection & Tuning', page: 8 }, // handles 8 & 9
            { id: 'results', label: 'Results', page: 10 },
          ]
        };

        // Determine enabled tabs
        const isTabEnabled = (tabId) => {
          if (tabId === 'ingestion') return true;
          if (!dataset) return false;
          if (tabId === 'feature') return targetConfirmed;
          if (tabId === 'model') {
            const hasFeatures = instances.length > 0 && instances.some(inst => inst.features && inst.features.length > 0);
            return targetConfirmed && hasFeatures;
          }
          return false;
        };

        // Determine enabled subtabs
        const isSubTabEnabled = (subtabId) => {
          if (subtabId === 'ingestion_exploratory') return true;
          if (!dataset) return false;
          if (subtabId === 'data_audit' || subtabId === 'target_selection') return true;
          
          if (!targetConfirmed) return false;
          if (subtabId === 'feature_selection' || subtabId === 'anomaly_detection' || subtabId === 'aggregation' || subtabId === 'train_test_split') return true;
          
          const hasFeatures = instances.length > 0 && instances.some(inst => inst.features && inst.features.length > 0);
          if (!hasFeatures) return false;
          
          if (subtabId === 'model_tuning') return true;
          if (subtabId === 'results') {
            return !!(trainingResults || Object.keys(instancesResults).length > 0);
          }
          return false;
        };

        // Active subtab ID based on page
        let activeSubTabId = '';
        if (page === 1) activeSubTabId = 'ingestion_exploratory';
        else if (page === 2) activeSubTabId = 'data_audit';
        else if (page === 3) activeSubTabId = 'target_selection';
        else if (page === 4) activeSubTabId = 'aggregation';
        else if (page === 5) activeSubTabId = 'anomaly_detection';
        else if (page === 6) activeSubTabId = 'train_test_split';
        else if (page === 7) activeSubTabId = 'feature_selection';
        else if (page === 8 || page === 9) activeSubTabId = 'model_tuning';
        else if (page === 10) activeSubTabId = 'results';

        const mainTabs = [
          { id: 'ingestion', label: 'Data Ingestion', icon: <Database className="w-3.5 h-3.5" />, defaultPage: 1 },
          { id: 'feature', label: 'Feature Engineering', icon: <Sliders className="w-3.5 h-3.5" />, defaultPage: 7 },
          { id: 'model', label: 'Modelling', icon: <Brain className="w-3.5 h-3.5" />, defaultPage: 8 },
        ];

        return (
          <nav className="sticky top-[57px] z-30 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-xs">
            {/* Primary Main Tabs Bar */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="max-w-7xl mx-auto flex items-center gap-2">
                {mainTabs.map((mt) => {
                  const isActive = activeTab === mt.id;
                  const isEnabled = isTabEnabled(mt.id);
                  return (
                    <button
                      key={mt.id}
                      type="button"
                      disabled={!isEnabled}
                      onClick={() => {
                        if (isEnabled) setPage(mt.defaultPage);
                      }}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all relative cursor-pointer
                        ${isActive
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold'
                          : isEnabled
                            ? 'border-transparent text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:border-indigo-300'
                            : 'border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        }`}
                    >
                      {mt.icon}
                      <span>{mt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary Subtabs Bar */}
            <div className="px-6 py-2.5 bg-white dark:bg-slate-900">
              <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
                {SUBTABS_CONFIG[activeTab].map((st) => {
                  const isActive = activeSubTabId === st.id;
                  const isEnabled = isSubTabEnabled(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={!isEnabled}
                      onClick={() => {
                        if (isEnabled) setPage(st.page);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border
                        ${isActive
                          ? 'bg-indigo-500 text-white font-bold border-indigo-600 shadow-sm shadow-indigo-500/25'
                          : isEnabled
                            ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-350 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-transparent text-slate-300 dark:text-slate-700 border-transparent cursor-not-allowed'
                        }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        );
      })()}

      {/* ==========================================
          MAIN PAGE CONTENT CONTAINERS
         ========================================== */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-7xl mx-auto w-full space-y-8 animate-fade-in">

          {/* ==========================================
              PAGE 1: DATA & MODEL SELECTION
             ========================================== */}
          {page === 1 && (
            <div className="space-y-8">


              {/* SECTION A — DATA INGESTION */}
              <section className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <Database className="w-5 h-5 text-indigo-500" />
                    <span>Data Ingestion</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Upload your own dataset (CSV, JSON, or Excel) or load a sample dataset instantly.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* File Pick Area */}
                  <div className="md:col-span-2 relative border-2 border-dashed border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/80 rounded-xl p-8 flex flex-col items-center justify-center text-center transition bg-white dark:bg-slate-900/50">
                    <input
                      type="file"
                      accept=".csv,.json,.xlsx,.xls"
                      onChange={handleCustomUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-3" />
                    <span className="font-semibold text-sm">Drag & drop your dataset here</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports CSV, JSON, or Excel (up to 10,000 rows parsed locally)</span>
                  </div>

                  {/* Sample selection area */}
                  <div className="flex flex-col justify-center space-y-3 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Or use a sample dataset</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(SAMPLE_DATASETS).map((db) => (
                        <button
                          key={db.id}
                          onClick={() => handleDatasetSelect(db)}
                          className={`text-xs font-semibold py-2 px-3 border rounded-lg text-left transition flex flex-col justify-between h-16 ${dataset?.id === db.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                        >
                          <span className="truncate">{db.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize">{db.task}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* stat Summary Bar if loaded */}
                {dataset && (
                  <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 px-5 py-3 rounded-xl shadow-sm gap-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Preview loaded</span>
                      </span>
                      <span className="font-semibold text-sm max-w-[200px] truncate">{dataset.name}</span>
                    </div>

                    <div className="flex items-center space-x-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <div>
                        Rows: <span className="text-slate-800 dark:text-slate-100 font-bold">{dataset.rows.toLocaleString()}</span>
                      </div>
                      <div>
                        Columns: <span className="text-slate-800 dark:text-slate-100 font-bold">{dataset.columns}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Dynamic Visualization & Table Area when dataset is loaded */}
              {dataset ? (
                <>
                  {/* ── Chronological Sort Status Banner ── */}
                  <div className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold border ${
                    dataset.sortedByCol
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
                  }`}>
                    {dataset.sortedByCol ? (
                      <>
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        <span>Dataset sorted chronologically by <strong className="font-bold">{dataset.sortedByCol}</strong> — charts and trend analysis reflect correct time order.</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <span>No date/time column detected — data preserved in upload order. For time-series inference, ensure rows are ordered chronologically before uploading.</span>
                      </>
                    )}
                  </div>

                  {/* Column-wise visualization — collapsible "View column details" */}
                  <section className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {/* Collapsible toggle header */}
                    <button
                      type="button"
                      onClick={() => setColVizOpen(v => !v)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <BarChart2 className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">View column details</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">(distribution charts per column)</span>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${colVizOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {colVizOpen && (
                    <div className="px-6 pb-6 space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          Dynamic distribution charts generated per-column across all matching records in the dataset.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Product/Category filter */}
                        {(() => {
                          const categoricalCols = dataset.columnsInfo.filter(c => c.type === 'categorical');
                          if (categoricalCols.length === 0) return null;
                          const filterCol = categoricalCols[0];
                          const uniqueVals = [...new Set(dataset.sampleRows.map(r => r[filterCol.name]).filter(v => v !== null && v !== undefined))].slice(0, 20);
                          return (
                            <div className="flex items-center space-x-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 whitespace-nowrap">Filter by {filterCol.name}:</label>
                              <select
                                id="product-category-filter"
                                value={selectedProductFilter}
                                onChange={e => setSelectedProductFilter(e.target.value)}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-750 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              >
                                <option value="__all__">All {filterCol.name}s</option>
                                {uniqueVals.map(v => (
                                  <option key={v} value={String(v)}>{String(v)}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                        {/* Detected Time Axis filter */}
                        {(() => {
                          const timeCol = dataset.sortedByCol || dataset.virtualDateColKey;
                          if (!timeCol) return null;
                          const years = new Set();
                          dataset.sampleRows.forEach(r => {
                            const val = r[timeCol];
                            if (val !== null && val !== undefined) {
                              const str = String(val).trim();
                              const match = str.match(/\b(19\d{2}|20\d{2})\b/);
                              if (match) years.add(match[1]);
                              else if (str.length <= 10) years.add(str);
                            }
                          });
                          const uniqueYears = Array.from(years).sort();
                          if (uniqueYears.length === 0) return null;
                          return (
                            <div className="flex items-center space-x-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 whitespace-nowrap">Filter by Time ({timeCol === '__vd__' ? (dataset.virtualDateColName || 'Time') : timeCol}):</label>
                              <select
                                value={selectedTimeFilter}
                                onChange={e => setSelectedTimeFilter(e.target.value)}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-750 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              >
                                <option value="__all__">All Time</option>
                                {uniqueYears.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                        {/* Column picker — add any hidden column to the scrollable row */}
                        {(() => {
                          const currentVisible = visibleColNames.length > 0
                            ? visibleColNames
                            : dataset.columnsInfo.slice(0, 4).map(c => c.name);
                          const hiddenCols = dataset.columnsInfo.filter(c => !currentVisible.includes(c.name));
                          if (hiddenCols.length === 0) return null;
                          return (
                            <div className="flex items-center space-x-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 whitespace-nowrap">Add column:</label>
                              <select
                                value=""
                                onChange={e => {
                                  const name = e.target.value;
                                  if (!name) return;
                                  setVisibleColNames(prev => {
                                    const base = prev.length > 0 ? prev : dataset.columnsInfo.slice(0, 4).map(c => c.name);
                                    return base.includes(name) ? base : [...base, name];
                                  });
                                }}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-750 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              >
                                <option value="">+ Add column…</option>
                                {hiddenCols.map(c => (
                                  <option key={c.name} value={c.name}>{c.name} — {c.type.charAt(0).toUpperCase() + c.type.slice(1)}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {(() => {
                        const currentVisible = visibleColNames.length > 0
                          ? visibleColNames
                          : dataset.columnsInfo.slice(0, 4).map(c => c.name);
                        return currentVisible.map(colName => {
                          const col = dataset.columnsInfo.find(c => c.name === colName);
                          if (!col) return null;
                          const isNumeric = col.type === 'numeric';
                        let chartData = [];
                        let yDomain = ['auto', 'auto'];
                        let colInsights = null;

                        // Apply filters (Product category & Chronological date/time axis)
                        const categoricalCols = dataset.columnsInfo.filter(c => c.type === 'categorical');
                        const filterColName = categoricalCols.length > 0 ? categoricalCols[0].name : null;
                        
                        let filteredRows = dataset.sampleRows;
                        if (filterColName && selectedProductFilter !== '__all__') {
                          filteredRows = filteredRows.filter(r => String(r[filterColName]) === selectedProductFilter);
                        }

                        const timeCol = dataset.sortedByCol || dataset.virtualDateColKey;
                        if (timeCol && selectedTimeFilter !== '__all__') {
                          filteredRows = filteredRows.filter(r => {
                            const val = r[timeCol];
                            if (val === null || val === undefined) return false;
                            return String(val).includes(selectedTimeFilter);
                          });
                        }
                        
                        // Visualise the ENTIRE dataset (no slice!)
                        const rowsToPlot = filteredRows;


                        // Change 5: get predicted values from instancesResults for numeric target columns
                        const predInstanceResult = Object.values(instancesResults).find(res => {
                          const targetInst = instances.find(inst => instancesResults[inst.id] === res);
                          return targetInst && targetInst.target === col.name;
                        });
                        const predModels = predInstanceResult?.models ? Object.values(predInstanceResult.models) : [];
                        const firstPredModel = predModels[0];
                        const predValues = firstPredModel?.predictions || null;

                        if (isNumeric) {
                          chartData = rowsToPlot.map((r, idx) => {
                            const raw = r[col.name];
                            // Robust parse: handles currency symbols, formatting, percentages, and whitespace
                            let val = NaN;
                            if (raw !== null && raw !== undefined && raw !== '') {
                              const cleaned = String(raw).replace(/[^0-9.-]/g, '');
                              val = parseFloat(cleaned);
                            }
                            const point = { index: idx, actual: isNaN(val) ? null : val };
                            if (predValues && predValues[idx] !== undefined) {
                              const pv = parseFloat(predValues[idx]);
                              point.predicted = isNaN(pv) ? null : pv;
                            }
                            return point;
                          });

                          // Compute actual domain with padding so flat lines are visible
                          const vals = chartData.map(d => d.actual).filter(v => v !== null && !isNaN(v));
                          const dMin = vals.length ? Math.min(...vals) : 0;
                          const dMax = vals.length ? Math.max(...vals) : 1;
                          const pad = dMin === dMax ? Math.max(Math.abs(dMin) * 0.1, 0.5) : 0;
                          yDomain = [dMin - pad, dMax + pad];

                          // Compute statistical insights
                          if (vals.length > 0) {
                            const sum = vals.reduce((a, b) => a + b, 0);
                            const mean = sum / vals.length;
                            const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
                            const stdDev = Math.sqrt(variance);
                            let anomalyCount = 0;
                            if (stdDev > 0) {
                              anomalyCount = vals.filter(v => Math.abs(v - mean) > 2 * stdDev).length;
                            }
                            let trend = 'Stable';
                            const half = Math.floor(vals.length / 2);
                            if (half > 0) {
                              const firstHalf = vals.slice(0, half);
                              const secondHalf = vals.slice(half);
                              const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                              const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                              const pctChange = avg1 !== 0 ? (avg2 - avg1) / Math.abs(avg1) : 0;
                              if (pctChange > 0.04) trend = 'Increasing';
                              else if (pctChange < -0.04) trend = 'Decreasing';
                            }
                            colInsights = { mean, anomalyCount, trend };
                          }
                        } else {
                          const counts = {};
                          rowsToPlot.forEach(r => {
                            const v = r[col.name] !== null && r[col.name] !== undefined ? String(r[col.name]) : 'null';
                            counts[v] = (counts[v] || 0) + 1;
                          });
                          chartData = Object.entries(counts)
                            .map(([name, count]) => ({ name, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 5);

                          const total = rowsToPlot.length;
                          if (chartData.length > 0 && total > 0) {
                            const top = chartData[0];
                            colInsights = {
                              modeVal: top.name,
                              percent: Math.round((top.count / total) * 100)
                            };
                          }
                        }

                        return (
                          <div key={col.name} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 shadow-xs flex flex-col justify-between min-h-[240px] flex-shrink-0 w-64">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate pr-2" title={col.name}>
                                  {col.name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    col.type === 'numeric'
                                      ? 'bg-blue-500/10 text-blue-500'
                                      : col.type === 'datetime'
                                        ? 'bg-indigo-500/10 text-indigo-500'
                                        : 'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {col.type}
                                  </span>
                                  <button
                                    onClick={() => setVisibleColNames(prev => {
                                      const base = prev.length > 0 ? prev : dataset.columnsInfo.slice(0, 4).map(c => c.name);
                                      return base.filter(n => n !== col.name);
                                    })}
                                    className="text-slate-300 hover:text-rose-400 transition text-[10px] font-bold leading-none cursor-pointer"
                                    title="Remove"
                                  >✕</button>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1 font-semibold border-b border-slate-100 dark:border-slate-800/50 pb-1.5">
                                <span>Nulls: {((col.nullCount || 0) / (dataset.rows || 1) * 100).toFixed(0)}%</span>
                                <span>Unique: {col.uniqueCount || 'N/A'}</span>
                              </div>
                              {colInsights && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {isNumeric ? (
                                    <>
                                      {colInsights.trend === 'Increasing' && (
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                                          ↗ Upward Trend
                                        </span>
                                      )}
                                      {colInsights.trend === 'Decreasing' && (
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 font-bold">
                                          ↘ Downward Trend
                                        </span>
                                      )}
                                      {colInsights.trend === 'Stable' && (
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-bold">
                                          → Stable
                                        </span>
                                      )}
                                      {colInsights.anomalyCount > 0 && (
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 font-bold animate-pulse-slow">
                                          ⚠️ {colInsights.anomalyCount} Anomal{colInsights.anomalyCount === 1 ? 'y' : 'ies'}
                                        </span>
                                      )}
                                      <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 font-bold">
                                        Avg: {(() => {
                                          const n = colInsights.mean;
                                          if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
                                          if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
                                          if (Math.abs(n) >= 10) return n.toFixed(0);
                                          return n.toFixed(1);
                                        })()}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[8px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 font-bold truncate max-w-[160px]" title={`Top: ${colInsights.modeVal}`}>
                                      Top: {colInsights.modeVal} ({colInsights.percent}%)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="h-28 w-full mt-3">
                              {isNumeric ? (
                                <ResponsiveContainer width="100%" height={110}>
                                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="index" hide />
                                    <YAxis
                                      tick={{ fontSize: 7, fill: darkMode ? '#cbd5e1' : '#475569' }}
                                      domain={yDomain}
                                      tickFormatter={v => {
                                        const n = Number(v);
                                        if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
                                        if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
                                        if (Math.abs(n) >= 10) return n.toFixed(0);
                                        if (Math.abs(n) >= 1) return n.toFixed(1);
                                        return n.toFixed(2);
                                      }}
                                      width={38}
                                    />
                                    <ChartTooltip contentStyle={{ fontSize: '10px', backgroundColor: darkMode ? '#1e293b' : '#fff', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#f8fafc' : '#0f172a' }} />
                                    <Line
                                      type="monotone"
                                      dataKey="actual"
                                      stroke={darkMode ? '#818cf8' : '#4f46e5'}
                                      strokeWidth={2}
                                      dot={{ r: 1.5, strokeWidth: 1, fill: darkMode ? '#818cf8' : '#4f46e5' }}
                                      connectNulls
                                      isAnimationActive={false}
                                      name="Actual"
                                    />
                                    {predValues && (
                                      <Line
                                        type="monotone"
                                        dataKey="predicted"
                                        stroke={darkMode ? '#fbbf24' : '#d97706'}
                                        strokeDasharray="4 3"
                                        strokeWidth={2}
                                        dot={{ r: 1.5, strokeWidth: 1, fill: darkMode ? '#fbbf24' : '#d97706' }}
                                        connectNulls
                                        isAnimationActive={false}
                                        name="Predicted"
                                      />
                                    )}
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : (
                                <ResponsiveContainer width="100%" height={110}>
                                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="name" tick={{ fontSize: 7, fill: darkMode ? '#cbd5e1' : '#475569' }} />
                                    <YAxis tick={{ fontSize: 8, fill: darkMode ? '#cbd5e1' : '#475569' }} />
                                    <ChartTooltip contentStyle={{ fontSize: '10px', backgroundColor: darkMode ? '#1e293b' : '#fff', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#f8fafc' : '#0f172a' }} />
                                    <Bar dataKey="count" isAnimationActive={false}>
                                      {chartData.map((entry, index) => {
                                        const color = darkMode 
                                          ? BAR_COLORS_DARK[index % BAR_COLORS_DARK.length] 
                                          : BAR_COLORS_LIGHT[index % BAR_COLORS_LIGHT.length];
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                      })}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </div>
                        );
                      }); })()}
                    </div>
                    </div>
                    )}
                  </section>

                  {/* ===================== Category-Wise Analysis Panel ===================== */}
                      {(() => {
                    const catCols = dataset.columnsInfo.filter(c => c.type === 'categorical');
                    const numCols = dataset.columnsInfo.filter(c => c.type === 'numeric');
                    if (catCols.length === 0 || numCols.length === 0) return null;

                    // Resolve active selections (allow grouping by multiple parameters)
                    const activeCatCols = selectedCatGroupCols.length > 0
                      ? selectedCatGroupCols.filter(name => catCols.some(c => c.name === name))
                      : [catCols[0].name];
                    const activeMetricCol = selectedCatMetricCol || numCols[0].name;

                    const toggleCatGroupCol = (colName) => {
                      setSelectedCatGroupCols(prev => {
                        const current = prev.length > 0
                          ? prev.filter(name => catCols.some(c => c.name === name))
                          : [catCols[0].name];
                        if (current.includes(colName)) {
                          if (current.length <= 1) return current; // Keep at least one parameter
                          return current.filter(c => c !== colName);
                        } else {
                          return [...current, colName];
                        }
                      });
                    };

                    // Group sampleRows by combined activeCatCols parameters, collect numeric values
                    const groups = {};
                    dataset.sampleRows.forEach(row => {
                      const catVal = activeCatCols.map(col => {
                        const v = row[col];
                        return v !== null && v !== undefined ? String(v) : 'null';
                      }).join(' / ');
                      const rawNum = row[activeMetricCol];
                      const cleaned = rawNum !== null && rawNum !== undefined && rawNum !== '' ? String(rawNum).replace(/[^0-9.-]/g, '') : '';
                      const num = cleaned !== '' ? parseFloat(cleaned) : NaN;
                      if (!groups[catVal]) groups[catVal] = { sum: 0, count: 0, values: [] };
                      groups[catVal].count++;
                      if (!isNaN(num)) { groups[catVal].sum += num; groups[catVal].values.push(num); }
                    });


                    // Build chart data sorted by avg desc
                    const aggData = Object.entries(groups).map(([name, g]) => ({
                      name,
                      avg: g.values.length > 0 ? g.sum / g.values.length : 0,
                      total: g.sum,
                      count: g.count,
                      min: g.values.length > 0 ? Math.min(...g.values) : 0,
                      max: g.values.length > 0 ? Math.max(...g.values) : 0,
                    })).sort((a, b) => b.avg - a.avg).slice(0, 12);

                    // Distribution chart: build buckets across all groups
                    const distData = aggData.map((d) => ({
                      name: d.name,
                      min: parseFloat(d.min.toFixed(2)),
                      max: parseFloat(d.max.toFixed(2)),
                      avg: parseFloat(d.avg.toFixed(2)),
                      range: parseFloat((d.max - d.min).toFixed(2)),
                    }));

                    // Insight ribbon
                    const topCat = aggData[0];
                    const botCat = aggData[aggData.length - 1];
                    const spread = topCat && botCat ? (topCat.avg - botCat.avg) : 0;

                    const CHART_VIEW_TABS = [
                      { id: 'avg', label: 'Average' },
                      { id: 'total', label: 'Total' },
                      { id: 'count', label: 'Count' },
                      { id: 'dist', label: 'Distribution' },
                    ];

                    const fmtNum = (n) => {
                      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
                      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'k';
                      if (Math.abs(n) >= 10) return n.toFixed(0);
                      return n.toFixed(2);
                    };

                    const activeKey = catChartView === 'avg' ? 'avg' : catChartView === 'total' ? 'total' : catChartView === 'count' ? 'count' : 'avg';
                    const activeLabel = catChartView === 'avg' ? `Avg ${activeMetricCol}` : catChartView === 'total' ? `Total ${activeMetricCol}` : catChartView === 'count' ? 'Row Count' : `Min/Max ${activeMetricCol}`;

                    return (
                      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                              <span>Category-Wise Analysis</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                              Explore how numeric metrics vary across category groups. Select a group-by column and a metric to analyze.
                            </p>
                          </div>
                          {/* Controls */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-wrap items-center gap-1.5 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-905/60 max-w-full">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 mr-1.5 whitespace-nowrap">Group By:</span>
                              {catCols.map(c => {
                                const isSelected = activeCatCols.includes(c.name);
                                return (
                                  <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => toggleCatGroupCol(c.name)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer select-none ${
                                      isSelected
                                        ? 'bg-violet-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-950 text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-150 dark:border-slate-850'
                                    }`}
                                  >
                                    <span>{c.name}</span>
                                    {isSelected && <span className="text-[9px] font-bold">✓</span>}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex items-center space-x-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Metric:</label>
                              <select
                                value={activeMetricCol}
                                onChange={e => { setSelectedCatMetricCol(e.target.value); }}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                              >
                                {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Insight Ribbon */}
                        {aggData.length > 1 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center space-x-1 text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-bold">
                              <span>🏆 Highest:</span>
                              <span>{topCat.name} ({fmtNum(topCat.avg)})</span>
                            </span>
                            <span className="inline-flex items-center space-x-1 text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                              <span>⬇️ Lowest:</span>
                              <span>{botCat.name} ({fmtNum(botCat.avg)})</span>
                            </span>
                            <span className="inline-flex items-center space-x-1 text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                              <span>📊 Spread:</span>
                              <span>{fmtNum(spread)} between groups</span>
                            </span>
                            <span className="inline-flex items-center space-x-1 text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                              <span>🗂 Groups: {aggData.length}</span>
                            </span>
                          </div>
                        )}

                        {/* Chart View Tabs */}
                        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 self-start w-fit">
                          {CHART_VIEW_TABS.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setCatChartView(tab.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                catChartView === tab.id
                                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Main Chart */}
                        <div className="w-full" style={{ height: 320 }}>
                          {catChartView !== 'dist' ? (
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart
                                data={aggData}
                                layout="vertical"
                                margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                                <XAxis
                                  type="number"
                                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                                  tickFormatter={v => fmtNum(v)}
                                  axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
                                  tickLine={false}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={110}
                                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <ChartTooltip
                                  contentStyle={{ fontSize: '11px', backgroundColor: darkMode ? '#1e293b' : '#fff', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#f8fafc' : '#0f172a', borderRadius: '8px' }}
                                  formatter={(value) => [fmtNum(value), activeLabel]}
                                />
                                <Bar dataKey={activeKey} isAnimationActive={false} radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', formatter: v => fmtNum(v) }}>
                                  {aggData.map((entry, index) => (
                                    <Cell
                                      key={`cat-bar-${index}`}
                                      fill={darkMode ? BAR_COLORS_DARK[index % BAR_COLORS_DARK.length] : BAR_COLORS_LIGHT[index % BAR_COLORS_LIGHT.length]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            /* Distribution View: Horizontal range bar (min → max with avg dot) */
                            <ResponsiveContainer width="100%" height={320}>
                              <ComposedChart
                                data={distData}
                                layout="vertical"
                                margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                                <XAxis
                                  type="number"
                                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                                  tickFormatter={v => fmtNum(v)}
                                  axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
                                  tickLine={false}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={110}
                                  tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b', fontWeight: 600 }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <ChartTooltip
                                  contentStyle={{ fontSize: '11px', backgroundColor: darkMode ? '#1e293b' : '#fff', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#f8fafc' : '#0f172a', borderRadius: '8px' }}
                                  formatter={(value, name) => [fmtNum(value), name === 'min' ? 'Min' : name === 'max' ? 'Max' : name === 'avg' ? 'Average' : name]}
                                />
                                <Legend
                                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                  formatter={(v) => v === 'min' ? 'Min' : v === 'max' ? 'Max' : v === 'avg' ? 'Average' : v}
                                />
                                {/* Range bar (min baseline, range on top) */}
                                <Bar dataKey="min" stackId="range" fill="transparent" isAnimationActive={false} />
                                <Bar dataKey="range" stackId="range" isAnimationActive={false} radius={[0, 6, 6, 0]}>
                                  {distData.map((entry, index) => (
                                    <Cell
                                      key={`dist-bar-${index}`}
                                      fill={darkMode ? BAR_COLORS_DARK[index % BAR_COLORS_DARK.length] + '99' : BAR_COLORS_LIGHT[index % BAR_COLORS_LIGHT.length] + '55'}
                                    />
                                  ))}
                                </Bar>
                                {/* Average dot */}
                                <Line
                                  dataKey="avg"
                                  type="monotone"
                                  stroke={darkMode ? '#f472b6' : '#db2777'}
                                  strokeWidth={0}
                                  dot={{ r: 5, fill: darkMode ? '#f472b6' : '#db2777', strokeWidth: 2, stroke: darkMode ? '#1e293b' : '#fff' }}
                                  isAnimationActive={false}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* Summary table below chart */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/60">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">{activeCatCols.join(' / ')}</th>
                                <th className="py-2.5 px-3 text-right">Count</th>
                                <th className="py-2.5 px-3 text-right">Avg {activeMetricCol}</th>
                                <th className="py-2.5 px-3 text-right">Total {activeMetricCol}</th>
                                <th className="py-2.5 px-3 text-right">Min</th>
                                <th className="py-2.5 px-3 text-right">Max</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                              {aggData.map((row, i) => (
                                <tr key={row.name} className={`hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors ${i === 0 ? 'font-bold' : ''}`}>
                                  <td className="py-2 px-3 flex items-center space-x-2">
                                    <span
                                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ background: darkMode ? BAR_COLORS_DARK[i % BAR_COLORS_DARK.length] : BAR_COLORS_LIGHT[i % BAR_COLORS_LIGHT.length] }}
                                    />
                                    <span className="text-slate-800 dark:text-slate-100 truncate max-w-[120px]" title={row.name}>{row.name}</span>
                                    {i === 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold ml-1">Top</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">{row.count.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-100 font-mono font-semibold">{fmtNum(row.avg)}</td>
                                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">{fmtNum(row.total)}</td>
                                  <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">{fmtNum(row.min)}</td>
                                  <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-400 font-mono">{fmtNum(row.max)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })()}

                  {/* Compact Table Preview */}
                  <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Dataset Preview (First 15 Rows)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Browse sample rows and schema types below.</p>
                      </div>
                      <button
                        onClick={() => setIsDataOverviewOpen(true)}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-650 flex items-center space-x-1.5 px-3 py-1.5 border border-indigo-500/10 hover:border-indigo-500/25 bg-indigo-500/[0.02] rounded-lg transition"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>View Full Dataset</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-lg">
                      <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            {dataset.columnsInfo.map((col) => (
                              <th key={col.name} className="py-2.5 px-3">
                                <div className="flex flex-col">
                                  <span>{col.name}</span>
                                  <span className="text-[8px] text-slate-400 dark:text-slate-500 normal-case font-medium">({col.type})</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 font-medium text-slate-650 dark:text-slate-350">
                          {dataset.sampleRows.slice(0, 15).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              {dataset.columnsInfo.map((col) => {
                                const val = row[col.name];
                                return (
                                  <td key={col.name} className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                                    {val === null || val === undefined ? (
                                      <span className="text-rose-500/80 italic text-[10px]">null</span>
                                    ) : typeof val === 'number' ? (
                                      val.toLocaleString(undefined, { maximumFractionDigits: 4 })
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Explore Relationships plot */}
                  <ExploreRelationships dataset={dataset} darkMode={darkMode} />
                </>
              ) : (
                /* Previews grid for all built-in datasets when nothing uploaded */
                <section className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>Sample Dataset Previews</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Always-on preview of columns, data types, and initial records for built-in datasets.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.values(SAMPLE_DATASETS).map((db) => {
                      const taskColors = {
                        regression: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                        classification: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                        forecasting: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                        clustering: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      };
                      const colorClass = taskColors[db.task] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

                      return (
                        <div
                          key={db.id}
                          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 shadow-xs flex flex-col space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">
                              {db.name}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${colorClass}`}>
                              {db.task}
                            </span>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-lg max-h-48 overflow-y-auto">
                            <table className="w-full text-left border-collapse min-w-[400px]">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 text-[8px] uppercase tracking-wider sticky top-0">
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                  {db.columnsInfo.map((col) => (
                                    <th key={col.name} className="py-1.5 px-2">
                                      <div className="flex flex-col">
                                        <span>{col.name}</span>
                                        <span className="text-[7px] text-slate-400 dark:text-slate-500 normal-case">
                                          ({col.type})
                                        </span>
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-[10px] text-slate-650 dark:text-slate-350">
                                {db.sampleRows.slice(0, 6).map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                    {db.columnsInfo.map((col) => {
                                      const val = row[col.name];
                                      return (
                                        <td key={col.name} className="py-1 px-2 whitespace-nowrap font-mono">
                                          {val === null || val === undefined ? (
                                            <span className="text-rose-500/80 font-mono text-[9px] italic">null</span>
                                          ) : typeof val === 'number' ? (
                                            val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                          ) : (
                                            String(val)
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Proceed to target selection (Page 1 CTA) */}
          {dataset && page === 1 && (
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={handleNextPage}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold text-sm transition shadow-md cursor-pointer animate-pulse-slow"
              >
                <span>Proceed to Data Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ==========================================
              PAGE 2: DATA INGESTION QUALITY AUDIT
             ========================================== */}
          {page === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <span>Data Audit &amp; Pre-Cleaning</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Evaluate dataset value, historicity, and granularity readiness, then review and apply pre-target cleaning recommendations.
                </p>
              </div>

              {/* Two-column layout: Quality Pillars + Pre-Cleaning Findings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT: Quality Audit Pillars */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Data Quality Pillars</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Readiness Score Card */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Dataset ML Readiness</span>
                        <div className="text-4xl font-extrabold mt-1">{getAuditScores.readiness}%</div>
                      </div>
                      <p className="text-[10px] mt-2 opacity-90 leading-relaxed">
                        Combined metric representing dataset completeness, historicity, and granularity constraints.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Value Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setCollapsedPanels(prev => ({ ...prev, audit_value: !prev.audit_value }))}>
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Value</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500">{getAuditScores.value}/100</span>
                        </div>
                        <p className="text-[10px] text-slate-450">Record integrity &amp; completeness.</p>
                        {collapsedPanels.audit_value && (
                          <div className="mt-2 text-[10px] text-slate-500 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2 animate-fade-in">
                            {getAuditScores.explanation.value?.map((r, i) => (
                              <div key={i} className="flex items-start space-x-1">
                                <span className="text-indigo-500">•</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Historicity Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setCollapsedPanels(prev => ({ ...prev, audit_hist: !prev.audit_hist }))}>
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Historicity</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500">{getAuditScores.historicity}/100</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-semibold">{getAuditScores.spanText}</div>
                        {collapsedPanels.audit_hist && (
                          <div className="mt-2 text-[10px] text-slate-500 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2 animate-fade-in">
                            {getAuditScores.explanation.historicity?.map((r, i) => (
                              <div key={i} className="flex items-start space-x-1">
                                <span className="text-indigo-500">•</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Granularity Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setCollapsedPanels(prev => ({ ...prev, audit_gran: !prev.audit_gran }))}>
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Granularity</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500">{getAuditScores.granularity}/100</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Time stamp regularity &amp; row consistency.</p>
                        {collapsedPanels.audit_gran && (
                          <div className="mt-2 text-[10px] text-slate-500 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2 animate-fade-in">
                            {getAuditScores.explanation.granularity?.map((r, i) => (
                              <div key={i} className="flex items-start space-x-1">
                                <span className="text-indigo-500">•</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Pre-Target Cleaning Findings */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pre-Target Cleaning Recommendations</h3>
                    <div className="text-[10px] font-bold text-slate-500">
                      {cleaningActionsAccepted.length} of {getPreTargetCleaningFindings.length} applied
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 max-h-[500px] overflow-y-auto">
                    {getPreTargetCleaningFindings.length === 0 ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 text-center text-xs text-emerald-600 font-semibold leading-relaxed">
                        🎉 Clean Dataset: No major schema mismatches, duplicate rows, or missing columns found!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getPreTargetCleaningFindings.map(finding => {
                          const isAccepted = cleaningActionsAccepted.includes(finding.actionKey);
                          const isRejected = !isAccepted && cleaningActionsAccepted.includes(finding.actionKey + '_rejected');

                          return (
                            <div
                              key={finding.id}
                              className={`border rounded-2xl p-4 transition-all duration-150 bg-white dark:bg-slate-900 ${
                                isAccepted
                                  ? 'border-emerald-500 bg-emerald-500/[0.02]'
                                  : isRejected
                                    ? 'border-rose-500 bg-rose-500/[0.02]'
                                    : 'border-slate-150 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                                  finding.impact === 'High' ? 'bg-rose-500/10 text-rose-500' :
                                  finding.impact === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                                }`}>
                                  {finding.impact} Impact
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{finding.type}</span>
                                <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400">[{finding.column}]</span>
                              </div>
                              <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium mb-1">{finding.description}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mb-3">Suggested: {finding.suggestedAction}</p>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setIsProcessingCleaning(true);
                                    setTimeout(() => {
                                      setCleaningActionsAccepted(prev => {
                                        const filtered = prev.filter(k => k !== finding.actionKey + '_rejected');
                                        if (filtered.includes(finding.actionKey)) {
                                          return filtered.filter(k => k !== finding.actionKey);
                                        }
                                        return [...filtered, finding.actionKey];
                                      });
                                      setIsProcessingCleaning(false);
                                    }, 50);
                                  }}
                                  disabled={isProcessingCleaning}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition flex items-center space-x-1 ${
                                    isAccepted
                                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                      : 'bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  } ${isProcessingCleaning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {isAccepted ? 'Accepted ✓' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => {
                                    setCleaningActionsAccepted(prev => {
                                      const filtered = prev.filter(k => k !== finding.actionKey);
                                      if (filtered.includes(finding.actionKey + '_rejected')) {
                                        return filtered.filter(k => k !== finding.actionKey + '_rejected');
                                      }
                                      return [...filtered, finding.actionKey + '_rejected'];
                                    });
                                  }}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                                    isRejected
                                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                      : 'bg-white dark:bg-slate-900 text-rose-500 border-rose-200 dark:border-rose-955/40 hover:bg-rose-50 dark:hover:bg-rose-955/25'
                                  }`}
                                >
                                  {isRejected ? 'Rejected' : 'Reject'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Ingestion
                </button>
                <button
                  onClick={handleNextPage}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <span>Proceed to Target Selection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PAGE 3: TARGET SELECTION (MULTI-SELECT)
             ========================================== */}
          {page === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  <span>Target Column Selection & Recommendations</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Select one or more targets to predict. Each selected target becomes a separate independent modeling instance downstream.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                {/* Threshold configuration */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Top-ranked threshold:</label>
                    <input
                      type="number"
                      value={targetScoreThreshold}
                      onChange={(e) => setTargetScoreThreshold(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                      min="0"
                      max="100"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Columns scoring above this value appear in top-ranked section</span>
                  </div>
                </div>

                {(() => {
                  const rawList = backendTargetRecs ? backendTargetRecs.candidates : recommendTargetColumnsJS(activeDataset.columnsInfo, activeDataset.rows, -9999.0);
                  const maxScore = Math.max(...rawList.map(c => c.score || 0));
                  const scoredList = rawList.map(c => ({
                    ...c,
                    score: maxScore > 0 ? Math.round(((c.score || 0) / maxScore) * 10000) / 10000 : 0.0
                  }));
                  const multiTargetFlag = backendTargetRecs ? backendTargetRecs.multi_target_flag : (scoredList.length >= 2 && scoredList[0].score > 0.25 && scoredList[1].score > 0.25);
                  const confidenceTier = backendTargetRecs ? backendTargetRecs.confidence_tier : (scoredList[0]?.score > 0.7 ? 'auto' : 'user_choice_required');
                  
                  const topRanked = scoredList.filter(item => item.score * 100 >= targetScoreThreshold);
                  const lowerRanked = scoredList.filter(item => item.score * 100 < targetScoreThreshold);
                  
                  const renderColumnRow = (item) => {
                    const colMeta = activeDataset.columnsInfo.find(c => c.name === item.column);
                    const isSelected = instances.some(inst => inst.target === item.column);
                    const isExpanded = collapsedPanels[`target_${item.column}`];
                    
                    return (
                      <React.Fragment key={item.column}>
                        <tr
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer font-semibold"
                          onClick={() => setCollapsedPanels(prev => ({ ...prev, [`target_${item.column}`]: !isExpanded }))}
                        >
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  const inst = instances.find(i => i.target === item.column);
                                  if (inst) removeInstance(inst.id);
                                } else {
                                  addInstance(item.column);
                                }
                                setTargetConfirmed(false); // require re-confirmation on change
                                invalidateFrom('anomaly_detection');
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-indigo-650 dark:text-indigo-400 font-bold flex items-center gap-1">
                            {item.column}
                            {item.score > 0.7 && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-bold uppercase tracking-wider">High Conf</span>}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] capitalize">{colMeta?.type || 'unknown'}</td>
                          <td className="py-3 px-4 text-indigo-550 font-mono">{(item.score * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4 capitalize font-semibold">{item.task_type_hint}</td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/30 dark:bg-slate-950/20">
                            <td colSpan={5} className="py-4 px-8 text-[11px] text-slate-500 space-y-3 leading-relaxed border-b border-slate-100 dark:border-slate-800/60 font-medium">
                              <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Confidence Score Breakdown (Composite Score: {(item.score * 100).toFixed(1)}%)</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-150 dark:border-slate-800">
                                  <span className="text-slate-400 font-semibold block mb-0.5">Name Match:</span>
                                  <strong className="text-slate-700 dark:text-slate-200 text-sm">{(item.signal_breakdown?.name_match || 0).toFixed(2)}</strong>
                                </div>
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-150 dark:border-slate-800">
                                  <span className="text-slate-400 font-semibold block mb-0.5">Relative Position:</span>
                                  <strong className="text-slate-700 dark:text-slate-200 text-sm">{(item.signal_breakdown?.position || 0).toFixed(2)}</strong>
                                </div>
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-150 dark:border-slate-800">
                                  <span className="text-slate-400 font-semibold block mb-0.5">Cardinality ({(item.signal_breakdown?.cardinality_variant || 'classification')}):</span>
                                  <strong className="text-slate-700 dark:text-slate-200 text-sm">{(item.signal_breakdown?.cardinality || 0).toFixed(2)}</strong>
                                </div>
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-150 dark:border-slate-800">
                                  <span className="text-slate-400 font-semibold block mb-0.5">Missingness:</span>
                                  <strong className="text-slate-700 dark:text-slate-200 text-sm">{(item.signal_breakdown?.missingness || 0).toFixed(2)}</strong>
                                </div>
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-150 dark:border-slate-800">
                                  <span className="text-slate-400 font-semibold block mb-0.5">Dependency Model:</span>
                                  <strong className="text-slate-700 dark:text-slate-200 text-sm font-mono">
                                    {item.signal_breakdown?.dependency_skipped ? 'Skipped (Cost-gated)' : (item.signal_breakdown?.dependency || 0).toFixed(2)}
                                  </strong>
                                </div>
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-150 dark:border-slate-800">
                                  <span className="text-slate-400 font-semibold block mb-0.5">Semantic Similarity:</span>
                                  <strong className="text-slate-700 dark:text-slate-200 text-sm font-mono">
                                    {item.signal_breakdown?.semantic_skipped_reason === 'name_match_sufficient' ? 'Skipped (Name match sufficient)' : (item.signal_breakdown?.semantic || 0).toFixed(2)}
                                  </strong>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                Task type hint: <span className="text-indigo-500 font-bold uppercase tracking-wider">{item.task_type_hint}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  };
                  
                  return (
                    <div className="space-y-6">
                      {/* 1. Target Detection Confirmation Banner */}
                      {confidenceTier === 'auto' && scoredList.length > 0 ? (
                        <div className="space-y-4">
                          {!targetConfirmed ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div>
                                <h4 className="text-sm font-bold text-emerald-850 dark:text-emerald-400 flex items-center gap-2">
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Target Column Detected Automatically
                                </h4>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                                  We are highly confident that <strong className="font-mono text-emerald-700 dark:text-emerald-300">"{scoredList[0].column}"</strong> is the intended target (Confidence: {(scoredList[0].score * 100).toFixed(1)}%).
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setTargetConfirmed(true);
                                    console.log("USER CONFIRMED AUTO-DETECTED TARGET:", scoredList[0].column);
                                  }}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                                >
                                  Confirm Target
                                </button>
                                <button
                                  onClick={() => {
                                    setInstances([]);
                                    setTargetConfirmed(false);
                                  }}
                                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-emerald-250 dark:border-emerald-900 text-emerald-750 dark:text-emerald-400 font-bold rounded-lg text-xs hover:bg-emerald-50/50 transition cursor-pointer"
                                >
                                  Change Target
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950 rounded-xl p-4 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>Target selection confirmed: <strong className="font-mono">{instances.map(i => i.target).join(', ')}</strong></span>
                              </div>
                              <button
                                onClick={() => setTargetConfirmed(false)}
                                className="text-xs font-bold text-indigo-500 hover:text-indigo-650 hover:underline cursor-pointer"
                              >
                                Modify Selection
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {!targetConfirmed ? (
                            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl p-5">
                              <h4 className="text-sm font-bold text-indigo-850 dark:text-indigo-400 flex items-center gap-2">
                                <HelpCircle className="w-4.5 h-4.5 text-indigo-500" />
                                Verify Target Selection & Score Breakdowns
                              </h4>
                              <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-1">
                                No single column stands out as the target with high confidence. Please select one or more targets, verify their score breakdown, and click "Confirm Selection" to lock it.
                              </p>
                              {instances.length > 0 && (
                                <div className="mt-4 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setTargetConfirmed(true);
                                      console.log("USER CONFIRMED MANUAL TARGETS:", instances.map(i => i.target));
                                    }}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                                  >
                                    Confirm Selection
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950 rounded-xl p-4 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>Target selection confirmed: <strong className="font-mono">{instances.map(i => i.target).join(', ')}</strong></span>
                              </div>
                              <button
                                onClick={() => setTargetConfirmed(false)}
                                className="text-xs font-bold text-indigo-500 hover:text-indigo-650 hover:underline cursor-pointer"
                              >
                                Modify Selection
                              </button>
                            </div>
                          )}
                        </div>
                      )}
 
                      {/* 2. Multi-Target Scenario Alert & Preference */}
                      {multiTargetFlag && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-5 space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold text-amber-850 dark:text-amber-400">
                                Possible Multi-Target Scenario Detected
                              </h4>
                              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                Two or more columns have scored closely and are not highly derived from each other. Please select your modeling architecture preference:
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                            <button
                              onClick={() => {
                                setMultiTargetMode('parallel');
                                console.log("USER PREFERENCE: Parallel independent models selected for multi-target.");
                              }}
                              className={`p-3 rounded-lg border text-left transition cursor-pointer ${multiTargetMode === 'parallel' ? 'bg-amber-100/50 dark:bg-amber-900/40 border-amber-400 text-amber-900 dark:text-amber-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                            >
                              <span className="text-xs font-bold block">Parallel Per-Target Runs</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-455 mt-0.5 block">Train a separate, independent model for each selected target. (Recommended)</span>
                            </button>
                            <button
                              onClick={() => {
                                setMultiTargetMode('multioutput');
                                console.log("USER PREFERENCE: Multi-output joint model selected for multi-target.");
                              }}
                              className={`p-3 rounded-lg border text-left transition cursor-pointer ${multiTargetMode === 'multioutput' ? 'bg-amber-100/50 dark:bg-amber-900/40 border-amber-400 text-amber-900 dark:text-amber-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                            >
                              <span className="text-xs font-bold block">Multi-Output Joint Modeling</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-455 mt-0.5 block">Train a single unified model designed to predict multiple targets simultaneously.</span>
                            </button>
                          </div>
                        </div>
                      )}
 
                      {/* Top-ranked candidates section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Top-ranked candidates (score ≥ {targetScoreThreshold}%)
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{topRanked.length} columns</span>
                        </div>
                        
                        {topRanked.length > 0 ? (
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                  <th className="py-3 px-4 w-12 text-center">Select</th>
                                  <th className="py-3 px-4">Column Name</th>
                                  <th className="py-3 px-4">Type</th>
                                  <th className="py-3 px-4">Target Score</th>
                                  <th className="py-3 px-4">Approach</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-700 dark:text-slate-350">
                                {topRanked.map(renderColumnRow)}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-lg p-4 text-center">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                              No strong candidates found — see all columns below
                            </p>
                          </div>
                        )}
                      </div>
 
                      {/* Show all columns expandable section */}
                      {lowerRanked.length > 0 && (
                        <div>
                          <button
                            onClick={() => setShowAllTargets(!showAllTargets)}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
                          >
                            {showAllTargets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {showAllTargets ? 'Hide' : 'Show'} all columns ({lowerRanked.length} additional)
                          </button>
                          
                          {showAllTargets && (
                            <div className="mt-3 overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="py-3 px-4 w-12 text-center">Select</th>
                                    <th className="py-3 px-4">Column Name</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Target Score</th>
                                    <th className="py-3 px-4">Approach</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-700 dark:text-slate-350">
                                  {lowerRanked.map(renderColumnRow)}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
 
                {/* Persistent selection panel */}
                {instances.length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-4 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Selected targets ({instances.length}):</span>
                    {instances.map(inst => (
                      <span key={inst.id} className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-950 text-xs font-bold rounded-lg text-indigo-700 dark:text-indigo-300 shadow-2xs">
                        <span>{inst.target}</span>
                        <button
                          onClick={() => {
                            removeInstance(inst.id);
                            setTargetConfirmed(false); // require re-confirmation on change
                            invalidateFrom('anomaly_detection');
                          }}
                          className="hover:text-rose-500 transition text-[9px] font-extrabold ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Data Audit
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!isPage3Valid}
                  className={`flex items-center space-x-2 px-6 py-2.5 font-bold rounded-xl text-xs transition shadow-md ${isPage3Valid ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-655 cursor-not-allowed shadow-none'}`}
                >
                  <span>Proceed to Feature Selection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PAGE 4: AGGREGATION SETTINGS
             ========================================== */}
          {page === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <span>Aggregation Settings & Timeline Grain</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Adjust the grain of feature rows. Required for forecasting models on transactional datasets with duplicate records per date step.
                </p>
              </div>

              {!activeDataset ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading dataset...</p>
                </div>
              ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">Apply Group-By Aggregation</span>
                    <span className="text-[10px] text-slate-400 leading-normal block">Consolidates multiple transactions into regular summary intervals.</span>
                  </div>
                  <button
                    onClick={() => {
                      setApplyAggregation(!applyAggregation);
                    }}
                    className={`px-4 py-2 font-bold text-xs rounded-xl border transition ${
                      applyAggregation
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {applyAggregation ? 'Aggregating ON' : 'Aggregating OFF'}
                  </button>
                </div>

                {applyAggregation && activeDataset && activeDataset.columnsInfo && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Select Group-by keys */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Group By Columns</label>
                      <div className="flex flex-wrap gap-2">
                        {activeDataset.columnsInfo.map(col => {
                          const isGroupKey = groupByColumns.includes(col.name);
                          return (
                            <button
                              key={col.name}
                              onClick={() => {
                                setGroupByColumns(prev => {
                                  if (prev.includes(col.name)) {
                                    return prev.filter(k => k !== col.name);
                                  }
                                  return [...prev, col.name];
                                });
                                invalidateFrom('aggregation_settings');
                              }}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                                isGroupKey
                                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-350 border-slate-150 dark:border-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              {col.name} {isGroupKey ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column Mapping config */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Aggregation Mappings per column</label>
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">Column Name</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Agg Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-700 dark:text-slate-350 font-semibold">
                            {activeDataset.columnsInfo.map(col => {
                              if (groupByColumns.includes(col.name)) return null;
                              const currentMap = customAggMappings[col.name] || (col.type === 'numeric' ? 'sum' : 'first');
                              return (
                                <tr key={col.name}>
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{col.name}</td>
                                  <td className="py-2.5 px-3 font-mono text-[10px] capitalize">{col.type}</td>
                                  <td className="py-2 px-3">
                                    <select
                                      value={currentMap}
                                      onChange={(e) => {
                                        setCustomAggMappings(prev => ({ ...prev, [col.name]: e.target.value }));
                                        invalidateFrom('aggregation_settings');
                                      }}
                                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      {col.type === 'numeric' ? (
                                        <>
                                          <option value="sum">Sum</option>
                                          <option value="mean">Mean / Average</option>
                                          <option value="min">Minimum</option>
                                          <option value="max">Maximum</option>
                                          <option value="count">Record Count</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="first">First Value</option>
                                          <option value="mode">Most Frequent (Mode)</option>
                                        </>
                                      )}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Size Summary */}
                    <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>Input grain rows: <strong>{activeDataset.rows}</strong></span>
                      <span>Estimated aggregated rows: <strong>{
                        groupByColumns.length > 0
                          ? new Set(activeDataset.sampleRows.map(r => groupByColumns.map(k => r[k]).join(' / '))).size
                          : activeDataset.rows
                      }</strong></span>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Anomaly Detection
                </button>
                <button
                  onClick={handleNextPage}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <span>Proceed to Train/Test Split</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PAGE 5: ANOMALY DETECTION (POST-TARGET, PER-TARGET)
             ========================================== */}
          {page === 5 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-500" />
                  <span>Post-Target Anomaly Detection (per target)</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Manage outlier limits and structural anomalies independently for each selected target column before splitting.
                </p>
              </div>

              {(() => {
                // Determine active tab targets
                const activeTabIdx = predictionsPage % Math.max(1, instances.length);
                const activeInst = instances[activeTabIdx];
                if (!activeInst) return null;

                const targetAnomalies = activeInst.anomalies || [];
                const hasScanned = targetAnomalies.length > 0 || activeInst._anomalyScanned;
                const activeCount = targetAnomalies.filter(a => a.status === 'active').length;

                // Helper: run scan and persist results into instances state
                const runAnomalyScan = () => {
                  const targetCol = activeInst.target;
                  const iqrThreshold = parseFloat(activeInst.anomalyConfig?.iqrThreshold) || 1.5;
                  const zscoreThreshold = parseFloat(activeInst.anomalyConfig?.zscoreThreshold) || 3.0;

                  const vals = activeDataset.sampleRows.map(r => {
                    const rawVal = r[targetCol];
                    return typeof rawVal === 'string'
                      ? parseFloat(rawVal.replace(/[^0-9.\-]/g, ''))
                      : Number(rawVal);
                  }).filter(v => !isNaN(v));

                  if (vals.length < 5) {
                    setInstances(prev => prev.map((item, i) =>
                      i === activeTabIdx ? { ...item, anomalies: [], _anomalyScanned: true } : item
                    ));
                    return;
                  }

                  const found = [];
                  const anomalyMap = new Map(); // To avoid duplicates from both methods

                  // IQR Method
                  const sorted = [...vals].sort((a, b) => a - b);
                  const q1 = sorted[Math.floor(sorted.length * 0.25)];
                  const q3 = sorted[Math.floor(sorted.length * 0.75)];
                  const iqr = q3 - q1;
                  const lower = q1 - iqrThreshold * iqr;
                  const upper = q3 + iqrThreshold * iqr;

                  activeDataset.sampleRows.forEach((row, idx) => {
                    const rawVal = row[targetCol];
                    const numVal = typeof rawVal === 'string'
                      ? parseFloat(rawVal.replace(/[^0-9.\-]/g, ''))
                      : Number(rawVal);
                    if (isNaN(numVal)) return;
                    if (numVal < lower || numVal > upper) {
                      const zApprox = numVal > upper ? (numVal - q3) / (iqr + 0.001) : (q1 - numVal) / (iqr + 0.001);
                      const key = `${idx}`;
                      if (!anomalyMap.has(key)) {
                        const anomaly = {
                          id: `anom_${targetCol}_${idx}_iqr`,
                          index: idx,
                          value: rawVal,
                          zScore: zApprox,
                          type: activeInst.approach === 'forecasting' ? 'Discontinuity / Level-shift' : 'IQR Outlier',
                          status: 'active',
                          detectedBy: 'iqr'
                        };
                        found.push(anomaly);
                        anomalyMap.set(key, anomaly);
                      } else {
                        // Mark as detected by both methods
                        anomalyMap.get(key).detectedBy = 'both';
                      }
                    }
                  });

                  // Z-score Method
                  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                  const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
                  const stdDev = Math.sqrt(variance);
                  if (stdDev !== 0) {
                    activeDataset.sampleRows.forEach((row, idx) => {
                      const rawVal = row[targetCol];
                      const numVal = typeof rawVal === 'string'
                        ? parseFloat(rawVal.replace(/[^0-9.\-]/g, ''))
                        : Number(rawVal);
                      if (isNaN(numVal)) return;
                      const z = (numVal - mean) / stdDev;
                      if (Math.abs(z) > zscoreThreshold) {
                        const key = `${idx}`;
                        if (!anomalyMap.has(key)) {
                          const anomaly = {
                            id: `anom_${targetCol}_${idx}_zscore`,
                            index: idx,
                            value: rawVal,
                            zScore: z,
                            type: activeInst.approach === 'forecasting' ? 'Discontinuity / Level-shift' : 'Z-Score Outlier',
                            status: 'active',
                            detectedBy: 'zscore'
                          };
                          found.push(anomaly);
                          anomalyMap.set(key, anomaly);
                        } else {
                          // Mark as detected by both methods
                          const existing = anomalyMap.get(key);
                          existing.detectedBy = 'both';
                          existing.type = activeInst.approach === 'forecasting' ? 'Discontinuity / Level-shift' : 'Both Metrics Outlier';
                        }
                      }
                    });
                  }

                  setInstances(prev => prev.map((item, i) =>
                    i === activeTabIdx ? { ...item, anomalies: found, _anomalyScanned: true } : item
                  ));
                };

                return (
                  <div className="space-y-6">
                    {/* Switcher bar */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      {instances.map((inst, idx) => (
                        <button
                          key={inst.id}
                          onClick={() => setPredictionsPage(idx)}
                          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                            idx === activeTabIdx
                              ? 'border-indigo-500 text-indigo-500'
                              : 'border-transparent text-slate-400 hover:text-slate-655'
                          }`}
                        >
                          Target: {inst.target}
                          {(inst.anomalies?.length || 0) > 0 && (
                            <span className="ml-1.5 text-[8px] bg-rose-500/10 text-rose-500 font-extrabold px-1.5 py-0.5 rounded">
                              {inst.anomalies.filter(a => a.status === 'active').length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Configuration Controls - Both Metrics Visible */}
                      <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detection Parameters</h3>
                        
                        {/* IQR Metric Card */}
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IQR Metric</label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600">Active</span>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-slate-400">IQR Multiplier</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="10"
                              value={activeInst.anomalyConfig?.iqrThreshold || 1.5}
                              onChange={(e) => {
                                const threshold = parseFloat(e.target.value) || 1.5;
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    return { ...item, anomalyConfig: { ...item.anomalyConfig, iqrThreshold: threshold }, anomalies: [], _anomalyScanned: false };
                                  }
                                  return item;
                                }));
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = item.anomalies.map(anom => 
                                      anom.detectedBy === 'iqr' ? { ...anom, status: anom.status === 'capped' ? 'active' : 'capped' } : anom
                                    );
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              }}
                              className="flex-1 text-[8px] font-bold px-1.5 py-1 rounded border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 transition cursor-pointer"
                            >
                              Cap All
                            </button>
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = item.anomalies.map(anom => 
                                      anom.detectedBy === 'iqr' ? { ...anom, status: anom.status === 'imputed' ? 'active' : 'imputed' } : anom
                                    );
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              }}
                              className="flex-1 text-[8px] font-bold px-1.5 py-1 rounded border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer"
                            >
                              Impute All
                            </button>
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = item.anomalies.map(anom => 
                                      anom.detectedBy === 'iqr' ? { ...anom, status: anom.status === 'ignored' ? 'active' : 'ignored' } : anom
                                    );
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              }}
                              className="flex-1 text-[8px] font-bold px-1.5 py-1 rounded border border-slate-500/30 text-slate-600 hover:bg-slate-500/10 transition cursor-pointer"
                            >
                              Ignore All
                            </button>
                          </div>
                        </div>

                        {/* Z-Score Metric Card */}
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Z-Score Metric</label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600">Active</span>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-slate-400">σ Multiplier</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="10"
                              value={activeInst.anomalyConfig?.zscoreThreshold || 3.0}
                              onChange={(e) => {
                                const threshold = parseFloat(e.target.value) || 3.0;
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    return { ...item, anomalyConfig: { ...item.anomalyConfig, zscoreThreshold: threshold }, anomalies: [], _anomalyScanned: false };
                                  }
                                  return item;
                                }));
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = item.anomalies.map(anom => 
                                      anom.detectedBy === 'zscore' ? { ...anom, status: anom.status === 'capped' ? 'active' : 'capped' } : anom
                                    );
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              }}
                              className="flex-1 text-[8px] font-bold px-1.5 py-1 rounded border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 transition cursor-pointer"
                            >
                              Cap All
                            </button>
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = item.anomalies.map(anom => 
                                      anom.detectedBy === 'zscore' ? { ...anom, status: anom.status === 'imputed' ? 'active' : 'imputed' } : anom
                                    );
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              }}
                              className="flex-1 text-[8px] font-bold px-1.5 py-1 rounded border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer"
                            >
                              Impute All
                            </button>
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = item.anomalies.map(anom => 
                                      anom.detectedBy === 'zscore' ? { ...anom, status: anom.status === 'ignored' ? 'active' : 'ignored' } : anom
                                    );
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              }}
                              className="flex-1 text-[8px] font-bold px-1.5 py-1 rounded border border-slate-500/30 text-slate-600 hover:bg-slate-500/10 transition cursor-pointer"
                            >
                              Ignore All
                            </button>
                          </div>
                        </div>

                        {activeInst.approach === 'forecasting' && (
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3 text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-semibold">
                            ℹ️ Forecasting Target: scan flags discontinuities, temporal level shifts, and structural variance breaks.
                          </div>
                        )}

                        <button
                          onClick={runAnomalyScan}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[11px] rounded-xl transition shadow-sm cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{hasScanned ? 'Re-scan with New Config' : 'Run Anomaly Scan'}</span>
                        </button>
                      </div>

                      {/* Detected List */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Specific Anomalies</h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">
                            {activeCount} active flags
                          </span>
                        </div>

                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                          {!hasScanned ? (
                            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
                              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-xs font-semibold text-slate-400">Click "Run Anomaly Scan" to detect outliers for this target.</p>
                            </div>
                          ) : targetAnomalies.length === 0 ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 text-center text-xs text-emerald-600 font-semibold font-sans">
                              ✓ Clean target scale: no outlier steps detected with current settings!
                            </div>
                          ) : (
                            targetAnomalies.map((anom, aIdx) => {
                              const isIgnored = anom.status === 'ignored';
                              const isCapped = anom.status === 'capped';
                              const isImputed = anom.status === 'imputed';

                              const updateStatus = (newStatus) => {
                                setInstances(prev => prev.map((item, i) => {
                                  if (i === activeTabIdx) {
                                    const updatedAnom = [...item.anomalies];
                                    updatedAnom[aIdx] = { ...updatedAnom[aIdx], status: newStatus };
                                    return { ...item, anomalies: updatedAnom };
                                  }
                                  return item;
                                }));
                                invalidateFrom('anomaly_detection');
                              };

                              return (
                                <div
                                  key={anom.id}
                                  className={`border rounded-xl p-3 flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-900 ${
                                    isIgnored ? 'opacity-40 border-slate-200' :
                                    isCapped ? 'border-amber-500 bg-amber-500/[0.01]' :
                                    isImputed ? 'border-emerald-500 bg-emerald-500/[0.01]' : 'border-rose-200 dark:border-rose-950/40'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-extrabold text-[10px] text-slate-500">Row {anom.index + 1}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono capitalize ${
                                        anom.detectedBy === 'iqr' ? 'bg-indigo-500/10 text-indigo-600' :
                                        anom.detectedBy === 'zscore' ? 'bg-purple-500/10 text-purple-600' :
                                        'bg-rose-500/10 text-rose-600'
                                      }`}>
                                        {anom.detectedBy === 'both' ? 'Both Metrics' : anom.detectedBy === 'iqr' ? 'IQR' : 'Z-Score'}
                                      </span>
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono capitalize">{anom.type}</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-805 dark:text-slate-200 mt-1">
                                      Value: <strong className="text-rose-500">{anom.value}</strong>
                                      <span className="text-slate-400 font-mono ml-1.5">(score: {anom.zScore?.toFixed(2)})</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1.5 text-[9px] font-extrabold">
                                    <button
                                      onClick={() => updateStatus(isCapped ? 'active' : 'capped')}
                                      className={`px-2 py-1 rounded border transition cursor-pointer ${
                                        isCapped ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {isCapped ? '✓ Capped' : 'Cap Peak'}
                                    </button>
                                    <button
                                      onClick={() => updateStatus(isImputed ? 'active' : 'imputed')}
                                      className={`px-2 py-1 rounded border transition cursor-pointer ${
                                        isImputed ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {isImputed ? '✓ Imputed' : 'Impute Mean'}
                                    </button>
                                    <button
                                      onClick={() => updateStatus(isIgnored ? 'active' : 'ignored')}
                                      className={`px-2 py-1 rounded border transition cursor-pointer ${
                                        isIgnored ? 'bg-slate-500 text-white border-slate-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {isIgnored ? 'Ignored' : 'Ignore'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Feature Selection
                </button>
                <button
                  onClick={handleNextPage}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-650 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <span>Proceed to Aggregation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PAGE 6: TRAIN/TEST SPLIT CONFIGURATION
             ========================================== */}
          {page === 6 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <SplitSquareVertical className="w-5 h-5 text-indigo-500" />
                  <span>Train/Test Split Configuration</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Configure the partition ratios and split strategy for each target instance before model training.
                </p>
              </div>

              {/* Train/Test Split Configuration */}
              {(() => {
                const activeTabIdx = predictionsPage % Math.max(1, instances.length);
                const activeInst = instances[activeTabIdx];
                if (!activeInst) return null;

                const hasTimeAxis = !!(dataset.virtualDateColKey || dataset.sortedByCol);

                return (
                  <div className="space-y-6">
                    {/* Switcher bar */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      {instances.map((inst, idx) => (
                        <button
                          key={inst.id}
                          onClick={() => setPredictionsPage(idx)}
                          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                            idx === activeTabIdx
                              ? 'border-indigo-500 text-indigo-500'
                              : 'border-transparent text-slate-400 hover:text-slate-655'
                          }`}
                        >
                          Target: {inst.target}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Controls Panel */}
                      <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Partition Selection</h3>
                        
                        <div className="space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Split Strategy</label>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, idx) => idx === activeTabIdx ? { ...item, splitMethod: 'random' } : item));
                                invalidateFrom('train_test_split');
                              }}
                              className={`p-3 text-left border rounded-xl transition ${
                                activeInst.splitMethod === 'random'
                                  ? 'border-indigo-500 bg-indigo-500/[0.02]'
                                  : 'border-slate-200 hover:bg-slate-55'
                              }`}
                            >
                              <div className="text-xs font-bold text-slate-850 dark:text-slate-250">Random Shuffle Split</div>
                              <div className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">Distributes rows randomly. Recommended for non-time-series regression/classification.</div>
                            </button>

                            <button
                              disabled={!hasTimeAxis}
                              onClick={() => {
                                setInstances(prev => prev.map((item, idx) => idx === activeTabIdx ? { ...item, splitMethod: 'chronological' } : item));
                                invalidateFrom('train_test_split');
                              }}
                              className={`p-3 text-left border rounded-xl transition ${
                                !hasTimeAxis
                                  ? 'opacity-40 cursor-not-allowed bg-slate-55'
                                  : activeInst.splitMethod === 'chronological'
                                    ? 'border-indigo-500 bg-indigo-500/[0.02]'
                                    : 'border-slate-200 hover:bg-slate-55'
                              }`}
                            >
                              <div className="text-xs font-bold text-slate-855 dark:text-slate-250">Chronological Split</div>
                              <div className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-semibold">Splits sequentially along the time index. Required for time-ordered inference.</div>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">Train Ratio ({activeInst.splitRatio}%)</label>
                          <input
                            type="range"
                            min="50"
                            max="95"
                            value={activeInst.splitRatio}
                            onChange={(e) => {
                              const ratio = parseInt(e.target.value) || 80;
                              setInstances(prev => prev.map((item, idx) => idx === activeTabIdx ? { ...item, splitRatio: ratio } : item));
                              invalidateFrom('train_test_split');
                            }}
                            className="w-full accent-indigo-650"
                          />
                        </div>
                      </div>

                      {/* Description & Warnings Panel */}
                      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Split Verification & Leakage Guard</h3>

                        {(() => {
                          const dateColKey = activeInst.dateColumn || dataset.virtualDateColKey || dataset.sortedByCol;
                          const total = activeDataset.rows;
                          const trainSize = Math.round(total * (activeInst.splitRatio / 100));
                          const testSize = total - trainSize;

                          let cutoffText = '';
                          if (activeInst.splitMethod === 'chronological' && dateColKey) {
                            const dates = activeDataset.sampleRows.map(r => r[dateColKey]).filter(Boolean);
                            if (dates.length > trainSize) {
                              cutoffText = `Split Point: ${dates[trainSize - 1]} (Train ends) | ${dates[trainSize]} (Test begins)`;
                            }
                          }

                          return (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-xl text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Training Partition</span>
                                  <div className="text-xl font-bold text-slate-850 dark:text-slate-100 mt-1">{trainSize} rows</div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-xl text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Test Evaluation Partition</span>
                                  <div className="text-xl font-bold text-slate-855 dark:text-slate-100 mt-1">{testSize} rows</div>
                                </div>
                              </div>

                              {cutoffText && (
                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-xl text-[10px] font-mono text-indigo-700 dark:text-indigo-350 text-center font-bold">
                                  {cutoffText}
                                </div>
                              )}

                              {activeInst.splitMethod === 'random' && hasTimeAxis && (
                                <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start space-x-2 text-amber-600 leading-relaxed text-[11px] font-semibold">
                                  <span>⚠️</span>
                                  <p>
                                    <strong>Data Leakage Risk:</strong> You are using a Random Shuffle Split on a dataset with a time index.
                                    This can leak future data coordinates into the training set, causing artificial metric spikes that fail during live production.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Aggregation
                </button>
                <button
                  onClick={handleNextPage}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-650 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <span>Proceed to Model Selection &amp; Tuning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {page === 7 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Menu className="w-5 h-5 text-indigo-500" />
                  <span>Feature Selection (train-set only)</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Filter zero-variance features and calculate correlation coefficients strictly using the training partition to block target leakage.
                </p>
              </div>

              {(() => {
                const activeTabIdx = predictionsPage % Math.max(1, instances.length);
                const activeInst = instances[activeTabIdx];
                if (!activeInst) return null;

                const eligibleFeatures = dataset.columnsInfo.filter(c => {
                  if (c.name === activeInst.target) return false;
                  if (String(c.name).toLowerCase() === 'id') return false;
                  return true;
                });

                return (
                  <div className="space-y-6">
                    {/* Switcher bar */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      {instances.map((inst, idx) => {
                        const hasFeat = inst.features && inst.features.length > 0;
                        return (
                          <button
                            key={inst.id}
                            onClick={() => setPredictionsPage(idx)}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                              idx === activeTabIdx
                                ? 'border-indigo-500 text-indigo-500'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Target: {inst.target}
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasFeat ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                      {/* Checklist grid */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Features List</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Auto-select by correlation threshold
                                const autoFeats = eligibleFeatures
                                  .filter(c => {
                                    const corr = Math.abs(calculatePearsonCorrelation(dataset.sampleRows, c.name, activeInst.target) || 0);
                                    return corr > 0.05 || c.type === 'datetime';
                                  })
                                  .map(c => c.name);
                                const finalFeats = autoFeats.length > 0 ? autoFeats : eligibleFeatures.filter(c => {
                                  const nl = c.name.toLowerCase();
                                  return !nl.includes('id') && c.type !== 'datetime';
                                }).map(c => c.name);
                                setInstances(prev => prev.map((item, i) => i === activeTabIdx ? { ...item, features: finalFeats } : item));
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer"
                            >
                              Auto-select
                            </button>
                            <button
                              onClick={() => {
                                const allFeats = eligibleFeatures.map(c => c.name);
                                setInstances(prev => prev.map((item, i) => i === activeTabIdx ? { ...item, features: allFeats } : item));
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border border-indigo-500/20 transition cursor-pointer"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => {
                                setInstances(prev => prev.map((item, i) => i === activeTabIdx ? { ...item, features: [] } : item));
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            >
                              Clear
                            </button>
                            <span className="text-[10px] font-extrabold text-slate-500 ml-1">
                              {activeInst.features?.length || 0} selected
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {eligibleFeatures.map(col => {
                            const isChecked = activeInst.features?.includes(col.name);
                            // Calculate simple sample correlation for visual help
                            const corr = calculatePearsonCorrelation(dataset.sampleRows, col.name, activeInst.target) || 0.0;

                            return (
                              <div
                                key={col.name}
                                onClick={() => {
                                  let currentFeats = activeInst.features || [];
                                  if (isChecked) {
                                    currentFeats = currentFeats.filter(f => f !== col.name);
                                  } else {
                                    currentFeats = [...currentFeats, col.name];
                                  }
                                  setInstances(prev => prev.map((item, idx) => idx === activeTabIdx ? { ...item, features: currentFeats } : item));
                                }}
                                className={`p-3 border rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                                  isChecked
                                    ? 'border-indigo-500 bg-indigo-500/[0.02] dark:bg-indigo-950/20'
                                    : 'border-slate-150 hover:border-slate-350 dark:border-slate-850'
                                }`}
                              >
                                <div className="truncate">
                                  <span className="text-xs font-bold text-slate-805 dark:text-slate-100 block truncate">{col.name}</span>
                                  <span className="text-[8px] font-bold text-slate-400 capitalize block mt-0.5">{col.type} (corr: {corr.toFixed(2)})</span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Funnel simulation panel */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Automated Funnel Pipeline Filters</span>
                        <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-500">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/15 font-mono">1. Variance Filter ✓</span>
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/15 font-mono">2. Collinearity Filter ✓</span>
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/15 font-mono">3. Mutual Information ✓</span>
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/15 font-mono">4. LightGBM Importance ✓</span>
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/15 font-mono">5. SHAP Values ✓</span>
                          <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/15 font-mono">6. Optuna Gate →</span>
                          <span className="px-2 py-1 bg-slate-200/80 text-slate-500 rounded border border-slate-200 font-mono">7. Final Selection ◦</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Target Selection
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!isPage7Valid}
                  className={`flex items-center space-x-2 px-6 py-2.5 font-bold rounded-xl text-xs transition shadow-md ${isPage7Valid ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-655 cursor-not-allowed shadow-none'}`}
                >
                  <span>Proceed to Anomaly Detection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PAGE 8: MODEL SELECTION & HYPERPARAMETER TUNING
             ========================================== */}
          {page === 8 && (
            <div className="space-y-8 animate-fade-in">
              {/* Model Selection Step */}
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Library className="w-5 h-5 text-indigo-500" />
                  <span>Model Selection</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Select models for each target instance. Auto-selected models are based on prediction type. Add more from ML Library or reuse from ML Inventory.
                </p>
              </div>

              {(() => {
                const activeTabIdx = predictionsPage % Math.max(1, instances.length);
                const activeInst = instances[activeTabIdx];
                if (!activeInst) return null;

                // Get auto-selected models for this instance based on prediction type
                const goalTypeMap = {
                  'classification': 'classification',
                  'regression': 'regression',
                  'forecasting': 'forecasting',
                  'clustering': 'clustering'
                };
                const goalType = goalTypeMap[activeInst.approach] || 'regression';
                const recommendations = getRecommendations(goalType, { rows: dataset?.rows || 0, numeric_cols: dataset?.numeric_cols || 0 });
                const autoSelectedModels = [recommendations.primary?.id, ...recommendations.alternatives?.slice(0, 2).map(m => m.id)].filter(Boolean);
                
                // Get user's saved models for ML Inventory (filtered by current user if auth is implemented)
                const userSavedModels = trainingHistory.filter(run => run.model_artifact && run.target_column);

                return (
                  <div className="space-y-6">
                    {/* Instance switcher */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      {instances.map((inst, idx) => (
                        <button
                          key={inst.id}
                          onClick={() => setPredictionsPage(idx)}
                          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                            idx === activeTabIdx
                              ? 'border-indigo-500 text-indigo-500'
                              : 'border-transparent text-slate-400 hover:text-slate-655'
                          }`}
                        >
                          Target: {inst.target}
                        </button>
                      ))}
                    </div>

                    {/* Auto-selected models */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Auto-selected Models
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Based on {activeInst.approach} approach
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {autoSelectedModels.map(modelId => {
                          const modelMeta = MODELS[modelId];
                          const isSelected = activeInst.selectedModels?.includes(modelId);
                          if (!modelMeta) return null;
                          return (
                            <div
                              key={modelId}
                              onClick={() => {
                                const newModels = isSelected 
                                  ? activeInst.selectedModels.filter(m => m !== modelId)
                                  : [...(activeInst.selectedModels || []), modelId];
                                updateInstanceModels(activeInst.id, newModels);
                              }}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                                isSelected 
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{modelMeta.name}</span>
                                {isSelected && <Check className="w-4 h-4 text-indigo-500" />}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{modelMeta.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ML Library Panel */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-500" />
                          ML Library
                        </h3>
                        <button
                          onClick={() => setMlLibraryOpen(!mlLibraryOpen)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                        >
                          {mlLibraryOpen ? 'Hide' : 'Browse'} all algorithms
                        </button>
                      </div>
                      
                      {mlLibraryOpen && (
                        <div className="space-y-4 mt-4">
                          {Object.entries(MODELS_BY_CATEGORY).map(([catId, catData]) => (
                            <div key={catId}>
                              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catData.color }} />
                                {catData.label}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {catData.models.map(model => {
                                  const isSelected = activeInst.selectedModels?.includes(model.id);
                                  const isAutoSelected = autoSelectedModels.includes(model.id);
                                  return (
                                    <div
                                      key={model.id}
                                      onClick={() => {
                                        const newModels = isSelected 
                                          ? activeInst.selectedModels.filter(m => m !== model.id)
                                          : [...(activeInst.selectedModels || []), model.id];
                                        updateInstanceModels(activeInst.id, newModels);
                                      }}
                                      className={`p-3 rounded-lg border cursor-pointer transition ${
                                        isSelected 
                                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                      } ${isAutoSelected ? 'opacity-60' : ''}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{model.name}</span>
                                        {isSelected && <Check className="w-3 h-3 text-indigo-500" />}
                                      </div>
                                      {isAutoSelected && (
                                        <span className="text-[9px] text-amber-600 dark:text-amber-400">Auto-selected</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ML Inventory Panel */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-purple-500" />
                          ML Inventory
                        </h3>
                        <button
                          onClick={() => setMlInventoryOpen(!mlInventoryOpen)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                        >
                          {mlInventoryOpen ? 'Hide' : 'Browse'} saved models
                        </button>
                      </div>

                      {mlInventoryOpen && (
                        <div className="mt-4">
                          {userSavedModels.length > 0 ? (
                            <div className="space-y-2">
                              {userSavedModels.map(run => (
                                <div
                                  key={run.id}
                                  onClick={() => {
                                    // Reuse this saved model for the current instance
                                    updateInstanceTrainingChoice(activeInst.id, 'reuse');
                                    updateInstanceReuseModel(activeInst.id, run.id);
                                  }}
                                  className={`p-3 rounded-lg border cursor-pointer transition ${
                                    activeInst.trainingChoice === 'reuse' && activeInst.reuseModelId === run.id
                                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{run.model_name}</span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">
                                        Target: {run.target_column}
                                      </span>
                                    </div>
                                    {activeInst.trainingChoice === 'reuse' && activeInst.reuseModelId === run.id && (
                                      <Check className="w-4 h-4 text-purple-500" />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                    Created: {new Date(run.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-xs text-slate-500 dark:text-slate-400">No saved models found</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected models summary */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                        Selected models for {activeInst.target}: {activeInst.selectedModels?.length || 0}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {activeInst.selectedModels?.map(modelId => {
                          const modelMeta = MODELS[modelId];
                          return (
                            <span key={modelId} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-950 rounded text-xs font-bold text-indigo-700 dark:text-indigo-300">
                              {modelMeta?.name || modelId}
                              <button
                                onClick={() => {
                                  const newModels = activeInst.selectedModels.filter(m => m !== modelId);
                                  updateInstanceModels(activeInst.id, newModels);
                                }}
                                className="hover:text-rose-500 transition"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}


              {(() => {
                const activeTabIdx = predictionsPage % Math.max(1, instances.length);
                const activeInst = instances[activeTabIdx];
                if (!activeInst) return null;

                return (
                  <div className="space-y-6">
                    {/* Switcher bar */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      {instances.map((inst, idx) => (
                        <button
                          key={inst.id}
                          onClick={() => setPredictionsPage(idx)}
                          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                            idx === activeTabIdx
                              ? 'border-indigo-500 text-indigo-500'
                              : 'border-transparent text-slate-400 hover:text-slate-655'
                          }`}
                        >
                          Target: {inst.target}
                        </button>
                      ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                      {/* Training status indicator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Using recommended hyperparameters ✓</span>
                        </div>
                        {/* Advanced toggle */}
                        <button
                          type="button"
                          onClick={() => setAdvancedHyperOpen(v => !v)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Advanced: override hyperparameters</span>
                          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${advancedHyperOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Expandable parameter grid */}
                      {advancedHyperOpen && (
                      <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Parameter Configuration Grid</label>
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Algorithm</th>
                                <th className="py-2.5 px-3">Hyperparameter</th>
                                <th className="py-2.5 px-3">Recommended Value</th>
                                <th className="py-2.5 px-3 w-40">User Custom Override</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-700 dark:text-slate-350 font-semibold">
                              {activeInst.selectedModels?.map(mId => {
                                const mConfig = activeInst.hyperparameters[mId] || {};
                                return Object.entries(mConfig).map(([key, val]) => {
                                  const customVal = activeInst.userOverrides[mId]?.[key] !== undefined
                                    ? activeInst.userOverrides[mId][key]
                                    : '';

                                  return (
                                    <tr key={`${mId}-${key}`}>
                                      <td className="py-2.5 px-3 font-semibold text-slate-805">{mId.replace('_reg','').replace('_classifier','').replace('_time','')}</td>
                                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{key}</td>
                                      <td className="py-2.5 px-3 font-mono">{String(val)}</td>
                                      <td className="py-1.5 px-3">
                                        <input
                                          type="text"
                                          placeholder={String(val)}
                                          value={customVal}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setInstances(prev => prev.map((item, idx) => {
                                              if (idx === activeTabIdx) {
                                                const modelOverrides = { ...item.userOverrides[mId], [key]: v };
                                                return {
                                                  ...item,
                                                  userOverrides: { ...item.userOverrides, [mId]: modelOverrides }
                                                };
                                              }
                                              return item;
                                            }));
                                            invalidateFrom('hyperparameter_opt');
                                          }}
                                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                        />
                                      </td>
                                    </tr>
                                  );
                                });
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Proceed Actions Bar */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer"
                >
                  Back to Aggregation Settings
                </button>
                <button
                  onClick={handleNextPage}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer animate-pulse-slow"
                >
                  <span>Proceed to Model Training</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              PAGE 9: MODEL TRAINING RUNNER
             ========================================== */}
          {page === 9 && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                  <Play className="w-5 h-5 text-indigo-500" />
                  <span>Model Execution Runner</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Run simulated model training across independent instance targets using custom hyperparameters and train/test splits.
                </p>
              </div>

              {/* Pre-flight summary table */}
              {!isTraining && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pre-flight Instance Summary</h3>
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Target</th>
                          <th className="py-2.5 px-3">Approach</th>
                          <th className="py-2.5 px-3">Split</th>
                          <th className="py-2.5 px-3">Features</th>
                          <th className="py-2.5 px-3">Models</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-700 dark:text-slate-350 font-semibold">
                        {instances.map(inst => {
                          const featCount = inst.features?.length || 0;
                          const modelCount = inst.selectedModels?.length || 0;
                          const ready = featCount > 0 && modelCount > 0;
                          return (
                            <tr key={inst.id}>
                              <td className="py-2.5 px-3 font-bold text-indigo-650 dark:text-indigo-400">{inst.target}</td>
                              <td className="py-2.5 px-3 capitalize font-mono text-[10px]">{inst.approach}</td>
                              <td className="py-2.5 px-3 capitalize font-mono text-[10px]">{inst.splitMethod || 'random'} ({inst.splitRatio || 80}%)</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${featCount > 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                  {featCount} selected
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${modelCount > 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                  {modelCount} model{modelCount !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${ready ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                  {ready ? '✓ Ready' : '⚠ Incomplete'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6 text-center">
                {isTraining ? (
                  <div className="space-y-6 max-w-lg mx-auto py-4">
                    <div className="flex items-center space-x-3 justify-center">
                      <Brain className="w-6 h-6 text-indigo-500 animate-bounce-slow" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Training in progress...</span>
                    </div>

                    {/* Overall progress bar */}
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between text-xs font-bold">
                        <span className="text-indigo-650 dark:text-indigo-400 truncate max-w-[70%]">{trainingStatusText}</span>
                        <span className="text-slate-500">{Math.round(trainingProgress)}%</span>
                      </div>
                      <div className="overflow-hidden h-3 text-xs flex rounded-full bg-indigo-50 dark:bg-indigo-950">
                        <div
                          style={{ width: `${trainingProgress}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full"
                        />
                      </div>
                    </div>

                    {/* Per-target instance progress panels */}
                    <div className="space-y-3 text-left">
                      {instances.map((inst, idx) => {
                        const instProgress = Math.min(100, Math.max(0, trainingProgress - idx * (100 / instances.length)));
                        const instDone = trainingProgress >= (idx + 1) * (100 / instances.length);
                        return (
                          <div key={inst.id} className={`border rounded-xl p-3 space-y-2 transition ${instDone ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : instProgress > 0 ? 'border-indigo-500/40 bg-indigo-500/[0.02]' : 'border-slate-150 dark:border-slate-800'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {instDone ? '✓' : instProgress > 0 ? '⟳' : '○'} Target: <strong className="text-indigo-650 dark:text-indigo-400">{inst.target}</strong>
                                <span className="ml-1.5 text-slate-400 font-mono capitalize">({inst.approach})</span>
                              </span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${instDone ? 'bg-emerald-500/10 text-emerald-600' : instProgress > 0 ? 'bg-indigo-500/10 text-indigo-600' : 'text-slate-400'}`}>
                                {instDone ? 'Complete' : instProgress > 0 ? `${Math.round(instProgress)}%` : 'Queued'}
                              </span>
                            </div>
                            {(instProgress > 0 || instDone) && (
                              <div className="overflow-hidden h-1.5 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  style={{ width: `${instDone ? 100 : instProgress * instances.length}%` }}
                                  className="bg-indigo-500 transition-all duration-500 rounded-full"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-6 max-w-md mx-auto">
                    <Brain className="w-16 h-16 text-indigo-500 mx-auto animate-bounce-slow" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider">Independent modeling execution ready</h3>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-semibold">
                        {instances.length} model loop{instances.length !== 1 ? 's' : ''} will execute sequentially for targets: {instances.map(i => i.target).join(', ')}.
                      </p>
                    </div>

                    <button
                      onClick={handleStartTraining}
                      className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-2xl text-xs transition shadow-md mx-auto cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute Target Model Tasks</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handlePrevPage}
                  disabled={isTraining}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Back to Model Selection
                </button>
              </div>
            </div>
          )}
          {page === 10 && instancesResults && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Multi-Instance Models Testing Completed</span>
                    <span className="text-[10px] text-white/80 font-medium">All independent modeling tasks completed successfully</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-xs font-bold font-mono">
                    Finished: {new Date().toLocaleTimeString()}
                  </div>
                  <button
                    onClick={() => {
                      setShowSaveProjectDialog(true);
                      setSaveProjectName(isModifyMode ? currentProjectName : '');
                      setCurrentSavingInstanceId(null);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Entire Project</span>
                  </button>
                </div>
              </div>

              {/* Instances Results Cards */}
              <div className="space-y-8">
                {instances.map((inst) => {
                  const result = instancesResults[inst.id];
                  if (!result) return null;

                  const chartData = getForecastData(inst.target);

                  return (
                    <div key={inst.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                      
                      {/* Instance info */}
                      <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-850 dark:text-slate-100">
                          Instance Target: <strong className="text-indigo-650 dark:text-indigo-400 font-extrabold">{inst.target}</strong>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 capitalize">{inst.approach}</span>
                          <button
                            onClick={() => {
                              setShowSaveProjectDialog(true);
                              setSaveProjectName(isModifyMode ? currentProjectName : '');
                              setCurrentSavingInstanceId(inst.id);
                            }}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition shadow-xs"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save This Target</span>
                          </button>
                        </div>
                      </div>

                      {/* Side-by-side metrics table */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Model Accuracy Evaluation Metrics</h4>
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Algorithm</th>
                                <th className="py-2.5 px-3">MAPE</th>
                                <th className="py-2.5 px-3">RMSE</th>
                                <th className="py-2.5 px-3">MAE</th>
                                <th className="py-2.5 px-3">R-squared</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-705 dark:text-slate-350">
                              {Object.entries(result.models || {}).map(([modelId, modelData]) => {
                                const saveKey = `${inst.id}-${modelId}`;
                                const isSaving = savingModelIds[saveKey];
                                const isSaved = savedModelIds[saveKey];

                                return (
                                  <tr key={modelId} className="font-semibold hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                    <td className="py-2 px-3">{modelData.name}</td>
                                    <td className="py-2 px-3 text-indigo-650 dark:text-indigo-400">{modelData.metrics?.MAPE || 'N/A'}</td>
                                    <td className="py-2 px-3 font-mono">{modelData.metrics?.RMSE || 'N/A'}</td>
                                    <td className="py-2 px-3 font-mono">{modelData.metrics?.MAE || 'N/A'}</td>
                                    <td className="py-2 px-3 font-mono">{modelData.metrics?.['R-squared'] || 'N/A'}</td>
                                    <td className="py-2 px-3 text-right">
                                      <button
                                        onClick={() => handleSaveModel(inst, modelId, modelData)}
                                        disabled={isSaving || isSaved}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                                          isSaved
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 cursor-default'
                                            : isSaving
                                              ? 'bg-slate-100 text-slate-405 border-slate-200 cursor-not-allowed'
                                              : 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500 cursor-pointer shadow-xs'
                                        }`}
                                      >
                                        {isSaved ? '✓ Saved' : isSaving ? 'Saving...' : 'Save Model'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Forecast visual graph */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Trained Algorithm Predictions vs Historical Actuals</h4>
                        <div className="h-64 bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                              <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <ChartTooltip contentStyle={{ fontSize: '11px' }} />
                              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />

                              {/* Actual Historical values */}
                              <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#4b5563"
                                strokeWidth={2.5}
                                dot={false}
                                connectNulls
                                name="Historical Actuals"
                              />

                              {/* Dynamic model predictions */}
                              {inst.selectedModels.map((modelId, idx) => {
                                const modelData = result.models[modelId];
                                if (!modelData) return null;
                                const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
                                const color = colors[idx % colors.length];
                                const isForecastingModel = ['prophet_time', 'arima_time', 'lstm_time'].includes(modelId);
                                
                                return (
                                  <Line
                                    key={modelId}
                                    type="monotone"
                                    dataKey={modelId}
                                    stroke={color}
                                    strokeDasharray={isForecastingModel ? "4 4" : "2 2"}
                                    strokeWidth={1.8}
                                    dot={false}
                                    connectNulls
                                    name={modelData.name || modelId}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Future Predictions Table */}
                      {inst.approach === 'forecasting' && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Future Predictions</h4>
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                  <th className="py-2.5 px-3">Period</th>
                                  {inst.selectedModels.map(modelId => {
                                    const modelData = result.models[modelId];
                                    if (!modelData) return null;
                                    return <th key={modelId} className="py-2.5 px-3">{modelData.name || modelId}</th>;
                                  })}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-slate-700 dark:text-slate-350">
                                {chartData.filter(d => d.actual === null).map((row, idx) => (
                                  <tr key={idx} className="font-medium hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{row.period}</td>
                                    {inst.selectedModels.map(modelId => {
                                      const value = row[modelId];
                                      return (
                                        <td key={modelId} className="py-2 px-3 font-mono">
                                          {value !== undefined && value !== null ? (typeof value === 'number' ? value.toFixed(2) : value) : '—'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Custom Predictions Playground */}
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <span>🔮 Interactive Multi-Scenario Predictions Playground</span>
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              Define custom scenario parameters. Add multiple rows to compare future predictions side-by-side.
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => addScenarioRow(inst.id, inst.features)}
                              className="text-[10px] font-bold px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center space-x-1 transition cursor-pointer shadow-sm"
                            >
                              <span>+ Add Scenario Row</span>
                            </button>
                            <button
                              onClick={() => document.getElementById(`csv-scenario-upload-${inst.id}`).click()}
                              className="text-[10px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1 transition cursor-pointer shadow-sm"
                            >
                              <span>Upload Scenario CSV/Excel</span>
                            </button>
                            <input
                              type="file"
                              id={`csv-scenario-upload-${inst.id}`}
                              accept=".csv,.xlsx,.xls"
                              className="hidden"
                              onChange={(e) => handleCSVUpload(e, inst)}
                            />
                            {customScenarios[inst.id]?.length > 0 && (
                              <button
                                onClick={() => downloadScenariosCSV(inst)}
                                className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg flex items-center space-x-1 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                              >
                                <span>Export Scenarios (CSV)</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {csvFeedback[inst.id] && (
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 relative text-xs">
                            <button
                              onClick={() => setCsvFeedback(prev => {
                                const next = { ...prev };
                                delete next[inst.id];
                                return next;
                              })}
                              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                              title="Dismiss feedback"
                            >
                              ✕
                            </button>
                            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                              <span>✓</span>
                              <span>Successfully imported {csvFeedback[inst.id].successCount} rows.</span>
                            </div>
                            
                            {csvFeedback[inst.id].errors?.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-red-500 font-bold">Skipped Rows ({csvFeedback[inst.id].errors.length}):</div>
                                <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-950 border border-red-100 dark:border-red-950/30 rounded-lg p-2.5 space-y-1 font-mono text-[10px] text-red-600 dark:text-red-400">
                                  {csvFeedback[inst.id].errors.map((err, idx) => (
                                    <div key={idx}>• Row {err.rowNum}: {err.message}</div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {csvFeedback[inst.id].warnings?.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-amber-500 dark:text-amber-400 font-bold">Warnings ({csvFeedback[inst.id].warnings.length}):</div>
                                <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-950 border border-amber-100 dark:border-amber-950/30 rounded-lg p-2.5 space-y-1 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                  {csvFeedback[inst.id].warnings.map((warn, idx) => (
                                    <div key={idx}>• Row {warn.rowNum}: {warn.message}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {(!customScenarios[inst.id] || customScenarios[inst.id].length === 0) ? (
                          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20 dark:bg-slate-900/10">
                            <p className="text-xs text-slate-450 dark:text-slate-500">No custom scenarios added yet. Click "+ Add Scenario Row" to configure and test model inputs.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-155 dark:border-slate-800 rounded-xl bg-slate-50/10 dark:bg-slate-900/10">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-wider border-b border-slate-150 dark:border-slate-805 sticky top-0">
                                <tr>
                                  <th className="py-2.5 px-3 w-36">Scenario Name</th>
                                  {inst.features.map(feat => (
                                    <th key={feat} className="py-2.5 px-3 min-w-[130px] font-semibold text-slate-600 dark:text-slate-350">{feat}</th>
                                  ))}
                                  {inst.selectedModels.map(modelId => {
                                    const modelMeta = MODEL_REGISTRY[inst.approach]?.find(m => m.id === modelId);
                                    return (
                                      <th key={modelId} className="py-2.5 px-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-650 dark:text-indigo-300 font-extrabold w-36 border-l border-indigo-100 dark:border-indigo-900/40">
                                        {modelMeta?.name || modelId} (Pred)
                                      </th>
                                    );
                                  })}
                                  <th className="py-2.5 px-3 text-right w-12 border-l border-slate-150 dark:border-slate-800">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                                {customScenarios[inst.id].map((scenario, sIdx) => (
                                  <tr key={scenario.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 align-middle">
                                    {/* Scenario Name */}
                                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">
                                      <input
                                        type="text"
                                        value={scenario.name}
                                        onChange={(e) => updateScenarioField(inst.id, scenario.id, 'name', e.target.value)}
                                        className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-0.5 w-full font-bold text-slate-800 dark:text-slate-100"
                                      />
                                    </td>

                                    {/* Feature Parameters */}
                                    {inst.features.map(feat => {
                                      const colMeta = dataset.columnsInfo.find(c => c.name === feat);
                                      const val = scenario.inputs[feat] ?? '';
                                      const isNumeric = colMeta?.type === 'numeric';

                                      if (isNumeric) {
                                        return (
                                          <td key={feat} className="py-2 px-3">
                                            <input
                                              type="number"
                                              placeholder="Enter value..."
                                              value={val}
                                              onChange={(e) => updateScenarioInput(inst.id, scenario.id, feat, e.target.value, inst)}
                                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-slate-800 dark:text-slate-100"
                                            />
                                          </td>
                                        );
                                      } else {
                                        // Get sample choices
                                        const samples = [...new Set(dataset.sampleRows.map(r => r[feat]).filter(v => v !== null && v !== undefined))].slice(0, 15);
                                        return (
                                          <td key={feat} className="py-2 px-3">
                                            <select
                                              value={val}
                                              onChange={(e) => updateScenarioInput(inst.id, scenario.id, feat, e.target.value, inst)}
                                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                                            >
                                              <option value="">-- Select --</option>
                                              {samples.map(opt => (
                                                <option key={opt} value={String(opt)}>{String(opt)}</option>
                                              ))}
                                            </select>
                                          </td>
                                        );
                                      }
                                    })}

                                    {/* Model Outputs */}
                                    {inst.selectedModels.map(modelId => {
                                      const pred = scenario.predictions[modelId];
                                      const displayPred = pred !== undefined && pred !== null ? pred : '—';
                                      return (
                                        <td key={modelId} className="py-2 px-3 font-mono font-bold bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] text-indigo-650 dark:text-indigo-300 text-xs border-l border-indigo-150/40 dark:border-indigo-900/20">
                                          {displayPred}
                                        </td>
                                      );
                                    })}

                                    {/* Delete button */}
                                    <td className="py-2 px-3 text-right border-l border-slate-150 dark:border-slate-800">
                                      <button
                                        onClick={() => removeScenarioRow(inst.id, scenario.id)}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition font-bold"
                                        title="Remove scenario row"
                                      >
                                        <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Actions Bottom Bar */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={handleExitToHomepage}
                  className="text-xs font-bold px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center space-x-2 transition shadow-md cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Configure / Train Another Model</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ==========================================
          GLOBAL SIDE PANEL DRAWERS
         ========================================== */}

      {/* Backdrop overlay handler */}
      {(isDataOverviewOpen || isModelInventoryOpen || isTrainingHistoryOpen || showProjectActionDialog || showSaveProjectDialog) && (
        <div
          onClick={() => {
            setIsDataOverviewOpen(false);
            setIsModelInventoryOpen(false);
            setIsTrainingHistoryOpen(false);
            setShowProjectActionDialog(false);
            setShowSaveProjectDialog(false);
            setSelectedProjectForAction(null);
          }}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* RIGHT SIDE PANEL: DATA OVERVIEW (On All Pages) */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-96 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 flex flex-col ${isDataOverviewOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Data Overview</h3>
          </div>
          <button
            onClick={() => setIsDataOverviewOpen(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            Close
          </button>
        </div>

        {dataset ? (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
            {/* Search Input */}
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder="Search values in dataset..."
                value={overviewSearch}
                onChange={(e) => setOverviewSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              {overviewSearch && (
                <button
                  onClick={() => setOverviewSearch('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Total Row Count and Capping Message */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold shrink-0">
              <span>Filtered: {filteredRows.length} rows</span>
              {dataset.rows > 10000 && (
                <span>Showing first 10,000 of {dataset.rows.toLocaleString()}</span>
              )}
            </div>

            {/* Scroll Container with Virtualized Table */}
            {(() => {
              const rowHeight = 36;
              const totalHeight = filteredRows.length * rowHeight;
              const startIndex = Math.max(0, Math.floor(overviewScrollTop / rowHeight) - 5);
              const endIndex = Math.min(filteredRows.length, startIndex + 30);
              const visibleRows = filteredRows.slice(startIndex, endIndex);

              return (
                <div
                  onScroll={(e) => setOverviewScrollTop(e.target.scrollTop)}
                  className="overflow-auto flex-1 relative border border-slate-150 dark:border-slate-800 rounded-lg bg-slate-50/10 dark:bg-slate-900/10"
                  style={{ height: 'calc(100vh - 200px)' }}
                >
                  <div style={{ height: totalHeight + rowHeight, minWidth: dataset.columnsInfo.length * 120, position: 'relative' }}>
                    {/* Sticky Header Row */}
                    <div
                      className="flex bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700"
                      style={{ height: rowHeight }}
                    >
                      {dataset.columnsInfo.map(col => (
                        <div
                          key={col.name}
                          onClick={() => {
                            if (overviewSortCol === col.name) {
                              setOverviewSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setOverviewSortCol(col.name);
                              setOverviewSortDirection('asc');
                            }
                          }}
                          className="flex-1 min-w-[120px] px-3 h-full flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          <span className="truncate">{col.name}</span>
                          <span className="font-mono text-[8px] ml-1">{overviewSortCol === col.name ? (overviewSortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                        </div>
                      ))}
                    </div>

                    {/* Virtualized Rows */}
                    {visibleRows.map((row, index) => {
                      const absoluteIdx = startIndex + index;
                      return (
                        <div
                          key={absoluteIdx}
                          className={`flex items-center text-xs border-b border-slate-100 dark:border-slate-800/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 ${absoluteIdx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'}`}
                          style={{
                            position: 'absolute',
                            top: (absoluteIdx * rowHeight) + rowHeight,
                            left: 0,
                            right: 0,
                            height: rowHeight
                          }}
                        >
                          {dataset.columnsInfo.map(col => (
                            <div key={col.name} className="flex-1 min-w-[120px] px-3 truncate text-slate-700 dark:text-slate-350 font-mono">
                              {row[col.name] === null || row[col.name] === undefined ? (
                                <span className="text-slate-400 dark:text-slate-650 italic">null</span>
                              ) : (
                                String(row[col.name])
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-505">
            <Database className="w-12 h-12 mb-3 stroke-1" />
            <span className="text-sm font-semibold">No dataset ingested yet</span>
            <p className="text-xs mt-1.5 max-w-[200px]">Upload a file or choose a sample dataset on Page 1 to browse details.</p>
          </div>
        )}
      </aside>

      {/* ML INVENTORY DOUBLE-PANE DRAWER */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-150 dark:border-slate-805 shadow-2xl z-50 transform transition-transform duration-300 flex overflow-hidden ${isModelInventoryOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '640px' }}
      >
        {/* Left List Navigation Pane (w-64) */}
        <div className="w-64 flex flex-col border-r border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 shrink-0">
          <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">ML Inventory</h3>
            </div>
            <button
              onClick={() => setIsModelInventoryOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* Saved Models Section */}
            {trainingHistory.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-500 select-none">Saved Models</span>
                <div className="space-y-1">
                  {trainingHistory.map(run => {
                    const isSelected = selectedInventoryModel?.id === run.id;
                    return (
                      <button
                        key={run.id}
                        onClick={() => setSelectedInventoryModel({ ...run, isSavedModel: true })}
                        className={`w-full p-2.5 rounded-lg text-left text-xs transition border flex flex-col space-y-0.5 ${isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-955/60 border-emerald-200 dark:border-emerald-900/50 text-emerald-650 dark:text-emerald-300 font-bold shadow-xs'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-605 dark:text-slate-400'
                          }`}
                      >
                        <span className="font-bold truncate w-full">{run.model_name}</span>
                        <span className="text-[9px] text-slate-400 truncate w-full leading-none">{run.target_column} · {run.dataset_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Model Registry Section */}
            {Object.entries(MODEL_REGISTRY).map(([category, models]) => (
              <div key={category} className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 select-none">{category}</span>
                <div className="space-y-1">
                  {models.map(m => {
                    const isSelected = selectedInventoryModel?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedInventoryModel(m)}
                        className={`w-full p-2.5 rounded-lg text-left text-xs transition border flex flex-col space-y-0.5 ${isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-955/60 border-indigo-200 dark:border-indigo-900/50 text-indigo-650 dark:text-indigo-300 font-bold shadow-xs'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-605 dark:text-slate-400'
                          }`}
                      >
                        <span className="font-bold truncate w-full">{m.name}</span>
                        <span className="text-[9px] text-slate-400 truncate w-full leading-none">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Details Pane (w-96) */}
        <div className="w-96 flex flex-col bg-white dark:bg-slate-900 shrink-0">
          <div className="p-4 border-b border-slate-155 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">Model Details</h4>
            <button
              onClick={() => setIsModelInventoryOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              Close All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs scrollbar-thin">
            {selectedInventoryModel ? (
              <>
                {selectedInventoryModel.isSavedModel ? (
                  <>
                    {/* Saved Model Details */}
                    <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-850">
                      <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">{selectedInventoryModel.model_name}</h2>
                      <span className="text-[9px] font-mono uppercase text-emerald-500 font-bold">Saved Model</span>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Target Column</span>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">{selectedInventoryModel.target_column}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Dataset</span>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">{selectedInventoryModel.dataset_name}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Metrics</span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {selectedInventoryModel.metrics && Object.entries(selectedInventoryModel.metrics).map(([key, value]) => (
                          <div key={key} className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                            <span className="text-[9px] text-slate-400 block">{key}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{typeof value === 'number' ? value.toFixed(3) : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Actions</span>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            // Test current data against this saved model
                            alert('Testing data against saved model - feature to be implemented');
                          }}
                          className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition"
                        >
                          Test Current Data
                        </button>
                        <button
                          onClick={() => {
                            // Train using this saved model
                            const currentInst = instances.find(i => i.target === selectedInventoryModel.target_column);
                            if (currentInst) {
                              updateInstanceReuseModel(currentInst.id, selectedInventoryModel.id);
                              setIsModelInventoryOpen(false);
                            } else {
                              alert('No matching target instance found. Please select the target first.');
                            }
                          }}
                          className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition"
                        >
                          Use for Training
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Model Registry Details */}
                    <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-850">
                      <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">{selectedInventoryModel.name}</h2>
                      <span className="text-[9px] font-mono uppercase text-slate-400 font-bold">ID: {selectedInventoryModel.id}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Summary</span>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">{selectedInventoryModel.summary}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Theoretical Assumptions</span>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">{selectedInventoryModel.assumptions}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 py-2 border-t border-b border-slate-105 dark:border-slate-850 text-[11px]">
                      <div>
                        <span className="font-bold text-indigo-500 uppercase tracking-wider text-[9px] block">When to use</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{selectedInventoryModel.use}</p>
                      </div>
                      <div>
                        <span className="font-bold text-rose-500 uppercase tracking-wider text-[9px] block">When NOT to use</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{selectedInventoryModel.avoid}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Standard Use Cases</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedInventoryModel.usecases.map((uc, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 font-semibold text-[10px] text-slate-650 dark:text-slate-350">
                            {uc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-6">
                <Layers className="w-8 h-8 mb-2 stroke-1" />
                <span className="text-xs font-semibold">No model selected</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* RIGHT SIDE PANEL: TRAINING HISTORY */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-96 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 flex flex-col ${isTrainingHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Training Run History</h3>
          </div>
          <button
            onClick={() => setIsTrainingHistoryOpen(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isHistoryLoading ? (
            <div className="text-center py-8 text-xs text-slate-400 font-medium">Loading history...</div>
          ) : trainingHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <History className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-355 dark:text-slate-700" />
              <span className="text-sm font-semibold block">No saved runs found</span>
              <p className="text-xs mt-1 max-w-[220px] mx-auto text-slate-405 dark:text-slate-495">Runs are recorded dynamically in history upon successful model fitting.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainingHistory.map(run => (
                <div key={run.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 transition relative group">
                  <button
                    onClick={() => deleteHistoryRun(run.id)}
                    className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete run record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="pr-6">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                      {run.modality || 'Tabular'} · {run.created_at ? new Date(run.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                      {run.model_name}
                    </h4>
                    {run.dataset_name && (
                      <span className="text-[10px] text-slate-400 block mt-1 font-medium truncate">
                        Dataset: {run.dataset_name}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                      <span>Target: <strong className="text-slate-750 dark:text-slate-300">{run.target_column}</strong></span>
                      <span>Features: <strong className="text-slate-750 dark:text-slate-300">{run.feature_count}</strong></span>
                    </div>
                    {run.metrics && Object.keys(run.metrics).length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                        {Object.entries(run.metrics).slice(0, 3).map(([mName, mVal]) => (
                          <div key={mName} className="text-center bg-slate-100/60 dark:bg-slate-800/40 rounded py-1 px-1.5">
                            <span className="text-[8px] text-slate-400 font-bold uppercase block truncate">{mName}</span>
                            <strong className="text-[10px] text-indigo-650 dark:text-indigo-400 block">
                              {typeof mVal === 'number' ? mVal.toFixed(3) : String(mVal)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* SAVE PROJECT DIALOG */}
      {showSaveProjectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                {isModifyMode ? 'Save Project' : 'Save as New Project'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isModifyMode 
                  ? `Update "${currentProjectName}" with your changes, or save as a new project.`
                  : 'Save your work as a named project to access it later.'}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={saveProjectName}
                  onChange={(e) => {
                    setSaveProjectName(e.target.value);
                    setSaveError('');
                  }}
                  placeholder="Enter project name..."
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
                />
                {saveError && (
                  <p className="text-xs text-rose-500 mt-2 font-semibold">{saveError}</p>
                )}
              </div>
              
              {isModifyMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSaveProjectName(currentProjectName);
                      saveProject(currentProjectName, true, currentSavingInstanceId);
                    }}
                    className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition shadow-md"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setSaveProjectName('');
                      saveProject('', false, currentSavingInstanceId);
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition"
                  >
                    Save As
                  </button>
                </div>
              )}
              
              {!isModifyMode && (
                <button
                  onClick={() => {
                    if (saveProjectName.trim()) {
                      saveProject(saveProjectName, false, currentSavingInstanceId);
                    } else {
                      setSaveError('Please enter a project name');
                    }
                  }}
                  disabled={!saveProjectName.trim()}
                  className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Project
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowSaveProjectDialog(false);
                setSaveProjectName('');
                setSaveError('');
              }}
              className="w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          TRAINING SCREEN PROGRESS SCREEN OVERLAY
         ========================================== */}
      {isTraining && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-900/98 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in transition-colors duration-200">
          <div className="max-w-md w-full space-y-6">

            {/* Spinning Brain Logo */}
            <div className="relative flex justify-center">
              <div className="absolute w-16 h-16 rounded-full border-2 border-dashed border-indigo-500 animate-spin" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg relative z-10 animate-pulse-slow">
                <Brain className="w-8 h-8" />
              </div>
            </div>

            {/* Title / Description */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Fitting Model Weights...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase">{trainingStatusText}</p>
            </div>

            {/* Progress Slider */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300 shadow-md"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-indigo-500">{Math.round(trainingProgress)}% Done</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

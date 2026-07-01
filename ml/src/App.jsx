import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { calculateReadiness } from './utils/readinessCalculator';

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

  // Check for a datetime column in the dataset
  const dateCol = db.columnsInfo.find(c => c.type === 'datetime');
  const hasDateColumn = !!dateCol;

  const hasYearCol = db.columnsInfo.some(c => c.name.toLowerCase().includes('year'));
  const hasMonthCol = db.columnsInfo.some(c => c.name.toLowerCase().includes('month'));

  if (colMeta.type === 'categorical') {
    return {
      goal: 'classification',
      problemSubtype: colMeta.uniqueCount === 2 ? 'binary' : 'multiclass',
      dateColumn: ''
    };
  }

  if (colMeta.type === 'numeric') {
    // Numeric with very few unique values → likely encoded classification
    if (colMeta.uniqueCount <= 10) {
      return {
        goal: 'classification',
        problemSubtype: colMeta.uniqueCount === 2 ? 'binary' : 'multiclass',
        dateColumn: ''
      };
    }

    // Numeric + datetime column present → forecasting
    if (hasDateColumn) {
      return {
        goal: 'forecasting',
        problemSubtype: 'binary',
        dateColumn: dateCol.name
      };
    }

    // Numeric + Year & Month columns present → forecasting (with Combined Year + Month)
    if (hasYearCol && hasMonthCol) {
      return {
        goal: 'forecasting',
        problemSubtype: 'binary',
        dateColumn: 'Combined Year + Month'
      };
    }

    // Default numeric → regression
    return { goal: 'regression', problemSubtype: 'binary', dateColumn: '' };
  }

  // Fallback
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

  const recommendations = [];
  const nCols = columnsInfo.length;
  const hasDateCol = columnsInfo.some(c => c.type === 'datetime' || String(c.name).toLowerCase().includes('date') || String(c.name).toLowerCase().includes('time'));

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

    // 5. Correlation score
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

    // Auto-detect suggested approach for this target
    let approach = 'regression';
    if (col.type === 'categorical') {
      approach = 'classification';
    } else if (col.type === 'numeric') {
      if (col.uniqueCount <= 10) {
        approach = 'classification';
      } else if (hasDateCol && !colLower.includes('date') && !colLower.includes('time')) {
        approach = 'forecasting';
      } else {
        approach = 'regression';
      }
    }

    recommendations.push({
      column: col.name,
      score: parseFloat(score.toFixed(2)),
      approach: approach
    });
  });

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  // Filter by threshold
  let filtered = recommendations.filter(r => r.score >= threshold);
  if (filtered.length === 0 && recommendations.length > 0) {
    filtered = [recommendations[0]];
  }

  return filtered;
};

// ==========================================
// 4. MAIN COMPONENT DEFINITION
// ==========================================
export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

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


  // Side drawer panels
  const [isDataOverviewOpen, setIsDataOverviewOpen] = useState(false);
  const [isModelInventoryOpen, setIsModelInventoryOpen] = useState(false);
  const [selectedInventoryModel, setSelectedInventoryModel] = useState(null);
  const [activeInfoModel, setActiveInfoModel] = useState(null);
  const [isTrainingHistoryOpen, setIsTrainingHistoryOpen] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchTrainingHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const r = await fetch('http://localhost:7860/api/history');
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

  const deleteHistoryRun = async (runId) => {
    try {
      const r = await fetch(`http://localhost:7860/api/history/${runId}`, {
        method: 'DELETE',
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
    const options = dataset.columnsInfo
      .filter(col => col.type === 'datetime')
      .map(col => col.name);
    const hasYearCol = dataset.columnsInfo.some(c => c.name.toLowerCase().includes('year'));
    const hasMonthCol = dataset.columnsInfo.some(c => c.name.toLowerCase().includes('month'));
    if (hasYearCol && hasMonthCol) {
      options.unshift("Combined Year + Month");
    }
    return options;
  }, [dataset]);

  const chronologicalOrderOptions = useMemo(() => {
    if (!dataset) return [];

    const hasYearCol = dataset.columnsInfo.some(c => c.name.toLowerCase().includes('year'));
    const hasMonthCol = dataset.columnsInfo.some(c => c.name.toLowerCase().includes('month'));

    const options = dataset.columnsInfo.filter(col => {
      if (col.type === 'datetime') return true;
      if (col.type === 'numeric' || col.type === 'categorical') {
        const nameLower = col.name.toLowerCase();
        return ['year', 'month', 'date', 'time', 'week'].some(kw => nameLower.includes(kw));
      }
      return false;
    }).map(col => col.name);

    if (hasYearCol && hasMonthCol) {
      options.unshift("Combined Year + Month");
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



  // Sync feature selections when featureStatuses changes
  useEffect(() => {
    if (!dataset) return;
    const initialSelections = {};
    Object.keys(featureStatuses).forEach(name => {
      initialSelections[name] = featureStatuses[name].recommend;
    });
    setFeatureSelections(initialSelections);
  }, [featureStatuses]);

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

    // Find chronological column candidates
    const dateColMeta = db.columnsInfo.find(c => c.type === 'datetime' || c.name.toLowerCase() === 'date' || c.name.toLowerCase() === 'timestamp');
    const hasYear = db.columnsInfo.some(c => c.name.toLowerCase() === 'year');
    const hasMonth = db.columnsInfo.some(c => c.name.toLowerCase() === 'month');

    let enrichedRows = [...db.sampleRows];
    let newColInfo = null;

    // ONLY generate virtual Year + Month column if we have separate Year & Month columns AND no combined date column
    const shouldAddVirtual = !dateColMeta && hasYear && hasMonth;

    if (shouldAddVirtual && !db.columnsInfo.some(c => c.name === 'Year + Month')) {
      const yCol = db.columnsInfo.find(c => c.name.toLowerCase() === 'year').name;
      const mCol = db.columnsInfo.find(c => c.name.toLowerCase() === 'month').name;
      const MONTH_MAP = {
        'jan': '01', 'january': '01', 'feb': '02', 'february': '02', 'mar': '03', 'march': '03',
        'apr': '04', 'april': '04', 'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
        'aug': '08', 'august': '08', 'sep': '09', 'september': '09', 'oct': '10', 'october': '10',
        'nov': '11', 'november': '11', 'dec': '12', 'december': '12'
      };
      const generateFn = (row) => {
        const yVal = row[yCol];
        const mVal = row[mCol];
        if (yVal === null || yVal === undefined || mVal === null || mVal === undefined) return 'Unknown';
        let mStr = String(mVal).trim().toLowerCase();
        let mNum = MONTH_MAP[mStr];
        if (!mNum) {
          const num = Number(mVal);
          mNum = isNaN(num) ? '01' : String(num).padStart(2, '0');
        }
        return `${yVal}-${mNum}`;
      };

      enrichedRows = db.sampleRows.map(row => {
        const val = generateFn(row);
        return {
          ...row,
          'Year + Month': val,
          'Combined Year + Month': val
        };
      });

      const uniqueValues = new Set(enrichedRows.map(r => r['Year + Month']).filter(v => v !== 'Unknown'));
      const samples = enrichedRows.slice(0, 5).map(r => r['Year + Month']);
      newColInfo = {
        name: 'Year + Month',
        type: 'categorical',
        nullPercent: parseFloat(((enrichedRows.filter(r => r['Year + Month'] === 'Unknown').length / enrichedRows.length) * 100).toFixed(1)),
        uniqueCount: uniqueValues.size,
        missing: enrichedRows.filter(r => r['Year + Month'] === 'Unknown').length,
        samples
      };
    }

    // Sort entire dataset chronologically ascending
    const sortMonthMap = {
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
      'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
      'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    };
    const getMonthVal = (mVal) => {
      if (mVal === null || mVal === undefined) return 1;
      const mStr = String(mVal).trim().toLowerCase();
      const mapped = sortMonthMap[mStr];
      if (mapped !== undefined) return mapped;
      const num = Number(mVal);
      return isNaN(num) ? 1 : num;
    };

    const hasYearCol = db.columnsInfo.find(c => c.name.toLowerCase() === 'year')?.name;
    const hasMonthCol = db.columnsInfo.find(c => c.name.toLowerCase() === 'month')?.name;
    const dateCol = dateColMeta?.name;

    enrichedRows.sort((a, b) => {
      if (hasYearCol && hasMonthCol) {
        const yA = Number(a[hasYearCol]) || 0;
        const yB = Number(b[hasYearCol]) || 0;
        if (yA !== yB) return yA - yB;
        const mA = getMonthVal(a[hasMonthCol]);
        const mB = getMonthVal(b[hasMonthCol]);
        return mA - mB;
      } else if (dateCol) {
        const dA = new Date(a[dateCol]);
        const dB = new Date(b[dateCol]);
        if (!isNaN(dA.getTime()) && !isNaN(dB.getTime())) {
          return dA - dB;
        }
      }
      return 0;
    });

    return {
      ...db,
      columnsInfo: newColInfo ? [newColInfo, ...db.columnsInfo] : db.columnsInfo,
      sampleRows: enrichedRows
    };
  };

  // Autocomplete and initialize states when dataset or target changes
  const handleDatasetSelect = (selectedDb) => {
    const enrichedDb = addYearMonthVirtualColumn(selectedDb);
    setDataset(enrichedDb);

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
    if (groupByColumns.length > 0) {
      setDqiPrimaryCategory(groupByColumns[0]);
      if (groupByColumns.length > 1) {
        setDqiSubgroupCategory(groupByColumns[1]);
      } else {
        setDqiSubgroupCategory('none');
      }
    } else {
      setDqiPrimaryCategory('');
      setDqiSubgroupCategory('none');
    }
  }, [groupByColumns]);

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
      if (col === 'Combined Year + Month') {
        return row['Combined Year + Month'] || row['Year + Month'] || '';
      }
      return row[col] || '';
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
        if (col === 'Combined Year + Month') {
          return row['Combined Year + Month'] || row['Year + Month'] || '';
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

      // 3. Compute Pillar Scores using the new enterprise-grade Readiness Calculator
      const activeAnomalyLog = anomalyLogOverrides || anomalies;
      const activeAnomalies = activeAnomalyLog.filter(a => a.status === 'active');

      const readinessResult = calculateReadiness(
        sortedRows,
        features,
        targetCol,
        dateCol,
        activeAnomalies,
        goal,
        {
          referenceDate: new Date('2026-06-29') // Keep reference date consistent with baseline
        }
      );

      return {
        sortedRows,
        anomalies,
        pillarScores: {
          granularity: readinessResult.scores.granularity,
          historicity: readinessResult.scores.historicity,
          value: readinessResult.scores.valueScore,
          readiness: readinessResult.scores.overallReadiness
        }
      };
    }
  };

  const dqiAggregatedDataset = useMemo(() => {
    if (!dqiDataset) return null;
    if (applyAggregation && groupByColumns.length > 0) {
      return aggregateDataset(dqiDataset, groupByColumns, customAggMappings);
    }
    return dqiDataset;
  }, [dqiDataset, applyAggregation, groupByColumns, customAggMappings]);

  const activeDataset = useMemo(() => {
    return dqiAggregatedDataset || dqiDataset || dataset;
  }, [dqiAggregatedDataset, dqiDataset, dataset]);

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
      if (dateColumn === 'Combined Year + Month') {
        raw = row['Combined Year + Month'] || row['Year + Month'] || '';
      } else {
        raw = row[dateColumn] || '';
      }
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

  // Navigations & validations
  const isPage1Valid = advancedMode
    ? (dataset && goal && (goal === 'clustering' ? true : (targetColumn && targetConfirmed)) && selectedModels.length > 0)
    : (dataset && targetColumn && targetColumn !== '' && goal);
  const isPage2Valid = selectedFeaturesList.length > 0 && (splitMethod !== 'chronological' || dateColumn);
  const isPage3Valid = true;

  const handleNextPage = () => {
    if (page === 1 && isPage1Valid) {
      setPage(2);
    } else if (page === 2 && isPage2Valid) {
      setPage(3);
    } else if (page === 3 && isPage3Valid) {
      handleStartTraining();
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
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

  const forecastData = useMemo(() => {
    if (!activeDataset || goal !== 'forecasting' || !targetColumn || !dateColumn) return [];

    // Sort rows chronologically
    let sortedRows = [...activeDataset.sampleRows];
    if (dateColumn === 'Combined Year + Month') {
      const yCol = activeDataset.columnsInfo.find(c => c.name.toLowerCase().includes('year'))?.name;
      const mCol = activeDataset.columnsInfo.find(c => c.name.toLowerCase().includes('month'))?.name;

      const getMonthNumeric = (mVal) => {
        if (mVal === null || mVal === undefined) return 1;
        const mStr = String(mVal).trim().toLowerCase();
        const MONTH_MAP = {
          'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
          'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
          'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
          'nov': 11, 'november': 11, 'dec': 12, 'december': 12
        };
        const mapped = MONTH_MAP[mStr];
        if (mapped !== undefined) return mapped;
        const num = Number(mVal);
        return isNaN(num) ? 1 : num;
      };

      sortedRows.sort((a, b) => {
        const yA = Number(a[yCol]) || 0;
        const yB = Number(b[yCol]) || 0;
        if (yA !== yB) return yA - yB;

        const mA = getMonthNumeric(a[mCol]);
        const mB = getMonthNumeric(b[mCol]);
        return mA - mB;
      });
    } else {
      sortedRows.sort((a, b) => {
        const valA = a[dateColumn];
        const valB = b[dateColumn];
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        const dateA = Date.parse(String(valA || ''));
        const dateB = Date.parse(String(valB || ''));
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateA - dateB;
        }
        return String(valA || '').localeCompare(String(valB || ''));
      });
    }

    const targetValues = sortedRows.map(r => Number(r[targetColumn])).filter(v => !isNaN(v));

    let dates;
    if (dateColumn === 'Combined Year + Month') {
      const yCol = dataset.columnsInfo.find(c => c.name.toLowerCase().includes('year'))?.name;
      const mCol = dataset.columnsInfo.find(c => c.name.toLowerCase().includes('month'))?.name;
      dates = sortedRows.map(r => {
        const yVal = r[yCol];
        let mVal = r[mCol];
        if (mVal !== null && mVal !== undefined) {
          const mStr = String(mVal).trim().toLowerCase();
          const MONTH_MAP = {
            'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
            'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
            'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
            'nov': 11, 'november': 11, 'dec': 12, 'december': 12
          };
          const mapped = MONTH_MAP[mStr];
          if (mapped !== undefined) mVal = mapped;
        }
        const yStr = yVal !== null && yVal !== undefined ? String(yVal).trim() : 'YYYY';
        const mStr = mVal !== null && mVal !== undefined ? String(mVal).trim().padStart(2, '0') : 'MM';
        return `${yStr}-${mStr}`;
      });
    } else {
      dates = sortedRows.map(r => String(r[dateColumn] || ''));
    }

    const histCount = Math.min(targetValues.length, 60);
    const startIndex = targetValues.length - histCount;
    const historicalValues = targetValues.slice(startIndex);
    const historicalDates = dates.slice(startIndex);

    const chartData = [];

    for (let i = 0; i < histCount; i++) {
      chartData.push({
        period: historicalDates[i] || `t - ${histCount - 1 - i}`,
        actual: historicalValues[i],
        forecast: null,
        range: null
      });
    }

    const lastHistVal = historicalValues[historicalValues.length - 1] || 100;

    const trendSpan = Math.min(historicalValues.length, 10);
    let slope = 0;
    if (trendSpan > 1) {
      const last10 = historicalValues.slice(-trendSpan);
      slope = (last10[last10.length - 1] - last10[0]) / (trendSpan - 1);
    }

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

      chartData.push({
        period: futureDateStr,
        actual: null,
        forecast: Number(forecastVal.toFixed(2)),
        range: [
          Number(Math.max(0, forecastVal - uncertainty).toFixed(2)),
          Number((forecastVal + uncertainty).toFixed(2))
        ]
      });
    }

    return chartData;
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

  // ==========================================
  // 5. MOCK TRAINING SIMULATION ENGINE
  // ==========================================
  const handleStartTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);

    if (!advancedMode) {
      setSelectedModels(recommendedModelsList.map(m => m.id));
    }

    const steps = [
      { text: 'Preprocessing feature columns & parsing types...', delay: 500 },
      { text: 'Applying one-hot encoding on categorical inputs...', delay: 500 },
      { text: 'Handling missing values and scale normalizations...', delay: 500 },
      ...(useFeaturePipeline ? [
        { text: 'Feature selection pipeline: Generating polynomial interactions...', delay: 600 },
        { text: 'Feature selection pipeline: Applying variance threshold filters...', delay: 600 },
        { text: 'Feature selection pipeline: Pruning collinear features (threshold > 0.95)...', delay: 600 },
        { text: 'Feature selection pipeline: Selecting top features via Mutual Information...', delay: 600 },
        { text: 'Feature selection pipeline: Running first-pass LightGBM & SHAP importance...', delay: 700 }
      ] : []),
      { text: 'Splitting datasets and building model hyperparameters...', delay: 500 },
      ...(useOptuna ? [
        { text: 'Auto-tuning model hyperparameters with Optuna Bayesian optimization...', delay: 700 },
        { text: 'Running Optuna search trials...', delay: 800 },
        { text: 'Fitting final selected models with best hyperparameters...', delay: 600 }
      ] : []),
      { text: 'Evaluating loss values & validation accuracy parameters...', delay: 500 }
    ];

    let currentStep = 0;

    const runStep = () => {
      if (currentStep < steps.length) {
        setTrainingStatusText(steps[currentStep].text);
        setTrainingProgress(Math.min(((currentStep + 1) / steps.length) * 100, 100));
        setTimeout(() => {
          currentStep++;
          runStep();
        }, steps[currentStep].delay);
      } else {
        // Complete training and generate output
        const results = generateMockResults();
        setTrainingResults(results);
        setIsTraining(false);
        setPage(4);

        // Persist each trained model run to SQLite history on backend
        if (results && results.models) {
          Object.entries(results.models).forEach(async ([modelId, modelData]) => {
            const payload = {
              modality: goal || 'tabular',
              model_name: modelData.name || modelId,
              dataset_name: dataset?.name || 'uploaded_dataset',
              target_column: targetColumn || 'N/A',
              feature_count: selectedFeaturesList.length,
              metrics: modelData.metrics || {},
              config: {
                features: selectedFeaturesList,
                split: splitRatio / 100,
                split_method: splitMethod || 'random',
                normalization: normalizationStrategies,
                missing: missingStrategies,
                apply_aggregation: applyAggregation,
                group_by_columns: groupByColumns,
                aggregation_mappings: customAggMappings
              }
            };
            try {
              await fetch('http://localhost:7860/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
            } catch (err) {
              console.error("Failed to save run to history:", err);
            }
          });
        }

        // Set active prediction model
        let defaultActiveModel = '';
        if (!advancedMode && userOverrodeModel && selectedModelOverride) {
          defaultActiveModel = selectedModelOverride;
        } else {
          // Find the best model key from results among selectedModels
          defaultActiveModel = getBestModelKey(results) || selectedModels[0] || '';
        }
        setActivePredictionModel(defaultActiveModel);
        setActiveDiagModel(defaultActiveModel);

        // Keep all model results collapsed by default to save space
        setExpandedTrainedModels({});
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

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200 flex flex-col">

      {/* ==========================================
          GLOBAL TOP NAVIGATION BAR
         ========================================== */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">

        {/* Logo & Platform Info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight">EY ML Playground</span>
              {/* <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100 dark:border-indigo-900">v2.0</span> */}
            </div>
          </div>
        </div>

        {/* Wizard Progress Control */}
        <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl px-3 py-1 shadow-sm text-xs font-semibold">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className={`flex items-center space-x-1.5 pr-2.5 border-r border-slate-200 dark:border-slate-700 transition cursor-pointer ${page === 1 ? 'opacity-35 cursor-not-allowed' : 'hover:text-indigo-500 text-slate-600 dark:text-slate-300'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Back</span>
          </button>

          {/* Horizontal Flowchart */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-[9px] font-bold">
            {[
              { id: 1, label: 'Data Setup' },
              { id: 2, label: 'Pre-process' },
              { id: 3, label: 'Quality Audit' },
              { id: 4, label: 'Model Testing' }
            ].map((s, idx) => {
              const isActive = page === s.id;
              const isCompleted = page > s.id;
              const isSelectable = s.id === 1 ||
                (s.id === 2 && isPage1Valid) ||
                (s.id === 3 && isPage1Valid && isPage2Valid) ||
                (s.id === 4 && isPage1Valid && isPage2Valid && isPage3Valid && trainingResults);

              let nodeStyle = 'bg-slate-100 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-800';
              if (isActive) {
                nodeStyle = 'bg-indigo-500 text-white border border-indigo-650 shadow-xs';
              } else if (isCompleted) {
                nodeStyle = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
              } else if (isSelectable) {
                nodeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-indigo-500 hover:text-white border border-slate-200 dark:border-slate-700 cursor-pointer';
              }

              return (
                <div key={s.id} className="flex items-center">
                  {idx > 0 && (
                    <div className={`w-1.5 sm:w-3.5 h-0.5 rounded mr-1.5 ${isCompleted ? 'bg-emerald-500' : isActive ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-800'}`} />
                  )}
                  <button
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => setPage(s.id)}
                    className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all duration-150 flex items-center space-x-1 text-[9px] md:text-[10px] ${nodeStyle}`}
                  >
                    <span className="font-mono text-[8px] sm:text-[9px] opacity-75">{s.id}</span>
                    <span className="hidden sm:inline font-sans">{s.label}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleNextPage}
            disabled={page === 4 || (page === 1 && !isPage1Valid) || (page === 2 && !isPage2Valid) || (page === 3 && !isPage3Valid)}
            className={`flex items-center space-x-1.5 pl-2.5 border-l border-slate-200 dark:border-slate-700 transition cursor-pointer ${(page === 4 || (page === 1 && !isPage1Valid) || (page === 2 && !isPage2Valid) || (page === 3 && !isPage3Valid)) ? 'opacity-35 cursor-not-allowed' : 'hover:text-indigo-500 text-slate-600 dark:text-slate-300'}`}
          >
            <span className="hidden md:inline">{page === 3 ? 'Train' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center space-x-3">
          {/* ML Inventory (Only on Page 1) */}
          {page === 1 && (
            <button
              onClick={() => setIsModelInventoryOpen(true)}
              className="text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650 rounded-lg transition"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>ML Inventory</span>
            </button>
          )}

          {/* Data Overview (Available on all pages) */}
          <button
            onClick={() => setIsDataOverviewOpen(true)}
            className="text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg transition"
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
            className="text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650 rounded-lg transition"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Training History</span>
          </button>


          {/* Light/Dark Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN PAGE CONTENT CONTAINERS
         ========================================== */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-6xl mx-auto w-full space-y-8 animate-fade-in">

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
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
                  <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-5 py-3 rounded-xl shadow-sm gap-4">
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

              {/* SECTION B — WHAT DO YOU WANT TO DO? (Advanced Mode Only) */}
              {false && advancedMode && dataset && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-indigo-500" />
                      <span>What do you want to do with your data?</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Choose the machine learning paradigm that fits your analytics objective.
                    </p>
                  </div>

                  <div className="flex flex-row gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {/* Paradigm Cards */}
                    <button
                      onClick={() => handleParadigmChange('classification')}
                      className={`text-left p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-800/10 transition hover:shadow-sm flex-1 min-w-[245px] md:min-w-0 flex flex-col justify-between min-h-[140px] ${goal === 'classification' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 uppercase tracking-wider">Supervised</span>
                        {goal === 'classification' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <div className="mt-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Classification</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          "Predict discrete categories and class probabilities (e.g. customer churn, spam detection)."
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleParadigmChange('regression')}
                      className={`text-left p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-800/10 transition hover:shadow-sm flex-1 min-w-[245px] md:min-w-0 flex flex-col justify-between min-h-[140px] ${goal === 'regression' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 uppercase tracking-wider">Supervised</span>
                        {goal === 'regression' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <div className="mt-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Regression</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          "Estimate continuous numerical outputs and trends (e.g. house values, lifetime spending)."
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleParadigmChange('clustering')}
                      className={`text-left p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-800/10 transition hover:shadow-sm flex-1 min-w-[245px] md:min-w-0 flex flex-col justify-between min-h-[140px] ${goal === 'clustering' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-wider">Unsupervised</span>
                        {goal === 'clustering' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <div className="mt-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Clustering</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          "Group records into high-similarity sub-populations without target labels (e.g. user segmentation)."
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleParadigmChange('forecasting')}
                      className={`text-left p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-800/10 transition hover:shadow-sm flex-1 min-w-[245px] md:min-w-0 flex flex-col justify-between min-h-[140px] ${goal === 'forecasting' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase tracking-wider">Unsupervised</span>
                        {goal === 'forecasting' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <div className="mt-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Time Series Forecasting</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          "Project future trends from chronological lag features and historic patterns (e.g. inventory levels)."
                        </p>
                      </div>
                    </button>
                  </div>
                </section>
              )}

              {/* Simple Mode: streamlined "What do you want to predict?" */}
              {dataset && (
                <section className="bg-gradient-to-br from-slate-50/60 to-indigo-50/30 dark:from-slate-800/30 dark:to-indigo-900/10 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      <span>What column are you trying to predict?</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Select a column you want to predict — the system will automatically recommend the best approach.
                    </p>
                  </div>

                  {recommendedTargets.length > 0 && (
                    <div className="space-y-2">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Recommended Candidate Targets
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {recommendedTargets.map(rec => {
                          const isSelected = targetColumn === rec.column;
                          return (
                            <button
                              key={rec.column}
                              type="button"
                              onClick={() => handleTargetChange(rec.column)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 shadow-sm ${isSelected
                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500'
                                : 'bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                                }`}
                            >
                              <span>{rec.column}</span>
                              <span className="text-[10px] opacity-60">
                                score: {rec.score}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Auto-detection summary card */}
                  {targetColumn && goal && (
                    <div className="bg-white dark:bg-slate-900 border border-indigo-500/15 dark:border-indigo-500/20 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in">
                      {/* Detected goal badge */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase block tracking-wider">Auto-Detected</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm capitalize">{goal}{goal === 'classification' ? ` (${problemSubtype})` : ''}</span>
                          </div>
                        </div>

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px]">
                            ★
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-indigo-500 uppercase block tracking-wider">Recommended Model</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {MODEL_REGISTRY[goal]?.find(m => m.id === selectedModelOverride)?.name || 'Auto'}
                            </span>
                          </div>
                        </div>

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Features</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {Object.values(featureStatuses).filter(s => s.recommend).length} columns auto-selected
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Explanation text */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                        {goal === 'classification' && `The selected column has ${dataset.columnsInfo.find(c => c.name === targetColumn)?.uniqueCount || '?'} unique values — we'll train classification models to predict categorical outcomes.`}
                        {goal === 'regression' && `The selected column is a continuous numeric column — we'll train regression models to estimate its value.`}
                        {goal === 'forecasting' && `The selected column is numeric and your dataset has a datetime column (${dateColumn}) — we'll use time series forecasting.`}
                        {' '}All suitable models will be trained and the best performer will be auto-selected.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* SECTION C — TARGET & FEATURE SETUP (Advanced Mode) */}
              {false && advancedMode && dataset && goal && (
                <section className="bg-slate-50/40 dark:bg-slate-800/25 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      <span>Target & Feature Setup</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Configure modeling targets and variables based on columns detected in the dataset.
                    </p>
                  </div>

                  {recommendedTargets.length > 0 && (
                    <div className="space-y-2 pb-2">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Recommended Candidate Targets
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {recommendedTargets.map(rec => {
                          const isSelected = targetColumn === rec.column;
                          return (
                            <button
                              key={rec.column}
                              type="button"
                              disabled={targetConfirmed}
                              onClick={() => handleTargetChange(rec.column, rec.approach)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 shadow-sm ${isSelected
                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500'
                                : 'bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              <span>{rec.column}</span>
                              <span className="text-[10px] opacity-60">
                                score: {rec.score}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    {/* Target column selection display */}
                    {goal !== 'clustering' ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Selected Target</label>
                        <div className="flex space-x-2">
                          <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-150 shadow-sm flex items-center min-h-[38px] select-none">
                            {targetColumn ? targetColumn : <span className="text-slate-400 dark:text-slate-600 font-medium">None Selected</span>}
                          </div>

                          {!targetConfirmed ? (
                            <button
                              type="button"
                              disabled={!targetColumn}
                              onClick={() => {
                                setTargetConfirmed(true);
                                let recModelId = '';
                                if (goal === 'classification') recModelId = 'rf_class';
                                else if (goal === 'regression') recModelId = dataset.rows >= 500 ? 'lgbm_reg' : 'rf_reg';
                                else if (goal === 'forecasting') recModelId = 'prophet_time';
                                setSelectedModelOverride(recModelId);
                                setUserOverrodeModel(false);
                                if (!advancedMode) {
                                  setSelectedModels(recommendedModelsList.map(m => m.id));
                                } else {
                                  setSelectedModels([recModelId]);
                                }
                              }}
                              className={`text-xs px-4 py-2 font-bold border rounded-lg transition ${targetColumn ? 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed shadow-none'}`}
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetConfirmed(false);
                                setSelectedModelOverride('');
                                setUserOverrodeModel(false);
                              }}
                              className="text-xs px-4 py-2 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-300 rounded-lg transition shadow-sm"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Selected Target</label>
                        <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-450 dark:text-slate-550 select-none min-h-[38px] flex items-center font-medium">
                          N/A - Clustering Mode
                        </div>
                      </div>
                    )}

                    {/* Problem subtype (Classification only) */}
                    {goal === 'classification' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Problem Subtype</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setProblemSubtype('binary')}
                            disabled={targetConfirmed}
                            className={`flex-1 text-xs py-2 font-semibold border rounded-lg transition ${problemSubtype === 'binary' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'} disabled:opacity-60`}
                          >
                            Binary Classification
                          </button>
                          <button
                            onClick={() => setProblemSubtype('multiclass')}
                            disabled={targetConfirmed}
                            className={`flex-1 text-xs py-2 font-semibold border rounded-lg transition ${problemSubtype === 'multiclass' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'} disabled:opacity-60`}
                          >
                            Multiclass
                          </button>
                        </div>
                      </div>
                    )}

                  </div>


                </section>
              )}

              {/* SECTION D — MODEL SELECTION (Advanced Mode Only) */}
              {advancedMode && dataset && goal && (goal === 'clustering' || targetColumn) && targetConfirmed && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-indigo-500" />
                      <span>Model Selection</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Select one or more algorithms to train. Recommended models are highlighted. Multi-selection compares results side-by-side.
                    </p>
                  </div>

                  {Object.entries(MODEL_REGISTRY).sort(([a], [b]) => {
                    const aRec = a === goal || (goal === 'forecasting' && a === 'regression');
                    const bRec = b === goal || (goal === 'forecasting' && b === 'regression');
                    if (aRec && !bRec) return -1;
                    if (!aRec && bRec) return 1;
                    if (a === goal) return -1; // forecasting before regression within recommended
                    if (b === goal) return 1;
                    return 0;
                  }).map(([category, models]) => {
                    const isRecommendedCategory = category === goal || (goal === 'forecasting' && category === 'regression');
                    const categoryLabel = { classification: 'Classification', regression: 'Regression', clustering: 'Clustering', forecasting: 'Forecasting' }[category] || category;
                    const recommendedLabel = category === goal ? ' — Recommended' : (goal === 'forecasting' && category === 'regression') ? ' — Also Applicable' : '';
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${isRecommendedCategory ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {categoryLabel}{recommendedLabel}
                          </span>
                          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {models.map((model) => {
                            const isSelected = selectedModels.includes(model.id);
                            const isRecommended = isRecommendedCategory;
                            return (
                              <div
                                key={model.id}
                                onClick={() => toggleModelSelection(model.id)}
                                className={`relative border rounded-xl p-2 cursor-pointer hover:shadow-sm transition flex flex-col justify-between h-28 ${isSelected
                                  ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                                  : isRecommended
                                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-900/10 hover:border-indigo-400'
                                    : 'border-slate-150 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-800/10 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInventoryModel(model);
                                    setIsModelInventoryOpen(true);
                                  }}
                                  className="absolute top-2 right-2 p-0.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition z-10"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>

                                <div className="space-y-0.5 pr-6">
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-1">
                                    {isSelected ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{model.name}</span>
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">{model.desc}</p>
                                </div>

                                <div className="flex flex-wrap gap-1 mt-1 overflow-hidden h-5">
                                  {model.pros.slice(0, 1).map((tag, idx) => (
                                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[130px]">
                                      + {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Proceed bottom bar */}
              {dataset && goal && (goal === 'clustering' || targetConfirmed) && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNextPage}
                    disabled={!isPage1Valid}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-sm transition shadow-md ${isPage1Valid ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'}`}
                  >
                    <span>{advancedMode ? 'Proceed to Feature Engineering' : 'Train & Predict'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ==========================================
              PAGE 2: FEATURE ENGINEERING & TRAINING SETUP
             ========================================== */}
          {page === 2 && (
            <div className="space-y-8">

              {/* TWO COLUMN GRID FOR FEATURES & CONFIG */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN — FEATURE COLUMNS (8 cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                        <FolderOpen className="w-5 h-5 text-indigo-500" />
                        <span>Feature Columns</span>
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                        Select feature columns for training. Best features are checked by default.
                      </p>
                    </div>
                    <button
                      onClick={handleResetSelections}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-600 px-3 py-1.5 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg transition"
                    >
                      Reset to recommended
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Column</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Nulls</th>
                          {goal !== 'clustering' && <th className="py-2 px-3 text-right">Target Correlation</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                        {Object.entries(categorizedColumns).map(([catName, catCols]) => {
                          if (catCols.length === 0) return null;
                          return (
                            <React.Fragment key={catName}>
                              <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-200 font-bold border-t border-b border-slate-150/60 dark:border-slate-800/60 select-none">
                                <td colSpan={goal === 'clustering' ? 3 : 4} className="py-2 px-3 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold bg-slate-50/10 dark:bg-slate-900/5">
                                  {catName} ({catCols.length})
                                </td>
                              </tr>
                              {catCols.map((col) => {
                                const isTarget = col.name === targetColumn;
                                const isDate = col.name === dateColumn;
                                const isSelected = featureSelections[col.name];
                                const status = featureStatuses[col.name] || { corr: 0, warning: '' };
                                const correlation = status.corr;
                                const warning = status.warning;

                                // Pearson visual bar configuration
                                const absCorr = Math.min(1.0, Math.abs(correlation));
                                const isNegative = correlation < 0;
                                const barColor = isNegative ? 'bg-rose-400' : 'bg-indigo-500';

                                return (
                                  <tr
                                    key={col.name}
                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-b border-slate-100/50 dark:border-slate-800/20 ${isTarget ? 'bg-amber-500/5 dark:bg-amber-500/10' : isSelected ? 'text-slate-800 dark:text-slate-100' : 'opacity-60 text-slate-400'}`}
                                  >
                                    {/* Selection & Name */}
                                    <td className="py-1 px-3">
                                      <div className="flex items-center space-x-2.5">
                                        <input
                                          type="checkbox"
                                          checked={isSelected || false}
                                          disabled={isTarget || isDate}
                                          onChange={(e) => {
                                            setFeatureSelections({
                                              ...featureSelections,
                                              [col.name]: e.target.checked
                                            });
                                          }}
                                          className="rounded border-slate-200 dark:border-slate-700 text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                          <div className="flex items-center space-x-1.5">
                                            <span className="font-semibold">{col.name}</span>
                                            {isTarget && (
                                              <span className="text-[8px] font-bold px-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">Target</span>
                                            )}
                                            {isDate && (
                                              <span className="text-[8px] font-bold px-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">Time arrow</span>
                                            )}
                                            {warning && (
                                              <span className="text-[8px] font-bold px-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider flex items-center space-x-0.5">
                                                <span>⚠</span> <span>{warning}</span>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Type */}
                                    <td className="py-1 px-3 capitalize text-slate-400 font-mono text-[10px]">
                                      {col.type}
                                    </td>

                                    {/* Nulls */}
                                    <td className="py-1 px-3 text-slate-400 text-[10px]">
                                      {col.missing > 0 ? (
                                        <span className="text-amber-500 font-semibold">{col.missing} ({col.nullPercent}%)</span>
                                      ) : (
                                        <span>0 (0%)</span>
                                      )}
                                    </td>

                                    {/* Target Correlation */}
                                    {goal !== 'clustering' && (
                                      <td className="py-1 px-3">
                                        {!isTarget ? (
                                          <div className="flex items-center space-x-2 justify-end w-40 ml-auto group relative select-none">
                                            <span className={`text-[10px] font-semibold font-mono w-10 text-right ${isNegative ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                              {correlation.toFixed(2)}
                                            </span>
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex justify-end">
                                              <div
                                                className={`h-full ${barColor}`}
                                                style={{ width: `${Math.round(absCorr * 100)}%` }}
                                              />
                                            </div>
                                            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] font-medium px-2 py-1 rounded shadow-md z-10 w-44 pointer-events-none text-center">
                                              Pearson linear coefficient. Negative correlations are shown in red.
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 block text-right pr-4 font-mono">-</span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                    <span>{selectedFeaturesList.length} of {dataset.columns - (goal === 'clustering' ? 0 : 1)} features selected</span>
                  </div>
                </div>

                {/* RIGHT COLUMN — FEATURE ENGINEERING OPTIONS (5 cols) */}
                <div className="lg:col-span-5 space-y-4">

                  {/* Collapsible strategies */}

                  {/* 1. AGGREGATION */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setCollapsedPanels({ ...collapsedPanels, aggregation: !collapsedPanels.aggregation })}
                      className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span>1. Aggregation Settings</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsedPanels.aggregation ? '' : 'rotate-180'}`} />
                    </button>

                    {!collapsedPanels.aggregation && (
                      <div className="p-4 space-y-4 animate-slide-up text-xs">
                        {/* Apply Aggregation Toggle */}
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-600 dark:text-slate-350">Apply Aggregation Pipeline</label>
                          <input
                            type="checkbox"
                            checked={applyAggregation}
                            onChange={(e) => setApplyAggregation(e.target.checked)}
                            className="rounded border-slate-200 text-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </div>

                        {/* Multi-select GroupBy Chips — always visible */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-500">Group By Columns</label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {groupByColumns.map(col => (
                              <span key={col} className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border border-indigo-200 dark:border-indigo-900/50 rounded-full flex items-center space-x-1">
                                <span>{col}</span>
                                <button
                                  type="button"
                                  onClick={() => removeGroupByColumn(col)}
                                  className="hover:text-indigo-700 text-slate-400 font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            {groupByColumns.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">No columns selected for grouping</span>
                            )}
                          </div>

                          {/* Searchable Dropdown Selector */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search columns to group by..."
                              value={groupBySearch}
                              onChange={(e) => setGroupBySearch(e.target.value)}
                              onFocus={() => setIsGroupByDropdownOpen(true)}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                            {isGroupByDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setIsGroupByDropdownOpen(false)}
                                />
                                <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-20 divide-y divide-slate-100 dark:divide-slate-800">
                                  {dataset?.columnsInfo
                                    .map(col => col.name)
                                    .filter(name => !groupByColumns.includes(name) && name.toLowerCase().includes(groupBySearch.toLowerCase()))
                                    .map(colName => (
                                      <button
                                        key={colName}
                                        type="button"
                                        onClick={() => {
                                          setGroupByColumns([...groupByColumns, colName]);
                                          setGroupBySearch('');
                                          setIsGroupByDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-250 transition"
                                      >
                                        {colName}
                                      </button>
                                    ))
                                  }
                                  {dataset?.columnsInfo
                                    .map(col => col.name)
                                    .filter(name => !groupByColumns.includes(name) && name.toLowerCase().includes(groupBySearch.toLowerCase()))
                                    .length === 0 && (
                                      <div className="p-3 text-[10px] text-slate-400 italic text-center">
                                        No matching columns available
                                      </div>
                                    )
                                  }
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Aggregation Mappings Table — always visible */}
                        {selectedFeaturesList.filter(colName => !groupByColumns.includes(colName) && colName !== targetColumn).length > 0 && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-500">Feature Aggregation Mappings</label>
                            <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                              <table className="w-full text-[10px] text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 uppercase tracking-wider text-[8px]">
                                  <tr>
                                    <th className="py-1.5 px-2.5">Feature</th>
                                    <th className="py-1.5 px-2.5">Method</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                                  {selectedFeaturesList.filter(colName => !groupByColumns.includes(colName) && colName !== targetColumn).map(colName => {
                                    const colMeta = dataset.columnsInfo.find(c => c.name === colName);
                                    const colType = colMeta ? colMeta.type : 'numeric';
                                    const method = customAggMappings[colName] || inferAggFunction(colName, colType, dataset);
                                    return (
                                      <tr key={colName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="py-1.5 px-2.5 font-semibold truncate max-w-[120px]">{colName}</td>
                                        <td className="py-1 px-2">
                                          <select
                                            value={method}
                                            onChange={(e) => setCustomAggMappings({
                                              ...customAggMappings,
                                              [colName]: e.target.value
                                            })}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[10px]"
                                          >
                                            {colType === 'numeric' ? (
                                              <>
                                                <option value="mean">Mean</option>
                                                <option value="sum">Sum</option>
                                                <option value="min">Min</option>
                                                <option value="max">Max</option>
                                                <option value="mode">Mode</option>
                                              </>
                                            ) : (
                                              <>
                                                <option value="mode">Mode</option>
                                                <option value="count">Count</option>
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
                        )}

                        {/* Live Pandas code snippet — only when pipeline is on */}
                        {applyAggregation && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-slate-500">Pandas Execution Snippet</label>
                              <pre className="font-mono bg-slate-900 text-slate-100 p-2.5 rounded-lg border border-slate-800 text-[10px] overflow-x-auto select-all leading-tight">
                                {pandasPreviewCode}
                              </pre>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-2 font-medium">
                              Estimated output rows: <span className="font-bold text-slate-800 dark:text-slate-200">{estimatedOutputRows} rows</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* TIME FEATURE ENCODING */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setCollapsedPanels({ ...collapsedPanels, timeEncoding: !collapsedPanels.timeEncoding })}
                      className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-4 h-4 text-indigo-500" />
                        <span>2. Time Feature Encoding</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsedPanels.timeEncoding ? '' : 'rotate-180'}`} />
                    </button>

                    {!collapsedPanels.timeEncoding && (
                      detectedTimeComponents.length > 0 ? (
                        <div className="p-4 space-y-4 animate-slide-up text-xs">
                          {/* AUTOMATIC TEMPORAL PIPELINE SUMMARY CARD */}
                          <div className="p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 rounded-xl space-y-3 shadow-[0_2px_10px_rgba(99,102,241,0.03)]">
                            <div className="flex items-center space-x-2.5">
                              <Brain className="w-4 h-4 text-indigo-500 animate-pulse-slow" />
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                Smart Temporal Feature Pipeline Engaged
                              </h4>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                              The system detected separate calendar columns (e.g., Year, Month). To preserve time continuity and prevent model bias, the backend automatically performs the following:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10.5px]">
                              <div className="flex items-start space-x-2 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <Check className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Chronological Sort</span>
                                  <span className="text-slate-400 dark:text-slate-500">Orders dataset by time components to honor chronological splits.</span>
                                </div>
                              </div>
                              <div className="flex items-start space-x-2 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <Check className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Elapsed Time Index (`elapsed_time`)</span>
                                  <span className="text-slate-400 dark:text-slate-500">Generates continuous periods from minimum time reference.</span>
                                </div>
                              </div>
                              <div className="flex items-start space-x-2 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <Check className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Cyclical sin/cos Encodes</span>
                                  <span className="text-slate-400 dark:text-slate-500">Transforms month/weekday to sin/cos to preserve circular continuity (Dec/Jan adjacency).</span>
                                </div>
                              </div>
                              <div className="flex items-start space-x-2 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <Check className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Target Lags & Rolling Mean</span>
                                  <span className="text-slate-400 dark:text-slate-500">Computes shifted lag 1, YoY lag, and rolling statistics dynamically with no leakage.</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-indigo-500/80 font-medium pt-1">
                              <Info className="w-3.5 h-3.5" />
                              <span>Model-based evaluation automatically decides whether to use the combined or raw time features.</span>
                            </div>
                          </div>

                          <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 text-[9px] uppercase tracking-wider">
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                  <th className="py-2 px-3">Component</th>
                                  <th className="py-2 px-3">Detected from</th>
                                  <th className="py-2 px-3">Encoding Method</th>
                                  <th className="py-2 px-3">Toggle</th>
                                  <th className="py-2 px-3">Preview</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-[11px]">
                                {detectedTimeComponents.map((comp) => {
                                  const periodMap = {
                                    'month': 12,
                                    'day-of-week': 7,
                                    'hour': 24,
                                    'quarter': 4,
                                    'day of month': 31,
                                    'week': 52
                                  };
                                  const period = periodMap[comp.componentType];
                                  const isYear = comp.componentType === 'year';

                                  const isEnabled = !!timeComponentToggles[comp.id];
                                  const currentMethod = timeComponentEncodings[comp.id] || (isYear ? 'minmax' : 'sincos');

                                  let methodRender = '';
                                  if (isYear) {
                                    methodRender = (
                                      <select
                                        value={currentMethod}
                                        onChange={(e) => setTimeComponentEncodings({
                                          ...timeComponentEncodings,
                                          [comp.id]: e.target.value
                                        })}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[10px]"
                                      >
                                        <option value="minmax">Min-Max</option>
                                        <option value="zscore">Z-Score</option>
                                      </select>
                                    );
                                  } else {
                                    methodRender = <span>Sin/Cos (2π × val / {period})</span>;
                                  }

                                  let previewFormula = '';
                                  if (isEnabled) {
                                    if (isYear) {
                                      if (currentMethod === 'minmax') {
                                        previewFormula = `${comp.colName}_norm = (${comp.colName} − ${comp.colName}.min()) / (${comp.colName}.max() − ${comp.colName}.min())`;
                                      } else {
                                        previewFormula = `${comp.colName}_norm = (${comp.colName} − ${comp.colName}.mean()) / ${comp.colName}.std()`;
                                      }
                                    } else {
                                      previewFormula = `${comp.colName}_sin = sin(2π × ${comp.colName} / ${period})\n${comp.colName}_cos = cos(2π × ${comp.colName} / ${period})`;
                                    }
                                  } else {
                                    previewFormula = 'Disabled';
                                  }

                                  return (
                                    <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25">
                                      <td className="py-2 px-3 font-semibold capitalize">{comp.label}</td>
                                      <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{comp.colName}</td>
                                      <td className="py-2 px-3">{methodRender}</td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={(e) => setTimeComponentToggles({
                                            ...timeComponentToggles,
                                            [comp.id]: e.target.checked
                                          })}
                                          className="rounded border-slate-200 text-indigo-500 w-4 h-4 cursor-pointer"
                                        />
                                      </td>
                                      <td className="py-2 px-3 font-mono text-[9px] text-slate-500 dark:text-slate-400 whitespace-pre-line leading-normal">
                                        {previewFormula}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-slate-400 dark:text-slate-500 italic text-xs bg-slate-50/20 dark:bg-slate-900/10">
                          No date or time columns detected in the dataset.
                        </div>
                      )
                    )}
                  </div>

                  {/* 2. ENCODING */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setCollapsedPanels({ ...collapsedPanels, encoding: !collapsedPanels.encoding })}
                      className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                        <span>3. Categorical Encoding</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsedPanels.encoding ? '' : 'rotate-180'}`} />
                    </button>

                    {!collapsedPanels.encoding && (
                      <div className="p-4 space-y-3 animate-slide-up">
                        <label className="text-xs font-semibold text-slate-500 block">One-Hot Encoding Target columns</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {categoricalOptions.map(opt => {
                            const isEnc = oneHotColumns.includes(opt);
                            const colMeta = dataset.columnsInfo.find(c => c.name === opt);
                            const isHighCardinality = colMeta && colMeta.uniqueCount > 20;
                            return (
                              <div key={opt} className="flex flex-col space-y-1 p-2 border border-slate-100 dark:border-slate-800/60 rounded-lg">
                                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isEnc}
                                    onChange={(e) => {
                                      if (e.target.checked) setOneHotColumns([...oneHotColumns, opt]);
                                      else setOneHotColumns(oneHotColumns.filter(c => c !== opt));
                                    }}
                                    className="rounded border-slate-200 text-indigo-500 w-3.5 h-3.5"
                                  />
                                  <span>{opt}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">({colMeta?.uniqueCount} labels)</span>
                                </label>
                                {isEnc && isHighCardinality && (
                                  <div className="flex items-center space-x-1 text-[10px] text-amber-500 font-medium pl-5">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                    <span>High cardinality! Will generate sparse columns.</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. NORMALISATION & SCALING */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setCollapsedPanels({ ...collapsedPanels, normalization: !collapsedPanels.normalization })}
                      className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-4 h-4 text-indigo-500" />
                        <span>4. Normalisation & Scaling</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsedPanels.normalization ? '' : 'rotate-180'}`} />
                    </button>

                    {!collapsedPanels.normalization && (
                      <div className="p-4 space-y-3 max-h-60 overflow-y-auto animate-slide-up">
                        {selectedFeaturesList.map(opt => {
                          const val = normalizationStrategies[opt] || 'none';
                          return (
                            <div key={opt} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-850">
                              <span className="font-semibold truncate max-w-[120px]">{opt}</span>
                              <div className="flex rounded-md bg-slate-50 dark:bg-slate-800/60 p-0.5 border border-slate-100 dark:border-slate-800">
                                {['none', 'minmax', 'zscore'].map((st) => (
                                  <button
                                    key={st}
                                    onClick={() => setNormalizationStrategies({ ...normalizationStrategies, [opt]: st })}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${val === st ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                  >
                                    {st === 'none' ? 'None' : st === 'minmax' ? 'Min-Max' : 'Z-Score'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. MISSING VALUE MANAGEMENT */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setCollapsedPanels({ ...collapsedPanels, missing: !collapsedPanels.missing })}
                      className="w-full flex items-center justify-between p-4 font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-indigo-500" />
                        <span>5. Missing Value Management</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsedPanels.missing ? '' : 'rotate-180'}`} />
                    </button>

                    {!collapsedPanels.missing && (
                      <div className="p-4 space-y-4 animate-slide-up">
                        <div className="text-xs font-semibold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          {totalMissingCount} columns contain missing values in the dataset.
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {missingValueColumns.map(col => {
                            const strat = missingStrategies[col.name] || 'mean';
                            return (
                              <div key={col.name} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold">{col.name} ({col.missing} nulls)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={strat}
                                    onChange={(e) => setMissingStrategies({ ...missingStrategies, [col.name]: e.target.value })}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                  >
                                    <option value="drop">Drop Row</option>
                                    <option value="mean">Mean Value</option>
                                    <option value="median">Median Value</option>
                                    <option value="mode">Mode Label</option>
                                    <option value="ffill">Forward Fill</option>
                                    <option value="constant">Constant</option>
                                  </select>

                                  {strat === 'constant' && (
                                    <input
                                      type="text"
                                      placeholder="Value..."
                                      value={missingConstants[col.name] || ''}
                                      onChange={(e) => setMissingConstants({ ...missingConstants, [col.name]: e.target.value })}
                                      className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* TRAINING SETTINGS SECTION (full width) */}
              <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    <span>Training Settings</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Control data splits, valuation metrics, and optimize specific hyperparameters per selected model.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
                  {/* Split Ratio Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">TRAIN / TEST SPLIT RATIO</span>
                      <span className="font-mono text-indigo-500">{splitRatio}% Train / {100 - splitRatio}% Test</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="90"
                      step="5"
                      value={splitRatio}
                      onChange={(e) => setSplitRatio(Number(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400 flex justify-between font-medium">
                      <span>Train: {Math.round(((applyAggregation && groupByColumns.length > 0) ? estimatedOutputRows : dataset.rows) * (splitRatio / 100))} rows</span>
                      <span>Test: {Math.round(((applyAggregation && groupByColumns.length > 0) ? estimatedOutputRows : dataset.rows) * (1 - splitRatio / 100))} rows</span>
                    </div>
                  </div>

                  {/* Train / Test Split Method (Block 1) */}
                  <div className="space-y-4">
                    <span className="block text-xs font-semibold text-slate-500">TRAIN / TEST SPLIT METHOD</span>
                    <div className="flex space-x-6">
                      {['random', 'chronological'].map((m) => (
                        <label key={m} className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="splitMethod"
                            checked={splitMethod === m}
                            onChange={() => setSplitMethod(m)}
                            className="text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="capitalize">{m}</span>
                        </label>
                      ))}
                    </div>

                    {splitMethod === 'chronological' && (
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-semibold text-slate-505">Order By Column</label>
                          <select
                            value={dateColumn}
                            onChange={(e) => setDateColumn(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                          >
                            <option value="">-- Choose column --</option>
                            {chronologicalOrderOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Rows are sorted by this column before splitting. Earlier data trains, later data tests. Recommended for time series.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Block 2 — Cross-Validation (separate card, visually distinct) */}
                <div className="border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/20 dark:bg-slate-900/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Cross-Validation</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Evaluate models over multiple data partitions for robust metrics.</p>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setCvEnabled(!cvEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${cvEnabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-850'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-205 ease-in-out ${cvEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  {cvEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs animate-slide-up">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="font-semibold text-slate-500">Number of folds</label>
                        <input
                          type="number"
                          min="2"
                          max="20"
                          value={cvFolds}
                          onChange={(e) => setCvFolds(Math.max(2, Math.min(20, Number(e.target.value))))}
                          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-0.5 w-16 text-center font-bold focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="font-semibold text-slate-500">CV Strategy</label>
                        <select
                          value={cvStrategy}
                          onChange={(e) => setCvStrategy(e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-1 w-40 text-xs font-semibold focus:outline-none"
                        >
                          <option value="kfold">K-Fold</option>
                          <option value="stratified">Stratified K-Fold</option>
                          {goal === 'forecasting' && (
                            <option value="timeseries">Time Series Split</option>
                          )}
                        </select>
                      </div>
                      <div className="md:col-span-2 text-[10px] text-slate-400 leading-normal">
                        Cross-validation runs independently from the train/test split above and reports mean ± std of each metric.
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Model Hyperparameters */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Model-Specific Hyperparameters</span>

                  {selectedModels.map(modelId => {
                    const modelMeta = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
                    if (!modelMeta) return null;
                    const params = hyperparameters[modelId] || {};

                    return (
                      <div key={modelId} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="w-full flex items-center justify-between p-3.5 bg-slate-50/40 dark:bg-slate-800/30 text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center space-x-2">
                            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{modelMeta.name} Tuning Options</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => resetHyperparameters(modelId)}
                            className="text-[10px] text-indigo-500 hover:underline font-semibold"
                          >
                            Reset to defaults
                          </button>
                        </div>

                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 text-xs">
                          {/* Learning Rate (Optional) */}
                          {params.learning_rate !== undefined && (
                            <div className="space-y-1.5 relative group">
                              <div className="flex items-center space-x-1">
                                <label className="font-semibold text-slate-500">Learning Rate</label>
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                value={params.learning_rate}
                                onChange={(e) => setHyperparameters({
                                  ...hyperparameters,
                                  [modelId]: { ...params, learning_rate: parseFloat(e.target.value) }
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-1"
                              />
                              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-md w-48 z-10">
                                Controls step size during updates. Lower rates avoid overshoot but train slower.
                              </div>
                            </div>
                          )}

                          {/* Estimators / Epochs */}
                          {params.n_estimators !== undefined && (
                            <div className="space-y-1.5 relative group">
                              <div className="flex items-center space-x-1">
                                <label className="font-semibold text-slate-500">Estimators Count</label>
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="number"
                                value={params.n_estimators}
                                onChange={(e) => setHyperparameters({
                                  ...hyperparameters,
                                  [modelId]: { ...params, n_estimators: parseInt(e.target.value) }
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-1"
                              />
                              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-md w-48 z-10">
                                Number of distinct decision trees to build. Higher is more robust but slower.
                              </div>
                            </div>
                          )}

                          {/* Epochs for deep models */}
                          {params.epochs !== undefined && (
                            <div className="space-y-1.5 relative group">
                              <div className="flex items-center space-x-1">
                                <label className="font-semibold text-slate-500">Epochs Iterations</label>
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="number"
                                value={params.epochs}
                                onChange={(e) => setHyperparameters({
                                  ...hyperparameters,
                                  [modelId]: { ...params, epochs: parseInt(e.target.value) }
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-1"
                              />
                              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-md w-48 z-10">
                                Total full passes over the dataset during Neural Network training.
                              </div>
                            </div>
                          )}

                          {/* Max Depth */}
                          {params.max_depth !== undefined && (
                            <div className="space-y-1.5 relative group">
                              <div className="flex items-center space-x-1">
                                <label className="font-semibold text-slate-500">Max Tree Depth</label>
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="number"
                                value={params.max_depth}
                                onChange={(e) => setHyperparameters({
                                  ...hyperparameters,
                                  [modelId]: { ...params, max_depth: parseInt(e.target.value) }
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-1"
                              />
                              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-md w-48 z-10">
                                Maximum levels deep a tree can split. Higher levels capture complexity but overfit.
                              </div>
                            </div>
                          )}

                          {/* Random Seed */}
                          <div className="space-y-1.5 relative group">
                            <div className="flex items-center space-x-1">
                              <label className="font-semibold text-slate-500">Random Seed</label>
                              <HelpCircle className="w-3 h-3 text-slate-400" />
                            </div>
                            <input
                              type="number"
                              defaultValue="42"
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-1"
                            />
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-md w-48 z-10">
                              Locks the pseudo-random split sequence for 100% exact result reproduction.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hyperparameter Tuning Section (Optuna) inside the same container */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <span>Hyperparameter Auto-Tuning</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">Optuna</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Auto-tune model hyperparameters via Bayesian optimisation. Uses cross-validation inside each trial to find the best settings without data leakage.
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    {/* Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Auto-tune with Optuna</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Automatically search for optimal hyperparameters before final fitting.</p>
                      </div>
                      <button
                        onClick={() => setUseOptuna(!useOptuna)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center ${useOptuna ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                        style={{ minWidth: 40, height: 22 }}
                      >
                        <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${useOptuna ? 'translate-x-5' : 'translate-x-1'}`} style={{ top: 3 }} />
                      </button>
                    </div>

                    {/* Trials Slider */}
                    {useOptuna && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-500">NUMBER OF TRIALS</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400">{optunaTrials} trials</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={optunaTrials}
                          onChange={e => setOptunaTrials(parseInt(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>5 (fast)</span>
                          <span className="text-center">25 (recommended)</span>
                          <span>100 (thorough)</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          More trials = better hyperparameters, but longer training time. ~25 trials adds ~30–60s for most datasets.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* FEATURE SELECTION & ENGINEERING PIPELINE SECTION */}
              <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <span>Feature Selection Pipeline</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Automated</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Multi-stage preprocessing: Feature Generation → Variance Threshold → Correlation Filter → Mutual Information → LightGBM (first-pass) → SHAP.
                  </p>
                </div>
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Feature Selection & Engineering Pipeline</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Filter collinearity, remove low-variance, select top features, and generate SHAP importance.</p>
                    </div>
                    <button
                      onClick={() => setUseFeaturePipeline(!useFeaturePipeline)}
                      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center ${useFeaturePipeline ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      style={{ minWidth: 40, height: 22 }}
                    >
                      <span className={`absolute w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${useFeaturePipeline ? 'translate-x-5' : 'translate-x-1'}`} style={{ top: 3 }} />
                    </button>
                  </div>
                </div>
              </section>

              {/* SUMMARY CARD & LARGE START ACTION */}
              <div className="bg-slate-50/40 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Training Pipeline Ready</span>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1">
                    <span>Task: <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{goal}</span></span>
                    <span>Target: <span className="font-semibold text-slate-800 dark:text-slate-200">{targetColumn === 'none' ? 'None' : targetColumn}</span></span>
                    <span>Models: <span className="font-semibold text-indigo-500">{selectedModels.length} active</span></span>
                    <span>Features: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedFeaturesList.length} inputs</span></span>
                  </div>
                </div>

                <div className="relative group">
                  <button
                    onClick={handleNextPage}
                    disabled={!isPage2Valid}
                    className={`flex items-center space-x-2 px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition ${isPage2Valid ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer hover:shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Train Model</span>
                  </button>
                  {!isPage2Valid && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-md w-48 text-center z-10 pointer-events-none">
                      Ensure at least 1 feature is checked.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              PAGE 3: DATA QUALITY INTELLIGENCE
             ========================================== */}
          {page === 3 && dqiDataset && (() => {
            const activeAnoms = dqiAnomalyLog.filter(a => a.status === 'active');
            const totalAnomsCount = activeAnoms.length;
            const targetPillar = (goal === 'forecasting' && dqiReport.granularity < 70) ? 'Granularity' : (goal === 'forecasting' && dqiReport.historicity < 70) ? 'Historicity' : dqiReport.value < 70 ? 'Value' : null;
            const failingReason = dqiReport.granularity < 70
              ? 'Granularity is too low. Ensure your dataset has regular intervals or set a valid chronological date index.'
              : dqiReport.historicity < 70
                ? 'Historicity check failed. Data is too stale or has rolling segments of missing periods.'
                : dqiReport.value < 70
                  ? 'Value completeness failed. High presence of anomalous values, flatlines, or invalid price metrics.'
                  : null;

            // Sort activeAnoms so High severity is first, then Z-Score Outlier, then IQR, then Null, then Flatline
            const sortedActiveAnoms = [...activeAnoms].sort((a, b) => {
              if (a.severity === 'High' && b.severity !== 'High') return -1;
              if (a.severity !== 'High' && b.severity === 'High') return 1;
              if (a.type === 'Z-Score Outlier' && b.type !== 'Z-Score Outlier') return -1;
              if (a.type !== 'Z-Score Outlier' && b.type === 'Z-Score Outlier') return 1;
              return 0;
            });
            const mostSignificantAnomaly = sortedActiveAnoms[0] || null;

            return (
              <div className="space-y-6">
                {/* Header Section */}
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <CheckSquare className="w-5 h-5 text-indigo-500" />
                    <span>Data Quality Intelligence</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Assess forecasting readiness, detect values anomalies, and execute resolution workflows before pipeline training.
                  </p>
                </div>

                {/* Grid 1: Three Pillar Assessment & Forecast Readiness Score */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Readiness Score Card */}
                  <div className="lg:col-span-1 bg-gradient-to-tr from-indigo-500 to-indigo-650 text-white rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-md">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-[20px] pointer-events-none" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 relative z-10">Forecasting Readiness</span>
                    <strong className="text-4xl font-extrabold my-2 relative z-10">{dqiReadinessScore}%</strong>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full relative z-10 ${dqiReadinessScore >= 70 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>
                      {dqiReadinessScore >= 70 ? 'Ready to Model' : 'Action Required'}
                    </span>
                  </div>

                  {/* Pillars cards */}
                  {[
                    { 
                      title: 'Granularity', 
                      val: dqiReport.granularity, 
                      desc: 'Ratio, grain inference & forecast feasibility', 
                      icon: Database,
                      emoji: '📐',
                      tooltipDesc: 'Tracks date frequency and regularities. Transactional or highly irregular dates reduce forecast coherence. Pre-aggregating data ensures the model learns seasonal cycles rather than noise.'
                    },
                    { 
                      title: 'Historicity', 
                      val: dqiReport.historicity, 
                      desc: 'Freshness, span coverage & null rate drift', 
                      icon: History,
                      emoji: '⏳',
                      tooltipDesc: 'Evaluates time coverage and freshness. Stale databases limit real-world model prediction accuracy, while large temporal gaps prevent the model from generalizing recent market dynamics.'
                    },
                    { 
                      title: 'Value', 
                      val: dqiReport.value, 
                      desc: 'Feature completeness, validity & stability', 
                      icon: Sliders,
                      emoji: '💎',
                      tooltipDesc: 'Checks completeness and statistical stability. Outliers, missing values, or flatline inputs degrade weight updates. Cleaning or imputing entries stabilizes variance and coefficients.'
                    }
                  ].map((p, idx) => {
                    const status = p.val >= 85 ? 'Optimized' : p.val >= 70 ? 'Acceptable' : 'Failing';
                    const color = p.val >= 85 ? 'text-emerald-500 bg-emerald-500/10' : p.val >= 70 ? 'text-amber-500 bg-amber-500/10' : 'text-rose-500 bg-rose-500/10';
                    return (
                      <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.title}</span>
                            <p.icon className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">{p.desc}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-50 dark:border-slate-800/40">
                          <div className="flex items-center space-x-1.5">
                            <strong className="text-xl font-extrabold text-slate-700 dark:text-slate-200">{p.val}</strong>
                            <div className="relative group inline-block">
                              <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500 transition-colors cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950/98 dark:bg-slate-900/98 text-slate-200 dark:text-slate-100 text-[11px] font-normal leading-relaxed rounded-xl shadow-xl border border-slate-800 backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                                <div className="font-bold text-slate-100 mb-1 flex items-center space-x-1">
                                  <span>{p.emoji}</span>
                                  <span>{p.title} Pillar & Impact</span>
                                </div>
                                <p className="text-slate-300 dark:text-slate-400 font-sans">{p.tooltipDesc}</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-900" />
                              </div>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Most Significant Anomaly Spotlight & Collective Action Panel */}
                {activeAnoms.length > 0 && mostSignificantAnomaly && (
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl shrink-0 mt-0.5 animate-pulse">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 uppercase tracking-wider">Spotlight: Most Significant Anomaly</span>
                          <span className="text-[9px] text-slate-400 font-mono">ID: {mostSignificantAnomaly.id}</span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-snug">
                          Feature '{mostSignificantAnomaly.feature}' contains a {mostSignificantAnomaly.type} at {mostSignificantAnomaly.rowLabel} (Value: {mostSignificantAnomaly.value})
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Recommended mitigation: {mostSignificantAnomaly.recommendedAction}. Resolve below or apply bulk actions.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/60">
                      <button
                        onClick={() => handleImputeAnomaly(mostSignificantAnomaly)}
                        className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer"
                      >
                        Impute Spotlight
                      </button>
                      <button
                        onClick={() => handleQuarantineAnomaly(mostSignificantAnomaly)}
                        className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer"
                      >
                        Quarantine Row
                      </button>
                    </div>

                    <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-800/60" />

                    <div className="flex flex-col space-y-1.5 shrink-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-center md:text-left">Collective operations ({activeAnoms.length} items)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleImputeAllAnomalies}
                          className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-500 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Impute All
                        </button>
                        <button
                          onClick={handleQuarantineAllAnomalies}
                          className="px-2.5 py-1 bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Quarantine All
                        </button>
                        <button
                          onClick={() => {
                            const r = prompt("Reason to ignore all active anomalies:");
                            if (r !== null) handleIgnoreAllAnomalies(r);
                          }}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Ignore All
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid 1.5: Category Trend Breakdown */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                  {/* Panel header */}
                  <button
                    onClick={() => setDqiCategoryPanelOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                        Target Trend by Category
                      </span>
                      {dqiCategoryColumns.length > 0 && (
                        <span className="text-[9px] font-medium text-slate-400">
                          — <span className="text-indigo-400 font-bold">{targetColumn}</span> split by{' '}
                          <span className="text-violet-400 font-bold">{dqiCategoryColumns.join(' + ')}</span>
                        </span>
                      )}
                      {/* Anomaly count badge */}
                      {(() => {
                        const totalCatAnoms = Object.values(dqiCategoryAnomalyMap).reduce((s, a) => s + a.length, 0);
                        return totalCatAnoms > 0 ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-full">
                            {totalCatAnoms} anomalies
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dqiCategoryPanelOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dqiCategoryPanelOpen && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Column selectors */}
                      {groupByColumns.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Primary Category:</span>
                            <select
                              value={dqiPrimaryCategory}
                              onChange={(e) => setDqiPrimaryCategory(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              {groupByColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subgroup:</span>
                            <select
                              value={dqiSubgroupCategory}
                              onChange={(e) => setDqiSubgroupCategory(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="none">None (Single Level)</option>
                              {groupByColumns.filter(col => col !== dqiPrimaryCategory).map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic pt-1">
                          Set Group By columns on Page 2 (Aggregation Settings) to enable category breakdown.
                        </p>
                      )}

                      {dqiCategoryColumns.length > 0 && dqiCategoryChartData.keys.length > 0 && (
                        <>
                          {/* Multi-line chart */}
                          <div className="h-52 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={dqiCategoryChartData.rows} margin={{ top: 8, right: 16, left: -20, bottom: 12 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.1} />
                                <XAxis
                                  dataKey="name"
                                  type="category"
                                  allowDuplicatedCategory={false}
                                  stroke="var(--text-muted)"
                                  fontSize={8}
                                  tickLine={false}
                                  axisLine={false}
                                  interval={Math.max(0, Math.floor(dqiCategoryChartData.rows.length / 8) - 1)}
                                  label={{ value: dateColumn || 'Date / Time', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 8 }}
                                />
                                <YAxis stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />
                                <Legend
                                  iconSize={8}
                                  iconType="circle"
                                  wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }}
                                />
                                <ChartTooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 shadow-xl text-[10px] space-y-1 max-w-xs">
                                          <p className="font-bold text-slate-400 pb-0.5 border-b border-slate-800">{label}</p>
                                          {payload.map((p, i) => {
                                            const catAnoms = dqiCategoryAnomalyMap[p.dataKey] || [];
                                            return (
                                              <div key={i} className="flex items-center justify-between gap-3">
                                                <span style={{ color: p.color }} className="font-bold truncate max-w-[140px]">{p.name}</span>
                                                <span className="font-mono text-slate-100">{p.value ?? '—'}</span>
                                                {catAnoms.length > 0 && (
                                                  <span className="text-rose-400 text-[8px] font-bold">⚠ {catAnoms.length} anom</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                {dqiCategoryChartData.keys.map((key, i) => (
                                  <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key}
                                    stroke={CAT_PALETTE[i % CAT_PALETTE.length]}
                                    strokeWidth={1.5}
                                    dot={false}
                                    connectNulls={false}
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Per-category anomaly summary table */}
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Category Anomaly Summary — <span className="text-indigo-400">{targetColumn}</span>
                            </h4>
                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                              <table className="w-full text-[11px] text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 uppercase tracking-wider text-[8px]">
                                  <tr>
                                    <th className="py-2 px-3">Category</th>
                                    <th className="py-2 px-3">Rows</th>
                                    <th className="py-2 px-3">Anomalies</th>
                                    <th className="py-2 px-3">Dominant Type</th>
                                    <th className="py-2 px-3">Severity Mix</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                  {dqiCategoryChartData.keys.map((key, i) => {
                                    const anoms = dqiCategoryAnomalyMap[key] || [];
                                    const rowCount = dqiDataset?.sampleRows?.filter(r =>
                                      dqiCategoryColumns.map(col => {
                                        const v = r[col]; return v === null || v === undefined ? 'N/A' : String(v).trim();
                                      }).join(' | ') === key
                                    ).length || 0;
                                    const typeCounts = {};
                                    anoms.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
                                    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
                                    const highCount = anoms.filter(a => a.severity === 'High').length;
                                    const medCount = anoms.filter(a => a.severity === 'Medium').length;
                                    return (
                                      <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25">
                                        <td className="py-2 px-3 font-semibold flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: CAT_PALETTE[i % CAT_PALETTE.length] }}></span>
                                          <span className="truncate max-w-[160px]" title={key}>{key}</span>
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">{rowCount}</td>
                                        <td className="py-2 px-3">
                                          {anoms.length === 0
                                            ? <span className="text-emerald-500 font-bold">✓ Clean</span>
                                            : <span className="text-rose-500 font-bold">{anoms.length}</span>
                                          }
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">{dominantType}</td>
                                        <td className="py-2 px-3">
                                          {anoms.length > 0 ? (
                                            <div className="flex items-center gap-1">
                                              {highCount > 0 && <span className="text-[8px] font-bold px-1 py-0.5 bg-rose-500/10 text-rose-500 rounded">{highCount}H</span>}
                                              {medCount > 0 && <span className="text-[8px] font-bold px-1 py-0.5 bg-amber-500/10 text-amber-500 rounded">{medCount}M</span>}
                                            </div>
                                          ) : <span className="text-slate-300">—</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}

                      {dqiCategoryColumns.length > 0 && dqiCategoryChartData.keys.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic text-center py-4">
                          No data available. Ensure the dataset has rows and the target column is set.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Grid 2: Anomaly Detection Chart & Table */}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {/* Chart and Table Panel */}
                  <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
                     {(() => {
                        const selColMeta = dqiDataset?.columnsInfo?.find(c => c.name === dqiSelectedFeature);
                        const isSelectedCat = selColMeta?.type === 'categorical';
                        return (
                          <>
                            {/* Panel header — dropdown + type badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-50 dark:border-slate-800/60">
                              <div>
                                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                                  <Flame className="w-4 h-4 text-rose-500" />
                                  <span>Anomaly Detection</span>
                                  {/* Type badge */}
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${isSelectedCat ? 'bg-violet-500/10 text-violet-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                    {isSelectedCat ? '🏷️ Categorical' : '📊 Numeric'}
                                  </span>
                                </h3>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {isSelectedCat
                                    ? 'Rare categories, monoculture & null spikes'
                                    : 'Outliers, null spikes, and flatline sequence mapping'}
                                </span>
                              </div>

                              {/* Dropdown to select feature with type icons */}
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Feature:</span>
                                <select
                                  value={dqiSelectedFeature}
                                  onChange={(e) => setDqiSelectedFeature(e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-[11px]"
                                >
                                  {Array.from(new Set([targetColumn, ...selectedFeaturesList])).filter(Boolean).map(f => {
                                    const fMeta = dqiDataset?.columnsInfo?.find(c => c.name === f);
                                    const icon = fMeta?.type === 'categorical' ? '🏷️' : '📊';
                                    return <option key={f} value={f}>{icon} {f}</option>;
                                  })}
                                </select>
                              </div>
                            </div>

                            {/* Chart — type-aware */}
                            <div className="h-44 w-full pt-2">
                              <ResponsiveContainer width="100%" height="100%">
                                {isSelectedCat ? (
                                  /* ── CATEGORICAL: horizontal frequency bar chart ── */
                                  <BarChart
                                    data={dqiChartData}
                                    layout="vertical"
                                    margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" strokeOpacity={0.1} />
                                    <XAxis
                                      type="number"
                                      stroke="var(--text-muted)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                      allowDecimals={false}
                                    />
                                    <YAxis
                                      type="category"
                                      dataKey="name"
                                      width={90}
                                      stroke="var(--text-muted)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                      tick={{ fontSize: 8 }}
                                      tickFormatter={(v) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                                    />
                                    <ChartTooltip
                                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const d = payload[0].payload;
                                          return (
                                            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 shadow-xl text-[10px] space-y-0.5">
                                              <p className="font-bold text-slate-300">{d.name}</p>
                                              <p className="font-mono text-slate-100">Count: <span className="font-bold text-indigo-300">{d.value}</span></p>
                                              <p className="text-slate-400">{d.pct}% of non-null rows</p>
                                              {d.isRare && (
                                                <p className="text-rose-400 font-bold flex items-center gap-1 pt-0.5">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-pulse"></span>
                                                  Rare Category Anomaly
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                                      {dqiChartData.map((entry, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={entry.isRare ? '#ef4444' : '#6366f1'}
                                          fillOpacity={entry.isRare ? 0.9 : 0.7}
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                ) : (
                                  /* ── NUMERIC: existing time-series line chart ── */
                                  <ComposedChart data={dqiChartData} margin={{ top: 10, right: 10, left: -20, bottom: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.1} />
                                    <XAxis
                                      dataKey="name"
                                      type="category"
                                      allowDuplicatedCategory={false}
                                      domain={dqiChartData.map(d => d.name)}
                                      stroke="var(--text-muted)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                      interval={Math.max(0, Math.floor(dqiChartData.length / 8) - 1)}
                                      label={{ value: dateColumn || 'Date / Time', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 8 }}
                                    />
                                    <YAxis stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />
                                    <ChartTooltip
                                      content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                          const pData = payload[0].payload;
                                          const val = payload[0].value;
                                          const hasAnomaly = pData.anomalyCount > 0;
                                          return (
                                            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 shadow-xl text-[10px] space-y-1">
                                              <p className="font-bold text-slate-400">{pData.rowLabel} ({label})</p>
                                              <p className="font-mono text-slate-100">{dqiSelectedFeature}: <span className="font-bold text-indigo-300">{val}</span></p>
                                              {hasAnomaly && (
                                                <div className="border-t border-slate-800/80 pt-1 mt-1 space-y-0.5">
                                                  <p className="text-rose-400 font-bold flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-pulse"></span>
                                                    {pData.anomalyCount} Anomaly/Anomalies Detected:
                                                  </p>
                                                  <ul className="list-disc pl-3 text-rose-300/90 space-y-0.5 text-[9px]">
                                                    {pData.anomalies.map((anom, idx) => (
                                                      <li key={idx}>
                                                        Row {anom.index + 1}: {anom.type} ({anom.value})
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Line type="monotone" dataKey="value" name={dqiSelectedFeature} stroke="#6366f1" strokeWidth={1.5} dot={false} />
                                    <Line type="monotone" dataKey="anomaly" name="Anomaly Point" stroke="transparent" dot={{ r: 4.5, stroke: '#ef4444', strokeWidth: 2, fill: '#ef4444' }} />
                                  </ComposedChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </>
                        );
                      })()}


                    {/* Table below chart */}
                    <div className="pt-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Anomalies on '{dqiSelectedFeature}'</h4>
                      <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 uppercase tracking-wider text-[8px]">
                            <tr>
                              <th className="py-2 px-3">Location</th>
                              <th className="py-2 px-3">Type</th>
                              <th className="py-2 px-3">Value</th>
                              <th className="py-2 px-3">Severity</th>
                              <th className="py-2 px-3">Action status</th>
                              <th className="py-2 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {dqiAnomalyLog.filter(a => a.feature === dqiSelectedFeature).map(anom => {
                              const badgeColor = anom.severity === 'High' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500';
                              const statusColor = anom.status === 'active' ? 'text-slate-400' : anom.status === 'ignored' ? 'text-slate-400 line-through' : 'text-emerald-500 font-bold';
                              return (
                                <tr key={anom.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25">
                                  <td className="py-2 px-3 font-semibold">{anom.rowLabel}</td>
                                  <td className="py-2 px-3">{anom.type}</td>
                                  <td className="py-2 px-3 font-mono">{anom.value}</td>
                                  <td className="py-2 px-3">
                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${badgeColor}`}>{anom.severity}</span>
                                  </td>
                                  <td className={`py-2 px-3 uppercase text-[9px] ${statusColor}`}>{anom.status}</td>
                                  <td className="py-1 px-3 text-right space-x-1 whitespace-nowrap">
                                    {anom.status === 'active' ? (
                                      <>
                                        <button
                                          onClick={() => handleImputeAnomaly(anom)}
                                          title="Impute value"
                                          className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border border-indigo-200 dark:border-indigo-900 rounded hover:bg-indigo-500 hover:text-white text-[9px] font-bold transition"
                                        >
                                          Impute
                                        </button>
                                        <button
                                          onClick={() => handleQuarantineAnomaly(anom)}
                                          title="Exclude row"
                                          className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-900 rounded hover:bg-rose-500 hover:text-white text-[9px] font-bold transition"
                                        >
                                          Quarantine
                                        </button>
                                        <button
                                          onClick={() => handleAlertAnomaly(anom)}
                                          title="Alert notification"
                                          className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-200 dark:border-amber-900 rounded hover:bg-amber-500 hover:text-white text-[9px] font-bold transition"
                                        >
                                          Alert
                                        </button>
                                        <button
                                          onClick={() => {
                                            const r = prompt("Reason to ignore:");
                                            if (r !== null) handleIgnoreAnomaly(anom, r);
                                          }}
                                          title="Ignore anomaly"
                                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-bold transition"
                                        >
                                          Ignore
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">Resolved</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {dqiAnomalyLog.filter(a => a.feature === dqiSelectedFeature).length === 0 && (
                              <tr>
                                <td colSpan="6" className="py-4 px-3 text-center text-slate-400 italic">No anomalies detected for this feature</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Audit Trail & Notification Log */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="pb-2 border-b border-slate-50 dark:border-slate-800/60">
                        <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>Audit Trail & Alerts</span>
                        </h3>
                        <span className="text-[9px] text-slate-400 font-medium">Record of quality preprocessing pipeline steps</span>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                        {dqiAuditTrail.map((trail, idx) => {
                          let labelColor = 'bg-slate-100 text-slate-500';
                          if (trail.action === 'Impute') labelColor = 'bg-indigo-500/10 text-indigo-500';
                          if (trail.action === 'Quarantine') labelColor = 'bg-rose-500/10 text-rose-500';
                          if (trail.action === 'Alert') labelColor = 'bg-amber-500/10 text-amber-500';
                          if (trail.action === 'Ignore') labelColor = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                          return (
                            <div key={idx} className="p-2 border border-slate-50 dark:border-slate-850 rounded-xl space-y-1 text-[10px]">
                              <div className="flex justify-between items-center text-[8px] font-bold">
                                <span className={`px-1 py-0.5 rounded ${labelColor}`}>{trail.action}</span>
                                <span className="text-slate-400">{trail.timestamp}</span>
                              </div>
                              <p className="text-slate-655 dark:text-slate-350 leading-relaxed font-sans">{trail.message}</p>
                            </div>
                          );
                        })}
                        {dqiAuditTrail.length === 0 && (
                          <div className="text-center py-8 text-slate-400 italic text-[11px]">No audit history logged</div>
                        )}
                      </div>
                    </div>

                    {/* Proceed Gate Info */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 space-y-2.5">
                      {targetPillar ? (
                        /* Warning Banner (Non-Blocking) */
                        <div className="space-y-2">
                          <div className="p-3 bg-amber-500/5 dark:bg-amber-955/15 border border-amber-500/25 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-550 dark:text-amber-400 animate-pulse" />
                              <span>Quality Warning</span>
                            </span>
                            <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal">
                              Your dataset does not meet the recommended forecasting readiness thresholds. You may proceed, but model accuracy/performance may be impacted.
                            </p>
                          </div>

                          {/* Recommended Fixes checklist */}
                          <div className="space-y-1.5">
                            {dqiReport.granularity < 70 && goal === 'forecasting' && (
                              <div className="p-2 border border-amber-500/20 dark:border-amber-900/40 bg-amber-500/5 rounded-xl text-[10px] space-y-0.5">
                                <span className="font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider text-[8px]">⚠️ RECOMMENDED FIX: Granularity</span>
                                <p className="text-slate-550 dark:text-slate-400 leading-normal">
                                  Select a valid date column, or enable <strong>Group-By Aggregation</strong> on Page 2 using your Date column to regularize intervals.
                                </p>
                              </div>
                            )}
                            {dqiReport.historicity < 70 && goal === 'forecasting' && (
                              <div className="p-2 border border-amber-500/20 dark:border-amber-900/40 bg-amber-500/5 rounded-xl text-[10px] space-y-0.5">
                                <span className="font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider text-[8px]">⚠️ RECOMMENDED FIX: Historicity</span>
                                <p className="text-slate-550 dark:text-slate-400 leading-normal">
                                  Timeline covers less than 90 days or is too stale. Provide more historical records with recent dates.
                                </p>
                              </div>
                            )}
                            {dqiReport.value < 70 && (
                              <div className="p-2 border border-amber-500/20 dark:border-amber-900/40 bg-amber-500/5 rounded-xl text-[10px] space-y-0.5">
                                <span className="font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider text-[8px]">⚠️ RECOMMENDED FIX: Value Completeness</span>
                                <p className="text-slate-550 dark:text-slate-400 leading-normal">
                                  High outlier rate or null density. Apply <strong>Impute All</strong> or <strong>Quarantine All</strong> bulk actions above to clean values.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Clear banner (Allowed) */
                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-500/20 rounded-xl flex items-start space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">Readiness Verified</span>
                            <p className="text-[10px] text-slate-400 leading-normal">All core quality thresholds are satisfied. Ready to proceed to model training.</p>
                          </div>
                        </div>
                      )}

                      {/* Big Proceed Button */}
                      <button
                        onClick={handleNextPage}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md cursor-pointer bg-indigo-500 hover:bg-indigo-650 text-white"
                      >
                        <span>Proceed to Model Testing</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ==========================================
              PAGE 4: TRAINING REPORT & MODEL OUTPUT
             ========================================== */}
          {page === 4 && trainingResults && (() => {
            const predictionsPerPage = 5;
            const currentPredictions = trainingResults.models[activePredictionModel]?.predictions || trainingResults.predictions || [];
            const totalPreds = currentPredictions.length;
            const totalPages = Math.ceil(totalPreds / predictionsPerPage);
            const startPredIdx = predictionsPage * predictionsPerPage;
            const paginatedPredictions = currentPredictions.slice(startPredIdx, startPredIdx + predictionsPerPage);
            const getResidualStats = (preds) => {
              if (!preds || preds.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
              const residuals = preds.map(p => Number(p.actual) - Number(p.predicted)).filter(v => !isNaN(v));
              if (residuals.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
              residuals.sort((a, b) => a - b);

              const min = residuals[0];
              const max = residuals[residuals.length - 1];
              const median = residuals[Math.floor(residuals.length / 2)];
              const q1 = residuals[Math.floor(residuals.length * 0.25)];
              const q3 = residuals[Math.floor(residuals.length * 0.75)];

              return { min, q1, median, q3, max };
            };
            const residuals = getResidualStats(currentPredictions);

            return (
              <div className="space-y-8">

                {/* SECTION A — TRAINING REPORT */}
                <section className="space-y-6">

                  {/* Top status bar summary banner */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Training Pipelines Completed Successfully</span>
                        <span className="text-[10px] text-white/80 font-medium">All designated workflows resolved without exceptions</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-xs font-bold font-mono">
                      <div>Duration: {trainingResults.duration}</div>
                      <div>Finished: {trainingResults.timestamp}</div>
                    </div>
                  </div>

                  {/* DATA QUALITY INTEGRITY CONTEXTUAL ADVISORY */}
                  {dqiReport && (
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
                      <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Data Quality Contextual Advisory</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">Granularity Score</span>
                          <strong className={`text-base block mt-0.5 ${dqiReport.granularity < 70 ? 'text-rose-500' : dqiReport.granularity < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {dqiReport.granularity}/100
                          </strong>
                          {dqiReport.granularity < 75 && (
                            <p className="text-[10px] text-slate-400 leading-normal">
                              ⚠️ Irregular or transactional grain detected. Forecast intervals and predictions may exhibit higher variances.
                            </p>
                          )}
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">Historicity Score</span>
                          <strong className={`text-base block mt-0.5 ${dqiReport.historicity < 70 ? 'text-rose-500' : dqiReport.historicity < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {dqiReport.historicity}/100
                          </strong>
                          {dqiReport.historicity < 75 && (
                            <p className="text-[10px] text-slate-400 leading-normal">
                              ⚠️ Stale data or lag detected. Live performance metrics might deteriorate compared to validation bounds.
                            </p>
                          )}
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">Value Score</span>
                          <strong className={`text-base block mt-0.5 ${dqiReport.value < 70 ? 'text-rose-500' : dqiReport.value < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {dqiReport.value}/100
                          </strong>
                          {dqiReport.value < 75 && (
                            <p className="text-[10px] text-slate-400 leading-normal">
                              ⚠️ Completeness issues detected. Auto-imputations applied prior to model execution.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Summary of Actions Logged */}
                      {dqiAuditTrail.length > 1 && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-800/40">
                          <span className="font-bold text-slate-500">Pipeline Modifications Audit:</span> {dqiAuditTrail.filter(t => t.action !== 'Initialize').length} active clean action(s) performed on feature columns.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feature Selection Pipeline Report */}
                  {advancedMode && trainingResults.feature_pipeline_report && (() => {
                    const pipelineReport = trainingResults.feature_pipeline_report;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                        <button
                          onClick={() => setExpandedPipelineMock(!expandedPipelineMock)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-none text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <Layers className="w-5 h-5 text-indigo-500" />
                            <div>
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">Feature Selection & Preprocessing Report</span>
                              <span className="text-[10px] text-slate-400 font-medium">Automated pipeline funnel and SHAP relative importances</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              {pipelineReport.selected_features?.length || 0} features selected
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedPipelineMock ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {expandedPipelineMock && (
                          <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-6">
                            {/* Funnel progression row */}
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                                Pipeline Funnel Progression
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                                {[
                                  { label: 'Original', val: pipelineReport.stage0_original },
                                  { label: 'Generated', val: (pipelineReport.stage0_original || 0) + (pipelineReport.stage1_generated || 0) },
                                  { label: 'Variance Filter', val: pipelineReport.stage2_after_variance },
                                  { label: 'Correlation Filter', val: pipelineReport.stage3_after_correlation },
                                  { label: 'Mutual Info Final', val: pipelineReport.stage4_after_mi, active: true }
                                ].map((step, idx) => (
                                  <div key={idx} className="flex items-center">
                                    <div className={`flex-1 p-3 rounded-xl text-center border ${step.active ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/30'}`}>
                                      <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">{step.label}</span>
                                      <strong className={`text-sm block mt-1 ${step.active ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {step.val != null ? step.val : '—'}
                                      </strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Evaluator metrics and SHAP importances */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Evaluator Card */}
                              <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 space-y-3">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                                  <span>First-Pass Evaluator ({pipelineReport.first_pass_model || 'LightGBM'})</span>
                                </h5>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  A quick-fit GBDT model was run on the selected features to validate the subsets and compute SHAP interaction coefficients.
                                </p>
                                <div className="flex space-x-6 text-center pt-2">
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">R² SCORE</span>
                                    <strong className="text-base text-slate-800 dark:text-slate-200">{pipelineReport.first_pass_metrics?.r2 != null ? pipelineReport.first_pass_metrics.r2.toFixed(3) : '—'}</strong>
                                  </div>
                                  <div className="w-px bg-slate-200 dark:bg-slate-800 self-stretch" />
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">RMSE</span>
                                    <strong className="text-base text-slate-800 dark:text-slate-200">{pipelineReport.first_pass_metrics?.rmse != null ? pipelineReport.first_pass_metrics.rmse.toFixed(1) : '—'}</strong>
                                  </div>
                                  <div className="w-px bg-slate-200 dark:bg-slate-800 self-stretch" />
                                  <div>
                                    <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">MAE</span>
                                    <strong className="text-base text-slate-800 dark:text-slate-200">{pipelineReport.first_pass_metrics?.mae != null ? pipelineReport.first_pass_metrics.mae.toFixed(1) : '—'}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* SHAP Card */}
                              <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-805/60 rounded-xl p-4 flex flex-col">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
                                  <LineChartIcon className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>SHAP Relative Feature Importances</span>
                                </h5>
                                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                                  {pipelineReport.shap_rankings && pipelineReport.shap_rankings.length > 0 ? (
                                    (() => {
                                      const maxVal = Math.max(...pipelineReport.shap_rankings.map(s => s.importance), 0.0001);
                                      return pipelineReport.shap_rankings.map((item, idx) => {
                                        const pct = (item.importance / maxVal) * 100;
                                        return (
                                          <div key={idx} className="space-y-1">
                                            <div className="flex justify-between items-center text-[10px]">
                                              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{item.feature}</span>
                                              <span className="text-slate-400 font-medium">{item.importance.toFixed(4)}</span>
                                            </div>
                                            <div className="w-full h-1 rounded bg-slate-100 dark:bg-slate-850 overflow-hidden">
                                              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded" style={{ width: `${pct}%` }} />
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()
                                  ) : (
                                    <span className="text-xs text-slate-400">No features processed.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Leaderboard Comparison */}
                  {advancedMode && (() => {
                    const comparisonCols = Object.keys(trainingResults.comparison[0]).filter(k => k !== 'modelName');
                    const selectedMetric = activeMetricChart || comparisonCols[0] || '';

                    const chartData = trainingResults.comparison.map(row => {
                      const formattedRow = { name: row.modelName };
                      Object.entries(row).forEach(([metric, val]) => {
                        if (metric !== 'modelName') {
                          // Parse out percentage signs or commas
                          let parsed = parseFloat(String(val).replace(/%/g, '').replace(/,/g, ''));
                          if (!isNaN(parsed)) {
                            formattedRow[metric] = parsed;
                          }
                        }
                      });
                      return formattedRow;
                    });

                    const bestModelKey = getBestModelKey(trainingResults);
                    const bestModelName = MODEL_REGISTRY[goal]?.find(m => m.id === bestModelKey)?.name || bestModelKey;

                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => setExpandedLeaderboard(!expandedLeaderboard)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-none text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <Award className="w-5 h-5 text-indigo-500" />
                            <div>
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">Model Leaderboard & Metric Comparison</span>
                              <span className="text-[10px] text-slate-400 font-medium font-sans">Compare accuracy parameters across all trained candidates</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {bestModelName && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Best: {bestModelName}
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedLeaderboard ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {expandedLeaderboard && (
                          <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                              {/* Table Pane */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Model Leaderboard</h3>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Best values highlighted in green</span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500">
                                        <tr>
                                          <th className="py-2.5 px-4">Model Name</th>
                                          {comparisonCols.map(metric => (
                                            <th key={metric} className="py-2.5 px-4 text-right">{metric}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                        {trainingResults.comparison.map((row, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25">
                                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">{row.modelName}</td>
                                            {Object.entries(row).filter(([k]) => k !== 'modelName').map(([metric, value]) => {
                                              const best = isBestMetric(metric, value, trainingResults.comparison);
                                              return (
                                                <td
                                                  key={metric}
                                                  className={`py-2.5 px-4 text-right font-mono font-bold ${best ? 'text-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : 'text-slate-655 dark:text-slate-400'}`}
                                                >
                                                  {value}
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                              {/* Chart Pane */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
                                <div className="space-y-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Accuracy & Metric Visual Comparison</h3>

                                    {/* Pill Tabs to select metric */}
                                    <div className="flex flex-wrap gap-1">
                                      {comparisonCols.map(metric => (
                                        <button
                                          key={metric}
                                          type="button"
                                          onClick={() => setActiveMetricChart(metric)}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${selectedMetric === metric
                                            ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500'
                                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-805'
                                            }`}
                                        >
                                          {metric}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Chart Container */}
                                  <div className="w-full h-[220px] pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.15} />
                                        <XAxis
                                          dataKey="name"
                                          stroke="var(--text-muted)"
                                          fontSize={10}
                                          tickLine={false}
                                          axisLine={false}
                                          tickFormatter={(tick) => {
                                            return String(tick)
                                              .replace('Regression', 'Reg')
                                              .replace('Classification', 'Clf')
                                              .replace('Classifier', 'Clf')
                                              .replace('Gradient Boosting', 'GBM')
                                              .replace('Random Forest', 'RF');
                                          }}
                                        />
                                        <YAxis
                                          stroke="var(--text-muted)"
                                          fontSize={10}
                                          tickLine={false}
                                          axisLine={false}
                                        />
                                        <ChartTooltip
                                          contentStyle={{
                                            background: 'var(--bg-raised)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            color: 'var(--text-primary)'
                                          }}
                                          labelClassName="font-bold text-slate-750 dark:text-slate-200"
                                        />
                                        <Bar
                                          dataKey={selectedMetric}
                                          fill="#6366f1"
                                          radius={[6, 6, 0, 0]}
                                          maxBarSize={40}
                                        />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Model Diagnostics Card with dropdown selection */}
                  {advancedMode && selectedModels.length > 0 && (() => {
                    const currentDiagModel = activeDiagModel || selectedModels[0] || '';
                    const result = trainingResults.models[currentDiagModel];
                    if (!result) return null;
                    const isNonEpoch = nonEpochModels.includes(currentDiagModel);
                    const modelResiduals = getResidualStats(result.predictions || []);

                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition p-6 space-y-6">

                        {/* Selector Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                              {currentDiagModel.slice(0, 2)}
                            </span>
                            <div>
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Model Diagnostics</h3>
                              <span className="text-[10px] text-slate-400 font-medium">Select a model from the dropdown to view its detailed curves and charts</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0 w-fit">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Model:</label>
                            <select
                              value={currentDiagModel}
                              onChange={(e) => setActiveDiagModel(e.target.value)}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-300 font-sans"
                            >
                              {selectedModels.map(modelId => {
                                const mMeta = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
                                return (
                                  <option key={modelId} value={modelId}>
                                    {mMeta ? mMeta.name : modelId} {modelId === getBestModelKey(trainingResults) ? '(Best)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* Diagnostics Body */}
                        <div className="space-y-6 pt-2">

                          {/* 3-Column Sub-Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                            {/* Col 1: Metrics List Table */}
                            <div className="space-y-2">
                              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Evaluation Metrics</span>
                              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold">
                                    <tr>
                                      <th className="py-2 px-3 text-slate-500 text-left">Metric</th>
                                      <th className="py-2 px-3 text-right text-slate-500">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                    {Object.entries(result.metrics).map(([key, val]) => (
                                      <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">{key}</td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-500">{val}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Col 2: Feature Importance Bar Chart */}
                            <div className="space-y-2">
                              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Feature Importance (%)</span>
                              <div className="h-60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center justify-center bg-slate-50/20 dark:bg-slate-900/30">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={result.featureImportances}
                                    layout="vertical"
                                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                    <XAxis type="number" stroke={darkMode ? '#475569' : '#94a3b8'} style={{ fontSize: 9 }} />
                                    <YAxis dataKey="name" type="category" stroke={darkMode ? '#475569' : '#94a3b8'} style={{ fontSize: 9 }} width={70} />
                                    <ChartTooltip
                                      contentStyle={{
                                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                                        borderColor: darkMode ? '#334155' : '#e2e8f0',
                                        color: darkMode ? '#f1f5f9' : '#1e293b',
                                        fontSize: 10
                                      }}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Col 3: Epoch/Loss Chart or Non-Epoch Placeholder */}
                            <div className="space-y-2">
                              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Loss History / Method Info</span>
                              {!isNonEpoch ? (
                                <div className="h-60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center justify-center bg-slate-50/20 dark:bg-slate-900/30">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                      data={result.lossCurve}
                                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                      <XAxis dataKey="epoch" stroke={darkMode ? '#475569' : '#94a3b8'} style={{ fontSize: 9 }} />
                                      <YAxis stroke={darkMode ? '#475569' : '#94a3b8'} style={{ fontSize: 9 }} />
                                      <ChartTooltip
                                        contentStyle={{
                                          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                                          borderColor: darkMode ? '#334155' : '#e2e8f0',
                                          color: darkMode ? '#f1f5f9' : '#1e293b',
                                          fontSize: 10
                                        }}
                                      />
                                      <Legend wrapperStyle={{ fontSize: 10 }} />
                                      <Line type="monotone" dataKey="trainLoss" name="Train Loss" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 5 }} dot={false} />
                                      <Line type="monotone" dataKey="valLoss" name="Val Loss" stroke="#f97316" strokeWidth={2} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="h-60 border border-slate-100 dark:border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/20 dark:bg-slate-900/30 space-y-2 select-none">
                                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-505">
                                    <Sliders className="w-6 h-6" />
                                  </div>
                                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Iterative Loss History Unreported</span>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-505 max-w-[200px] leading-tight">
                                    {result.name} is a non-epoch-based algorithm fitting weights directly without gradient step optimization history.
                                  </p>
                                </div>
                              )}
                            </div>

                          </div>

                          {/* Additional Diagnostics: Confusion Matrix or Residuals */}
                          {goal === 'classification' && result.confusionMatrix && (
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Confusion Matrix Diagnostics</span>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">True Positive (TP)</span>
                                  <span className="font-mono text-lg font-bold text-indigo-500 mt-1">{result.confusionMatrix.tp}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">False Positive (FP)</span>
                                  <span className="font-mono text-lg font-bold mt-1 text-rose-505">{result.confusionMatrix.fp}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">False Negative (FN)</span>
                                  <span className="font-mono text-lg font-bold mt-1 text-rose-505">{result.confusionMatrix.fn}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">True Negative (TN)</span>
                                  <span className="font-mono text-lg font-bold text-indigo-500 mt-1">{result.confusionMatrix.tn}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {(goal === 'regression' || goal === 'forecasting') && (
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Residual Diagnostics (Error Distribution)</span>
                              <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500 uppercase tracking-wider text-[8px]">
                                    <tr>
                                      <th className="py-2 px-4">Min Residual</th>
                                      <th className="py-2 px-4">25% Percentile (Q1)</th>
                                      <th className="py-2 px-4">Median Residual</th>
                                      <th className="py-2 px-4">75% Percentile (Q3)</th>
                                      <th className="py-2 px-4">Max Residual</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                    <tr>
                                      <td className="py-2.5 px-4 font-mono">{modelResiduals.min.toFixed(2)}</td>
                                      <td className="py-2.5 px-4 font-mono">{modelResiduals.q1.toFixed(2)}</td>
                                      <td className="py-2.5 px-4 font-mono text-indigo-500 font-bold">{modelResiduals.median.toFixed(2)}</td>
                                      <td className="py-2.5 px-4 font-mono">{modelResiduals.q3.toFixed(2)}</td>
                                      <td className="py-2.5 px-4 font-mono">{modelResiduals.max.toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* Predictions Preview */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => setExpandedPredictionsPreview(!expandedPredictionsPreview)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-none text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Download className="w-5 h-5 text-indigo-500" />
                      <div>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">Predictions Preview</span>
                        <span className="text-[10px] text-slate-400 font-medium font-sans">
                          Preview validation predictions and paginate through test set results{!advancedMode && ` for the chosen ${MODEL_REGISTRY[goal]?.find(m => m.id === activePredictionModel)?.name || 'model'}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        {totalPreds} rows
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedPredictionsPreview ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expandedPredictionsPreview && (
                    <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-4">
                      {advancedMode && selectedModels.length > 1 && (
                        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0 w-fit">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Prediction Model:</label>
                          <select
                            value={activePredictionModel}
                            onChange={(e) => setActivePredictionModel(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-155 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-300 font-sans"
                          >
                            {selectedModels.map(modelId => {
                              const mMeta = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
                              return (
                                <option key={modelId} value={modelId}>
                                  {mMeta ? mMeta.name : modelId} {modelId === getBestModelKey(trainingResults) ? '(Best)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <div className="max-h-[300px] overflow-y-auto border border-slate-50 dark:border-slate-800/80 rounded-xl scrollbar-thin">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-850 font-bold sticky top-0 z-10 text-slate-500 uppercase tracking-wider text-[9px]">
                            <tr>
                              <th className="py-2 px-3">Row</th>
                              <th className="py-2 px-3">Actual</th>
                              <th className="py-2 px-3">Predicted</th>
                              <th className="py-2 px-3 text-right">Error / Correct</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-[11px]">
                            {paginatedPredictions.map(pred => {
                              const isErr = pred.correct === '✗';
                              return (
                                <tr key={pred.rowNum} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                  <td className="py-1 px-3 text-slate-400 font-mono">#{pred.rowNum}</td>
                                  <td className="py-1 px-3 font-semibold">{pred.actual}</td>
                                  <td className="py-1 px-3 font-semibold text-indigo-500">{pred.predicted}</td>
                                  <td className={`py-1 px-3 text-right font-bold font-mono ${isErr ? 'text-rose-500' : goal === 'classification' ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {goal === 'classification' ? pred.correct : `± ${pred.error}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center text-xs mt-3 select-none">
                        <span className="text-slate-400 font-semibold">
                          Showing {startPredIdx + 1} - {Math.min(totalPreds, startPredIdx + predictionsPerPage)} of {totalPreds} test predictions
                        </span>

                        <div className="flex space-x-1.5 font-bold">
                          <button
                            type="button"
                            onClick={() => setPredictionsPage(prev => Math.max(0, prev - 1))}
                            disabled={predictionsPage === 0}
                            className={`px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg transition ${predictionsPage === 0 ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            onClick={() => setPredictionsPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={predictionsPage === totalPages - 1}
                            className={`px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg transition ${predictionsPage === totalPages - 1 ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Forecast Projections */}
                {goal === 'forecasting' && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
                    <button
                      type="button"
                      onClick={() => setExpandedForecastProjections(!expandedForecastProjections)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-none text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <LineChartIcon className="w-5 h-5 text-indigo-500" />
                        <div>
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">Forecast Projections</span>
                          <span className="text-[10px] text-slate-400 font-medium font-sans">
                            Visualize extrapolated future values and confidence bands
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedForecastProjections ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedForecastProjections && (
                      <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-6">
                        {/* Controls Row */}
                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-500">Forecast Horizon</label>
                            <input
                              type="number"
                              min="1"
                              max="60"
                              value={forecastHorizon}
                              onChange={(e) => setForecastHorizon(Math.max(1, Math.min(60, Number(e.target.value))))}
                              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-0.5 w-16 text-center font-bold text-xs focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-500">Frequency</label>
                            <select
                              value={forecastFrequency}
                              onChange={(e) => setForecastFrequency(e.target.value)}
                              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none"
                            >
                              <option value="Daily">Daily</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>

                          <button
                            onClick={() => setTriggerForecastUpdate(prev => prev + 1)}
                            className="text-xs font-semibold px-3 py-1.5 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 rounded-lg transition"
                          >
                            Regenerate Forecast
                          </button>
                        </div>

                        {/* Composed Chart */}
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={forecastData}
                              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                              <XAxis dataKey="period" stroke={darkMode ? '#475569' : '#94a3b8'} style={{ fontSize: 10 }} />
                              <YAxis stroke={darkMode ? '#475569' : '#94a3b8'} style={{ fontSize: 10 }} />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                                  borderColor: darkMode ? '#334155' : '#e2e8f0',
                                  color: darkMode ? '#f1f5f9' : '#1e293b',
                                  fontSize: 11
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 11 }} />

                              {/* Confidence Band Area */}
                              <Area
                                type="monotone"
                                dataKey="range"
                                name="90% Confidence Interval"
                                fill="#f59e0b"
                                stroke="none"
                                fillOpacity={0.15}
                                connectNulls={true}
                              />

                              {/* Actual Line */}
                              <Line
                                type="monotone"
                                dataKey="actual"
                                name="Historical Actuals"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={true}
                              />

                              {/* Forecast Line */}
                              <Line
                                type="monotone"
                                dataKey="forecast"
                                name="Future Forecast"
                                stroke="#f59e0b"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={true}
                              />

                              {/* Reference line for start of forecast */}
                              {(() => {
                                const lastHist = forecastData.filter(d => d.actual !== null);
                                const xVal = lastHist.length > 0 ? lastHist[lastHist.length - 1].period : '';
                                if (!xVal) return null;
                                return (
                                  <ReferenceLine
                                    x={xVal}
                                    stroke={darkMode ? '#64748b' : '#94a3b8'}
                                    strokeDasharray="3 3"
                                    label={{
                                      value: 'Forecast Start',
                                      position: 'top',
                                      fill: darkMode ? '#94a3b8' : '#64748b',
                                      fontSize: 9,
                                      fontWeight: 'bold'
                                    }}
                                  />
                                );
                              })()}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Predict on New Input */}
                <section className="space-y-6 pb-32 bg-gradient-to-br from-indigo-500/[0.03] via-slate-50/10 to-indigo-500/[0.01] dark:from-indigo-500/[0.01] dark:via-slate-900/10 dark:to-transparent border border-indigo-500/10 rounded-3xl p-6 shadow-xl shadow-indigo-500/[0.02]">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-100 flex items-center space-x-2">
                      <Sliders className="w-5 h-5 text-indigo-500 animate-pulse" />
                      <span>Predict on New Input (Real-time Inference)</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium font-sans">
                      Enter customized feature inputs below to test real-time predictions against your trained models.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Inputs Form Pane */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-850 dark:text-slate-100">Input Variables Form</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedFeaturesList.map(feat => {
                          const colMeta = dataset.columnsInfo.find(c => c.name === feat);
                          if (!colMeta) return null;

                          let inputElement = null;
                          const currentVal = predictInputs[feat] ?? '';

                          if (colMeta.type === 'numeric') {
                            inputElement = (
                              <input
                                type="number"
                                step="any"
                                value={currentVal}
                                onChange={(e) => setPredictInputs({
                                  ...predictInputs,
                                  [feat]: e.target.value
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-155 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
                                placeholder={`Enter numeric (e.g. ${colMeta.samples[0] || '0'})`}
                              />
                            );
                          } else if (colMeta.type === 'datetime') {
                            inputElement = (
                              <input
                                type="date"
                                value={currentVal}
                                onChange={(e) => setPredictInputs({
                                  ...predictInputs,
                                  [feat]: e.target.value
                                })}
                                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
                              />
                            );
                          } else {
                            // Categorical
                            const uniqueVals = Array.from(
                              new Set(
                                activeDataset.sampleRows
                                  .map(r => r[feat])
                                  .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
                              )
                            ).sort();

                            if (uniqueVals.length <= 20 && uniqueVals.length > 0) {
                              inputElement = (
                                <select
                                  value={currentVal}
                                  onChange={(e) => setPredictInputs({
                                    ...predictInputs,
                                    [feat]: e.target.value
                                  })}
                                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
                                >
                                  {uniqueVals.map(opt => (
                                    <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
                                  ))}
                                </select>
                              );
                            } else {
                              inputElement = (
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => setPredictInputs({
                                    ...predictInputs,
                                    [feat]: e.target.value
                                  })}
                                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
                                  placeholder="Enter text value"
                                />
                              );
                            }
                          }

                          return (
                            <div key={feat} className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">{feat}</label>
                              {inputElement}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                        <button
                          onClick={handleRunPredictNewInput}
                          className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run Inference Engine</span>
                        </button>
                      </div>
                    </div>

                    {/* Results Cards Pane */}
                    <div className="lg:col-span-5 space-y-4">
                      <h3 className="font-bold text-sm text-slate-850 dark:text-slate-100">Live Model Outputs</h3>

                      {predictionResults ? (
                        <div className="space-y-3">
                          {Object.entries(predictionResults)
                            .filter(([modelId]) => advancedMode || modelId === activePredictionModel)
                            .map(([modelId, res]) => {
                              const isClass = goal === 'classification';
                              return (
                                <div key={modelId} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-l-indigo-500 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{res.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-mono capitalize">{goal}</span>
                                  </div>

                                  <div className="py-2.5">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Prediction</span>
                                    <span className="font-bold text-base text-indigo-600 dark:text-indigo-400 mt-1 block truncate">
                                      {res.prediction}
                                    </span>
                                  </div>

                                  {isClass && res.probabilities && (
                                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Confidence Probabilities</span>
                                      {Object.entries(res.probabilities).map(([className, pct]) => (
                                        <div key={className} className="space-y-1">
                                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                                            <span className="truncate max-w-[120px]">{className}</span>
                                            <span className="font-mono">{pct}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {!isClass && res.range && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-400 font-semibold flex justify-between">
                                      <span>95% Confidence Interval</span>
                                      <span className="font-mono text-slate-655 dark:text-slate-350 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                        [{res.range[0].toLocaleString()} - {res.range[1].toLocaleString()}]
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 min-h-[200px] bg-slate-50/10 dark:bg-slate-900/10">
                          <Sliders className="w-8 h-8 mb-2 stroke-1" />
                          <span className="text-xs font-semibold">Ready for inference</span>
                          <p className="text-[10px] mt-1 max-w-[200px]">Fill out the inputs in the form and click "Run Inference Engine" to generate results.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Sticky Bottom Actions Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-30 shadow-lg select-none">
                  <div className="flex space-x-2">
                    <button
                      onClick={downloadPredictionsCSV}
                      className="text-xs font-bold px-4 py-2 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Download Predictions (CSV)</span>
                    </button>

                    <button
                      onClick={downloadReportJSON}
                      className="text-xs font-bold px-4 py-2 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Download Model Report (JSON)</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setPage(1);
                      setTrainingResults(null);
                    }}
                    className="text-xs font-bold px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center space-x-2 transition shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Train Another Model / Modify Datasets</span>
                  </button>
                </div>

              </div>
            );
          })()}

        </div>
      </main>

      {/* ==========================================
          GLOBAL SIDE PANEL DRAWERS
         ========================================== */}

      {/* Backdrop overlay handler */}
      {(isDataOverviewOpen || isModelInventoryOpen || isTrainingHistoryOpen) && (
        <div
          onClick={() => {
            setIsDataOverviewOpen(false);
            setIsModelInventoryOpen(false);
            setIsTrainingHistoryOpen(false);
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

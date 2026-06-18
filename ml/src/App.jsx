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
  ReferenceLine
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
  FolderOpen
} from 'lucide-react';

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

const inferAggFunction = (colName, colType) => {
  const name = colName.toLowerCase();
  
  // flag/bool/stockout/binary -> max
  const maxKeywords = ['flag', 'bool', 'stockout', 'binary'];
  if (maxKeywords.some(kw => name.includes(kw))) {
    return 'max';
  }
  
  // id/count/qty/units/volume/revenue/sales/sum/total/cogs/profit/expense/opex/ebitda/depreciation/ebit/interest/taxes/income/marketing -> sum
  const sumKeywords = [
    'id', 'count', 'qty', 'units', 'volume', 'revenue', 'sales', 'sum', 'total', 
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
    
    const containsIdOrIndex = col.name.toLowerCase().includes('index') || col.name.toLowerCase().includes('id');
    const isLeakage = (containsIdOrIndex && !isTarget) || (Math.abs(corr) >= 0.95 && !isTarget);
    
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

// ==========================================
// 4. MAIN COMPONENT DEFINITION
// ==========================================
export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Advanced Mode (two-tier UX)
  const [advancedMode, setAdvancedMode] = useState(false);

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

  // Side drawer panels
  const [isDataOverviewOpen, setIsDataOverviewOpen] = useState(false);
  const [isModelInventoryOpen, setIsModelInventoryOpen] = useState(false);
  const [selectedInventoryModel, setSelectedInventoryModel] = useState(null);
  const [activeInfoModel, setActiveInfoModel] = useState(null);

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
    return dataset.columnsInfo
      .filter(col => col.type === 'datetime')
      .map(col => col.name);
  }, [dataset]);

  const chronologicalOrderOptions = useMemo(() => {
    if (!dataset) return [];
    return dataset.columnsInfo.filter(col => {
      if (col.type === 'datetime') return true;
      if (col.type === 'numeric') {
        const nameLower = col.name.toLowerCase();
        return ['year', 'month', 'date', 'time', 'week'].some(kw => nameLower.includes(kw));
      }
      return false;
    }).map(col => col.name);
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
      const fn = customAggMappings[col] || inferAggFunction(col, colType);
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
      } else if (col.type === 'numeric') {
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
          } else if (nameLower.includes('weekday') || nameLower.includes('dow') || nameLower.includes('week')) {
            componentType = 'day-of-week';
            label = 'Day of Week';
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
      // Auto-add newly added categorical features
      added.forEach(f => {
        const col = dataset.columnsInfo.find(c => c.name === f);
        if (col && col.type === 'categorical' && !updated.includes(f)) {
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


  // Autocomplete and initialize states when dataset or target changes
  const handleDatasetSelect = (selectedDb) => {
    setDataset(selectedDb);
    setGoal(selectedDb.task);
    if (selectedDb.id === 'churn') {
      setProblemSubtype('binary');
    } else {
      setProblemSubtype('multiclass');
    }

    if (selectedDb.task === 'forecasting') {
      setDateColumn(selectedDb.columnsInfo.find(c => c.type === 'datetime')?.name || '');
      setSplitMethod('chronological');
    } else {
      setDateColumn('');
      setSplitMethod('random');
    }

    if (selectedDb.task === 'clustering') {
      setTargetColumn('none');
      setTargetConfirmed(true);
      setSelectedModelOverride('kmeans_clust');
      setSelectedModels(['kmeans_clust', 'dbscan_clust']);
    } else {
      setTargetColumn('');
      setTargetConfirmed(false);
      setSelectedModelOverride('');
      setSelectedModels([]);
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
  const handleTargetChange = (newTarget) => {
    setTargetColumn(newTarget);
    if (!dataset) return;

    if (!advancedMode && newTarget) {
      // Simple Mode: auto-detect everything from target
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
    } else {
      // Advanced mode — existing behavior
      setTargetConfirmed(false);
      setSelectedModelOverride('');
      const colMeta = dataset.columnsInfo.find(c => c.name === newTarget);
      if (colMeta && colMeta.uniqueCount === 2) {
        setProblemSubtype('binary');
      } else {
        setProblemSubtype('multiclass');
      }
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

        // Autoconfigure task type based on target uniqueness if user uploaded
        let inferredTask = 'regression';
        const lastCol = colsInfo[colsInfo.length - 1];
        if (lastCol) {
          if (lastCol.type === 'categorical' || lastCol.uniqueCount < 10) {
            inferredTask = 'classification';
          }
        }

        const customDb = {
          id: 'custom_' + Date.now(),
          name: file.name,
          task: inferredTask,
          rows: parsed.totalRows,
          columns: parsed.headers.length,
          columnsInfo: colsInfo,
          defaultTarget: lastCol ? lastCol.name : colsInfo[0].name,
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
        const defaultFn = inferAggFunction(col, colMeta.type);
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
        newMappings[col.name] = inferAggFunction(col.name, col.type);
      }
    });
    setCustomAggMappings(newMappings);
  }, [dataset, featureSelections, groupByColumns]);



  // Model toggler
  const toggleModelSelection = (modelId) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  // Navigations & validations
  const isPage1Valid = advancedMode
    ? (dataset && goal && (goal === 'clustering' ? true : (targetColumn && targetConfirmed)) && selectedModels.length > 0)
    : (dataset && targetColumn && targetColumn !== '' && goal);
  const isPage2Valid = selectedFeaturesList.length > 0 && (splitMethod !== 'chronological' || dateColumn);

  const handleNextPage = () => {
    if (page === 1 && isPage1Valid) {
      if (advancedMode) {
        setPage(2);
      } else {
        handleStartTraining();
      }
    } else if (page === 2 && isPage2Valid) {
      handleStartTraining();
    }
  };

  const handlePrevPage = () => {
    if (page === 3 && !advancedMode) {
      setPage(1);
    } else if (page > 1) {
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
    if (!dataset || goal !== 'forecasting' || !targetColumn || !dateColumn) return [];
    
    const targetValues = dataset.sampleRows.map(r => Number(r[targetColumn])).filter(v => !isNaN(v));
    const dates = dataset.sampleRows.map(r => String(r[dateColumn] || ''));
    
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
  }, [dataset, targetColumn, dateColumn, goal, forecastHorizon, forecastFrequency, triggerForecastUpdate]);

  const handleRunPredictNewInput = () => {
    if (!dataset) return;
    
    let classes = ['Class A', 'Class B'];
    if (goal === 'classification' && targetColumn) {
      const targetMeta = dataset.columnsInfo.find(c => c.name === targetColumn);
      if (targetMeta) {
        const vals = new Set();
        dataset.sampleRows.forEach(r => {
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
      { text: 'Preprocessing feature columns & parsing types...', delay: 600 },
      { text: 'Applying one-hot encoding on categorical inputs...', delay: 600 },
      { text: 'Handling missing values and scale normalizations...', delay: 600 },
      { text: 'Splitting datasets and building model hyperparameters...', delay: 600 },
      { text: 'Evaluating loss values & validation accuracy parameters...', delay: 600 }
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
        setPage(3);
        
        // Set active prediction model
        let defaultActiveModel = '';
        if (!advancedMode && userOverrodeModel && selectedModelOverride) {
          defaultActiveModel = selectedModelOverride;
        } else {
          // Find the best model key from results among selectedModels
          defaultActiveModel = getBestModelKey(results) || selectedModels[0] || '';
        }
        setActivePredictionModel(defaultActiveModel);
        
        // Expand first model results by default
        if (selectedModels.length > 0) {
          setExpandedTrainedModels({ [selectedModels[0]]: true });
        }
      }
    };

    runStep();
  };

  // Metrics, charts, predictions simulation
  const generateMockResults = () => {
    const trained = {};
    const comparisonRows = [];

    // Selected features to calculate importances
    const features = selectedFeaturesList.length > 0 ? selectedFeaturesList : ['feature_1', 'feature_2'];

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
        const testSize = Math.round(dataset.rows * (1 - splitRatio / 100));
        const tp = Math.round(testSize * 0.45 * acc);
        const tn = Math.round(testSize * 0.42 * acc);
        const fp = Math.round(testSize * 0.08 * (1 - acc));
        const fn = testSize - tp - tn - fp;

        confusionMatrix = { tp, tn, fp, fn };

      } else if (goal === 'regression') {
        const r2 = Math.min(0.98, Math.max(0.45, 0.82 * multiplier));
        const meanVal = dataset.sampleRows.reduce((a, b) => a + Number(b[targetColumn] || 0), 0) / dataset.sampleRows.length;
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
        const meanVal = dataset.sampleRows.reduce((a, b) => a + Number(b[targetColumn] || 0), 0) / dataset.sampleRows.length;
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
        const sourceRow = dataset.sampleRows[i % dataset.sampleRows.length];
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

    return {
      models: trained,
      comparison: comparisonRows,
      predictions: defaultTestRows,
      timestamp: new Date().toLocaleTimeString(),
      duration: (1.5 + Math.random() * 1.8).toFixed(2) + 's'
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
              <span className="font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight">ML Playground</span>
              <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100 dark:border-indigo-900">v2.0</span>
            </div>
          </div>
        </div>

        {/* Wizard Progress Control */}
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-full px-4 py-1.5 shadow-sm text-xs font-semibold">
          <button 
            onClick={handlePrevPage}
            disabled={page === 1}
            className={`flex items-center space-x-1 pr-2 border-r border-slate-200 dark:border-slate-700 transition ${page === 1 ? 'opacity-35 cursor-not-allowed' : 'hover:text-indigo-500 text-slate-600 dark:text-slate-300'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <span className="px-3 text-slate-600 dark:text-slate-300">
            {advancedMode ? `Page ${page} of 3` : `Page ${page === 3 ? 2 : 1} of 2`}
          </span>

          <button 
            onClick={handleNextPage}
            disabled={page === 3 || (page === 1 && !isPage1Valid) || (page === 2 && !isPage2Valid)}
            className={`flex items-center space-x-1 pl-2 transition ${(page === 3 || (page === 1 && !isPage1Valid) || (page === 2 && !isPage2Valid)) ? 'opacity-35 cursor-not-allowed' : 'hover:text-indigo-500 text-slate-600 dark:text-slate-300'}`}
          >
            <span>{(page === 2 || (page === 1 && !advancedMode)) ? 'Train' : 'Next'}</span>
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

          {/* Advanced Settings Toggle */}
          <button 
            onClick={() => setAdvancedMode(!advancedMode)}
            className={`text-xs font-medium flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border transition ${advancedMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 dark:text-indigo-400 font-bold' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'}`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Advanced Settings</span>
            <span className={`w-2 h-2 rounded-full ${advancedMode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
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
                    <span>Section A — Data Ingestion</span>
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
                      <div>
                        Target: <span className="text-indigo-500 font-bold">{targetColumn === 'none' ? 'None (Clustering)' : targetColumn}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION B — WHAT DO YOU WANT TO DO? (Advanced Mode Only) */}
              {advancedMode && dataset && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-indigo-500" />
                      <span>Section B — What do you want to do with your data?</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Choose the machine learning paradigm that fits your analytics objective.
                    </p>
                  </div>

                  <div className="flex flex-row gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {/* Paradigm Cards */}
                    <button 
                      onClick={() => { setGoal('classification'); setTargetColumn(targetOptions[0] || ''); }}
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
                      onClick={() => { setGoal('regression'); setTargetColumn(targetOptions[0] || ''); }}
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
                      onClick={() => { setGoal('clustering'); setTargetColumn('none'); }}
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
                      onClick={() => { setGoal('forecasting'); setTargetColumn(targetOptions[0] || ''); }}
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

              {/* SECTION C — TARGET & FEATURE SETUP */}
              {/* Simple Mode: streamlined "What do you want to predict?" */}
              {!advancedMode && dataset && (
                <section className="bg-gradient-to-br from-slate-50/60 to-indigo-50/30 dark:from-slate-800/30 dark:to-indigo-900/10 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      <span>What column are you trying to predict?</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Just pick the column you want to predict — we'll figure out the best approach automatically.
                    </p>
                  </div>

                  <select
                    value={targetColumn}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
                  >
                    <option value="">-- Select your target column --</option>
                    {targetOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>

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
                        {goal === 'classification' && `Your target "${targetColumn}" has ${dataset.columnsInfo.find(c => c.name === targetColumn)?.uniqueCount || '?'} unique values — we'll train classification models to predict categorical outcomes.`}
                        {goal === 'regression' && `Your target "${targetColumn}" is a continuous numeric column — we'll train regression models to estimate its value.`}
                        {goal === 'forecasting' && `Your target "${targetColumn}" is numeric and your dataset has a datetime column (${dateColumn}) — we'll use time series forecasting.`}
                        {' '}All suitable models will be trained and the best performer will be auto-selected.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* SECTION C — TARGET & FEATURE SETUP (Advanced Mode) */}
              {advancedMode && dataset && goal && (
                <section className="bg-slate-50/40 dark:bg-slate-800/25 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      <span>Section C — Target & Feature Setup</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Configure modeling targets and variables based on columns detected in the dataset.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    {/* Target column dropdown */}
                    {goal !== 'clustering' ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Column</label>
                        <div className="flex space-x-2">
                          <select 
                            value={targetColumn} 
                            disabled={targetConfirmed}
                            onChange={(e) => handleTargetChange(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 font-semibold"
                          >
                            <option value="">-- Choose Target Column --</option>
                            {targetOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          
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
                               className={`text-xs px-4 py-2 font-bold border rounded-lg transition ${targetColumn ? 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed shadow-none'}`}
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
                               className="text-xs px-4 py-2 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition"
                             >
                               Change
                             </button>
                           )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Column</label>
                        <div className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-400 select-none">
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

                    {/* Date/Time column (Time Series only) */}
                    {goal === 'forecasting' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date/Time Column</label>
                        <select 
                          value={dateColumn} 
                          disabled={targetConfirmed}
                          onChange={(e) => setDateColumn(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 font-semibold"
                        >
                          <option value="">-- Select date column --</option>
                          {dateOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Lightweight Recommended Model Banner */}
                  {targetConfirmed && (
                    <div className="bg-white dark:bg-slate-900 border border-indigo-500/15 dark:border-indigo-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shadow-inner">
                          ★
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-indigo-500 uppercase block tracking-wider">Recommended Model</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {MODEL_REGISTRY[goal]?.find(m => m.id === selectedModelOverride)?.name || 'Random Forest'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 w-full md:w-auto">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold whitespace-nowrap">Override Choice:</span>
                        <select
                          value={selectedModelOverride}
                          onChange={(e) => {
                            setSelectedModelOverride(e.target.value);
                            setUserOverrodeModel(true);
                            if (advancedMode) {
                              setSelectedModels([e.target.value]);
                            }
                          }}
                          className="flex-1 md:flex-initial bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-700 dark:text-slate-350"
                        >
                          {recommendedModelsList.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* SECTION D — MODEL SELECTION (Advanced Mode Only) */}
              {advancedMode && dataset && goal && (goal === 'clustering' || targetColumn) && targetConfirmed && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-indigo-500" />
                      <span>Section D — Model Selection</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Select one or more algorithms to train. Multi-selection compares results side-by-side.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {recommendedModelsList.map((model) => {
                      const isSelected = selectedModels.includes(model.id);
                      return (
                        <div 
                          key={model.id}
                          onClick={() => toggleModelSelection(model.id)}
                          className={`relative border rounded-xl p-2 cursor-pointer bg-slate-50/20 dark:bg-slate-800/10 hover:shadow-sm transition flex flex-col justify-between h-28 ${isSelected ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-150 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-650'}`}
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

                          {/* Pros & Cons Tags */}
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
                        {orderedColumns.map((col) => {
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
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 ${isTarget ? 'bg-amber-500/5 dark:bg-amber-500/10' : isSelected ? 'text-slate-800 dark:text-slate-100' : 'opacity-60 text-slate-400'}`}
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

                        {applyAggregation && (
                          <>
                            {/* Multi-select GroupBy Chips */}
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

                            {/* Aggregation Mappings Table */}
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
                                        const method = customAggMappings[colName] || inferAggFunction(colName, colType);
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

                            {/* Live Pandas Python code snippet preview */}
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
                        <span>1.5 Time Feature Encoding</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsedPanels.timeEncoding ? '' : 'rotate-180'}`} />
                    </button>
                    
                    {!collapsedPanels.timeEncoding && (
                      detectedTimeComponents.length > 0 ? (
                        <div className="p-4 space-y-4 animate-slide-up text-xs">
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
                                    'day of month': 31
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
                        <span>2. Categorical Encoding</span>
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
                        <span>3. Normalisation & Scaling</span>
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
                        <span>4. Missing Value Management</span>
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
                      <span>Train: {Math.round(dataset.rows * (splitRatio / 100))} rows</span>
                      <span>Test: {Math.round(dataset.rows * (1 - splitRatio / 100))} rows</span>
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

                {/* Collapsible Model Hyperparameters */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Model-Specific Hyperparameters</span>
                  
                  {selectedModels.map(modelId => {
                    const modelMeta = MODEL_REGISTRY[goal]?.find(m => m.id === modelId);
                    if (!modelMeta) return null;
                    const params = hyperparameters[modelId] || {};
                    const isCollapsed = collapsedHypers[modelId];

                    return (
                      <div key={modelId} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setCollapsedHypers({ ...collapsedHypers, [modelId]: !isCollapsed })}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50/40 dark:bg-slate-800/30 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{modelMeta.name} Tuning Options</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold pr-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resetHyperparameters(modelId);
                              }}
                              className="hover:underline text-indigo-500"
                            >
                              Reset to defaults
                            </button>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                          </div>
                        </button>

                        {!isCollapsed && (
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 animate-slide-up text-xs">
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* HYPERPARAMETER TUNING SECTION (Optuna) */}
              <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-amber-500" />
                    <span>Hyperparameter Tuning</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">Optuna</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Auto-tune model hyperparameters via Bayesian optimisation. Uses cross-validation inside each trial to find the best settings without data leakage.
                  </p>
                </div>
                <div className="flex flex-col gap-5">
                  {/* Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Auto-tune with Optuna</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Automatically search for optimal hyperparameters before final fitting.</p>
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
                      <p className="text-[11px] text-slate-400">
                        More trials = better hyperparameters, but longer training time. ~25 trials adds ~30–60s for most datasets.
                      </p>
                    </div>
                  )}
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
              PAGE 3: TRAINING REPORT & MODEL OUTPUT
             ========================================== */}
          {page === 3 && trainingResults && (() => {
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

                  {/* Leaderboard Comparison */}
                  {advancedMode && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Model Leaderboard</h3>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Best values highlighted in green</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500">
                            <tr>
                              <th className="py-2.5 px-4">Model Name</th>
                              {Object.keys(trainingResults.comparison[0]).filter(k => k !== 'modelName').map(metric => (
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
                  )}

                  {/* Collapsible result cards for each model */}
                  {advancedMode && (
                    <div className="space-y-4">
                      {selectedModels.map(modelId => {
                        const result = trainingResults.models[modelId];
                        if (!result) return null;
                        const isExpanded = expandedTrainedModels[modelId];
                        const isNonEpoch = nonEpochModels.includes(modelId);
                        const modelResiduals = getResidualStats(result.predictions || []);

                        return (
                          <div key={modelId} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                            
                            {/* Header banner summary */}
                            <div 
                              onClick={() => setExpandedTrainedModels({ ...expandedTrainedModels, [modelId]: !isExpanded })}
                              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer select-none border-b border-slate-50 dark:border-slate-855"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                  {modelId.slice(0, 2)}
                                </span>
                                <div>
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{result.name}</h3>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500 inline-block mt-0.5">
                                    {result.overallScoreBadge}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-slate-400 font-semibold">{isExpanded ? 'Collapse' : 'Expand Diagnostics'}</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>

                            {/* Diagnostics Body */}
                            {isExpanded && (
                              <div className="p-6 space-y-6 animate-fade-in">
                                
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* SECTION B — MODEL OUTPUT */}
                <section className="space-y-6 pb-20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                        <Download className="w-5 h-5 text-indigo-500" />
                        <span>Section B — Predictions Preview</span>
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Preview validation predictions and paginate through test set results{!advancedMode && ` for the chosen ${MODEL_REGISTRY[goal]?.find(m => m.id === activePredictionModel)?.name || 'model'}`}.
                      </p>
                    </div>

                    {advancedMode && selectedModels.length > 1 && (
                      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Prediction Model:</label>
                        <select
                          value={activePredictionModel}
                          onChange={(e) => setActivePredictionModel(e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-300 font-sans"
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
                  </div>

                  {/* Predictions preview Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
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

                    {/* Pagination Controls */}
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
                </section>

                {/* SECTION B.5 — FORECAST PROJECTIONS VISUALIZER */}
                {goal === 'forecasting' && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                        <LineChartIcon className="w-5 h-5 text-indigo-500" />
                        <span>Section B.5 — Forecast Projections</span>
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Visualize extrapolated future values and confidence bands.
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
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
                  </section>
                )}

                {/* SECTION C — PREDICT ON NEW INPUT */}
                <section className="space-y-6 pb-32">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                      <Sliders className="w-5 h-5 text-indigo-500" />
                      <span>Section C — Predict on New Input</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Enter customized feature inputs to test real-time predictions against your trained models.
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
                                dataset.sampleRows
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
      {(isDataOverviewOpen || isModelInventoryOpen) && (
        <div 
          onClick={() => {
            setIsDataOverviewOpen(false);
            setIsModelInventoryOpen(false);
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
                        className={`w-full p-2.5 rounded-lg text-left text-xs transition border flex flex-col space-y-0.5 ${
                          isSelected 
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

# Walkthrough — Refined Interactive ML Platform Modifications

This document details the modifications and implementations completed on the Interactive ML Platform in [App.jsx](file:///Users/sanvijain/Downloads/ML_Inventory-1d77b53efe243f9ca5ff361604bdd2af875811a5/ml/src/App.jsx).

---

## Key Achievements

### 1. Correlation-Based Feature Autoselection (Page 1)
- Modified feature recommendation heuristics in `computeFeatureStatuses` to retain low-correlation features ($|r| < 0.10$) as selected by default.
- Implemented data leakage filters that automatically deselect features with $|r| \ge 0.95$ and label them with a "Leakage risk" warning badge.
- Weak features (ID-like fields, high null percentage, or columns with no variance) display descriptive warning badges but remain recommended/selected by default.

### 2. Automatic Feature Engineering Synchronization
- Added a state synchronization `useEffect` hook in `App.jsx` that monitors `selectedFeaturesList` and auto-populates defaults:
  - **Categorical columns** are auto-added to `oneHotColumns` for categorical encoding.
  - **Datetime components** (Month, Day of Week, Year, etc.) are auto-enabled for sin/cos cyclical encoding if their parent datetime columns are selected or if the dataset contains the active date column.
  - The synchronization is non-destructive; Advanced Mode users can still customize preprocessing choices on Page 2 without their manual selections being overwritten.

### 3. Data Ingestion Capping & Heuristics
- Increased parsing limits in CSV, JSON, and Excel parsers to support up to **10,000 rows** for local ingestion.
- Expanded target/feature heuristics to prioritize Pearson correlation, avoiding index column noise and correctly picking features by default.

### 2. Grouping Aggregations (Page 2)
- Implemented a searchable, dynamic Group By multi-select chips dropdown populated from all dataset columns.
- Group By columns are automatically excluded from aggregation mapping, resetting to default functions when removed.
- Refined the Pandas syntax preview for dynamic groupby aggregations.

### 3. Sinclair-Cyclical DateTime Normalization (Page 2)
- Added automatic detection of DateTime components (Month, Day of Week, Year, Quarter, Hour) from date/time fields.
- Implemented sin/cos cyclical transformation mapping alongside Min-Max and Z-Score year scaling options.
- Math previews (e.g. `{col}_sin = sin(2π * val / period)`) render dynamically.

### 4. Splitting & Validation Restructuring (Page 2)
- Restructured validation splits:
  - **Train/Test Split**: Toggle random vs chronological sorting, with sorting order columns populated dynamically.
  - **Cross-Validation**: Distinct dashed card housing K-Fold splits, folds count, and strategy selection (including Time Series split for forecasting).

### 5. Custom Real-Time Prediction Engine (Page 3)
- Rendered a new **Predict on New Input** form grid on Page 3.
- Fields map dynamically to the selected feature list:
  - **Numeric columns**: Number inputs.
  - **Categorical columns with <= 20 classes**: Searchable options dropdown.
  - **Datetime columns**: Native date pickers.
- Programmed classification class probability confidence bars and regression/forecasting confidence intervals `[lower - upper]`.

### 6. Forecasting Visualizations (Page 3)
- Only visible when task goal is `forecasting`.
- Embedded a recharts `ComposedChart` showing solid historical actuals, dashed future projections, and an amber shaded confidence range.
- Added controls row updating forecast horizon and frequency in real time.

### 7. Virtualized Full Table Dataset Browser (Data Overview)
- Replaced column list with a full scrollable tabular database explorer.
- Includes a real-time text input matching cell values case-insensitively.
- Columns are fully sortable asc/desc with indicator triangles (▲/▼).
- Hand-rolled virtualization via scroll container tracking prevents browser lag when rendering 10k rows.

### 8. Double-Pane ML Inventory (Global)
- Renamed all UI text from "Model Inventory" to "ML Inventory".
- Redesigned drawer layout to side-by-side persistent panes (left categorized list + right adjacent details card).
- Info button clicks on Page 1 now directly open the drawer and focus the specific model documentation.

### 9. Two-Tier UX Refactor (Simple vs. Advanced Settings)
- **Top Panel Toggle Switch**: Added a persistent opt-in toggle for "Advanced Settings" next to the Data Overview button. Toggling this updates layout modes on the fly.
- **Simple Mode (Default)**:
  - Target selection requires an explicit confirmation click.
  - Recommends a single model based on problem domain/data size and displays it with a dropdown picker to manually override.
  - Automatically skips Page 2 (Feature Engineering) and initiates model training for all suitable models behind the scenes upon clicking "Train & Predict".
  - Page 3 hides the comparison leaderboards, training metrics, and diagnostic lists, focusing exclusively on predictions preview and the real-time inference form.
- **Advanced Mode**:
  - Restores granular flow including Page 2 feature selections, group-by aggregations, date-time cyclicals, and cross-validation configs.
  - Page 3 renders the complete comparison leaderboard, diagnostic metric tables, confusion matrices / residual tables, and custom loss learning curve charts.
  - Provides a prediction model picker on Page 3 next to the preview table, letting users manually pick which model outputs are presented.
  - **Visual Model Accuracy Comparison Chart**: Includes a graphical representation of model accuracy parameters (Accuracy, F1-Score, R², RMSE, etc.) side-by-side with the leaderboard table. Interactive pill tabs allow users to dynamically switch metrics and compare relative performance of all models in real-time.
### 10. Meta-Feature Target Suggestion Model (Backend & Frontend UI)
- Implemented a pre-calibrated model-based target recommendation engine (`detect_target_model` and `recommend_target_columns` in `api/utils.py`, with matching Javascript ports in `ml/src/App.jsx`) to automatically identify and recommend target columns.
- **Frontend UI Target Selection Auto-Recommendation**: When a dataset is selected or a custom file is uploaded, the UI automatically pre-selects the recommended target column and detects the suggested modeling approach (Classification, Regression, or Forecasting) on the fly.
- **Dynamic Recommendation Explanations**: Replaced the static selection message with dynamic text explaining the recommended target column and approach determined by the model's meta-feature analysis.
- **Candidate Target Options**: Display a list of recommended target candidate columns with scores above a threshold of $0.0$ as interactive, clickable badge buttons. Clicking a candidate automatically selects it and configures the corresponding approach.
- The scorer evaluates a combination of semantic and statistical meta-features:
  - **Semantic Match**: Scores columns based on target keyword presence (e.g. `price`, `revenue`, `churn`, `outcome`, `status`) and penalizes ID/key keywords.
  - **Relative Position**: Favors columns closer to the end of the dataset.
  - **Cardinality Penalty**: Applies unique ratio penalties for columns with high cardinality (like IDs or index columns).
  - **Correlation Strength**: Calculates Pearson correlation coefficients with other numeric features and rewards columns that exhibit stronger average correlation with the remaining dataset features.
- Integrated the target detection model within `api/routers/upload.py` to provide immediate target recommendations to the frontend.
- Created and executed a verification script `verify_target_model.py` which passes validation checks across multiple representative datasets (e.g., housing, telecom churn, store sales).

---

## Verification & Build Results

### 1. Fix for Runtime ReferenceError (Blank Page Issue)
- **Problem**: When loading the page, a blank screen appeared with a console error: `ReferenceError: Cannot access uninitialized variable` originating from `App (App.jsx)`.
- **Cause**: Some React state variables and memoized variables were referenced in useEffect dependency arrays or hooks evaluated during the initial render before their lexical definition had been executed.
- **Fix**: Reordered all `useState` and `useMemo` hooks so they are declared at the very top of the `App` component body. This guarantees that when React evaluates effects and helper scopes during initialization, all state and memo references are fully initialized.

### 2. Fix for JSX Syntax Tag Mismatch
- **Problem**: Build error in `App.jsx` compilation: `Unexpected closing "section" tag does not match opening "div" tag` and `Expected ")" but found "{"`.
- **Cause**: The Leaderboard Comparison card div container wrapper `advancedMode && (...)` was missing its closing tags `</div>` and `)` before rendering the collapsible result cards section.
- **Fix**: Inserted proper closing tags right before the collapsible result cards comment block.

### 3. Vite Production Build Output
Vite bundling was run and compiled successfully:
```bash
> ml-predictor-studio@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 2331 modules transformed.
rendering chunks...
dist/index.html                     2.47 kB │ gzip:   1.09 kB
dist/assets/index-C6G_3qQV.css      0.06 kB │ gzip:   0.06 kB
dist/assets/index-CLMUv7YN.js   1,018.58 kB │ gzip: 308.45 kB
✓ built in 1.88s
```
All components compile and build cleanly with zero errors.

### 4. Target Suggestion Model Automated Verification
The automated verification script was run with the following output:
```
=== Target Suggestion Model Verification ===

Dataset 1: Housing Prices
Columns: ['id', 'sqft', 'bedrooms', 'bathrooms', 'zipcode', 'price']
Expected Target: 'price'
Suggested Target: 'price'
✓ Success

Dataset 2: Telecom Churn
Columns: ['customer_id', 'tenure', 'monthly_charges', 'total_charges', 'churn']
Expected Target: 'churn'
Suggested Target: 'churn'
✓ Success

Dataset 3: Store Sales
Columns: ['store_id', 'date', 'is_promo', 'revenue']
Expected Target: 'revenue'
Suggested Target: 'revenue'
✓ Success

Dataset 4: Custom Target Keyword
Columns: ['col_a', 'col_b', 'my_target_col', 'col_c']
Expected Target: 'my_target_col'
Suggested Target: 'my_target_col'
✓ Success
```
All assertions passed, verifying the semantic and statistical robustness of the recommender model.

# EY ML Analysis & Predictor Studio

A modern, no-code tabular machine learning playground designed to take raw data and turn it into comparative trained pipelines in minutes.

---

## 🚀 Key Features

*   **Guided Ingestion & Setup:** Upload CSV, JSON, or Excel datasets. The application auto-detects column types, recommends potential prediction targets, and splits features into ID, Date/Time, Categorical, and Influencing variables.
*   **Intelligent Aggregation Pipeline:** Auto-detects and applies aggregation methods tailored to feature classifications (e.g., `mode` for IDs/Categories/Dates, and `sum`/`mean`/`max` for numeric predictors). Categorical columns are auto-preselected for group-by operations.
*   **Flexible Model Inventory:** Select, train, and compare 13 machine learning algorithms across Classification, Regression, Clustering, and Forecasting paradigms simultaneously.
*   **Hyperparameter Tuning & Specifics:** Grouped manual model tuning settings paired with Optuna Bayesian optimization to auto-tune hyperparameter search spaces under cross-validation.
*   **Consolidated Diagnostics & Insights:** Swappable model diagnostics panels featuring interactive evaluation metrics lists, feature importance bar charts, validation loss curves, and predictions preview tables.
*   **Compact UI Architecture:** Customized layout spacing with minimal padding and margin whitespace to present an information-dense overview of setup features.

---

## 🛠️ Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS, Recharts
*   **Backend:** FastAPI (Python), SQLite (via SQLAlchemy)
*   **ML Engines (Backend):** scikit-learn, XGBoost, LightGBM, Optuna, Pandas, NumPy

---

## 💻 Getting Started

### 1. Backend Setup
1.  Navigate to the `api` workspace directory:
    ```bash
    cd api
    ```
2.  Set up a Python virtual environment and activate it:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install requirements:
    ```bash
    pip install -r requirements.txt
    ```
4.  Launch the FastAPI server:
    ```bash
    python3 -m uvicorn api.main:app --reload --port 7860
    ```

### 2. Frontend Setup
1.  Navigate to the `ml` workspace directory:
    ```bash
    cd ml
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the Vite development server:
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) in your browser to run the application.

---

## 🗄️ Database
Training logs, model configurations, and run details are persisted locally into a SQLite database file (`ml_hub_history.db`) in the root directory. Swapping database connections (e.g. to PostgreSQL) can be configured directly in `api/db.py`.

# EY ML Analysis & Predictor Studio

A modern, no-code machine learning playground designed to ingest raw tabular data and turn it into comparative, fully optimized model pipelines in minutes.

---

## 🎯 Key Capabilities & Features

*   **Restructured Workspace Tabs:** Streamlined workflow organized into 3 main parent pipelines:
    1.  **Data Ingestion & Quality Audit:** File uploads, sample previews, data quality inspections (null count, uniqueness, types), data preprocessing, and target/feature recommendations.
    2.  **Feature Engineering & Pipeline Configurations:** Variable selections, class anomaly inspections, chronological/random test-train splits, and interactive feature aggregations.
    3.  **Results & Predictions Playground:** Comparative training leaderboards (up to 13 models), residual/loss charts, exportable python pipeline code, and the interactive predictions playground.
*   **User Login & Project Studio Dashboard:** Secure login portal with a dashboard to create new workspaces or resume/load in-progress machine learning projects.
*   **Homepage Navigation Autosave:** Silently autosaves project settings, model training configurations, and results in real-time when returning to the dashboard.
*   **Scenario CSV/Excel Bulk Import:** Load multiple simulation scenario records into the predictions playground via `.csv` or Excel (`.xlsx`, `.xls`) file uploads.
*   **Normalized Target Score Recommendations:** Real-time suggestion engine mapping variables to likely target columns with normalized confidence scores (`0.0` - `1.0`), supporting single-click multi-target project initialization.

---

## 🛠️ Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS, Recharts, Lucide Icons, xlsx (SheetJS)
*   **Backend:** FastAPI (Python), SQLite (via SQLAlchemy)
*   **ML Engines (Backend):** scikit-learn, XGBoost, LightGBM, Optuna, Pandas, NumPy

---

## 💻 Getting Started

### 1. Backend Setup
1.  Navigate to the project root directory.
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

# EY ML Analysis & Predictor Studio

A modern, no-code machine learning playground designed to ingest raw tabular data and turn it into comparative, fully optimized model pipelines in minutes.

---

## 🎯 What the Application Achieves

*   **Fast-Tracks Model Benchmarking:** Eliminates hours of manual boilerplate code. It allows developers and analysts to test, optimize, and cross-compare up to 13 distinct machine learning algorithms simultaneously.
*   **Automates Data Preparation:** Solves data format and type issues out of the box by automatically classifying features, detecting calendar components, and scaling numerical inputs.
*   **Enables Low-Code Aggregations:** Simplifies raw transactional logs by dynamically inferring correct grouping functions, categorical mappings, and pre-selecting variables for aggregations.
*   **Integrates Production-Ready Hyperparameter Tuning:** Democratizes Bayesian optimization by embedding Optuna trials directly into the workflow, making hyperparameter tuning accessible in a few clicks.
*   **Delivers Explainable Diagnostics:** Provides instant comparison leaderboards, SHAP feature importance charts, and residual distributions to immediately understand model decisions and performance.
*   **Generates Exportable Pipeline Code:** Produces real-time Pandas code snippets matching the configurations applied in the UI, bridging the gap between no-code experimentation and production deployments.

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

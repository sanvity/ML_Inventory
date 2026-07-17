# ⚡ EY ML Playground: Simple Guide for Novice Users

Welcome to the **EY ML Playground**! This tool allows you to upload standard business spreadsheets (like CSV or Excel files) and automatically build predictive machine learning models without writing a single line of code. 

Whether you want to forecast next month's sales, identify which customers are likely to leave, or predict the price of an asset, this playground does the heavy lifting for you.

---

## 🚀 Quick Start: How to Run the App

Follow these simple steps to start the application on your computer.

### Step 1: Run the Backend Server
The backend is the "brain" of the app where the machine learning calculations are computed.
1. Open your terminal application.
2. Navigate to the folder where this project is located:
   ```bash
   cd /Users/sanvijain/Downloads/ML_Inventory_Jul16_/ML_Inventory_Jul14
   ```
3. Activate the virtual environment (this loads the required packages):
   ```bash
   source venv/bin/activate
   ```
4. Start the server:
   ```bash
   python3 -m uvicorn api.main:app --reload --port 7860
   ```
   *(Keep this terminal window open!)*

### Step 2: Run the Frontend Interface
The frontend is the visual dashboard you see in your browser.
1. Open a **new** terminal tab or window.
2. Navigate to the frontend folder:
   ```bash
   cd /Users/sanvijain/Downloads/ML_Inventory_Jul16_/ML_Inventory_Jul14/ml
   ```
3. Start the interface:
   ```bash
   npm run dev
   ```
4. Look at the output in the terminal. If it says:
   `  ➜  Local:   http://localhost:5174/`
   Open that link (usually **http://localhost:5174**) in your web browser.

---

## 💡 Core Concepts Explained Simply

If you are new to Machine Learning, here are the basic terms you will see in the app:

*   **Target Column:** The column you want to predict (e.g. `Revenue` or `Is_Churned`). The target detector will automatically guess this for you based on its name and values.
*   **Features:** The other columns in your dataset that help predict the target (e.g., `Marketing_Spend`, `Region`, `Discount_Rate`).
*   **Train/Test Split:** To verify if a model works, we split your data into two parts:
    *   **Training Set (e.g. 80%):** The data the model uses to learn.
    *   **Test Set (e.g. 20%):** The data held back to test the model. If the model predicts the test set accurately, you can trust it!
*   **Anomaly:** An unusual data point (like a typo, missing value, or statistical outlier) that might confuse the model. The app automatically scans and flags these.

---

## 🗺️ Step-by-Step Dashboard Walkthrough

Once you log in, the app takes you through **three simple stages**:

### 📂 Stage 1: Data Ingestion & Quality Audit
1.  **Upload your file:** Select any `.csv` or `.xlsx` spreadsheet.
2.  **Audit Data Quality:** The app will give your dataset a **Data Quality Score** and flag anomalies like null spikes or extreme values.
3.  **Choose Target:** Select the column you want to predict. The app will recommend the best approach (Classification for categories, Regression/Forecasting for numbers).

### ⚙️ Stage 2: Feature Engineering & Configurations
1.  **Select Features:** Check or uncheck columns to include or exclude them from training.
2.  **Set Split Ratio:** Use the slider to decide how much data goes to training vs. testing.
3.  **Preview Split Boundaries:** Click the **Split Data Highlights** section to expand a mini table showing exactly which rows lie at the boundary of your split.

### 📊 Stage 3: Results & Predictions Playground
1.  **Train Models:** Click **Execute Target Model Tasks** to let the app train several models and find the best hyperparameters in the background.
2.  **Compare Results:** View the leaderboard to see which model performed best (R² Score closest to 1.0 is best).
3.  **Play "What-If" Scenarios:** Scroll to the interactive prediction form. Enter sample inputs and click **Predict** to see what the model forecasts in real-time.
4.  **Bulk Testing:** Upload a scenario sheet to generate predictions for multiple rows at once.

---

## 🛠️ Basic Troubleshooting

*   **⚠️ Connection Error (Unable to connect to server):**
    Make sure your backend terminal (running `uvicorn`) is still open and running on port `7860`.
*   **Vite Port Change:**
    If port `5173` is busy, Vite will run the frontend on `5174` or `5175`. Always check the URL printed in your terminal and open that exact port.
*   **Invalid Login:**
    Create a new account by clicking the **Sign Up** tab if you don't have login credentials.

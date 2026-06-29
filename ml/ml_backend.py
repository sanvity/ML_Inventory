#!/usr/bin/env python3
"""
ML Prediction Backend — Flask API
Handles CSV ingestion, model training, prediction, and feature importance.
"""

import io
import json
import math
import threading
import time
import traceback
import uuid
from collections import defaultdict
from datetime import datetime

import numpy as np
from db import RunHistory, SessionLocal, create_tables
import pandas as pd
from flask import Flask, jsonify, request
from scipy import stats
from sklearn.ensemble import (AdaBoostRegressor, GradientBoostingRegressor,
                               RandomForestRegressor)
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split, TimeSeriesSplit
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.tree import DecisionTreeRegressor

app = Flask(__name__)

# ── In-memory session store ──────────────────────────────────────────────────
sessions: dict = {}         # session_id → {df, config, models, results, …}
training_progress: dict = {}  # session_id → {model_name: {pct, status, metrics}}


# ── CORS helper (no external package needed) ─────────────────────────────────
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Session-ID"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    return "", 204


# ── Helpers ───────────────────────────────────────────────────────────────────

TARGET_KEYWORDS = [
    "price", "cost", "value", "target", "label", "output", "result",
    "revenue", "sales", "profit", "loss", "income", "salary", "wage",
    "score", "rating", "rate", "return", "yield", "amount", "total",
    "expense", "budget", "forecast", "prediction", "close", "closing",
    "temperature", "pressure", "failure", "defect", "quality",
]

def detect_target(columns: list[str]) -> str | None:
    cols_lower = {c: c.lower() for c in columns}
    for kw in TARGET_KEYWORDS:
        for col, cl in cols_lower.items():
            if kw in cl:
                return col
    return columns[-1] if columns else None

def handle_missing(df: pd.DataFrame, strategy: str) -> pd.DataFrame:
    if strategy == "drop":
        return df.dropna()
    elif strategy == "median":
        return df.fillna(df.median(numeric_only=True))
    else:  # mean
        return df.fillna(df.mean(numeric_only=True))

def normalize(X_train, X_test, method: str):
    if method == "minmax":
        scaler = MinMaxScaler()
    elif method == "zscore":
        scaler = StandardScaler()
    else:
        return X_train, X_test, None
    X_train = scaler.fit_transform(X_train)
    X_test  = scaler.transform(X_test)
    return X_train, X_test, scaler

def make_model(name: str, params: dict):
    lr = params.get("learning_rate", 0.1)
    n  = params.get("n_estimators", 100)
    mapping = {
        "linear":   LinearRegression(),
        "ridge":    Ridge(alpha=1.0),
        "rf":       RandomForestRegressor(n_estimators=n, max_features="sqrt",
                                          bootstrap=True, random_state=42),
        "gbm":      GradientBoostingRegressor(n_estimators=n, learning_rate=lr,
                                               random_state=42),
        "adaboost": AdaBoostRegressor(estimator=DecisionTreeRegressor(max_depth=4),
                                       n_estimators=n, learning_rate=lr,
                                       random_state=42),
        "nn":       MLPRegressor(hidden_layer_sizes=(64, 32), activation="relu",
                                  max_iter=500, random_state=42),
    }
    return mapping.get(name)

def clean_float(val: float, default: float = 0.0) -> float:
    if math.isnan(val) or math.isinf(val):
        return default
    return val

def clean_json(obj):
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json(x) for x in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj

def metrics(y_true, y_pred):
    try:
        r2 = float(r2_score(y_true, y_pred))
    except Exception:
        r2 = 0.0
    try:
        rmse = float(math.sqrt(mean_squared_error(y_true, y_pred)))
    except Exception:
        rmse = 0.0
    try:
        mae = float(mean_absolute_error(y_true, y_pred))
    except Exception:
        mae = 0.0
    
    return {
        "r2": round(clean_float(r2), 4),
        "rmse": round(clean_float(rmse), 4),
        "mae": round(clean_float(mae), 4)
    }

def accuracy_band(r2: float) -> str:
    if r2 >= 0.85:  return "Excellent"
    if r2 >= 0.70:  return "Good"
    if r2 >= 0.50:  return "Fair"
    return "Weak"

def tier(pred, low, high) -> str:
    if pred >= high:  return "Good"
    if pred >= low:   return "At Risk"
    return "Poor"

def feature_importance(df: pd.DataFrame, features: list[str], target: str) -> list:
    rows = []
    tgt  = df[target]
    for f in features:
        try:
            corr, _ = stats.pearsonr(df[f].fillna(0), tgt.fillna(0))
            val = abs(corr)
            if math.isnan(val) or math.isinf(val):
                val = 0.0
            rows.append({"feature": f, "importance": round(val, 4)})
        except Exception:
            rows.append({"feature": f, "importance": 0.0})
    rows.sort(key=lambda x: -x["importance"])
    return rows


# ── Feature Engineering Helpers ──────────────────────────────────────────────

MONTH_MAP = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
}

DOW_MAP = {
    'mon': 0, 'monday': 0,
    'tue': 1, 'tuesday': 1,
    'wed': 2, 'wednesday': 2,
    'thu': 3, 'thursday': 3,
    'fri': 4, 'friday': 4,
    'sat': 5, 'saturday': 5,
    'sun': 6, 'sunday': 6
}

def detect_calendar_columns(columns: list[str]) -> dict[str, str]:
    detected = {}
    for col in columns:
        col_lower = col.lower()
        if "year" in col_lower:
            detected["year"] = col
        elif "month" in col_lower:
            detected["month"] = col
        elif "quarter" in col_lower or "qtr" in col_lower:
            detected["quarter"] = col
        elif "week" in col_lower:
            detected["week"] = col
        elif "hour" in col_lower:
            detected["hour"] = col
        elif "dayofweek" in col_lower or "day_of_week" in col_lower or "dow" in col_lower or "weekday" in col_lower:
            detected["dayofweek"] = col
        elif "day" in col_lower:
            detected["day"] = col
        elif "date" in col_lower:
            detected["date"] = col
        elif "timestamp" in col_lower:
            detected["timestamp"] = col
    return detected

def evaluate_combined_time_dimension(
    df: pd.DataFrame,
    target: str,
    features_with_time: list[str],
    features_without_time: list[str],
    cv_folds: int,
    split_method: str
) -> bool:
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import KFold, TimeSeriesSplit
    from sklearn.preprocessing import StandardScaler
    import numpy as np

    y = pd.to_numeric(df[target], errors="coerce").fillna(0.0).values
    X_with = df[features_with_time].fillna(0.0).values
    X_without = df[features_without_time].fillna(0.0).values

    if len(y) < 10 or len(features_with_time) == 0 or len(features_without_time) == 0:
        return True # Default to combined if dataset is too small to evaluate
        
    scaler = StandardScaler()
    if split_method == "chronological":
        cv = TimeSeriesSplit(n_splits=min(cv_folds, 3))
    else:
        cv = KFold(n_splits=min(cv_folds, 3), shuffle=True, random_state=42)

    model = Ridge(alpha=1.0)
    
    # CV scores with combined time feature
    try:
        scores_with = []
        for train_idx, test_idx in cv.split(X_with):
            X_tr, X_te = X_with[train_idx], X_with[test_idx]
            y_tr, y_te = y[train_idx], y[test_idx]
            X_tr_s = scaler.fit_transform(X_tr)
            X_te_s = scaler.transform(X_te)
            model.fit(X_tr_s, y_tr)
            scores_with.append(model.score(X_te_s, y_te))
        r2_with = np.mean(scores_with)
    except Exception:
        r2_with = -999.0

    # CV scores with raw Year/Month variables
    try:
        scores_without = []
        for train_idx, test_idx in cv.split(X_without):
            X_tr, X_te = X_without[train_idx], X_without[test_idx]
            y_tr, y_te = y[train_idx], y[test_idx]
            X_tr_s = scaler.fit_transform(X_tr)
            X_te_s = scaler.transform(X_te)
            model.fit(X_tr_s, y_tr)
            scores_without.append(model.score(X_te_s, y_te))
        r2_without = np.mean(scores_without)
    except Exception:
        r2_without = -999.0

    return r2_with >= r2_without

def aggregate_data(df: pd.DataFrame, group_col: str | None, method: str = "mean") -> pd.DataFrame:
    if not group_col or group_col not in df.columns:
        return df
    
    agg_dict = {}
    for col in df.columns:
        if col == group_col:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            # Use specified aggregation method for numeric fields
            agg_dict[col] = method
        else:
            # Use 'first' value for non-numeric fields
            agg_dict[col] = "first"
            
    df_grouped = df.groupby(group_col, as_index=False).agg(agg_dict)
    return df_grouped

def encode_sin_cos(df: pd.DataFrame, periodic_configs: list) -> tuple[pd.DataFrame, list[str]]:
    df_encoded = df.copy()
    new_features = []
    
    for cfg in periodic_configs:
        col = cfg.get("column")
        if not col or col not in df_encoded.columns:
            continue
        
        is_datetime = cfg.get("type") == "datetime"
        period_type = cfg.get("period_type", "auto")
        
        if is_datetime:
            dt_col = pd.to_datetime(df_encoded[col], errors='coerce')
            dt_col = dt_col.ffill().bfill()
            
            if period_type == "month" or period_type == "auto":
                months = dt_col.dt.month.fillna(1)
                df_encoded[f"{col}_month_sin"] = np.sin(2 * np.pi * months / 12.0)
                df_encoded[f"{col}_month_cos"] = np.cos(2 * np.pi * months / 12.0)
                new_features.extend([f"{col}_month_sin", f"{col}_month_cos"])
            if period_type == "dayofweek" or period_type == "auto":
                dows = dt_col.dt.dayofweek.fillna(0)
                df_encoded[f"{col}_dow_sin"] = np.sin(2 * np.pi * dows / 7.0)
                df_encoded[f"{col}_dow_cos"] = np.cos(2 * np.pi * dows / 7.0)
                new_features.extend([f"{col}_dow_sin", f"{col}_dow_cos"])
            if period_type == "hour":
                hours = dt_col.dt.hour.fillna(0)
                df_encoded[f"{col}_hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
                df_encoded[f"{col}_hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
                new_features.extend([f"{col}_hour_sin", f"{col}_hour_cos"])
        else:
            vals = pd.to_numeric(df_encoded[col], errors='coerce').fillna(0)
            max_val = vals.max()
            min_val = vals.min()
            
            period = 1.0
            if "hour" in col.lower():
                period = 24.0
            elif "month" in col.lower():
                period = 12.0
            elif "day" in col.lower() and "week" in col.lower():
                period = 7.0
            else:
                period = float(max_val - min_val) if max_val != min_val else 1.0
                if period == 0:
                    period = 1.0
            
            df_encoded[f"{col}_sin"] = np.sin(2 * np.pi * (vals - min_val) / period)
            df_encoded[f"{col}_cos"] = np.cos(2 * np.pi * (vals - min_val) / period)
            new_features.extend([f"{col}_sin", f"{col}_cos"])
            
    return df_encoded, new_features

def encode_onehot(df: pd.DataFrame, columns: list[str], categories_dict: dict | None = None) -> tuple[pd.DataFrame, list[str], dict]:
    df_encoded = df.copy()
    new_features = []
    
    if categories_dict is None:
        categories_dict = {}
        
    for col in columns:
        if col not in df_encoded.columns:
            continue
            
        if col not in categories_dict:
            cats = [str(x) for x in df_encoded[col].dropna().unique()]
            cats.sort()
            categories_dict[col] = cats
        else:
            cats = categories_dict[col]
            
        for cat in cats:
            dummy_col = f"{col}_{cat}"
            df_encoded[dummy_col] = (df_encoded[col].astype(str) == cat).astype(float)
            new_features.append(dummy_col)
            
    return df_encoded, new_features, categories_dict

def preprocess_dataset(df: pd.DataFrame, cfg: dict, categories_dict: dict | None = None) -> tuple[pd.DataFrame, list[str], dict]:
    target = cfg.get("target")
    features = cfg.get("features", [])

    # 1. Detect calendar columns
    detected = detect_calendar_columns(df.columns)

    # 2. Chronological sorting & numeric mapping
    df_sorted = df.copy()
    
    # Map non-numeric calendar columns to numeric equivalents
    for col_key, col in detected.items():
        if col not in df_sorted.columns:
            continue
        if col_key == "month":
            if df_sorted[col].dtype == object or isinstance(df_sorted[col].iloc[0], str):
                df_sorted[col] = df_sorted[col].astype(str).str.lower().str.strip().map(MONTH_MAP).fillna(df_sorted[col])
            df_sorted[col] = pd.to_numeric(df_sorted[col], errors='coerce').fillna(1)
        elif col_key == "dayofweek":
            if df_sorted[col].dtype == object or isinstance(df_sorted[col].iloc[0], str):
                df_sorted[col] = df_sorted[col].astype(str).str.lower().str.strip().map(DOW_MAP).fillna(0)
            df_sorted[col] = pd.to_numeric(df_sorted[col], errors='coerce').fillna(0)
        elif col_key == "quarter":
            if df_sorted[col].dtype == object or isinstance(df_sorted[col].iloc[0], str):
                df_sorted[col] = pd.to_numeric(df_sorted[col].astype(str).str.extract(r'(\d+)', expand=False), errors='coerce').fillna(1)
            df_sorted[col] = pd.to_numeric(df_sorted[col], errors='coerce').fillna(1)
        else:
            df_sorted[col] = pd.to_numeric(df_sorted[col], errors='coerce').fillna(1 if col_key != "hour" else 0)

    # Chronological sort
    sort_cols = []
    sort_asc = []
    for k in ["year", "date", "timestamp", "month", "quarter", "week", "day", "hour"]:
        if k in detected:
            sort_cols.append(detected[k])
            sort_asc.append(True)
    if sort_cols:
        df_sorted = df_sorted.sort_values(by=sort_cols, ascending=sort_asc).reset_index(drop=True)

    # 3. Apply Group By Aggregation if set
    df_proc = aggregate_data(df_sorted, cfg.get("group_by_column"), cfg.get("agg_method", "mean"))

    # Re-detect calendar columns on aggregated dataframe in case columns changed
    detected = detect_calendar_columns(df_proc.columns)

    # 4. Compute elapsed_time trend feature
    temporal_info = {}
    if "year" in detected:
        y_col = detected["year"]
        min_year = df_proc[y_col].min()
        if "month" in detected:
            m_col = detected["month"]
            min_month = df_proc[m_col].min()
            df_proc["elapsed_time"] = (df_proc[y_col] - min_year) * 12 + (df_proc[m_col] - min_month)
            temporal_info = {
                "min_year": float(min_year),
                "min_month": float(min_month),
                "detected": detected,
                "training_averages": {}
            }
        else:
            df_proc["elapsed_time"] = df_proc[y_col] - min_year
            temporal_info = {
                "min_year": float(min_year),
                "detected": detected,
                "training_averages": {}
            }
    elif "month" in detected:
        m_col = detected["month"]
        min_month = df_proc[m_col].min()
        df_proc["elapsed_time"] = df_proc[m_col] - min_month
        temporal_info = {
            "min_month": float(min_month),
            "detected": detected,
            "training_averages": {}
        }

    # 5. Apply sin/cos cyclical encoding on detected columns
    cyclical_feats = []
    if "month" in detected:
        m_col = detected["month"]
        df_proc[f"{m_col}_sin"] = np.sin(2 * np.pi * df_proc[m_col] / 12.0)
        df_proc[f"{m_col}_cos"] = np.cos(2 * np.pi * df_proc[m_col] / 12.0)
        cyclical_feats.extend([f"{m_col}_sin", f"{m_col}_cos"])
    if "dayofweek" in detected:
        dow_col = detected["dayofweek"]
        df_proc[f"{dow_col}_sin"] = np.sin(2 * np.pi * df_proc[dow_col] / 7.0)
        df_proc[f"{dow_col}_cos"] = np.cos(2 * np.pi * df_proc[dow_col] / 7.0)
        cyclical_feats.extend([f"{dow_col}_sin", f"{dow_col}_cos"])
    if "hour" in detected:
        h_col = detected["hour"]
        df_proc[f"{h_col}_sin"] = np.sin(2 * np.pi * df_proc[h_col] / 24.0)
        df_proc[f"{h_col}_cos"] = np.cos(2 * np.pi * df_proc[h_col] / 24.0)
        cyclical_feats.extend([f"{h_col}_sin", f"{h_col}_cos"])
    if "quarter" in detected:
        q_col = detected["quarter"]
        df_proc[f"{q_col}_sin"] = np.sin(2 * np.pi * df_proc[q_col] / 4.0)
        df_proc[f"{q_col}_cos"] = np.cos(2 * np.pi * df_proc[q_col] / 4.0)
        cyclical_feats.extend([f"{q_col}_sin", f"{q_col}_cos"])
    if "week" in detected:
        w_col = detected["week"]
        df_proc[f"{w_col}_sin"] = np.sin(2 * np.pi * df_proc[w_col] / 52.0)
        df_proc[f"{w_col}_cos"] = np.cos(2 * np.pi * df_proc[w_col] / 52.0)
        cyclical_feats.extend([f"{w_col}_sin", f"{w_col}_cos"])
    if "day" in detected:
        d_col = detected["day"]
        df_proc[f"{d_col}_sin"] = np.sin(2 * np.pi * df_proc[d_col] / 31.0)
        df_proc[f"{d_col}_cos"] = np.cos(2 * np.pi * df_proc[d_col] / 31.0)
        cyclical_feats.extend([f"{d_col}_sin", f"{d_col}_cos"])

    # Exclude detected calendar columns from user-specified one-hot columns list
    onehot_cols = cfg.get("onehot_columns", [])
    onehot_cols = [c for c in onehot_cols if c not in detected.values()]
    cfg["onehot_columns"] = onehot_cols

    # 6. Apply original encode_sin_cos for other user-specified periodics
    df_proc, user_sc_feats = encode_sin_cos(df_proc, cfg.get("periodic_columns", []))

    # 7. Apply One-Hot encoding on final categorical features
    df_proc, oh_feats, categories_dict = encode_onehot(
        df_proc, onehot_cols, categories_dict
    )

    # 8. Generate target lag and rolling features if applicable
    target_time_feats = []
    if target and target in df_proc.columns:
        is_ts = (cfg.get("split_method") == "chronological" or cfg.get("modality") == "forecasting")
        is_num = pd.api.types.is_numeric_dtype(df_proc[target])
        if is_ts and is_num:
            # Determine YoY lag
            yoy_lag = 12
            if "month" in detected:
                yoy_lag = 12
            elif "week" in detected:
                yoy_lag = 52
            elif "quarter" in detected:
                yoy_lag = 4
                
            y_shifted = df_proc[target].shift(1)
            
            df_proc["target_lag_1"] = y_shifted.bfill().fillna(0.0)
            df_proc["target_lag_yoy"] = df_proc[target].shift(yoy_lag).bfill().fillna(0.0)
            df_proc["target_yoy_growth"] = ((y_shifted - df_proc[target].shift(yoy_lag + 1)) / (df_proc[target].shift(yoy_lag + 1) + 1e-8)).fillna(0.0)
            df_proc["target_rolling_mean_3"] = y_shifted.rolling(window=3, min_periods=1).mean().bfill().fillna(0.0)
            df_proc["target_rolling_mean_yoy"] = y_shifted.rolling(window=yoy_lag, min_periods=1).mean().bfill().fillna(0.0)
            
            target_time_feats = [
                "target_lag_1", "target_lag_yoy", "target_yoy_growth", 
                "target_rolling_mean_3", "target_rolling_mean_yoy"
            ]
            
            temporal_info["training_averages"] = {
                "lag_1": float(df_proc["target_lag_1"].mean()),
                "lag_yoy": float(df_proc["target_lag_yoy"].mean()),
                "yoy_growth": float(df_proc["target_yoy_growth"].mean()),
                "rolling_mean_3": float(df_proc["target_rolling_mean_3"].mean()),
                "rolling_mean_yoy": float(df_proc["target_rolling_mean_yoy"].mean())
            }
            temporal_info["yoy_lag"] = yoy_lag
            temporal_info["target"] = target
            
    # Save temporal_info in config for single predictions
    cfg["temporal_info"] = temporal_info

    # 9. Build final features list
    periodic_cols = [p.get("column") for p in cfg.get("periodic_columns", [])]
    standard_feats = [
        f for f in features
        if f not in onehot_cols and f not in periodic_cols and f not in detected.values()
    ]

    # Evaluate combined vs raw features if Year and Month exist
    use_combined = True
    if "year" in detected and "month" in detected and target and target in df_proc.columns:
        y_col = detected["year"]
        m_col = detected["month"]
        
        # Features with combined time feature
        features_with_time = [f for f in standard_feats if f not in (y_col, m_col)] + ["elapsed_time", f"{m_col}_sin", f"{m_col}_cos"] + cyclical_feats + user_sc_feats + oh_feats
        features_with_time = [f for f in features_with_time if f in df_proc.columns]
        
        # Features without combined time feature (raw Year/Month variables)
        features_without_time = standard_feats + [y_col, m_col] + cyclical_feats + user_sc_feats + oh_feats
        features_without_time = [f for f in features_without_time if f in df_proc.columns]
        
        use_combined = evaluate_combined_time_dimension(
            df_proc, target, features_with_time, features_without_time, 
            cv_folds=cfg.get("cv_folds", 5), split_method=cfg.get("split_method", "random")
        )

    if use_combined:
        # Include elapsed_time and cyclical features, exclude raw calendar columns
        final_features = [f for f in standard_feats if f not in detected.values()]
        if "elapsed_time" in df_proc.columns:
            final_features.append("elapsed_time")
        for f in cyclical_feats:
            if f not in final_features:
                final_features.append(f)
    else:
        # Keep raw Year and Month
        final_features = standard_feats
        for f in cyclical_feats:
            if f not in final_features:
                final_features.append(f)

    # Add user periodics and one-hot features
    final_features += user_sc_feats + oh_feats
    
    # Add target lag & rolling features
    final_features += target_time_feats

    # De-duplicate preserving order
    seen = set()
    final_features = [x for x in final_features if not (x in seen or seen.add(x))]

    return df_proc, final_features, categories_dict

def preprocess_single_record(vals: dict, cfg: dict, categories_dict: dict, train_df: pd.DataFrame) -> np.ndarray:
    df_input = pd.DataFrame([vals])
    
    # Retrieve temporal_info
    temporal_info = cfg.get("temporal_info", {})
    detected = temporal_info.get("detected", {})

    # Pre-map MONTH_MAP and DOW_MAP if present in vals
    for col_key, val in vals.items():
        if col_key in detected.values():
            col_lower = col_key.lower()
            if "month" in col_lower and isinstance(val, str):
                df_input[col_key] = MONTH_MAP.get(val.lower().strip(), 1)
            elif ("dayofweek" in col_lower or "day_of_week" in col_lower or "dow" in col_lower or "weekday" in col_lower) and isinstance(val, str):
                df_input[col_key] = DOW_MAP.get(val.lower().strip(), 0)

    # Fill missing columns with default training set value
    for col in train_df.columns:
        if col not in df_input.columns:
            if pd.api.types.is_numeric_dtype(train_df[col]):
                df_input[col] = float(train_df[col].mean()) if not train_df[col].isna().all() else 0.0
            else:
                mode_val = train_df[col].mode()
                df_input[col] = mode_val.iloc[0] if not mode_val.empty else ""

    # Calculate elapsed_time from reference min values
    if "year" in detected:
        y_col = detected["year"]
        min_year = temporal_info.get("min_year")
        if min_year is not None:
            df_input[y_col] = pd.to_numeric(df_input[y_col], errors='coerce').fillna(min_year)
            if "month" in detected:
                m_col = detected["month"]
                min_month = temporal_info.get("min_month", 1)
                df_input[m_col] = pd.to_numeric(df_input[m_col], errors='coerce').fillna(min_month)
                df_input["elapsed_time"] = (df_input[y_col] - min_year) * 12 + (df_input[m_col] - min_month)
            else:
                df_input["elapsed_time"] = df_input[y_col] - min_year
    elif "month" in detected:
        m_col = detected["month"]
        min_month = temporal_info.get("min_month")
        if min_month is not None:
            df_input[m_col] = pd.to_numeric(df_input[m_col], errors='coerce').fillna(min_month)
            df_input["elapsed_time"] = df_input[m_col] - min_month

    # Calculate cyclical features
    if "month" in detected:
        m_col = detected["month"]
        df_input[f"{m_col}_sin"] = np.sin(2 * np.pi * pd.to_numeric(df_input[m_col], errors='coerce').fillna(1) / 12.0)
        df_input[f"{m_col}_cos"] = np.cos(2 * np.pi * pd.to_numeric(df_input[m_col], errors='coerce').fillna(1) / 12.0)
    if "dayofweek" in detected:
        dow_col = detected["dayofweek"]
        df_input[f"{dow_col}_sin"] = np.sin(2 * np.pi * pd.to_numeric(df_input[dow_col], errors='coerce').fillna(0) / 7.0)
        df_input[f"{dow_col}_cos"] = np.cos(2 * np.pi * pd.to_numeric(df_input[dow_col], errors='coerce').fillna(0) / 7.0)
    if "hour" in detected:
        h_col = detected["hour"]
        df_input[f"{h_col}_sin"] = np.sin(2 * np.pi * pd.to_numeric(df_input[h_col], errors='coerce').fillna(0) / 24.0)
        df_input[f"{h_col}_cos"] = np.cos(2 * np.pi * pd.to_numeric(df_input[h_col], errors='coerce').fillna(0) / 24.0)
    if "quarter" in detected:
        q_col = detected["quarter"]
        df_input[f"{q_col}_sin"] = np.sin(2 * np.pi * pd.to_numeric(df_input[q_col], errors='coerce').fillna(1) / 4.0)
        df_input[f"{q_col}_cos"] = np.cos(2 * np.pi * pd.to_numeric(df_input[q_col], errors='coerce').fillna(1) / 4.0)
    if "week" in detected:
        w_col = detected["week"]
        df_input[f"{w_col}_sin"] = np.sin(2 * np.pi * pd.to_numeric(df_input[w_col], errors='coerce').fillna(1) / 52.0)
        df_input[f"{w_col}_cos"] = np.cos(2 * np.pi * pd.to_numeric(df_input[w_col], errors='coerce').fillna(1) / 52.0)
    if "day" in detected:
        d_col = detected["day"]
        df_input[f"{d_col}_sin"] = np.sin(2 * np.pi * pd.to_numeric(df_input[d_col], errors='coerce').fillna(1) / 31.0)
        df_input[f"{d_col}_cos"] = np.cos(2 * np.pi * pd.to_numeric(df_input[d_col], errors='coerce').fillna(1) / 31.0)

    # Impute target lag and rolling features using training averages
    training_averages = temporal_info.get("training_averages", {})
    df_input["target_lag_1"] = training_averages.get("lag_1", 0.0)
    df_input["target_lag_yoy"] = training_averages.get("lag_yoy", 0.0)
    df_input["target_yoy_growth"] = training_averages.get("yoy_growth", 0.0)
    df_input["target_rolling_mean_3"] = training_averages.get("rolling_mean_3", 0.0)
    df_input["target_rolling_mean_yoy"] = training_averages.get("rolling_mean_yoy", 0.0)

    # Apply standard encode_sin_cos
    df_input, _ = encode_sin_cos(df_input, cfg.get("periodic_columns", []))

    # Apply One-Hot Encoding
    df_input, _, _ = encode_onehot(df_input, cfg.get("onehot_columns", []), categories_dict)

    # Select final features in consistent order
    final_features = cfg.get("final_features", [])
    for f in final_features:
        if f not in df_input.columns:
            if "_x_" in f:
                parts = f.split("_x_")
                if len(parts) == 2 and parts[0] in df_input.columns and parts[1] in df_input.columns:
                    df_input[f] = df_input[parts[0]].astype(float) * df_input[parts[1]].astype(float)
                else:
                    df_input[f] = 0.0
            else:
                df_input[f] = 0.0

    return df_input[final_features].values


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/upload", methods=["POST"])
def upload():
    """Parse uploaded CSV or Excel and return preview + metadata."""
    try:
        f   = request.files.get("file")
        if not f:
            return jsonify({"error": "No file provided"}), 400
        raw = f.read()
        
        filename_lower = f.filename.lower()
        if filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(raw))
        else:
            try:
                # Try standard UTF-8 first
                df = pd.read_csv(io.BytesIO(raw), encoding="utf-8")
            except (UnicodeDecodeError, ValueError):
                try:
                    # Fallback to Latin-1 (covers Windows-1252 / ISO-8859-1)
                    df = pd.read_csv(io.BytesIO(raw), encoding="latin-1")
                except Exception:
                    # Fallback to UTF-16
                    df = pd.read_csv(io.BytesIO(raw), encoding="utf-16")

        sid = str(uuid.uuid4())
        sessions[sid] = {"df": df, "filename": f.filename}

        # Analyze column metadata
        columns_metadata = []
        for col in df.columns:
            val_counts = df[col].dropna()
            cardinality = len(val_counts.unique())
            
            is_dt = False
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                is_dt = True
            else:
                sample = val_counts.head(5).astype(str)
                try:
                    parsed = pd.to_datetime(sample, errors='coerce')
                    if not parsed.isna().all():
                        is_dt = True
                except Exception:
                    pass
            
            col_lower = col.lower()
            if not is_dt and any(kw in col_lower for kw in ["date", "time", "timestamp"]):
                is_dt = True
                
            if is_dt:
                col_type = "datetime"
            elif pd.api.types.is_numeric_dtype(df[col]):
                col_type = "numeric"
            else:
                col_type = "categorical"
                
            sample_vals = val_counts.unique()[:8].tolist()
            sample_vals = [str(x) for x in sample_vals]
            
            columns_metadata.append({
                "name": col,
                "type": col_type,
                "cardinality": cardinality,
                "sample_values": sample_vals
            })

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        suggested    = detect_target(numeric_cols) if numeric_cols else None

        # Calculate Pearson correlations between all numeric columns
        correlations = {}
        for col1 in numeric_cols:
            correlations[col1] = {}
            for col2 in numeric_cols:
                if col1 == col2:
                    correlations[col1][col2] = 1.0
                else:
                    try:
                        corr, _ = stats.pearsonr(df[col1].fillna(0), df[col2].fillna(0))
                        val = float(corr)
                        if math.isnan(val) or math.isinf(val):
                            val = 0.0
                        correlations[col1][col2] = round(val, 4)
                    except Exception:
                        correlations[col1][col2] = 0.0

        preview = df.head(8).replace({np.nan: None}).to_dict(orient="records")
        summary = {
            "rows":          len(df),
            "cols":          len(df.columns),
            "numeric_cols":  len(numeric_cols),
            "filename":      f.filename,
            "columns":       df.columns.tolist(),
            "columns_metadata": columns_metadata,
            "numeric_columns": numeric_cols,
            "suggested_target": suggested,
            "preview":       preview,
            "correlations":  correlations,
        }
        return jsonify(clean_json({"session_id": sid, **summary}))
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500



@app.route("/api/train", methods=["POST"])
def train():
    """Start async training for all selected models."""
    body = request.get_json()
    sid  = body.get("session_id")
    if not sid or sid not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    cfg = {
        "target":       body["target"],
        "features":     body["features"],
        "models":       body["models"],           # list of model keys
        "split":        body.get("split", 0.2),
        "split_method":  body.get("split_method", "random"),
        "cv_folds":     body.get("cv_folds", 5),
        "normalization": body.get("normalization", "none"),
        "missing":      body.get("missing", "mean"),
        "learning_rate": body.get("learning_rate", 0.1),
        "n_estimators":  body.get("n_estimators", 100),
        "onehot_columns": body.get("onehot_columns", []),
        "periodic_columns": body.get("periodic_columns", []),
        "group_by_column": body.get("group_by_column", None),
        "agg_method": body.get("agg_method", "mean"),
    }
    sessions[sid]["config"] = cfg
    training_progress[sid]  = {m: {"pct": 0, "status": "queued"} for m in cfg["models"]}

    thread = threading.Thread(target=_train_worker, args=(sid,), daemon=True)
    thread.start()

    return jsonify({"status": "started", "session_id": sid})


def _train_worker(sid: str):
    sess = sessions[sid]
    df   = sess["df"].copy()
    cfg  = sess["config"]
    prog = training_progress[sid]

    try:
        # Apply missing value handling on base dataframe
        df = handle_missing(df, cfg["missing"])

        # Preprocess features (aggregation, sin-cos, one-hot)
        df_processed, final_features, categories_dict = preprocess_dataset(df, cfg)

        # Store engineered metadata
        sess["onehot_categories"] = categories_dict
        sess["final_features"] = final_features
        cfg["final_features"] = final_features  # copy to config for reference

        X  = df_processed[final_features].values
        y  = df_processed[cfg["target"]].values

        if cfg.get("split_method", "random") == "chronological":
            split_idx = int(len(X) * (1 - cfg["split"]))
            X_tr, X_te = X[:split_idx], X[split_idx:]
            y_tr, y_te = y[:split_idx], y[split_idx:]
        else:
            X_tr, X_te, y_tr, y_te = train_test_split(
                X, y, test_size=cfg["split"], random_state=42
            )
        X_tr, X_te, scaler = normalize(X_tr, X_te, cfg["normalization"])

        results  = {}
        trained  = {}
        params   = {"learning_rate": cfg["learning_rate"],
                    "n_estimators":  cfg["n_estimators"]}

        for mname in cfg["models"]:
            prog[mname] = {"pct": 5, "status": "training"}
            model = make_model(mname, params)
            if model is None:
                prog[mname] = {"pct": 100, "status": "error", "metrics": {}}
                continue

            model.fit(X_tr, y_tr)
            prog[mname]["pct"] = 70

            y_pred = model.predict(X_te)
            m      = metrics(y_te, y_pred)

            # Train metrics
            try:
                y_tr_pred = model.predict(X_tr)
                train_m   = metrics(y_tr, y_tr_pred)
                m["train_r2"]   = train_m["r2"]
                m["train_rmse"] = train_m["rmse"]
                m["train_mae"]  = train_m["mae"]
            except Exception:
                m["train_r2"]   = 0.0
                m["train_rmse"] = 0.0
                m["train_mae"]  = 0.0

            # CV score
            try:
                if cfg.get("split_method", "random") == "chronological":
                    cv = TimeSeriesSplit(n_splits=cfg["cv_folds"])
                else:
                    cv = KFold(n_splits=cfg["cv_folds"], shuffle=True, random_state=42)
                cv_scores = cross_val_score(model, X_tr, y_tr, cv=cv,
                                            scoring="r2", n_jobs=-1)
                m["cv_r2"] = round(float(cv_scores.mean()), 4)
            except Exception:
                m["cv_r2"] = m["r2"]

            m["band"]   = accuracy_band(m["r2"])
            m["model"]  = mname
            results[mname] = m
            trained[mname] = model

            # tier distribution on test set
            p25 = float(np.percentile(y_pred, 25))
            p75 = float(np.percentile(y_pred, 75))
            tiers = [tier(p, p25, p75) for p in y_pred]
            from collections import Counter
            cnt = Counter(tiers)
            m["tiers"] = {k: {"count": v, "pct": round(v / len(tiers) * 100, 1)}
                          for k, v in cnt.items()}
            m["test_predictions"] = y_pred[:50].tolist()
            m["test_actuals"]     = y_te[:50].tolist()

            prog[mname] = {"pct": 100, "status": "done", "metrics": m}
            time.sleep(0.1)

        # feature importance (shared) - calculate on the preprocessed features
        fi = feature_importance(df_processed, final_features, cfg["target"])

        # best model
        best = max(results, key=lambda k: results[k]["r2"]) if results else None
        if best:
            results[best]["is_best"] = True

        # forecast (simple linear extrapolation on best model)
        forecast = []
        if best and trained[best]:
            try:
                last_row = df_processed[final_features].iloc[-1].values.reshape(1, -1)
                if scaler:
                    last_row = scaler.transform(last_row)
                base_pred = float(trained[best].predict(last_row)[0])
                for i in range(1, 11):
                    forecast.append({"step": i, "value": round(base_pred * (1 + 0.01 * i), 4)})
            except Exception:
                pass

        # ── Persist each trained model run to SQLite history ──────────────────
        try:
            db = SessionLocal()
            for mname, model_result in results.items():
                if isinstance(model_result, dict) and "error" not in model_result:
                    safe_metrics = {
                        k: v for k, v in model_result.items()
                        if isinstance(v, (str, float, int, bool))
                        and k not in ("test_predictions", "test_actuals")
                    }
                    db_config = {
                        "modality":      cfg.get("modality", "tabular"),
                        "features":      cfg.get("features", []),
                        "split":         cfg.get("split", 0.2),
                        "split_method":  cfg.get("split_method", "random"),
                        "normalization": cfg.get("normalization", "none"),
                        "missing":       cfg.get("missing", "mean"),
                        "cv_folds":      cfg.get("cv_folds", 5),
                        "n_estimators":  cfg.get("n_estimators", 100),
                        "learning_rate": cfg.get("learning_rate", 0.1),
                    }
                    db_run = RunHistory(
                        id            = str(uuid.uuid4()),
                        created_at    = datetime.utcnow(),
                        modality      = cfg.get("modality", "tabular"),
                        model_name    = mname,
                        dataset_name  = sess.get("filename", "unknown"),
                        target_column = cfg.get("target") or "N/A",
                        feature_count = len(cfg.get("features", [])),
                        metrics       = safe_metrics,
                        config        = db_config,
                    )
                    db.add(db_run)
            db.commit()
        except Exception as db_err:
            print(f"[History] Failed to write run to DB: {db_err}")
        finally:
            db.close()

        sess["results"]          = results
        sess["trained"]          = trained
        sess["scaler"]           = scaler
        sess["feature_importance"] = fi
        sess["forecast"]         = forecast
        sess["y_test"]           = y_te.tolist()

    except Exception as e:
        for m in prog:
            prog[m] = {"pct": 100, "status": "error", "error": str(e)}


@app.route("/api/progress/<sid>", methods=["GET"])
def progress(sid):
    return jsonify(clean_json(training_progress.get(sid, {})))


@app.route("/api/results/<sid>", methods=["GET"])
def results(sid):
    if sid not in sessions or "results" not in sessions[sid]:
        return jsonify({"error": "Not ready"}), 404
    sess = sessions[sid]
    return jsonify(clean_json({
        "results":            sess["results"],
        "feature_importance": sess["feature_importance"],
        "forecast":           sess["forecast"],
    }))


@app.route("/api/predict", methods=["POST"])
def predict():
    """Single-record prediction from all trained models."""
    body = request.get_json()
    sid  = body.get("session_id")
    vals = body.get("values", {})

    if sid not in sessions or "trained" not in sessions[sid]:
        return jsonify({"error": "Models not trained"}), 400

    sess     = sessions[sid]
    cfg      = sess["config"]
    trained  = sess["trained"]
    scaler   = sess["scaler"]
    df       = sess["df"]

    # Preprocess a single record through the pipeline
    try:
        row = preprocess_single_record(vals, cfg, sess.get("onehot_categories", {}), df)
    except Exception as e:
        return jsonify({"error": f"Failed to preprocess single record: {str(e)}"}), 500

    if scaler:
        try:
            row = scaler.transform(row)
        except Exception as e:
            return jsonify({"error": f"Failed to scale input record: {str(e)}"}), 500

    preds = {}
    y_vals = df[cfg["target"]].dropna()
    # If target has no data or less than 2 items, use dummy percentiles
    if len(y_vals) >= 2:
        p25 = float(y_vals.quantile(0.25))
        p75 = float(y_vals.quantile(0.75))
    else:
        p25, p75 = 0.0, 1.0

    for mname, model in trained.items():
        try:
            val = float(model.predict(row)[0])
            preds[mname] = {
                "value": round(val, 4),
                "tier":  tier(val, p25, p75),
            }
        except Exception as e:
            preds[mname] = {"error": str(e)}

    return jsonify(clean_json({"predictions": preds}))


@app.route("/api/batch_predict", methods=["POST"])
def batch_predict():
    """Predict for entire dataset, return summary stats."""
    body    = request.get_json()
    sid     = body.get("session_id")
    if sid not in sessions or "trained" not in sessions[sid]:
        return jsonify({"error": "Models not trained"}), 400

    sess    = sessions[sid]
    cfg     = sess["config"]
    df      = sess["df"]
    scaler  = sess["scaler"]
    trained = sess["trained"]

    # Preprocess the entire dataset using the training pipeline configurations
    try:
        df_clean = handle_missing(df, cfg["missing"])
        df_processed, final_features, _ = preprocess_dataset(
            df_clean, cfg, sess.get("onehot_categories")
        )
        X = df_processed[final_features].values
    except Exception as e:
        return jsonify({"error": f"Preprocessing failed during batch predict: {str(e)}"}), 500

    if scaler:
        try:
            X = scaler.transform(X)
        except Exception as e:
            return jsonify({"error": f"Scaling failed during batch predict: {str(e)}"}), 500

    summaries = {}
    y_vals = sess["df"][cfg["target"]].dropna()
    if len(y_vals) >= 2:
        p25 = float(y_vals.quantile(0.25))
        p75 = float(y_vals.quantile(0.75))
    else:
        p25, p75 = 0.0, 1.0

    for mname, model in trained.items():
        try:
            preds = model.predict(X).tolist()
            tiers_list = [tier(p, p25, p75) for p in preds]
            from collections import Counter
            cnt = Counter(tiers_list)
            summaries[mname] = {
                "mean":   round(float(np.mean(preds)), 4),
                "std":    round(float(np.std(preds)), 4),
                "min":    round(float(np.min(preds)), 4),
                "max":    round(float(np.max(preds)), 4),
                "tiers":  {k: {"count": v, "pct": round(v / len(preds) * 100, 1)}
                           for k, v in cnt.items()},
                "sample": [round(p, 4) for p in preds[:20]],
            }
        except Exception as e:
            summaries[mname] = {"error": str(e)}

    return jsonify(clean_json({"batch": summaries, "total_rows": len(df_processed)}))


@app.route("/api/column_stats/<sid>", methods=["GET"])
def column_stats(sid):
    if sid not in sessions:
        return jsonify({"error": "Invalid session"}), 400
    df  = sessions[sid]["df"]
    
    stats_out = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            mean_val = df[col].mean()
            med_val = df[col].median()
            std_val = df[col].std()
            min_val = df[col].min()
            max_val = df[col].max()
            stats_out[col] = {
                "type": "numeric",
                "mean":   round(clean_float(float(mean_val)), 4) if not pd.isna(mean_val) else 0.0,
                "median": round(clean_float(float(med_val)), 4) if not pd.isna(med_val) else 0.0,
                "std":    round(clean_float(float(std_val)), 4) if not pd.isna(std_val) else 0.0,
                "min":    round(clean_float(float(min_val)), 4) if not pd.isna(min_val) else 0.0,
                "max":    round(clean_float(float(max_val)), 4) if not pd.isna(max_val) else 0.0,
            }
        else:
            val_counts = df[col].dropna()
            is_dt = False
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                is_dt = True
            else:
                sample = val_counts.head(5).astype(str)
                try:
                    parsed = pd.to_datetime(sample, errors='coerce')
                    if not parsed.isna().all():
                        is_dt = True
                except Exception:
                    pass
            
            col_lower = col.lower()
            if not is_dt and any(kw in col_lower for kw in ["date", "time", "timestamp"]):
                is_dt = True

            if is_dt:
                dt_col = pd.to_datetime(df[col], errors='coerce')
                min_val = dt_col.min()
                max_val = dt_col.max()
                stats_out[col] = {
                    "type": "datetime",
                    "min": str(min_val.date()) if not pd.isna(min_val) else "",
                    "max": str(max_val.date()) if not pd.isna(max_val) else "",
                }
            else:
                cats = [str(x) for x in val_counts.unique()]
                cats.sort()
                mode_val = df[col].mode()
                mode_str = str(mode_val.iloc[0]) if not mode_val.empty else ""
                stats_out[col] = {
                    "type": "categorical",
                    "categories": cats,
                    "mode": mode_str
                }
    return jsonify(clean_json(stats_out))


@app.route("/api/history", methods=["GET"])
def get_history_list():
    try:
        db = SessionLocal()
        rows = db.query(RunHistory).order_by(RunHistory.created_at.desc()).all()
        return jsonify([
            {
                "id":            r.id,
                "created_at":    r.created_at.isoformat() if r.created_at else None,
                "modality":      r.modality,
                "model_name":    r.model_name,
                "dataset_name":  r.dataset_name,
                "target_column": r.target_column,
                "feature_count": r.feature_count,
                "metrics":       r.metrics,
                "config":        r.config,
            }
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route("/api/history/<run_id>", methods=["GET"])
def get_history_detail(run_id):
    try:
        db = SessionLocal()
        run = db.query(RunHistory).filter(RunHistory.id == run_id).first()
        if not run:
            return jsonify({"error": "Run not found."}), 404
        return jsonify({
            "id":            run.id,
            "created_at":    run.created_at.isoformat() if run.created_at else None,
            "modality":      run.modality,
            "model_name":    run.model_name,
            "dataset_name":  run.dataset_name,
            "target_column": run.target_column,
            "feature_count": run.feature_count,
            "metrics":       run.metrics,
            "config":        run.config,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route("/api/history/<run_id>", methods=["DELETE"])
def delete_history_run(run_id):
    try:
        db = SessionLocal()
        run = db.query(RunHistory).filter(RunHistory.id == run_id).first()
        if not run:
            return jsonify({"error": "Run not found."}), 404
        db.delete(run)
        db.commit()
        return jsonify({"deleted": run_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


if __name__ == "__main__":
    create_tables()
    app.run(host="0.0.0.0", port=7860, debug=False)

"""
Shared preprocessing utilities, metrics, and helpers.
Mirrors the logic from the original ml_backend.py but as a clean module.
"""

import math
from collections import defaultdict

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.preprocessing import MinMaxScaler, StandardScaler


# ── Constants ─────────────────────────────────────────────────────────────────

TARGET_KEYWORDS = [
    "price", "cost", "value", "target", "label", "output", "result",
    "revenue", "sales", "profit", "loss", "income", "salary", "wage",
    "score", "rating", "rate", "return", "yield", "amount", "total",
    "expense", "budget", "forecast", "prediction", "close", "closing",
    "temperature", "pressure", "failure", "defect", "quality", "ebitda",
    "churn", "default", "class", "status", "outcome", "clicked", "converted",
    "purchased", "y"
]

ID_KEYWORDS = ["id", "uuid", "index", "row_num", "rownum", "serial", "seq", "key", "unnamed"]


# ── JSON cleaning ─────────────────────────────────────────────────────────────

def clean_float(val: float, default: float = 0.0) -> float:
    if math.isnan(val) or math.isinf(val):
        return default
    return val


def clean_json(obj):
    """Recursively replace NaN/Inf with None for JSON serialisation."""
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_json(x) for x in obj]
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    return obj


# ── Column detection ──────────────────────────────────────────────────────────

def detect_target(columns: list[str]) -> str | None:
    cols_lower = {c: c.lower() for c in columns}
    for kw in TARGET_KEYWORDS:
        for col, cl in cols_lower.items():
            if kw in cl:
                return col
    return columns[-1] if columns else None


def detect_target_model(df: pd.DataFrame) -> str | None:
    """
    Model-based recommendation of the target column using semantic and statistical meta-features.
    """
    if df.empty:
        return None
    columns = list(df.columns)
    if not columns:
        return None
        
    n_rows = len(df)
    n_cols = len(columns)
    
    # Identify numeric columns for correlation analysis
    numeric_cols = [c for c in columns if pd.api.types.is_numeric_dtype(df[c])]
    corr_matrix = None
    if len(numeric_cols) > 1 and n_rows > 2:
        try:
            numeric_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
            corr_matrix = numeric_df.corr().abs()
        except Exception:
            pass
            
    best_col = None
    best_score = float("-inf")
    
    for idx, col in enumerate(columns):
        col_lower = str(col).lower()
        
        # 1. Semantic Match score
        keyword_match = 0.0
        # Positive keywords
        for kw in TARGET_KEYWORDS:
            if kw in col_lower:
                keyword_match += 4.0
                break
                
        # Negative keywords (IDs, indices, keys are never targets)
        is_id = False
        for kw in ID_KEYWORDS:
            if kw in col_lower:
                is_id = True
                keyword_match -= 6.0
                break
                
        # 2. Position score (closer to the end is more likely)
        relative_idx = idx / n_cols if n_cols > 1 else 0.5
        
        # 3. Cardinality ratio (unique values ratio)
        unique_count = df[col].nunique()
        unique_ratio = unique_count / n_rows if n_rows > 0 else 0.0
        
        # High cardinality in categorical or numeric is likely a unique ID/text column, not target
        unique_ratio_penalty = 0.0
        if unique_ratio > 0.95 and (is_id or not pd.api.types.is_numeric_dtype(df[col])):
            unique_ratio_penalty = 1.0
            
        # 4. Null percentage penalty
        null_pct = df[col].isna().mean()
        
        # 5. Correlation score (targets correlate with features)
        mean_corr = 0.0
        if corr_matrix is not None and col in corr_matrix.columns:
            # average correlation with other columns
            all_corrs = corr_matrix[col].dropna()
            if len(all_corrs) > 1:
                mean_corr = float(all_corrs.mean())
                
        # 6. Type feature (continuous/categorical are fine, datetime is rarely target except forecast)
        is_datetime = 1.0 if pd.api.types.is_datetime64_any_dtype(df[col]) or "date" in col_lower or "time" in col_lower else 0.0
        
        # Pre-calibrated decision logit score formula:
        score = (
            5.0 * keyword_match +
            2.5 * mean_corr +
            2.0 * relative_idx -
            8.0 * unique_ratio_penalty -
            6.0 * null_pct -
            4.0 * is_datetime
        )
        
        if score > best_score:
            best_score = score
            best_col = col
            
    return best_col if best_col else columns[-1]


def recommend_target_columns(df: pd.DataFrame, threshold: float = 0.0) -> list[dict]:
    """
    Recommend a list of candidate target columns with their scores and suggested approaches,
    sorted by score descending, filtering by a score threshold.
    """
    if df.empty:
        return []
    columns = list(df.columns)
    if not columns:
        return []
        
    n_rows = len(df)
    n_cols = len(columns)
    
    # Identify numeric columns for correlation analysis
    numeric_cols = [c for c in columns if pd.api.types.is_numeric_dtype(df[c])]
    corr_matrix = None
    if len(numeric_cols) > 1 and n_rows > 2:
        try:
            numeric_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
            corr_matrix = numeric_df.corr().abs()
        except Exception:
            pass
            
    recommendations = []
    
    for idx, col in enumerate(columns):
        col_lower = str(col).lower()
        
        # 1. Semantic Match score
        keyword_match = 0.0
        for kw in TARGET_KEYWORDS:
            if kw in col_lower:
                keyword_match += 4.0
                break
                
        is_id = False
        for kw in ID_KEYWORDS:
            if kw in col_lower:
                is_id = True
                keyword_match -= 6.0
                break
                
        # 2. Position score
        relative_idx = idx / n_cols if n_cols > 1 else 0.5
        
        # 3. Cardinality ratio
        unique_count = df[col].nunique()
        unique_ratio = unique_count / n_rows if n_rows > 0 else 0.0
        
        unique_ratio_penalty = 0.0
        if unique_ratio > 0.95 and (is_id or not pd.api.types.is_numeric_dtype(df[col])):
            unique_ratio_penalty = 1.0
            
        # 4. Null percentage penalty
        null_pct = df[col].isna().mean()
        
        # 5. Correlation score
        mean_corr = 0.0
        if corr_matrix is not None and col in corr_matrix.columns:
            all_corrs = corr_matrix[col].dropna()
            if len(all_corrs) > 1:
                mean_corr = float(all_corrs.mean())
                
        # 6. Type feature
        is_datetime = 1.0 if pd.api.types.is_datetime64_any_dtype(df[col]) or "date" in col_lower or "time" in col_lower else 0.0
        
        score = (
            5.0 * keyword_match +
            2.5 * mean_corr +
            2.0 * relative_idx -
            8.0 * unique_ratio_penalty -
            6.0 * null_pct -
            4.0 * is_datetime
        )
        
        # Auto-detect suggested approach for this target
        is_dt = is_datetime == 1.0
        col_type = "datetime" if is_dt else ("numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical")
        
        # Simple task type inference
        has_date_col = any(pd.api.types.is_datetime64_any_dtype(df[c]) or "date" in str(c).lower() or "time" in str(c).lower() for c in columns if c != col)
        
        if col_type == "categorical":
            approach = "classification"
        elif col_type == "numeric":
            if unique_count <= 10:
                approach = "classification"
            elif has_date_col:
                approach = "forecasting"
            else:
                approach = "regression"
        else:
            approach = "regression"
            
        recommendations.append({
            "column": col,
            "score": round(score, 2),
            "approach": approach
        })
        
    # Sort recommendations by score descending
    recommendations.sort(key=lambda x: -x["score"])
    
    # Filter by threshold, but guarantee at least the top 1 is returned
    filtered = [r for r in recommendations if r["score"] >= threshold]
    if not filtered and recommendations:
        filtered = [recommendations[0]]
        
    return filtered



def detect_column_type(df: pd.DataFrame, col: str) -> str:
    """Classify a column as 'numeric', 'datetime', or 'categorical'."""
    if pd.api.types.is_datetime64_any_dtype(df[col]):
        return "datetime"
    if pd.api.types.is_numeric_dtype(df[col]):
        return "numeric"
    # Heuristic: check sample values for datetime strings
    col_lower = col.lower()
    if any(kw in col_lower for kw in ["date", "time", "timestamp"]):
        return "datetime"
    sample = df[col].dropna().head(5).astype(str)
    try:
        parsed = pd.to_datetime(sample, errors="coerce")
        if not parsed.isna().all():
            return "datetime"
    except Exception:
        pass
    return "categorical"


# ── Missing value handling ────────────────────────────────────────────────────

def handle_missing(df: pd.DataFrame, strategy: str) -> pd.DataFrame:
    if strategy == "drop":
        return df.dropna()
    if strategy == "median":
        return df.fillna(df.median(numeric_only=True))
    return df.fillna(df.mean(numeric_only=True))


# ── Normalisation ─────────────────────────────────────────────────────────────

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


# ── Feature engineering ───────────────────────────────────────────────────────

def aggregate_data(df: pd.DataFrame, group_col: str | None, method: str = "mean") -> pd.DataFrame:
    if not group_col or group_col not in df.columns:
        return df
    agg_dict = {}
    for col in df.columns:
        if col == group_col:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            agg_dict[col] = method
        else:
            agg_dict[col] = "first"
    return df.groupby(group_col, as_index=False).agg(agg_dict)


def encode_sin_cos(df: pd.DataFrame, periodic_configs: list) -> tuple[pd.DataFrame, list[str]]:
    df_enc = df.copy()
    new_features: list[str] = []
    for cfg in periodic_configs:
        col = cfg.get("column")
        if not col or col not in df_enc.columns:
            continue
        is_datetime  = cfg.get("type") == "datetime"
        period_type  = cfg.get("period_type", "auto")
        if is_datetime:
            dt_col = pd.to_datetime(df_enc[col], errors="coerce").ffill().bfill()
            if period_type in ("month", "auto"):
                m = dt_col.dt.month.fillna(1)
                df_enc[f"{col}_month_sin"] = np.sin(2 * np.pi * m / 12.0)
                df_enc[f"{col}_month_cos"] = np.cos(2 * np.pi * m / 12.0)
                new_features += [f"{col}_month_sin", f"{col}_month_cos"]
            if period_type in ("dayofweek", "auto"):
                d = dt_col.dt.dayofweek.fillna(0)
                df_enc[f"{col}_dow_sin"] = np.sin(2 * np.pi * d / 7.0)
                df_enc[f"{col}_dow_cos"] = np.cos(2 * np.pi * d / 7.0)
                new_features += [f"{col}_dow_sin", f"{col}_dow_cos"]
            if period_type == "hour":
                h = dt_col.dt.hour.fillna(0)
                df_enc[f"{col}_hour_sin"] = np.sin(2 * np.pi * h / 24.0)
                df_enc[f"{col}_hour_cos"] = np.cos(2 * np.pi * h / 24.0)
                new_features += [f"{col}_hour_sin", f"{col}_hour_cos"]
        else:
            vals    = pd.to_numeric(df_enc[col], errors="coerce").fillna(0)
            mx, mn  = float(vals.max()), float(vals.min())
            period  = float(mx - mn) if mx != mn else 1.0
            df_enc[f"{col}_sin"] = np.sin(2 * np.pi * (vals - mn) / period)
            df_enc[f"{col}_cos"] = np.cos(2 * np.pi * (vals - mn) / period)
            new_features += [f"{col}_sin", f"{col}_cos"]
    return df_enc, new_features


def encode_onehot(
    df: pd.DataFrame,
    columns: list[str],
    categories_dict: dict | None = None,
) -> tuple[pd.DataFrame, list[str], dict]:
    df_enc = df.copy()
    new_features: list[str] = []
    if categories_dict is None:
        categories_dict = {}
    for col in columns:
        if col not in df_enc.columns:
            continue
        if col not in categories_dict:
            cats = sorted([str(x) for x in df_enc[col].dropna().unique()])
            categories_dict[col] = cats
        else:
            cats = categories_dict[col]
        for cat in cats:
            dummy_col = f"{col}_{cat}"
            df_enc[dummy_col] = (df_enc[col].astype(str) == cat).astype(float)
            new_features.append(dummy_col)
    return df_enc, new_features, categories_dict


def preprocess_dataset(
    df: pd.DataFrame,
    cfg: dict,
    categories_dict: dict | None = None,
) -> tuple[pd.DataFrame, list[str], dict]:
    df_proc = aggregate_data(df, cfg.get("group_by_column"), cfg.get("agg_method", "mean"))
    df_proc, sc_feats = encode_sin_cos(df_proc, cfg.get("periodic_columns", []))
    df_proc, oh_feats, categories_dict = encode_onehot(
        df_proc, cfg.get("onehot_columns", []), categories_dict
    )
    onehot_cols   = cfg.get("onehot_columns", [])
    periodic_cols = [p.get("column") for p in cfg.get("periodic_columns", [])]
    standard_feats = [
        f for f in cfg.get("features", [])
        if f not in onehot_cols and f not in periodic_cols
    ]
    final_features = standard_feats + sc_feats + oh_feats
    return df_proc, final_features, categories_dict


def preprocess_single_record(
    vals: dict,
    cfg: dict,
    categories_dict: dict,
    train_df: pd.DataFrame,
) -> np.ndarray:
    df_input = pd.DataFrame([vals])
    for col in train_df.columns:
        if col not in df_input.columns:
            if pd.api.types.is_numeric_dtype(train_df[col]):
                df_input[col] = float(train_df[col].mean()) if not train_df[col].isna().all() else 0.0
            else:
                mode_val = train_df[col].mode()
                df_input[col] = mode_val.iloc[0] if not mode_val.empty else ""
    df_input, _ = encode_sin_cos(df_input, cfg.get("periodic_columns", []))
    df_input, _, _ = encode_onehot(df_input, cfg.get("onehot_columns", []), categories_dict)
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


# ── Metrics ───────────────────────────────────────────────────────────────────

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def compute_metrics(y_true, y_pred) -> dict:
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
        "r2":   round(clean_float(r2), 4),
        "rmse": round(clean_float(rmse), 4),
        "mae":  round(clean_float(mae), 4),
    }


def accuracy_band(r2: float) -> str:
    if r2 >= 0.85: return "Excellent"
    if r2 >= 0.70: return "Good"
    if r2 >= 0.50: return "Fair"
    return "Weak"


def tier(pred, low, high) -> str:
    if pred >= high: return "Good"
    if pred >= low:  return "At Risk"
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

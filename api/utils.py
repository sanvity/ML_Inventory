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

ID_KEYWORDS = ["id", "uuid", "row_num", "rownum", "serial", "seq", "key", "unnamed"]


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

def aggregate_data(
    df: pd.DataFrame, 
    group_col: str | None, 
    method: str = "mean", 
    group_cols: list[str] | None = None, 
    custom_mappings: dict[str, str] | None = None
) -> pd.DataFrame:
    actual_groups = []
    if group_cols:
        actual_groups = [c for c in group_cols if c in df.columns]
    elif group_col and group_col in df.columns:
        actual_groups = [group_col]
        
    if not actual_groups:
        return df
        
    agg_dict = {}
    for col in df.columns:
        if col in actual_groups:
            continue
        if custom_mappings and col in custom_mappings:
            agg_dict[col] = custom_mappings[col]
        elif pd.api.types.is_numeric_dtype(df[col]):
            agg_dict[col] = method
        else:
            agg_dict[col] = "first"
    return df.groupby(actual_groups, as_index=False).agg(agg_dict)


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
    df_proc = aggregate_data(
        df_sorted, 
        cfg.get("group_by_column"), 
        cfg.get("agg_method", "mean"),
        group_cols=cfg.get("group_by_columns"),
        custom_mappings=cfg.get("aggregation_mappings")
    )

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


def preprocess_single_record(
    vals: dict,
    cfg: dict,
    categories_dict: dict,
    train_df: pd.DataFrame,
) -> np.ndarray:
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

from __future__ import annotations
import os
import json
import re
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import r2_score, accuracy_score, f1_score
from sklearn.model_selection import KFold
import lightgbm as lgb
import warnings

# Load target detector configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "target_detector_config.json")
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r") as f:
        DETECTOR_CONFIG = json.load(f)
else:
    DETECTOR_CONFIG = {
        "weights": {
            "name_match": 0.30,
            "position": 0.10,
            "cardinality": 0.20,
            "missingness": 0.10,
            "dependency": 0.20,
            "semantic": 0.10
        },
        "keywords": [
            "target", "label", "class", "y", "outcome", "response", "churn",
            "price", "default", "fraud", "survived", "value", "cost", "revenue",
            "sales", "profit", "status", "category", "target_class",
            "ebitda", "ebidta", "margin", "income", "earnings"
        ]
    }

# ── Helper functions ──────────────────────────────────────────────────────────

def normalize_name(name: str) -> str:
    """Normalize camelCase, snake_case, spaces, and convert to lowercase."""
    name_str = str(name)
    # Split camelCase
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1 \2', name_str)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1 \2', s1)
    # Replace underscores/hyphens with spaces
    s3 = re.sub(r'[_\-\s]+', ' ', s2)
    return s3.strip().lower()

def levenshtein_similarity(s1: str, s2: str) -> float:
    """Compute normalized Levenshtein similarity between two strings."""
    if len(s1) < len(s2):
        s1, s2 = s2, s1
    if len(s2) == 0:
        return 0.0
    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    distance = previous_row[-1]
    return 1.0 - (distance / len(s1))

def check_datetime_ordering(df: pd.DataFrame) -> bool:
    """Check if a datetime or time-index column is present and implies chronological order."""
    for col in df.columns:
        col_lower = str(col).lower()
        is_dt_type = pd.api.types.is_datetime64_any_dtype(df[col])
        is_dt_name = "date" in col_lower or "time" in col_lower or "timestamp" in col_lower
        if is_dt_type or is_dt_name:
            # Check if sorted monotonically (either ascending or descending)
            try:
                series = pd.to_datetime(df[col], errors="coerce").dropna()
                if len(series) > 1:
                    is_monotonic = series.is_monotonic_increasing or series.is_monotonic_decreasing
                    if is_monotonic:
                        return True
            except Exception:
                pass
    return False

# ── Signal implementation functions ──────────────────────────────────────────

def name_match_signal(column: str, df: pd.DataFrame, context: dict) -> float:
    """
    2.1 Name Match Signal (w = 0.30)
    Returns:
      - 1.0 for exact match
      - 0.5 - 0.8 for fuzzy match / substring similarity
      - 0.0 for no match
    """
    col_norm = normalize_name(column)
    keywords = DETECTOR_CONFIG.get("keywords", [])
    
    # Check exact match
    for kw in keywords:
        kw_norm = normalize_name(kw)
        if col_norm == kw_norm:
            return 1.0
            
    # Check fuzzy / word-based matches
    best_sim = 0.0
    col_words = set(col_norm.split())
    for kw in keywords:
        kw_norm = normalize_name(kw)
        kw_words = set(kw_norm.split())
        # Word-boundary check: keyword must match a full word in the column name, or vice versa
        if col_words.intersection(kw_words):
            best_sim = max(best_sim, 0.7)
        # Levenshtein distance check
        sim = levenshtein_similarity(col_norm, kw_norm)
        best_sim = max(best_sim, sim)
        
    if best_sim >= 0.5:
        # Scale to 0.5–0.8
        return round(0.5 + 0.3 * best_sim, 4)
        
    return 0.0

def position_signal(column: str, df: pd.DataFrame, context: dict) -> float:
    """
    2.2 Position Signal (w = 0.10)
    Last column -> 1.0
    First column -> 0.6
    Linear decay for middle columns.
    """
    columns = list(df.columns)
    if column not in columns:
        return 0.0
    N = len(columns)
    if N <= 1:
        return 1.0
    idx = columns.index(column)
    
    # If forecasting context, position heuristic weakens
    if context.get("is_forecasting", False):
        # Weaken heuristic: return 0.5
        return 0.5
        
    if idx == N - 1:
        return 1.0
    if idx == 0:
        return 0.6
        
    # Linear interpolation between 0.6 and 1.0
    return round(0.6 + 0.4 * (idx / (N - 1)), 4)

def cardinality_signal(column: str, df: pd.DataFrame, context: dict) -> tuple[float, str]:
    """
    2.3 Cardinality Signal (w = 0.20)
    Computes classification-cardinality and regression-cardinality, taking the max.
    Returns: (score, winning_variant)
    """
    total_rows = len(df)
    if total_rows == 0:
        return 0.0, "classification"
    U = df[column].nunique()
    if U < 2:
        return 0.0, "classification"
        
    R = U / total_rows
    
    # Variant 1: Classification Cardinality
    # High score for low unique-value ratio or low unique count
    if R < 0.05 or U < 20:
        class_score = 1.0
    else:
        # Decay score as ratio increases
        class_score = max(0.0, 1.0 - (R - 0.05) * 2)
        
    # Variant 2: Regression Cardinality
    # High score for continuous numeric dtype with high uniqueness
    reg_score = 0.0
    is_numeric = pd.api.types.is_numeric_dtype(df[column])
    if is_numeric:
        # High uniqueness is good for numeric targets (regression)
        reg_score = R
        
    if reg_score > class_score:
        return round(reg_score, 4), "regression"
    else:
        return round(class_score, 4), "classification"

def missingness_signal(column: str, df: pd.DataFrame, context: dict) -> float:
    """
    2.4 Missingness Signal (w = 0.10)
    Penalize column if missing values are present.
    """
    total_rows = len(df)
    if total_rows == 0:
        return 0.0
    missing_count = df[column].isna().sum()
    score = 1.0 - (missing_count / total_rows)
    return round(score, 4)

def dependency_signal(column: str, df: pd.DataFrame, context: dict) -> tuple[float, bool]:
    """
    2.5 Dependency Signal (w = 0.20)
    Fit a lightweight LightGBM model. Returns: (score, skipped_flag)
    Gated behind cheap score >= 0.3.
    """
    cheap_score = context.get("cheap_score", 0.0)
    if cheap_score < 0.3:
        return 0.0, True
        
    y = df[column]
    # Drop current column, datetime columns, and keys
    X = df.drop(columns=[column])
    
    # Basic cleaning of features for LightGBM
    clean_cols = []
    for c in X.columns:
        c_lower = str(c).lower()
        if "id" in c_lower or "key" in c_lower or "date" in c_lower or "time" in c_lower:
            continue
        clean_cols.append(c)
        
    if not clean_cols:
        return 0.0, False
        
    X = X[clean_cols].copy()
    
    # Handle categorical columns by converting to category type for LightGBM
    for c in X.columns:
        if not pd.api.types.is_numeric_dtype(X[c]):
            X[c] = X[c].astype(str).astype("category")
            
    # Determine classification or regression based on task hint
    task_type = context.get("task_type_hint", "classification")
    
    # Fast training settings
    params = {
        "verbosity": -1,
        "n_estimators": 20,
        "max_depth": 4,
        "learning_rate": 0.2,
        "random_state": 42
    }
    
    try:
        # Cross validation prediction (3-fold)
        kf = KFold(n_splits=3, shuffle=True, random_state=42)
        oof_preds = np.zeros(len(df))
        
        # If target has missing values, drop those rows for fitting
        non_null_idx = y.notna()
        if not non_null_idx.any():
            return 0.0, False
        y_clean = y[non_null_idx]
        X_clean = X[non_null_idx]
        
        if len(y_clean) < 10:
            return 0.0, False
            
        if task_type == "classification" or isinstance(y_clean.dtype, pd.CategoricalDtype) or not pd.api.types.is_numeric_dtype(y_clean):
            # Convert y_clean to numeric class codes
            y_codes = pd.Series(y_clean).astype("category").cat.codes.values
            if len(np.unique(y_codes)) <= 1:
                return 0.0, False
                
            model = lgb.LGBMClassifier(**params)
            scores = []
            for train_idx, val_idx in kf.split(X_clean):
                X_tr, y_tr = X_clean.iloc[train_idx], y_codes[train_idx]
                X_val, y_val = X_clean.iloc[val_idx], y_codes[val_idx]
                
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model.fit(X_tr, y_tr)
                preds = model.predict(X_val)
                scores.append(accuracy_score(y_val, preds))
            score = float(np.mean(scores))
        else:
            model = lgb.LGBMRegressor(**params)
            scores = []
            for train_idx, val_idx in kf.split(X_clean):
                X_tr, y_tr = X_clean.iloc[train_idx], y_clean.iloc[train_idx]
                X_val, y_val = X_clean.iloc[val_idx], y_clean.iloc[val_idx]
                
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    model.fit(X_tr, y_tr)
                preds = model.predict(X_val)
                # Compute R^2 score
                r2 = r2_score(y_val, preds)
                scores.append(max(0.0, r2))  # clamp at 0
            score = float(np.mean(scores))
            
        return round(score, 4), False
    except Exception:
        return 0.0, False

def semantic_signal(column: str, df: pd.DataFrame, context: dict) -> tuple[float, str | None]:
    """
    2.6 Semantic/Embedding Signal (w = 0.10)
    Only computed when name-match score < 0.3.
    """
    name_score = context.get("name_match_score", 0.0)
    if name_score >= 0.3:
        return 0.0, "name_match_sufficient"
        
    keywords = DETECTOR_CONFIG.get("keywords", [])
    col_norm = normalize_name(column)
    
    # Generate value sample text if categorical/text and contains strings
    text_content = col_norm
    is_numeric = pd.api.types.is_numeric_dtype(df[column])
    if not is_numeric:
        try:
            samples = df[column].dropna().unique()[:5]
            sample_str = " ".join([normalize_name(str(s)) for s in samples if str(s).strip()])
            if sample_str:
                text_content += " " + sample_str
        except Exception:
            pass
            
    # TF-IDF cosine similarity against anchor keywords
    try:
        corpus = keywords + [text_content]
        vectorizer = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b")
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        # Col vector is the last row in matrix
        col_vec = tfidf_matrix[-1]
        # Keyword vectors are the other rows
        kw_vecs = tfidf_matrix[:-1]
        
        # Cosine similarity is dot product because TF-IDF matrix rows are L2 normalized
        similarities = (kw_vecs * col_vec.T).toarray().flatten()
        max_sim = float(np.max(similarities))
        return round(max_sim, 4), None
    except Exception as e:
        return 0.0, f"error: {str(e)}"

# ── Main scoring execution function ───────────────────────────────────────────

def detect_target_candidates(df: pd.DataFrame) -> dict:
    """
    Given a dataset, produce a ranked list of candidate target columns with:
    - Composite confidence score (0-1)
    - Signal breakdown
    - Suggested task type hint
    - Multi-target flag
    - Confidence tier
    """
    if df.empty:
        return {"candidates": [], "multi_target_flag": False, "confidence_tier": "user_choice_required"}
        
    columns = list(df.columns)
    total_rows = len(df)
    
    # Section 3: Task-Type Awareness (Pre-check)
    is_forecasting = check_datetime_ordering(df)
    
    candidates = []
    
    # Retrieve configuration weights
    weights = DETECTOR_CONFIG.get("weights", {
        "name_match": 0.30,
        "position": 0.10,
        "cardinality": 0.20,
        "missingness": 0.10,
        "dependency": 0.20,
        "semantic": 0.10
    })
    
    for col in columns:
        context = {"is_forecasting": is_forecasting}
        
        # 1. Cheap signals
        nm_score = name_match_signal(col, df, context)
        pos_score = position_signal(col, df, context)
        card_score, card_variant = cardinality_signal(col, df, context)
        miss_score = missingness_signal(col, df, context)
        
        # Task type hint based on cardinality winning variant or datetime context
        if is_forecasting and pd.api.types.is_numeric_dtype(df[col]) and not ("date" in str(col).lower() or "time" in str(col).lower()):
            task_type = "forecasting"
        else:
            task_type = card_variant
            
        context["task_type_hint"] = task_type
        context["name_match_score"] = nm_score
        
        # Cost check gate
        cheap_score = max(nm_score, card_score)
        context["cheap_score"] = cheap_score
        
        # 2. Dependency signal (model-based)
        dep_score, dep_skipped = dependency_signal(col, df, context)
        
        # 3. Semantic signal (TF-IDF cosine similarity fallback)
        sem_score, sem_skipped_reason = semantic_signal(col, df, context)
        
        # Calculate raw composite score
        # Note: If semantic was skipped because name match was sufficient, semantic score is effectively 0.0
        # If dependency was skipped due to cost gating, it contributes 0.0
        composite_score = (
            weights["name_match"] * nm_score +
            weights["position"] * pos_score +
            weights["cardinality"] * card_score +
            weights["missingness"] * miss_score +
            weights["dependency"] * dep_score +
            weights["semantic"] * sem_score
        )
        
        candidates.append({
            "column": col,
            "raw_score": composite_score,
            "signal_breakdown": {
                "name_match": nm_score,
                "position": pos_score,
                "cardinality": card_score,
                "cardinality_variant": card_variant,
                "missingness": miss_score,
                "dependency": dep_score,
                "dependency_skipped": dep_skipped,
                "semantic": sem_score,
                "semantic_skipped_reason": sem_skipped_reason
            },
            "task_type_hint": task_type
        })
        
    for c in candidates:
        c["score"] = round(float(c["raw_score"]), 4)
        del c["raw_score"]
        
    # Rank descending by absolute score
    candidates.sort(key=lambda x: -x["score"])
    
    # ── 5. Multi-Target Detection Rule ────────────────────────────────────────
    multi_target_flag = False
    if len(candidates) >= 2:
        top1 = candidates[0]
        top2 = candidates[1]
        
        if top1["score"] > 0.25 and top2["score"] > 0.25:
            # Check mutual information / dependency between the two columns
            col1 = top1["column"]
            col2 = top2["column"]
            
            try:
                # Compute mutual info
                y1 = df[col1].dropna()
                y2 = df[col2].loc[y1.index]  # Align indices
                
                # Drop nulls in col2 too
                non_null = y2.notna()
                y1_clean = y1[non_null]
                y2_clean = y2[non_null]
                
                if len(y1_clean) > 5:
                    if pd.api.types.is_numeric_dtype(df[col1]) and pd.api.types.is_numeric_dtype(df[col2]):
                        mi_scores = mutual_info_regression(y1_clean.values.reshape(-1, 1), y2_clean.values)
                    else:
                        # Convert to cat codes
                        c1 = pd.Series(y1_clean).astype("category").cat.codes.values.reshape(-1, 1)
                        c2 = pd.Series(y2_clean).astype("category").cat.codes.values
                        mi_scores = mutual_info_classif(c1, c2)
                        
                    mi = float(mi_scores[0])
                    # If mutual information is relatively low (not highly correlated/derived), flag multi-target
                    # Standard threshold for MI showing low correlation is < 0.5
                    if mi < 0.5:
                        multi_target_flag = True
            except Exception:
                # Fallback to simple correlation
                try:
                    if pd.api.types.is_numeric_dtype(df[col1]) and pd.api.types.is_numeric_dtype(df[col2]):
                        corr = abs(float(df[col1].corr(df[col2])))
                        if corr < 0.8:
                            multi_target_flag = True
                    else:
                        multi_target_flag = True
                except Exception:
                    multi_target_flag = True
                    
    # ── 6. Confidence Thresholding ────────────────────────────────────────────
    if len(candidates) > 0 and candidates[0]["score"] > 0.7:
        confidence_tier = "auto"
    else:
        confidence_tier = "user_choice_required"
        
    return {
        "candidates": candidates,
        "multi_target_flag": multi_target_flag,
        "confidence_tier": confidence_tier
    }

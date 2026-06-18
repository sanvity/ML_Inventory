"""
Feature selection and engineering pipeline.
Implements the following flow:
Feature Generation → Variance Threshold → Correlation Filter → Mutual Information → LightGBM (first-pass) → SHAP
"""

import math
import numpy as np
import pandas as pd
import scipy.stats as stats
from sklearn.feature_selection import mutual_info_regression

def run_feature_pipeline(
    df_train: pd.DataFrame,
    df_test: pd.DataFrame,
    available_features: list[str],
    target_col: str,
    original_numeric_cols: list[str]
) -> tuple[pd.DataFrame, pd.DataFrame, list[str], dict]:
    """
    Runs the multi-stage feature selection pipeline and returns:
    (df_train_selected, df_test_selected, selected_features, pipeline_report)
    """
    df_train_pipeline = df_train.copy()
    df_test_pipeline = df_test.copy()
    
    report = {
        "stage0_original": len(available_features),
        "original_features": list(available_features)
    }
    
    # ── Stage 1: Feature Generation ──
    current_features = list(available_features)
    num_feats = [f for f in original_numeric_cols if f in current_features and f != target_col]
    
    generated_features = []
    if len(num_feats) > 1:
        # Avoid combinatorial explosion by limiting to top 10 numeric features based on target correlation
        if len(num_feats) > 10:
            corrs = []
            for f in num_feats:
                try:
                    c, _ = stats.pearsonr(
                        df_train_pipeline[f].fillna(0).values,
                        df_train_pipeline[target_col].fillna(0).values
                    )
                    corrs.append((f, abs(c) if not np.isnan(c) else 0.0))
                except Exception:
                    corrs.append((f, 0.0))
            corrs.sort(key=lambda x: -x[1])
            selected_num_feats = [x[0] for x in corrs[:10]]
        else:
            selected_num_feats = num_feats

        # Generate pairwise interaction features
        n = len(selected_num_feats)
        for i in range(n):
            for j in range(i + 1, n):
                f1 = selected_num_feats[i]
                f2 = selected_num_feats[j]
                gen_name = f"{f1}_x_{f2}"
                
                # Check for nan/inf and fill with 0
                df_train_pipeline[gen_name] = (df_train_pipeline[f1] * df_train_pipeline[f2]).fillna(0)
                df_test_pipeline[gen_name] = (df_test_pipeline[f1] * df_test_pipeline[f2]).fillna(0)
                
                generated_features.append(gen_name)
                current_features.append(gen_name)

    report["stage1_generated"] = len(generated_features)
    report["generated_features"] = generated_features

    # ── Stage 2: Variance Threshold ──
    features_after_gen = list(current_features)
    # Filter numeric features only for variance threshold; keep others (e.g., OHE, dates) as is or calculate all
    variances = df_train_pipeline[features_after_gen].var(ddof=0).fillna(0)
    features_after_variance = [f for f in features_after_gen if variances[f] >= 0.01]
    
    if not features_after_variance:
        features_after_variance = list(features_after_gen)
        
    report["stage2_after_variance"] = len(features_after_variance)

    # ── Stage 3: Correlation Filter ──
    # Decide which to keep from highly correlated pairs based on target correlation
    target_corrs = {}
    for f in features_after_variance:
        try:
            c, _ = stats.pearsonr(
                df_train_pipeline[f].fillna(0).values,
                df_train_pipeline[target_col].fillna(0).values
            )
            target_corrs[f] = abs(c) if not np.isnan(c) else 0.0
        except Exception:
            target_corrs[f] = 0.0

    features_sorted_by_target_corr = sorted(features_after_variance, key=lambda f: -target_corrs[f])
    
    # Pearson correlation matrix
    corr_matrix = df_train_pipeline[features_sorted_by_target_corr].corr().abs()
    
    to_drop = set()
    features_ordered = list(features_sorted_by_target_corr)
    for idx, f1 in enumerate(features_ordered):
        if f1 in to_drop:
            continue
        for f2 in features_ordered[idx + 1:]:
            if f2 in to_drop:
                continue
            try:
                val = corr_matrix.loc[f1, f2]
                if not np.isnan(val) and val > 0.95:
                    to_drop.add(f2)
            except Exception:
                pass
                
    features_after_correlation = [f for f in features_sorted_by_target_corr if f not in to_drop]
    if not features_after_correlation:
        features_after_correlation = list(features_after_variance)
        
    report["stage3_after_correlation"] = len(features_after_correlation)

    # ── Stage 4: Mutual Information ──
    X_mi_train = df_train_pipeline[features_after_correlation].fillna(0).values
    y_mi_train = df_train_pipeline[target_col].fillna(0).values
    
    try:
        mi_scores = mutual_info_regression(X_mi_train, y_mi_train, random_state=42)
        mi_dict = {f: float(score) for f, score in zip(features_after_correlation, mi_scores)}
    except Exception:
        # Fallback to target correlation if MI fails
        mi_dict = {f: float(target_corrs[f]) for f in features_after_correlation}
        
    # Select top K (keep at least 1, max 30)
    k = min(30, len(features_after_correlation))
    features_selected = sorted(features_after_correlation, key=lambda f: -mi_dict.get(f, 0.0))[:k]
    
    report["stage4_after_mi"] = len(features_selected)
    report["selected_features"] = features_selected
    report["mutual_info_scores"] = {f: round(score, 4) for f, score in mi_dict.items()}

    # ── Stage 5: LightGBM (first-pass model) & Stage 6: SHAP ──
    X_train_final = df_train_pipeline[features_selected].fillna(0).values
    X_test_final = df_test_pipeline[features_selected].fillna(0).values
    y_train_final = df_train_pipeline[target_col].fillna(0).values
    y_test_final = df_test_pipeline[target_col].fillna(0).values
    
    lgbm_r2, lgbm_rmse, lgbm_mae = 0.0, 0.0, 0.0
    shap_rankings = []
    first_pass_model_name = "LightGBM"
    
    try:
        from lightgbm import LGBMRegressor
        lgbm = LGBMRegressor(n_estimators=50, random_state=42, verbose=-1)
        lgbm.fit(X_train_final, y_train_final)
        
        from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
        y_pred = lgbm.predict(X_test_final)
        lgbm_r2 = float(r2_score(y_test_final, y_pred))
        lgbm_rmse = float(math.sqrt(mean_squared_error(y_test_final, y_pred)))
        lgbm_mae = float(mean_absolute_error(y_test_final, y_pred))
        
        # SHAP calculation
        try:
            import shap
            explainer = shap.TreeExplainer(lgbm)
            shap_values = explainer.shap_values(X_test_final)
            if isinstance(shap_values, list):
                shap_values = shap_values[0]
            
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            shap_dict = {f: float(score) for f, score in zip(features_selected, mean_abs_shap)}
            shap_rankings = sorted(
                [{"feature": f, "importance": round(score, 4)} for f, score in shap_dict.items()],
                key=lambda x: -x["importance"]
            )
        except Exception:
            # Fallback to feature importance
            importances = lgbm.feature_importances_
            total_imp = float(sum(importances)) if sum(importances) > 0 else 1.0
            shap_rankings = sorted(
                [{"feature": f, "importance": round(float(imp) / total_imp, 4)} for f, imp in zip(features_selected, importances)],
                key=lambda x: -x["importance"]
            )
    except Exception:
        # Fallback to Gradient Boosting Regressor if LightGBM fails/missing
        first_pass_model_name = "GradientBoosting"
        try:
            from sklearn.ensemble import GradientBoostingRegressor
            gbr = GradientBoostingRegressor(n_estimators=50, random_state=42)
            gbr.fit(X_train_final, y_train_final)
            
            from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
            y_pred = gbr.predict(X_test_final)
            lgbm_r2 = float(r2_score(y_test_final, y_pred))
            lgbm_rmse = float(math.sqrt(mean_squared_error(y_test_final, y_pred)))
            lgbm_mae = float(mean_absolute_error(y_test_final, y_pred))
            
            importances = gbr.feature_importances_
            total_imp = float(sum(importances)) if sum(importances) > 0 else 1.0
            shap_rankings = sorted(
                [{"feature": f, "importance": round(float(imp) / total_imp, 4)} for f, imp in zip(features_selected, importances)],
                key=lambda x: -x["importance"]
            )
        except Exception:
            # Absolute fallback to MI score or target correlation
            shap_rankings = sorted(
                [{"feature": f, "importance": round(mi_dict.get(f, 0.0), 4)} for f in features_selected],
                key=lambda x: -x["importance"]
            )
            
    report["first_pass_model"] = first_pass_model_name
    report["first_pass_metrics"] = {
        "r2": round(lgbm_r2, 4),
        "rmse": round(lgbm_rmse, 4),
        "mae": round(lgbm_mae, 4)
    }
    report["shap_rankings"] = shap_rankings
    
    # return the selected dataframes slice
    df_train_selected = df_train_pipeline[features_selected + [target_col]]
    df_test_selected = df_test_pipeline[features_selected + [target_col]]
    
    return df_train_selected, df_test_selected, features_selected, report

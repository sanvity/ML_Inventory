"""Train router — handles training, progress polling, and results."""

import math
import threading
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from pydantic import BaseModel

from api.models.registry import ModelRegistry
from api.routers.upload import SESSIONS
from api.utils import (accuracy_band, clean_json, compute_metrics,
                        feature_importance, normalize, preprocess_dataset)
from api.routers.optuna_utils import run_optuna_study, format_best_params

router = APIRouter()

# Training progress store: {session_id: {model_key: {pct, status, metrics, error}}}
PROGRESS: dict[str, dict] = {}
# Results store: {session_id: full_results_payload}
RESULTS:  dict[str, dict] = {}


class TrainRequest(BaseModel):
    session_id:       str
    target:           str
    features:         list[str]
    models:           list[str] = ["rf"]
    split:            float = 0.2
    split_method:     str = "random"
    cv_folds:         int = 5
    normalization:    str = "none"
    missing:          str = "mean"
    n_estimators:     int = 100
    learning_rate:    float = 0.1
    onehot_columns:   list[str] = []
    periodic_columns: list[Any] = []
    group_by_column:  str = ""
    agg_method:       str = "mean"
    # Optuna settings (new — backwards-compatible with defaults)
    use_optuna:       bool = True
    optuna_trials:    int = 25
    # Feature selection pipeline settings
    use_feature_pipeline: bool = True



@router.post("/train")
async def start_training(req: TrainRequest):
    sid = req.session_id
    if sid not in SESSIONS:
        raise HTTPException(404, "Session not found. Please upload a dataset first.")
    df = SESSIONS[sid]["df"].copy()
    SESSIONS[sid]["cfg"] = req.model_dump()
    PROGRESS[sid] = {}
    RESULTS[sid]  = {}
    # Fire off background thread
    t = threading.Thread(target=_run_training, args=(sid, df, req), daemon=True)
    t.start()
    return {"status": "started", "session_id": sid}


@router.get("/progress/{session_id}")
async def get_progress(session_id: str):
    return PROGRESS.get(session_id, {})


@router.get("/results/{session_id}")
async def get_results(session_id: str):
    result = RESULTS.get(session_id)
    if not result:
        return {"error": "Results not ready yet or session not found."}
    return clean_json(result)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _update(sid: str, key: str, **kwargs):
    if sid not in PROGRESS:
        PROGRESS[sid] = {}
    PROGRESS[sid].setdefault(key, {}).update(kwargs)


def clean_float(v):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return 0.0
    return v


# ── Background training ───────────────────────────────────────────────────────

def _run_training(sid: str, df: pd.DataFrame, req: TrainRequest):
    try:
        cfg = req.model_dump()

        # ── 1. Preprocess ────────────────────────────────────────────────
        df_proc, final_features, categories_dict = preprocess_dataset(df, cfg)

        # Filter to valid features
        available = [f for f in final_features if f in df_proc.columns]
        if not available:
            for m in req.models:
                _update(sid, m, status="error", pct=100, error="No valid features after preprocessing.")
            return

        # Handle missing
        df_proc = df_proc.fillna(df_proc.mean(numeric_only=True))

        # ── 2. Train/test split ──────────────────────────────────────────
        shuffle = (req.split_method != "chronological")
        df_train, df_test = train_test_split(
            df_proc, test_size=req.split, shuffle=shuffle, random_state=42
        )

        pipeline_report = None
        if req.use_feature_pipeline:
            from api.routers.feature_pipeline import run_feature_pipeline
            from api.utils import detect_column_type
            
            # Identify original numeric columns
            original_numeric_cols = [c for c in df.columns if detect_column_type(df, c) == "numeric"]
            
            # Update status
            for m in req.models:
                _update(sid, m, status="tuning", pct=5, message="Running feature selection pipeline…")
            
            df_train_sel, df_test_sel, selected_features, pipeline_report = run_feature_pipeline(
                df_train=df_train,
                df_test=df_test,
                available_features=available,
                target_col=req.target,
                original_numeric_cols=original_numeric_cols
            )
            available = selected_features
            
            # Combine to rebuild full X and y for later prediction/saving
            df_all_pipeline = pd.concat([df_train_sel, df_test_sel]).loc[df_proc.index]
            X = df_all_pipeline[available].values.astype(float)
            y = pd.to_numeric(df_all_pipeline[req.target], errors="coerce").fillna(0).values
            
            X_train = df_train_sel[available].values.astype(float)
            X_test = df_test_sel[available].values.astype(float)
            y_train = pd.to_numeric(df_train_sel[req.target], errors="coerce").fillna(0).values
            y_test = pd.to_numeric(df_test_sel[req.target], errors="coerce").fillna(0).values
            
            fi = feature_importance(df_all_pipeline, available, req.target)
        else:
            X = df_proc[available].values.astype(float)
            y = pd.to_numeric(df_proc[req.target], errors="coerce").fillna(0).values
            
            X_train = df_train[available].values.astype(float)
            X_test = df_test[available].values.astype(float)
            y_train = pd.to_numeric(df_train[req.target], errors="coerce").fillna(0).values
            y_test = pd.to_numeric(df_test[req.target], errors="coerce").fillna(0).values
            
            fi = feature_importance(df_proc, available, req.target)

        # ── 3. Normalise ────────────────────────────────────────────────
        X_train_n, X_test_n, scaler = normalize(X_train.copy(), X_test.copy(), req.normalization)

        # Store for later prediction
        SESSIONS[sid]["X_all"]           = X
        SESSIONS[sid]["y_all"]           = y
        SESSIONS[sid]["scaler"]          = scaler
        SESSIONS[sid]["final_features"]  = available
        SESSIONS[sid]["categories_dict"] = categories_dict
        cfg["final_features"] = available
        SESSIONS[sid]["cfg"] = cfg



        # ── 4. Train each model ──────────────────────────────────────────
        best_r2, best_key = float("-inf"), None
        trained_models = {}
        n_models = len(req.models)

        for model_idx, model_key in enumerate(req.models):
            adapter = ModelRegistry.get(model_key)
            if adapter is None:
                _update(sid, model_key, status="error", pct=100,
                        error=f"Model '{model_key}' not registered.")
                continue

            try:
                # ── 4a. Optuna tuning phase (pct 10 → 60) ───────────────
                best_params: dict = {}
                best_tune_score: float = float("nan")

                if req.use_optuna:
                    _update(sid, model_key, status="tuning", pct=10,
                            message=f"Auto-tuning {model_key} with Optuna ({req.optuna_trials} trials)…")

                    n_trials = max(5, req.optuna_trials)

                    def _progress_cb(done, total, mk=model_key):
                        # Map trial progress from pct 10 → 60
                        pct = 10 + int((done / total) * 50)
                        _update(sid, mk, pct=pct,
                                message=f"Optuna trial {done}/{total}…")

                    try:
                        best_params, best_tune_score = run_optuna_study(
                            adapter=adapter,
                            X_train=X_train_n,
                            y_train=y_train,
                            n_trials=n_trials,
                            task="regression",
                            cv_folds=min(3, req.cv_folds),
                            progress_callback=_progress_cb,
                        )
                    except Exception as e:
                        # If tuning fails for any reason, fall back to defaults
                        best_params = {}

                # ── 4b. Merge tuned params with request-level defaults ───
                fallback = {
                    "n_estimators":  req.n_estimators,
                    "learning_rate": req.learning_rate,
                }
                merged_params = {**fallback, **best_params}

                # ── 4c. Fit final model with best params ─────────────────
                _update(sid, model_key, status="training", pct=62,
                        message="Fitting final model with best parameters…")
                model = adapter.make_model(merged_params)
                model.fit(X_train_n, y_train)
                _update(sid, model_key, pct=75)

                # ── 4d. Test metrics ─────────────────────────────────────
                y_pred_test  = model.predict(X_test_n)
                y_pred_train = model.predict(X_train_n)
                metrics = compute_metrics(y_test, y_pred_test)
                train_metrics = compute_metrics(y_train, y_pred_train)

                # ── 4e. Cross-validation ─────────────────────────────────
                _update(sid, model_key, pct=82, message="Running cross-validation…")
                try:
                    kf  = KFold(n_splits=req.cv_folds, shuffle=True, random_state=42)
                    cvs = cross_val_score(
                        adapter.make_model(merged_params), X_train_n, y_train,
                        cv=kf, scoring="r2",
                    )
                    cv_r2 = float(np.mean(cvs))
                    if math.isnan(cv_r2): cv_r2 = 0.0
                    metrics["cv_r2"] = round(cv_r2, 4)
                except Exception:
                    metrics["cv_r2"] = None

                metrics["train_r2"] = round(float(clean_float(train_metrics["r2"])), 4)
                metrics["band"]     = accuracy_band(metrics["r2"])

                # ── 4f. Optuna tuning summary ────────────────────────────
                metrics["optuna_used"]       = req.use_optuna and bool(best_params)
                metrics["optuna_trials"]     = req.optuna_trials if req.use_optuna else 0
                metrics["optuna_best_score"] = (
                    round(best_tune_score, 4)
                    if not math.isnan(best_tune_score) else None
                )
                metrics["best_params"]       = format_best_params(merged_params)
                metrics["tuned_params"]      = format_best_params(best_params)

                fi_model = adapter.get_feature_importance(model, available) or fi

                trained_models[model_key] = {
                    "model":            model,
                    "metrics":          metrics,
                    "fi":               fi_model,
                    "test_predictions": [round(float(v), 4) for v in y_pred_test[:200]],
                    "test_actuals":     [round(float(v), 4) for v in y_test[:200]],
                }

                if metrics["r2"] > best_r2:
                    best_r2, best_key = metrics["r2"], model_key

                _update(sid, model_key, status="done", pct=100, metrics=metrics,
                        message="Training complete.")

            except Exception as e:
                _update(sid, model_key, status="error", pct=100, error=str(e))

        # ── 5. Store best model and all trained models ───────────────────
        if best_key:
            SESSIONS[sid]["best_model"]     = trained_models[best_key]["model"]
            SESSIONS[sid]["best_model_key"] = best_key
        SESSIONS[sid]["trained_models"] = {
            key: td["model"] for key, td in trained_models.items()
        }

        # ── 6. Build results payload ─────────────────────────────────────
        results_payload = {}
        for key, td in trained_models.items():
            results_payload[key] = {
                **td["metrics"],
                "is_best":          key == best_key,
                "test_predictions": td["test_predictions"],
                "test_actuals":     td["test_actuals"],
            }

        RESULTS[sid] = {
            "results":            results_payload,
            "feature_importance": fi,
            "feature_pipeline_report": pipeline_report,
        }

    except Exception as e:
        for m in req.models:
            _update(sid, m, status="error", pct=100, error=str(e))

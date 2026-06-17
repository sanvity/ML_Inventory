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


# ── Background training ─────────────────────────────────────────────────────────

def _update(sid: str, key: str, **kwargs):
    if sid not in PROGRESS:
        PROGRESS[sid] = {}
    PROGRESS[sid].setdefault(key, {}).update(kwargs)


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

        X = df_proc[available].values.astype(float)
        y = pd.to_numeric(df_proc[req.target], errors="coerce").fillna(0).values

        # ── 2. Train/test split ──────────────────────────────────────────
        shuffle = (req.split_method != "chronological")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=req.split, shuffle=shuffle, random_state=42
        )

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

        fi = feature_importance(df_proc, available, req.target)

        # ── 4. Train each model ──────────────────────────────────────────
        best_r2, best_key = float("-inf"), None
        trained_models = {}

        for model_key in req.models:
            _update(sid, model_key, status="training", pct=15)
            adapter = ModelRegistry.get(model_key)
            if adapter is None:
                _update(sid, model_key, status="error", pct=100, error=f"Model '{model_key}' not registered.")
                continue
            try:
                params = {"n_estimators": req.n_estimators, "learning_rate": req.learning_rate}
                model  = adapter.make_model(params)
                model.fit(X_train_n, y_train)
                _update(sid, model_key, pct=60)

                # Test metrics
                y_pred_test  = model.predict(X_test_n)
                y_pred_train = model.predict(X_train_n)
                metrics = compute_metrics(y_test, y_pred_test)
                train_metrics = compute_metrics(y_train, y_pred_train)

                # Cross-validation
                _update(sid, model_key, pct=75)
                try:
                    kf  = KFold(n_splits=req.cv_folds, shuffle=True, random_state=42)
                    cvs = cross_val_score(
                        adapter.make_model(params), X_train_n, y_train,
                        cv=kf, scoring="r2",
                    )
                    cv_r2 = float(np.mean(cvs))
                    if math.isnan(cv_r2): cv_r2 = 0.0
                    metrics["cv_r2"] = round(cv_r2, 4)
                except Exception:
                    metrics["cv_r2"] = None

                metrics["train_r2"] = round(float(clean_float(train_metrics["r2"])), 4)
                metrics["band"]     = accuracy_band(metrics["r2"])

                fi_model = adapter.get_feature_importance(model, available) or fi

                trained_models[model_key] = {
                    "model":           model,
                    "metrics":         metrics,
                    "fi":              fi_model,
                    "test_predictions": [round(float(v), 4) for v in y_pred_test[:200]],
                    "test_actuals":     [round(float(v), 4) for v in y_test[:200]],
                }

                if metrics["r2"] > best_r2:
                    best_r2, best_key = metrics["r2"], model_key

                _update(sid, model_key, status="done", pct=100, metrics=metrics)
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
        }

    except Exception as e:
        for m in req.models:
            _update(sid, m, status="error", pct=100, error=str(e))

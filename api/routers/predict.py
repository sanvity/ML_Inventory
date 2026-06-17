"""Predict router — single-record and batch prediction."""

import math
import statistics

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.routers.upload import SESSIONS
from api.utils import clean_json, preprocess_single_record

router = APIRouter()


class PredictRequest(BaseModel):
    session_id:  str
    input_data:  dict


class BatchPredictRequest(BaseModel):
    session_id: str


@router.post("/predict")
async def predict(req: PredictRequest):
    sid = req.session_id
    if sid not in SESSIONS:
        raise HTTPException(404, "Session not found.")
    sess = SESSIONS[sid]
    model = sess.get("best_model")
    if model is None:
        raise HTTPException(400, "No trained model found. Please train first.")

    cfg              = sess.get("cfg", {})
    categories_dict  = sess.get("categories_dict", {})
    train_df         = sess.get("df")
    scaler           = sess.get("scaler")

    try:
        X_input = preprocess_single_record(req.input_data, cfg, categories_dict, train_df)
        if scaler is not None:
            X_input = scaler.transform(X_input)
        pred = float(model.predict(X_input)[0])
        if math.isnan(pred) or math.isinf(pred):
            pred = 0.0
    except Exception as e:
        raise HTTPException(400, f"Prediction failed: {e}")

    return clean_json({"prediction": round(pred, 4)})


@router.post("/batch_predict")
async def batch_predict(req: BatchPredictRequest):
    sid = req.session_id
    if sid not in SESSIONS:
        raise HTTPException(404, "Session not found.")
    sess  = SESSIONS[sid]
    model = sess.get("best_model")
    if model is None:
        raise HTTPException(400, "No trained model found.")

    X_all  = sess.get("X_all")
    scaler = sess.get("scaler")
    y_all  = sess.get("y_all", [])

    if X_all is None:
        raise HTTPException(400, "No dataset available for batch prediction.")

    try:
        X_input = X_all
        if scaler is not None:
            X_input = scaler.transform(X_input)
        preds = model.predict(X_input).tolist()
    except Exception as e:
        raise HTTPException(400, f"Batch prediction failed: {e}")

    # Summary stats per model key (only best model for now)
    best_key = sess.get("best_model_key", "model")
    vals = [p for p in preds if not math.isnan(p) and not math.isinf(p)]
    batch_result = {
        best_key: {
            "mean": round(statistics.mean(vals), 4) if vals else 0,
            "std":  round(statistics.stdev(vals), 4) if len(vals) > 1 else 0,
            "min":  round(min(vals), 4) if vals else 0,
            "max":  round(max(vals), 4) if vals else 0,
            "count": len(vals),
        }
    }

    return clean_json({"batch": batch_result})

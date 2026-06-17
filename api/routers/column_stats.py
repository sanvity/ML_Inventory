"""Column stats router — returns per-column statistics for a session."""

import math

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from api.routers.upload import SESSIONS
from api.utils import clean_json, detect_column_type

router = APIRouter()


@router.get("/column_stats/{session_id}")
async def column_stats(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(404, "Session not found.")
    df = SESSIONS[session_id]["df"]
    stats = {}
    for col in df.columns:
        col_type = detect_column_type(df, col)
        s = df[col]
        info: dict = {"type": col_type, "null_count": int(s.isna().sum()), "null_pct": round(float(s.isna().mean()) * 100, 1)}
        if col_type == "numeric":
            num = pd.to_numeric(s, errors="coerce")
            info.update({
                "mean":   None if num.isna().all() else round(float(num.mean()), 4),
                "std":    None if num.isna().all() else round(float(num.std()), 4),
                "min":    None if num.isna().all() else round(float(num.min()), 4),
                "max":    None if num.isna().all() else round(float(num.max()), 4),
                "median": None if num.isna().all() else round(float(num.median()), 4),
            })
        elif col_type == "categorical":
            vc = s.value_counts(normalize=True).head(5).to_dict()
            info["top_values"] = [{"value": str(k), "pct": round(v * 100, 1)} for k, v in vc.items()]
            info["cardinality"] = int(s.nunique())
        stats[col] = info
    return clean_json(stats)

"""Upload router — handles CSV/Excel file upload and session creation."""

import io
import math
import uuid
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from api.utils import detect_column_type, detect_target, feature_importance

router = APIRouter()

# In-memory session store {session_id: {df, cfg, ...}}
SESSIONS: dict[str, dict] = {}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accept a CSV or Excel file, parse it, and return dataset metadata
    used to drive Tab 1 and Tab 2 of the UI.
    """
    contents = await file.read()
    fname    = file.filename or "dataset"
    try:
        if fname.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif fname.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    session_id = str(uuid.uuid4())

    # Column metadata
    cols_meta = []
    numeric_cols: list[str] = []
    for col in df.columns:
        col_type = detect_column_type(df, col)
        cardinality = int(df[col].nunique())
        cols_meta.append({
            "name":        col,
            "type":        col_type,
            "cardinality": cardinality,
            "null_pct":    round(float(df[col].isna().mean()) * 100, 1),
        })
        if col_type == "numeric":
            numeric_cols.append(col)

    suggested_target = detect_target(numeric_cols)

    # Full correlation matrix for all numeric columns
    corr_dict: dict = {}
    if len(numeric_cols) > 0:
        try:
            numeric_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce")
            corr_df = numeric_df.corr()
            for c1 in numeric_cols:
                corr_dict[c1] = {}
                for c2 in numeric_cols:
                    val = corr_df.loc[c1, c2]
                    if math.isnan(val) or math.isinf(val):
                        val = 0.0
                    corr_dict[c1][c2] = round(float(val), 4)
        except Exception:
            pass

    # Preview rows (first 8, serialise safely)
    preview_df = df.head(8).copy()
    for col in preview_df.columns:
        if pd.api.types.is_datetime64_any_dtype(preview_df[col]):
            preview_df[col] = preview_df[col].astype(str)
    preview = preview_df.replace({np.nan: None}).to_dict(orient="records")

    SESSIONS[session_id] = {
        "df":       df,
        "filename": fname,
        "cfg":      {},
    }

    return {
        "session_id":       session_id,
        "filename":         fname,
        "rows":             len(df),
        "cols":             len(df.columns),
        "numeric_cols":     len(numeric_cols),
        "columns":          list(df.columns),
        "numeric_columns":  numeric_cols,
        "columns_metadata": cols_meta,
        "suggested_target": suggested_target,
        "correlations":     corr_dict,
        "preview":          preview,
    }

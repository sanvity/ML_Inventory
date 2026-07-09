import pytest
import numpy as np
import pandas as pd
from api.target_detector import (
    name_match_signal,
    position_signal,
    cardinality_signal,
    missingness_signal,
    dependency_signal,
    semantic_signal,
    detect_target_candidates,
    normalize_name
)

@pytest.fixture
def synthetic_dataframe():
    np.random.seed(42)
    rows = 100
    # Obvious label column
    y = np.random.choice([0, 1], size=rows)
    # Features
    x1 = np.random.randn(rows)
    x2 = np.random.randn(rows)
    # Leaky column (derived from y)
    leaky = y.copy()
    # Sparse column
    sparse = np.random.randn(rows)
    sparse[10:] = np.nan  # 90% missingness
    # Normal numeric feature
    numeric_feature = np.random.randn(rows)
    
    df = pd.DataFrame({
        "first_col": x1,
        "feature_two": x2,
        "target_column": y,
        "leaky_col": leaky,
        "sparse_col": sparse,
        "class_label": y  # Last column
    })
    return df

def test_normalize_name():
    assert normalize_name("targetColumn") == "target column"
    assert normalize_name("target_col") == "target col"
    assert normalize_name("Target-Col") == "target col"
    assert normalize_name("myTargetColumn_Name") == "my target column name"

def test_name_match_signal(synthetic_dataframe):
    # Exact keyword match
    assert name_match_signal("label", synthetic_dataframe, {}) == 1.0
    
    # Fuzzy/substring match (e.g. contains 'target' or compound name)
    assert 0.5 <= name_match_signal("class_label", synthetic_dataframe, {}) <= 0.8
    assert 0.5 <= name_match_signal("target_column", synthetic_dataframe, {}) <= 0.8
    
    # No match
    assert name_match_signal("feature_two", synthetic_dataframe, {}) == 0.0

def test_position_signal(synthetic_dataframe):
    # Last column should be 1.0
    assert position_signal("class_label", synthetic_dataframe, {}) == 1.0
    
    # First column should be 0.6
    assert position_signal("first_col", synthetic_dataframe, {}) == 0.6
    
    # Middle columns should have decayed scores in (0.6, 1.0)
    mid_score = position_signal("target_column", synthetic_dataframe, {})
    assert 0.6 < mid_score < 1.0

def test_cardinality_signal(synthetic_dataframe):
    # Classification target (binary)
    score, variant = cardinality_signal("class_label", synthetic_dataframe, {})
    assert variant == "classification"
    assert score == 1.0
    
    # Continuous numeric target (high cardinality)
    score_reg, variant_reg = cardinality_signal("first_col", synthetic_dataframe, {})
    assert variant_reg == "regression"
    assert score_reg > 0.5  # High unique count ratio

def test_missingness_signal(synthetic_dataframe):
    # 0% missingness
    assert missingness_signal("class_label", synthetic_dataframe, {}) == 1.0
    
    # 90% missingness (score should be 1 - 0.9 = 0.1)
    assert missingness_signal("sparse_col", synthetic_dataframe, {}) == 0.1

def test_dependency_signal(synthetic_dataframe):
    # Gated behind cheap score: if cheap score < 0.3, it should skip training (return True for skipped)
    score, skipped = dependency_signal("first_col", synthetic_dataframe, {"cheap_score": 0.2})
    assert skipped is True
    
    # If cheap score >= 0.3, it should fit and return high score for leaky col
    score_leak, skipped_leak = dependency_signal("leaky_col", synthetic_dataframe, {
        "cheap_score": 0.5,
        "task_type_hint": "classification"
    })
    assert skipped_leak is False
    assert score_leak > 0.8  # Predictable target

def test_semantic_signal(synthetic_dataframe):
    # Gated: if name match score >= 0.3, skip it
    score, reason = semantic_signal("target_column", synthetic_dataframe, {"name_match_score": 0.5})
    assert score == 0.0
    assert reason == "name_match_sufficient"
    
    # If name match score < 0.3, compute semantic similarity (e.g. numeric columns use name only)
    score_sem, reason_sem = semantic_signal("feature_two", synthetic_dataframe, {"name_match_score": 0.0})
    assert reason_sem is None
    assert 0.0 <= score_sem <= 1.0

def test_detect_target_candidates(synthetic_dataframe):
    res = detect_target_candidates(synthetic_dataframe)
    assert "candidates" in res
    assert "multi_target_flag" in res
    assert "confidence_tier" in res
    
    # The top candidate should be "class_label" or "target_column"
    top_cand = res["candidates"][0]["column"]
    assert top_cand in ["class_label", "target_column"]
    
    # Check output schema structure
    breakdown = res["candidates"][0]["signal_breakdown"]
    assert "name_match" in breakdown
    assert "position" in breakdown
    assert "cardinality" in breakdown
    assert "missingness" in breakdown
    assert "dependency" in breakdown
    assert "semantic" in breakdown

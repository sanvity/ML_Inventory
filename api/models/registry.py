"""
Pluggable Model Registry — adapter pattern for ML models.
Every model implements the ModelAdapter interface.
New models can be registered via ModelRegistry.register() without UI changes.
"""

from abc import ABC, abstractmethod
from typing import Any


class ModelAdapter(ABC):
    """Base class that every model adapter must implement."""

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Unique backend key matching modelRegistry.js backendKey."""

    @abstractmethod
    def make_model(self, params: dict) -> Any:
        """Instantiate and return a fitted-able sklearn-compatible model."""

    def get_feature_importance(self, model: Any, feature_names: list[str]) -> list[dict]:
        """Optional: return [{feature, importance}] from a fitted model."""
        if hasattr(model, "feature_importances_"):
            imps = model.feature_importances_
            return sorted(
                [{"feature": f, "importance": round(float(i), 4)} for f, i in zip(feature_names, imps)],
                key=lambda x: -x["importance"],
            )
        return []


class ModelRegistry:
    _adapters: dict[str, ModelAdapter] = {}

    @classmethod
    def register(cls, adapter: ModelAdapter):
        cls._adapters[adapter.model_id] = adapter

    @classmethod
    def get(cls, model_id: str) -> ModelAdapter | None:
        return cls._adapters.get(model_id)

    @classmethod
    def list_ids(cls) -> list[str]:
        return list(cls._adapters.keys())


# ── Built-in scikit-learn adapters ────────────────────────────────────────────

from sklearn.ensemble import (AdaBoostRegressor, GradientBoostingRegressor,
                               RandomForestRegressor)
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.neural_network import MLPRegressor
from sklearn.tree import DecisionTreeRegressor


class LinearRegressionAdapter(ModelAdapter):
    model_id = "linear"
    def make_model(self, params): return LinearRegression()

class RidgeAdapter(ModelAdapter):
    model_id = "ridge"
    def make_model(self, params): return Ridge(alpha=1.0)

class DecisionTreeAdapter(ModelAdapter):
    model_id = "dt"
    def make_model(self, params): return DecisionTreeRegressor(max_depth=8, random_state=42)

class RandomForestAdapter(ModelAdapter):
    model_id = "rf"
    def make_model(self, params):
        return RandomForestRegressor(
            n_estimators=params.get("n_estimators", 100),
            max_features="sqrt", bootstrap=True, random_state=42, n_jobs=-1,
        )

class GBMAdapter(ModelAdapter):
    model_id = "gbm"
    def make_model(self, params):
        return GradientBoostingRegressor(
            n_estimators=params.get("n_estimators", 100),
            learning_rate=params.get("learning_rate", 0.1),
            random_state=42,
        )

class AdaBoostAdapter(ModelAdapter):
    model_id = "adaboost"
    def make_model(self, params):
        return AdaBoostRegressor(
            estimator=DecisionTreeRegressor(max_depth=4),
            n_estimators=params.get("n_estimators", 100),
            learning_rate=params.get("learning_rate", 0.1),
            random_state=42,
        )

class MLPAdapter(ModelAdapter):
    model_id = "nn"
    def make_model(self, params):
        return MLPRegressor(
            hidden_layer_sizes=(128, 64, 32), activation="relu",
            max_iter=500, random_state=42,
        )


# ── Optional adapters (graceful degradation) ──────────────────────────────────

def _try_register_xgboost():
    try:
        from xgboost import XGBRegressor
        class XGBoostAdapter(ModelAdapter):
            model_id = "xgboost"
            def make_model(self, params):
                return XGBRegressor(
                    n_estimators=params.get("n_estimators", 100),
                    learning_rate=params.get("learning_rate", 0.1),
                    random_state=42, verbosity=0,
                )
        ModelRegistry.register(XGBoostAdapter())
    except ImportError:
        pass  # XGBoost not installed — model shows "unavailable" badge

def _try_register_lgbm():
    try:
        from lightgbm import LGBMRegressor
        class LGBMAdapter(ModelAdapter):
            model_id = "lgbm"
            def make_model(self, params):
                return LGBMRegressor(
                    n_estimators=params.get("n_estimators", 100),
                    learning_rate=params.get("learning_rate", 0.1),
                    random_state=42, verbose=-1,
                )
        ModelRegistry.register(LGBMAdapter())
    except ImportError:
        pass

def _try_register_catboost():
    try:
        from catboost import CatBoostRegressor
        class CatBoostAdapter(ModelAdapter):
            model_id = "catboost"
            def make_model(self, params):
                return CatBoostRegressor(
                    iterations=params.get("n_estimators", 100),
                    learning_rate=params.get("learning_rate", 0.1),
                    random_seed=42, verbose=0,
                )
        ModelRegistry.register(CatBoostAdapter())
    except ImportError:
        pass


# ── Register all built-in adapters ───────────────────────────────────────────

for _adapter in [
    LinearRegressionAdapter(), RidgeAdapter(), DecisionTreeAdapter(),
    RandomForestAdapter(), GBMAdapter(), AdaBoostAdapter(), MLPAdapter(),
]:
    ModelRegistry.register(_adapter)

_try_register_xgboost()
_try_register_lgbm()
_try_register_catboost()

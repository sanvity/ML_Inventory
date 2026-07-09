"""
Pluggable Model Registry — adapter pattern for ML models.
Every model implements the ModelAdapter interface.
New models can be registered via ModelRegistry.register() without UI changes.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Optional


class ModelAdapter(ABC):
    """Base class that every model adapter must implement."""

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Unique backend key matching modelRegistry.js backendKey."""

    @abstractmethod
    def make_model(self, params: dict) -> Any:
        """Instantiate and return a fitted-able sklearn-compatible model."""

    def suggest_params(self, trial) -> dict:
        """
        Suggest hyperparameters for an Optuna trial.
        Override in subclasses to enable automatic tuning.
        Default returns empty dict (no tunable params / skip tuning).
        """
        return {}

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
    def get(cls, model_id: str) -> Optional[ModelAdapter]:
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

    def make_model(self, params):
        return LinearRegression()

    def suggest_params(self, trial) -> dict:
        # No tunable hyperparameters — skip Optuna for this model
        return {}


class RidgeAdapter(ModelAdapter):
    model_id = "ridge"

    def make_model(self, params):
        return Ridge(alpha=params.get("alpha", 1.0))

    def suggest_params(self, trial) -> dict:
        return {
            "alpha": trial.suggest_float("alpha", 1e-3, 1e2, log=True),
        }


class DecisionTreeAdapter(ModelAdapter):
    model_id = "dt"

    def make_model(self, params):
        return DecisionTreeRegressor(
            max_depth=params.get("max_depth", 8),
            min_samples_split=params.get("min_samples_split", 2),
            random_state=42,
        )

    def suggest_params(self, trial) -> dict:
        return {
            "max_depth":         trial.suggest_int("max_depth", 3, 20),
            "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        }


class RandomForestAdapter(ModelAdapter):
    model_id = "rf"

    def make_model(self, params):
        return RandomForestRegressor(
            n_estimators=params.get("n_estimators", 100),
            max_depth=params.get("max_depth", None),
            min_samples_split=params.get("min_samples_split", 2),
            max_features=params.get("max_features", "sqrt"),
            bootstrap=True,
            random_state=42,
            n_jobs=-1,
        )

    def suggest_params(self, trial) -> dict:
        return {
            "n_estimators":      trial.suggest_int("n_estimators", 50, 400),
            "max_depth":         trial.suggest_int("max_depth", 3, 20),
            "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
            "max_features":      trial.suggest_categorical("max_features", ["sqrt", "log2"]),
        }


class GBMAdapter(ModelAdapter):
    model_id = "gbm"

    def make_model(self, params):
        return GradientBoostingRegressor(
            n_estimators=params.get("n_estimators", 100),
            learning_rate=params.get("learning_rate", 0.1),
            max_depth=params.get("max_depth", 3),
            subsample=params.get("subsample", 1.0),
            random_state=42,
        )

    def suggest_params(self, trial) -> dict:
        return {
            "n_estimators":  trial.suggest_int("n_estimators", 50, 400),
            "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
            "max_depth":     trial.suggest_int("max_depth", 2, 8),
            "subsample":     trial.suggest_float("subsample", 0.6, 1.0),
        }


class AdaBoostAdapter(ModelAdapter):
    model_id = "adaboost"

    def make_model(self, params):
        return AdaBoostRegressor(
            estimator=DecisionTreeRegressor(max_depth=4),
            n_estimators=params.get("n_estimators", 100),
            learning_rate=params.get("learning_rate", 0.1),
            random_state=42,
        )

    def suggest_params(self, trial) -> dict:
        return {
            "n_estimators":  trial.suggest_int("n_estimators", 50, 300),
            "learning_rate": trial.suggest_float("learning_rate", 1e-2, 1.5, log=True),
        }


class MLPAdapter(ModelAdapter):
    model_id = "nn"

    def make_model(self, params):
        h1 = params.get("hidden_layer_1", 128)
        h2 = params.get("hidden_layer_2", 64)
        return MLPRegressor(
            hidden_layer_sizes=(h1, h2, 32),
            activation="relu",
            alpha=params.get("alpha", 1e-4),
            max_iter=500,
            random_state=42,
        )

    def suggest_params(self, trial) -> dict:
        return {
            "hidden_layer_1": trial.suggest_int("hidden_layer_1", 32, 256),
            "hidden_layer_2": trial.suggest_int("hidden_layer_2", 16, 128),
            "alpha":          trial.suggest_float("alpha", 1e-5, 1e-1, log=True),
        }


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
                    max_depth=params.get("max_depth", 6),
                    subsample=params.get("subsample", 1.0),
                    colsample_bytree=params.get("colsample_bytree", 1.0),
                    random_state=42,
                    verbosity=0,
                )

            def suggest_params(self, trial) -> dict:
                return {
                    "n_estimators":    trial.suggest_int("n_estimators", 50, 500),
                    "learning_rate":   trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
                    "max_depth":       trial.suggest_int("max_depth", 2, 8),
                    "subsample":       trial.suggest_float("subsample", 0.6, 1.0),
                    "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                }

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
                    num_leaves=params.get("num_leaves", 31),
                    subsample=params.get("subsample", 1.0),
                    random_state=42,
                    verbose=-1,
                )

            def suggest_params(self, trial) -> dict:
                return {
                    "n_estimators":  trial.suggest_int("n_estimators", 50, 500),
                    "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
                    "num_leaves":    trial.suggest_int("num_leaves", 15, 127),
                    "subsample":     trial.suggest_float("subsample", 0.6, 1.0),
                }

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
                    iterations=params.get("iterations", 100),
                    learning_rate=params.get("learning_rate", 0.1),
                    depth=params.get("depth", 6),
                    random_seed=42,
                    verbose=0,
                )

            def suggest_params(self, trial) -> dict:
                return {
                    "iterations":    trial.suggest_int("iterations", 50, 400),
                    "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
                    "depth":         trial.suggest_int("depth", 3, 10),
                }

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

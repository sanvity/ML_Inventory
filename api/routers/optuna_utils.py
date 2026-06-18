"""
Optuna hyperparameter tuning utilities.
Provides a clean run_optuna_study() function that is called by the training router.
"""

import math
import numpy as np
import optuna
from sklearn.model_selection import KFold, cross_val_score


# Silence Optuna's internal logging — progress is reported via PROGRESS dict instead
optuna.logging.set_verbosity(optuna.logging.WARNING)


def run_optuna_study(
    adapter,
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_trials: int = 25,
    task: str = "regression",
    cv_folds: int = 3,
    progress_callback=None,
) -> tuple[dict, float]:
    """
    Run an Optuna study to find the best hyperparameters for `adapter`.

    Parameters
    ----------
    adapter      : ModelAdapter instance (must implement suggest_params)
    X_train      : Training features (numpy array, already normalised)
    y_train      : Training targets (numpy array)
    n_trials     : Number of Optuna trials
    task         : "regression" | "classification"
    cv_folds     : Number of cross-validation folds per trial
    progress_callback : Optional callable(trial_idx, n_trials) for progress updates

    Returns
    -------
    (best_params, best_score) — dict of best hyperparameters + their CV score
    """
    # Determine scoring metric based on task
    if task == "classification":
        scoring = "f1_weighted"
    else:
        scoring = "r2"

    # Guard: if this adapter has no tunable params, skip the study
    try:
        import optuna
        dummy_study = optuna.create_study(direction="maximize")
        dummy_trial = dummy_study.ask()
        sample = adapter.suggest_params(dummy_trial)
        if not sample:
            # No params to tune — return empty params and sentinel score
            return {}, float("nan")
    except Exception:
        return {}, float("nan")

    completed_trials = [0]

    def objective(trial):
        try:
            params = adapter.suggest_params(trial)
            model  = adapter.make_model(params)
            kf = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
            scores = cross_val_score(
                model, X_train, y_train,
                cv=kf, scoring=scoring, n_jobs=1,
                error_score=float("-inf"),
            )
            score = float(np.mean(scores))
            if math.isnan(score) or math.isinf(score):
                score = float("-inf")
            completed_trials[0] += 1
            if progress_callback:
                progress_callback(completed_trials[0], n_trials)
            return score
        except Exception:
            completed_trials[0] += 1
            if progress_callback:
                progress_callback(completed_trials[0], n_trials)
            return float("-inf")

    study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False, n_jobs=1)

    best_params = study.best_params
    best_score  = study.best_value if not math.isinf(study.best_value) else float("nan")

    return best_params, best_score


def format_best_params(best_params: dict) -> dict:
    """
    Round float values in best_params for clean display in API responses.
    """
    formatted = {}
    for k, v in best_params.items():
        if isinstance(v, float):
            formatted[k] = round(v, 6)
        else:
            formatted[k] = v
    return formatted

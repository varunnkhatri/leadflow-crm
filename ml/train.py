"""Train conversion classification and K-Means segmentation models with strict leakage prevention."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    silhouette_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_ML_DIR = Path(__file__).resolve().parent
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

from preprocessing import (  # noqa: E402
    MODEL_FEATURES,
    prepare_features_frame,
    validate_no_leakage,
)

CATEGORICAL_COLS = ["source_norm", "service_norm"]
NUMERIC_COLS = ["enquiry_length", "enquiry_log_length"]
RAW_INPUT_COLS = ["source", "product_interest", "enquiry_length"]


def _build_classifier_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "category",
                make_pipeline(
                    SimpleImputer(strategy="constant", fill_value="other"),
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ),
                CATEGORICAL_COLS,
            ),
            (
                "number",
                make_pipeline(
                    SimpleImputer(strategy="median"),
                    StandardScaler(),
                ),
                NUMERIC_COLS,
            ),
        ]
    )


def _build_clustering_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "category",
                make_pipeline(
                    SimpleImputer(strategy="constant", fill_value="other"),
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                ),
                CATEGORICAL_COLS,
            ),
            (
                "number",
                make_pipeline(
                    SimpleImputer(strategy="median"),
                    StandardScaler(),
                ),
                ["enquiry_log_length"],
            ),
        ]
    )


def _extract_top_features(pipeline: Pipeline, limit: int = 8) -> list[dict[str, Any]]:
    prep = pipeline.named_steps["prep"]
    clf = pipeline.named_steps["clf"]
    feature_names = [
        name.replace("category__", "").replace("number__", "")
        for name in prep.get_feature_names_out()
    ]
    if hasattr(clf, "coef_"):
        weights = clf.coef_[0]
        ranked = sorted(
            zip(feature_names, weights),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )[:limit]
        return [
            {
                "feature": fname,
                "importance": round(abs(float(val)), 4),
                "direction": "positive" if float(val) >= 0 else "negative",
            }
            for fname, val in ranked
        ]
    if hasattr(clf, "feature_importances_"):
        weights = clf.feature_importances_
        ranked = sorted(
            zip(feature_names, weights),
            key=lambda item: float(item[1]),
            reverse=True,
        )[:limit]
        return [
            {
                "feature": fname,
                "importance": round(float(val), 4),
                "direction": "nonlinear",
            }
            for fname, val in ranked
        ]
    return []


def _describe_cluster(
    cluster_id: int,
    dominant_source: str,
    dominant_service: str,
    avg_length: float,
    conversion_rate: float,
    baseline_conversion: float,
) -> tuple[str, str]:
    source_pretty = dominant_source.replace("_", " ").title()
    service_pretty = dominant_service.replace("_", " ").title()

    if avg_length >= 260:
        depth_word = "Detailed"
        depth_desc = "detailed multi-sentence enquiries"
    elif avg_length >= 120:
        depth_word = "Mid-Intent"
        depth_desc = "moderately scoped enquiries"
    else:
        depth_word = "Quick"
        depth_desc = "brief introductory enquiries"

    if conversion_rate >= baseline_conversion + 0.08:
        tier = "High-Propensity"
        outcome_desc = "converts above workspace average"
    elif conversion_rate <= baseline_conversion - 0.08:
        tier = "Low-Propensity"
        outcome_desc = "converts below average and benefits from qualification"
    else:
        tier = "Balanced"
        outcome_desc = "tracks near overall baseline conversion"

    label = f"{tier} {source_pretty} · {service_pretty}"
    description = (
        f"Predominantly {source_pretty} leads seeking {service_pretty} with {depth_desc} "
        f"(avg {round(avg_length)} chars); {outcome_desc} ({conversion_rate * 100:.1f}% win rate)."
    )
    return label, description


def _evaluate_candidates(
    x_train: pd.DataFrame,
    y_train: pd.Series,
    cv: StratifiedKFold,
) -> dict[str, dict[str, Any]]:
    candidates: dict[str, list[tuple[dict[str, Any], Any]]] = {
        "logistic_regression": [
            ({"C": c}, LogisticRegression(C=c, max_iter=1000, random_state=42))
            for c in (0.1, 1.0, 10.0)
        ],
        "random_forest": [
            (
                {"n_estimators": 200, "max_depth": depth, "min_samples_leaf": leaf},
                RandomForestClassifier(
                    n_estimators=200,
                    max_depth=depth,
                    min_samples_leaf=leaf,
                    random_state=42,
                ),
            )
            for depth, leaf in ((4, 8), (6, 5), (8, 5))
        ],
    }

    scoring = {
        "accuracy": "accuracy",
        "precision": "precision",
        "recall": "recall",
        "f1": "f1",
        "roc_auc": "roc_auc",
    }

    best_per_family: dict[str, dict[str, Any]] = {}
    for family, configs in candidates.items():
        best_entry: dict[str, Any] | None = None
        for params, estimator in configs:
            pipe = Pipeline([("prep", _build_classifier_preprocessor()), ("clf", estimator)])
            cv_res = cross_validate(pipe, x_train, y_train, cv=cv, scoring=scoring, n_jobs=1)
            cv_roc_mean = float(np.mean(cv_res["test_roc_auc"]))
            cv_f1_mean = float(np.mean(cv_res["test_f1"]))
            candidate_entry = {
                "params": params,
                "estimator": estimator,
                "cv_summary": {
                    "roc_auc_mean": cv_roc_mean,
                    "roc_auc_std": float(np.std(cv_res["test_roc_auc"])),
                    "accuracy_mean": float(np.mean(cv_res["test_accuracy"])),
                    "precision_mean": float(np.mean(cv_res["test_precision"])),
                    "recall_mean": float(np.mean(cv_res["test_recall"])),
                    "f1_mean": cv_f1_mean,
                },
            }
            if best_entry is None or (cv_roc_mean, cv_f1_mean) > (
                best_entry["cv_summary"]["roc_auc_mean"],
                best_entry["cv_summary"]["f1_mean"],
            ):
                best_entry = candidate_entry
        assert best_entry is not None
        best_per_family[family] = best_entry

    return best_per_family


def _collect_dataset_stats(
    df: pd.DataFrame,
    features_all: pd.DataFrame,
    y: pd.Series,
    train_rows: int,
    test_rows: int,
    provenance: str,
) -> dict[str, Any]:
    is_synthetic = (
        bool(df["is_synthetic"].iloc[0])
        if "is_synthetic" in df.columns and len(df) > 0
        else "synthetic" in provenance.lower()
    )
    missing_raw = {
        col: int(
            df[col].isna().sum()
            + (df[col].astype(str).str.strip().isin(["", "nan", "None"])).sum()
        )
        if df[col].dtype == object
        else int(df[col].isna().sum())
        for col in RAW_INPUT_COLS
    }
    valid_lengths = features_all["enquiry_length"].dropna()
    return {
        "provenance": provenance,
        "is_synthetic": is_synthetic,
        "rows": int(len(df)),
        "train_rows": int(train_rows),
        "test_rows": int(test_rows),
        "cv_folds": 5,
        "class_distribution": {
            "not_converted_0": int((y == 0).sum()),
            "converted_1": int((y == 1).sum()),
            "conversion_rate": round(float(y.mean()), 4),
        },
        "missing_values": missing_raw,
        "canonical_sources": {
            str(k): int(v)
            for k, v in features_all["source_norm"].fillna("other").value_counts().items()
        },
        "canonical_services": {
            str(k): int(v)
            for k, v in features_all["service_norm"].fillna("other").value_counts().items()
        },
        "enquiry_length_stats": {
            "min": round(float(valid_lengths.min()), 1) if len(valid_lengths) else 0.0,
            "median": round(float(valid_lengths.median()), 1) if len(valid_lengths) else 0.0,
            "mean": round(float(valid_lengths.mean()), 1) if len(valid_lengths) else 0.0,
            "p95": round(float(valid_lengths.quantile(0.95)), 1) if len(valid_lengths) else 0.0,
            "max": round(float(valid_lengths.max()), 1) if len(valid_lengths) else 0.0,
        },
    }


def train(path: str | Path, provenance: str, artifacts_dir: Path | None = None) -> dict[str, Any]:
    df = pd.read_csv(path)
    required_cols = set(RAW_INPUT_COLS + ["converted"])
    if not required_cols.issubset(df.columns):
        raise ValueError("Required columns: " + ", ".join(RAW_INPUT_COLS + ["converted"]))

    y = df["converted"].astype(int)
    if set(y.unique()) != {0, 1} or int(y.value_counts().min()) < 10:
        raise ValueError("Need at least 10 labeled examples of each outcome (0 and 1)")

    validate_no_leakage(MODEL_FEATURES)

    # Split raw data strictly BEFORE fitting any imputers, encoders, scalers, or clusterers.
    x_raw = df[RAW_INPUT_COLS].copy()
    x_train_raw, x_test_raw, y_train, y_test = train_test_split(
        x_raw, y, test_size=0.20, random_state=42, stratify=y
    )

    x_train = prepare_features_frame(x_train_raw)
    x_test = prepare_features_frame(x_test_raw)
    features_all = prepare_features_frame(x_raw)

    out = artifacts_dir or (Path(__file__).parent / "artifacts")
    out.mkdir(parents=True, exist_ok=True)

    dataset_stats = _collect_dataset_stats(
        df=df,
        features_all=features_all,
        y=y,
        train_rows=len(x_train),
        test_rows=len(x_test),
        provenance=provenance,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    best_candidates = _evaluate_candidates(x_train, y_train, cv)

    models_report: dict[str, Any] = {}
    for name, entry in best_candidates.items():
        pipe = Pipeline([("prep", _build_classifier_preprocessor()), ("clf", entry["estimator"])])
        pipe.fit(x_train, y_train)

        train_prob = pipe.predict_proba(x_train)[:, 1]
        train_pred = pipe.predict(x_train)
        test_prob = pipe.predict_proba(x_test)[:, 1]
        test_pred = pipe.predict(x_test)

        train_auc = float(roc_auc_score(y_train, train_prob))
        test_auc = float(roc_auc_score(y_test, test_prob))

        models_report[name] = {
            "best_params": entry["params"],
            "cv": {k: round(v, 4) for k, v in entry["cv_summary"].items()},
            "train_accuracy": round(float(accuracy_score(y_train, train_pred)), 4),
            "train_roc_auc": round(train_auc, 4),
            "accuracy": round(float(accuracy_score(y_test, test_pred)), 4),
            "precision": round(float(precision_score(y_test, test_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, test_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, test_pred, zero_division=0)), 4),
            "roc_auc": round(test_auc, 4),
            "overfitting_gap": round(train_auc - test_auc, 4),
            "confusion_matrix": confusion_matrix(y_test, test_pred, labels=[0, 1]).tolist(),
            "top_features": _extract_top_features(pipe),
        }
        joblib.dump(pipe, out / f"{name}.joblib")

    # Select best model strictly by 5-fold CV ROC-AUC (tie-breaker: CV F1).
    # Held-out test data is never used for model selection or hyperparameter tuning.
    selected_model = max(
        models_report.keys(),
        key=lambda m: (
            models_report[m]["cv"]["roc_auc_mean"],
            models_report[m]["cv"]["f1_mean"],
        ),
    )

    # K-Means segmentation: fit preprocessor ONLY on x_train to prevent leakage.
    seg_prep = _build_clustering_preprocessor()
    z_train = seg_prep.fit_transform(x_train)
    z_test = seg_prep.transform(x_test)

    k_evaluations: list[dict[str, Any]] = []
    max_k = min(7, len(z_train) - 1)
    for k in range(2, max_k + 1):
        km_candidate = KMeans(n_clusters=k, random_state=42, n_init=20).fit(z_train)
        train_labels = km_candidate.labels_
        test_labels = km_candidate.predict(z_test)

        counts = np.bincount(train_labels, minlength=k)
        min_cluster_pct = float(counts.min() / len(train_labels))
        train_sil = (
            float(silhouette_score(z_train, train_labels))
            if 1 < len(set(train_labels)) < len(train_labels)
            else 0.0
        )
        test_sil = (
            float(silhouette_score(z_test, test_labels))
            if 1 < len(set(test_labels)) < len(test_labels)
            else 0.0
        )
        k_evaluations.append(
            {
                "k": k,
                "silhouette": round(train_sil, 4),
                "test_silhouette": round(test_sil, 4),
                "inertia": round(float(km_candidate.inertia_), 2),
                "min_cluster_pct": round(min_cluster_pct * 100.0, 2),
            }
        )

    balanced_k = [row for row in k_evaluations if row["min_cluster_pct"] >= 5.0]
    chosen_pool = balanced_k if balanced_k else k_evaluations
    best_k_row = max(chosen_pool, key=lambda row: row["silhouette"])
    best_k = int(best_k_row["k"])

    km_final = KMeans(n_clusters=best_k, random_state=42, n_init=20).fit(z_train)
    train_clusters = km_final.labels_
    test_clusters = km_final.predict(z_test)

    pca = PCA(n_components=2, random_state=42).fit(z_train)
    z_train_pca = pca.transform(z_train)
    z_test_pca = pca.transform(z_test)
    centroids_pca = pca.transform(km_final.cluster_centers_)

    train_profile_df = x_train.copy()
    train_profile_df["cluster"] = train_clusters
    train_profile_df["converted"] = y_train.to_numpy()
    train_profile_df["pc1"] = z_train_pca[:, 0]
    train_profile_df["pc2"] = z_train_pca[:, 1]
    baseline_conv = float(y_train.mean())

    cluster_profiles: list[dict[str, Any]] = []
    for cid in range(best_k):
        subset = train_profile_df[train_profile_df["cluster"] == cid]
        dom_source = str(subset["source_norm"].fillna("other").mode().iloc[0])
        dom_service = str(subset["service_norm"].fillna("other").mode().iloc[0])
        avg_len = float(subset["enquiry_length"].dropna().mean()) if len(subset["enquiry_length"].dropna()) else 0.0
        conv_rate = float(subset["converted"].mean()) if len(subset) else 0.0
        label, description = _describe_cluster(
            cluster_id=cid,
            dominant_source=dom_source,
            dominant_service=dom_service,
            avg_length=avg_len,
            conversion_rate=conv_rate,
            baseline_conversion=baseline_conv,
        )
        cluster_profiles.append(
            {
                "cluster": cid,
                "label": label,
                "description": description,
                "size": int(len(subset)),
                "share_pct": round(float(len(subset) / len(train_profile_df)) * 100.0, 1),
                "dominant_source": dom_source,
                "dominant_service": dom_service,
                "avg_enquiry_length": round(avg_len, 1),
                "conversion_rate": round(conv_rate, 4),
                "centroid_pc1": round(float(centroids_pca[cid, 0]), 4),
                "centroid_pc2": round(float(centroids_pca[cid, 1]), 4),
            }
        )

    # Sample up to 240 held-out points in 2D PCA space for scatter plot visualization.
    sample_limit = min(240, len(x_test))
    sample_rng = np.random.default_rng(42)
    sample_indices = np.sort(sample_rng.choice(len(x_test), size=sample_limit, replace=False))
    pca_sample_points = [
        {
            "pc1": round(float(z_test_pca[idx, 0]), 4),
            "pc2": round(float(z_test_pca[idx, 1]), 4),
            "cluster": int(test_clusters[idx]),
            "source": str(x_test.iloc[idx]["source_norm"] if pd.notna(x_test.iloc[idx]["source_norm"]) else "other"),
            "service": str(x_test.iloc[idx]["service_norm"] if pd.notna(x_test.iloc[idx]["service_norm"]) else "other"),
            "enquiry_length": int(round(float(x_test.iloc[idx]["enquiry_length"])))
            if pd.notna(x_test.iloc[idx]["enquiry_length"])
            else 0,
            "converted": int(y_test.iloc[idx]),
        }
        for idx in sample_indices
    ]

    joblib.dump((seg_prep, km_final, pca, cluster_profiles), out / "segments.joblib")

    metrics: dict[str, Any] = {
        "provenance": provenance,
        "is_synthetic": dataset_stats["is_synthetic"],
        "rows": dataset_stats["rows"],
        "train_rows": dataset_stats["train_rows"],
        "test_rows": dataset_stats["test_rows"],
        "selected_model": selected_model,
        "selection_criterion": "5-fold Stratified CV ROC-AUC (tie-breaker: CV F1; held-out test excluded)",
        "dataset_stats": dataset_stats,
        "models": models_report,
        "segmentation": {
            "clusters": best_k,
            "silhouette": best_k_row["silhouette"],
            "test_silhouette": best_k_row["test_silhouette"],
            "k_evaluations": k_evaluations,
            "pca_explained_variance_ratio": [round(float(v), 4) for v in pca.explained_variance_ratio_],
            "cluster_profiles": cluster_profiles,
            "sample_points": pca_sample_points,
        },
    }

    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LeadFlow conversion and segmentation models.")
    parser.add_argument("csv", help="Path to labeled leads CSV")
    parser.add_argument("--provenance", required=True, help="Dataset source/provenance description")
    args = parser.parse_args()
    result = train(args.csv, args.provenance)
    print(json.dumps({k: v for k, v in result.items() if k != "segmentation"}, indent=2))
    print(
        json.dumps(
            {
                "selected_model": result["selected_model"],
                "clusters": result["segmentation"]["clusters"],
                "silhouette": result["segmentation"]["silhouette"],
                "k_evaluations": result["segmentation"]["k_evaluations"],
            },
            indent=2,
        )
    )

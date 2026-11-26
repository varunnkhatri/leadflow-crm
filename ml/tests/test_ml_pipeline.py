"""Automated tests for LeadFlow ML preprocessing, training, clustering, sentiment, and FastAPI endpoints."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

ML_DIR = Path(__file__).resolve().parents[1]
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

import api as ml_api  # noqa: E402
from demo_data import generate_synthetic_leads  # noqa: E402
from demo_sentiment import generate_synthetic_sentiment  # noqa: E402
from preprocessing import (  # noqa: E402
    MODEL_FEATURES,
    normalize_enquiry_length,
    normalize_service,
    normalize_source,
    prepare_features_frame,
    validate_no_leakage,
)
from sentiment import train_sentiment  # noqa: E402
from train import train  # noqa: E402


def test_normalization_handles_crm_variants_and_missing():
    assert normalize_source("Website") == "public_form"
    assert normalize_source("Partner Referral") == "referral"
    assert normalize_source("Instagram") == "social"
    assert normalize_source("Paid media") == "paid_ads"
    assert normalize_source("Phone Call") == "manual"
    assert np.isnan(normalize_source(None))
    assert np.isnan(normalize_source("unknown"))

    assert normalize_service("Web Development") == "website"
    assert normalize_service("Digital marketing") == "marketing"
    assert normalize_service("Strategy Advisory") == "consulting"
    assert normalize_service("Demo request") == "sales_demo"
    assert normalize_service("Support") == "support"
    assert np.isnan(normalize_service(""))

    assert normalize_enquiry_length(-10) == 0.0
    assert normalize_enquiry_length(5000) == 3000.0
    assert np.isnan(normalize_enquiry_length("invalid"))


def test_leakage_guard_rejects_post_outcome_columns():
    validate_no_leakage(MODEL_FEATURES)
    with pytest.raises(ValueError, match="Data leakage detected"):
        validate_no_leakage(["source_norm", "stage"])
    with pytest.raises(ValueError, match="Data leakage detected"):
        validate_no_leakage(["converted", "enquiry_length"])


def test_prepare_features_frame_shape_and_types():
    df = pd.DataFrame(
        [
            {"source": "Website", "product_interest": "Sales enquiry", "enquiry_length": 240},
            {"source": None, "product_interest": "", "enquiry_length": None},
        ]
    )
    out = prepare_features_frame(df)
    assert list(out.columns) == MODEL_FEATURES
    assert out.iloc[0]["source_norm"] == "public_form"
    assert out.iloc[0]["service_norm"] == "sales_demo"
    assert np.isclose(out.iloc[0]["enquiry_log_length"], np.log1p(240))
    assert pd.isna(out.iloc[1]["enquiry_length"])


def test_synthetic_datasets_are_labeled_and_balanced():
    leads = generate_synthetic_leads(n=300, seed=7)
    assert len(leads) == 300
    assert bool(leads["is_synthetic"].all())
    assert set(leads["converted"].unique()) == {0, 1}

    sent = generate_synthetic_sentiment()
    counts = sent["sentiment"].value_counts().to_dict()
    assert set(counts.keys()) == {"positive", "neutral", "negative"}
    assert len(set(counts.values())) == 1  # Strictly balanced
    assert bool(sent["is_synthetic"].all())


def test_end_to_end_training_and_api(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    leads_csv = tmp_path / "leads.csv"
    sent_csv = tmp_path / "sentiment.csv"
    artifacts_dir = tmp_path / "artifacts"

    generate_synthetic_leads(n=400, seed=42).to_csv(leads_csv, index=False)
    generate_synthetic_sentiment().to_csv(sent_csv, index=False)

    conv_metrics = train(leads_csv, provenance="Synthetic unit test leads", artifacts_dir=artifacts_dir)
    assert conv_metrics["is_synthetic"] is True
    assert set(conv_metrics["models"].keys()) == {"logistic_regression", "random_forest"}
    assert conv_metrics["selected_model"] in {"logistic_regression", "random_forest"}
    for model_scores in conv_metrics["models"].values():
        assert 0.0 <= model_scores["roc_auc"] <= 1.0
        assert len(model_scores["confusion_matrix"]) == 2
        assert "overfitting_gap" in model_scores

    seg = conv_metrics["segmentation"]
    assert 2 <= seg["clusters"] <= 7
    assert len(seg["k_evaluations"]) >= 5
    assert len(seg["cluster_profiles"]) == seg["clusters"]
    assert len(seg["sample_points"]) > 0

    sent_metrics = train_sentiment(
        sent_csv,
        provenance="Synthetic unit test sentiment",
        artifacts_dir=artifacts_dir,
    )
    assert sent_metrics["is_synthetic"] is True
    assert len(sent_metrics["confusion_matrix"]) == 3
    assert sent_metrics["unseen_evaluation"]["total"] >= 5

    # Wire FastAPI registry to temporary artifacts and verify API behavior.
    monkeypatch.setenv("ML_API_KEY", "test-secret-key")
    test_registry = ml_api.ModelRegistry(artifacts_dir=artifacts_dir)
    test_registry.load(force=True)
    monkeypatch.setattr(ml_api, "registry", test_registry)

    client = TestClient(ml_api.app)

    # Health check
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["ready"] is True
    assert health_res.json()["sentiment_ready"] is True

    # Auth enforcement
    assert client.post("/predict", json={"source": "Website", "product_interest": "Demo", "enquiry_length": 100}).status_code == 401
    assert client.get("/metrics", headers={"x-api-key": "wrong"}).status_code == 401

    # Prediction with normalization & comparison
    pred_res = client.post(
        "/predict",
        headers={"x-api-key": "test-secret-key"},
        json={"source": "Website", "product_interest": "Demo request", "enquiry_length": 320},
    )
    assert pred_res.status_code == 200
    pred = pred_res.json()
    assert 0.0 <= pred["conversion_probability"] <= 1.0
    assert set(pred["comparison"].keys()) == {"logistic_regression", "random_forest"}
    assert pred["temperature"] in {"HOT", "WARM", "COLD"}
    assert pred["normalized_features"]["source"] == "public_form"
    assert pred["normalized_features"]["product_interest"] == "sales_demo"
    assert "label" in pred["segment_profile"]
    assert "pc1" in pred["pca_point"] and "pc2" in pred["pca_point"]

    # Sentiment prediction
    sent_res = client.post(
        "/sentiment",
        headers={"x-api-key": "test-secret-key"},
        json={"text": "We loved the proposal and want to start immediately"},
    )
    assert sent_res.status_code == 200
    sent_data = sent_res.json()
    assert sent_data["sentiment"] in {"positive", "neutral", "negative"}
    assert abs(sum(sent_data["probabilities"].values()) - 1.0) < 0.02

    # Metrics endpoints
    assert client.get("/metrics", headers={"x-api-key": "test-secret-key"}).status_code == 200
    assert client.get("/sentiment/metrics", headers={"x-api-key": "test-secret-key"}).status_code == 200

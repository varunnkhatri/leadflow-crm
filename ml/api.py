"""FastAPI ML inference service with startup artifact caching and normalized features."""

from __future__ import annotations

import json
import os
import secrets
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

_ML_DIR = Path(__file__).resolve().parent
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

from preprocessing import prepare_features_frame  # noqa: E402

ROOT = Path(__file__).parent / "artifacts"


class ModelRegistry:
    """In-memory cache for trained ML pipelines and evaluation metrics."""

    def __init__(self, artifacts_dir: Path = ROOT) -> None:
        self.artifacts_dir = artifacts_dir
        self._lock = Lock()
        self.loaded = False
        self.conversion_models: dict[str, Any] = {}
        self.selected_model: str = "logistic_regression"
        self.segments_bundle: tuple[Any, Any, Any, list[dict[str, Any]]] | None = None
        self.metrics_data: dict[str, Any] | None = None
        self.sentiment_model: Any = None
        self.sentiment_metrics_data: dict[str, Any] | None = None

    def load(self, force: bool = False) -> None:
        with self._lock:
            if self.loaded and not force:
                return

            metrics_path = self.artifacts_dir / "metrics.json"
            if metrics_path.exists():
                self.metrics_data = json.loads(metrics_path.read_text())
                self.selected_model = str(
                    self.metrics_data.get("selected_model", "random_forest")
                )
            else:
                self.metrics_data = None

            self.conversion_models = {}
            for name in ("logistic_regression", "random_forest"):
                model_path = self.artifacts_dir / f"{name}.joblib"
                if model_path.exists():
                    self.conversion_models[name] = joblib.load(model_path)

            segments_path = self.artifacts_dir / "segments.joblib"
            self.segments_bundle = (
                joblib.load(segments_path) if segments_path.exists() else None
            )

            sentiment_path = self.artifacts_dir / "sentiment.joblib"
            self.sentiment_model = (
                joblib.load(sentiment_path) if sentiment_path.exists() else None
            )

            sent_metrics_path = self.artifacts_dir / "sentiment_metrics.json"
            self.sentiment_metrics_data = (
                json.loads(sent_metrics_path.read_text())
                if sent_metrics_path.exists()
                else None
            )

            self.loaded = True

    @property
    def conversion_ready(self) -> bool:
        return (
            self.selected_model in self.conversion_models
            and self.segments_bundle is not None
            and self.metrics_data is not None
        )

    @property
    def sentiment_ready(self) -> bool:
        return self.sentiment_model is not None and self.sentiment_metrics_data is not None


registry = ModelRegistry()


@asynccontextmanager
async def lifespan(_: FastAPI):
    registry.load(force=True)
    yield


app = FastAPI(title="LeadFlow ML", version="2.0.0", lifespan=lifespan)


class Lead(BaseModel):
    source: str = Field(default="unknown", max_length=100)
    product_interest: str = Field(default="unknown", max_length=200)
    enquiry_length: int = Field(ge=0, le=3000)


class SentimentInput(BaseModel):
    text: str = Field(min_length=1, max_length=3000)


def authorize(key: str | None) -> None:
    expected = os.getenv("ML_API_KEY")
    if not expected or not secrets.compare_digest(key or "", expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _ensure_artifacts_loaded() -> None:
    if not registry.loaded:
        registry.load()


@app.get("/health")
def health() -> dict[str, Any]:
    _ensure_artifacts_loaded()
    return {
        "ready": registry.conversion_ready,
        "conversion_ready": registry.conversion_ready,
        "sentiment_ready": registry.sentiment_ready,
        "selected_model": registry.selected_model if registry.conversion_ready else None,
        "models_loaded": sorted(registry.conversion_models.keys()),
        "version": app.version,
    }


@app.post("/predict")
def predict(lead: Lead, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(x_api_key)
    _ensure_artifacts_loaded()
    if not registry.conversion_ready:
        raise HTTPException(status_code=503, detail="Conversion models are not trained yet")

    raw_df = pd.DataFrame([lead.model_dump()])
    features = prepare_features_frame(raw_df)

    comparison: dict[str, float] = {}
    for model_name, model in registry.conversion_models.items():
        comparison[model_name] = round(float(model.predict_proba(features)[0, 1]), 4)

    primary_prob = comparison[registry.selected_model]
    assert registry.segments_bundle is not None
    seg_prep, km, pca, cluster_profiles = registry.segments_bundle
    z_vec = seg_prep.transform(features)
    segment_id = int(km.predict(z_vec)[0])
    pca_coords = pca.transform(z_vec)[0]

    profile_match = next(
        (p for p in cluster_profiles if int(p["cluster"]) == segment_id),
        None,
    )

    temperature = "HOT" if primary_prob >= 0.75 else "WARM" if primary_prob >= 0.40 else "COLD"

    return {
        "conversion_probability": primary_prob,
        "model": registry.selected_model,
        "comparison": comparison,
        "temperature": temperature,
        "segment": segment_id,
        "segment_profile": profile_match,
        "pca_point": {
            "pc1": round(float(pca_coords[0]), 4),
            "pc2": round(float(pca_coords[1]), 4),
        },
        "normalized_features": {
            "source": str(features.iloc[0]["source_norm"])
            if pd.notna(features.iloc[0]["source_norm"])
            else "other",
            "product_interest": str(features.iloc[0]["service_norm"])
            if pd.notna(features.iloc[0]["service_norm"])
            else "other",
            "enquiry_length": int(round(float(features.iloc[0]["enquiry_length"]))),
        },
    }


@app.get("/metrics")
def metrics(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(x_api_key)
    _ensure_artifacts_loaded()
    if not registry.metrics_data:
        raise HTTPException(status_code=503, detail="Conversion metrics unavailable; train models first")
    return registry.metrics_data


@app.post("/sentiment")
def sentiment(body: SentimentInput, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(x_api_key)
    _ensure_artifacts_loaded()
    if not registry.sentiment_ready:
        raise HTTPException(status_code=503, detail="Sentiment model unavailable; train sentiment first")

    cleaned = body.text.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail="Text must not be blank")

    model = registry.sentiment_model
    probs = model.predict_proba([cleaned])[0]
    classes = [str(c) for c in model.classes_]
    prob_map = {cls: round(float(p), 4) for cls, p in zip(classes, probs)}
    best_idx = int(np.argmax(probs))

    return {
        "sentiment": classes[best_idx],
        "confidence": round(float(probs[best_idx]), 4),
        "probabilities": prob_map,
        "model": "tfidf_logistic_regression",
    }


@app.get("/sentiment/metrics")
def sentiment_metrics(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(x_api_key)
    _ensure_artifacts_loaded()
    if not registry.sentiment_metrics_data:
        raise HTTPException(status_code=503, detail="Sentiment metrics unavailable; train sentiment first")
    return registry.sentiment_metrics_data

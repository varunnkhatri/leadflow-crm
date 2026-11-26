"""Shared feature normalization and leakage guards for LeadFlow conversion models."""

from __future__ import annotations

import re
from typing import Iterable

import numpy as np
import pandas as pd

CANONICAL_SOURCES = (
    "public_form",
    "referral",
    "social",
    "paid_ads",
    "manual",
    "other",
)

CANONICAL_SERVICES = (
    "website",
    "marketing",
    "consulting",
    "sales_demo",
    "support",
    "other",
)

MODEL_FEATURES = [
    "source_norm",
    "service_norm",
    "enquiry_length",
    "enquiry_log_length",
]

FORBIDDEN_LEAKAGE_COLUMNS = frozenset(
    {
        "converted",
        "stage",
        "status",
        "deal_value",
        "won_at",
        "closed_at",
        "lead_score",
        "purchase_probability",
        "temperature",
        "assigned_user_id",
    }
)

_SOURCE_EXACT_MAP = {
    "public_form": "public_form",
    "public": "public_form",
    "website": "public_form",
    "web": "public_form",
    "web_form": "public_form",
    "contact_form": "public_form",
    "contact": "public_form",
    "landing_page": "public_form",
    "intake": "public_form",
    "referral": "referral",
    "partner": "referral",
    "word_of_mouth": "referral",
    "client_referral": "referral",
    "social": "social",
    "instagram": "social",
    "linkedin": "social",
    "facebook": "social",
    "twitter": "social",
    "x": "social",
    "youtube": "social",
    "paid_ads": "paid_ads",
    "paid_media": "paid_ads",
    "ads": "paid_ads",
    "google_ads": "paid_ads",
    "meta_ads": "paid_ads",
    "ppc": "paid_ads",
    "campaign": "paid_ads",
    "manual": "manual",
    "direct": "manual",
    "phone": "manual",
    "call": "manual",
    "walkin": "manual",
    "walk_in": "manual",
    "email": "manual",
    "outbound": "manual",
}


def _clean_token(value: object) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return ""
    text = str(value).strip().lower()
    if text in {"", "nan", "none", "null", "na", "n/a", "unknown"}:
        return ""
    return re.sub(r"[\s\-]+", "_", text)


def normalize_source(value: object) -> object:
    """Normalize a raw CRM lead source into canonical categories.

    Returns np.nan for missing/unknown values so a pipeline imputer fitted on
    training data handles missingness cleanly without leakage.
    """
    token = _clean_token(value)
    if not token:
        return np.nan
    if token in _SOURCE_EXACT_MAP:
        return _SOURCE_EXACT_MAP[token]
    if "refer" in token or "partner" in token:
        return "referral"
    if any(k in token for k in ("insta", "linked", "face", "social", "youtube")):
        return "social"
    if any(k in token for k in ("ad", "ppc", "paid", "campaign")):
        return "paid_ads"
    if any(k in token for k in ("web", "form", "public", "site", "landing")):
        return "public_form"
    if any(k in token for k in ("manual", "phone", "call", "email", "direct", "walk")):
        return "manual"
    return "other"


def normalize_service(value: object) -> object:
    """Normalize a raw product_interest / service string into canonical buckets."""
    token = _clean_token(value)
    if not token:
        return np.nan
    if any(k in token for k in ("website", "web_dev", "web_design", "ecommerce", "landing")):
        return "website"
    if any(k in token for k in ("marketing", "social_media", "content", "paid_media", "seo", "brand")):
        return "marketing"
    if any(k in token for k in ("consult", "strategy", "advisory", "audit")):
        return "consulting"
    if any(k in token for k in ("demo", "sales", "product_enquiry", "pricing", "quote")):
        return "sales_demo"
    if any(k in token for k in ("support", "help", "ticket", "issue", "bug", "billing")):
        return "support"
    return "other"


def normalize_enquiry_length(value: object) -> float:
    """Coerce enquiry length to float in [0, 3000], preserving missing as NaN."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return float("nan")
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return float("nan")
    if np.isnan(numeric) or np.isinf(numeric):
        return float("nan")
    return float(np.clip(numeric, 0.0, 3000.0))


def validate_no_leakage(columns: Iterable[str]) -> None:
    """Raise ValueError if any post-outcome/target column appears in model features."""
    leaked = sorted(set(columns).intersection(FORBIDDEN_LEAKAGE_COLUMNS))
    if leaked:
        raise ValueError(f"Data leakage detected: forbidden columns in features: {leaked}")


def prepare_features_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Transform raw intake columns into normalized, leakage-free model features."""
    required = {"source", "product_interest", "enquiry_length"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required input columns: {sorted(missing)}")

    validate_no_leakage([c for c in df.columns if c in MODEL_FEATURES])

    lengths = df["enquiry_length"].map(normalize_enquiry_length).astype(float)
    log_lengths = np.where(np.isnan(lengths), np.nan, np.log1p(lengths))

    out = pd.DataFrame(
        {
            "source_norm": df["source"].map(normalize_source),
            "service_norm": df["product_interest"].map(normalize_service),
            "enquiry_length": lengths,
            "enquiry_log_length": log_lengths,
        },
        index=df.index,
    )
    return out[MODEL_FEATURES]

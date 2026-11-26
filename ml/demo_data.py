"""Generate synthetic demonstration leads dataset (clearly labeled synthetic, not real customer data)."""

from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pandas as pd

_ML_DIR = Path(__file__).resolve().parent
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

from preprocessing import normalize_service, normalize_source  # noqa: E402

# Realistic CRM intake segments (clearly synthetic, non-customer observations)
PERSONA_SPECS = [
    {
        "name": "high_intent_referral_consulting",
        "weight": 0.24,
        "sources": ["referral", "Partner Referral", "manual", "Phone Call"],
        "services": ["consulting", "Strategy Advisory", "Sales enquiry", "Demo request"],
        "len_range": (240, 880),
        "base_logit": 1.05,
    },
    {
        "name": "inbound_website_marketing",
        "weight": 0.38,
        "sources": ["public_form", "Website", "contact_form", "paid_ads", "Paid media"],
        "services": ["website", "Web Development", "marketing", "Digital marketing"],
        "len_range": (110, 340),
        "base_logit": 0.10,
    },
    {
        "name": "quick_social_support",
        "weight": 0.24,
        "sources": ["social", "Instagram", "LinkedIn", "unknown"],
        "services": ["Social media strategy", "Support", "Product enquiry"],
        "len_range": (15, 95),
        "base_logit": -1.35,
    },
    {
        "name": "enterprise_web_rfp",
        "weight": 0.14,
        "sources": ["public_form", "Website", "referral"],
        "services": ["website", "Web Development", "Demo request"],
        "len_range": (380, 950),
        "base_logit": 1.35,
    },
]


def generate_synthetic_leads(n: int = 2400, seed: int = 42) -> pd.DataFrame:
    """Generate realistic, clearly labeled synthetic B2B/agency CRM intake leads."""
    rng = np.random.default_rng(seed)

    weights = np.array([p["weight"] for p in PERSONA_SPECS])
    weights = weights / weights.sum()
    persona_indices = rng.choice(len(PERSONA_SPECS), size=n, p=weights)

    raw_sources = np.empty(n, dtype=object)
    raw_services = np.empty(n, dtype=object)
    lengths = np.empty(n, dtype=float)
    base_logits = np.empty(n, dtype=float)

    for i, p_idx in enumerate(persona_indices):
        spec = PERSONA_SPECS[p_idx]
        raw_sources[i] = rng.choice(spec["sources"])
        raw_services[i] = rng.choice(spec["services"])
        lo, hi = spec["len_range"]
        lengths[i] = float(rng.integers(lo, hi))
        base_logits[i] = spec["base_logit"]

    src_norm = pd.Series(raw_sources).map(normalize_source).fillna("other").to_numpy()
    svc_norm = pd.Series(raw_services).map(normalize_service).fillna("other").to_numpy()

    # Non-linear synthetic conversion propensity with realistic uncertainty.
    logit = (
        base_logits
        + 0.35 * ((lengths >= 200) & np.isin(svc_norm, ["website", "consulting", "sales_demo"]))
        - 0.70 * (svc_norm == "support")
        + 0.30 * (src_norm == "referral")
        - 0.35 * ((lengths < 50) & (src_norm == "social"))
        + rng.normal(0.0, 0.35, size=n)
    )
    prob = 1.0 / (1.0 + np.exp(-logit))
    converted = rng.binomial(1, prob)

    # Inject small realistic missingness (~1.5%) to exercise pipeline imputation.
    missing_src_mask = rng.random(n) < 0.015
    missing_svc_mask = rng.random(n) < 0.015
    missing_len_mask = rng.random(n) < 0.015

    raw_sources[missing_src_mask] = None
    raw_services[missing_svc_mask] = ""
    lengths_out = lengths.astype(object)
    lengths_out[missing_len_mask] = np.nan

    return pd.DataFrame(
        {
            "source": raw_sources,
            "product_interest": raw_services,
            "enquiry_length": lengths_out,
            "converted": converted,
            "is_synthetic": True,
            "dataset_provenance": "synthetic_leadflow_crm_v2",
        }
    )


if __name__ == "__main__":
    df = generate_synthetic_leads()
    out_path = Path(__file__).parent / "demo_leads.csv"
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} synthetic leads at {out_path} (conversion rate: {df['converted'].mean():.1%})")

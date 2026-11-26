# LeadFlow Academic ML Service

Python FastAPI inference and training module for LeadFlow CRM.

## Setup & Training

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python demo_data.py
.venv/bin/python train.py demo_leads.csv --provenance "Synthetic LeadFlow CRM v2 demonstration dataset (non-customer)"
.venv/bin/python demo_sentiment.py
.venv/bin/python sentiment.py demo_sentiment.csv --provenance "Synthetic LeadFlow CRM v2 sentiment dataset (non-customer)"
```

## Running Tests & Server

```bash
.venv/bin/pytest -v tests
ML_API_KEY="your-secret-key" .venv/bin/uvicorn api:app --host 0.0.0.0 --port 8000
```

## Notes on Academic Rigor
- Input features (`source`, `product_interest`, `enquiry_length`) are canonicalized via `preprocessing.py` and strictly exclude post-outcome columns (`stage`, `status`, `deal_value`, `converted`) to prevent data leakage.
- Train/test splits happen before fitting imputers, encoders, scalers, PCA, or K-Means.
- Logistic Regression and Random Forest are compared via 5-fold Stratified Cross-Validation; the best model is selected automatically while both artifacts remain persisted.
- K-Means evaluates $k \in \{2..7\}$ using Silhouette Score and projects segments into 2D via PCA.
- `api.py` caches trained `.joblib` artifacts once at startup via FastAPI `lifespan` instead of reloading models on each prediction.

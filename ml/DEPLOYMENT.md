# ML Service Deployment & Vercel Compatibility

## 1. Container Host Deployment (Recommended)
Build from the repository root using `ml/Dockerfile`:

```bash
docker build -t leadflow-ml ./ml
docker run --rm -p 8000:8000 -e ML_API_KEY="your-strong-random-secret" leadflow-ml
```

`ml/Dockerfile` runs `demo_data.py`, `train.py`, `demo_sentiment.py`, and `sentiment.py` at image build time so all `.joblib` models and evaluation JSON files are baked into `/app/artifacts/` (`1.3 MB` total). At runtime, `uvicorn api:app` loads all artifacts **once at startup** via FastAPI `lifespan` (`ModelRegistry`).

## 2. Separate FastAPI Vercel Deployment Compatibility
- **Entrypoint:** `ml/api.py` exports `app = FastAPI(...)` and includes a `sys.path` guard so both `uvicorn api:app` (root dir `ml/`) and `uvicorn ml.api:app` (repo root) resolve `ml/preprocessing.py`.
- **Dependency Size:** Runtime dependencies in `ml/requirements.txt` (`fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `numpy`, `joblib`, plus transitive `scipy`, `pydantic`) measure **~220 MB** unzipped in Python 3.11 (`~233 MB` only when dev/test `pytest` + `httpx` + `pygments` are installed), remaining under Vercel's **250 MB** unzipped serverless function limit.
- **Read-Only Filesystem & Cold Starts:** `ml/api.py` never writes to disk at request time and caches all `.joblib` pipelines (`1.3 MB` total) in memory once per serverless cold start (`ModelRegistry.load()`), avoiding expensive model training or disk reloading per prediction.
- **Required Vercel Build Step:** Because `ml/.gitignore` excludes `ml/artifacts/` and `ml/*.csv` from Git, a standalone Vercel Python deployment pointing to `ml/` **must** generate `artifacts/` during the Vercel Build Command:
  ```bash
  python demo_data.py && python train.py demo_leads.csv --provenance "Synthetic LeadFlow CRM v2 demonstration dataset (non-customer)" && python demo_sentiment.py && python sentiment.py demo_sentiment.csv --provenance "Synthetic LeadFlow CRM v2 sentiment dataset (non-customer)"
  ```

## 3. Environment Variables
Configure the Next.js / Vercel CRM frontend server environment (never `NEXT_PUBLIC_`):
- `ML_API_URL`: Base URL of the deployed FastAPI service (e.g., `https://leadflow-ml.example.com`)
- `ML_API_KEY`: Strong random secret matching `ML_API_KEY` on the FastAPI service
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Existing Supabase project settings

## 4. Verification & Academic Limitations
1. Verify `GET /health`, authenticated `POST /predict`, `GET /metrics`, `POST /sentiment`, and `GET /sentiment/metrics`.
2. Log in to a test workspace, open `/ml-lab` and `/ml-lab/metrics`, and verify workspace isolation (`401`/`403` when unauthenticated or outside workspace).
3. All pre-packaged models train on **synthetic demonstration data**, not real customers. Do not interpret synthetic persona win rates or scores as calibrated business forecasts.

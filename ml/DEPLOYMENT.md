# Deployment
Build from repository root: `docker build -t leadflow-ml ./ml`.
Generate a strong random ML_API_KEY and supply it through the hosting provider's secret settings.
Run locally: `docker run --rm -p 8000:8000 --env-file /path/to/private.env leadflow-ml`.
Deploy the same container to an HTTPS-capable Python/container host. Configure the CRM server environment with ML_API_URL (service base URL) and ML_API_KEY (matching secret). Never use NEXT_PUBLIC for these variables.
Use a preview deployment of mca-ml-upgrade before merging.
Check /health, authenticated /predict, /metrics, /sentiment and /sentiment/metrics.
Log in to a test workspace, open /ml-lab, choose a synthetic lead, verify all outputs and test cross-workspace access denial.
The container trains on synthetic demonstration data, not real customers. Do not interpret scores as calibrated business forecasts. Use synthetic enquiries for the hosted academic demonstration; basic contact redaction does not fully anonymize text.
No database migrations are required for read-only ML predictions. Do not send real customer text to an external service without appropriate authorization.

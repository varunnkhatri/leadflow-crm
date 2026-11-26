"""Generate synthetic datasets and train ML artifacts at build time for Vercel and container deployments."""

from __future__ import annotations

import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from demo_data import generate_synthetic_leads  # noqa: E402
from demo_sentiment import generate_synthetic_sentiment  # noqa: E402
from sentiment import train_sentiment  # noqa: E402
from train import train  # noqa: E402


def main() -> None:
    leads_csv = ML_DIR / "demo_leads.csv"
    sent_csv = ML_DIR / "demo_sentiment.csv"

    generate_synthetic_leads().to_csv(leads_csv, index=False)
    conv_metrics = train(
        leads_csv,
        provenance="Synthetic LeadFlow CRM v2 demonstration dataset (non-customer)",
    )

    generate_synthetic_sentiment().to_csv(sent_csv, index=False)
    sent_metrics = train_sentiment(
        sent_csv,
        provenance="Synthetic LeadFlow CRM v2 sentiment dataset (non-customer)",
    )

    print(
        f"ML build complete: selected_model={conv_metrics['selected_model']}, "
        f"clusters={conv_metrics['segmentation']['clusters']}, "
        f"sentiment_acc={sent_metrics['metrics']['accuracy']}"
    )


if __name__ == "__main__":
    main()

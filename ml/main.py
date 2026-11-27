"""Vercel ASGI entrypoint re-exporting the FastAPI app from api.py."""

import sys
from pathlib import Path

_ML_DIR = Path(__file__).resolve().parent
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

from api import app  # noqa: E402

__all__ = ["app"]

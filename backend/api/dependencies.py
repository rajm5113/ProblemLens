from __future__ import annotations

from fastapi import HTTPException, Header, Request

from config import PIPELINE_API_KEY
from store.card_store import CardStore


def get_card_store(request: Request) -> CardStore:
    return request.app.state.card_store


def require_pipeline_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    """Guard for admin-only endpoints that trigger expensive pipeline operations."""
    if not PIPELINE_API_KEY:
        return
    if x_api_key != PIPELINE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from api.dependencies import get_card_store
from api.models import StatsResponse
from api.rate_limit import limiter
from store.card_store import CardStore

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
@limiter.limit("30/minute")
def get_stats(request: Request, store: CardStore = Depends(get_card_store)) -> StatsResponse:
    return StatsResponse.from_cards(store.all())

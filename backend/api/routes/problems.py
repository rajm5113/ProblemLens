from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api.dependencies import get_card_store
from api.models import ProblemCardResponse
from api.rate_limit import limiter
from models.enums import Sector
from models.problem_card import ProblemIntelligenceCard
from store.card_store import CardStore

router = APIRouter(tags=["problems"])

PIP_ID_PATTERN = re.compile(r"^PIP-\d{3,6}$")

ALLOWED_SORTS = {"opportunity_score", "created_at", "signal_count"}
ALLOWED_ORDERS = {"asc", "desc"}


@router.get("/problems", response_model=list[ProblemCardResponse])
@limiter.limit("60/minute")
def list_problems(
    request: Request,
    sector: str | None = None,
    min_score: int | None = Query(default=None, ge=1, le=10),
    sort_by: str = "opportunity_score",
    order: str = "desc",
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    store: CardStore = Depends(get_card_store),
) -> list[ProblemCardResponse]:
    cards = store.all()

    if sector:
        valid_sectors = {item.value for item in Sector}
        if sector not in valid_sectors:
            raise HTTPException(status_code=400, detail="Invalid sector filter")
        cards = [card for card in cards if card.sector.value == sector]

    if min_score is not None:
        cards = [card for card in cards if card.opportunity_score >= min_score]

    cards = _sort_cards(cards, sort_by=sort_by, order=order)
    page = cards[offset : offset + limit]
    return [ProblemCardResponse.from_card(card) for card in page]


@router.get("/problems/{problem_id}", response_model=ProblemCardResponse)
@limiter.limit("60/minute")
def get_problem(
    request: Request,
    problem_id: str,
    store: CardStore = Depends(get_card_store),
) -> ProblemCardResponse:
    if not PIP_ID_PATTERN.match(problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem ID format")
    card = store.get(problem_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Card {problem_id} not found")
    return ProblemCardResponse.from_card(card)


def _sort_cards(
    cards: list[ProblemIntelligenceCard],
    sort_by: str,
    order: str,
) -> list[ProblemIntelligenceCard]:
    if sort_by not in ALLOWED_SORTS:
        raise HTTPException(status_code=400, detail="Invalid sort_by")
    if order not in ALLOWED_ORDERS:
        raise HTTPException(status_code=400, detail="Invalid order")
    reverse = order == "desc"
    return sorted(cards, key=lambda card: getattr(card, sort_by), reverse=reverse)

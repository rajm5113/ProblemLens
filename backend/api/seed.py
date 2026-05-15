from __future__ import annotations

from pathlib import Path

from models.problem_card import ProblemIntelligenceCard
from store.card_store import CardStore

SEED_PATH = Path(__file__).resolve().parent / "seed_data" / "cards.json"


def load_seed_cards(path: Path = SEED_PATH) -> list[ProblemIntelligenceCard]:
    return [ProblemIntelligenceCard.model_validate_json(item) for item in _load_json_items(path)]


def seed_if_empty(store: CardStore, path: Path = SEED_PATH) -> int:
    if store.all():
        return 0
    cards = load_seed_cards(path)
    for card in cards:
        store.save(card)
    return len(cards)


def _load_json_items(path: Path) -> list[str]:
    import json

    data = json.loads(path.read_text(encoding="utf-8"))
    return [json.dumps(item) for item in data]

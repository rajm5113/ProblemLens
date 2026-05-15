from __future__ import annotations

from pathlib import Path

from models.problem_card import ProblemIntelligenceCard
from store.card_store import CardStore

SEED_PATH = Path(__file__).resolve().parent / "seed_data" / "cards.json"


def load_seed_cards(path: Path = SEED_PATH) -> list[ProblemIntelligenceCard]:
    return [ProblemIntelligenceCard.model_validate_json(item) for item in _load_json_items(path)]


def seed_if_empty(store: CardStore, path: Path = SEED_PATH) -> int:
    """Seed the database from the JSON file.

    Seeds all cards from the file if the DB is empty.
    If the DB already has cards but the seed file has *more*, adds only
    the missing ones (identified by card ID) so a fresh GitHub push
    always propagates new seed cards to production.
    """
    seed_cards = load_seed_cards(path)
    existing_ids = {c.id for c in store.all()}

    to_add = [c for c in seed_cards if c.id not in existing_ids]
    for card in to_add:
        store.save(card)
    return len(to_add)


def _load_json_items(path: Path) -> list[str]:
    import json

    data = json.loads(path.read_text(encoding="utf-8"))
    return [json.dumps(item) for item in data]

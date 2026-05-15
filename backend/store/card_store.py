from __future__ import annotations

import sqlite3
from difflib import SequenceMatcher
from pathlib import Path

from models.problem_card import ProblemIntelligenceCard


class CardStore:
    def __init__(self, db_path: str | Path = "store/cards.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                numeric_id INTEGER NOT NULL UNIQUE,
                title TEXT NOT NULL,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        self.conn.commit()

    def save(self, card: ProblemIntelligenceCard) -> None:
        self.conn.execute(
            """
            INSERT OR REPLACE INTO cards (id, numeric_id, title, payload, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (card.id, card.numeric_id, card.title, card.model_dump_json(), card.updated_at.isoformat()),
        )
        self.conn.commit()

    def get(self, card_id: str) -> ProblemIntelligenceCard | None:
        row = self.conn.execute("SELECT payload FROM cards WHERE id = ?", (card_id,)).fetchone()
        return ProblemIntelligenceCard.model_validate_json(row[0]) if row else None

    def all(self) -> list[ProblemIntelligenceCard]:
        rows = self.conn.execute("SELECT payload FROM cards ORDER BY numeric_id").fetchall()
        return [ProblemIntelligenceCard.model_validate_json(row[0]) for row in rows]

    def get_all(self) -> list[ProblemIntelligenceCard]:
        return self.all()

    def next_id(self) -> str:
        existing = self.all()
        if not existing:
            return "PIP-012"
        max_num = max(card.numeric_id for card in existing)
        return f"PIP-{max_num + 1:03d}"

    def find_similar(self, title: str, threshold: float = 0.85) -> ProblemIntelligenceCard | None:
        best_card = None
        best_score = 0.0
        for card in self.all():
            score = SequenceMatcher(None, title.lower(), card.title.lower()).ratio()
            if score > best_score:
                best_score = score
                best_card = card
        return best_card if best_card and best_score >= threshold else None

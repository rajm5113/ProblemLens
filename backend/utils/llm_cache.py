from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path


class LLMCache:
    def __init__(self, db_path: str | Path = "store/llm_cache.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cache (
                prompt_hash TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                response TEXT NOT NULL,
                tokens_in INTEGER NOT NULL,
                tokens_out INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        self.conn.commit()

    def _hash(self, prompt: str, model: str) -> str:
        return hashlib.sha256(f"{model}::{prompt}".encode("utf-8")).hexdigest()

    def get(self, prompt: str, model: str) -> str | None:
        row = self.conn.execute(
            "SELECT response FROM cache WHERE prompt_hash = ?",
            (self._hash(prompt, model),),
        ).fetchone()
        return row[0] if row else None

    def put(
        self,
        prompt: str,
        model: str,
        provider: str,
        response: str,
        tokens_in: int,
        tokens_out: int,
    ) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO cache VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            (self._hash(prompt, model), provider, model, response, tokens_in, tokens_out),
        )
        self.conn.commit()

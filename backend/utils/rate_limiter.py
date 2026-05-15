from __future__ import annotations

import time
from dataclasses import dataclass

GEMINI_FREE_TIER = {
    "requests_per_minute": 15,
    "tokens_per_day": 1_000_000,
}

OPENAI_LIMITS = {
    "requests_per_minute": 60,
    "tokens_per_minute": 200_000,
}


@dataclass
class TokenBucket:
    capacity: int
    refill_per_second: float
    tokens: float | None = None
    updated_at: float | None = None

    def __post_init__(self) -> None:
        self.tokens = float(self.capacity if self.tokens is None else self.tokens)
        self.updated_at = time.monotonic() if self.updated_at is None else self.updated_at

    def allow(self, cost: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - float(self.updated_at)
        self.tokens = min(self.capacity, float(self.tokens) + elapsed * self.refill_per_second)
        self.updated_at = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

MAX_PRIMARY_RETRIES = 1
MAX_FALLBACK_RETRIES = 1
RETRY_BACKOFF_SECONDS = 2

T = TypeVar("T")


def retry_once(fn: Callable[[], T], backoff_seconds: float = RETRY_BACKOFF_SECONDS) -> T:
    try:
        return fn()
    except Exception:
        time.sleep(backoff_seconds)
        return fn()

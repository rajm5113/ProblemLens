from __future__ import annotations

import hashlib
import re


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def fingerprint_text(text: str) -> str:
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


def compute_fingerprint(text: str) -> str:
    return fingerprint_text(text)

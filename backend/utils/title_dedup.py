from __future__ import annotations

from difflib import SequenceMatcher


def is_title_duplicate(
    new_title: str,
    existing_titles: list[str],
    threshold: float = 0.85,
) -> bool:
    """Return True when a title is too similar to an already accepted title."""
    normalized = new_title.lower().strip()
    if not normalized:
        return False
    return any(
        SequenceMatcher(None, normalized, existing.lower().strip()).ratio() >= threshold
        for existing in existing_titles
    )

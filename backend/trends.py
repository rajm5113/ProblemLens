from __future__ import annotations

from datetime import datetime, timezone

from models.enums import TrendStatus
from store.card_store import CardStore


def update_trends(store: CardStore) -> int:
    """Update trend_status on all cards and return the number changed."""
    now = datetime.now(timezone.utc)
    updated = 0

    for card in store.all():
        age_days = (now - card.created_at).days
        days_since_update = (now - card.updated_at).days
        old_status = card.trend_status

        if age_days < 7:
            new_status = TrendStatus.NEW
        elif days_since_update < 7 and card.signal_count >= 3:
            new_status = TrendStatus.RISING
        elif days_since_update >= 14:
            new_status = TrendStatus.DECLINING
        else:
            new_status = TrendStatus.STABLE

        if new_status != old_status:
            card.trend_status = new_status
            card.updated_at = now
            store.save(card)
            updated += 1

    return updated

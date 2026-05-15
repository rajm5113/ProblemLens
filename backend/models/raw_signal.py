from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field, HttpUrl

from .enums import SourcePlatform


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SourceMetadata(BaseModel):
    url: HttpUrl | str
    platform: SourcePlatform
    author: str | None = None
    channel: str | None = None
    scraped_at: datetime = Field(default_factory=utc_now)
    raw_text: str = Field(min_length=1, max_length=5000)


class RawSignal(BaseModel):
    signal_id: str
    source: SourceMetadata
    fingerprint: str
    is_relevant: bool | None = None
    relevance_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=utc_now)

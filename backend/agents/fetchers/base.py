from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from models.enums import SourcePlatform
from models.source_config import SourceConfig


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RawPost(BaseModel):
    url: str = Field(min_length=1)
    title: str = ""
    body: str = ""
    author: str | None = None
    channel: str | None = None
    platform: SourcePlatform
    fetched_at: datetime = Field(default_factory=utc_now)


class BaseFetcher(ABC):
    @abstractmethod
    def fetch(self, config: SourceConfig) -> list[RawPost]:
        """Fetch raw posts from a source and normalize them."""

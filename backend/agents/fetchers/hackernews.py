from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from models.enums import SourcePlatform
from models.source_config import SourceConfig
from .base import BaseFetcher, RawPost

logger = logging.getLogger(__name__)


class HackerNewsFetcher(BaseFetcher):
    BASE = "https://hacker-news.firebaseio.com/v0"

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        try:
            ids_response = httpx.get(config.url or f"{self.BASE}/topstories.json", timeout=10)
            ids_response.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.warning(f"HackerNews: failed to fetch story IDs ({exc}), skipping")
            return []

        story_ids = ids_response.json()[: config.max_items]
        posts: list[RawPost] = []

        for item_id in story_ids:
            try:
                item_response = httpx.get(f"{self.BASE}/item/{item_id}.json", timeout=10)
                item_response.raise_for_status()
                item = item_response.json()
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                logger.warning(f"HackerNews: failed to fetch item {item_id} ({exc}), skipping")
                continue

            if not item or item.get("type") != "story":
                continue
            posts.append(
                RawPost(
                    url=item.get("url") or f"https://news.ycombinator.com/item?id={item_id}",
                    title=item.get("title", "") or "",
                    body=(item.get("text", "") or "")[:3000],
                    author=item.get("by"),
                    channel=config.name,
                    platform=SourcePlatform.HACKER_NEWS,
                    fetched_at=datetime.now(timezone.utc),
                )
            )
        return posts

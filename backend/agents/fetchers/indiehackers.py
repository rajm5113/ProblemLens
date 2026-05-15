from __future__ import annotations

import logging
import xml.etree.ElementTree as ET

import httpx

from models.enums import SourcePlatform
from models.source_config import SourceConfig
from .base import BaseFetcher, RawPost, utc_now

logger = logging.getLogger(__name__)


class IndieHackersFetcher(BaseFetcher):
    """Fetch community discussions from the Indie Hackers RSS feed."""

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        try:
            response = httpx.get(config.url, timeout=15)
            response.raise_for_status()
            root = ET.fromstring(response.content)
        except (httpx.HTTPStatusError, httpx.RequestError, ET.ParseError) as exc:
            logger.warning("IndieHackers: fetch failed (%s), skipping", exc)
            return []

        posts: list[RawPost] = []
        for item in root.findall(".//item")[: config.max_items]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            description = (item.findtext("description") or "").strip()
            if not title or not link:
                continue
            posts.append(
                RawPost(
                    url=link,
                    title=title,
                    body=description[:3000],
                    author=None,
                    channel=config.name,
                    platform=SourcePlatform.INDIE_HACKERS,
                    fetched_at=utc_now(),
                )
            )
        return posts

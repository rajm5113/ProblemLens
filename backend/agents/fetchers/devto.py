from __future__ import annotations

import logging
import xml.etree.ElementTree as ET

import httpx

from models.enums import SourcePlatform
from models.source_config import SourceConfig
from .base import BaseFetcher, RawPost, utc_now

logger = logging.getLogger(__name__)


class DevToFetcher(BaseFetcher):
    """
    Fetch articles from DEV Community (dev.to) RSS feeds.

    DEV.to provides free public RSS feeds for any tag:
      https://dev.to/feed/tag/{tag}

    No authentication required. Great for developer pain points,
    startup problems, and tech ecosystem discussions.
    """

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        try:
            response = httpx.get(
                config.url,
                timeout=15,
                follow_redirects=True,
            )
            response.raise_for_status()
            root = ET.fromstring(response.content)
        except (httpx.HTTPStatusError, httpx.RequestError, ET.ParseError) as exc:
            logger.warning("Dev.to %s: fetch failed (%s), skipping", config.name, exc)
            return []

        posts: list[RawPost] = []
        for item in root.findall(".//item")[: config.max_items]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            # Dev.to uses <description> for the article summary
            description = (item.findtext("description") or "").strip()
            author = (item.findtext("{http://purl.org/dc/elements/1.1/}creator") or "").strip()

            if not title or not link:
                continue

            posts.append(
                RawPost(
                    url=link,
                    title=title,
                    body=self._strip_html(description[:3000]),
                    author=author or None,
                    channel=config.name,
                    platform=SourcePlatform.OTHER,
                    fetched_at=utc_now(),
                )
            )

        logger.info("Dev.to %s: fetched %d posts", config.name, len(posts))
        return posts

    @staticmethod
    def _strip_html(html: str) -> str:
        """Remove HTML tags to get plain text."""
        import re
        text = html.replace("&lt;", "<").replace("&gt;", ">")
        text = text.replace("&amp;", "&").replace("&quot;", '"')
        text = text.replace("&#39;", "'").replace("&nbsp;", " ")
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

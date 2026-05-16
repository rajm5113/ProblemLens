from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from models.enums import SourcePlatform
from models.source_config import SourceConfig
from .base import BaseFetcher, RawPost

logger = logging.getLogger(__name__)


class RedditFetcher(BaseFetcher):
    """
    Fetches Reddit posts via PullPush API (public Reddit archive).

    Reddit blocks direct API access without OAuth2 credentials.
    PullPush (api.pullpush.io) mirrors Reddit's data and is free
    to use with no authentication required.
    """

    BASE_URL = "https://api.pullpush.io/reddit/search/submission/"

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        subreddit = self._extract_subreddit(config.url)
        if not subreddit:
            logger.warning(f"Reddit {config.name}: could not extract subreddit from URL, skipping")
            return []

        params = {
            "subreddit": subreddit,
            "size": config.max_items,
            "sort": "desc",
            "sort_type": "created_utc",
        }

        try:
            response = httpx.get(
                self.BASE_URL,
                params=params,
                timeout=20,
                follow_redirects=True,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning(f"Reddit {config.name}: HTTP {exc.response.status_code}, skipping")
            return []
        except httpx.RequestError as exc:
            logger.warning(f"Reddit {config.name}: network error ({exc}), skipping")
            return []

        posts: list[RawPost] = []
        raw_data = response.json().get("data", response.json())
        # Reddit native format: {data: {children: [{data: {...}}, ...]}}
        if isinstance(raw_data, dict) and "children" in raw_data:
            entries = [child.get("data", child) for child in raw_data["children"]]
        # PullPush format: {data: [{...}, ...]}
        elif isinstance(raw_data, list):
            entries = raw_data
        else:
            entries = []

        for data in entries[: config.max_items]:
            permalink = data.get("permalink", "")
            title = data.get("title", "") or ""
            body = (data.get("selftext", "") or "")[:3000]

            # Skip removed/deleted posts
            if body in ("[removed]", "[deleted]", ""):
                body = ""

            posts.append(
                RawPost(
                    url=f"https://reddit.com{permalink}" if permalink else config.url,
                    title=title,
                    body=body,
                    author=data.get("author"),
                    channel=config.name,
                    platform=SourcePlatform.REDDIT,
                    fetched_at=datetime.now(timezone.utc),
                )
            )

        logger.info(f"Reddit {config.name}: fetched {len(posts)} posts via PullPush")
        return posts

    @staticmethod
    def _extract_subreddit(url: str) -> str | None:
        """Extract subreddit name from a Reddit URL."""
        # https://www.reddit.com/r/india/hot.json?limit=25 -> india
        parts = url.split("/r/")
        if len(parts) < 2:
            return None
        subreddit = parts[1].split("/")[0]
        return subreddit if subreddit else None

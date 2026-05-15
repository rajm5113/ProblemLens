from __future__ import annotations

import httpx

from agents.fetchers.indiehackers import IndieHackersFetcher
from agents.fetchers.producthunt import ProductHuntFetcher
from models.enums import SourcePlatform
from models.source_config import SourceConfig


class FakeResponse:
    def __init__(self, content: bytes):
        self.content = content

    def raise_for_status(self) -> None:
        return None


RSS = b"""
<rss><channel>
  <item>
    <title>Founders struggle with user onboarding</title>
    <link>https://example.com/post-1</link>
    <description>No clear activation path for small SaaS teams.</description>
  </item>
  <item>
    <title>Indie makers face payment delays</title>
    <link>https://example.com/post-2</link>
    <description>International payments arrive late and fees are expensive.</description>
  </item>
</channel></rss>
"""


def test_indiehackers_parses_rss(monkeypatch) -> None:
    monkeypatch.setattr("agents.fetchers.indiehackers.httpx.get", lambda *_, **__: FakeResponse(RSS))
    config = SourceConfig(
        platform=SourcePlatform.INDIE_HACKERS,
        name="IndieHackers",
        url="https://www.indiehackers.com/feed.xml",
        max_items=1,
    )

    posts = IndieHackersFetcher().fetch(config)

    assert len(posts) == 1
    assert posts[0].platform == SourcePlatform.INDIE_HACKERS
    assert posts[0].url == "https://example.com/post-1"
    assert posts[0].channel == "IndieHackers"


def test_indiehackers_handles_bad_xml(monkeypatch) -> None:
    monkeypatch.setattr("agents.fetchers.indiehackers.httpx.get", lambda *_, **__: FakeResponse(b"<rss>"))

    posts = IndieHackersFetcher().fetch(
        SourceConfig(platform=SourcePlatform.INDIE_HACKERS, name="IndieHackers", url="https://example.com")
    )

    assert posts == []


def test_producthunt_parses_rss(monkeypatch) -> None:
    monkeypatch.setattr("agents.fetchers.producthunt.httpx.get", lambda *_, **__: FakeResponse(RSS))
    config = SourceConfig(
        platform=SourcePlatform.PRODUCT_HUNT,
        name="ProductHunt",
        url="https://www.producthunt.com/feed",
        max_items=2,
    )

    posts = ProductHuntFetcher().fetch(config)

    assert len(posts) == 2
    assert posts[0].platform == SourcePlatform.PRODUCT_HUNT
    assert posts[1].title == "Indie makers face payment delays"


def test_producthunt_handles_network_error(monkeypatch) -> None:
    def fail(*args, **kwargs):
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr("agents.fetchers.producthunt.httpx.get", fail)

    posts = ProductHuntFetcher().fetch(
        SourceConfig(platform=SourcePlatform.PRODUCT_HUNT, name="ProductHunt", url="https://example.com")
    )

    assert posts == []

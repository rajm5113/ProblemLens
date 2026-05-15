from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

from agents.discovery import DiscoveryAgent
from agents.fetchers import HackerNewsFetcher, RawPost, RedditFetcher
from models.enums import SourcePlatform
from models.pipeline_context import PipelineContext
from models.relevance_result import RelevanceBatchResult
from models.source_config import SourceConfig
from providers.base import BaseLLMProvider, LLMResponse
from store.signal_store import SignalStore
from utils.keyword_filter import passes_keyword_filter


def test_keyword_filter_accepts_problem_signal() -> None:
    assert passes_keyword_filter("Users struggle with delayed access and no solution exists")


def test_keyword_filter_rejects_noise() -> None:
    assert not passes_keyword_filter("lol upvote this meme giveaway")


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def json(self):
        return self.payload

    def raise_for_status(self) -> None:
        return None


def test_reddit_fetcher_parses_json(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = json.loads(Path("tests/golden/mock_reddit_response.json").read_text())

    def fake_get(*args, **kwargs):
        return FakeResponse(payload)

    monkeypatch.setattr("agents.fetchers.reddit.httpx.get", fake_get)

    posts = RedditFetcher().fetch(
        SourceConfig(
            platform=SourcePlatform.REDDIT,
            name="r/india",
            url="https://www.reddit.com/r/india/hot.json?limit=25",
        )
    )

    assert len(posts) == 2
    assert posts[0].url == "https://reddit.com/r/india/comments/1/problem/"
    assert posts[0].platform == SourcePlatform.REDDIT


def test_hn_fetcher_parses_json(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = json.loads(Path("tests/golden/mock_hn_response.json").read_text())

    def fake_get(url: str, *args, **kwargs):
        if url.endswith("topstories.json"):
            return FakeResponse(payload["topstories"])
        item_id = url.rsplit("/", 1)[-1].replace(".json", "")
        return FakeResponse(payload["items"][item_id])

    monkeypatch.setattr("agents.fetchers.hackernews.httpx.get", fake_get)

    posts = HackerNewsFetcher().fetch(
        SourceConfig(
            platform=SourcePlatform.HACKER_NEWS,
            name="HackerNews",
            url="https://hacker-news.firebaseio.com/v0/topstories.json",
            max_items=2,
        )
    )

    assert len(posts) == 1
    assert posts[0].title.startswith("Small teams struggle")
    assert posts[0].url == "https://news.ycombinator.com/item?id=101"


def test_relevance_model_validates() -> None:
    result = RelevanceBatchResult.model_validate(
        {"items": [{"index": 0, "is_relevant": True, "confidence": 0.8, "reason": "Clear pain"}]}
    )

    assert result.items[0].is_relevant is True


def test_relevance_model_rejects_bad() -> None:
    with pytest.raises(ValidationError):
        RelevanceBatchResult.model_validate({"items": [{"index": 0, "is_relevant": True}]})


def test_url_dedup_skips_seen(tmp_path: Path, raw_signal) -> None:
    store = SignalStore(tmp_path / "signals.jsonl")
    store.append(raw_signal)

    assert store.has_url(str(raw_signal.source.url))
    assert not store.has_url("https://example.com/new")


def test_fingerprint_dedup(tmp_path: Path, raw_signal) -> None:
    store = SignalStore(tmp_path / "signals.jsonl")
    store.append(raw_signal)

    assert store.has_fingerprint(raw_signal.fingerprint)
    assert not store.has_fingerprint("missing")


class FakeLLMProvider(BaseLLMProvider):
    provider = "fake"
    model = "fake-model"

    def __init__(self, fail_first: bool = False):
        self.calls = 0
        self.fail_first = fail_first

    def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ):
        self.calls += 1
        if self.fail_first and self.calls == 1:
            raise ValueError("bad json")
        return response_model.model_validate(
            {
                "items": [
                    {
                        "index": index,
                        "is_relevant": True,
                        "confidence": 0.9,
                        "reason": "Recurring problem signal",
                    }
                    for index in range(prompt.count("TITLE:"))
                ]
            }
        )

    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        return LLMResponse(
            content="ok",
            model=self.model,
            provider=self.provider,
            input_tokens=1,
            output_tokens=1,
            latency_ms=1,
        )


class StaticFetcher:
    def __init__(self, posts: list[RawPost]):
        self.posts = posts

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        return self.posts


def make_posts() -> list[RawPost]:
    return [
        RawPost(
            url="https://example.com/problem-1",
            title="Patients struggle with delayed hospital queues",
            body="There is no solution and the workaround is costly for families.",
            platform=SourcePlatform.REDDIT,
            channel="r/india",
        ),
        RawPost(
            url="https://example.com/noise",
            title="lol this meme is funny",
            body="upvote giveaway",
            platform=SourcePlatform.REDDIT,
            channel="r/india",
        ),
    ]


def make_discovery_agent(tmp_path: Path, provider: FakeLLMProvider) -> DiscoveryAgent:
    source = SourceConfig(platform=SourcePlatform.REDDIT, name="r/india", url="https://example.com")
    return DiscoveryAgent(
        primary=provider,
        signal_store=SignalStore(tmp_path / "signals.jsonl"),
        sources=[source],
        fetchers={SourcePlatform.REDDIT: StaticFetcher(make_posts())},
    )


def test_discovery_full_flow_mocked(tmp_path: Path) -> None:
    agent = make_discovery_agent(tmp_path, FakeLLMProvider())
    ctx = PipelineContext(
        run_id="run-1",
        signal_id="discovery-batch",
        started_at=datetime.now(timezone.utc),
        current_stage="discovery",
    )

    ctx = agent.run(ctx)
    validation = agent.validate(ctx)

    assert validation.valid
    assert len(ctx.discovery_signals) == 1
    assert ctx.discovery_signals[0].is_relevant is True
    assert len(agent.signal_store.get_all()) == 1


def test_discovery_empty_sources(tmp_path: Path) -> None:
    source = SourceConfig(platform=SourcePlatform.REDDIT, name="r/india", url="https://example.com")
    agent = DiscoveryAgent(
        primary=FakeLLMProvider(),
        signal_store=SignalStore(tmp_path / "signals.jsonl"),
        sources=[source],
        fetchers={SourcePlatform.REDDIT: StaticFetcher([])},
    )
    ctx = PipelineContext(
        run_id="run-1",
        signal_id="discovery-batch",
        started_at=datetime.now(timezone.utc),
        current_stage="discovery",
    )

    ctx = agent.run(ctx)
    validation = agent.validate(ctx)

    assert validation.valid
    assert validation.warnings == ["No relevant signals found in this run"]


def test_discovery_llm_failure_retry(tmp_path: Path) -> None:
    provider = FakeLLMProvider(fail_first=True)
    agent = make_discovery_agent(tmp_path, provider)
    ctx = PipelineContext(
        run_id="run-1",
        signal_id="discovery-batch",
        started_at=datetime.now(timezone.utc),
        current_stage="discovery",
    )

    ctx = agent.run(ctx)

    assert provider.calls == 2
    assert len(ctx.discovery_signals) == 1

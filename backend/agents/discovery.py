from __future__ import annotations

import time
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError

from config import (
    BATCH_SIZES,
    DISCOVERY_SOURCES,
    MAX_BODY_CHARS,
    RELEVANCE_CONFIDENCE_THRESHOLD,
)
from models.enums import SourcePlatform
from models.pipeline_context import PipelineContext
from models.raw_signal import RawSignal, SourceMetadata
from models.relevance_result import RelevanceBatchResult
from models.source_config import SourceConfig
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
from store.signal_store import SignalStore
from utils.fingerprint import compute_fingerprint
from utils.keyword_filter import passes_keyword_filter
from utils.title_dedup import is_title_duplicate
from .base import BaseAgent
from .fetchers import (
    BaseFetcher,
    DevToFetcher,
    HackerNewsFetcher,
    IndieHackersFetcher,
    ProductHuntFetcher,
    RawPost,
    RedditFetcher,
)


class DiscoveryAgent(BaseAgent):
    """
    Fetches raw posts from public sources and stores validated RawSignal items.

    Filtering order is intentionally cheapest first:
    URL dedup -> keyword gate -> batched LLM relevance -> fingerprint dedup.
    """

    def __init__(
        self,
        primary: BaseLLMProvider,
        fallback: BaseLLMProvider | None = None,
        signal_store: SignalStore | None = None,
        sources: list[SourceConfig] | None = None,
        fetchers: dict[SourcePlatform, BaseFetcher] | None = None,
    ):
        super().__init__(primary, fallback)
        self.signal_store = signal_store or SignalStore()
        self.sources = sources if sources is not None else DISCOVERY_SOURCES
        self.fetchers = fetchers or {
            SourcePlatform.REDDIT: RedditFetcher(),
            SourcePlatform.HACKER_NEWS: HackerNewsFetcher(),
            SourcePlatform.PRODUCT_HUNT: ProductHuntFetcher(),
            SourcePlatform.INDIE_HACKERS: IndieHackersFetcher(),
            SourcePlatform.DEV_TO: DevToFetcher(),
            SourcePlatform.OTHER: IndieHackersFetcher(),
        }

    # Seconds to sleep between LLM batches to respect free-tier rate limits.
    # Free tier = 15 requests/min → 1 request every 4s keeps us safe.
    LLM_BATCH_COOLDOWN = 4.5

    def run(self, ctx: PipelineContext) -> PipelineContext:
        all_posts = self._fetch_all()
        self.logger.info("discovery_fetched", total_raw=len(all_posts))

        new_posts = [post for post in all_posts if not self._is_seen_url(post.url)]
        self.logger.info("discovery_after_url_dedup", count=len(new_posts))

        filtered = [post for post in new_posts if self._passes_keyword_gate(post)]
        self.logger.info(
            "discovery_after_keyword_gate",
            passed=len(filtered),
            dropped=len(new_posts) - len(filtered),
        )

        signals: list[RawSignal] = []
        seen_titles: list[str] = []
        batches = self._chunk(filtered, BATCH_SIZES["discovery"])
        for batch_idx, batch in enumerate(batches):
            # Rate-limit: sleep between LLM calls to stay under free-tier quota
            if batch_idx > 0:
                time.sleep(self.LLM_BATCH_COOLDOWN)

            for post, is_relevant, confidence in self._check_relevance_batch(batch):
                if is_relevant and confidence >= RELEVANCE_CONFIDENCE_THRESHOLD:
                    signal = self._to_raw_signal(post, confidence)
                    if self.signal_store.has_fingerprint(signal.fingerprint):
                        self.logger.info("duplicate_fingerprint_skipped", url=post.url)
                        continue
                    if is_title_duplicate(post.title, seen_titles):
                        self.logger.info("duplicate_title_skipped", url=post.url)
                        continue
                    self.signal_store.append(signal)
                    signals.append(signal)
                    seen_titles.append(post.title)

        self.logger.info("discovery_complete", signals_found=len(signals))
        ctx.discovery_signals = signals
        ctx.current_stage = "discovery"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        errors: list[str] = []
        warnings: list[str] = []
        if not ctx.discovery_signals:
            warnings.append("No relevant signals found in this run")
        for signal in ctx.discovery_signals:
            if not signal.signal_id:
                errors.append("Signal missing signal_id")
            if not signal.fingerprint:
                errors.append("Signal missing fingerprint")
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            stage="discovery",
        )

    def _fetch_all(self) -> list[RawPost]:
        posts: list[RawPost] = []
        for source in self.sources:
            if not source.enabled:
                continue
            fetcher = self.fetchers.get(source.platform)
            if fetcher is None:
                self.logger.warning("source_skipped_no_fetcher", source=source.name)
                continue
            try:
                posts.extend(fetcher.fetch(source))
            except Exception as exc:
                self.logger.warning("source_fetch_failed", source=source.name, error=str(exc))
        return posts

    def _is_seen_url(self, url: str) -> bool:
        return self.signal_store.has_url(url)

    def _passes_keyword_gate(self, post: RawPost) -> bool:
        return passes_keyword_filter(f"{post.title} {post.body}", title=post.title)

    def _check_relevance_batch(self, posts: list[RawPost]) -> list[tuple[RawPost, bool, float]]:
        if not posts:
            return []

        prompt = self._build_relevance_prompt(posts)
        try:
            result = self.primary.generate_structured(prompt, RelevanceBatchResult)
        except Exception as exc:
            self.logger.warning("discovery_relevance_retry", error=str(exc))
            try:
                result = self.primary.generate_structured(
                    self._build_repair_prompt(prompt, exc),
                    RelevanceBatchResult,
                )
            except Exception as retry_exc:
                if self.fallback is None:
                    self.logger.warning("discovery_relevance_failed", error=str(retry_exc))
                    return [(post, False, 0.0) for post in posts]
                try:
                    result = self.fallback.generate_structured(prompt, RelevanceBatchResult)
                except Exception as fallback_exc:
                    self.logger.warning("discovery_fallback_failed", error=str(fallback_exc))
                    return [(post, False, 0.0) for post in posts]

        by_index = {item.index: item for item in result.items}
        checked: list[tuple[RawPost, bool, float]] = []
        for index, post in enumerate(posts):
            item = by_index.get(index)
            if item is None:
                checked.append((post, False, 0.0))
            else:
                checked.append((post, item.is_relevant, item.confidence))
        return checked

    def _build_relevance_prompt(self, posts: list[RawPost]) -> str:
        blocks = []
        for index, post in enumerate(posts):
            body = post.body[:MAX_BODY_CHARS]
            blocks.append(f"[{index}] TITLE: {post.title}\nBODY: {body}")
        return (
            "You are a problem-signal detector for the Indian market.\n\n"
            "For each text below, decide:\n"
            "1. Does it describe a genuine, unsolved, recurring problem that real people face?\n"
            "2. Is it relevant to the Indian market or a universal problem applicable to India?\n\n"
            "Reply ONLY with valid JSON matching this schema:\n"
            '{"items":[{"index":0,"is_relevant":true,"confidence":0.85,"reason":"one line"}]}\n\n'
            "Rules:\n"
            "- Memes, jokes, promotions, news commentary -> is_relevant: false\n"
            "- Personal rants without a systemic pattern -> is_relevant: false\n"
            "- Genuine pain points affecting a user group -> is_relevant: true\n"
            "- If unsure, set confidence below 0.5 and is_relevant: false\n\n"
            "Texts:\n---\n"
            + "\n---\n".join(blocks)
        )

    def _build_repair_prompt(self, original_prompt: str, error: Exception) -> str:
        return (
            "Your previous response was invalid for the required JSON schema. "
            f"Validation error: {error}\n\n"
            "Return only valid JSON for this original task:\n\n"
            f"{original_prompt}"
        )

    def _to_raw_signal(self, post: RawPost, confidence: float) -> RawSignal:
        raw_text = f"{post.title}\n\n{post.body}".strip()
        return RawSignal(
            signal_id=str(uuid4()),
            source=SourceMetadata(
                url=post.url,
                platform=post.platform,
                author=post.author,
                channel=post.channel,
                scraped_at=post.fetched_at,
                raw_text=raw_text[:5000],
            ),
            fingerprint=compute_fingerprint(raw_text),
            is_relevant=True,
            relevance_confidence=confidence,
            created_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _chunk(posts: list[RawPost], size: int) -> list[list[RawPost]]:
        return [posts[index : index + size] for index in range(0, len(posts), size)]

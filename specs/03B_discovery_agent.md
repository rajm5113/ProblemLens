# Spec 3B: Discovery Agent

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 3A (Architecture) ✅
> **Produces:** DiscoveryAgent class, source connectors, keyword filter integration, JSONL signal store population

---

## 1. Purpose

The Discovery Agent is the **top of the funnel**. It fetches raw text from public sources, filters out noise cheaply, asks the LLM to confirm relevance, fingerprints the content, and stores validated `RawSignal` objects for downstream agents.

```
Source APIs → Fetch Posts → [URL Dedup] → [Keyword Filter] → [LLM Relevance] → [Fingerprint] → Store
               (free)        (free)         (free)            (batched)          (free)
```

---

## 2. Source Selection (MVP)

Only use sources with **free, auth-free, reliable** endpoints for MVP.

| Source | Method | Endpoint | Auth | Cost |
|--------|--------|----------|------|------|
| **Reddit** | JSON API | `https://www.reddit.com/r/{sub}/hot.json?limit=25` | None | Free |
| **Hacker News** | Firebase API | `https://hacker-news.firebaseio.com/v0/` | None | Free |
| **Product Hunt** | RSS | `https://www.producthunt.com/feed` | None | Free |

### 2.1 Reddit Subreddits (India-focused problem discovery)

```python
SUBREDDITS = [
    "india",             # General India problems
    "IndianStartups",    # Startup ecosystem pain points
    "developersIndia",   # Tech/dev problems
    "LegalAdviceIndia",  # Legal system gaps
    "IndianAgriculture", # Agriculture pain points
    "INDMoneyMatters",   # Fintech pain points
]
```

### 2.2 Hacker News

Fetch top/new stories. Filter for India-related or universal problem signals.

### 2.3 Source Config Model

```python
# models/source_config.py
from pydantic import BaseModel
from models.enums import SourcePlatform

class SourceConfig(BaseModel):
    platform: SourcePlatform
    name: str                    # e.g., "r/india"
    url: str                     # API endpoint
    max_items: int = 25          # Posts per fetch
    enabled: bool = True
```

---

## 3. Fetch Layer

### 3.1 Base Fetcher

```python
# agents/fetchers/base.py
from abc import ABC, abstractmethod

class BaseFetcher(ABC):
    @abstractmethod
    def fetch(self, config: SourceConfig) -> list[RawPost]:
        """Fetch raw posts from a source. Returns normalized RawPost objects."""
        ...

class RawPost(BaseModel):
    url: str
    title: str
    body: str                    # May be empty for link posts
    author: str | None = None
    channel: str | None = None   # Subreddit, HN, etc.
    platform: SourcePlatform
    fetched_at: datetime
```

### 3.2 Reddit Fetcher

```python
# agents/fetchers/reddit.py
import httpx

class RedditFetcher(BaseFetcher):
    HEADERS = {"User-Agent": "ProblemLens/1.0 (research bot)"}

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        resp = httpx.get(config.url, headers=self.HEADERS, timeout=15)
        resp.raise_for_status()
        posts = []
        for child in resp.json()["data"]["children"]:
            d = child["data"]
            posts.append(RawPost(
                url=f"https://reddit.com{d['permalink']}",
                title=d.get("title", ""),
                body=d.get("selftext", "")[:3000],  # Truncate to save tokens
                author=d.get("author"),
                channel=config.name,
                platform=SourcePlatform.REDDIT,
                fetched_at=datetime.utcnow(),
            ))
        return posts
```

### 3.3 Hacker News Fetcher

```python
# agents/fetchers/hackernews.py
class HackerNewsFetcher(BaseFetcher):
    BASE = "https://hacker-news.firebaseio.com/v0"

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        # Fetch top story IDs, then fetch each item
        ids = httpx.get(f"{self.BASE}/topstories.json", timeout=10).json()
        posts = []
        for item_id in ids[:config.max_items]:
            item = httpx.get(f"{self.BASE}/item/{item_id}.json", timeout=10).json()
            if not item or item.get("type") != "story":
                continue
            posts.append(RawPost(
                url=item.get("url", f"https://news.ycombinator.com/item?id={item_id}"),
                title=item.get("title", ""),
                body=item.get("text", "")[:3000],
                author=item.get("by"),
                channel="HackerNews",
                platform=SourcePlatform.HACKER_NEWS,
                fetched_at=datetime.utcnow(),
            ))
        return posts
```

---

## 4. Filtering Pipeline (3 Stages, Cheapest First)

### Stage 1: URL Dedup (Free, Instant)

```python
def _is_seen_url(self, url: str) -> bool:
    """Check if this URL was already processed in a previous run."""
    return self.signal_store.has_url(url)
```

**Cost:** $0. Eliminates re-processing across runs.

### Stage 2: Keyword Filter (Free, Local)

Uses the keyword filter from Spec 3A §17.1:

```python
from utils.keyword_filter import passes_keyword_filter

def _passes_keyword_gate(self, post: RawPost) -> bool:
    text = f"{post.title} {post.body}"
    return passes_keyword_filter(text)
```

**Cost:** $0. Eliminates ~70% of irrelevant posts.

### Stage 3: LLM Relevance Check (Cheap, Batched)

Only posts that pass Stages 1 and 2 reach the LLM. Batched per §17.4.

```python
# Batch 5 posts per LLM call
def _check_relevance_batch(self, posts: list[RawPost]) -> list[tuple[RawPost, bool, float]]:
    """Ask Gemini: are these real problem signals? Returns (post, is_relevant, confidence)."""
    prompt = self._build_relevance_prompt(posts)
    result = self.primary.generate_structured(prompt, RelevanceBatchResult)
    return [(posts[i], r.is_relevant, r.confidence) for i, r in enumerate(result.items)]
```

---

## 5. LLM Relevance Prompt (v1)

```
# prompts/v1/discovery_filter.txt

You are a problem-signal detector for the Indian market.

For each text below, decide:
1. Does it describe a genuine, unsolved, recurring problem that real people face?
2. Is it relevant to the Indian market or a universal problem applicable to India?

Reply ONLY with valid JSON matching this schema:
{
  "items": [
    {"index": 0, "is_relevant": true, "confidence": 0.85, "reason": "...one line..."},
    ...
  ]
}

Rules:
- Memes, jokes, promotions, news commentary → is_relevant: false
- Personal rants without a systemic pattern → is_relevant: false
- Genuine pain points affecting a user group → is_relevant: true
- If unsure, set confidence below 0.5 and is_relevant: false

Texts:
---
[0] TITLE: {title_0}
BODY: {body_0_truncated_to_500_chars}
---
[1] TITLE: {title_1}
BODY: {body_1_truncated_to_500_chars}
---
...
```

### Prompt Token Budget

| Field | Tokens |
|-------|--------|
| System instructions | ~120 |
| Per-post (title + 500 char body) | ~150 |
| Batch of 5 | ~120 + (5 × 150) = **~870 input** |
| Expected output (5 results) | **~120 output** |
| **Cost per batch (Gemini Flash)** | **~$0.0001** |

---

## 6. Relevance Response Model

```python
# models/relevance_result.py
from pydantic import BaseModel, Field

class RelevanceItem(BaseModel):
    index: int
    is_relevant: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = Field(max_length=200)

class RelevanceBatchResult(BaseModel):
    items: list[RelevanceItem]
```

---

## 7. Content Fingerprinting

After relevance is confirmed, fingerprint the content to prevent future duplicate processing:

```python
from utils.fingerprint import compute_fingerprint

# Fingerprint = SHA-256 of normalized (lowercased, whitespace-collapsed) title + body
fp = compute_fingerprint(f"{post.title} {post.body}")

# Check against existing fingerprints before storing
if self.signal_store.has_fingerprint(fp):
    logger.info("duplicate_fingerprint_skipped", url=post.url)
    continue
```

---

## 8. DiscoveryAgent Class

```python
# agents/discovery.py
class DiscoveryAgent(BaseAgent):
    """
    Fetches raw posts from configured sources.
    Filters: URL dedup → keyword filter → LLM relevance check.
    Stores valid signals as RawSignal in JSONL.
    """

    def __init__(self, primary, fallback, signal_store, sources):
        super().__init__(primary, fallback)
        self.signal_store = signal_store
        self.sources = sources
        self.fetchers = {
            SourcePlatform.REDDIT: RedditFetcher(),
            SourcePlatform.HACKER_NEWS: HackerNewsFetcher(),
        }

    def run(self, ctx: PipelineContext) -> PipelineContext:
        """
        1. Fetch posts from all enabled sources
        2. URL dedup (free)
        3. Keyword filter (free)
        4. LLM relevance check (batched, cached)
        5. Fingerprint and store as RawSignal
        """
        all_posts = self._fetch_all()
        new_posts = [p for p in all_posts if not self._is_seen_url(p.url)]
        filtered = [p for p in new_posts if self._passes_keyword_gate(p)]

        # Batch LLM relevance check
        signals = []
        for batch in self._chunk(filtered, BATCH_SIZES["discovery"]):
            results = self._check_relevance_batch(batch)
            for post, is_relevant, confidence in results:
                if is_relevant and confidence >= 0.6:
                    signal = self._to_raw_signal(post, confidence)
                    self.signal_store.append(signal)
                    signals.append(signal)

        ctx.discovery_signals = signals
        ctx.current_stage = "discovery"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        """Check that at least some signals were produced (warning if zero)."""
        errors = []
        warnings = []
        if not ctx.discovery_signals:
            warnings.append("No relevant signals found in this run")
        for sig in (ctx.discovery_signals or []):
            if not sig.signal_id:
                errors.append("Signal missing signal_id")
            if not sig.fingerprint:
                errors.append("Signal missing fingerprint")
        return ValidationResult(valid=len(errors) == 0, errors=errors, 
                                warnings=warnings, stage="discovery")
```

---

## 9. Signal Store Updates

The JSONL signal store from 3A needs these methods for discovery:

```python
# store/signal_store.py (additions)
class SignalStore:
    def has_url(self, url: str) -> bool:
        """Check if URL was already processed."""
        ...

    def has_fingerprint(self, fp: str) -> bool:
        """Check if content fingerprint exists."""
        ...

    def append(self, signal: RawSignal) -> None:
        """Append a new signal to the JSONL file."""
        ...

    def get_all(self) -> list[RawSignal]:
        """Load all stored signals."""
        ...
```

---

## 10. Pipeline Integration

The DiscoveryAgent runs as the **first stage** of the pipeline, but it operates differently from downstream agents. Instead of processing a single `PipelineContext`, it **produces multiple signals** that each become their own context for later stages.

```python
# pipeline.py (discovery integration)
def run_discovery(self) -> list[RawSignal]:
    """Run discovery separately. Returns new signals for downstream processing."""
    ctx = PipelineContext(run_id=str(uuid4()), signal_id="discovery-batch", ...)
    ctx = self.discovery_agent.run(ctx)
    return ctx.discovery_signals

def run_full(self):
    """Full pipeline: discover, then process each signal."""
    signals = self.run_discovery()
    for signal in signals:
        ctx = PipelineContext(run_id=str(uuid4()), signal_id=signal.signal_id, ...)
        ctx.raw_signal = signal
        # Run extraction → classification → scoring → enrichment
        for agent in self.downstream_agents:
            ctx = agent.run(ctx)
            ...
```

---

## 11. Cost Impact (§18 Mandate)

### Per-Run Estimate (6 subreddits, 25 posts each = 150 posts)

| Step | Posts In | Posts Out | LLM Calls | Tokens | Cost |
|------|---------|----------|-----------|--------|------|
| Fetch | 150 | 150 | 0 | 0 | $0.00 |
| URL dedup | 150 | ~120 (80%) | 0 | 0 | $0.00 |
| Keyword filter | 120 | ~36 (30%) | 0 | 0 | $0.00 |
| LLM relevance (batches of 5) | 36 | ~15 relevant | 8 calls | ~7,920 | **$0.0006** |
| Fingerprint + store | 15 | 15 | 0 | 0 | $0.00 |
| **Total** | **150** | **~15 signals** | **8** | **~7,920** | **~$0.0006** |

**Cost per discovery run: less than $0.001.**
**Monthly (2 runs/day): ~$0.04.**

### Cache Benefit

If the same posts appear across runs (common for Reddit hot), the URL dedup catches them at $0 cost. The LLM cache catches any identical text that somehow gets a new URL.

---

## 12. Error Handling

| Error | Response |
|-------|----------|
| Source API returns 429 (rate limited) | Wait 60s, retry once, then skip source for this run |
| Source API returns 5xx | Skip source, log warning, continue with other sources |
| Source API times out (>15s) | Skip source, log warning |
| LLM returns malformed JSON | Retry batch once with repair prompt |
| LLM relevance check times out | Mark batch as "unprocessed", retry in next run |
| All sources fail | Log error, return empty signal list (not a pipeline crash) |

---

## 13. Configuration

```python
# config.py (additions for discovery)
DISCOVERY_SOURCES = [
    SourceConfig(platform="Reddit", name="r/india", 
                 url="https://www.reddit.com/r/india/hot.json?limit=25"),
    SourceConfig(platform="Reddit", name="r/IndianStartups",
                 url="https://www.reddit.com/r/IndianStartups/hot.json?limit=25"),
    SourceConfig(platform="Reddit", name="r/developersIndia",
                 url="https://www.reddit.com/r/developersIndia/hot.json?limit=25"),
    SourceConfig(platform="Reddit", name="r/LegalAdviceIndia",
                 url="https://www.reddit.com/r/LegalAdviceIndia/hot.json?limit=25"),
    SourceConfig(platform="Hacker News", name="HackerNews",
                 url="https://hacker-news.firebaseio.com/v0/topstories.json"),
]

RELEVANCE_CONFIDENCE_THRESHOLD = 0.6   # Minimum confidence to accept
DISCOVERY_BATCH_SIZE = 5                # Posts per LLM call
MAX_BODY_CHARS = 500                    # Truncate body in prompt to save tokens
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

| Test | What It Validates |
|------|------------------|
| `test_reddit_fetcher_parses_json` | Mock Reddit JSON → correct `RawPost` list |
| `test_hn_fetcher_parses_json` | Mock HN JSON → correct `RawPost` list |
| `test_keyword_filter_accepts_problem` | "Users struggle with..." → passes |
| `test_keyword_filter_rejects_noise` | "lol check out this meme" → rejected |
| `test_url_dedup_skips_seen` | Same URL twice → second is skipped |
| `test_fingerprint_dedup` | Same content, different URL → skipped |
| `test_relevance_model_validates` | Valid `RelevanceBatchResult` parses correctly |
| `test_relevance_model_rejects_bad` | Missing fields → `ValidationError` |

### 14.2 Integration Tests

| Test | What It Validates |
|------|------------------|
| `test_discovery_full_flow_mocked` | Mock all sources + LLM → produces valid `RawSignal` list |
| `test_discovery_empty_sources` | All sources return empty → zero signals, no crash |
| `test_discovery_llm_failure_retry` | LLM returns bad JSON → retry → succeeds |

### 14.3 Golden Test Data

Add to `tests/golden/`:
- `mock_reddit_response.json` — Sample Reddit API response (5 posts: 2 problems, 3 noise)
- `mock_hn_response.json` — Sample HN API response
- `expected_signals.json` — Expected `RawSignal` output for the mock data

---

## 15. File Deliverables

| File | Purpose |
|------|---------|
| `models/source_config.py` | SourceConfig Pydantic model |
| `models/relevance_result.py` | RelevanceBatchResult model |
| `agents/fetchers/__init__.py` | Fetcher package |
| `agents/fetchers/base.py` | BaseFetcher + RawPost model |
| `agents/fetchers/reddit.py` | Reddit JSON API fetcher |
| `agents/fetchers/hackernews.py` | HN Firebase API fetcher |
| `agents/discovery.py` | DiscoveryAgent class (update existing stub) |
| `prompts/v1/discovery_filter.txt` | Update with final prompt |
| `store/signal_store.py` | Add `has_url()`, `has_fingerprint()` methods |
| `config.py` | Add discovery source configs |
| `tests/test_agents/test_discovery.py` | Update with full test suite |
| `tests/golden/mock_reddit_response.json` | Mock data |

---

## 16. Exit Conditions

- [ ] All source fetchers return normalized `RawPost` objects from mock data
- [ ] Keyword filter correctly accepts problem signals and rejects noise
- [ ] URL dedup prevents reprocessing of seen URLs
- [ ] Fingerprint dedup prevents reprocessing of duplicate content
- [ ] LLM relevance check runs in batches of 5
- [ ] `RelevanceBatchResult` model validates correctly
- [ ] Valid signals are stored as `RawSignal` in JSONL
- [ ] Discovery agent handles source failures gracefully (no crash)
- [ ] All unit tests pass
- [ ] Integration test with mocked sources + LLM passes
- [ ] Cost per run is under $0.001 for 150 posts

---

## 17. What This Spec Does NOT Cover

| Topic | Covered In |
|-------|-----------|
| Extracting structured cards from signals | Spec 3C |
| Scoring or classifying cards | Spec 3C / 3D |
| Semantic dedup against existing cards | Spec 3D |
| Scheduling periodic discovery runs | Phase 4 |
| Adding new source platforms | Future enhancement |

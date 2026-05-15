# Spec 4C: Live Pipeline, CLI Runner & Ops

> **Status:** ✅ IMPLEMENTED
> **Depends on:** Spec 4A (FastAPI) ✅, Spec 4B (Frontend Integration) ✅
> **Produces:** CLI pipeline runner, trend computation job, env validation, live smoke test procedure, API Wrapper Pattern hardening

---

## 1. Purpose

Everything is built and wired. This spec is about making the system operational:
- A CLI script to run the full pipeline from the command line
- Environment validation so missing API keys produce clear errors
- A trend computation job that updates card status over time
- A documented procedure to run the first live smoke test
- **API Wrapper Pattern hardening** — rate limiting, retry with backoff, and fetcher resilience

---

## 2. CLI Pipeline Runner

### 2.1 Entry Point

```python
# backend/run_pipeline.py
"""
CLI entry point for the ProblemLens intelligence pipeline.

Usage:
  python run_pipeline.py discover          # Run discovery only
  python run_pipeline.py full              # Run full pipeline (discover + process)
  python run_pipeline.py process <signal>  # Process a single signal ID
  python run_pipeline.py trends            # Update trend statuses
  python run_pipeline.py status            # Show pipeline health + card counts
"""
import argparse
import sys

from config import configure_logging, validate_env
from pipeline import Pipeline
from store.card_store import CardStore
from store.signal_store import SignalStore
from providers.gemini import GeminiProvider
from providers.openai import OpenAIProvider
from agents.discovery import DiscoveryAgent
from agents.extraction import ExtractionAgent
from agents.classification import ClassificationAgent
from agents.dedup import DedupAgent
from agents.scoring import ScoringAgent
from agents.enrichment import EnrichmentAgent
from trends import update_trends


def build_pipeline() -> Pipeline:
    """Construct the full pipeline with all agents wired up."""
    primary = GeminiProvider()
    fallback = OpenAIProvider() if validate_env("openai") else None
    card_store = CardStore()
    signal_store = SignalStore()

    discovery = DiscoveryAgent(
        primary=primary,
        fallback=fallback,
        signal_store=signal_store,
    )

    downstream = [
        ExtractionAgent(primary=primary, fallback=fallback),
        ClassificationAgent(primary=primary, fallback=fallback),
        DedupAgent(primary=primary, fallback=fallback, card_store=card_store),
        ScoringAgent(primary=primary, fallback=fallback),
        EnrichmentAgent(primary=primary, fallback=fallback, card_store=card_store),
    ]

    return Pipeline(
        agents=downstream,
        discovery_agent=discovery,
        store=card_store,
    )


def cmd_discover(args):
    pipeline = build_pipeline()
    signals = pipeline.run_discovery()
    print(f"Discovered {len(signals)} new signals")
    for s in signals:
        print(f"  {s.signal_id[:8]}  {s.source.url[:80]}")


def cmd_full(args):
    pipeline = build_pipeline()
    results = pipeline.run_full()
    success = sum(1 for r in results if r.status == "success")
    dupes = sum(1 for r in results if r.status == "duplicate_merged")
    errors = sum(1 for r in results if r.status == "manual_review")
    print(f"Pipeline complete: {success} new, {dupes} merged, {errors} errors")


def cmd_trends(args):
    store = CardStore()
    updated = update_trends(store)
    print(f"Updated trend status on {updated} cards")


def cmd_status(args):
    store = CardStore()
    signal_store = SignalStore()
    cards = store.all()
    signals = signal_store.get_all()
    print(f"Cards:   {len(cards)}")
    print(f"Signals: {len(signals)}")
    if cards:
        avg = sum(c.opportunity_score for c in cards) / len(cards)
        print(f"Avg opp: {avg:.1f}")
        from collections import Counter
        trends = Counter(c.trend_status.value for c in cards)
        for status, count in trends.most_common():
            print(f"  {status}: {count}")


def main():
    parser = argparse.ArgumentParser(description="ProblemLens Pipeline CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("discover", help="Run discovery only")
    sub.add_parser("full", help="Run full pipeline")
    sub.add_parser("trends", help="Update trend statuses")
    sub.add_parser("status", help="Show pipeline health")

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        sys.exit(1)

    commands = {
        "discover": cmd_discover,
        "full": cmd_full,
        "trends": cmd_trends,
        "status": cmd_status,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
```

### 2.2 Usage

```bash
cd backend

# Check system status
.venv\Scripts\python.exe run_pipeline.py status

# Run discovery only (fetch + filter, no LLM processing)
.venv\Scripts\python.exe run_pipeline.py discover

# Run full pipeline (discover + extract + classify + dedup + score + enrich)
.venv\Scripts\python.exe run_pipeline.py full

# Update trend statuses
.venv\Scripts\python.exe run_pipeline.py trends
```

---

## 3. Environment Validation

### 3.1 Validate on Startup

```python
# config.py (additions)
def validate_env(provider: str = "gemini") -> bool:
    """Check if API key is set for the given provider. Returns True if valid."""
    if provider == "gemini":
        if not GEMINI_API_KEY:
            return False
        return True
    if provider == "openai":
        if not OPENAI_API_KEY:
            return False
        return True
    return False


def require_env(provider: str = "gemini") -> None:
    """Raise a clear error if the API key is missing."""
    if not validate_env(provider):
        key_name = "GEMINI_API_KEY" if provider == "gemini" else "OPENAI_API_KEY"
        raise EnvironmentError(
            f"\n{'='*60}\n"
            f"  MISSING: {key_name}\n"
            f"  Set it in backend/.env:\n"
            f"    {key_name}=your-key-here\n"
            f"{'='*60}\n"
        )
```

### 3.2 Provider Initialization Guards

```python
# providers/gemini.py (update __init__)
class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        from config import require_env
        require_env("gemini")
        # ... rest of init ...

# providers/openai.py (update __init__)
class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        from config import require_env
        require_env("openai")
        # ... rest of init ...
```

### 3.3 Rate Limiting in Provider (API Wrapper Pattern)

The Gemini free tier allows **15 requests per minute**. The existing `TokenBucket` class in `utils/rate_limiter.py` is wired directly into `GeminiProvider` as a module-level singleton:

```python
# providers/gemini.py
from utils.rate_limiter import TokenBucket, GEMINI_FREE_TIER

_gemini_bucket = TokenBucket(
    capacity=GEMINI_FREE_TIER["requests_per_minute"],
    refill_per_second=GEMINI_FREE_TIER["requests_per_minute"] / 60.0,
)
```

Every call to `generate_structured()` or `generate_text()` passes through `_wait_for_rate_limit()`, which blocks until the bucket has tokens. This prevents 429 errors proactively.

### 3.4 Retry with Exponential Backoff (API Wrapper Pattern)

If the API still returns 429 / `RESOURCE_EXHAUSTED` / quota errors despite the rate limiter (e.g., daily quota hit), the provider retries with exponential backoff:

```python
MAX_RETRIES = 3
BACKOFF_SECONDS = [30, 60, 90]

def _call_with_retry(self, call_fn, label: str = "gemini"):
    for attempt in range(MAX_RETRIES):
        self._wait_for_rate_limit()
        try:
            return call_fn()
        except Exception as exc:
            exc_str = str(exc).lower()
            is_rate_limit = "429" in exc_str or "resource_exhausted" in exc_str or "quota" in exc_str
            if is_rate_limit and attempt < MAX_RETRIES - 1:
                wait = BACKOFF_SECONDS[attempt]
                logger.warning(f"{label} rate limited (attempt {attempt+1}), waiting {wait}s")
                time.sleep(wait)
                continue
            raise
```

This ensures the pipeline does **not crash** on quota errors — it waits, retries, and only fails after 3 attempts.

### 3.5 Fetcher Error Handling (API Wrapper Pattern)

The data source fetchers now follow the **fail-safe boundary** principle. HTTP errors (404, 302, timeouts, network failures) are caught, logged, and the fetcher returns an empty list instead of crashing:

```python
# agents/fetchers/reddit.py
try:
    response = httpx.get(config.url, headers=self.HEADERS, timeout=15, follow_redirects=False)
    response.raise_for_status()
except httpx.HTTPStatusError as exc:
    logger.warning(f"Reddit {config.name}: HTTP {exc.response.status_code}, skipping")
    return []
except httpx.RequestError as exc:
    logger.warning(f"Reddit {config.name}: network error ({exc}), skipping")
    return []
```

Same pattern in `HackerNewsFetcher`, with per-story error handling so a single failed story doesn't lose the rest.

### 3.6 Source Config Fix

Two dead subreddits discovered during the first live test:
- `r/IndianAgriculture` → HTTP 404 (subreddit doesn't exist)
- `r/INDMoneyMatters` → HTTP 302 (redirect, private/renamed)

Replaced with active, public subreddits:
- `r/IndiaInvestments` — active fintech/investment discussions
- `r/bangalore` — active city subreddit with real user pain points

### 3.7 .env Template Update

```bash
# backend/.env.example (update)
# === REQUIRED ===
GEMINI_API_KEY=your-gemini-api-key-here

# === OPTIONAL (fallback provider) ===
OPENAI_API_KEY=your-openai-api-key-here

# === PIPELINE CONFIG ===
PRIMARY_PROVIDER=gemini
FALLBACK_PROVIDER=openai
LOG_LEVEL=INFO
REPLAY_MODE=false
```

---

## 4. Trend Status Computation

### 4.1 Logic

Trend status is based on how `signal_count` has changed relative to the card's age:

| Condition | Status |
|-----------|--------|
| Card created < 7 days ago | `New` |
| signal_count increased in last 7 days AND signal_count ≥ 3 | `Rising` |
| signal_count unchanged for 14+ days | `Declining` |
| Everything else | `Stable` |

### 4.2 Implementation

```python
# backend/trends.py
from datetime import datetime, timezone, timedelta
from models.enums import TrendStatus
from store.card_store import CardStore


def update_trends(store: CardStore) -> int:
    """Update trend_status on all cards. Returns count of cards updated."""
    now = datetime.now(timezone.utc)
    cards = store.all()
    updated = 0

    for card in cards:
        age_days = (now - card.created_at).days
        days_since_update = (now - card.updated_at).days

        old_status = card.trend_status

        if age_days < 7:
            new_status = TrendStatus.NEW
        elif days_since_update < 7 and card.signal_count >= 3:
            new_status = TrendStatus.RISING
        elif days_since_update >= 14:
            new_status = TrendStatus.DECLINING
        else:
            new_status = TrendStatus.STABLE

        if new_status != old_status:
            card.trend_status = new_status
            card.updated_at = now
            store.save(card)
            updated += 1

    return updated
```

### 4.3 Integration with CLI

Already wired in §2.1:
```bash
.venv\Scripts\python.exe run_pipeline.py trends
```

---

## 5. Live Smoke Test Procedure

### 5.1 Prerequisites

1. Python venv is set up with all dependencies
2. `backend/.env` has a valid `GEMINI_API_KEY`
3. SQLite stores exist (auto-created on first run)

### 5.2 Step-by-Step

```bash
# Step 1: Verify environment
cd C:\Users\DELL\OneDrive\Desktop\Pain_Points\backend
.venv\Scripts\python.exe run_pipeline.py status
# Expected: Cards: 11, Signals: 0 (seed data only)

# Step 2: Run discovery only (fetches from Reddit + HN, no LLM yet)
.venv\Scripts\python.exe run_pipeline.py discover
# Expected: "Discovered N new signals" (N depends on what Reddit returns)
# This calls real Reddit/HN APIs but does NOT call Gemini yet.
# The keyword filter runs locally, then the LLM relevance check runs.

# Step 3: Run full pipeline (processes discovered signals through all agents)
.venv\Scripts\python.exe run_pipeline.py full
# Expected: "Pipeline complete: X new, Y merged, Z errors"
# This calls Gemini Flash for extraction, classification, scoring, enrichment.
# Check backend/runs/ for JSON artifact files.

# Step 4: Verify new cards in API
.venv\Scripts\python.exe -m uvicorn api.main:app --port 8000
# In another terminal:
curl http://localhost:8000/api/problems | python -m json.tool
# Should show seed cards + newly discovered cards

# Step 5: Verify in UI
cd C:\Users\DELL\OneDrive\Desktop\Pain_Points\app
npm run dev
# Open http://localhost:5173 — new cards should appear alongside seed data
```

### 5.3 Expected Costs

| Step | API Calls | Estimated Cost |
|------|-----------|---------------|
| Discovery (150 posts, keyword filter, batched LLM) | ~8 Gemini calls | ~$0.0006 |
| Processing (~15 signals × 4 agents each) | ~60 Gemini calls | ~$0.003 |
| **Total first run** | **~68 calls** | **~$0.004** |

### 5.4 What to Check After First Run

- [ ] `backend/runs/` contains JSON artifact files for each pipeline run
- [ ] `backend/store/cards.db` has new rows beyond the 11 seed cards
- [ ] `backend/store/signals.jsonl` has raw signal entries
- [ ] `backend/store/llm_cache.db` has cached LLM responses
- [ ] `backend/logs/pipeline.log` has structured log entries
- [ ] Running the pipeline AGAIN should show cache hits (check logs for "cache_hit")
- [ ] API `/api/problems` returns the new cards in camelCase JSON
- [ ] Frontend displays new cards with correct sectors, scores, and pain points

---

## 6. Graceful Degradation

### 6.1 No API Key Set

```bash
.venv\Scripts\python.exe run_pipeline.py full
# Output:
# ============================================================
#   MISSING: GEMINI_API_KEY
#   Set it in backend/.env:
#     GEMINI_API_KEY=your-key-here
# ============================================================
```

### 6.2 Source Fetcher Errors (404, 302, Timeout)

Implemented in `RedditFetcher` and `HackerNewsFetcher` (§3.5):
- HTTP 404 / 302 / 5xx → log warning, return empty list, continue to next source
- Network timeout / connection refused → same graceful skip
- Individual HN story fetch failure → skip that story, continue fetching others
- Pipeline does NOT crash on any single source failure

### 6.3 Gemini API Rate Limited (429 / RESOURCE_EXHAUSTED)

Two layers of protection:

**Layer 1 — Proactive (§3.3):** `TokenBucket` rate limiter blocks requests to stay under 15 req/min. This prevents most 429s.

**Layer 2 — Reactive (§3.4):** If a 429 still occurs (e.g., daily quota), `_call_with_retry()` waits 30s/60s/90s with exponential backoff, up to 3 attempts.

**Layer 3 — Agent-level (Spec 3A):** If the provider still fails after retries, `BaseAgent._retry_or_fallback()` tries the OpenAI fallback provider. If that also fails, the signal is marked `manual_review` and the pipeline continues.

### 6.4 API Wrapper Pattern Compliance Summary

| # | Principle | Implementation |
|---|-----------|---------------|
| 1 | **Auth Security** | `require_env()` + `.env` file, no hardcoded keys |
| 2 | **Input Validation (Fail-Fast)** | Keyword filter, URL dedup, fingerprint dedup — all pre-LLM |
| 3 | **Response Transformation** | `ProblemCardResponse.from_card()` snake→camel at API boundary |
| 4 | **Caching** | `LLMCache` (SQLite hash-based), 90%+ call reduction on reruns |
| 5 | **Rate Limiting (Token Bucket)** | `_gemini_bucket` in `providers/gemini.py`, 15 req/min |
| 6 | **Retry with Backoff** | `_call_with_retry()`, 3 attempts, 30/60/90s waits |
| 7 | **Request Batching** | Discovery batches 5 signals per LLM call |
| 8 | **Conditional Fetching** | Skip scoring/enrichment for duplicates |
| 9 | **Cost Tracking** | `cost_tracker.py` per-call USD estimates |
| 10 | **Fetcher Error Handling** | try/except in Reddit + HN fetchers, graceful skip |

---

## 7. File Deliverables

| File | Action |
|------|--------|
| `backend/run_pipeline.py` | **Create** — CLI entry point |
| `backend/pipeline_factory.py` | **Create** — shared pipeline wiring for CLI + API |
| `backend/trends.py` | **Create** — trend computation job |
| `backend/config.py` | **Update** — add `validate_env()`, `require_env()`, replace dead subreddits |
| `backend/providers/gemini.py` | **Update** — env guard + rate limiter + retry with backoff |
| `backend/providers/openai.py` | **Update** — env guard in `__init__` |
| `backend/agents/fetchers/reddit.py` | **Update** — try/except error handling, disable follow_redirects |
| `backend/agents/fetchers/hackernews.py` | **Update** — try/except error handling per story |
| `backend/api/routes/pipeline.py` | **Update** — use shared `pipeline_factory` |
| `backend/.env.example` | **Update** — document all env vars |
| `backend/tests/test_trends.py` | **Create** — trend computation tests |
| `backend/tests/test_cli.py` | **Create** — CLI smoke tests |

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Test | What It Validates |
|------|------------------|
| `test_new_card_stays_new` | Card < 7 days old → `New` |
| `test_rising_card` | Card 10 days old, signal_count=5, updated 3 days ago → `Rising` |
| `test_stable_card` | Card 20 days old, updated 10 days ago → `Stable` |
| `test_declining_card` | Card 30 days old, not updated in 15 days → `Declining` |
| `test_validate_env_missing` | No GEMINI_API_KEY → `validate_env("gemini")` returns False |
| `test_require_env_raises` | No key → `require_env()` raises `EnvironmentError` |
| `test_build_pipeline_no_key` | Missing key → clear error message |

### 8.2 CLI Tests

| Test | What It Validates |
|------|------------------|
| `test_status_command` | `run_pipeline.py status` → prints card count |
| `test_trends_command` | `run_pipeline.py trends` → updates statuses |

---

## 9. Exit Conditions

- [ ] `run_pipeline.py status` shows card count and signal count
- [ ] `run_pipeline.py trends` correctly updates trend statuses
- [ ] Missing `GEMINI_API_KEY` produces a clear, actionable error
- [ ] `validate_env()` and `require_env()` work correctly
- [ ] Trend computation: New/Rising/Stable/Declining logic is correct
- [ ] All unit tests pass
- [ ] Gemini provider enforces 15 req/min via TokenBucket
- [ ] Gemini provider retries on 429 with 30/60/90s backoff
- [ ] Reddit fetcher survives 404 and 302 responses without crashing
- [ ] HN fetcher survives individual story fetch failures
- [ ] Dead subreddits replaced with active ones
- [ ] (Optional) Live smoke test with real Gemini key produces new cards

---

## 10. What This Spec Completes

With Spec 4C implemented, **Phase 4 is done**:

```
Phase 3 (Agent Pipeline)    ✅ Signals → Cards
Phase 4A (FastAPI)           ✅ Cards → REST API
Phase 4B (Frontend)          ✅ REST API → React UI
Phase 4C (Ops)               ✅ CLI runner, trends, env validation
```

The system is now **end-to-end operational**:
```
Reddit/HN → Discovery → Extraction → Classification → Dedup → Scoring → Enrichment
    → SQLite CardStore → FastAPI → React Frontend
```

### What Could Come Next (Phase 5+)

| Topic | Phase |
|-------|-------|
| Scheduled pipeline runs (cron / Task Scheduler) | Phase 5 |
| Authentication & API keys for the REST API | Phase 5 |
| Production deployment (Cloud Run / Railway) | Phase 6 |
| Additional source connectors (Product Hunt, LinkedIn) | Phase 5 |
| Dashboard analytics (charts, sparklines) | Phase 5 |
| User bookmarks & notes on cards | Phase 5 |

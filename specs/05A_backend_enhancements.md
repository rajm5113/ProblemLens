# Spec 5A: Backend Enhancements — Scheduler, New Sources & Pipeline Hardening

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Phase 4 (all specs) ✅
> **Produces:** Automated scheduling, Indie Hacker + Product Hunt sources, pipeline run history API, improved signal quality

---

## 1. Purpose

Phase 4 delivered a working end-to-end system. Phase 5A makes the backend **autonomous and richer**:
- Scheduled pipeline runs so you don't have to manually trigger discovery
- Two new source connectors for higher-quality startup/product signals
- A pipeline run history API so the frontend can show pipeline status
- Signal quality improvements to reduce noise and improve card relevance

---

## 2. Scheduled Pipeline Runs

### 2.1 Architecture Decision: `schedule` Library + Background Thread

We use the Python `schedule` library (lightweight, no system dependencies) running in a background thread inside the FastAPI process. This avoids needing Windows Task Scheduler, cron, or external job runners.

```
FastAPI Server
├── Main thread: handles HTTP requests
└── Background thread: runs schedule loop
    ├── Every 6 hours: run discovery
    ├── Every 24 hours: update trends
    └── Every 24 hours: cleanup old runs
```

**Why not Windows Task Scheduler or cron?**
- The app should be self-contained and portable
- No OS-specific setup required
- Easy to disable/enable from `.env`

### 2.2 Implementation

```python
# backend/scheduler.py
import logging
import threading
import time

import schedule

from pipeline_factory import build_pipeline
from trends import update_trends
from store.card_store import CardStore
from config import RUNS_DIR

logger = logging.getLogger(__name__)


def _run_discovery_job():
    """Scheduled job: run discovery + process all new signals."""
    logger.info("Scheduled discovery starting")
    try:
        pipeline = build_pipeline()
        results = pipeline.run_full()
        success = sum(1 for r in results if r.status == "success")
        dupes = sum(1 for r in results if r.status == "duplicate_merged")
        errors = sum(1 for r in results if r.status == "manual_review")
        logger.info(f"Scheduled discovery done: {success} new, {dupes} merged, {errors} errors")
    except Exception as exc:
        logger.error(f"Scheduled discovery failed: {exc}")


def _run_trends_job():
    """Scheduled job: update trend statuses."""
    try:
        store = CardStore()
        updated = update_trends(store)
        logger.info(f"Trends updated: {updated} cards changed")
    except Exception as exc:
        logger.error(f"Trend update failed: {exc}")


def _run_cleanup_job():
    """Scheduled job: delete run artifacts older than 30 days."""
    import os
    from datetime import datetime, timezone, timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    removed = 0
    for f in RUNS_DIR.glob("*.json"):
        try:
            mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
            if mtime < cutoff:
                f.unlink()
                removed += 1
        except OSError:
            pass
    if removed:
        logger.info(f"Cleanup: removed {removed} old run artifacts")


def start_scheduler():
    """Start the background scheduler thread."""
    schedule.every(6).hours.do(_run_discovery_job)
    schedule.every(24).hours.do(_run_trends_job)
    schedule.every(24).hours.do(_run_cleanup_job)

    def _loop():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    thread = threading.Thread(target=_loop, daemon=True, name="scheduler")
    thread.start()
    logger.info("Background scheduler started (discovery every 6h, trends every 24h)")
```

### 2.3 Integration with FastAPI

```python
# api/main.py (update lifespan)
from scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_if_empty(store)
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        start_scheduler()
    yield
```

### 2.4 Config

```bash
# backend/.env
ENABLE_SCHEDULER=true             # Set to false to disable background jobs
DISCOVERY_INTERVAL_HOURS=6        # How often to run discovery
```

### 2.5 Dependency

```
pip install schedule
```

Add to `requirements.txt`:
```
schedule>=1.2
```

---

## 3. New Source Connectors

### 3.1 Indie Hackers (via RSS)

Indie Hackers publishes an RSS feed of community discussions. These are high-signal posts about real startup problems and pain points.

```python
# backend/agents/fetchers/indiehackers.py
class IndieHackersFetcher(BaseFetcher):
    """Fetch from Indie Hackers RSS feed (XML → RawPost)."""

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        import xml.etree.ElementTree as ET

        try:
            response = httpx.get(config.url, timeout=15)
            response.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.warning(f"IndieHackers: fetch failed ({exc}), skipping")
            return []

        root = ET.fromstring(response.content)
        posts: list[RawPost] = []
        for item in root.findall(".//item")[: config.max_items]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            desc = (item.findtext("description") or "").strip()
            posts.append(
                RawPost(
                    url=link,
                    title=title,
                    body=desc[:3000],
                    author=None,
                    channel=config.name,
                    platform=SourcePlatform.OTHER,
                    fetched_at=datetime.now(timezone.utc),
                )
            )
        return posts
```

### 3.2 Product Hunt (via RSS/JSON)

Product Hunt shows what people are building. Discussions on product pages often reveal the pain points that motivated the product.

```python
# backend/agents/fetchers/producthunt.py
class ProductHuntFetcher(BaseFetcher):
    """Fetch from Product Hunt RSS (no API key required)."""

    def fetch(self, config: SourceConfig) -> list[RawPost]:
        import xml.etree.ElementTree as ET

        try:
            response = httpx.get(config.url, timeout=15)
            response.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            logger.warning(f"ProductHunt: fetch failed ({exc}), skipping")
            return []

        root = ET.fromstring(response.content)
        posts: list[RawPost] = []
        for item in root.findall(".//item")[: config.max_items]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            desc = (item.findtext("description") or "").strip()
            posts.append(
                RawPost(
                    url=link,
                    title=title,
                    body=desc[:3000],
                    author=None,
                    channel=config.name,
                    platform=SourcePlatform.PRODUCT_HUNT,
                    fetched_at=datetime.now(timezone.utc),
                )
            )
        return posts
```

### 3.3 Source Config Updates

```python
# config.py — add to DISCOVERY_SOURCES
SourceConfig(
    platform=SourcePlatform.OTHER,
    name="IndieHackers",
    url="https://www.indiehackers.com/feed.xml",
    max_items=20,
),
SourceConfig(
    platform=SourcePlatform.PRODUCT_HUNT,
    name="ProductHunt",
    url="https://www.producthunt.com/feed",
    max_items=15,
),
```

### 3.4 Enum Update

Add `INDIE_HACKERS` to `SourcePlatform`:

```python
class SourcePlatform(StrEnum):
    REDDIT = "Reddit"
    PRODUCT_HUNT = "Product Hunt"
    HACKER_NEWS = "Hacker News"
    INDIE_HACKERS = "Indie Hackers"    # NEW
    STARTUP_INDIA = "Startup India"
    NASSCOM = "NASSCOM"
    SMART_INDIA_HACKATHON = "Smart India Hackathon"
    LINKEDIN = "LinkedIn"
    OTHER = "Other"
```

### 3.5 Register Fetchers in Discovery Agent

The `DiscoveryAgent.__init__` already supports a `fetchers` dict. Update the default:

```python
self.fetchers = fetchers or {
    SourcePlatform.REDDIT: RedditFetcher(),
    SourcePlatform.HACKER_NEWS: HackerNewsFetcher(),
    SourcePlatform.PRODUCT_HUNT: ProductHuntFetcher(),   # NEW
    SourcePlatform.INDIE_HACKERS: IndieHackersFetcher(),  # NEW
    SourcePlatform.OTHER: IndieHackersFetcher(),           # Fallback for RSS
}
```

---

## 4. Pipeline Run History API

### 4.1 Purpose

The frontend currently has no visibility into pipeline activity. Add an endpoint that returns recent pipeline runs so the dashboard can show:
- When the last discovery ran
- How many new cards were added
- Error counts

### 4.2 New API Endpoint

```python
# api/routes/pipeline.py — add to existing
@router.get("/api/pipeline/runs")
def get_pipeline_runs(limit: int = 20):
    """Return recent pipeline run summaries."""
    runs_dir = RUNS_DIR
    if not runs_dir.exists():
        return []

    run_files = sorted(runs_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)[:limit]
    summaries = []
    for f in run_files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            summaries.append({
                "runId": data.get("run_id", f.stem),
                "stage": data.get("current_stage", "unknown"),
                "status": data.get("status", "unknown"),
                "startedAt": data.get("started_at"),
                "completedAt": data.get("completed_at"),
                "signalCount": len(data.get("discovery_signals", [])),
                "hasCard": data.get("final_card") is not None,
            })
        except (json.JSONDecodeError, OSError):
            continue
    return summaries
```

### 4.3 New API Endpoint: Pipeline Stats

```python
@router.get("/api/pipeline/stats")
def get_pipeline_stats():
    """Return aggregate pipeline statistics."""
    runs_dir = RUNS_DIR
    total_runs = len(list(runs_dir.glob("*.json"))) if runs_dir.exists() else 0

    signal_store = SignalStore()
    total_signals = len(signal_store.get_all())

    card_store = CardStore()
    total_cards = len(card_store.all())

    return {
        "totalRuns": total_runs,
        "totalSignals": total_signals,
        "totalCards": total_cards,
        "lastRunAt": _get_last_run_time(runs_dir),
    }


def _get_last_run_time(runs_dir: Path) -> str | None:
    if not runs_dir.exists():
        return None
    files = sorted(runs_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        return None
    import json
    try:
        data = json.loads(files[0].read_text(encoding="utf-8"))
        return data.get("completed_at")
    except (json.JSONDecodeError, OSError):
        return None
```

---

## 5. Signal Quality Improvements

### 5.1 Keyword Filter Expansion

The current keyword filter in `utils/keyword_filter.py` catches obvious noise. Add more India-specific signal words to improve recall:

```python
# utils/keyword_filter.py — expand keyword list
POSITIVE_KEYWORDS = [
    # Existing
    "problem", "issue", "struggle", "frustrate", "pain", "broken",
    "expensive", "difficult", "waste", "scam", "fraud",
    # New: India-specific
    "jugaad", "babu", "middleman", "corruption", "bribe",
    "queue", "waiting", "delay", "pending", "rejection",
    "aadhaar", "upi", "gst", "ration", "subsidy",
    "rural", "village", "tier-2", "tier-3",
    "startup", "funding", "compliance", "regulation",
    "edtech", "healthtech", "agritech", "fintech",
]
```

### 5.2 Post-Discovery Dedup: Title Similarity

Sometimes the same problem appears on Reddit AND Hacker News with different URLs but nearly identical titles. Add a lightweight title similarity check:

```python
# utils/title_dedup.py
from difflib import SequenceMatcher


def is_title_duplicate(new_title: str, existing_titles: list[str], threshold: float = 0.85) -> bool:
    """Check if a title is too similar to any existing title."""
    normalized = new_title.lower().strip()
    for existing in existing_titles:
        ratio = SequenceMatcher(None, normalized, existing.lower().strip()).ratio()
        if ratio >= threshold:
            return True
    return False
```

Wire this into the discovery agent's `run()` method, after fingerprint dedup:

```python
# In DiscoveryAgent.run(), after fingerprint check:
from utils.title_dedup import is_title_duplicate

seen_titles = [s.source.raw_text.split("\n")[0] for s in signals]
if is_title_duplicate(post.title, seen_titles):
    self.logger.info("duplicate_title_skipped", url=post.url)
    continue
seen_titles.append(post.title)
```

---

## 6. File Deliverables

| File | Action |
|------|--------|
| `backend/scheduler.py` | **Create** — background scheduler with 3 jobs |
| `backend/agents/fetchers/indiehackers.py` | **Create** — RSS fetcher for Indie Hackers |
| `backend/agents/fetchers/producthunt.py` | **Create** — RSS fetcher for Product Hunt |
| `backend/utils/title_dedup.py` | **Create** — title similarity dedup |
| `backend/requirements.txt` | **Update** — add `schedule>=1.2` |
| `backend/config.py` | **Update** — add new sources, scheduler config |
| `backend/models/enums.py` | **Update** — add `INDIE_HACKERS` to SourcePlatform |
| `backend/agents/discovery.py` | **Update** — register new fetchers, add title dedup |
| `backend/agents/fetchers/__init__.py` | **Update** — export new fetcher classes |
| `backend/api/main.py` | **Update** — start scheduler in lifespan |
| `backend/api/routes/pipeline.py` | **Update** — add `/runs` and `/stats` endpoints |
| `backend/utils/keyword_filter.py` | **Update** — expand keyword list |
| `backend/.env.example` | **Update** — add scheduler config vars |
| `backend/tests/test_scheduler.py` | **Create** — scheduler unit tests |
| `backend/tests/test_fetchers_new.py` | **Create** — tests for new fetchers |
| `backend/tests/test_title_dedup.py` | **Create** — title similarity tests |

---

## 7. Testing Strategy

### 7.1 Unit Tests

| Test | What It Validates |
|------|------------------|
| `test_indiehackers_parses_rss` | Mock XML → list of RawPost with correct fields |
| `test_indiehackers_handles_bad_xml` | Malformed XML → returns empty list, no crash |
| `test_producthunt_parses_rss` | Mock XML → list of RawPost |
| `test_producthunt_handles_network_error` | Timeout → returns empty list |
| `test_title_dedup_exact` | Same title → duplicate |
| `test_title_dedup_similar` | 90% similar title → duplicate |
| `test_title_dedup_different` | Different title → not duplicate |
| `test_scheduler_creates_jobs` | `start_scheduler()` registers 3 jobs |
| `test_cleanup_removes_old_files` | Files > 30 days → deleted |
| `test_cleanup_keeps_recent_files` | Files < 30 days → kept |
| `test_pipeline_runs_endpoint` | GET `/api/pipeline/runs` → list of summaries |
| `test_pipeline_stats_endpoint` | GET `/api/pipeline/stats` → totals |

### 7.2 Integration Tests

| Test | What It Validates |
|------|------------------|
| `test_discovery_with_new_sources` | Pipeline discovers signals from all 4 source types |
| `test_title_dedup_in_pipeline` | Same problem from Reddit + HN → only one signal |

---

## 8. Exit Conditions

- [ ] `schedule` library installed and in `requirements.txt`
- [ ] Background scheduler starts when `ENABLE_SCHEDULER=true`
- [ ] Discovery runs every 6 hours automatically
- [ ] Trends update every 24 hours automatically
- [ ] Old run artifacts (>30 days) are cleaned up automatically
- [ ] IndieHackersFetcher parses RSS correctly
- [ ] ProductHuntFetcher parses RSS correctly
- [ ] Both new fetchers handle errors gracefully (no crashes)
- [ ] New fetchers registered in DiscoveryAgent defaults
- [ ] New sources added to `DISCOVERY_SOURCES` config
- [ ] `INDIE_HACKERS` added to SourcePlatform enum
- [ ] Title similarity dedup prevents cross-source duplicates
- [ ] GET `/api/pipeline/runs` returns recent run summaries
- [ ] GET `/api/pipeline/stats` returns aggregate stats
- [ ] Expanded keyword filter improves India-specific signal capture
- [ ] All new tests pass
- [ ] `npm run build` still passes (no frontend changes in this spec)

---

## 9. What's Next

| Spec | Scope |
|------|-------|
| **5B** | Dashboard analytics — charts, sparklines, sector distribution, time-series API |
| **5C** | User features — bookmarks, notes, search, auth |

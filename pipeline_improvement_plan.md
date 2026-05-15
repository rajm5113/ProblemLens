# ProblemLens Pipeline — Improvement Plan

After a deep audit of every agent, model, store, and utility file, here is a prioritized plan to make the pipeline **more resilient, easier to debug, and more effective**.

---

## Current Strengths (What's Already Good)

| Area | What You Have |
|---|---|
| Fallback Strategy | Primary → Self-Repair → Fallback LLM |
| LLM Cache | SQLite-backed, SHA-256 keyed, prevents duplicate API calls |
| Pydantic Models | Every data shape is validated at every stage |
| Cost Tracking | `PipelineContext` carries `CostBreakdown` per stage |
| Structured Logging | `structlog` with JSON output to `logs/pipeline.log` |

These are solid foundations. The improvements below build on top of them.

---

## Priority 1: Debuggability (See What Went Wrong, Fast)

### 1A. Add a Pipeline Run Logger
**Problem**: Right now, if a post fails at Stage 3, you have to dig through `pipeline.log` to figure out *which* post and *why*.

**Solution**: Save a per-run JSON snapshot after the pipeline finishes.

```python
# backend/utils/run_logger.py
import json
from pathlib import Path
from datetime import datetime, timezone
from models.pipeline_context import PipelineContext

class RunLogger:
    def __init__(self, runs_dir: Path):
        self.runs_dir = runs_dir
        self.runs_dir.mkdir(parents=True, exist_ok=True)

    def save(self, ctx: PipelineContext) -> Path:
        filename = f"{ctx.run_id}_{ctx.signal_id}.json"
        path = self.runs_dir / filename
        path.write_text(ctx.model_dump_json(indent=2), encoding="utf-8")
        return path
```

**Impact**: You can now open `runs/run123_signal456.json` and see the *entire* journey of a single post — what was extracted, how it was classified, what score it got, and whether fallback was triggered.

---

### 1B. Add Stage Timing to PipelineContext
**Problem**: You have `started_at` and `completed_at`, but no idea which agent is the bottleneck.

**Solution**: Add a `stage_timings` field:

```python
# In models/pipeline_context.py, add:
stage_timings: dict[str, float] = Field(default_factory=dict)
# e.g. {"extraction": 1.2, "classification": 0.8, "scoring": 2.1}
```

Each agent wraps its `run()` with a timer and writes to `ctx.stage_timings[self.stage_name]`. Now you can instantly see "Scoring took 4.2s — that's the bottleneck."

---

## Priority 2: Resilience (Never Lose Data)

### 2A. Fix the Dedup Agent's O(n) Scan
**Problem**: `dedup.py` line 54-60 calls `self.card_store.get_all()` and loops through *every* card in the database to check for duplicates. Same in `card_store.py` line 56-64. As your database grows past ~500 cards, this will get slow.

**Solution**: Add a `title_hash` column to the `cards` SQLite table and index it. Use a normalized hash for fast lookups instead of comparing every title.

---

### 2B. Add a Dead Letter Queue
**Problem**: When a post fails all retries *and* the fallback, it gets `status = "manual_review"` but there's no easy way to find or re-process those failures.

**Solution**: Create a `failed_signals.jsonl` file in the `store/` directory. Every time `_retry_or_fallback` sets `manual_review`, append the context to this file. This gives you a "retry inbox."

---

### 2C. Token Budget Enforcement
**Problem**: `config.py` line 49-55 defines `TOKEN_BUDGETS` but **nothing in the code actually enforces them**. They're unused constants.

**Solution**: Before each LLM call, estimate the token count (rough: `len(prompt) / 4`) and warn/skip if it exceeds the budget. This prevents accidental cost spikes from unusually long posts.

---

### 2D. LLM Cache Token Tracking
**Problem**: `extraction.py` line 109-110 always passes `tokens_in=0, tokens_out=0` to the cache. You're tracking costs in theory but recording zeros everywhere.

**Solution**: Parse the token counts from the LLM provider response and pass real values. This lets you build a real cost dashboard later.

---

## Priority 3: Effectiveness (Better Results)

### 3A. Parallel Fetching
**Problem**: `discovery.py` line 105-118 fetches from Reddit, HN, IndieHackers **sequentially**. If Reddit is slow, everything waits.

**Solution**: Use `concurrent.futures.ThreadPoolExecutor` to fetch from all sources simultaneously. This could cut the discovery phase time from ~15s to ~3s.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def _fetch_all(self) -> list[RawPost]:
    posts = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(fetcher.fetch, source): source
            for source in self.sources if source.enabled
            for fetcher in [self.fetchers.get(source.platform)]
            if fetcher
        }
        for future in as_completed(futures):
            try:
                posts.extend(future.result())
            except Exception as exc:
                self.logger.warning("fetch_failed", error=str(exc))
    return posts
```

---

### 3B. Smarter Dedup with Embeddings
**Problem**: `dedup.py` line 57 uses `SequenceMatcher` which only catches near-identical titles. "Farmers can't get crop insurance" and "Agricultural insurance is broken" would be treated as completely different problems.

**Solution**: Use a lightweight embedding model (like `sentence-transformers/all-MiniLM-L6-v2`) to compute semantic similarity. Store embeddings in a new SQLite column. This catches conceptually duplicate problems even with different wording.

---

### 3C. Add Source Diversity Scoring
**Problem**: If 10 Reddit posts about the same topic pass through, you get 10 cards about the same thing before dedup catches them.

**Solution**: Before sending posts to the LLM, group them by topic using simple TF-IDF clustering. Send only the best representative from each cluster. This saves API calls and improves diversity.

---

### 3D. Reddit Fetcher Improvements
**Problem**: `reddit.py` line 23 has `follow_redirects=False`. Reddit sometimes 302-redirects, which causes posts to silently fail.

**Solution**: Set `follow_redirects=True` and add a `sort=new` parameter to also catch fresh complaints, not just hot/trending ones.

---

## Implementation Roadmap

| Week | What to Build | Effort | Impact |
|---|---|---|---|
| Week 1 | Run Logger + Stage Timings | Low | High (debugging) |
| Week 1 | Dead Letter Queue | Low | Medium (resilience) |
| Week 2 | Parallel Fetching | Medium | High (speed) |
| Week 2 | Token Budget Enforcement | Low | Medium (cost control) |
| Week 3 | Dedup Indexing (hash column) | Medium | High (performance) |
| Week 3 | Fix token tracking in cache | Low | Medium (observability) |
| Week 4 | Embedding-based Dedup | High | Very High (quality) |
| Week 4 | Source Diversity Clustering | High | High (quality) |

---

## Quick Wins (Can Do Right Now)

1. **Fix `follow_redirects`** in `reddit.py` → 1 line change
2. **Enforce token budgets** → add a 10-line guard before each LLM call
3. **Log real token counts** → update the `_generate_with_cache` methods
4. **Save run snapshots** → ~30 lines for the `RunLogger` class

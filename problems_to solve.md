# ProblemLens: Pending Tasks & Fixes

## 1. Reddit "403 Blocked" Fix (Professional Way)

The current "Quick Fix" uses a fake Browser User-Agent, but this can be blocked again by Reddit. To make this 100% reliable for production, follow these steps:

### Step A: Get Reddit API Credentials

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps).
2. Scroll to the bottom and click **"are you a developer? create an app..."**.
3. Fill in the details:
   - **name**: ProblemLens
   - **App type**: Select **"script"**.
   - **description**: Problem discovery research tool.
   - **about url**: (leave blank or use your portfolio link).
   - **redirect uri**: http://localhost:8080 (required but not used for scripts).
4. Click **"create app"**.
5. Copy your **Client ID** (the string under "personal use script") and your **Secret**.

### Step B: Update Configuration

Add these to your `.env` file:

```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_secret_here
```

### Step C: Code Update

Update `RedditFetcher` to use OAuth2 authentication or a library like `praw` to fetch data officially. This will stop the "403 Blocked" errors forever.

---

## 2. Gemini Fallback Monitoring

- [X] Fixed: Added 503 (Service Unavailable) to fallback triggers.
- [X] Fixed: Added "unavailable" string detection for Gemini high-demand spikes.
- [ ] Todo: Monitor if Gemini 3.1 Flash-Lite also hits limits simultaneously during peak hours.

## 3. OpenAI Fallback

- [ ] Todo: Add a valid `OPENAI_API_KEY` to `.env` to enable the final layer of resilience.

---

## 4. Pipeline Improvement Plan

### 4A. Debuggability — See What Went Wrong, Fast

- [ ] **Run Logger**: Save a per-run JSON snapshot (`runs/{run_id}_{signal_id}.json`) after each pipeline run. Currently if a post fails at Stage 3, you have to dig through `pipeline.log` to find *which* post and *why*. A snapshot file gives you the entire journey of a single post in one file.
- [ ] **Stage Timings**: Add a `stage_timings: dict[str, float]` field to `PipelineContext`. Each agent records how long its `run()` took. This instantly reveals bottleneck agents (e.g. "Scoring took 4.2s").

### 4B. Resilience — Never Lose Data

- [ ] **Fix Dedup O(n) Scan**: `dedup.py` line 54-60 calls `card_store.get_all()` and loops through *every* card to check duplicates. As the database grows past ~500 cards, this gets slow. **Fix**: Add a `title_hash` indexed column to the `cards` SQLite table for fast lookups.
- [ ] **Dead Letter Queue**: When a post fails all retries AND the fallback, it gets `status = "manual_review"` but there's no way to find or re-process those failures. **Fix**: Create `store/failed_signals.jsonl` and append failed contexts to it — a "retry inbox."
- [ ] **Enforce Token Budgets**: `config.py` line 49-55 defines `TOKEN_BUDGETS` but **nothing in the code actually uses them**. They are dead constants. **Fix**: Before each LLM call, estimate token count (`len(prompt) / 4`) and warn/skip if it exceeds the budget to prevent cost spikes.
- [ ] **Track Real Token Counts**: `extraction.py` line 109-110 always passes `tokens_in=0, tokens_out=0` to the cache. Cost tracking records zeros everywhere. **Fix**: Parse actual token counts from LLM provider responses and pass real values.

### 4C. Effectiveness — Better Results

- [ ] **Parallel Fetching**: `discovery.py` line 105-118 fetches from Reddit, HN, IndieHackers **sequentially**. If Reddit is slow, everything waits. **Fix**: Use `concurrent.futures.ThreadPoolExecutor` to fetch from all sources simultaneously. Could cut discovery phase from ~15s to ~3s.
- [ ] **Embedding-Based Dedup**: `dedup.py` line 57 uses `SequenceMatcher` (string matching). "Farmers can't get crop insurance" and "Agricultural insurance is broken" are treated as different problems. **Fix**: Use `sentence-transformers/all-MiniLM-L6-v2` for semantic similarity. Catches conceptually duplicate problems.
- [ ] **Source Diversity Clustering**: If 10 Reddit posts about the same topic pass through, you get 10 cards before dedup catches them. **Fix**: Group posts by topic using TF-IDF clustering before LLM calls. Send only the best representative per cluster. Saves API calls.
- [ ] **Reddit Fetcher Redirect Fix**: `reddit.py` line 23 has `follow_redirects=False`. Reddit sometimes 302-redirects, silently dropping posts. **Fix**: Set `follow_redirects=True`.
- [ ] **Reddit Sort Parameter**: Currently only fetching `hot` posts. **Fix**: Add `sort=new` parameter to also catch fresh complaints, not just trending ones.

### Implementation Roadmap

| Week   | Task                         | Effort | Impact                 |
| ------ | ---------------------------- | ------ | ---------------------- |
| Week 1 | Run Logger + Stage Timings   | Low    | High (debugging)       |
| Week 1 | Dead Letter Queue            | Low    | Medium (resilience)    |
| Week 2 | Parallel Fetching            | Medium | High (speed)           |
| Week 2 | Token Budget Enforcement     | Low    | Medium (cost control)  |
| Week 3 | Dedup Indexing (hash column) | Medium | High (performance)     |
| Week 3 | Fix token tracking in cache  | Low    | Medium (observability) |
| Week 4 | Embedding-based Dedup        | High   | Very High (quality)    |
| Week 4 | Source Diversity Clustering  | High   | High (quality)         |

### Quick Wins (Do Right Now)

1. **Fix `follow_redirects`** in `reddit.py` → 1 line change
2. **Enforce token budgets** → 10-line guard before each LLM call
3. **Log real token counts** → update `_generate_with_cache` methods
4. **Save run snapshots** → ~30 lines for `RunLogger` class

---

## 5. Expanded Source Challenges & API Blockers

During our initiative to expand active endpoints to **15 sources** (~335 posts per run), we identified specific platform-level restrictions and quota limits that require future remediation:

### 5A. Platform-Specific Fetching Restrictions

- **Indie Hackers**: The standard RSS feed (`feed.xml`) now returns standard HTML instead of XML, and post payloads are rendered via client-side JavaScript. **Remediation**: Requires integration with a headless browser automation framework (e.g., Playwright) to execute JavaScript and extract content.
- **NASSCOM Community**: Direct GET requests return `HTTP 406 Not Acceptable`, indicating active bot-mitigation rules blocking automated scripts. **Remediation**: Requires headless browser simulation or establishing an official API integration partnership.
- **LinkedIn**: Accessing professional pain points and posts requires formal API access. **Remediation**: Requires setting up an official LinkedIn Developer Application with approved Company Page permissions and OAuth2 token handling.
- **Startup India Blog**: Direct requests raise local SSL certificate verification failures (`SSL: CERTIFICATE_VERIFY_FAILED`). **Remediation**: Requires updating the underlying OS/Python certificate trust store or selectively disabling SSL verification for specific state domains.

### 5B. Model Rate Limits & Volume Bottlenecks

- **Gemini Quota Exhaustion**: Expanding discovery sources results in significantly higher text ingestion. Consequently, both `gemini-2.5-flash` and the fallback `gemini-3.1-flash-lite` rapidly exhaust the strict free-tier metric (`15 requests/minute`), resulting in `HTTP 429 Too Many Requests` / `RESOURCE_EXHAUSTED` failures during the batched relevance check. **Remediation**: Implement intra-batch throttling/sleep delays, or migrate the GCP/Google AI Studio project billing to a higher-tier/paid tier to support continuous high-volume discovery.

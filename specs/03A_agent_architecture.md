# Spec 3A: Agent Architecture & Pipeline Foundation

> **Status:** 📋 READY TO IMPLEMENT  
> **Depends on:** Phase 2 (Problem Schema) ✅  
> **Produces:** Backend skeleton, shared models, provider abstraction, pipeline orchestrator, test harness

---

## 1. Mental Model

This is NOT "agents talking to each other."  
This is:

> **A structured intelligence pipeline that turns raw signals into validated opportunity cards.**

Every stage has one job. Every output is validated. Every failure is handled.

```
Raw Source → Discovery → Extraction → Classification → Scoring → Enrichment → Publish
                ↓             ↓              ↓              ↓           ↓
           RawSignal     DraftCard     ClassifiedCard   ScoredCard  ProblemIntelligenceCard
                ↓             ↓              ↓              ↓           ↓
          [Validate]    [Validate]     [Validate]     [Validate]   [Validate]
                ↓             ↓              ↓              ↓           ↓
          Pass/Retry    Pass/Retry     Pass/Retry     Pass/Retry   Pass/ManualReview
```

---

## 2. Core Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Raw Python orchestration | No CrewAI, no LangChain. Pipeline is sequential, not collaborative. |
| Primary LLM | Gemini 2.0 Flash | Free tier for dev, cheap at scale, `response_schema` for structured output |
| Fallback LLM | GPT-4o-mini | Only on validation failure, malformed output, or low confidence |
| Data validation | Pydantic v2 | Strict types, automatic validation, JSON schema generation |
| Storage (MVP) | SQLite + JSONL | Raw signals in JSONL, processed cards in SQLite |
| Python env | `.venv/` inside `backend/` | Never global. All deps local. |
| Logging | `structlog` | Structured JSON logs for every pipeline stage |
| Testing | `pytest` | Golden test set + unit + integration |

---

## 3. Project Structure

```
backend/
├── .venv/                    # Python virtual environment (gitignored)
├── .env                      # API keys (gitignored)
├── .env.example              # Template for API keys (committed)
├── requirements.txt          # Pinned dependencies
├── config.py                 # Settings loaded from .env
├── pipeline.py               # Pipeline orchestrator
│
├── agents/                   # One file per agent
│   ├── __init__.py
│   ├── base.py               # BaseAgent abstract class
│   ├── discovery.py          # Spec 3B
│   ├── extraction.py         # Spec 3C
│   ├── classification.py     # Spec 3C
│   ├── scoring.py            # Spec 3D
│   ├── enrichment.py         # Spec 3D
│   └── dedup.py              # Spec 3D
│
├── models/                   # Pydantic v2 models
│   ├── __init__.py
│   ├── enums.py              # Sector, Frequency, Confidence, TrendStatus
│   ├── raw_signal.py         # RawSignal model
│   ├── draft_card.py         # DraftCard model
│   ├── problem_card.py       # ProblemIntelligenceCard model
│   ├── score_breakdown.py    # ScoreBreakdown + ScoreRationale
│   ├── validation_result.py  # ValidationResult model
│   └── pipeline_context.py   # PipelineContext model
│
├── providers/                # LLM provider abstraction
│   ├── __init__.py
│   ├── base.py               # BaseLLMProvider abstract class
│   ├── gemini.py             # Gemini 2.0 Flash implementation
│   └── openai.py             # GPT-4o-mini implementation
│
├── prompts/                  # Versioned prompt templates
│   ├── v1/
│   │   ├── discovery_filter.txt
│   │   ├── extraction.txt
│   │   ├── classification.txt
│   │   ├── scoring.txt
│   │   └── enrichment.txt
│   └── registry.py           # Prompt loader with version tracking
│
├── store/                    # Data persistence
│   ├── __init__.py
│   ├── signal_store.py       # JSONL store for raw signals
│   └── card_store.py         # SQLite store for processed cards
│
├── utils/                    # Shared utilities
│   ├── __init__.py
│   ├── fingerprint.py        # Content fingerprinting for dedup
│   ├── keyword_filter.py     # Pre-LLM zero-cost signal filter (§17.1)
│   ├── llm_cache.py          # Hash-based LLM response cache (§17.3)
│   ├── rate_limiter.py       # Token bucket rate limiter
│   ├── cost_tracker.py       # Per-run and daily cost tracking (§17.7)
│   └── retry.py              # Retry with backoff logic
│
├── logs/                     # Structured log output (gitignored)
├── runs/                     # Artifact trail per pipeline run (gitignored)
│
└── tests/
    ├── __init__.py
    ├── conftest.py            # Shared fixtures
    ├── golden/                # Golden test data
    │   ├── raw_signals.json
    │   └── expected_cards.json
    ├── test_models.py
    ├── test_validation.py
    ├── test_scoring.py
    ├── test_pipeline.py
    └── test_agents/
        ├── test_discovery.py
        ├── test_extraction.py
        └── test_scoring.py
```

---

## 4. Provider Abstraction Layer

### 4.1 Base Provider Interface

```python
# providers/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Type, TypeVar

T = TypeVar("T", bound=BaseModel)

class LLMResponse:
    """Wrapper for any LLM response."""
    content: str
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    latency_ms: float

class BaseLLMProvider(ABC):
    """Abstract provider. Gemini and OpenAI both implement this."""

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> T:
        """Send prompt, enforce structured output, return parsed Pydantic model."""
        ...

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        """Send prompt, return raw text response."""
        ...
```

### 4.2 Provider Selection Logic

```python
# config.py
PRIMARY_PROVIDER = "gemini"       # Default for all agents
FALLBACK_PROVIDER = "openai"      # Used only on validation failure

# Fallback triggers (strict — do NOT burn tokens unnecessarily):
FALLBACK_TRIGGERS = [
    "validation_failed_after_retry",   # Primary returned invalid output twice
    "malformed_json",                  # Primary returned unparseable JSON
    "confidence_below_threshold",      # Extraction confidence < 0.5
    "timeout",                         # Primary didn't respond in time
]
```

### 4.3 No Unnecessary Fallbacks

The fallback is NOT automatic. The flow is:
1. Call primary (Gemini Flash)
2. Validate output against Pydantic model
3. If invalid → **retry primary once** with a repair prompt
4. If still invalid → **then** call fallback (GPT-4o-mini)
5. If fallback also fails → move to **manual review queue**
6. Never force bad data through

---

## 5. Pydantic v2 Models

### 5.1 Enums (mirrors Phase 2 schema.ts exactly)

```python
# models/enums.py
from enum import StrEnum

class Sector(StrEnum):
    HEALTHCARE = "Healthcare"
    FINTECH = "Fintech"
    EDUCATION = "Education"
    AGRICULTURE = "Agriculture"
    GOVTECH = "GovTech"
    LEGAL = "Legal"
    CLEANTECH = "CleanTech"
    EMPLOYMENT = "Employment"
    CREATOR_ECONOMY = "Creator Economy"
    RETAIL = "Retail"
    RARE_DISEASE = "Rare Disease"
    TECHNOLOGY = "Technology"
    TRANSPORTATION = "Transportation"
    # Compound
    FINTECH_RETAIL = "Fintech / Retail"
    FINTECH_CREATOR = "Fintech / Creator"
    LEGAL_GOVTECH = "Legal / GovTech"
    GOVTECH_LEGAL = "GovTech / Legal"
    EMPLOYMENT_EDTECH = "Employment / EdTech"

class Frequency(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very High"

class Confidence(StrEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class TrendStatus(StrEnum):
    NEW = "New"
    RISING = "Rising"
    STABLE = "Stable"
    DECLINING = "Declining"

class SourcePlatform(StrEnum):
    REDDIT = "Reddit"
    PRODUCT_HUNT = "Product Hunt"
    STARTUP_INDIA = "Startup India"
    NASSCOM = "NASSCOM"
    HACKER_NEWS = "Hacker News"
    SMART_INDIA_HACKATHON = "Smart India Hackathon"
    LINKEDIN = "LinkedIn"
    OTHER = "Other"
```

### 5.2 RawSignal

```python
# models/raw_signal.py
from pydantic import BaseModel, Field
from datetime import datetime

class SourceMetadata(BaseModel):
    url: str
    platform: SourcePlatform
    author: str | None = None
    channel: str | None = None          # e.g., subreddit name
    scraped_at: datetime
    raw_text: str = Field(max_length=5000)

class RawSignal(BaseModel):
    signal_id: str                      # Auto-generated UUID
    source: SourceMetadata
    fingerprint: str                    # Content hash for dedup
    is_relevant: bool | None = None     # Set by discovery filter
    relevance_confidence: float | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 5.3 DraftCard

```python
# models/draft_card.py
class DraftCard(BaseModel):
    """Output of extraction agent. Missing scores and enrichment."""
    signal_id: str                      # Links back to RawSignal
    title: str = Field(min_length=10, max_length=200)
    pain_summary: str = Field(min_length=20, max_length=300)
    sector: Sector
    user_type: list[str] = Field(min_length=1, max_length=5)
    geography: str = Field(default="India", max_length=100)
    frequency: Frequency
    pain_points: list[str] = Field(min_length=2, max_length=5)
    solutions: list[str] = Field(min_length=2, max_length=5)
    source: str = Field(max_length=200)
    confidence: Confidence
    extraction_confidence: float        # 0.0–1.0, how sure the LLM is
```

### 5.4 ScoreBreakdown

```python
# models/score_breakdown.py
class ScoreRationale(BaseModel):
    severity_reason: str = Field(max_length=200)
    market_potential_reason: str = Field(max_length=200)
    ai_feasibility_reason: str = Field(max_length=200)
    competition_reason: str = Field(max_length=200)

class ScoreBreakdown(BaseModel):
    severity: int = Field(ge=1, le=10)
    market_potential: int = Field(ge=1, le=10)
    ai_feasibility: int = Field(ge=1, le=10)
    competition: int = Field(ge=1, le=10)
    rationale: ScoreRationale
    score_confidence: float             # 0.0–1.0
```

### 5.5 ProblemIntelligenceCard (Python mirror of Phase 2 schema.ts)

```python
# models/problem_card.py
class ProblemIntelligenceCard(BaseModel):
    id: str = Field(pattern=r"^PIP-\d{3}$")
    numeric_id: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime
    title: str = Field(min_length=10, max_length=200)
    pain_summary: str = Field(min_length=20, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    sector: Sector
    user_type: list[str] = Field(min_length=1, max_length=5)
    geography: str = Field(default="India", max_length=100)
    frequency: Frequency
    tags: list[str] = Field(min_length=3, max_length=3)
    pain_points: list[str] = Field(min_length=2, max_length=5)
    root_cause: str | None = Field(default=None, max_length=500)
    solutions: list[str] = Field(min_length=2, max_length=5)
    source: str = Field(max_length=200)
    confidence: Confidence
    signal_count: int = Field(default=1, ge=1)
    scores: ScoreBreakdown
    opportunity_score: int = Field(ge=1, le=10)
    trend_status: TrendStatus = TrendStatus.NEW
```

### 5.6 PipelineContext

```python
# models/pipeline_context.py
class PipelineContext(BaseModel):
    """Travels through every pipeline stage. Full audit trail."""
    run_id: str                         # UUID for this pipeline run
    signal_id: str                      # Links to the originating RawSignal
    started_at: datetime
    current_stage: str                  # "discovery" | "extraction" | ...
    
    # Intermediate outputs (populated as pipeline progresses)
    raw_signal: RawSignal | None = None
    draft_card: DraftCard | None = None
    score_breakdown: ScoreBreakdown | None = None
    final_card: ProblemIntelligenceCard | None = None
    
    # Validation & retry tracking
    validation_errors: list[str] = Field(default_factory=list)
    retry_count: int = 0
    provider_used: str = "gemini"       # Which LLM handled this stage
    fallback_triggered: bool = False
    
    # Outcome
    status: str = "in_progress"         # "in_progress" | "success" | "failed" | "manual_review"
    completed_at: datetime | None = None
    
    # Cost tracking
    total_input_tokens: int = 0
    total_output_tokens: int = 0
```

### 5.7 ValidationResult

```python
# models/validation_result.py
class ValidationResult(BaseModel):
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    stage: str                          # Which stage produced this
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

---

## 6. Base Agent Contract

```python
# agents/base.py
from abc import ABC, abstractmethod
from models.pipeline_context import PipelineContext
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
import structlog

class BaseAgent(ABC):
    """Every agent implements this contract."""

    def __init__(self, primary: BaseLLMProvider, fallback: BaseLLMProvider | None = None):
        self.primary = primary
        self.fallback = fallback
        self.logger = structlog.get_logger(agent=self.__class__.__name__)

    @abstractmethod
    def run(self, ctx: PipelineContext) -> PipelineContext:
        """
        Process one item through this stage.
        - Read input from ctx
        - Call LLM via self.primary
        - Validate output
        - If invalid: retry once, then fallback, then manual review
        - Write output back to ctx
        - Return updated ctx
        """
        ...

    @abstractmethod
    def validate(self, ctx: PipelineContext) -> ValidationResult:
        """Validate this agent's output against schema."""
        ...

    def _retry_or_fallback(self, ctx: PipelineContext) -> PipelineContext:
        """Standard retry → fallback → manual review flow."""
        # Step 1: Retry primary with repair prompt
        ctx.retry_count += 1
        result = self.run(ctx)
        validation = self.validate(result)
        if validation.valid:
            return result

        # Step 2: Try fallback provider
        if self.fallback:
            ctx.provider_used = "openai"
            ctx.fallback_triggered = True
            self.logger.warning("primary_failed_using_fallback", stage=ctx.current_stage)
            # Swap provider and retry
            original = self.primary
            self.primary = self.fallback
            result = self.run(ctx)
            self.primary = original
            validation = self.validate(result)
            if validation.valid:
                return result

        # Step 3: Manual review queue
        ctx.status = "manual_review"
        ctx.validation_errors = validation.errors
        self.logger.error("moved_to_manual_review", errors=validation.errors)
        return ctx
```

---

## 7. Pipeline Orchestrator

```python
# pipeline.py
class Pipeline:
    """Sequential pipeline: discovery → extraction → scoring → enrichment → publish."""

    def __init__(self, agents: list[BaseAgent], store: CardStore):
        self.agents = agents
        self.store = store
        self.logger = structlog.get_logger(component="pipeline")

    def process_signal(self, signal: RawSignal) -> PipelineContext:
        ctx = PipelineContext(
            run_id=str(uuid4()),
            signal_id=signal.signal_id,
            started_at=datetime.utcnow(),
            current_stage="init",
            raw_signal=signal,
        )

        for agent in self.agents:
            ctx.current_stage = agent.__class__.__name__
            self.logger.info("stage_start", stage=ctx.current_stage, run_id=ctx.run_id)

            ctx = agent.run(ctx)
            validation = agent.validate(ctx)

            if not validation.valid:
                ctx = agent._retry_or_fallback(ctx)
                if ctx.status == "manual_review":
                    self._save_run_artifact(ctx)
                    return ctx

            self.logger.info("stage_complete", stage=ctx.current_stage, run_id=ctx.run_id)

        # All stages passed
        ctx.status = "success"
        ctx.completed_at = datetime.utcnow()
        self.store.save(ctx.final_card)
        self._save_run_artifact(ctx)
        return ctx

    def _save_run_artifact(self, ctx: PipelineContext):
        """Save full pipeline context to runs/ for debugging."""
        path = f"runs/{ctx.run_id}.json"
        with open(path, "w") as f:
            f.write(ctx.model_dump_json(indent=2))
```

---

## 8. Retry & Rate Limiting

### 8.1 Retry Policy

```python
# utils/retry.py
MAX_PRIMARY_RETRIES = 1          # Retry primary once with repair prompt
MAX_FALLBACK_RETRIES = 1         # Fallback gets one shot
RETRY_BACKOFF_SECONDS = 2        # Wait before retry
```

### 8.2 Rate Limiter

```python
# utils/rate_limiter.py
# Token bucket implementation
GEMINI_FREE_TIER = {
    "requests_per_minute": 15,
    "tokens_per_day": 1_000_000,
}
OPENAI_LIMITS = {
    "requests_per_minute": 60,
    "tokens_per_minute": 200_000,
}
```

### 8.3 Circuit Breaker

If a provider fails **5 consecutive requests**, stop calling it for 60 seconds and use the other provider. Log an alert.

---

## 9. Structured Logging

```python
# config.py (logging setup)
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.WriteLoggerFactory(file=open("logs/pipeline.log", "a")),
)
```

Every log entry includes: `timestamp`, `level`, `stage`, `run_id`, `signal_id`, `provider`, `message`, `extra`.

---

## 10. Artifact Trail

Every pipeline run saves a JSON file to `runs/{run_id}.json` containing:

```json
{
  "run_id": "abc-123",
  "signal_id": "sig-456",
  "started_at": "2026-05-11T03:00:00Z",
  "completed_at": "2026-05-11T03:00:04Z",
  "status": "success",
  "stages": {
    "discovery":    { "provider": "gemini", "retries": 0, "tokens": 450 },
    "extraction":   { "provider": "gemini", "retries": 0, "tokens": 1200 },
    "scoring":      { "provider": "gemini", "retries": 1, "tokens": 2100 },
    "enrichment":   { "provider": "gemini", "retries": 0, "tokens": 800 }
  },
  "raw_signal": { ... },
  "draft_card": { ... },
  "score_breakdown": { ... },
  "final_card": { ... },
  "validation_errors": [],
  "total_tokens": 4550
}
```

---

## 11. Scoring Rules (Locked from Phase 2)

The LLM produces the 4 rubric scores. The **code** computes the final opportunity score:

```python
# Never let the LLM compute the composite score
def compute_opportunity_score(scores: ScoreBreakdown) -> int:
    raw = (
        scores.severity * 0.30 +
        scores.market_potential * 0.25 +
        scores.ai_feasibility * 0.20 +
        (10 - scores.competition) * 0.25
    )
    return max(1, min(10, round(raw)))
```

Score calibration uses the 11 manually curated cards from Phase 2 as reference anchors.

---

## 12. Requirements (Initial)

```
# requirements.txt
pydantic>=2.7,<3.0
google-genai>=1.0
openai>=1.30
httpx>=0.27
structlog>=24.0
python-dotenv>=1.0
pytest>=8.0
pytest-asyncio>=0.23
```

All installed into `.venv/` — **never globally**.

---

## 13. Config & Environment

```bash
# .env.example (committed — template only)
GEMINI_API_KEY=your-gemini-key-here
OPENAI_API_KEY=your-openai-key-here
PRIMARY_PROVIDER=gemini
FALLBACK_PROVIDER=openai
LOG_LEVEL=INFO
```

```python
# config.py
from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PRIMARY_PROVIDER = os.getenv("PRIMARY_PROVIDER", "gemini")
FALLBACK_PROVIDER = os.getenv("FALLBACK_PROVIDER", "openai")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
```

---

## 14. Testing Strategy

### 14.1 Golden Test Set

Create 3–5 raw signal samples with **known expected outputs** (derived from the 11 manually curated cards). Every code change must reproduce these expected outputs.

### 14.2 Test Categories

| Category | What It Tests | Example |
|----------|--------------|---------|
| Unit | Models, validation, scoring formula | `test_scoring.py`: verify formula matches Phase 2 |
| Unit | Enum validation, field bounds | `test_models.py`: reject score=11, bad sector |
| Integration | Single agent end-to-end | `test_extraction.py`: raw signal → valid draft card |
| Integration | Full pipeline | `test_pipeline.py`: signal → final card |
| Negative | Failure handling | Bad JSON, missing fields, timeout simulation |
| Calibration | Score drift detection | Compare agent scores vs manual scores for seed data |

---

## 15. Exit Conditions

Spec 3A is complete when ALL of the following are true:

- [ ] `backend/` folder exists with the full structure from §3
- [ ] `.venv/` created with all deps from `requirements.txt` installed
- [ ] All Pydantic models from §5 pass instantiation with valid data
- [ ] All Pydantic models correctly reject invalid data (bad enum, out-of-range score, etc.)
- [ ] `BaseLLMProvider` interface defined with `generate_structured()` and `generate_text()`
- [ ] Gemini provider connects and returns a response (simple test prompt)
- [ ] OpenAI provider connects and returns a response (simple test prompt)
- [ ] `BaseAgent` abstract class defined with `run()`, `validate()`, `_retry_or_fallback()`
- [ ] `Pipeline` class can instantiate with empty agent list without errors
- [ ] `PipelineContext` serializes to JSON and deserializes back correctly
- [ ] Structured logging writes to `logs/pipeline.log`
- [ ] `pytest` runs and discovers the test directory
- [ ] `compute_opportunity_score()` matches Phase 2 formula exactly
- [ ] `.env.example` committed, `.env` gitignored

---

## 16. What This Spec Does NOT Cover

| Topic | Covered In |
|-------|-----------|
| Source scraping logic | Spec 3B (Discovery Agent) |
| LLM prompt engineering | Spec 3C (Extraction & Classification) |
| Rubric prompt design | Spec 3D (Scoring & Enrichment) |
| Semantic dedup algorithm | Spec 3D |
| Trend computation job | Spec 3D |
| Database schema | Phase 4 (Backend) |
| API endpoints | Phase 4 (Backend) |
| UI integration | Phase 4 (Backend) |

---

## 17. Cost Control Layer

> **RULE: Every token spent must produce value. No wasted calls, no redundant processing, no lazy defaults.**

### 17.1 Pre-LLM Keyword Filter (Zero Cost Gate)

Before ANY signal reaches the LLM, run a free, local keyword filter:

```python
# utils/keyword_filter.py
PROBLEM_KEYWORDS = [
    "struggle", "frustrated", "broken", "failing", "pain point",
    "can't access", "no solution", "workaround", "nobody fixes",
    "underserved", "gap", "unmet need", "complaint", "costly",
    "inefficient", "delayed", "inaccessible", "overpriced",
]

NOISE_KEYWORDS = [
    "meme", "shitpost", "lol", "upvote", "karma",
    "sale", "discount", "promo", "giveaway",
]

def passes_keyword_filter(text: str) -> bool:
    """Returns True if text likely contains a real problem signal."""
    text_lower = text.lower()
    has_signal = any(kw in text_lower for kw in PROBLEM_KEYWORDS)
    is_noise = any(kw in text_lower for kw in NOISE_KEYWORDS)
    return has_signal and not is_noise
```

**Impact:** Eliminates ~70% of irrelevant signals before any API call.

### 17.2 Token Budgets Per Stage (Hard Caps)

Every stage has a maximum token budget. If a prompt exceeds the input cap, truncate the source text. If the output exceeds the cap, the response is rejected.

| Stage | Max Input Tokens | Max Output Tokens | Typical Cost (Gemini Flash) |
|-------|-----------------|-------------------|----------------------------|
| Discovery filter | 300 | 50 | $0.000026 |
| Extraction | 800 | 400 | $0.000180 |
| Classification | 500 | 200 | $0.000098 |
| Scoring | 600 | 300 | $0.000135 |
| Enrichment | 500 | 300 | $0.000128 |
| **Total per card** | **2,700** | **1,250** | **~$0.000567** |

At this rate: **1,000 cards cost ~$0.57**. That's extremely efficient.

```python
# config.py
TOKEN_BUDGETS = {
    "discovery":      {"max_input": 300,  "max_output": 50},
    "extraction":     {"max_input": 800,  "max_output": 400},
    "classification": {"max_input": 500,  "max_output": 200},
    "scoring":        {"max_input": 600,  "max_output": 300},
    "enrichment":     {"max_input": 500,  "max_output": 300},
}
```

### 17.3 LLM Response Cache (Hash-Based)

Cache every LLM request/response pair locally. If the exact same input appears again, return the cached result without an API call.

```python
# utils/llm_cache.py
import hashlib, json, sqlite3

class LLMCache:
    """Hash-based LLM response cache backed by SQLite."""

    def __init__(self, db_path: str = "store/llm_cache.db"):
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                prompt_hash TEXT PRIMARY KEY,
                provider    TEXT,
                model       TEXT,
                response    TEXT,
                tokens_in   INTEGER,
                tokens_out  INTEGER,
                created_at  TEXT
            )
        """)

    def _hash(self, prompt: str, model: str) -> str:
        return hashlib.sha256(f"{model}::{prompt}".encode()).hexdigest()

    def get(self, prompt: str, model: str) -> str | None:
        row = self.conn.execute(
            "SELECT response FROM cache WHERE prompt_hash = ?",
            (self._hash(prompt, model),)
        ).fetchone()
        return row[0] if row else None

    def put(self, prompt: str, model: str, provider: str,
            response: str, tokens_in: int, tokens_out: int):
        self.conn.execute(
            "INSERT OR REPLACE INTO cache VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            (self._hash(prompt, model), provider, model, response, tokens_in, tokens_out)
        )
        self.conn.commit()
```

**Impact:** During development, cache hit rate approaches 100% after the first run. Zero API cost for repeated testing.

### 17.4 Batching Strategy

Instead of 1 LLM call per signal, batch where possible:

| Stage | Batchable? | Strategy |
|-------|-----------|----------|
| Discovery filter | ✅ Yes | "Are any of these 5 texts real problem signals?" → 1 call instead of 5 |
| Extraction | ❌ No | Each signal needs focused extraction |
| Classification | ✅ Yes | "Classify these 3 draft cards" → 1 call instead of 3 |
| Scoring | ❌ No | Each card needs individual rubric reasoning |
| Enrichment | ✅ Yes | "Enrich these 3 cards" → 1 call instead of 3 |

```python
# config.py
BATCH_SIZES = {
    "discovery": 5,       # Filter 5 signals per LLM call
    "classification": 3,  # Classify 3 drafts per call
    "enrichment": 3,      # Enrich 3 cards per call
}
```

**Impact:** Reduces total LLM calls by ~40% for batchable stages.

### 17.5 Development Replay Mode

During development, save every LLM request/response to a local replay file. In replay mode, the pipeline reads from the file instead of calling the API.

```python
# config.py
REPLAY_MODE = os.getenv("REPLAY_MODE", "false").lower() == "true"

# In provider base class:
def generate_structured(self, prompt, response_model, ...):
    if REPLAY_MODE:
        return self.cache.get(prompt, self.model)  # No API call
    # ... normal API call ...
```

**Impact:** After the first successful run, all subsequent development iterations cost $0.00.

### 17.6 Early Dedup (Skip Expensive Stages)

Move dedup check to BEFORE scoring and enrichment:

```
Discovery → Extraction → [DEDUP CHECK] → Scoring → Enrichment → Publish
                              ↓
                    If duplicate found:
                    → increment signalCount on existing card
                    → SKIP scoring & enrichment
                    → save ~60% of tokens for that signal
```

```python
# In pipeline.py, between extraction and scoring:
def _check_duplicate(self, draft: DraftCard) -> ProblemIntelligenceCard | None:
    """Check if this draft matches an existing card. If yes, skip scoring."""
    existing = self.store.find_similar(draft.title, threshold=0.85)
    if existing:
        existing.signal_count += 1
        existing.updated_at = datetime.utcnow()
        self.store.save(existing)
        self.logger.info("duplicate_merged", existing_id=existing.id)
        return existing
    return None  # Not a duplicate, proceed to scoring
```

### 17.7 Cost Tracking Dashboard

Track cumulative cost per pipeline run and per day:

```python
# models/pipeline_context.py (add to existing model)
class CostBreakdown(BaseModel):
    stage: str
    provider: str
    input_tokens: int
    output_tokens: int
    cached: bool = False              # True if served from cache
    estimated_cost_usd: float         # Computed from token counts

# Pricing constants (config.py)
PRICING = {
    "gemini": {"input_per_1m": 0.075, "output_per_1m": 0.30},
    "openai": {"input_per_1m": 0.150, "output_per_1m": 0.60},
}
```

### 17.8 Cost Summary Per Run

Every artifact trail (§10) now includes a cost section:

```json
{
  "cost_summary": {
    "total_input_tokens": 2700,
    "total_output_tokens": 1250,
    "cache_hits": 2,
    "cache_misses": 3,
    "estimated_cost_usd": 0.000567,
    "provider_breakdown": {
      "gemini": { "calls": 4, "cost_usd": 0.000467 },
      "openai": { "calls": 1, "cost_usd": 0.000100 }
    }
  }
}
```

### 17.9 Cost Comparison: Unoptimized vs Optimized

Processing 100 raw signals through the full pipeline:

| Metric | Unoptimized | Optimized | Savings |
|--------|------------|-----------|---------|
| LLM calls | ~500 | ~35 | **93% fewer** |
| Total tokens | ~500K | ~50K | **90% fewer** |
| Gemini Flash cost | ~$0.19 | ~$0.02 | **~$0.17 saved** |
| Fallback (OpenAI) cost | ~$0.05 | ~$0.005 | **~$0.045 saved** |
| **Total per 100 signals** | **~$0.24** | **~$0.025** | **~90% savings** |
| **Monthly (1K signals/day)** | **~$72** | **~$7.50** | **~$64.50/mo saved** |

---

## 18. Cost Awareness Mandate

> **THIS SECTION APPLIES TO ALL FUTURE SPECS (3B, 3C, 3D, Phase 4, Phase 5, Phase 6).**

Every spec from this point forward MUST include:

1. **A "Cost Impact" section** estimating tokens per operation and cost per 100 items.
2. **Pre-LLM gates** — never send data to an LLM if a cheaper check (keyword, regex, hash lookup) can eliminate it first.
3. **Cache-first policy** — check the LLM cache before every API call.
4. **Token budget enforcement** — reject prompts that exceed the stage's max input tokens.
5. **Batch where possible** — always prefer 1 call with N items over N calls with 1 item.
6. **No speculative calls** — never call the LLM "just in case." Every call must have a concrete, validated purpose.
7. **Cost tracking** — every pipeline run logs its total token usage and estimated cost.
8. **Replay mode support** — every agent must work with cached responses for zero-cost development.

**If a spec violates any of these rules, it must be revised before implementation.**

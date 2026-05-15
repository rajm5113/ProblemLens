# Spec 4A: FastAPI Server & REST API

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Phase 3 (Agent Pipeline) ✅
> **Produces:** FastAPI server, REST endpoints, camelCase response serialization, seed data loader, health/stats endpoints

---

## 1. Purpose

Stand up a lightweight FastAPI server that reads from the existing SQLite `CardStore` and serves `ProblemIntelligenceCard` data via JSON REST endpoints. The React frontend (Spec 4B) will consume these endpoints.

**This spec does NOT touch the frontend.** It is a pure backend addition.

---

## 2. Critical: snake_case → camelCase Conversion

The backend Pydantic models use `snake_case` (Python convention):
```python
pain_summary, numeric_id, opportunity_score, signal_count, trend_status
```

The frontend TypeScript schema uses `camelCase` (JS convention):
```typescript
painSummary, numericId, opportunityScore, signalCount, trendStatus
```

**The API MUST serialize responses in camelCase** so the frontend receives data in its expected shape. Pydantic v2 supports this natively:

```python
from pydantic import ConfigDict

class ProblemCardResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,  # from pydantic.alias_generators
    )
```

### Full Field Mapping

| Backend (snake_case) | API Response (camelCase) | Frontend (camelCase) |
|---------------------|------------------------|---------------------|
| `id` | `id` | `id` |
| `numeric_id` | `numericId` | `numericId` |
| `created_at` | `createdAt` | `createdAt` |
| `updated_at` | `updatedAt` | `updatedAt` |
| `title` | `title` | `title` |
| `pain_summary` | `painSummary` | `painSummary` |
| `description` | `description` | `description` |
| `sector` | `sector` | `sector` |
| `user_type` | `userType` | `userType` |
| `geography` | `geography` | `geography` |
| `frequency` | `frequency` | `frequency` |
| `tags` | `tags` | `tags` |
| `pain_points` | `painPoints` | `painPoints` |
| `root_cause` | `rootCause` | `rootCause` |
| `solutions` | `solutions` | `solutions` |
| `source` | `source` | `source` |
| `confidence` | `confidence` | `confidence` |
| `signal_count` | `signalCount` | `signalCount` |
| `opportunity_score` | `opportunityScore` | `opportunityScore` |
| `trend_status` | `trendStatus` | `trendStatus` |

### Nested: ScoreBreakdown → ProblemScores

The backend `ScoreBreakdown` has extra fields (rationale, score_confidence) that the frontend does NOT need. The API response should flatten to only the 4 scores:

| Backend `ScoreBreakdown` | API `scores` object | Frontend `ProblemScores` |
|-------------------------|--------------------|-----------------------|
| `severity` | `severity` | `severity` |
| `market_potential` | `marketPotential` | `marketPotential` |
| `ai_feasibility` | `aiFeasibility` | `aiFeasibility` |
| `competition` | `competition` | `competition` |
| `rationale` | ❌ omitted | — |
| `score_confidence` | ❌ omitted | — |

---

## 3. API Endpoints

### 3.1 Endpoint Overview

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `GET` | `/api/health` | Health check | `{ "status": "ok", "version": "0.1.0" }` |
| `GET` | `/api/problems` | List all cards (with optional filters) | `ProblemCardResponse[]` |
| `GET` | `/api/problems/{id}` | Get single card by PIP ID | `ProblemCardResponse` |
| `GET` | `/api/stats` | Dashboard summary stats | `StatsResponse` |
| `POST` | `/api/pipeline/run` | Trigger a discovery pipeline run | `PipelineRunResponse` |

### 3.2 GET /api/problems

```python
@app.get("/api/problems")
def list_problems(
    sector: str | None = None,
    min_score: int | None = None,
    sort_by: str = "opportunity_score",  # or "created_at", "signal_count"
    order: str = "desc",
    limit: int = 50,
    offset: int = 0,
) -> list[ProblemCardResponse]:
    cards = card_store.all()

    # Filter
    if sector:
        cards = [c for c in cards if c.sector.value == sector]
    if min_score:
        cards = [c for c in cards if c.opportunity_score >= min_score]

    # Sort
    reverse = order == "desc"
    if sort_by == "opportunity_score":
        cards.sort(key=lambda c: c.opportunity_score, reverse=reverse)
    elif sort_by == "created_at":
        cards.sort(key=lambda c: c.created_at, reverse=reverse)
    elif sort_by == "signal_count":
        cards.sort(key=lambda c: c.signal_count, reverse=reverse)

    # Paginate
    return [ProblemCardResponse.from_card(c) for c in cards[offset:offset+limit]]
```

### 3.3 GET /api/problems/{id}

```python
@app.get("/api/problems/{problem_id}")
def get_problem(problem_id: str) -> ProblemCardResponse:
    card = card_store.get(problem_id)
    if not card:
        raise HTTPException(status_code=404, detail=f"Card {problem_id} not found")
    return ProblemCardResponse.from_card(card)
```

### 3.4 GET /api/stats

```python
@app.get("/api/stats")
def get_stats() -> StatsResponse:
    cards = card_store.all()
    return StatsResponse(
        total_problems=len(cards),
        avg_opportunity_score=round(sum(c.opportunity_score for c in cards) / max(len(cards), 1), 1),
        sector_breakdown={s.value: 0 for s in Sector} | Counter(c.sector.value for c in cards),
        top_sectors=_top_sectors(cards, n=5),
        trend_breakdown=Counter(c.trend_status.value for c in cards),
        total_signals=sum(c.signal_count for c in cards),
    )
```

### 3.5 POST /api/pipeline/run

```python
@app.post("/api/pipeline/run")
def trigger_pipeline_run() -> PipelineRunResponse:
    """Trigger a discovery run. For dev/testing only — production uses scheduled runs."""
    pipeline = build_pipeline()
    contexts = pipeline.run_full()
    return PipelineRunResponse(
        run_count=len(contexts),
        new_cards=sum(1 for c in contexts if c.status == "success"),
        duplicates=sum(1 for c in contexts if c.status == "duplicate_merged"),
        errors=sum(1 for c in contexts if c.status == "manual_review"),
    )
```

---

## 4. Response Models

### 4.1 ProblemCardResponse

```python
# api/models.py
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class ProblemScoresResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    severity: int
    market_potential: int
    ai_feasibility: int
    competition: int

class ProblemCardResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    id: str
    numeric_id: int
    created_at: str           # ISO 8601 string
    updated_at: str
    title: str
    pain_summary: str
    description: str | None
    sector: str
    user_type: list[str]
    geography: str
    frequency: str
    tags: list[str]
    pain_points: list[str]
    root_cause: str | None
    solutions: list[str]
    source: str
    confidence: str
    signal_count: int
    scores: ProblemScoresResponse
    opportunity_score: int
    trend_status: str

    @classmethod
    def from_card(cls, card: ProblemIntelligenceCard) -> "ProblemCardResponse":
        return cls(
            id=card.id,
            numeric_id=card.numeric_id,
            created_at=card.created_at.isoformat(),
            updated_at=card.updated_at.isoformat(),
            title=card.title,
            pain_summary=card.pain_summary,
            description=card.description,
            sector=card.sector.value,
            user_type=card.user_type,
            geography=card.geography,
            frequency=card.frequency.value,
            tags=card.tags,
            pain_points=card.pain_points,
            root_cause=card.root_cause,
            solutions=card.solutions,
            source=card.source,
            confidence=card.confidence.value,
            signal_count=card.signal_count,
            scores=ProblemScoresResponse(
                severity=card.scores.severity,
                market_potential=card.scores.market_potential,
                ai_feasibility=card.scores.ai_feasibility,
                competition=card.scores.competition,
            ),
            opportunity_score=card.opportunity_score,
            trend_status=card.trend_status.value,
        )
```

### 4.2 StatsResponse

```python
class StatsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    total_problems: int
    avg_opportunity_score: float
    sector_breakdown: dict[str, int]
    top_sectors: list[dict]          # [{"sector": "Healthcare", "count": 3, "avgScore": 8.2}]
    trend_breakdown: dict[str, int]
    total_signals: int
```

### 4.3 PipelineRunResponse

```python
class PipelineRunResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    run_count: int
    new_cards: int
    duplicates: int
    errors: int
```

---

## 5. CORS Configuration

The React dev server runs on `localhost:5173`. The FastAPI server will run on `localhost:8000`.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Vite dev server
        "http://localhost:3000",     # Alternative dev port
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

---

## 6. Seed Data Loader

For development, load the existing 11 seed cards into the SQLite database on first startup so the API has data to serve immediately:

```python
# api/seed.py
def seed_if_empty(store: CardStore) -> int:
    """Load seed cards if the store is empty. Returns count of cards seeded."""
    if store.all():
        return 0  # Already has data

    seed_cards = load_seed_cards()  # Read from a seed JSON file
    for card in seed_cards:
        store.save(card)
    return len(seed_cards)
```

The seed data comes from the existing `app/src/app/data/problems.ts` — converted to JSON format matching the backend `ProblemIntelligenceCard` schema.

---

## 7. Project Structure

```
backend/
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── models.py             # Response models (camelCase)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── problems.py       # GET /api/problems, GET /api/problems/{id}
│   │   ├── stats.py          # GET /api/stats
│   │   └── pipeline.py       # POST /api/pipeline/run
│   └── seed.py               # Seed data loader
├── requirements.txt          # Add: fastapi, uvicorn[standard]
```

---

## 8. Server Entry Point

```python
# api/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from store.card_store import CardStore
from config import STORE_DIR
from api.seed import seed_if_empty

card_store = CardStore(STORE_DIR / "cards.db")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed data if empty
    count = seed_if_empty(card_store)
    if count:
        print(f"Seeded {count} cards")
    yield
    # Shutdown: close DB
    card_store.conn.close()

app = FastAPI(
    title="ProblemLens API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(CORSMiddleware, ...)

# Routes
from api.routes import problems, stats, pipeline
app.include_router(problems.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
```

### Run command:

```bash
backend\.venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000
```

---

## 9. Dependencies

Add to `requirements.txt`:

```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
```

---

## 10. Error Handling

```python
# api/main.py
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

# In route handlers, use:
raise HTTPException(status_code=404, detail="Card PIP-999 not found")
raise HTTPException(status_code=400, detail="Invalid sector filter")
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

| Test | What It Validates |
|------|------------------|
| `test_health_returns_ok` | GET /api/health → 200 `{"status": "ok"}` |
| `test_list_problems_returns_cards` | GET /api/problems → 200, array of cards |
| `test_list_problems_empty_store` | Empty store → 200, empty array |
| `test_get_problem_by_id` | GET /api/problems/PIP-001 → 200, correct card |
| `test_get_problem_not_found` | GET /api/problems/PIP-999 → 404 |
| `test_stats_returns_summary` | GET /api/stats → 200, correct counts |
| `test_response_uses_camel_case` | Response keys are camelCase, not snake_case |
| `test_scores_omit_rationale` | Response `scores` has 4 fields only, no rationale |
| `test_filter_by_sector` | `?sector=Healthcare` → only Healthcare cards |
| `test_filter_by_min_score` | `?min_score=8` → only high-scoring cards |
| `test_sort_by_signal_count` | `?sort_by=signal_count&order=desc` → correctly sorted |
| `test_pagination` | `?limit=5&offset=5` → correct slice |

### 11.2 Integration Test

| Test | What It Validates |
|------|------------------|
| `test_seed_loads_on_empty_startup` | Start server with empty DB → seed data loaded |
| `test_seed_skips_if_data_exists` | Start server with existing data → no duplication |
| `test_from_card_maps_all_fields` | `ProblemCardResponse.from_card()` maps every field correctly |

Use `TestClient` from FastAPI (no need for a running server):

```python
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
```

---

## 12. File Deliverables

| File | Action |
|------|--------|
| `api/__init__.py` | **Create** |
| `api/main.py` | **Create** — FastAPI app, CORS, lifespan |
| `api/models.py` | **Create** — camelCase response models |
| `api/seed.py` | **Create** — seed data loader |
| `api/routes/__init__.py` | **Create** |
| `api/routes/problems.py` | **Create** — list + get endpoints |
| `api/routes/stats.py` | **Create** — dashboard stats |
| `api/routes/pipeline.py` | **Create** — manual pipeline trigger |
| `api/seed_data/cards.json` | **Create** — 11 seed cards in backend schema |
| `requirements.txt` | **Update** — add fastapi, uvicorn |
| `tests/test_api/` | **Create** — API test suite |
| `tests/test_api/test_problems.py` | **Create** |
| `tests/test_api/test_stats.py` | **Create** |
| `tests/test_api/test_models.py` | **Create** — camelCase mapping tests |

---

## 13. Exit Conditions

- [ ] `GET /api/health` returns `{"status": "ok"}`
- [ ] `GET /api/problems` returns all cards in **camelCase** JSON
- [ ] `GET /api/problems/PIP-001` returns a single card
- [ ] `GET /api/problems/PIP-999` returns 404
- [ ] `GET /api/stats` returns sector breakdown, trend counts, totals
- [ ] Response `scores` object has exactly 4 fields (no rationale, no score_confidence)
- [ ] All response keys are camelCase (verified by test)
- [ ] CORS allows `localhost:5173` origin
- [ ] Filtering by sector and min_score works
- [ ] Sorting by opportunity_score, created_at, signal_count works
- [ ] Pagination with limit/offset works
- [ ] Seed data loads on first startup
- [ ] All tests pass via `pytest`
- [ ] Server starts with `uvicorn api.main:app --reload --port 8000`

---

## 14. What This Spec Does NOT Cover

| Topic | Covered In |
|-------|-----------|
| Frontend fetch integration | Spec 4B |
| Live pipeline with real API keys | Spec 4C |
| Scheduled pipeline runs (cron) | Spec 4C |
| Trend status computation | Spec 4C |
| Authentication / API keys | Phase 5 (if needed) |
| Production deployment | Phase 6 |

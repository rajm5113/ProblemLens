# Spec 6B: Backend Hardening & Security

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 6A (Frontend Polish) ✅
> **Zero frontend changes** — all work is backend-only
> **Verification:** `python -m pytest` (all pass) + manual curl tests

---

## 1. Purpose

The backend works. It serves data, runs the pipeline, and handles errors at a basic level. But it isn't ready for a production deploy:

1. **No rate limiting** — A bot or misconfigured frontend polling loop can hammer `/api/stats` or worse, trigger `/api/pipeline/run` dozens of times per minute. Each pipeline run burns Gemini API credits.
2. **CORS is dev-only** — The origin allowlist is hardcoded to `localhost:5173` and `localhost:3000`. A deployed frontend at `https://problemlens.vercel.app` would be CORS-blocked.
3. **No request logging** — When something goes wrong in production, there's no structured trace of which endpoint was called, how long it took, or what error it threw. `structlog` exists but is only wired to the pipeline, not the API layer.
4. **Exception handler leaks internals** — The generic `500` handler returns `str(exc)`, which can expose file paths, SQL errors, or provider secrets to the client.
5. **Pipeline endpoint is unprotected** — `POST /api/pipeline/run` triggers a full discovery cycle. Anyone with the URL can spam it. It needs an API key gate.
6. **Health endpoint is minimal** — `/api/health` returns `{"status": "ok"}` but doesn't report database connectivity, store size, or scheduler state — the things you actually check when triaging an outage.
7. **No input sanitization** — Query parameters are validated by FastAPI/Pydantic, but the `problem_id` path parameter accepts any string and is passed directly to a SQL query (parameterized, so not injectable, but still worth defensive validation).

---

## 2. Rate Limiting

### 2.1 Strategy

Use **`slowapi`** — the standard rate-limiting library for FastAPI. It wraps `limits` and integrates as ASGI middleware.

**Why slowapi?**
- FastAPI-native, well-maintained
- Supports in-memory (default) and Redis backends
- Per-endpoint and global limits
- No additional infrastructure for dev/single-server deployments

### 2.2 Installation

Add to `requirements.txt`:

```
slowapi>=0.1.9
```

### 2.3 Implementation

**`backend/api/rate_limit.py`** — new module:

```python
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

**`backend/api/main.py`** — integrate the limiter:

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from api.rate_limit import limiter

# After app creation:
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 2.4 Per-Endpoint Limits

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `GET /api/problems` | 60/minute | Normal browsing + polling |
| `GET /api/problems/{id}` | 60/minute | DeepDive + share link opens |
| `GET /api/stats` | 30/minute | Frontend polls every 5 min; 30/min is generous |
| `GET /api/pipeline/runs` | 30/minute | Analytics activity feed |
| `GET /api/pipeline/stats` | 30/minute | Dashboard stats |
| `POST /api/pipeline/run` | **2/hour** | Expensive (Gemini API calls). Admin only. |
| `GET /api/health` | 120/minute | Health checks should be fast and frequent |

Apply via decorator on each route:

```python
# Example: stats.py
from api.rate_limit import limiter

@router.get("/stats", response_model=StatsResponse)
@limiter.limit("30/minute")
def get_stats(request: Request, store: CardStore = Depends(get_card_store)) -> StatsResponse:
    return StatsResponse.from_cards(store.all())
```

> **Note:** `slowapi` requires the `request: Request` parameter in the function signature. Add it where missing.

### 2.5 Rate Limit Headers

`slowapi` automatically adds `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers to responses. No additional configuration needed.

### 2.6 Response on Limit Exceeded

Returns `429 Too Many Requests` with body:

```json
{
  "error": "Rate limit exceeded",
  "detail": "2 per 1 hour"
}
```

---

## 3. CORS Production Configuration

### 3.1 The Problem

Current CORS:

```python
allow_origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
```

This blocks any deployed frontend.

### 3.2 Solution: Environment-Driven Origins

**`backend/config.py`** — add:

```python
# Comma-separated list of allowed CORS origins
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:4174,http://127.0.0.1:4174"
    ).split(",")
    if origin.strip()
]
```

**`backend/api/main.py`** — use the config:

```python
from config import CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

**`backend/.env.example`** — add:

```
# === CORS ===
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

For production deploy, the `.env` would contain:

```
CORS_ORIGINS=https://problemlens.vercel.app,http://localhost:5173
```

---

## 4. Structured Request Logging Middleware

### 4.1 Purpose

Every API request should produce a structured log entry with: method, path, status code, duration, and client IP. This is the first thing you grep for when debugging production issues.

### 4.2 Implementation

**`backend/api/middleware.py`** — new module:

```python
from __future__ import annotations

import time
from typing import Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("api.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            logger.error(
                "request_error",
                method=request.method,
                path=str(request.url.path),
                client_ip=client_ip,
                duration_ms=duration_ms,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        log_fn = logger.warning if response.status_code >= 400 else logger.info
        log_fn(
            "request_completed",
            method=request.method,
            path=str(request.url.path),
            status=response.status_code,
            duration_ms=duration_ms,
            client_ip=client_ip,
        )
        return response
```

**`backend/api/main.py`** — add middleware (order matters — logging wraps everything):

```python
from api.middleware import RequestLoggingMiddleware

# Add BEFORE CORSMiddleware so it wraps the full request lifecycle:
app.add_middleware(RequestLoggingMiddleware)
# Then CORS, rate limiting, etc.
```

### 4.3 Log Output Example

```json
{
  "event": "request_completed",
  "method": "GET",
  "path": "/api/stats",
  "status": 200,
  "duration_ms": 12.4,
  "client_ip": "127.0.0.1",
  "timestamp": "2026-05-13T03:30:00Z",
  "level": "info"
}
```

### 4.4 Logging Configuration Update

The current `configure_logging()` in `config.py` only writes to `pipeline.log`. We need API logs to go to a separate file:

**`backend/config.py`** — update `configure_logging()`:

```python
def configure_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # Pipeline log (existing)
    pipeline_file = (LOG_DIR / "pipeline.log").open("a", encoding="utf-8")

    # Configure structlog with shared processors
    logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.WriteLoggerFactory(file=pipeline_file),
        cache_logger_on_first_use=True,
    )
```

> **Note:** `structlog.get_logger("api.access")` uses the same global config. In a future iteration, separate log files per logger name can be configured. For now, all structured logs go to `pipeline.log`, which is acceptable for a single-server deployment.

---

## 5. Secure Error Handling

### 5.1 The Problem

The current exception handler:

```python
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )
```

`str(exc)` can leak:
- File paths: `FileNotFoundError: /home/deploy/backend/store/cards.db`
- SQL details: `sqlite3.OperationalError: database is locked`
- API keys: some provider exceptions include request headers

### 5.2 Solution

Log the full exception server-side, return a sanitized message to the client:

```python
import structlog
import traceback

_error_logger = structlog.get_logger("api.errors")

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log full trace server-side
    _error_logger.error(
        "unhandled_exception",
        method=request.method,
        path=str(request.url.path),
        error_type=type(exc).__name__,
        error_detail=str(exc),
        traceback=traceback.format_exc(),
    )

    # Return sanitized response to client
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": "An unexpected error occurred. Please try again later.",
        },
    )
```

---

## 6. Pipeline Endpoint API Key Protection

### 6.1 Purpose

`POST /api/pipeline/run` triggers an expensive discovery cycle that calls the Gemini API many times. It must be protected from unauthorized access.

### 6.2 Configuration

**`backend/config.py`** — add:

```python
PIPELINE_API_KEY = os.getenv("PIPELINE_API_KEY", "")
```

**`backend/.env.example`** — add:

```
# === API SECURITY ===
# Required for POST /api/pipeline/run
PIPELINE_API_KEY=your-secret-pipeline-key-here
```

### 6.3 Dependency Guard

**`backend/api/dependencies.py`** — add the auth dependency:

```python
from fastapi import HTTPException, Header
from config import PIPELINE_API_KEY

def require_pipeline_key(x_api_key: str = Header(..., alias="X-API-Key")) -> None:
    """Guard for admin-only endpoints that trigger expensive pipeline operations."""
    if not PIPELINE_API_KEY:
        # If no key is configured, allow access (dev mode)
        return
    if x_api_key != PIPELINE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
```

### 6.4 Apply to Pipeline Run

**`backend/api/routes/pipeline.py`**:

```python
from api.dependencies import require_pipeline_key

@router.post("/pipeline/run", response_model=PipelineRunResponse)
def trigger_pipeline_run(
    store: CardStore = Depends(get_card_store),
    _auth: None = Depends(require_pipeline_key),
) -> PipelineRunResponse:
    # ... existing implementation unchanged
```

### 6.5 Behavior

| Scenario | Result |
|----------|--------|
| `PIPELINE_API_KEY` not set in `.env` | Open access (dev mode — no friction for local development) |
| `PIPELINE_API_KEY=mykey`, request has `X-API-Key: mykey` header | ✅ Access granted |
| `PIPELINE_API_KEY=mykey`, request missing header or wrong key | ❌ 403 Forbidden |

### 6.6 Scheduler Bypass

The background scheduler calls `build_pipeline()` directly — it doesn't go through the HTTP endpoint, so the API key gate doesn't affect scheduled runs.

---

## 7. Enhanced Health Endpoint

### 7.1 Current State

```python
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
```

This tells you nothing about whether the database is accessible, how many cards exist, or if the scheduler is running.

### 7.2 Enhanced Implementation

```python
@app.get("/api/health")
@limiter.limit("120/minute")
def health(request: Request) -> dict[str, object]:
    store: CardStore | None = getattr(request.app.state, "card_store", None)
    scheduler_running = getattr(request.app.state, "scheduler_started", False)

    db_ok = False
    card_count = 0
    if store:
        try:
            card_count = len(store.all())
            db_ok = True
        except Exception:
            db_ok = False

    overall = "ok" if db_ok else "degraded"

    return {
        "status": overall,
        "version": "0.1.0",
        "checks": {
            "database": "connected" if db_ok else "unreachable",
            "cardCount": card_count,
            "scheduler": "running" if scheduler_running else "stopped",
        },
    }
```

### 7.3 Response Examples

**Healthy:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "checks": {
    "database": "connected",
    "cardCount": 42,
    "scheduler": "running"
  }
}
```

**Degraded (database issue):**
```json
{
  "status": "degraded",
  "version": "0.1.0",
  "checks": {
    "database": "unreachable",
    "cardCount": 0,
    "scheduler": "running"
  }
}
```

---

## 8. Input Validation Hardening

### 8.1 Problem ID Validation

The `problem_id` path parameter accepts any string. While the SQL query is parameterized (safe from injection), we should validate the format defensively.

ProblemLens IDs follow the pattern `PIP-NNN`. Add a validation layer:

**`backend/api/routes/problems.py`** — update `get_problem`:

```python
import re

PIP_ID_PATTERN = re.compile(r"^PIP-\d{3,6}$")

@router.get("/problems/{problem_id}", response_model=ProblemCardResponse)
@limiter.limit("60/minute")
def get_problem(
    request: Request,
    problem_id: str,
    store: CardStore = Depends(get_card_store),
) -> ProblemCardResponse:
    if not PIP_ID_PATTERN.match(problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem ID format")
    card = store.get(problem_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Card {problem_id} not found")
    return ProblemCardResponse.from_card(card)
```

### 8.2 Query Parameter Bounds

FastAPI already validates `Query(ge=1, le=10)` for `min_score`, and `Query(ge=1, le=100)` for `limit`. This is sufficient — no additional work needed.

### 8.3 Sort/Order Validation

Already handled with `ALLOWED_SORTS` and `ALLOWED_ORDERS` sets. ✅

---

## 9. Security Headers Middleware

### 9.1 Purpose

Add standard security headers to all API responses to harden against common web attacks.

### 9.2 Implementation

**`backend/api/middleware.py`** — add a second middleware class:

```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Cache API responses for 0 seconds (force revalidation)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return response
```

**`backend/api/main.py`**:

```python
from api.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
# ... then CORS
```

---

## 10. File Deliverables

| File | Action |
|------|--------|
| `backend/requirements.txt` | **Update** — add `slowapi>=0.1.9` |
| `backend/config.py` | **Update** — add `CORS_ORIGINS`, `PIPELINE_API_KEY` |
| `backend/.env.example` | **Update** — add `CORS_ORIGINS`, `PIPELINE_API_KEY` |
| `backend/api/rate_limit.py` | **Create** — limiter singleton |
| `backend/api/middleware.py` | **Create** — `RequestLoggingMiddleware` + `SecurityHeadersMiddleware` |
| `backend/api/main.py` | **Update** — wire rate limiter, middleware, CORS from config, secure error handler, enhanced health |
| `backend/api/dependencies.py` | **Update** — add `require_pipeline_key` |
| `backend/api/routes/problems.py` | **Update** — add rate limits, `PIP_ID_PATTERN` validation, `Request` param |
| `backend/api/routes/stats.py` | **Update** — add rate limit, `Request` param |
| `backend/api/routes/pipeline.py` | **Update** — add rate limits, `require_pipeline_key` dependency, `Request` param |
| `backend/tests/test_api/test_rate_limit.py` | **Create** — rate limit tests |
| `backend/tests/test_api/test_security.py` | **Create** — API key auth + security header tests |

---

## 11. Testing Strategy

### 11.1 Existing Tests Must Pass

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest
```

All 88+ existing tests must continue to pass. The changes are additive — no existing route signatures break.

### 11.2 New Tests: Rate Limiting

**`backend/tests/test_api/test_rate_limit.py`**:

```python
def test_stats_returns_rate_limit_headers(client):
    response = client.get("/api/stats")
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers

def test_health_rate_limit_headers(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
```

### 11.3 New Tests: Pipeline API Key

**`backend/tests/test_api/test_security.py`**:

```python
import os
from unittest.mock import patch

def test_pipeline_run_blocked_without_key(client):
    """When PIPELINE_API_KEY is set, requests without the header are rejected."""
    with patch.dict(os.environ, {"PIPELINE_API_KEY": "test-secret-key"}):
        response = client.post("/api/pipeline/run")
        assert response.status_code in (403, 422)  # 403 forbidden or 422 missing header

def test_pipeline_run_allowed_with_correct_key(client):
    """When PIPELINE_API_KEY is set, requests with the correct header pass auth."""
    with patch.dict(os.environ, {"PIPELINE_API_KEY": "test-secret-key"}):
        response = client.post(
            "/api/pipeline/run",
            headers={"X-API-Key": "test-secret-key"},
        )
        # Should pass auth (may fail for other reasons like missing pipeline deps)
        assert response.status_code != 403

def test_pipeline_run_open_when_no_key_configured(client):
    """When PIPELINE_API_KEY is empty, dev mode allows open access."""
    with patch.dict(os.environ, {"PIPELINE_API_KEY": ""}):
        response = client.post("/api/pipeline/run")
        # Should not be 403 (auth passes, may fail downstream)
        assert response.status_code != 403
```

### 11.4 New Tests: Security Headers

```python
def test_security_headers_present(client):
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "no-store" in response.headers.get("Cache-Control", "")

def test_error_handler_sanitized(client):
    """The generic error handler should not leak internal details."""
    response = client.get("/api/problems/INVALID-FORMAT-XYZ")
    assert response.status_code == 400
    body = response.json()
    assert "traceback" not in str(body).lower()
    assert "file" not in str(body).lower()
```

### 11.5 New Tests: Health Endpoint

```python
def test_health_returns_checks(client):
    response = client.get("/api/health")
    data = response.json()
    assert data["status"] == "ok"
    assert "checks" in data
    assert data["checks"]["database"] == "connected"
    assert isinstance(data["checks"]["cardCount"], int)
```

### 11.6 New Tests: Problem ID Validation

```python
def test_invalid_problem_id_format(client):
    response = client.get("/api/problems/'; DROP TABLE cards; --")
    assert response.status_code == 400
    assert "Invalid problem ID format" in response.json()["detail"]

def test_valid_problem_id_not_found(client):
    response = client.get("/api/problems/PIP-999")
    assert response.status_code == 404
```

### 11.7 Manual Verification

After implementation, verify with curl:

```bash
# Health check (enhanced)
curl -s http://localhost:8000/api/health | python -m json.tool

# Rate limit headers visible
curl -I http://localhost:8000/api/stats

# Security headers visible
curl -I http://localhost:8000/api/health

# Pipeline run blocked without key (when PIPELINE_API_KEY is set)
curl -X POST http://localhost:8000/api/pipeline/run
# Expected: 403 Forbidden

# Pipeline run with key
curl -X POST http://localhost:8000/api/pipeline/run -H "X-API-Key: your-key"
# Expected: 200 (or pipeline-specific response)
```

---

## 12. Exit Conditions

- [ ] `python -m pytest` — all existing 88+ tests pass, new tests pass
- [ ] `slowapi` installed and limiter active on all endpoints
- [ ] `GET /api/stats` returns `X-RateLimit-*` headers
- [ ] `POST /api/pipeline/run` returns `403` when `PIPELINE_API_KEY` is set and header is missing
- [ ] `POST /api/pipeline/run` succeeds when correct `X-API-Key` header is provided
- [ ] `POST /api/pipeline/run` has open access when `PIPELINE_API_KEY` is unset (dev mode)
- [ ] CORS origins loaded from `CORS_ORIGINS` env var
- [ ] `GET /api/health` returns `checks.database`, `checks.cardCount`, `checks.scheduler`
- [ ] Generic exception handler returns sanitized message (no `str(exc)`)
- [ ] Full exception details logged server-side in `pipeline.log`
- [ ] All API responses include `X-Content-Type-Options: nosniff`
- [ ] All API responses include `X-Frame-Options: DENY`
- [ ] All API responses include `Cache-Control: no-store`
- [ ] `GET /api/problems/INVALID` returns `400` (not `404` or `500`)
- [ ] `GET /api/problems/PIP-999` returns `404` (valid format, not found)
- [ ] Every request produces a structured log entry with method, path, status, duration_ms

---

## 13. What This Doesn't Include (Deferred to 6C)

| Item | Phase |
|------|-------|
| Dockerization | 6C |
| CI/CD pipeline (GitHub Actions) | 6C |
| Cloud deployment (Render + Vercel) | 6C |
| Redis-backed rate limiting (multi-instance) | Post-6C |
| JWT/OAuth user authentication | Post-6C |
| Request body size limits | Post-6C |

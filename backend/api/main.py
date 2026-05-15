from __future__ import annotations

import traceback
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from api.rate_limit import limiter
from api.routes import pipeline, problems, stats
from api.seed import seed_if_empty
from config import CORS_ORIGINS, ENABLE_SCHEDULER, STORE_DIR
from scheduler import start_scheduler
from store.card_store import CardStore

_error_logger = structlog.get_logger("api.errors")


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = getattr(app.state, "card_store", None)
    if store is None:
        store = CardStore(STORE_DIR / "cards.db")
        app.state.card_store = store
    count = seed_if_empty(store)
    if count:
        print(f"Seeded {count} cards")
    if ENABLE_SCHEDULER and not getattr(app.state, "scheduler_started", False):
        app.state.scheduler_thread = start_scheduler()
        app.state.scheduler_started = True
    yield
    store.conn.close()


app = FastAPI(title="ProblemLens API", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(problems.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")


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

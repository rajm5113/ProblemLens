from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, Query, Request

from api.dependencies import get_card_store, require_pipeline_key
from api.models import PipelineRunResponse
from api.rate_limit import limiter
from config import RUNS_DIR
from pipeline_factory import build_pipeline
from store.card_store import CardStore
from store.signal_store import SignalStore

router = APIRouter(tags=["pipeline"])


@router.post("/pipeline/run", response_model=PipelineRunResponse)
@limiter.limit("2/hour")
def trigger_pipeline_run(
    request: Request,
    store: CardStore = Depends(get_card_store),
    _auth: None = Depends(require_pipeline_key),
) -> PipelineRunResponse:
    pipeline = build_pipeline(card_store=store)
    contexts = pipeline.run_full()
    return PipelineRunResponse(
        run_count=len(contexts),
        new_cards=sum(1 for ctx in contexts if ctx.status == "success"),
        duplicates=sum(1 for ctx in contexts if ctx.status == "duplicate_merged"),
        errors=sum(1 for ctx in contexts if ctx.status == "manual_review"),
    )


@router.get("/pipeline/runs")
@limiter.limit("30/minute")
def get_pipeline_runs(request: Request, limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, object]]:
    if not RUNS_DIR.exists():
        return []

    run_files = sorted(
        RUNS_DIR.glob("*.json"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )[:limit]
    summaries: list[dict[str, object]] = []
    for run_file in run_files:
        try:
            data = json.loads(run_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        summaries.append(
            {
                "runId": data.get("run_id", run_file.stem),
                "stage": data.get("current_stage", "unknown"),
                "status": data.get("status", "unknown"),
                "startedAt": data.get("started_at"),
                "completedAt": data.get("completed_at"),
                "signalCount": len(data.get("discovery_signals", [])),
                "hasCard": data.get("final_card") is not None,
            }
        )
    return summaries


@router.get("/pipeline/stats")
@limiter.limit("30/minute")
def get_pipeline_stats(request: Request, store: CardStore = Depends(get_card_store)) -> dict[str, object]:
    total_runs = len(list(RUNS_DIR.glob("*.json"))) if RUNS_DIR.exists() else 0
    return {
        "totalRuns": total_runs,
        "totalSignals": len(SignalStore().get_all()),
        "totalCards": len(store.all()),
        "lastRunAt": _get_last_run_time(RUNS_DIR),
    }


def _get_last_run_time(runs_dir: Path) -> str | None:
    if not runs_dir.exists():
        return None
    files = sorted(runs_dir.glob("*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not files:
        return None
    try:
        data = json.loads(files[0].read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data.get("completed_at")

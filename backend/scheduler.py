from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta, timezone

import schedule

from config import DISCOVERY_INTERVAL_HOURS, RUNS_DIR
from pipeline_factory import build_pipeline
from store.card_store import CardStore
from trends import update_trends

logger = logging.getLogger(__name__)


def _run_discovery_job() -> None:
    logger.info("Scheduled discovery starting")
    try:
        pipeline = build_pipeline()
        results = pipeline.run_full()
        success = sum(1 for ctx in results if ctx.status == "success")
        duplicates = sum(1 for ctx in results if ctx.status == "duplicate_merged")
        errors = sum(1 for ctx in results if ctx.status == "manual_review")
        logger.info(
            "Scheduled discovery done: %s new, %s merged, %s errors",
            success,
            duplicates,
            errors,
        )
    except Exception as exc:
        logger.error("Scheduled discovery failed: %s", exc)


def _run_trends_job() -> None:
    try:
        updated = update_trends(CardStore())
        logger.info("Trends updated: %s cards changed", updated)
    except Exception as exc:
        logger.error("Trend update failed: %s", exc)


def _run_cleanup_job() -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    removed = 0
    for run_file in RUNS_DIR.glob("*.json"):
        try:
            mtime = datetime.fromtimestamp(run_file.stat().st_mtime, tz=timezone.utc)
            if mtime < cutoff:
                run_file.unlink()
                removed += 1
        except OSError:
            continue
    if removed:
        logger.info("Cleanup: removed %s old run artifacts", removed)
    return removed


def start_scheduler() -> threading.Thread:
    schedule.every(DISCOVERY_INTERVAL_HOURS).hours.do(_run_discovery_job)
    schedule.every(24).hours.do(_run_trends_job)
    schedule.every(24).hours.do(_run_cleanup_job)

    def _loop() -> None:
        while True:
            schedule.run_pending()
            time.sleep(60)

    thread = threading.Thread(target=_loop, daemon=True, name="scheduler")
    thread.start()
    logger.info(
        "Background scheduler started (discovery every %sh, trends every 24h)",
        DISCOVERY_INTERVAL_HOURS,
    )
    return thread

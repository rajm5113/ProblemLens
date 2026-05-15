from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import structlog

from agents.base import BaseAgent
from config import RUNS_DIR
from models.pipeline_context import PipelineContext
from models.raw_signal import RawSignal
from store.card_store import CardStore


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Pipeline:
    def __init__(
        self,
        agents: list[BaseAgent] | None = None,
        discovery_agent: BaseAgent | None = None,
        store: CardStore | None = None,
        runs_dir: str | Path = RUNS_DIR,
    ):
        self.agents = agents or []
        self.discovery_agent = discovery_agent
        self.store = store or CardStore()
        self.runs_dir = Path(runs_dir)
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        self.logger = structlog.get_logger(component="pipeline")

    def run_discovery(self) -> list[RawSignal]:
        if self.discovery_agent is None:
            return []

        ctx = PipelineContext(
            run_id=str(uuid4()),
            signal_id="discovery-batch",
            started_at=utc_now(),
            current_stage="discovery",
        )
        ctx = self.discovery_agent.run(ctx)
        validation = self.discovery_agent.validate(ctx)
        if not validation.valid:
            ctx.validation_errors = validation.errors
            ctx = self.discovery_agent._retry_or_fallback(ctx)
        ctx.completed_at = utc_now()
        self._save_run_artifact(ctx)
        return ctx.discovery_signals

    def run_full(self) -> list[PipelineContext]:
        return [self.process_signal(signal) for signal in self.run_discovery()]

    def process_signal(self, signal: RawSignal) -> PipelineContext:
        ctx = PipelineContext(
            run_id=str(uuid4()),
            signal_id=signal.signal_id,
            started_at=utc_now(),
            current_stage="init",
            raw_signal=signal,
        )

        for agent in self.agents:
            ctx.current_stage = agent.__class__.__name__
            self.logger.info("stage_start", stage=ctx.current_stage, run_id=ctx.run_id)

            ctx = agent.run(ctx)
            validation = agent.validate(ctx)

            if not validation.valid:
                ctx.validation_errors = validation.errors
                ctx = agent._retry_or_fallback(ctx)
                if ctx.status == "manual_review":
                    ctx.completed_at = utc_now()
                    self._save_run_artifact(ctx)
                    return ctx

            if ctx.status == "duplicate_merged":
                ctx.completed_at = utc_now()
                self._save_run_artifact(ctx)
                return ctx

            self.logger.info("stage_complete", stage=ctx.current_stage, run_id=ctx.run_id)

        ctx.status = "success"
        ctx.completed_at = utc_now()
        if ctx.final_card is not None:
            self.store.save(ctx.final_card)
        self._save_run_artifact(ctx)
        return ctx

    def _save_run_artifact(self, ctx: PipelineContext) -> Path:
        path = self.runs_dir / f"{ctx.run_id}.json"
        path.write_text(ctx.model_dump_json(indent=2), encoding="utf-8")
        return path

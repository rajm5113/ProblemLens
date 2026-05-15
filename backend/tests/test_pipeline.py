from __future__ import annotations

from pathlib import Path

from pipeline import Pipeline
from store.card_store import CardStore


def test_pipeline_instantiates_with_empty_agent_list(tmp_path: Path) -> None:
    pipeline = Pipeline(agents=[], store=CardStore(tmp_path / "cards.db"), runs_dir=tmp_path / "runs")

    assert pipeline.agents == []


def test_pipeline_context_serializes_to_artifact(tmp_path: Path, raw_signal) -> None:
    pipeline = Pipeline(agents=[], store=CardStore(tmp_path / "cards.db"), runs_dir=tmp_path / "runs")

    ctx = pipeline.process_signal(raw_signal)
    restored = type(ctx).model_validate_json((tmp_path / "runs" / f"{ctx.run_id}.json").read_text())

    assert ctx.status == "success"
    assert restored.run_id == ctx.run_id
    assert restored.raw_signal is not None

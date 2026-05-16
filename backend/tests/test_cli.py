from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import run_pipeline
from models.enums import TrendStatus
from store.card_store import CardStore
from store.signal_store import SignalStore


def test_status_command(monkeypatch, tmp_path: Path, capsys, problem_card) -> None:
    card_store = CardStore(tmp_path / "cards.db")
    card_store.save(problem_card)
    signal_store = SignalStore(tmp_path / "signals.jsonl")

    monkeypatch.setattr(run_pipeline, "get_card_store", lambda seed=True: card_store)
    monkeypatch.setattr(run_pipeline, "SignalStore", lambda: signal_store)

    run_pipeline.main(["status"])

    output = capsys.readouterr().out
    assert "Cards:   1" in output
    assert "Signals: 0" in output
    assert "Avg opp:" in output


def test_trends_command(monkeypatch, tmp_path: Path, capsys, problem_card) -> None:
    now = datetime.now(timezone.utc)
    card = problem_card.model_copy(
        deep=True,
        update={
            "created_at": now - timedelta(days=30),
            "updated_at": now - timedelta(days=15),
            "trend_status": TrendStatus.STABLE,
        },
    )
    card_store = CardStore(tmp_path / "cards.db")
    card_store.save(card)

    monkeypatch.setattr(run_pipeline, "get_card_store", lambda seed=True: card_store)

    run_pipeline.main(["trends"])

    output = capsys.readouterr().out
    assert "Updated trend status on 1 cards" in output
    assert card_store.get(card.id).trend_status == TrendStatus.DECLINING


def test_full_command_missing_key_prints_clear_error(monkeypatch, capsys) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    try:
        run_pipeline.main(["full"])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("full command should exit when GEMINI_API_KEY is missing")

    captured = capsys.readouterr()
    assert "MISSING: GEMINI_API_KEY" in captured.err
    assert "Traceback" not in captured.err

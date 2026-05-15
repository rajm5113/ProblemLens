from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from config import require_env, validate_env
from models.enums import TrendStatus
from pipeline_factory import build_pipeline
from store.card_store import CardStore
from store.signal_store import SignalStore
from trends import update_trends


def save_card(
    store: CardStore,
    problem_card,
    *,
    created_days_ago: int,
    updated_days_ago: int,
    signal_count: int,
    status: TrendStatus,
) -> str:
    now = datetime.now(timezone.utc)
    card = problem_card.model_copy(
        deep=True,
        update={
            "id": f"PIP-{problem_card.numeric_id:03d}",
            "created_at": now - timedelta(days=created_days_ago),
            "updated_at": now - timedelta(days=updated_days_ago),
            "signal_count": signal_count,
            "trend_status": status,
        },
    )
    store.save(card)
    return card.id


def test_new_card_stays_new(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    card_id = save_card(
        store,
        problem_card,
        created_days_ago=2,
        updated_days_ago=2,
        signal_count=1,
        status=TrendStatus.NEW,
    )

    assert update_trends(store) == 0
    assert store.get(card_id).trend_status == TrendStatus.NEW


def test_rising_card(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    card_id = save_card(
        store,
        problem_card,
        created_days_ago=10,
        updated_days_ago=3,
        signal_count=5,
        status=TrendStatus.STABLE,
    )

    assert update_trends(store) == 1
    assert store.get(card_id).trend_status == TrendStatus.RISING


def test_stable_card(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    card_id = save_card(
        store,
        problem_card,
        created_days_ago=20,
        updated_days_ago=10,
        signal_count=2,
        status=TrendStatus.RISING,
    )

    assert update_trends(store) == 1
    assert store.get(card_id).trend_status == TrendStatus.STABLE


def test_declining_card(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    card_id = save_card(
        store,
        problem_card,
        created_days_ago=30,
        updated_days_ago=15,
        signal_count=2,
        status=TrendStatus.STABLE,
    )

    assert update_trends(store) == 1
    assert store.get(card_id).trend_status == TrendStatus.DECLINING


def test_validate_env_missing(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    assert validate_env("gemini") is False


def test_require_env_raises(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    try:
        require_env("gemini")
    except OSError as exc:
        assert "MISSING: GEMINI_API_KEY" in str(exc)
        assert "backend/.env" in str(exc)
    else:
        raise AssertionError("require_env should raise when GEMINI_API_KEY is missing")


def test_build_pipeline_no_key(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    try:
        build_pipeline(
            card_store=CardStore(tmp_path / "cards.db"),
            signal_store=SignalStore(tmp_path / "signals.jsonl"),
        )
    except OSError as exc:
        assert "MISSING: GEMINI_API_KEY" in str(exc)
    else:
        raise AssertionError("build_pipeline should require GEMINI_API_KEY")

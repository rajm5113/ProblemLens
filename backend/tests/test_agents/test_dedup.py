from __future__ import annotations

from pathlib import Path

from agents.dedup import DedupAgent
from models.pipeline_context import PipelineContext
from store.card_store import CardStore
from tests.conftest import problem_card as problem_card_fixture
from tests.test_agents.test_classification import FakeClassificationProvider, make_classification_context


def make_dedup_context():
    classification = FakeClassificationProvider()
    from agents.classification import ClassificationAgent

    agent = ClassificationAgent(primary=classification)
    return agent.run(make_classification_context())


def test_dedup_finds_similar_title(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    similar = problem_card.model_copy(
        update={"title": "Rural patient data reporting breaks when ASHA workers rely on paper records"}
    )
    store.save(similar)
    agent = DedupAgent(primary=FakeClassificationProvider(), card_store=store)

    existing = agent._find_duplicate(make_dedup_context().draft_card)

    assert existing is not None
    assert existing.id == problem_card.id


def test_dedup_allows_different_title(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    store.save(problem_card)
    ctx = make_dedup_context()
    ctx.draft_card = ctx.draft_card.model_copy(update={"title": "Students miss deadlines across scattered LMS platforms"})
    agent = DedupAgent(primary=FakeClassificationProvider(), card_store=store)

    assert agent._find_duplicate(ctx.draft_card) is None


def test_dedup_increments_signal_count(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    similar = problem_card.model_copy(
        update={"title": "Rural patient data reporting breaks when ASHA workers rely on paper records"}
    )
    store.save(similar)
    agent = DedupAgent(primary=FakeClassificationProvider(), card_store=store)

    ctx = agent.run(make_dedup_context())

    assert ctx.status == "duplicate_merged"
    assert ctx.final_card.signal_count == similar.signal_count + 1
    assert store.get(similar.id).signal_count == similar.signal_count + 1


def test_card_id_sequential(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    assert store.next_id() == "PIP-012"
    store.save(problem_card)
    assert store.next_id() == "PIP-003"

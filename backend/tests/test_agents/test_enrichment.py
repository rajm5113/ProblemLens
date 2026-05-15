from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel

from agents.classification import ClassificationAgent
from agents.dedup import DedupAgent
from agents.enrichment import EnrichmentAgent
from agents.scoring import ScoringAgent
from models.enrichment_result import EnrichmentResult
from models.enums import Confidence
from pipeline import Pipeline
from providers.base import BaseLLMProvider, LLMResponse
from store.card_store import CardStore
from tests.test_agents.test_classification import FakeClassificationProvider, make_classification_context
from tests.test_agents.test_extraction import FakeExtractionProvider, make_context
from tests.test_agents.test_scoring import FakeScoringProvider, make_scoring_context
from agents.extraction import ExtractionAgent
from utils.llm_cache import LLMCache


class FakeEnrichmentProvider(BaseLLMProvider):
    provider = "fake"
    model = "fake-enrichment"

    def __init__(self):
        self.calls = 0

    def generate_structured(self, prompt: str, response_model: type[BaseModel], temperature: float = 0.2, timeout_seconds: int = 30):
        self.calls += 1
        return response_model.model_validate(
            {
                "root_cause": "Frontline health workflows still depend on fragile paper records because digital tools are not designed for offline field use.",
                "description": "ASHA workers collect critical field data in environments where connectivity and device access are unreliable. When records stay on paper, PHC teams receive delayed updates and public health response weakens.",
                "refined_solutions": [
                    "Offline-first mobile records with voice entry for ASHA workers.",
                    "Automatic PHC summaries that sync when connectivity returns.",
                ],
            }
        )

    def generate_text(self, prompt: str, temperature: float = 0.2, timeout_seconds: int = 30) -> LLMResponse:
        return LLMResponse(content="ok", model=self.model, provider=self.provider, input_tokens=1, output_tokens=1, latency_ms=1)


def test_enrichment_result_valid() -> None:
    result = EnrichmentResult(
        root_cause="Paper-first workflows persist because field tools are not offline ready.",
        description="A deeper description.",
        refined_solutions=["Offline records.", "Voice summaries."],
    )
    assert result.root_cause is not None


def test_enrichment_null_fields_ok() -> None:
    result = EnrichmentResult(root_cause=None, description=None, refined_solutions=None)
    assert result.refined_solutions is None


def test_tag_computation_deterministic(tmp_path: Path) -> None:
    store = CardStore(tmp_path / "cards.db")
    ctx = ScoringAgent(primary=FakeScoringProvider(), cache=LLMCache(tmp_path / "score.db")).run(make_scoring_context())
    agent = EnrichmentAgent(primary=FakeEnrichmentProvider(), card_store=store, cache=LLMCache(tmp_path / "enrich.db"))
    ctx = agent.run(ctx)
    assert ctx.final_card.tags == [ctx.draft_card.user_type[0], ctx.draft_card.geography, ctx.draft_card.frequency.value]


def test_enrichment_from_scored(tmp_path: Path) -> None:
    store = CardStore(tmp_path / "cards.db")
    ctx = ScoringAgent(primary=FakeScoringProvider(), cache=LLMCache(tmp_path / "score.db")).run(make_scoring_context())
    agent = EnrichmentAgent(primary=FakeEnrichmentProvider(), card_store=store, cache=LLMCache(tmp_path / "enrich.db"))
    ctx = agent.run(ctx)
    assert agent.validate(ctx).valid
    assert ctx.final_card.id == "PIP-012"
    assert ctx.final_card.opportunity_score == 8


def test_full_pipeline_new_card(tmp_path: Path) -> None:
    store = CardStore(tmp_path / "cards.db")
    agents = [
        ExtractionAgent(primary=FakeExtractionProvider(), cache=LLMCache(tmp_path / "extract.db")),
        ClassificationAgent(primary=FakeClassificationProvider(), cache=LLMCache(tmp_path / "classify.db")),
        DedupAgent(primary=FakeClassificationProvider(), card_store=store),
        ScoringAgent(primary=FakeScoringProvider(), cache=LLMCache(tmp_path / "score.db")),
        EnrichmentAgent(primary=FakeEnrichmentProvider(), card_store=store, cache=LLMCache(tmp_path / "enrich.db")),
    ]
    pipeline = Pipeline(agents=agents, store=store, runs_dir=tmp_path / "runs")
    ctx = pipeline.process_signal(make_context().raw_signal)
    assert ctx.status == "success"
    assert ctx.final_card is not None
    assert store.get(ctx.final_card.id) is not None


def test_full_pipeline_duplicate(tmp_path: Path, problem_card) -> None:
    store = CardStore(tmp_path / "cards.db")
    existing = problem_card.model_copy(update={"title": "Rural patient data reporting breaks when ASHA workers rely on paper records"})
    store.save(existing)
    scoring = ScoringAgent(primary=FakeScoringProvider(), cache=LLMCache(tmp_path / "score.db"))
    enrichment = EnrichmentAgent(primary=FakeEnrichmentProvider(), card_store=store, cache=LLMCache(tmp_path / "enrich.db"))
    pipeline = Pipeline(
        agents=[
            ExtractionAgent(primary=FakeExtractionProvider(), cache=LLMCache(tmp_path / "extract.db")),
            ClassificationAgent(primary=FakeClassificationProvider(), cache=LLMCache(tmp_path / "classify.db")),
            DedupAgent(primary=FakeClassificationProvider(), card_store=store),
            scoring,
            enrichment,
        ],
        store=store,
        runs_dir=tmp_path / "runs",
    )
    ctx = pipeline.process_signal(make_context().raw_signal)
    assert ctx.status == "duplicate_merged"
    assert scoring.primary.calls == 0
    assert enrichment.primary.calls == 0

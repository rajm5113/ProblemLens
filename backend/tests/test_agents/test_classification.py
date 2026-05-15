from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

from agents.classification import ClassificationAgent
from agents.extraction import ExtractionAgent
from models.classification_result import ClassificationResult
from models.draft_card import DraftCard
from models.enums import Confidence, Frequency, Sector
from models.extracted_fields import ExtractedFields
from models.pipeline_context import PipelineContext
from providers.base import BaseLLMProvider, LLMResponse
from tests.test_agents.test_extraction import FakeExtractionProvider, make_context
from utils.llm_cache import LLMCache


def make_extracted_fields() -> ExtractedFields:
    return ExtractedFields.model_validate(json.loads(Path("tests/golden/expected_extracted_fields.json").read_text())[0])


def test_classification_result_valid() -> None:
    result = ClassificationResult(
        sector=Sector.HEALTHCARE,
        user_type=["ASHA Workers", "Rural Patients"],
        geography="India",
        frequency=Frequency.VERY_HIGH,
        confidence=Confidence.HIGH,
    )

    assert result.sector == Sector.HEALTHCARE


def test_classification_rejects_bad_sector() -> None:
    with pytest.raises(ValidationError):
        ClassificationResult.model_validate(
            {
                "sector": "SpaceTech",
                "user_type": ["Founders"],
                "geography": "India",
                "frequency": "High",
                "confidence": "Medium",
            }
        )


def test_classification_rejects_bad_frequency() -> None:
    with pytest.raises(ValidationError):
        ClassificationResult.model_validate(
            {
                "sector": "Healthcare",
                "user_type": ["ASHA Workers"],
                "geography": "India",
                "frequency": "Sometimes",
                "confidence": "High",
            }
        )


class FakeClassificationProvider(BaseLLMProvider):
    provider = "fake"
    model = "fake-classification"

    def __init__(self, first_bad_sector: bool = False):
        self.calls = 0
        self.first_bad_sector = first_bad_sector

    def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ):
        self.calls += 1
        payload = json.loads(Path("tests/golden/expected_draft_cards.json").read_text())[0]
        classification = {
            "sector": payload["sector"],
            "user_type": payload["user_type"],
            "geography": payload["geography"],
            "frequency": payload["frequency"],
            "confidence": payload["confidence"],
        }
        if self.first_bad_sector and self.calls == 1:
            classification["sector"] = "SpaceTech"
        return response_model.model_validate(classification)

    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        return LLMResponse(content="ok", model=self.model, provider=self.provider, input_tokens=1, output_tokens=1, latency_ms=1)


def make_classification_context() -> PipelineContext:
    fields = make_extracted_fields()
    return PipelineContext(
        run_id="run-classification",
        signal_id=fields.signal_id,
        started_at=datetime.now(timezone.utc),
        current_stage="classification",
        extracted_fields=fields,
    )


def test_draft_card_merges_correctly(tmp_path: Path) -> None:
    agent = ClassificationAgent(primary=FakeClassificationProvider(), cache=LLMCache(tmp_path / "cache.db"))

    ctx = agent.run(make_classification_context())

    assert isinstance(ctx.draft_card, DraftCard)
    assert ctx.draft_card.sector == Sector.HEALTHCARE
    assert ctx.draft_card.title.startswith("Rural patient data")


def test_classification_from_extracted(tmp_path: Path) -> None:
    agent = ClassificationAgent(primary=FakeClassificationProvider(), cache=LLMCache(tmp_path / "cache.db"))

    ctx = agent.run(make_classification_context())
    validation = agent.validate(ctx)

    assert validation.valid
    assert ctx.draft_card is not None
    assert ctx.draft_card.user_type == ["ASHA Workers", "Rural Patients"]


def test_classification_retry_on_bad_sector(tmp_path: Path) -> None:
    provider = FakeClassificationProvider(first_bad_sector=True)
    agent = ClassificationAgent(primary=provider, cache=LLMCache(tmp_path / "cache.db"))

    ctx = agent.run(make_classification_context())
    validation = agent.validate(ctx)
    assert not validation.valid
    ctx.validation_errors = validation.errors
    repaired = agent._retry_or_fallback(ctx)

    assert provider.calls == 2
    assert agent.validate(repaired).valid


def test_classification_cache_second_run(tmp_path: Path) -> None:
    provider = FakeClassificationProvider()
    agent = ClassificationAgent(primary=provider, cache=LLMCache(tmp_path / "cache.db"))

    first = agent.run(make_classification_context())
    second = agent.run(make_classification_context())

    assert first.draft_card == second.draft_card
    assert provider.calls == 1


def test_full_extraction_classification_pipeline(tmp_path: Path) -> None:
    extraction = ExtractionAgent(primary=FakeExtractionProvider(), cache=LLMCache(tmp_path / "extract.db"))
    classification = ClassificationAgent(primary=FakeClassificationProvider(), cache=LLMCache(tmp_path / "classify.db"))

    ctx = extraction.run(make_context())
    assert extraction.validate(ctx).valid
    ctx = classification.run(ctx)

    assert classification.validate(ctx).valid
    assert ctx.draft_card is not None
    assert ctx.draft_card.confidence == Confidence.HIGH

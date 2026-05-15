from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

from agents.extraction import ExtractionAgent
from models.draft_card import DraftCard
from models.enums import Confidence, Frequency, Sector
from models.extracted_fields import ExtractedFields
from models.pipeline_context import PipelineContext
from models.raw_signal import RawSignal, SourceMetadata
from providers.base import BaseLLMProvider, LLMResponse
from utils.llm_cache import LLMCache


def test_draft_card_model_accepts_extraction_output() -> None:
    draft = DraftCard(
        signal_id="sig-001",
        title="Students miss deadlines across scattered LMS platforms",
        pain_summary="No unified task view makes students miss assignments and lose grades.",
        sector=Sector.EDUCATION,
        user_type=["College Students"],
        geography="India",
        frequency=Frequency.HIGH,
        pain_points=["Deadlines are scattered.", "Students miss important assignments."],
        solutions=["LMS deadline aggregator.", "AI priority reminders."],
        source="Reddit",
        confidence=Confidence.MEDIUM,
        extraction_confidence=0.8,
    )

    assert draft.sector == Sector.EDUCATION


def test_extracted_fields_valid() -> None:
    fields = ExtractedFields.model_validate(json.loads(Path("tests/golden/expected_extracted_fields.json").read_text())[0])

    assert fields.signal_id == "sig-asha"
    assert len(fields.pain_points) == 2


def test_extracted_fields_rejects_short_title() -> None:
    payload = json.loads(Path("tests/golden/expected_extracted_fields.json").read_text())[0]
    payload["title"] = "Bad"

    with pytest.raises(ValidationError):
        ExtractedFields.model_validate(payload)


def test_extracted_fields_rejects_one_pain_point() -> None:
    payload = json.loads(Path("tests/golden/expected_extracted_fields.json").read_text())[0]
    payload["pain_points"] = ["Only one pain point."]

    with pytest.raises(ValidationError):
        ExtractedFields.model_validate(payload)


class FakeExtractionProvider(BaseLLMProvider):
    provider = "fake"
    model = "fake-extraction"

    def __init__(self, first_short_title: bool = False):
        self.calls = 0
        self.first_short_title = first_short_title

    def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ):
        self.calls += 1
        payload = json.loads(Path("tests/golden/expected_extracted_fields.json").read_text())[0]
        if self.first_short_title and self.calls == 1:
            payload["title"] = "Bad"
        return response_model.model_validate(payload)

    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        return LLMResponse(content="ok", model=self.model, provider=self.provider, input_tokens=1, output_tokens=1, latency_ms=1)


def make_raw_signal() -> RawSignal:
    payload = json.loads(Path("tests/golden/mock_extraction_input.json").read_text())[0]
    return RawSignal(
        signal_id=payload["signal_id"],
        source=SourceMetadata(
            url=payload["url"],
            platform=payload["platform"],
            raw_text=payload["raw_text"],
        ),
        fingerprint="fp-asha",
        is_relevant=True,
        relevance_confidence=0.9,
    )


def make_context() -> PipelineContext:
    signal = make_raw_signal()
    return PipelineContext(
        run_id="run-extraction",
        signal_id=signal.signal_id,
        started_at=signal.created_at,
        current_stage="extraction",
        raw_signal=signal,
    )


def test_extraction_from_raw_signal(tmp_path: Path) -> None:
    provider = FakeExtractionProvider()
    agent = ExtractionAgent(primary=provider, cache=LLMCache(tmp_path / "cache.db"))

    ctx = agent.run(make_context())
    validation = agent.validate(ctx)

    assert validation.valid
    assert ctx.extracted_fields is not None
    assert ctx.extracted_fields.signal_id == "sig-asha"


def test_extraction_retry_on_short_title(tmp_path: Path) -> None:
    provider = FakeExtractionProvider(first_short_title=True)
    agent = ExtractionAgent(primary=provider, cache=LLMCache(tmp_path / "cache.db"))

    ctx = agent.run(make_context())
    validation = agent.validate(ctx)
    assert not validation.valid
    ctx.validation_errors = validation.errors
    repaired = agent._retry_or_fallback(ctx)

    assert provider.calls == 2
    assert repaired.status == "in_progress"
    assert agent.validate(repaired).valid


def test_extraction_cache_second_run(tmp_path: Path) -> None:
    provider = FakeExtractionProvider()
    agent = ExtractionAgent(primary=provider, cache=LLMCache(tmp_path / "cache.db"))

    first = agent.run(make_context())
    second = agent.run(make_context())

    assert first.extracted_fields == second.extracted_fields
    assert provider.calls == 1

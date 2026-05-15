from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import BaseModel, ValidationError

from agents.scoring import ScoringAgent
from models.score_breakdown import ScoreBreakdown
from providers.base import BaseLLMProvider, LLMResponse
from tests.test_agents.test_classification import make_classification_context, FakeClassificationProvider
from agents.classification import ClassificationAgent
from utils.llm_cache import LLMCache


def test_score_fixture_is_valid(score_breakdown: ScoreBreakdown) -> None:
    assert score_breakdown.severity == 9
    assert score_breakdown.score_confidence == 0.85


class FakeScoringProvider(BaseLLMProvider):
    provider = "fake"
    model = "fake-scoring"

    def __init__(self, first_bad_score: bool = False, short_rationale: bool = False):
        self.calls = 0
        self.first_bad_score = first_bad_score
        self.short_rationale = short_rationale

    def generate_structured(self, prompt: str, response_model: type[BaseModel], temperature: float = 0.2, timeout_seconds: int = 30):
        self.calls += 1
        payload = json.loads(Path("tests/golden/expected_score_breakdowns.json").read_text())[0]
        if self.first_bad_score and self.calls == 1:
            payload["severity"] = 15
        if self.short_rationale:
            payload["rationale"]["severity_reason"] = "x"
        return response_model.model_validate(payload)

    def generate_text(self, prompt: str, temperature: float = 0.2, timeout_seconds: int = 30) -> LLMResponse:
        return LLMResponse(content="ok", model=self.model, provider=self.provider, input_tokens=1, output_tokens=1, latency_ms=1)


def make_scoring_context():
    return ClassificationAgent(primary=FakeClassificationProvider()).run(make_classification_context())


def test_scoring_valid_breakdown() -> None:
    payload = json.loads(Path("tests/golden/expected_score_breakdowns.json").read_text())[0]
    breakdown = ScoreBreakdown.model_validate(payload)
    assert breakdown.severity == 9


def test_scoring_rejects_score_11() -> None:
    payload = json.loads(Path("tests/golden/expected_score_breakdowns.json").read_text())[0]
    payload["severity"] = 11
    with pytest.raises(ValidationError):
        ScoreBreakdown.model_validate(payload)


def test_scoring_requires_rationale(tmp_path: Path) -> None:
    agent = ScoringAgent(primary=FakeScoringProvider(short_rationale=True), cache=LLMCache(tmp_path / "cache.db"))
    ctx = agent.run(make_scoring_context())
    validation = agent.validate(ctx)
    assert not validation.valid
    assert "rationale.severity_reason is too short" in validation.errors


def test_scoring_from_draft(tmp_path: Path) -> None:
    agent = ScoringAgent(primary=FakeScoringProvider(), cache=LLMCache(tmp_path / "cache.db"))
    ctx = agent.run(make_scoring_context())
    assert agent.validate(ctx).valid
    assert ctx.computed_opportunity_score == 8


def test_scoring_retry_on_bad_score(tmp_path: Path) -> None:
    provider = FakeScoringProvider(first_bad_score=True)
    agent = ScoringAgent(primary=provider, cache=LLMCache(tmp_path / "cache.db"))
    ctx = agent.run(make_scoring_context())
    assert not agent.validate(ctx).valid
    ctx = agent._retry_or_fallback(ctx)
    assert provider.calls == 2
    assert agent.validate(ctx).valid

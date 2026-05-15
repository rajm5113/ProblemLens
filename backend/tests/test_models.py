from __future__ import annotations

import pytest
from pydantic import ValidationError

from models.enums import Sector
from models.problem_card import ProblemIntelligenceCard
from models.score_breakdown import ScoreBreakdown


def test_problem_card_accepts_valid_data(problem_card: ProblemIntelligenceCard) -> None:
    assert problem_card.id == "PIP-002"
    assert problem_card.sector == Sector.HEALTHCARE
    assert problem_card.tags == ["ASHA Workers", "India", "Very High"]


def test_problem_card_rejects_bad_sector(problem_card: ProblemIntelligenceCard) -> None:
    payload = problem_card.model_dump(mode="json")
    payload["sector"] = "Biotech"

    with pytest.raises(ValidationError):
        ProblemIntelligenceCard.model_validate(payload)


def test_problem_card_rejects_noncomputed_tags(problem_card: ProblemIntelligenceCard) -> None:
    payload = problem_card.model_dump(mode="json")
    payload["tags"] = ["Rural Patients", "India", "Very High"]

    with pytest.raises(ValidationError, match="tags must equal"):
        ProblemIntelligenceCard.model_validate(payload)


def test_score_breakdown_rejects_out_of_range_score(score_breakdown: ScoreBreakdown) -> None:
    payload = score_breakdown.model_dump()
    payload["severity"] = 11

    with pytest.raises(ValidationError):
        ScoreBreakdown.model_validate(payload)

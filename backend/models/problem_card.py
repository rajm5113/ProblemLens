from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from .enums import Confidence, Frequency, Sector, TrendStatus
from .score_breakdown import ScoreBreakdown


class ProblemIntelligenceCard(BaseModel):
    id: str = Field(pattern=r"^PIP-\d{3}$")
    numeric_id: int = Field(ge=1)
    created_at: datetime
    updated_at: datetime
    title: str = Field(min_length=10, max_length=200)
    pain_summary: str = Field(min_length=20, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    sector: Sector
    user_type: list[str] = Field(min_length=1, max_length=5)
    geography: str = Field(default="India", min_length=1, max_length=100)
    frequency: Frequency
    tags: list[str] = Field(min_length=3, max_length=3)
    pain_points: list[str] = Field(min_length=2, max_length=5)
    root_cause: str | None = Field(default=None, max_length=500)
    solutions: list[str] = Field(min_length=2, max_length=5)
    source: str = Field(min_length=1, max_length=200)
    confidence: Confidence
    signal_count: int = Field(default=1, ge=1)
    scores: ScoreBreakdown
    opportunity_score: int = Field(ge=1, le=10)
    trend_status: TrendStatus = TrendStatus.NEW

    @model_validator(mode="after")
    def tags_match_computed_rule(self) -> "ProblemIntelligenceCard":
        expected = [self.user_type[0], self.geography, self.frequency.value]
        if self.tags != expected:
            raise ValueError("tags must equal [user_type[0], geography, frequency]")
        return self

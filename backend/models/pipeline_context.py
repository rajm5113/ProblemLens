from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from .draft_card import DraftCard
from .extracted_fields import ExtractedFields
from .problem_card import ProblemIntelligenceCard
from .raw_signal import RawSignal
from .score_breakdown import ScoreBreakdown


class CostBreakdown(BaseModel):
    stage: str
    provider: str
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    cached: bool = False
    estimated_cost_usd: float = Field(ge=0)


class PipelineContext(BaseModel):
    run_id: str
    signal_id: str
    started_at: datetime
    current_stage: str
    raw_signal: RawSignal | None = None
    discovery_signals: list[RawSignal] = Field(default_factory=list)
    extracted_fields: ExtractedFields | None = None
    draft_card: DraftCard | None = None
    score_breakdown: ScoreBreakdown | None = None
    computed_opportunity_score: int | None = Field(default=None, ge=1, le=10)
    final_card: ProblemIntelligenceCard | None = None
    validation_errors: list[str] = Field(default_factory=list)
    retry_count: int = 0
    provider_used: str = "gemini"
    fallback_triggered: bool = False
    status: str = "in_progress"
    completed_at: datetime | None = None
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    costs: list[CostBreakdown] = Field(default_factory=list)

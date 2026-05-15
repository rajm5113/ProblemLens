from pydantic import BaseModel, Field


class ScoreRationale(BaseModel):
    severity_reason: str = Field(min_length=1, max_length=500)
    market_potential_reason: str = Field(min_length=1, max_length=500)
    ai_feasibility_reason: str = Field(min_length=1, max_length=500)
    competition_reason: str = Field(min_length=1, max_length=500)


class ScoreBreakdown(BaseModel):
    severity: int = Field(ge=1, le=10)
    market_potential: int = Field(ge=1, le=10)
    ai_feasibility: int = Field(ge=1, le=10)
    competition: int = Field(ge=1, le=10)
    rationale: ScoreRationale
    score_confidence: float = Field(ge=0.0, le=1.0)

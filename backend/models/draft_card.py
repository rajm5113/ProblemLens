from pydantic import BaseModel, Field

from .enums import Confidence, Frequency, Sector


class DraftCard(BaseModel):
    signal_id: str
    title: str = Field(min_length=10, max_length=200)
    pain_summary: str = Field(min_length=20, max_length=300)
    sector: Sector
    user_type: list[str] = Field(min_length=1, max_length=5)
    geography: str = Field(default="India", min_length=1, max_length=100)
    frequency: Frequency
    pain_points: list[str] = Field(min_length=2, max_length=5)
    solutions: list[str] = Field(min_length=2, max_length=5)
    source: str = Field(min_length=1, max_length=200)
    confidence: Confidence
    extraction_confidence: float = Field(ge=0.0, le=1.0)

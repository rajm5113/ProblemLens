from pydantic import BaseModel, Field

from .enums import Confidence, Frequency, Sector


class ClassificationResult(BaseModel):
    sector: Sector
    user_type: list[str] = Field(min_length=1, max_length=5)
    geography: str = Field(default="India", min_length=1, max_length=100)
    frequency: Frequency
    confidence: Confidence

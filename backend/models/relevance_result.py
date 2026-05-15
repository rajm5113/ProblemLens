from pydantic import BaseModel, Field


class RelevanceItem(BaseModel):
    index: int = Field(ge=0)
    is_relevant: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str = Field(min_length=1, max_length=200)


class RelevanceBatchResult(BaseModel):
    items: list[RelevanceItem] = Field(min_length=1)

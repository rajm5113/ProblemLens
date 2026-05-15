from pydantic import BaseModel, Field


class EnrichmentResult(BaseModel):
    root_cause: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    refined_solutions: list[str] | None = Field(default=None, min_length=2, max_length=5)

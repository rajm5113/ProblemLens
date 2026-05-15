from pydantic import BaseModel, Field


class ExtractedFields(BaseModel):
    """Output of ExtractionAgent. Raw structured fields, not yet classified."""

    signal_id: str
    title: str = Field(min_length=10, max_length=200)
    pain_summary: str = Field(min_length=20, max_length=300)
    pain_points: list[str] = Field(min_length=2, max_length=5)
    solutions: list[str] = Field(min_length=2, max_length=5)
    source_label: str = Field(min_length=1, max_length=200)
    extraction_confidence: float = Field(ge=0.0, le=1.0)

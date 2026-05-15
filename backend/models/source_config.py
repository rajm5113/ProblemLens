from pydantic import BaseModel, Field

from .enums import SourcePlatform


class SourceConfig(BaseModel):
    platform: SourcePlatform
    name: str = Field(min_length=1)
    url: str = Field(min_length=1)
    max_items: int = Field(default=25, ge=1, le=100)
    enabled: bool = True

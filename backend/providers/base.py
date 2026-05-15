from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel):
    content: str
    model: str
    provider: str
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    latency_ms: float = Field(ge=0)


class BaseLLMProvider(ABC):
    model: str
    provider: str

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> T:
        """Send prompt, enforce structured output, return parsed Pydantic model."""

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        """Send prompt, return raw text response."""

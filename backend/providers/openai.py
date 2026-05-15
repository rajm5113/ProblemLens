from __future__ import annotations

import time
import os
from typing import TypeVar

from pydantic import BaseModel

from config import require_env
from .base import BaseLLMProvider, LLMResponse

T = TypeVar("T", bound=BaseModel)


class OpenAIProvider(BaseLLMProvider):
    provider = "openai"

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o-mini"):
        if api_key is None:
            require_env("openai")
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self._client = None

    @property
    def client(self):
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> T:
        completion = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format=response_model,
            temperature=temperature,
            timeout=timeout_seconds,
        )
        parsed = completion.choices[0].message.parsed
        if parsed is None:
            raise ValueError("OpenAI returned no parsed structured response")
        return parsed

    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        started = time.perf_counter()
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            timeout=timeout_seconds,
        )
        usage = completion.usage
        return LLMResponse(
            content=completion.choices[0].message.content or "",
            model=self.model,
            provider=self.provider,
            input_tokens=int(getattr(usage, "prompt_tokens", 0) or 0),
            output_tokens=int(getattr(usage, "completion_tokens", 0) or 0),
            latency_ms=(time.perf_counter() - started) * 1000,
        )

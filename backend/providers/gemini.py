from __future__ import annotations

import logging
import os
import time
from typing import TypeVar

from pydantic import BaseModel

from config import require_env, GEMINI_FALLBACK_MODEL
from utils.rate_limiter import TokenBucket, GEMINI_FREE_TIER
from .base import BaseLLMProvider, LLMResponse

T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger(__name__)

# Shared rate limiter: 15 requests per minute = 0.25 per second
_gemini_bucket = TokenBucket(
    capacity=GEMINI_FREE_TIER["requests_per_minute"],
    refill_per_second=GEMINI_FREE_TIER["requests_per_minute"] / 60.0,
)

MAX_RETRIES = 3
BACKOFF_SECONDS = [10, 30, 60]  # shorter waits — quota is per-day not per-minute


def _is_fallback_error(exc: Exception) -> bool:
    """Return True for errors that should trigger a retry or model fallback.
    Includes 429 (Quota), 503 (Service Unavailable/High Demand), and 'unavailable' strings.
    """
    s = str(exc).lower()
    # 429 = Quota, 503 = Service Unavailable (High Demand)
    return any(err in s for err in ["429", "503", "resource_exhausted", "quota", "unavailable"])


class GeminiProvider(BaseLLMProvider):
    provider = "gemini"

    def __init__(self, api_key: str | None = None, model: str | None = None):
        if api_key is None:
            require_env("gemini")
        from config import GEMINI_MODEL
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.primary_model = model or GEMINI_MODEL
        self.fallback_model = GEMINI_FALLBACK_MODEL
        # Active model starts as primary; switches on quota exhaustion
        self.model = self.primary_model
        self._client = None

    @property
    def client(self):
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _wait_for_rate_limit(self) -> None:
        """Block until the rate limiter allows a request."""
        while not _gemini_bucket.allow():
            logger.info("Rate limit: waiting 4s before next Gemini call")
            time.sleep(4)

    def _call_with_retry(self, call_fn, label: str = "gemini"):
        """Execute call_fn with retry + model-level fallback on 429.

        Strategy:
          - Try primary model up to MAX_RETRIES times.
          - If all retries hit quota errors, switch to fallback model and
            try once more before raising.
        """
        last_exc: Exception | None = None

        for attempt in range(MAX_RETRIES):
            self._wait_for_rate_limit()
            try:
                return call_fn(self.model)
            except Exception as exc:
                if _is_fallback_error(exc):
                    if self.model != self.fallback_model:
                        wait = BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)]
                        logger.warning(
                            f"{label}: quota hit on '{self.model}' "
                            f"(attempt {attempt + 1}/{MAX_RETRIES}), waiting {wait}s"
                        )
                        time.sleep(wait)
                        last_exc = exc
                        continue
                    else:
                        # Already on fallback — nothing more to try
                        raise
                raise  # non-quota error → propagate immediately

        # Primary model exhausted all retries → switch to fallback
        if self.model != self.fallback_model:
            logger.warning(
                f"{label}: primary model '{self.primary_model}' quota exhausted. "
                f"Switching to fallback '{self.fallback_model}'."
            )
            self.model = self.fallback_model
            self._wait_for_rate_limit()
            try:
                return call_fn(self.model)
            except Exception as exc:
                logger.error(f"{label}: fallback model '{self.fallback_model}' also failed: {exc}")
                raise

        raise last_exc  # type: ignore[misc]

    def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> T:
        _ = timeout_seconds

        def _call(model: str):
            return self.client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "temperature": temperature,
                    "response_mime_type": "application/json",
                    "response_schema": response_model,
                },
            )

        response = self._call_with_retry(_call, "generate_structured")
        text = response.text or "{}"
        return response_model.model_validate_json(text)

    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.2,
        timeout_seconds: int = 30,
    ) -> LLMResponse:
        _ = timeout_seconds
        started = time.perf_counter()

        def _call(model: str):
            return self.client.models.generate_content(
                model=model,
                contents=prompt,
                config={"temperature": temperature},
            )

        response = self._call_with_retry(_call, "generate_text")
        usage = getattr(response, "usage_metadata", None)
        input_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
        output_tokens = int(getattr(usage, "candidates_token_count", 0) or 0)
        return LLMResponse(
            content=response.text or "",
            model=self.model,          # reflects actual model used (primary or fallback)
            provider=self.provider,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=(time.perf_counter() - started) * 1000,
        )

from __future__ import annotations

from config import PRICING
from models.pipeline_context import CostBreakdown


def estimate_cost(provider: str, input_tokens: int, output_tokens: int) -> float:
    pricing = PRICING[provider]
    return (
        input_tokens / 1_000_000 * pricing["input_per_1m"]
        + output_tokens / 1_000_000 * pricing["output_per_1m"]
    )


def make_cost_breakdown(
    stage: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    cached: bool = False,
) -> CostBreakdown:
    return CostBreakdown(
        stage=stage,
        provider=provider,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cached=cached,
        estimated_cost_usd=0.0 if cached else estimate_cost(provider, input_tokens, output_tokens),
    )

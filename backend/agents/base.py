from __future__ import annotations

from abc import ABC, abstractmethod

import structlog

from models.pipeline_context import PipelineContext
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider


class BaseAgent(ABC):
    def __init__(self, primary: BaseLLMProvider, fallback: BaseLLMProvider | None = None):
        self.primary = primary
        self.fallback = fallback
        self.logger = structlog.get_logger(agent=self.__class__.__name__)

    @abstractmethod
    def run(self, ctx: PipelineContext) -> PipelineContext:
        """Process one item through this stage and return an updated context."""

    @abstractmethod
    def validate(self, ctx: PipelineContext) -> ValidationResult:
        """Validate this agent's output against its stage schema."""

    def _retry_or_fallback(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.retry_count < 1:
            ctx.retry_count += 1
            result = self.run(ctx)
            validation = self.validate(result)
            if validation.valid:
                return result
            ctx.validation_errors = validation.errors

        if self.fallback:
            ctx.provider_used = self.fallback.provider
            ctx.fallback_triggered = True
            self.logger.warning("primary_failed_using_fallback", stage=ctx.current_stage)
            original = self.primary
            self.primary = self.fallback
            try:
                result = self.run(ctx)
            finally:
                self.primary = original
            validation = self.validate(result)
            if validation.valid:
                return result
            ctx.validation_errors = validation.errors

        ctx.status = "manual_review"
        self.logger.error("moved_to_manual_review", errors=ctx.validation_errors)
        return ctx

from __future__ import annotations

from config import STORE_DIR
from models.extracted_fields import ExtractedFields
from models.pipeline_context import PipelineContext
from models.raw_signal import RawSignal
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
from utils.llm_cache import LLMCache
from .base import BaseAgent


class ExtractionAgent(BaseAgent):
    """
    Takes a RawSignal and extracts structured problem fields.
    Classification and scoring are intentionally handled by later agents.
    """

    def __init__(
        self,
        primary: BaseLLMProvider,
        fallback: BaseLLMProvider | None = None,
        cache: LLMCache | None = None,
    ):
        super().__init__(primary, fallback)
        self.cache = cache or LLMCache(STORE_DIR / "llm_cache.db")

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.raw_signal is None:
            ctx.validation_errors = ["No raw signal"]
            return ctx

        prompt = self._build_prompt(ctx.raw_signal)
        try:
            result = self._generate_with_cache(prompt)
        except Exception as exc:
            ctx.validation_errors = [str(exc)]
            ctx.current_stage = "extraction"
            return ctx
        if result.signal_id != ctx.raw_signal.signal_id:
            result = result.model_copy(update={"signal_id": ctx.raw_signal.signal_id})

        ctx.extracted_fields = result
        ctx.current_stage = "extraction"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        fields = ctx.extracted_fields
        if fields is None:
            return ValidationResult(valid=False, errors=["No extracted fields"], stage="extraction")

        errors: list[str] = []
        if len(fields.title.strip()) < 10:
            errors.append("title too short")
        if len(fields.pain_points) < 2:
            errors.append(f"need 2-5 pain_points, got {len(fields.pain_points)}")
        if len(fields.solutions) < 2:
            errors.append(f"need 2-5 solutions, got {len(fields.solutions)}")
        if fields.extraction_confidence < 0.3:
            errors.append(f"extraction_confidence too low: {fields.extraction_confidence}")
        return ValidationResult(valid=len(errors) == 0, errors=errors, stage="extraction")

    def _retry_or_fallback(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.raw_signal is None:
            ctx.status = "manual_review"
            ctx.validation_errors = ["No raw signal"]
            return ctx

        prompt = self._build_prompt(ctx.raw_signal)
        validation = self.validate(ctx)
        if ctx.retry_count < 1:
            ctx.retry_count += 1
            result = self._generate_with_cache(self._build_repair_prompt(prompt, validation.errors))
            ctx.extracted_fields = result.model_copy(update={"signal_id": ctx.raw_signal.signal_id})
            validation = self.validate(ctx)
            if validation.valid:
                return ctx
            ctx.validation_errors = validation.errors

        if self.fallback:
            ctx.provider_used = self.fallback.provider
            ctx.fallback_triggered = True
            original = self.primary
            self.primary = self.fallback
            try:
                result = self._generate_with_cache(prompt)
                ctx.extracted_fields = result.model_copy(update={"signal_id": ctx.raw_signal.signal_id})
            finally:
                self.primary = original
            validation = self.validate(ctx)
            if validation.valid:
                return ctx
            ctx.validation_errors = validation.errors

        ctx.status = "manual_review"
        return ctx

    def _generate_with_cache(self, prompt: str) -> ExtractedFields:
        cached = self.cache.get(prompt, self.primary.model)
        if cached:
            return ExtractedFields.model_validate_json(cached)

        result = self.primary.generate_structured(prompt, ExtractedFields)
        self.cache.put(
            prompt=prompt,
            model=self.primary.model,
            provider=self.primary.provider,
            response=result.model_dump_json(),
            tokens_in=0,
            tokens_out=0,
        )
        return result

    def _build_prompt(self, signal: RawSignal) -> str:
        raw_text = signal.source.raw_text[:2000]
        return (
            "You are a problem extraction engine for the ProblemLens platform.\n\n"
            "Given the raw text below, extract a structured problem description.\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "signal_id": "source signal id",\n'
            '  "title": "A clear, specific problem statement (10-200 chars)",\n'
            '  "pain_summary": "One-line summary of the core pain (20-300 chars)",\n'
            '  "pain_points": ["specific pain 1", "specific pain 2"],\n'
            '  "solutions": ["potential solution 1", "potential solution 2"],\n'
            '  "source_label": "Platform name or description of where this was found",\n'
            '  "extraction_confidence": 0.85\n'
            "}\n\n"
            "Rules:\n"
            "- title: Must describe WHAT is broken, not WHO is affected. Be specific.\n"
            "- pain_summary: One sentence. Focus on the consequence of the problem.\n"
            "- pain_points: 2-5 distinct, specific pain points. Each must be a complete sentence.\n"
            "- solutions: 2-5 actionable solution directions. Each must be a complete sentence.\n"
            "- source_label: e.g., Reddit (r/india) or Hacker News.\n"
            "- extraction_confidence: 0.0-1.0. Set below 0.5 if ambiguous or off-topic.\n"
            "- Do NOT invent information not present in the source text.\n"
            "- Do NOT include sector, frequency, or scores.\n\n"
            f"Source platform: {signal.source.platform.value}\n"
            f"Source URL: {signal.source.url}\n"
            f"Signal ID: {signal.signal_id}\n\n"
            "Raw text:\n---\n"
            f"{raw_text}\n"
            "---"
        )

    def _build_repair_prompt(self, original_prompt: str, errors: list[str]) -> str:
        return (
            f"Your previous response failed validation: {'; '.join(errors)}\n\n"
            "Fix the error and return valid JSON. Do not change anything else. "
            "Here is the original task:\n\n"
            f"{original_prompt}"
        )

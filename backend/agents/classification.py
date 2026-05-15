from __future__ import annotations

from config import STORE_DIR
from models.classification_result import ClassificationResult
from models.draft_card import DraftCard
from models.enums import Confidence, Frequency, Sector
from models.extracted_fields import ExtractedFields
from models.pipeline_context import PipelineContext
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
from utils.llm_cache import LLMCache
from .base import BaseAgent


class ClassificationAgent(BaseAgent):
    """
    Takes ExtractedFields and classifies into schema enums.
    Uses extracted title/summary instead of full raw text to control token cost.
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
        if ctx.extracted_fields is None:
            ctx.validation_errors = ["No extracted fields"]
            return ctx

        prompt = self._build_prompt(ctx.extracted_fields)
        try:
            classification = self._generate_with_cache(prompt)
        except Exception as exc:
            ctx.validation_errors = [str(exc)]
            ctx.current_stage = "classification"
            return ctx
        ctx.draft_card = self._merge(ctx.extracted_fields, classification)
        ctx.current_stage = "classification"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        draft = ctx.draft_card
        if draft is None:
            return ValidationResult(valid=False, errors=["No draft card"], stage="classification")

        errors: list[str] = []
        if draft.sector not in list(Sector):
            errors.append(f"Invalid sector: {draft.sector}")
        if draft.frequency not in list(Frequency):
            errors.append(f"Invalid frequency: {draft.frequency}")
        if draft.confidence not in list(Confidence):
            errors.append(f"Invalid confidence: {draft.confidence}")
        if not 1 <= len(draft.user_type) <= 5:
            errors.append(f"user_type must have 1-5 items, got {len(draft.user_type)}")
        return ValidationResult(valid=len(errors) == 0, errors=errors, stage="classification")

    def _retry_or_fallback(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.extracted_fields is None:
            ctx.status = "manual_review"
            ctx.validation_errors = ["No extracted fields"]
            return ctx

        prompt = self._build_prompt(ctx.extracted_fields)
        validation = self.validate(ctx)
        if ctx.retry_count < 1:
            ctx.retry_count += 1
            classification = self._generate_with_cache(self._build_repair_prompt(prompt, validation.errors))
            ctx.draft_card = self._merge(ctx.extracted_fields, classification)
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
                classification = self._generate_with_cache(prompt)
                ctx.draft_card = self._merge(ctx.extracted_fields, classification)
            finally:
                self.primary = original
            validation = self.validate(ctx)
            if validation.valid:
                return ctx
            ctx.validation_errors = validation.errors

        ctx.status = "manual_review"
        return ctx

    def _generate_with_cache(self, prompt: str) -> ClassificationResult:
        cached = self.cache.get(prompt, self.primary.model)
        if cached:
            return ClassificationResult.model_validate_json(cached)

        result = self.primary.generate_structured(prompt, ClassificationResult)
        self.cache.put(
            prompt=prompt,
            model=self.primary.model,
            provider=self.primary.provider,
            response=result.model_dump_json(),
            tokens_in=0,
            tokens_out=0,
        )
        return result

    def _merge(self, fields: ExtractedFields, classification: ClassificationResult) -> DraftCard:
        return DraftCard(
            signal_id=fields.signal_id,
            title=fields.title,
            pain_summary=fields.pain_summary,
            sector=classification.sector,
            user_type=classification.user_type,
            geography=classification.geography,
            frequency=classification.frequency,
            pain_points=fields.pain_points,
            solutions=fields.solutions,
            source=fields.source_label,
            confidence=classification.confidence,
            extraction_confidence=fields.extraction_confidence,
        )

    def _build_prompt(self, fields: ExtractedFields) -> str:
        pain_points = "\n".join(f"- {point}" for point in fields.pain_points)
        sectors = ", ".join(sector.value for sector in Sector)
        return (
            "You are a problem classifier for the ProblemLens platform (India-focused).\n\n"
            "Given the problem title and summary below, classify it into our taxonomy.\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "sector": "one of the allowed sectors",\n'
            '  "user_type": ["Primary affected group", "Secondary group"],\n'
            '  "geography": "India",\n'
            '  "frequency": "one of: Low, Medium, High, Very High",\n'
            '  "confidence": "one of: Low, Medium, High"\n'
            "}\n\n"
            f"Allowed sectors (pick exactly one):\n{sectors}\n\n"
            "Rules:\n"
            "- sector: Pick the SINGLE best match. Use compound sectors only if clearly needed.\n"
            "- user_type: 1-5 groups. Be specific.\n"
            '- geography: Default "India" unless region-specific.\n'
            "- frequency: Low yearly/rarely, Medium monthly, High weekly, Very High daily.\n"
            "- confidence: Low ambiguous, Medium reasonable uncertainty, High clear match.\n\n"
            f"Problem title: {fields.title}\n"
            f"Problem summary: {fields.pain_summary}\n"
            f"Pain points:\n{pain_points}"
        )

    def _build_repair_prompt(self, original_prompt: str, errors: list[str]) -> str:
        return (
            f"Your previous response failed validation: {'; '.join(errors)}\n\n"
            "Fix the error and return valid JSON. Do not change anything else. "
            "Here is the original task:\n\n"
            f"{original_prompt}"
        )

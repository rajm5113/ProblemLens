from __future__ import annotations

from config import STORE_DIR
from models.pipeline_context import PipelineContext
from models.score_breakdown import ScoreBreakdown
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
from utils.llm_cache import LLMCache
from utils.scoring import compute_opportunity_score
from .base import BaseAgent


class ScoringAgent(BaseAgent):
    """LLM assigns four rubric scores; code computes the composite opportunity score."""

    def __init__(
        self,
        primary: BaseLLMProvider,
        fallback: BaseLLMProvider | None = None,
        cache: LLMCache | None = None,
    ):
        super().__init__(primary, fallback)
        self.cache = cache or LLMCache(STORE_DIR / "llm_cache.db")

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.status == "duplicate_merged":
            return ctx
        if ctx.draft_card is None:
            ctx.validation_errors = ["No draft card for scoring"]
            ctx.current_stage = "scoring"
            return ctx

        prompt = self._build_prompt(ctx)
        try:
            breakdown = self._generate_with_cache(prompt)
        except Exception as exc:
            ctx.validation_errors = [str(exc)]
            ctx.current_stage = "scoring"
            return ctx

        ctx.score_breakdown = breakdown
        ctx.computed_opportunity_score = compute_opportunity_score(breakdown)
        ctx.current_stage = "scoring"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        if ctx.status == "duplicate_merged":
            return ValidationResult(valid=True, stage="scoring")
        breakdown = ctx.score_breakdown
        if breakdown is None:
            return ValidationResult(valid=False, errors=["No score breakdown"], stage="scoring")

        errors: list[str] = []
        for field in ["severity", "market_potential", "ai_feasibility", "competition"]:
            value = getattr(breakdown, field)
            if not 1 <= value <= 10:
                errors.append(f"{field} must be 1-10, got {value}")
        if breakdown.score_confidence < 0.3:
            errors.append(f"score_confidence too low: {breakdown.score_confidence}")
        for field in ["severity_reason", "market_potential_reason", "ai_feasibility_reason", "competition_reason"]:
            if len(getattr(breakdown.rationale, field, "").strip()) < 5:
                errors.append(f"rationale.{field} is too short")
        return ValidationResult(valid=len(errors) == 0, errors=errors, stage="scoring")

    def _retry_or_fallback(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.draft_card is None:
            ctx.status = "manual_review"
            return ctx
        prompt = self._build_prompt(ctx)
        validation = self.validate(ctx)
        if ctx.retry_count < 1:
            ctx.retry_count += 1
            breakdown = self._generate_with_cache(self._build_repair_prompt(prompt, validation.errors))
            ctx.score_breakdown = breakdown
            ctx.computed_opportunity_score = compute_opportunity_score(breakdown)
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
                breakdown = self._generate_with_cache(prompt)
                ctx.score_breakdown = breakdown
                ctx.computed_opportunity_score = compute_opportunity_score(breakdown)
            finally:
                self.primary = original
            validation = self.validate(ctx)
            if validation.valid:
                return ctx
            ctx.validation_errors = validation.errors
        ctx.status = "manual_review"
        return ctx

    def _generate_with_cache(self, prompt: str) -> ScoreBreakdown:
        cached = self.cache.get(prompt, self.primary.model)
        if cached:
            return ScoreBreakdown.model_validate_json(cached)
        result = self.primary.generate_structured(prompt, ScoreBreakdown)
        self.cache.put(prompt, self.primary.model, self.primary.provider, result.model_dump_json(), 0, 0)
        return result

    def _build_prompt(self, ctx: PipelineContext) -> str:
        draft = ctx.draft_card
        assert draft is not None
        pain_points = "\n".join(f"- {point}" for point in draft.pain_points)
        return (
            "You are a scoring engine for the ProblemLens platform.\n\n"
            "Score this problem on 4 dimensions. Each score is 1-10 (integer).\n"
            "Return ONLY valid JSON with severity, market_potential, ai_feasibility, competition, rationale, and score_confidence.\n\n"
            "SEVERITY: 1-2 minor annoyance, 3-4 moderate friction, 5-6 significant pain, 7-8 severe livelihood/health/income impact, 9-10 catastrophic.\n"
            "MARKET POTENTIAL: 1-2 <10K, 3-4 10K-100K, 5-6 100K-1M, 7-8 1M-10M, 9-10 >10M users.\n"
            "AI FEASIBILITY: 1-2 no clear AI, 3-4 marginal assist, 5-6 automates parts, 7-8 natural AI solution, 9-10 near full automation.\n"
            "COMPETITION: 1-2 greenfield, 3-4 few early startups, 5-6 fragmented, 7-8 established players, 9-10 dominated by incumbents.\n\n"
            "Calibration anchors: PIP-002 ASHA tools severity=9 market=9 ai=8 competition=3; "
            "PIP-001 student deadlines severity=7 market=7 ai=8 competition=6.\n\n"
            f"Problem title: {draft.title}\n"
            f"Pain summary: {draft.pain_summary}\n"
            f"Sector: {draft.sector.value}\n"
            f"User type: {', '.join(draft.user_type)}\n"
            f"Frequency: {draft.frequency.value}\n"
            f"Pain points:\n{pain_points}"
        )

    def _build_repair_prompt(self, original_prompt: str, errors: list[str]) -> str:
        return f"Your previous response failed validation: {'; '.join(errors)}\n\nFix it and return valid JSON only.\n\n{original_prompt}"

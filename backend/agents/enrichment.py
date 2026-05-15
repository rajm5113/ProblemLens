from __future__ import annotations

from datetime import datetime, timezone

from config import STORE_DIR
from models.enrichment_result import EnrichmentResult
from models.enums import TrendStatus
from models.pipeline_context import PipelineContext
from models.problem_card import ProblemIntelligenceCard
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
from store.card_store import CardStore
from utils.llm_cache import LLMCache
from .base import BaseAgent


class EnrichmentAgent(BaseAgent):
    """Adds final analysis and assembles a ProblemIntelligenceCard."""

    def __init__(
        self,
        primary: BaseLLMProvider,
        fallback: BaseLLMProvider | None = None,
        card_store: CardStore | None = None,
        cache: LLMCache | None = None,
    ):
        super().__init__(primary, fallback)
        self.card_store = card_store or CardStore()
        self.cache = cache or LLMCache(STORE_DIR / "llm_cache.db")

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.status == "duplicate_merged":
            return ctx
        if ctx.draft_card is None or ctx.score_breakdown is None or ctx.computed_opportunity_score is None:
            ctx.validation_errors = ["Missing draft, score breakdown, or computed opportunity score"]
            ctx.current_stage = "enrichment"
            return ctx

        prompt = self._build_prompt(ctx)
        try:
            enrichment = self._generate_with_cache(prompt)
        except Exception as exc:
            ctx.validation_errors = [str(exc)]
            ctx.current_stage = "enrichment"
            return ctx

        card_id = self.card_store.next_id()
        numeric_id = int(card_id.split("-")[1])
        now = datetime.now(timezone.utc)
        draft = ctx.draft_card
        final = ProblemIntelligenceCard(
            id=card_id,
            numeric_id=numeric_id,
            created_at=now,
            updated_at=now,
            title=draft.title,
            pain_summary=draft.pain_summary,
            description=enrichment.description,
            sector=draft.sector,
            user_type=draft.user_type,
            geography=draft.geography,
            frequency=draft.frequency,
            tags=[draft.user_type[0], draft.geography, draft.frequency.value],
            pain_points=draft.pain_points,
            root_cause=enrichment.root_cause,
            solutions=enrichment.refined_solutions or draft.solutions,
            source=draft.source,
            confidence=draft.confidence,
            signal_count=1,
            scores=ctx.score_breakdown,
            opportunity_score=ctx.computed_opportunity_score,
            trend_status=TrendStatus.NEW,
        )
        ctx.final_card = final
        ctx.current_stage = "enrichment"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        if ctx.status == "duplicate_merged":
            return ValidationResult(valid=True, stage="enrichment")
        if ctx.final_card is None:
            return ValidationResult(valid=False, errors=["No final card"], stage="enrichment")
        return ValidationResult(valid=True, stage="enrichment")

    def _generate_with_cache(self, prompt: str) -> EnrichmentResult:
        cached = self.cache.get(prompt, self.primary.model)
        if cached:
            return EnrichmentResult.model_validate_json(cached)
        result = self.primary.generate_structured(prompt, EnrichmentResult)
        self.cache.put(prompt, self.primary.model, self.primary.provider, result.model_dump_json(), 0, 0)
        return result

    def _build_prompt(self, ctx: PipelineContext) -> str:
        draft = ctx.draft_card
        assert draft is not None
        pain_points = "\n".join(f"- {point}" for point in draft.pain_points)
        solutions = "\n".join(f"- {solution}" for solution in draft.solutions)
        return (
            "You are an enrichment engine for the ProblemLens platform.\n\n"
            "Given the problem below, provide deeper analysis.\n\n"
            "Return ONLY valid JSON with root_cause, description, and refined_solutions.\n\n"
            "Rules:\n"
            "- root_cause: Identify the systemic reason, not just symptoms. Can be null if unclear.\n"
            "- description: 2-3 sentences expanding the pain summary. Do not repeat the title.\n"
            "- refined_solutions: Improve existing solutions with specificity. Return null if already good.\n"
            "- Do not change sector, scores, or classification. Do not invent unsupported facts.\n\n"
            f"Problem title: {draft.title}\n"
            f"Pain summary: {draft.pain_summary}\n"
            f"Sector: {draft.sector.value}\n"
            f"Pain points:\n{pain_points}\n"
            f"Existing solutions:\n{solutions}"
        )

from __future__ import annotations

from datetime import datetime, timezone
from difflib import SequenceMatcher

from models.draft_card import DraftCard
from models.pipeline_context import PipelineContext
from models.problem_card import ProblemIntelligenceCard
from models.validation_result import ValidationResult
from providers.base import BaseLLMProvider
from store.card_store import CardStore
from .base import BaseAgent


class DedupAgent(BaseAgent):
    SIMILARITY_THRESHOLD = 0.75

    def __init__(
        self,
        primary: BaseLLMProvider,
        fallback: BaseLLMProvider | None = None,
        card_store: CardStore | None = None,
    ):
        super().__init__(primary, fallback)
        self.card_store = card_store or CardStore()

    def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.draft_card is None:
            ctx.validation_errors = ["No draft card for dedup"]
            ctx.current_stage = "dedup"
            return ctx

        existing = self._find_duplicate(ctx.draft_card)
        if existing is not None:
            updated = existing.model_copy(
                update={
                    "signal_count": existing.signal_count + 1,
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            self.card_store.save(updated)
            ctx.final_card = updated
            ctx.status = "duplicate_merged"
            ctx.current_stage = "dedup"
            self.logger.info("duplicate_merged", existing_id=updated.id, signal_count=updated.signal_count)
            return ctx

        ctx.current_stage = "dedup"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        return ValidationResult(valid=True, errors=[], stage="dedup")

    def _find_duplicate(self, draft: DraftCard) -> ProblemIntelligenceCard | None:
        draft_title = draft.title.lower().strip()
        for card in self.card_store.get_all():
            ratio = SequenceMatcher(None, draft_title, card.title.lower().strip()).ratio()
            if ratio >= self.SIMILARITY_THRESHOLD:
                return card
        return None

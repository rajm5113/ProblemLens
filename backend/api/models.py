from __future__ import annotations

from collections import Counter

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from models.problem_card import ProblemIntelligenceCard


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class ProblemScoresResponse(CamelModel):
    severity: int
    market_potential: int
    ai_feasibility: int
    competition: int


class ProblemCardResponse(CamelModel):
    id: str
    numeric_id: int
    created_at: str
    updated_at: str
    title: str
    pain_summary: str
    description: str | None
    sector: str
    user_type: list[str]
    geography: str
    frequency: str
    tags: list[str]
    pain_points: list[str]
    root_cause: str | None
    solutions: list[str]
    source: str
    confidence: str
    signal_count: int
    scores: ProblemScoresResponse
    opportunity_score: int
    trend_status: str

    @classmethod
    def from_card(cls, card: ProblemIntelligenceCard) -> "ProblemCardResponse":
        return cls(
            id=card.id,
            numeric_id=card.numeric_id,
            created_at=card.created_at.isoformat(),
            updated_at=card.updated_at.isoformat(),
            title=card.title,
            pain_summary=card.pain_summary,
            description=card.description,
            sector=card.sector.value,
            user_type=card.user_type,
            geography=card.geography,
            frequency=card.frequency.value,
            tags=card.tags,
            pain_points=card.pain_points,
            root_cause=card.root_cause,
            solutions=card.solutions,
            source=card.source,
            confidence=card.confidence.value,
            signal_count=card.signal_count,
            scores=ProblemScoresResponse(
                severity=card.scores.severity,
                market_potential=card.scores.market_potential,
                ai_feasibility=card.scores.ai_feasibility,
                competition=card.scores.competition,
            ),
            opportunity_score=card.opportunity_score,
            trend_status=card.trend_status.value,
        )


class TopSectorResponse(CamelModel):
    sector: str
    count: int
    avg_score: float


class StatsResponse(CamelModel):
    total_problems: int
    avg_opportunity_score: float
    top_sector: str
    sector_breakdown: dict[str, int]
    sector_counts: dict[str, int]
    top_sectors: list[TopSectorResponse]
    trend_breakdown: dict[str, int]
    trend_counts: dict[str, int]
    score_distribution: list[int]
    total_signals: int

    @classmethod
    def from_cards(cls, cards: list[ProblemIntelligenceCard]) -> "StatsResponse":
        total = len(cards)
        sector_counts = Counter(card.sector.value for card in cards)
        trend_counts = Counter(card.trend_status.value for card in cards)
        full_trend_counts = {"New": 0, "Rising": 0, "Stable": 0, "Declining": 0}
        full_trend_counts.update(trend_counts)
        score_distribution = [0] * 10
        for card in cards:
            idx = max(0, min(9, round(card.opportunity_score) - 1))
            score_distribution[idx] += 1
        avg_score = round(sum(card.opportunity_score for card in cards) / max(total, 1), 1)
        top_sectors = []
        for sector, count in sector_counts.most_common(5):
            sector_cards = [card for card in cards if card.sector.value == sector]
            sector_avg = round(sum(card.opportunity_score for card in sector_cards) / count, 1)
            top_sectors.append(TopSectorResponse(sector=sector, count=count, avg_score=sector_avg))
        return cls(
            total_problems=total,
            avg_opportunity_score=avg_score,
            top_sector=sector_counts.most_common(1)[0][0] if sector_counts else "",
            sector_breakdown=dict(sector_counts),
            sector_counts=dict(sector_counts),
            top_sectors=top_sectors,
            trend_breakdown=dict(full_trend_counts),
            trend_counts=dict(full_trend_counts),
            score_distribution=score_distribution,
            total_signals=sum(card.signal_count for card in cards),
        )


class PipelineRunResponse(CamelModel):
    run_count: int
    new_cards: int
    duplicates: int
    errors: int

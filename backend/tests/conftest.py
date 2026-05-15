from __future__ import annotations

from datetime import datetime, timezone

import pytest

from models.enums import Confidence, Frequency, Sector, SourcePlatform, TrendStatus
from models.problem_card import ProblemIntelligenceCard
from models.raw_signal import RawSignal, SourceMetadata
from models.score_breakdown import ScoreBreakdown, ScoreRationale


@pytest.fixture
def score_breakdown() -> ScoreBreakdown:
    return ScoreBreakdown(
        severity=9,
        market_potential=8,
        ai_feasibility=8,
        competition=3,
        rationale=ScoreRationale(
            severity_reason="Delays public health response in rural areas.",
            market_potential_reason="Large frontline health worker base.",
            ai_feasibility_reason="Voice and summarization workflows are mature.",
            competition_reason="Few localized field-first tools exist.",
        ),
        score_confidence=0.85,
    )


@pytest.fixture
def problem_card(score_breakdown: ScoreBreakdown) -> ProblemIntelligenceCard:
    now = datetime.now(timezone.utc)
    return ProblemIntelligenceCard(
        id="PIP-002",
        numeric_id=2,
        created_at=now,
        updated_at=now,
        title="Rural ASHA workers lack digital tools to record patient data accurately",
        pain_summary="Paper-based records get lost in field conditions, delaying outbreak detection.",
        sector=Sector.HEALTHCARE,
        user_type=["ASHA Workers", "Rural Patients"],
        geography="India",
        frequency=Frequency.VERY_HIGH,
        tags=["ASHA Workers", "India", "Very High"],
        pain_points=[
            "Paper-based records get lost or damaged.",
            "Delayed reporting slows public health response.",
        ],
        solutions=[
            "Voice-first app with offline sync.",
            "AI summarizer for PHC doctors.",
        ],
        source="Startup India, Smart India Hackathon",
        confidence=Confidence.HIGH,
        signal_count=1,
        scores=score_breakdown,
        opportunity_score=8,
        trend_status=TrendStatus.NEW,
    )


@pytest.fixture
def raw_signal() -> RawSignal:
    return RawSignal(
        signal_id="sig-001",
        source=SourceMetadata(
            url="https://example.com/signal",
            platform=SourcePlatform.OTHER,
            channel="test",
            raw_text="ASHA workers struggle with delayed reporting because paper records get lost.",
        ),
        fingerprint="abc123",
    )

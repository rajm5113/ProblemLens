from models.score_breakdown import ScoreBreakdown, ScoreRationale
from utils.scoring import compute_opportunity_score


def make_scores(severity: int, market: int, ai: int, competition: int) -> ScoreBreakdown:
    return ScoreBreakdown(
        severity=severity,
        market_potential=market,
        ai_feasibility=ai,
        competition=competition,
        rationale=ScoreRationale(
            severity_reason="x",
            market_potential_reason="x",
            ai_feasibility_reason="x",
            competition_reason="x",
        ),
        score_confidence=1.0,
    )


def test_compute_opportunity_score_matches_phase_2_formula() -> None:
    assert compute_opportunity_score(make_scores(7, 7, 8, 6)) == 6
    assert compute_opportunity_score(make_scores(9, 8, 8, 3)) == 8
    assert compute_opportunity_score(make_scores(8, 9, 9, 4)) == 8


def test_compute_opportunity_score_is_clamped() -> None:
    assert 1 <= compute_opportunity_score(make_scores(1, 1, 1, 10)) <= 10
    assert 1 <= compute_opportunity_score(make_scores(10, 10, 10, 1)) <= 10

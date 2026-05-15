from models.score_breakdown import ScoreBreakdown


def compute_opportunity_score(scores: ScoreBreakdown) -> int:
    raw = (
        scores.severity * 0.30
        + scores.market_potential * 0.25
        + scores.ai_feasibility * 0.20
        + (10 - scores.competition) * 0.25
    )
    return max(1, min(10, round(raw)))

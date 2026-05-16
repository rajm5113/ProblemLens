from __future__ import annotations


def test_stats_returns_summary(client) -> None:
    response = client.get("/api/stats")
    payload = response.json()

    assert response.status_code == 200
    assert payload["totalProblems"] == 44
    assert payload["avgOpportunityScore"] > 0
    assert payload["topSector"] != ""
    assert payload["sectorBreakdown"]["Healthcare"] >= 1
    assert payload["sectorCounts"]["Healthcare"] >= 1
    assert payload["trendBreakdown"]["New"] == 44
    assert payload["trendCounts"]["Rising"] == 0
    assert len(payload["scoreDistribution"]) == 10
    assert sum(payload["scoreDistribution"]) == 44
    assert payload["totalSignals"] == 44

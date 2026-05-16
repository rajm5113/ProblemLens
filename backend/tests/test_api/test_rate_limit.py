from __future__ import annotations


def test_stats_returns_ok(client):
    """Stats endpoint should return 200 with valid payload."""
    response = client.get("/api/stats")
    assert response.status_code == 200
    payload = response.json()
    assert "totalProblems" in payload


def test_health_returns_ok(client):
    """Health endpoint should return 200."""
    response = client.get("/api/health")
    assert response.status_code == 200

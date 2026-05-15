from __future__ import annotations

def test_stats_returns_rate_limit_headers(client):
    response = client.get("/api/stats")
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers

def test_health_rate_limit_headers(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers

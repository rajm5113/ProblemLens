from __future__ import annotations

from unittest.mock import patch

import api.dependencies as deps


def test_pipeline_run_blocked_without_key(client):
    """When PIPELINE_API_KEY is set, requests without the header are rejected."""
    with patch.object(deps, "PIPELINE_API_KEY", "test-secret-key"):
        response = client.post("/api/pipeline/run")
        assert response.status_code in (403, 422)


def test_pipeline_run_allowed_with_correct_key(client):
    """When PIPELINE_API_KEY is set, requests with the correct header pass auth."""
    with patch.object(deps, "PIPELINE_API_KEY", "test-secret-key"):
        response = client.post(
            "/api/pipeline/run",
            headers={"X-API-Key": "test-secret-key"},
        )
        assert response.status_code != 403


def test_pipeline_run_open_when_no_key_configured(client):
    """When PIPELINE_API_KEY is empty, dev mode allows open access."""
    with patch.object(deps, "PIPELINE_API_KEY", ""):
        response = client.post("/api/pipeline/run")
        assert response.status_code != 403


def test_security_headers_present(client):
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "no-store" in response.headers.get("Cache-Control", "")


def test_error_handler_sanitized(client):
    """The generic error handler should not leak internal details."""
    response = client.get("/api/problems/INVALID-FORMAT-XYZ")
    assert response.status_code == 400
    body = response.json()
    assert "traceback" not in str(body).lower()
    assert "file" not in str(body).lower()


def test_health_returns_checks(client):
    response = client.get("/api/health")
    data = response.json()
    assert data["status"] == "ok"
    assert "checks" in data
    assert data["checks"]["database"] == "connected"
    assert isinstance(data["checks"]["cardCount"], int)


def test_invalid_problem_id_format(client):
    response = client.get("/api/problems/'; DROP TABLE cards; --")
    assert response.status_code == 400
    assert "Invalid problem ID format" in response.json()["detail"]


def test_valid_problem_id_not_found(client):
    response = client.get("/api/problems/PIP-999")
    assert response.status_code == 404

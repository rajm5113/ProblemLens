from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from api.routes import pipeline as pipeline_routes


def test_pipeline_runs_endpoint(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    run = {
        "run_id": "run-001",
        "current_stage": "discovery",
        "status": "success",
        "started_at": "2026-05-12T00:00:00+00:00",
        "completed_at": "2026-05-12T00:01:00+00:00",
        "discovery_signals": [{"signal_id": "sig-1"}],
        "final_card": None,
    }
    (tmp_path / "run-001.json").write_text(json.dumps(run), encoding="utf-8")
    monkeypatch.setattr(pipeline_routes, "RUNS_DIR", tmp_path)

    response = client.get("/api/pipeline/runs")

    assert response.status_code == 200
    assert response.json() == [
        {
            "runId": "run-001",
            "stage": "discovery",
            "status": "success",
            "startedAt": "2026-05-12T00:00:00+00:00",
            "completedAt": "2026-05-12T00:01:00+00:00",
            "signalCount": 1,
            "hasCard": False,
        }
    ]


def test_pipeline_stats_endpoint(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    completed_at = datetime.now(timezone.utc).isoformat()
    (tmp_path / "run-001.json").write_text(
        json.dumps({"run_id": "run-001", "completed_at": completed_at}),
        encoding="utf-8",
    )
    monkeypatch.setattr(pipeline_routes, "RUNS_DIR", tmp_path)

    response = client.get("/api/pipeline/stats")

    assert response.status_code == 200
    payload = response.json()
    assert payload["totalRuns"] == 1
    assert payload["totalCards"] == 44
    assert payload["totalSignals"] == 0
    assert payload["lastRunAt"] == completed_at

from __future__ import annotations

from pathlib import Path

from api.seed import seed_if_empty
from store.card_store import CardStore


def test_health_returns_ok(client) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_problems_returns_cards(client) -> None:
    response = client.get("/api/problems")

    assert response.status_code == 200
    assert len(response.json()) == 44


def test_list_problems_empty_store(tmp_path: Path) -> None:
    from api.dependencies import get_card_store
    from api.routes import problems
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    empty_store = CardStore(tmp_path / "empty.db")
    local_app = FastAPI()
    local_app.include_router(problems.router, prefix="/api")
    local_app.dependency_overrides[get_card_store] = lambda: empty_store
    with TestClient(local_app) as local_client:
        response = local_client.get("/api/problems")
    empty_store.conn.close()

    assert response.status_code == 200
    assert response.json() == []


def test_get_problem_by_id(client) -> None:
    response = client.get("/api/problems/PIP-001")

    assert response.status_code == 200
    assert response.json()["id"] == "PIP-001"


def test_get_problem_not_found(client) -> None:
    response = client.get("/api/problems/PIP-999")

    assert response.status_code == 404


def test_filter_by_sector(client) -> None:
    response = client.get("/api/problems?sector=Healthcare")

    assert response.status_code == 200
    assert response.json()
    assert all(card["sector"] == "Healthcare" for card in response.json())


def test_filter_by_min_score(client) -> None:
    response = client.get("/api/problems?min_score=8")

    assert response.status_code == 200
    assert all(card["opportunityScore"] >= 8 for card in response.json())


def test_sort_by_signal_count(client, api_store) -> None:
    card = api_store.get("PIP-001")
    api_store.save(card.model_copy(update={"signal_count": 9}))

    response = client.get("/api/problems?sort_by=signal_count&order=desc")

    assert response.status_code == 200
    assert response.json()[0]["id"] == "PIP-001"


def test_pagination(client) -> None:
    response = client.get("/api/problems?sort_by=created_at&order=asc&limit=5&offset=5")

    assert response.status_code == 200
    assert len(response.json()) == 5


def test_cors_allows_vite_origin(client) -> None:
    response = client.options(
        "/api/problems",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_seed_loads_on_empty_startup(tmp_path: Path) -> None:
    store = CardStore(tmp_path / "seed.db")

    assert seed_if_empty(store) == 44
    assert len(store.all()) == 44
    assert seed_if_empty(store) == 0
    assert len(store.all()) == 44
    store.conn.close()

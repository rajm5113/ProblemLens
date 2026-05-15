from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.seed import seed_if_empty
from store.card_store import CardStore


@pytest.fixture
def api_store(tmp_path: Path) -> Iterator[CardStore]:
    store = CardStore(tmp_path / "api_cards.db")
    app.state.card_store = store
    seed_if_empty(store)
    yield store
    store.conn.close()


@pytest.fixture
def client(api_store: CardStore) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client

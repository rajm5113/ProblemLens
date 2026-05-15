from __future__ import annotations

from utils.title_dedup import is_title_duplicate


def test_title_dedup_exact() -> None:
    assert is_title_duplicate(
        "Small teams struggle to monitor cloud apps",
        ["Small teams struggle to monitor cloud apps"],
    )


def test_title_dedup_similar() -> None:
    assert is_title_duplicate(
        "Small teams struggle to monitor and debug cloud apps",
        ["Small teams struggle to monitor debug cloud apps"],
        threshold=0.8,
    )


def test_title_dedup_different() -> None:
    assert not is_title_duplicate(
        "Farmers receive delayed weather advisories",
        ["Students struggle to track course deadlines"],
    )

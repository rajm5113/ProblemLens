from __future__ import annotations

from api.models import ProblemCardResponse


def test_from_card_maps_all_fields(api_store) -> None:
    card = api_store.get("PIP-001")
    response = ProblemCardResponse.from_card(card)
    payload = response.model_dump(by_alias=True)

    assert payload["id"] == "PIP-001"
    assert payload["numericId"] == 1
    assert payload["painSummary"] == card.pain_summary
    assert payload["userType"] == card.user_type
    assert payload["opportunityScore"] == card.opportunity_score


def test_response_uses_camel_case(api_store) -> None:
    card = api_store.get("PIP-001")
    payload = ProblemCardResponse.from_card(card).model_dump(by_alias=True)

    assert "numericId" in payload
    assert "painSummary" in payload
    assert "numeric_id" not in payload
    assert "pain_summary" not in payload


def test_scores_omit_rationale(api_store) -> None:
    card = api_store.get("PIP-001")
    payload = ProblemCardResponse.from_card(card).model_dump(by_alias=True)

    assert set(payload["scores"]) == {"severity", "marketPotential", "aiFeasibility", "competition"}

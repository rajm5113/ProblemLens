from __future__ import annotations

from agents.classification import ClassificationAgent
from agents.dedup import DedupAgent
from agents.discovery import DiscoveryAgent
from agents.enrichment import EnrichmentAgent
from agents.extraction import ExtractionAgent
from agents.scoring import ScoringAgent
from config import validate_env
from pipeline import Pipeline
from providers.gemini import GeminiProvider
from providers.openai import OpenAIProvider
from store.card_store import CardStore
from store.signal_store import SignalStore


def build_pipeline(
    card_store: CardStore | None = None,
    signal_store: SignalStore | None = None,
) -> Pipeline:
    """Construct the live ProblemLens pipeline with all agents wired up."""
    cards = card_store or CardStore()
    signals = signal_store or SignalStore()
    primary = GeminiProvider()
    fallback = OpenAIProvider() if validate_env("openai") else None

    discovery = DiscoveryAgent(
        primary=primary,
        fallback=fallback,
        signal_store=signals,
    )

    downstream = [
        ExtractionAgent(primary=primary, fallback=fallback),
        ClassificationAgent(primary=primary, fallback=fallback),
        DedupAgent(primary=primary, fallback=fallback, card_store=cards),
        ScoringAgent(primary=primary, fallback=fallback),
        EnrichmentAgent(primary=primary, fallback=fallback, card_store=cards),
    ]

    return Pipeline(
        agents=downstream,
        discovery_agent=discovery,
        store=cards,
    )

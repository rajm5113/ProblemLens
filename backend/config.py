from __future__ import annotations

import logging
import os
from pathlib import Path

import structlog
from dotenv import load_dotenv

from models.enums import SourcePlatform
from models.source_config import SourceConfig

BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
RUNS_DIR = BASE_DIR / "runs"
STORE_DIR = BASE_DIR / "store"

load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.1-flash-lite")
PRIMARY_PROVIDER = os.getenv("PRIMARY_PROVIDER", "gemini")
FALLBACK_PROVIDER = os.getenv("FALLBACK_PROVIDER", "openai")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
REPLAY_MODE = os.getenv("REPLAY_MODE", "false").lower() == "true"
ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "false").lower() == "true"
DISCOVERY_INTERVAL_HOURS = int(os.getenv("DISCOVERY_INTERVAL_HOURS", "6"))
PIPELINE_API_KEY = os.getenv("PIPELINE_API_KEY", "")

# Comma-separated list of allowed CORS origins
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:4174,http://127.0.0.1:4174"
    ).split(",")
    if origin.strip()
]

FALLBACK_TRIGGERS = [
    "validation_failed_after_retry",
    "malformed_json",
    "confidence_below_threshold",
    "timeout",
]

TOKEN_BUDGETS = {
    "discovery": {"max_input": 300, "max_output": 50},
    "extraction": {"max_input": 800, "max_output": 400},
    "classification": {"max_input": 500, "max_output": 200},
    "scoring": {"max_input": 600, "max_output": 300},
    "enrichment": {"max_input": 500, "max_output": 300},
}

BATCH_SIZES = {
    "discovery": 15,     # 15 posts per LLM call (was 5; Gemini Flash handles this easily)
    "classification": 3,
    "enrichment": 3,
}

RELEVANCE_CONFIDENCE_THRESHOLD = 0.6
DISCOVERY_BATCH_SIZE = 15
MAX_BODY_CHARS = 500

DISCOVERY_SOURCES = [
    # ── Reddit (7 subreddits, via PullPush API) ──
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/india",
        url="https://www.reddit.com/r/india/hot.json?limit=25",
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/IndianStartups",
        url="https://www.reddit.com/r/IndianStartups/hot.json?limit=25",
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/developersIndia",
        url="https://www.reddit.com/r/developersIndia/hot.json?limit=25",
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/LegalAdviceIndia",
        url="https://www.reddit.com/r/LegalAdviceIndia/hot.json?limit=25",
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/IndiaInvestments",
        url="https://www.reddit.com/r/IndiaInvestments/hot.json?limit=25",
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/bangalore",
        url="https://www.reddit.com/r/bangalore/hot.json?limit=25",
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/SideProject",
        url="https://www.reddit.com/r/SideProject/hot.json?limit=25",
        max_items=25,
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/Entrepreneur",
        url="https://www.reddit.com/r/Entrepreneur/hot.json?limit=25",
        max_items=25,
    ),
    SourceConfig(
        platform=SourcePlatform.REDDIT,
        name="r/startups",
        url="https://www.reddit.com/r/startups/hot.json?limit=25",
        max_items=25,
    ),
    # ── Hacker News ──
    SourceConfig(
        platform=SourcePlatform.HACKER_NEWS,
        name="HackerNews",
        url="https://hacker-news.firebaseio.com/v0/topstories.json",
    ),
    # ── Product Hunt ──
    SourceConfig(
        platform=SourcePlatform.PRODUCT_HUNT,
        name="ProductHunt",
        url="https://www.producthunt.com/feed",
        max_items=15,
    ),
    # ── Dev.to RSS Feeds (4 tags, no auth needed) ──
    SourceConfig(
        platform=SourcePlatform.DEV_TO,
        name="DevTo/startup",
        url="https://dev.to/feed/tag/startup",
        max_items=15,
    ),
    SourceConfig(
        platform=SourcePlatform.DEV_TO,
        name="DevTo/saas",
        url="https://dev.to/feed/tag/saas",
        max_items=15,
    ),
    SourceConfig(
        platform=SourcePlatform.DEV_TO,
        name="DevTo/india",
        url="https://dev.to/feed/tag/india",
        max_items=15,
    ),
    SourceConfig(
        platform=SourcePlatform.DEV_TO,
        name="DevTo/productivity",
        url="https://dev.to/feed/tag/productivity",
        max_items=15,
    ),
]

PRICING = {
    "gemini": {"input_per_1m": 0.075, "output_per_1m": 0.30},
    "openai": {"input_per_1m": 0.150, "output_per_1m": 0.60},
}


def configure_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    pipeline_file = (LOG_DIR / "pipeline.log").open("a", encoding="utf-8")

    logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.WriteLoggerFactory(file=pipeline_file),
        cache_logger_on_first_use=True,
    )


configure_logging()


def validate_env(provider: str = "gemini") -> bool:
    """Return True when the requested provider has an API key configured."""
    key_by_provider = {
        "gemini": "GEMINI_API_KEY",
        "openai": "OPENAI_API_KEY",
    }
    key_name = key_by_provider.get(provider.lower())
    if key_name is None:
        return False
    return bool(os.getenv(key_name))


def require_env(provider: str = "gemini") -> None:
    """Raise a clear error when a provider cannot be used."""
    key_by_provider = {
        "gemini": "GEMINI_API_KEY",
        "openai": "OPENAI_API_KEY",
    }
    key_name = key_by_provider.get(provider.lower(), f"{provider.upper()}_API_KEY")
    if validate_env(provider):
        return
    raise EnvironmentError(
        f"\n{'=' * 60}\n"
        f"  MISSING: {key_name}\n"
        f"  Set it in backend/.env:\n"
        f"    {key_name}=your-key-here\n"
        f"{'=' * 60}\n"
    )

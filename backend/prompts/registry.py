from __future__ import annotations

from pathlib import Path

PROMPT_ROOT = Path(__file__).resolve().parent


def load_prompt(name: str, version: str = "v1") -> str:
    path = PROMPT_ROOT / version / f"{name}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    return path.read_text(encoding="utf-8")

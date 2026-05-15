from __future__ import annotations

from pathlib import Path

from models.raw_signal import RawSignal


class SignalStore:
    def __init__(self, path: str | Path = "store/raw_signals.jsonl"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, signal: RawSignal) -> None:
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(signal.model_dump_json() + "\n")

    def read_all(self) -> list[RawSignal]:
        if not self.path.exists():
            return []
        return [
            RawSignal.model_validate_json(line)
            for line in self.path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]

    def get_all(self) -> list[RawSignal]:
        return self.read_all()

    def has_url(self, url: str) -> bool:
        return any(str(signal.source.url) == url for signal in self.read_all())

    def has_fingerprint(self, fp: str) -> bool:
        return any(signal.fingerprint == fp for signal in self.read_all())

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import scheduler


def test_scheduler_creates_jobs(monkeypatch) -> None:
    class FakeEvery:
        def __init__(self, jobs: list[object], interval: int):
            self.jobs = jobs
            self.interval = interval

        @property
        def hours(self):
            return self

        def do(self, func):
            self.jobs.append((self.interval, func.__name__))
            return func

    class FakeSchedule:
        def __init__(self):
            self.jobs: list[object] = []

        def every(self, interval: int):
            return FakeEvery(self.jobs, interval)

    class FakeThread:
        def __init__(self, target, daemon, name):
            self.target = target
            self.daemon = daemon
            self.name = name
            self.started = False

        def start(self):
            self.started = True

    fake_schedule = FakeSchedule()
    monkeypatch.setattr(scheduler, "schedule", fake_schedule)
    monkeypatch.setattr(scheduler.threading, "Thread", FakeThread)

    thread = scheduler.start_scheduler()

    assert thread.started
    assert len(fake_schedule.jobs) == 3
    assert (scheduler.DISCOVERY_INTERVAL_HOURS, "_run_discovery_job") in fake_schedule.jobs
    assert (24, "_run_trends_job") in fake_schedule.jobs
    assert (24, "_run_cleanup_job") in fake_schedule.jobs


def test_cleanup_removes_old_files(monkeypatch, tmp_path: Path) -> None:
    old_file = tmp_path / "old.json"
    old_file.write_text("{}", encoding="utf-8")
    old_time = (datetime.now(timezone.utc) - timedelta(days=31)).timestamp()
    os.utime(old_file, (old_time, old_time))
    monkeypatch.setattr(scheduler, "RUNS_DIR", tmp_path)

    assert scheduler._run_cleanup_job() == 1
    assert not old_file.exists()


def test_cleanup_keeps_recent_files(monkeypatch, tmp_path: Path) -> None:
    recent_file = tmp_path / "recent.json"
    recent_file.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(scheduler, "RUNS_DIR", tmp_path)

    assert scheduler._run_cleanup_job() == 0
    assert recent_file.exists()

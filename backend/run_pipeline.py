from __future__ import annotations

"""
CLI entry point for the ProblemLens intelligence pipeline.

Usage:
  python run_pipeline.py discover          # Run discovery only
  python run_pipeline.py full              # Run full pipeline
  python run_pipeline.py process <signal>  # Process a single stored signal ID
  python run_pipeline.py trends            # Update trend statuses
  python run_pipeline.py status            # Show pipeline health + card counts
"""

import argparse
import sys
from collections import Counter

from api.seed import seed_if_empty
from config import configure_logging
from pipeline_factory import build_pipeline
from store.card_store import CardStore
from store.signal_store import SignalStore
from trends import update_trends


def get_card_store(seed: bool = True) -> CardStore:
    store = CardStore()
    if seed:
        seed_if_empty(store)
    return store


def cmd_discover(_: argparse.Namespace) -> None:
    pipeline = build_pipeline(card_store=get_card_store(), signal_store=SignalStore())
    signals = pipeline.run_discovery()
    print(f"Discovered {len(signals)} new signals")
    for signal in signals:
        print(f"  {signal.signal_id[:8]}  {str(signal.source.url)[:80]}")


def cmd_full(_: argparse.Namespace) -> None:
    pipeline = build_pipeline(card_store=get_card_store(), signal_store=SignalStore())
    results = pipeline.run_full()
    success = sum(1 for ctx in results if ctx.status == "success")
    duplicates = sum(1 for ctx in results if ctx.status == "duplicate_merged")
    errors = sum(1 for ctx in results if ctx.status == "manual_review")
    print(f"Pipeline complete: {success} new, {duplicates} merged, {errors} errors")


def cmd_process(args: argparse.Namespace) -> None:
    signal_store = SignalStore()
    signal = next((item for item in signal_store.get_all() if item.signal_id == args.signal_id), None)
    if signal is None:
        print(f"Signal not found: {args.signal_id}", file=sys.stderr)
        sys.exit(2)

    pipeline = build_pipeline(card_store=get_card_store(), signal_store=signal_store)
    result = pipeline.process_signal(signal)
    print(f"Processed {signal.signal_id}: {result.status}")


def cmd_trends(_: argparse.Namespace) -> None:
    updated = update_trends(get_card_store())
    print(f"Updated trend status on {updated} cards")


def cmd_status(_: argparse.Namespace) -> None:
    card_store = get_card_store()
    signal_store = SignalStore()
    cards = card_store.all()
    signals = signal_store.get_all()
    print(f"Cards:   {len(cards)}")
    print(f"Signals: {len(signals)}")
    if not cards:
        return

    avg = sum(card.opportunity_score for card in cards) / len(cards)
    print(f"Avg opp: {avg:.1f}")
    for status, count in Counter(card.trend_status.value for card in cards).most_common():
        print(f"  {status}: {count}")


def main(argv: list[str] | None = None) -> None:
    configure_logging()
    parser = argparse.ArgumentParser(description="ProblemLens Pipeline CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("discover", help="Run discovery only")
    sub.add_parser("full", help="Run full pipeline")
    process_parser = sub.add_parser("process", help="Process a single stored signal")
    process_parser.add_argument("signal_id", help="Stored signal ID to process")
    sub.add_parser("trends", help="Update trend statuses")
    sub.add_parser("status", help="Show pipeline health")

    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help()
        sys.exit(1)

    commands = {
        "discover": cmd_discover,
        "full": cmd_full,
        "process": cmd_process,
        "trends": cmd_trends,
        "status": cmd_status,
    }
    try:
        commands[args.command](args)
    except OSError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()

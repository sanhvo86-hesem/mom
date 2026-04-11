#!/usr/bin/env python3
"""Retention-safe cleanup for runtime noise without touching business authority."""

from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class CleanupSummary:
    ds_store_found: int = 0
    ds_store_removed: int = 0
    pycache_found: int = 0
    pycache_removed: int = 0
    stale_sessions_found: int = 0
    stale_sessions_removed: int = 0
    php_error_rotated: bool = False
    php_error_bytes_before: int = 0
    php_error_archive_path: str | None = None


def remove_path(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
        return
    path.unlink(missing_ok=True)


def collect_paths(root: Path, pattern: str) -> list[Path]:
    return sorted(root.glob(pattern))


def rotate_php_error_log(
    log_path: Path,
    archive_dir: Path,
    max_bytes: int,
    execute: bool,
    summary: CleanupSummary,
) -> None:
    if not log_path.exists():
      return
    size = log_path.stat().st_size
    summary.php_error_bytes_before = size
    if size < max_bytes:
      return

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive_path = archive_dir / f"php_error.{timestamp}.log"
    summary.php_error_rotated = True
    summary.php_error_archive_path = str(archive_path)
    if not execute:
      return

    archive_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(log_path, archive_path)
    log_path.write_text("", encoding="utf-8")


def purge_stale_sessions(
    session_dir: Path,
    max_age_days: float,
    execute: bool,
    summary: CleanupSummary,
) -> None:
    if not session_dir.exists():
      return
    now = datetime.now(timezone.utc).timestamp()
    max_age_seconds = max_age_days * 86400
    for path in sorted(session_dir.glob("sess_*")):
      age_seconds = now - path.stat().st_mtime
      if age_seconds < max_age_seconds:
        continue
      summary.stale_sessions_found += 1
      if execute:
        path.unlink(missing_ok=True)
        summary.stale_sessions_removed += 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Apply cleanup instead of reporting only.")
    parser.add_argument("--root", default=".", help="Repository root.")
    parser.add_argument("--session-max-age-days", type=float, default=7.0, help="Purge sessions older than this age.")
    parser.add_argument("--php-error-max-mb", type=float, default=10.0, help="Rotate php_error.log above this size.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    mom_dir = root / "mom"
    data_dir = mom_dir / "data"
    summary = CleanupSummary()

    ds_store_paths = collect_paths(root, "**/.DS_Store")
    summary.ds_store_found = len(ds_store_paths)
    if args.execute:
      for path in ds_store_paths:
        remove_path(path)
        summary.ds_store_removed += 1

    pycache_paths = collect_paths(root, "**/__pycache__")
    summary.pycache_found = len(pycache_paths)
    if args.execute:
      for path in pycache_paths:
        remove_path(path)
        summary.pycache_removed += 1

    purge_stale_sessions(data_dir / "sessions", args.session_max_age_days, args.execute, summary)
    rotate_php_error_log(
      data_dir / "php_error.log",
      data_dir / "log-archive",
      int(args.php_error_max_mb * 1024 * 1024),
      args.execute,
      summary,
    )

    result = {
      "meta": {
        "executed": args.execute,
        "root": str(root),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
      },
      "summary": {
        "dsStoreFound": summary.ds_store_found,
        "dsStoreRemoved": summary.ds_store_removed,
        "pycacheFound": summary.pycache_found,
        "pycacheRemoved": summary.pycache_removed,
        "staleSessionsFound": summary.stale_sessions_found,
        "staleSessionsRemoved": summary.stale_sessions_removed,
        "phpErrorRotated": summary.php_error_rotated,
        "phpErrorBytesBefore": summary.php_error_bytes_before,
        "phpErrorArchivePath": summary.php_error_archive_path,
      },
      "policy": {
        "sessionMaxAgeDays": args.session_max_age_days,
        "phpErrorMaxMb": args.php_error_max_mb,
        "notes": [
          "Structured audit evidence in mom/data/audit/*.jsonl is never touched by this script.",
          "Archive-isolation and compatibility business surfaces are not modified by this cleanup tool.",
        ],
      },
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

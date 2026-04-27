#!/usr/bin/env python3
"""Prewarm DCC Vietnamese-English segment cache in one provider process."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from typing import Dict, List, Set


SCRIPT_DIR = Path(__file__).resolve().parent
PROVIDER_PATH = SCRIPT_DIR / "dcc_argos_vi_to_en.py"


def load_provider():
    spec = importlib.util.spec_from_file_location("dcc_argos_vi_to_en", PROVIDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load provider from {PROVIDER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def iter_source_docs(root: Path, include_archive: bool) -> List[Path]:
    docs_root = root / "mom" / "docs"
    paths: List[Path] = []
    for path in sorted(docs_root.glob("**/*.html")):
        name = path.name
        if name.startswith("_") or name.endswith(".en.html"):
            continue
        if not include_archive and "_Archive" in path.parts:
            continue
        paths.append(path)
    return paths


def collect_path_segments(provider, path: Path) -> Set[str]:
    segments: Set[str] = set()
    try:
        source_html = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return segments
    soup = provider.BeautifulSoup(source_html, "html.parser")
    for node in list(soup.find_all(string=True)):
        if provider.should_skip_text_node(node):
            continue
        plan = provider.build_translation_plan(str(node))
        if plan is None:
            continue
        for core in plan["cores"]:
            if core.strip() != "":
                segments.add(core)
    return segments


def prewarm_segments(provider, paths: List[Path], limit_docs: int, max_segments: int, chunk_docs: int) -> Dict[str, object]:
    translator = provider.load_translator()
    seen: Set[str] = set()
    chunk: Set[str] = set()
    scanned_docs = 0
    cached_or_translated = 0
    failed_quality = 0

    def flush() -> None:
        nonlocal cached_or_translated, failed_quality, chunk
        if not chunk:
            return
        translated = provider.translate_core_map(sorted(chunk, key=len), translator)
        cached_or_translated += len(translated)
        failed_quality += sum(1 for value in translated.values() if provider.has_quality_issue(value))
        chunk = set()

    for path in paths:
        if limit_docs > 0 and scanned_docs >= limit_docs:
            break
        scanned_docs += 1
        for segment in collect_path_segments(provider, path):
            if segment in seen:
                continue
            seen.add(segment)
            chunk.add(segment)
            if max_segments > 0 and len(seen) >= max_segments:
                flush()
                return {
                    "scanned_docs": scanned_docs,
                    "unique_segments": len(seen),
                    "cached_or_translated": cached_or_translated,
                    "failed_quality": failed_quality,
                }
        if scanned_docs % chunk_docs == 0:
            flush()

    flush()
    return {
        "scanned_docs": scanned_docs,
        "unique_segments": len(seen),
        "cached_or_translated": cached_or_translated,
        "failed_quality": failed_quality,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--limit-docs", type=int, default=0)
    parser.add_argument("--max-segments", type=int, default=0)
    parser.add_argument("--chunk-docs", type=int, default=8)
    parser.add_argument("--include-archive", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    provider = load_provider()
    paths = iter_source_docs(root, args.include_archive)
    result = prewarm_segments(
        provider,
        paths,
        max(0, args.limit_docs),
        max(0, args.max_segments),
        max(1, args.chunk_docs),
    )
    failed_quality = int(result["failed_quality"])
    print(
        json.dumps(
            {
                "ok": failed_quality == 0,
                "root": str(root),
                "source_docs": len(paths),
                "scanned_docs": result["scanned_docs"],
                "unique_segments": result["unique_segments"],
                "cached_or_translated": result["cached_or_translated"],
                "failed_quality": failed_quality,
                "engine_version": provider.CACHE_SCHEMA_VERSION,
            },
            ensure_ascii=False,
        )
    )
    return 1 if failed_quality > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())

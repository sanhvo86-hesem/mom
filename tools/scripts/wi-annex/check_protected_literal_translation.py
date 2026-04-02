#!/usr/bin/env python3
from __future__ import annotations

import csv
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = ROOT / "_reports" / "wi-annex"
REPORT_PATH = REPORT_DIR / "protected-literal-translation-report.csv"
SEARCH_ROOTS = [
    ROOT / "03-Tai-Lieu-Van-Hanh/02-Work-Instructions",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference",
]


def load_normalizer():
    script_path = Path(__file__).with_name("normalize_m365_protected_literals.py")
    spec = importlib.util.spec_from_file_location("normalize_m365_protected_literals", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> int:
    module = load_normalizer()
    replacements = module.CONTROLLED_REPLACEMENTS
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    for root in SEARCH_ROOTS:
        for path in sorted(root.rglob("*.html")):
            text = path.read_text(encoding="utf-8")
            for old, new in replacements:
                if old in text:
                    rows.append({
                        "path": path.relative_to(ROOT).as_posix(),
                        "finding": old,
                        "expected": new,
                    })

    with REPORT_PATH.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["path", "finding", "expected"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} finding(s) to {REPORT_PATH.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

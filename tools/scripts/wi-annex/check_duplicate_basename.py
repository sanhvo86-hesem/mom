from __future__ import annotations

import csv

from common import ANNEX_ROOT, canonical_duplicate_path, duplicate_basename_map, repo_root, walk_html_files


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "duplicate-basename-report.csv"

    annex_files = walk_html_files(root / ANNEX_ROOT)
    duplicates = duplicate_basename_map(annex_files)

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["basename", "status", "canonical_candidate", "path"],
        )
        writer.writeheader()
        for basename, paths in sorted(duplicates.items()):
            keep_path = canonical_duplicate_path(paths)
            for item in paths:
                writer.writerow(
                    {
                        "basename": basename,
                        "status": "KEEP_CANONICAL" if item == keep_path else "DEPRECATE_ALIAS",
                        "canonical_candidate": keep_path.relative_to(root).as_posix(),
                        "path": item.relative_to(root).as_posix(),
                    }
                )

    print(f"duplicate_basenames={len(duplicates)}")
    print(f"report={report_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

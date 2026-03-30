from __future__ import annotations

import csv

from common import ANNEX_ROOT, WI_ROOT, phase_residue_matches, read_text, repo_root, walk_html_files


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "phase-residue-report.csv"

    files = walk_html_files(root / WI_ROOT) + walk_html_files(root / ANNEX_ROOT)
    rows = []
    for path in files:
        hits = phase_residue_matches(read_text(path))
        if not hits:
            continue
        rows.append({"path": path.relative_to(root).as_posix(), "phase_hits": "; ".join(hits)})

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "phase_hits"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"phase_residue_files={len(rows)}")
    print(f"report={report_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

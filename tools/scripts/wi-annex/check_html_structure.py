from __future__ import annotations

import csv

from common import ANNEX_ROOT, WI_ROOT, html_signals, read_text, repo_root, walk_html_files


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "html-structure-report.csv"

    files = walk_html_files(root / WI_ROOT) + walk_html_files(root / ANNEX_ROOT)
    findings = []
    for path in files:
        signals = html_signals(read_text(path))
        if all(
            [
                signals["has_doctype"],
                signals["has_html_tag"],
                signals["has_head_tag"],
                signals["has_body_tag"],
                signals["has_lang"],
                signals["has_charset"],
                signals["has_viewport"],
                signals["has_style_css"],
            ]
        ):
            continue
        findings.append({"path": path.relative_to(root).as_posix(), **signals})

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        fieldnames = [
            "path",
            "has_doctype",
            "has_html_tag",
            "has_head_tag",
            "has_body_tag",
            "has_lang",
            "has_charset",
            "has_viewport",
            "has_style_css",
            "has_form_header",
            "h2_count",
            "proc_num_count",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(findings)

    print(f"html_findings={len(findings)}")
    print(f"report={report_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

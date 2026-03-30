from __future__ import annotations

import csv
import re
from pathlib import Path

from common import WI_ROOT, extract_code, read_text, repo_root, walk_html_files


SECTION_ID_RE = re.compile(r"<section\b[^>]*\bid\s*=\s*[\"'](wi-s\d+)[\"']", re.IGNORECASE)
ANY_WI_ID_RE = re.compile(r"\bid\s*=\s*[\"'](wi-s\d+)[\"']", re.IGNORECASE)
DIV_SECTION_RE = re.compile(r"<div\b[^>]*class\s*=\s*[\"'][^\"']*\bsection\b", re.IGNORECASE)


def status_for(text: str) -> tuple[str, str, int, int, bool]:
    section_ids = SECTION_ID_RE.findall(text)
    all_wi_ids = ANY_WI_ID_RE.findall(text)
    has_div_section = bool(DIV_SECTION_RE.search(text))

    if section_ids and len(section_ids) == len(all_wi_ids) and not has_div_section:
        detail = f"All WI anchors use <section id=\"wi-s#\">. section_ids={len(section_ids)}"
        return "COMPLIANT", detail, len(section_ids), len(all_wi_ids), has_div_section

    if section_ids or all_wi_ids:
        detail = (
            f"Mixed pattern detected. section_ids={len(section_ids)}; "
            f"all_wi_ids={len(all_wi_ids)}; has_div_section={str(has_div_section).lower()}"
        )
        return "PARTIAL", detail, len(section_ids), len(all_wi_ids), has_div_section

    if has_div_section:
        detail = "Legacy <div class=\"section\"> structure detected; migrate to <section id=\"wi-s#\"> during wave rewrite."
        return "NON_COMPLIANT", detail, len(section_ids), len(all_wi_ids), has_div_section

    detail = "Missing stable WI section anchors; no <section id=\"wi-s#\"> pattern detected."
    return "NON_COMPLIANT", detail, len(section_ids), len(all_wi_ids), has_div_section


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "section-id-report.csv"

    rows: list[dict[str, str | int]] = []
    for path in walk_html_files(root / WI_ROOT):
        text = read_text(path)
        _, code_num = extract_code(path, text)
        status, detail, section_count, wi_id_count, has_div_section = status_for(text)
        rows.append(
            {
                "code": f"WI-{code_num}",
                "path": path.relative_to(root).as_posix(),
                "status": status,
                "section_id_count": section_count,
                "wi_id_count": wi_id_count,
                "has_div_section": str(has_div_section).lower(),
                "detail": detail,
            }
        )

    rows.sort(key=lambda item: item["code"])

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    compliant = sum(1 for row in rows if row["status"] == "COMPLIANT")
    partial = sum(1 for row in rows if row["status"] == "PARTIAL")
    non_compliant = sum(1 for row in rows if row["status"] == "NON_COMPLIANT")

    print(f"wi_total={len(rows)}")
    print(f"compliant={compliant}")
    print(f"partial={partial}")
    print(f"non_compliant={non_compliant}")
    print(f"report={report_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

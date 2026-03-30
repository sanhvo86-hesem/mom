from __future__ import annotations

import csv
import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
REPORT_PATH = ROOT / "_reports" / "wi-annex" / "header-consistency-report.csv"
TARGET_DIRS = [
    ROOT / "03-Tai-Lieu-Van-Hanh" / "02-Work-Instructions",
    ROOT / "03-Tai-Lieu-Van-Hanh" / "03-Reference",
]

SUBTITLE_BY_DIR = {
    "02-Work-Instructions": "Tài liệu vận hành • Công việc hướng dẫn",
    "03-Reference": "Tài liệu vận hành • Annex",
}

META_LABELS = [
    "Mã:",
    "Phiên bản:",
    "Ngày hiệu lực:",
    "Chủ sở hữu:",
    "Phê duyệt:",
]
ROW_RE = re.compile(r"<div class=\"row\">.*?</div>", re.S)
DIV_TOKEN_RE = re.compile(r"<div\b[^>]*>|</div>", re.I)


def iter_docs() -> list[Path]:
    docs: list[Path] = []
    for folder in TARGET_DIRS:
        docs.extend(sorted(folder.rglob("*.html")))
    return docs


def subtitle_for(path: Path) -> str:
    if "02-Work-Instructions" in path.parts:
        return SUBTITLE_BY_DIR["02-Work-Instructions"]
    return SUBTITLE_BY_DIR["03-Reference"]


def strip_tags(value: str) -> str:
    return html.unescape(re.sub(r"<.*?>", "", value)).strip()


def parse_code_name_from_header(text: str) -> tuple[str, str] | None:
    match = re.search(r"<div class=\"title\"><strong>(.*?)</strong></div>", text, re.S)
    if not match:
        return None
    plain = re.sub(r"\s+", " ", strip_tags(match.group(1)))
    parsed = re.match(r"^((?:WI|ANNEX)-[A-Z0-9-]+)\s*(?:—|-)\s*(.+)$", plain)
    if not parsed:
        return None
    return parsed.group(1).strip(), parsed.group(2).strip()


def find_balanced_div(text: str, marker: str) -> tuple[int, int, str] | None:
    start = text.find(marker)
    if start < 0:
        return None
    depth = 0
    end = None
    for token in DIV_TOKEN_RE.finditer(text, start):
        raw = token.group(0).lower()
        if raw.startswith("<div"):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                end = token.end()
                break
    if end is None:
        return None
    return start, end, text[start:end]


def collect_findings(path: Path) -> list[dict[str, str]]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    findings: list[dict[str, str]] = []

    subtitle_match = re.search(
        r"<div class=\"fh-company\">.*?<span>(.*?)</span>", text, re.S
    )
    if not subtitle_match:
        findings.append({"finding": "MISSING_SUBTITLE", "detail": "fh-company span not found"})
    else:
        actual = re.sub(r"\s+", " ", subtitle_match.group(1).strip())
        expected = subtitle_for(path)
        if actual != expected:
            findings.append(
                {
                    "finding": "SUBTITLE_MISMATCH",
                    "detail": f"expected `{expected}` but found `{actual}`",
                }
            )

    if '<span class="doc-code">' not in text:
        findings.append(
            {
                "finding": "MISSING_DOC_CODE_SPAN",
                "detail": "header title does not wrap document code with .doc-code",
            }
        )

    if '<span class="doc-code">WI-' not in text and '<span class="doc-code">ANNEX-' not in text:
        findings.append(
            {
                "finding": "MISSING_META_CODE_CLASS",
                "detail": "meta code row does not use .doc-code class",
            }
        )

    meta_block = find_balanced_div(text, '<div class="meta">')
    rows = ROW_RE.findall(meta_block[2]) if meta_block else []
    if rows and len(rows) < len(META_LABELS):
        findings.append(
            {
                "finding": "META_ROW_COUNT",
                "detail": f"expected {len(META_LABELS)} rows but found {len(rows)}",
            }
        )
    labels = []
    for row in rows[: len(META_LABELS)]:
        match = re.search(r"<span><b>(.*?)</b></span>", row, re.S)
        labels.append(re.sub(r"\s+", " ", match.group(1).strip()) if match else "")
    for index, expected in enumerate(META_LABELS[: len(labels)]):
        actual = labels[index]
        if actual != expected:
            findings.append(
                {
                    "finding": "META_LABEL_MISMATCH",
                    "detail": f"row {index + 1}: expected `{expected}` but found `{actual}`",
                }
            )

    parsed = parse_code_name_from_header(text)
    title_match = re.search(r"<title>(.*?)</title>", text, re.S)
    if parsed and title_match:
        expected_title = f"{parsed[0]} — {parsed[1]} | HESEM QMS"
        actual_title = re.sub(r"\s+", " ", strip_tags(title_match.group(1)))
        if actual_title != expected_title:
            findings.append(
                {
                    "finding": "TITLE_TAG_MISMATCH",
                    "detail": f"expected `{expected_title}` but found `{actual_title}`",
                }
            )

    return findings


def main() -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, str]] = []
    for path in iter_docs():
        rel = path.relative_to(ROOT).as_posix()
        for finding in collect_findings(path):
            rows.append(
                {
                    "path": rel,
                    "finding": finding["finding"],
                    "detail": finding["detail"],
                }
            )

    with REPORT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "finding", "detail"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"header_findings={len(rows)}")


if __name__ == "__main__":
    main()

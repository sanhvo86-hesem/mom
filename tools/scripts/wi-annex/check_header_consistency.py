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


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


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


def parse_header_title(text: str) -> tuple[str, str] | None:
    title_block = find_balanced_div(text, '<div class="title">')
    if not title_block:
        return None
    code_match = re.search(r"<span class=\"doc-code\">(.*?)</span>", title_block[2], re.S)
    name_match = re.search(
        r"<strong[^>]*class=\"[^\"]*\bdoc-name\b[^\"]*\"[^>]*>(.*?)</strong>",
        title_block[2],
        re.S,
    )
    if not code_match or not name_match:
        return None
    code = normalize_spaces(strip_tags(code_match.group(1)))
    name = normalize_spaces(strip_tags(name_match.group(1)))
    if not code or not name:
        return None
    return code, name


def collect_findings(path: Path) -> list[dict[str, str]]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    findings: list[dict[str, str]] = []

    subtitle_match = re.search(
        r"<div class=\"fh-company\">.*?<span>(.*?)</span>",
        text,
        re.S,
    )
    if not subtitle_match:
        findings.append({"finding": "MISSING_SUBTITLE", "detail": "fh-company span not found"})
    else:
        actual = normalize_spaces(subtitle_match.group(1))
        expected = subtitle_for(path)
        if actual != expected:
            findings.append(
                {
                    "finding": "SUBTITLE_MISMATCH",
                    "detail": f"expected `{expected}` but found `{actual}`",
                }
            )

    title_block = find_balanced_div(text, '<div class="title">')
    if not title_block:
        findings.append({"finding": "MISSING_TITLE_BLOCK", "detail": "title block not found"})
    else:
        if '<span class="doc-code">' not in title_block[2]:
            findings.append(
                {
                    "finding": "MISSING_DOC_CODE_SPAN",
                    "detail": "title block must contain a dedicated .doc-code span",
                }
            )
        if 'class="doc-name"' not in title_block[2]:
            findings.append(
                {
                    "finding": "MISSING_DOC_NAME_STRONG",
                    "detail": "title block must contain a dedicated .doc-name strong",
                }
            )
        if re.search(r"<strong[^>]*>\s*<span class=\"doc-code\">", title_block[2], re.S):
            findings.append(
                {
                    "finding": "MERGED_CODE_NAME_NODE",
                    "detail": "title block still nests .doc-code inside strong instead of separating code and name",
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

    for index, expected in enumerate(META_LABELS):
        if index >= len(rows):
            break
        match = re.search(r"<span><b>(.*?)</b></span>", rows[index], re.S)
        actual = normalize_spaces(match.group(1)) if match else ""
        if actual != expected:
            findings.append(
                {
                    "finding": "META_LABEL_MISMATCH",
                    "detail": f"row {index + 1}: expected `{expected}` but found `{actual}`",
                }
            )

    if rows:
        code_row = rows[0]
        if '<span class="doc-code">' not in code_row:
            findings.append(
                {
                    "finding": "MISSING_META_CODE_CLASS",
                    "detail": "meta code row must use .doc-code on the value span",
                }
            )

    parsed = parse_header_title(text)
    title_match = re.search(r"<title>(.*?)</title>", text, re.S)
    if parsed and title_match:
        expected_title = f"{parsed[0]} — {parsed[1]} | HESEM QMS"
        actual_title = normalize_spaces(strip_tags(title_match.group(1)))
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

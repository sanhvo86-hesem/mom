#!/usr/bin/env python3
"""Audit generated DCC English locale artifacts for non-renderable MT defects."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path
from typing import Dict, List

VIETNAMESE_CHAR_RE = re.compile(
    r"[àáạảãăắằẳẵặâấầẩẫậđèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹ]",
    re.I,
)
RESIDUAL_VIETNAMESE_TERMS = [
    "đánh giá",
    "nội bộ",
    "lô",
    "mẫu",
    "phạm vi",
    "phải",
    "đúng",
    "thiếu",
    "không",
    "hồ sơ",
    "bằng chứng",
    "quyền dùng",
    "quyền dừng",
    "phát hành",
    "giao hàng",
    "một phần",
    "gá",
    "hóa",
    "phó",
]
QUALITY_REPEAT_PATTERNS = [
    re.compile(r"\b([\wÀ-ỹ]{2,})(?:\s+\1\b){3,}", re.I),
    re.compile(r"\bhóa(?:\s+hóa){1,}\b", re.I),
    re.compile(r"\bphó(?:\s+phó){1,}\b", re.I),
    re.compile(r"\bRe(?:\s+Re){1,}\b"),
    re.compile(r"\bAc(?:\s+Ac){1,}\b"),
    re.compile(r"\bdiscovery(?:\s+discovery){1,}\b", re.I),
    re.compile(r"\bdetection(?:\s+detection){1,}\b", re.I),
    re.compile(r"\breject(?:\s+reject){1,}\b", re.I),
]


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def visible_text(markup: str) -> str:
    cleaned = re.sub(r"<(script|style|noscript|svg|math)\b[^>]*>.*?</\1>", " ", markup, flags=re.I | re.S)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return normalize_text(cleaned)


def phrase_regex(source: str) -> re.Pattern[str]:
    escaped = re.escape(source)
    if re.fullmatch(r"[A-Za-zÀ-ỹ0-9_]+", source, re.I):
        return re.compile(rf"(?<![A-Za-zÀ-ỹ0-9_]){escaped}(?![A-Za-zÀ-ỹ0-9_])", re.I)
    prefix = r"(?<![A-Za-zÀ-ỹ0-9_])" if re.match(r"[A-Za-zÀ-ỹ0-9_]", source, re.I) else ""
    suffix = r"(?![A-Za-zÀ-ỹ0-9_])" if re.search(r"[A-Za-zÀ-ỹ0-9_]$", source, re.I) else ""
    return re.compile(prefix + escaped + suffix, re.I)


def detect_issues(markup: str) -> List[str]:
    text = visible_text(markup)
    issues: List[str] = []

    if "__DCC_LITERAL_" in text:
        issues.append("literal_placeholder_leak")

    if any(pattern.search(text) for pattern in QUALITY_REPEAT_PATTERNS):
        issues.append("repeated_token_loop")

    residual_terms = 0
    for term in RESIDUAL_VIETNAMESE_TERMS:
        residual_terms += len(phrase_regex(term).findall(text))
    vietnamese_chars = len(VIETNAMESE_CHAR_RE.findall(text))
    if vietnamese_chars > 0:
        issues.append("vietnamese_residue")
    if residual_terms >= 3:
        issues.append("excessive_vietnamese_residue")

    if re.search(r"\b(?:to|at|from|for|according to)<a\b", markup, re.I):
        issues.append("anchor_prefix_spacing")
    if re.search(r"</a>(?:and|or|with|must|is|are|SOP|WI|ANNEX|FRM|POL|QMS-MAN)\b", markup, re.I):
        issues.append("anchor_suffix_spacing")
    if re.search(r"\b(?:to|at|from|for|according to)(?:SOP|WI|ANNEX|FRM|POL|QMS-MAN)-\d+", text, re.I):
        issues.append("document_code_spacing")

    return sorted(set(issues))


def audit(root: Path, limit: int) -> Dict[str, object]:
    files = sorted(root.glob("mom/docs/**/_*.en.html"))
    failures = []
    failed_files = 0
    issue_counts: Dict[str, int] = {}
    for path in files:
        try:
            markup = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            issues = ["artifact_read_failed"]
            snippet = str(exc)
        else:
            issues = detect_issues(markup)
            snippet = visible_text(markup)[:280]
        if not issues:
            continue
        failed_files += 1
        for issue in issues:
            issue_counts[issue] = issue_counts.get(issue, 0) + 1
        if len(failures) < limit:
            failures.append(
                {
                    "path": str(path.relative_to(root)),
                    "issues": issues,
                    "snippet": snippet,
                }
            )
    return {
        "root": str(root),
        "artifact_count": len(files),
        "failed_count": failed_files,
        "files_failed": failed_files,
        "issue_counts": issue_counts,
        "failures": failures,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    result = audit(root, max(0, args.limit))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result["issue_counts"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

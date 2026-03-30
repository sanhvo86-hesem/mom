from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path


WI_ROOT = Path("03-Tai-Lieu-Van-Hanh") / "02-Work-Instructions"
ANNEX_ROOT = Path("03-Tai-Lieu-Van-Hanh") / "03-Reference"

DOC_CODE_RE = re.compile(r"\b(?P<kind>wi|annex)-(?P<code>\d{3})\b", re.IGNORECASE)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.IGNORECASE | re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
PHASE_PATTERNS = [
    re.compile(r"data-phase\d+[a-z]?", re.IGNORECASE),
    re.compile(r"\bphase\d+[a-z]?\b", re.IGNORECASE),
    re.compile(r"override dieu hanh", re.IGNORECASE),
    re.compile(r"kiem soat bo sung", re.IGNORECASE),
    re.compile(r"phase-card", re.IGNORECASE),
]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def walk_html_files(base: Path) -> list[Path]:
    return sorted(path for path in base.rglob("*.html") if path.is_file())


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def strip_tags(value: str) -> str:
    return re.sub(r"\s+", " ", TAG_RE.sub(" ", value)).strip()


def extract_code(path: Path, text: str) -> tuple[str, str]:
    match = DOC_CODE_RE.search(path.name) or DOC_CODE_RE.search(text)
    if not match:
        raise ValueError(f"Cannot determine document code for {path}")
    return match.group("kind").upper(), match.group("code")


def extract_title(text: str) -> str:
    for pattern in (TITLE_RE, H1_RE):
        match = pattern.search(text)
        if match:
            return strip_tags(match.group(1))
    return ""


def count_regex(pattern: str, text: str) -> int:
    return len(re.findall(pattern, text, flags=re.IGNORECASE))


def html_signals(text: str) -> dict[str, bool | int]:
    lowered = text.lstrip().lower()
    return {
        "has_doctype": lowered.startswith("<!doctype html>"),
        "has_html_tag": bool(re.search(r"<html\b", text, re.IGNORECASE)),
        "has_head_tag": bool(re.search(r"<head\b", text, re.IGNORECASE)),
        "has_body_tag": bool(re.search(r"<body\b", text, re.IGNORECASE)),
        "has_lang": bool(re.search(r"<html[^>]+\blang\s*=", text, re.IGNORECASE)),
        "has_charset": bool(re.search(r"<meta[^>]+charset\s*=", text, re.IGNORECASE)),
        "has_viewport": bool(re.search(r"<meta[^>]+name\s*=\s*[\"']viewport", text, re.IGNORECASE)),
        "has_style_css": bool(re.search(r"assets/style\.css", text, re.IGNORECASE)),
        "has_form_header": "form-header" in text,
        "h2_count": count_regex(r"<h2\b", text),
        "proc_num_count": count_regex(r"proc-num", text),
    }


def phase_residue_matches(text: str) -> list[str]:
    hits: list[str] = []
    for pattern in PHASE_PATTERNS:
        hits.extend(sorted(set(match.group(0) for match in pattern.finditer(text))))
    return sorted(set(hits))


def duplicate_basename_map(paths: list[Path]) -> dict[str, list[Path]]:
    grouped: dict[str, list[Path]] = defaultdict(list)
    for path in paths:
        grouped[path.name.lower()].append(path)
    return {name: sorted(items) for name, items in grouped.items() if len(items) > 1}


def canonical_duplicate_path(paths: list[Path]) -> Path:
    ranked = sorted(paths, key=lambda item: (len(item.parts), str(item).lower()), reverse=True)
    return ranked[0]


def guess_wi_archetype(code: str, title: str) -> str:
    number = int(code)
    lowered = title.lower()
    manual = {
        "101": "Digital-Operation WI",
        "102": "Digital-Operation WI",
        "103": "Digital-Operation WI",
        "104": "Digital-Operation WI",
        "105": "Digital-Operation WI",
        "106": "Digital-Operation WI",
        "107": "Digital-Operation WI",
        "201": "Gate-Execution WI",
        "202": "Control-Tower WI",
        "203": "Gate-Execution WI",
        "205": "POU-WI",
        "206": "Gate-Execution WI",
        "207": "Control-Tower WI",
        "302": "Gate-Execution WI",
        "501": "Control-Tower WI",
        "517": "POU-WI",
        "518": "Gate-Execution WI",
        "519": "Gate-Execution WI",
        "801": "Worked-Example Candidate",
        "901": "Control-Tower WI",
    }
    if code in manual:
        return manual[code]
    if 500 <= number < 600:
        return "POU-WI"
    if 600 <= number < 800:
        return "POU-WI"
    if "dashboard" in lowered or "tier" in lowered or "readiness" in lowered:
        return "Control-Tower WI"
    return "Review Needed"


def guess_annex_archetype(code: str, title: str) -> str:
    lowered = title.lower()
    manual = {
        "503": "Map/Topology Annex",
        "601": "Method Annex",
        "606": "Specification Annex",
        "608": "Specification Annex",
        "701": "Dictionary Annex",
        "702": "Specification Annex",
        "703": "Rule-Pack Annex",
        "122": "Dictionary Annex",
        "124": "Worked Example Annex",
    }
    if code in manual:
        return manual[code]
    if any(token in lowered for token in ["authority", "raci", "access", "deputy"]):
        return "Matrix Annex"
    if "kpi" in lowered and "dictionary" in lowered:
        return "Dictionary Annex"
    if any(token in lowered for token in ["org chart", "process map", "topology", "blueprint"]):
        return "Map/Topology Annex"
    if "matrix" in lowered:
        return "Matrix Annex"
    if "dictionary" in lowered:
        return "Dictionary Annex"
    if "map" in lowered or "topology" in lowered or "model" in lowered:
        return "Map/Topology Annex"
    if "rule" in lowered or "rules" in lowered:
        return "Rule-Pack Annex"
    if "example" in lowered:
        return "Worked Example Annex"
    if "method" in lowered or "guide" in lowered:
        return "Method Annex"
    if "spec" in lowered or "surface" in lowered or "vacuum" in lowered or "packaging" in lowered:
        return "Specification Annex"
    return "Review Needed"

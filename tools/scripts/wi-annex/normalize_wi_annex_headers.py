from __future__ import annotations

import html
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
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

TITLE_RE = re.compile(r"<div class=\"title\"><strong>(.*?)</strong></div>", re.S)
TITLE_TAG_RE = re.compile(r"<title>.*?</title>", re.S | re.I)
H1_RE = re.compile(r"<h1>(.*?)</h1>", re.S)
FH_COMPANY_RE = re.compile(
    r"(<div class=\"fh-company\">\s*<a[^>]*>.*?</a>\s*<span>)(.*?)(</span>\s*</div>)",
    re.S,
)
ROW_RE = re.compile(r"<div class=\"row\">.*?</div>", re.S)
DIV_TOKEN_RE = re.compile(r"<div\b[^>]*>|</div>", re.I)
ANNEX_802_MARKER = '<h2 class="h2" id="muc-luc">'
ANNEX_802_HEADER = """<div class="form-header">
<div class="fh-left">
 <a class="brand-logo" href="../../../01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="../../../assets/hesem-logo.svg"></a>
 <div class="fh-company">
 <a href="../../../01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
 <span>Tài liệu vận hành • Annex</span>
 </div>
</div>
<div class="title">
 <strong><span class="doc-code">ANNEX-802</span> — Thỏa ước lao động tập thể</strong>
</div>
<div class="meta">
<div class="row"><span><b>Mã:</b></span><span class="doc-code">ANNEX-802</span></div>
<div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
<div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Chủ sở hữu:</b></span><span><span class="entity-cluster role-cluster"><a class="entity-link dept-link" href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-hr-handbook.html" title="Human Resources Department (Phong Nhan su)"><span class="entity-code dept-code">D-HR</span></a></span></span></div>
<div class="row"><span><b>Phê duyệt:</b></span><span><span class="entity-cluster role-cluster"><a class="entity-link role-link" href="../../../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html" title="Chief Executive Officer (Tong Giam doc)"><span class="entity-code role-code">CEO</span></a></span></span></div>
</div>
</div>"""


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


def parse_code_and_name(text: str) -> tuple[str, str] | None:
    plain = re.sub(r"\s+", " ", strip_tags(text))
    match = re.match(r"^((?:WI|ANNEX)-[A-Z0-9-]+)\s*(?:—|-)\s*(.+)$", plain)
    if not match:
        return None
    return match.group(1).strip(), match.group(2).strip()


def normalize_title_block(text: str) -> tuple[str, tuple[str, str] | None]:
    match = TITLE_RE.search(text)
    if not match:
        return text, None
    parsed = parse_code_and_name(match.group(1))
    if not parsed:
        return text, None
    code, name = parsed
    replacement = (
        '<div class="title"><strong>'
        f'<span class="doc-code">{code}</span> — {name}'
        "</strong></div>"
    )
    return text[: match.start()] + replacement + text[match.end() :], parsed


def normalize_title_tag(text: str, parsed: tuple[str, str] | None) -> str:
    if not parsed:
        h1_match = H1_RE.search(text)
        if not h1_match:
            return text
        parsed = parse_code_and_name(h1_match.group(1))
        if not parsed:
            return text
    code, name = parsed
    return TITLE_TAG_RE.sub(
        f"<title>{code} — {name} | HESEM QMS</title>",
        text,
        count=1,
    )


def normalize_company_subtitle(text: str, subtitle: str) -> str:
    return FH_COMPANY_RE.sub(rf"\1{subtitle}\3", text, count=1)


def normalize_annex_802_header(path: Path, text: str) -> str:
    if path.name != "annex-802-collective-bargaining-agreement.html":
        return text
    start = text.find('<div class="form-header">')
    marker = text.find(ANNEX_802_MARKER)
    if start < 0 or marker < 0 or marker <= start:
        return text
    return text[:start] + ANNEX_802_HEADER + "\n" + ANNEX_802_MARKER + text[marker + len(ANNEX_802_MARKER) :]


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


def head_text_for(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    return subprocess.run(
        ["git", "show", f"HEAD:{rel}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    ).stdout


def extract_meta_rows(text: str) -> list[str]:
    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return []
    return ROW_RE.findall(block[2])


def normalize_meta_rows(path: Path, text: str) -> str:
    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return text

    rows = extract_meta_rows(text)
    if len(rows) < len(META_LABELS):
        head_rows = extract_meta_rows(head_text_for(path))
        if len(head_rows) > len(rows):
            rows = rows + head_rows[len(rows) :]
    if not rows:
        return text

    normalized_rows: list[str] = []
    for index, row in enumerate(rows):
        if index < len(META_LABELS):
            row = re.sub(
                r"(<span><b>).*?(</b></span>)",
                rf"\1{META_LABELS[index]}\2",
                row,
                count=1,
                flags=re.S,
            )
        if index == 0:
            row = re.sub(
                r"(</span>\s*<span)(?: class=\"doc-code\")?(>\s*(?:WI|ANNEX)-[A-Z0-9-]+\s*</span>)",
                r'\1 class="doc-code"\2',
                row,
                count=1,
                flags=re.S,
            )
        normalized_rows.append(row)

    new_block = '<div class="meta">' + "\n".join(normalized_rows) + "</div>"
    return text[: block[0]] + new_block + text[block[1] :]


def normalize_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = normalize_annex_802_header(path, original)
    updated, parsed = normalize_title_block(updated)
    updated = normalize_title_tag(updated, parsed)
    updated = normalize_company_subtitle(updated, subtitle_for(path))
    updated = normalize_meta_rows(path, updated)
    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main() -> None:
    changed = 0
    for path in iter_docs():
        if normalize_file(path):
            changed += 1
    print(f"normalized_files={changed}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import html
import re
import subprocess
from pathlib import Path

from lxml import html as lxml_html


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

TITLE_TAG_RE = re.compile(r"<title>.*?</title>", re.S | re.I)
H1_RE = re.compile(r"<h1>(.*?)</h1>", re.S)
FH_COMPANY_RE = re.compile(
    r"(<div class=\"fh-company\">\s*<a[^>]*>.*?</a>\s*<span>)(.*?)(</span>\s*</div>)",
    re.S,
)
ROW_RE = re.compile(r"<div class=\"row\">.*?</div>", re.S)
DIV_TOKEN_RE = re.compile(r"<div\b[^>]*>|</div>", re.I)
EARLY_PAGE_BODY_CLOSE_RE = re.compile(r"^(\s*)</div>(\s*)", re.S)
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
<span class="doc-code">ANNEX-802</span>
<strong class="doc-name">Thỏa ước lao động tập thể</strong>
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


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_code_and_name(text: str) -> tuple[str, str] | None:
    plain = normalize_spaces(strip_tags(text))
    match = re.match(r"^((?:WI|ANNEX)-[A-Z0-9-]+)\s*(?:—|-)\s*(.+)$", plain)
    if not match:
        return None
    return match.group(1).strip(), match.group(2).strip()


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
    result = subprocess.run(
        ["git", "show", f"HEAD:{rel}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.stdout


def extract_meta_rows(text: str) -> list[str]:
    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return []
    return ROW_RE.findall(block[2])


def extract_title_parts(block_html: str) -> tuple[str, str, str, str] | None:
    code_match = re.search(r"<span class=\"doc-code\">(.*?)</span>", block_html, re.S)
    name_match = re.search(
        r"<strong[^>]*class=\"[^\"]*\bdoc-name\b[^\"]*\"[^>]*>(.*?)</strong>",
        block_html,
        re.S,
    )
    if code_match and name_match:
        code = normalize_spaces(strip_tags(code_match.group(1)))
        name = normalize_spaces(strip_tags(name_match.group(1)))
    else:
        strong_match = re.search(r"<strong[^>]*>(.*?)</strong>", block_html, re.S)
        if not strong_match:
            return None
        parsed = parse_code_and_name(strong_match.group(1))
        if not parsed:
            return None
        code, name = parsed

    sub_match = re.search(
        r"(<span[^>]*class=\"[^\"]*\bsub-vn\b[^\"]*\"[^>]*>.*?</span>)",
        block_html,
        re.S,
    )
    muted_match = re.search(
        r"(<span[^>]*class=\"[^\"]*\bmuted\b[^\"]*\"[^>]*>.*?</span>)",
        block_html,
        re.S,
    )
    return code, name, sub_match.group(1) if sub_match else "", muted_match.group(1) if muted_match else ""


def fallback_title_parts(text: str) -> tuple[str, str] | None:
    h1_match = H1_RE.search(text)
    if h1_match:
        parsed = parse_code_and_name(h1_match.group(1))
        if parsed:
            return parsed
    title_match = TITLE_TAG_RE.search(text)
    if title_match:
        parsed = parse_code_and_name(strip_tags(title_match.group(0).replace("| HESEM QMS", "").replace(" | HESEM QMS", "")))
        if parsed:
            return parsed
    return None


def normalize_title_block(text: str) -> tuple[str, tuple[str, str] | None]:
    block = find_balanced_div(text, '<div class="title">')
    if not block:
        return text, None

    parts = extract_title_parts(block[2])
    if not parts:
        fallback = fallback_title_parts(text)
        if not fallback:
            return text, None
        code, name = fallback
        sub_html = ""
        muted_html = ""
    else:
        code, name, sub_html, muted_html = parts

    replacement = (
        '<div class="title">\n'
        f'<span class="doc-code">{code}</span>\n'
        f'<strong class="doc-name">{name}</strong>'
    )
    if sub_html:
        replacement += "\n" + sub_html
    if muted_html:
        replacement += "\n" + muted_html
    replacement += "\n</div>"
    return text[: block[0]] + replacement + text[block[1] :], (code, name)


def normalize_title_tag(text: str, parsed: tuple[str, str] | None) -> str:
    if not parsed:
        parsed = fallback_title_parts(text)
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


def normalize_meta_rows(path: Path, text: str) -> str:
    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return text

    parsed_title = extract_title_parts(find_balanced_div(text, '<div class="title">')[2]) if find_balanced_div(text, '<div class="title">') else None
    code_from_title = parsed_title[0] if parsed_title else None
    if not code_from_title:
        fallback = fallback_title_parts(text)
        code_from_title = fallback[0] if fallback else None

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
            if code_from_title:
                row = re.sub(
                    r"(<span><b>.*?</b></span>)\s*<span.*?</span>",
                    rf'\1<span class="doc-code">{code_from_title}</span>',
                    row,
                    count=1,
                    flags=re.S,
                )
            row = re.sub(
                r"(<span)(?: class=\"doc-code\")?(>\s*(?:WI|ANNEX)-[A-Z0-9-]+\s*</span>)",
                r'\1 class="doc-code"\2',
                row,
                count=1,
                flags=re.S,
            )
        normalized_rows.append(row)

    new_block = '<div class="meta">' + "\n".join(normalized_rows) + "</div>"
    return text[: block[0]] + new_block + text[block[1] :]


def normalize_page_shell(text: str) -> str:
    page_body_start = text.find('<div class="page-body">')
    form_header_block = find_balanced_div(text, '<div class="form-header">')
    if page_body_start < 0 or not form_header_block:
        return text
    if form_header_block[0] < page_body_start:
        return text

    tail = text[form_header_block[1] :]
    if not EARLY_PAGE_BODY_CLOSE_RE.match(tail):
        return text

    fixed_tail, changed = EARLY_PAGE_BODY_CLOSE_RE.subn(r"\1\2", tail, count=1)
    if not changed:
        return text
    return text[: form_header_block[1]] + fixed_tail


def _element_children(node) -> list:
    return [child for child in node if isinstance(getattr(child, "tag", None), str)]


def _has_class(node, class_name: str) -> bool:
    classes = (node.get("class") or "").split()
    return class_name in classes


def normalize_print_disclaimer_position(text: str) -> str:
    marker = '<div class="no-screen print-disclaimer">'
    if marker not in text:
        return text

    try:
        doc = lxml_html.fromstring(text)
    except Exception:
        return text

    bodies = doc.xpath("//body")
    if not bodies:
        return text

    body_children = _element_children(bodies[0])
    if len(body_children) != 1 or not _has_class(body_children[0], "container"):
        return text

    container_children = _element_children(body_children[0])
    if len(container_children) != 2:
        return text
    if not _has_class(container_children[0], "page"):
        return text
    if not (_has_class(container_children[1], "no-screen") and _has_class(container_children[1], "print-disclaimer")):
        return text

    disclaimer_index = text.rfind(marker)
    if disclaimer_index < 0:
        return text
    return text[:disclaimer_index] + "</div>\n" + text[disclaimer_index:]


def normalize_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = normalize_annex_802_header(path, original)
    updated, parsed = normalize_title_block(updated)
    updated = normalize_title_tag(updated, parsed)
    updated = normalize_company_subtitle(updated, subtitle_for(path))
    updated = normalize_meta_rows(path, updated)
    updated = normalize_page_shell(updated)
    updated = normalize_print_disclaimer_position(updated)
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

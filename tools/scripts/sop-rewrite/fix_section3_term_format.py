from __future__ import annotations

import html
import importlib.util
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SOP_ROOT = ROOT / "03-Tai-Lieu-Van-Hanh" / "01-SOPs"
SOURCE_SCRIPT = Path(__file__).with_name("research_redraft_sections_3_6_7.py")

SECTION3_RE = re.compile(
    r'(<h2 class="h2" id="p3">.*?</h2>)(.*?)(<h2 class="h2" id="p4">)',
    re.S,
)
TBODY_RE = re.compile(r"<tbody>.*?</tbody>", re.S)
CODE_RE = re.compile(r"\bSOP-\d{3}\b")
TERM_FORMAT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9/\-&,\.+ ]*\([^)]+\)$")


def load_source_module():
    spec = importlib.util.spec_from_file_location("section3_source", SOURCE_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load source module: {SOURCE_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def extract_code(path: Path) -> str:
    match = CODE_RE.search(path.read_text(encoding="utf-8", errors="replace"))
    if match:
        return match.group(0)
    slug_match = re.search(r"sop-(\d{3})-", path.name, re.I)
    if not slug_match:
        raise ValueError(f"Cannot determine SOP code for {path}")
    return f"SOP-{slug_match.group(1)}"


def build_tbody(rows: list[tuple[str, str]]) -> str:
    rendered = []
    for term, usage in rows:
        rendered.append(
            "<tr>"
            f"<td><b>{html.escape(term)}</b></td>"
            f"<td>{html.escape(usage)}</td>"
            "</tr>"
        )
    return "<tbody>" + "".join(rendered) + "</tbody>"


def validate_rows(rows: list[tuple[str, str]], code: str) -> None:
    for index, (term, _usage) in enumerate(rows, start=1):
        if not TERM_FORMAT_RE.match(term):
            raise ValueError(f"{code} row {index} violates term format: {term}")


def rewrite_section3(path: Path, rows: list[tuple[str, str]]) -> bool:
    text = path.read_text(encoding="utf-8")
    section_match = SECTION3_RE.search(text)
    if not section_match:
        raise ValueError(f"Section 3 block not found in {path}")

    section_body = section_match.group(2)
    tbody_match = TBODY_RE.search(section_body)
    if not tbody_match:
        raise ValueError(f"Section 3 tbody not found in {path}")

    new_body = (
        section_body[: tbody_match.start()]
        + build_tbody(rows)
        + section_body[tbody_match.end() :]
    )
    new_text = text[: section_match.start(2)] + new_body + text[section_match.end(2) :]
    if new_text == text:
        return False
    path.write_text(new_text, encoding="utf-8", newline="")
    return True


def audit_all(module) -> list[str]:
    problems: list[str] = []
    for path in sorted(SOP_ROOT.rglob("*.html")):
        text = path.read_text(encoding="utf-8", errors="replace")
        match = SECTION3_RE.search(text)
        if not match:
            continue
        tbody_match = TBODY_RE.search(match.group(2))
        if not tbody_match:
            problems.append(f"{path}: missing tbody in Section 3")
            continue
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tbody_match.group(0), re.S)
        for i in range(0, len(cells), 2):
            term = re.sub(r"<[^>]+>", " ", cells[i])
            term = html.unescape(re.sub(r"\s+", " ", term).strip())
            if not TERM_FORMAT_RE.match(term):
                problems.append(f"{path}: invalid term format: {term}")
    return problems


def main() -> None:
    module = load_source_module()
    term_rows_by_code: dict[str, list[tuple[str, str]]] = module.TERM_ROWS_BY_CODE

    updated = 0
    for path in sorted(SOP_ROOT.rglob("*.html")):
        code = extract_code(path)
        rows = term_rows_by_code.get(code)
        if not rows:
            continue
        validate_rows(rows, code)
        if rewrite_section3(path, rows):
            updated += 1
            print(f"UPDATED {path.relative_to(ROOT).as_posix()}")

    problems = audit_all(module)
    print(f"UPDATED_FILES={updated}")
    print(f"INVALID_ROWS={len(problems)}")
    for problem in problems:
        print(problem)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

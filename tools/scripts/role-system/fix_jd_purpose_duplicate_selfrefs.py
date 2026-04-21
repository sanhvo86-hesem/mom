#!/usr/bin/env python3
"""Remove duplicate self-referential role anchors from JD jd-purpose paragraphs.

Root cause: ``normalize_jd_purpose_intro`` in ``normalize_job_order_role_system.py``
captures every ``<a>`` in the first paragraph of ``.jd-purpose`` and re-appends
them after the intro. When the role-code linker has already wrapped the intro's
own role mentions in anchor tags, those intro anchors get copied into the
"JD này phải được đọc cùng ..." list on every run, accumulating duplicates.

This script surgically removes any ``<a class="entity-link role-link" href="<self>.html">``
that appears AFTER the text "JD này phải được đọc cùng " in the first paragraph of
each JD document. Intro anchors (before that separator) and legitimate
ANNEX/SOP/WI references are preserved.
"""

import argparse
import re
import sys
from pathlib import Path


DOCS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "mom" / "docs"


def clean_paragraph(paragraph: str, filename: str) -> tuple[str, int]:
    """Remove self-referential role-link anchors from the "đọc cùng" list."""
    sep = re.search(r"JD này phải được đọc cùng\s*", paragraph)
    if not sep:
        return paragraph, 0

    intro = paragraph[: sep.end()]
    tail = paragraph[sep.end() :]

    escaped_name = re.escape(filename)
    # Matches: <a class="entity-link role-link" href="<self>.html" ...>
    #          <span class="entity-code role-code">...</span></a>[, or whitespace]
    pattern = (
        r'<a class="entity-link role-link" href="'
        + escaped_name
        + r'"[^>]*>'
        r"<span class=\"entity-code role-code\">[^<]*</span>"
        r"</a>,?\s*"
    )

    cleaned_tail, count = re.subn(pattern, "", tail)
    if count == 0:
        return paragraph, 0

    # Collapse accidental leading comma from "đọc cùng , <annex>"
    cleaned_tail = re.sub(r"^\s*,\s*", "", cleaned_tail)
    return intro + cleaned_tail, count


def clean_file(path: Path, dry_run: bool = False) -> int:
    """Clean a single JD HTML file. Returns number of anchors removed."""
    content = path.read_text(encoding="utf-8")
    match = re.search(
        r'<div class="jd-purpose">\s*<p>.*?</p>\s*</div>', content, re.DOTALL
    )
    if not match:
        return 0

    block = match.group(0)
    new_block, removed = clean_paragraph(block, path.name)
    if removed == 0:
        return 0

    if not dry_run:
        new_content = content[: match.start()] + new_block + content[match.end() :]
        path.write_text(new_content, encoding="utf-8")
    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Report what would change without writing"
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=DOCS_ROOT,
        help=f"Docs root (default: {DOCS_ROOT})",
    )
    args = parser.parse_args()

    jd_files = [
        p for p in args.root.glob("**/jd-*.html") if "_Archive" not in p.parts
    ]
    jd_files.sort()

    total_removed = 0
    files_changed = 0
    for path in jd_files:
        removed = clean_file(path, dry_run=args.dry_run)
        if removed:
            files_changed += 1
            total_removed += removed
            marker = "[DRY]" if args.dry_run else "[FIX]"
            print(f"{marker} {removed:3d} anchors  {path.relative_to(args.root)}")

    action = "Would remove" if args.dry_run else "Removed"
    print(
        f"\nScanned {len(jd_files)} JD files. "
        f"{action} {total_removed} self-referential anchors across {files_changed} files."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

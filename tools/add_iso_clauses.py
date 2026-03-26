#!/usr/bin/env python3
"""
Add ISO 9001:2026 clause badges (<span class="iso-clause">) to all HTML files
that have iso-map sections with <div class="req"> elements.

Strategy:
  1. Find the iso-map section(s) in each file
  2. Within each iso-map, find <div class="req"> blocks
  3. Inside each req block, locate the inner text <div> and append a badge
     before its closing </div>
  4. Splice the modified iso-map back into the original file content,
     preserving all other content byte-for-byte.
"""

import os
import re
import sys
from pathlib import Path

# ── Root of the QMS repo ──
ROOT = Path(r"C:\Users\TEST4\qms.hesem.com.vn")

# ── Directories to skip ──
SKIP_DIRS = {"_build", ".claude", "core-standards", "_reports", "node_modules", ".git"}

# ── SOP -> primary ISO clause mapping ──
SOP_CLAUSE = {
    "SOP-101": "7.5",
    "SOP-102": "5.2",
    "SOP-103": "6.1",
    "SOP-104": "7.5.3",
    "SOP-105": "7.1.6",
    "SOP-106": "8.5.6",
    "SOP-107": "7.4",
    "SOP-108": "8.1",
    "SOP-201": "8.2",
    "SOP-202": "8.7",
    "SOP-203": "8.5.3",
    "SOP-301": "8.2.2",
    "SOP-302": "8.6",
    "SOP-303": "8.3.4",
    "SOP-401": "8.4",
    "SOP-402": "8.5.2",
    "SOP-501": "8.5.1",
    "SOP-502": "8.5.1",
    "SOP-503": "7.1.3",
    "SOP-504": "8.5.1",
    "SOP-505": "8.5.1",
    "SOP-601": "7.1.5",
    "SOP-602": "7.1.5.2",
    "SOP-603": "8.6",
    "SOP-604": "9.1.1",
    "SOP-605": "8.6",
    "SOP-606": "8.7",
    "SOP-701": "8.5.4",
    "SOP-702": "8.5.4",
    "SOP-703": "8.5.4",
    "SOP-801": "7.2",
    "SOP-802": "7.1.4",
    "SOP-803": "8.2.2",
    "SOP-804": "8.5.1",
    "SOP-901": "9.2",
    "SOP-902": "9.3",
    "SOP-903": "10.3",
}

# ── ANNEX series -> clause (inherit from parent SOP series) ──
ANNEX_SERIES_CLAUSE = {
    "1": "7.5",       # ANNEX-1xx -> 7.5
    "2": "8.2",       # ANNEX-2xx -> 8.2
    "3": "8.3",       # ANNEX-3xx -> 8.3
    "4": "8.4",       # ANNEX-4xx -> 8.4
    "5": "8.5.1",     # ANNEX-5xx -> 8.5.1
    "6": "9.1",       # ANNEX-6xx -> 9.1
    "7": "8.5.4",     # ANNEX-7xx -> 8.5.4
    "8": "7.2",       # ANNEX-8xx -> 7.2
    "9": "9.2",       # ANNEX-9xx -> 9.2
}

# ── WI series -> clause ──
WI_SERIES_CLAUSE = {
    "1": "7.5",
    "2": "8.6",
    "3": "8.6",
    "4": "8.4",
    "5": "8.5.1",
    "6": "9.1",
    "7": "8.5.4",
    "8": "7.2",
    "9": "9.1",
}

# ── Special file -> clause mappings ──
SPECIAL_FILE_CLAUSE = {
    "qms-man-001": "4",
    "pol-qms-001": "5.2",
    "pol-qms-002": "6.2",
    "dept-quality": "9.1",
    "dept-production": "8.5.1",
    "dept-engineering": "8.3",
    "dept-supply-chain": "8.4",
    "dept-sales": "8.2",
    "dept-hr": "7.2",
    "dept-finance": "8.2.2",
    "dept-it": "7.1.3",
    "dept-ehs": "7.1.4",
    "dept-epicor": "7.5",
    "authority-matrix": "5.3",
    "raci-master": "5.3",
    "role-gate-tests": "7.2",
    "SYS-OPS": "7.5",
    "TRN-OPS": "7.2",
}


def get_clause_for_file(filepath: Path) -> str | None:
    """Determine the ISO clause for a given file."""
    fname = filepath.stem.lower()
    fpath_lower = str(filepath).replace("\\", "/").lower()

    # SOP code: sop-101 etc.
    m = re.search(r'sop-(\d{3})', fname)
    if m:
        code = f"SOP-{m.group(1)}".upper()
        if code in SOP_CLAUSE:
            return SOP_CLAUSE[code]

    # ANNEX code: annex-101 etc.
    m = re.search(r'annex-(\d{3})', fname)
    if m:
        series = m.group(1)[0]
        if series in ANNEX_SERIES_CLAUSE:
            return ANNEX_SERIES_CLAUSE[series]

    # WI code: wi-201 etc.
    m = re.search(r'wi-(\d{3})', fname)
    if m:
        series = m.group(1)[0]
        if series in WI_SERIES_CLAUSE:
            return WI_SERIES_CLAUSE[series]

    # Special files (check filename and path)
    for key, clause in SPECIAL_FILE_CLAUSE.items():
        if key.lower() in fname or key.lower() in fpath_lower:
            return clause

    return None


def find_html_files(root: Path) -> list[Path]:
    """Find all .html files under root, skipping excluded directories."""
    results = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn.endswith(".html"):
                results.append(Path(dirpath) / fn)
    return results


# Regex to find the iso-map section(s)
ISO_MAP_RE = re.compile(
    r'(<div\s+class="iso-map"[^>]*>)(.*?)(</div>\s*(?=<(?:div\s+class="(?:preface|note|card)|!--|h[1-6]\s|script|section)|$))',
    re.DOTALL
)

# Inside an iso-map, find each <div class="req"> ... </div></div> block
# The req block contains: <span class="req-tag ...">TAG</span> then <div>text...</div>
# We want to insert our badge BEFORE the </div> that closes the inner text div.
#
# Pattern: find </div></div> at the end of a req block (possibly with whitespace)
# but we need to be careful - we target the LAST </div></div> sequence within each req.
REQ_BLOCK_RE = re.compile(
    r'<div\s+class="req">(.*?)</div>\s*</div>',
    re.DOTALL
)


def inject_badges_in_iso_map(iso_map_content: str, clause: str) -> tuple[str, int]:
    """
    Within the content of an iso-map div, find all req blocks and inject
    iso-clause badges. Returns (modified_content, count_of_badges_added).
    """
    badge = f' <span class="iso-clause">\u00a7{clause}</span>'
    count = 0

    def replace_req(m):
        nonlocal count
        inner = m.group(1)

        # Check if already has iso-clause
        if 'class="iso-clause"' in inner:
            return m.group(0)

        # Find the inner text div's closing </div>
        # The inner content is: <span class="req-tag ...">TAG</span> ... <div>text...</div>
        # We need to find the LAST </div> inside the inner content (which closes the text div)
        # and insert our badge before it.

        # Find the position of the last </div> in inner
        last_div_close = inner.rfind('</div>')
        if last_div_close == -1:
            return m.group(0)

        # Check content before the </div> - strip trailing whitespace to insert badge
        before = inner[:last_div_close].rstrip()
        after = inner[last_div_close:]

        # Reconstruct
        new_inner = before + badge + after
        count += 1
        return f'<div class="req">{new_inner}</div>\n</div>'

    # We need a more careful approach. The req block ends with </div>\s*</div>
    # where the first </div> closes the inner text div and the second closes the req div.
    # But there could be nested divs inside the text div (rare in this codebase).

    # Simpler approach: find each <div class="req"> and its matching close.
    # Since these are well-structured, let's split by req boundaries.

    # Actually, let's use a different strategy:
    # Find all occurrences of <div class="req"> and process them one by one
    # by tracking div nesting depth.

    result = []
    pos = 0
    req_start_re = re.compile(r'<div\s+class="req">')

    while pos < len(iso_map_content):
        m = req_start_re.search(iso_map_content, pos)
        if not m:
            result.append(iso_map_content[pos:])
            break

        # Append content before this req
        result.append(iso_map_content[pos:m.start()])

        # Now parse the req block by tracking div depth
        req_start = m.start()
        i = m.end()  # position after <div class="req">
        depth = 1  # we're inside one div

        while i < len(iso_map_content) and depth > 0:
            # Look for next <div or </div>
            next_open = iso_map_content.find('<div', i)
            next_close = iso_map_content.find('</div>', i)

            if next_close == -1:
                # Malformed, just bail
                break

            if next_open != -1 and next_open < next_close:
                # Check if it's actually a div tag (not e.g. <divine>)
                after_tag = iso_map_content[next_open+4:next_open+5] if next_open+4 < len(iso_map_content) else ''
                if after_tag in (' ', '>', '\n', '\r', '\t', '/'):
                    depth += 1
                i = next_open + 4
            else:
                depth -= 1
                if depth == 0:
                    # Found the closing </div> of the req
                    req_end = next_close + 6  # len('</div>') = 6
                    req_block = iso_map_content[req_start:req_end]

                    # Now inject the badge into this req block
                    if 'class="iso-clause"' not in req_block:
                        # Find the second-to-last </div> (the one closing the text div)
                        # The req block structure:
                        # <div class="req">...<div>text...</div></div>
                        # We want to insert before the inner </div>

                        # Find the last two </div> positions
                        last = req_block.rfind('</div>')
                        second_last = req_block.rfind('</div>', 0, last)

                        if second_last != -1:
                            # Insert badge before the second-to-last </div> close
                            insert_pos = second_last
                            before = req_block[:insert_pos].rstrip()
                            after_part = req_block[insert_pos:]
                            req_block = before + badge + after_part
                            count += 1

                    result.append(req_block)
                    pos = req_end
                    break
                i = next_close + 6
        else:
            # If we exited the while without break, just append remaining
            result.append(iso_map_content[pos:])
            pos = len(iso_map_content)
            continue

        if depth != 0:
            # Couldn't find proper close, just append as-is
            result.append(iso_map_content[req_start:])
            pos = len(iso_map_content)

    return ''.join(result), count


def find_iso_map_sections(content: str) -> list[tuple[int, int]]:
    """
    Find start and end positions of each <div class="iso-map">...</div> section.
    Uses div depth tracking to find the matching closing </div>.
    """
    sections = []
    search_start = 0
    iso_map_re = re.compile(r'<div\s+class="iso-map"[^>]*>')

    while True:
        m = iso_map_re.search(content, search_start)
        if not m:
            break

        start = m.start()
        i = m.end()
        depth = 1

        while i < len(content) and depth > 0:
            next_open = content.find('<div', i)
            next_close = content.find('</div>', i)

            if next_close == -1:
                break

            if next_open != -1 and next_open < next_close:
                after_tag = content[next_open+4:next_open+5] if next_open+4 < len(content) else ''
                if after_tag in (' ', '>', '\n', '\r', '\t', '/'):
                    depth += 1
                i = next_open + 4
            else:
                depth -= 1
                if depth == 0:
                    end = next_close + 6
                    sections.append((start, end))
                    break
                i = next_close + 6

        search_start = i if depth == 0 else i

    return sections


def process_file(filepath: Path) -> tuple[bool, str]:
    """Process a single HTML file. Returns (modified, message)."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Quick checks
    if 'class="iso-map"' not in content:
        return False, "no iso-map"

    if 'class="iso-clause"' in content:
        return False, "already has iso-clause"

    clause = get_clause_for_file(filepath)
    if not clause:
        return False, "no clause mapping found"

    # Find iso-map sections
    sections = find_iso_map_sections(content)
    if not sections:
        return False, "iso-map not found by parser"

    # Process sections in reverse order so positions remain valid
    total_badges = 0
    new_content = content
    for start, end in reversed(sections):
        iso_map_text = new_content[start:end]

        # Check for req divs
        if '<div class="req">' not in iso_map_text:
            continue

        modified_map, badge_count = inject_badges_in_iso_map(iso_map_text, clause)
        if badge_count > 0:
            new_content = new_content[:start] + modified_map + new_content[end:]
            total_badges += badge_count

    if total_badges == 0:
        return False, "no req divs to modify"

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True, f"added {total_badges} badge(s) with \u00a7{clause}"


def main():
    print("=" * 70)
    print("ISO 9001:2026 Clause Badge Injector")
    print("=" * 70)
    print()

    html_files = find_html_files(ROOT)
    print(f"Found {len(html_files)} HTML files total")
    print()

    modified_files = []
    skipped_counts: dict[str, int] = {}
    errors = []
    no_clause_files = []

    for fp in sorted(html_files):
        try:
            changed, msg = process_file(fp)
            if changed:
                modified_files.append((fp, msg))
                rel = fp.relative_to(ROOT)
                print(f"  [OK] {rel} -- {msg}")
            else:
                skipped_counts[msg] = skipped_counts.get(msg, 0) + 1
                if msg == "no clause mapping found":
                    no_clause_files.append(fp)
        except Exception as e:
            errors.append((fp, str(e)))
            rel = fp.relative_to(ROOT)
            print(f"  [ERR] {rel} -- {e}")

    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Modified:  {len(modified_files)} files")
    for reason, count in sorted(skipped_counts.items()):
        if count > 0:
            print(f"  Skipped ({reason}):  {count}")
    if errors:
        print(f"  Errors:    {len(errors)}")
        for fp, err in errors:
            print(f"    {fp.relative_to(ROOT)}: {err}")
    if no_clause_files:
        print()
        print("  Files with iso-map but no clause mapping:")
        for fp in no_clause_files:
            print(f"    {fp.relative_to(ROOT)}")
    print()

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())

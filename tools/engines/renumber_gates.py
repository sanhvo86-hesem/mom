#!/usr/bin/env python3
"""
renumber_gates.py  –  Migrate QMS docs from 6-gate (G0–G5) to 7-gate (G0–G6) system.

Gate mapping (OLD → NEW):
  G0 Contract   → G0 Contract   (unchanged)
  (new)         → G1 IQC        (inserted)
  OLD G1 Setup  → G2 Setup
  OLD G2 FAI    → G3 FAI
  OLD G3 IPQC   → G4 IPQC
  OLD G4 Final  → G5 Final QC
  OLD G5 Ship   → G6 Ship

Rules:
  - Only modify TEXT CONTENT (between > and <), never href/src attributes or file names.
  - Process HTML files, JS config files (01-data-config.js, 02-state-auth-ui.js, dict-data.js).
  - Skip _build, .git, .claude, 04-Bieu-Mau directories.
  - UTF-8 throughout.
"""

import os, re, sys
from pathlib import Path

ROOT = Path(r"C:\Users\TEST4\qms.hesem.com.vn")
SKIP_DIRS = {"_build", ".git", ".claude", "04-Bieu-Mau", "node_modules", "__pycache__"}

# ──────────────────────────────────────────────
# Counters
# ──────────────────────────────────────────────
stats = {"files_scanned": 0, "files_modified": 0, "replacements": 0}

# ──────────────────────────────────────────────
# Collect files
# ──────────────────────────────────────────────
def collect_files():
    """Collect all .html files (excluding SKIP_DIRS) + specific JS config files."""
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # Prune skipped directories
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel = os.path.relpath(dirpath, ROOT)
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            if fn.endswith(".html"):
                files.append(fp)
            # Also include the specific JS files
            elif fn in ("01-data-config.js", "02-state-auth-ui.js", "dict-data.js"):
                files.append(fp)
    return files


# ──────────────────────────────────────────────
# Text-node-only replacement engine for HTML
# ──────────────────────────────────────────────
# We split on HTML tags, <style>...</style>, <script>...</script> blocks,
# and HTML attribute zones. Only apply replacements to text segments.

def split_html_segments(html):
    """
    Split HTML into segments: (text, is_protected).
    Protected = inside tags, style blocks, script blocks.
    """
    # Pattern matches:
    #  1) <style ...>...</style>
    #  2) <script ...>...</script>
    #  3) Any HTML tag (including attributes)
    pattern = re.compile(
        r'(<style[\s>].*?</style>)'
        r'|(<script[\s>].*?</script>)'
        r'|(<[^>]+>)',
        re.DOTALL | re.IGNORECASE
    )
    segments = []
    last_end = 0
    for m in pattern.finditer(html):
        start, end = m.span()
        if start > last_end:
            segments.append((html[last_end:start], False))  # text node
        segments.append((html[start:end], True))  # protected
        last_end = end
    if last_end < len(html):
        segments.append((html[last_end:], False))
    return segments


def split_js_segments(js):
    """
    For JS files, split into string-literal segments (replaceable) and code (protected).
    We find quoted strings ('...' or "..." or `...`) and treat them as text.
    Everything else is code structure (protected from replacement).

    Actually, for JS files the gate references are ALL inside string literals,
    so we need to replace inside strings only. But to be safe, we'll replace
    in the whole file for JS since the patterns are specific enough.
    """
    # For JS config files, gate references are in string values.
    # The patterns are specific enough (G0–G5, etc.) that we can safely
    # do global replacement on the whole content.
    return [(js, False)]


# ──────────────────────────────────────────────
# Replacement rules (applied to text segments only)
# ──────────────────────────────────────────────

def apply_folder_path_renames(text):
    """
    Rename XX_GY folder-path patterns in reverse order using temp markers.
    06_G5 → 07_G6, 05_G4 → 06_G5, 04_G3 → 05_G4, 03_G2 → 04_G3, 02_G1 → 03_G2
    """
    count = 0

    # Step 1: rename to TEMP (reverse order to avoid collisions)
    for old, temp in [
        ("06_G5", "07_G6__TEMP__"),
        ("05_G4", "06_G5__TEMP__"),
        ("04_G3", "05_G4__TEMP__"),
        ("03_G2", "04_G3__TEMP__"),
        ("02_G1", "03_G2__TEMP__"),
    ]:
        if old in text:
            text = text.replace(old, temp)
            count += 1

    # Step 2: remove TEMP suffix
    for temp, final in [
        ("07_G6__TEMP__", "07_G6"),
        ("06_G5__TEMP__", "06_G5"),
        ("05_G4__TEMP__", "05_G4"),
        ("04_G3__TEMP__", "04_G3"),
        ("03_G2__TEMP__", "03_G2"),
    ]:
        text = text.replace(temp, final)

    return text, count


def apply_gate_description_renames(text):
    """
    Rename gate labels in descriptive contexts (tables, headings, prose).
    G5 → G6, G4 → G5, G3 → G4, G2 → G3, G1 → G2 (only OLD G1 = Setup context).

    We use temp markers to prevent double-renaming.
    """
    count = 0

    # --- Specific contextual patterns (reverse order: G5 first) ---

    # G5 patterns (Ship/Phê duyệt giao hàng)
    for pat, repl in [
        (r'\bG5\s*[—–\-]\s*Ship', 'G6__T__ — Ship'),
        (r'\bG5\s*[—–\-]\s*Phê duyệt giao hàng', 'G6__T__ — Phê duyệt giao hàng'),
        (r'3\.6\s+G5\b', '3.7 G6__T__'),
        # Generic "G5" preceded by gate-sequence context or after G4
    ]:
        new_text = re.sub(pat, repl, text)
        if new_text != text:
            count += 1
            text = new_text

    # G4 patterns (Final QC/Đóng gói)
    for pat, repl in [
        (r'\bG4\s*[—–\-]\s*Final\s*QC', 'G5__T__ — Final QC'),
        (r'\bG4\s*[—–\-]\s*Final\b', 'G5__T__ — Final'),
        (r'\bG4\s*[—–\-]\s*Đóng gói', 'G5__T__ — Đóng gói'),
        (r'3\.5\s+G4\b', '3.6 G5__T__'),
    ]:
        new_text = re.sub(pat, repl, text)
        if new_text != text:
            count += 1
            text = new_text

    # G3 patterns (IPQC)
    for pat, repl in [
        (r'\bG3\s*[—–\-]\s*IPQC', 'G4__T__ — IPQC'),
        (r'3\.4\s+G3\b', '3.5 G4__T__'),
    ]:
        new_text = re.sub(pat, repl, text)
        if new_text != text:
            count += 1
            text = new_text

    # G2 patterns (FAI/Mẫu đầu)
    for pat, repl in [
        (r'\bG2\s*[—–\-]\s*FAI', 'G3__T__ — FAI'),
        (r'\bG2\s*[—–\-]\s*Mẫu đầu', 'G3__T__ — Mẫu đầu'),
        (r'3\.3\s+G2\b', '3.4 G3__T__'),
    ]:
        new_text = re.sub(pat, repl, text)
        if new_text != text:
            count += 1
            text = new_text

    # G1 patterns (Setup/Phát hành) - only rename OLD G1
    for pat, repl in [
        (r'\bG1\s*[—–\-]\s*Setup', 'G2__T__ — Setup'),
        (r'\bG1\s*[—–\-]\s*Phát hành', 'G2__T__ — Phát hành'),
        (r'3\.2\s+G1\b', '3.3 G2__T__'),
    ]:
        new_text = re.sub(pat, repl, text)
        if new_text != text:
            count += 1
            text = new_text

    # --- Now handle standalone gate refs in known sequences ---
    # "G1, G3, G5" (QPL-1 gates) → "G2, G4, G6"
    new_text = re.sub(r'\bG1,\s*G3,\s*G5\b', 'G2__T__, G4__T__, G6__T__', text)
    if new_text != text:
        count += 1
        text = new_text

    # "Đã pass G1" → "Đã pass G2"
    new_text = re.sub(r'Đã pass G1\b', 'Đã pass G2__T__', text)
    if new_text != text:
        count += 1
        text = new_text

    # "Đã pass G2" → "Đã pass G3" (but not already-temped ones)
    new_text = re.sub(r'Đã pass G2\b(?!__T__)', 'Đã pass G3__T__', text)
    if new_text != text:
        count += 1
        text = new_text

    # "Đã pass G4" → "Đã pass G5"
    new_text = re.sub(r'Đã pass G4\b(?!__T__)', 'Đã pass G5__T__', text)
    if new_text != text:
        count += 1
        text = new_text

    # "pass G4" → "pass G5"  (for "đã pass G4")
    # Already handled above

    # Handle "chưa đạt G4" → "chưa đạt G5"
    new_text = re.sub(r'chưa đạt G4\b(?!__T__)', 'chưa đạt G5__T__', text)
    if new_text != text:
        count += 1
        text = new_text

    # Handle "G4 đã pass" → "G5 đã pass"
    new_text = re.sub(r'\bG4 đã pass\b', 'G5__T__ đã pass', text)
    if new_text != text:
        count += 1
        text = new_text

    # Remove temp markers
    text = text.replace("__T__", "")

    return text, count


def apply_range_renames(text):
    """Replace G0–G5 / G0-G5 / G0 → G5 ranges with G0–G6 / G0-G6 / G0 → G6."""
    count = 0

    for pat, repl in [
        (r'G0\s*–\s*G5', 'G0–G6'),
        (r'G0\s*-\s*G5', 'G0-G6'),
        (r'G0\s*→\s*G5', 'G0 → G6'),
    ]:
        new_text = re.sub(pat, repl, text)
        if new_text != text:
            count += 1
            text = new_text

    return text, count


def apply_count_renames(text):
    """Replace '6 gate' → '7 gate', '6 cổng' → '7 cổng'."""
    count = 0

    for pat, repl in [
        (r'\b6\s+gate\b', '7 gate'),
        (r'\b6\s+gates\b', '7 gates'),
        (r'\b6\s+cổng\b', '7 cổng'),
    ]:
        new_text = re.sub(pat, repl, text, flags=re.IGNORECASE)
        if new_text != text:
            count += 1
            text = new_text

    return text, count


def apply_all_text_replacements(text):
    """Apply all replacement rules to a text segment."""
    total = 0

    text, c = apply_folder_path_renames(text)
    total += c

    text, c = apply_gate_description_renames(text)
    total += c

    text, c = apply_range_renames(text)
    total += c

    text, c = apply_count_renames(text)
    total += c

    return text, total


# ──────────────────────────────────────────────
# Process a single file
# ──────────────────────────────────────────────
def process_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError) as e:
        print(f"  SKIP {filepath}: {e}")
        return False

    original = content
    stats["files_scanned"] += 1

    is_js = filepath.endswith(".js")

    if is_js:
        # For JS files, apply replacements to the whole content
        # (gate references are in string literals, patterns are specific enough)
        content, replacement_count = apply_all_text_replacements(content)
    else:
        # For HTML files, only replace in text nodes
        segments = split_html_segments(content)
        new_segments = []
        replacement_count = 0
        for text, is_protected in segments:
            if is_protected:
                new_segments.append(text)
            else:
                new_text, c = apply_all_text_replacements(text)
                new_segments.append(new_text)
                replacement_count += c
        content = "".join(new_segments)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        stats["files_modified"] += 1
        stats["replacements"] += replacement_count
        return True
    return False


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    # Force UTF-8 output on Windows
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("=" * 60)
    print("QMS Gate Renumbering: 6-gate (G0-G5) -> 7-gate (G0-G6)")
    print("=" * 60)

    files = collect_files()
    print(f"\nCollected {len(files)} files to scan.\n")

    modified_files = []
    for fp in sorted(files):
        rel = os.path.relpath(fp, ROOT)
        if process_file(fp):
            modified_files.append(rel)
            print(f"  MODIFIED  {rel}")

    print("\n" + "=" * 60)
    print(f"Files scanned:  {stats['files_scanned']}")
    print(f"Files modified: {stats['files_modified']}")
    print(f"Replacement operations: {stats['replacements']}")
    print("=" * 60)

    if modified_files:
        print("\nModified files:")
        for f in modified_files:
            print(f"  - {f}")

    print("\nDone.")


if __name__ == "__main__":
    main()

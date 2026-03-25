#!/usr/bin/env python3
"""
renumber_gates_8.py  –  Migrate QMS docs from 7-gate (G0–G6) to 8-gate (G0–G7) system.

Gate mapping (OLD → NEW):
  G0 Contract   → G0 Contract   (unchanged)
  (new)         → G1 Engineering (DFM, CAM/NC, baseline package — SOP-303, SOP-103)
  OLD G1 IQC    → G2 IQC
  OLD G2 Setup  → G3 Setup
  OLD G3 FAI    → G4 FAI
  OLD G4 IPQC   → G5 IPQC
  OLD G5 Final  → G6 Final QC
  OLD G6 Ship   → G7 Ship

Strategy:
  Single pass: Replace G6→TEMP_G7, G5→TEMP_G6, ..., G1→TEMP_G2 all using TEMP markers.
  Then at the very end, strip all TEMP markers.
  This avoids double-renumbering entirely.
"""

import os, re, sys, io
from pathlib import Path

ROOT = Path(r"C:\Users\TEST4\qms.hesem.com.vn")
SKIP_DIRS = {"_build", ".git", ".claude", "04-Bieu-Mau", "node_modules", "__pycache__", "tools", "_reports"}

# Temp marker - must be unique string that won't appear in content
T = "«TG»"

# ──────────────────────────────────────────────
# Collect files
# ──────────────────────────────────────────────
def collect_files():
    files = []

    target_dirs = [
        ROOT / "02-Tai-Lieu-He-Thong",
        ROOT / "03-Tai-Lieu-Van-Hanh",
        ROOT / "10-Training-Academy",
        ROOT / "11-Glossary",
    ]
    for tdir in target_dirs:
        if not tdir.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(tdir):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                fp = os.path.join(dirpath, fn)
                if fn.endswith(".html"):
                    files.append(fp)
                elif fn == "dict-data.js" and "11-Glossary" in dirpath:
                    files.append(fp)

    portal = ROOT / "01-QMS-Portal"
    for fn in ["index.html", "site-map.html", "book.html", "portal.html"]:
        fp = portal / fn
        if fp.exists():
            files.append(str(fp))

    cfg = portal / "scripts" / "portal" / "01-data-config.js"
    if cfg.exists():
        files.append(str(cfg))

    cs = ROOT / "core-standards"
    if cs.exists():
        for dirpath, dirnames, filenames in os.walk(cs):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if fn.endswith(".md") or fn.endswith(".html"):
                    files.append(os.path.join(dirpath, fn))

    return sorted(set(files))


# ──────────────────────────────────────────────
# HTML segment splitter
# ──────────────────────────────────────────────
_html_seg_re = re.compile(
    r'(<style[\s>].*?</style>)'
    r'|(<script[\s>].*?</script>)'
    r'|(<[^>]+>)',
    re.DOTALL | re.IGNORECASE
)

def split_html_segments(html):
    segments = []
    last_end = 0
    for m in _html_seg_re.finditer(html):
        start, end = m.span()
        if start > last_end:
            segments.append((html[last_end:start], False))
        segments.append((html[start:end], True))
        last_end = end
    if last_end < len(html):
        segments.append((html[last_end:], False))
    return segments


# ──────────────────────────────────────────────
# Replacement engine - ALL replacements use T marker, only stripped at the end
# ──────────────────────────────────────────────

def apply_all_gate_renames(text):
    """
    Apply ALL gate renaming in one pass using temp markers.
    Temp markers are NOT removed here - caller must strip them.
    Returns (text, count).
    """
    c = 0

    # ═══════════════════════════════════════════
    # 1. FOLDER PATH PATTERNS (most specific first)
    # ═══════════════════════════════════════════
    for old, new in [
        ("07_G6", f"08_G7{T}"),
        ("06_G5", f"07_G6{T}"),
        ("05_G4", f"06_G5{T}"),
        ("04_G3", f"05_G4{T}"),
        ("03_G2", f"04_G3{T}"),
        ("02_G1", f"03_G2{T}"),
    ]:
        n = text.count(old)
        if n > 0:
            text = text.replace(old, new)
            c += n

    # ═══════════════════════════════════════════
    # 2. MRR-Gx CODES (before general gate labels)
    # ═══════════════════════════════════════════
    for pat, repl in [
        (r'\bMRR-G6\b', f'MRR-G7{T}'),
        (r'\bMRR-G5\b', f'MRR-G6{T}'),
        (r'\bMRR-G4\b', f'MRR-G5{T}'),
        (r'\bMRR-G3\b', f'MRR-G4{T}'),
        (r'\bMRR-G2\b', f'MRR-G3{T}'),
        (r'\bMRR-G1\b', f'MRR-G2{T}'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # ═══════════════════════════════════════════
    # 3. GATE LABELS WITH EM-DASH/EN-DASH/HYPHEN (G6 — Ship, etc.)
    #    Reverse order to avoid collision.
    # ═══════════════════════════════════════════

    # G6 → G7
    for pat, repl in [
        (r'\bG6\s*[—–\-]\s*Ship', f'G7{T} — Ship'),
        (r'\bG6\s*[—–\-]\s*Phê duyệt giao hàng', f'G7{T} — Phê duyệt giao hàng'),
        (r'\bG6\s*[—–\-]\s*Giao hàng', f'G7{T} — Giao hàng'),
        (r'\bG6\s*[—–\-]\s*Release', f'G7{T} — Release'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # G5 → G6
    for pat, repl in [
        (r'\bG5\s*[—–\-]\s*Final\s*QC', f'G6{T} — Final QC'),
        (r'\bG5\s*[—–\-]\s*Final\b', f'G6{T} — Final'),
        (r'\bG5\s*[—–\-]\s*Đóng gói', f'G6{T} — Đóng gói'),
        (r'\bG5\s*[—–\-]\s*Kiểm tra cuối', f'G6{T} — Kiểm tra cuối'),
        (r'\bG5\s*[—–\-]\s*QC', f'G6{T} — QC'),
        (r'\bG5\s*[—–\-]\s*Packaging', f'G6{T} — Packaging'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # G4 → G5
    for pat, repl in [
        (r'\bG4\s*[—–\-]\s*IPQC', f'G5{T} — IPQC'),
        (r'\bG4\s*[—–\-]\s*Gia công', f'G5{T} — Gia công'),
        (r'\bG4\s*[—–\-]\s*Production', f'G5{T} — Production'),
        (r'\bG4\s*[—–\-]\s*Sản xuất', f'G5{T} — Sản xuất'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # G3 → G4
    for pat, repl in [
        (r'\bG3\s*[—–\-]\s*FAI', f'G4{T} — FAI'),
        (r'\bG3\s*[—–\-]\s*Mẫu đầu', f'G4{T} — Mẫu đầu'),
        (r'\bG3\s*[—–\-]\s*First', f'G4{T} — First'),
        (r'\bG3\s*[—–\-]\s*Sản xuất', f'G4{T} — Sản xuất'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # G2 → G3
    for pat, repl in [
        (r'\bG2\s*[—–\-]\s*Setup', f'G3{T} — Setup'),
        (r'\bG2\s*[—–\-]\s*Phát hành', f'G3{T} — Phát hành'),
        (r'\bG2\s*[—–\-]\s*Release', f'G3{T} — Release'),
        (r'\bG2\s*[—–\-]\s*Chuẩn bị', f'G3{T} — Chuẩn bị'),
        (r'\bG2\s*[—–\-]\s*Ra soat', f'G3{T} — Ra soat'),
        (r'\bG2\s*[—–\-]\s*Engineering', f'G3{T} — Engineering'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # G1 → G2
    for pat, repl in [
        (r'\bG1\s*[—–\-]\s*IQC', f'G2{T} — IQC'),
        (r'\bG1\s*[—–\-]\s*Incoming', f'G2{T} — Incoming'),
        (r'\bG1\s*[—–\-]\s*Nhận hàng', f'G2{T} — Nhận hàng'),
        (r'\bG1\s*[—–\-]\s*Nhận diện', f'G2{T} — Nhận diện'),
        (r'\bG1\s*[—–\-]\s*Review hợp đồng', f'G2{T} — Review hợp đồng'),
        (r'\bG1\s*[—–\-]\s*Contract', f'G2{T} — Contract'),
        (r'\bG1\s*[—–\-]\s*Kickoff', f'G2{T} — Kickoff'),
        (r'\bG1\s*[—–\-]\s*Khởi động', f'G2{T} — Khởi động'),
        (r'\bG1\s*[—–\-]\s*Hợp đồng', f'G2{T} — Hợp đồng'),
        (r'\bG1\s*[—–\-]\s*Kiểm tra đầu vào', f'G2{T} — Kiểm tra đầu vào'),
        (r'\bG1\s*[—–\-]\s*Tên gate', f'G2{T} — Tên gate'),
        (r'\bG1\s*[—–\-]\s*Kiem tra', f'G2{T} — Kiem tra'),
        (r'\bG1\s*[—–\-]\s*Ten gate', f'G2{T} — Ten gate'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # ═══════════════════════════════════════════
    # 4. Gx-DESCRIPTION PATTERNS (G6-Ship, G5-Final, etc.)
    # ═══════════════════════════════════════════
    for pat, repl in [
        (r'\bG6-Ship', f'G7{T}-Ship'),
        (r'\bG6-Release', f'G7{T}-Release'),
        (r'\bG5-Final', f'G6{T}-Final'),
        (r'\bG5-QC', f'G6{T}-QC'),
        (r'\bG5-Packaging', f'G6{T}-Packaging'),
        (r'\bG5-closeout', f'G6{T}-closeout'),
        (r'\bG5-kết', f'G6{T}-kết'),
        (r'\bG4-IPQC', f'G5{T}-IPQC'),
        (r'\bG4-Production', f'G5{T}-Production'),
        (r'\bG4-Sản', f'G5{T}-Sản'),
        (r'\bG4-Final', f'G5{T}-Final'),
        (r'\bG3-FAI', f'G4{T}-FAI'),
        (r'\bG3-First', f'G4{T}-First'),
        (r'\bG3-Mẫu', f'G4{T}-Mẫu'),
        (r'\bG3-SẢN', f'G4{T}-SẢN'),
        (r'\bG3-production', f'G4{T}-production'),
        (r'\bG2-Setup', f'G3{T}-Setup'),
        (r'\bG2-setup', f'G3{T}-setup'),
        (r'\bG2-Release', f'G3{T}-Release'),
        (r'\bG2-Engineering', f'G3{T}-Engineering'),
        (r'\bG1-IQC', f'G2{T}-IQC'),
        (r'\bG1-Incoming', f'G2{T}-Incoming'),
        (r'\bG1-Contract', f'G2{T}-Contract'),
        (r'\bG1-hợp', f'G2{T}-hợp'),
        (r'\bG1-contract', f'G2{T}-contract'),
        (r'\bG1-KHỞI', f'G2{T}-KHỞI'),
        (r'\bG1-kết', f'G2{T}-kết'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # ═══════════════════════════════════════════
    # 5. Gx SPACE DESCRIPTION (G6 Ship, G5 Final, etc.)
    # ═══════════════════════════════════════════
    for pat, repl in [
        (r'\bG6\s+Ship\b', f'G7{T} Ship'),
        (r'\bG5\s+Final\b', f'G6{T} Final'),
        (r'\bG5\s+Pack\b', f'G6{T} Pack'),
        (r'\bG4\s+IPQC\b', f'G5{T} IPQC'),
        (r'\bG4\s+Production\b', f'G5{T} Production'),
        (r'\bG3\s+FAI\b', f'G4{T} FAI'),
        (r'\bG3\s+Pack\b', f'G4{T} Pack'),
        (r'\bG2\s+Setup\b', f'G3{T} Setup'),
        (r'\bG2\s+Release\b', f'G3{T} Release'),
        (r'\bG2\s+Pack\b', f'G3{T} Pack'),
        (r'\bG1\s+IQC\b', f'G2{T} IQC'),
        (r'\bG1\s+Pack\b', f'G2{T} Pack'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # ═══════════════════════════════════════════
    # 6. QPL REFERENCES
    # ═══════════════════════════════════════════
    # "G1, G3, G5" → "G2, G4, G6" (if still present from old)
    text, n = re.subn(r'\bG1,\s*G3,\s*G5\b', f'G2{T}, G4{T}, G6{T}', text)
    c += n
    # "G2, G4, G6" → "G3, G5, G7" (current 7-gate QPL)
    text, n = re.subn(r'\bG2,\s*G4,\s*G6\b', f'G3{T}, G5{T}, G7{T}', text)
    c += n

    # ═══════════════════════════════════════════
    # 7. RANGE REFERENCES
    # ═══════════════════════════════════════════
    for pat, repl in [
        (r'G0\s*–\s*G6', f'G0–G7{T}'),
        (r'G0\s*-\s*G6', f'G0-G7{T}'),
        (r'G0\s*→\s*G6', f'G0 → G7{T}'),
        (r'G0\s*→\s*G5', f'G0 → G6{T}'),  # catch any remnant from old
        (r'G0\s+to\s+G6', f'G0 to G7{T}'),
    ]:
        text, n = re.subn(pat, repl, text)
        c += n

    # ═══════════════════════════════════════════
    # 8. COUNT REFERENCES
    # ═══════════════════════════════════════════
    for pat, repl in [
        (r'\b7\s+gate\b', '8 gate'),
        (r'\b7\s+gates\b', '8 gates'),
        (r'\b7\s+cổng\b', '8 cổng'),
        (r'\b7\s+cong\b', '8 cong'),
        (r'\b7-gate\b', '8-gate'),
    ]:
        text, n = re.subn(pat, repl, text, flags=re.IGNORECASE)
        c += n

    # ═══════════════════════════════════════════
    # 9. CONTEXTUAL STANDALONE Gx (only match untemped G1-G6)
    #    These handle "cổng kiểm soát G5", "Đã pass G4", etc.
    #    We use negative lookbehind/lookahead to skip already-temped ones.
    # ═══════════════════════════════════════════

    # Pattern to match a bare Gx NOT already followed by T marker and NOT part of a
    # larger token (not preceded by already-processed G, not inside folder path or MRR code)
    # We need a negative lookahead for T and ensure word boundary.
    # Also skip Gx that is preceded by digits (like 08_G7) since those are already handled.

    te = re.escape(T)

    # Helper: contextual Gx rename in specific Vietnamese/English phrases
    contextual_patterns = []
    for old_n, new_n in [(6, 7), (5, 6), (4, 5), (3, 4), (2, 3), (1, 2)]:
        old_g = f"G{old_n}"
        new_g = f"G{new_n}"
        # "cổng kiểm soát G6" → "cổng kiểm soát G7"
        contextual_patterns.append((
            rf'((?:[Cc]ổng)\s+kiểm\s+soát[:\s]*)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "gate G6" → "gate G7"
        contextual_patterns.append((
            rf'((?:gate|Gate|GATE)\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "Đã pass G6" → "Đã pass G7"
        contextual_patterns.append((
            rf'(Đã\s+pass\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "chưa đạt G6"
        contextual_patterns.append((
            rf'(chưa\s+đạt\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "G6 đã pass"
        contextual_patterns.append((
            rf'\b({old_g})\s+(đã\s+pass)\b(?!{te})',
            rf'{new_g}{T} \g<2>'
        ))
        # "Trước G2 phát hành" etc.
        contextual_patterns.append((
            rf'(Trước\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "Khi G3 được kích hoạt" etc.
        contextual_patterns.append((
            rf'(Khi\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "Sau G3" etc.
        contextual_patterns.append((
            rf'(Sau\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # "/ G3" (in table cells like "FAI / ... / G3")
        contextual_patterns.append((
            rf'(/\s*)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # Section numbers "3.7 G6" → "3.8 G7"
        sec_old = f"3.{old_n + 1}"
        sec_new = f"3.{new_n + 1}"
        contextual_patterns.append((
            rf'({re.escape(sec_old)}\s+)({old_g})\b(?!{te})',
            rf'{sec_new} {new_g}{T}'
        ))
        # "at G6", "pass G3", standalone context
        contextual_patterns.append((
            rf'(pass\s+)({old_g})\b(?!{te})',
            rf'\g<1>{new_g}{T}'
        ))
        # Bare "Gx." at end of sentence (e.g. "Thiếu MRR → STOP... G1.")
        contextual_patterns.append((
            rf'\b({old_g})\.(?!\d)(?!{te})',
            rf'{new_g}{T}.'
        ))
        # "Gx " followed by "Thiếu" / "Mở" / "phát" / "được" / "để"
        for follow in ['Thiếu', 'để', 'phát']:
            contextual_patterns.append((
                rf'\b({old_g})\s+({follow})',
                rf'{new_g}{T} \g<2>'
            ))

    for pat, repl in contextual_patterns:
        text, n = re.subn(pat, repl, text)
        c += n

    return text, c


# ──────────────────────────────────────────────
# Process a single file
# ──────────────────────────────────────────────
def process_file(filepath):
    # Special handling for 01-data-config.js
    if filepath.endswith("01-data-config.js"):
        return process_data_config(filepath)

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError) as e:
        print(f"  SKIP {filepath}: {e}")
        return 0

    original = content
    is_js = filepath.endswith(".js")
    is_md = filepath.endswith(".md")

    if is_js or is_md:
        content, replacement_count = apply_all_gate_renames(content)
        content = content.replace(T, "")
    else:
        segments = split_html_segments(content)
        new_segments = []
        replacement_count = 0
        for text, is_protected in segments:
            if is_protected:
                new_segments.append(text)
            else:
                new_text, c = apply_all_gate_renames(text)
                new_segments.append(new_text)
                replacement_count += c
        content = "".join(new_segments)
        content = content.replace(T, "")

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return replacement_count
    return 0


def process_data_config(filepath):
    """Only update exec_shortcuts_title line in 01-data-config.js."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError) as e:
        print(f"  SKIP {filepath}: {e}")
        return 0

    original = content
    c = 0

    content, n = re.subn(r"(exec_shortcuts_title.*?)G0–G6", r"\g<1>G0–G7", content)
    c += n
    content, n = re.subn(r"(exec_shortcuts_title.*?)G0-G6", r"\g<1>G0-G7", content)
    c += n

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return c
    return 0


def process_portal_index(filepath):
    """Special handling for portal index.html."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError) as e:
        print(f"  SKIP {filepath}: {e}")
        return 0

    original = content
    c = 0

    # The portal index has gate headers inside HTML tags, so we need to do
    # full-content replacement for these specific strings.
    replacements = [
        # Ship: G6 → G7
        ('G6 — Ship &amp; Release', f'G7{T} — Ship &amp; Release'),
        ('G6 — Ship', f'G7{T} — Ship'),
        # Final QC: G5 → G6
        ('G5 — Final QC &amp; Packaging', f'G6{T} — Final QC &amp; Packaging'),
        ('G5 — Final QC', f'G6{T} — Final QC'),
        # IPQC: G4 → G5
        ('G4 — IPQC &amp; Production', f'G5{T} — IPQC &amp; Production'),
        ('G4 — IPQC', f'G5{T} — IPQC'),
        # FAI: G3 → G4
        ('G3 — FAI &amp; First Piece', f'G4{T} — FAI &amp; First Piece'),
        ('G3 — FAI', f'G4{T} — FAI'),
        # Setup: G2 → G3
        ('G2 — Setup &amp; Release', f'G3{T} — Setup &amp; Release'),
        ('G2 — Setup', f'G3{T} — Setup'),
        # IQC: add G2 label
        ('IQC — Incoming', f'G2{T} — IQC &amp; Incoming'),
    ]

    for old, new in replacements:
        n = content.count(old)
        if n > 0:
            content = content.replace(old, new)
            c += n

    # Range references
    for old, new in [
        ('G0–G6', f'G0–G7{T}'),
        ('G0-G6', f'G0-G7{T}'),
        ('G0–G7', f'G0–G7{T}'),  # already updated, just temp-mark to be safe
    ]:
        n = content.count(old)
        if n > 0:
            content = content.replace(old, new)
            c += n

    content = content.replace(T, "")

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return c
    return 0


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("=" * 70)
    print("QMS Gate Renumbering: 7-gate (G0-G6) → 8-gate (G0-G7)")
    print("=" * 70)
    print()
    print("Gate mapping:")
    print("  G0 Contract    → G0 Contract    (unchanged)")
    print("  (NEW)          → G1 Engineering  (DFM, CAM/NC, baseline)")
    print("  G1 IQC         → G2 IQC")
    print("  G2 Setup       → G3 Setup")
    print("  G3 FAI         → G4 FAI")
    print("  G4 IPQC        → G5 IPQC")
    print("  G5 Final QC    → G6 Final QC")
    print("  G6 Ship        → G7 Ship")
    print()

    files = collect_files()
    print(f"Collected {len(files)} files to scan.\n")

    portal_index = str(ROOT / "01-QMS-Portal" / "index.html")

    modified = []
    total_files_scanned = 0
    total_replacements = 0

    for fp in files:
        total_files_scanned += 1
        rel = os.path.relpath(fp, ROOT)

        if fp == portal_index:
            c = process_portal_index(fp)
        else:
            c = process_file(fp)

        if c > 0:
            modified.append((rel, c))
            total_replacements += c

    print("-" * 90)
    print(f"{'File':<80} {'Repl':>6}")
    print("-" * 90)
    for rel, c in sorted(modified):
        print(f"  {rel:<78} {c:>6}")

    print()
    print("=" * 70)
    print(f"Files scanned:      {total_files_scanned}")
    print(f"Files modified:     {len(modified)}")
    print(f"Total replacements: {total_replacements}")
    print("=" * 70)
    print("\nDone.")


if __name__ == "__main__":
    main()

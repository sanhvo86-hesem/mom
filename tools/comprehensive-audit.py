#!/usr/bin/env python3
"""Comprehensive QMS Document System Audit"""
import os
import re
import glob
import random
from collections import defaultdict
from pathlib import Path

BASE = r"C:\Users\TEST4\qms.hesem.com.vn"
EXCLUDE_DIRS = {"_build", ".claude", ".git", "_Deleted", "04-Bieu-Mau"}

# Collect all in-scope HTML files
all_files = []
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for f in files:
        if f.endswith(".html"):
            all_files.append(os.path.join(root, f))

all_files.sort()

# Categorize
sop_files = [f for f in all_files if os.path.basename(f).startswith("sop-")]
wi_files = [f for f in all_files if os.path.basename(f).startswith("wi-")]
annex_files = [f for f in all_files if os.path.basename(f).lower().startswith("annex-")]
other_files = [f for f in all_files if f not in sop_files and f not in wi_files and f not in annex_files]

results = {
    "pass": [],
    "fail": [],
    "warn": []
}

report_lines = []

def rel(path):
    return os.path.relpath(path, BASE).replace("\\", "/")

def add_pass(section, desc, count=None):
    c = f" ({count})" if count is not None else ""
    report_lines.append(f"  PASS: {desc}{c}")
    results["pass"].append((section, desc))

def add_fail(section, desc, items, count=None):
    c = f" ({count if count is not None else len(items)})"
    report_lines.append(f"  FAIL: {desc}{c}")
    for item in items[:50]:
        report_lines.append(f"    - {item}")
    if len(items) > 50:
        report_lines.append(f"    ... and {len(items)-50} more")
    results["fail"].append((section, desc, items))

def add_warn(section, desc, items, count=None):
    c = f" ({count if count is not None else len(items)})"
    report_lines.append(f"  WARNING: {desc}{c}")
    for item in items[:30]:
        report_lines.append(f"    - {item}")
    if len(items) > 30:
        report_lines.append(f"    ... and {len(items)-30} more")
    results["warn"].append((section, desc, items))

def section_header(name):
    report_lines.append("")
    report_lines.append(f"{'='*60}")
    report_lines.append(f"=== {name} ===")
    report_lines.append(f"{'='*60}")

# Cache file contents
file_cache = {}
def read_file(path):
    if path not in file_cache:
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                file_cache[path] = f.read()
        except:
            file_cache[path] = ""
    return file_cache[path]

print(f"Auditing {len(all_files)} HTML files...")
print(f"  SOPs: {len(sop_files)}, WIs: {len(wi_files)}, Annexes: {len(annex_files)}, Other: {len(other_files)}")

# ============================================================
# 1. CSS SYNTAX HEALTH
# ============================================================
section_header("1. CSS SYNTAX HEALTH")

css_brace_errors = []
css_broken_selectors = []
css_orphaned_props = []
files_with_style = 0

for fpath in all_files:
    content = read_file(fpath)
    # Extract inline style blocks
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
    if not style_blocks:
        continue
    files_with_style += 1

    for block in style_blocks:
        # Count braces
        opens = block.count('{')
        closes = block.count('}')
        if opens != closes:
            css_brace_errors.append(f"{rel(fpath)}: {{ = {opens}, }} = {closes}, diff = {opens - closes}")

        # Check for broken selectors (selector ending with comma then empty line or closing brace)
        broken = re.findall(r'[a-zA-Z0-9\-_\.\#\]\)],\s*\n\s*\n', block)
        if broken:
            css_broken_selectors.append(f"{rel(fpath)}: {len(broken)} broken selector(s)")

        # Check for orphaned properties (property: value; outside of {})
        # Simple heuristic: lines with property:value that aren't inside braces
        lines = block.split('\n')
        brace_depth = 0
        for line in lines:
            stripped = line.strip()
            brace_depth += stripped.count('{') - stripped.count('}')
            if brace_depth == 0 and ':' in stripped and ';' in stripped:
                if not stripped.startswith('/*') and not stripped.startswith('@'):
                    css_orphaned_props.append(f"{rel(fpath)}: orphaned property: {stripped[:80]}")

if css_brace_errors:
    add_fail("CSS", "Files with mismatched CSS braces", css_brace_errors)
else:
    add_pass("CSS", f"All {files_with_style} files with <style> blocks have balanced braces")

if css_broken_selectors:
    add_fail("CSS", "Files with broken CSS selectors", css_broken_selectors)
else:
    add_pass("CSS", "No broken CSS selectors found")

if css_orphaned_props:
    add_warn("CSS", "Potential orphaned CSS properties outside rules", css_orphaned_props)
else:
    add_pass("CSS", "No orphaned CSS properties detected")

# ============================================================
# 2. HTML STRUCTURE INTEGRITY
# ============================================================
section_header("2. HTML STRUCTURE INTEGRITY")

table_imbalance = []
div_imbalance = []
no_style_block = []
no_style_css_link = []

for fpath in all_files:
    content = read_file(fpath)
    rp = rel(fpath)

    # Table balance
    open_tables = len(re.findall(r'<table[\s>]', content, re.IGNORECASE))
    close_tables = len(re.findall(r'</table>', content, re.IGNORECASE))
    if open_tables != close_tables:
        table_imbalance.append(f"{rp}: <table>={open_tables}, </table>={close_tables}")

    # Div balance
    open_divs = len(re.findall(r'<div[\s>]', content, re.IGNORECASE))
    close_divs = len(re.findall(r'</div>', content, re.IGNORECASE))
    if open_divs != close_divs:
        div_imbalance.append(f"{rp}: <div>={open_divs}, </div>={close_divs}")

    # Style block exists
    has_style = bool(re.search(r'<style[\s>]', content, re.IGNORECASE))
    if not has_style:
        no_style_block.append(rp)

    # style.css link
    has_css_link = bool(re.search(r'href="[^"]*assets/style\.css"', content, re.IGNORECASE))
    if not has_css_link:
        no_style_css_link.append(rp)

if table_imbalance:
    add_fail("HTML", "Files with unbalanced <table> tags", table_imbalance)
else:
    add_pass("HTML", f"All {len(all_files)} files have balanced <table> tags")

if div_imbalance:
    add_warn("HTML", "Files with unbalanced <div> tags", div_imbalance)
else:
    add_pass("HTML", f"All {len(all_files)} files have balanced <div> tags")

if no_style_block:
    add_warn("HTML", "Files without inline <style> block", no_style_block)
else:
    add_pass("HTML", f"All {len(all_files)} files have <style> blocks")

if no_style_css_link:
    add_fail("HTML", "Files missing style.css link", no_style_css_link)
else:
    add_pass("HTML", f"All {len(all_files)} files link to style.css")

# ============================================================
# 3. 8-GATE SYSTEM CONSISTENCY
# ============================================================
section_header("3. 8-GATE SYSTEM CONSISTENCY")

old_gate_refs = {
    "G0-G5": [],
    "G0-G6": [],
    "6 gate": [],
    "7 gate": [],
    "6 cong": [],
    "7 cong": [],
}

old_numbering = {
    "G1.*IQC": [],
    "G2.*Setup": [],
}

gate_note_missing = []

for fpath in all_files:
    content = read_file(fpath)
    rp = rel(fpath)
    content_lower = content.lower()

    if "g0-g5" in content_lower or "g0–g5" in content_lower or "g0 – g5" in content_lower:
        old_gate_refs["G0-G5"].append(rp)
    if "g0-g6" in content_lower or "g0–g6" in content_lower or "g0 – g6" in content_lower:
        old_gate_refs["G0-G6"].append(rp)
    if re.search(r'6\s*gate', content_lower):
        old_gate_refs["6 gate"].append(rp)
    if re.search(r'7\s*gate', content_lower):
        old_gate_refs["7 gate"].append(rp)
    if re.search(r'6\s*c\u1ed5ng', content_lower):
        old_gate_refs["6 cong"].append(rp)
    if re.search(r'7\s*c\u1ed5ng', content_lower):
        old_gate_refs["7 cong"].append(rp)

    # Old numbering check
    if re.search(r'G1\s*[\u2014\-–:]\s*IQC', content):
        old_numbering["G1.*IQC"].append(rp)
    if re.search(r'G2\s*[\u2014\-–:]\s*Setup', content):
        old_numbering["G2.*Setup"].append(rp)

for pattern, files_list in old_gate_refs.items():
    if files_list:
        add_fail("8-Gate", f"Old reference '{pattern}' found", files_list)
    else:
        add_pass("8-Gate", f"No old reference '{pattern}' found")

for pattern, files_list in old_numbering.items():
    if files_list:
        add_fail("8-Gate", f"Old gate numbering '{pattern}' found", files_list)
    else:
        add_pass("8-Gate", f"No old gate numbering '{pattern}'")

# Check gate mapping note in SOPs, WIs, Annexes
sop_wi_annex = sop_files + wi_files + annex_files
for fpath in sop_wi_annex:
    content = read_file(fpath)
    # Check for 8-gate or gate mapping reference
    has_gate_ref = bool(re.search(r'8[\s-]*gate|8[\s-]*c\u1ed5ng|G0.*G7|gate-grid|gate-card', content, re.IGNORECASE))
    if not has_gate_ref:
        gate_note_missing.append(rel(fpath))

if gate_note_missing:
    add_warn("8-Gate", "Files without 8-gate mapping reference (SOPs/WIs/Annexes)", gate_note_missing)
else:
    add_pass("8-Gate", "All SOPs/WIs/Annexes have 8-gate mapping reference")

# ============================================================
# 4. TRANSLATION ARTIFACTS
# ============================================================
section_header("4. TRANSLATION ARTIFACTS")

double_paren_files = []
nested_dup_files = []
english_remnant_files = []

# Common standalone English words that should not appear in Vietnamese text
english_words = [
    r'\bSection\b', r'\bPurpose\b', r'\bScope\b', r'\bResponsibility\b',
    r'\bDefinitions\b', r'\bReferences\b', r'\bProcedure\b', r'\bRecords\b',
    r'\bAppendix\b', r'\bAttachment\b', r'\bNote:\b', r'\bWarning:\b',
    r'\bImportant:\b', r'\bStep\s+\d', r'\bTable of Contents\b',
]

for fpath in all_files:
    content = read_file(fpath)
    rp = rel(fpath)

    # Double parentheses
    double_parens = len(re.findall(r'\(\(', content))
    if double_parens > 2:
        double_paren_files.append(f"{rp}: {double_parens} occurrences of '(('")

    # Nested duplicate: "word (word ("
    nested_dups = re.findall(r'(\w+)\s*\(\1\s*\(', content, re.IGNORECASE)
    if nested_dups:
        nested_dup_files.append(f"{rp}: {len(nested_dups)} nested duplicates")

    # English remnants (only check body content, skip tags/attributes)
    body_match = re.search(r'<body[^>]*>(.*)</body>', content, re.DOTALL | re.IGNORECASE)
    if body_match:
        body_text = re.sub(r'<[^>]+>', ' ', body_match.group(1))  # strip tags
        eng_count = 0
        found_words = []
        for pattern in english_words:
            matches = re.findall(pattern, body_text)
            if matches:
                eng_count += len(matches)
                found_words.extend(matches[:2])
        if eng_count > 3:
            english_remnant_files.append(f"{rp}: {eng_count} English words ({', '.join(found_words[:4])})")

if double_paren_files:
    add_warn("Translation", "Files with excessive '((' double parentheses", double_paren_files)
else:
    add_pass("Translation", "No excessive double parentheses found")

if nested_dup_files:
    add_fail("Translation", "Files with nested duplicate text", nested_dup_files)
else:
    add_pass("Translation", "No nested duplicate text found")

if english_remnant_files:
    add_warn("Translation", "Files with potential untranslated English words", english_remnant_files)
else:
    add_pass("Translation", "No obvious untranslated English remnants")

# ============================================================
# 5. DESIGN SYSTEM COMPLIANCE
# ============================================================
section_header("5. DESIGN SYSTEM COMPLIANCE")

# SOPs
sop_missing_components = []
sop_low_gates = []
sop_required = ["form-header", "iso-map", "preface-block"]
sop_gate_required = ["gate-grid", "gate-card"]

for fpath in sop_files:
    content = read_file(fpath)
    rp = rel(fpath)
    missing = []
    for comp in sop_required:
        if comp not in content:
            missing.append(comp)

    has_gate = any(g in content for g in sop_gate_required)
    if not has_gate:
        missing.append("gate-grid/gate-card")

    if "table-card" not in content:
        missing.append("table-card")

    if missing:
        sop_missing_components.append(f"{rp}: missing {', '.join(missing)}")

    # Gate card count
    gate_count = content.count("gate-card")
    if gate_count > 0 and gate_count < 3:
        sop_low_gates.append(f"{rp}: only {gate_count} gate-card(s)")

if sop_missing_components:
    add_fail("Design-SOP", "SOPs missing required components", sop_missing_components)
else:
    add_pass("Design-SOP", f"All {len(sop_files)} SOPs have required components")

if sop_low_gates:
    add_warn("Design-SOP", "SOPs with fewer than 3 gate-cards", sop_low_gates)
else:
    add_pass("Design-SOP", "All SOPs with gate-cards have >= 3")

# WIs
wi_missing_header = []
wi_stub_files = []

for fpath in wi_files:
    content = read_file(fpath)
    rp = rel(fpath)

    if "form-header" not in content:
        wi_missing_header.append(rp)

    fsize = os.path.getsize(fpath)
    if fsize < 2048:
        wi_stub_files.append(f"{rp}: {fsize} bytes")

if wi_missing_header:
    add_fail("Design-WI", "WIs missing form-header", wi_missing_header)
else:
    add_pass("Design-WI", f"All {len(wi_files)} WIs have form-header")

if wi_stub_files:
    add_warn("Design-WI", "WI files that may be stubs (< 2KB)", wi_stub_files)
else:
    add_pass("Design-WI", f"All {len(wi_files)} WIs are >= 2KB")

# Annexes
annex_missing_header = []

for fpath in annex_files:
    content = read_file(fpath)
    rp = rel(fpath)

    if "form-header" not in content:
        annex_missing_header.append(rp)

if annex_missing_header:
    add_fail("Design-Annex", "Annexes missing form-header", annex_missing_header)
else:
    add_pass("Design-Annex", f"All {len(annex_files)} Annexes have form-header")

# ============================================================
# 6. PRINT READINESS
# ============================================================
section_header("6. PRINT READINESS")

inline_media_print = []
orphaned_page_break = []
bad_style_css_path = []

for fpath in all_files:
    content = read_file(fpath)
    rp = rel(fpath)

    # Inline @media print in HTML style blocks
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)
    for block in style_blocks:
        if '@media print' in block or '@media\nprint' in block:
            inline_media_print.append(rp)
            break

    # Orphaned page-break outside @media print in style blocks
    for block in style_blocks:
        # Remove @media print blocks first
        stripped = re.sub(r'@media\s+print\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}', '', block)
        if 'page-break' in stripped:
            orphaned_page_break.append(rp)
            break

    # Check style.css path
    css_links = re.findall(r'href="([^"]*style\.css[^"]*)"', content, re.IGNORECASE)
    for link in css_links:
        # Verify the relative path resolves to an existing file
        fdir = os.path.dirname(fpath)
        resolved = os.path.normpath(os.path.join(fdir, link))
        if not os.path.exists(resolved):
            bad_style_css_path.append(f"{rp}: href=\"{link}\" -> file not found")

if inline_media_print:
    add_fail("Print", "Files with inline @media print rules in HTML", inline_media_print)
else:
    add_pass("Print", "No inline @media print rules found in HTML files")

if orphaned_page_break:
    add_warn("Print", "Files with page-break rules outside @media print", orphaned_page_break)
else:
    add_pass("Print", "No orphaned page-break rules found")

if bad_style_css_path:
    add_fail("Print", "Files with broken style.css paths", bad_style_css_path)
else:
    add_pass("Print", "All style.css paths resolve correctly")

# ============================================================
# 7. LINK INTEGRITY (Sample Check)
# ============================================================
section_header("7. LINK INTEGRITY (Sample Check)")

# Pick 10 random SOPs
sample_sops = random.sample(sop_files, min(10, len(sop_files)))
broken_links = []
total_links_checked = 0

for fpath in sample_sops:
    content = read_file(fpath)
    rp = rel(fpath)
    fdir = os.path.dirname(fpath)

    # Find internal href links (not http, not #, not javascript)
    links = re.findall(r'href="([^"#][^"]*\.html[^"]*)"', content, re.IGNORECASE)
    for link in links:
        if link.startswith('http') or link.startswith('javascript'):
            continue
        # Strip query string and fragment
        clean_link = link.split('#')[0].split('?')[0]
        resolved = os.path.normpath(os.path.join(fdir, clean_link))
        total_links_checked += 1
        if not os.path.exists(resolved):
            broken_links.append(f"{rp}: -> {clean_link}")

report_lines.append(f"  (Sampled {len(sample_sops)} SOPs, checked {total_links_checked} internal links)")

if broken_links:
    add_fail("Links", "Broken internal links found", broken_links)
else:
    add_pass("Links", f"All {total_links_checked} sampled internal links are valid")

# ============================================================
# 8. METADATA CONSISTENCY
# ============================================================
section_header("8. METADATA CONSISTENCY")

required_metadata = ["Code", "Version", "Effective Date", "Owner", "Approved"]
# Alternative Vietnamese names
meta_patterns = {
    "Code": [r'M[aã]\s*s[oố]', r'Code', r'Document\s*Code', r'form-code'],
    "Version": [r'Phi[eê]n\s*b[aả]n', r'Version', r'Rev\.?', r'form-version'],
    "Effective Date": [r'Ng[aà]y\s*hi[eệ]u\s*l[uự]c', r'Effective\s*Date', r'form-date'],
    "Owner": [r'Ch[uủ]\s*tr[iì]', r'Owner', r'Responsible', r'form-owner'],
    "Approved": [r'Ph[eê]\s*duy[eệ]t', r'Approved', r'form-approved'],
}

files_with_header = 0
meta_missing = defaultdict(list)
meta_empty = []

# Only check files that have form-header
for fpath in all_files:
    content = read_file(fpath)
    rp = rel(fpath)

    if "form-header" not in content:
        continue
    files_with_header += 1

    for field, patterns in meta_patterns.items():
        found = False
        for pat in patterns:
            if re.search(pat, content, re.IGNORECASE):
                found = True
                break
        if not found:
            meta_missing[field].append(rp)

for field in required_metadata:
    missing = meta_missing.get(field, [])
    if missing:
        add_warn("Metadata", f"Files missing '{field}' metadata (among form-header files)", missing)
    else:
        add_pass("Metadata", f"All {files_with_header} form-header files have '{field}'")

# ============================================================
# SUMMARY
# ============================================================
report_lines.append("")
report_lines.append("="*60)
report_lines.append("=== SUMMARY ===")
report_lines.append("="*60)

total_pass = len(results["pass"])
total_fail = len(results["fail"])
total_warn = len(results["warn"])
total_checks = total_pass + total_fail + total_warn

compliance_pct = (total_pass / total_checks * 100) if total_checks > 0 else 0

report_lines.append(f"")
report_lines.append(f"  Total files audited: {len(all_files)}")
report_lines.append(f"    SOPs: {len(sop_files)}, WIs: {len(wi_files)}, Annexes: {len(annex_files)}, Other: {len(other_files)}")
report_lines.append(f"")
report_lines.append(f"  PASS:    {total_pass}")
report_lines.append(f"  FAIL:    {total_fail}")
report_lines.append(f"  WARNING: {total_warn}")
report_lines.append(f"  Overall compliance: {compliance_pct:.1f}%")
report_lines.append(f"")

# Priority fix list
report_lines.append("  --- TOP PRIORITY FIXES ---")
priority_items = []
for section, desc, items in results["fail"]:
    priority_items.append((len(items), section, desc, items))
priority_items.sort(reverse=True)

for i, (count, section, desc, items) in enumerate(priority_items[:10], 1):
    report_lines.append(f"  {i}. [{section}] {desc} - {count} file(s)")
    for item in items[:3]:
        report_lines.append(f"       {item}")
    if count > 3:
        report_lines.append(f"       ... +{count-3} more")

if not priority_items:
    report_lines.append("  No critical failures found!")

report_lines.append("")
report_lines.append("--- END OF AUDIT REPORT ---")

# Write report
header = [
    "COMPREHENSIVE QMS DOCUMENT SYSTEM AUDIT",
    f"Date: 2026-03-26",
    f"Total files in scope: {len(all_files)}",
    f"SOPs: {len(sop_files)} | WIs: {len(wi_files)} | Annexes: {len(annex_files)} | Other: {len(other_files)}",
    "",
]

output_path = os.path.join(BASE, "_reports", "comprehensive-audit-final.txt")
with open(output_path, "w", encoding="utf-8") as f:
    for line in header:
        f.write(line + "\n")
    for line in report_lines:
        f.write(line + "\n")

print(f"\nReport written to: {output_path}")
print(f"\nQuick Summary: PASS={total_pass}, FAIL={total_fail}, WARN={total_warn}, Compliance={compliance_pct:.1f}%")

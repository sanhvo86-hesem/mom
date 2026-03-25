#!/usr/bin/env python3
"""
HESEM QMS — Comprehensive Graphics/Format Consistency Audit
Scans all HTML documents against the core-standards design system.
"""

import os
import re
import json
from collections import defaultdict, Counter
from pathlib import Path
from datetime import datetime

ROOT = r"C:\Users\TEST4\qms.hesem.com.vn"
EXCLUDE_DIRS = {"_build", ".claude", ".git", "_Deleted", "04-Bieu-Mau", "node_modules", "__pycache__"}

# ── Standard color palette from design system ──
STANDARD_CSS_VARS = {
    "--navy", "--blue", "--blue-l", "--gold", "--gold-l",
    "--th-bg", "--th-bdr", "--red", "--green",
    "--ink", "--ink2", "--ink3", "--ink4",
    "--bg", "--bg2", "--bg3",
    "--ln", "--ln2",
    "--r", "--r-sm", "--r-lg",
    "--font", "--mono"
}

# Allowed hex colors from the design system (palette + supplementary)
STANDARD_COLORS = {
    "#0c2d48", "#1565c0", "#e3f2fd", "#f9a825", "#fff8e1",
    "#eef4fb", "#b8d4f0", "#e03131", "#2f9e44",
    "#212529", "#495057", "#868e96", "#adb5bd",
    "#ffffff", "#f8f9fa", "#f1f3f5",
    "#dee2e6", "#e9ecef",
    # Supplementary colors from design system
    "#fafcfe", "#f0f4ff", "#eef6ff", "#eef7ff", "#f8fafc",
    "#fff5f5", "#fff9db", "#ebfbee", "#fffbeb", "#f3f0ff", "#fffdf5", "#fcfcfd",
    "#e6fcf5", "#fff4e6",
    "#087f5b", "#d9480f", "#364fc7", "#2b8a3e", "#e67700", "#c92a2a",
    "#1864ab", "#1971c2", "#243b6b", "#b45309", "#0369a1", "#7e22ce", "#047857",
    "#1d4ed8", "#2563eb", "#0f766e", "#7950f2", "#eab308", "#94a3b8",
    "#dbe4ff", "#d3f9d8", "#fff3bf", "#ffe3e3",
    "#ffc9c9", "#ffe066", "#b2f2bb", "#d0bfff",
    "#90caf9", "#ffe082", "#cfe0ff",
    "#96f2d7", "#ffd8a8",
    "#e0f2fe", "#fff3e0", "#f3e8ff", "#ecfdf5",
    "#e7f5ff", "#eef2ff",
    "#333", "#333333", "#999", "#999999", "#fff", "#000",
    "#d1d5db",  # used in doc-content table fallback
    "#000000",
    # Common near-black/white variations
    "#f5f5f5", "#fafafa", "#f0f0f0", "#e0e0e0",
    "#ccc", "#cccccc", "#ddd", "#dddddd", "#eee", "#eeeeee",
}

# Normalize to lowercase 6-char for comparison
def normalize_hex(h):
    h = h.lower().strip()
    if len(h) == 4:  # #abc -> #aabbcc
        h = "#" + h[1]*2 + h[2]*2 + h[3]*2
    return h

STANDARD_COLORS_NORM = {normalize_hex(c) for c in STANDARD_COLORS}

# Standard font stack keywords
STANDARD_FONT_KEYWORDS = {
    "var(--font)", "-apple-system", "segoe ui", "tahoma", "noto sans",
    "arial unicode ms", "roboto", "helvetica", "arial", "sans-serif",
    "var(--mono)", "sf mono", "cascadia code", "fira code", "consolas", "monospace",
    "inherit", "system-ui"
}


def find_html_files():
    """Find all HTML files excluding specified directories."""
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # Modify dirnames in-place to skip excluded dirs
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn.lower().endswith(".html"):
                files.append(os.path.join(dirpath, fn))
    return sorted(files)


def get_relative_path(filepath):
    return os.path.relpath(filepath, ROOT).replace("\\", "/")


def extract_style_block(content):
    """Extract all inline <style> blocks."""
    return re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)


def audit_file(filepath):
    """Run all audit checks on a single HTML file."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    relpath = get_relative_path(filepath)
    result = {"path": relpath, "issues": [], "info": {}}

    # ── A. CSS Method Check ──
    style_blocks = extract_style_block(content)
    has_inline_style = len(style_blocks) > 0
    has_external_link = bool(re.search(r'<link[^>]*style\.css[^>]*>', content, re.IGNORECASE))

    if has_inline_style and has_external_link:
        result["info"]["css_method"] = "both"
    elif has_inline_style:
        result["info"]["css_method"] = "inline_only"
    elif has_external_link:
        result["info"]["css_method"] = "external_only"
    else:
        result["info"]["css_method"] = "none"
        result["issues"].append(("MAJOR", "No CSS at all — neither inline <style> nor external style.css link"))

    # ── B. Template Structure Check ──
    has_form_header = 'class="form-header"' in content or "class='form-header'" in content
    has_iso_map = 'class="iso-map"' in content or "class='iso-map'" in content
    has_preface = 'class="preface-block"' in content or "class='preface-block'" in content
    has_gate_grid = 'class="gate-grid"' in content or "class='gate-grid'" in content
    has_title_tag = bool(re.search(r'<title[^>]*>.+?</title>', content, re.DOTALL | re.IGNORECASE))
    has_print_media = bool(re.search(r'@media\s+print', content, re.IGNORECASE))
    has_notranslate = 'notranslate' in content or 'skiptranslate' in content
    has_container = 'class="container"' in content
    has_page = 'class="page"' in content or 'class="page ' in content
    has_page_body = 'class="page-body"' in content

    result["info"]["has_form_header"] = has_form_header
    result["info"]["has_iso_map"] = has_iso_map
    result["info"]["has_preface"] = has_preface
    result["info"]["has_gate_grid"] = has_gate_grid
    result["info"]["has_title"] = has_title_tag
    result["info"]["has_print_media"] = has_print_media
    result["info"]["has_notranslate"] = has_notranslate
    result["info"]["has_container"] = has_container
    result["info"]["has_page"] = has_page
    result["info"]["has_page_body"] = has_page_body

    if not has_form_header:
        # Check if it's a portal/index page (which may not need form-header)
        is_portal = "portal" in relpath.lower() or "index" in relpath.lower()
        if not is_portal:
            result["issues"].append(("MAJOR", "Missing form-header (standard metadata block)"))

    if not has_title_tag:
        result["issues"].append(("MINOR", "Missing <title> tag"))
    elif has_title_tag:
        title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.DOTALL | re.IGNORECASE)
        if title_match:
            title_text = title_match.group(1).strip()
            if "HESEM" not in title_text and "hesem" not in title_text.lower():
                result["issues"].append(("MINOR", f"Title tag does not contain 'HESEM QMS': '{title_text[:60]}'"))

    if not has_print_media:
        result["issues"].append(("MINOR", "Missing @media print rules"))

    if not has_container:
        result["issues"].append(("MINOR", "Missing .container wrapper"))

    if not has_page:
        result["issues"].append(("MINOR", "Missing .page wrapper"))

    if not has_page_body:
        result["issues"].append(("MINOR", "Missing .page-body wrapper"))

    # ── C. Color/Font Consistency Check (for inline styles) ──
    inline_css = "\n".join(style_blocks)

    # Check CSS variables usage
    uses_css_vars = bool(re.search(r'var\(--', inline_css))
    defines_root_vars = bool(re.search(r':root\s*\{', inline_css))

    result["info"]["uses_css_vars"] = uses_css_vars
    result["info"]["defines_root_vars"] = defines_root_vars

    # Find hardcoded colors in inline CSS
    hex_colors_in_css = re.findall(r'#[0-9a-fA-F]{3,8}\b', inline_css)
    non_standard_colors_css = set()
    for color in hex_colors_in_css:
        norm = normalize_hex(color)
        if norm not in STANDARD_COLORS_NORM and len(norm) in (4, 7):
            non_standard_colors_css.add(color.lower())

    if non_standard_colors_css and len(non_standard_colors_css) > 3:
        result["issues"].append(("MINOR", f"Non-standard colors in inline CSS ({len(non_standard_colors_css)}): {', '.join(sorted(non_standard_colors_css)[:8])}"))

    # Check font-family declarations in inline CSS
    font_decls = re.findall(r'font-family\s*:\s*([^;}{]+)', inline_css, re.IGNORECASE)
    for fdecl in font_decls:
        fdecl_lower = fdecl.lower().strip()
        if "var(--font)" not in fdecl_lower and "var(--mono)" not in fdecl_lower and "inherit" not in fdecl_lower:
            # Check if it uses standard font names
            is_standard = any(kw in fdecl_lower for kw in STANDARD_FONT_KEYWORDS)
            if not is_standard:
                result["issues"].append(("MINOR", f"Non-standard font-family in inline CSS: {fdecl.strip()[:60]}"))

    # ── D. Component Usage Check ──
    components_found = []
    component_checks = {
        "note-blue": r'class="[^"]*\bnote-blue\b',
        "note-soft": r'class="[^"]*\bnote-soft\b',
        "note-green": r'class="[^"]*\bnote-green\b',  # Non-standard check
        "callout-danger": r'class="[^"]*\bcallout-danger\b',
        "callout-info": r'class="[^"]*\bcallout-info\b',
        "callout-warn": r'class="[^"]*\bcallout-warn\b',
        "table": r'class="[^"]*\btable\b',
        "table-card": r'class="[^"]*\btable-card\b',
        "card": r'class="[^"]*\bcard\b',
        "badge": r'class="[^"]*\bbadge\b',
        "badge-soft": r'class="[^"]*\bbadge-soft\b',
        "vflow": r'class="[^"]*\bvflow\b',
        "metric-card": r'class="[^"]*\bmetric-card\b',
        "gate-card": r'class="[^"]*\bgate-card\b',
        "note": r'class="[^"]*\bnote\b[^-]',
        "callout": r'class="[^"]*\bcallout\b[^-]',
        "iso-map": r'class="[^"]*\biso-map\b',
        "preface-block": r'class="[^"]*\bpreface-block\b',
        "toc": r'class="[^"]*\btoc\b[^-]',
        "form-table": r'class="[^"]*\bform-table\b',
        "docx-table": r'class="[^"]*\bdocx-table\b',
    }
    for comp_name, pattern in component_checks.items():
        if re.search(pattern, content, re.IGNORECASE):
            components_found.append(comp_name)

    result["info"]["components"] = components_found

    # ── E. Non-Standard Elements Check ──

    # Count inline style attributes
    inline_style_attrs = re.findall(r'\bstyle="[^"]*"', content, re.IGNORECASE)
    inline_style_count = len(inline_style_attrs)
    result["info"]["inline_style_count"] = inline_style_count

    if inline_style_count > 20:
        result["issues"].append(("MINOR", f"Excessive inline style attributes: {inline_style_count} found"))
    if inline_style_count > 50:
        # Upgrade to MAJOR if extremely excessive
        result["issues"].append(("MAJOR", f"Extremely excessive inline styles: {inline_style_count} — suggests non-standard formatting"))

    # Check for hardcoded colors in inline style attributes
    non_standard_inline = set()
    for attr in inline_style_attrs:
        hex_in_attr = re.findall(r'#[0-9a-fA-F]{3,8}\b', attr)
        for h in hex_in_attr:
            norm = normalize_hex(h)
            if norm not in STANDARD_COLORS_NORM:
                non_standard_inline.add(h.lower())

    if non_standard_inline and len(non_standard_inline) > 3:
        result["issues"].append(("MINOR", f"Non-standard colors in inline style attrs ({len(non_standard_inline)}): {', '.join(sorted(non_standard_inline)[:6])}"))

    # Tables without proper CSS class
    all_tables = re.findall(r'<table\b([^>]*)>', content, re.IGNORECASE)
    tables_without_class = 0
    for t_attrs in all_tables:
        if not re.search(r'class="[^"]*\b(table|form-table|docx-table|tbl|iso-matrix|assessment-matrix|rubric|rule-table|require-table)\b', t_attrs, re.IGNORECASE):
            tables_without_class += 1

    if tables_without_class > 0:
        result["issues"].append(("MINOR", f"{tables_without_class} <table> element(s) without standard CSS class"))

    # Images without alt text
    imgs = re.findall(r'<img\b([^>]*)>', content, re.IGNORECASE)
    imgs_no_alt = 0
    for img_attrs in imgs:
        if 'alt=' not in img_attrs.lower():
            imgs_no_alt += 1

    if imgs_no_alt > 0:
        result["issues"].append(("MINOR", f"{imgs_no_alt} <img> element(s) without alt text"))

    # Check for non-standard font sizes in inline styles
    font_sizes_inline = re.findall(r'font-size\s*:\s*([^;}"]+)', "\n".join(inline_style_attrs))
    # This is informational, not flagged unless very unusual

    # ── Determine doc type from path ──
    relpath_lower = relpath.lower()
    if "/01-sops/" in relpath_lower or "/sop-" in relpath_lower:
        result["info"]["doc_type"] = "SOP"
        # SOPs should have iso-map or preface
        if not has_iso_map and not has_preface:
            result["issues"].append(("MINOR", "SOP missing iso-map or preface-block"))
    elif "/02-work-instructions/" in relpath_lower or "/wi-" in relpath_lower:
        result["info"]["doc_type"] = "WI"
    elif "/03-reference/" in relpath_lower or "/annex-" in relpath_lower:
        result["info"]["doc_type"] = "ANNEX"
    elif "/jd-" in relpath_lower or "job-description" in relpath_lower:
        result["info"]["doc_type"] = "JD"
    elif "portal" in relpath_lower or "index" in relpath_lower:
        result["info"]["doc_type"] = "PORTAL"
    elif "/dept-handbook" in relpath_lower or "handbook" in relpath_lower:
        result["info"]["doc_type"] = "HANDBOOK"
    else:
        result["info"]["doc_type"] = "OTHER"

    return result


def categorize(result):
    """Categorize file into COMPLIANT/MINOR/MAJOR/LEGACY."""
    majors = sum(1 for sev, _ in result["issues"] if sev == "MAJOR")
    minors = sum(1 for sev, _ in result["issues"] if sev == "MINOR")

    info = result["info"]

    # LEGACY: no form-header AND no CSS AND no standard structure
    if not info.get("has_form_header") and info.get("css_method") == "none":
        return "LEGACY"

    # LEGACY: no container/page/page-body AND no form-header
    if not info.get("has_container") and not info.get("has_page") and not info.get("has_form_header"):
        return "LEGACY"

    if majors >= 2:
        return "LEGACY"

    if majors >= 1:
        return "MAJOR"

    if minors == 0:
        return "COMPLIANT"

    if minors <= 2:
        return "MINOR"

    # More than 2 minor issues
    return "MAJOR"


def generate_report(results):
    """Generate the comprehensive audit report."""
    # Categorize all files
    categories = {"COMPLIANT": [], "MINOR": [], "MAJOR": [], "LEGACY": []}
    for r in results:
        cat = categorize(r)
        r["category"] = cat
        categories[cat].append(r)

    lines = []
    lines.append("=" * 80)
    lines.append("HESEM QMS — GRAPHICS/FORMAT CONSISTENCY AUDIT REPORT")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Standard: core-standards design system v7")
    lines.append(f"CSS Reference: assets/style.css v7")
    lines.append("=" * 80)

    # ── Executive Summary ──
    lines.append("")
    lines.append("EXECUTIVE SUMMARY")
    lines.append("-" * 40)
    lines.append(f"Total HTML files scanned: {len(results)}")
    lines.append("")
    for cat in ["COMPLIANT", "MINOR", "MAJOR", "LEGACY"]:
        count = len(categories[cat])
        pct = count / len(results) * 100 if results else 0
        lines.append(f"  {cat:12s}: {count:4d} files ({pct:5.1f}%)")

    lines.append("")

    # CSS method breakdown
    css_methods = Counter(r["info"]["css_method"] for r in results)
    lines.append("CSS Approach Breakdown:")
    for method, count in css_methods.most_common():
        lines.append(f"  {method:16s}: {count:4d} files")

    lines.append("")

    # Doc type breakdown
    doc_types = Counter(r["info"]["doc_type"] for r in results)
    lines.append("Document Type Breakdown:")
    for dtype, count in doc_types.most_common():
        lines.append(f"  {dtype:12s}: {count:4d} files")

    lines.append("")

    # Component usage stats
    comp_counter = Counter()
    for r in results:
        for c in r["info"].get("components", []):
            comp_counter[c] += 1
    lines.append("Standard Component Usage (across all files):")
    for comp, count in comp_counter.most_common():
        lines.append(f"  {comp:20s}: {count:4d} files")

    lines.append("")

    # Template structure stats
    struct_stats = {
        "form-header": sum(1 for r in results if r["info"].get("has_form_header")),
        "iso-map": sum(1 for r in results if r["info"].get("has_iso_map")),
        "preface-block": sum(1 for r in results if r["info"].get("has_preface")),
        "gate-grid": sum(1 for r in results if r["info"].get("has_gate_grid")),
        "<title> tag": sum(1 for r in results if r["info"].get("has_title")),
        "@media print": sum(1 for r in results if r["info"].get("has_print_media")),
        "container": sum(1 for r in results if r["info"].get("has_container")),
        "page": sum(1 for r in results if r["info"].get("has_page")),
        "page-body": sum(1 for r in results if r["info"].get("has_page_body")),
    }
    lines.append("Template Structure Adoption:")
    for struct, count in struct_stats.items():
        pct = count / len(results) * 100 if results else 0
        lines.append(f"  {struct:20s}: {count:4d} / {len(results)} ({pct:5.1f}%)")

    # ── Detailed findings by category ──
    for cat in ["LEGACY", "MAJOR", "MINOR", "COMPLIANT"]:
        lines.append("")
        lines.append("=" * 80)
        lines.append(f"CATEGORY: {cat} ({len(categories[cat])} files)")
        lines.append("=" * 80)

        if cat == "COMPLIANT":
            lines.append("")
            lines.append("These files follow the core-standards design system fully.")
            lines.append("")
            for r in categories[cat]:
                lines.append(f"  [OK] {r['path']}")
                lines.append(f"       CSS: {r['info']['css_method']} | Type: {r['info']['doc_type']} | Components: {', '.join(r['info'].get('components', [])) or 'basic'}")
            continue

        if not categories[cat]:
            lines.append("  (none)")
            continue

        for r in categories[cat]:
            lines.append("")
            lines.append(f"  FILE: {r['path']}")
            lines.append(f"  Type: {r['info']['doc_type']} | CSS: {r['info']['css_method']} | Inline styles: {r['info'].get('inline_style_count', 0)}")
            if r["issues"]:
                for sev, msg in r["issues"]:
                    lines.append(f"    [{sev}] {msg}")
            else:
                lines.append(f"    (no specific issues detected)")

    # ── Priority upgrade list ──
    lines.append("")
    lines.append("=" * 80)
    lines.append("PRIORITY UPGRADE LIST")
    lines.append("=" * 80)
    lines.append("")
    lines.append("Files sorted by severity (LEGACY first, then MAJOR), with specific actions needed.")
    lines.append("")

    priority_order = []
    for cat in ["LEGACY", "MAJOR"]:
        for r in categories[cat]:
            priority_order.append(r)

    for i, r in enumerate(priority_order, 1):
        lines.append(f"{i:3d}. [{r['category']}] {r['path']}")
        lines.append(f"     Type: {r['info']['doc_type']} | CSS: {r['info']['css_method']}")
        lines.append(f"     Actions needed:")

        info = r["info"]
        actions = []

        if info.get("css_method") == "none":
            actions.append("Add <link> to assets/style.css OR add inline <style> with design system variables")
        if info.get("css_method") == "inline_only":
            actions.append("Add <link href='../../assets/style.css' rel='stylesheet'/> for shared base styles")
        if not info.get("has_form_header") and r["info"]["doc_type"] != "PORTAL":
            actions.append("Add standard form-header block with logo/company/title/meta")
        if not info.get("has_title"):
            actions.append("Add <title>CODE - TITLE | HESEM QMS</title>")
        if not info.get("has_print_media"):
            actions.append("Add @media print rules for proper printing")
        if not info.get("has_container"):
            actions.append("Wrap content in <div class='container'><div class='page'><div class='page-body'>")

        for sev, msg in r["issues"]:
            if "Non-standard colors" in msg:
                actions.append("Replace hardcoded colors with CSS variables (--navy, --blue, --gold, etc.)")
                break

        for sev, msg in r["issues"]:
            if "Excessive inline style" in msg or "Extremely excessive" in msg:
                actions.append("Refactor inline style attributes to use standard CSS classes")
                break

        for sev, msg in r["issues"]:
            if "without standard CSS class" in msg:
                actions.append("Add .table / .form-table / .docx-table class to <table> elements")
                break

        for sev, msg in r["issues"]:
            if "without alt text" in msg:
                actions.append("Add alt attributes to all <img> elements")
                break

        if not actions:
            actions.append("Review and align with current design system template")

        for a in actions:
            lines.append(f"       - {a}")

    # ── Summary statistics at end ──
    lines.append("")
    lines.append("=" * 80)
    lines.append("ISSUE FREQUENCY ANALYSIS")
    lines.append("=" * 80)
    lines.append("")

    issue_freq = Counter()
    for r in results:
        for sev, msg in r["issues"]:
            # Generalize the message for counting
            if "Non-standard colors in inline CSS" in msg:
                key = f"[{sev}] Non-standard colors in inline CSS"
            elif "Non-standard colors in inline style attrs" in msg:
                key = f"[{sev}] Non-standard colors in inline style attributes"
            elif "Excessive inline style" in msg:
                key = f"[{sev}] Excessive inline style attributes (>20)"
            elif "Extremely excessive" in msg:
                key = f"[{sev}] Extremely excessive inline styles (>50)"
            elif "<table>" in msg:
                key = f"[{sev}] Tables without standard CSS class"
            elif "<img>" in msg:
                key = f"[{sev}] Images without alt text"
            else:
                key = f"[{sev}] {msg[:70]}"
            issue_freq[key] += 1

    for issue, count in issue_freq.most_common():
        lines.append(f"  {count:4d}x  {issue}")

    lines.append("")
    lines.append("=" * 80)
    lines.append("END OF REPORT")
    lines.append("=" * 80)

    return "\n".join(lines)


def main():
    print("Scanning for HTML files...")
    html_files = find_html_files()
    print(f"Found {len(html_files)} HTML files to audit.")

    results = []
    for filepath in html_files:
        try:
            result = audit_file(filepath)
            results.append(result)
        except Exception as e:
            results.append({
                "path": get_relative_path(filepath),
                "issues": [("MAJOR", f"Could not parse file: {str(e)}")],
                "info": {"css_method": "unknown", "doc_type": "ERROR"},
                "category": "LEGACY"
            })

    print(f"Audited {len(results)} files. Generating report...")

    report = generate_report(results)

    report_path = os.path.join(ROOT, "_reports", "graphics-audit-report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Report written to: {report_path}")

    # Print summary
    cats = Counter(r.get("category", "UNKNOWN") for r in results)
    print(f"\nSummary: COMPLIANT={cats.get('COMPLIANT',0)}, MINOR={cats.get('MINOR',0)}, MAJOR={cats.get('MAJOR',0)}, LEGACY={cats.get('LEGACY',0)}")


if __name__ == "__main__":
    main()

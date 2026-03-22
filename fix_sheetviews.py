#!/usr/bin/env python3
"""
Fix sheetViews corruption: remove orphaned pane references from selection elements.
When freeze panes are removed but selection still references pane="bottomLeft",
Excel triggers recovery.
"""
import os, sys, zipfile, re, shutil, tempfile


def fix_sheetviews_xml(xml_content):
    """Fix sheetViews in a sheet XML string."""
    changed = False

    # Pattern: selection has pane="bottomLeft" (or topRight, bottomRight)
    # but there's no <pane> element in the same sheetView
    def fix_sheetview(match):
        nonlocal changed
        sv_block = match.group(0)

        # Check if there's a <pane> element
        has_pane = '<pane ' in sv_block

        if not has_pane:
            # Remove pane attribute from selection elements
            new_sv = re.sub(r'\s+pane="[^"]*"', '', sv_block)
            if new_sv != sv_block:
                changed = True
                return new_sv

        return sv_block

    result = re.sub(
        r'<sheetView[^>]*>.*?</sheetView>',
        fix_sheetview,
        xml_content,
        flags=re.DOTALL
    )

    return result, changed


def fix_file(filepath):
    """Fix sheetViews in all sheets of an xlsx file."""
    fname = os.path.basename(filepath)
    any_fixed = False

    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            entries = {}
            for item in z.infolist():
                entries[item.filename] = z.read(item.filename)
    except Exception as e:
        return fname, False, f"READ ERROR: {e}"

    # Fix each sheet
    for name in list(entries.keys()):
        if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
            content = entries[name].decode('utf-8')
            fixed_content, changed = fix_sheetviews_xml(content)
            if changed:
                entries[name] = fixed_content.encode('utf-8')
                any_fixed = True

    if not any_fixed:
        return fname, False, "OK (no view issues)"

    # Write fixed file
    tmpfd, tmppath = tempfile.mkstemp(suffix='.xlsx')
    os.close(tmpfd)

    try:
        with zipfile.ZipFile(tmppath, 'w', zipfile.ZIP_DEFLATED) as zout:
            for name, data in entries.items():
                zout.writestr(name, data)
        shutil.move(tmppath, filepath)
        return fname, True, "FIXED"
    except Exception as e:
        if os.path.exists(tmppath):
            os.remove(tmppath)
        return fname, False, f"WRITE ERROR: {e}"


def main():
    base = os.path.join(os.path.dirname(__file__), '04-Bieu-Mau')
    files = []
    for root, dirs, fnames in os.walk(base):
        if '_build' in root or '00-FORM-DESIGN-SYSTEM' in root:
            continue
        for f in fnames:
            if f.startswith('FRM-') and f.endswith('.xlsx') and not f.startswith('~'):
                files.append(os.path.join(root, f))
    files.sort()

    print(f"{'='*70}")
    print(f"FIX SHEETVIEWS - Remove orphaned pane references")
    print(f"Files: {len(files)}")
    print(f"{'='*70}")

    fixed = 0
    for i, fp in enumerate(files, 1):
        fname, was_fixed, msg = fix_file(fp)
        if was_fixed:
            fixed += 1
            print(f"[{i:3d}] FIXED: {fname}")
        # Only print if verbose
        elif '--verbose' in sys.argv:
            print(f"[{i:3d}] OK:    {fname}")

    print(f"\nTotal: {len(files)}, Fixed: {fixed}")


if __name__ == '__main__':
    main()

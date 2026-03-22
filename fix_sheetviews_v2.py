#!/usr/bin/env python3
"""
Fix sheetViews corruption v2: remove orphaned pane="bottomLeft" from selection.
When there's no <pane> element, selection must NOT reference a pane.
"""
import os, zipfile, re, shutil, tempfile


def fix_file(filepath):
    fname = os.path.basename(filepath)

    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            entries = {}
            for item in z.infolist():
                entries[item.filename] = z.read(item.filename)
    except Exception as e:
        return fname, False, str(e)

    fixed_sheets = 0
    for name in list(entries.keys()):
        if not (name.startswith('xl/worksheets/sheet') and name.endswith('.xml')):
            continue

        content = entries[name].decode('utf-8')
        original = content

        def clean_sheetview(match):
            block = match.group(0)
            if '<pane ' not in block:
                block = re.sub(r' pane="[^"]*"', '', block)
            return block

        content = re.sub(
            r'<sheetView[^>]*>.*?</sheetView>',
            clean_sheetview, content, flags=re.DOTALL
        )

        if content != original:
            entries[name] = content.encode('utf-8')
            fixed_sheets += 1

    if fixed_sheets == 0:
        return fname, False, "OK"

    tmpfd, tmppath = tempfile.mkstemp(suffix='.xlsx')
    os.close(tmpfd)
    try:
        with zipfile.ZipFile(tmppath, 'w', zipfile.ZIP_DEFLATED) as zout:
            for name, data in entries.items():
                zout.writestr(name, data)
        shutil.move(tmppath, filepath)
        return fname, True, f"{fixed_sheets} sheets"
    except Exception as e:
        if os.path.exists(tmppath):
            os.remove(tmppath)
        return fname, False, str(e)


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

    fixed = 0
    for fp in files:
        fname, was_fixed, msg = fix_file(fp)
        if was_fixed:
            fixed += 1
            print(f"FIXED: {fname} ({msg})")

    print(f"\nTotal: {len(files)}, Fixed: {fixed}")


if __name__ == '__main__':
    main()

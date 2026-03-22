#!/usr/bin/env python3
"""Fix duplicate entries in xlsx zip files caused by injection."""
import os, zipfile, shutil, tempfile

def fix_zip(filepath):
    """Remove duplicate entries from xlsx zip, keeping only the last version."""
    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            names = z.namelist()
            unique = set(names)
            if len(names) == len(unique):
                return False  # No duplicates
    except:
        return False

    # Has duplicates - rebuild with only unique entries (last wins)
    tmpfd, tmppath = tempfile.mkstemp(suffix='.xlsx')
    os.close(tmpfd)

    try:
        with zipfile.ZipFile(filepath, 'r') as zin:
            # Build map: name -> last occurrence data
            entries = {}
            for item in zin.infolist():
                entries[item.filename] = zin.read(item.filename)

            with zipfile.ZipFile(tmppath, 'w', zipfile.ZIP_DEFLATED) as zout:
                for name, data in entries.items():
                    zout.writestr(name, data)

        shutil.move(tmppath, filepath)
        return True
    except Exception as e:
        if os.path.exists(tmppath):
            os.remove(tmppath)
        print(f"  ERROR: {e}")
        return False

def main():
    base = os.path.join(os.path.dirname(__file__), '04-Bieu-Mau')
    fixed = 0
    total = 0
    for root, dirs, fnames in os.walk(base):
        if '_build' in root:
            continue
        for f in fnames:
            if f.startswith('FRM-') and f.endswith('.xlsx') and not f.startswith('~'):
                fp = os.path.join(root, f)
                total += 1
                if fix_zip(fp):
                    fixed += 1
                    print(f"  FIXED: {f}")

    print(f"\nTotal: {total}, Fixed zip duplicates: {fixed}")

if __name__ == '__main__':
    main()

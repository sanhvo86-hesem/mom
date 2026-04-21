#!/usr/bin/env python3
"""
Fix HTML document files that were corrupted with CSS content dumped as raw text
inside a <div><p> wrapper at the top, missing proper DOCTYPE/head/body structure.

Pattern of broken files:
  Line 1: <div><p>thead { display: table-header-group; }
  ...CSS content as text...
  <style>table {...}</style>
  <link rel="stylesheet" href="...assets/style.css">

  </p>
  <div class="container">...actual content...</div>
  </div>   <- outer wrapper closer

The fix:
  1. Remove everything up to and including the </p> separator
  2. Calculate the correct relative path to assets/style.css based on file depth
  3. Add proper DOCTYPE + head structure
  4. Wrap body content, removing the extra outer </div>
  5. Close with </body></html>
"""
import os
import re
import sys

MOM_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'mom')
MOM_DIR = os.path.realpath(MOM_DIR)

BROKEN_MARKER = '<div><p>thead'

DEFAULT_STYLE = ('<style>table { width:100%; table-layout:fixed; border-collapse:collapse;'
                 ' word-wrap:break-word; overflow-wrap:break-word; }'
                 ' td,th { word-wrap:break-word; overflow-wrap:break-word; }</style>')


def calc_asset_rel_path(filepath):
    """Return relative path from file location to mom/assets/."""
    rel = os.path.relpath(filepath, MOM_DIR)
    depth = len(rel.split(os.sep)) - 1  # directories only, not the file
    return '../' * depth + 'assets/'


def extract_style_tag(header_text):
    m = re.search(r'<style>.*?</style>', header_text, re.DOTALL)
    return m.group(0) if m else DEFAULT_STYLE


def extract_title(body_text):
    m = re.search(r'<strong class="doc-name">(.*?)</strong>', body_text)
    if m:
        return m.group(1).strip() + ' | HESEM MOM'
    m = re.search(r'<title>(.*?)</title>', body_text)
    if m:
        t = m.group(1).strip()
        if t and 'HESEM MOM' not in t:
            return t + ' | HESEM MOM'
        return t
    return None


def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as fh:
        raw = fh.read()

    if not raw.startswith(BROKEN_MARKER):
        return False, 'not broken'

    lines = raw.split('\n')

    # Find the </p> that closes the stray CSS section
    sep_idx = None
    for i, line in enumerate(lines):
        if line.strip() == '</p>':
            sep_idx = i
            break
    if sep_idx is None:
        return False, 'no </p> separator found'

    header_text = '\n'.join(lines[:sep_idx])
    body_lines = lines[sep_idx + 1:]

    # Skip leading blank lines in body
    while body_lines and not body_lines[0].strip():
        body_lines.pop(0)

    # Remove the last non-empty line if it is exactly '</div>' (the outer wrapper closer)
    last_nonempty = None
    for i in range(len(body_lines) - 1, -1, -1):
        if body_lines[i].strip():
            last_nonempty = i
            break
    if last_nonempty is not None and body_lines[last_nonempty].strip() == '</div>':
        body_lines.pop(last_nonempty)
        # Remove any trailing blank lines that appeared after removing the div
        while body_lines and not body_lines[-1].strip():
            body_lines.pop()

    body_text = '\n'.join(body_lines)

    # Build head section
    asset_rel = calc_asset_rel_path(filepath)
    style_tag = extract_style_tag(header_text)
    title = extract_title(body_text) or extract_title(header_text)
    if not title:
        name = os.path.splitext(os.path.basename(filepath))[0]
        title = name.replace('-', ' ').title() + ' | HESEM MOM'

    new_content = (
        '<!DOCTYPE html>\n'
        '<html lang="vi">\n'
        '<head>\n'
        '<meta charset="utf-8">'
        '<meta content="width=device-width, initial-scale=1.0" name="viewport">\n'
        f'<title>{title}</title>\n'
        f'{style_tag}\n'
        f'<link rel="stylesheet" href="{asset_rel}style.css">'
        '</head>\n'
        '<body>\n'
        + body_text + '\n'
        '</body>\n'
        '</html>\n'
    )

    with open(filepath, 'w', encoding='utf-8') as fh:
        fh.write(new_content)

    return True, f'fixed (depth={len(asset_rel.split("../"))-1})'


def find_broken_files(root):
    results = []
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if not fn.endswith('.html'):
                continue
            fp = os.path.join(dirpath, fn)
            try:
                with open(fp, 'r', encoding='utf-8') as fh:
                    first_bytes = fh.read(30)
                if first_bytes.startswith(BROKEN_MARKER):
                    results.append(fp)
            except Exception:
                pass
    return results


def main():
    dry_run = '--dry-run' in sys.argv
    docs_dir = os.path.join(MOM_DIR, 'docs')
    broken = find_broken_files(docs_dir)
    print(f'Found {len(broken)} broken files', flush=True)

    fixed = 0
    skipped = 0
    for fp in sorted(broken):
        rel = os.path.relpath(fp, MOM_DIR)
        if dry_run:
            print(f'  [dry] {rel}')
            continue
        ok, msg = fix_file(fp)
        if ok:
            fixed += 1
            print(f'  OK  {rel}  ({msg})')
        else:
            skipped += 1
            print(f'  SKIP {rel}  ({msg})')

    if not dry_run:
        print(f'\nDone: {fixed} fixed, {skipped} skipped.')


if __name__ == '__main__':
    main()

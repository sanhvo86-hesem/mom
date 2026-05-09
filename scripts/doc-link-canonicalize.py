#!/usr/bin/env python3
"""
Idempotent path canonicalization for portal-managed HTML docs.

Only modifies anchor/href paths. Never touches content text. Each substitution
is verified to point to an existing file before being applied — if the new
target doesn't exist, the original ref is left alone.

Designed to run on either local working tree or VPS site dir. Idempotent:
running it twice produces the same output as running it once.

Usage:
  python3 scripts/doc-link-canonicalize.py [--root .] [--dry-run]

Exit code: 0 always (informational). Print summary of changes.
"""
import os, re, sys, argparse, tempfile
from collections import Counter, defaultdict


SEG_RENAMES = [
    ("01-SOPs",                "sops"),
    ("02-Work-Instructions",   "work-instructions"),
    ("03-Reference",           "references"),
    ("01-Competency-System",   "competency"),
    ("02-Training-Content",    "content"),
    ("04-Templates-Tools",     "templates"),
    ("03-System-Operations",   "system-ops"),
    ("03-Organization",        "organization"),  # only inside /system/
]

ATTR_RX = re.compile(r'(\b(?:href|src|data-dcc-logo|data-href|action)\s*=\s*["\'])([^"\']+)(["\'])')
C_LEVEL_RX = re.compile(r'(?:01-Competency-System|competency)/02-Levels/(C\d+)-(L\d+\.html)')


def atomic_write(path, content):
    """Write `content` to `path` atomically, preserving the original file's
    permissions and ownership. tempfile.mkstemp creates files with mode 0600
    by default — directly os.replace'ing such a tmpfile would silently strip
    group-read from portal-managed docs and break web serving (the portal
    runs as www-data, not as the script's user). We snapshot st_mode + uid +
    gid before write and re-apply after replace.
    """
    d = os.path.dirname(path)
    # Snapshot original perms (or sane defaults if file is new).
    try:
        st = os.stat(path)
        mode, uid, gid = st.st_mode & 0o777, st.st_uid, st.st_gid
    except FileNotFoundError:
        mode, uid, gid = 0o644, -1, -1
    fd, tmp = tempfile.mkstemp(prefix=".cano-", dir=d, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.chmod(tmp, mode)
        if uid != -1 and gid != -1 and hasattr(os, "chown"):
            try: os.chown(tmp, uid, gid)
            except (PermissionError, OSError): pass  # not running as root or unsupported
        os.replace(tmp, path)
    except Exception:
        try: os.unlink(tmp)
        except OSError: pass
        raise


def build_basename_index(docs_root):
    bn = defaultdict(list)
    for dp, _, fs in os.walk(docs_root):
        for f in fs:
            bn[f].append(os.path.normpath(os.path.join(dp, f)))
    return bn


def build_clevel_subdir_map(comp_levels_dir):
    m = {}
    if not os.path.isdir(comp_levels_dir): return m
    for d in os.listdir(comp_levels_dir):
        if not os.path.isdir(os.path.join(comp_levels_dir, d)): continue
        mm = re.match(r"\d+-(C\d+)-", d)
        if mm: m[mm.group(1)] = d
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Repository / site root")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    root = os.path.abspath(args.root)
    docs_root = os.path.join(root, "mom/docs")
    assets_real = os.path.join(root, "mom/assets")
    if not os.path.isdir(docs_root):
        print(f"ERROR: not a HESEM repo (no mom/docs at {root})", file=sys.stderr)
        return 2

    docs = []
    for dp, _, fs in os.walk(docs_root):
        for f in fs:
            if f.endswith(".html"):
                docs.append(os.path.join(dp, f))

    bn_index = build_basename_index(docs_root)
    clevel = build_clevel_subdir_map(os.path.join(docs_root, "training/competency/02-Levels"))
    stats = Counter()
    modified = set()

    def transform(ref, base_dir):
        if not ref or ref.startswith(("#","mailto:","tel:","javascript:","data:")): return None
        if re.match(r"^[a-z]+://", ref) or ref.startswith("/"): return None
        clean = ref.split("?",1)[0].split("#",1)[0]
        suffix = ref[len(clean):]
        new = clean

        # 1) Folder-segment renames
        for old_seg, new_seg in SEG_RENAMES:
            tok = "/" + old_seg + "/"
            if tok in ("/" + new):
                cand = ("/" + new).replace(tok, "/" + new_seg + "/", 1).lstrip("/")
                cand_abs = os.path.normpath(os.path.join(base_dir, cand))
                if os.path.exists(cand_abs):
                    new = cand
                    stats[f"rename:{old_seg}→{new_seg}"] += 1
                    break  # one segment-rename per ref

        # 2) Combined competency rename + nest into ##-C##-…/
        m = C_LEVEL_RX.search(new)
        if m and m.group(1) in clevel:
            cand = re.sub(
                r'(?:01-Competency-System|competency)/02-Levels/(C\d+)-(L\d+\.html)',
                lambda mm: f"competency/02-Levels/{clevel.get(mm.group(1))}/{mm.group(1)}-{mm.group(2)}",
                new
            )
            cand_abs = os.path.normpath(os.path.join(base_dir, cand))
            if os.path.exists(cand_abs):
                new = cand
                stats["c-level-nest+rename"] += 1

        # 3) Asset path correction
        abs_now = os.path.normpath(os.path.join(base_dir, new))
        if not os.path.exists(abs_now) and "/assets/" in abs_now:
            after = abs_now.split("/assets/",1)[1]
            real = os.path.join(assets_real, after)
            if os.path.exists(real):
                new = os.path.relpath(real, base_dir)
                stats["assets-path-correction"] += 1

        # 4) Portal absolute
        if new.endswith("mom/portal.html") and (new.startswith("../") or new == "mom/portal.html"):
            new = "/mom/portal.html"
            stats["portal-absolute"] += 1
            return new + suffix

        # 5) Last-resort basename redirect (only when 1 unique candidate)
        abs_now = os.path.normpath(os.path.join(base_dir, new))
        if not os.path.exists(abs_now):
            name = os.path.basename(new)
            if name and "." in name:
                cands = bn_index.get(name, [])
                if len(cands) == 1:
                    new = os.path.relpath(cands[0], base_dir)
                    stats["basename-redirect"] += 1

        if new == clean: return None
        return new + suffix

    for path in docs:
        try:
            with open(path, "r", encoding="utf-8") as fh:
                text = fh.read()
        except Exception as e:
            print(f"  skip (read err) {path}: {e}", file=sys.stderr); continue
        base_dir = os.path.dirname(path)
        new_text = ATTR_RX.sub(
            lambda mm: mm.group(1) + (transform(mm.group(2), base_dir) or mm.group(2)) + mm.group(3),
            text
        )
        if new_text != text:
            modified.add(path)
            if not args.dry_run:
                atomic_write(path, new_text)

    print(f"docs scanned    : {len(docs)}")
    print(f"files modified  : {len(modified)}")
    print(f"dry-run         : {args.dry_run}")
    print()
    for k, n in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {n:6d}  {k}")
    if not stats:
        print("  (no changes — already canonical)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

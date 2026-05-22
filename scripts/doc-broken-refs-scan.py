#!/usr/bin/env python3
"""Count broken relative refs across mom/docs/.

Exit codes:
  0 — broken ref count <= --max-broken (default: no limit)
  1 — broken ref count > --max-broken
  2 — usage error

Use --max-broken=N in CI to fail on regression beyond a baseline.
"""
import argparse
import os
import re
import sys
from collections import Counter


def scan(root: str):
    docs = [
        os.path.join(dp, f)
        for dp, _, fs in os.walk(root)
        for f in fs
        if f.endswith(".html")
    ]
    tag_rx = re.compile(r"<[^!][^>]*>")
    rx = re.compile(
        r'\b(?:href|src|data-dcc-logo|data-href|action)\s*=\s*["\']([^"\']+)["\']'
    )
    broken = []
    for p in docs:
        try:
            text = open(p, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        bd = os.path.dirname(p)
        seen = set()
        for tag in tag_rx.finditer(text):
            tag_text = tag.group(0)
            if tag_text.startswith(("<!--", "<!DOCTYPE")):
                continue
            for m in rx.finditer(tag_text):
                r = m.group(1)
                if not r or r.startswith(("#", "mailto:", "tel:", "javascript:", "data:", "/")):
                    continue
                if re.match(r"^[a-z]+://", r):
                    continue
                c = r.split("?", 1)[0].split("#", 1)[0]
                if not c or (p, c) in seen:
                    continue
                seen.add((p, c))
                if not os.path.exists(os.path.normpath(os.path.join(bd, c))):
                    broken.append((p, c))
    return docs, broken


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("root", nargs="?", default="mom/docs",
                    help="Doc root to scan (default: mom/docs)")
    ap.add_argument("--max-broken", type=int, default=None,
                    help="Fail with exit 1 if broken count exceeds this number.")
    ap.add_argument("--top", type=int, default=15,
                    help="Print top-N missing targets (default: 15)")
    ap.add_argument("--quiet", action="store_true",
                    help="Suppress everything except summary line + failures")
    args = ap.parse_args()

    if not os.path.isdir(args.root):
        print(f"ERROR: not a directory: {args.root}", file=sys.stderr)
        return 2

    docs, broken = scan(args.root)
    n_broken = len(broken)
    n_affected = len({p for p, _ in broken})
    tgt = Counter()
    for p, r in broken:
        tgt[os.path.normpath(os.path.join(os.path.dirname(p), r))] += 1

    if not args.quiet:
        print(f"docs scanned    : {len(docs)}")
        print(f"broken refs     : {n_broken}")
        print(f"affected docs   : {n_affected}")
        print(f"unique missing  : {len(tgt)}")
        if args.top > 0 and tgt:
            print(f"\nTop {args.top} missing:")
            for t, n in tgt.most_common(args.top):
                print(f"  ({n:3d}x) {t}")

    if args.max_broken is not None and n_broken > args.max_broken:
        print(
            f"\nFAIL: broken refs ({n_broken}) exceeded max ({args.max_broken}). "
            f"Either fix the regression, or raise the baseline if intentional.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

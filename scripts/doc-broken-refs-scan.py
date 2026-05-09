#!/usr/bin/env python3
"""Count broken relative refs across mom/docs/. Exit 0 always."""
import os, re, sys
from collections import Counter

root = sys.argv[1] if len(sys.argv) > 1 else "mom/docs"
docs = [os.path.join(dp, f) for dp, _, fs in os.walk(root)
        for f in fs if f.endswith(".html")]
RX = re.compile(r'\b(?:href|src|data-dcc-logo|data-href|action)\s*=\s*["\']([^"\']+)["\']')
broken = []
for p in docs:
    try:
        text = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    bd = os.path.dirname(p); seen = set()
    for m in RX.finditer(text):
        r = m.group(1)
        if not r or r.startswith(("#","mailto:","tel:","javascript:","data:","/")): continue
        if re.match(r"^[a-z]+://", r): continue
        c = r.split("?",1)[0].split("#",1)[0]
        if not c or (p,c) in seen: continue
        seen.add((p,c))
        if not os.path.exists(os.path.normpath(os.path.join(bd, c))):
            broken.append((p, c))

print(f"docs scanned    : {len(docs)}")
print(f"broken refs     : {len(broken)}")
print(f"affected docs   : {len({p for p,_ in broken})}")
tgt = Counter()
for p, r in broken:
    tgt[os.path.normpath(os.path.join(os.path.dirname(p), r))] += 1
print(f"unique missing  : {len(tgt)}")
print("\nTop 15 missing:")
for t, n in tgt.most_common(15):
    print(f"  ({n:3d}x) {t}")

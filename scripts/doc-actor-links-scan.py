#!/usr/bin/env python3
"""Check controlled-doc actor chips are backed by internal links.

Scans app-served HTML docs for registered role/department chips such as:
  <span class="entity-code role-code">QA</span>
  <span class="entity-code dept-code">D-QUAL</span>

The chip must sit inside an anchor. Nested anchors are reported separately
because they usually come from wrapping an already-linked chip a second time.
"""

import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser


def class_set(attrs):
    values = dict(attrs).get("class", "")
    return set(values.split())


class ActorLinkParser(HTMLParser):
    def __init__(self, valid_roles, valid_depts):
        super().__init__(convert_charrefs=True)
        self.valid_roles = valid_roles
        self.valid_depts = valid_depts
        self.anchor_depth = 0
        self.span_stack = []
        self.unlinked = []
        self.unknown = []
        self.nested_anchor_count = 0

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            if self.anchor_depth > 0:
                self.nested_anchor_count += 1
            self.anchor_depth += 1
            return
        if tag != "span":
            return
        cls = class_set(attrs)
        record = None
        if "entity-code" in cls and ("role-code" in cls or "dept-code" in cls):
            kind = "dept" if "dept-code" in cls else "role"
            record = {
                "kind": kind,
                "inside_anchor": self.anchor_depth > 0,
                "text": [],
            }
        self.span_stack.append(record)

    def handle_endtag(self, tag):
        if tag == "a":
            self.anchor_depth = max(0, self.anchor_depth - 1)
            return
        if tag != "span" or not self.span_stack:
            return
        record = self.span_stack.pop()
        if not record:
            return
        code = normalize_code("".join(record["text"]).strip(), record["kind"])
        base_code = code.split("[", 1)[0]
        if record["kind"] == "role":
            known = base_code in self.valid_roles
        else:
            known = code in self.valid_depts
        if not known:
            self.unknown.append((record["kind"], code))
        elif not record["inside_anchor"]:
            self.unlinked.append((record["kind"], code))

    def handle_data(self, data):
        for record in self.span_stack:
            if record:
                record["text"].append(data)


def load_registry(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    return set(data.get("roles", {})), set(data.get("departments", {}))


def normalize_code(text, kind):
    if kind == "dept":
        match = re.search(r"\bD-[A-Z0-9-]+\b", text)
        if match:
            return match.group(0)
    return text


def scan(root, registry_path):
    valid_roles, valid_depts = load_registry(registry_path)
    docs = []
    findings = []
    nested = []
    unknown = []
    for dp, _, fs in os.walk(root):
        for name in fs:
            if not name.endswith(".html"):
                continue
            p = os.path.join(dp, name)
            docs.append(p)
            parser = ActorLinkParser(valid_roles, valid_depts)
            try:
                with open(p, encoding="utf-8", errors="ignore") as fh:
                    parser.feed(fh.read())
            except Exception:
                continue
            if parser.unlinked:
                findings.append((p, parser.unlinked))
            if parser.nested_anchor_count:
                nested.append((p, parser.nested_anchor_count))
            if parser.unknown:
                unknown.append((p, parser.unknown))
    return docs, findings, nested, unknown


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("root", nargs="?", default="mom/docs")
    ap.add_argument("--registry", default="tools/data/role-registry-job-order-cnc.json")
    ap.add_argument("--max-unlinked", type=int, default=None)
    ap.add_argument("--max-nested", type=int, default=None)
    ap.add_argument("--max-unknown", type=int, default=None)
    ap.add_argument("--top", type=int, default=20)
    args = ap.parse_args()

    if not os.path.isdir(args.root):
        print(f"ERROR: not a directory: {args.root}", file=sys.stderr)
        return 2
    if not os.path.isfile(args.registry):
        print(f"ERROR: registry not found: {args.registry}", file=sys.stderr)
        return 2

    docs, findings, nested, unknown = scan(args.root, args.registry)
    unlinked_count = sum(len(rows) for _, rows in findings)
    nested_count = sum(n for _, n in nested)
    unknown_count = sum(len(rows) for _, rows in unknown)

    print(f"docs scanned             : {len(docs)}")
    print(f"unlinked actor chips     : {unlinked_count}")
    print(f"unknown actor chips      : {unknown_count}")
    print(f"nested anchors           : {nested_count}")

    if args.top > 0:
        for label, rows in (
            ("Unlinked actor chips", findings),
            ("Unknown actor chips", unknown),
            ("Nested anchors", nested),
        ):
            if not rows:
                continue
            print(f"\n{label}:")
            for item in rows[: args.top]:
                if label == "Nested anchors":
                    p, n = item
                    print(f"  ({n:3d}x) {p}")
                else:
                    p, chips = item
                    sample = ", ".join(f"{kind}:{code}" for kind, code in chips[:8])
                    print(f"  ({len(chips):3d}x) {p} :: {sample}")

    failed = False
    if args.max_unlinked is not None and unlinked_count > args.max_unlinked:
        print(f"\nFAIL: unlinked actor chips ({unlinked_count}) exceeded max ({args.max_unlinked}).", file=sys.stderr)
        failed = True
    if args.max_nested is not None and nested_count > args.max_nested:
        print(f"\nFAIL: nested anchors ({nested_count}) exceeded max ({args.max_nested}).", file=sys.stderr)
        failed = True
    if args.max_unknown is not None and unknown_count > args.max_unknown:
        print(f"\nFAIL: unknown actor chips ({unknown_count}) exceeded max ({args.max_unknown}).", file=sys.stderr)
        failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

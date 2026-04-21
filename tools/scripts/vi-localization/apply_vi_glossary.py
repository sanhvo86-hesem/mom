#!/usr/bin/env python3
"""Apply the VI↔EN glossary to HESEM MOM HTML docs with BYTE-PRESERVING surgery.

We avoid any HTML parser that reserializes (BeautifulSoup/lxml) because those
reorder attributes, self-close void elements, and otherwise produce noisy
diffs. Instead we tokenize the raw HTML into a flat stream of:
  - tag tokens:    "<...>"
  - text tokens:   everything between tags

We then apply replacements ONLY inside text tokens, and only when we are not
currently inside a "skip zone":
  - <script>...</script>, <style>...</style>, <code>...</code>, <pre>...</pre>
  - <span class="entity-code ...">...</span>  (role/dept/doc codes)
  - attribute values (never touched — they live inside tag tokens)

Replacements are applied longest-phrase-first so multi-word phrases win over
single words. Case of the first character is preserved.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


SKIP_TAGS = {"script", "style", "code", "pre"}

# Pattern that splits HTML into alternating text + tag tokens.
# Group captures the tag (including comment/doctype); non-captured in between is text.
TOKEN_RE = re.compile(r"(<!--.*?-->|<!\[CDATA\[.*?\]\]>|<!DOCTYPE[^>]*>|<[^>]+>)", re.DOTALL | re.IGNORECASE)

TAG_NAME_RE = re.compile(r"^<\s*(/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)", re.IGNORECASE)
ENTITY_CODE_SPAN_OPEN_RE = re.compile(
    r'<\s*span\b[^>]*\bclass\s*=\s*"([^"]*)"', re.IGNORECASE
)


def build_regex_table(translations: dict[str, str]) -> list[tuple[re.Pattern, str]]:
    # Sort longest-first so "process planning" wins over "process"
    items = sorted(translations.items(), key=lambda x: -len(x[0]))
    rules = []
    for en, vi in items:
        pattern = r"\b" + re.escape(en) + r"\b"
        rules.append((re.compile(pattern, re.IGNORECASE), vi))
    return rules


def apply_to_text(text: str, rules: list[tuple[re.Pattern, str]]) -> tuple[str, int]:
    if not text:
        return text, 0
    count = 0

    def _make_repl(vi: str):
        def _r(m: re.Match) -> str:
            nonlocal count
            count += 1
            src = m.group(0)
            if src and src[0].isupper():
                return vi[:1].upper() + vi[1:]
            return vi
        return _r

    for pat, vi in rules:
        text = pat.sub(_make_repl(vi), text)
    return text, count


def process_html(raw: str, rules: list[tuple[re.Pattern, str]]) -> tuple[str, int]:
    """Walk tokens, track skip-zone depth, apply rules to text tokens only."""
    tokens = []
    pos = 0
    for m in TOKEN_RE.finditer(raw):
        if m.start() > pos:
            tokens.append(("text", raw[pos:m.start()]))
        tokens.append(("tag", m.group(0)))
        pos = m.end()
    if pos < len(raw):
        tokens.append(("text", raw[pos:]))

    skip_depth = 0   # counts nested SKIP_TAGS opens
    entity_depth = 0  # counts nested entity-code spans
    out_parts: list[str] = []
    total = 0

    for kind, tok in tokens:
        if kind == "tag":
            out_parts.append(tok)
            # Update skip zones
            m = TAG_NAME_RE.match(tok)
            if not m:
                continue
            is_close = m.group(1) == "/"
            name = m.group(2).lower()
            self_closing = tok.rstrip().endswith("/>")
            if name in SKIP_TAGS:
                if is_close:
                    skip_depth = max(0, skip_depth - 1)
                elif not self_closing:
                    skip_depth += 1
            # Detect opening entity-code span
            if name == "span" and not is_close and not self_closing:
                cm = ENTITY_CODE_SPAN_OPEN_RE.match(tok)
                if cm:
                    classes = cm.group(1).split()
                    if any(c.startswith("entity-code") for c in classes):
                        entity_depth += 1
                        continue
                # regular span — nothing to do
            elif name == "span" and is_close and entity_depth > 0:
                entity_depth -= 1
            continue

        # kind == "text"
        if skip_depth > 0 or entity_depth > 0:
            out_parts.append(tok)
            continue
        new_text, n = apply_to_text(tok, rules)
        total += n
        out_parts.append(new_text)

    return "".join(out_parts), total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("mom/docs"))
    parser.add_argument("--glossary", type=Path,
                        default=Path("tools/scripts/vi-localization/glossary.json"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", type=str, help="Substring filter on path")
    args = parser.parse_args()

    glossary = json.loads(args.glossary.read_text(encoding="utf-8"))
    translations = glossary.get("prose_translations", {})
    rules = build_regex_table(translations)
    print(f"Loaded {len(rules)} translation rules (longest-first).")

    files = [p for p in args.root.glob("**/*.html") if "_Archive" not in p.parts]
    if args.only:
        files = [p for p in files if args.only in str(p)]
    files.sort()

    grand = 0
    touched = 0
    for fp in files:
        try:
            raw = fp.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ERROR  {fp}: {e}")
            continue
        new_html, n = process_html(raw, rules)
        if n > 0 and new_html != raw:
            if not args.dry_run:
                fp.write_text(new_html, encoding="utf-8")
            touched += 1
            grand += n
            marker = "[DRY]" if args.dry_run else "[FIX]"
            rel = fp.relative_to(args.root)
            print(f"  {marker}  {n:4d}  {rel}")

    verb = "Would replace" if args.dry_run else "Replaced"
    print(f"\nScanned {len(files)} HTML files. "
          f"{verb} {grand} occurrences across {touched} files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

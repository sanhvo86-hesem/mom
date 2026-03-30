from __future__ import annotations

import csv
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

from common import ANNEX_ROOT, WI_ROOT, read_text, repo_root, walk_html_files


LINK_ATTR_RE = re.compile(r"""(?P<attr>href|src)\s*=\s*["'](?P<target>[^"'<>]+)["']""", re.IGNORECASE)
ID_RE = re.compile(r"""\bid\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
NAME_RE = re.compile(r"""\bname\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
SCHEME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")


def should_skip(target: str) -> bool:
    lowered = target.lower()
    return (
        not target
        or target.startswith("#")
        or target.startswith("//")
        or "{{" in target
        or "{%" in target
        or SCHEME_RE.match(target) is not None
        or lowered.startswith(("mailto:", "tel:", "javascript:", "data:"))
    )


def resolve_target(root: Path, source: Path, target: str) -> tuple[Path, str]:
    decoded = unquote(target)
    split = urlsplit(decoded)
    path_part = split.path
    fragment = split.fragment

    if not path_part:
        return source, fragment
    if path_part.startswith("/"):
        resolved = (root / path_part.lstrip("/")).resolve()
    else:
        resolved = (source.parent / path_part).resolve()
    return resolved, fragment


def path_in_repo(root: Path, path: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def anchor_index(cache: dict[Path, set[str]], path: Path) -> set[str]:
    if path not in cache:
        text = read_text(path)
        anchors = set(ID_RE.findall(text))
        anchors.update(NAME_RE.findall(text))
        cache[path] = anchors
    return cache[path]


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "dead-link-report.csv"

    files = walk_html_files(root / WI_ROOT) + walk_html_files(root / ANNEX_ROOT)
    anchor_cache: dict[Path, set[str]] = {}
    findings: list[dict[str, str]] = []

    for source in files:
        text = read_text(source)
        for match in LINK_ATTR_RE.finditer(text):
            attr = match.group("attr").lower()
            target = match.group("target").strip()
            if should_skip(target):
                continue

            resolved, fragment = resolve_target(root, source, target)
            if not resolved.exists():
                findings.append(
                    {
                        "source_path": source.relative_to(root).as_posix(),
                        "attribute": attr,
                        "target": target,
                        "resolved_path": path_in_repo(root, resolved),
                        "finding": "MISSING_TARGET",
                        "detail": "Resolved path does not exist.",
                    }
                )
                continue

            if fragment and resolved.suffix.lower() == ".html":
                anchors = anchor_index(anchor_cache, resolved)
                if fragment not in anchors:
                    findings.append(
                        {
                            "source_path": source.relative_to(root).as_posix(),
                            "attribute": attr,
                            "target": target,
                            "resolved_path": path_in_repo(root, resolved),
                            "finding": "MISSING_ANCHOR",
                            "detail": f'Anchor "#{fragment}" was not found in target file.',
                        }
                    )

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["source_path", "attribute", "target", "resolved_path", "finding", "detail"],
        )
        writer.writeheader()
        writer.writerows(findings)

    print(f"dead_links={len(findings)}")
    print(f"report={report_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import csv
from pathlib import Path

from lxml import html

from common import ANNEX_ROOT, WI_ROOT, read_text, repo_root, walk_html_files


def class_list(node) -> list[str]:
    return str(node.get("class") or "").split()


def class_summary(node) -> str:
    classes = " ".join(class_list(node))
    return f"{node.tag}.{classes}".strip(".")


def is_hidden_extra(node) -> bool:
    classes = class_list(node)
    style = str(node.get("style") or "").replace(" ", "").lower()
    return "no-screen" in classes or "display:none" in style


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "page-shell-report.csv"

    files = walk_html_files(root / WI_ROOT) + walk_html_files(root / ANNEX_ROOT)
    findings: list[dict[str, str]] = []

    for path in files:
        rel = path.relative_to(root).as_posix()
        try:
            doc = html.fromstring(read_text(path))
        except Exception as exc:
            findings.append(
                {
                    "path": rel,
                    "issue": "PARSE_ERROR",
                    "detail": str(exc),
                }
            )
            continue

        bodies = doc.xpath("//body")
        if not bodies:
            findings.append({"path": rel, "issue": "MISSING_BODY", "detail": ""})
            continue
        body = bodies[0]

        containers = body.xpath('./div[contains(concat(" ", normalize-space(@class), " "), " container ")]')
        if not containers:
            findings.append({"path": rel, "issue": "MISSING_CONTAINER", "detail": ""})
            continue
        container = containers[0]

        container_children = [node for node in container if isinstance(node.tag, str)]
        if len(container_children) != 1 or "page" not in class_list(container_children[0]):
            findings.append(
                {
                    "path": rel,
                    "issue": "CONTAINER_CHILDREN",
                    "detail": " | ".join(class_summary(node) for node in container_children[:8]),
                }
            )
            continue

        page = container_children[0]
        page_children = [node for node in page if isinstance(node.tag, str)]
        page_body_children = [node for node in page_children if "page-body" in class_list(node)]
        if len(page_body_children) != 1:
            findings.append(
                {
                    "path": rel,
                    "issue": "PAGE_BODY_COUNT",
                    "detail": " | ".join(class_summary(node) for node in page_children[:8]),
                }
            )
            continue

        page_body = page_body_children[0]
        page_siblings = [node for node in page_children if node is not page_body]
        if page_siblings:
            findings.append(
                {
                    "path": rel,
                    "issue": "CONTENT_OUTSIDE_PAGE_BODY",
                    "detail": " | ".join(class_summary(node) for node in page_siblings[:8]),
                }
            )

        body_children = [node for node in body if isinstance(node.tag, str)]
        body_extras = []
        for node in body_children:
            if node is container:
                continue
            if node.tag == "script":
                continue
            if is_hidden_extra(node):
                continue
            body_extras.append(node)
        if body_extras:
            findings.append(
                {
                    "path": rel,
                    "issue": "VISIBLE_BODY_EXTRA",
                    "detail": " | ".join(class_summary(node) for node in body_extras[:8]),
                }
            )

    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "issue", "detail"])
        writer.writeheader()
        writer.writerows(findings)

    print(f"page_shell_findings={len(findings)}")
    print(f"report={report_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

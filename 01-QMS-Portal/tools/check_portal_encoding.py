from __future__ import annotations

import argparse
from pathlib import Path

from ftfy import fix_text
from ftfy.badness import badness


ROOT = Path(__file__).resolve().parents[1]
SHELL_TARGETS = [
    ROOT / "portal.html",
    ROOT / "scripts" / "portal" / "02-state-auth-ui.js",
    ROOT / "scripts" / "portal" / "00c-admin-appearance.js",
    ROOT / "scripts" / "portal" / "05-workflow-panel.js",
    ROOT / "scripts" / "portal" / "32-schema-studio.js",
]

FRONTEND_GLOBS = (
    ROOT / "portal.html",
    ROOT / "scripts" / "portal",
    ROOT / "styles",
)

MOJIBAKE_MARKERS = (
    "ÃƒÂ¡",
    "ÃƒÂ¢",
    "ÃƒÂ£",
    "ÃƒÂ¨",
    "ÃƒÂ©",
    "ÃƒÂª",
    "ÃƒÂ¬",
    "ÃƒÂ²",
    "ÃƒÂ³",
    "ÃƒÂ´",
    "ÃƒÂ¹",
    "ÃƒÂº",
    "Ã„â€˜",
    "Ã„Â",
    "Ã†Â°",
    "Ã†Â¡",
    "Ã¢â‚¬â€",
    "Ã¢â‚¬â€œ",
    "Ã¢â‚¬Å“",
    "Ã¢â‚¬Â",
    "Ã¢â‚¬Ëœ",
    "Ã¢â‚¬â„¢",
    "Ã¢â‚¬Â¦",
    "Ã°Å¸",
)

ALLOWLIST_MARKERS = {
    ROOT / "scripts" / "portal" / "03-editor-core.js": {
        "Â·",
        "â€”",
        "â€“",
        "â€œ",
        "â€",
        "â€�",
        "â€˜",
        "â€™",
        "â€¦",
        "Ã ",
        "Ã¡",
        "Ã¢",
        "Äƒ",
        "Ä‘",
        "Ä",
        "Æ°",
        "Æ¡",
        "áº¡",
        "áº£",
        "áº¥",
        "áº§",
        "á»™",
        "á»›",
        "á»",
        "á»§",
        "á»«",
        "á»¯",
    },
    ROOT / "scripts" / "portal" / "11-e-signature.js": {
        "Â·",
        "â€”",
        "â€“",
        "â€œ",
        "â€",
        "â€�",
        "â€˜",
        "â€™",
        "â€¦",
        "Ã ",
        "Ã¡",
        "Ã¢",
        "Äƒ",
        "Ä‘",
        "Ä",
        "Æ°",
        "Æ¡",
        "áº¡",
        "áº£",
        "áº¥",
        "áº§",
        "á»™",
        "á»›",
        "á»",
        "á»§",
        "á»«",
        "á»¯",
    },
    ROOT / "scripts" / "portal" / "14-exception-dashboard.js": set(),
    ROOT / "scripts" / "portal" / "14-mes-control-center.js": set(),
}

ALLOWLIST_FTFY_PATHS = {
    ROOT / "scripts" / "portal" / "03-editor-core.js",
    ROOT / "scripts" / "portal" / "10-upload-validator.js",
    ROOT / "scripts" / "portal" / "11-e-signature.js",
    ROOT / "scripts" / "portal" / "14-exception-dashboard.js",
    ROOT / "scripts" / "portal" / "14-mes-control-center.js",
}


def iter_frontend_targets() -> list[Path]:
    targets: list[Path] = []
    for item in FRONTEND_GLOBS:
        if item.is_file():
            targets.append(item)
            continue
        for ext in ("*.js", "*.css", "*.html"):
            targets.extend(sorted(item.glob(ext)))
    return targets


def inspect(path: Path) -> list[str]:
    issues: list[str] = []
    text = path.read_text(encoding="utf-8-sig")
    score = badness(text)
    if score and path not in ALLOWLIST_FTFY_PATHS:
        issues.append(f"ftfy.badness={score}")
    repaired = fix_text(text)
    if repaired != text and path not in ALLOWLIST_FTFY_PATHS:
        issues.append("ftfy_would_change_content")
    allow = ALLOWLIST_MARKERS.get(path, set())
    for marker in MOJIBAKE_MARKERS:
        if marker in text and marker not in allow:
            issues.append(f"marker:{marker}")
            break
    return issues


def run(targets: list[Path]) -> int:
    failed = False
    for path in targets:
        if not path.exists():
            print(f"[skip] {path}")
            continue
        issues = inspect(path)
        if issues:
            failed = True
            print(f"[fail] {path}")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print(f"[ok]   {path}")
    if failed:
        print("\nPortal encoding audit failed.")
        print("Fix mojibake or wrong-encoding writes before committing/deploying.")
        return 1
    print("\nPortal encoding audit passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--scope",
        choices=("shell", "all"),
        default="shell",
        help="Audit only critical portal shell files or all frontend assets.",
    )
    args = parser.parse_args()
    targets = SHELL_TARGETS if args.scope == "shell" else iter_frontend_targets()
    return run(targets)


if __name__ == "__main__":
    raise SystemExit(main())

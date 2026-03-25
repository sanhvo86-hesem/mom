from __future__ import annotations

import re
from pathlib import Path

import ftfy


ROOT = Path(r"C:/Users/TEST4/qms.hesem.com.vn")
REPORT = ROOT / "_reports" / "mojibake-fix-report-2026-03-22.md"

SKIP_PARTS = {
    ".git",
    "node_modules",
    "_build",
}

TARGET_EXTS = {
    ".html",
    ".js",
    ".css",
    ".php",
    ".md",
    ".json",
    ".txt",
}

SUSPECT_RE = re.compile(
    r"(?:"
    r"\u00c3."
    r"|"
    r"\u00c4."
    r"|"
    r"\u00c5."
    r"|"
    r"\u00c6."
    r"|"
    r"\u00e1[\u00a0-\u024f\u2013-\u2122]"
    r"|"
    r"\u00e2[\u00a0-\u024f\u2013-\u2122]"
    r"|�"
    r")"
)

QUESTION_MARK_WORD_RE = re.compile(r"(?u)[A-Za-zÀ-ỹ]{1,}\?{1,3}[A-Za-zÀ-ỹ]{1,}")

TOKEN_RE = re.compile(r"[A-Za-z0-9_\-/\u00A0-\u024F\u2013-\u2122]+")
LEAD_MARKERS = {
    chr(0x00C3),
    chr(0x00C4),
    chr(0x00C5),
    chr(0x00C6),
    chr(0x00E1),
    chr(0x00E2),
    chr(0x2013),
    chr(0x2014),
    chr(0x2018),
    chr(0x2019),
    chr(0x201C),
    chr(0x201D),
    chr(0x2020),
    chr(0x2021),
    chr(0x2022),
    chr(0x2039),
    chr(0x203A),
    chr(0x2122),
}


def should_skip(path: Path) -> bool:
    return any(part in SKIP_PARTS for part in path.parts)


def suspect_count(text: str) -> int:
    return len(SUSPECT_RE.findall(text))


def question_mark_word_count(text: str) -> int:
    return len(QUESTION_MARK_WORD_RE.findall(text))


def iter_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if should_skip(path.relative_to(ROOT)):
            continue
        if path.suffix.lower() not in TARGET_EXTS:
            continue
        files.append(path)
    return files


def fix_text(text: str) -> str:
    fixed = ftfy.fix_text(
        text,
        normalization="NFC",
        uncurl_quotes=False,
        fix_character_width=False,
        remove_terminal_escapes=False,
        fix_encoding=True,
    )
    if fixed != text:
        fixed = ftfy.fix_text(
            fixed,
            normalization="NFC",
            uncurl_quotes=False,
            fix_character_width=False,
            remove_terminal_escapes=False,
            fix_encoding=True,
        )
    return fixed


def repair_tokens(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        token = match.group(0)
        if not any(ch in LEAD_MARKERS for ch in token):
            return token

        best = token
        best_score = suspect_count(token)

        for encoding in ("cp1252", "latin1"):
            try:
                candidate = token.encode(encoding).decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
            score = suspect_count(candidate)
            if candidate != best and score < best_score:
                best = candidate
                best_score = score

        return best

    repaired = text
    for _ in range(3):
        next_text = TOKEN_RE.sub(repl, repaired)
        if next_text == repaired:
            break
        repaired = next_text
    return repaired


def main() -> None:
    changed: list[tuple[str, int, int]] = []
    scanned = 0

    for path in iter_files():
        scanned += 1
        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        before = suspect_count(original)
        before_q = question_mark_word_count(original)
        if before == 0 and before_q == 0:
            continue

        fixed = repair_tokens(fix_text(original))
        after = suspect_count(fixed)
        after_q = question_mark_word_count(fixed)

        if fixed != original and (after < before or after_q < before_q):
            path.write_text(fixed, encoding="utf-8", newline="")
            changed.append(
                (
                    path.relative_to(ROOT).as_posix(),
                    before + before_q,
                    after + after_q,
                )
            )

    changed.sort()

    lines = [
        "# Mojibake Fix Report",
        "",
        "- Date: 2026-03-22",
        f"- Scanned files: {scanned}",
        f"- Changed files: {len(changed)}",
        "",
        "## Changed Files",
        "",
        "| File | Before | After |",
        "|---|---:|---:|",
    ]
    for rel, before, after in changed:
        lines.append(f"| {rel} | {before} | {after} |")

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="")
    print(f"SCANNED={scanned}")
    print(f"CHANGED={len(changed)}")
    print(f"REPORT={REPORT}")


if __name__ == "__main__":
    main()

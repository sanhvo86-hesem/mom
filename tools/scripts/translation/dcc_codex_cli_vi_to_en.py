#!/usr/bin/env python3
"""DCC translation provider — OpenAI Codex CLI (subscription).

Same architecture as dcc_claude_cli_vi_to_en.py, swapping `claude -p` for
`codex exec`. Uses the local `codex` CLI authenticated against a ChatGPT
Pro subscription.

Codex's stdout schema is less structured than Claude's. The cleanest path
to capture the final assistant message is `--output-last-message <file>`,
then read that file.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional


def ensure_runtime_home_env() -> None:
    cli_home = os.environ.get("DCC_CLI_AUTH_HOME", "").strip()
    if cli_home:
        os.environ["HOME"] = cli_home
    runtime_home = os.environ.get("DCC_TRANSLATION_RUNTIME_HOME", "").strip()
    if runtime_home:
        cache_home = Path(runtime_home) / ".cache"
        cache_home.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("XDG_CACHE_HOME", str(cache_home))


ensure_runtime_home_env()

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dcc_argos_vi_to_en as common  # noqa: E402  pylint: disable=wrong-import-position


CLI_BINARY = os.environ.get("DCC_CLI_BINARY", "/opt/homebrew/bin/codex")
MODEL = os.environ.get("DCC_PROVIDER_MODEL", "gpt-5").strip() or "gpt-5"
PROVIDER_LABEL = f"codex_cli:{MODEL}"
ENGINE_VERSION = f"codex_cli_{re.sub(r'[^a-z0-9]+', '_', MODEL.lower())}_v1"

SYSTEM_PROMPT_PATH = (
    common.ROOT / "mom" / "data" / "config" / "translator-system-prompt.md"
)
PROMPT_CACHE: Optional[str] = None

OPTIONS = {}
try:
    OPTIONS = json.loads(os.environ.get("DCC_PROVIDER_OPTIONS_JSON", "") or "{}")
except Exception:
    OPTIONS = {}

SEGMENT_BATCH_SIZE = int(OPTIONS.get("segment_batch_size", 8) or 8)
CLI_TIMEOUT_SECONDS = int(OPTIONS.get("cli_timeout_seconds", 240) or 240)
RATE_LIMIT_PER_HOUR = int(OPTIONS.get("rate_limit_per_hour", 0) or 0)

_lock = threading.Lock()
_call_timestamps: List[float] = []


def _system_prompt() -> str:
    global PROMPT_CACHE
    if PROMPT_CACHE is not None:
        return PROMPT_CACHE
    if SYSTEM_PROMPT_PATH.is_file():
        PROMPT_CACHE = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    else:
        PROMPT_CACHE = "Translate Vietnamese to English. Output [N] markers in order."
    return PROMPT_CACHE


def _wait_for_rate_limit() -> None:
    if RATE_LIMIT_PER_HOUR <= 0:
        return
    with _lock:
        now = time.time()
        while _call_timestamps and _call_timestamps[0] < now - 3600:
            _call_timestamps.pop(0)
        if len(_call_timestamps) >= RATE_LIMIT_PER_HOUR:
            time.sleep(min(_call_timestamps[0] + 3600 - now + 1, 300))
        _call_timestamps.append(time.time())


def _call_codex_cli(user_prompt: str) -> Dict[str, object]:
    _wait_for_rate_limit()
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".txt", delete=False) as fh:
        out_path = fh.name
    try:
        # Codex doesn't accept arbitrary system prompts via flag; we prepend
        # the system instructions to the user prompt as an HTML-style preamble.
        full_prompt = (
            "SYSTEM INSTRUCTIONS (treat as system prompt — do not echo):\n"
            f"{_system_prompt()}\n\n"
            "USER REQUEST:\n"
            f"{user_prompt}"
        )
        cmd = [
            CLI_BINARY, "exec",
            "--skip-git-repo-check",
            "--output-last-message", out_path,
            "--model", MODEL,
            full_prompt,
        ]
        try:
            # IMPORTANT: codex `exec` reads from stdin by default (it prints
            # "Reading additional input from stdin..." and appends whatever is
            # there to the prompt). When we are spawned by PHP→python the
            # parent's stdin pipe is open until EOF; codex stalls or appends
            # garbage. Force-close stdin so codex uses ONLY the positional
            # prompt argument.
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                stdin=subprocess.DEVNULL,
                timeout=CLI_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(f"codex cli timeout after {CLI_TIMEOUT_SECONDS}s") from exc

        if proc.returncode != 0:
            raise RuntimeError(
                f"codex cli exit={proc.returncode} stderr={proc.stderr[:600]}"
            )

        try:
            text = Path(out_path).read_text(encoding="utf-8") if Path(out_path).is_file() else ""
        except Exception:
            text = ""
    finally:
        try:
            os.unlink(out_path)
        except Exception:
            pass

    # Codex doesn't surface usage in its CLI output; we leave usage zero
    # and rely on translation_usage_log for attempt count tracking.
    return {
        "text": text,
        "usage": {"input_tokens": 0, "output_tokens": 0, "cached_input_tokens": 0},
        "raw": {"stdout_excerpt": (proc.stdout or "")[-1000:]},
    }


def _build_user_prompt(segments: List[str]) -> str:
    parts = [
        "Translate the following Vietnamese segments to English. ",
        "Reply with the same [N] markers in the same order. ",
        "Output ONLY the numbered translations, no preamble.",
        "",
    ]
    for i, seg in enumerate(segments, start=1):
        parts.append(f"[{i}] {seg}")
    return "\n".join(parts)


_RESPONSE_RE = re.compile(r"^\[(\d+)\]\s*(.*)$")


def _parse_segments(response_text: str, expected: int) -> List[str]:
    out: List[str] = ["" for _ in range(expected)]
    current_idx: Optional[int] = None
    buffer: List[str] = []

    def flush() -> None:
        if current_idx is not None and 1 <= current_idx <= expected:
            out[current_idx - 1] = "\n".join(buffer).strip()

    for line in (response_text or "").splitlines():
        m = _RESPONSE_RE.match(line)
        if m:
            flush()
            current_idx = int(m.group(1))
            buffer = [m.group(2)]
        else:
            if current_idx is None:
                continue
            buffer.append(line)
    flush()
    return out


class _CodexCliAdapter:
    def translate(self, text: str) -> str:
        if not text or not text.strip():
            return text or ""
        results = self._batch([text])
        return results[0] if results else text

    def _batch(self, segments: List[str]) -> List[str]:
        if not segments:
            return []
        out: List[str] = []
        for chunk_start in range(0, len(segments), SEGMENT_BATCH_SIZE):
            chunk = segments[chunk_start:chunk_start + SEGMENT_BATCH_SIZE]
            prompt = _build_user_prompt(chunk)
            try:
                result = _call_codex_cli(prompt)
            except RuntimeError as exc:
                for _ in chunk:
                    out.append("")
                sys.stderr.write(f"[codex_cli] chunk failed: {exc}\n")
                continue
            out.extend(_parse_segments(str(result["text"]), expected=len(chunk)))
        return out


_adapter: Optional[_CodexCliAdapter] = None


def install_engine_overrides() -> None:
    global _adapter
    _adapter = _CodexCliAdapter()
    common._translator = _adapter

    def _codex_load_translator():
        return _adapter

    common.load_translator = _codex_load_translator

    # Disable glossary regex protection — LLM gets clean source + system
    # prompt vocabulary contract. See dcc_claude_cli_vi_to_en for rationale.
    def _no_glossary_protect(text, literals, next_index):
        return text
    common.protect_glossary_phrases = _no_glossary_protect

    vn_re = common.VIETNAMESE_CHAR_RE

    def _codex_translate_batch(segments: List[str], _translator) -> Dict[str, str]:
        if not segments:
            return {}
        translated_lines = _CodexCliAdapter()._batch(list(segments))
        out: Dict[str, str] = {}
        for source, candidate in zip(segments, translated_lines):
            cleaned = common.cleanup_translation(candidate or "")
            if cleaned.strip() == "":
                continue
            critical_now = common.classify_quality_issues(cleaned)["critical"]
            blocking = [i for i in critical_now if i in {
                "literal_placeholder_leak", "repeated_token_loop", "machine_artifact_noise",
            }]
            if blocking:
                continue
            src_vn = len(vn_re.findall(source))
            tgt_vn = len(vn_re.findall(cleaned))
            if tgt_vn > src_vn:
                continue
            out[source] = cleaned
        return out

    common.translate_batch = _codex_translate_batch


def main() -> int:
    payload = common.read_payload()
    source_html = str(payload.get("source_html", "") or "")
    title = str(payload.get("title", "") or "")
    subtitle = str(payload.get("subtitle", "") or "")
    if source_html.strip() == "":
        print(json.dumps({
            "ok": False, "provider": PROVIDER_LABEL,
            "engine_version": "missing_source_html",
            "reason": "missing_source_html",
            "message": "source_html is required.",
        }, ensure_ascii=False))
        return 0

    try:
        install_engine_overrides()
        translated = common.translate_html(source_html, title, subtitle)
    except Exception as exc:
        print(json.dumps({
            "ok": False, "provider": PROVIDER_LABEL,
            "engine_version": "runtime_error",
            "reason": "translation_runtime_error",
            "message": str(exc),
        }, ensure_ascii=False))
        return 0

    classification = common.classify_quality_issues(translated["html"], html=True)
    if classification["critical"]:
        print(json.dumps({
            "ok": False, "provider": PROVIDER_LABEL,
            "engine_version": common.QUALITY_GATE_VERSION,
            "reason": "translation_quality_gate_failed",
            "message": "Generated English artifact failed locale quality gate.",
            "quality_issues": classification["critical"],
            "quality_advisory": classification["advisory"],
            "glossary_version": str(payload.get("glossary_version", "") or "repo_glossary"),
        }, ensure_ascii=False))
        return 0

    print(json.dumps({
        "ok": True, "provider": PROVIDER_LABEL,
        "engine_version": ENGINE_VERSION,
        "glossary_version": str(payload.get("glossary_version", "") or "repo_glossary"),
        "translation_state": "machine_preview",
        "title": translated["title"],
        "subtitle": translated["subtitle"],
        "html": translated["html"],
        "quality_advisory": classification["advisory"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

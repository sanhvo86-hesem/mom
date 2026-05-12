#!/usr/bin/env python3
"""DCC translation provider — Claude Code CLI (subscription).

Spawns the locally-installed `claude` CLI in non-interactive mode (`-p`)
to translate Vietnamese segments to English. Designed to leverage a Claude
Max subscription so per-token API billing is avoided. The OAuth token must
be present at HOME=$DCC_CLI_AUTH_HOME (typically a www-data-readable copy
of the operator's ~/.claude/.credentials.json).

Same stdin/stdout JSON contract as `dcc_nllb_vi_to_en.py` and `dcc_argos_vi_to_en.py`.
The HTML traversal, glossary protection, quality gate, segment cache, and
residue scrub are imported wholesale from `dcc_argos_vi_to_en` — only the
adapter that converts Vietnamese segments → English is replaced.

Env vars (set by DocumentLocaleAutomationService when spawned):
    DCC_PROVIDER_KEY        e.g. "claude_cli"
    DCC_PROVIDER_MODEL      e.g. "sonnet" / "claude-sonnet-4-6"
    DCC_CLI_BINARY          path to `claude` (default: /opt/homebrew/bin/claude)
    DCC_CLI_AUTH_HOME       HOME dir holding .claude/.credentials.json
    DCC_PROVIDER_OPTIONS_JSON  JSON: {segment_batch_size, rate_limit_per_hour, ...}
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional


def ensure_runtime_home_env() -> None:
    """Mirror the Argos/NLLB providers' HOME setup.

    For the CLI driver, HOME is critical: the `claude` binary reads
    `$HOME/.claude/.credentials.json` to find the subscription token.
    If DCC_CLI_AUTH_HOME is set we honor it (already exported by PHP);
    otherwise we fall back to the runtime cache dir for cache-only files.
    """
    cli_home = os.environ.get("DCC_CLI_AUTH_HOME", "").strip()
    if cli_home:
        os.environ["HOME"] = cli_home
    runtime_home = os.environ.get("DCC_TRANSLATION_RUNTIME_HOME", "").strip()
    if runtime_home:
        cache_home = Path(runtime_home) / ".cache"
        cache_home.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("XDG_CACHE_HOME", str(cache_home))


ensure_runtime_home_env()

# Reuse the entire HTML pipeline (parsing, glossary, gates, cache, scrub).
sys.path.insert(0, str(Path(__file__).resolve().parent))
import dcc_argos_vi_to_en as common  # noqa: E402  pylint: disable=wrong-import-position


CLI_BINARY = os.environ.get("DCC_CLI_BINARY", "/opt/homebrew/bin/claude")
MODEL = os.environ.get("DCC_PROVIDER_MODEL", "sonnet").strip() or "sonnet"
PROVIDER_LABEL = f"claude_cli:{MODEL}"
ENGINE_VERSION = f"claude_cli_{re.sub(r'[^a-z0-9]+', '_', MODEL.lower())}_v1"

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
CLI_TIMEOUT_SECONDS = int(OPTIONS.get("cli_timeout_seconds", 180) or 180)
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
        PROMPT_CACHE = (
            "Translate Vietnamese to English. Output numbered segments only.\n"
            "Use [N] markers in the same order as the input."
        )
    return PROMPT_CACHE


def _wait_for_rate_limit() -> None:
    """Block if we are over the per-hour rate cap."""
    if RATE_LIMIT_PER_HOUR <= 0:
        return
    with _lock:
        now = time.time()
        cutoff = now - 3600
        # Drop timestamps older than 1 hour.
        while _call_timestamps and _call_timestamps[0] < cutoff:
            _call_timestamps.pop(0)
        if len(_call_timestamps) >= RATE_LIMIT_PER_HOUR:
            sleep_for = _call_timestamps[0] + 3600 - now + 1
            if sleep_for > 0:
                time.sleep(min(sleep_for, 300))
        _call_timestamps.append(time.time())


def _call_claude_cli(user_prompt: str) -> Dict[str, object]:
    """Invoke `claude -p` with JSON output and return parsed dict.

    Returns:
        {"text": str, "usage": {input_tokens, output_tokens, cached}, "raw": dict}

    Raises:
        RuntimeError on non-zero exit or unparseable output.
    """
    _wait_for_rate_limit()
    cmd = [
        CLI_BINARY,
        "-p",
        "--max-turns", "1",
        "--no-session-persistence",
        "--output-format", "json",
        "--model", MODEL,
        "--system-prompt", _system_prompt(),
        user_prompt,
    ]
    try:
        # Force stdin closed — we are spawned via PHP→python and the inherited fd
        # may still be open and confuse some CLI versions. Defensive close.
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
            timeout=CLI_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"claude cli timeout after {CLI_TIMEOUT_SECONDS}s") from exc

    if proc.returncode != 0:
        raise RuntimeError(
            f"claude cli exit={proc.returncode} stderr={proc.stderr[:600]}"
        )
    try:
        decoded = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"claude cli stdout was not JSON: {proc.stdout[:600]}"
        ) from exc

    text = ""
    if isinstance(decoded, dict):
        # Newer schema: "result" is the assistant text. Some versions emit
        # "message" or wrap in "content". Try in order.
        text = (
            decoded.get("result")
            or decoded.get("message")
            or (decoded.get("content")[0].get("text") if isinstance(decoded.get("content"), list) and decoded.get("content") else "")
            or ""
        )

    usage = (decoded or {}).get("usage") or {}
    return {
        "text": str(text),
        "usage": {
            "input_tokens": int(usage.get("input_tokens", 0) or 0),
            "output_tokens": int(usage.get("output_tokens", 0) or 0),
            "cached_input_tokens": int(usage.get("cache_read_input_tokens", usage.get("cached_input_tokens", 0)) or 0),
        },
        "raw": decoded,
    }


def _build_user_prompt(segments: List[str]) -> str:
    parts = ["Translate the following Vietnamese segments to English. Reply with the same [N] markers."]
    parts.append("")
    for i, seg in enumerate(segments, start=1):
        parts.append(f"[{i}] {seg}")
    return "\n".join(parts)


_RESPONSE_RE = re.compile(r"^\[(\d+)\]\s*(.*)$")


def _parse_segments(response_text: str, expected: int) -> List[str]:
    """Parse a numbered response. Missing segments → empty string at that index."""
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
                # Skip preamble lines that don't start with a marker.
                continue
            buffer.append(line)
    flush()
    return out


class _ClaudeCliAdapter:
    """Adapter exposing the `translate(text)` API the common pipeline expects."""

    def translate(self, text: str) -> str:
        if not text or not text.strip():
            return text or ""
        results = self._batch([text])
        return results[0] if results else text


_adapter: Optional[_ClaudeCliAdapter] = None


def install_engine_overrides() -> None:
    """Replace Argos translator + batch helpers with Claude CLI versions.

    Also disables the glossary regex protection layer. That layer was built
    for NLLB/Argos which need single-word "anchor" substitutions (Chuẩn →
    Datum, rủi ro → Risk, …) to keep terminology stable. For an LLM-class
    translator those substitutions backfire — they corrupt the source
    sentence ("Chuẩn mực" becomes "Datum mực", "RACI" gets glued to the
    next word, etc.). The system prompt at translator-system-prompt.md
    already gives the LLM a full vocabulary contract.
    """
    global _adapter
    _adapter = _ClaudeCliAdapter()
    common._translator = _adapter

    def _claude_load_translator():
        return _adapter

    common.load_translator = _claude_load_translator

    # No-op glossary protector: pass text through untouched.
    def _no_glossary_protect(text, literals, next_index):
        return text
    common.protect_glossary_phrases = _no_glossary_protect

    vn_re = common.VIETNAMESE_CHAR_RE

    def _claude_translate_batch(segments: List[str], _translator) -> Dict[str, str]:
        if not segments:
            return {}
        translated_lines = _ClaudeCliAdapter()._batch(list(segments))
        out: Dict[str, str] = {}
        for source, candidate in zip(segments, translated_lines):
            cleaned = common.cleanup_translation(candidate or "")
            if cleaned.strip() == "":
                continue
            critical_now = common.classify_quality_issues(cleaned)["critical"]
            blocking = [
                issue for issue in critical_now
                if issue in {
                    "literal_placeholder_leak",
                    "repeated_token_loop",
                    "machine_artifact_noise",
                }
            ]
            if blocking:
                continue
            src_vn = len(vn_re.findall(source))
            tgt_vn = len(vn_re.findall(cleaned))
            if tgt_vn > src_vn:
                continue
            out[source] = cleaned
        return out

    common.translate_batch = _claude_translate_batch

    # Engine-scoped segment cache.
    #
    # `common.translate_html` (Argos pipeline) consults a shared SQLite cache
    # before invoking the translator. The cache key is hash(segment); the row
    # carries an `engine_version` column but it is NOT part of the key. Without
    # this override, the Claude CLI script reads back Argos/NLLB rows for any
    # segment that an earlier engine already processed — Claude is never
    # actually asked. Result: clicking "Retranslate" with Claude returns the
    # cached Argos output unchanged.
    #
    # Override the load/store helpers so they only see rows authored by an
    # engine in the `claude_cli_%` family. Writes stamp the row with the
    # current `ENGINE_VERSION` (e.g. `claude_cli_opus_v1`), overwriting any
    # stale Argos entry for the same segment via `ON CONFLICT`.
    _engine_tag = ENGINE_VERSION

    def _claude_load_cached_translations(segments: List[str]) -> Dict[str, str]:
        if not segments:
            return {}
        conn = common.open_cache()
        if conn is None:
            return {}
        try:
            keys = {common.cache_key(seg): seg for seg in segments}
            out: Dict[str, str] = {}
            key_items = list(keys.items())
            for start in range(0, len(key_items), 400):
                chunk = key_items[start : start + 400]
                placeholders = ",".join("?" for _ in chunk)
                rows = conn.execute(
                    "SELECT cache_key, translated_text "
                    "FROM segment_translation_cache "
                    "WHERE engine_version LIKE 'claude_cli_%' "
                    f"AND cache_key IN ({placeholders})",
                    [key for key, _seg in chunk],
                ).fetchall()
                for key, translated in rows:
                    seg = keys.get(str(key))
                    if seg is not None and isinstance(translated, str) and translated.strip():
                        candidate = common.cleanup_translation(translated)
                        if not common.has_quality_issue(candidate):
                            out[seg] = candidate
            return out
        except Exception:
            return {}
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def _claude_store_cached_translations(translated_map: Dict[str, str]) -> None:
        if not translated_map:
            return
        conn = common.open_cache()
        if conn is None:
            return
        try:
            rows = [
                (common.cache_key(source), source, translated, _engine_tag)
                for source, translated in translated_map.items()
                if source and translated
            ]
            if not rows:
                return
            conn.executemany(
                "INSERT INTO segment_translation_cache "
                "(cache_key, source_text, translated_text, engine_version, updated_at) "
                "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(cache_key) DO UPDATE SET "
                "translated_text=excluded.translated_text, "
                "engine_version=excluded.engine_version, "
                "updated_at=CURRENT_TIMESTAMP",
                rows,
            )
            conn.commit()
        except Exception:
            pass
        finally:
            try:
                conn.close()
            except Exception:
                pass

    common.load_cached_translations = _claude_load_cached_translations
    common.store_cached_translations = _claude_store_cached_translations


def _claude_batch_impl(self: _ClaudeCliAdapter, segments: List[str]) -> List[str]:
    """Batched implementation; wired into _ClaudeCliAdapter via monkey-patch."""
    if not segments:
        return []
    out: List[str] = []
    for chunk_start in range(0, len(segments), SEGMENT_BATCH_SIZE):
        chunk = segments[chunk_start:chunk_start + SEGMENT_BATCH_SIZE]
        prompt = _build_user_prompt(chunk)
        try:
            result = _call_claude_cli(prompt)
        except RuntimeError as exc:
            # Treat the entire chunk as untranslated; common helpers will
            # mark these as "no replacement" and retry via fallback chain.
            for _ in chunk:
                out.append("")
            sys.stderr.write(f"[claude_cli] chunk failed: {exc}\n")
            continue
        translations = _parse_segments(result["text"], expected=len(chunk))
        out.extend(translations)
        # Surface usage to the recorder via a stderr sidechannel (PHP can
        # parse this but isn't required to).
        usage = result["usage"]
        sys.stderr.write(
            f"[claude_cli][usage] input={usage['input_tokens']} "
            f"output={usage['output_tokens']} "
            f"cached={usage['cached_input_tokens']}\n"
        )
    return out


# Bind the impl to the adapter class so install_engine_overrides() picks it up.
_ClaudeCliAdapter._batch = _claude_batch_impl  # type: ignore[attr-defined]


def main() -> int:
    payload = common.read_payload()
    source_html = str(payload.get("source_html", "") or "")
    title = str(payload.get("title", "") or "")
    subtitle = str(payload.get("subtitle", "") or "")
    if source_html.strip() == "":
        print(json.dumps({
            "ok": False,
            "provider": PROVIDER_LABEL,
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
            "ok": False,
            "provider": PROVIDER_LABEL,
            "engine_version": "runtime_error",
            "reason": "translation_runtime_error",
            "message": str(exc),
        }, ensure_ascii=False))
        return 0

    classification = common.classify_quality_issues(translated["html"], html=True)
    if classification["critical"]:
        print(json.dumps({
            "ok": False,
            "provider": PROVIDER_LABEL,
            "engine_version": common.QUALITY_GATE_VERSION,
            "reason": "translation_quality_gate_failed",
            "message": "Generated English artifact failed locale quality gate.",
            "quality_issues": classification["critical"],
            "quality_advisory": classification["advisory"],
            "glossary_version": str(payload.get("glossary_version", "") or "repo_glossary"),
        }, ensure_ascii=False))
        return 0

    print(json.dumps({
        "ok": True,
        "provider": PROVIDER_LABEL,
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

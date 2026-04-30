#!/usr/bin/env python3
"""DCC translation provider — NLLB-200 backend.

Drop-in replacement for ``dcc_argos_vi_to_en.py`` that swaps Argos for the
distilled NLLB-200 model (Meta) running through CTranslate2 with INT8
quantization. Shared logic — HTML traversal, glossary protection, quality
gate, cache, residue scrub, engine-loop auto-collapse — is imported from
``dcc_argos_vi_to_en`` so both backends stay in lock-step.

Why a separate file rather than a refactor: the Argos script has been
quietly translating ~387 controlled documents for weeks and is frozen for
production stability. Importing it as a library lets us add a higher-quality
engine without touching the deployed code path.
"""

from __future__ import annotations

import json
import os
import sys
import threading
from pathlib import Path
from typing import Dict, List


def ensure_runtime_home_env() -> None:
    """Mirror the Argos provider's runtime-home setup before any heavy import.

    Both providers share the same private writable home so HuggingFace,
    Argos, and CTranslate2 caches all live under the supervised location
    (chowned to ``www-data`` by ``setup-dcc-translation-provider.sh``).
    """
    configured_home = os.environ.get("DCC_TRANSLATION_RUNTIME_HOME", "").strip()
    chosen_home = Path(configured_home).expanduser() if configured_home else None
    if chosen_home is None:
        env_home = os.environ.get("HOME", "").strip()
        if env_home:
            candidate = Path(env_home).expanduser()
            if candidate.exists() and os.access(candidate, os.W_OK):
                chosen_home = candidate
        if chosen_home is None:
            chosen_home = Path(__file__).resolve().parents[3] / "mom" / "data" / "cache" / "dcc-translation-runtime"

    data_home = Path(os.environ.get("XDG_DATA_HOME", "").strip() or (chosen_home / ".local" / "share")).expanduser()
    cache_home = Path(os.environ.get("XDG_CACHE_HOME", "").strip() or (chosen_home / ".cache")).expanduser()
    config_home = Path(os.environ.get("XDG_CONFIG_HOME", "").strip() or (chosen_home / ".config")).expanduser()

    for path in (chosen_home, data_home, cache_home, config_home):
        try:
            path.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

    os.environ["DCC_TRANSLATION_RUNTIME_HOME"] = str(chosen_home)
    os.environ["HOME"] = str(chosen_home)
    os.environ["XDG_DATA_HOME"] = str(data_home)
    os.environ["XDG_CACHE_HOME"] = str(cache_home)
    os.environ["XDG_CONFIG_HOME"] = str(config_home)
    os.environ.setdefault("HF_HOME", str(cache_home))
    os.environ.setdefault("TRANSFORMERS_CACHE", str(cache_home))


ensure_runtime_home_env()

# Heavy imports happen here so any failure surfaces as a structured JSON
# error rather than a stack trace, matching the Argos provider's contract.
try:
    import ctranslate2  # type: ignore
    import transformers  # type: ignore
except Exception as exc:  # pragma: no cover - runtime guard
    print(
        json.dumps(
            {
                "ok": False,
                "provider": "nllb_200_distilled_600m_int8",
                "engine_version": "nllb_dependency_missing",
                "reason": "translation_runtime_missing",
                "message": f"NLLB runtime dependency missing: {exc}",
            },
            ensure_ascii=False,
        )
    )
    raise SystemExit(0)

# Reuse the entire HTML pipeline (parsing, glossary, gates, cache, scrub).
sys.path.insert(0, str(Path(__file__).resolve().parent))
import dcc_argos_vi_to_en as common  # noqa: E402  pylint: disable=wrong-import-position


NLLB_MODEL_DIR = os.environ.get(
    "DCC_NLLB_MODEL_DIR",
    "/var/www/data-private/translation-models/nllb-200-distilled-600M-ct2-int8",
)
NLLB_TOKENIZER_DIR = os.environ.get(
    "DCC_NLLB_TOKENIZER_DIR",
    "/var/www/data-private/translation-models/nllb-200-distilled-600M",
)
NLLB_BEAM_SIZE = int(os.environ.get("DCC_NLLB_BEAM_SIZE", "1") or "1")
NLLB_MAX_DECODE_LEN = int(os.environ.get("DCC_NLLB_MAX_DECODE_LENGTH", "512") or "512")
NLLB_BATCH_TOKENS = int(os.environ.get("DCC_NLLB_BATCH_TOKENS", "2048") or "2048")
NLLB_INTRA_THREADS = int(os.environ.get("DCC_NLLB_INTRA_THREADS", "1") or "1")
NLLB_INTER_THREADS = int(os.environ.get("DCC_NLLB_INTER_THREADS", "1") or "1")

ENGINE_VERSION = "nllb_200_distilled_600m_int8_v1"
PROVIDER_LABEL = "nllb_200_distilled_600m_int8"
SRC_LANG = "vie_Latn"
TGT_LANG = "eng_Latn"

_lock = threading.Lock()
_translator = None
_tokenizer = None


def _load_engine():
    """Lazy-load CTranslate2 + tokenizer. Cached for the process lifetime."""
    global _translator, _tokenizer
    if _translator is not None and _tokenizer is not None:
        return _translator, _tokenizer
    with _lock:
        if _translator is None:
            _translator = ctranslate2.Translator(
                NLLB_MODEL_DIR,
                device="cpu",
                compute_type="int8",
                intra_threads=NLLB_INTRA_THREADS,
                inter_threads=NLLB_INTER_THREADS,
            )
        if _tokenizer is None:
            _tokenizer = transformers.AutoTokenizer.from_pretrained(
                NLLB_TOKENIZER_DIR,
                src_lang=SRC_LANG,
            )
    return _translator, _tokenizer


class _NllbAdapter:
    """Adapter exposing the ``translate(text)`` API the common pipeline expects.

    The Argos translator object also exposes ``translate(str) -> str``, so by
    duck-typing this class we can plug NLLB into all common helpers
    (translate_text, translate_batch, glossary_only_translate, residue scrub)
    without touching them.
    """

    def __init__(self, translator, tokenizer) -> None:
        self._translator = translator
        self._tokenizer = tokenizer

    def translate(self, text: str) -> str:
        if not text or not text.strip():
            return text or ""
        return _translate_lines([text])[0]


def _translate_lines(texts: List[str]) -> List[str]:
    """Translate a list of source strings, preserving order.

    Splits each input on newlines so multi-line glossary-protected payloads
    (the ``[NNNN] segment\\n[NNNN] segment`` pattern used by
    ``common.translate_batch``) round-trip cleanly. Empty lines are echoed
    back verbatim so they don't waste a decode cycle.
    """
    translator, tokenizer = _load_engine()
    if not texts:
        return []

    # Flatten to per-line sources, recording which result indices each input owns.
    sources: List[List[str]] = []
    layout: List[List[int]] = []  # outer: input index, inner: source-line indices
    for text in texts:
        line_indices: List[int] = []
        for line in text.split("\n"):
            stripped = line.strip()
            if stripped == "":
                # Mark as a literal pass-through.
                line_indices.append(-(len(sources) + 1) - 1)  # negative marker, never indexed into sources
                # Use a sentinel for empty: store in a parallel list separately.
                continue
            tokens = tokenizer.convert_ids_to_tokens(tokenizer.encode(line))
            sources.append(tokens)
            line_indices.append(len(sources) - 1)
        layout.append(line_indices)

    if sources:
        results = translator.translate_batch(
            sources,
            target_prefix=[[TGT_LANG]] * len(sources),
            beam_size=NLLB_BEAM_SIZE,
            max_decoding_length=NLLB_MAX_DECODE_LEN,
            max_batch_size=max(1, NLLB_BATCH_TOKENS // 256),
        )
        decoded: List[str] = []
        for result in results:
            tokens = result.hypotheses[0]
            # The first token is the target lang prefix we provided; strip it.
            if tokens and tokens[0] == TGT_LANG:
                tokens = tokens[1:]
            text = tokenizer.decode(
                tokenizer.convert_tokens_to_ids(tokens),
                skip_special_tokens=True,
            )
            decoded.append(text.strip())
    else:
        decoded = []

    # Reassemble per-input outputs, restoring blank lines.
    outputs: List[str] = []
    blank_indices_per_input: List[List[int]] = []
    for idx_list in layout:
        pieces: List[str] = []
        for marker in idx_list:
            if marker >= 0:
                pieces.append(decoded[marker])
            else:
                pieces.append("")
        outputs.append("\n".join(pieces))
        blank_indices_per_input.append([])
    return outputs


def install_engine_overrides() -> None:
    """Replace Argos-specific entry points in the common module with NLLB-backed ones.

    The common module's ``load_translator()`` returns the Argos translator;
    every other helper goes through that object's ``.translate()`` method.
    By overriding it we redirect the entire pipeline to NLLB without touching
    the upstream code.
    """
    translator, tokenizer = _load_engine()
    adapter = _NllbAdapter(translator, tokenizer)

    common._translator = adapter  # cached translator slot in common module
    original_loader = common.load_translator

    def _nllb_load_translator():
        return adapter

    common.load_translator = _nllb_load_translator
    common.load_translator.__wrapped__ = original_loader  # for debugging

    # Override translate_batch with a true NLLB batch path. The Argos version
    # encodes multiple segments as ``[NNNN] segment`` markers in a single
    # input string and parses ``[NNNN]`` markers from the output — that
    # approach does not survive an NMT model that doesn't preserve such
    # markers. Translating segments one-by-one (still in a single CT2 batch
    # internally) is more reliable and similar in speed.
    vn_re = common.VIETNAMESE_CHAR_RE

    def _nllb_translate_batch(segments: List[str], _translator) -> Dict[str, str]:
        if not segments:
            return {}
        translated_lines = _translate_lines(segments)
        out: Dict[str, str] = {}
        for source, candidate in zip(segments, translated_lines):
            cleaned = common.cleanup_translation(candidate)
            if cleaned.strip() == "":
                continue
            # CRITICAL: do NOT reject just because the translated segment
            # still contains Vietnamese diacritics. NLLB legitimately
            # preserves proper names (e.g. "An Bình") — rejecting forces
            # the upstream fallback to keep the ORIGINAL Vietnamese
            # segment, which is strictly worse. Only reject when the
            # translation is genuinely degenerate (engine-loop corruption,
            # leaked placeholder, machine-noise pattern) OR when it has
            # MORE Vietnamese characters than the source did. The
            # document-level tiered gate runs after assembly and catches
            # any remaining systemic issues.
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
                # The "translation" introduced more Vietnamese — almost
                # certainly the model echoed back the source. Skip so
                # upstream can try glossary-only or accept the segment.
                continue
            out[source] = cleaned
        return out

    common.translate_batch = _nllb_translate_batch


def main() -> int:
    payload = common.read_payload()
    source_html = str(payload.get("source_html", "") or "")
    title = str(payload.get("title", "") or "")
    subtitle = str(payload.get("subtitle", "") or "")
    if source_html.strip() == "":
        print(
            json.dumps(
                {
                    "ok": False,
                    "provider": PROVIDER_LABEL,
                    "engine_version": "missing_source_html",
                    "reason": "missing_source_html",
                    "message": "source_html is required.",
                },
                ensure_ascii=False,
            )
        )
        return 0

    try:
        install_engine_overrides()
        translated = common.translate_html(source_html, title, subtitle)
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "provider": PROVIDER_LABEL,
                    "engine_version": "runtime_error",
                    "reason": "translation_runtime_error",
                    "message": str(exc),
                },
                ensure_ascii=False,
            )
        )
        return 0

    classification = common.classify_quality_issues(translated["html"], html=True)
    critical_issues = classification["critical"]
    advisory_issues = classification["advisory"]
    if critical_issues:
        print(
            json.dumps(
                {
                    "ok": False,
                    "provider": PROVIDER_LABEL,
                    "engine_version": common.QUALITY_GATE_VERSION,
                    "reason": "translation_quality_gate_failed",
                    "message": "Generated English artifact failed locale quality gate.",
                    "quality_issues": critical_issues,
                    "quality_advisory": advisory_issues,
                    "glossary_version": str(payload.get("glossary_version", "") or "repo_glossary"),
                },
                ensure_ascii=False,
            )
        )
        return 0

    print(
        json.dumps(
            {
                "ok": True,
                "provider": PROVIDER_LABEL,
                "engine_version": ENGINE_VERSION,
                "glossary_version": str(payload.get("glossary_version", "") or "repo_glossary"),
                "translation_state": "machine_preview",
                "title": translated["title"],
                "subtitle": translated["subtitle"],
                "html": translated["html"],
                "quality_advisory": advisory_issues,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

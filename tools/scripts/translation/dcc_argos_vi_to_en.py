#!/usr/bin/env python3
"""DCC internal command provider: translate Vietnamese HTML to English.

Reads a JSON payload from stdin and returns a JSON result on stdout.
This script is intentionally repo-local and on-prem friendly:
- no browser DOM mutation
- no SaaS/API call
- preserves HTML structure and protected literals
"""

from __future__ import annotations

import json
import os
import re
import sys
from html import unescape
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

ROOT = Path(__file__).resolve().parents[3]


def ensure_runtime_home_env() -> None:
    configured_home = os.environ.get("DCC_TRANSLATION_RUNTIME_HOME", "").strip()
    env_home = os.environ.get("HOME", "").strip()
    chosen_home = Path(configured_home).expanduser() if configured_home else None

    if chosen_home is None:
        if env_home:
            candidate = Path(env_home).expanduser()
            if candidate.exists() and os.access(candidate, os.W_OK):
                chosen_home = candidate
            elif not candidate.exists() and os.access(str(candidate.parent), os.W_OK):
                chosen_home = candidate
        if chosen_home is None:
            chosen_home = ROOT / "mom" / "data" / "cache" / "dcc-translation-runtime"

    data_home = Path(os.environ.get("XDG_DATA_HOME", "").strip() or (chosen_home / ".local" / "share")).expanduser()
    cache_home = Path(os.environ.get("XDG_CACHE_HOME", "").strip() or (chosen_home / ".cache")).expanduser()
    config_home = Path(os.environ.get("XDG_CONFIG_HOME", "").strip() or (chosen_home / ".config")).expanduser()

    for path in (chosen_home, data_home, cache_home, config_home):
        try:
            path.mkdir(parents=True, exist_ok=True)
        except Exception:
            # Keep the env pointing at the intended runtime home so any later
            # Argos import failure reports the real permission problem.
            pass

    os.environ["DCC_TRANSLATION_RUNTIME_HOME"] = str(chosen_home)
    os.environ["HOME"] = str(chosen_home)
    os.environ["XDG_DATA_HOME"] = str(data_home)
    os.environ["XDG_CACHE_HOME"] = str(cache_home)
    os.environ["XDG_CONFIG_HOME"] = str(config_home)


ensure_runtime_home_env()

try:
    from bs4 import BeautifulSoup, NavigableString
except Exception as exc:  # pragma: no cover - runtime guard
    print(
        json.dumps(
            {
                "ok": False,
                "provider": "argos_local_vi_en",
                "engine_version": "python_dependency_missing",
                "reason": "python_dependency_missing",
                "message": f"BeautifulSoup dependency is missing: {exc}",
            },
            ensure_ascii=False,
        )
    )
    raise SystemExit(0)

try:
    import argostranslate.translate
except Exception as exc:  # pragma: no cover - runtime guard
    print(
        json.dumps(
            {
                "ok": False,
                "provider": "argos_local_vi_en",
                "engine_version": "argos_missing",
                "reason": "translation_runtime_missing",
                "message": f"Argos Translate runtime is missing: {exc}",
            },
            ensure_ascii=False,
        )
    )
    raise SystemExit(0)


GLOSSARY_PATH = ROOT / "mom" / "data" / "glossary" / "dict-data.json"
SKIP_TAGS = {
    "script",
    "style",
    "noscript",
    "code",
    "pre",
    "textarea",
    "svg",
    "math",
}
SKIP_CLASS_TOKENS = {
    "doc-code",
    "role-code",
    "entity-code",
    "iso-clause",
}
VIETNAMESE_CHAR_RE = re.compile(r"[àáạảãăắằẳẵặâấầẩẫậđèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹ]", re.I)
PROTECTED_LITERAL_PATTERNS = [
    re.compile(r"§\s*\d+(?:\.\d+)+"),
    re.compile(r"\b(?:ISO|IATF|AS)\s*\d+(?::\d+)?\b", re.I),
    re.compile(r"\b(?:SOP|WI|ANNEX|FRM|POL|TRN|JD|QMS-MAN|SYS-OPS|MRR|OJT|C\d{2}-L\d)\b(?:[-_/A-Z0-9.]*)", re.I),
    re.compile(r"\b[A-Z]{2,6}\b"),
]
CORE_PHRASES: List[Tuple[str, str]] = [
    ("thiết lập", "Establish"),
    ("điều hành chạy máy CNC", "operate CNC machines"),
    ("gia công CNC", "CNC machining"),
    ("chuẩn vận hành", "operating standard"),
    ("dữ liệu đã phát hành", "released data"),
    ("dữ liệu phát hành", "released data"),
    ("chạy đúng", "run with the correct"),
    ("người vận hành chỉ chạy trên", "The operator operates only on"),
    ("chỉ chạy trên", "operate only on"),
    ("và phải chặn", "and must stop"),
    ("theo", "according to"),
    ("tín hiệu đo", "measurement signal"),
    ("cho", "for"),
    ("để", "so that"),
    ("mỗi ca làm việc", "each shift"),
    ("mỗi ca", "each shift"),
    ("từng ca", "each shift"),
    ("người vận hành", "operator"),
    ("điểm sử dụng", "point of use"),
    ("cổng kiểm soát", "control gate"),
    ("cổng kiểm soát nội bộ", "internal control gate"),
    ("điểm dừng bắt buộc", "mandatory hold point"),
    ("hệ thống", "system"),
    ("biểu mẫu", "form"),
    ("hồ sơ", "record"),
    ("quy trình", "procedure"),
    ("hướng dẫn công việc", "work instruction"),
    ("tài liệu", "document"),
    ("tài liệu kiểm soát", "controlled document"),
    ("dữ liệu", "data"),
    ("không phù hợp", "nonconformance"),
    ("sai lệch", "deviation"),
    ("thẩm quyền", "authority"),
    ("trách nhiệm", "responsibility"),
    ("hiệu lực", "effective date"),
    ("xem xét", "review"),
    ("phê duyệt", "approval"),
    ("phát hành", "release"),
    ("ban hành", "issuance"),
    ("kiểm soát", "control"),
    ("xác minh", "verify"),
    ("xác nhận", "confirm"),
    ("đo trong quá trình", "in-process measurement"),
    ("kiểm tra trong quá trình", "in-process inspection"),
    ("tuổi dao", "tool life"),
    ("dung dịch làm mát", "coolant"),
    ("lệnh điều hành", "operating directive"),
    ("trôi lệch", "process drift"),
    ("ngay tại nguồn", "at the source"),
    ("giữ ổn định quá trình", "maintain process stability"),
    ("phản ứng theo", "respond to"),
    ("chi tiết nghi ngờ", "suspect part"),
    ("làm lại", "rework"),
    ("không được", "must not"),
    ("phải", "must"),
    ("mục đích", "Purpose"),
    ("phạm vi", "Scope"),
    ("thuật ngữ", "terminology"),
    ("nguyên tắc", "principle"),
    ("đầu vào", "input"),
    ("đầu ra", "output"),
    ("điều kiện tiên quyết", "prerequisite"),
    ("ngoại lệ", "exception"),
    ("thay đổi", "change"),
    ("hệ thống, hồ sơ và dữ liệu", "systems, records, and data"),
]
POST_FIXES = [
    ("control port", "control gate"),
    ("Control Port", "Control Gate"),
    ("force stop", "mandatory hold point"),
    ("Force Stop", "Mandatory Hold Point"),
    ("civil servants", "machining"),
    ("release data", "released data"),
    ("distribution data", "released data"),
    ("point of usee", "point of use"),
    ("the source", "the source"),
    ("inters with", "stop deviation at"),
]
SEGMENT_BATCH_SIZE = 24
SEGMENT_BATCH_MAX_CHARS = 3600

_translator = None
_glossary_phrases: List[Tuple[str, str]] | None = None


def read_payload() -> Dict[str, object]:
    raw = sys.stdin.read()
    if raw.strip() == "":
        return {}
    return json.loads(raw)


def load_translator():
    global _translator
    if _translator is not None:
        return _translator
    languages = argostranslate.translate.get_installed_languages()
    from_lang = next((lang for lang in languages if getattr(lang, "code", "") == "vi"), None)
    to_lang = next((lang for lang in languages if getattr(lang, "code", "") == "en"), None)
    if from_lang is None or to_lang is None:
        raise RuntimeError("Vietnamese-English Argos model is not installed.")
    translation = from_lang.get_translation(to_lang)
    if translation is None:
        raise RuntimeError("Vietnamese-English Argos translator is unavailable.")
    _translator = translation
    return _translator


def load_glossary_phrases() -> List[Tuple[str, str]]:
    global _glossary_phrases
    if _glossary_phrases is not None:
        return _glossary_phrases
    phrases: List[Tuple[str, str]] = list(CORE_PHRASES)
    if GLOSSARY_PATH.is_file():
        try:
            data = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
        except Exception:
            data = []
        if isinstance(data, list):
            seen = set()
            for row in data:
                if not isinstance(row, dict):
                    continue
                vi = normalize_phrase(str(row.get("vi", "")))
                en = normalize_phrase(str(row.get("meaning") or row.get("term") or ""))
                if len(vi) < 5 or len(en) < 2:
                    continue
                key = vi.casefold()
                if key in seen:
                    continue
                seen.add(key)
                phrases.append((vi, en))
    deduped = {}
    for src, dst in phrases:
        deduped.setdefault(src.casefold(), (src, dst))
    ordered = sorted(deduped.values(), key=lambda item: len(item[0]), reverse=True)
    _glossary_phrases = ordered
    return ordered


def normalize_phrase(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


def should_skip_text_node(node: NavigableString) -> bool:
    parent = getattr(node, "parent", None)
    if parent is None:
        return True
    if getattr(parent, "name", "").lower() in SKIP_TAGS:
        return True
    class_list = parent.get("class", []) if hasattr(parent, "get") else []
    joined = " ".join(class_list).lower()
    if any(token in joined for token in SKIP_CLASS_TOKENS):
        return True
    return False


def protect_regex_literals(text: str, literals: Dict[str, str], next_index: List[int]) -> str:
    protected = text
    for pattern in PROTECTED_LITERAL_PATTERNS:
        def replace(match: re.Match[str]) -> str:
            token = f"__DCC_LITERAL_{next_index[0]}__"
            next_index[0] += 1
            literals[token] = match.group(0)
            return token
        protected = pattern.sub(replace, protected)
    return protected


def protect_glossary_phrases(text: str, literals: Dict[str, str], next_index: List[int]) -> str:
    protected = text
    for source, target in load_glossary_phrases():
        if source.casefold() not in protected.casefold():
            continue
        pattern = re.compile(re.escape(source), re.I)
        def replace(match: re.Match[str]) -> str:
            token = f"__DCC_LITERAL_{next_index[0]}__"
            next_index[0] += 1
            literals[token] = target
            return token
        protected = pattern.sub(replace, protected)
    return protected


def restore_literals(text: str, literals: Dict[str, str]) -> str:
    restored = text
    for token, value in literals.items():
        restored = restored.replace(token, value)
    return restored


def cleanup_translation(text: str) -> str:
    cleaned = text
    cleaned = re.sub(r"\s+([,.;:!?])", r"\1", cleaned)
    cleaned = re.sub(r"([(\[])\s+", r"\1", cleaned)
    cleaned = re.sub(r"\s+([)\]])", r"\1", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    for src, dst in POST_FIXES:
        cleaned = cleaned.replace(src, dst)
    return cleaned.strip()


def build_translation_plan(text: str):
    if normalize_phrase(text) == "":
        return None
    if not VIETNAMESE_CHAR_RE.search(text):
        return None
    literals: Dict[str, str] = {}
    next_index = [0]
    protected = protect_glossary_phrases(text, literals, next_index)
    protected = protect_regex_literals(protected, literals, next_index)
    plain = re.sub(r"__DCC_LITERAL_\d+__", " ", protected)
    if not VIETNAMESE_CHAR_RE.search(plain):
        return {
            "original": text,
            "literals": literals,
            "parts": [("raw", protected)],
            "cores": [],
        }
    parts = re.split(r"(__DCC_LITERAL_\d+__)", protected)
    template: List[Tuple[str, str, str, str]] = []
    cores: List[str] = []
    for part in parts:
        if part == "":
            continue
        if re.fullmatch(r"__DCC_LITERAL_\d+__", part):
            template.append(("literal", part, "", ""))
            continue
        if not re.search(r"[A-Za-zÀ-ỹ]", part):
            template.append(("raw", part, "", ""))
            continue
        leading = re.match(r"^\s*", part).group(0)
        trailing = re.search(r"\s*$", part).group(0)
        core = part.strip()
        if core == "":
            template.append(("raw", part, "", ""))
            continue
        template.append(("core", leading, core, trailing))
        cores.append(core)
    return {
        "original": text,
        "literals": literals,
        "parts": template,
        "cores": cores,
    }


def parse_batched_translation_output(text: str, expected_count: int):
    markers = list(re.finditer(r"ID(\d{4})\s*:+", text))
    if len(markers) < expected_count:
        return None
    values: Dict[int, str] = {}
    for index, marker in enumerate(markers):
        key = int(marker.group(1))
        if key < 1 or key > expected_count or key in values:
            continue
        start = marker.end()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        values[key] = text[start:end].strip()
    if len(values) != expected_count:
        return None
    return [values[i] for i in range(1, expected_count + 1)]


def translate_batch(segments: List[str], translator) -> Dict[str, str]:
    if not segments:
        return {}

    payload_lines = [f"ID{index + 1:04d}::{segment}" for index, segment in enumerate(segments)]
    translated = translator.translate("\n".join(payload_lines))
    parsed = parse_batched_translation_output(translated, len(segments))
    if parsed is None:
        return {}
    return {
        segments[index]: cleanup_translation(parsed[index])
        for index in range(len(segments))
    }


def translate_core_map(cores: Iterable[str], translator) -> Dict[str, str]:
    ordered = []
    seen = set()
    for core in cores:
        if core in seen:
            continue
        seen.add(core)
        ordered.append(core)

    translated_map: Dict[str, str] = {}
    batch: List[str] = []
    batch_chars = 0

    def flush_batch() -> None:
        nonlocal batch, batch_chars
        if not batch:
            return
        batched = translate_batch(batch, translator)
        if len(batched) != len(batch):
            for item in batch:
                translated_map[item] = cleanup_translation(translator.translate(item))
        else:
            translated_map.update(batched)
        batch = []
        batch_chars = 0

    for core in ordered:
        estimated = len(core) + 12
        if batch and (len(batch) >= SEGMENT_BATCH_SIZE or (batch_chars + estimated) > SEGMENT_BATCH_MAX_CHARS):
            flush_batch()
        batch.append(core)
        batch_chars += estimated

    flush_batch()
    return translated_map


def render_translation_plan(plan, translated_cores: Dict[str, str]) -> str:
    out_parts: List[str] = []
    for kind, first, second, third in plan["parts"]:
        if kind == "literal":
            out_parts.append(first)
            continue
        if kind == "raw":
            out_parts.append(first)
            continue
        translated = translated_cores.get(second, second)
        out_parts.append(first + translated + third)
    restored = restore_literals("".join(out_parts), plan["literals"])
    return cleanup_translation(restored)


def translate_text(text: str, translator) -> str:
    plan = build_translation_plan(text)
    if plan is None:
        return text
    translated_cores = translate_core_map(plan["cores"], translator) if plan["cores"] else {}
    return render_translation_plan(plan, translated_cores)


def translate_bootstrap_seed(soup: BeautifulSoup, translator) -> None:
    header = soup.select_one(".dcc-header[data-dcc-bootstrap]")
    if header is None:
        return
    raw = header.get("data-dcc-bootstrap")
    if not raw:
        return
    try:
        payload = json.loads(unescape(raw))
    except Exception:
        return
    header_meta = payload.get("header")
    if isinstance(header_meta, dict):
        title = str(header_meta.get("title", "")).strip()
        subtitle = str(header_meta.get("subtitle", "")).strip()
        if title and VIETNAMESE_CHAR_RE.search(title):
            header_meta["title"] = translate_text(title, translator)
        if subtitle:
            header_meta["subtitle"] = translate_text(subtitle, translator)
    header["data-dcc-bootstrap"] = json.dumps(payload, ensure_ascii=False)
    header["data-dcc-locale"] = "en"


def translate_html(source_html: str, title: str, subtitle: str) -> Dict[str, str]:
    translator = load_translator()
    soup = BeautifulSoup(source_html, "html.parser")

    if soup.html is not None:
        soup.html["lang"] = "en"
        soup.html["data-qms-locale-artifact"] = "en"
    header = soup.select_one(".dcc-header")
    if header is not None:
        header["data-dcc-locale"] = "en"

    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title_tag.string.replace_with(translate_text(str(title_tag.string), translator))

    translate_bootstrap_seed(soup, translator)

    node_plans = []
    unique_cores: List[str] = []
    for node in list(soup.find_all(string=True)):
        if should_skip_text_node(node):
            continue
        original = str(node)
        plan = build_translation_plan(original)
        if plan is None:
            continue
        node_plans.append((node, plan))
        unique_cores.extend(plan["cores"])

    translated_cores = translate_core_map(unique_cores, translator)
    for node, plan in node_plans:
        original = str(node)
        translated = render_translation_plan(plan, translated_cores)
        if translated != original:
            node.replace_with(translated)

    translated_title = title if re.fullmatch(r"[\x00-\x7F\s.,:;()/_-]+", title or "") else translate_text(title, translator)
    translated_subtitle = translate_text(subtitle, translator) if subtitle else ""

    return {
        "html": str(soup),
        "title": translated_title.strip() or title.strip(),
        "subtitle": translated_subtitle.strip() or subtitle.strip(),
    }


def main() -> int:
    payload = read_payload()
    source_html = str(payload.get("source_html", "") or "")
    title = str(payload.get("title", "") or "")
    subtitle = str(payload.get("subtitle", "") or "")
    if source_html.strip() == "":
        print(
            json.dumps(
                {
                    "ok": False,
                    "provider": "argos_local_vi_en",
                    "engine_version": "missing_source_html",
                    "reason": "missing_source_html",
                    "message": "source_html is required.",
                },
                ensure_ascii=False,
            )
        )
        return 0

    try:
        translated = translate_html(source_html, title, subtitle)
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "provider": "argos_local_vi_en",
                    "engine_version": "runtime_error",
                    "reason": "translation_runtime_error",
                    "message": str(exc),
                },
                ensure_ascii=False,
            )
        )
        return 0

    print(
        json.dumps(
            {
                "ok": True,
                "provider": "argos_local_vi_en",
                "engine_version": "argos_local_vi_en_v1",
                "glossary_version": str(payload.get("glossary_version", "") or "repo_glossary"),
                "translation_state": "machine_preview",
                "title": translated["title"],
                "subtitle": translated["subtitle"],
                "html": translated["html"],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

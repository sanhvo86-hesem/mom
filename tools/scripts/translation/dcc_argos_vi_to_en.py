#!/usr/bin/env python3
"""DCC internal command provider: translate Vietnamese HTML to English.

Reads a JSON payload from stdin and returns a JSON result on stdout.
This script is intentionally repo-local and on-prem friendly:
- no browser DOM mutation
- no SaaS/API call
- preserves HTML structure and protected literals
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from html import unescape
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

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


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_GLOSSARY_PATH = ROOT / "mom" / "data" / "glossary" / "dict-data.json"
DEFAULT_GLOSSARY_ROOT = DEFAULT_GLOSSARY_PATH.parent
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

_translator = None
_glossary_phrases: Dict[str, List[Tuple[str, str]]] = {}


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


def resolve_glossary_path(raw_path: str) -> Path:
    candidate = Path(raw_path.strip()) if raw_path else DEFAULT_GLOSSARY_PATH
    try:
        resolved = candidate.resolve(strict=False)
    except Exception:
        return DEFAULT_GLOSSARY_PATH
    if resolved == DEFAULT_GLOSSARY_PATH:
        return resolved
    if DEFAULT_GLOSSARY_ROOT in resolved.parents and resolved.suffix.lower() == ".json":
        return resolved
    return DEFAULT_GLOSSARY_PATH


def load_glossary_phrases(glossary_path: Path) -> List[Tuple[str, str]]:
    cache_key = str(glossary_path)
    if cache_key in _glossary_phrases:
        return _glossary_phrases[cache_key]
    phrases: List[Tuple[str, str]] = list(CORE_PHRASES)
    if glossary_path.is_file():
        try:
            data = json.loads(glossary_path.read_text(encoding="utf-8"))
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
    _glossary_phrases[cache_key] = ordered
    return ordered


def derive_glossary_version(glossary_path: Path) -> str:
    if not glossary_path.is_file():
        return "repo_glossary_missing"
    label = "repo_glossary" if glossary_path == DEFAULT_GLOSSARY_PATH else glossary_path.stem
    try:
        digest = hashlib.sha256(glossary_path.read_bytes()).hexdigest()[:12]
    except Exception:
        return f"{label}:unreadable"
    return f"{label}:{digest}"


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


def protect_glossary_phrases(text: str, glossary_path: Path, literals: Dict[str, str], next_index: List[int]) -> str:
    protected = text
    for source, target in load_glossary_phrases(glossary_path):
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


def translate_text(text: str, translator, glossary_path: Path) -> str:
    if normalize_phrase(text) == "":
        return text
    if not VIETNAMESE_CHAR_RE.search(text):
        return text
    literals: Dict[str, str] = {}
    next_index = [0]
    protected = protect_glossary_phrases(text, glossary_path, literals, next_index)
    protected = protect_regex_literals(protected, literals, next_index)
    plain = re.sub(r"__DCC_LITERAL_\d+__", " ", protected)
    if not VIETNAMESE_CHAR_RE.search(plain):
        return restore_literals(protected, literals)
    parts = re.split(r"(__DCC_LITERAL_\d+__)", protected)
    out_parts: List[str] = []
    for part in parts:
        if part == "":
            continue
        if re.fullmatch(r"__DCC_LITERAL_\d+__", part):
            out_parts.append(part)
            continue
        if not re.search(r"[A-Za-zÀ-ỹ]", part):
            out_parts.append(part)
            continue
        leading = re.match(r"^\s*", part).group(0)
        trailing = re.search(r"\s*$", part).group(0)
        core = part.strip()
        if core == "":
            out_parts.append(part)
            continue
        out_parts.append(leading + translator.translate(core) + trailing)
    translated = "".join(out_parts)
    restored = restore_literals(translated, literals)
    return cleanup_translation(restored)


def translate_bootstrap_seed(soup: BeautifulSoup, translator, glossary_path: Path) -> None:
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
            header_meta["title"] = translate_text(title, translator, glossary_path)
        if subtitle:
            header_meta["subtitle"] = translate_text(subtitle, translator, glossary_path)
    header["data-dcc-bootstrap"] = json.dumps(payload, ensure_ascii=False)
    header["data-dcc-locale"] = "en"


def translate_html(source_html: str, title: str, subtitle: str, glossary_path: Path) -> Dict[str, str]:
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
        title_tag.string.replace_with(translate_text(str(title_tag.string), translator, glossary_path))

    translate_bootstrap_seed(soup, translator, glossary_path)

    for node in list(soup.find_all(string=True)):
        if should_skip_text_node(node):
            continue
        original = str(node)
        translated = translate_text(original, translator, glossary_path)
        if translated != original:
            node.replace_with(translated)

    translated_title = title if re.fullmatch(r"[\x00-\x7F\s.,:;()/_-]+", title or "") else translate_text(title, translator, glossary_path)
    translated_subtitle = translate_text(subtitle, translator, glossary_path) if subtitle else ""

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
    doc_code = str(payload.get("doc_code", "") or "").strip()
    source_locale = str(payload.get("source_locale", "vi") or "vi").strip().lower()
    target_locale = str(payload.get("target_locale", "en") or "en").strip().lower()
    revision = str(payload.get("source_revision") or payload.get("revision") or "").strip()
    trigger = str(payload.get("trigger", "") or "").strip()
    glossary_path = resolve_glossary_path(str(payload.get("glossary_path", "") or ""))
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
    if source_locale not in ("", "vi") or target_locale != "en":
        print(
            json.dumps(
                {
                    "ok": False,
                    "provider": "argos_local_vi_en",
                    "engine_version": "unsupported_locale_pair",
                    "reason": "unsupported_locale_pair",
                    "message": f"Unsupported locale pair: {source_locale or 'vi'}->{target_locale}",
                },
                ensure_ascii=False,
            )
        )
        return 0

    try:
        translated = translate_html(source_html, title, subtitle, glossary_path)
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
                "glossary_version": derive_glossary_version(glossary_path),
                "translation_state": "machine_preview",
                "doc_code": doc_code,
                "source_locale": source_locale or "vi",
                "target_locale": target_locale,
                "source_revision": revision,
                "trigger": trigger,
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

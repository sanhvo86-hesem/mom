from __future__ import annotations

import csv
import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
REPORT_PATH = ROOT / "_reports" / "header" / "header-ssot-report.csv"
TARGET_DIRS = [
    ROOT / "02-Tai-Lieu-He-Thong",
    ROOT / "03-Tai-Lieu-Van-Hanh",
    ROOT / "04-Bieu-Mau",
    ROOT / "10-Training-Academy",
    ROOT / "01-QMS-Portal" / "form-runtimes",
]

DIV_TOKEN_RE = re.compile(r"<div\b[^>]*>|</div>", re.I)
TITLE_TAG_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
H1_RE = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.I | re.S)
ROW_RE = re.compile(r"<div[^>]*class=[\"'][^\"']*\brow\b[^\"']*[\"'][^>]*>.*?</div>", re.I | re.S)
DOC_CODE_SPAN_RE = re.compile(r"<span[^>]*class=[\"'][^\"']*\bdoc-code\b[^\"']*[\"'][^>]*>(.*?)</span>", re.I | re.S)
DOC_NAME_RE = re.compile(r"<strong[^>]*class=[\"'][^\"']*\bdoc-name\b[^\"']*[\"'][^>]*>(.*?)</strong>", re.I | re.S)
TITLE_BLOCK_CODE_RE = re.compile(r"<span[^>]*class=[\"'][^\"']*\bdoc-code\b[^\"']*[\"'][^>]*>.*?</span>", re.I | re.S)
CODE_TITLE_RE = re.compile(r"^([A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+)\s*(?:—|-|:)\s*(.+)$")

TOKEN_MAP = {
    "api": "API",
    "ar": "AR",
    "arap": "AR/AP",
    "bom": "BOM",
    "cam": "CAM",
    "capa": "CAPA",
    "cnc": "CNC",
    "cmm": "CMM",
    "coc": "CoC",
    "cofc": "CoFC",
    "coa": "CoA",
    "csr": "CSR",
    "ctq": "CTQ",
    "dcr": "DCR",
    "dfm": "DFM",
    "ehs": "EHS",
    "erp": "ERP",
    "fai": "FAI",
    "fefo": "FEFO",
    "fifo": "FIFO",
    "fod": "FOD",
    "frm": "FRM",
    "fmea": "FMEA",
    "gs1": "GS1",
    "hr": "HR",
    "hse": "HSE",
    "iatf": "IATF",
    "iqc": "IQC",
    "ipqc": "IPQC",
    "iso": "ISO",
    "it": "IT",
    "jd": "JD",
    "job": "Job",
    "kpi": "KPI",
    "lab": "LAB",
    "lpa": "LPA",
    "m365": "M365",
    "mes": "MES",
    "mrr": "MRR",
    "msa": "MSA",
    "nc": "NC",
    "ncr": "NCR",
    "ojt": "OJT",
    "po": "PO",
    "ppc": "PPC",
    "ppe": "PPE",
    "qa": "QA",
    "qc": "QC",
    "qms": "QMS",
    "raci": "RACI",
    "rfq": "RFQ",
    "scar": "SCAR",
    "semi": "SEMI",
    "sla": "SLA",
    "sop": "SOP",
    "sor": "SoR",
    "spc": "SPC",
    "sscc": "SSCC",
    "ssot": "SSOT",
    "sys": "SYS",
    "trn": "TRN",
    "uat": "UAT",
    "wi": "WI",
    "wip": "WIP",
}
LOWER_WORDS = {"a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "via", "with"}


def iter_docs() -> list[Path]:
    docs: list[Path] = []
    for folder in TARGET_DIRS:
        if folder.is_dir():
            docs.extend(
                sorted(
                    path for path in folder.rglob("*.html")
                    if "_Archive" not in path.parts and "_Deleted" not in path.parts
                )
            )
    return docs


def strip_tags(value: str) -> str:
    return html.unescape(re.sub(r"<.*?>", "", value)).strip()


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def find_balanced_div(text: str, marker: str) -> tuple[int, int, str] | None:
    start = text.find(marker)
    if start < 0:
        return None
    depth = 0
    end = None
    for token in DIV_TOKEN_RE.finditer(text, start):
        raw = token.group(0).lower()
        if raw.startswith("<div"):
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                end = token.end()
                break
    if end is None:
        return None
    return start, end, text[start:end]


def scan_extract_code(file_name: str) -> str:
    stem = Path(file_name).stem
    patterns = [
        r"^(sop-\d{3})",
        r"^(frm-\d{3})",
        r"^(wi-\d{3})",
        r"^(annex-\d{3})",
        r"^(ref-\d{3})",
        r"^(jd-[a-z0-9-]+)",
        r"^(dept-[a-z0-9-]+)",
        r"^(raci-[a-z0-9-]+)",
        r"^(authority-[a-z0-9-]+)",
        r"^((?:sop|proc|wi|frm|annex|pol|qms|dept|trn|sys|form|mrr)-[a-z0-9-]+)",
        r"^(lab-\d+)",
    ]
    for pattern in patterns:
        match = re.match(pattern, stem, re.I)
        if match:
            return match.group(1).upper()
    return re.sub(r"[^A-Z0-9-]", "-", stem.upper())[:40].strip("-")


def derive_expected_code(path: Path, existing_code: str = "") -> str:
    stem = path.stem.lower()
    patterns = [
        r"^(sop-\d{3})(?:[-_]|$)",
        r"^(frm-\d{3})(?:[-_]|$)",
        r"^(wi-\d{3})(?:[-_]|$)",
        r"^(annex-\d{3})(?:[-_]|$)",
        r"^(pol-qms-\d{3})(?:[-_]|$)",
        r"^(qms-man-\d{3})(?:[-_]|$)",
        r"^(sys-ops-\d+)(?:[-_]|$)",
        r"^(trn-ops-\d+)(?:[-_]|$)",
        r"^(mrr-g\d+)(?:[-_]|$)",
        r"^(mrr-\d{2})(?:[-_]|$)",
        r"^(c\d+-l\d+)(?:[-_]|$)",
        r"^(lab-\d+)(?:[-_]|$)",
    ]
    for pattern in patterns:
        match = re.match(pattern, stem, re.I)
        if match:
            return match.group(1).upper()
    return existing_code or scan_extract_code(path.name)


def parse_code_title(text: str) -> tuple[str, str] | None:
    plain = normalize_spaces(strip_tags(text))
    match = CODE_TITLE_RE.match(plain)
    if not match:
        return None
    return match.group(1).strip().upper(), match.group(2).strip()


def extract_code(text: str, file_name: str) -> str:
    block = find_balanced_div(text, '<div class="meta">')
    if block:
        code_match = DOC_CODE_SPAN_RE.search(block[2])
        if code_match:
            return normalize_spaces(strip_tags(code_match.group(1))).upper()
        rows = ROW_RE.findall(block[2])
        if rows:
            row_text = normalize_spaces(strip_tags(rows[0]))
            row_match = re.search(r"(?:Mã|Code)\s*:?\s*([A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+)", row_text)
            if row_match:
                return row_match.group(1).strip().upper()

    title_block = find_balanced_div(text, '<div class="title">')
    if title_block:
        name_match = DOC_NAME_RE.search(title_block[2])
        if name_match:
            parsed = parse_code_title(name_match.group(1))
            if parsed:
                return parsed[0]
        parsed = parse_code_title(title_block[2])
        if parsed:
            return parsed[0]

    h1_match = H1_RE.search(text)
    if h1_match:
        parsed = parse_code_title(h1_match.group(1))
        if parsed:
            return parsed[0]
    return scan_extract_code(file_name)


def extract_existing_title(text: str) -> str:
    title_block = find_balanced_div(text, '<div class="title">')
    if title_block:
        name_match = DOC_NAME_RE.search(title_block[2])
        if name_match:
            parsed = parse_code_title(name_match.group(1))
            if parsed:
                return parsed[1]
            return normalize_spaces(strip_tags(name_match.group(1)))
        strong_match = re.search(r"<strong[^>]*>(.*?)</strong>", title_block[2], re.I | re.S)
        if strong_match:
            parsed = parse_code_title(strong_match.group(1))
            if parsed:
                return parsed[1]
            return normalize_spaces(strip_tags(strong_match.group(1)))
    return ""


def standard_title_token(token: str, index: int) -> str:
    lower = token.strip().lower()
    if not lower:
        return ""
    if lower in TOKEN_MAP:
        return TOKEN_MAP[lower]
    if re.fullmatch(r"\d+", lower):
        return lower
    if re.fullmatch(r"[a-z]+\d+[a-z0-9]*", lower) or re.fullmatch(r"\d+[a-z]+[a-z0-9]*", lower):
        return lower.upper()
    if index > 0 and lower in LOWER_WORDS:
        return lower
    return lower[:1].upper() + lower[1:]


def derive_standard_title(path: Path, code: str, existing_title: str = "") -> str:
    stem = path.stem
    if stem.lower() == "index":
        existing_ascii = existing_title.strip()
        return existing_ascii if existing_ascii else code

    work = stem
    strip_prefix = bool(re.fullmatch(
        r"(?:SOP|WI|ANNEX|FRM)-\d{3}|POL-QMS-\d{3}|QMS-MAN-\d{3}|SYS-OPS-\d+|TRN-OPS-\d+|MRR-\d{2}|MRR-G\d+|C\d+-L\d+|LAB-\d+",
        code,
        re.I,
    ))
    code_tokens = [token for token in re.split(r"[^a-z0-9]+", code.lower()) if token]
    if strip_prefix and code_tokens:
        prefix_pattern = r"^" + r"[-_]+".join(re.escape(token) for token in code_tokens) + r"(?:[-_]+)?"
        stripped = re.sub(prefix_pattern, "", work, flags=re.I)
        if stripped != work:
            work = stripped

    lower_parts = {part.lower() for part in path.parts}
    if "03-job-descriptions" in lower_parts and work.lower().startswith("jd-"):
        work = re.sub(r"^jd(?:[-_]+)", "", work, flags=re.I)
    if "02-department-handbooks" in lower_parts and work.lower().startswith("dept-"):
        work = re.sub(r"^dept(?:[-_]+)", "", work, flags=re.I)
    work = work.strip("-_ ")
    if not work:
        return existing_title.strip() or code

    tokens = [token for token in re.split(r"[-_]+", work) if token]
    converted = [standard_title_token(token, index) for index, token in enumerate(tokens)]
    title = normalize_spaces(" ".join(part for part in converted if part))
    return title or existing_title.strip() or code


def should_process(text: str) -> bool:
    return 'class="form-header"' in text or "class='form-header'" in text


def is_current_header_scope(path: Path, code: str) -> bool:
    stem = path.stem.lower()
    if stem == "index":
        return False
    prefixes = (
        "sop-",
        "wi-",
        "annex-",
        "frm-",
        "jd-",
        "dept-",
        "raci-",
        "authority-",
        "pol-",
        "qms-",
        "mrr-",
    )
    if stem.startswith(prefixes):
        return True
    return code.startswith(("SOP-", "WI-", "ANNEX-", "FRM-", "JD-", "DEPT-", "RACI-", "AUTHORITY-", "POL-", "QMS-", "MRR-"))


def row_values(text: str) -> tuple[str, str]:
    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return "", ""
    rows = ROW_RE.findall(block[2])
    owner = rows[3] if len(rows) > 3 else ""
    approver = rows[4] if len(rows) > 4 else ""
    return owner, approver


def main() -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    findings: list[dict[str, str]] = []
    for path in iter_docs():
        text = path.read_text(encoding="utf-8", errors="ignore")
        if not should_process(text):
            continue

        current_code = extract_code(text, path.name)
        code = derive_expected_code(path, current_code)
        title = extract_existing_title(text)
        expected = derive_standard_title(path, code, title)
        rel = path.relative_to(ROOT).as_posix()
        in_scope = is_current_header_scope(path, code)

        if in_scope and current_code and current_code != code:
            findings.append({"path": rel, "finding": "DOC_CODE_MISMATCH", "detail": f"expected `{code}` but found `{current_code}`"})

        title_block = find_balanced_div(text, '<div class="title">')
        block_html = title_block[2] if title_block else ""
        name_match = DOC_NAME_RE.search(block_html)
        current_doc_name = normalize_spaces(strip_tags(name_match.group(1))) if name_match else ""
        if in_scope and current_doc_name != expected:
            findings.append({"path": rel, "finding": "DOC_NAME_NOT_SSOT", "detail": f"expected `{expected}` but found `{current_doc_name}`"})
        if in_scope and current_doc_name and re.search(r"[^\x20-\x7E]", current_doc_name):
            findings.append({"path": rel, "finding": "DOC_NAME_NON_ASCII", "detail": f"doc-name contains non-ASCII text: `{current_doc_name}`"})
        if in_scope and TITLE_BLOCK_CODE_RE.search(block_html):
            findings.append({"path": rel, "finding": "TITLE_BLOCK_HAS_DOC_CODE", "detail": "title block still contains a visible .doc-code span"})

        title_match = TITLE_TAG_RE.search(text)
        current_title_tag = normalize_spaces(strip_tags(title_match.group(1))) if title_match else ""
        expected_title_tag = f"{code} - {expected} | HESEM QMS"
        if in_scope and current_title_tag and current_title_tag != expected_title_tag:
            findings.append({"path": rel, "finding": "TITLE_TAG_MISMATCH", "detail": f"expected `{expected_title_tag}` but found `{current_title_tag}`"})

        h1_match = H1_RE.search(text)
        current_h1 = normalize_spaces(strip_tags(h1_match.group(1))) if h1_match else ""
        expected_h1 = f"{code} - {expected}"
        if in_scope and current_h1 and current_h1 != expected_h1:
            findings.append({"path": rel, "finding": "H1_MISMATCH", "detail": f"expected `{expected_h1}` but found `{current_h1}`"})

        meta_block = find_balanced_div(text, '<div class="meta">')
        if in_scope and meta_block:
            meta_rows = ROW_RE.findall(meta_block[2])
            if len(meta_rows) != 5:
                findings.append({"path": rel, "finding": "META_ROW_COUNT_MISMATCH", "detail": f"expected 5 meta rows but found `{len(meta_rows)}`"})
            if re.search(r"<t(?:d|h|r)\b", meta_block[2], re.I):
                findings.append({"path": rel, "finding": "META_CONTAINS_TABLE_MARKUP", "detail": "meta block still contains table markup from body content"})

        owner_row, approver_row = row_values(text)
        if in_scope and owner_row and "<a " not in owner_row.lower():
            findings.append({"path": rel, "finding": "OWNER_NOT_LINKED", "detail": "owner row does not contain a linked JD/department chip"})
        if in_scope and not owner_row:
            findings.append({"path": rel, "finding": "OWNER_ROW_MISSING", "detail": "header meta is missing the owner row"})
        if in_scope and approver_row and "<a " not in approver_row.lower():
            findings.append({"path": rel, "finding": "APPROVER_NOT_LINKED", "detail": "approver row does not contain a linked JD role chip"})
        if in_scope and not approver_row:
            findings.append({"path": rel, "finding": "APPROVER_ROW_MISSING", "detail": "header meta is missing the approver row"})

    with REPORT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "finding", "detail"])
        writer.writeheader()
        writer.writerows(findings)

    print(f"findings={len(findings)}")


if __name__ == "__main__":
    main()

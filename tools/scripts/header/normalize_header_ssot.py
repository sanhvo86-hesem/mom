from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
TARGET_DIRS = [
    ROOT / "02-Tai-Lieu-He-Thong",
    ROOT / "03-Tai-Lieu-Van-Hanh",
    ROOT / "04-Bieu-Mau",
    ROOT / "10-Training-Academy",
    ROOT / "01-QMS-Portal" / "form-runtimes",
]

DIV_TOKEN_RE = re.compile(r"<div\b[^>]*>|</div>", re.I)
TITLE_TAG_RE = re.compile(r"<title[^>]*>.*?</title>", re.I | re.S)
H1_RE = re.compile(r"(<h1\b[^>]*>).*?(</h1>)", re.I | re.S)
SUB_RE = re.compile(r"(<span[^>]*class=[\"'][^\"']*\bsub-vn\b[^\"']*[\"'][^>]*>.*?</span>)", re.I | re.S)
MUTED_RE = re.compile(r"(<span[^>]*class=[\"'][^\"']*\bmuted\b[^\"']*[\"'][^>]*>.*?</span>)", re.I | re.S)
DOC_CODE_SPAN_RE = re.compile(r"<span[^>]*class=[\"'][^\"']*\bdoc-code\b[^\"']*[\"'][^>]*>(.*?)</span>", re.I | re.S)
META_BLOCK_RE = re.compile(r"<div[^>]*class=[\"'][^\"']*\bmeta\b[^\"']*[\"'][^>]*>", re.I)
ROW_RE = re.compile(r"<div[^>]*class=[\"'][^\"']*\brow\b[^\"']*[\"'][^>]*>.*?</div>", re.I | re.S)
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
MRR_OWNER_HTML = (
    '<span class="entity-cluster role-cluster">'
    '<a class="entity-link role-link" href="../../../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html" '
    'title="QA Manager (Truong bo phan dam bao chat luong)"><span class="entity-code role-code">QA</span></a>'
    '<span class="entity-sep role-sep">/</span>'
    '<a class="entity-link role-link" href="../../../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html" '
    'title="QMS Engineer (Ky su he thong QMS)"><span class="entity-code role-code">QMS</span></a>'
    "</span>"
)
MRR_APPROVER_HTML = (
    '<span class="entity-cluster role-cluster">'
    '<a class="entity-link role-link" href="../../../02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html" '
    'title="Chief Executive Officer (Tong Giam doc)"><span class="entity-code role-code">CEO</span></a>'
    "</span>"
)


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


def extract_existing_code(text: str) -> str:
    block = find_balanced_div(text, '<div class="meta">')
    if block:
        code_match = DOC_CODE_SPAN_RE.search(block[2])
        if code_match:
            return normalize_spaces(strip_tags(code_match.group(1))).upper()
        rows = ROW_RE.findall(block[2])
        if rows:
            row_text = normalize_spaces(strip_tags(rows[0]))
            row_match = re.search(r"(?:Mã|Code)\s*:?\s*([A-Z][A-Z0-9-]+(?:-[A-Z0-9]+)*)", row_text)
            if row_match:
                return row_match.group(1).strip().upper()

    title_block = find_balanced_div(text, '<div class="title">')
    if title_block:
        parsed = parse_code_title(title_block[2])
        if parsed:
            return parsed[0]

    h1_match = H1_RE.search(text)
    if h1_match:
        parsed = parse_code_title(h1_match.group(0))
        if parsed:
            return parsed[0]

    title_match = TITLE_TAG_RE.search(text)
    if title_match:
        title_plain = normalize_spaces(strip_tags(title_match.group(0))).replace("| HESEM QMS", "").strip()
        parsed = parse_code_title(title_plain)
        if parsed:
            return parsed[0]
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
        if existing_ascii and not re.search(r"[^\x20-\x7E]", existing_ascii):
            return existing_ascii
        return code

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
        existing_ascii = existing_title.strip()
        if existing_ascii and not re.search(r"[^\x20-\x7E]", existing_ascii):
            return existing_ascii
        return code

    tokens = [token for token in re.split(r"[-_]+", work) if token]
    converted = [standard_title_token(token, index) for index, token in enumerate(tokens)]
    title = normalize_spaces(" ".join(part for part in converted if part))
    if title:
        return title
    existing_ascii = existing_title.strip()
    if existing_ascii and not re.search(r"[^\x20-\x7E]", existing_ascii):
        return existing_ascii
    return code


def extract_existing_title(text: str) -> str:
    title_block = find_balanced_div(text, '<div class="title">')
    if title_block:
        strong_match = re.search(r"<strong[^>]*>(.*?)</strong>", title_block[2], re.I | re.S)
        if strong_match:
            parsed = parse_code_title(strong_match.group(1))
            if parsed:
                return parsed[1]
            return normalize_spaces(strip_tags(strong_match.group(1)))
    h1_match = H1_RE.search(text)
    if h1_match:
        parsed = parse_code_title(h1_match.group(0))
        if parsed:
            return parsed[1]
    return ""


def normalize_title_block(text: str, ssot_title: str) -> str:
    block = find_balanced_div(text, '<div class="title">')
    if not block:
        return text
    sub_match = SUB_RE.search(block[2])
    muted_match = MUTED_RE.search(block[2])
    replacement = '<div class="title">\n'
    replacement += f'<strong class="doc-name">{html.escape(ssot_title, quote=True)}</strong>'
    if sub_match:
        replacement += "\n" + sub_match.group(1)
    if muted_match:
        replacement += "\n" + muted_match.group(1)
    replacement += "\n</div>"
    return text[:block[0]] + replacement + text[block[1]:]


def normalize_title_tag(text: str, code: str, ssot_title: str) -> str:
    replacement = f"<title>{html.escape(code, quote=True)} - {html.escape(ssot_title, quote=True)} | HESEM QMS</title>"
    if TITLE_TAG_RE.search(text):
        return TITLE_TAG_RE.sub(replacement, text, count=1)
    return text


def normalize_h1(text: str, code: str, ssot_title: str) -> str:
    replacement = rf"\1{html.escape(code, quote=True)} - {html.escape(ssot_title, quote=True)}\2"
    return H1_RE.sub(replacement, text, count=1)


def normalize_meta_code_row(text: str, code: str) -> str:
    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return text
    rows = ROW_RE.findall(block[2])
    if not rows:
        return text
    first = rows[0]
    new_first = re.sub(
        r"(<span[^>]*>\s*(?:<b>.*?</b>)\s*</span>)\s*<span[^>]*>.*?</span>",
        rf'\1<span class="doc-code">{html.escape(code, quote=True)}</span>',
        first,
        count=1,
        flags=re.I | re.S,
    )
    if new_first == first:
        return text
    rows[0] = new_first
    new_block = "<div class=\"meta\">" + "".join(rows) + "</div>"
    return text[:block[0]] + new_block + text[block[1]:]


def normalize_mrr_meta_links(text: str, path: Path) -> str:
    lower_parts = {part.lower() for part in path.parts}
    if "10-training-academy" not in lower_parts or "03-mrr-pack" not in lower_parts:
        return text

    block = find_balanced_div(text, '<div class="meta">')
    if not block:
        return text
    rows = ROW_RE.findall(block[2])
    if len(rows) < 3:
        return text

    rebuilt = '<div class="meta">' + "".join(rows[:3])
    rebuilt += '<div class="row"><span><b>Chủ sở hữu:</b></span><span>' + MRR_OWNER_HTML + "</span></div>"
    rebuilt += '<div class="row"><span><b>Phê duyệt:</b></span><span>' + MRR_APPROVER_HTML + "</span></div>"
    rebuilt += "</div>"
    return text[:block[0]] + rebuilt + text[block[1]:]


def should_process(text: str) -> bool:
    return 'class="form-header"' in text or "class='form-header'" in text


def main() -> None:
    updated = 0
    skipped = 0
    for path in iter_docs():
        text = path.read_text(encoding="utf-8", errors="ignore")
        if not should_process(text):
            skipped += 1
            continue

        code = derive_expected_code(path, extract_existing_code(text))
        if not code:
            skipped += 1
            continue

        existing_title = extract_existing_title(text)
        ssot_title = derive_standard_title(path, code, existing_title)
        if not ssot_title:
            skipped += 1
            continue

        normalized = text
        normalized = normalize_title_block(normalized, ssot_title)
        normalized = normalize_title_tag(normalized, code, ssot_title)
        normalized = normalize_h1(normalized, code, ssot_title)
        normalized = normalize_meta_code_row(normalized, code)
        normalized = normalize_mrr_meta_links(normalized, path)

        if normalized != text:
            path.write_text(normalized, encoding="utf-8", newline="")
            updated += 1

    print(f"updated={updated}")
    print(f"skipped={skipped}")


if __name__ == "__main__":
    main()

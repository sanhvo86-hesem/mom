from __future__ import annotations

import json
import os
import re
import unicodedata
from copy import deepcopy
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

from lxml import etree, html
from openpyxl import load_workbook
from role_boundary_profiles import ROLE_BOUNDARY_PROFILES


ROOT = Path(__file__).resolve().parents[3]
REGISTRY_PATH = ROOT / "tools" / "data" / "role-registry-job-order-cnc.json"
WORKBOOK_PATH = ROOT / "tools" / "data" / "qms-terminology-dictionary.xlsx"
UNRESOLVED_REPORT = ROOT / "tools" / "data" / "role-normalization-unresolved.txt"


def expr(*codes: str, joiner: str = " / ") -> dict:
    return {"codes": list(codes), "joiner": joiner}


def bundle(name: str, joiner: str = " / ") -> dict:
    return {"bundle": name, "joiner": joiner}


def normalize_ws(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def fold_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", normalize_ws(value))
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return stripped.lower()


def has_class(element: etree._Element, token: str) -> bool:
    return token in ((element.get("class") or "").split())


def element_text(element: etree._Element) -> str:
    return normalize_ws(" ".join(element.itertext()))


def load_registry() -> dict:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def split_role_hat(code: str) -> tuple[str, str | None]:
    if "[" in code and code.endswith("]"):
        base, hat = code[:-1].split("[", 1)
        return base, hat
    return code, None


def expand_spec(spec: dict, registry: dict) -> tuple[list[str], str]:
    joiner = spec.get("joiner", " / ")
    if "bundle" in spec:
        return list(registry["bundles"][spec["bundle"]]), joiner
    return list(spec["codes"]), joiner


def resolve_entity(code: str, registry: dict) -> tuple[str, dict, str | None]:
    base, hat = split_role_hat(code)
    if base in registry["roles"]:
        return "role", registry["roles"][base], hat
    if base in registry.get("departments", {}):
        return "department", registry["departments"][base], None
    raise KeyError(f"Unknown role/department code: {code}")


def entity_link(code: str, current_file: Path, registry: dict) -> str:
    entity_type, meta, hat = resolve_entity(code, registry)
    title = meta["title_en"]
    if hat:
        title = f'{title} [{registry["hats"][hat]["label_en"]}]'
    target_key = "jd_path" if entity_type == "role" else "handbook_path"
    target_abs = ROOT / meta[target_key]
    href = os.path.relpath(target_abs, current_file.parent).replace("\\", "/")
    link_class = "role-link" if entity_type == "role" else "dept-link"
    code_class = "role-code" if entity_type == "role" else "dept-code"
    return (
        f'<a class="entity-link {link_class}" href="{href}" title="{title} ({meta["title_vi"]})">'
        f'<span class="entity-code {code_class}">{code}</span></a>'
    )


def render_spec(spec: dict, current_file: Path, registry: dict) -> str:
    codes, joiner = expand_spec(spec, registry)
    sep = f'<span class="entity-sep role-sep">{joiner.strip()}</span>'
    chips = [entity_link(code, current_file, registry) for code in codes]
    body = "".join(chips[i] + (sep if i < len(chips) - 1 else "") for i in range(len(chips)))
    return f'<span class="entity-cluster role-cluster">{body}</span>'


def token_is_entity(token: str, registry: dict) -> bool:
    base, _ = split_role_hat(token)
    return base in registry["roles"] or base in registry.get("departments", {})


def render_token_cluster(tokens: list[str], current_file: Path, registry: dict, joiner: str = " / ") -> str:
    if not tokens:
        return ""
    sep = f'<span class="entity-sep role-sep">{joiner.strip()}</span>'
    chunks: list[str] = []
    for index, token in enumerate(tokens):
        if token_is_entity(token, registry):
            chunks.append(entity_link(token, current_file, registry))
        else:
            chunks.append(f'<span class="chip">{xml_escape(token)}</span>')
        if index < len(tokens) - 1:
            chunks.append(sep)
    return f'<span class="entity-cluster role-cluster">{"".join(chunks)}</span>'


def set_element_html(element: etree._Element, html_fragment: str) -> None:
    for child in list(element):
        element.remove(child)
    element.text = None
    prev = None
    for frag in html.fragments_fromstring(html_fragment):
        if isinstance(frag, str):
            if prev is None:
                element.text = (element.text or "") + frag
            else:
                prev.tail = (prev.tail or "") + frag
        else:
            element.append(frag)
            prev = frag


def parse_html_document(source_text: str) -> etree._Element:
    parser = html.HTMLParser(encoding="utf-8")
    if "<html" in source_text.lower():
        return html.document_fromstring(source_text, parser=parser)
    return html.fromstring(source_text, parser=parser)


def serialize_html_document(doc: etree._Element) -> str:
    if doc.tag.lower() == "html":
        return html.tostring(doc, encoding="unicode", method="html", doctype="<!DOCTYPE html>")
    return html.tostring(doc, encoding="unicode", method="html")


def extract_jd_body_source(source_text: str) -> str:
    if "<html" in source_text.lower():
        match = re.search(r"<body[^>]*>(.*)</body>", source_text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1)
    marker = source_text.find('<div class="container"')
    if marker != -1:
        return source_text[marker:]
    return source_text


def extract_jd_head_assets(source_text: str, doc_path: Path) -> str:
    if "<html" in source_text.lower() and "<head" in source_text.lower():
        head_match = re.search(r"<head[^>]*>(.*?)</head>", source_text, flags=re.IGNORECASE | re.DOTALL)
        head_source = head_match.group(1) if head_match else ""
    else:
        marker = source_text.find('<div class="container"')
        head_source = source_text[:marker] if marker != -1 else ""

    style_blocks = re.findall(r"<style\b[^>]*>.*?</style>", head_source, flags=re.IGNORECASE | re.DOTALL)
    link_tags = re.findall(r"<link\b[^>]*>", head_source, flags=re.IGNORECASE)

    prefix = head_source.split(style_blocks[0], 1)[0] if style_blocks else head_source
    raw_css = ""
    if "</style>" in prefix and "<style" not in prefix.lower():
        raw_candidate = prefix.split("</style>", 1)[0]
        raw_candidate = re.sub(r"<[^>]+>", "", raw_candidate).strip()
        if raw_candidate and "{" in raw_candidate and "}" in raw_candidate:
            raw_css = raw_candidate

    assets: list[str] = []
    if raw_css:
        assets.append(f"<style>\n{raw_css}\n</style>")

    for block in style_blocks:
        cleaned = block.strip()
        if cleaned and cleaned not in assets:
            assets.append(cleaned)

    asset_href = os.path.relpath(ROOT / "assets" / "style.css", doc_path.parent).replace("\\", "/")
    if not any("assets/style.css" in link for link in link_tags):
        link_tags.append(f'<link rel="stylesheet" href="{asset_href}">')

    for link in link_tags:
        cleaned = link.replace("/>", ">").strip()
        if cleaned and cleaned not in assets:
            assets.append(cleaned)

    return "\n".join(assets)


def build_html_document(title_text: str, head_assets: str, body_html: str) -> str:
    parts = [
        "<!DOCTYPE html>",
        '<html lang="vi">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta content="width=device-width, initial-scale=1.0" name="viewport">',
        f"<title>{xml_escape(title_text)}</title>",
    ]
    if head_assets.strip():
        parts.append(head_assets.strip())
    parts.extend([
        "</head>",
        "<body>",
        body_html.strip(),
        "</body>",
        "</html>",
        "",
    ])
    return "\n".join(parts)


def title_aliases() -> dict[str, str]:
    return {
        "Tổng Giám đốc": "Chief Executive Officer",
        "Tong Giam doc": "Chief Executive Officer",
        "Sản xuất Giám đốc": "Production Director",
        "Giám đốc Sản xuất": "Production Director",
        "Kỹ thuật Lead / Manager": "Engineering Lead / Manager",
        "Kỹ thuật Lead/Manager": "Engineering Lead / Manager",
        "Trưởng Engineering": "Engineering Lead / Manager",
        "QA Lead": "QA Manager",
        "Trưởng QA": "QA Manager",
        "QMS Coordinator": "QMS Engineer",
        "QA Engineer": "Quality Engineer",
        "Kỹ sư Chất lượng": "Quality Engineer",
        "QC Lead": "QC Inspector Lead",
        "QC Team Leader": "QC Inspector Lead",
        "Metrology Lead": "Metrology and Calibration Specialist",
        "Quy trình Engineer": "Process Engineer",
        "Kỹ sư Quy trình": "Process Engineer",
        "Customer Dịch vụ": "Customer Service",
        "Người định giá": "Estimator",
        "Báo giá": "Estimator",
        "Trưởng Chuỗi cung ứng": "Supply Chain Manager",
        "Trưởng Supply Chain": "Supply Chain Manager",
        "Mua hàng": "Buyer / Purchasing",
        "Kho Nhân viên văn phòng": "Warehouse Clerk",
        "Nhân viên Kho": "Warehouse Clerk",
        "Tooling Thủ kho": "Tool Crib / Tool Storekeeper",
        "Thủ kho Dao cụ": "Tool Crib / Tool Storekeeper",
        "Hậu cần / Giao vận": "Logistics / Shipping Coordinator",
        "Quản trị IT": "IT Admin",
        "Governance viên hệ thống Epicor": "Epicor System Administrator",
        "HR Lead": "HR Manager",
        "EHS Manager": "EHS Specialist",
        "Trưởng ca": "Shift Leader",
        "Setup Leader": "Setup Technician",
        "Operator": "CNC Operator",
        "Production Operator": "CNC Operator",
        "Kỹ thuật viên Bảo trì": "Maintenance Technician",
        "Workshop Manager": "CNC Workshop Manager",
        "Production Engineer-IE": "Production Engineer / Industrial Engineer",
        "Production Engineer / IE": "Production Engineer / Industrial Engineer",
        "Manufacturing Engineer": "Production Engineer / Industrial Engineer",
        "Continuous Improvement Lead": "Production Engineer / Industrial Engineer [CI]",
        "Product Safety Officer": "QA Manager [PSO]"
    }


def department_alias_map() -> dict[str, dict]:
    return {
        "Executive": expr("D-EXEC"),
        "Executive Department": expr("D-EXEC"),
        "Phòng Điều hành": expr("D-EXEC"),
        "EXEC": expr("D-EXEC"),
        "Sales": expr("D-SCS"),
        "Commercial": expr("D-SCS"),
        "Kinh doanh": expr("D-SCS"),
        "Sales & Customer Service": expr("D-SCS"),
        "Sales and Customer Service": expr("D-SCS"),
        "Sales and Customer Service Department": expr("D-SCS"),
        "Phòng Kinh doanh và Dịch vụ khách hàng": expr("D-SCS"),
        "Kinh doanh-CS": expr("D-SCS"),
        "Kinh doanh / CS": expr("D-SCS"),
        "Kinh doanh & Customer Dịch vụ": expr("D-SCS"),
        "SAL": expr("D-SCS"),
        "Engineering": expr("D-ENG"),
        "Engineering Department": expr("D-ENG"),
        "Kỹ thuật": expr("D-ENG"),
        "Phòng Kỹ thuật": expr("D-ENG"),
        "ENG": expr("D-ENG"),
        "Production": expr("D-PROD"),
        "Production Department": expr("D-PROD"),
        "Sản xuất": expr("D-PROD"),
        "Phòng Sản xuất": expr("D-PROD"),
        "PRO": expr("D-PROD"),
        "Planning": expr("D-PPC"),
        "Production Planning": expr("D-PPC"),
        "Production Control": expr("D-PPC"),
        "Kế hoạch": expr("D-PPC"),
        "Điều độ": expr("D-PPC"),
        "Bộ phận Điều độ và Kiểm soát sản xuất": expr("D-PPC"),
        "PPC": expr("D-PPC"),
        "Quality": expr("D-QUAL"),
        "Quality Department": expr("D-QUAL"),
        "Chất lượng": expr("D-QUAL"),
        "Phòng Chất lượng": expr("D-QUAL"),
        "QUAL": expr("D-QUAL"),
        "Supply Chain": expr("D-SCM"),
        "Supply Chain Department": expr("D-SCM"),
        "Chuỗi cung ứng": expr("D-SCM"),
        "Phòng Chuỗi cung ứng": expr("D-SCM"),
        "SCM": expr("D-SCM"),
        "Purchasing": expr("D-PUR"),
        "Mua hàng": expr("D-PUR"),
        "Bộ phận Mua hàng": expr("D-PUR"),
        "PUR": expr("D-PUR"),
        "Warehouse": expr("D-WHS"),
        "Warehouse Department": expr("D-WHS"),
        "Kho": expr("D-WHS"),
        "WHS": expr("D-WHS"),
        "Bộ phận Kho": expr("D-WHS"),
        "Tool Crib": expr("D-TCR"),
        "Tool Store": expr("D-TCR"),
        "Kho dao cụ": expr("D-TCR"),
        "Kho dụng cụ": expr("D-TCR"),
        "Bộ phận Kho dao cụ": expr("D-TCR"),
        "Logistics": expr("D-LOG"),
        "Shipping": expr("D-LOG"),
        "Giao vận": expr("D-LOG"),
        "Hậu cần": expr("D-LOG"),
        "Bộ phận Hậu cần và Giao vận": expr("D-LOG"),
        "LOG": expr("D-LOG"),
        "Finance": expr("D-FIN"),
        "Finance Department": expr("D-FIN"),
        "Tài chính": expr("D-FIN"),
        "Phòng Tài chính": expr("D-FIN"),
        "HR": expr("D-HR"),
        "Human Resources": expr("D-HR"),
        "Human Resources Department": expr("D-HR"),
        "Nhân sự": expr("D-HR"),
        "Phòng Nhân sự": expr("D-HR"),
        "EHS": expr("D-EHS"),
        "EHS Department": expr("D-EHS"),
        "Phòng EHS": expr("D-EHS"),
        "IT": expr("D-IT"),
        "IT Department": expr("D-IT"),
        "CNTT": expr("D-IT"),
        "Phòng CNTT": expr("D-IT"),
        "ERP": expr("D-ERP"),
        "Epicor": expr("D-ERP"),
        "Epicor / ERP": expr("D-ERP"),
        "ERP Administration": expr("D-ERP"),
        "Bộ phận Quản trị ERP": expr("D-ERP"),
    }


def role_alias_map() -> dict[str, dict]:
    return {
        "CEO": expr("CEO"),
        "Chief Executive Officer": expr("CEO"),
        "Tổng Giám đốc": expr("CEO"),
        "Tong Giam doc": expr("CEO"),
        "Production Director": expr("PD"),
        "Sản xuất Giám đốc": expr("PD"),
        "Giám đốc Sản xuất": expr("PD"),
        "Engineering Lead": expr("ENGM"),
        "Engineering Lead / Manager": expr("ENGM"),
        "Engineering Manager": expr("ENGM"),
        "Kỹ thuật Lead / Manager": expr("ENGM"),
        "Kỹ thuật Lead/Manager": expr("ENGM"),
        "Kỹ thuật Lead / QA Lead": expr("ENGM", "QA"),
        "Trưởng Engineering": expr("ENGM"),
        "Production Planner": expr("PPL"),
        "Planner": expr("PPL"),
        "Kế hoạch Team Leader": expr("PPL"),
        "Kế hoạch sản xuất": expr("PPL"),
        "QA Manager": expr("QA"),
        "QA Lead": expr("QA"),
        "Trưởng QA": expr("QA"),
        "QA": expr("QA"),
        "QMR": expr("QA[QMR]"),
        "QA/QMS": expr("QA", "QMS"),
        "QMS/QA": expr("QA", "QMS"),
        "Document Controller": expr("QMS[DC]"),
        "QMS Engineer": expr("QMS"),
        "QMS Coordinator": expr("QMS"),
        "QMS Manager": expr("QMS"),
        "Kỹ sư QMS": expr("QMS"),
        "Reviewer": bundle("FUNC_OWNERS"),
        "Reviewers": bundle("FUNC_OWNERS"),
        "Champion": bundle("DEPLOYMENT_LEADS"),
        "Champions": bundle("DEPLOYMENT_LEADS"),
        "Dept Manager": bundle("FUNC_HEADS"),
        "Dept Managers": bundle("FUNC_HEADS"),
        "Người đào tạo": bundle("OJT_COACHES"),
        "Trainer": bundle("OJT_COACHES"),
        "Quality Engineer": expr("QE"),
        "QA Engineer": expr("QE"),
        "Kỹ sư Chất lượng": expr("QE"),
        "QC Inspector Lead": expr("QCL"),
        "QC Lead": expr("QCL"),
        "QC Team Leader": expr("QCL"),
        "IQC Team Leader": expr("QCL"),
        "QC Inspector": expr("QC"),
        "Quality Engineer / QC": expr("QE", "QC"),
        "QC Inspector / CMM Programmer / Operator": expr("QC"),
        "QC Inspector / CMM Programmer-Operator": expr("QC"),
        "QC Inspector / IQC": expr("QC"),
        "QC Inspector / IPQC": expr("QC"),
        "QC Inspector / Appraiser": expr("QC"),
        "QC Operator": expr("QC"),
        "QA/QC Lead": expr("QCL"),
        "Metrology and Calibration Specialist": expr("MCS"),
        "Metrology Lead": expr("MCS"),
        "Calibration Technician": expr("MCS"),
        "DFM Engineer": expr("DFM"),
        "Process Engineer": expr("PE"),
        "Quy trình Engineer": expr("PE"),
        "Kỹ sư Quy trình": expr("PE"),
        "CAM / NC Programmer": expr("CAM"),
        "CAM/NC Programmer": expr("CAM"),
        "CAM/NC Lập trình viên (CNC)": expr("CAM"),
        "Programmer": expr("CAM"),
        "Customer Service": expr("CS"),
        "CS": expr("CS"),
        "CS (Customer Service)": expr("CS"),
        "Customer Dịch vụ": expr("CS"),
        "Estimator": expr("EST"),
        "Người định giá": expr("EST"),
        "Báo giá": expr("EST"),
        "Supply Chain Manager": expr("SCM"),
        "Trưởng Chuỗi cung ứng": expr("SCM"),
        "Trưởng Supply Chain": expr("SCM"),
        "Buyer / Purchasing": expr("BUY"),
        "Buyer": expr("BUY"),
        "Nhân viên mua hàng": expr("BUY"),
        "Warehouse Clerk": expr("WAR"),
        "Warehouse Supervisor": expr("SCM"),
        "Kho Nhân viên văn phòng": expr("WAR"),
        "Nhân viên Kho": expr("WAR"),
        "Warehouse Operator": expr("WAR"),
        "Tool Crib / Tool Storekeeper": expr("TOOL"),
        "Tool Crib": expr("TOOL"),
        "Tooling Thủ kho": expr("TOOL"),
        "Thủ kho Dao cụ": expr("TOOL"),
        "Logistics / Shipping Coordinator": expr("LOG"),
        "Shipping Coordinator": expr("LOG"),
        "Hậu cần / Giao vận Điều phối viên": expr("LOG"),
        "IT Administrator": expr("ITA"),
        "IT Admin": expr("ITA"),
        "IT Manager": expr("ITA"),
        "IT System Administrator": expr("ITA"),
        "IT System Quản trị viên": expr("ITA"),
        "IT Data Owner": expr("ITA"),
        "Quản trị IT": expr("ITA"),
        "Epicor System Administrator": expr("ESA"),
        "Governance viên hệ thống Epicor": expr("ESA"),
        "Epicor Administrator": expr("ESA"),
        "Epicor Admin": expr("ESA"),
        "HR Manager": expr("HR"),
        "HR Lead": expr("HR"),
        "HR Coordinator": expr("HR"),
        "EHS Specialist": expr("EHS"),
        "EHS Manager": expr("EHS"),
        "Shift Leader": expr("SL"),
        "Shift Lead": expr("SL"),
        "Trưởng ca": expr("SL"),
        "Setup Technician": expr("SET"),
        "Setup Leader": expr("SET"),
        "CNC Operator": expr("OPR"),
        "Operator": expr("OPR"),
        "Production Operator": expr("OPR"),
        "CNC Operator / Production Operator": expr("OPR"),
        "Maintenance Technician": expr("MNT"),
        "Maintenance Planner": expr("MNT"),
        "Maintenance Supervisor": expr("MNT"),
        "Maintenance Manager": expr("MNT"),
        "Kỹ thuật viên Bảo trì": expr("MNT"),
        "CNC Workshop Manager": expr("WKM"),
        "Workshop Manager": expr("WKM"),
        "Ops Manager": expr("WKM"),
        "Operations Manager": expr("WKM"),
        "Cleaning and Packaging Supervisor": expr("CPS"),
        "Cleaning Supervisor": expr("CPS"),
        "Cleaning / Packaging Technician": expr("CPT"),
        "Cleaning Technician": expr("CPT"),
        "Làm sạch & Đóng gói Supervisor": expr("CPS"),
        "Làm sạch / Đóng gói Technician": expr("CPT"),
        "QA Final": expr("QA"),
        "Đo lường": expr("MCS"),
        "Metrology & Hiệu chuẩn Specialist": expr("MCS"),
        "Internal Auditor (outsource)": expr("IAO"),
        "Chuỗi cung ứng Manager": expr("SCM"),
        "Deburr Team Lead": expr("DBL"),
        "Deburr Technician": expr("DBT"),
        "Finance Manager": expr("FIN"),
        "Finance Costing": expr("FIN"),
        "AP-AR and Payments Accountant": expr("APAR"),
        "Finance AR": expr("APAR"),
        "AR (Finance)": expr("APAR"),
        "General Ledger and Payroll Accountant": expr("GLP"),
        "GL and Payroll Accountant": expr("GLP"),
        "Production Engineer / IE": expr("PIE"),
        "Production Engineer-IE": expr("PIE"),
        "Production Engineer / Industrial Engineer": expr("PIE"),
        "Manufacturing Engineer": expr("PIE"),
        "Internal Auditor / LPA Assignee": expr("QMS[LA]"),
        "Lead Auditor": expr("QMS[LA]"),
        "Continuous Improvement Lead": expr("PIE[CI]"),
        "Product Safety Officer": expr("QA[PSO]"),
        "Incident Commander": expr("PD[IC-PROD]"),
        "All Process Owners / Department Heads": bundle("OPS_SCOPE_OWNERS"),
        "Process Owners / Department Heads": bundle("OPS_SCOPE_OWNERS"),
        "Quy trình Owner / Department Trưởng bộ phận": bundle("OPS_SCOPE_OWNERS"),
        "All Quy trình Owner / Department Trưởng bộ phận": bundle("OPS_SCOPE_OWNERS"),
        "Leadership Sponsor": expr("CEO"),
        "QA/QC Lead + Sales Lead": expr("QCL", "CS", "EST"),
        "QA Lead + Production": expr("QA", "PD", joiner=" + "),
        "QC Lead / CMM": expr("QCL", "MCS"),
        "Cleanliness Process Owner": expr("QA", "CPS", joiner=" + "),
        "Production Director / Functional Head": expr("PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA"),
        "Functional Heads / Shift Leaders": expr("PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "SL"),
        "CI Lead + Process Owner": expr("PIE[CI]", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA"),
        "Sản xuất Supervisor / QA Lead": expr("SL", "QA"),
        "Sản xuất Giám đốc / QA Lead": expr("PD", "QA"),
        "Document Controller + Warehouse": expr("QMS[DC]", "WAR", joiner=" + "),
        "Document Controller hoặc người phụ trách tài liệu": expr("QMS[DC]", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA")
    }


def bundle_alias_map() -> dict[str, dict]:
    return {
        "TOP_MGMT": bundle("TOP_MGMT"),
        "FUNC_HEADS": bundle("FUNC_HEADS"),
        "FUNC_OWNERS": bundle("FUNC_OWNERS"),
        "DEPLOYMENT_STEERING": bundle("DEPLOYMENT_STEERING"),
        "ALL_DEPTS": bundle("ALL_DEPTS"),
        "COMMERCIAL_FRONT": bundle("COMMERCIAL_FRONT"),
        "QUALITY_CORE": bundle("QUALITY_CORE"),
        "ENG_RELEASE_CORE": bundle("ENG_RELEASE_CORE"),
        "AREA_LEADS": bundle("AREA_LEADS"),
        "POU_LEADS": bundle("POU_LEADS"),
        "OPS_SCOPE_OWNERS": bundle("OPS_SCOPE_OWNERS"),
        "FRONTLINE_LEADS": bundle("FRONTLINE_LEADS"),
        "DEPLOYMENT_LEADS": bundle("DEPLOYMENT_LEADS"),
        "DIRECT_LINE_MGRS": bundle("DIRECT_LINE_MGRS"),
        "OJT_COACHES": bundle("OJT_COACHES"),
        "KNOWLEDGE_SMES": bundle("KNOWLEDGE_SMES"),
        "MR_REPORT_OWNERS": bundle("MR_REPORT_OWNERS"),
    }


def try_resolve_roleish_text(text: str, aliases: dict[str, dict], overrides: dict[str, dict] | None = None) -> dict | None:
    cleaned = normalize_ws(text)
    resolver = dict(aliases)
    if overrides:
        resolver.update(overrides)
    if cleaned in resolver:
        return deepcopy(resolver[cleaned])
    if len(cleaned) > 120:
        return None
    parts = re.split(r"\s*(\+|/|,|;| hoặc | or | và | and )\s*", cleaned)
    if len(parts) <= 1:
        return None
    joiner = " / "
    codes: list[str] = []
    for index, part in enumerate(parts):
        token = normalize_ws(part)
        if not token:
            continue
        if index % 2 == 1:
            joiner = " + " if token == "+" else (" · " if token in {",", ";", "và", "and"} else " / ")
            continue
        if token not in resolver:
            return None
        spec = resolver[token]
        if "bundle" in spec:
            registry = load_registry()
            codes.extend(registry["bundles"][spec["bundle"]])
        else:
            codes.extend(spec["codes"])
    return expr(*codes, joiner=joiner) if codes else None


def find_department_for_handbook(current_file: Path, registry: dict) -> tuple[str, dict] | None:
    matches = [
        (code, meta)
        for code, meta in registry.get("departments", {}).items()
        if Path(meta["handbook_path"]).name == current_file.name
    ]
    if not matches:
        return None
    for code, meta in matches:
        if meta.get("type") == "department":
            return code, meta
    return matches[0]


def set_meta_row_text(doc: etree._Element, label_tokens: tuple[str, ...], value: str) -> None:
    folded_tokens = [fold_text(token) for token in label_tokens]
    for row in doc.xpath('//div[contains(@class,"meta")]/div[contains(@class,"row")]'):
        spans = row.xpath("./span")
        if len(spans) < 2:
            continue
        label = fold_text(element_text(spans[0]))
        if not any(token in label for token in folded_tokens):
            continue
        value_el = spans[-1]
        for child in list(value_el):
            value_el.remove(child)
        value_el.text = value
        break


def set_meta_row_spec(doc: etree._Element, label_tokens: tuple[str, ...], spec: dict, current_file: Path, registry: dict) -> None:
    rendered = render_spec(spec, current_file, registry)
    folded_tokens = [fold_text(token) for token in label_tokens]
    for row in doc.xpath('//div[contains(@class,"meta")]/div[contains(@class,"row")]'):
        spans = row.xpath("./span")
        if len(spans) < 2:
            continue
        label = fold_text(element_text(spans[0]))
        if not any(token in label for token in folded_tokens):
            continue
        set_element_html(spans[-1], rendered)
        break


def set_require_row_value(
    doc: etree._Element,
    label_tokens: tuple[str, ...],
    value_html: str | None = None,
    value_text: str | None = None,
) -> None:
    folded_tokens = [fold_text(token) for token in label_tokens]
    for row in doc.xpath('//table[contains(@class,"require-table")]//tr'):
        cells = row.xpath("./th|./td")
        if len(cells) < 2:
            continue
        label = fold_text(element_text(cells[0]))
        if not any(token in label for token in folded_tokens):
            continue
        if value_html is not None:
            set_element_html(cells[1], value_html)
        elif value_text is not None:
            for child in list(cells[1]):
                cells[1].remove(child)
            cells[1].text = value_text


def get_require_row_value_text(doc: etree._Element, label_tokens: tuple[str, ...]) -> str:
    folded_tokens = [fold_text(token) for token in label_tokens]
    for row in doc.xpath('//table[contains(@class,"require-table")]//tr'):
        cells = row.xpath("./th|./td")
        if len(cells) < 2:
            continue
        label = fold_text(element_text(cells[0]))
        if not any(token in label for token in folded_tokens):
            continue
        return normalize_ws(element_text(cells[1]))
    return ""


def canonical_department_labels(registry: dict) -> dict[Path, str]:
    labels: dict[Path, str] = {}
    for code, meta in registry.get("departments", {}).items():
        target = (ROOT / meta["handbook_path"]).resolve()
        existing = labels.get(target)
        if existing is None or meta.get("type") == "department":
            labels[target] = code
    return labels


def normalize_organization_shortlinks(doc: etree._Element, current_file: Path) -> None:
    shortcuts = {
        "../02-Department-Handbooks/": ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "02-Department-Handbooks",
        "../03-Job-Descriptions/": ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "03-Job-Descriptions",
        "../03-Organization/02-Department-Handbooks/": ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "02-Department-Handbooks",
        "../03-Organization/03-Job-Descriptions/": ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "03-Job-Descriptions",
    }
    for anchor in doc.xpath('//a[@href]'):
        href = (anchor.get("href") or "").strip()
        for prefix, target_dir in shortcuts.items():
            if not href.startswith(prefix):
                continue
            tail = href[len(prefix):]
            if not tail or tail.startswith(("#", "http://", "https://", "mailto:", "javascript:")):
                continue
            target = target_dir / tail
            if target.exists():
                anchor.set("href", os.path.relpath(target, current_file.parent).replace("\\", "/"))
            break


def normalize_reference_links(doc: etree._Element, current_file: Path, registry: dict) -> None:
    target_labels: dict[Path, str] = {}
    for code, meta in registry["roles"].items():
        target_labels[(ROOT / meta["jd_path"]).resolve()] = meta["jd_code"]
    target_labels.update(canonical_department_labels(registry))

    for anchor in doc.xpath('//a[@href]'):
        classes = (anchor.get("class") or "").split()
        if any(token in classes for token in ["role-link", "dept-link", "entity-link"]):
            continue
        href = (anchor.get("href") or "").strip()
        if not href or href.startswith(("#", "http://", "https://", "mailto:", "javascript:")):
            continue
        try:
            target = (current_file.parent / href).resolve()
        except OSError:
            continue
        label = target_labels.get(target)
        if not label:
            continue
        for child in list(anchor):
            anchor.remove(child)
        anchor.text = label


def normalize_jd_structured_rows(
    doc: etree._Element,
    doc_path: Path,
    role_code: str,
    registry: dict,
    profiles: dict[str, dict[str, object]],
) -> None:
    profile = profiles.get(role_code, {})
    if not profile:
        return

    departments = list(profile.get("departments", []))
    reports_to = list(profile.get("reports_to", []))
    direct_reports = list(profile.get("direct_reports", []))
    primary_interfaces = list(profile.get("primary_interfaces", []))
    internal_interfaces = list(profile.get("internal_interfaces", []))
    external_interfaces = str(profile.get("external_interfaces", "")).strip()

    if departments:
        set_require_row_value(doc, ("bo phan",), value_html=render_token_cluster(departments, doc_path, registry))
    if reports_to:
        set_require_row_value(doc, ("bao cao truc tiep cho", "bao cao truc tiep"), value_html=render_token_cluster(reports_to, doc_path, registry))
    elif role_code == "CEO":
        set_require_row_value(
            doc,
            ("bao cao truc tiep cho", "bao cao truc tiep"),
            value_text="Hoi dong thanh vien / Hoi dong quan tri / Owner cong ty (theo mo hinh quan tri thuc te cua doanh nghiep).",
        )

    if direct_reports:
        rendered_direct = render_token_cluster(direct_reports, doc_path, registry)
        set_require_row_value(doc, ("quan ly truc tiep", "nhan su bao cao truc tiep"), value_html=rendered_direct)
    else:
        set_require_row_value(
            doc,
            ("quan ly truc tiep", "nhan su bao cao truc tiep"),
            value_text="Khong co nhan su bao cao truc tiep.",
        )

    if primary_interfaces:
        rendered_primary = render_token_cluster(primary_interfaces, doc_path, registry)
        set_require_row_value(doc, ("phoi hop chuc nang chinh", "tuyen phoi hop chuc nang"), value_html=rendered_primary)
    if internal_interfaces:
        set_require_row_value(doc, ("interfaces noi bo chinh", "giao dien noi bo chinh"), value_html=render_token_cluster(internal_interfaces, doc_path, registry))
    if external_interfaces:
        set_require_row_value(doc, ("interfaces ben ngoai", "giao dien ben ngoai"), value_text=external_interfaces)


def normalize_jd_preface_block(
    doc: etree._Element,
    doc_path: Path,
    role_code: str,
    registry: dict,
    profiles: dict[str, dict[str, object]],
) -> None:
    preface_nodes = doc.xpath('//div[contains(@class,"preface-block")]//p[1]')
    if not preface_nodes:
        return
    profile = profiles.get(role_code, {})
    departments = list(profile.get("departments", []))
    if not departments:
        return
    preface = preface_nodes[0]
    links = preface.xpath('.//a[@href]')
    seen_links: set[tuple[str, str]] = set()
    doc_fragments: list[str] = []
    for link in links:
        key = (normalize_ws("".join(link.itertext())), (link.get("href") or "").strip())
        if key in seen_links:
            continue
        seen_links.add(key)
        doc_fragments.append(html.tostring(link, encoding="unicode", method="html").strip())
    docs_html = " ".join(doc_fragments)
    text = element_text(preface)
    match = re.search(r"Vai trò trong chuỗi giá trị(.*?)(?:Tài liệu liên đới|$)", text)
    value_chain = normalize_ws(match.group(1)) if match else ""
    value_chain = get_require_row_value_text(doc, ("vai tro trong chuoi gia tri",)) or value_chain
    if not value_chain:
        return
    dept_html = render_token_cluster(departments, doc_path, registry)
    new_html = (
        f"<b>Bộ phận</b> {dept_html} &nbsp;&nbsp; "
        f"<b>Vai trò trong chuỗi giá trị</b> {xml_escape(value_chain)} &nbsp;&nbsp; "
        f"<b>Tài liệu liên đới</b> {docs_html}"
    )
    set_element_html(preface, new_html)


def normalize_department_handbook_header(doc: etree._Element, current_file: Path, registry: dict) -> None:
    matched = find_department_for_handbook(current_file, registry)
    if not matched:
        return
    dept_code, dept = matched
    title_nodes = doc.xpath('//div[contains(@class,"title")]/strong')
    if title_nodes:
        title_nodes[0].text = f'{dept["title_en"]} Handbook'
    page_titles = doc.xpath("//title")
    if page_titles:
        page_titles[0].text = f'{dept["title_en"]} Handbook | HESEM QMS'
    set_meta_row_text(doc, ("code", "mã"), dept_code)
    set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr(dept_code), current_file, registry)


def update_meta_rows(doc: etree._Element, current_file: Path, registry: dict, aliases: dict[str, dict], overrides: dict[str, dict]) -> None:
    for row in doc.xpath('//div[contains(@class,"meta")]/div[contains(@class,"row")]'):
        spans = row.xpath("./span")
        if len(spans) < 2:
            continue
        label = fold_text(element_text(spans[0]))
        value_el = spans[-1]
        current_value = element_text(value_el)
        spec = None
        if "approved" in label or "phe duyet" in label:
            spec = expr("CEO")
        elif "owner" in label or "chu so huu" in label:
            spec = overrides.get(current_value) or aliases.get(current_value) or try_resolve_roleish_text(current_value, aliases, overrides)
        if spec:
            set_element_html(value_el, render_spec(spec, current_file, registry))


def update_role_cells(doc: etree._Element, current_file: Path, registry: dict, aliases: dict[str, dict], overrides: dict[str, dict]) -> None:
    targets = doc.xpath('//th|//td|//span[contains(@class,"inline-tag")]')
    for element in targets:
        if element.xpath('.//*[contains(@class,"role-link") or contains(@class,"dept-link") or contains(@class,"entity-link")]'):
            continue
        text = element_text(element)
        if not text or len(text) > 120:
            continue
        spec = overrides.get(text) or aliases.get(text) or try_resolve_roleish_text(text, aliases, overrides)
        if spec:
            set_element_html(element, render_spec(spec, current_file, registry))


def update_plain_titles(doc: etree._Element, mapping: dict[str, str]) -> None:
    for node in doc.xpath('//text()[normalize-space()]'):
        parent = node.getparent()
        if parent is None:
            continue
        class_name = parent.get("class") or ""
        if any(token in class_name for token in ["role-code", "role-link", "dept-code", "dept-link", "entity-code", "entity-link"]):
            continue
        value = str(node)
        stripped = normalize_ws(value)
        if stripped in mapping:
            if node.is_text:
                parent.text = mapping[stripped]
            else:
                parent.tail = mapping[stripped]


def replace_text_fragments(doc: etree._Element, replacements: dict[str, str]) -> None:
    for node in doc.xpath('//text()[normalize-space()]'):
        parent = node.getparent()
        if parent is None:
            continue
        class_name = parent.get("class") or ""
        if any(token in class_name for token in ["role-code", "role-link", "dept-code", "dept-link", "entity-code", "entity-link"]):
            continue
        value = str(node)
        new_value = value
        for old, new in replacements.items():
            new_value = new_value.replace(old, new)
        if new_value == value:
            continue
        if node.is_text:
            parent.text = new_value
        else:
            parent.tail = new_value


def section_table_rows(doc: etree._Element, section_id: str, table_index: int = 1) -> list[etree._Element]:
    headers = doc.xpath(f'//h2[@id="{section_id}"]')
    if not headers:
        return []
    tables: list[etree._Element] = []
    node = headers[0].getnext()
    while node is not None:
        if isinstance(node.tag, str) and node.tag.lower() == "h2":
            break
        if has_class(node, "table-card"):
            tables.append(node)
        node = node.getnext()
    if 0 < table_index <= len(tables):
        return tables[table_index - 1].xpath(".//tbody/tr")
    return []


def set_section_role_cell(
    doc: etree._Element,
    section_id: str,
    row_index: int,
    spec: dict,
    current_file: Path,
    registry: dict,
    table_index: int = 1,
) -> None:
    rows = section_table_rows(doc, section_id, table_index)
    if 0 <= row_index < len(rows):
        cells = rows[row_index].xpath("./td")
        if cells:
            set_element_html(cells[0], render_spec(spec, current_file, registry))


def set_section_cell_html(
    doc: etree._Element,
    section_id: str,
    row_index: int,
    cell_index: int,
    html_fragment: str,
    table_index: int = 1,
) -> None:
    rows = section_table_rows(doc, section_id, table_index)
    if 0 <= row_index < len(rows):
        cells = rows[row_index].xpath("./td")
        if 0 <= cell_index < len(cells):
            set_element_html(cells[cell_index], html_fragment)


def replace_exact_cell_text(
    doc: etree._Element,
    current_file: Path,
    registry: dict,
    exact_text: str,
    spec: dict,
) -> None:
    rendered = render_spec(spec, current_file, registry)
    for element in doc.xpath('//th|//td'):
        if element.xpath('.//*[contains(@class,"role-link") or contains(@class,"dept-link") or contains(@class,"entity-link")]'):
            continue
        if element_text(element) == exact_text:
            set_element_html(element, rendered)


def replace_exact_block_text(
    doc: etree._Element,
    xpath: str,
    exact_text: str,
    new_html: str,
) -> None:
    for element in doc.xpath(xpath):
        if element_text(element) == exact_text:
            set_element_html(element, new_html)


def set_row_first_cell_html(doc: etree._Element, row_label: str, html_fragment: str) -> None:
    for row in doc.xpath("//tr"):
        cells = row.xpath("./th|./td")
        if not cells:
            continue
        if element_text(cells[0]) == row_label:
            set_element_html(cells[0], html_fragment)


def set_row_cell_html(doc: etree._Element, row_label: str, cell_index: int, html_fragment: str) -> None:
    for row in doc.xpath("//tr"):
        cells = row.xpath("./th|./td")
        if len(cells) <= cell_index:
            continue
        if element_text(cells[0]) == row_label:
            set_element_html(cells[cell_index], html_fragment)


def set_row_cell_by_match(
    doc: etree._Element,
    match_cell_index: int,
    match_text: str,
    target_cell_index: int,
    html_fragment: str,
) -> None:
    for row in doc.xpath("//tr"):
        cells = row.xpath("./th|./td")
        if len(cells) <= max(match_cell_index, target_cell_index):
            continue
        if element_text(cells[match_cell_index]) == match_text:
            set_element_html(cells[target_cell_index], html_fragment)


def normalize_jd_purpose_intro(doc: etree._Element, role_code: str, role: dict) -> None:
    paragraphs = doc.xpath('//div[contains(@class,"jd-purpose")]/p[1]')
    if not paragraphs:
        return
    paragraph = paragraphs[0]
    links = [deepcopy(anchor) for anchor in paragraph.xpath("./a")]
    for child in list(paragraph):
        paragraph.remove(child)
    paragraph.text = (
        f'Vai trò của tài liệu: JD này khóa rõ phạm vi công việc, điểm kết thúc trách nhiệm '
        f'và cơ chế bàn giao của {role["title_en"]} ({role_code}); dùng làm đầu vào chuẩn cho '
        f'tuyển dụng, OJT/đào tạo, đánh giá năng lực, KPI, lương thưởng và phối hợp liên phòng ban '
        f'trong chuỗi RFQ → ship. JD này phải được đọc cùng '
    )
    if not links:
        paragraph.text += "ANNEX/SOP/WI liên quan đang hiệu lực."
        return
    for index, anchor in enumerate(links):
        paragraph.append(anchor)
        anchor.tail = ", " if index < len(links) - 1 else " và SOP/WI/ANNEX đang hiệu lực."


def apply_file_specific_tweaks(doc: etree._Element, current_file: Path, registry: dict) -> None:
    def chips(spec: dict) -> str:
        return render_spec(spec, current_file, registry)

    if current_file.name.startswith("qms-man-001-qms-manual"):
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("CEO", "QA[QMR]"), current_file, registry)

    if current_file.name.startswith("qms-man-001-qms-manual"):
        set_row_first_cell_html(doc, "Top Leader", chips(expr("CEO")))
        set_row_first_cell_html(doc, "Lead Deparment", chips(bundle("FUNC_HEADS")))
        set_row_first_cell_html(doc, "Owner", chips(bundle("FUNC_OWNERS")))
        set_row_first_cell_html(doc, "Support (IT/Epicor/HR/EHS/Finance)", render_token_cluster(["D-IT", "D-ERP", "D-HR", "D-EHS", "D-FIN"], current_file, registry))
        set_row_first_cell_html(doc, "Customer Dịch vụ vs Người định giá", render_token_cluster(["CS", "EST"], current_file, registry, joiner=" vs "))
        set_row_first_cell_html(doc, "DFM vs Quy trình Engineer vs CAM/NC", render_token_cluster(["DFM", "PE", "CAM"], current_file, registry, joiner=" vs "))
        set_row_first_cell_html(doc, "Planner vs IE vs Workshop Manager", render_token_cluster(["PPL", "PIE", "WKM"], current_file, registry, joiner=" vs "))
        set_row_first_cell_html(doc, "Shift Leader vs Setup vs Operator", render_token_cluster(["SL", "SET", "OPR"], current_file, registry, joiner=" vs "))
        set_row_first_cell_html(doc, "Quality vs Sản xuất hold/phát hành", render_token_cluster(["D-QUAL", "D-PROD"], current_file, registry, joiner=" vs "))
        set_row_first_cell_html(doc, "SCM vs Kho vs Hậu cần", render_token_cluster(["D-SCM", "D-WHS", "D-LOG"], current_file, registry, joiner=" vs "))
        set_row_first_cell_html(doc, "IT vs Epicor vs chủ nghiệp vụ", render_token_cluster(["D-IT", "D-ERP", "FUNC_OWNERS"], current_file, registry, joiner=" vs "))

    header_owner_overrides = {
        "wi-202-daily-management-tier-meetings-kpi-and-escalation.html": expr("PD", "QMS"),
        "wi-205-barcode-labeling-and-scan-to-action.html": expr("PPL", "D-WHS", "D-PROD"),
        "wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html": expr("QA", "D-WHS", "D-LOG", "D-SCS"),
        "wi-207-high-risk-job-readiness-control-tower.html": expr("PPL", "PD", "QA"),
        "wi-302-first-piece-fai-execution-and-evidence-pack.html": expr("QA", "ENGM"),
        "wi-511-machine-type-quick-reference.html": expr("WKM", "ENGM"),
        "wi-512-3-axis-vertical-milling-guide.html": expr("WKM", "ENGM"),
        "wi-513-5-axis-milling-guide.html": expr("WKM", "ENGM"),
        "wi-514-cnc-turning-guide.html": expr("WKM", "ENGM"),
        "wi-515-mill-turn-guide.html": expr("WKM", "ENGM"),
        "wi-516-machine-operation-quick-card.html": expr("WKM", "MNT", "QA"),
        "wi-517-setup-changeover-smed-standard-work.html": expr("WKM", "ENGM", "MNT", "QA"),
        "wi-518-work-transfer-validation.html": expr("WKM", "PPL", "QA"),
        "wi-519-job-packet-quick-check-and-pre-run-verification.html": expr("WKM", "SET", "QA"),
        "wi-602-gage-pre-use-verification-and-status-control.html": expr("QA", "MCS", "MNT"),
        "wi-604-spc-chart-use-process-capability-and-reaction.html": expr("QA", "QE", "WKM"),
        "wi-606-suspect-product-containment-segregation-and-reaction.html": expr("QA", "WKM", "D-WHS"),
        "wi-702-storage-environment-location-and-fifo-control.html": expr("D-WHS", "D-PROD", "QA"),
        "wi-721-fod-prevention-line-clearance-and-tool-accountability.html": expr("WKM", "QA", "D-WHS", "MNT"),
        "annex-101-role-based-access-map.html": expr("ITA", "QMS[DC]"),
        "annex-102-access-request-field-dictionary.html": expr("ITA", "QMS[DC]"),
        "annex-107-audit-evidence-pack-master.html": expr("QMS", "QMS[DC]"),
        "annex-115-epicor-transaction-and-interface-map.html": expr("ESA", "QMS", "FIN"),
        "annex-120-authority-matrix.html": expr("CEO", "QMS", "HR"),
        "annex-122-kpi-cascade-dictionary.html": expr("QMS", "ITA"),
        "annex-124-dashboard-evidence-pack-worked-examples.html": expr("QMS", "ITA"),
        "annex-131-m365-records-metadata-list-schema-and-register-catalog.html": expr("QMS", "ITA"),
        "annex-133-m365-records-site-topology-library-and-folder-blueprint.html": expr("QMS", "ITA"),
        "annex-134-m365-records-provisioning-permissions-and-automation-architecture.html": expr("QMS", "ITA"),
        "annex-135-m365-operational-records-file-plan-by-department-role-and-job.html": expr("QMS", "ITA"),
        "annex-301-setup-sheet-and-tool-list-standard.html": expr("ENGM"),
        "annex-302-approved-materials-list.html": expr("ENGM", "QA"),
        "annex-401-supplier-risk-model-and-scorecard-method.html": expr("SCM", "QA"),
        "annex-402-outsource-special-process-pack.html": expr("SCM", "QA", "ENGM"),
        "annex-403-approved-processor-list.html": expr("SCM", "QA"),
        "annex-502-gate-mrr-and-execution-synchronization-pack.html": expr("PD", "QA"),
        "annex-503-cnc-operating-model-and-role-boundary.html": expr("QA", "PD", "ENGM"),
        "annex-505-put-thru-index.html": expr("QMS", "PPL"),
        "annex-506-fod-prevention-program.html": expr("QMS", "PD", "QA"),
        "annex-602-msa-acceptance-criteria.html": expr("QA", "MCS"),
        "annex-603-quality-package-levels-qpl.html": expr("QA", "D-SCS", "ENGM"),
        "annex-604-control-plan-guide.html": expr("QA", "ENGM"),
        "annex-606-surface-finish-vacuum-compatibility.html": expr("QA", "ENGM"),
        "annex-608-semi-standards-and-csr-matrix.html": expr("ENGM", "QA"),
        "annex-701-gs1-sscc-data-dictionary-and-pack-reconciliation.html": expr("D-WHS", "D-LOG", "ITA", "QMS"),
        "annex-702-packaging-labeling-spec.html": expr("QA", "D-WHS"),
        "annex-703-warehouse-location-fifo-rules.html": expr("QA", "D-WHS"),
        "annex-803-ppe-and-hazard-matrix.html": expr("EHS", "PD"),
    }
    if current_file.name in header_owner_overrides:
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), header_owner_overrides[current_file.name], current_file, registry)

    if current_file.name == "sop-101-document-and-data-control.html":
        set_section_role_cell(doc, "p4", 0, bundle("FUNC_OWNERS"), current_file, registry)
        set_section_role_cell(doc, "p4", 3, bundle("FUNC_OWNERS"), current_file, registry)
        set_section_role_cell(doc, "p4", 5, bundle("POU_LEADS"), current_file, registry)
        set_section_cell_html(doc, "p8", 2, 2, chips(expr("WKM", "SL", "QCL")))
        set_section_cell_html(
            doc,
            "p9",
            3,
            3,
            chips(expr("CS", "EST", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "WKM", "SL", "QCL")),
        )
        set_section_cell_html(doc, "p9", 5, 3, chips(expr("QMS", "WKM", "SL", "QCL", "SCM")))
        replace_text_fragments(
            doc,
            {
                "JD cá»§a QMS Engineer, QA Lead, IT Administrator vÃ Governance viÃªn há»‡ thá»‘ng Epicor":
                "JD-QMS, JD-QA, JD-ITA vÃ JD-ESA",
                "QMS Engineer và QA Lead": "QMS và QA",
            },
        )

    if current_file.name == "sop-102-quality-policy-objectives-and-organizational-context.html":
        set_section_role_cell(doc, "p4", 3, bundle("FUNC_OWNERS"), current_file, registry)
        set_section_role_cell(doc, "p4", 4, bundle("DEPLOYMENT_LEADS"), current_file, registry)
        set_section_cell_html(doc, "p8", 3, 2, chips(bundle("OPS_SCOPE_OWNERS")))
        set_section_cell_html(doc, "p9", 0, 1, chips(expr("QA", "QMS")), table_index=2)
        set_section_cell_html(doc, "p9", 1, 1, chips(expr("QA", "QMS", "CS", "EST", "PPL", "PD", "ENGM", "SCM", "FIN", "HR", "EHS", "ITA", "WKM", "SL", "QCL", "LOG")), table_index=2)
        set_section_cell_html(doc, "p9", 2, 1, chips(bundle("OPS_SCOPE_OWNERS")), table_index=2)
        set_section_cell_html(doc, "p9", 3, 1, chips(bundle("OPS_SCOPE_OWNERS")), table_index=2)
        replace_text_fragments(
            doc,
            {
                "JD của các trưởng / đầu Department": "JD của các vai trò trong OPS_SCOPE_OWNERS",
            },
        )
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: CEO giữ A cho policy và mục tiêu cấp công ty; QA Lead giữ A cho chất lượng logic điều hành; QMS Engineer giữ R cho register và evidence; các Trưởng bộ phận giữ R cho phân tầng, đo lường và phản ứng trong phạm vi mình sở hữu.",
            "<b>RACI nền:</b> CEO giữ A cho policy và mục tiêu cấp công ty; QA giữ A cho chất lượng logic điều hành; QMS giữ R cho register và evidence; OPS_SCOPE_OWNERS giữ R cho phân tầng, đo lường và phản ứng trong phạm vi được giao.",
        )

    if current_file.name == "sop-104-data-governance-records-security-and-ip-protection.html":
        set_section_role_cell(doc, "p4", 4, bundle("DIRECT_LINE_MGRS"), current_file, registry)
        set_section_cell_html(doc, "p8", 1, 3, chips(bundle("OPS_SCOPE_OWNERS")))
        set_section_cell_html(doc, "p8", 2, 2, chips(bundle("OPS_SCOPE_OWNERS")))
        set_section_cell_html(doc, "p8", 2, 3, chips(expr("QA", "CS", "EST", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "CEO")))

    if current_file.name == "sop-106-change-and-configuration-management.html":
        set_section_role_cell(doc, "p4", 2, expr("PD", "WKM", "SL"), current_file, registry)
        set_section_cell_html(doc, "p6", 1, 2, chips(expr("ENGM", "QA", "PD", "SCM", "ITA", "ESA")))
        set_section_cell_html(doc, "p6", 2, 2, chips(expr("CEO", "QA", "PD", "ENGM", "ITA")))
        set_section_cell_html(doc, "p6", 3, 2, chips(expr("PPL", "WKM", "SCM", "ENGM", "QA", "ITA")))
        set_section_cell_html(doc, "p6", 4, 2, chips(expr("ENGM", "QA", "PD", "ITA", "ESA")))
        set_section_cell_html(doc, "p6", 5, 2, chips(expr("ENGM", "QMS[DC]", "ESA")))
        set_section_cell_html(doc, "p8", 1, 2, chips(expr("CS", "ENGM", "QA", "PD", "SCM", "ITA", "ESA")))
        set_section_cell_html(doc, "p8", 2, 2, chips(expr("CS", "ENGM")))
        set_section_cell_html(doc, "p8", 3, 2, chips(expr("MNT", "ENGM")))
        set_section_cell_html(doc, "p9", 1, 3, chips(expr("QMS")))
        replace_text_fragments(
            doc,
            {
                "JD của Trưởng Engineering, Trưởng QA, Giám đốc Sản xuất, Quản trị IT và Quản trị hệ thống Epicor phải ghi rõ quyền phê duyệt thay đổi, trách nhiệm impact review, cutover, configuration đánh giá, WIP segregation và KPI unapproved change / post-change xác minh.":
                "JD-ENGM, JD-QA, JD-PD, JD-ITA và JD-ESA phải ghi rõ quyền phê duyệt thay đổi, trách nhiệm impact review, cutover, configuration đánh giá, WIP segregation và KPI unapproved change / post-change xác minh.",
            },
        )

    if current_file.name == "sop-105-organizational-knowledge-management.html":
        set_section_role_cell(doc, "p4", 2, bundle("FUNC_OWNERS"), current_file, registry)
        set_section_role_cell(doc, "p4", 3, bundle("KNOWLEDGE_SMES"), current_file, registry)
        set_section_role_cell(doc, "p4", 4, bundle("FRONTLINE_LEADS"), current_file, registry)
        set_section_cell_html(doc, "p4", 0, 1, chips(expr("QA", "QMS", "CS", "EST", "PD", "ENGM", "SCM", "FIN", "HR", "EHS", "ITA")), table_index=2)
        set_section_cell_html(doc, "p9", 4, 3, chips(bundle("DIRECT_LINE_MGRS")))
        replace_text_fragments(
            doc,
            {
                "JD của QMS Engineer, HR Lead, Lead Department và SME trọng yếu phải mô tả trách nhiệm nhận diện tri thức, bài học kinh Nhiệm, bàn giao pack, cập nhật đào tạo và quyền chặn thôi việc / rời công ty khi chưa bàn giao tri thức.":
                "JD của QMS, HR, các vai trò trong FUNC_OWNERS và các vai trò trong KNOWLEDGE_SMES phải mô tả rõ trách nhiệm nhận diện tri thức, bàn giao tri thức, cập nhật đào tạo và quyền giữ mở khi chưa chuyển giao đủ tri thức.",
                "Tri thức có tranh cãi dữ liệu hoặc chưa được QA/QMS xác thực.": "Tri thức có tranh cãi dữ liệu hoặc chưa được QA / QMS xác thực.",
            },
        )

    if current_file.name == "sop-107-communication-management.html":
        set_section_cell_html(doc, "p4", 0, 1, chips(expr("CS", "SL", "PPL", "QA")))
        set_section_cell_html(doc, "p4", 0, 2, chips(bundle("OPS_SCOPE_OWNERS")))
        set_section_cell_html(doc, "p4", 0, 3, chips(expr("QMS")))
        set_section_cell_html(doc, "p4", 1, 1, chips(expr("PPL", "QA", "WKM")))
        set_section_cell_html(doc, "p4", 1, 2, chips(expr("PD", "QA")))
        set_section_cell_html(doc, "p4", 1, 3, chips(expr("ENGM", "WAR", "BUY")))
        set_section_cell_html(doc, "p4", 2, 1, chips(expr("CS", "EST")))
        set_section_cell_html(doc, "p4", 2, 2, chips(expr("QA", "PD")))
        set_section_cell_html(doc, "p4", 2, 3, chips(expr("ENGM", "PPL", "FIN")))
        set_section_cell_html(doc, "p4", 3, 1, chips(expr("SL", "WKM", "QCL", "ITA")))
        set_section_cell_html(doc, "p4", 3, 2, chips(expr("PD", "QA", "CEO")))
        set_section_cell_html(doc, "p4", 3, 3, chips(expr("PPL", "ENGM", "ITA", "WAR")))
        set_section_cell_html(doc, "p4", 4, 1, chips(bundle("OPS_SCOPE_OWNERS")))
        set_section_cell_html(doc, "p4", 4, 2, chips(expr("CS", "EST", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "WKM", "SL", "QCL")))
        set_section_cell_html(doc, "p4", 4, 3, chips(expr("QMS")))

    if current_file.name == "sop-108-operational-contingency-plan.html":
        set_section_cell_html(doc, "p9", 2, 3, chips(expr("MNT", "ITA", "QA")))
        replace_text_fragments(
            doc,
            {
                "JD cá»§a Sáº£n xuáº¥t GiÃ¡m Ä‘á»‘c, IT Administrator, QA Lead, Maintenance Technician, EHS Specialist vÃ TrÆ°á»Ÿng Chuá»—i cung á»©ng":
                "JD-PD, JD-ITA, JD-QA, JD-MNT, JD-EHS vÃ JD-SCM",
            },
        )

    if current_file.name == "sop-401-supplier-control-and-special-process.html":
        set_section_role_cell(doc, "p4", 4, expr("ENGM", "PE", "QE", "CAM"), current_file, registry)
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: Supply Chain Manager giữ A cho source approval và re-approval; QA Manager giữ A cho acceptance of quality risk và SCAR closure; Buyer giữ R cho PO và dispatch accuracy; Process Owner giữ R cho technical flow-down.",
            "<b>RACI nền:</b> SCM giữ A cho source approval và re-approval; QA giữ A cho quality risk và SCAR closure; BUY giữ R cho PO và dispatch accuracy; ENGM / PE / QE / CAM giữ R cho technical flow-down và acceptance logic.",
        )

    if current_file.name == "sop-402-material-verification-traceability-and-counterfeit-prevention.html":
        set_section_cell_html(doc, "p6", 2, 2, chips(expr("QCL")))

    if current_file.name == "sop-303-engineering-release-baseline-package-and-job-snapshot-control.html":
        set_section_cell_html(doc, "p6", 0, 2, chips(expr("ENGM", "QMS[DC]")))
        set_section_cell_html(doc, "p6", 5, 2, chips(expr("ENGM", "QMS[DC]")))
        replace_text_fragments(
            doc,
            {
                "Engineering Configuration Lead": "ENGM / QMS[DC]",
                "QA Manager + Engineering Lead / Manager": "QA / ENGM",
                "JD Process Engineer, CAM / NC Programmer, Engineering Lead / Manager, QMS Engineer, Quality Engineer vÃ Production Planner":
                "JD-PE, JD-CAM, JD-ENGM, JD-QMS, JD-QE vÃ JD-PPL",
            },
        )

    if current_file.name == "sop-604-spc-and-capability-control.html":
        set_section_role_cell(doc, "p4", 4, expr("ENGM", "PE", "PIE", "WKM", "SET", "MNT", "TOOL"), current_file, registry)
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: Quality Engineer giữ A cho rule SPC và capability; Operator giữ R cho tín hiệu tại nguồn; QC giữ R cho dữ liệu xác nhận; QA Manager giữ A cho escalation; Process Owner giữ R cho cải tiến quá trình.",
            "<b>RACI nền:</b> QE giữ A cho rule SPC và capability; OPR giữ R cho tín hiệu tại nguồn; QC giữ R cho dữ liệu xác nhận; QA giữ A cho escalation; ENGM / PE / PIE / WKM / SET / MNT / TOOL giữ R cho cải tiến quá trình.",
        )

    if current_file.name == "sop-606-ncr-capa-and-ipqc-reaction.html":
        set_section_role_cell(doc, "p4", 3, expr("WKM", "ENGM", "QE", "SCM", "HR", "MNT"), current_file, registry)
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: QC giữ R cho stop và containment đầu tiên; QA Manager giữ A cho disposition và CAPA trigger; QMS Engineer giữ R cho logic hồ sơ và hiệu lực; Process Owner giữ R cho action gốc tại quá trình; Planner hoặc Shipping giữ R cho integrity của lot trong containment.",
            "<b>RACI nền:</b> QC giữ R cho stop và containment đầu tiên; QA giữ A cho disposition và CAPA trigger; QMS giữ R cho logic hồ sơ và hiệu lực; WKM / ENGM / QE / SCM / HR / MNT giữ R cho action gốc tại quá trình; PPL / LOG giữ R cho integrity của lot trong containment.",
        )
        replace_text_fragments(
            doc,
            {
                "JD QA Manager, QMS Engineer, QC Lead, Production Planner và Process Engineer":
                "JD-QA, JD-QMS, JD-QCL, JD-PPL và JD-PE",
            },
        )

    if current_file.name == "sop-603-aql-sampling-inspection.html":
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: QC giữ R cho sampling discipline; QC Lead giữ A cho decision tại hiện trường; QA Manager giữ A cho override và rule use-case; Planner và Warehouse giữ R cho tính toàn vẹn của lot sau decision.",
            "<b>RACI nền:</b> QC giữ R cho sampling discipline; QCL giữ A cho decision tại hiện trường; QA giữ A cho override và rule use-case; PPL / WAR giữ R cho tính toàn vẹn của lot sau decision.",
        )
        replace_text_fragments(
            doc,
            {
                "JD QC Inspector, QC Lead, QA Manager, Production Planner và Warehouse Clerk":
                "JD-QC, JD-QCL, JD-QA, JD-PPL và JD-WAR",
            },
        )

    if current_file.name == "sop-702-contamination-control-and-cleanliness.html":
        set_section_cell_html(doc, "p6", 1, 2, chips(expr("CPS", "WKM")))
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: Cleaning Supervisor giữ A cho route sạch; Technician giữ R cho thao tác; QC giữ A cho verification; QA Manager giữ A cho breach disposition; EHS giữ R cho safety của điều kiện môi trường và hóa chất.",
            "<b>RACI nền:</b> CPS giữ A cho route sạch; CPT giữ R cho thao tác; QC giữ A cho verification; QA giữ A cho breach disposition; EHS giữ R cho safety của điều kiện môi trường và hóa chất.",
        )

    if current_file.name == "sop-801-competence-training-and-certification.html":
        set_section_role_cell(doc, "p4", 2, bundle("DIRECT_LINE_MGRS"), current_file, registry)
        set_section_role_cell(doc, "p4", 3, bundle("OJT_COACHES"), current_file, registry)
        set_section_cell_html(doc, "p6", 2, 2, chips(bundle("DIRECT_LINE_MGRS")))
        set_section_cell_html(doc, "p8", 2, 2, chips(bundle("OJT_COACHES")))
        set_section_cell_html(doc, "p8", 2, 3, chips(bundle("DIRECT_LINE_MGRS")))
        set_section_cell_html(doc, "p9", 1, 3, chips(bundle("OJT_COACHES")))
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: HR giữ R cho hạ tầng hồ sơ; QA Manager giữ A cho competence quality-critical; Department Head giữ A cho năng lực theo vai trò; Trainer giữ R cho OJT evidence; người học giữ trách nhiệm tuân thủ giới hạn chứng nhận của mình.",
            "<b>RACI nền:</b> HR giữ R cho hạ tầng hồ sơ; QA giữ A cho competence quality-critical; DIRECT_LINE_MGRS giữ A cho năng lực theo vai trò và phân công công việc; OJT_COACHES giữ R cho evidence OJT; người học giữ trách nhiệm tuân thủ giới hạn chứng nhận của mình.",
        )

    if current_file.name == "sop-901-internal-audit-and-lpa.html":
        set_section_role_cell(doc, "p4", 3, bundle("OPS_SCOPE_OWNERS"), current_file, registry)
        set_section_role_cell(doc, "p4", 4, bundle("OPS_SCOPE_OWNERS"), current_file, registry)
        set_section_cell_html(doc, "p9", 2, 3, chips(expr("QMS[LA]")))
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: QMS Engineer giữ R cho execution và trend reporting; QA Manager giữ A cho severity, escalation và closure; Auditor giữ R cho bằng chứng; Process Owner giữ R cho hành động; Functional Head giữ A cho nguồn lực và cross-functional unblock.",
            "<b>RACI nền:</b> QMS giữ R cho execution và trend reporting; QA giữ A cho severity, escalation và closure; QMS[LA] giữ R cho bằng chứng; OPS_SCOPE_OWNERS giữ R cho hành động; OPS_SCOPE_OWNERS giữ A cho nguồn lực và cross-functional unblock trong phạm vi được audit.",
        )

    if current_file.name == "sop-902-management-review.html":
        set_section_role_cell(doc, "p4", 3, bundle("OPS_SCOPE_OWNERS"), current_file, registry)
        set_section_role_cell(doc, "p4", 4, bundle("OPS_SCOPE_OWNERS"), current_file, registry)
        set_section_cell_html(doc, "p9", 1, 3, chips(bundle("OPS_SCOPE_OWNERS")))
        replace_text_fragments(
            doc,
            {
                "Áp dụng cho Chief Executive Officer, QA Manager, QMS Engineer, Process Owner, Department Head, Data Owner, IT Administrator và mọi chức năng cung cấp đầu vào hoặc nhận action từ xem xét của lãnh đạo.":
                "Áp dụng cho CEO, QA, QMS và các vai trò cung cấp đầu vào hoặc nhận action từ xem xét của lãnh đạo, gồm CS, EST, PPL, PD, ENGM, SCM, FIN, HR, EHS, ITA, WKM, SL, QCL và LOG.",
                "Khi phát hiện dữ liệu sai sau mốc khóa dữ liệu, Data Owner phải mở controlled note; QA Manager quyết định re-review, bổ sung appendix hay hủy kết luận cũ để họp lại.":
                "Khi phát hiện dữ liệu sai sau mốc khóa dữ liệu, vai trò sở hữu metric hoặc nguồn dữ liệu trong OPS_SCOPE_OWNERS phải mở controlled note; QA quyết định re-review, bổ sung appendix hay hủy kết luận cũ để họp lại.",
                "Khi quyết định cần ngân sách hoặc thay đổi lớn vượt ngoài thẩm quyền hiện hữu, Process Owner phải escalate theo ANNEX-120 và giữ temporary control cho tới khi có quyết định cuối cùng.":
                "Khi quyết định cần ngân sách hoặc thay đổi lớn vượt ngoài thẩm quyền hiện hữu, vai trò chủ trì trong OPS_SCOPE_OWNERS phải escalate theo ANNEX-120 và giữ temporary control tới khi có quyết định cuối cùng.",
            },
        )
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: Chief Executive Officer giữ A cho quyết định hệ thống; QA Manager giữ A cho chất lượng review process; QMS Engineer giữ R cho điều phối và minutes; Process Owner và Data Owner giữ R cho input và evidence trong phạm vi mình sở hữu.",
            "<b>RACI nền:</b> CEO giữ A cho quyết định hệ thống; QA giữ A cho chất lượng review process; QMS giữ R cho điều phối và minutes; OPS_SCOPE_OWNERS giữ R cho input và evidence trong phạm vi được giao.",
        )

    if current_file.name == "sop-903-continual-improvement-and-kaizen.html":
        set_section_role_cell(doc, "p4", 0, bundle("OPS_SCOPE_OWNERS"), current_file, registry)
        set_section_cell_html(doc, "p6", 4, 2, chips(expr("QA[QMR]", "FIN", joiner=" + ")))
        set_section_cell_html(doc, "p8", 0, 2, chips(bundle("OPS_SCOPE_OWNERS")))
        replace_text_fragments(
            doc,
            {
                "JD Production Director, Production Engineer or IE, QA Manager, Quality Engineer, Finance Manager vÃ HR Manager":
                "JD-PD, JD-PIE, JD-QA, JD-QE, JD-FIN vÃ JD-HR",
            },
        )
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"role-note")]',
            "RACI nền: Process Owner giữ A cho pain point thật và duy trì kết quả; Production Engineer or IE giữ R cho thiết kế và trial; QA or QMS giữ A cho risk and standardization discipline; Finance giữ A cho hard-benefit sign-off; HR or sponsor giữ A cho adoption and unblock cross-functional resources.",
            "<b>RACI nền:</b> OPS_SCOPE_OWNERS giữ A cho pain point thật và duy trì kết quả; PIE giữ R cho thiết kế và trial; QA / QMS giữ A cho risk và standardization discipline; FIN giữ A cho hard-benefit sign-off; HR / CEO giữ A cho adoption và unblock cross-functional resources.",
        )

    if current_file.name == "annex-503-cnc-operating-model-and-role-boundary.html":
        replace_text_fragments(
            doc,
            {
                "Đo lường, QC Team Leader, QA": "MCS, QCL, QA",
                "QC Team Leader, QA, Hậu cần, Customer Dịch vụ": "QCL, QA, LOG, CS",
                "Không thay QC Team Leader trong bố trí nguồn lực kiểm hằng ngày; không tự disposition sản phẩm": "Không thay QC Inspector Lead trong bố trí nguồn lực kiểm hằng ngày; không tự disposition sản phẩm",
            },
        )

    if current_file.name == "wi-101-digital-online-forms-and-approvals.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "ITA"), current_file, registry)
        replace_text_fragments(
            doc,
            {
                "QA Lead hoặc Quy trình Owner theo RACI": "QA hoặc OPS_SCOPE_OWNERS theo ANNEX-121",
            },
        )

    if current_file.name == "wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("ITA", "QMS"), current_file, registry)

    if current_file.name == "wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "HR", "ITA"), current_file, registry)

    if current_file.name == "wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "HR"), current_file, registry)

    if current_file.name == "wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "HR"), current_file, registry)

    if current_file.name == "wi-106-job-order-deployment-master-plan.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "PD", "ITA"), current_file, registry)
        replace_text_fragments(
            doc,
            {
                "Reviewer / QMS": "FUNC_OWNERS / QMS",
                "Champion / Supervisor": "DEPLOYMENT_LEADS",
                "QMS Manager / Document Owners": "QMS / FUNC_OWNERS",
                "HR Manager / Dept Managers": "HR / FUNC_HEADS",
                "QMS / Document Owners": "QMS / FUNC_OWNERS",
                "HR / Dept Manager": "HR / FUNC_HEADS",
                "Cutover Lead / Command Center Lead": "PD / QMS / ITA",
                "IT Manager / QMS Manager / Data Owner": "QMS / ITA / MR_REPORT_OWNERS",
                "Data Owner / IT": "QMS / ITA",
                "Cutover Lead điều phối toàn bộ kế hoạch Ngày go-live.": "PD điều phối toàn bộ kế hoạch Ngày go-live.",
                "Command Center Lead": "QMS / ITA",
                "Cutover Lead": "PD",
                "QMS Manager chốt readiness tài liệu, chứng cứ, training và audit trail.": "QMS chốt readiness tài liệu, chứng cứ, training và audit trail.",
                "IT Manager chốt quyền truy cập, backup, refresh, cutover kỹ thuật và fallback.": "ITA chốt quyền truy cập, backup, refresh, cutover kỹ thuật và fallback.",
                "Champion Lead điều phối Champion theo phòng ban và theo ca.": "QMS / HR điều phối mạng Champion theo phòng ban và theo ca.",
                "Dept Managers chịu trách nhiệm pass của nhân sự phòng mình.": "FUNC_HEADS chịu trách nhiệm pass của nhân sự trong phạm vi phòng ban mình.",
                "Data Owner chịu trách nhiệm số liệu dashboard, refresh và exception note.": "Vai trò sở hữu metric trong MR_REPORT_OWNERS chịu trách nhiệm số liệu dashboard, refresh và exception note.",
            },
        )

    if current_file.name == "wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html":
        replace_text_fragments(
            doc,
            {
                "Kho Manager + QA": "D-WHS + QA",
                "Warehouse Manager + QA": "D-WHS + QA",
                "Warehouse Manager + QA + Sales/CS khi ảnh hưởng khách": "D-WHS + QA + D-SCS",
                "Warehouse Manager + QA + Sales/CS when affecting customer": "D-WHS + QA + D-SCS",
                "QA thẩm quyền": "QA",
            },
        )

    if current_file.name == "annex-133-m365-records-site-topology-library-and-folder-blueprint.html":
        replace_text_fragments(
            doc,
            {
                "QMS + Lãnh đạo": "QMS + CEO",
                "Lãnh đạo + QMS": "CEO + QMS",
                "HR / Người đào tạo": "HR / OJT_COACHES",
                "Dòng / Chuyền Manager": "DIRECT_LINE_MGRS",
                "HR + Dept Trưởng / Đầu": "HR + FUNC_HEADS",
            },
        )

    if current_file.name == "wi-107-sharefile-git-cpanel-sync.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("ITA", "QMS"), current_file, registry)

    if current_file.name == "wi-202-daily-management-tier-meetings-kpi-and-escalation.html":
        replace_text_fragments(
            doc,
            {
                "Kế hoạch Team Leader": "PPL",
            },
        )

    if current_file.name == "wi-203-job-dossier-evidence-pack-and-record-completeness.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QA", "QMS", "PPL", "ENGM"), current_file, registry)

    if current_file.name == "wi-201-quality-gates-hold-points-and-release-execution.html":
        replace_text_fragments(
            doc,
            {
                "Engineering Lead / Engineering Manager.": "ENGM.",
                "IQC Team Leader / WHS": "QCL / D-WHS",
                "IQC Team Leader.": "QCL.",
                "IQC Team Leader báo QA Manager trong 1 giờ.": "QCL báo QA trong 1 giờ.",
            },
        )

    if current_file.name == "wi-501-dispatch-capacity-and-wip-control.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("PPL", "WKM"), current_file, registry)

    if current_file.name == "wi-701-receiving-iqc-traceability-and-put-away.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("WAR", "QCL"), current_file, registry)

    if current_file.name == "wi-711-cleanroom-entry-and-gowning.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("CPS", "QE", "EHS"), current_file, registry)

    if current_file.name == "wi-712-ultrasonic-cleaning-standard-work.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("CPS", "QE"), current_file, registry)

    if current_file.name == "wi-713-environmental-monitoring-and-response.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QE", "EHS", "CPS"), current_file, registry)

    if current_file.name == "wi-714-clean-packaging-handling-and-preservation.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("CPS", "QE", "WAR"), current_file, registry)

    if current_file.name == "wi-715-helium-leak-test-standard-work.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QCL", "QE", "QC"), current_file, registry)

    if current_file.name == "wi-716-vacuum-compatible-clean-build-and-bagging.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("CPS", "QE", "WAR"), current_file, registry)

    if current_file.name == "wi-801-cnc-poka-yoke-examples.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QE", "WKM", "PE"), current_file, registry)

    if current_file.name == "wi-901-performance-dashboard.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "ITA"), current_file, registry)
        replace_text_fragments(
            doc,
            {
                "QMS Manager / KPI người chịu trách nhiệm / IT Data Owner": "QMS / ITA / MR_REPORT_OWNERS",
            },
        )

    if current_file.name == "annex-101-role-based-access-map.html":
        replace_text_fragments(
            doc,
            {
                "Line Manager / Người phụ trách quy trình": "DIRECT_LINE_MGRS / OPS_SCOPE_OWNERS",
                "Department head hoặc delegate hợp lệ": "FUNC_HEADS hoặc delegate hợp lệ theo ANNEX-123",
                "Department head / chủ quá trình": "FUNC_HEADS / OPS_SCOPE_OWNERS",
                "Department head + chủ quá trình": "FUNC_HEADS + OPS_SCOPE_OWNERS",
                "Line Manager / deputy trigger Người phụ trách": "DIRECT_LINE_MGRS / deputy trigger theo ANNEX-123",
            },
        )

    if current_file.name == "annex-104-org-chart-fullpage.html":
        replace_text_fragments(
            doc,
            {
                "Department heads, QA, EHS": "FUNC_HEADS / QA / EHS",
                "HR ↔ Department heads ↔ QA": "HR ↔ FUNC_HEADS ↔ QA",
                "All functions": "FUNC_OWNERS",
            },
        )

    if current_file.name == "annex-110-dashboard-kpi-dictionary-and-data-model.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "ITA"), current_file, registry)
        replace_text_fragments(
            doc,
            {
                "QMS Manager / IT Data Owner": "QMS / ITA",
                "Kế hoạch Team Leader": "PPL",
                "IT Data Owner": "ITA",
                "người chịu trách nhiệm Bảng điều khiển + Quy trình Owner": "QMS / MR_REPORT_OWNERS",
                "QMS / Quy trình Owner / bảng điều khiển người chịu trách nhiệm": "QMS / MR_REPORT_OWNERS",
                "Quy trình Owner + được ủy quyền Approver": "OPS_SCOPE_OWNERS + CEO / QA / PD / ENGM / SCM / FIN / HR / EHS / ITA",
            },
        )

    if current_file.name == "annex-113-dashboard-deployment-access-and-refresh-control.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("QMS", "ITA"), current_file, registry)
        replace_text_fragments(
            doc,
            {
                "Cutover Lead, Sponsor": "PD, CEO",
                "IT Manager / QMS Manager / Data Owners": "QMS / ITA",
                "Business owner và data owner": "owner nghiệp vụ và owner dữ liệu",
                "Không thay Business Owner": "Không thay owner nghiệp vụ được chỉ định",
                "Biz + data owner": "owner nghiệp vụ + owner dữ liệu",
                "Data Owner + IT Manager": "MR_REPORT_OWNERS + ITA",
                "Business Owner + System Owner": "MR_REPORT_OWNERS + QMS / ITA / ESA",
                "System Owner": "QMS / ITA / ESA",
                "IT Manager": "ITA",
            },
        )
        replace_exact_block_text(
            doc,
            '//table[contains(@class,"d-table")]//td',
            "Manager, Champion, end-user",
            render_spec(bundle("FUNC_HEADS"), current_file, registry),
        )

    if current_file.name == "annex-114-go-live-runbook-and-cutover-control.html":
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr("PD", "QMS", "ITA"), current_file, registry)
        replace_text_fragments(
            doc,
            {
                "Business Owner / Dept Manager": "FUNC_OWNERS / FUNC_HEADS",
                "Deputy Manager hoặc Champion Lead": "FUNC_HEADS hoặc DEPLOYMENT_LEADS",
                "Champion Lead": "DEPLOYMENT_LEADS",
                "Dept Manager / HR": "FUNC_HEADS / HR",
                "Dept Manager / DEPLOYMENT_LEADS": "FUNC_HEADS / DEPLOYMENT_LEADS",
                "Dept Managers / Champions": "FUNC_HEADS / DEPLOYMENT_LEADS",
                "Cutover Lead, Sponsor, IT Manager, QMS Manager": "PD, CEO, ITA, QMS",
                "Cutover Lead, Sponsor, ITA, QMS": "PD, CEO, ITA, QMS",
                "Dept Manager / Champion Lead": "FUNC_HEADS / DEPLOYMENT_LEADS",
                "Dept Manager xác nhận phòng ban đã vận hành độc lập được mà không cần Champion túc trực liên tục.": "FUNC_HEADS xác nhận phòng ban đã vận hành độc lập được mà không cần Champion túc trực liên tục.",
                "Cutover Lead / IT": "PD / ITA",
                "Cutover Lead / Sponsor": "PD / CEO",
                "Executive Sponsor / Cutover Lead": "CEO / PD",
                "Cutover Lead": "PD",
                "IT / Data Owner": "ITA / MR_REPORT_OWNERS",
            },
        )

    if current_file.name == "annex-118-offline-fallback-kit.html":
        replace_text_fragments(
            doc,
            {
                "IT Manager / Epicor Admin": "ITA / ESA",
                "IT Manager + lãnh đạo site": "ITA + CEO / PD",
                "Sales Manager / Engineering Manager / Người thay quyền.": "CS / EST / ENGM.",
                "Engineering Manager / Người thay quyền.": "ENGM.",
                "Supply Chain / QA Lead.": "SCM / QA.",
                "Engineering Manager + Production Supervisor.": "ENGM + WKM.",
                "QA Lead + Engineering Manager.": "QA + ENGM.",
                "Production Supervisor + QA Lead.": "WKM + QA.",
                "Production Director / Supervisor": "PD / WKM / SL",
                "Production Supervisor + Epicor Admin": "WKM / SL + ESA",
                "Người phụ trách KPI": "MR_REPORT_OWNERS",
                "IT Manager + QMS": "ITA + QMS",
                "QA Manager hoặc Người thay quyền đã chỉ định.": "QA hoặc QCL theo ANNEX-123.",
                "Tổng Giám Đốc / QA Manager / Finance Manager theo ma trận thẩm quyền.": "CEO / QA / FIN theo ANNEX-120.",
            },
        )

    if current_file.name == "annex-119-change-roadmap-and-priority-register.html":
        replace_text_fragments(
            doc,
            {
                "QA Manager, Quality Engineer, QC Team Leader, QC/CMM, Đo lường.": "QA, QE, QCL, QC và MCS.",
            },
        )

    if current_file.name == "annex-137-evidence-and-records-naming-convention.html":
        replace_text_fragments(
            doc,
            {
                "QA Engineer #1": "QE #1",
                "Production Supervisor #1": "WKM #1",
                "PRO1": "WKM1",
            },
        )

    if current_file.name == "dept-epicor-handbook.html":
        replace_text_fragments(
            doc,
            {
                "owner KPI xác nhận chỉ số nào là đúng cho ra quyết định.": "MR_REPORT_OWNERS xác nhận chỉ số nào là đúng cho ra quyết định.",
            },
        )

    if current_file.name == "annex-114-go-live-runbook-and-cutover-control.html":
        set_row_cell_by_match(
            doc,
            1,
            "Xác nhận Người dùng phòng mình sẵn sàng và xử lý issue nghiệp vụ",
            0,
            chips(bundle("FUNC_OWNERS")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Xác nhận Người dùng phòng mình sẵn sàng và xử lý issue nghiệp vụ",
            3,
            chips(bundle("DEPLOYMENT_LEADS")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Access, metadata, portal, refresh, backup, rollback kỹ thuật",
            0,
            chips(expr("QMS", "ITA", "ESA")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Access, metadata, portal, refresh, backup, rollback kỹ thuật",
            3,
            chips(expr("ITA", "ESA")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Phân công Champion theo ca, thu issue hiện trường, hỗ trợ tại điểm dùng",
            0,
            chips(bundle("DEPLOYMENT_LEADS")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Manager pass, Champion coverage đủ theo ca, Người dùng trọng yếu pass OJT",
            2,
            chips(bundle("FUNC_HEADS")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Dashboard có owner, source, last refresh, exception rule, baseline KPI",
            2,
            chips(bundle("MR_REPORT_OWNERS")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Đã diễn tập rollback và đã chốt trigger rõ",
            2,
            chips(expr("PD", "ITA", "ESA")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Quan sát giao dịch đầu tiên, job đầu tiên, upload đầu tiên, truy xuất đầu tiên",
            2,
            chips(expr("PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "WKM", "SL", "DBL", "CPS", "QCL")),
        )
        set_row_cell_by_match(
            doc,
            1,
            "Lỗi hướng dẫn, lỗi link cục bộ, lỗi UI, lỗi cần hỗ trợ tại chỗ nhưng chưa ảnh hưởng quyết định chính",
            3,
            chips(expr("PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "WKM", "SL", "DBL", "CPS", "QCL")),
        )
        replace_text_fragments(
            doc,
            {
                "Cutover Deputy": "PD backup theo rota cutover",
                "System Admin backup": "ITA / ESA backup",
                "Champion backup theo ca": "WKM / SL / DBL / CPS / QCL backup theo ca",
            },
        )

    if current_file.name == "annex-133-m365-records-site-topology-library-and-folder-blueprint.html":
        set_row_cell_html(
            doc,
            "05-Phòng ban-Hồ sơ",
            2,
            render_token_cluster(["D-SCS", "D-ENG", "D-PROD", "D-QUAL", "D-SCM", "D-FIN", "D-HR", "D-EHS", "D-IT", "D-ERP"], current_file, registry),
        )
        set_row_cell_html(doc, "06-Lưu trữ", 2, chips(expr("QMS[DC]")))
        set_row_cell_html(doc, "07-Mẫu-Làm việc", 2, render_token_cluster(["QMS[DC]", "FUNC_OWNERS"], current_file, registry))
        set_row_cell_html(doc, "09-Số hóa-System-Hồ sơ", 2, chips(expr("ITA", "ESA")))
        set_row_cell_html(doc, "Part-REV-Bản gốc", 2, chips(expr("ENGM")))
        set_row_cell_html(
            doc,
            "Part-REV-Bản gốc",
            3,
            f'{chips(expr("D-ENG"))} cập nhật; {chips(expr("QA", "D-PROD"))} đọc.',
        )
        set_row_cell_html(doc, "07_G6-Final-QC-Packaging", 2, chips(expr("QA", "D-PROD", "D-WHS")))

    if current_file.name == "index.html" and "03-Job-Descriptions" in current_file.as_posix():
        replace_text_fragments(
            doc,
            {
                "Kinh doanh & Customer Dịch vụ (2)": "Kinh doanh & Customer Service (2)",
            },
        )

    if current_file.name == "annex-122-kpi-cascade-dictionary.html":
        replace_exact_block_text(
            doc,
            '//div[contains(@class,"preface-block")]//div',
            "Trưởng / Giám đốc Điều hành Cán bộ / Nhân viên Quy trình Owner FIN QA HR ITA ESA",
            render_token_cluster(
                ["CEO", "CS", "EST", "PD", "ENGM", "QA[QMR]", "QMS", "SCM", "FIN", "HR", "EHS", "ITA", "ESA"],
                current_file,
                registry,
            ),
        )

    if current_file.name == "wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html":
        set_row_first_cell_html(doc, "Ban Giám đốc / Steering Committee", chips(bundle("DEPLOYMENT_STEERING")))

    if current_file.name == "wi-106-job-order-deployment-master-plan.html":
        set_row_cell_by_match(
            doc,
            0,
            "Governance & tài trợ dự án",
            2,
            chips(bundle("DEPLOYMENT_STEERING")),
        )

    if current_file.name == "pol-qms-002-quality-objectives.html":
        set_row_cell_html(doc, "Hệ thống & cải tiến", 2, chips(bundle("ALL_DEPTS")))

    if current_file.name == "sop-802-incident-near-miss-and-ehs.html":
        role_rows = doc.xpath('//h2[@id="p4"]/following-sibling::div[contains(@class,"table-card")][1]//table/tbody/tr')
        if len(role_rows) >= 2:
            cells = role_rows[1].xpath("./td")
            if cells:
                set_element_html(cells[0], render_spec(bundle("AREA_LEADS"), current_file, registry))
        replace_text_fragments(
            doc,
            {
                "Employee / Witness": "Người chứng kiến / người phát hiện",
                "Supervisor": "cấp quản lý hiện trường",
                "scene control": "kiểm soát hiện trường",
                "return-to-use": "mở lại sử dụng",
                "follow-up": "theo dõi sau sự cố",
                "product-impact": "ảnh hưởng tới sản phẩm",
                "quality flow": "luồng chất lượng",
                "unsafe condition": "điều kiện không an toàn",
            },
        )


def normalize_jd_file(
    doc_path: Path,
    registry: dict,
    aliases: dict[str, dict],
    titles: dict[str, str],
    phrase_replacements: dict[str, str],
    profiles: dict[str, dict[str, object]],
) -> None:
    source_text = doc_path.read_text(encoding="utf-8")
    body_source = extract_jd_body_source(source_text)
    doc = html.fromstring(body_source, parser=html.HTMLParser(encoding="utf-8"))

    role_code = None
    role = None
    for code, meta in registry["roles"].items():
        if Path(meta["jd_path"]).name == doc_path.name:
            role_code = code
            role = meta
            break
    if role_code is None or role is None:
        return
    profile = profiles.get(role_code, {})
    jd_departments = list(profile.get("departments", []))

    title_text = f'{role["jd_code"]} — {role["title_en"]} | HESEM QMS'
    strong_text = f'{role["jd_code"]} — {role["title_en"]}'

    title_el = doc.find(".//title")
    if title_el is None:
        head = doc.find(".//head")
        if head is not None:
            title_el = etree.SubElement(head, "title")
    if title_el is not None:
        title_el.text = title_text

    strong = doc.xpath('//div[contains(@class,"title")]/strong')
    if strong:
        strong[0].text = strong_text
    subtitle = doc.xpath('//div[contains(@class,"title")]/span[contains(@class,"sub-vn")]')
    if subtitle:
        subtitle[0].text = role["title_vi"]

    update_meta_rows(doc, doc_path, registry, aliases, {"HR Manager": expr("HR"), "Chief Executive Officer": expr("CEO")})
    if jd_departments:
        set_meta_row_spec(doc, ("owner", "chủ sở hữu"), expr(*jd_departments), doc_path, registry)
    set_meta_row_spec(doc, ("approved", "phe duyet", "phê duyệt"), expr("CEO"), doc_path, registry)

    for row in doc.xpath('//div[contains(@class,"meta")]/div[contains(@class,"row")]'):
        spans = row.xpath("./span")
        if len(spans) < 2:
            continue
        label = fold_text(element_text(spans[0]))
        if "code" in label or label.startswith("ma"):
            value_el = spans[-1]
            for child in list(value_el):
                value_el.remove(child)
            value_el.text = role["jd_code"]

    position_row = None
    stale_rows: list[etree._Element] = []
    for row in doc.xpath('//table[contains(@class,"require-table")]//tr'):
        cells = row.xpath("./th|./td")
        if len(cells) < 2:
            continue
        label = fold_text(element_text(cells[0]))
        value_el = cells[1]
        if label.startswith("ma vi tri"):
            for child in list(value_el):
                value_el.remove(child)
            value_el.text = role["jd_code"]
            position_row = row
        elif label.startswith("ma vai tro dung trong sop/raci") or label.startswith("mu quan tri co the gan"):
            stale_rows.append(row)
        elif label.startswith("chuc danh theo tai lieu"):
            for child in list(value_el):
                value_el.remove(child)
            value_el.text = role["title_en"]

    for stale_row in stale_rows:
        parent = stale_row.getparent()
        if parent is not None:
            parent.remove(stale_row)

    tail_row = position_row
    if tail_row is not None:
        role_row = html.fragment_fromstring("<tr><th>Mã vai trò dùng trong SOP/RACI</th><td></td></tr>")
        tail_row.addnext(role_row)
        set_element_html(role_row.xpath("./td")[0], render_spec(expr(role_code), doc_path, registry))
        tail_row = role_row

    hats = role.get("hats_allowed", [])
    if hats and tail_row is not None:
        hat_row = html.fragment_fromstring("<tr><th>Mũ quản trị có thể gắn</th><td></td></tr>")
        tail_row.addnext(hat_row)
        set_element_html(hat_row.xpath("./td")[0], render_spec(expr(*[f"{role_code}[{hat}]" for hat in hats]), doc_path, registry))

    update_role_cells(doc, doc_path, registry, aliases, {})
    update_plain_titles(doc, titles)
    replace_text_fragments(doc, phrase_replacements)
    normalize_jd_structured_rows(doc, doc_path, role_code, registry, profiles)
    normalize_jd_preface_block(doc, doc_path, role_code, registry, profiles)
    replace_text_fragments(doc, jd_role_replacements(role_code, role))
    apply_jd_specific_tweaks(doc, role_code, doc_path, registry)
    normalize_organization_shortlinks(doc, doc_path)
    normalize_reference_links(doc, doc_path, registry)
    normalize_jd_purpose_intro(doc, role_code, role)
    set_require_row_value(doc, ("chuc danh theo tai lieu",), value_text=role["title_en"])

    container = doc.xpath('//div[contains(@class,"container")]')
    body_html = html.tostring(container[0] if container else doc, encoding="unicode", method="html")
    head_assets = extract_jd_head_assets(source_text, doc_path)
    document = build_html_document(title_text, head_assets, body_html)
    doc_path.write_text(document, encoding="utf-8")


def normalize_controlled_file(
    doc_path: Path,
    registry: dict,
    aliases: dict[str, dict],
    titles: dict[str, str],
    overrides: dict[str, dict],
    file_overrides: dict[str, dict[str, dict]],
    phrase_replacements: dict[str, str],
) -> None:
    doc = parse_html_document(doc_path.read_text(encoding="utf-8"))
    local_overrides = dict(overrides)
    local_overrides.update(file_overrides.get(doc_path.name, {}))
    update_meta_rows(doc, doc_path, registry, aliases, local_overrides)
    update_role_cells(doc, doc_path, registry, aliases, local_overrides)
    update_plain_titles(doc, titles)
    normalize_department_handbook_header(doc, doc_path, registry)
    replace_text_fragments(doc, phrase_replacements)
    apply_file_specific_tweaks(doc, doc_path, registry)
    update_meta_rows(doc, doc_path, registry, aliases, local_overrides)
    update_role_cells(doc, doc_path, registry, aliases, local_overrides)
    normalize_organization_shortlinks(doc, doc_path)
    normalize_reference_links(doc, doc_path, registry)
    doc_path.write_text(serialize_html_document(doc), encoding="utf-8")


def jd_role_replacements(role_code: str, role_meta: dict) -> dict[str, str]:
    replacements: dict[str, str] = {}
    hats = role_meta.get("hats_allowed", [])
    if "DC" in hats:
        replacements["Document Controller"] = f"{role_code}[DC]"
    if "LA" in hats:
        replacements["Lead Auditor"] = f"{role_code}[LA]"
    if "CI" in hats:
        replacements["Continuous Improvement Lead"] = f"{role_code}[CI]"
    ic_hats = [hat for hat in hats if hat.startswith("IC-")]
    if ic_hats:
        replacements["Incident Commander"] = f"{role_code}[{ic_hats[0]}]"
    if role_code == "QA":
        replacements["QA Engineer"] = "QE"
    return replacements


def apply_jd_specific_tweaks(doc: etree._Element, role_code: str, current_file: Path, registry: dict) -> None:
    def chips(spec: dict) -> str:
        return render_spec(spec, current_file, registry)

    if role_code == "DBT":
        replace_text_fragments(
            doc,
            {
                "Team Leader/Quality": "DBL / QA",
            },
        )

    if role_code == "SL":
        replace_text_fragments(
            doc,
            {
                "Team Leader Ca – Ca 1 / Ca 2": "Shift Leader - Ca 1 / Ca 2",
                "Team Leader / Shift Leader / trưởng nhóm hiện trường": "SL / DBL / CPS / QCL hoặc trưởng nhóm hiện trường tương đương",
            },
        )

    if role_code == "QC":
        replace_text_fragments(
            doc,
            {
                "QC Team Leader/QE": "QCL / QE",
                "QC Team Leader/QA": "QCL / QA",
                "QC Team Leader / QA": "QCL / QA",
                "Sản xuất / QA / QC Team Leader": "Sản xuất / QA / QCL",
            },
        )

    if role_code == "QMS":
        replace_text_fragments(
            doc,
            {
                "QA Engineer / QMS": "QE / QMS",
            },
        )

    if role_code == "QE":
        replace_text_fragments(
            doc,
            {
                "QC Team Leader / QC team": "QCL / đội QC",
                "QA Engineer / QMS": "QE / QMS",
            },
        )

    if role_code == "HR":
        set_row_first_cell_html(doc, "Trưởng / Giám đốc Điều hành Cán bộ / Nhân viên", chips(bundle("DEPLOYMENT_STEERING")))
        set_row_first_cell_html(doc, "Department Trưởng bộ phận", chips(bundle("FUNC_HEADS")))

    if role_code == "GLP":
        set_row_first_cell_html(doc, "Sản xuất Giám đốc / phòng ban trưởng bộ phận", chips(bundle("FUNC_HEADS")))

    if role_code == "ESA":
        set_row_first_cell_html(
            doc,
            "Trưởng / Giám đốc Điều hành Cán bộ / Nhân viên / key Quy trình Owner",
            render_token_cluster(
                ["CEO", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "QMS"],
                current_file,
                registry,
            ),
        )


def refresh_workbook(registry: dict, profiles: dict[str, dict[str, object]]) -> None:
    wb = load_workbook(WORKBOOK_PATH)

    ws = wb["Vai tro & Chuc danh"]
    ws.delete_rows(2, ws.max_row)
    headers = ["STT", "Thuật ngữ tiếng Anh", "Bản dịch tiếng Việt", "Dịch (Yes/No)", "Ghi chú"]
    for col, header in enumerate(headers, 1):
        ws.cell(row=1, column=col).value = header
    for index, code in enumerate(sorted(registry["roles"]), start=1):
        role = registry["roles"][code]
        profile = profiles.get(code, {})
        department_codes = ", ".join(profile.get("departments", []))
        ws.cell(row=index + 1, column=1).value = index
        ws.cell(row=index + 1, column=2).value = role["title_en"]
        ws.cell(row=index + 1, column=3).value = role["title_vi"]
        ws.cell(row=index + 1, column=4).value = "Yes"
        ws.cell(row=index + 1, column=5).value = f'{code} | {role["jd_code"]} | {department_codes or role["department"]}'

    detail_name = "Role code & JD link"
    if detail_name in wb.sheetnames:
        del wb[detail_name]
    detail = wb.create_sheet(detail_name)
    detail_headers = [
        "STT",
        "Role code",
        "Job title English",
        "Chuc danh tieng Viet chuan",
        "Legacy department label",
        "Department codes",
        "Reports to role code",
        "Direct reports role codes",
        "JD code",
        "JD path",
        "Governance hats",
    ]
    for col, header in enumerate(detail_headers, 1):
        detail.cell(row=1, column=col).value = header
    for index, code in enumerate(sorted(registry["roles"]), start=1):
        role = registry["roles"][code]
        profile = profiles.get(code, {})
        detail.cell(row=index + 1, column=1).value = index
        detail.cell(row=index + 1, column=2).value = code
        detail.cell(row=index + 1, column=3).value = role["title_en"]
        detail.cell(row=index + 1, column=4).value = role["title_vi"]
        detail.cell(row=index + 1, column=5).value = role["department"]
        detail.cell(row=index + 1, column=6).value = ", ".join(profile.get("departments", []))
        detail.cell(row=index + 1, column=7).value = ", ".join(profile.get("reports_to", []))
        detail.cell(row=index + 1, column=8).value = ", ".join(profile.get("direct_reports", []))
        detail.cell(row=index + 1, column=9).value = role["jd_code"]
        detail.cell(row=index + 1, column=10).value = role["jd_path"]
        detail.cell(row=index + 1, column=11).value = ", ".join(role.get("hats_allowed", []))

    hats_name = "Governance hats"
    if hats_name in wb.sheetnames:
        del wb[hats_name]
    hats = wb.create_sheet(hats_name)
    for col, header in enumerate(["STT", "Hat code", "Label English", "Nhan de tieng Viet", "Host roles"], 1):
        hats.cell(row=1, column=col).value = header
    for index, hat_code in enumerate(sorted(registry["hats"]), start=1):
        hat = registry["hats"][hat_code]
        hats.cell(row=index + 1, column=1).value = index
        hats.cell(row=index + 1, column=2).value = hat_code
        hats.cell(row=index + 1, column=3).value = hat["label_en"]
        hats.cell(row=index + 1, column=4).value = hat["label_vi"]
        hats.cell(row=index + 1, column=5).value = ", ".join(hat["host_roles"])

    dept_name = "Department code & handbook link"
    if dept_name in wb.sheetnames:
        del wb[dept_name]
    depts = wb.create_sheet(dept_name)
    dept_headers = [
        "STT",
        "Department code",
        "Department title English",
        "Ten tieng Viet chuan",
        "Loai",
        "Parent department",
        "Handbook path",
        "Lead roles",
    ]
    for col, header in enumerate(dept_headers, 1):
        depts.cell(row=1, column=col).value = header
    for index, code in enumerate(sorted(registry.get("departments", {})), start=1):
        dept = registry["departments"][code]
        depts.cell(row=index + 1, column=1).value = index
        depts.cell(row=index + 1, column=2).value = code
        depts.cell(row=index + 1, column=3).value = dept["title_en"]
        depts.cell(row=index + 1, column=4).value = dept["title_vi"]
        depts.cell(row=index + 1, column=5).value = dept.get("type", "department")
        depts.cell(row=index + 1, column=6).value = dept.get("parent_department")
        depts.cell(row=index + 1, column=7).value = dept["handbook_path"]
        depts.cell(row=index + 1, column=8).value = ", ".join(dept.get("lead_roles", []))

    wb.save(WORKBOOK_PATH)


def scan_unresolved(paths: list[Path]) -> str:
    hints = [
        "All Process Owners / Department Heads",
        "Process Owners / Department Heads",
        "All Quy trình Owner / Department Trưởng bộ phận",
        "Quy trình Owner / Department Trưởng bộ phận",
        "Process Owner",
        "Department Head",
        "Department head",
        "Functional Head",
        "Responsible Person",
        "Document Controller",
        "Data Owner",
        "Data Owners",
        "IT Data Owner",
        "KPI owner",
        "Top Management",
        "QA/QMS",
        "QMS/QA",
        "QA Lead",
        "QC Lead",
        "QA Engineer",
        "QMS Manager",
        "IT Manager",
        "Sales Manager",
        "Engineering Manager",
        "Production Supervisor",
        "Lead Auditor",
        "Warehouse Supervisor",
        "Metrology Lead",
        "Incident Commander",
        "Continuous Improvement Lead",
        "Commercial Responsible Person",
        "Team Leader",
        "Area Supervisor",
        "Team Leader / Supervisor",
        "Trainer / Mentor",
        "Champion Lead",
        "Dept Managers",
        "Program Lead",
        "Cutover Lead",
        "Command Center Lead",
        "Executive Sponsor",
        "Publisher / IT",
        "QA Final",
        "QMS-Owners / QMS-IT-Administrators",
        "QMS + Lãnh đạo",
        "Lãnh đạo + QMS",
        "Dòng / Chuyền Manager",
        "HR / Người đào tạo",
        "HR + Dept Trưởng / Đầu",
        "SAL",
        "ENG",
        "PRO/QA",
        "WHS/SAL",
        "Business Owner",
        "System Owner",
        "Change Owner",
        "Approval Board",
        "Engineering Configuration Lead",
        "Maintenance / Engineering",
    ]
    lines: list[str] = []
    parser = html.HTMLParser(encoding="utf-8")
    for path in sorted(paths):
        doc = html.fromstring(path.read_text(encoding="utf-8"), parser=parser)
        focus = doc.xpath(
            '//div[contains(@class,"meta")]'
            ' | //div[contains(@class,"preface-block")]'
            ' | //div[contains(@class,"role-note")]'
            ' | //div[contains(@class,"note-blue")]'
            ' | //p'
            ' | //li'
            ' | //th'
            ' | //td'
            ' | //span[contains(@class,"inline-tag")]'
        )
        text = "\n".join(element_text(node) for node in focus if 0 < len(element_text(node)) <= 220)
        hits = []
        for hint in hints:
            if hint in {"ENG", "SAL"}:
                pattern = rf"(?<![\w-]){re.escape(hint)}(?![\w-])"
            else:
                pattern = rf"(?<!\w){re.escape(hint)}(?!\w)"
            if re.search(pattern, text):
                hits.append(hint)
        if hits:
            lines.append(f"{path.relative_to(ROOT)} :: {', '.join(hits)}")
    report = "\n".join(lines)
    UNRESOLVED_REPORT.write_text(report, encoding="utf-8")
    return report


def main() -> None:
    registry = load_registry()
    profiles = ROLE_BOUNDARY_PROFILES
    aliases = department_alias_map()
    aliases.update(role_alias_map())
    aliases.update(bundle_alias_map())
    for code in registry["roles"]:
        aliases.setdefault(code, expr(code))
    for code in registry.get("departments", {}):
        aliases.setdefault(code, expr(code))
    titles = title_aliases()
    phrase_replacements = {
        "Responsible Person": "người chịu trách nhiệm",
        "Top Management": "Ban lãnh đạo",
        "Top Quản lý": "Ban lãnh đạo",
        "QA/QMS": "QA / QMS",
        "QMS/QA": "QA / QMS",
        "QMS Manager": "QMS",
        "IT Manager": "ITA",
        "IT System Administrator": "ITA",
        "IT System Governance viên": "ITA",
        "Engineering Manager": "ENGM",
        "QA Lead": "QA",
        "QC Lead": "QCL",
        "QA Engineer": "QE",
        "Epicor Kinetic (Epicor) (Epicor) (Epicor)": "Epicor Kinetic / Epicor ERP",
    }
    overrides = {
        "QMS Engineer / QA Lead": expr("QMS[DC]", "QA[QMR]", joiner=" + "),
        "QA Lead / Quality Engineer": expr("QA", "QE", joiner=" + "),
        "IT Administrator / Governance viên hệ thống Epicor": expr("ITA", "ESA", joiner=" + "),
        "QMS Engineer / HR Lead": expr("QMS[DC]", "HR", joiner=" + "),
        "Kỹ thuật Lead / QA Lead": expr("ENGM", "QA", joiner=" + "),
        "CS / QA Lead": expr("CS", "QA", joiner=" + "),
        "Engineering Lead / Estimator": expr("ENGM", "EST", joiner=" + "),
        "Quality Engineer / QA Manager": expr("QE", "QA", joiner=" + "),
        "Engineering Lead / Process Engineer": expr("ENGM", "PE", joiner=" + "),
        "Supply Chain Manager / QA Manager": expr("SCM", "QA", joiner=" + "),
        "QA Manager / Supply Chain Manager": expr("QA", "SCM", joiner=" + "),
        "Production Planner / Production Director": expr("PPL", "PD", joiner=" + "),
        "CNC Workshop Manager / Shift Leader": expr("WKM", "SL", joiner=" + "),
        "CNC Workshop Manager / Maintenance Technician": expr("WKM", "MNT", joiner=" + "),
        "Engineering Lead / CNC Workshop Manager / QA Manager": expr("ENGM", "WKM", "QA", joiner=" / "),
        "Deburr Team Lead / QA Manager": expr("DBL", "QA", joiner=" + "),
        "Metrology and Calibration Specialist / QA Manager": expr("MCS", "QA", joiner=" + "),
        "Quality Engineer / Metrology and Calibration Specialist": expr("QE", "MCS", joiner=" + "),
        "QA Manager / QC Inspector Lead": expr("QA", "QCL", joiner=" + "),
        "QA Manager / QMS Engineer": expr("QA", "QMS", joiner=" + "),
        "Supply Chain Manager / Warehouse Clerk": expr("SCM", "WAR", joiner=" + "),
        "QA Manager / Cleaning and Packaging Supervisor": expr("QA", "CPS", joiner=" + "),
        "QA Manager / CNC Workshop Manager": expr("QA[PSO]", "WKM", joiner=" + "),
        "HR Manager / QA Manager": expr("HR", "QA", joiner=" + "),
        "EHS Specialist / HR Manager": expr("EHS", "HR", joiner=" + "),
        "Finance Manager / AP-AR and Payments Accountant": expr("FIN", "APAR", joiner=" + "),
        "QA Manager / Production Engineer-IE": expr("QA", "PIE[CI]", joiner=" + "),
        "QMS Engineer / QA Manager": expr("QMS[LA]", "QA[QMR]", joiner=" + "),
        "Production Engineer-IE / QA Manager": expr("PIE[CI]", "QA[QMR]", joiner=" + "),
        "Document Controller": expr("QMS[DC]"),
        "Lead Auditor": expr("QMS[LA]"),
        "Continuous Improvement Lead": expr("PIE[CI]"),
        "Incident Commander": expr("PD[IC-PROD]"),
        "Engineering Lead/Manager": expr("ENGM"),
        "Maintenance / Engineering": expr("MNT", "ENGM"),
        "Engineering / Maintenance": expr("ENGM", "MNT"),
        "PRO/QA": expr("D-PROD", "QA"),
        "WHS/SAL": expr("D-WHS", "D-SCS"),
        "WHS Supervisor": expr("D-WHS"),
        "Warehouse Manager": expr("D-WHS"),
        "Kho Manager": expr("D-WHS"),
        "Giao vận Lead": expr("D-LOG"),
        "Shipping Lead": expr("D-LOG"),
        "Mua hàng Lead": expr("D-PUR"),
        "Kinh doanh Manager": expr("D-SCS"),
        "Kinh doanh-Customer Dịch vụ Manager": expr("D-SCS"),
        "Program / Kế hoạch": expr("PD", "PPL"),
        "QMS + Lãnh đạo": expr("QMS", "CEO", joiner=" + "),
        "Lãnh đạo + QMS": expr("CEO", "QMS", joiner=" + "),
        "QMS-Owners / QMS-IT-Administrators": expr("QMS", "ITA"),
        "Publisher / IT": expr("QMS", "ITA"),
        "Executive Sponsor": expr("CEO"),
        "Cutover Lead": expr("PD"),
        "Program Lead": expr("PD"),
        "Command Center Lead": expr("QMS", "ITA"),
        "Champion / Supervisor": bundle("DEPLOYMENT_LEADS"),
        "Champions / Supervisors": bundle("DEPLOYMENT_LEADS"),
        "Executive Sponsor / Cutover Lead": expr("CEO", "PD"),
        "Cutover Lead / Sponsor": expr("PD", "CEO"),
        "Command Center Lead / QMS": expr("QMS", "ITA"),
        "Command Center Lead / QMS / IT": expr("QMS", "ITA"),
    }
    file_overrides = {
        "sop-802-incident-near-miss-and-ehs.html": {
            "Top Management + EHS": expr("PD", "EHS", joiner=" + "),
        },
        "sop-106-change-and-configuration-management.html": {
            "Change Owner": expr("ENGM", "QA", "PD", "SCM", "ITA", "ESA"),
            "Approval Board": expr("CEO", "QA", "PD", "ENGM", "ITA"),
            "Change Owner + QA Manager": expr("ENGM", "QA", "PD", "ITA", "ESA"),
            "Engineering Configuration Lead": expr("ENGM", "QMS[DC]", "ESA"),
        },
    }

    jd_root = ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "03-Job-Descriptions"
    sop_root = ROOT / "03-Tai-Lieu-Van-Hanh" / "01-SOPs"
    annex_targets = [
        ROOT / "03-Tai-Lieu-Van-Hanh" / "03-Reference" / "01-ANNEX-100" / "12-ANNEX-120-Authority-KPI-and-Deputy-Control" / "annex-120-authority-matrix.html",
        ROOT / "03-Tai-Lieu-Van-Hanh" / "03-Reference" / "05-ANNEX-500" / "annex-503-cnc-operating-model-and-role-boundary.html",
    ]

    jd_files = list(jd_root.rglob("jd-*.html"))
    sop_files = list(sop_root.rglob("sop-*.html"))
    controlled_files = sop_files + annex_targets

    for path in jd_files:
        normalize_jd_file(path, registry, aliases, titles, phrase_replacements, profiles)
    for path in controlled_files:
        normalize_controlled_file(path, registry, aliases, titles, overrides, file_overrides, phrase_replacements)

    all_html_files: list[Path] = []
    for root in [ROOT / "03-Tai-Lieu-Van-Hanh", ROOT / "02-Tai-Lieu-He-Thong"]:
        for path in root.rglob("*.html"):
            all_html_files.append(path)
            if path in jd_files or path in controlled_files:
                continue
            normalize_controlled_file(path, registry, aliases, titles, overrides, file_overrides, phrase_replacements)

    refresh_workbook(registry, profiles)
    report = scan_unresolved(sorted(set(all_html_files + jd_files + controlled_files)))
    print("UPDATED ROLE SYSTEM")
    print("UNRESOLVED: 0" if not report else f"UNRESOLVED: see {UNRESOLVED_REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

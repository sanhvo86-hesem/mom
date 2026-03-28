from __future__ import annotations

import json
import os
import re
from copy import deepcopy
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

from lxml import etree, html
from openpyxl import load_workbook


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


def element_text(element: etree._Element) -> str:
    return normalize_ws(" ".join(element.itertext()))


def load_registry() -> dict:
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def expand_spec(spec: dict, registry: dict) -> tuple[list[str], str]:
    joiner = spec.get("joiner", " / ")
    if "bundle" in spec:
        return list(registry["bundles"][spec["bundle"]]), joiner
    return list(spec["codes"]), joiner


def role_link(code: str, current_file: Path, registry: dict) -> str:
    base, hat = (code[:-1].split("[", 1) if "[" in code and code.endswith("]") else (code, None))
    role = registry["roles"][base]
    title = role["title_en"]
    if hat:
        title = f'{title} [{registry["hats"][hat]["label_en"]}]'
    jd_abs = ROOT / role["jd_path"]
    href = os.path.relpath(jd_abs, current_file.parent).replace("\\", "/")
    return (
        f'<a class="role-link" href="{href}" title="{title} ({role["title_vi"]})">'
        f'<span class="role-code">{code}</span></a>'
    )


def render_spec(spec: dict, current_file: Path, registry: dict) -> str:
    codes, joiner = expand_spec(spec, registry)
    sep = f'<span class="role-sep">{joiner.strip()}</span>'
    chips = [role_link(code, current_file, registry) for code in codes]
    body = "".join(chips[i] + (sep if i < len(chips) - 1 else "") for i in range(len(chips)))
    return f'<span class="role-cluster">{body}</span>'


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
        "Kỹ thuật Lead / Manager": expr("ENGM"),
        "Kỹ thuật Lead/Manager": expr("ENGM"),
        "Kỹ thuật Lead / QA Lead": expr("ENGM", "QA"),
        "Trưởng Engineering": expr("ENGM"),
        "Production Planner": expr("PPL"),
        "Planner": expr("PPL"),
        "Kế hoạch sản xuất": expr("PPL"),
        "QA Manager": expr("QA"),
        "QA Lead": expr("QA"),
        "Trưởng QA": expr("QA"),
        "QA": expr("QA"),
        "QMR": expr("QA[QMR]"),
        "Document Controller": expr("QMS[DC]"),
        "QMS Engineer": expr("QMS"),
        "QMS Coordinator": expr("QMS"),
        "Quality Engineer": expr("QE"),
        "QA Engineer": expr("QE"),
        "Kỹ sư Chất lượng": expr("QE"),
        "QC Inspector Lead": expr("QCL"),
        "QC Lead": expr("QCL"),
        "QC Team Leader": expr("QCL"),
        "QC Inspector": expr("QC"),
        "QC Inspector / CMM Programmer / Operator": expr("QC"),
        "QC Inspector / CMM Programmer-Operator": expr("QC"),
        "QC Inspector / IQC": expr("QC"),
        "QC Inspector / IPQC": expr("QC"),
        "QC Inspector / Appraiser": expr("QC"),
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
        "Purchasing": expr("BUY"),
        "Mua hàng": expr("BUY"),
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
        "Hậu cần / Giao vận": expr("LOG"),
        "IT Administrator": expr("ITA"),
        "IT Admin": expr("ITA"),
        "Quản trị IT": expr("ITA"),
        "Epicor System Administrator": expr("ESA"),
        "Governance viên hệ thống Epicor": expr("ESA"),
        "Epicor Administrator": expr("ESA"),
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
        "Cleaning and Packaging Supervisor": expr("CPS"),
        "Cleaning Supervisor": expr("CPS"),
        "Cleaning / Packaging Technician": expr("CPT"),
        "Cleaning Technician": expr("CPT"),
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
        "Top Management": bundle("TOP_MGMT"),
        "Functional Heads": bundle("FUNC_HEADS"),
        "Functional Head": bundle("FUNC_HEADS"),
        "Functional Leader": bundle("FUNC_HEADS"),
        "Department Head": bundle("FUNC_HEADS"),
        "Department Heads": bundle("FUNC_HEADS"),
        "Department Head / Functional Leader": bundle("FUNC_HEADS"),
        "Lead Department": bundle("FUNC_HEADS"),
        "Department Manager": bundle("FUNC_HEADS"),
        "Process Owner": bundle("FUNC_HEADS"),
        "Process Owners": bundle("FUNC_HEADS"),
        "Document Owner": bundle("FUNC_HEADS"),
        "Document Responsible Person": bundle("FUNC_HEADS"),
        "Data Owner": bundle("FUNC_HEADS"),
        "QMS Data Owner": expr("QMS", "ITA"),
        "Chủ dữ liệu / Process Owner": bundle("FUNC_HEADS"),
        "QA/QMS hoặc Responsible Person quá trình": expr("QA[QMR]", "QMS", "PD", "ENGM", "SCM", "FIN", "HR", "EHS", "ITA"),
        "Responsible Person nghiệp vụ + QA/QMS": expr("PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA", "QMS"),
        "Department Head + HR": expr("PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS", "ITA"),
        "IT Administrator / Data Responsible Person": expr("ITA", "PD", "ENGM", "QA[QMR]", "SCM", "FIN", "HR", "EHS"),
        "Responsible Person Thương mại": expr("CS"),
        "Responsible Person Thương mại hoặc GM theo giá trị / rủi ro": expr("CS", "CEO"),
        "Incident Commander": expr("PD[IC-PROD]"),
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


def update_meta_rows(doc: etree._Element, current_file: Path, registry: dict, aliases: dict[str, dict], overrides: dict[str, dict]) -> None:
    for row in doc.xpath('//div[contains(@class,"meta")]/div[contains(@class,"row")]'):
        spans = row.xpath("./span")
        if len(spans) < 2:
            continue
        label = element_text(spans[0]).lower()
        value_el = spans[-1]
        current_value = element_text(value_el)
        spec = None
        if "approved" in label or "phê duyệt" in label:
            spec = expr("CEO")
        elif "owner" in label or "chủ sở hữu" in label:
            spec = overrides.get(current_value) or aliases.get(current_value) or try_resolve_roleish_text(current_value, aliases, overrides)
        if spec:
            set_element_html(value_el, render_spec(spec, current_file, registry))


def update_role_cells(doc: etree._Element, current_file: Path, registry: dict, aliases: dict[str, dict], overrides: dict[str, dict]) -> None:
    targets = doc.xpath('//th|//td|//span[contains(@class,"inline-tag")]')
    for element in targets:
        if element.xpath('.//*[contains(@class,"role-link")]'):
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
        if "role-code" in class_name or "role-link" in class_name:
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
        if "role-code" in class_name or "role-link" in class_name:
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


def apply_file_specific_tweaks(doc: etree._Element, current_file: Path, registry: dict) -> None:
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
) -> None:
    source_text = doc_path.read_text(encoding="utf-8")
    body_source = extract_jd_body_source(source_text)
    doc = html.fromstring(body_source, parser=html.HTMLParser(encoding="utf-8"))

    role_code = None
    for code, meta in registry["roles"].items():
        if Path(meta["jd_path"]).name == doc_path.name:
            role_code = code
            role = meta
            break
    if role_code is None:
        return

    title_el = doc.find(".//title")
    if title_el is None:
        head = doc.find(".//head")
        if head is not None:
            title_el = etree.SubElement(head, "title")
    if title_el is not None:
        title_el.text = f'{role["jd_code"]} — {role["title_en"]} | HESEM QMS'

    strong = doc.xpath('//div[contains(@class,"title")]/strong')
    if strong:
        strong[0].text = f'{role["jd_code"]} — {role["title_en"]}'
    subtitle = doc.xpath('//div[contains(@class,"title")]/span[contains(@class,"sub-vn")]')
    if subtitle:
        subtitle[0].text = role["title_vi"]

    update_meta_rows(
        doc,
        doc_path,
        registry,
        aliases,
        {"HR Manager": expr("HR"), "Tổng Giám đốc": expr("CEO"), "Chief Executive Officer": expr("CEO")}
    )

    for row in doc.xpath('//div[contains(@class,"meta")]/div[contains(@class,"row")]'):
        spans = row.xpath("./span")
        if len(spans) < 2:
            continue
        label = element_text(spans[0]).lower()
        label_map = {
            "code:": "Mã:",
            "version:": "Phiên bản:",
            "effective date:": "Ngày hiệu lực:",
            "owner:": "Chủ sở hữu:",
            "approved by:": "Phê duyệt:",
        }
        normalized_label = label_map.get(label)
        if normalized_label:
            set_element_html(spans[0], f"<b>{normalized_label}</b>")
        if "code" in label or "mã" in label:
            spans[-1].text = role["jd_code"]

    position_row = None
    stale_rows: list[etree._Element] = []
    for row in doc.xpath('//table[contains(@class,"require-table")]//tr'):
        cells = row.xpath("./th|./td")
        if len(cells) < 2:
            continue
        label = element_text(cells[0])
        value_el = cells[1]
        if label.startswith("Mã vị trí"):
            value_el.text = role["jd_code"]
            position_row = row
        elif label.startswith("Mã vai trò dùng trong SOP/RACI") or label.startswith("Mũ quản trị có thể gắn"):
            stale_rows.append(row)
        elif label.startswith("Chức danh theo tài liệu"):
            value_el.text = role["title_en"]
        elif label == "Bộ phận":
            value_el.text = role["department"]
        elif label.startswith("Báo cáo trực tiếp") and role_code != "CEO":
            value_el.text = "Chief Executive Officer" if role_code == "PD" else value_el.text

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
    replace_text_fragments(doc, phrase_replacements)
    for row in doc.xpath('//table[contains(@class,"require-table")]//tr'):
        cells = row.xpath("./th|./td")
        if len(cells) < 2:
            continue
        label = element_text(cells[0])
        value_el = cells[1]
        if label.startswith("Mã vị trí"):
            value_el.text = role["jd_code"]
        elif label.startswith("Chức danh theo tài liệu"):
            value_el.text = role["title_en"]
            for child in list(value_el):
                value_el.remove(child)
        elif label == "Bộ phận":
            value_el.text = role["department"]
            for child in list(value_el):
                value_el.remove(child)
    container = doc.xpath('//div[contains(@class,"container")]')
    body_html = html.tostring(container[0] if container else doc, encoding="unicode", method="html")
    head_assets = extract_jd_head_assets(source_text, doc_path)
    document = build_html_document(f'{role["jd_code"]} — {role["title_en"]} | HESEM QMS', head_assets, body_html)
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
    replace_text_fragments(doc, phrase_replacements)
    apply_file_specific_tweaks(doc, doc_path, registry)
    doc_path.write_text(serialize_html_document(doc), encoding="utf-8")


def refresh_workbook(registry: dict) -> None:
    wb = load_workbook(WORKBOOK_PATH)

    ws = wb["Vai tro & Chuc danh"]
    ws.delete_rows(2, ws.max_row)
    headers = ["STT", "Thuật ngữ tiếng Anh", "Bản dịch tiếng Việt", "Dịch (Yes/No)", "Ghi chú"]
    for col, header in enumerate(headers, 1):
        ws.cell(row=1, column=col).value = header
    for index, code in enumerate(sorted(registry["roles"]), start=1):
        role = registry["roles"][code]
        ws.cell(row=index + 1, column=1).value = index
        ws.cell(row=index + 1, column=2).value = role["title_en"]
        ws.cell(row=index + 1, column=3).value = role["title_vi"]
        ws.cell(row=index + 1, column=4).value = "Yes"
        ws.cell(row=index + 1, column=5).value = f'{code} | {role["jd_code"]} | {role["department"]}'

    detail_name = "Role code & JD link"
    if detail_name in wb.sheetnames:
        del wb[detail_name]
    detail = wb.create_sheet(detail_name)
    detail_headers = ["STT", "Role code", "Job title English", "Chuc danh tieng Viet chuan", "Phong ban", "JD code", "JD path", "Governance hats"]
    for col, header in enumerate(detail_headers, 1):
        detail.cell(row=1, column=col).value = header
    for index, code in enumerate(sorted(registry["roles"]), start=1):
        role = registry["roles"][code]
        detail.cell(row=index + 1, column=1).value = index
        detail.cell(row=index + 1, column=2).value = code
        detail.cell(row=index + 1, column=3).value = role["title_en"]
        detail.cell(row=index + 1, column=4).value = role["title_vi"]
        detail.cell(row=index + 1, column=5).value = role["department"]
        detail.cell(row=index + 1, column=6).value = role["jd_code"]
        detail.cell(row=index + 1, column=7).value = role["jd_path"]
        detail.cell(row=index + 1, column=8).value = ", ".join(role.get("hats_allowed", []))

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

    wb.save(WORKBOOK_PATH)


def scan_unresolved(paths: list[Path]) -> str:
    hints = [
        "Process Owner",
        "Department Head",
        "Functional Head",
        "Responsible Person",
        "Document Controller",
        "Data Owner",
        "Top Management",
        "QA Lead",
        "QC Lead",
        "QA Engineer",
        "Lead Auditor",
        "Warehouse Supervisor",
        "Metrology Lead",
        "Incident Commander",
        "Continuous Improvement Lead",
        "Commercial Responsible Person"
    ]
    lines: list[str] = []
    parser = html.HTMLParser(encoding="utf-8")
    for path in sorted(paths):
        doc = html.fromstring(path.read_text(encoding="utf-8"), parser=parser)
        focus = doc.xpath('//div[contains(@class,"meta")] | //th | //td | //span[contains(@class,"inline-tag")]')
        text = "\n".join(element_text(node) for node in focus if len(element_text(node)) <= 60)
        hits = [hint for hint in hints if hint in text]
        if hits:
            lines.append(f"{path.relative_to(ROOT)} :: {', '.join(hits)}")
    report = "\n".join(lines)
    UNRESOLVED_REPORT.write_text(report, encoding="utf-8")
    return report


def main() -> None:
    registry = load_registry()
    aliases = role_alias_map()
    titles = title_aliases()
    phrase_replacements = {
        "Responsible Person": "người chịu trách nhiệm",
        "Top Management": "Ban lãnh đạo",
    }
    overrides = {
        "QMS Engineer / QA Lead": expr("QMS[DC]", "QA[QMR]", joiner=" + "),
        "Tổng Giám đốc / QA Lead": expr("CEO", "QA[QMR]", joiner=" + "),
        "QA Lead / Quality Engineer": expr("QA", "QE", joiner=" + "),
        "IT Administrator / Governance viên hệ thống Epicor": expr("ITA", "ESA", joiner=" + "),
        "QMS Engineer / HR Lead": expr("QMS[DC]", "HR", joiner=" + "),
        "Kỹ thuật Lead / QA Lead": expr("ENGM", "QA", joiner=" + "),
        "CS / Sản xuất Giám đốc": expr("CS", "PD", joiner=" + "),
        "Sản xuất Giám đốc / IT Administrator": expr("PD[IC-PROD]", "ITA[IC-IT]", joiner=" + "),
        "CS / QA Lead": expr("CS", "QA", joiner=" + "),
        "Kho Nhân viên văn phòng / Tooling Thủ kho": expr("WAR", "TOOL", joiner=" + "),
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
        "QA Manager": expr("QA[QMR]"),
        "Production Engineer-IE / QA Manager": expr("PIE[CI]", "QA[QMR]", joiner=" + "),
        "Document Responsible Person": expr("QMS[DC]"),
        "Document Controller": expr("QMS[DC]"),
        "Lead Auditor": expr("QMS[LA]"),
        "Continuous Improvement Lead": expr("PIE[CI]"),
        "Incident Commander": expr("PD[IC-PROD]")
    }
    file_overrides = {
        "sop-802-incident-near-miss-and-ehs.html": {
            "Top Management + EHS": expr("PD", "EHS", joiner=" + "),
        },
    }

    jd_root = ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "03-Job-Descriptions"
    sop_root = ROOT / "03-Tai-Lieu-Van-Hanh" / "01-SOPs"
    annex_targets = [
        ROOT / "03-Tai-Lieu-Van-Hanh" / "03-Reference" / "01-ANNEX-100" / "12-ANNEX-120-Authority-KPI-and-Deputy-Control" / "annex-120-authority-matrix.html",
        ROOT / "03-Tai-Lieu-Van-Hanh" / "03-Reference" / "05-ANNEX-500" / "annex-503-cnc-operating-model-and-role-boundary.html"
    ]

    jd_files = list(jd_root.rglob("jd-*.html"))
    sop_files = list(sop_root.rglob("sop-*.html"))
    controlled_files = sop_files + annex_targets

    for path in jd_files:
        normalize_jd_file(path, registry, aliases, titles, phrase_replacements)
    for path in controlled_files:
        normalize_controlled_file(path, registry, aliases, titles, overrides, file_overrides, phrase_replacements)

    for root in [ROOT / "03-Tai-Lieu-Van-Hanh", ROOT / "02-Tai-Lieu-He-Thong"]:
        for path in root.rglob("*.html"):
            if path in jd_files or path in controlled_files:
                continue
            normalize_controlled_file(path, registry, aliases, titles, overrides, file_overrides, phrase_replacements)

    refresh_workbook(registry)
    report = scan_unresolved(jd_files + controlled_files)
    print("UPDATED ROLE SYSTEM")
    print("UNRESOLVED: 0" if not report else report)


if __name__ == "__main__":
    main()

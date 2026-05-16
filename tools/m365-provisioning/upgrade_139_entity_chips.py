#!/usr/bin/env python3
"""
Upgrade ANNEX-139 plain role/dept text -> entity-cluster chips matching
the graphics convention used in ANNEX-133/134.

Each role code (QMS, QA, ENGM, ...) and dept code (D-ENG, D-PROD, ...)
is wrapped in <a class="entity-link role-link"> / dept-link with proper
JD/dept handbook href + Vietnamese-English title tooltip.

Idempotent: re-running on already-upgraded file is a no-op because the
regex only matches bare-text owner cells (no existing <a> tags inside).
"""
from __future__ import annotations
import re
from pathlib import Path

DOC = Path(__file__).parent.parent.parent / "mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-139-m365-ip-and-restricted-library-internal-blueprint.html"

# Relative path from ANNEX-139 to system/organization tree.
# ANNEX-139 is 5 levels under mom/docs (operations/references/01-ANNEX-100/13-.../file.html)
# system/organization is 1 level under mom/docs
# So ../../../../ = mom/docs
REL_JD = "../../../../system/organization/03-Job-Descriptions"
REL_DEPT = "../../../../system/organization/02-Department-Handbooks"

# Role code -> (JD path, English title, Vietnamese name)
ROLES = {
    "QMS":      (f"{REL_JD}/04-JD-Quality/jd-qms-engineer.html",                     "QMS Engineer",                                    "Kỹ sư hệ thống QMS"),
    "QMS[DC]":  (f"{REL_JD}/04-JD-Quality/jd-qms-engineer.html",                     "QMS Engineer [Document Controller]",              "Kỹ sư hệ thống QMS"),
    "QMS[QMR]": (f"{REL_JD}/04-JD-Quality/jd-qa-manager.html",                       "QA Manager [Quality Management Representative]",  "Trưởng bộ phận đảm bảo chất lượng"),
    "QA":       (f"{REL_JD}/04-JD-Quality/jd-qa-manager.html",                       "QA Manager",                                      "Trưởng bộ phận đảm bảo chất lượng"),
    "QA[QMR]":  (f"{REL_JD}/04-JD-Quality/jd-qa-manager.html",                       "QA Manager [Quality Management Representative]",  "Trưởng bộ phận đảm bảo chất lượng"),
    "QE":       (f"{REL_JD}/04-JD-Quality/jd-quality-engineer.html",                 "Quality Engineer",                                "Kỹ sư chất lượng"),
    "MCS":      (f"{REL_JD}/04-JD-Quality/jd-metrology-and-calibration-specialist.html", "Metrology and Calibration Specialist",        "Chuyên viên đo lường và hiệu chuẩn"),
    "ENGM":     (f"{REL_JD}/03-JD-Engineering/jd-engineering-lead-manager.html",     "Engineering Lead / Manager",                      "Trưởng nhóm / quản lý kỹ thuật"),
    "CAMP":     (f"{REL_JD}/03-JD-Engineering/jd-cam-nc-programmer.html",            "CAM/NC Programmer",                               "Lập trình CAM/NC"),
    "EHS":      (f"{REL_JD}/09-JD-EHS/jd-ehs-specialist.html",                       "EHS Specialist",                                  "Chuyên viên EHS"),
    "CEO":      (f"{REL_JD}/01-JD-Executive/jd-chief-executive-officer.html",        "Chief Executive Officer",                         "Tổng Giám đốc"),
    "HR":       (f"{REL_JD}/08-JD-HR/jd-hr-manager.html",                            "HR Manager",                                      "Quản lý nhân sự"),
    "EST":      (f"{REL_JD}/06-JD-Sales/jd-estimator.html",                          "Estimator",                                       "Nhân viên báo giá"),
    "SCM":      (f"{REL_JD}/05-JD-Supply-Chain/jd-supply-chain-manager.html",        "Supply Chain Manager",                            "Quản lý chuỗi cung ứng"),
}

# Dept code -> (handbook path, English title, Vietnamese name)
DEPTS = {
    "D-ENG":  (f"{REL_DEPT}/dept-engineering-handbook.html",                  "Engineering Department",                                  "Phòng Kỹ thuật"),
    "D-PROD": (f"{REL_DEPT}/dept-production-handbook.html",                   "Production Department",                                   "Phòng Sản xuất"),
    "D-PPC":  (f"{REL_DEPT}/dept-production-handbook.html",                   "Production Planning and Control Function",                "Điều độ và kiểm soát sản xuất"),
    "D-SCS":  (f"{REL_DEPT}/dept-sales-and-customer-service-handbook.html",   "Sales and Customer Service Department",                   "Phòng Kinh doanh và Dịch vụ khách hàng"),
    "D-SCM":  (f"{REL_DEPT}/dept-supply-chain-handbook.html",                 "Supply Chain Department",                                 "Phòng Chuỗi cung ứng"),
    "D-PUR":  (f"{REL_DEPT}/dept-supply-chain-handbook.html",                 "Purchasing Function",                                     "Bộ phận Mua hàng"),
    "D-TCR":  (f"{REL_DEPT}/dept-supply-chain-handbook.html",                 "Tool Crib Function",                                      "Bộ phận Kho dao cụ"),
    "D-WHS":  (f"{REL_DEPT}/dept-supply-chain-handbook.html",                 "Warehouse Function",                                      "Bộ phận Kho"),
    "D-LOG":  (f"{REL_DEPT}/dept-supply-chain-handbook.html",                 "Logistics and Shipping Function",                         "Bộ phận Logistics và Giao vận"),
    "D-FIN":  (f"{REL_DEPT}/dept-finance-handbook.html",                      "Finance Department",                                      "Phòng Tài chính"),
    "D-HR":   (f"{REL_DEPT}/dept-hr-handbook.html",                           "Human Resources Department",                              "Phòng Nhân sự"),
    "D-EHS":  (f"{REL_DEPT}/dept-ehs-handbook.html",                          "EHS Department",                                          "Phòng EHS"),
    "D-IT":   (f"{REL_DEPT}/dept-it-handbook.html",                           "IT Department",                                           "Phòng CNTT"),
    "D-ERP":  (f"{REL_DEPT}/dept-epicor-handbook.html",                       "ERP Administration Function",                             "Bộ phận quản trị ERP"),
}

def role_chip(code: str) -> str:
    href, en, vn = ROLES[code]
    return (
        f'<a class="entity-link role-link" href="{href}" title="{en} ({vn})">'
        f'<span class="entity-code role-code">{code}</span></a>'
    )

def dept_chip(code: str) -> str:
    href, en, vn = DEPTS[code]
    return (
        f'<a class="entity-link dept-link" href="{href}" title="{en} ({vn})">'
        f'<span class="entity-code dept-code">{code}</span></a>'
    )

def chip(code: str) -> str:
    """Return chip for a role or dept code."""
    if code in ROLES:
        return role_chip(code)
    if code in DEPTS:
        return dept_chip(code)
    raise ValueError(f"Unknown code: {code}")

def cluster(codes_text: str) -> str:
    """Convert 'CODE1/CODE2' or 'CODE1+CODE2' to entity-cluster span."""
    # Parse codes preserving separators
    parts = re.split(r'([/+])', codes_text)
    inner = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if p in ('/', '+'):
            inner.append(f'<span class="entity-sep role-sep">{p}</span>')
        else:
            try:
                inner.append(chip(p))
            except ValueError:
                # Unknown code -- skip cluster wrapping for this cell
                return None  # type: ignore
    return f'<span class="entity-cluster role-cluster">{"".join(inner)}</span>'

# Pattern: <td>OWNER_TEXT</td> where OWNER_TEXT is a sequence of role/dept codes
# separated by / or +. Only match plain-text cells (no inner tags).
# Owner cells appear right BEFORE a "Không được lưu" or similar -- we match
# cells whose text is exclusively codes/separators.

# Build a regex pattern: codes are uppercase letters/digits/dash/brackets
CODE_REGEX = r'[A-Z][A-Z0-9\[\]\-]*'
OWNER_CELL_REGEX = re.compile(
    r'(<td>)(' + CODE_REGEX + r'(?:\s*[/+]\s*' + CODE_REGEX + r')*)(</td>)'
)

def looks_like_owner_cell(text: str) -> bool:
    """Return True if text is exclusively codes + separators."""
    parts = re.split(r'[/+]', text)
    for p in parts:
        p = p.strip()
        if not p:
            return False
        if p not in ROLES and p not in DEPTS:
            return False
    return True

def upgrade(match: re.Match) -> str:
    open_tag, text, close_tag = match.group(1), match.group(2), match.group(3)
    if not looks_like_owner_cell(text):
        return match.group(0)
    out = cluster(text)
    if out is None:
        return match.group(0)
    return f'{open_tag}{out}{close_tag}'

def main() -> None:
    content = DOC.read_text(encoding="utf-8")
    new_content, n = OWNER_CELL_REGEX.subn(upgrade, content)
    if n == 0:
        print("No owner cells matched. Already upgraded?")
    else:
        DOC.write_text(new_content, encoding="utf-8")
        print(f"Upgraded {n} owner cells.")

if __name__ == "__main__":
    main()

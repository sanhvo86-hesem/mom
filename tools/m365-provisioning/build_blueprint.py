#!/usr/bin/env python3
"""
Build M365 folder blueprint strictly per canonical ANNEX-133 §2-§12.

Source spec:
  mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/
  annex-133-m365-records-site-topology-library-and-folder-blueprint.html

Every folder created here traces to a specific section/line of ANNEX-133.
"""

from __future__ import annotations
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).parent / "blueprint"

# --- §7 standard dept zones (lines 295-308) ------------------------------------
DEPT_ZONES_WITH_CURRENT_AND_YEAR = [
    "01-Governance",
    "02-Operations",
    "03-Registers-and-Logs",
    "05-Interfaces-and-Released-Packs",
]
DEPT_ZONE_PROJECTS = "04-Projects-and-Improvement"  # 00-Active + {YYYY}

# §7 lines 313-319: 00-Live-Control sub-folders (7 subs)
LIVE_CONTROL_SUBS = [
    "01-Boards-and-Queues",
    "02-Master-Lists-and-Mappings",
    "03-Dashboards-and-Views",
    "04-Open-Issues-and-Action-Trackers",
    "05-Link-Indexes-and-Controlled-Views",
    "06-Department-Calendar-and-Roster",
    "07-Shared-Reference-Indexes",
]

# §7 lines 322-331: 06-Working-Transitory ROLE template
WORKING_ROLE_SUBS = [
    "00-Team-Inbox",
    "01-Team-Draft",
    "02-Team-Review",
    "03-Team-Promote",
    "04-Team-Offline",
    "05-Team-Ref",
]
WORKING_EMPLOYEE_WB_SUBS = ["00-My-Inbox", "03-My-Handoffs"]

# §7 lines 332-338: 07-Reference-and-Received-External (7 subs)
REFERENCE_SUBS = [
    "01-Customer-Received",
    "02-Supplier-Received",
    "03-Standards-and-Manuals",
    "04-Department-Work-Aids-and-Visuals",
    "05-Portal-Exports-and-System-Downloads",
    "06-Convenience-Copies",
    "07-To-Be-Culled",
]

# Default year token folder
YYYY = "{YYYY}"

# Default placeholder role / employee names (template instance per §7 keyline)
ROLE_TEMPLATE = "ROLE-{RoleCode}"
EMPLOYEE_TEMPLATE = "{EmployeeID}-{DisplayName}"

# --- §3 QMS-Governance (lines 185-198) -----------------------------------------
# 14 folders. 12 and 13 have NO {YYYY} (per canonical lines 196-197)
QMS_GOVERNANCE_WITH_YEAR = [
    "01-Management-Review",
    "02-Internal-Audits",
    "03-External-Audits-and-CB",
    "04-Risk-and-Opportunity",
    "05-Change-Control",
    "06-Document-Control-and-Issuance",
    "07-Communication-and-Leadership",
    "08-Context-and-Interested-Parties",
    "09-Continual-Improvement-and-Kaizen",
    "10-Contingency-and-Disruption",
    "11-Legal-and-Compliance",
    "14-KPI-and-Dashboard-Control",
]
QMS_GOVERNANCE_NO_YEAR = [
    "12-Knowledge-and-Lessons-Learned",
    "13-Authority-RACI-Deputy",
]

# --- §4 Quality-Records (lines 217-228) ----------------------------------------
# 12 folders, ALL with {YYYY}
QUALITY_RECORDS = [
    "01-Quality-Planning",
    "02-Inspection-Execution",
    "03-Calibration-and-MSA",
    "04-NCR",
    "05-CAPA",
    "06-Customer-Complaints",
    "07-FAI-and-First-Article",
    "08-SPC-and-Capability",
    "09-Product-Safety-and-FOD",
    "10-Ship-Release-and-CoC",
    "11-Supplier-Quality-and-SCAR",
    "12-Audit-and-MR-Quality-Inputs",
]

# --- §5 Job-Dossiers gates (lines 250-260) -------------------------------------
# Path: Job-Dossiers/{YYYY}/{JobNum}-{PartNo}-REV-{Revision}/<11 gates>
JOB_DOSSIER_GATES = [
    "00_Admin-Control",
    "01_G0-Contract-Kickoff",
    "02_G1-Engineering-Release",
    "03_G2-IQC-Receiving",
    "04_G3-Setup-Release",
    "05_G4-FAI-First-Article",
    "06_G5-IPQC-Production",
    "07_G6-Final-QC-Packaging",
    "08_G7-Ship-Release",
    "09_NCR-CAPA-Deviation",
    "99_Archive-Locked",
]

# --- §6 Training-Records (lines 278-285) ---------------------------------------
# CANONICAL uses Vietnamese diacritics + space for folders 01 and 02 (LITERAL per §6).
# Conflict with §12 {DescriptionSlug} rule + sync safety. Flagged in README.
# 07 has NO {YYYY}; others have {YYYY}.
TRAINING_RECORDS_WITH_YEAR = [
    "01-Đào tạo-kế hoạch",          # §6 line 278 — CANONICAL, has diacritic + space
    "02-Điểm danh-and-Class-Records",  # §6 line 279 — CANONICAL, has diacritic + space
    "03-OJT-Evidence",
    "04-Competence-Assessment",
    "05-Certification-Register",
    "06-Skill-Matrix-and-Coverage",
    "08-Safety-Induction-and-Special-Briefings",
]
TRAINING_RECORDS_NO_YEAR = [
    "07-Academy-Content-Control",
]

# --- §8 12 dept-specific paths under Department-Ops -----------------------------
# Each dept entry: code -> dict with operations/registers/interfaces sub-folders
# Folder names from canonical §8 lines 357-428 letter-for-letter.
DEPARTMENTS = {
    "DEP-EXEC": {  # §8 line 359
        "02-Operations": [
            "01-Strategy-Deployment",
            "02-Management-Review-Inputs",
            "03-Board-and-Customer-Commitments",
            "04-Risk-and-Escalation",
        ],
        "03-Registers-and-Logs": [
            "01-Decision-Log",
            "02-Exception-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Leadership-Communication",
            "02-Board-Pack-and-Control-Tower-Pack",
        ],
    },
    "DEP-QMS": {  # §8 line 365
        "02-Operations": [
            "01-QMS-Deployment",
            "02-Document-Control-Operations",
            "03-Process-and-System-Mapping",
            "04-KPI-and-System-Monitoring",
            "05-Improvement-Coordination",
        ],
        "03-Registers-and-Logs": [
            "01-Action-Tracker",
            "02-Issue-and-Release-Tracker",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Audit-Input-Pack",
            "02-MR-Input-Pack",
        ],
    },
    "DEP-QA": {  # §8 line 371
        "02-Operations": [
            "01-Quality-Planning",
            "02-Inspection-Execution",
            "03-Calibration-and-MSA-Coordination",
            "04-NCR-and-CAPA-Reaction",
            "05-Ship-Release",
            "06-Product-Safety-and-FOD",
        ],
        "03-Registers-and-Logs": [
            "01-Control-Plan-Log",
            "02-SPC-Tracker",
            "03-Release-Exception-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Customer-Complaint-Response",
            "02-Supplier-Quality-Pack",
        ],
    },
    "DEP-ENG": {  # §8 line 377
        "02-Operations": [
            "01-Feasibility-and-DFM",
            "02-Baseline-and-Release-Pack",
            "03-NC-and-Setup-Support",
            "04-FAI-Support",
            "05-Technical-Change-Execution",
            "06-Knowledge-Reuse-and-Lessons-Learned",
        ],
        "03-Registers-and-Logs": [
            "01-Assumption-Log",
            "02-Change-Implementation-Log",
            "03-Proveout-Tracker",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-RFQ-Response-Pack",
            "02-Process-Readiness-Pack",
            "03-Engineering-CAPA-Response",
        ],
    },
    # §8 line 383 LITERAL: "Department-Ops/DEP-PRO/" — NOT DEP-PROD.
    # Strict canonical compliance keeps this 3-letter code per the path column.
    "DEP-PRO": {
        "02-Operations": [
            "01-Dispatch-and-Readiness",
            "02-Setup-and-First-Article",
            "03-Shift-Handoff-and-WIP",
            "04-Downtime-and-Maintenance",
            "05-Tool-Life-and-Tooling",
            "06-Deburr-Cleaning-and-Packaging",
            "07-WIP-and-Abnormal-Reaction",
        ],
        "03-Registers-and-Logs": [
            "01-Dispatch-Snapshot",
            "02-Downtime-History",
            "03-WIP-Aging-Log",
            "04-Tool-Life-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Control-Tower-Readiness-Pack",
            "02-Pack-Ready-Handoff",
        ],
    },
    "DEP-SCM": {  # §8 line 389
        "02-Operations": [
            "01-Supplier-Qualification-and-Performance",
            "02-PO-and-Outsource-Pack",
            "03-Receiving-and-Traceability",
            "04-Warehouse-and-FIFO",
            "05-Tool-Crib-and-Consumables",
            "06-Logistics-and-Shipment-Booking",
            "07-Supplier-Recovery",
        ],
        "03-Registers-and-Logs": [
            "01-PO-Tracker",
            "02-Expedite-Log",
            "03-Quarantine-and-Aging-Log",
            "04-Shipment-Exception-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Buyer-Communication-Pack",
            "02-Shipment-Interface-Pack",
            "03-SCAR-Response-Pack",
        ],
    },
    "DEP-SCS": {  # §8 line 395
        "02-Operations": [
            "01-RFQ-and-Quote",
            "02-Contract-Review-and-Order-Ack",
            "03-Customer-Change-and-Escalation",
            "04-Customer-Property-and-Consigned",
            "05-Complaint-Interface",
            "06-Customer-Satisfaction",
            "07-Shipment-Communication",
        ],
        "03-Registers-and-Logs": [
            "01-RFQ-Register",
            "02-Order-Mismatch-Log",
            "03-Customer-Update-Cadence",
            "04-RMA-Tracker",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Order-Release-Pack",
            "02-Customer-Communication-Pack",
        ],
    },
    "DEP-FIN": {  # §8 line 401
        "02-Operations": [
            "01-Invoice-and-AR",
            "02-AP-and-Payment",
            "03-Job-Costing-and-Margin",
            "04-Payroll-Accounting-Interface",
            "05-Close-and-Reconciliation",
            "06-Cash-and-Exposure",
            "07-Financial-Control",
        ],
        "03-Registers-and-Logs": [
            "01-AR-Aging-Log",
            "02-AP-Due-Tracker",
            "03-Close-Checklist-Status",
            "04-SoD-Exception-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Invoice-Interface-Pack",
            "02-Payroll-Input-Receipt",
            "03-Costing-Review-Pack",
        ],
    },
    "DEP-HR": {  # §8 line 407
        "02-Operations": [
            "01-Manpower-Planning-and-Recruitment",
            "02-Onboarding-and-Induction",
            "03-HR-Administration",
            "04-Employee-Relations",
            "05-Payroll-Input-Control",
            "06-Offboarding-and-Handoff",
            "07-Succession-and-Deputy",
        ],
        "03-Registers-and-Logs": [
            "01-Requisition-Tracker",
            "02-Onboarding-Tracker",
            "03-Offboarding-Tracker",
            "04-Authorized-Work-Exception-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Access-Request-Pack",
            "02-Payroll-Input-Pack",
            "03-Discipline-and-Grievance-Pack",
        ],
    },
    "DEP-EHS": {  # §8 line 413
        "02-Operations": [
            "01-Hazard-PPE-and-Permit",
            "02-Incident-and-Near-Miss",
            "03-Inspection-and-Unsafe-Condition",
            "04-Emergency-Preparedness",
            "05-Environment-and-Cleanroom",
            "06-Contractor-and-Visitor-Safety",
            "07-EHS-Campaign-and-Learning",
        ],
        "03-Registers-and-Logs": [
            "01-Incident-Register",
            "02-Unsafe-Condition-Log",
            "03-Permit-Register",
            "04-Emergency-Drill-Tracker",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Restart-Release-Pack",
            "02-EHS-MR-Input-Pack",
        ],
    },
    "DEP-IT": {  # §8 line 419
        "02-Operations": [
            "01-Access-and-Identity",
            "02-Configuration-and-Change",
            "03-Backup-and-Recovery",
            "04-Asset-and-Endpoint",
            "05-Incident-and-Recovery",
            "06-Platform-Operations",
            "07-Offline-Fallback-Kit",
        ],
        "03-Registers-and-Logs": [
            "01-Access-Review-Status",
            "02-Backup-Health",
            "03-Endpoint-Exception-Log",
            "04-Change-Calendar",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Deployment-Pack",
            "02-Recovery-Pack",
        ],
    },
    "DEP-ERP": {  # §8 line 425
        "02-Operations": [
            "01-Transaction-Governance",
            "02-Master-Data-Request",
            "03-UAT-Deployment-and-Cutover",
            "04-Error-and-Reconciliation",
            "05-Interface-and-Data-Exchange",
            "06-Sensitive-Role-Control",
        ],
        "03-Registers-and-Logs": [
            "01-Role-Review-Log",
            "02-Master-Data-Change-Log",
            "03-Interface-Error-Log",
            "04-Reentry-Queue",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-UAT-Pack",
            "02-System-Handoff-Pack",
            "03-Reconciliation-Pack",
        ],
    },
}

# --- §9 Employee-Records (14 per-person sub-folders, lines 453-467) ----------
EMPLOYEE_PERSON_SUBS = [
    "00-Identity-and-Employment-Profile",
    "01-Recruitment-and-Offer",
    "02-Employment-Contract-and-Legal",
    "03-Onboarding-Role-and-Access",
    "04-Training-and-Certification-Link",
    "05-Probation-Performance-and-Development",
    "06-Payroll-and-Benefits-Restricted",
    "07-Leave-Attendance-and-Time-Case",
    "08-Medical-and-Fit-to-Work-Restricted",
    "09-Assets-Access-and-Issued-Items",
    "10-Role-Change-Transfer-and-Promotion",
    "11-Disciplinary-and-Legal-Restricted",
    "12-Offboarding-and-Exit",
    "13-Sealed-Copies-and-Legal-Hold",
]

# --- §10 System-Records (8 areas) -- per line 501 BOTH 00-Current AND {YYYY} ---
SYSTEM_RECORDS_AREAS = [
    "01-Access-and-Identity",
    "02-M365-and-SharePoint-Configuration",
    "03-Epicor-Master-Data-and-Role-Control",
    "04-Deployment-UAT-and-Cutover",
    "05-Backup-Restore-and-Recovery",
    "06-Incident-and-Problem-Management",
    "07-Asset-and-Endpoint-Control",
    "08-Automation-Run-Logs",
]

# --- §10 QMS-Source-Control (4 areas) ------------------------------------------
# §10 line 494 specifies 01-Controlled-Source/qms.hesem.com.vn/ mirrors local worktree:
# mom, mom/docs/system, mom/docs/operations, mom/docs/forms,
# mom/docs/training, mom/docs/glossary, assets, core-standards, tools
QMS_SOURCE_CONTROLLED_MIRROR = [
    "mom",
    "mom/docs/system",
    "mom/docs/operations",
    "mom/docs/forms",
    "mom/docs/training",
    "mom/docs/glossary",
    "assets",
    "core-standards",
    "tools",
]


def mkpath(p: Path) -> None:
    """Create dir + .gitkeep."""
    p.mkdir(parents=True, exist_ok=True)
    keep = p / ".gitkeep"
    if not keep.exists():
        keep.touch()


def build_dept_zone(base: Path) -> None:
    """Build canonical §7 9-zone scaffold for one dept folder."""
    # 00-Live-Control-and-Master-Data + 7 subs
    live = base / "00-Live-Control-and-Master-Data"
    for sub in LIVE_CONTROL_SUBS:
        mkpath(live / sub)

    # 01,02,03,05 each have 00-Current and {YYYY}
    for zone in DEPT_ZONES_WITH_CURRENT_AND_YEAR:
        mkpath(base / zone / "00-Current")
        mkpath(base / zone / YYYY)

    # 04-Projects-and-Improvement has 00-Active and {YYYY}
    mkpath(base / DEPT_ZONE_PROJECTS / "00-Active")
    mkpath(base / DEPT_ZONE_PROJECTS / YYYY)

    # 06-Working-Transitory-and-Draft with ROLE template
    role_base = base / "06-Working-Transitory-and-Draft" / ROLE_TEMPLATE
    for sub in WORKING_ROLE_SUBS:
        mkpath(role_base / sub)
    # 90-Employee-WB with employee template + sub-folders
    emp_wb = role_base / "90-Employee-WB" / EMPLOYEE_TEMPLATE
    for sub in WORKING_EMPLOYEE_WB_SUBS:
        mkpath(emp_wb / sub)
    mkpath(role_base / "91-Deputy-Handoffs")
    mkpath(role_base / "99-Clear-90d")

    # 07-Reference-and-Received-External + 7 subs
    ref = base / "07-Reference-and-Received-External"
    for sub in REFERENCE_SUBS:
        mkpath(ref / sub)

    # 99-Archive
    mkpath(base / "99-Archive")


def build_dept_specific(base: Path, spec: dict) -> None:
    """Add §8 dept-specific sub-folders into 02-Operations, 03-Registers, 05-Interfaces.

    Per §8 column header: 'dùng cho cả 00-Current và {YYYY} khi áp dụng'
    — so each dept-specific sub must exist under BOTH 00-Current and {YYYY}.
    """
    for zone, subs in spec.items():
        for sub in subs:
            mkpath(base / zone / "00-Current" / sub)
            mkpath(base / zone / YYYY / sub)


def build_blueprint() -> None:
    if ROOT.exists():
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)

    # =====================================================================
    # SITE 1 — HESEM-Records (§2 line 165)
    # =====================================================================
    s1 = ROOT / "HESEM-Records"

    # §3 QMS-Governance — 14 folders, 12/13 NO year
    g = s1 / "QMS-Governance"
    for f in QMS_GOVERNANCE_WITH_YEAR:
        mkpath(g / f / YYYY)
    for f in QMS_GOVERNANCE_NO_YEAR:
        mkpath(g / f)

    # §4 Quality-Records — 12 folders, ALL with {YYYY}
    q = s1 / "Quality-Records"
    for f in QUALITY_RECORDS:
        mkpath(q / f / YYYY)

    # §6 Training-Records — 8 folders, 07 NO year
    t = s1 / "Training-Records"
    for f in TRAINING_RECORDS_WITH_YEAR:
        mkpath(t / f / YYYY)
    for f in TRAINING_RECORDS_NO_YEAR:
        mkpath(t / f)

    # §7+§8 Department-Ops — 12 depts with 9 zones + dept-specific subs
    do = s1 / "Department-Ops"
    for dept, spec in DEPARTMENTS.items():
        dept_base = do / dept
        build_dept_zone(dept_base)
        build_dept_specific(dept_base, spec)

    # =====================================================================
    # SITE 2 — HESEM-Job-Evidence (§2 line 166)
    # =====================================================================
    s2 = ROOT / "HESEM-Job-Evidence"

    # §11 Part-REV-Master/{CustomerID}/{PartNo}/REV-{Rev}/
    prm = s2 / "Part-REV-Master"
    mkpath(prm / "{CustomerID}" / "{PartNo}" / "REV-{Rev}")

    # §5 Job-Dossiers/{YYYY}/{JobNum}-{PartNo}-REV-{Revision}/<11 gates>
    jd = s2 / "Job-Dossiers" / YYYY / "{JobNum}-{PartNo}-REV-{Revision}"
    for gate in JOB_DOSSIER_GATES:
        mkpath(jd / gate)

    # Customer-Received — §2 keyline only; no internal §3-§11 spec.
    # Strict compliance: create library root only with .gitkeep
    mkpath(s2 / "Customer-Received")

    # Tooling-Fixture-Gage — §2 keyline only; no internal §3-§11 spec.
    mkpath(s2 / "Tooling-Fixture-Gage")

    # =====================================================================
    # SITE 3 — HESEM-People (§2 line 167)
    # =====================================================================
    s3 = ROOT / "HESEM-People"

    # §9 Employee-Records — 6 top-level + 14 per-person
    er = s3 / "Employee-Records"

    # 01-Active-Employees/{EmployeeID}-{FullName}/<14 subs>
    active_template = er / "01-Active-Employees" / "{EmployeeID}-{FullName}"
    for sub in EMPLOYEE_PERSON_SUBS:
        mkpath(active_template / sub)

    # 02-Pending-Starters/{YYYY}/{Population}/{CandidateOrPersonID}-{Name}/
    mkpath(
        er
        / "02-Pending-Starters"
        / YYYY
        / "{Population}"
        / "{CandidateOrPersonID}-{Name}"
    )

    # 03-Former-Employees/{YYYY}/{EmployeeID}-{FullName}/<14 subs>
    # §9 line 439 + paragraph at line 471: 14-sub schema applies to 01-Active AND 03-Former
    former_template = er / "03-Former-Employees" / YYYY / "{EmployeeID}-{FullName}"
    for sub in EMPLOYEE_PERSON_SUBS:
        mkpath(former_template / sub)

    # 04-Contractors-Interns-Temps/{YYYY}/{Population}/{ID-Name}/
    mkpath(
        er / "04-Contractors-Interns-Temps" / YYYY / "{Population}" / "{ID-Name}"
    )

    # 05-Visitors-and-Vendors/{YYYY}/{VisitType}/{VisitorName}/
    mkpath(er / "05-Visitors-and-Vendors" / YYYY / "{VisitType}" / "{VisitorName}")

    # 06-Restricted-Shared-Ops/{RestrictedProcess}/00-Current/
    mkpath(er / "06-Restricted-Shared-Ops" / "{RestrictedProcess}" / "00-Current")

    # HR-Operations — §2 keyline only; no internal §3-§11 spec.
    mkpath(s3 / "HR-Operations")

    # =====================================================================
    # SITE 4 — HESEM-Digital (§2 line 168)
    # =====================================================================
    s4 = ROOT / "HESEM-Digital"

    # §10 System-Records — 8 areas, EACH with 00-Current AND {YYYY} per line 501
    sr = s4 / "System-Records"
    for area in SYSTEM_RECORDS_AREAS:
        mkpath(sr / area / "00-Current")
        mkpath(sr / area / YYYY)

    # §10 QMS-Source-Control — 4 areas
    qsc = s4 / "QMS-Source-Control"
    # 01-Controlled-Source/qms.hesem.com.vn/<mirror sub-paths>
    cs_root = qsc / "01-Controlled-Source" / "qms.hesem.com.vn"
    for p in QMS_SOURCE_CONTROLLED_MIRROR:
        mkpath(cs_root / p)
    mkpath(qsc / "02-Release-Manifests" / YYYY)
    mkpath(qsc / "03-Server-Deploy-Receipts" / YYYY)
    mkpath(qsc / "04-Reverse-Sync-Intake" / YYYY)

    # =====================================================================
    # CROSS-SITE / SPECIAL LIBRARIES (§11 lines 516-520)
    # =====================================================================
    arch = ROOT / "06-Archive"
    mkpath(arch / "01-Closed-Year-Archive" / YYYY)
    mkpath(arch / "02-Superseded-and-Obsolete")
    mkpath(arch / "03-Legal-Hold")
    mkpath(arch / "04-Locked-Job-Pack" / YYYY)

    tmpl = ROOT / "07-Working-Templates"
    mkpath(tmpl / "{Function}" / "{TemplateType}")


def collect_tree(root: Path) -> list[str]:
    out: list[str] = []
    for dirpath, dirnames, _ in os.walk(root):
        rel = Path(dirpath).relative_to(root)
        if str(rel) == ".":
            continue
        out.append(str(rel))
    out.sort()
    return out


if __name__ == "__main__":
    build_blueprint()
    tree = collect_tree(ROOT)
    n_dirs = len(tree)
    n_files = sum(1 for _ in ROOT.rglob("*") if _.is_file())
    print(f"Built {n_dirs} directories, {n_files} files (.gitkeep markers).")
    # Write tree to manifest_tree.txt for audit
    (Path(__file__).parent / "blueprint" / "_TREE.txt").write_text(
        "\n".join(tree) + "\n", encoding="utf-8"
    )
    print(f"Wrote _TREE.txt manifest for audit.")

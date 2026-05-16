#!/usr/bin/env python3
"""
Build M365 folder blueprint v4 — SSOT 3-axis architecture.

v4 (2026-05-16 evening) — MAJOR REDESIGN after SSOT violation in v3.1:

Previous versions (v1-v3.1) organized by Department × Workflow Scenario,
which is how ISO clauses are structured — but NOT how a CNC manufacturing
shop actually operates. The result was severe SSOT violations:
  - Cal cert of one gage existed in 3 paths (DEP-METRO, DEP-QA, Part-REV)
  - NCR-2026-0043 existed in 2 paths (DEP-QA scenario, Job-Dossier gate)
  - Customer LTA existed in 3 paths (DEP-SCS, DEP-LEGAL, Engineering-IP)
  - Operators had no single canonical path for "their Job"

v4 adopts the **3-axis SSOT model** matching real CNC manufacturing ops:

  TRANSACTIONAL EVIDENCE (90% of files) lives in HESEM-Job-Evidence:
    - JOB axis   = Job-Dossiers per WO + PartRev (every Job = full chain)
    - PART axis  = Part-REV-Master per Customer + PartNo + Rev (baseline)
    - ASSET axis = Asset-Master per Gage/Fixture/Tool/Machine (lifecycle)
    + ACCOUNT axis = Customer-Account + Supplier-Account + PO-Index
                     (relationships, contracts, scorecards)

  REFERENCE (SOPs, governance, compliance, training) lives in HESEM-Records:
    - QMS-Master, Compliance-Master, Training-Master
    - Department-Reference (SOPs + dept KPI ONLY — NOT transactional)
    - Customer-Reference (their controlled specs)
    - Industry-Standards (SEMI/AMS/ASTM/ISO refs)
    - Workflow-Lists roots (SharePoint Lists, not folders)

Dropped in v4:
  - Department-Ops/DEP-XXX/02-Operations scenario subfolders (duplicated)
  - HESEM-Engineering-IP site (merged into Part-REV-Master per-part)
  - HESEM-People-Competency site (merged into Records/Training-Master)
  - HESEM-ESG-Compliance site (merged into Records/Compliance-Master)
  - Per-dept "00-Live-Control / 06-Working-Transitory / 07-Reference" zones
    (replaced by central Workflow-Lists + Records/Department-Reference)

Sites in v4: 5
  1. HESEM-Job-Evidence  — transactional 3-axis SSOT (PRIMARY)
  2. HESEM-Records       — governance + reference + SOPs
  3. HESEM-People        — PII only (employee dossier)
  4. HESEM-Digital       — IT/OT system records
  5. HESEM-Archive       — closed/superseded/legal-hold

Reference master matrix: ANNEX-144 (v4 SSOT) supersedes ANNEX-143.
"""

from __future__ import annotations
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).parent / "blueprint"
YYYY = "{YYYY}"
YYYY_MM = "{YYYY-MM}"
YYYY_Q = "{YYYY-Q}"


def mkpath(p: Path) -> None:
    """Create dir + .gitkeep marker."""
    p.mkdir(parents=True, exist_ok=True)
    keep = p / ".gitkeep"
    if not keep.exists():
        keep.touch()


# ============================================================================
# 16 Departments (used in Department-Reference only — SOPs/KPI, not evidence)
# ============================================================================
DEPARTMENTS = [
    "DEP-EXEC",   # Executive + BOD
    "DEP-QMS",    # QMS + DCC
    "DEP-QA",     # Quality
    "DEP-METRO",  # Metrology + Calibration
    "DEP-ENG",    # Engineering + NPI + CAM
    "DEP-PRO",    # Production
    "DEP-SP",     # Special Process (Anodize/EP/Clean/Outgas/He-leak)
    "DEP-MNT",    # Maintenance + Facility
    "DEP-SCM",    # Supply Chain (Procurement + Warehouse + Logistics)
    "DEP-SCS",    # Sales + Customer Service
    "DEP-FIN",    # Finance + Tax + Treasury
    "DEP-HR",     # HR + Training
    "DEP-EHS",    # EHS + ESG
    "DEP-IT",     # IT + OT + Cyber
    "DEP-ERP",    # ERP/App Admin
    "DEP-LEGAL",  # Legal + Corp Secretary + IP
]

# 4 OEM customers (semi-equipment market)
OEMS = ["AMAT", "LAM", "ASML", "TEL"]

# Cert families for critical certs
CERT_FAMILIES = [
    "CNC-Operator", "Special-Process-Operator", "CMM-Operator",
    "Lead-Auditor", "FAI-Engineer", "ESD-Coordinator",
    "FOD-Trainer", "Forklift-Operator", "First-Aider", "Fire-Warden",
]

# Industry standards bodies
STANDARDS_BODIES = ["SEMI", "AMS", "ASTM", "ISO-AS", "IEST", "NADCAP", "RBA"]


def build_blueprint() -> None:
    """Wipe blueprint folder and rebuild v4 from scratch."""

    # Preserve top-level user docs
    preserved = {}
    if ROOT.exists():
        for f in ROOT.iterdir():
            if f.is_file() and f.name not in {".gitkeep", "_TREE.txt"}:
                preserved[f.name] = f.read_bytes()
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)
    for name, data in preserved.items():
        (ROOT / name).write_bytes(data)

    # =========================================================================
    # SITE 1 — HESEM-Job-Evidence (PRIMARY transactional SSOT, 5 axes)
    # =========================================================================
    s1 = ROOT / "HESEM-Job-Evidence"

    # --- AXIS 1: PART (engineering baseline per Customer+PartNo+Rev) ---------
    prm = s1 / "Part-REV-Master"
    prm_template = prm / "{CustomerID}" / "{PartNo}" / "REV-{Rev}"
    for sub in [
        "00-Index-and-Status",
        "01-Engineering-Baseline-Customer-Source",  # customer drawing, MBD
        "02-CAM-Master-Source",                      # canonical NC, post, tool list
        "03-Inspection-Master",                       # CMM .prg, balloon, control plan
        "04-Approved-Material-and-Source",            # mill spec, ASL
        "05-Special-Process-Spec-per-Customer",       # AMS + customer-specific
        "06-FAI-Baseline-Pack",                       # last released FAI ref
        "07-PCN-History-for-this-Rev",
        "08-Customer-Standards-Linked",
        "09-Trade-Secret-Process-Notes-Restricted",   # recipe / know-how
        "99-Superseded-by-NewRev",
    ]:
        mkpath(prm_template / sub)

    # --- AXIS 2: JOB (every Work Order = full evidence chain in one folder) ---
    jd = s1 / "Job-Dossiers" / YYYY / "{JobNum}-{PartNo}-REV-{Rev}"
    for gate in [
        "00-Job-Admin",                          # PO ref, traveler, schedule
        "01-G0-Contract-Kickoff",
        "02-G1-Engineering-Release",
        "03-G2-IQC-Receiving",
        "04-G3-Setup-Release",
        "05-G4-FAI-First-Article",
        "06-G5-IPQC-Production",
        "07-G6-Final-QC-and-Pack",
        "08-G7-Ship-Release",
        "09-NCR-CAPA-Deviation-for-this-Job",   # NCR canonical per job
        "10-Special-Process-Records-for-this-Job",
        "11-Customer-Touchpoints-for-this-Job",  # PCN-ack, complaint, witness
        "12-Subcon-Routing-if-Outsourced",
        "13-Cost-Actual-Roll-Up-Finance",
        "99-Archive-Locked",
    ]:
        mkpath(jd / gate)

    # --- AXIS 3: ASSET (per Tool / Fixture / Gage / Machine) ------------------
    asset = s1 / "Asset-Master"

    # Tools (cutting tools, perishable)
    tool_base = asset / "Tools" / "{ToolID}"
    for sub in ["01-Master-Spec", "02-Preset-Data", "03-Life-History", "99-Scrapped"]:
        mkpath(tool_base / sub)

    # Fixtures
    fix_base = asset / "Fixtures" / "{FixtureID}"
    for sub in [
        "01-Design-Pack",
        "02-Validation-Proveout",
        "03-Usage-Log",
        "04-Maintenance-Repair",
        "05-Annual-Cert",
        "99-Retired",
    ]:
        mkpath(fix_base / sub)

    # Gages (calibration certificates SINGLE CANONICAL HOME)
    gage_base = asset / "Gages" / "{GageID}"
    for sub in [
        "01-Specification",
        "03-MSA-GR-R-Studies",
        "04-Daily-Check-Log",
        "05-OOT-Investigation",
        "99-Retired",
    ]:
        mkpath(gage_base / sub)
    mkpath(gage_base / "02-Calibration-Certificates" / YYYY)  # year-partitioned

    # Machines (CNC mill/turn/EDM, CMM, anodize line, He-leak detector, etc.)
    mach_base = asset / "Machines" / "{MachineID}"
    for sub in [
        "01-Asset-Profile",
        "03-Firmware-Update-History",
        "06-Breakdown-RCA",
        "08-Spindle-Rebuild-Capex",
        "09-CNC-PLC-Param-Backup",
        "99-Decommissioned",
    ]:
        mkpath(mach_base / sub)
    for sub in [
        "02-Geom-Verification",
        "04-PM-Records",
        "05-PdM-Vibration-Spindle",
        "07-Customer-Cap-Cert-per-OEM",
    ]:
        mkpath(mach_base / sub / YYYY)

    # --- AXIS 4: ACCOUNT (Customer + Supplier + PO-Index) ---------------------

    # PO-Index — per Customer × Year × PO number (Sales/Finance entry)
    po = s1 / "PO-Index" / "{CustomerID}" / YYYY / "PO-{CustPO}"
    for sub in [
        "00-PO-Source-Pulled-from-Portal",
        "01-Contract-Review-Pack-Internal",
        "02-Order-Acknowledgement-Sent",
        "03-Quote-Trace-RFQ-to-Quote",
        "04-Linked-Jobs",                        # list of Jobs spawned by this PO
        "05-LTA-Cross-Reference",
        "06-PCN-Inbound-Affecting-this-PO",
        "07-Complaint-Outbound-on-this-PO",
        "08-Invoice-Trace-Finance-Link",
        "99-PO-Closed-with-Invoice-Paid",
    ]:
        mkpath(po / sub)

    # Customer-Account — per Customer (relationship master)
    ca = s1 / "Customer-Account" / "{CustomerID}"
    for sub in [
        "01-Account-Profile",
        "02-NDA-MSA-LTA-Contracts-Executed",
        "03-Quality-Agreement",
        "04-Customer-Approved-Suppliers-Flowdown",  # their APSL flowed to HESEM
        "07-Customer-Standards-Library",
        "08-Customer-Portal-Access-Refs",            # NOT secrets — refs only
        "10-Customer-Complaint-Master-Log",
        "11-Customer-PCN-Inbound-Master-Log",
        "12-HESEM-PCN-Outbound-Master-Log",
        "99-Account-Inactive",
    ]:
        mkpath(ca / sub)
    for sub in [
        "05-Annual-Scorecard",
        "06-Customer-Audit",
        "09-Demand-Forecast",
    ]:
        mkpath(ca / sub / YYYY)

    # Supplier-Account — per Supplier (relationship master)
    sa = s1 / "Supplier-Account" / "{SupplierID}"
    for sub in [
        "01-Qualification-SAQ-Financial",
        "02-NDA-SQA-Executed",
        "03-APSL-Scope-per-OEM",                # per-customer × per-process approval
        "05-Annual-Scorecard",
        "06-Process-Cert-Letters-per-OEM",
        "07-Sub-PO-History",
        "09-Supplier-SCAR-Master-Log",
        "10-Banned-Substance-Decl-Annual",
        "99-Disqualified",
    ]:
        mkpath(sa / sub)
    for sub in [
        "04-Annual-Audit",
        "08-CMRT-EMRT-Responses",
    ]:
        mkpath(sa / sub / YYYY)

    # Sample seed for AMAT-LAM-ASML-TEL Customer-Account (template instance)
    for oem in OEMS:
        for sub in [
            "01-Account-Profile",
            "02-NDA-MSA-LTA-Contracts-Executed",
            "03-Quality-Agreement",
            "07-Customer-Standards-Library",
        ]:
            mkpath(s1 / "Customer-Account" / oem / sub)

    # =========================================================================
    # SITE 2 — HESEM-Records (Governance + Reference + SOPs, NO evidence)
    # =========================================================================
    s2 = ROOT / "HESEM-Records"

    # --- QMS-Master (company-level QMS governance) ----------------------------
    qms = s2 / "QMS-Master"
    mkpath(qms / "01-Quality-Policy-and-Manual")
    mkpath(qms / "05-DCC-Master-Register")
    mkpath(qms / "06-Authority-RACI-Matrix")
    mkpath(qms / "07-Org-Chart-and-Position-Register")
    mkpath(qms / "08-Risk-Register-Master")
    mkpath(qms / "09-Improvement-Kaizen-Master")
    mkpath(qms / "10-Change-Control-Master-ECO-PCN-Queue")
    for sub in [
        "02-Management-Review",
        "03-Internal-Audit-Program",
        "04-External-Cert-Audits",
    ]:
        mkpath(qms / sub / YYYY)

    # --- Compliance-Master (periodic + adhoc compliance) ----------------------
    cm = s2 / "Compliance-Master"
    mkpath(cm / "01-Export-Classification-Registry")
    mkpath(cm / "04-UFLPA-Supply-Chain-Map")
    mkpath(cm / "05-Banned-Substance-Library")
    mkpath(cm / "06-REACH-RoHS-Decl-per-Part")
    mkpath(cm / "07-ASML-HIO-Compliance")
    mkpath(cm / "13-Trade-Secret-Register-Restricted")
    for sub in [
        "02-Conflict-Minerals-CMRT",
        "03-EMRT-Cobalt",
        "08-RBA-SAQ-VAP",
        "09-Modern-Slavery-Statement",
        "10-ESG-Carbon-Scope-1-2-3",
        "11-CDP-EcoVadis-Submissions",
    ]:
        mkpath(cm / sub / YYYY)
    for oem in OEMS:
        mkpath(cm / "12-Customer-CoC-Signed" / oem)
    mkpath(cm / "14-IP-Patent-Filings" / "{CaseID}")
    mkpath(cm / "14-IP-Trademark-Filings" / "{CaseID}")

    # --- Training-Master (company training SSOT) ------------------------------
    tm = s2 / "Training-Master"
    mkpath(tm / "01-Course-Catalog")
    mkpath(tm / "02-Course-Material" / "{CourseCode}")
    mkpath(tm / "04-Skills-Taxonomy")
    mkpath(tm / "05-Required-Skill-Matrix-per-Role")
    mkpath(tm / "07-Cert-Master-Register-per-Employee")
    for sub in [
        "03-Annual-Training-Plan",
        "06-Actual-Competency-Snapshot",
        "11-Training-Effectiveness-KPI",
    ]:
        mkpath(tm / sub / YYYY)
    for oem in OEMS:
        mkpath(tm / "08-Customer-Approved-Operator-List" / oem)
        mkpath(tm / "09-Customer-Audit-People-Pack" / oem / YYYY)
    for cert in CERT_FAMILIES:
        mkpath(tm / "10-Critical-Cert-Library" / cert)

    # --- Department-Reference (SOPs + dept governance ONLY — NOT evidence) ----
    dr = s2 / "Department-Reference"
    for dept in DEPARTMENTS:
        dept_base = dr / dept
        mkpath(dept_base / "01-SOPs-and-Work-Instructions")
        mkpath(dept_base / "02-Forms-Templates")
        mkpath(dept_base / "05-Dept-Risk-Register")
        mkpath(dept_base / "07-Dept-Org-Chart-and-Roles")
        mkpath(dept_base / "08-Reference-Material-Internal")
        for sub in [
            "03-Department-KPI",
            "04-MR-Inputs-per-Dept",
            "06-Internal-Audit-Findings-against-Dept",
        ]:
            mkpath(dept_base / sub / YYYY)

    # --- Customer-Reference (per OEM controlled specs + bulletins) ------------
    crf = s2 / "Customer-Reference"
    for oem in OEMS:
        mkpath(crf / oem / "01-Quality-Manuals-Controlled-Copy")
        mkpath(crf / oem / "02-Spec-Library-Mirror")
        mkpath(crf / oem / "03-Approved-Supplier-Notices")
        mkpath(crf / oem / "04-Bulletins-and-Updates" / YYYY)

    # --- Industry-Standards (single source for SEMI/AMS/ASTM/etc.) ------------
    ind = s2 / "Industry-Standards"
    for body in STANDARDS_BODIES:
        mkpath(ind / body)

    # --- Workflow-Lists roots (SharePoint Lists, not folders — staging area) --
    wl = s2 / "Workflow-Lists"
    for lst in [
        "NCR-Master-List",                  # links to Job-Dossiers/.../09-NCR
        "CAPA-Master-List",                 # links to NCR + audit findings + complaint
        "8D-SCAR-Master-List",              # customer complaint chain
        "ECO-Master-List",                  # engineering change order queue
        "PCN-Master-List",                  # process change notice queue
        "Customer-Audit-Master-List",       # audit cycle per customer
        "Internal-Audit-Master-List",
        "Customer-Portal-Evidence-Log",     # Ariba/Coupa pull+push receipts
        "Action-Tracker-Master",
        "Calibration-Due-List",             # links to Asset-Master/Gages/.../02-Cal
        "PM-Schedule-Master",               # links to Asset-Master/Machines/.../04-PM
        "Cert-Expiry-Watch-90d",            # links to Training-Master/07-Cert
        "Open-Concession-Deviation-Log",
    ]:
        mkpath(wl / lst)

    # =========================================================================
    # SITE 3 — HESEM-People (PII ONLY — employee dossier)
    # =========================================================================
    s3 = ROOT / "HESEM-People"
    er = s3 / "Employee-Records"

    EMP_SUBS = [
        "00-Identity-and-Employment-Profile",
        "01-Recruitment-and-Offer",
        "02-Employment-Contract-and-Legal",
        "03-Onboarding-Role-and-Access",
        "04-Training-and-Certification-Link-to-Training-Master",
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

    # Active
    for sub in EMP_SUBS:
        mkpath(er / "01-Active-Employees" / "{EmployeeID}-{FullName}" / sub)
    # Pending
    mkpath(er / "02-Pending-Starters" / YYYY / "{Population}" / "{CandidateID}-{Name}")
    # Former (same 14-sub schema)
    for sub in EMP_SUBS:
        mkpath(er / "03-Former-Employees" / YYYY / "{EmployeeID}-{FullName}" / sub)
    # Contractors / Visitors
    mkpath(er / "04-Contractors-Interns-Temps" / YYYY / "{Population}" / "{ID-Name}")
    mkpath(er / "05-Visitors-and-Vendors" / YYYY / "{VisitType}" / "{VisitorName}")
    # Restricted shared ops
    mkpath(er / "06-Restricted-Shared-Ops" / "{RestrictedProcess}" / "00-Current")

    # =========================================================================
    # SITE 4 — HESEM-Digital (IT/OT system records)
    # =========================================================================
    s4 = ROOT / "HESEM-Digital"

    # System-Records (IT admin evidence)
    sr = s4 / "System-Records"
    for area in [
        "01-Access-and-Identity-IAM-Entra-PIM",
        "02-M365-Purview-Config-and-Label-Policy",
        "03-Conditional-Access-DLP-Policy",
        "04-Sentinel-SOC-Incident",
        "05-Backup-Restore-Cycle",
        "06-Vulnerability-Patch-Cycle",
        "07-Asset-Endpoint-CMDB",
        "08-Disaster-Recovery-BCP-Drill",
        "09-Automation-RPA-Run-Logs",
        "10-Vendor-Security-Questionnaire",
        "11-Network-Diagram-Purdue-Segmentation",
    ]:
        mkpath(sr / area / "00-Current")
        mkpath(sr / area / YYYY)

    # QMS-Source-Control (Git ↔ SharePoint ↔ VPS sync)
    qsc = s4 / "QMS-Source-Control"
    for p in ["mom", "mom/docs/system", "mom/docs/operations", "mom/docs/forms",
              "mom/docs/training", "mom/docs/glossary", "assets", "core-standards", "tools"]:
        mkpath(qsc / "01-Controlled-Source" / "eqms.hesemeng.com" / p)
    mkpath(qsc / "02-Release-Manifests" / YYYY)
    mkpath(qsc / "03-Server-Deploy-Receipts" / YYYY)
    mkpath(qsc / "04-Reverse-Sync-Intake" / YYYY)

    # OT-Vault (CNC controller backup, post-processor, kinematic — air-gap)
    ot = s4 / "OT-Vault"
    mkpath(ot / "01-CNC-Controller-Param-Backup" / "{MachineID}" / YYYY)
    mkpath(ot / "02-PLC-Ladder-Backup" / "{MachineID}" / YYYY)
    mkpath(ot / "03-CMM-Calypso-PCDMIS-Backup" / "{CMMID}")
    mkpath(ot / "04-Post-Processor-Library")
    mkpath(ot / "05-Machine-Kinematic-XML")
    mkpath(ot / "06-DNC-Server-Config")
    mkpath(ot / "07-CAD-CAM-License-Server-Backup" / YYYY)
    mkpath(ot / "08-OT-Incident-Playbook")
    mkpath(ot / "09-OT-Air-Gap-Workstation-Config")
    mkpath(ot / "99-OT-Archive" / YYYY)

    # =========================================================================
    # SITE 5 — HESEM-Archive (closed / superseded / legal-hold / locked-job)
    # =========================================================================
    s5 = ROOT / "HESEM-Archive"
    mkpath(s5 / "01-Closed-Year-Archive" / YYYY)
    mkpath(s5 / "02-Superseded-Documents")
    mkpath(s5 / "03-Legal-Hold-Litigation")
    mkpath(s5 / "04-Locked-Job-Pack-Final" / YYYY)
    mkpath(s5 / "05-Disposition-Log" / YYYY)        # what destroyed when by whom
    mkpath(s5 / "06-Records-Retention-Schedule")

    # =========================================================================
    # CROSS-SITE — Working Templates (form templates, not records)
    # =========================================================================
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
    (Path(__file__).parent / "blueprint" / "_TREE.txt").write_text(
        "\n".join(tree) + "\n", encoding="utf-8"
    )
    print("Wrote _TREE.txt manifest for audit.")

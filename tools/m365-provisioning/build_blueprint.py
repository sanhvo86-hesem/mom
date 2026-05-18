#!/usr/bin/env python3
"""
Build M365 folder blueprint v7 — Unified Workspace with CustomerCode-keyed folders.

v7 (2026-05-18) — Redesign after user feedback on v6:
  User: "không cần HESEM-LAM, HESEM-ASML... tất cả quản lý bên trong mã khách hàng"

Industry standard for international contract CNC manufacturers (Moog Aerospace,
Heico, Onto Innovation, Tier-1 CNC suppliers):
  - ONE workspace site (not 4 customer-OEM sites)
  - Customers/{CustomerCode}/ as the top-level keyed folder
  - Permission via folder inheritance + SG-Cust-{Code} groups
  - Information Barriers at folder level (sufficient for typical contract CM)
  - Adding new customer = create folder (not new site)

3 sites total in v7:
  1. HESEM-Workspace — main transactional (Customers, Suppliers, Assets,
                       Parts-HESEM-Owned, Lot-Trace, Quality, Compliance, Training, Reports)
  2. HESEM-Internal  — HR (PII), IT, OT (air-gapped), Legal, Executive
  3. HESEM-Archive   — long-term retention, legal hold, locked-job-pack

MOM remains SSOT for controlled docs (Manual, Policy, SOP, WI, RACI, ANNEX,
Training curriculum, JDs, Form templates). M365 stores transactional evidence only.

Per-customer folder structure (industry vocabulary):
  Customers/{CustomerCode}/
    01-Account/{Contracts, Quality-Agreement, Standards, Audits, Scorecards,
               Bulletins, PCN-Inbound, PCN-Outbound, Complaints, ESG-Surveys,
               Portal-Refs, Demand-Forecast}
    02-Parts/{PartNo}/{Rev}/{Drawings, BOM, CAM, Inspection, Specification,
                              FAI, ECN, Trade-Secret, Archive}
    03-POs/{YYYY}/PO-{Num}/{Source, Review, Acknowledgement, Linked-Jobs,
                             PCN-Inbound, Complaint, Invoices, Closed}
    04-Jobs/{YYYY}/{JobNum}/{00-Job-Admin, Planning, Purchasing, Manufacturing,
                              Quality/{NCR,CAPA,MRB,FAI-Execution},
                              Special-Process, Customer, Shipping/Cleanliness-Pack-6,
                              Reports, Archive}
    05-Multi-Job-Evidence/{CAPA-Cross-Job, 8D-Field-Failure, Banned-Substance,
                            Audit-Cross-Job, Complaint-Umbrella}
    99-Archive/

Reference: ANNEX-147 (v7 Unified Workspace + CustomerCode-keyed architecture).
"""

from __future__ import annotations
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).parent / "blueprint"
YYYY = "{YYYY}"


def mkpath(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)
    keep = p / ".gitkeep"
    if not keep.exists():
        keep.touch()


def mk_readme(p: Path, content: str) -> None:
    p.mkdir(parents=True, exist_ok=True)
    (p / "_README.md").write_text(content, encoding="utf-8")


# Sample customer codes for seeding (real customers in HESEM)
OEMS = ["AMAT", "LAM", "ASML", "TEL"]

CERT_FAMILIES = [
    "CNC-Operator", "Special-Process", "CMM-Operator",
    "Lead-Auditor", "FAI-Engineer", "ESD-Coordinator",
    "FOD-Trainer", "Forklift", "First-Aider", "Fire-Warden",
]


def build_customer_folder(cust_root: Path, code: str) -> None:
    """Build per-customer folder structure under Customers/{CustomerCode}/."""
    base = cust_root / code

    # 01-Account (relationship-level)
    acct = base / "01-Account"
    for sub in [
        "Contracts",            # NDA, MSA, LTA
        "Quality-Agreement",
        "Standards",            # customer-controlled spec mirror
        "Portal-Refs",          # Ariba/Coupa/myASML/TPS account ref
        "Approved-Suppliers",   # customer's APSL flowed to HESEM
        "Complaints",           # master complaint log
        "PCN-Inbound",          # master inbound PCN log
        "PCN-Outbound",         # master outbound PCN log
        "ESG-Surveys",
    ]:
        mkpath(acct / sub)
    for sub in ["Audits", "Scorecards", "Bulletins", "Demand-Forecast"]:
        mkpath(acct / sub / YYYY)

    # 02-Parts (engineering baseline per Part/Rev)
    parts_tmpl = base / "02-Parts" / "_TEMPLATES" / "{PartNo}" / "{Rev}"
    for sub in [
        "00-Index",
        "Drawings",
        "BOM",
        "CAM",
        "Inspection",
        "Specification",
        "FAI",
        "ECN",
        "Trade-Secret",
        "Archive",
    ]:
        mkpath(parts_tmpl / sub)

    # 03-POs (customer purchase orders)
    po_tmpl = base / "03-POs" / "_TEMPLATES" / YYYY / "PO-{Num}"
    for sub in [
        "Source",
        "Review",
        "Acknowledgement",
        "Linked-Jobs",
        "PCN-Inbound",
        "Complaint",
        "Invoices",
        "Closed",
    ]:
        mkpath(po_tmpl / sub)

    # 04-Jobs (work orders)
    job_tmpl = base / "04-Jobs" / "_TEMPLATES" / YYYY / "{JobNum}"
    for sub in [
        "00-Job-Admin",
        "Planning",
        "Purchasing",
        "Manufacturing",
        "Special-Process",
        "Customer",
        "Reports",
        "Archive",
    ]:
        mkpath(job_tmpl / sub)
    # Quality sub-structure
    q = job_tmpl / "Quality"
    for sub in ["NCR", "CAPA", "MRB", "FAI-Execution"]:
        mkpath(q / sub)
    mkpath(q / "NCR" / "_Intake")
    # Shipping + Pack-6
    ship = job_tmpl / "Shipping"
    pack6 = ship / "Cleanliness-Pack-6"
    for elem in [
        "00-Banned-Substance",
        "01-LPC",
        "02-IC",
        "03-NVR",
        "04-FTIR",
        "05-Ra",
        "06-Visual",
        "07-He-Leak-or-Outgas",
    ]:
        mkpath(pack6 / elem)
    mkpath(ship / "CoC-Packing-Customs-ASN")

    # 05-Multi-Job-Evidence (cross-Job for THIS customer)
    mje = base / "05-Multi-Job-Evidence"
    for cat in [
        "CAPA-Cross-Job",
        "8D-Field-Failure",
        "Banned-Substance",
        "Audit-Cross-Job",
        "Complaint-Umbrella",
    ]:
        mkpath(mje / cat / "_TEMPLATES" / "{ID}")

    # 99-Archive
    mkpath(base / "99-Archive" / "Closed-Jobs" / YYYY)
    mkpath(base / "99-Archive" / "Retired-Parts")


def build_workspace(s: Path) -> None:
    """HESEM-Workspace: main transactional site, CustomerCode-keyed."""

    mk_readme(s, """# HESEM-Workspace — Unified main transactional site

All customer-related transactional evidence + cross-customer shared internal data.
Industry-standard model for international contract CNC manufacturer.

## Top-level structure
- **Customers/{CustomerCode}/** — Per-customer workspace (Account, Parts, POs, Jobs, Multi-Job-Evidence)
- **Suppliers/{SupplierCode}/** — Per-supplier accounts (qualification, APSL, audit, CMRT)
- **Assets/** — Machines, Gages (cal cert canonical), Tools, Fixtures
- **Parts-HESEM-Owned/{PartNo}/{Rev}/** — Commodity parts (HESEM-owned drawings)
- **Lot-Trace/** — Heat-lot → process-lot → finished-lot chain
- **Quality/** — Internal-Audit, Management-Review, Risk, FOD, Counterfeit (cross-customer)
- **Compliance/** — CMRT, UFLPA, ESG, REACH, Banned-Sub, Trade-Secret-Index, IP
- **Training/** — Cert-Master, Skills-Matrix, Customer-Approved-Operators
- **Reports/** — Company-wide reporting

## Permission model
- Default site permission: all HESEM employees (Read)
- Customers/{Code}/ → SG-Cust-{Code}-Members (Edit per role) + IB at folder level
- Suppliers/ → SG-DEP-SCM + SG-QA-SQE
- Assets/Gages/ → SG-DEP-METRO (write), all others (read)
- HR-Training-related → SG-HR-Training-Coord (write)
- Compliance roll-ups → SG-DEP-EHS-ESG (write)

## SSOT rule
MOM is SSOT for: Manual/Policy/SOP/WI/RACI/ANNEX/Training curriculum/JDs/Form templates.
M365 stores transactional evidence ONLY. Cross-link MOM URL when needed (no copy).

## Adding a new customer
Just create folder `Customers/{NewCode}/` and run provisioning script (no new site).
Permission group `SG-Cust-{NewCode}-Members` provisioned by IAM workflow.
""")

    # --- Customers/ (CustomerCode-keyed) -------------------------------------
    cust_root = s / "Customers"
    mk_readme(cust_root, """# Customers/ — CustomerCode-keyed per-customer workspace

Each customer has its own folder under Customers/{CustomerCode}/. Permission
inherits SG-Cust-{Code}-Members. Information Barrier at folder level isolates
AMAT/LAM/ASML/TEL data.

Standard structure per customer:
- 01-Account/ — Contracts, Standards, Audits, Scorecards, Complaints, PCN
- 02-Parts/{PartNo}/{Rev}/ — Drawings, BOM, CAM, Inspection, FAI, ECN, Trade-Secret
- 03-POs/{YYYY}/PO-{Num}/ — Source, Review, Acknowledgement, Linked-Jobs, Invoices
- 04-Jobs/{YYYY}/{JobNum}/ — Planning, Purchasing, Manufacturing, Quality, Shipping
- 05-Multi-Job-Evidence/ — cross-Job CAPA, 8D, Banned-Substance, Audit, Complaint
- 99-Archive/ — Closed Jobs, Retired Parts
""")
    # Seed real customer folders
    for code in OEMS:
        build_customer_folder(cust_root, code)
    # Template (showing structure for adding new customer)
    build_customer_folder(cust_root, "_TEMPLATE-NewCustomer")

    # --- Suppliers/ ---------------------------------------------------------
    sup_tmpl = s / "Suppliers" / "_TEMPLATES" / "{SupplierCode}"
    for sub in [
        "Qualification",
        "NDA-SQA",
        "APSL-per-OEM",
        "Process-Cert-Letters",
        "Sub-PO-History",
        "Scorecards",
        "SCAR-Log",
        "Banned-Substance",
        "Sub-Tier-Change-Notification",
        "Disqualified",
    ]:
        mkpath(sup_tmpl / sub)
    for sub in ["Audits", "CMRT-EMRT"]:
        mkpath(sup_tmpl / sub / YYYY)

    # --- Assets/ ------------------------------------------------------------
    assets = s / "Assets"
    # Machines
    mach_tmpl = assets / "Machines" / "_TEMPLATES" / "{MachineID}"
    for sub in [
        "Profile",
        "Firmware",
        "Breakdown",
        "Spindle-Rebuild",
        "Backup-CNC-PLC",
        "Equipment-Used-Log",
        "Decommissioned",
    ]:
        mkpath(mach_tmpl / sub)
    for sub in ["Geometry", "PM", "PdM", "Customer-Cap-Cert"]:
        mkpath(mach_tmpl / sub / YYYY)
    # Gages (cal cert canonical)
    gage_tmpl = assets / "Gages" / "_TEMPLATES" / "{GageID}"
    for sub in ["Specification", "MSA", "Daily-Check", "OOT-Investigation", "Retired"]:
        mkpath(gage_tmpl / sub)
    mkpath(gage_tmpl / "Calibration" / YYYY)
    mkpath(gage_tmpl / "Calibration" / YYYY / "_Lab-Methodology-NDA")
    mkpath(gage_tmpl / "MSA" / "_per-Customer" / "{CustomerCode}")
    # Tools
    tool_tmpl = assets / "Tools" / "_TEMPLATES" / "{ToolID}"
    for sub in ["Master-Spec", "Preset", "Life-History", "OOT-Investigation", "Scrapped"]:
        mkpath(tool_tmpl / sub)
    # Fixtures
    fix_tmpl = assets / "Fixtures" / "_TEMPLATES" / "{FixtureID}"
    for sub in ["Design", "Validation", "Usage-Log", "Maintenance", "Annual-Cert", "Retired"]:
        mkpath(fix_tmpl / sub)

    # --- Parts-HESEM-Owned/ (commodity parts shared across OEMs) ------------
    hop_tmpl = s / "Parts-HESEM-Owned" / "_TEMPLATES" / "{PartNo}" / "{Rev}"
    for sub in [
        "00-Index",
        "Drawings",
        "BOM",
        "CAM",
        "Inspection",
        "Specification",
        "FAI",
        "ECN",
        "Cross-OEM-Usage",       # which OEMs use this HESEM part
        "Trade-Secret",
        "Archive",
    ]:
        mkpath(hop_tmpl / sub)

    # --- Lot-Trace/ ---------------------------------------------------------
    lot = s / "Lot-Trace"
    for tier in ["Heat-Lots", "Process-Lots", "Finished-Lots"]:
        mkpath(lot / tier / "_TEMPLATES" / "{LotID}")

    # --- Quality/ (cross-customer internal) ---------------------------------
    q = s / "Quality"
    for sub in [
        "Risk-Register",
        "Improvement-Kaizen",
        "FOD-Program",
        "Counterfeit-Prevention",
    ]:
        mkpath(q / sub)
    mkpath(q / "Internal-Audits" / YYYY)
    mkpath(q / "Management-Review" / YYYY)

    # --- Compliance/ (cross-customer) ---------------------------------------
    cm = s / "Compliance"
    for sub in [
        "Export-Classification",
        "UFLPA-Map",
        "Banned-Substance-Library",
        "REACH-RoHS-per-Part",
        "ASML-HIO",
        "Trade-Secret-Master-Index",
        "IP-Patent-Trademark",
    ]:
        mkpath(cm / sub)
    for sub in [
        "CMRT",
        "EMRT-Cobalt",
        "RBA-SAQ-VAP",
        "Modern-Slavery",
        "Carbon-Scope-1-2-3",
        "CDP-EcoVadis",
    ]:
        mkpath(cm / sub / YYYY)
    for code in OEMS:
        mkpath(cm / "Customer-CoC-Signed" / code)

    # --- Training/ (cert master, customer-approved operator lists) ----------
    t = s / "Training"
    for sub in ["Skills-Matrix", "Cert-Master-Register"]:
        mkpath(t / sub)
    for sub in ["Annual-Plan", "Competency-Snapshot", "Effectiveness-KPI"]:
        mkpath(t / sub / YYYY)
    for code in OEMS:
        mkpath(t / "Customer-Approved-Operators" / code)
        mkpath(t / "Customer-Audit-Pack" / code / YYYY)
    for cert in CERT_FAMILIES:
        mkpath(t / "Critical-Certs" / cert)

    # --- Reports/ -----------------------------------------------------------
    for period in ["Daily", "Weekly", "Monthly", "Quarterly", "Annual"]:
        mkpath(s / "Reports" / period)


def build_internal(s: Path) -> None:
    """HESEM-Internal: PII, IT, OT, Legal, Executive (strict permission)."""

    mk_readme(s, """# HESEM-Internal — Strict-permission internal data

5 libraries, each with named-only access:
- **HR/** — Employee dossiers (PII). SG-HR-Custodians only; medical/payroll SG-named-only.
- **IT/** — System records (Access, M365, DLP, SOC, Backup). SG-IT-Admin only.
- **OT/** — CNC/PLC/CMM backup, post-processor, kinematic. SG-OT + IT-SOC, AIR-GAPPED.
- **Legal/** — Contracts (non-customer), Insurance, Litigation, IP. SG-Legal-Custodians only.
- **Executive/** — BOD pack, Strategy, ERM. SG-BOD + Exec only, encryption + expiry.

SSOT note: HR/IT/OT/Legal/Executive policies live in MOM, not here. M365 stores
only operational evidence (access logs, incident records, backup receipts, etc.).
""")

    # --- HR/ ----------------------------------------------------------------
    hr = s / "HR"
    EMP_SUBS = [
        "00-Identity",
        "01-Recruitment-Offer",
        "02-Contract-Legal",
        "03-Onboarding-Access",
        "04-Training-Cert-Link",
        "05-Performance",
        "06-Payroll-Restricted",
        "07-Leave-Attendance",
        "08-Medical-Restricted",
        "09-Assets-Issued",
        "10-Transfer-Promotion",
        "11-Disciplinary-Restricted",
        "12-Offboarding",
        "13-Legal-Hold",
    ]
    emp_tmpl = hr / "Employees" / "_TEMPLATES" / "{EmployeeID}-{Name}"
    for sub in EMP_SUBS:
        mkpath(emp_tmpl / sub)
    mkpath(hr / "Recruitment-Pipeline")
    mkpath(hr / "Working-Hours" / YYYY)
    mkpath(hr / "RBA-Worker-Voice" / YYYY)

    # --- IT/ ----------------------------------------------------------------
    it = s / "IT"
    for area in [
        "Access-Identity-IAM",
        "M365-Purview-Config",
        "DLP-Policy",
        "SOC-Sentinel-Incident",
        "Backup-Restore",
        "Vulnerability-Patch",
        "CMDB-Endpoint",
        "DR-BCP-Drill",
        "RPA-Run-Logs",
        "Vendor-Security",
        "Network-Diagram",
        "Audit-Guest-Access",
    ]:
        mkpath(it / area / "Current")
        mkpath(it / area / YYYY)

    # --- OT/ (air-gapped) ---------------------------------------------------
    ot = s / "OT"
    mkpath(ot / "CNC-Param-Backup" / "_TEMPLATES" / "{MachineID}" / YYYY)
    mkpath(ot / "PLC-Ladder-Backup" / "_TEMPLATES" / "{MachineID}" / YYYY)
    mkpath(ot / "CMM-Program-Backup" / "_TEMPLATES" / "{CMMID}")
    mkpath(ot / "Post-Processor-Library")
    mkpath(ot / "Kinematic-XML")
    mkpath(ot / "DNC-Server-Config")
    mkpath(ot / "CAD-CAM-License-Backup" / YYYY)
    mkpath(ot / "OT-Incident-Playbook")
    mkpath(ot / "Air-Gap-Workstation-Config")

    # --- Legal/ -------------------------------------------------------------
    legal = s / "Legal"
    for sub in [
        "Contracts-General",
        "Insurance-Policies",
        "Litigation-Hold",
        "IP-Patents",
        "IP-Trademarks",
        "Authority-Matrix",
    ]:
        mkpath(legal / sub)

    # --- Executive/ ---------------------------------------------------------
    ex = s / "Executive"
    for sub in ["Strategy-5Y-AOP", "ERM-Risk-Register"]:
        mkpath(ex / sub)
    for sub in ["BOD-Pack", "BOD-Minutes", "BOD-Resolutions", "Investor-Updates"]:
        mkpath(ex / sub / YYYY)


def build_archive(s: Path) -> None:
    """HESEM-Archive: long-term retention + legal hold."""
    mk_readme(s, """# HESEM-Archive — Long-term retention + legal hold

Frozen records past active operational lifecycle. Read-only after promotion.
""")
    mkpath(s / "Closed-Year-Archive" / YYYY)
    mkpath(s / "Superseded-Documents")
    mkpath(s / "Legal-Hold-Litigation")
    mkpath(s / "Locked-Job-Pack-Final" / YYYY)
    mkpath(s / "Disposition-Log" / YYYY)
    mkpath(s / "Records-Retention-Schedule")
    mkpath(s / "List-Row-Destruction-Trail" / YYYY)


def build_blueprint() -> None:
    """Wipe + rebuild v7 from scratch."""
    preserved = {}
    if ROOT.exists():
        for f in ROOT.iterdir():
            if f.is_file() and f.name not in {".gitkeep", "_TREE.txt"}:
                preserved[f.name] = f.read_bytes()
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)
    for name, data in preserved.items():
        (ROOT / name).write_bytes(data)

    build_workspace(ROOT / "HESEM-Workspace")
    build_internal(ROOT / "HESEM-Internal")
    build_archive(ROOT / "HESEM-Archive")


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
    print(f"Built {n_dirs} directories, {n_files} files.")
    (Path(__file__).parent / "blueprint" / "_TREE.txt").write_text(
        "\n".join(tree) + "\n", encoding="utf-8"
    )
    print("Wrote _TREE.txt.")

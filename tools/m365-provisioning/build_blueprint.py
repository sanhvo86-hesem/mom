#!/usr/bin/env python3
"""
Build M365 folder blueprint v6 — Customer-IP-Segregated 6-Site Architecture.

v6 (2026-05-17) — Fundamental redesign after user feedback on v5:
  1. Folder names were over-engineered ("06-FAI-Last-Released-Baseline-Reference-Only")
     — real industry uses short common vocabulary: Drawings, BOM, CAM, Quality, etc.
  2. Drop Production-Run-Axis (not used in practice at HESEM)
  3. MOM is SSOT for Manual/Policy/SOP/WI/RACI/ANNEX/Training material — DO NOT
     duplicate these in M365. M365 stores ONLY transactional evidence.
  4. Site count for best permission: customer-IP segregation needs SITE-level
     Information Barriers (not folder-level). Industry standard for tier-1
     semi-equipment CNC supplier = 1 site per customer + shared + internal.

v6 site architecture (6 sites):
  - HESEM-AMAT   — AMAT-only IP + Jobs + POs + Audits (IB segment Customer-AMAT)
  - HESEM-LAM    — LAM-only IP + Jobs + POs + Audits (IB segment Customer-LAM)
  - HESEM-ASML   — ASML-only IP + Jobs + POs + Audits (IB segment Customer-ASML)
  - HESEM-TEL    — TEL-only IP + Jobs + POs + Audits (IB segment Customer-TEL)
  - HESEM-Shared — Suppliers, Assets, Compliance, Training, Lot-Trace,
                   HESEM-Owned-Parts (commodity), Internal-Audit, Management-Review
  - HESEM-Internal — HR(PII), IT, OT, Legal, Executive (strict permission)
  + 07-Working-Templates and HESEM-Archive at cross-site level

Per-customer site structure (industry-standard short names):
  Parts/{PartNo}/{Rev}/{Drawings, BOM, CAM, Inspection, Specification, FAI, ECN, Archive}
  Jobs/{YYYY}/{JobNum}/{Job-Admin, Planning, Purchasing, Manufacturing, Quality,
                        Special-Process, Customer, Shipping, Reports, Archive}
  POs/{YYYY}/{PO-Num}/{Source, Review, Acknowledgement, Linked-Jobs, Invoices}
  Customer/{Contracts, Audits, Scorecards, Standards, Bulletins, Complaints,
            PCN-Inbound, PCN-Outbound, ESG-Surveys}
  Multi-Job-Evidence/{CAPA, 8D-Field-Failure, Banned-Substance, Audit-Cross-Job}
  Reports/
  Archive/

Reference master spec: ANNEX-146 (v6 Customer-IP-Segregated Architecture).
"""

from __future__ import annotations
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).parent / "blueprint"
YYYY = "{YYYY}"


def mkpath(p: Path) -> None:
    """Create dir + .gitkeep marker."""
    p.mkdir(parents=True, exist_ok=True)
    keep = p / ".gitkeep"
    if not keep.exists():
        keep.touch()


def mk_readme(p: Path, content: str) -> None:
    """Create dir + README.md."""
    p.mkdir(parents=True, exist_ok=True)
    (p / "_README.md").write_text(content, encoding="utf-8")


OEMS = ["AMAT", "LAM", "ASML", "TEL"]


def build_customer_site(s: Path, oem: str) -> None:
    """Build per-customer site with industry-standard folder vocabulary."""

    mk_readme(s, f"""# HESEM-{oem} — Customer-IP workspace for {oem}

Information Barrier segment: **Customer-{oem}**
Default permission: SG-Cust-{oem}-Members (HESEM employees with NDA + project assignment)
Customer auditor access: time-bound guest invite to this site only.

## Site structure
- **Parts/** — {oem} part baselines per PartNo/Rev (drawings, BOM, CAM, inspection, FAI)
- **Jobs/** — Work Orders for {oem} parts (Planning, Purchasing, Manufacturing, Quality, Shipping)
- **POs/** — Purchase Orders from {oem} (Source, Review, Acknowledgement, Linked-Jobs, Invoices)
- **Customer/** — Account-level: Contracts (NDA/MSA/LTA), Audits, Scorecards, Standards, PCN
- **Multi-Job-Evidence/** — Cross-Job CAPA/8D/Banned-Substance/Audit for {oem}
- **Reports/** — {oem}-specific reporting
- **Archive/** — Closed Jobs, retired parts

## SSOT principles
- This site holds ALL {oem}-specific transactional evidence.
- HESEM internal SOPs/Manuals/Policies/RACI/Training material live in MOM (eqms.hesemeng.com), not here.
- Commodity parts shared with other OEMs live in HESEM-Shared/Parts-HESEM-Owned/ with cross-link.
- Supplier data (CMRT, audits, scorecards) lives in HESEM-Shared/Suppliers/ — referenced by sub-PO under Jobs/.
""")

    # --- Parts/ (engineering baseline per Part/Rev) ---------------------------
    parts = s / "Parts" / "_TEMPLATES" / "{PartNo}" / "{Rev}"
    for sub in [
        "00-Index",
        "Drawings",          # customer drawing, MBD, model (STEP/IGES/DWG/PDF)
        "BOM",               # Bill of Materials
        "CAM",               # NC programs, tool list, post-processor refs
        "Inspection",        # CMM .prg, balloon drawing, control plan, MSA refs
        "Specification",     # customer spec (anodize, EP, clean, Ra) for this Part
        "FAI",               # baseline FAI for this Part/Rev (last released)
        "ECN",               # engineering change history for this Part/Rev
        "Trade-Secret",      # restricted recipe/know-how (per-Part — Master-Index in MOM)
        "Archive",           # superseded revs
    ]:
        mkpath(parts / sub)

    # --- Jobs/ (Work Orders) -------------------------------------------------
    jobs = s / "Jobs" / "_TEMPLATES" / YYYY / "{JobNum}"
    for sub in [
        "00-Job-Admin",      # PO ref, traveler, schedule, job-pack
        "Planning",          # work order release, kit issue, schedule
        "Purchasing",        # sub-PO (raw mat, subcon SP), mill cert
        "Manufacturing",     # setup sheets, first-piece, SPC, IPQC, machine logs
        "Quality",           # FAI execution, NCR, CAPA, MRB for THIS Job
        "Special-Process",   # anodize, EP, clean, outgas records for THIS Job
        "Customer",          # PCN-ack, witness records, complaint for THIS Job
        "Shipping",          # CoC, Pack-6, packing list, customs, ASN
        "Reports",           # daily/weekly/monthly job-specific
        "Archive",           # frozen on Job close
    ]:
        mkpath(jobs / sub)
    # Pack-6 sub under Shipping (ANNEX-141 §3.2)
    pack6 = jobs / "Shipping" / "Cleanliness-Pack-6"
    for elem in [
        "00-Banned-Substance-XRF",
        "01-LPC",
        "02-IC",
        "03-NVR",
        "04-FTIR",
        "05-Ra",
        "06-Visual",
        "07-He-Leak-or-Outgas",
    ]:
        mkpath(pack6 / elem)
    # NCR _Intake bucket
    mkpath(jobs / "Quality" / "NCR" / "_Intake")
    mkpath(jobs / "Quality" / "CAPA")
    mkpath(jobs / "Quality" / "MRB")
    mkpath(jobs / "Quality" / "FAI-Execution")

    # --- POs/ (customer Purchase Orders) -------------------------------------
    pos = s / "POs" / "_TEMPLATES" / YYYY / "PO-{Num}"
    for sub in [
        "Source",            # PO PDF pulled from portal
        "Review",            # internal contract review pack
        "Acknowledgement",   # OA back to customer
        "Linked-Jobs",       # which Jobs spawned by this PO
        "PCN-Inbound",       # PCN affecting this PO
        "Complaint",         # complaint outbound on this PO
        "Invoices",          # AR invoice trace
        "Closed",            # PO-closed with invoice paid
    ]:
        mkpath(pos / sub)

    # --- Customer/ (account-level) -------------------------------------------
    cust = s / "Customer"
    for sub in [
        "Contracts",         # NDA, MSA, LTA executed
        "Quality-Agreement",
        "Standards",         # customer-controlled spec mirror (their quality manual)
        "Portal-Refs",       # Ariba/Coupa/myASML/TPS account ref (not secrets)
        "Approved-Suppliers", # customer's APSL flowed down to HESEM
        "Complaints",        # master log
        "PCN-Inbound",       # master log of inbound PCNs
        "PCN-Outbound",      # master log of outbound PCNs (HESEM-issued)
        "ESG-Surveys",       # customer ESG questionnaires sent to HESEM
    ]:
        mkpath(cust / sub)
    for sub in ["Scorecards", "Audits", "Bulletins", "Demand-Forecast"]:
        mkpath(cust / sub / YYYY)

    # --- Multi-Job-Evidence/ (cross-Job scope for THIS customer) -------------
    mje = s / "Multi-Job-Evidence"
    mk_readme(mje, f"""# Multi-Job-Evidence for {oem}

When a CAPA root cause / 8D field-failure / banned-substance heat-lot / audit
finding spans MULTIPLE Jobs of {oem} parts, the parent record lives here.
Per-Job NCR/CAPA in Jobs/.../Quality back-links via NCR-Master-List metadata.

Examples for {oem}:
- CAPA from supplier defect affecting 5 {oem} Jobs
- 8D field-failure spanning 3 prior {oem} shipments
- Banned-substance heat-lot trace across 7 {oem} Jobs
- Audit finding referencing 5 {oem} Jobs
""")
    for cat in ["CAPA-Cross-Job", "8D-Field-Failure", "Banned-Substance", "Audit-Cross-Job", "Complaint-Umbrella"]:
        mkpath(mje / cat / "_TEMPLATES" / "{ID}")

    # --- Reports/ (customer-specific) ---------------------------------------
    mkpath(s / "Reports" / "Daily")
    mkpath(s / "Reports" / "Weekly")
    mkpath(s / "Reports" / "Monthly")
    mkpath(s / "Reports" / "Quarterly")
    mkpath(s / "Reports" / "Annual")

    # --- Archive/ -----------------------------------------------------------
    mkpath(s / "Archive" / "Closed-Jobs" / YYYY)
    mkpath(s / "Archive" / "Retired-Parts")


def build_shared_site(s: Path) -> None:
    """HESEM-Shared site: non-customer-specific data (suppliers, assets, compliance)."""

    mk_readme(s, """# HESEM-Shared — Non-customer-specific shared data

All HESEM employees can access this site (read by default; write per dept group).
This site holds resources used ACROSS customers — supplier accounts, equipment,
compliance evidence, training records, internal audit findings.

## Site structure
- **Suppliers/** — Per-supplier accounts (qualification, APSL, audit, scorecard, CMRT)
- **Assets/** — Machines, Gages, Tools, Fixtures (lifecycle, cal cert, PM)
- **Parts-HESEM-Owned/** — Commodity parts shared across OEMs (HESEM-owned drawings)
- **Lot-Trace/** — Heat-lot → process-lot → finished-lot chain (cross-customer trace)
- **Quality/** — Internal-Audit, Management-Review, Improvement, Risk-Register
- **Compliance/** — CMRT roll-up, UFLPA, ESG-Carbon, RBA, Banned-Sub-Library, Trade-Secret-Index
- **Training/** — Course materials, Skills-Matrix, Cert-Master, Customer-Approved-Operators
- **Reports/** — Company-wide reporting

## SSOT note
- SOPs / Work Instructions / Policies / Manuals / RACI / ANNEX docs / Training
  curriculum live in MOM (eqms.hesemeng.com). This site stores transactional
  evidence (cal cert PDFs, audit reports, CMRT responses, etc.) not policy docs.
""")

    # --- Suppliers/ ---------------------------------------------------------
    sup = s / "Suppliers" / "_TEMPLATES" / "{SupplierID}"
    for sub in [
        "Qualification",
        "NDA-SQA",
        "APSL-per-OEM",
        "Process-Cert-Letters",
        "Sub-PO-History",
        "Scorecards",
        "SCAR-Log",
        "Banned-Substance",
        "Disqualified",
    ]:
        mkpath(sup / sub)
    for sub in ["Audits", "CMRT-EMRT"]:
        mkpath(sup / sub / YYYY)

    # --- Assets/ ------------------------------------------------------------
    assets = s / "Assets"
    # Machines
    mach = assets / "Machines" / "_TEMPLATES" / "{MachineID}"
    for sub in ["Profile", "Firmware", "Breakdown", "Spindle-Rebuild", "Backup-CNC-PLC", "Decommissioned"]:
        mkpath(mach / sub)
    for sub in ["Geometry", "PM", "PdM", "Customer-Cap-Cert"]:
        mkpath(mach / sub / YYYY)
    # Gages — CANONICAL cal cert vault
    gage = assets / "Gages" / "_TEMPLATES" / "{GageID}"
    for sub in ["Specification", "MSA", "Daily-Check", "OOT-Investigation", "Retired"]:
        mkpath(gage / sub)
    mkpath(gage / "Calibration" / YYYY)
    # Tools
    tools = assets / "Tools" / "_TEMPLATES" / "{ToolID}"
    for sub in ["Master-Spec", "Preset", "Life-History", "Scrapped"]:
        mkpath(tools / sub)
    # Fixtures
    fix = assets / "Fixtures" / "_TEMPLATES" / "{FixtureID}"
    for sub in ["Design", "Validation", "Usage-Log", "Maintenance", "Annual-Cert", "Retired"]:
        mkpath(fix / sub)

    # --- Parts-HESEM-Owned/ (commodity parts used across OEMs) --------------
    hop = s / "Parts-HESEM-Owned" / "_TEMPLATES" / "{PartNo}" / "{Rev}"
    for sub in [
        "00-Index",
        "Drawings",
        "BOM",
        "CAM",
        "Inspection",
        "Specification",
        "FAI",
        "ECN",
        "Cross-OEM-Usage",       # which customers use this HESEM part
        "Trade-Secret",
        "Archive",
    ]:
        mkpath(hop / sub)

    # --- Lot-Trace/ ---------------------------------------------------------
    lot = s / "Lot-Trace"
    mk_readme(lot, """# Lot-Trace — heat-lot → process-lot → finished-lot chain

Cross-customer lot tracing. When raw material heat-lot H-26-44 is used across
Jobs of multiple OEMs, the lot chain canonical record is here.
""")
    for tier in ["Heat-Lots", "Process-Lots", "Finished-Lots"]:
        mkpath(lot / tier / "_TEMPLATES" / "{LotID}")

    # --- Quality/ (internal cross-customer quality) -------------------------
    q = s / "Quality"
    for sub in [
        "Internal-Audits",       # internal audit findings (canonical)
        "Management-Review",
        "Risk-Register",
        "Improvement-Kaizen",
        "FOD-Program",
        "Counterfeit-Prevention",
    ]:
        mkpath(q / sub / YYYY if sub in {"Internal-Audits", "Management-Review"} else q / sub)
    # Fix loop issue — separate logic for year-partitioned
    mkpath(q / "Internal-Audits" / YYYY)
    mkpath(q / "Management-Review" / YYYY)

    # --- Compliance/ --------------------------------------------------------
    cm = s / "Compliance"
    for sub in [
        "Export-Classification",
        "UFLPA-Map",
        "Banned-Substance-Library",
        "REACH-RoHS-per-Part",
        "ASML-HIO",
        "Trade-Secret-Master-Index",   # MASTER INDEX only; recipes per-customer
        "IP-Patent-Trademark",
    ]:
        mkpath(cm / sub)
    for sub in [
        "CMRT", "EMRT-Cobalt", "RBA-SAQ-VAP", "Modern-Slavery",
        "Carbon-Scope-1-2-3", "CDP-EcoVadis",
    ]:
        mkpath(cm / sub / YYYY)
    for oem in OEMS:
        mkpath(cm / "Customer-CoC-Signed" / oem)

    # --- Training/ (master cert register + course materials) ---------------
    t = s / "Training"
    for sub in [
        "Courses",
        "Skills-Matrix",
        "Cert-Master-Register",      # SSOT for every employee cert
    ]:
        mkpath(t / sub)
    for sub in ["Annual-Plan", "Competency-Snapshot", "Effectiveness-KPI"]:
        mkpath(t / sub / YYYY)
    for oem in OEMS:
        mkpath(t / "Customer-Approved-Operators" / oem)
        mkpath(t / "Customer-Audit-Pack" / oem / YYYY)
    for cert in [
        "CNC-Operator", "Special-Process", "CMM-Operator",
        "Lead-Auditor", "FAI-Engineer", "ESD-Coordinator",
        "FOD-Trainer", "Forklift", "First-Aider", "Fire-Warden",
    ]:
        mkpath(t / "Critical-Certs" / cert)

    # --- Reports/ -----------------------------------------------------------
    for period in ["Daily", "Weekly", "Monthly", "Quarterly", "Annual"]:
        mkpath(s / "Reports" / period)


def build_internal_site(s: Path) -> None:
    """HESEM-Internal site: PII, IT, OT, Legal, Executive (strict permission)."""

    mk_readme(s, """# HESEM-Internal — Strict-permission internal data

This site holds:
- **HR/** — Employee dossiers with PII (contract, medical, payroll, discipline) — restricted to HR
- **IT/** — System records (Access, M365 config, DLP, SOC, Backup, Vuln) — restricted to IT
- **OT/** — CNC backup, post-processor, kinematic XML — restricted to OT + IT-SOC, air-gapped
- **Legal/** — Contracts (non-customer), Insurance, Litigation, IP filings — restricted to Legal
- **Executive/** — BOD pack, Strategy, ERM — restricted to BOD + Exec

Permission per LIBRARY (not per folder) for clean isolation. Named-only access
for medical/payroll/discipline/BOD.

## SSOT note
- IT policies, SOPs, RACI, training curriculum live in MOM. This site stores
  only IT/OT operational evidence (access logs, backup receipts, incident records).
""")

    # --- HR/ ----------------------------------------------------------------
    hr = s / "HR"
    EMP_SUBS = [
        "00-Identity",
        "01-Recruitment-Offer",
        "02-Contract-Legal",
        "03-Onboarding-Access",
        "04-Training-Cert-Link",   # link to HESEM-Shared/Training/Cert-Master only
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
    mkpath(hr / "Recruitment" / "Pipeline")
    mkpath(hr / "Working-Hours" / YYYY)
    mkpath(hr / "RBA-Worker-Voice" / YYYY)

    # --- IT/ ----------------------------------------------------------------
    it = s / "IT"
    for area in [
        "Access-Identity",
        "M365-Purview-Config",
        "DLP-Policy",
        "SOC-Sentinel-Incident",
        "Backup-Restore",
        "Vulnerability-Patch",
        "CMDB-Asset-Endpoint",
        "DR-BCP-Drill",
        "RPA-Run-Logs",
        "Vendor-Security",
        "Network-Diagram",
        "Audit-Guest-Access",
    ]:
        mkpath(it / area / "Current")
        mkpath(it / area / YYYY)

    # --- OT/ (CNC/PLC/CMM backup, post-processor — air-gapped) ----------------
    ot = s / "OT"
    mk_readme(ot, """# OT — Operational Technology (air-gapped vault)

CNC controller backup, PLC ladder, CMM program backup, post-processor library,
kinematic XML, DNC server config. Strict permission: OT Admin + IT-SOC only.
""")
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
        "Contracts-General",          # supplier MSA, lease, insurance (non-customer)
        "Insurance-Policies",
        "Litigation-Hold",
        "IP-Patents",
        "IP-Trademarks",
        "Authority-Matrix",
    ]:
        mkpath(legal / sub)

    # --- Executive/ ---------------------------------------------------------
    ex = s / "Executive"
    for sub in [
        "Strategy-5Y-AOP",
        "ERM-Risk-Register",
    ]:
        mkpath(ex / sub)
    for sub in ["BOD-Pack", "BOD-Minutes", "BOD-Resolutions", "Investor-Updates"]:
        mkpath(ex / sub / YYYY)


def build_archive_site(s: Path) -> None:
    """HESEM-Archive site: long-term retention + legal hold."""
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
    """Wipe + rebuild v6 from scratch."""
    preserved = {}
    if ROOT.exists():
        for f in ROOT.iterdir():
            if f.is_file() and f.name not in {".gitkeep", "_TREE.txt"}:
                preserved[f.name] = f.read_bytes()
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)
    for name, data in preserved.items():
        (ROOT / name).write_bytes(data)

    # 4 customer-IP sites with IB segment
    for oem in OEMS:
        build_customer_site(ROOT / f"HESEM-{oem}", oem)

    # Shared site
    build_shared_site(ROOT / "HESEM-Shared")

    # Internal site (PII, IT, OT, Legal, Exec)
    build_internal_site(ROOT / "HESEM-Internal")

    # Archive site
    build_archive_site(ROOT / "HESEM-Archive")

    # Cross-site working templates
    tmpl = ROOT / "07-Working-Templates"
    mk_readme(tmpl, "# Working Templates — blank form templates per Function × TemplateType")
    mkpath(tmpl / "_TEMPLATES" / "{Function}" / "{TemplateType}")


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
    print(f"Built {n_dirs} directories, {n_files} files (.gitkeep + _README).")
    (Path(__file__).parent / "blueprint" / "_TREE.txt").write_text(
        "\n".join(tree) + "\n", encoding="utf-8"
    )
    print("Wrote _TREE.txt.")

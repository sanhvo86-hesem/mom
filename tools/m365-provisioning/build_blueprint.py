#!/usr/bin/env python3
"""
Build M365 folder blueprint v5 — SSOT 3-axis architecture + stress-test fixes.

v5 (2026-05-17) — Apply fixes from 4-agent stress test of v4:
  - Agent 1 PO Lifecycle Simulator: 29 fixes from 10 PO scenarios
  - Agent 2 SSOT Auditor: 47 issues (8 Critical, 22 Major, 17 Minor)
  - Agent 3 JD Reconciliation: 38 JDs storage-abstract, 6 new JDs needed
  - Agent 4 Reverse-Think Critic: 25 v5 design upgrades from 20 stress scenarios

Critical fixes applied in v5:
  C1. {placeholder} literal folders moved into _TEMPLATES/ parking (E-001/E-002)
  C2. Pack-6 cleanliness subfolder added under Job-Dossiers/.../07-G6 (A-001)
  C3. Multi-Job-Evidence/ axis added (cross-Job CAPA/8D/banned-sub/audit/complaint)
  C4. Part-REV-Master/_HESEM-Owned-Parts/ overlay for commodity parts (C-005)
  C5. Lot-Trace-Master/ added for heat-lot → process-lot → finished-lot chains
  C6. Production-Run-Axis/ added for consolidated runs (Agent-4 sec 1c)
  C7. Workflow-Lists folders DROPPED — replaced by README pointing to Lists (B-001)
  C8. FAI folders renamed for clarity: Part-REV/.../06-FAI-Last-Released-Baseline
      and Job-Dossiers/.../05-G4-FAI-Execution (A-002)
  C9. NCR _Intake bucket added for pre-NCR photo evidence (F-005)
  C10. Customer-Account/13-Customer-ESG-Survey-Inbound added (E-003)
  C11. Asset-Master/Gages/.../03-MSA/_per-Customer overlay added (C-006)
  C12. Asset-Master/Tools/.../99-Decommissioned + 05-OOT-Investigation added (minor)
  C13. Job-Dossiers/.../13-Cost-Actual-Roll-Up-Finance README noting restricted SG
  C14. Customer-Reference/{OEM}/05-Customer-Audit-Bulletins/ added
  C15. _README.md markers in collision-prone folders explain canonical vs reference

Reference master matrix: ANNEX-145 (v5 SSOT + Workflow-Lists Schema Spec).
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


def mk_readme(p: Path, content: str) -> None:
    """Create dir + README.md with explanatory content (instead of .gitkeep)."""
    p.mkdir(parents=True, exist_ok=True)
    readme = p / "_README.md"
    readme.write_text(content, encoding="utf-8")


DEPARTMENTS = [
    "DEP-EXEC", "DEP-QMS", "DEP-QA", "DEP-METRO", "DEP-ENG", "DEP-PRO",
    "DEP-SP", "DEP-MNT", "DEP-SCM", "DEP-SCS", "DEP-FIN", "DEP-HR",
    "DEP-EHS", "DEP-IT", "DEP-ERP", "DEP-LEGAL",
]
OEMS = ["AMAT", "LAM", "ASML", "TEL"]
CERT_FAMILIES = [
    "CNC-Operator", "Special-Process-Operator", "CMM-Operator",
    "Lead-Auditor", "FAI-Engineer", "ESD-Coordinator",
    "FOD-Trainer", "Forklift-Operator", "First-Aider", "Fire-Warden",
]
STANDARDS_BODIES = ["SEMI", "AMS", "ASTM", "ISO-AS", "IEST", "NADCAP", "RBA"]

# Pack-6 cleanliness evidence elements (per ANNEX-141 §3.2)
PACK6_ELEMENTS = [
    "00-Banned-Substance-Decl-XRF-Verify",
    "01-LPC-Liquid-Particle-Count",
    "02-IC-Ion-Chromatography",
    "03-NVR-Non-Volatile-Residue",
    "04-FTIR-IR-Scan",
    "05-Ra-Surface-Roughness-Map",
    "06-Visual-Photo-Pack",
    "07-He-Leak-or-Outgassing-Cert",
]


def build_blueprint() -> None:
    """Wipe + rebuild v5 from scratch."""
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
    # SITE 1 — HESEM-Job-Evidence (PRIMARY transactional SSOT)
    # =========================================================================
    s1 = ROOT / "HESEM-Job-Evidence"

    # _README explaining the site's role
    mk_readme(s1, """# HESEM-Job-Evidence — Transactional SSOT (90% of HESEM file volume)

5 primary axes + 1 cross-Job axis for evidence:
- **Part-REV-Master/** — Engineering baseline per Customer+PartNo+Rev
  - `{CustomerID}/{PartNo}/REV-{Rev}/` — customer-keyed (their drawing IP)
  - `_HESEM-Owned-Parts/{PartNo}/REV-{Rev}/` — HESEM-owned commodity parts
- **Job-Dossiers/** — Every WO = full traceability chain (14 gates G0-G7 + NCR + SP + Customer-Touch + Subcon + Cost)
- **PO-Index/** — Per Customer × Year × PO (Sales/Finance entry point)
- **Customer-Account/** — Per OEM (LTA, NDA, scorecard, audit, ESG survey)
- **Supplier-Account/** — Per supplier (qualification, APSL, CMRT, SCAR)
- **Asset-Master/** — Per Tool/Fixture/Gage/Machine (lifecycle, cal cert, PM)
- **Multi-Job-Evidence/** (v5 NEW) — Cross-Job CAPA/8D/Banned-Sub/Audit/Complaint scope
- **Lot-Trace-Master/** (v5 NEW) — Heat-lot → process-lot → finished-lot graph
- **Production-Run-Axis/** (v5 NEW) — Consolidated runs spanning multiple Jobs/POs/OEMs

Placeholder folders `{CustomerID}/{PartNo}/REV-{Rev}/...` are SCHEMA templates
shown in `_TEMPLATES/` parking. Real M365 tenant gets instances via PnP/Power
Automate provisioner — never materialize literal `{X}` folder names.

See ANNEX-144 (v4 spec, superseded), ANNEX-145 (v5 fixes + Workflow-Lists schema).
""")

    # --- AXIS 1: PART (engineering baseline) ---------------------------------
    prm = s1 / "Part-REV-Master"
    mk_readme(prm, """# Part-REV-Master — Engineering baseline per Part-Rev

Two key sub-roots:
1. **`{CustomerID}/{PartNo}/REV-{Rev}/`** — customer-keyed. Use when the drawing
   is customer IP (AMAT/LAM/ASML/TEL gives us their controlled drawing).
2. **`_HESEM-Owned-Parts/{PartNo}/REV-{Rev}/`** — HESEM-owned. Use for commodity
   parts, fasteners, in-house tooling parts, or standard parts that HESEM sells
   to multiple OEMs from one engineering baseline.

**Decision rule (v5):**
- Customer-IP drawing → customer-keyed tree
- HESEM-owned drawing → `_HESEM-Owned-Parts/`
- Customer customizes our standard part with their PN overlay → `_HESEM-Owned-Parts/`
  for engineering, customer-keyed for per-customer FAI/PCN/Cert

Seeded sample customer trees: AMAT, LAM, ASML, TEL (sample subfolders only).
Real instances created by PnP provisioner from PartNo registry.
""")

    # Template structure (under _TEMPLATES, NOT real folders)
    prm_tmpl = prm / "_TEMPLATES" / "_per-Customer-Part-Rev"
    for sub in [
        "00-Index-and-Status",
        "01-Engineering-Baseline-Customer-Source",
        "02-CAM-Master-Source",
        "03-Inspection-Master",
        "04-Approved-Material-and-Source",
        "05-Special-Process-Spec-per-Customer",
        "06-FAI-Last-Released-Baseline-Reference-Only",   # renamed from 06-FAI-Baseline-Pack
        "07-PCN-History-for-this-Rev",
        "08-Customer-Standards-Linked",
        "09-Trade-Secret-Process-Notes-Restricted",
        "99-Superseded-by-NewRev",
    ]:
        mkpath(prm_tmpl / sub)

    # HESEM-Owned-Parts overlay (Critical C-005)
    hom_tmpl = prm / "_HESEM-Owned-Parts" / "_TEMPLATES" / "{PartNo}-REV-{Rev}"
    for sub in [
        "00-Index-and-Status",
        "01-Engineering-Baseline-HESEM-Owned",
        "02-CAM-Master-Source",
        "03-Inspection-Master",
        "04-Approved-Material-and-Source",
        "05-Special-Process-Spec-Internal-Standard",
        "06-FAI-Last-Released-Baseline-Reference-Only",
        "07-Internal-ECO-History",
        "08-Cross-OEM-Usage-Registry",       # which OEMs use this HESEM part
        "09-Trade-Secret-Process-Notes-Restricted",
        "99-Superseded-by-NewRev",
    ]:
        mkpath(hom_tmpl / sub)
    # Real seed for AMAT/LAM/ASML/TEL with the full template (showing the model)
    for oem in OEMS:
        for sub in [
            "00-Index-and-Status",
            "01-Engineering-Baseline-Customer-Source",
        ]:
            mkpath(prm / oem / "_sample-{PartNo}" / "REV-A" / sub)

    # --- AXIS 2: JOB (Work Order full chain) ---------------------------------
    jd = s1 / "Job-Dossiers"
    mk_readme(jd, """# Job-Dossiers — Every Work Order = full evidence chain

Path: `Job-Dossiers/{YYYY}/{JobNum}-{PartNo}-REV-{Rev}/{Gate}/`

14 gates per Job + 99-Archive-Locked. Each gate has README in `_TEMPLATES/`
explaining canonical content vs what's referenced from other axes.

**v5 changes (critical):**
- `05-G4-FAI-Execution-for-this-Job/` (renamed from `05-G4-FAI-First-Article`)
  to disambiguate from Part-REV/06-FAI-Last-Released-Baseline-Reference-Only.
- `07-G6-Final-QC-and-Pack/_Cleanliness-Pack/{00..07}/` (Pack-6 v5 NEW per
  ANNEX-141 §3.2) — was missing in v4.
- `09-NCR-CAPA-Deviation-for-this-Job/_Intake/` for pre-NCR photo evidence
  (operator who just spotted a defect, no NCR# yet — Power Automate
  routes into proper NCR# subfolder once assigned).
- Cross-Job NCR/CAPA scope → see `../Multi-Job-Evidence/` (v5 NEW axis).
- `13-Cost-Actual-Roll-Up-Finance` permission MUST override parent Job SG —
  restricted to SG-DEP-FIN + SG-DEP-EXEC only (auditor finding D-002).
""")
    jd_tmpl = jd / "_TEMPLATES" / "{JobNum}-{PartNo}-REV-{Rev}"
    for gate in [
        "00-Job-Admin",
        "01-G0-Contract-Kickoff",
        "02-G1-Engineering-Release",
        "03-G2-IQC-Receiving",
        "04-G3-Setup-Release",
        "05-G4-FAI-Execution-for-this-Job",          # renamed (A-002)
        "06-G5-IPQC-Production",
        "07-G6-Final-QC-and-Pack",
        "08-G7-Ship-Release",
        "09-NCR-CAPA-Deviation-for-this-Job",
        "10-Special-Process-Records-for-this-Job",
        "11-Customer-Touchpoints-for-this-Job",
        "12-Subcon-Routing-if-Outsourced",
        "13-Cost-Actual-Roll-Up-Finance",
        "99-Archive-Locked",
    ]:
        mkpath(jd_tmpl / gate)
    # Pack-6 sub-folder under G6 (Critical A-001)
    pack6 = jd_tmpl / "07-G6-Final-QC-and-Pack" / "_Cleanliness-Pack"
    for elem in PACK6_ELEMENTS:
        mkpath(pack6 / elem)
    mk_readme(pack6, """# Pack-6 Cleanliness Evidence Bundle (ANNEX-141 §3.2)

For ASML/AMAT/LAM/TEL semicon-critical parts. 8 elements required per shipment:
00-Banned-Substance, 01-LPC, 02-IC, 03-NVR, 04-FTIR, 05-Ra, 06-Visual, 07-He-Leak/Outgas.

**SSOT rule:** Executed test PDFs live here (per-Job). Threshold spec PDFs
(target Level, Class) live in `Part-REV-Master/.../05-Special-Process-Spec-per-Customer/`
— never duplicated. Pack-6 record header hyperlinks the threshold doc.
""")
    # _Intake bucket for pre-NCR evidence (F-005)
    mkpath(jd_tmpl / "09-NCR-CAPA-Deviation-for-this-Job" / "_Intake")

    # --- AXIS 3: ASSET ---------------------------------------------------------
    asset = s1 / "Asset-Master"

    # Tools
    tool_tmpl = asset / "Tools" / "_TEMPLATES" / "{ToolID}"
    for sub in [
        "01-Master-Spec",
        "02-Preset-Data",
        "03-Life-History",
        "04-OOT-Investigation",      # v5 add
        "99-Scrapped",
    ]:
        mkpath(tool_tmpl / sub)

    # Fixtures
    fix_tmpl = asset / "Fixtures" / "_TEMPLATES" / "{FixtureID}"
    for sub in [
        "01-Design-Pack",
        "02-Validation-Proveout",
        "03-Usage-Log",
        "04-Maintenance-Repair",
        "05-Annual-Cert",
        "99-Retired",
    ]:
        mkpath(fix_tmpl / sub)

    # Gages — calibration cert SINGLE CANONICAL HOME
    gage_tmpl = asset / "Gages" / "_TEMPLATES" / "{GageID}"
    for sub in [
        "01-Specification",
        "04-Daily-Check-Log",
        "05-OOT-Investigation",
        "99-Retired",
    ]:
        mkpath(gage_tmpl / sub)
    mkpath(gage_tmpl / "02-Calibration-Certificates" / YYYY)
    mkpath(gage_tmpl / "02-Calibration-Certificates" / YYYY / "_Lab-Methodology-NDA")  # D-001
    # 03-MSA with per-Customer overlay (C-006)
    mkpath(gage_tmpl / "03-MSA-GR-R-Studies" / "_generic")
    for oem in OEMS:
        mkpath(gage_tmpl / "03-MSA-GR-R-Studies" / "_per-Customer" / oem)

    # Machines
    mach_tmpl = asset / "Machines" / "_TEMPLATES" / "{MachineID}"
    for sub in [
        "01-Asset-Profile",
        "03-Firmware-Update-History",
        "06-Breakdown-RCA",
        "08-Spindle-Rebuild-Capex",
        "09-CNC-PLC-Param-Backup",
        "10-Equipment-Used-Binding-Log",   # v5 NEW (Agent-4) — which Jobs used this machine
        "99-Decommissioned",
    ]:
        mkpath(mach_tmpl / sub)
    for sub in [
        "02-Geom-Verification",
        "04-PM-Records",
        "05-PdM-Vibration-Spindle",
        "07-Customer-Cap-Cert-per-OEM",
    ]:
        mkpath(mach_tmpl / sub / YYYY)

    # --- AXIS 4: ACCOUNT ------------------------------------------------------

    # PO-Index template
    po_tmpl = s1 / "PO-Index" / "_TEMPLATES" / "{CustomerID}-{YYYY}-PO-{CustPO}"
    for sub in [
        "00-PO-Source-Pulled-from-Portal",
        "01-Contract-Review-Pack-Internal",
        "02-Order-Acknowledgement-Sent",
        "03-Quote-Trace-RFQ-to-Quote",
        "04-Linked-Jobs",
        "05-LTA-Cross-Reference",
        "06-PCN-Inbound-Affecting-this-PO",
        "07-Complaint-Outbound-on-this-PO",
        "08-Invoice-Trace-Finance-Link",
        "09-Outbound-Customer-Submission-Evidence",  # v5 NEW — outbound CoC/FAI/PPAP push
        "10-Shipment-Schedule-Partial-Ship-History",  # v5 NEW (Agent-4 sec 10)
        "99-PO-Closed-with-Invoice-Paid",
    ]:
        mkpath(po_tmpl / sub)

    # Customer-Account — both template and 4 OEM seeds
    ca = s1 / "Customer-Account"
    ca_template_sub = [
        "01-Account-Profile",
        "02-NDA-MSA-LTA-Contracts-Executed",
        "03-Quality-Agreement",
        "04-Customer-Approved-Suppliers-Flowdown",
        "07-Customer-Standards-Library",
        "08-Customer-Portal-Access-Refs",
        "10-Customer-Complaint-Master-Log",
        "11-Customer-PCN-Inbound-Master-Log",
        "12-HESEM-PCN-Outbound-Master-Log",
        "13-Customer-ESG-Survey-Inbound",          # v5 NEW (E-003)
        "14-Customer-Audit-Witness-Schedule",      # v5 NEW (Agent-4 sec 8)
        "99-Account-Inactive",
    ]
    ca_year_sub = [
        "05-Annual-Scorecard",
        "06-Customer-Audit",
        "09-Demand-Forecast",
    ]
    # Template
    ca_tmpl = ca / "_TEMPLATES" / "{CustomerID}"
    for sub in ca_template_sub:
        mkpath(ca_tmpl / sub)
    for sub in ca_year_sub:
        mkpath(ca_tmpl / sub / YYYY)
    # 4 OEM seeds (full schema)
    for oem in OEMS:
        oem_root = ca / oem
        for sub in ca_template_sub:
            mkpath(oem_root / sub)
        for sub in ca_year_sub:
            mkpath(oem_root / sub / YYYY)

    # Supplier-Account
    sa_tmpl = s1 / "Supplier-Account" / "_TEMPLATES" / "{SupplierID}"
    for sub in [
        "01-Qualification-SAQ-Financial",
        "02-NDA-SQA-Executed",
        "03-APSL-Scope-per-OEM",
        "05-Annual-Scorecard",
        "06-Process-Cert-Letters-per-OEM",
        "07-Sub-PO-History",
        "09-Supplier-SCAR-Master-Log",
        "10-Banned-Substance-Decl-Annual",
        "11-Sub-Tier-Change-Notification",   # v5 add (Agent-4 sec 14)
        "99-Disqualified",
    ]:
        mkpath(sa_tmpl / sub)
    for sub in ["04-Annual-Audit", "08-CMRT-EMRT-Responses"]:
        mkpath(sa_tmpl / sub / YYYY)

    # --- AXIS 5 (v5 NEW): Multi-Job-Evidence (cross-Job scope) ----------------
    mje = s1 / "Multi-Job-Evidence"
    mk_readme(mje, """# Multi-Job-Evidence (v5 NEW axis) — cross-Job scope evidence

Real ops reveal ~25% of records span MULTIPLE Jobs/Parts/Suppliers:
- **CAPA root-cause that affected 5 Jobs** (e.g., supplier defect from heat-lot)
- **8D for field-failure** spanning 3 prior shipments
- **Banned-substance heat-lot trace** affecting 12 Jobs
- **Internal audit findings** referencing 5 Jobs
- **Cross-Job customer complaint** umbrella

**SSOT rule:** Parent record lives HERE (canonical). Children NCR/CAPA per Job
back-link via `ParentMultiJobID` metadata column on `NCR-Master-List` / `CAPA-Master-List`.

The 5 categories below each have unique IDs to keep cross-Job evidence
auditable as one chain.
""")
    for cat in [
        "01-CAPA-Cross-Job-Scope/{CAPAID}",          # CAPA spans multi Jobs
        "02-8D-Field-Failure-Multi-Job-Scope/{ID}",   # field-failure 8D
        "03-Banned-Substance-Heat-Lot-Trace/{LotID}", # cross-Job lot trace
        "04-Audit-Finding-Cross-Job-Scope/{AuditID}",
        "05-Customer-Complaint-Umbrella/{ComplaintID}",
    ]:
        mkpath(mje / "_TEMPLATES" / cat)

    # --- AXIS 6 (v5 NEW): Lot-Trace-Master -----------------------------------
    lot = s1 / "Lot-Trace-Master"
    mk_readme(lot, """# Lot-Trace-Master (v5 NEW) — heat-lot → process-lot → finished-lot graph

When raw material heat-lot H-26-44 used across 7 Jobs, downstream subcon bath
load that mixed 3 customer Jobs together — the lot chain must be canonical
in ONE place for recall/trace.

Path: `Lot-Trace-Master/{HeatLotID|ProcessLotID|FinishedLotID}/`
""")
    mkpath(lot / "_TEMPLATES" / "Heat-Lot" / "{HeatLotID}")
    mkpath(lot / "_TEMPLATES" / "Process-Lot" / "{ProcessLotID}")
    mkpath(lot / "_TEMPLATES" / "Finished-Lot" / "{FinishedLotID}")

    # --- AXIS 7 (v5 NEW): Production-Run-Axis --------------------------------
    pr = s1 / "Production-Run-Axis"
    mk_readme(pr, """# Production-Run-Axis (v5 NEW) — consolidated production runs

For batch consolidation: 1 production run covers 3 small POs from 3 OEMs
(rare but real for efficiency on shared machines). The bath/run produces
ONE bath chemistry log, but maps to 3 Jobs.

Path: `Production-Run-Axis/{RunID}/`
- 01-Run-Setup
- 02-Bath-or-Machine-Run-Log
- 03-Linked-Jobs (back-link to Job-Dossiers)
- 04-Run-Closeout-Disposition
- 99-Archive

**Interim policy v5:** FORBID multi-OEM consolidated runs until governance
+ IB segmentation rules approved. This axis pre-allocated for future use.
""")
    pr_tmpl = pr / "_TEMPLATES" / "{RunID}"
    for sub in [
        "01-Run-Setup",
        "02-Bath-or-Machine-Run-Log",
        "03-Linked-Jobs",
        "04-Run-Closeout-Disposition",
        "99-Archive",
    ]:
        mkpath(pr_tmpl / sub)

    # =========================================================================
    # SITE 2 — HESEM-Records (Governance + Reference + SOPs)
    # =========================================================================
    s2 = ROOT / "HESEM-Records"
    mk_readme(s2, """# HESEM-Records — Governance + Reference + SOPs (NO transactional evidence)

7 libraries:
- **QMS-Master** — Quality policy, MR, Internal-Audit, DCC, Risk, Change-Control
- **Compliance-Master** — Export, CMRT, UFLPA, REACH, RBA, Carbon, Trade-Secret-Reg, IP
- **Training-Master** — Course catalog, Skills taxonomy, Cert master register (SSOT for certs)
- **Department-Reference** — Per dept × 8 fixed sub (SOPs+KPI+MR+Risk; NOT evidence)
- **Customer-Reference** — Per OEM controlled specs + bulletins
- **Industry-Standards** — SEMI/AMS/ASTM/ISO/IEST/NADCAP/RBA refs

**Workflow-Lists DOCUMENTATION:**
NOT provisioned as folders. The 16 Workflow-Lists below are SharePoint LISTS
(metadata only, links to canonical paths). See ANNEX-145 §5 for schemas:
NCR-Master, CAPA-Master, 8D-SCAR-Master, ECO-Master, PCN-Master,
Customer-Audit-Master, Internal-Audit-Master, Customer-Portal-Evidence-Log,
Action-Tracker-Master, Calibration-Due-List, PM-Schedule-Master,
Cert-Expiry-Watch-90d, Open-Concession-Deviation-Log, FAI-Master-List (v5 NEW),
Job-Master-List (v5 NEW), Supplier-CMRT-Master-List (v5 NEW).
""")

    # QMS-Master
    qms = s2 / "QMS-Master"
    for sub in [
        "01-Quality-Policy-and-Manual",
        "05-DCC-Master-Register",
        "06-Authority-RACI-Matrix",
        "07-Org-Chart-and-Position-Register",
        "08-Risk-Register-Master",
        "09-Improvement-Kaizen-Master",
        "10-Change-Control-Master-ECO-PCN-Queue",
        "11-Rev-Creation-Governance-Gate",        # v5 NEW (Agent-1 PO-7)
    ]:
        mkpath(qms / sub)
    for sub in ["02-Management-Review", "03-Internal-Audit-Program", "04-External-Cert-Audits"]:
        mkpath(qms / sub / YYYY)

    # Compliance-Master
    cm = s2 / "Compliance-Master"
    mk_readme(cm, """# Compliance-Master — Periodic compliance evidence (governance-level only)

13-Trade-Secret-Register holds the MASTER LIST of trade secrets (redacted index
of recipe IDs, owner, customers using them). Actual recipe/process notes live
in Part-REV-Master/.../09-Trade-Secret-Process-Notes-Restricted.
""")
    for sub in [
        "01-Export-Classification-Registry",
        "04-UFLPA-Supply-Chain-Map",
        "05-Banned-Substance-Library",
        "06-REACH-RoHS-Decl-per-Part",
        "07-ASML-HIO-Compliance",
        "13-Trade-Secret-Register-Master-Index",  # renamed for clarity
    ]:
        mkpath(cm / sub)
    for sub in [
        "02-Conflict-Minerals-CMRT", "03-EMRT-Cobalt",
        "08-RBA-SAQ-VAP", "09-Modern-Slavery-Statement",
        "10-ESG-Carbon-Scope-1-2-3", "11-CDP-EcoVadis-Submissions",
    ]:
        mkpath(cm / sub / YYYY)
    for oem in OEMS:
        mkpath(cm / "12-Customer-CoC-Signed" / oem)
    mkpath(cm / "14-IP-Patent-Filings" / "_TEMPLATES" / "{CaseID}")
    mkpath(cm / "14-IP-Trademark-Filings" / "_TEMPLATES" / "{CaseID}")

    # Training-Master
    tm = s2 / "Training-Master"
    mk_readme(tm, """# Training-Master — SSOT for all training + certifications

07-Cert-Master-Register-per-Employee = SSOT for every cert PDF.
Employee-Records/04-Training-and-Certification-Link only carries a link, never PDFs.
""")
    for sub in [
        "01-Course-Catalog",
        "04-Skills-Taxonomy",
        "05-Required-Skill-Matrix-per-Role",
        "07-Cert-Master-Register-per-Employee",
    ]:
        mkpath(tm / sub)
    mkpath(tm / "02-Course-Material" / "_TEMPLATES" / "{CourseCode}")
    for sub in ["03-Annual-Training-Plan", "06-Actual-Competency-Snapshot", "11-Training-Effectiveness-KPI"]:
        mkpath(tm / sub / YYYY)
    for oem in OEMS:
        mkpath(tm / "08-Customer-Approved-Operator-List" / oem)
        mkpath(tm / "09-Customer-Audit-People-Pack" / oem / YYYY)
    for cert in CERT_FAMILIES:
        mkpath(tm / "10-Critical-Cert-Library" / cert)

    # Department-Reference (16 dept × 8 sub fixed, NO scenario)
    dr = s2 / "Department-Reference"
    mk_readme(dr, """# Department-Reference — SOPs + dept governance (NO transactional evidence)

16 dept × 8 fixed sub:
01-SOPs-and-Work-Instructions, 02-Forms-Templates, 03-Department-KPI/{YYYY},
04-MR-Inputs-per-Dept/{YYYY}, 05-Dept-Risk-Register,
06-Internal-Audit-Findings-against-Dept/{YYYY}, 07-Dept-Org-Chart-and-Roles,
08-Reference-Material-Internal.

**v5 note:** 06-Internal-Audit-Findings-against-Dept is dept-RECEIVED audit
findings as reference. The SSOT canonical audit finding lives in
QMS-Master/03-Internal-Audit-Program/{YYYY}. This folder = local copy for
dept ops, with metadata link back to canonical.
""")
    for dept in DEPARTMENTS:
        dept_base = dr / dept
        mkpath(dept_base / "01-SOPs-and-Work-Instructions")
        mkpath(dept_base / "02-Forms-Templates")
        mkpath(dept_base / "05-Dept-Risk-Register")
        mkpath(dept_base / "07-Dept-Org-Chart-and-Roles")
        mkpath(dept_base / "08-Reference-Material-Internal")
        for sub in ["03-Department-KPI", "04-MR-Inputs-per-Dept", "06-Internal-Audit-Findings-against-Dept"]:
            mkpath(dept_base / sub / YYYY)

    # Customer-Reference (per OEM)
    crf = s2 / "Customer-Reference"
    for oem in OEMS:
        mkpath(crf / oem / "01-Quality-Manuals-Controlled-Copy")
        mkpath(crf / oem / "02-Spec-Library-Mirror")
        mkpath(crf / oem / "03-Approved-Supplier-Notices")
        mkpath(crf / oem / "04-Bulletins-and-Updates" / YYYY)
        mkpath(crf / oem / "05-Customer-Audit-Bulletins" / YYYY)   # v5 add

    # Industry-Standards
    ind = s2 / "Industry-Standards"
    for body in STANDARDS_BODIES:
        mkpath(ind / body)

    # Workflow-Lists — DROPPED as folders, README only (Critical B-001)
    wl_readme = s2 / "Workflow-Lists-Specification-NOT-FOLDERS"
    mk_readme(wl_readme, """# Workflow-Lists — SharePoint LISTS, NOT folders

**DO NOT CREATE FILES HERE.** This is documentation only.

The 16 Workflow-Lists below are provisioned as SharePoint Lists by the
PnP PowerShell script (`Provision-HesemTenant.ps1`), NOT as folders. Each
List has metadata columns + lookups + permission scope per ANNEX-145 §5.

| List | Purpose | Canonical-Path target |
|---|---|---|
| NCR-Master-List | Cross-cut view of all NCR | Job-Dossiers/.../09-NCR-CAPA + Multi-Job-Evidence/01-CAPA-Cross-Job |
| CAPA-Master-List | All CAPA (NCR + audit + complaint sources) | Multi-Job-Evidence/01-CAPA-Cross-Job |
| 8D-SCAR-Master-List | Customer complaint chain | Job-Dossiers/.../11-Customer-Touchpoints + Multi-Job-Evidence/02-8D |
| ECO-Master-List | Engineering change order queue | QMS-Master/10-Change-Control |
| PCN-Master-List | Process change notice queue | Customer-Account/.../11-PCN + Part-REV-Master/.../07-PCN |
| Customer-Audit-Master-List | Audit cycle per customer | Customer-Account/.../06-Customer-Audit |
| Internal-Audit-Master-List | Internal audit | QMS-Master/03-Internal-Audit |
| Customer-Portal-Evidence-Log | Ariba/Coupa/myASML/TPS pull+push | PO-Index/.../00 + 09 |
| Action-Tracker-Master | All open actions | (cross-cutting) |
| Calibration-Due-List | Cal due 30/60/90 | Asset-Master/Gages/.../02-Cal-Cert |
| PM-Schedule-Master | PM due per machine | Asset-Master/Machines/.../04-PM-Records |
| Cert-Expiry-Watch-90d | Operator cert expiring | Training-Master/07-Cert-Master |
| Open-Concession-Deviation-Log | Active deviation requests | Job-Dossiers/.../11-Customer-Touchpoints |
| **FAI-Master-List (v5 NEW)** | All FAI for customer audit "show me FAI last 12 months" | Job-Dossiers/.../05-G4-FAI + Part-REV-Master/.../06-FAI-Baseline |
| **Job-Master-List (v5 NEW)** | All active Jobs cross-cut | Job-Dossiers/{YYYY}/{Job}/ |
| **Supplier-CMRT-Master-List (v5 NEW)** | CMRT annual roll-up | Supplier-Account/.../08-CMRT |

See ANNEX-145 §5 for column schema, lookups, validation, permission.
""")

    # =========================================================================
    # SITE 3 — HESEM-People (PII ONLY)
    # =========================================================================
    s3 = ROOT / "HESEM-People"
    er = s3 / "Employee-Records"
    EMP_SUBS = [
        "00-Identity-and-Employment-Profile",
        "01-Recruitment-and-Offer",
        "02-Employment-Contract-and-Legal",
        "03-Onboarding-Role-and-Access",
        "04-Training-Certification-LINK-ONLY-to-Training-Master",
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
    # Template only — no literal {placeholder} folders
    emp_tmpl_active = er / "_TEMPLATES" / "01-Active-Employees" / "{EmployeeID}-{FullName}"
    for sub in EMP_SUBS:
        mkpath(emp_tmpl_active / sub)
    mkpath(er / "_TEMPLATES" / "02-Pending-Starters" / "{YYYY}" / "{Population}" / "{CandidateID}-{Name}")
    emp_tmpl_former = er / "_TEMPLATES" / "03-Former-Employees" / "{YYYY}" / "{EmployeeID}-{FullName}"
    for sub in EMP_SUBS:
        mkpath(emp_tmpl_former / sub)
    mkpath(er / "_TEMPLATES" / "04-Contractors-Interns-Temps" / "{YYYY}" / "{Population}" / "{ID-Name}")
    mkpath(er / "_TEMPLATES" / "05-Visitors-and-Vendors" / "{YYYY}" / "{VisitType}" / "{VisitorName}")
    mkpath(er / "_TEMPLATES" / "06-Restricted-Shared-Ops" / "{RestrictedProcess}" / "00-Current")

    # =========================================================================
    # SITE 4 — HESEM-Digital (IT/OT)
    # =========================================================================
    s4 = ROOT / "HESEM-Digital"

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
        "12-Audit-Scoped-Guest-Access-Groups",   # v5 NEW (Agent-4 sec 18)
    ]:
        mkpath(sr / area / "00-Current")
        mkpath(sr / area / YYYY)

    qsc = s4 / "QMS-Source-Control"
    for p in ["mom", "mom/docs/system", "mom/docs/operations", "mom/docs/forms",
              "mom/docs/training", "mom/docs/glossary", "assets", "core-standards", "tools"]:
        mkpath(qsc / "01-Controlled-Source" / "eqms.hesemeng.com" / p)
    mkpath(qsc / "02-Release-Manifests" / YYYY)
    mkpath(qsc / "03-Server-Deploy-Receipts" / YYYY)
    mkpath(qsc / "04-Reverse-Sync-Intake" / YYYY)

    # OT-Vault (template-keyed)
    ot = s4 / "OT-Vault"
    mk_readme(ot, """# OT-Vault — CNC/PLC/CMM backup + post-processor + kinematic (air-gapped)

v5 IB scoping: OT-Vault contains machine-config that may carry customer IP
(custom post-processor for AMAT chamber parts contains know-how). IB segment
per-OEM applied at LIBRARY level here.
""")
    mkpath(ot / "_TEMPLATES" / "01-CNC-Controller-Param-Backup" / "{MachineID}" / YYYY)
    mkpath(ot / "_TEMPLATES" / "02-PLC-Ladder-Backup" / "{MachineID}" / YYYY)
    mkpath(ot / "_TEMPLATES" / "03-CMM-Calypso-PCDMIS-Backup" / "{CMMID}")
    mkpath(ot / "04-Post-Processor-Library")
    mkpath(ot / "05-Machine-Kinematic-XML")
    mkpath(ot / "06-DNC-Server-Config")
    mkpath(ot / "07-CAD-CAM-License-Server-Backup" / YYYY)
    mkpath(ot / "08-OT-Incident-Playbook")
    mkpath(ot / "09-OT-Air-Gap-Workstation-Config")
    mkpath(ot / "99-OT-Archive" / YYYY)

    # =========================================================================
    # SITE 5 — HESEM-Archive
    # =========================================================================
    s5 = ROOT / "HESEM-Archive"
    mkpath(s5 / "01-Closed-Year-Archive" / YYYY)
    mkpath(s5 / "02-Superseded-Documents")
    mkpath(s5 / "03-Legal-Hold-Litigation")
    mkpath(s5 / "04-Locked-Job-Pack-Final" / YYYY)
    mkpath(s5 / "05-Disposition-Log" / YYYY)
    mkpath(s5 / "06-Records-Retention-Schedule")
    mkpath(s5 / "07-List-Row-Destruction-Audit-Trail" / YYYY)   # v5 NEW (Agent-4 sec 19)

    # =========================================================================
    # CROSS-SITE — Working Templates
    # =========================================================================
    tmpl = ROOT / "07-Working-Templates"
    mk_readme(tmpl, """# 07-Working-Templates — Blank form templates per Function × TemplateType

Cross-site templates root. Forms get instantiated INTO the appropriate
canonical axis (Job-Dossier, Part-REV, Asset, etc.) when used.
""")
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
    print(f"Built {n_dirs} directories, {n_files} files (.gitkeep + _README markers).")
    (Path(__file__).parent / "blueprint" / "_TREE.txt").write_text(
        "\n".join(tree) + "\n", encoding="utf-8"
    )
    print("Wrote _TREE.txt manifest for audit.")

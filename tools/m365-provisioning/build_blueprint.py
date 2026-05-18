#!/usr/bin/env python3
"""
Build M365 folder blueprint v8.1 — PLM-style 3-state lifecycle architecture.

v8.1 (2026-05-18) — Comprehensive design after multi-round user feedback:
  - Part-Master split from Customer (PLM industry standard: engineering vault peer with Job-Dossier)
  - Job-Dossier with CustomerCode in path + correct workflow gate order
  - 3-state lifecycle (1-Working / 2-In-Review / 3-Released) for all authored content
  - 4-state for contracts (+3-Pending-Signature, 4-Executed)
  - 4-state for customer-outbound (+3-Submitted-to-Customer, 4-Customer-Approved)
  - 2-state Intake for event-driven (NCR pre-formalization, Incident first response)
  - NEW: HESEM-Internal/Finance/ library
  - NEW: Quality/Incident-Investigation/ (EHS + cyber + safety incidents)
  - NEW: Asset-Master/Lines/ category (special-process equipment NADCAP)
  - 16 Workflow-Lists documented as SharePoint Lists (NOT folders)

3 sites: HESEM-Workspace + HESEM-Internal + HESEM-Archive.
Reference: ANNEX-148 (v8.1 PLM-style 3-state lifecycle architecture).
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


def mk_3state(p: Path) -> None:
    """Standard 3-state lifecycle: 1-Working / 2-In-Review / 3-Released."""
    mkpath(p / "1-Working")
    mkpath(p / "2-In-Review")
    mkpath(p / "3-Released")


def mk_4state_contract(p: Path) -> None:
    """4-state contract lifecycle: 1-Working / 2-In-Review / 3-Pending-Signature / 4-Executed."""
    mkpath(p / "1-Working")
    mkpath(p / "2-In-Review")
    mkpath(p / "3-Pending-Signature")
    mkpath(p / "4-Executed")


def mk_4state_customer(p: Path) -> None:
    """4-state customer-outbound: 1-Working / 2-In-Review / 3-Submitted-to-Customer / 4-Customer-Approved."""
    mkpath(p / "1-Working")
    mkpath(p / "2-In-Review")
    mkpath(p / "3-Submitted-to-Customer")
    mkpath(p / "4-Customer-Approved")


OEMS = ["AMAT", "LAM", "ASML", "TEL"]

CERT_FAMILIES = [
    "CNC-Operator", "Special-Process", "CMM-Operator",
    "Lead-Auditor", "FAI-Engineer", "ESD-Coordinator",
    "FOD-Trainer", "Forklift", "First-Aider", "Fire-Warden",
]


# ============================================================================
# SITE 1 — HESEM-Workspace
# ============================================================================

def build_part_master(s: Path) -> None:
    """Part-Master/{Customer}/{PartNo}/{Rev}/ with 3-state per deliverable."""
    base = s / "Part-Master"
    mk_readme(base, """# Part-Master — Engineering vault (PLM-frozen)

Path: `Part-Master/{CustomerCode}/{PartNumber}/{Rev}/`

Customer-major key (so AMAT engineer with IB scope sees only AMAT parts).
PartNumber is customer's PN. Rev is engineering revision (A, B, C, A01, ...).

## 7 Engineering Deliverables (each with 3-state lifecycle)

1. **01-Drawing** — Customer drawing PDF, DWG
2. **02-Model-3D** — STEP, IGES, MBD with PMI
3. **03-BOM** — Bill of Materials
4. **04-CAM** — NC programs, post-processor refs, tool list
5. **05-Inspection-Plan** — CMM .prg, balloon, control plan, MSA ref
6. **06-Specification** — Special-process spec per customer
7. **07-FAI-Baseline** — Last released FAI reference (read-only)

Plus:
- **08-ECN-PCN-History** — Engineering changes (each ECN has own 3-state)
- **09-Approved-Source-List** — Material + special-process subcon
- **10-Tooling-Fixture-Refs** — Links to Asset-Master
- **11-Customer-Standards-Linked** — Links to Customer-Account/Standards-Library
- **12-Trade-Secret-Restricted** — Recipe/know-how (L4)
- **99-Superseded** — Old Rev when new Rev released

## 3-state lifecycle (every deliverable)

- **1-Working/{Initials}/** — Author draft (Edit per author + Sr peer mentor)
- **2-In-Review/** — Pending review + approval (Read SG-DEP, Approve = SG-Eng-Manager)
- **3-Released/** — Frozen master, read-only after Power Automate promotion (write-blocked)

Job-Dossier/.../01-Engineering-Release/ contains `_release-manifest.json`
with modern-link references to 3-Released — NEVER copy files.
""")

    # Customer roots (seeded 4 OEM + HESEM-Owned for commodity parts)
    for cust in OEMS + ["HESEM-Owned"]:
        mkpath(base / cust)

    # Per-Part-Rev template (universal)
    tmpl = base / "_TEMPLATES" / "{CustomerCode}" / "{PartNumber}" / "{Rev}"
    mk_readme(tmpl, """# Per-Part-Rev template

When a new PartNumber/Rev is created (by Eng Manager), this 12+1 subfolder
structure is provisioned. Each engineering deliverable (01-07) has 3-state.
08-ECN-PCN-History has 3-state per ECN ID. 09-12 are reference data.
""")

    # 7 deliverables with 3-state
    for deliverable in [
        "01-Drawing",
        "02-Model-3D",
        "03-BOM",
        "04-CAM",
        "05-Inspection-Plan",
        "06-Specification",
        "07-FAI-Baseline",
    ]:
        mk_3state(tmpl / deliverable)
        # _Working has per-Initials subfolder template
        mkpath(tmpl / deliverable / "1-Working" / "{AuthorInitials}")

    # ECN-PCN history — each ECN has own 3-state
    mk_3state(tmpl / "08-ECN-PCN-History" / "_TEMPLATES" / "ECN-{Id}")

    # Reference data (single-pass, no lifecycle)
    mkpath(tmpl / "09-Approved-Source-List")
    mkpath(tmpl / "10-Tooling-Fixture-Refs")
    mkpath(tmpl / "11-Customer-Standards-Linked")
    mkpath(tmpl / "12-Trade-Secret-Restricted")
    mkpath(tmpl / "99-Superseded")
    mkpath(tmpl / "00-Status")


def build_job_dossier(s: Path) -> None:
    """Job-Dossier/{CustomerCode}/{YYYY}/{JobNumber}/ with workflow gate order."""
    base = s / "Job-Dossier"
    mk_readme(base, """# Job-Dossier — Execution evidence per Work Order

Path: `Job-Dossier/{CustomerCode}/{YYYY}/{JobNumber}/`

Customer-major, year-secondary, JobNumber leaf. IB folder-level scope.

## Workflow Gate Order (corrected per user feedback)

00-Job-Admin → 01-Engineering-Release → 02-Material-Receiving →
03-Job-Setup → 04-First-Piece-Approval → 05-FAI-Execution →
06-Production-Execution → 07-Special-Process → 08-Final-QC →
09-Ship-Release → 10-Quality-Events → 11-Customer-Touchpoints →
12-Subcontract-Routing → 13-Cost-Roll-Up → 14-Reports → 99-Closed-Archive

## Key SSOT rules

- **01-Engineering-Release** = `_release-manifest.json` + modern-link references
  to Part-Master/.../3-Released/. NO file copy.
- **05-FAI-Execution** uses 4-state customer-outbound lifecycle (filled FAI
  submitted to customer for approval).
- **08-Final-QC** includes Cleanliness-Pack-6 with 8 elements (per ANNEX-141).
- **10-Quality-Events/NCR/_Intake/** = pre-NCR# evidence drop pattern.
- **10-Quality-Events/Concession-Deviation/** = 4-state customer-outbound.
- **13-Cost-Roll-Up** = Restricted (SG-Finance + SG-Exec ONLY, permission override).
""")

    # Seed customer roots
    for cust in OEMS:
        mkpath(base / cust)

    # Per-Job template
    tmpl = base / "_TEMPLATES" / "{CustomerCode}" / "{YYYY}" / "{JobNumber}"
    mk_readme(tmpl, """# Per-Job template — 16 gates following CNC workflow""")

    # Gates in workflow order
    gates_simple = [
        "00-Job-Admin",
        "01-Engineering-Release",
        "02-Material-Receiving",
        "03-Job-Setup",
        "04-First-Piece-Approval",
        "06-Production-Execution",
        "07-Special-Process",
        "08-Final-QC",
        "09-Ship-Release",
        "11-Customer-Touchpoints",
        "12-Subcontract-Routing",
        "14-Reports",
        "99-Closed-Archive",
    ]
    for gate in gates_simple:
        mkpath(tmpl / gate)

    # 05-FAI-Execution: 4-state customer-outbound
    mk_4state_customer(tmpl / "05-FAI-Execution")

    # 08-Final-QC with Cleanliness-Pack-6 sub
    pack6 = tmpl / "08-Final-QC" / "Cleanliness-Pack-6"
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

    # 10-Quality-Events: NCR + Concession-Deviation
    qe = tmpl / "10-Quality-Events"
    mkpath(qe / "NCR" / "_Intake" / "{OperatorInitials}-{Timestamp}")
    mkpath(qe / "NCR" / "_TEMPLATES" / "NCR-{NcrId}")
    for sub in [
        "00-Source-Evidence",
        "01-Containment",
        "02-Disposition-MRB",
        "03-Linked-CAPA-Reference",
    ]:
        mkpath(qe / "NCR" / "_TEMPLATES" / "NCR-{NcrId}" / sub)
    # Concession-Deviation 4-state customer-outbound
    mk_4state_customer(qe / "Concession-Deviation" / "_TEMPLATES" / "DEV-{Id}")

    # 13-Cost-Roll-Up (Restricted)
    mkpath(tmpl / "13-Cost-Roll-Up-Restricted-Finance-Only")


def build_customer_account(s: Path) -> None:
    """Customer-Account/{Code}/ — relationship master."""
    base = s / "Customer-Account"
    mk_readme(base, """# Customer-Account — Relationship master per Customer

Long-lived relationship data (vs PO-Index = transactional per-PO).

Contracts use 4-state lifecycle (Working / In-Review / Pending-Signature / Executed).
PCN-Outbound uses 4-state customer-outbound.
Audit response packs use 4-state customer-outbound.
""")

    for cust in OEMS:
        c = base / cust
        # Contracts: 4-state per contract
        for ctype in ["NDA", "MSA", "LTA", "Quality-Agreement"]:
            mk_4state_contract(c / "Contracts" / ctype / "_TEMPLATES" / "{Id}")
        # Standards library (single-pass)
        mkpath(c / "Standards-Library")
        # Approved-Suppliers flowdown (single-pass)
        mkpath(c / "Approved-Suppliers-Flowdown")
        # Portal account refs
        mkpath(c / "Portal-Account-Refs")
        # Master logs (single-pass — auto-generated by Power Automate)
        mkpath(c / "Complaints-Master-Log")
        mkpath(c / "PCN-Inbound-Master-Log")
        # PCN-Outbound: 4-state customer-outbound per PCN
        mk_4state_customer(c / "PCN-Outbound-Master-Log" / "_TEMPLATES" / "PCN-{Id}")
        # Year-partitioned
        for sub in ["Audits", "Scorecards", "Bulletins", "Demand-Forecast", "ESG-Surveys"]:
            mkpath(c / sub / YYYY)
        # Audit response pack: 4-state customer-outbound
        mk_4state_customer(c / "Audits" / YYYY / "_TEMPLATES" / "AUD-{Id}-Response-Pack")


def build_po_index(s: Path) -> None:
    """PO-Index/{Customer}/{YYYY}/PO-{Num}/ + RFQ-Quote-Authoring."""
    base = s / "PO-Index"
    mk_readme(base, """# PO-Index — Transactional PO documents

Path: `PO-Index/{CustomerCode}/{YYYY}/PO-{Num}/`
Also includes RFQ-{Id} for quote authoring workflow.

Quote authoring uses 4-state customer-outbound lifecycle.
""")

    for cust in OEMS:
        mkpath(base / cust)

    # PO template
    po_tmpl = base / "_TEMPLATES" / "{CustomerCode}" / "{YYYY}" / "PO-{Num}"
    for sub in [
        "00-Source",
        "01-Review",
        "02-Acknowledgement",
        "03-Amendments",
        "04-Linked-Jobs",
        "05-Linked-Parts",
        "06-Invoices",
        "99-Closed",
    ]:
        mkpath(po_tmpl / sub)

    # RFQ template with quote authoring
    rfq_tmpl = base / "_TEMPLATES" / "{CustomerCode}" / "{YYYY}" / "RFQ-{Id}"
    mkpath(rfq_tmpl / "00-Inbound-RFQ")
    mk_4state_customer(rfq_tmpl / "01-Quote-Authoring")
    mkpath(rfq_tmpl / "02-Revision-Rounds")
    mkpath(rfq_tmpl / "99-PO-Spawned")


def build_supplier_master(s: Path) -> None:
    """Supplier-Master/{Code}/ — supplier records."""
    base = s / "Supplier-Master"
    mk_readme(base, """# Supplier-Master — Per-supplier records

Cross-customer (supplier can serve multiple OEMs via APSL-Scope-per-OEM).
Qualification + Audit + Scorecard use 3-state. APSL submitted to customer
uses 4-state customer-outbound.
""")

    tmpl = base / "_TEMPLATES" / "{SupplierCode}"

    # 3-state subs
    for sub in [
        "01-Qualification",
        "06-Annual-Audit-Report",
        "07-Scorecard",
        "13-Counterfeit-Prevention-Attestation",
    ]:
        mk_3state(tmpl / sub)

    # 4-state contract
    mk_4state_contract(tmpl / "02-NDA-SQA" / "_TEMPLATES" / "{Id}")

    # 4-state customer-outbound (APSL approval per OEM)
    for oem in OEMS:
        mk_4state_customer(tmpl / "03-APSL-Scope-per-OEM" / oem)

    # Year-partitioned 3-state
    for sub in ["06-Annual-Audit-Report", "07-Scorecard"]:
        mk_3state(tmpl / sub / YYYY)

    # Single-pass / templates
    mkpath(tmpl / "00-Profile")
    mkpath(tmpl / "04-Process-Cert-Letters-per-OEM")
    # Batch records (per-batch single-pass — transactional from subcon)
    mkpath(tmpl / "05-Batch-Records" / "_TEMPLATES" / "{BatchId}")
    mkpath(tmpl / "08-Sub-PO-History")
    mkpath(tmpl / "09-SCAR-Log")
    mkpath(tmpl / "10-CMRT-EMRT" / YYYY)
    mkpath(tmpl / "11-Banned-Substance")
    mkpath(tmpl / "12-Sub-Tier-Change-Notification")
    mkpath(tmpl / "99-Disqualified")


def build_asset_master(s: Path) -> None:
    """Asset-Master/ with Machines/Gages/Tools/Fixtures/Lines (NEW Lines)."""
    base = s / "Asset-Master"
    mk_readme(base, """# Asset-Master — Equipment lifecycle (cross-customer)

5 categories:
- **Machines/** — CNC mills/lathes/EDM
- **Gages/** — Cal cert canonical home; MSA; OOT
- **Tools/** — Cutting tools (perishable)
- **Fixtures/** — Workholding
- **Lines/** — v8 NEW: Special-Process equipment (anodize, EP, clean, He-leak)

Authored items (Breakdown-RCA, IQ-OQ-PQ, MSA studies) use 3-state.
Routine evidence (cal certs from external lab, PM checklists) single-pass.
""")

    # Machines
    mach = base / "Machines" / "_TEMPLATES" / "{MachineCode}"
    for sub in [
        "00-Profile",
        "01-Capability-Spec",
        "05-Firmware-Updates",
        "08-Backup-CNC-PLC",
        "09-Equipment-Used-Log",
        "99-Decommissioned",
    ]:
        mkpath(mach / sub)
    # 3-state subs
    mk_3state(mach / "06-Breakdown-RCA" / "_TEMPLATES" / "{Id}")
    mk_3state(mach / "07-Spindle-Rebuild-Capex" / "_TEMPLATES" / "{Id}")
    # Year-partitioned single-pass
    for sub in ["02-Geometry-Verification", "03-PM-Records", "04-PdM-Records", "10-Customer-Cap-Cert"]:
        mkpath(mach / sub / YYYY)

    # Gages
    gage = base / "Gages" / "_TEMPLATES" / "{GageCode}"
    for sub in ["00-Profile", "01-Specification", "04-Daily-Check-Log", "99-Retired"]:
        mkpath(gage / sub)
    mkpath(gage / "02-Calibration" / YYYY)
    mkpath(gage / "02-Calibration" / YYYY / "_Lab-Methodology-NDA")
    # MSA 3-state + per-Customer overlay
    mk_3state(gage / "03-MSA-GR-R" / "_generic")
    for oem in OEMS:
        mk_3state(gage / "03-MSA-GR-R" / "_per-Customer" / oem)
    # OOT investigation 3-state
    mk_3state(gage / "05-OOT-Investigation" / "_TEMPLATES" / "{Id}")
    # Maintenance
    mkpath(gage / "06-Maintenance-Repair")

    # Tools
    tools = base / "Tools" / "_TEMPLATES" / "{ToolCode}"
    for sub in ["00-Master-Spec", "01-Preset-Data", "02-Life-History", "99-Scrapped"]:
        mkpath(tools / sub)
    mk_3state(tools / "03-OOT-Investigation" / "_TEMPLATES" / "{Id}")

    # Fixtures
    fix = base / "Fixtures" / "_TEMPLATES" / "{FixtureCode}"
    for sub in ["00-Profile", "02-Usage-Log", "04-Annual-Cert", "99-Retired"]:
        mkpath(fix / sub)
    mk_3state(fix / "01-Design-Pack")
    mk_3state(fix / "01-Validation-Proveout")
    mkpath(fix / "03-Maintenance-Repair")

    # Lines — NEW v8 (special-process equipment)
    lines = base / "Lines" / "_TEMPLATES" / "{LineCode}"
    mk_readme(base / "Lines", """# Lines — Special-Process Equipment

Examples: Anodize-Line-01, EP-Line-01, Clean-Room-01, He-Leak-Chamber, Outgas-Oven.
NADCAP AC7108/AC7102/AC7114 compliance: Bath-Chemistry daily logs,
IQ-OQ-PQ qualification, environmental monitoring.
""")
    for sub in ["00-Profile", "04-Maintenance-Schedule", "99-Decommissioned"]:
        mkpath(lines / sub)
    # 3-state IQ-OQ-PQ qualification
    mk_3state(lines / "01-IQ-OQ-PQ-Qualification" / "_TEMPLATES" / "{Id}")
    # Year-partitioned single-pass
    for sub in [
        "02-Bath-Chemistry",
        "03-Calibration",
        "05-Environmental-Monitor",
        "06-HEPA-Filter-Integrity",
        "07-Bath-Replacement-Log",
        "08-Equipment-Used-Log",
    ]:
        mkpath(lines / sub / YYYY)


def build_lot_trace(s: Path) -> None:
    """Lot-Trace/Heat-Lots + Process-Lots + Finished-Lots/."""
    base = s / "Lot-Trace"
    mk_readme(base, """# Lot-Trace — Heat-lot → process-lot → finished-lot chain""")

    for tier in ["Heat-Lots", "Process-Lots", "Finished-Lots"]:
        tier_tmpl = base / tier / "_TEMPLATES" / "{LotID}"
        for sub in [
            "00-Mill-Cert-or-Origin",
            "01-Receiving-or-Process-Record",
            "02-IQC-or-Process-QC",
            "03-Internal-Lot-Mapping",
            "04-Linked-Jobs",
            "99-Consumed-or-Archived",
        ]:
            mkpath(tier_tmpl / sub)
        # Recall investigation 3-state
        mk_3state(tier_tmpl / "05-Recall-Investigation" / "_TEMPLATES" / "{Id}")


def build_quality(s: Path) -> None:
    """Quality module — CAPA, 8D, Heat-Lot-Investigation, Audit-Findings, etc."""
    base = s / "Quality"
    mk_readme(base, """# Quality — All Quality master records (cross-Job, cross-customer)

This module hosts CANONICAL Quality records. Per-Job NCR lives in
Job-Dossier/.../10-Quality-Events/NCR/ — but CAPA, 8D, Heat-Lot, Audit-Findings
(which span multiple Jobs) are canonical here.

v8 NEW: Incident-Investigation (EHS + cyber + safety cross-link).
""")

    # CAPA-Master — each CAPA has 6+1 phases with 3-state
    capa_tmpl = base / "CAPA-Master" / "_TEMPLATES" / "{CapaId}"
    for sub in [
        "00-Source",
        "01-Containment",
        "06-Linked-NCRs-Reference",
        "07-Read-Across-Assessment",
        "99-Closed",
    ]:
        mkpath(capa_tmpl / sub)
    # 3-state phases
    for phase in ["02-Root-Cause-Analysis", "03-Corrective-Action", "04-Preventive-Action", "05-Effectiveness-Check"]:
        mk_3state(capa_tmpl / phase)

    # 8D-SCAR-Master — 8 D-phases each 4-state customer-outbound
    sd_tmpl = base / "8D-SCAR-Master" / "_TEMPLATES" / "{8dId}"
    for sub in ["00-Customer-Notice-Inbound", "11-Linked-Jobs-Reference", "99-Closed"]:
        mkpath(sd_tmpl / sub)
    for d in ["D1-Team", "D2-Problem", "D3-Containment", "D4-Root-Cause",
              "D5-Corrective-Action", "D6-Implementation", "D7-Preventive", "D8-Recognition"]:
        mk_3state(sd_tmpl / f"0{['D1-Team','D2-Problem','D3-Containment','D4-Root-Cause','D5-Corrective-Action','D6-Implementation','D7-Preventive','D8-Recognition'].index(d)+1}-{d}")
    mk_4state_customer(sd_tmpl / "09-Final-Response-to-Customer")
    mkpath(sd_tmpl / "10-Customer-Closure-Letter")

    # Heat-Lot-Investigation
    hli_tmpl = base / "Heat-Lot-Investigation" / "_TEMPLATES" / "{LotId}"
    for sub in [
        "00-Trigger",
        "01-Scope-Determination",
        "02-Containment",
        "04-Linked-Jobs",
        "99-Closed",
    ]:
        mkpath(hli_tmpl / sub)
    mk_3state(hli_tmpl / "03-Root-Cause-Analysis")
    mk_4state_customer(hli_tmpl / "05-Customer-Notification")

    # Audit-Findings (canonical)
    af_tmpl = base / "Audit-Findings" / "_TEMPLATES" / "{AuditId}"
    for sub in [
        "00-Audit-Reference",
        "01-Finding-Description",
        "02-Affected-Areas",
        "99-Closed",
    ]:
        mkpath(af_tmpl / sub)
    mk_3state(af_tmpl / "03-Response-CA")
    mk_3state(af_tmpl / "04-Effectiveness-Check")

    # Incident-Investigation — v8 NEW (EHS + cyber + safety)
    mk_readme(base / "Incident-Investigation", """# Incident-Investigation — v8 NEW

EHS incident (injury, near-miss, environmental release), cyber incident,
safety incident, fire, chemical spill. _Intake pattern for first-response,
then formalize with Incident ID.
""")
    inc_intake = base / "Incident-Investigation" / "_Intake" / "{ReporterInitials}-{Timestamp}"
    mkpath(inc_intake)
    inc_tmpl = base / "Incident-Investigation" / "_TEMPLATES" / "INC-{Id}"
    for sub in [
        "00-Source-Evidence",
        "01-Classification-EHS-Cyber-Safety",
        "02-Immediate-Containment",
        "06-Customer-Notification-if-Customer-Affecting",
        "99-Closed",
    ]:
        mkpath(inc_tmpl / sub)
    mk_3state(inc_tmpl / "03-Root-Cause-Investigation")
    mk_3state(inc_tmpl / "04-Corrective-Preventive-Action")
    mk_3state(inc_tmpl / "05-Lessons-Learned")

    # Internal-Audits + Management-Review (year-partitioned with 3-state plan/report)
    ia = base / "Internal-Audits" / YYYY / "_TEMPLATES" / "{AuditId}"
    mk_3state(ia / "Plan")
    mk_3state(ia / "Report")
    mkpath(ia / "Findings")

    mr = base / "Management-Review" / YYYY / "_TEMPLATES" / "Q{N}"
    mk_3state(mr / "Pack")

    # Risk-Register + others (3-state annual update)
    mk_3state(base / "Risk-Register" / YYYY)
    mkpath(base / "Improvement-Kaizen" / YYYY)
    mkpath(base / "FOD-Program")
    mkpath(base / "Counterfeit-Prevention")


def build_compliance(s: Path) -> None:
    """Compliance — CMRT, UFLPA, ESG, REACH, Banned-Sub, Trade-Secret-Index, IP."""
    base = s / "Compliance"
    mk_readme(base, """# Compliance — Periodic and adhoc compliance

CMRT/EMRT annual aggregation = 4-state customer-outbound.
ESG submissions (CDP, EcoVadis) = 4-state customer-outbound.
RBA VAP = 4-state.
""")

    for sub in [
        "Export-Classification",
        "UFLPA-Map",
        "REACH-RoHS-per-Part",
        "ASML-HIO",
        "Banned-Substance-Library",
        "Trade-Secret-Master-Index",
    ]:
        mkpath(base / sub)

    # IP Patent/Trademark filings 4-state
    mk_4state_customer(base / "IP-Patent-Filings" / "_TEMPLATES" / "{CaseId}")
    mk_4state_customer(base / "IP-Trademark-Filings" / "_TEMPLATES" / "{CaseId}")

    # Annual customer-outbound 4-state
    for sub in [
        "CMRT-Annual-Roll-Up",
        "EMRT-Cobalt-Annual",
        "RBA-SAQ-VAP",
        "Modern-Slavery-Statement",
        "Carbon-Scope-1-2-3-Inventory",
        "CDP-EcoVadis-Submission",
    ]:
        mk_4state_customer(base / sub / YYYY)

    # Customer CoC signed
    for oem in OEMS:
        mk_4state_contract(base / "Customer-CoC-Signed" / oem)


def build_training(s: Path) -> None:
    """Training — Cert master + customer-approved operators."""
    base = s / "Training"
    mk_readme(base, """# Training — Cert master + skills

SSOT cho cert. Employee-Records/04-Training-Cert-Link chỉ giữ link.
""")

    mkpath(base / "Skills-Matrix")
    mkpath(base / "Cert-Master-Register")

    # Annual plan + customer-pack 4-state
    mk_3state(base / "Annual-Plan" / YYYY)
    mkpath(base / "Competency-Snapshot" / YYYY)
    mkpath(base / "Effectiveness-KPI" / YYYY)
    for oem in OEMS:
        mkpath(base / "Customer-Approved-Operators" / oem)
        mk_4state_customer(base / "Customer-Audit-Pack" / oem / YYYY)
    for cert in CERT_FAMILIES:
        mkpath(base / "Critical-Certs" / cert)


def build_workspace(s: Path) -> None:
    """HESEM-Workspace main site."""
    mk_readme(s, """# HESEM-Workspace — Main transactional site

12 top-level libraries (Part-Master is PEER with Job-Dossier — PLM industry pattern):

1. **Part-Master/** — Engineering vault (Customer/PartNo/Rev keyed, 3-state lifecycle)
2. **Job-Dossier/** — Execution evidence (Customer/Year/JobNum keyed, 16-gate workflow)
3. **Customer-Account/** — Relationship master per Customer
4. **PO-Index/** — Transactional PO documents + RFQ-Quote authoring
5. **Supplier-Master/** — Per-supplier records
6. **Asset-Master/** — Machines, Gages, Tools, Fixtures, Lines (v8 NEW)
7. **Lot-Trace/** — Heat-lot → process-lot → finished-lot chain
8. **Quality/** — CAPA-Master, 8D-SCAR, Heat-Lot-Investigation, Audit-Findings,
                  Incident-Investigation (v8 NEW), Internal-Audits, MR, Risk
9. **Compliance/** — CMRT, UFLPA, ESG roll-up, IP filings
10. **Training/** — Cert-Master, Skills-Matrix, Customer-Approved-Operators
11. **Reports/** — Company-wide reporting
12. **Workflow-Lists/** (SharePoint Lists, NOT folders — see _README in folder)

## Universal lifecycle patterns

- **3-state** (default authoring): 1-Working → 2-In-Review → 3-Released
- **4-state contract**: 1-Working → 2-In-Review → 3-Pending-Signature → 4-Executed
- **4-state customer-outbound**: 1-Working → 2-In-Review → 3-Submitted-to-Customer → 4-Customer-Approved
- **2-state Intake**: _Intake/{Operator}-{Timestamp} → formal-ID/ (NCR + Incident)
- **Single-pass**: Released only (external receive, no authoring)

## SSOT rules
- Each file canonical at exactly 1 path
- MOM = SSOT for Manual/Policy/SOP/WI/RACI/ANNEX/Training-curriculum/JD/Form-templates
- M365 = transactional evidence only
- Job-Dossier/01-Engineering-Release contains modern-link references to Part-Master/Released — NO copy
""")

    build_part_master(s)
    build_job_dossier(s)
    build_customer_account(s)
    build_po_index(s)
    build_supplier_master(s)
    build_asset_master(s)
    build_lot_trace(s)
    build_quality(s)
    build_compliance(s)
    build_training(s)

    # Reports
    for period in ["Daily", "Weekly", "Monthly", "Quarterly", "Annual"]:
        mkpath(s / "Reports" / period)

    # Workflow-Lists documentation (NOT folders for files)
    wl = s / "Workflow-Lists-Specification-NOT-FOLDERS"
    mk_readme(wl, """# Workflow-Lists — SharePoint LISTS (NOT folders)

**DO NOT CREATE FILES HERE.** This is documentation only.

The 16 Workflow-Lists are provisioned as SharePoint Lists by PnP PowerShell,
NOT as folders. Each List has metadata columns + lookups + Power Automate flow.

## 16 Workflow-Lists (v8.1)

| # | List | Canonical-Path target |
|---|---|---|
| 1 | Job-Master-List | Job-Dossier/{Cust}/{YYYY}/{JobNum}/ |
| 2 | Part-Master-List | Part-Master/{Cust}/{PartNo}/{Rev}/ |
| 3 | NCR-Master-List | Job-Dossier/.../10-Quality-Events/NCR/{NcrId}/ |
| 4 | CAPA-Master-List | Quality/CAPA-Master/{CapaId}/ |
| 5 | 8D-SCAR-Master-List | Quality/8D-SCAR-Master/{8dId}/ |
| 6 | ECO-Master-List | Part-Master/.../08-ECN-PCN-History/ECN-{Id}/ |
| 7 | PCN-Master-List | Customer-Account/.../PCN-Inbound + PCN-Outbound + Part-Master/.../08 |
| 8 | FAI-Master-List | Part-Master/.../07-FAI-Baseline + Job-Dossier/.../05-FAI-Execution |
| 9 | Customer-Audit-Master-List | Customer-Account/.../Audits/{YYYY}/ |
| 10 | Internal-Audit-Master-List | Quality/Internal-Audits/{YYYY}/ |
| 11 | Calibration-Due-List | Asset-Master/Gages/{Id}/02-Calibration/{YYYY}/ |
| 12 | PM-Schedule-Master | Asset-Master/Machines+Lines/{Id}/PM/{YYYY}/ |
| 13 | Cert-Expiry-Watch-90d | Training/Cert-Master-Register/ |
| 14 | Customer-Portal-Evidence-Log | PO-Index + Customer-Account master logs |
| 15 | Action-Tracker-Master | (cross-cutting) |
| 16 | Supplier-CMRT-Master-List | Supplier-Master/{Sup}/10-CMRT-EMRT/{YYYY}/ |

## Power Automate flow design
- Trigger: SharePoint file event OR Epicor webhook
- Idempotency: primary ID (NcrId, CapaId, FaiId, etc.)
- Failure: 3-retry then alert Action-Tracker-Master
- SLA: 5 min from file save to List update
- Job-Closure flow: Job-Dossier move to Archive → rewrite Canonical-Path on all linked Lists
""")


# ============================================================================
# SITE 2 — HESEM-Internal
# ============================================================================

def build_internal(s: Path) -> None:
    mk_readme(s, """# HESEM-Internal — Strict-permission internal data

6 libraries (Finance is v8 NEW):
- **HR/** — Employee dossiers (PII, named-only)
- **Finance/** — v8 NEW: Monthly-Close, External-Audit, Capex, Open-Book Customer Costing
- **IT/** — System records
- **OT/** — CNC/PLC/CMM backup (AIR-GAPPED)
- **Legal/** — Contracts (non-customer), Insurance, Litigation, IP
- **Executive/** — BOD, Strategy, ERM

Authored content uses 3-state or 4-state per scenario.
SSOT rule: Policies live in MOM. Here only operational evidence.
""")

    # --- HR/ ----------------------------------------------------------------
    hr = s / "HR"
    EMP_SUBS = [
        "00-Identity",
        "01-Recruitment-Offer",
        "07-Leave-Attendance",
        "09-Assets-Issued",
        "12-Offboarding",
        "13-Legal-Hold",
    ]
    emp_tmpl = hr / "Employees" / "_TEMPLATES" / "{EmployeeID}-{Name}"
    for sub in EMP_SUBS:
        mkpath(emp_tmpl / sub)
    # 4-state contract
    mk_4state_contract(emp_tmpl / "02-Contract-Legal" / "_TEMPLATES" / "{Id}")
    # 3-state authoring
    mkpath(emp_tmpl / "03-Onboarding-Access")
    mkpath(emp_tmpl / "04-Training-Cert-LINK-ONLY")
    mk_3state(emp_tmpl / "05-Performance" / YYYY / "Annual-Review")
    mkpath(emp_tmpl / "06-Payroll-Restricted")
    mkpath(emp_tmpl / "08-Medical-Restricted")
    mk_3state(emp_tmpl / "10-Transfer-Promotion" / "_TEMPLATES" / "{Id}")
    mk_3state(emp_tmpl / "11-Disciplinary-Restricted" / "_TEMPLATES" / "{Id}")

    mkpath(hr / "Recruitment-Pipeline")
    mkpath(hr / "Working-Hours" / YYYY)
    mkpath(hr / "RBA-Worker-Voice" / YYYY)

    # --- Finance/ — v8 NEW --------------------------------------------------
    fin = s / "Finance"
    mk_readme(fin, """# Finance — v8 NEW library

Authored content: Monthly-Close pack, External-Audit response, Capex business
case, Open-Book Customer Costing. Cost-Roll-Up per Job feeds from Epicor.
""")
    mk_3state(fin / "Monthly-Close" / YYYY / "_TEMPLATES" / "{Month}")
    mk_4state_customer(fin / "External-Audit" / YYYY / "Response-Pack")
    mkpath(fin / "Cost-Roll-Up-from-Epicor" / YYYY)
    mk_3state(fin / "Capex" / "_TEMPLATES" / "AFE-{Id}")
    for oem in OEMS:
        mk_4state_customer(fin / "Open-Book-Customer-Costing-Restricted" / oem)
        mk_4state_customer(fin / "Customer-Scorecard-Response" / oem / YYYY)

    # --- IT/ ----------------------------------------------------------------
    it = s / "IT"
    # Each area: Current + YYYY + 3-state for authored reports
    for area in [
        "Access-Identity-IAM",
        "M365-Purview-Config",
        "DLP-Policy",
        "Backup-Restore",
        "Vulnerability-Patch",
        "CMDB-Endpoint",
        "RPA-Run-Logs",
        "Vendor-Security",
        "Network-Diagram",
        "Audit-Guest-Access",
    ]:
        mkpath(it / area / "Current")
        mkpath(it / area / YYYY)
    # SOC incident: 3-state per incident
    mk_3state(it / "SOC-Sentinel-Incident" / "_TEMPLATES" / "INC-{Id}")
    # DR-BCP drill: 3-state annual report
    mk_3state(it / "DR-BCP-Drill" / YYYY / "Report")

    # --- OT/ (air-gapped) ---------------------------------------------------
    ot = s / "OT"
    mkpath(ot / "CNC-Param-Backup" / "_TEMPLATES" / "{MachineCode}" / YYYY)
    mkpath(ot / "PLC-Ladder-Backup" / "_TEMPLATES" / "{MachineCode}" / YYYY)
    mkpath(ot / "CMM-Program-Backup" / "_TEMPLATES" / "{CMMCode}")
    mkpath(ot / "Post-Processor-Library")
    mkpath(ot / "Kinematic-XML")
    mkpath(ot / "DNC-Server-Config")
    mkpath(ot / "CAD-CAM-License-Backup" / YYYY)
    mkpath(ot / "OT-Incident-Playbook")
    mkpath(ot / "Air-Gap-Workstation-Config")

    # --- Legal/ -------------------------------------------------------------
    legal = s / "Legal"
    # Contracts-General 4-state
    mk_4state_contract(legal / "Contracts-General" / "_TEMPLATES" / "{Type}" / "{Id}")
    # Insurance 4-state (broker)
    for sub in ["PL", "DO", "Property", "Cyber", "Cargo"]:
        mk_4state_contract(legal / "Insurance-Policies" / sub)
    # Litigation 4-state
    mk_4state_customer(legal / "Litigation-Hold" / "_TEMPLATES" / "{CaseId}")
    # IP 4-state (Filing → NOIP/Court → Granted)
    mk_4state_customer(legal / "IP-Patents" / "_TEMPLATES" / "{CaseId}")
    mk_4state_customer(legal / "IP-Trademarks" / "_TEMPLATES" / "{CaseId}")
    mk_3state(legal / "Authority-Matrix")

    # --- Executive/ ---------------------------------------------------------
    ex = s / "Executive"
    mk_3state(ex / "Strategy-5Y-AOP" / YYYY)
    mk_3state(ex / "ERM-Risk-Register" / YYYY)
    # BOD: special 3-state with Pre-Distribution
    bod_q = ex / "BOD-Pack" / YYYY / "_TEMPLATES" / "Q{N}"
    mkpath(bod_q / "1-Working")
    mkpath(bod_q / "2-Pre-BOD-Distribution")
    mkpath(bod_q / "3-Released-to-BOD")
    mk_3state(ex / "BOD-Minutes" / YYYY / "_TEMPLATES" / "Q{N}")
    mkpath(ex / "BOD-Resolutions" / YYYY)
    mk_4state_customer(ex / "Investor-Updates" / YYYY / "_TEMPLATES" / "Q{N}")


# ============================================================================
# SITE 3 — HESEM-Archive
# ============================================================================

def build_archive(s: Path) -> None:
    mk_readme(s, """# HESEM-Archive — Long-term retention + legal hold""")
    mkpath(s / "Closed-Year-Archive" / YYYY)
    mkpath(s / "Superseded-Documents")
    mkpath(s / "Legal-Hold-Litigation")
    mkpath(s / "Locked-Job-Pack-Final" / YYYY)
    mkpath(s / "Disposition-Log" / YYYY)
    mkpath(s / "Records-Retention-Schedule")
    mkpath(s / "List-Row-Destruction-Trail" / YYYY)


# ============================================================================
# MAIN
# ============================================================================

def build_blueprint() -> None:
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

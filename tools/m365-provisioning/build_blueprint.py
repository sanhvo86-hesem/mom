#!/usr/bin/env python3
"""
Build M365 folder blueprint v10 — Semi-Equipment CNC edition.

v10 (2026-05-19) — Hub-Spoke + IB Explicit architecture.

  Key reversals from v7-v9 (mandated by research):
    - Purview Information Barriers (IB v2) bind at SITE level, NOT folder level.
    - A single multi-customer site CANNOT enforce SQEP-grade NDA isolation
      between AMAT / LAM / ASML / TEL. Microsoft Learn citation:
      https://learn.microsoft.com/en-us/purview/information-barriers-sharepoint
    - Therefore v10 splits into a navigation Hub + four customer-spoke sites,
      each in IB Explicit mode + sensitivity-label encryption (Option E hybrid
      from M365-permission research).

  Architecture (8 sites):
    1. HESEM-Hub                    — IB Open, navigation + cross-customer rollups (no IP)
    2. HESEM-AMAT                   — IB Explicit, segment=AMAT
    3. HESEM-LAM                    — IB Explicit, segment=LAM
    4. HESEM-ASML                   — IB Explicit, segment=ASML
    5. HESEM-TEL                    — IB Explicit, segment=TEL
    6. HESEM-Internal-Workspace     — IB Open, 16 dept libraries (Private + Shared)
    7. HESEM-Quality-QMS            — IB Open, ISO/AS9100/RBA + Standards library
    8. HESEM-Engineering-IP         — IB Open, HESEM trade-secret + DKE library
    9. HESEM-Archive                — long-term retention (Purview-labeled)

  Customer-spoke zones (×4 OEM):
    00-Customer-Source-IP/          — read-only, new rev = new sibling folder
                                      (drawings, 3D models, customer specs, ECN inbound, customer SQM)
    10-HESEM-Engineering/           — HESEM-authored, 3-state lifecycle
                                      (BOM-internal, CAM, router, inspection plan, FAI baseline, WI, tooling, ECN internal)
    20-PO-Lots/{YYYY}/{PO}/{Lot}/   — per-lot 11-folder dossier + customer-delta
    30-SCAR-8D/{SCAR-No}/           — D0-D8 milestones, 8-discipline corrective action
    40-Customer-Audits/             — audit findings + CAPA
    50-Compliance-CustomerSpecific/ — mirror of canonical compliance docs
    60-Scorecards/                  — customer-issued scorecards (Q-cadence)
    70-ECN-Acknowledgements/        — Power Automate List handoff (pointer)
    80-Portal-Exports/              — docs exported from customer portal
                                      (Ariba / MyLam / SupplierNet / TEL-portal)
    90-Inbox/                       — hash-archived raw inbound (chain of custody)

  Per-lot 11-folder common dossier (every customer):
    01-CofC, 02-MillCert-CMTR, 03-Dimensional-Report, 04-FAI-Lot-Specific (if any),
    05-Surface-Finish-Ra, 06-Cleanliness-Particle, 07-Special-Process-Certs,
    08-Welding-Records, 09-Helium-Leak, 10-Packaging-Photos, 11-Shipping-CofO-Customs,
    12-Customer-Delta (GSA Grade for ASML / PCC for LAM / Shoryushin for TEL / 0250-xxxxx for AMAT)

  SEMI standards scope corrections (per research):
    SEMI T7  = wafer back-mark only          → use T20/T21/T22 for part authentication
    SEMI F60 = ESCA passive layer test       → NOT a gas-system spec
    SEMI F70 = particle test on gas systems  → NOT LCDS (LCDS = F57 + F41/F108)
    SEMI F78 = GTA weld practice + F81       → NOT a gas-component spec
    SEMI E155 = MotionNet fieldbus           → NOT pedestal assembly (no such SEMI std)

Reference: ANNEX-149 (v10 semi-equipment CNC blueprint).
Research backing: _reports/v10-semi-equipment/agent-1..4.
"""

from __future__ import annotations
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).parent / "blueprint"

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------
OEMS = ["AMAT", "LAM", "ASML", "TEL"]

# Per-customer portal name (Agent 2 finding)
CUSTOMER_PORTAL = {
    "AMAT": "AMAT-Ariba-SecureTransfer",
    "LAM":  "MyLam-Ariba",
    "ASML": "SupplierNet-SupplierIdentities",
    "TEL":  "TEL-Portal-BCWeb",
}

# Per-customer cleanliness regime (Agent 2 finding)
CUSTOMER_CLEANLINESS_REGIME = {
    "AMAT": "AMAT-0250-xxxxx + IEST-STD-CC1246",
    "LAM":  "LAM-PCC-internal + Ra<=0.4um chamber + ASTM-E595",
    "ASML": "GSA-Grade-1-2-4 + SEMI-F57-F70 + ISO-14644-5",
    "TEL":  "TEL-internal + SEMI-F-series + Shoryushin",
}

# Per-customer FAI template (Agent 2 finding)
CUSTOMER_FAI_TEMPLATE = {
    "AMAT": "AS9102-equiv (AMAT-templated Form-1/2/3)",
    "LAM":  "AS9102-equiv (Lam-templated)",
    "ASML": "AS9102-equiv + GSA-grade-release audit",
    "TEL":  "Shoryushin-初流審 (AS9102-equivalent)",
}

# 11-folder common per-lot dossier
PER_LOT_DOSSIER = [
    "01-CofC",
    "02-MillCert-CMTR",
    "03-Dimensional-Report",
    "04-FAI-Lot-Specific",
    "05-Surface-Finish-Ra-F19",
    "06-Cleanliness-Particle-F70",
    "07-Special-Process-Certs",
    "08-Welding-Records-F78-F81",
    "09-Helium-Leak-F1",
    "10-Packaging-Photos",
    "11-Shipping-CofO-Customs",
    "12-Customer-Delta",
]

# Customer-spoke zones (top-level under each customer site)
CUSTOMER_ZONES = [
    "00-Customer-Source-IP",
    "10-HESEM-Engineering",
    "20-PO-Lots",
    "30-SCAR-8D",
    "40-Customer-Audits",
    "50-Compliance-CustomerSpecific",
    "60-Scorecards",
    "70-ECN-Acknowledgements",
    "80-Portal-Exports",
    "90-Inbox",
]

# Customer-source IP sub-zones (read-only, no 3-state)
CUSTOMER_SOURCE_SUBZONES = [
    "01-Drawings",
    "02-Models-3D",
    "03-Specifications",   # AMAT 0250-xxxxx / ASML GSA / LAM PCC / TEL internal
    "04-ECN-Inbound",
    "05-Customer-SQM-NDA-Vault",
]

# HESEM-Engineering deliverables (HESEM-authored, 3-state)
HESEM_ENG_DELIVERABLES = [
    "01-BOM-Internal",
    "02-CAM-NC-Programs",
    "03-Process-Plan-Router",
    "04-Inspection-Plan-Ballooned",
    "05-FAI-Baseline-Released",
    "06-Work-Instruction-Local",
    "07-Tooling-Fixture-Design",
    "08-ECN-Internal-Response",
]

# SCAR 8D milestones
SCAR_8D_STAGES = [
    "D0-Symptom-Logged",
    "D1-Team-Formed",
    "D2-Problem-Described",
    "D3-Containment-Action",
    "D4-Root-Cause-Analysis",
    "D5-Permanent-Corrective-Action",
    "D6-Implementation-Verification",
    "D7-Systemic-Prevention",
    "D8-Closure-Recognition",
]

# Compliance per-customer mirror (canonical lives in HESEM-Quality-QMS)
COMPLIANCE_MIRROR_TYPES = [
    "ISO-9001-Cert",
    "ISO-14001-Cert",
    "ISO-45001-Cert",
    "RBA-Self-Assessment",
    "CMRT-Conflict-Minerals",
    "RoHS-Declaration",
    "REACH-SVHC-Declaration",
    "Counterfeit-Prevention-AS6174-Statement",
    "NIST-SP-800-171-Cyber-Posture",
    "USMCA-Country-of-Origin",
]

# 16 HESEM departments
DEPTS = [
    "EXEC", "QMS", "QA", "METRO", "ENG", "PRO", "SP", "MNT",
    "SCM", "SCS", "FIN", "HR", "EHS", "IT", "ERP", "LEGAL",
]

# Bespoke per-dept top folders (synthesized from v9 4-agent reports + bespoke design)
DEPT_BESPOKE = {
    "EXEC": [
        "01-Strategy-OKR-Workspace", "02-Board-PreRead-Drafts",
        "03-Capital-Decisions-Workspace", "04-Customer-Strategic-Relationship",
        "05-Investor-IR-Comms-Workspace", "06-Executive-Briefing-Notes",
        "07-Crisis-Response-WarRoom", "08-MgmtReview-Prep-Materials",
        "09-EXEC-Risk-Register-Working", "10-EXEC-Travel-Calendar",
        "11-Strategic-Initiatives-Tracker",
    ],
    "QMS": [
        "01-Controlled-Doc-Pipeline-Drafts", "02-Internal-Audit-Schedule-WorkArea",
        "03-MgmtReview-Quarterly-WorkArea", "04-MOC-Change-Mgmt-Queue",
        "05-RBA-Compliance-Workspace", "06-ISO-Surveillance-Audit-Prep",
        "07-CAPA-Effectiveness-Verification-Queue", "08-Policy-Refresh-Calendar",
        "09-Risk-Register-Working-Master",
    ],
    "QA": [
        "01-NCR-Disposition-Workspace-Active", "02-NCR-Intake-Pre-Formalization",
        "03-FAI-Programme-Active-Parts", "04-In-Process-Sampling-Plan-Library",
        "05-Customer-Audit-WarRoom-Active", "06-SCAR-Coordination-Workspace",
        "07-MRB-Material-Review-Board-Active", "08-Outgoing-Inspection-Reports",
        "09-Calibration-Out-of-Tolerance-Queue", "10-DPPM-Trend-Workspace",
        "11-Customer-Complaint-Triage-Queue",
    ],
    "METRO": [
        "01-Calibration-Active-Queue", "02-CMM-Programs-Library",
        "03-Gauge-RnR-MSA-Studies", "04-Inspection-Equipment-Maintenance-Log",
        "05-Profilometer-Trace-Library", "06-Cleanroom-Lab-Daily-Ops",
        "07-Standards-Reference-Library-Mirror", "08-Special-Calibration-Outsource-Queue",
        "09-Lab-NCR-Investigation-Workspace", "10-NPI-First-Article-Metrology-Plan",
    ],
    "ENG": [
        "01-NPI-Project-Workspace", "02-Drawing-Markup-Pre-Release",
        "03-CAM-Development-Sandbox", "04-Tooling-Fixture-Design-Sandbox",
        "05-FMEA-Design-PFMEA-Drafts", "06-Process-Capability-Improvement",
        "07-Reverse-Engineering-Workspace", "08-ECN-Engineering-Response-Drafts",
        "09-Engineering-Lessons-Learned-Library", "10-Customer-Standards-Cache-Mirror",
        "11-Trade-Secret-Process-Recipe-Drafts", "12-Cross-Train-Material-Library",
        "13-Engineering-Calibration-Master-Models",
    ],
    "PRO": [
        "01-Production-Schedule-Active", "02-Routing-Active-WorkOrders",
        "03-Excursion-Pre-NCR-Ledger", "04-Setup-Sheet-Library-Mirror",
        "05-Tool-Crib-Daily-Log", "06-Operator-Handoff-Notes",
        "07-Yield-Scrap-Daily-Workspace", "08-Cell-Performance-Workspace",
        "09-Throughput-Capacity-Workspace", "10-Production-Shift-Meeting-Notes",
        "11-Cell-Improvement-Kaizen-Workspace",
    ],
    "SP": [
        "01-Surface-Treatment-Daily-Ops", "02-EP-Passivation-Batch-Records",
        "03-Anodize-Batch-Records", "04-Heat-Treat-Pyrometry-Records",
        "05-NDT-Daily-Inspection-Log", "06-Welding-WPS-Operator-Log",
        "07-Outsource-Special-Process-Queue", "08-Process-Bath-Daily-Readiness",
        "09-Special-Process-NCR-Workspace",
    ],
    "MNT": [
        "01-PM-Schedule-Active", "02-Breakdown-Response-Log",
        "03-Asset-Daily-Readiness-Checklist", "04-Spare-Parts-Crib-Workspace",
        "05-Calibration-Outsource-Coordination", "06-Facility-Maintenance-Queue",
        "07-Utility-System-Daily-Ops-Workspace", "08-OEE-Workspace",
        "09-Predictive-Maintenance-Sensor-Data", "10-MNT-Improvement-Workspace",
    ],
    "SCM": [
        "01-Strategic-Sourcing-Workspace", "02-Operational-Buyer-Queue-Active",
        "03-Supplier-Intelligence-Dossier-Library", "04-Commodity-Market-Scan",
        "05-Supplier-Onboarding-Pipeline", "06-Supplier-Audit-Coordination",
        "07-Counterfeit-Prevention-ASL-Workspace-AS6174", "08-Supplier-Risk-Register-Working",
        "09-Inventory-Replenishment-Strategic", "10-Inventory-Replenishment-Operational",
        "11-Sub-Tier-Audit-Coordination", "12-Mill-Sub-Tier-FlowDown-Library",
        "13-Approved-Supplier-List-Working-Master", "14-Cost-Reduction-Initiatives-Tracker",
    ],
    "SCS": [
        "01-Customer-Account-Plans-Library", "02-Opportunity-Pipeline-Workspace",
        "03-Quote-Pricing-Workspace", "04-Account-Team-Meeting-Notes",
        "05-Customer-Relationship-History", "06-OEM-Portal-Onboarding-Workstream",
        "07-Customer-Comms-Inbox-Triage", "08-Customer-Visit-Coordination",
        "09-Win-Loss-Lessons-Learned", "10-Quote-Conversion-Funnel-Workspace",
    ],
    "FIN": [
        "01-Close-Calendar-Active-Quarter", "02-AP-Vendor-Invoice-Queue",
        "03-AR-Customer-Invoice-Queue", "04-Vendor-Master-Change-Queue",
        "05-Customer-Master-Change-Queue", "06-Bank-Reconciliation-Workspace",
        "07-Treasury-Cash-Forecast-Working", "08-Capex-Approval-Workspace",
        "09-Forecast-Budget-Working", "10-Internal-Controls-Walkthrough-Workspace",
        "11-Tax-Filing-Calendar", "12-Costing-Standards-Workspace",
        "13-Audit-PBC-Provided-By-Client-Workspace", "14-FIN-Risk-Register-Working",
    ],
    "HR": [
        "01-Onboarding-Pipeline-Pre-Hire", "02-Employee-Records-Working",
        "03-Performance-Review-Cycle-Workspace", "04-Compensation-Cycle-Workspace",
        "05-Recruiting-Active-Requisitions", "06-Recruiting-Candidate-Pipeline",
        "07-Training-Program-Workspace", "08-Training-Compliance-Tracker",
        "09-Disciplinary-Cases-Working", "10-Grievance-Cases-Working",
        "11-RBA-Working-Hours-Tracker", "12-RBA-Pulse-Action-Board",
        "13-RBA-Worker-Voice-Workspace", "14-Headcount-Plan-Working",
        "15-Payroll-Cycle-Workpapers", "16-PDPL-DataSubject-Request-Queue",
        "17-Exit-Offboarding-Pipeline", "18-Engagement-Pulse-Surveys-Workspace",
    ],
    "EHS": [
        "01-Incident-Intake-Pre-Formalization", "02-Near-Miss-Ledger-Working",
        "03-Hazard-Identification-Walkthroughs", "04-Risk-Assessment-Workspace-ISO45001",
        "05-Aspects-Impact-Assessment-Workspace-ISO14001", "06-Emergency-Drill-Calendar",
        "07-RBA-Working-Data-Assembly-Workspace", "08-Permit-To-Work-Daily-Ledger",
    ],
    "IT": [
        "01-Helpdesk-Ticket-Queue", "02-New-Hire-IT-Onboarding-Tracker",
        "03-Offboarding-Asset-Return-Tracker", "04-Asset-Inventory-Working",
        "05-Patch-Calendar-Workspace", "06-Backup-Verification-Log",
        "07-Network-Change-Queue", "08-Vendor-Software-License-Tracker",
        "09-SOC-Alert-Triage-Board", "10-Cyber-Incident-Workspace-Pre-Formal",
        "11-Endpoint-Compliance-Workspace", "12-Conditional-Access-Policy-Workspace",
        "13-Identity-Lifecycle-Working", "14-Cyber-Awareness-Training-Tracker",
    ],
    "ERP": [
        "01-MDCR-Master-Data-Change-Request-Working-Set", "02-Epicor-User-Request-Queue",
        "03-OEM-Portal-Credentials-Vault-Privileged",
        "04-OEM-Portal-Onboarding-Workstream", "05-Workflow-Logic-Change-Queue",
        "06-Custom-Field-UD-Change-Queue", "07-Integration-Mapping-Workspace",
        "08-Data-Migration-Workspace", "09-ERP-Upgrade-Patching-Workspace",
        "10-Report-Library-Working", "11-Dashboard-Library-Working",
        "12-ERP-User-Training-Working",
    ],
    "LEGAL": [
        "01-Contract-Drafting-Workspace", "02-NDA-Library-Working",
        "03-IP-Trade-Secret-Register-Working", "04-Litigation-Hold-Pre-Filing",
        "05-Regulatory-Filing-Calendar", "06-Commercial-Dispute-Workspace",
        "07-Customer-Contract-Negotiation-Workspace", "08-Supplier-Contract-Negotiation-Workspace",
        "09-Corporate-Governance-Workspace", "10-Data-Protection-PDPL-Register-Working",
        "11-Export-Control-ITAR-EAR-Working", "12-Insurance-Claims-Workspace",
    ],
}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def mkpath(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)
    keep = p / ".gitkeep"
    if not keep.exists():
        keep.touch()


def mk_readme(p: Path, content: str) -> None:
    p.mkdir(parents=True, exist_ok=True)
    (p / "_README.md").write_text(content, encoding="utf-8")


def mk_3state(p: Path) -> None:
    """3-state lifecycle: 1-Working / 2-In-Review / 3-Released."""
    mkpath(p / "1-Working")
    mkpath(p / "2-In-Review")
    mkpath(p / "3-Released")


def mk_4state_contract(p: Path) -> None:
    mkpath(p / "1-Working")
    mkpath(p / "2-In-Review")
    mkpath(p / "3-Pending-Signature")
    mkpath(p / "4-Executed")


def mk_4state_customer(p: Path) -> None:
    mkpath(p / "1-Working")
    mkpath(p / "2-In-Review")
    mkpath(p / "3-Submitted-to-Customer")
    mkpath(p / "4-Customer-Approved")


def mk_2state_intake(p: Path) -> None:
    mkpath(p / "1-Intake-Drafts")
    mkpath(p / "2-Promoted-to-Formal-Record")


# -----------------------------------------------------------------------------
# SITE 1 — HESEM-Hub (IB Open, navigation only, NO IP)
# -----------------------------------------------------------------------------
def build_hub(s: Path) -> None:
    mk_readme(s, """# SITE 1 — HESEM-Hub (Navigation only)

Purview Information Barrier mode: **Open**.
Sensitivity label default: **HESEM-Internal** (non-encrypted).

This site exists ONLY for cross-customer navigation and aggregated KPI rollups
where individual customer detail is NOT exposed. It MUST NOT host customer-IP.

Zones:
- 01-Navigation              — site map, links to spoke sites
- 02-Company-Announcements   — internal news, all-hands
- 03-Cross-Customer-KPI-Rollups — aggregated metrics only (no per-customer detail)
- 04-Operational-Calendar    — company-wide events, audits, training
- 05-Communities-of-Practice — cross-dept knowledge sharing
- 06-Cross-Functional-Projects — multi-dept initiatives that are NOT customer-keyed
- 07-Onboarding-Wayfinder    — new-hire orientation, "where is X"
""")
    for z in [
        "01-Navigation",
        "02-Company-Announcements",
        "03-Cross-Customer-KPI-Rollups/{YYYY-Q}",
        "04-Operational-Calendar/{YYYY}",
        "05-Communities-of-Practice/CoP-CNC",
        "05-Communities-of-Practice/CoP-Quality",
        "05-Communities-of-Practice/CoP-LeanContinuous",
        "05-Communities-of-Practice/CoP-DataAnalytics",
        "06-Cross-Functional-Projects/{ProjectCode}",
        "07-Onboarding-Wayfinder",
    ]:
        mkpath(s / z)


# -----------------------------------------------------------------------------
# SITE 2-5 — HESEM-{AMAT|LAM|ASML|TEL} customer spokes (IB Explicit)
# -----------------------------------------------------------------------------
def build_customer_spoke(s: Path, oem: str) -> None:
    portal = CUSTOMER_PORTAL[oem]
    cleanliness = CUSTOMER_CLEANLINESS_REGIME[oem]
    fai = CUSTOMER_FAI_TEMPLATE[oem]

    mk_readme(s, f"""# SITE — HESEM-{oem} customer spoke

Purview Information Barrier mode: **Explicit**.
IB segment: `SG-CUSTOMER-{oem}` (Entra attribute or group-MemberOf).
Sensitivity label default: **Customer:{oem}-Confidential** (encrypted; SG-CUSTOMER-{oem} only).

Portal channel: **{portal}**
Cleanliness regime: **{cleanliness}**
FAI template: **{fai}**

10 zones (top level under this site):
  00-Customer-Source-IP          — READ-ONLY customer artifacts (drawings, 3D, specs, ECN-in, customer SQM)
  10-HESEM-Engineering           — HESEM-authored derivatives, 3-state lifecycle
  20-PO-Lots                     — per-lot 11-folder dossier + customer-delta
  30-SCAR-8D                     — D0-D8 milestones
  40-Customer-Audits             — audit findings + CAPA
  50-Compliance-CustomerSpecific — mirror of canonical compliance docs
  60-Scorecards                  — customer-issued scorecards
  70-ECN-Acknowledgements        — Power Automate List handoff
  80-Portal-Exports              — docs exported from {portal}
  90-Inbox                       — hash-archived raw inbound (chain of custody)

Rule R0: NO HESEM-IP under 00-Customer-Source-IP. NO customer-source artifacts
under 10-HESEM-Engineering. The boundary is strict and audited.

Rule R1: New customer revision = new sibling folder under 00-Customer-Source-IP
(never overwrite, never edit, never delete).

Rule R2: HESEM-Engineering 3-Released folders are write-blocked after Power
Automate promotion; only DCC superseding can replace them.
""")

    # ----- 00-Customer-Source-IP (read-only) -----
    cs = s / "00-Customer-Source-IP"
    mk_readme(cs, f"""# 00-Customer-Source-IP — READ-ONLY customer artifacts

Source: customer ({oem}). Authoring authority: customer. HESEM custody only.

NO 3-state lifecycle here. Customer artifacts arrive pre-released from {oem}
and become Read-Only controlled copies at HESEM. New revisions arrive as
NEW SIBLING folders, never overwriting prior.

Sub-zones:
  01-Drawings           — customer drawing PDF / DWG / DXF
  02-Models-3D          — STEP / IGES / Parasolid / MBD
  03-Specifications     — customer-controlled specs ({CUSTOMER_CLEANLINESS_REGIME[oem]})
  04-ECN-Inbound        — engineering change notices received
  05-Customer-SQM-NDA-Vault — supplier quality manual (NDA-gated)

Permission: SG-CUSTOMER-{oem} Read; Edit denied tenant-wide (Power Automate enforces).
""")
    for sub in CUSTOMER_SOURCE_SUBZONES:
        mkpath(cs / sub / "{PartNumber}" / "{Rev}_{ReceiptDate}")
    # ECN-Inbound is keyed by ECN-No, not PartNumber:
    shutil.rmtree(cs / "04-ECN-Inbound", ignore_errors=True)
    mkpath(cs / "04-ECN-Inbound" / "{ECN-No}_{ReceivedDate}")
    shutil.rmtree(cs / "05-Customer-SQM-NDA-Vault", ignore_errors=True)
    mkpath(cs / "05-Customer-SQM-NDA-Vault" / "{SQM-DocID}" / "{Rev}_{EffectiveDate}")

    # ----- 10-HESEM-Engineering (3-state) -----
    eng = s / "10-HESEM-Engineering"
    mk_readme(eng, f"""# 10-HESEM-Engineering — HESEM-authored derivatives

Source: HESEM Engineering team. Authoring authority: HESEM.

Every deliverable carries a 3-state lifecycle (1-Working / 2-In-Review / 3-Released).

Deliverables:
  01-BOM-Internal              — HESEM's internal BOM derived from customer drawing
  02-CAM-NC-Programs           — CAM tree, NC files, post-processor refs, tool list
  03-Process-Plan-Router       — Manufacturing router, op sequence, std times
  04-Inspection-Plan-Ballooned — Balloon drawing, control plan, MSA refs
  05-FAI-Baseline-Released     — Last-released FAI reference (frozen baseline)
  06-Work-Instruction-Local    — Shop-floor WI specific to this Part/Rev
  07-Tooling-Fixture-Design    — Fixture/jig CAD + drawing
  08-ECN-Internal-Response     — HESEM's response/impact-assessment to customer ECN

Permission: SG-CUSTOMER-{oem} Read; SG-DEP-ENG Edit on 1-Working.
SG-ROLE-QMSDOCCONTROL approves 2→3 promotion.
Power Automate writes write-block ACL on 3-Released after promotion.
""")
    for deliv in HESEM_ENG_DELIVERABLES:
        d = eng / deliv / "{PartNumber}" / "{Rev}"
        mk_3state(d)

    # ----- 20-PO-Lots (per-lot dossier) -----
    po = s / "20-PO-Lots"
    mk_readme(po, f"""# 20-PO-Lots — per-lot dossier

Path: `20-PO-Lots/{{YYYY}}/{{PO}}/{{LotID}}/`

Each lot has the 11-folder common dossier + customer-delta:
  01-CofC, 02-MillCert-CMTR, 03-Dimensional-Report, 04-FAI-Lot-Specific,
  05-Surface-Finish-Ra-F19, 06-Cleanliness-Particle-F70,
  07-Special-Process-Certs, 08-Welding-Records-F78-F81,
  09-Helium-Leak-F1, 10-Packaging-Photos, 11-Shipping-CofO-Customs,
  12-Customer-Delta ({fai} + {cleanliness})

Lifecycle states per lot:
  draft → internal-released → SI-signed (if SI part) → shipped → customer-accepted
       → SCAR-open (if rejected) → closed

A `_release-manifest.json` at the lot root contains modern-link references to
HESEM-Engineering/3-Released folders — NEVER copy files (single source of truth).
""")
    lot = po / "{YYYY}" / "{PO}" / "{LotID}"
    for sub in PER_LOT_DOSSIER:
        mkpath(lot / sub)

    # ----- 30-SCAR-8D -----
    scar = s / "30-SCAR-8D"
    mk_readme(scar, f"""# 30-SCAR-8D — Supplier Corrective Action Request (8D format)

Path: `30-SCAR-8D/{{SCAR-No}}_{{OpenDate}}/`

States: 1-Open → 2-Containment → 3-RCA-CA → 4-Closed.

D0-D8 milestones:
""" + "\n".join(f"  {s}" for s in SCAR_8D_STAGES) + f"""

Submitted via {portal}. Effectiveness verification by {oem} closes the case.
""")
    for stage in SCAR_8D_STAGES:
        mkpath(scar / "{SCAR-No}_{OpenDate}" / stage)
    mkpath(scar / "{SCAR-No}_{OpenDate}" / "evidence")

    # ----- 40-Customer-Audits -----
    aud = s / "40-Customer-Audits"
    mk_readme(aud, f"""# 40-Customer-Audits — {oem}-issued audits

Path: `40-Customer-Audits/{{YYYY-MM-DD}}_{{Auditor}}/`

Sub-folders:
  audit-report.pdf, findings/{{F-NN}}/, CAPA/{{F-NN}}/, evidence/

Linked to QMS/Internal-Audit-Schedule.
""")
    mkpath(aud / "{YYYY-MM-DD}_{Auditor}" / "findings")
    mkpath(aud / "{YYYY-MM-DD}_{Auditor}" / "CAPA")
    mkpath(aud / "{YYYY-MM-DD}_{Auditor}" / "evidence")

    # ----- 50-Compliance-CustomerSpecific (mirror only — canonical in QMS) -----
    comp = s / "50-Compliance-CustomerSpecific"
    mk_readme(comp, f"""# 50-Compliance-CustomerSpecific — mirror of canonical compliance docs

Canonical SSOT lives in `HESEM-Quality-QMS/Compliance/`.
This zone holds {oem}-specific mirrors / restatements that {oem} portal expects.
""")
    for ct in COMPLIANCE_MIRROR_TYPES:
        mkpath(comp / ct)

    # ----- 60-Scorecards -----
    sc = s / "60-Scorecards"
    mk_readme(sc, f"""# 60-Scorecards — {oem}-issued supplier scorecards

Path: `60-Scorecards/{{YYYY}}-{{Quarter}}/`
""")
    mkpath(sc / "{YYYY}-Q1")
    mkpath(sc / "{YYYY}-Q2")
    mkpath(sc / "{YYYY}-Q3")
    mkpath(sc / "{YYYY}-Q4")

    # ----- 70-ECN-Acknowledgements (List pointer, but seed a folder for evidence export) -----
    ack = s / "70-ECN-Acknowledgements"
    mk_readme(ack, """# 70-ECN-Acknowledgements (SharePoint List + evidence)

Primary store: a SharePoint List (NOT a folder) with columns:
  Customer, ECN#, OldRev, NewRev, ReceivedDate, AckedDate, FirstEffectivePO,
  FirstEffectiveLot, ClosureEvidenceURL, AckSignerName, AckSignerSignature

This folder holds the signed-PDF evidence export.
""")
    mkpath(ack / "Signed-Ack-PDFs")

    # ----- 80-Portal-Exports -----
    pe = s / "80-Portal-Exports"
    mkpath(pe / portal)

    # ----- 90-Inbox -----
    ib = s / "90-Inbox"
    mk_readme(ib, f"""# 90-Inbox — hash-archived chain-of-custody

Every inbound file from {oem} (Ariba / email / secure transfer / portal) is
hash-archived on arrival. The hash + timestamp + sender becomes the chain-of-
custody record. Moves from 90-Inbox to 00-Customer-Source-IP require an
explicit rename-with-rev step that is audited.
""")
    for ch in ["Ariba", "Email", "SecureTransfer", "Portal-Download"]:
        mkpath(ib / ch / "{YYYY-MM-DD}_{sender-slug}")


# -----------------------------------------------------------------------------
# SITE 6 — HESEM-Internal-Workspace (IB Open, 16 dept × Private/Shared)
# -----------------------------------------------------------------------------
def build_internal_workspace(s: Path) -> None:
    mk_readme(s, """# SITE 6 — HESEM-Internal-Workspace

Purview Information Barrier mode: **Open**.
Sensitivity label default: **HESEM-IP-Confidential** (encrypted; SG-ALL-HESEM).

ONE site with 16 dept libraries (NOT 16 separate sites — IB doesn't need to
segment between depts; only customer-keyed sites need IB Explicit).

Per dept: 2 buckets
  1-Private/  — SG-DEP-{Code} Edit; SG-DEP-EXEC Read; SG-ROLE-QMSDOCCONTROL Read
  2-Shared/   — SG-DEP-{Code} Edit; SG-ALL-HESEM Read
  Plus dept-bespoke top folders (tailored, per v9 research).
""")
    for dept in DEPTS:
        d = s / f"DEP-{dept}"
        mk_readme(d, f"""# DEP-{dept} — Department workspace

2-bucket pattern:
  1-Private  → SG-DEP-{dept} Edit only
  2-Shared   → SG-DEP-{dept} Edit, SG-ALL-HESEM Read

Tailored top-level folders (synthesized from v9 4-agent bespoke research):
""" + "\n".join(f"  {b}" for b in DEPT_BESPOKE[dept]))
        mkpath(d / "1-Private")
        mkpath(d / "2-Shared")
        for bespoke in DEPT_BESPOKE[dept]:
            mkpath(d / "2-Shared" / bespoke)


# -----------------------------------------------------------------------------
# SITE 7 — HESEM-Quality-QMS (canonical compliance + standards library)
# -----------------------------------------------------------------------------
QMS_CANONICAL = [
    "01-ISO-9001-2015",
    "02-AS9100D-Aerospace-Optional",
    "03-ISO-14001-Environmental",
    "04-ISO-45001-OHS",
    "05-ISO-27001-InformationSecurity",
    "06-ISO-17025-Lab-Optional",
    "07-RBA-Code-of-Conduct-v8",
    "08-Counterfeit-Prevention-AS6174",
    "09-NIST-SP-800-171-CMMC",
    "10-PDPL-VN-Decree-13-2023",
    "11-ITAR-EAR-Export-Control",
]

QMS_STANDARDS_LIBRARY = {
    "SEMI": [
        "E10-RAM-Equipment-Reliability",
        "F1-Helium-Leak-Integrity",
        "F19-Surface-Condition-Wetted-SS",
        "F20-316L-Stainless-Spec",
        "F37-Roughness-Measurement",
        "F57-Polymer-UPW-LCDS",
        "F60-ESCA-XPS-Passive-Layer",
        "F70-Particle-Test-Gas-System",
        "F78-GTA-Welding-Practice",
        "F81-GTA-Weld-Visual-Inspection",
        "F106-Helium-Leak-Detection",
        "S2-EHS-Equipment-Guideline",
        "S22-Electrical-Design-Equipment",
        "T20-Authentication-Components",
        "T21-CSB-Organization-Identity",
        "T22-Self-Authentication-Traceability",
    ],
    "ASTM-SAE-AMS": [
        "A276-SS-Bar-Shapes",
        "A240-SS-Plate-Sheet",
        "A269-SS-Tubing",
        "A632-SS-Small-Diameter",
        "A967-SS-Passivation-Practice",
        "B912-SS-Electropolish",
        "E595-Outgassing-TML-CVCM",
        "E1417-Liquid-Penetrant-Examination",
        "E165-Liquid-Penetrant-Standard",
        "AS9102-First-Article-Inspection-RevC",
        "AS5553-Counterfeit-EEE-Parts",
        "AS6174-Counterfeit-Materiel",
        "AMS-2700-Passivation",
        "AMS-2750-Pyrometry",
        "MIL-A-8625-Aluminum-Anodize",
        "ASME-Y14-5-2018-GDT",
        "ASME-Y14-35-Drawing-Revisions",
        "ASME-IX-Welding-Qualification",
    ],
    "ISO-IEC": [
        "9001-2015-QMS",
        "14001-2015-EMS",
        "14644-1-Cleanroom-Class",
        "14644-5-Cleanroom-Operations",
        "17025-2017-Lab-Competence",
        "27001-InformationSecurity",
        "45001-OHS",
        "13485-Medical-Device-Optional",
    ],
    "IPC-JEDEC": [
        "IPC-1782-Traceability-Records",
        "J-STD-033D-MSL-Handling",
        "JEDEC-MSL-Levels-1-to-6",
    ],
    "IEST-ESD-RBA": [
        "IEST-STD-CC1246E-Product-Cleanliness",
        "ANSI-ESD-S20-20",
        "RBA-Code-of-Conduct-v8-0",
        "RBA-VAP-Audit-Process",
    ],
}


def build_quality_qms(s: Path) -> None:
    mk_readme(s, """# SITE 7 — HESEM-Quality-QMS (Canonical compliance + Standards library)

Purview Information Barrier mode: **Open**.
Sensitivity label default: **HESEM-Internal**.

This is the SSOT (Single Source of Truth) for:
  - ISO / AS9100 / IATF / RBA / NIST certifications HESEM holds
  - Counterfeit-prevention master programs (AS6174)
  - Export-control posture (ITAR/EAR + VN PDPL Decree 13/2023)
  - External-origin standards library (SEMI, ASTM, SAE, AMS, ISO, IPC, JEDEC, IEST, ESD, RBA)
  - DCC-controlled QMS documents (Manual, Policy, SOP, WI, RACI, ANNEX,
    Training, JD, Forms) — these are PUSHED FROM MOM portal as read-only mirror

Customer-specific compliance mirrors live under each customer-spoke
`50-Compliance-CustomerSpecific/` — they are POINTERS, not duplicates.
""")
    # Compliance canonical
    for c in QMS_CANONICAL:
        d = s / "01-Compliance-Canonical" / c
        if c == "01-ISO-9001-2015":
            mk_4state_customer(d / "Certificate")
            mkpath(d / "Audit-Schedule")
            mkpath(d / "Surveillance-Reports")
            mkpath(d / "CB-Auditor-CV")
        elif c.startswith("02-AS9100"):
            mkpath(d / "Roadmap-To-Certification")
            mkpath(d / "Gap-Assessment")
        elif c == "07-RBA-Code-of-Conduct-v8":
            mkpath(d / "Self-Assessment-Annual")
            mkpath(d / "VAP-Audit-Results")
            mkpath(d / "Worker-Voice-Records")
        elif c == "08-Counterfeit-Prevention-AS6174":
            mkpath(d / "ASL-Approved-Supplier-List")
            mkpath(d / "Sub-Tier-FlowDown-Clauses")
            mkpath(d / "IQC-Incoming-Inspection-Records")
            mkpath(d / "Retained-Samples-Log")
            mkpath(d / "Scrap-Disposition-Records")
        else:
            mkpath(d)

    # Standards library (external origin)
    for family, items in QMS_STANDARDS_LIBRARY.items():
        for std in items:
            mkpath(s / "02-Standards-Library-External-Origin" / family / std)

    # Authentication (T20 master serialization scheme)
    auth = s / "03-Authentication-T20-Master"
    mk_readme(auth, """# T20 Authentication Master Scheme

DMC serialization rules:
  - Format: {HESEM-Prefix}-{PartFamily}-{YYYY}-{Serial7}
  - Issuing authority: HESEM QMS
  - Per-part GUID issued to T20 CSB (if customer mandates T21)

Per-customer registries link customer-PN → HESEM-serial → mill-heat-no.
""")
    for oem in OEMS:
        mkpath(auth / f"Registry-{oem}")
    mkpath(auth / "DMC-Issue-Log")
    mkpath(auth / "Digital-CofC-T21-Signed")

    # Workflow-Lists (SharePoint Lists, not folders — keep stub for visibility)
    wl = s / "04-Workflow-Lists-Catalog"
    mk_readme(wl, """# 04-Workflow-Lists-Catalog — 17 SharePoint Lists (NOT folders)

These are SharePoint Lists provisioned by PowerShell, schema in ANNEX-149 §6.

  L01-NCR-Master, L02-CAPA-Master, L03-SCAR-8D-Master, L04-ECN-Master,
  L05-PCN-Master, L06-FAI-Master, L07-Customer-Audit-Master,
  L08-Internal-Audit-Master, L09-Calibration-Due-Master, L10-PM-Schedule-Master,
  L11-Cert-Expiry-Master, L12-Customer-Portal-Evidence-Master,
  L13-Action-Tracker-Master, L14-Job-Master, L15-Part-Master,
  L16-Supplier-CMRT-Master, L17-ECN-Acknowledgements (NEW v10).
""")


# -----------------------------------------------------------------------------
# SITE 8 — HESEM-Engineering-IP (HESEM trade-secret + DKE)
# -----------------------------------------------------------------------------
def build_engineering_ip(s: Path) -> None:
    mk_readme(s, """# SITE 8 — HESEM-Engineering-IP (HESEM trade-secret only)

Purview Information Barrier mode: **Open** (internal HESEM only).
Sensitivity label default: **HESEM-IP-Confidential** (encrypted; SG-ALL-HESEM).

Sub-zones:
  01-Process-Recipes-Master    — DKE library (Double Key Encryption) — crown jewels
  02-Tooling-Library           — HESEM-designed tooling/fixture master
  03-CAM-Macros-Templates      — Reusable CAM macros, post-processor templates
  04-Cpk-Process-Capability-DB — Historical Cpk per process / machine / material
  05-Lessons-Learned-NPI       — Cross-customer NPI lessons learned
  06-Internal-Tribal-Knowledge — Shop-floor know-how, oral-tradition docs
  07-Patents-Filed-Drafts      — Patent applications in flight

The DKE library (01-Process-Recipes-Master) breaks Copilot/search by design —
only named DKE-approver users can decrypt. Reserved for true source-of-truth
process recipes, CAD masters, and HESEM-developed special-process formulations.
""")
    # 01 DKE library
    dke = s / "01-Process-Recipes-Master-DKE"
    mk_readme(dke, """# DKE library (Double Key Encryption)

Container-level sensitivity label: `Customer:None-Source-IP-DKE` (HESEM-only).
Per-customer subset labels add an additional DKE key per customer if needed.

Only the named SG-{Customer}-DKE-APPROVERS group + SG-EXEC may decrypt.
""")
    for sub in [
        "EP-Electrolyte-Formulations",
        "Passivation-Bath-Specifications",
        "CNC-Feed-Speed-Master-Tables",
        "Tool-Path-Strategies",
        "Cleanliness-Process-Recipes",
        "Welding-Procedure-Trade-Secret",
    ]:
        mkpath(dke / sub)

    # 02 Tooling library
    tl = s / "02-Tooling-Library"
    for sub in ["Fixture-Designs", "Jig-Designs", "Workholding-Templates", "Cutting-Tool-Library"]:
        mkpath(tl / sub)

    # 03 CAM macros
    cm = s / "03-CAM-Macros-Templates"
    for sub in ["MasterCAM-Macros", "PowerMill-Macros", "Post-Processors", "Setup-Sheet-Templates"]:
        mkpath(cm / sub)

    # 04 Cpk DB
    cpk = s / "04-Cpk-Process-Capability-DB"
    for sub in ["By-Machine", "By-Material", "By-Process-Family", "Trend-Analytics"]:
        mkpath(cpk / sub)

    # 05 NPI lessons
    npi = s / "05-Lessons-Learned-NPI"
    for sub in ["By-Customer", "By-Part-Family", "By-Failure-Mode", "By-Year"]:
        mkpath(npi / sub)

    # 06 Tribal
    mkpath(s / "06-Internal-Tribal-Knowledge")

    # 07 Patents
    pat = s / "07-Patents-Filed-Drafts"
    for sub in ["Filed", "In-Drafting", "Pending-Disclosure-Review"]:
        mkpath(pat / sub)


# -----------------------------------------------------------------------------
# SITE 9 — HESEM-Archive (long-term retention, Purview-labeled)
# -----------------------------------------------------------------------------
def build_archive(s: Path) -> None:
    mk_readme(s, """# SITE 9 — HESEM-Archive (Long-term retention)

Purview Information Barrier mode: **Open** (but most folders inherit retention
labels with disposition review).

Retention matrix (mapped from per-folder type to Purview label):
  - Mill cert + heat genealogy         → 10 yr (RetentionLabel-Quality-10yr)
  - Surface-finish + ESCA              → 10 yr
  - Helium leak cert                   → Life-of-Part (no auto-delete)
  - Welding (F78/F81) WPS/PQR          → Life-of-WPS + 10 yr
  - Particle / ionic / GCMS / FTIR     → 7-10 yr
  - Packaging logs (MSL)               → Until installed + 1 yr
  - Counterfeit-Prevention AS6174      → 7-10 yr
  - Safety flow-down (S2/S8/S14/S22)   → Life-of-Equipment
  - HR records (VN Labor Code)         → 5-10 yr post-separation
  - Finance (VN Accounting Law)        → 10 yr
  - PDPL data subject records          → per request lifecycle
  - Customer contract                  → 10 yr post-expiration
  - SCAR closed                        → 7 yr post-closure
""")
    # Two-axis: by-customer-by-year AND by-record-type
    for oem in OEMS + ["HESEM-Owned"]:
        mkpath(s / "01-By-Customer-By-Year" / oem / "{YYYY}")
    for rt in [
        "Mill-Cert-Heat-Genealogy",
        "Surface-Finish-ESCA",
        "Helium-Leak-Cert",
        "Welding-WPS-PQR",
        "Particle-Ionic-GCMS-FTIR",
        "Packaging-MSL-Logs",
        "Counterfeit-Prevention-AS6174",
        "Safety-FlowDown",
        "HR-Records",
        "Finance-Records",
        "PDPL-Data-Subject-Records",
        "Customer-Contracts",
        "Supplier-Contracts",
        "SCAR-Closed",
        "Internal-Audits-Closed",
        "Customer-Audits-Closed",
        "ECN-Closed",
        "CAPA-Closed",
    ]:
        mkpath(s / "02-By-Record-Type" / rt / "{YYYY}")
    # Disposition queue (Purview retention label expiration review)
    mkpath(s / "03-Disposition-Review-Queue" / "{YYYY-MM}")
    # Destroy queue (after disposition approval)
    mkpath(s / "04-Destroy-Approved-Queue" / "{YYYY-MM}")


# -----------------------------------------------------------------------------
# Top-level documentation (governance + permission + retention overview)
# -----------------------------------------------------------------------------
def build_governance_docs(root: Path) -> None:
    """Top-level governance/permission/retention overview at blueprint root."""
    mk_readme(root, """# HESEM M365 Folder Blueprint v10 — Semi-Equipment CNC edition

Generated by `build_blueprint.py` (v10, 2026-05-19).

## Site catalog

| # | Site                          | IB mode  | Default sensitivity label             |
|---|-------------------------------|----------|---------------------------------------|
| 1 | HESEM-Hub                     | Open     | HESEM-Internal                        |
| 2 | HESEM-AMAT                    | Explicit | Customer:AMAT-Confidential (encrypted)|
| 3 | HESEM-LAM                     | Explicit | Customer:LAM-Confidential (encrypted) |
| 4 | HESEM-ASML                    | Explicit | Customer:ASML-Confidential (encrypted)|
| 5 | HESEM-TEL                     | Explicit | Customer:TEL-Confidential (encrypted) |
| 6 | HESEM-Internal-Workspace      | Open     | HESEM-IP-Confidential                 |
| 7 | HESEM-Quality-QMS             | Open     | HESEM-Internal                        |
| 8 | HESEM-Engineering-IP          | Open     | HESEM-IP-Confidential (DKE library)   |
| 9 | HESEM-Archive                 | Open     | HESEM-Internal (per-folder retention) |

## Key documents (also at blueprint root)

  _SITES-INDEX.md            — site catalog (this README, machine-readable form)
  _PERMISSION-MODEL.md       — IB + sensitivity label + security group design
  _RETENTION-MATRIX.md       — retention period per folder type → Purview label
  _SSOT-PRECEDENCE.md        — R0-R7 SSOT enforcement rules
  _TREE.txt                  — full directory manifest (auto-generated)

## Reference

  Design: ANNEX-149 (v10 semi-equipment CNC blueprint).
  Research: _reports/v10-semi-equipment/agent-1..4.
""")

    (root / "_PERMISSION-MODEL.md").write_text("""# Permission Model (v10)

## Information Barriers (IB v2)

IB binds at SITE level, not folder level (Microsoft Learn,
https://learn.microsoft.com/en-us/purview/information-barriers-sharepoint).

Therefore v10 uses one site per customer (Hub-Spoke).

### IB segments

| Segment           | Filter                                    |
|-------------------|-------------------------------------------|
| AMAT              | MemberOf -eq "SG-CUSTOMER-AMAT"           |
| LAM               | MemberOf -eq "SG-CUSTOMER-LAM"            |
| ASML              | MemberOf -eq "SG-CUSTOMER-ASML"           |
| TEL               | MemberOf -eq "SG-CUSTOMER-TEL"            |
| HESEM-Unrestricted| MemberOf "SG-ALL-HESEM" AND NOT "SG-CUSTOMER-*" |

Six block policies (each customer pair is mutually incompatible).

## Sensitivity labels

  HESEM-Public                                  no encryption
  HESEM-Internal                                no encryption
  HESEM-Restricted-HR                           encrypt; SG-DEP-HR + SG-DEP-EXEC
  HESEM-Restricted-Finance                      encrypt; SG-DEP-FIN + SG-DEP-EXEC
  HESEM-IP-Confidential                         encrypt; SG-ALL-HESEM (no externals)
  Customer:AMAT-Confidential                    encrypt; SG-CUSTOMER-AMAT
  Customer:LAM-Confidential                     encrypt; SG-CUSTOMER-LAM
  Customer:ASML-Confidential                    encrypt; SG-CUSTOMER-ASML
  Customer:TEL-Confidential                     encrypt; SG-CUSTOMER-TEL
  Customer:<X>-Source-IP-DKE                    DKE; SG-CUSTOMER-X-DKE-APPROVERS only

## Security group naming

  SG-ALL-HESEM
  SG-DEP-{Code}              (16: EXEC, QMS, QA, METRO, ENG, PRO, SP, MNT,
                              SCM, SCS, FIN, HR, EHS, IT, ERP, LEGAL)
  SG-ROLE-{RoleName}         (e.g. SG-ROLE-QMSDOCCONTROL, SG-ROLE-INTERNAL-AUDITOR,
                              SG-ROLE-SQE, SG-ROLE-MRBCHAIR)
  SG-CUSTOMER-{Code}         (AMAT / LAM / ASML / TEL)
  SG-CUSTOMER-{Code}-DKE-APPROVERS

## Licensing

Microsoft 365 E5 or E3 + Purview Suite required for IB + sensitivity labels +
auto-apply + 1-year audit retention. At ~200 users this is a non-trivial line.

## Audit retention

E3 default: 180 days (INSUFFICIENT for SQEP audit window).
E5/Purview Suite: 1 year (default acceptable).
10-Year add-on: recommended for SG-DEP-ENG and SG-ROLE-PROGRAMMGMT.
""", encoding="utf-8")

    (root / "_RETENTION-MATRIX.md").write_text("""# Retention Matrix (v10)

Map of folder type → Purview retention label → period.

| Folder type                       | Purview label                  | Period            | Standard backing |
|-----------------------------------|--------------------------------|-------------------|------------------|
| Mill cert + heat genealogy        | RetentionLabel-Quality-10yr    | 10 years          | SEMI F20 + AS6174 + customer PO |
| Surface-finish + ESCA             | RetentionLabel-Quality-10yr    | 10 years          | SEMI F19 / F60 |
| Helium leak cert                  | RetentionLabel-LifeOfPart      | Life-of-Part      | SEMI F1 |
| Welding WPS/PQR                   | RetentionLabel-LifeOfWPS-10yr  | Life-of-WPS + 10y | SEMI F78/F81 + ASME IX |
| Particle/ionic/GCMS/FTIR          | RetentionLabel-Quality-7yr     | 7-10 years        | SEMI F57/F70 |
| Packaging MSL logs                | RetentionLabel-Packaging-1yr   | Installed + 1y    | J-STD-033 |
| Counterfeit-Prevention AS6174     | RetentionLabel-AS6174-10yr     | 10 years          | SAE AS6174 |
| Safety flow-down (S2/S8/S14/S22)  | RetentionLabel-Safety-LoE      | Life-of-Equipment | SEMI S2 |
| HR records                        | RetentionLabel-HR-VN-10yr      | 10y post-leave    | VN Labor Code |
| Finance records                   | RetentionLabel-Finance-10yr    | 10 years          | VN Accounting Law |
| PDPL data subject                 | RetentionLabel-PDPL-Request    | per request       | VN Decree 13/2023 |
| Customer contracts                | RetentionLabel-Contract-10yr   | 10y post-expire   | Civil Code + customer |
| SCAR closed                       | RetentionLabel-SCAR-7yr        | 7y post-closure   | Customer PO |
| Internal audit closed             | RetentionLabel-Audit-10yr      | 10 years          | ISO 9001 / AS9100D |
| Customer audit closed             | RetentionLabel-Audit-10yr      | 10 years          | Customer + AS9100D |
| ECN closed                        | RetentionLabel-ECN-10yr        | 10 years          | Customer PO |
| CAPA closed                       | RetentionLabel-CAPA-10yr       | 10 years          | ISO 9001 |
""", encoding="utf-8")

    (root / "_SSOT-PRECEDENCE.md").write_text("""# SSOT Precedence Rules (v10)

## R0 — Customer-source IP isolation

NO HESEM-IP under `{Customer}/00-Customer-Source-IP/`.
NO customer-source artifacts under `{Customer}/10-HESEM-Engineering/`.
Boundary is strict, enforced by Power Automate + sensitivity label default + DLP.

## R1 — New revision = new sibling

In `00-Customer-Source-IP/`, new rev = new sibling folder. Never overwrite,
never edit, never delete. Old rev remains discoverable forever.

## R2 — 3-Released is write-blocked

In `10-HESEM-Engineering/`, the `3-Released/` state is write-blocked after
Power Automate promotion. Only DCC-controlled superseding can replace it.

## R3 — Canonical compliance lives in QMS

ISO certs, RBA SAQ, CMRT, RoHS, REACH live ONCE at
`HESEM-Quality-QMS/01-Compliance-Canonical/`. Customer-spoke
`50-Compliance-CustomerSpecific/` is a MIRROR (pointer), not duplicate.

## R4 — Workflow-Lists are SharePoint Lists, not folders

L01-L17 (NCR, CAPA, SCAR, ECN, etc.) are SharePoint Lists. Per-record
evidence may live in a folder; the record-of-truth lives in the List.

## R5 — Dept-Private never holds customer-IP

DEP-{Code}/1-Private/ holds dept-internal drafts only. Customer-IP MUST
live under the appropriate customer-spoke site (not internal-workspace).

## R6 — Hub holds NO IP

HESEM-Hub is navigation only. Cross-customer KPI rollups must be aggregated
(no per-customer detail). HESEM-IP-Confidential is the maximum label here.

## R7 — Archive disposition is reviewer-gated

Purview disposition labels never auto-destroy. Manual disposition review
queue at `Archive/03-Disposition-Review-Queue/` and approved at
`Archive/04-Destroy-Approved-Queue/` before destruction.

## R8 — DKE for crown jewels only

`HESEM-Engineering-IP/01-Process-Recipes-Master-DKE/` is DKE-encrypted.
DKE breaks Copilot/search by design — reserved for source-of-truth
process recipes, CAD masters, special-process formulations.
""", encoding="utf-8")

    (root / "_SITES-INDEX.md").write_text("""# v10 Site Index (machine-readable)

```
1  HESEM-Hub                    IB-Open       HESEM-Internal
2  HESEM-AMAT                   IB-Explicit   Customer:AMAT-Confidential
3  HESEM-LAM                    IB-Explicit   Customer:LAM-Confidential
4  HESEM-ASML                   IB-Explicit   Customer:ASML-Confidential
5  HESEM-TEL                    IB-Explicit   Customer:TEL-Confidential
6  HESEM-Internal-Workspace     IB-Open       HESEM-IP-Confidential
7  HESEM-Quality-QMS            IB-Open       HESEM-Internal
8  HESEM-Engineering-IP         IB-Open       HESEM-IP-Confidential (DKE inside)
9  HESEM-Archive                IB-Open       per-folder retention
```
""", encoding="utf-8")


# -----------------------------------------------------------------------------
# Top-level orchestration
# -----------------------------------------------------------------------------
def build_all() -> None:
    if ROOT.exists():
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True, exist_ok=True)

    # SITES 1-5: Hub + 4 customer spokes
    build_hub(ROOT / "01-HESEM-Hub")
    for oem in OEMS:
        build_customer_spoke(ROOT / f"02-HESEM-{oem}", oem)

    # SITE 6: Internal-Workspace with 16 depts × Private/Shared + bespoke
    build_internal_workspace(ROOT / "03-HESEM-Internal-Workspace")

    # SITE 7: Quality-QMS (canonical compliance + standards library)
    build_quality_qms(ROOT / "04-HESEM-Quality-QMS")

    # SITE 8: Engineering-IP (HESEM trade-secret + DKE library)
    build_engineering_ip(ROOT / "05-HESEM-Engineering-IP")

    # SITE 9: Archive (long-term retention)
    build_archive(ROOT / "06-HESEM-Archive")

    # Governance docs at root
    build_governance_docs(ROOT)

    # Manifest
    write_tree_manifest()


def write_tree_manifest() -> None:
    lines: list[str] = []
    count = 0
    for dirpath, dirnames, _ in os.walk(ROOT):
        dirnames.sort()
        rel = Path(dirpath).relative_to(ROOT)
        depth = 0 if str(rel) == "." else len(rel.parts)
        indent = "  " * depth
        name = "(ROOT)" if str(rel) == "." else rel.parts[-1]
        lines.append(f"{indent}{name}/")
        count += 1
    (ROOT / "_TREE.txt").write_text(
        f"# HESEM M365 Blueprint v10 — Semi-Equipment CNC edition\n"
        f"# Total directories: {count}\n\n"
        + "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    print(f"v10 blueprint built: {count} directories")


if __name__ == "__main__":
    build_all()

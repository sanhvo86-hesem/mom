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

# --- §8 16 dept-specific paths under Department-Ops (v3 2026-05-16) -------------
# Each dept entry: code -> dict with operations/registers/interfaces sub-folders
# v3 expands from 12 → 16 depts and deepens Operations with scenario-driven
# subfolders synthesized from 6 parallel research agents (ANNEX-143).
# Added: DEP-METRO, DEP-SP, DEP-MNT, DEP-LEGAL.
DEPARTMENTS = {
    "DEP-EXEC": {  # §8 line 359 + ANNEX-143 §4.D
        "02-Operations": [
            "01-Strategy-Deployment-5Y-AOP",
            "02-Management-Review-Inputs",
            "03-Board-and-Customer-Commitments",
            "04-Risk-and-Escalation",
            "05-BOD-Cycle-Pack-Minutes-Resolutions",
            "06-Enterprise-Risk-ERM-BCP-DR",
            "07-Insurance-Program-PL-DO-Property-Cyber",
            "08-Investor-Lender-Communication",
            "09-OKR-Cascade-and-Strategic-Initiatives",
            "10-M-and-A-and-VDR-Due-Diligence",
        ],
        "03-Registers-and-Logs": [
            "01-Decision-Log",
            "02-Exception-Log",
            "03-BOD-Resolution-Register",
            "04-Authority-Delegation-Matrix",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Leadership-Communication",
            "02-Board-Pack-and-Control-Tower-Pack",
            "03-Customer-Executive-Briefing-Pack",
        ],
    },
    "DEP-QMS": {  # §8 line 365 + ANNEX-143 §4.QMS/DCC
        "02-Operations": [
            "01-QMS-Deployment",
            "02-Document-Control-Operations",
            "03-Process-and-System-Mapping",
            "04-KPI-and-System-Monitoring",
            "05-Improvement-Coordination",
            "06-DCR-Document-Change-Request-Cycle",
            "07-Customer-Quality-Manual-Mirror",
            "08-Records-Master-Index-and-Retention",
            "09-DCC-Training-and-Acknowledgement",
            "10-Signature-Specimen-Maintenance",
            "11-Controlled-Copy-Distribution-Log",
            "12-Obsolete-Withdrawn-Document-Archive",
        ],
        "03-Registers-and-Logs": [
            "01-Action-Tracker",
            "02-Issue-and-Release-Tracker",
            "03-DCR-Pipeline-Status",
            "04-Doc-Register-Snapshot",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Audit-Input-Pack",
            "02-MR-Input-Pack",
            "03-Customer-Audit-Doc-Pack",
        ],
    },
    "DEP-QA": {  # §8 line 371 + ANNEX-143 §4.QA (20 scenarios)
        "02-Operations": [
            "01-Quality-Planning-PFD-PFMEA-CP",
            "02-IQC-Receiving-Inspection",
            "03-IPQC-In-Process-Inspection",
            "04-OQC-Final-Inspection-and-CoC",
            "05-FAI-AS9102-and-Customer-Forms",
            "06-NCR-Initiation-Containment",
            "07-MRB-Disposition-UAI-Rework-Scrap",
            "08-CAPA-RCA-Effectiveness",
            "09-Customer-Complaint-8D-SCAR",
            "10-Internal-Audit-Cycle",
            "11-Customer-Audit-Preparation-Response",
            "12-Supplier-Audit-and-SCAR",
            "13-FOD-Prevention-NAS412",
            "14-Counterfeit-Prevention-AS6174",
            "15-SPC-and-Capability-Cpk-Studies",
            "16-OOC-OOS-OCAP-Reaction",
            "17-Customer-Scorecard-and-Response",
            "18-Quality-KPI-PPM-OTD-Dashboard",
            "19-Witness-Test-Coordination",
            "20-Concession-Deviation-Request",
        ],
        "03-Registers-and-Logs": [
            "01-Control-Plan-Log",
            "02-SPC-Tracker",
            "03-Release-Exception-Log",
            "04-NCR-Master-Register",
            "05-CAPA-Master-Register",
            "06-SCAR-8D-Register",
            "07-Audit-Finding-Register",
            "08-Concession-Register",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Customer-Complaint-Response",
            "02-Supplier-Quality-Pack",
            "03-Customer-FAI-Submission-Pack",
            "04-Customer-CoC-Pack",
            "05-Cleanliness-Pack-6-Bundle",
        ],
    },
    "DEP-ENG": {  # §8 line 377 + ANNEX-143 §4.ENG (19 scenarios)
        "02-Operations": [
            "01-Feasibility-and-DFM-Analysis",
            "02-Customer-CAD-Drawing-Receipt-Controlled-Copy",
            "03-Internal-CAD-and-Derivative-Models",
            "04-Process-Plan-and-Operation-Routing",
            "05-Setup-Sheets-per-Operation",
            "06-CAM-Programs-and-Posted-NC-Files",
            "07-CAM-Library-Tools-CuttingData-PostProcessor",
            "08-Toolpath-Validation-Vericut-NCSIMUL",
            "09-Tooling-Fixture-Design-and-Procurement",
            "10-NPI-Gate-Cycle-G0-to-G5",
            "11-PFMEA-Control-Plan-PFD-Authoring",
            "12-Process-Capability-Cpk-Pre-Launch",
            "13-ECO-Engineering-Change-Order-Cycle",
            "14-PCN-Outbound-Process-Change-Notice",
            "15-Customer-CN-Inbound-Impact-Assessment",
            "16-Reverse-Engineering-RE-Authorization",
            "17-Subcon-Process-Spec-Authoring",
            "18-IP-Access-Acknowledgement-Per-User",
            "19-Knowledge-Reuse-and-Lessons-Learned",
        ],
        "03-Registers-and-Logs": [
            "01-Assumption-Log",
            "02-Change-Implementation-Log",
            "03-Proveout-Tracker",
            "04-Customer-Drawing-Receipt-Log",
            "05-CAM-Program-Checksum-Log",
            "06-ECO-Master-Register",
            "07-PCN-Master-Register",
            "08-NPI-Project-Tracker",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-RFQ-Response-Pack",
            "02-Process-Readiness-Pack",
            "03-Engineering-CAPA-Response",
            "04-S2E-Sales-to-Engineering-Handoff",
            "05-E2Q-Engineering-to-Quality-Handoff",
            "06-E2P-Engineering-to-Production-Handoff",
        ],
    },
    # §8 line 383 LITERAL: "Department-Ops/DEP-PRO/" — NOT DEP-PROD.
    "DEP-PRO": {  # ANNEX-143 §4.PRO (17 scenarios)
        "02-Operations": [
            "01-Dispatch-and-Work-Order-Release",
            "02-Traveler-Print-and-Job-Folder-Pull",
            "03-Kit-Issue-and-Material-Lot-Slip",
            "04-Setup-and-First-Piece-Approval",
            "05-In-Process-Probing-and-Verification",
            "06-Tool-Change-Insert-Life-Logging",
            "07-Operator-Stop-Card-and-Scrap-Ticket",
            "08-Rework-Traveler-Cycle",
            "09-Shift-Handover-Day-Night",
            "10-Cross-Shift-Quality-Note",
            "11-OEE-Throughput-and-KPI-Daily",
            "12-Deburr-Edge-Break-and-Clean-Stage",
            "13-Pack-Out-Pre-Special-Process",
            "14-Tool-Crash-Investigation",
            "15-Subcontracted-Operation-Routing",
            "16-Operator-Competency-Daily-Check",
            "17-Customer-Concession-UAI-Liaison",
        ],
        "03-Registers-and-Logs": [
            "01-Dispatch-Snapshot",
            "02-Downtime-History",
            "03-WIP-Aging-Log",
            "04-Tool-Life-Log",
            "05-Scrap-Cost-Roll-Up",
            "06-First-Piece-Approval-Register",
            "07-Operator-Skill-Matrix-Daily",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Control-Tower-Readiness-Pack",
            "02-Pack-Ready-Handoff",
            "03-Production-to-Quality-Handoff",
            "04-Production-to-SpecialProcess-Handoff",
            "05-Production-to-Maintenance-Ticket",
        ],
    },
    "DEP-SCM": {  # §8 line 389 + ANNEX-143 §4.SCM (25 scenarios)
        "02-Operations": [
            "01-Supplier-Qualification-NDA-SAQ",
            "02-Supplier-Audit-and-CAPA",
            "03-APSL-Master-and-Customer-ASL-Sync",
            "04-PO-Raw-Material-with-Mill-Cert",
            "05-PO-Subcontract-Special-Process",
            "06-PO-Consumables-Blanket-Release",
            "07-PO-Tooling-Perishable-Custom-Fixture",
            "08-Receiving-Dock-and-Quarantine",
            "09-IQC-Handoff-and-Release-to-Stock",
            "10-Putaway-and-Lot-Traceability-Tag",
            "11-Cycle-Count-and-Annual-Inventory",
            "12-FIFO-FEFO-Shelf-Life-Watch",
            "13-Hazmat-Storage-SDS-and-Spill",
            "14-Cleanroom-Pkg-IEST-Bag-In",
            "15-Outbound-Shipping-Document-Set",
            "16-Customs-Brokerage-and-Origin",
            "17-Export-Control-Screen-Per-Shipment",
            "18-DG-Hazmat-Shipping-Declaration",
            "19-RMA-Returned-Material-Intake",
            "20-Inter-Site-Stock-Transfer",
            "21-Consignment-CFP-Reconciliation",
            "22-End-of-Life-Last-Time-Buy",
            "23-Counterfeit-Prevention-Plan",
            "24-Conflict-Mineral-CMRT-Flowdown",
            "25-Banned-Substance-Flowdown-ASML-HIO",
        ],
        "03-Registers-and-Logs": [
            "01-PO-Tracker",
            "02-Expedite-Log",
            "03-Quarantine-and-Aging-Log",
            "04-Shipment-Exception-Log",
            "05-APSL-Master-Register",
            "06-Supplier-Scorecard-Master",
            "07-Sub-Tier-SCN-Register",
            "08-Customs-Manifest-Daily",
            "09-Lot-Graph-Master-Traceability",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Buyer-Communication-Pack",
            "02-Shipment-Interface-Pack",
            "03-SCAR-Response-Pack",
            "04-Customer-Portal-ASN-Upload-Evidence",
            "05-Customer-Shipment-Pack-with-CoC-Pack6",
            "06-Supplier-QBR-Deck-Pack",
        ],
    },
    "DEP-SCS": {  # §8 line 395 + ANNEX-143 §4.SCS (18 scenarios)
        "02-Operations": [
            "01-RFQ-Intake-and-Portal-Pull",
            "02-Quote-Routing-DFM-Costing",
            "03-Internal-Quote-Review-Approval",
            "04-Quote-Submission-and-Portal-Upload",
            "05-Quote-Revision-Rounds",
            "06-Customer-PO-Receipt-Contract-Review",
            "07-Order-Acknowledgement-and-S2E-Handoff",
            "08-LTA-Frame-Agreement-Pricing-Schedule",
            "09-Demand-Forecast-MOQ-ROL",
            "10-NDA-Master-Supply-Quality-Logistics-Agreement",
            "11-Customer-Onsite-Visit-Coordination",
            "12-Sample-Request-FAIR-Transmission",
            "13-Customer-Complaint-Intake-Ack",
            "14-Customer-Audit-Logistics",
            "15-Customer-Satisfaction-and-Score-Response",
            "16-Customer-Property-and-Consigned-Material",
            "17-RMA-Tracker-and-CRM-Coordination",
            "18-Shipment-Communication-and-OA-Status",
        ],
        "03-Registers-and-Logs": [
            "01-RFQ-Register",
            "02-Order-Mismatch-Log",
            "03-Customer-Update-Cadence",
            "04-RMA-Tracker",
            "05-Quote-Submission-Master",
            "06-LTA-Obligation-Register",
            "07-Customer-Audit-Schedule",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Order-Release-Pack",
            "02-Customer-Communication-Pack",
            "03-Sample-Ship-Pack-with-FAIR",
            "04-Customer-Outbound-PCN-CN-Resp",
        ],
    },
    "DEP-FIN": {  # §8 line 401 + ANNEX-143 §4.FIN (22 scenarios)
        "02-Operations": [
            "01-Job-Costing-Estimate-to-Actual",
            "02-Variance-Analysis-Standard-vs-Actual",
            "03-Monthly-Close-Trial-Balance",
            "04-Financial-Statements-P-L-BS-CF",
            "05-AR-Customer-Invoice-VAT-E-Invoice",
            "06-AR-Aging-Collection-Dunning",
            "07-AR-Bad-Debt-Writeoff-Restricted",
            "08-AP-Vendor-Invoice-3-Way-Match",
            "09-AP-Payment-Run-Bank-File",
            "10-Vendor-Master-Change-Log",
            "11-Tax-VAT-Monthly-Declaration",
            "12-Tax-CIT-Quarterly-Annual",
            "13-Tax-PIT-Monthly-Finalization",
            "14-Tax-FCT-Foreign-Contractor",
            "15-Treasury-Daily-Cash-Forecast",
            "16-Treasury-FX-Hedge-Confirmation",
            "17-Bank-Covenant-Compliance",
            "18-Budget-Annual-Cycle-Dept-Consolidated",
            "19-Rolling-Forecast-Quarterly",
            "20-Capex-AFE-Business-Case-Tracker",
            "21-External-Audit-PBC-Evidence",
            "22-Customer-Open-Book-Costing-Restricted",
            "23-Transfer-Pricing-Local-Master-Benchmark",
        ],
        "03-Registers-and-Logs": [
            "01-AR-Aging-Log",
            "02-AP-Due-Tracker",
            "03-Close-Checklist-Status",
            "04-SoD-Exception-Log",
            "05-Capex-Authority-Threshold-Register",
            "06-Capex-Master-Tracker",
            "07-Tax-Audit-Working-Paper-Index",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Invoice-Interface-Pack",
            "02-Payroll-Input-Receipt",
            "03-Costing-Review-Pack",
            "04-External-Audit-Final-FS-Pack",
            "05-BOD-Financial-Pack",
            "06-Lender-Quarterly-Report",
        ],
    },
    "DEP-HR": {  # §8 line 407 + ANNEX-143 §4.HR (22 scenarios)
        "02-Operations": [
            "01-Headcount-Requisition-Annual",
            "02-Recruitment-Pipeline-Candidate-CV",
            "03-Interview-Background-Reference-Check",
            "04-Offer-Contract-Day-1-Probation",
            "05-Personnel-File-Lifecycle",
            "06-Job-Description-Master-Register",
            "07-Competency-Matrix-Required-vs-Actual",
            "08-Annual-Training-Plan-Cycle",
            "09-Training-Delivery-Attendance-Pre-Post-Test",
            "10-Training-OJT-Effectiveness",
            "11-Critical-Cert-CNC-SP-CMM-Auditor-FAI",
            "12-Customer-Training-AMAT-LAM-ASML-TEL",
            "13-Performance-KPI-Mid-Annual-Calibration",
            "14-Promotion-PIP-Compensation-Case",
            "15-Disciplinary-Grievance-Investigation",
            "16-Exit-Interview-Clearance-Final-Settlement",
            "17-Payroll-Monthly-T-A-OT-Variable",
            "18-Working-Hour-RBA-60h-Rest-1-7",
            "19-Statutory-SI-HI-UI-PIT-Declaration",
            "20-Foreign-Worker-WP-Visa-TRC",
            "21-RBA-SAQ-Self-Audit-Worker-Voice",
            "22-Customer-Audit-People-Pack-Redacted",
        ],
        "03-Registers-and-Logs": [
            "01-Requisition-Tracker",
            "02-Onboarding-Tracker",
            "03-Offboarding-Tracker",
            "04-Authorized-Work-Exception-Log",
            "05-Training-Plan-Progress",
            "06-Cert-Expiry-Watch-90d",
            "07-RBA-Grievance-Log-Anonymized",
            "08-PIT-Annual-Finalization-Register",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Access-Request-Pack",
            "02-Payroll-Input-Pack",
            "03-Discipline-and-Grievance-Pack",
            "04-Customer-Competency-Pack-Per-Audit",
            "05-RBA-Evidence-Annual-Bundle",
            "06-Modern-Slavery-Statement-Public",
        ],
    },
    "DEP-EHS": {  # §8 line 413 + ANNEX-143 §4.EHS-ESG (25 scenarios)
        "02-Operations": [
            "01-JSA-Hazard-Identification-Per-Task",
            "02-HIRARC-Risk-Assessment-Matrix",
            "03-Chemical-SOP-SDS-GHS-Library",
            "04-Confined-Space-Hot-Work-Permit",
            "05-PPE-Matrix-Issue-Log",
            "06-Medical-Surveillance-Audio-Pulm-Vision",
            "07-Incident-Near-Miss-First-Aid",
            "08-Recordable-Injury-LTI-Investigation",
            "09-Environmental-Release-DONRE-Reporting",
            "10-Hazwaste-Characterization-Manifest",
            "11-Air-Emission-Scrubber-Stack-VOC",
            "12-Wastewater-Discharge-WWTP-pH",
            "13-Drinking-Water-Cafeteria-Hygiene",
            "14-Fire-System-Inspection-and-Drills",
            "15-Carbon-Scope-1-2-3-Inventory",
            "16-ISO-14064-Verification-Statement",
            "17-SBTi-Target-Letter-and-Commitment",
            "18-CDP-Climate-Water-Response",
            "19-EcoVadis-Annual-Submission",
            "20-Customer-ESG-Survey-AMAT-LAM-ASML-TEL",
            "21-Conflict-Mineral-CMRT-EMRT-RollUp",
            "22-UFLPA-Supply-Chain-Map-Tier-N",
            "23-Banned-Substance-REACH-RoHS-ASML-HIO",
            "24-ISO-14001-45001-Internal-Audit-Cycle",
            "25-RBA-VAP-Audit-CAP-Closure",
        ],
        "03-Registers-and-Logs": [
            "01-Incident-Register",
            "02-Unsafe-Condition-Log",
            "03-Permit-Register",
            "04-Emergency-Drill-Tracker",
            "05-Aspects-Impacts-Register",
            "06-Legal-Other-Requirements-Register",
            "07-Banned-Substance-Watch-List",
            "08-GHG-Scope-3-Cat-1-Roll-Up",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Restart-Release-Pack",
            "02-EHS-MR-Input-Pack",
            "03-Customer-ESG-Response-Pack",
            "04-RBA-Online-Evidence-Pack",
            "05-Annual-Sustainability-Report-Pack",
        ],
    },
    "DEP-IT": {  # §8 line 419 + ANNEX-143 §4.IT-OT (19 scenarios)
        "02-Operations": [
            "01-IAM-Access-Request-Provisioning",
            "02-Entra-PIM-Privileged-Access-Activation",
            "03-Conditional-Access-Policy-Review",
            "04-Sensitivity-Label-DLP-Tuning",
            "05-Purview-Audit-Log-Long-Term-Archive",
            "06-SOC-Sentinel-Incident-Triage",
            "07-Vulnerability-Patch-Cycle",
            "08-Backup-Restore-Test-Quarterly",
            "09-Disaster-Recovery-BCP-Drill-Annual",
            "10-CNC-Controller-Param-Backup",
            "11-CNC-Firmware-Update-Customer-Notify",
            "12-CMM-CAM-Project-License-Backup",
            "13-Customer-Portal-Credential-Rotation",
            "14-Guest-Access-Lifecycle-Quarterly-Review",
            "15-Network-Diagram-Purdue-OT-Segmentation",
            "16-CMDB-Asset-Register-Criticality",
            "17-OT-Playbook-Air-Gap-Workstation",
            "18-Vendor-Security-Questionnaire",
            "19-Cyber-Risk-Register-Tabletop-Exercise",
        ],
        "03-Registers-and-Logs": [
            "01-Access-Review-Status",
            "02-Backup-Health",
            "03-Endpoint-Exception-Log",
            "04-Change-Calendar",
            "05-PIM-Activation-Log",
            "06-Break-Glass-Account-Usage",
            "07-Customer-Portal-Account-Registry",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Deployment-Pack",
            "02-Recovery-Pack",
            "03-Customer-Cyber-Questionnaire-Response",
            "04-Breach-Notification-DPA-Pack",
        ],
    },
    "DEP-ERP": {  # §8 line 425 + ANNEX-143 §4.ERP (10 scenarios)
        "02-Operations": [
            "01-Transaction-Governance-SoD",
            "02-Master-Data-Request-Cycle",
            "03-UAT-and-Cutover-Plan",
            "04-Error-and-Reconciliation",
            "05-Interface-Data-Exchange-MOM-M365",
            "06-Sensitive-Role-Control-Segregation",
            "07-Customer-Portal-Account-Ariba-Coupa-myASML-TPS",
            "08-Portal-Pull-Push-Evidence-Log",
            "09-CAD-CAM-License-Entitlement-Usage",
            "10-RPA-Bot-Workflow-Catalog",
        ],
        "03-Registers-and-Logs": [
            "01-Role-Review-Log",
            "02-Master-Data-Change-Log",
            "03-Interface-Error-Log",
            "04-Reentry-Queue",
            "05-Portal-Upload-Master-Log",
            "06-License-Usage-Snapshot",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-UAT-Pack",
            "02-System-Handoff-Pack",
            "03-Reconciliation-Pack",
            "04-Portal-Submission-Receipt-Pack",
        ],
    },
    # ============================================================================
    # v3 NEW DEPARTMENTS (ANNEX-143 §4)
    # ============================================================================
    "DEP-METRO": {  # NEW: Metrology + Calibration (ANNEX-143 §4.METRO, 14 scen.)
        "02-Operations": [
            "01-Gage-Master-and-Schedule",
            "02-Calibration-In-House-Worksheet",
            "03-Calibration-External-ISO17025-Cert",
            "04-Gage-History-Card-and-Traceability",
            "05-Out-of-Tolerance-Impact-Lookback",
            "06-MSA-GR-R-Linearity-Bias-Stability",
            "07-CMM-Program-Scan-Plan-Output",
            "08-Surface-Roughness-Ra-Rz-Mapping",
            "09-Optical-Vision-Keyence-OGP-Report",
            "10-Material-Hardness-PMI-Test",
            "11-Cleanliness-LPC-NVR-IC-FTIR",
            "12-Outgassing-ASTM-E595-He-Leak",
            "13-Visual-Standards-Limit-Sample-Library",
            "14-Metrology-Lab-Env-Temp-RH-Vibration-ESD",
        ],
        "03-Registers-and-Logs": [
            "01-Cal-Due-30-60-90-List",
            "02-OOT-Notice-Register",
            "03-Gage-Sticker-Print-Log",
            "04-CMM-Program-Master-Index",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Cal-Cert-Customer-Audit-Pack",
            "02-MSA-Customer-Submission-Pack",
            "03-CMM-Output-to-FAI-Pack",
        ],
    },
    "DEP-SP": {  # NEW: Special Process (ANNEX-143 §4.SP, 16 scenarios)
        "02-Operations": [
            "01-Anodize-Type-II-III-AMS2469-MIL-A-8625F",
            "02-Anodize-Bath-Daily-Titration-Log",
            "03-Anodize-Run-Record-Seal-CoC",
            "04-Strip-and-Re-Anodize-Cycle",
            "05-Electropolish-ASTM-B912-Ra-Cert",
            "06-Passivation-AMS-2700F-ASTM-A967",
            "07-Precision-Clean-IEST-STD-CC1246E",
            "08-DI-Rinse-IPA-Wipe-Bag-In-Heat-Seal",
            "09-Outgassing-ASTM-E595-TML-CVCM",
            "10-He-Leak-Test-Vacuum-Chamber-Parts",
            "11-Surface-Roughness-Ra-Mapping-ASML-F19",
            "12-Bath-Chemistry-Trend-Excursion-CAPA",
            "13-Bath-Maintenance-Decant-Drain-Refill",
            "14-Subcon-Special-Process-Liaison",
            "15-Banned-Substance-XRF-Grade-1-ASML-HIO",
            "16-Cleanroom-Adjacent-Assembly-ISO-Class-5-6",
        ],
        "03-Registers-and-Logs": [
            "01-Bath-Master-Register",
            "02-Load-Sheet-Log-per-Line",
            "03-Subcon-APSL-Process-Cert-Letter",
            "04-Pack-6-Element-Master-Index",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Special-Process-CoC-Bundle-per-Lot",
            "02-Pack-6-Cleanliness-Evidence-Bundle",
            "03-Customer-Witness-Lab-Test-Pack",
        ],
    },
    "DEP-MNT": {  # NEW: Maintenance + Facility (ANNEX-143 §4.MNT, 18 scenarios)
        "02-Operations": [
            "01-PM-Master-Schedule-Annual",
            "02-PM-Per-Asset-Matrix",
            "03-PM-Work-Order-Execution-Checklist",
            "04-Lubrication-Log-per-Asset",
            "05-PdM-Vibration-Analysis-ISO-10816",
            "06-PdM-Spindle-Thermal-Ballbar-Laser",
            "07-Breakdown-Ticket-and-RCA",
            "08-Spindle-Rebuild-Capex-Cycle",
            "09-Machine-Geom-Verification-ISO-230-10791",
            "10-Customer-Machine-Cap-Cert-AMAT-LAM",
            "11-Cleanroom-HVAC-HEPA-DOP-PAO",
            "12-Compressed-Air-ISO-8573-Dew-Oil-Particle",
            "13-DI-Water-Plant-Resistivity-TOC",
            "14-Anodize-Bath-Maintenance-Liaison",
            "15-Tool-Crib-Inventory-Liaison",
            "16-Fixture-Maintenance-Annual-Certification",
            "17-Customer-Witnessed-PM-Dual-Signature",
            "18-Energy-Sub-Meter-Scope-2-Feed",
        ],
        "03-Registers-and-Logs": [
            "01-PM-Compliance-KPI",
            "02-MTTR-MTBF-Reliability-Log",
            "03-Breakdown-Master-Register",
            "04-HEPA-Filter-Changeout-History",
            "05-Cleanroom-EM-Excursion-Log",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-RTS-Return-to-Service-Cert",
            "02-Customer-Machine-Cap-Annual-Cert",
            "03-Customer-Witness-PM-Pack",
        ],
    },
    "DEP-LEGAL": {  # NEW: Legal + Corporate Secretary (ANNEX-143 §4.LEGAL)
        "02-Operations": [
            "01-Customer-MSA-Supply-Agreement",
            "02-Quality-Agreement-per-Customer",
            "03-Logistics-Service-Agreement-per-Customer",
            "04-Supplier-Agreement-Master",
            "05-NDA-Inbound-Outbound-Register",
            "06-Employment-Contract-Master-Template",
            "07-Lease-and-Facility-Agreement",
            "08-Insurance-Policy-PL-DO-Property-Cyber",
            "09-Litigation-Case-File-and-Hold",
            "10-IP-Patent-Trademark-Trade-Secret",
            "11-Authority-RACI-Delegation-Matrix",
            "12-Contract-Register-Master-Index",
            "13-PDPL-Vietnam-Decree-13-2023-Consent",
            "14-Anti-Bribery-Anti-Corruption-Policy",
            "15-Whistleblower-Channel-Anonymous",
        ],
        "03-Registers-and-Logs": [
            "01-Contract-Register-Master",
            "02-NDA-Master-Register",
            "03-Litigation-Hold-Custodian-List",
            "04-IP-Asset-Register",
            "05-Authority-Matrix-Snapshot",
        ],
        "05-Interfaces-and-Released-Packs": [
            "01-Legal-Opinion-Internal-Pack",
            "02-Customer-Counsel-Communication",
            "03-Authority-Filing-Pack",
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
# §10 line 494 specifies 01-Controlled-Source/eqms.hesemeng.com/ mirrors local worktree:
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

# ============================================================================
# ANNEX-139 — internal blueprint for 6 IP/restricted libraries
# ============================================================================

# §2 Part-REV-Master internal (10 sub-folders per REV-{Rev})
PART_REV_MASTER_SUBS = [
    "00-Index-and-Status",
    "01-Customer-Source-Documents",
    "02-Drawings-and-Models",
    "03-Process-and-Risk",
    "04-Approved-Material-and-Suppliers",
    "05-NPI-Qualification",
    "06-Surface-Finish-and-Cleanliness",
    "07-Tooling-Concept-and-Fixture-Refs",
    "08-Standards-Customer-Specific",
    "09-Engineering-Change-History",
    "99-Superseded-and-Locked",
]

# Wait — ANNEX-139 §2 actually defines 10 folders (01-09 + 99) with different names.
# Use ANNEX-139 §2 literal names instead:
PART_REV_MASTER_SUBS = [
    "01-Engineering-Baseline-Source",
    "02-CAM-Source",
    "03-Inspection-Plan-and-Balloon",
    "04-Approved-Material-and-Suppliers",
    "05-FAI-Baseline-Pack",
    "06-Surface-Finish-and-Cleanliness",
    "07-Tooling-Concept-and-Fixture-Refs",
    "08-Standards-Customer-Specific",
    "09-Engineering-Change-History",
    "99-Superseded-and-Locked",
]

# §3 Customer-Received internal (7 sub by-customer + quarantine + export-control + archive)
CUSTOMER_RECEIVED_BY_CUSTOMER_SUBS = [
    "Drawings",
    "Specs",
    "NDA-Legal",
    "Customer-Forms",
    "Audit-Reports-Received",
]

# §4 Tooling-Fixture-Gage internal (6 groups)
TOOLING_GROUPS = {
    "01-Cutting-Tools": "{ToolID}",
    "02-Workholding-Fixtures": "{FixtureID}",
    "03-Gages-and-Inspection-Equipment": "{GageID}",
}
TOOLING_ASSET_SUBS_TOOL = ["01-Tool-Master-Spec", "02-Preset-Data", "03-Reorder-and-Lifecycle", "99-Scrapped"]
TOOLING_ASSET_SUBS_FIXTURE = ["01-Design-Pack", "02-Validation-and-Proveout", "03-Usage-Log", "04-Maintenance-and-Repair", "99-Superseded"]
TOOLING_ASSET_SUBS_GAGE = ["01-Specification", "02-Calibration-Certificates", "03-MSA-and-GR-R-Studies", "04-Daily-Check-Records", "99-Retired"]

# §5 HR-Operations internal (7 sub)
HR_OPERATIONS_SUBS_WITH_YEAR = [
    "01-Manpower-Planning-Annual",
    "05-Audit-Pack-Inputs",
    "06-HR-Reports-and-Dashboards",
]
HR_OPERATIONS_SUBS_NO_YEAR = [
    "02-Recruitment-Pipeline-Non-PII",
    "03-HR-Policy-and-Handbook-Current",
    "04-Compensation-Bands-Restricted",
]
HR_OPERATIONS_REGISTERS = [
    "01-Headcount-Master-Log",
    "02-Recruitment-Funnel-Restricted",
    "03-Discipline-Case-Register",
    "04-Asset-Return-Master",
    "05-Access-Revocation-Master",
]

# §7 Cleanroom-Records internal (8 sub)
CLEANROOM_ENV_MONITORING_ROOMS = ["RM-CR-01", "RM-INSP-01", "RM-PACK-01"]
CLEANROOM_SUBS_WITH_YEAR = [
    "04-Personnel-Gowning-and-Training",
    "06-Incident-and-Excursion",
    "07-Audit-and-Customer-Inspection",
]
CLEANROOM_SUBS_NO_YEAR = [
    "05-Cleaning-Validation-and-SOP",
]

# §8 Subcontractor-Records internal (9 sub)
SUBCONTRACTOR_BY_SUBCONTRACTOR_SUBS = [
    "01-Qualification-Pack",
    "02-Process-Cert-Letters",
    "03-Audit-Reports-and-Surveys",
    "04-Process-Records-per-Job",
]
SUBCONTRACTOR_TEMPLATE_PROCESSORS = ["PROC-PLAT-001", "PROC-HT-001", "PROC-NDT-001"]


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
    """Wipe folder tree but preserve top-level user docs (README/manifest)."""
    preserved = {}
    if ROOT.exists():
        # Capture top-level user docs so the wipe-and-rebuild doesn't destroy them.
        for f in ROOT.iterdir():
            if f.is_file() and f.name not in {".gitkeep", "_TREE.txt"}:
                preserved[f.name] = f.read_bytes()
        shutil.rmtree(ROOT)
    ROOT.mkdir(parents=True)
    # Restore preserved user docs after recreating empty root.
    for name, data in preserved.items():
        (ROOT / name).write_bytes(data)

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

    # ANNEX-139 §7 Cleanroom-Records — NEW library in SITE 1
    cr_lib = s1 / "Cleanroom-Records"
    # 01-Environment-Monitoring/{Room}/{YYYY-MM}/ — template for HESEM initial rooms
    for room in CLEANROOM_ENV_MONITORING_ROOMS:
        mkpath(cr_lib / "01-Environment-Monitoring" / room / "{YYYY-MM}")
    mkpath(cr_lib / "01-Environment-Monitoring" / "{Room}" / "{YYYY-MM}")
    # 02-Validation-and-Qualification + 03-HVAC-and-Filter-Maintenance: {Room}/{YYYY}
    for room in CLEANROOM_ENV_MONITORING_ROOMS:
        mkpath(cr_lib / "02-Validation-and-Qualification" / room / YYYY)
        mkpath(cr_lib / "03-HVAC-and-Filter-Maintenance" / room / YYYY)
    mkpath(cr_lib / "02-Validation-and-Qualification" / "{Room}" / YYYY)
    mkpath(cr_lib / "03-HVAC-and-Filter-Maintenance" / "{Room}" / YYYY)
    # 04, 06, 07: {YYYY}
    for sub in CLEANROOM_SUBS_WITH_YEAR:
        mkpath(cr_lib / sub / YYYY)
    # 05: no year
    for sub in CLEANROOM_SUBS_NO_YEAR:
        mkpath(cr_lib / sub)
    mkpath(cr_lib / "99-Archive" / YYYY)

    # =====================================================================
    # SITE 2 — HESEM-Job-Evidence (§2 line 166)
    # =====================================================================
    s2 = ROOT / "HESEM-Job-Evidence"

    # §11 Part-REV-Master/{CustomerID}/{PartNo}/REV-{Rev}/<ANNEX-139 §2 10 subs>
    prm = s2 / "Part-REV-Master"
    prm_template = prm / "{CustomerID}" / "{PartNo}" / "REV-{Rev}"
    for sub in PART_REV_MASTER_SUBS:
        mkpath(prm_template / sub)

    # §5 Job-Dossiers/{YYYY}/{JobNum}-{PartNo}-REV-{Revision}/<11 gates>
    jd = s2 / "Job-Dossiers" / YYYY / "{JobNum}-{PartNo}-REV-{Revision}"
    for gate in JOB_DOSSIER_GATES:
        mkpath(jd / gate)

    # ANNEX-139 §3 Customer-Received/ — 7 sub
    cr = s2 / "Customer-Received"
    cr_by = cr / "01-By-Customer" / "{CustomerID}"
    for sub in CUSTOMER_RECEIVED_BY_CUSTOMER_SUBS:
        mkpath(cr_by / sub)
    mkpath(cr / "02-Inbound-Quarantine")
    mkpath(cr / "03-Restricted-Export-Control" / "{CustomerID}")
    mkpath(cr / "99-Archive-Closed-Customer")

    # ANNEX-139 §4 Tooling-Fixture-Gage/ — 6 groups
    tfg = s2 / "Tooling-Fixture-Gage"
    for sub in TOOLING_ASSET_SUBS_TOOL:
        mkpath(tfg / "01-Cutting-Tools" / "{ToolID}" / sub)
    for sub in TOOLING_ASSET_SUBS_FIXTURE:
        mkpath(tfg / "02-Workholding-Fixtures" / "{FixtureID}" / sub)
    # 03-Gages: calibration certs by year inside the asset
    for sub in TOOLING_ASSET_SUBS_GAGE:
        if sub == "02-Calibration-Certificates":
            mkpath(tfg / "03-Gages-and-Inspection-Equipment" / "{GageID}" / sub / YYYY)
        else:
            mkpath(tfg / "03-Gages-and-Inspection-Equipment" / "{GageID}" / sub)
    # 04-Calibration-Records — separate aggregated path per ANNEX-139 §4
    mkpath(tfg / "04-Calibration-Records" / "{GageID}" / YYYY)
    mkpath(tfg / "05-Maintenance-Logs" / "{AssetID}")
    mkpath(tfg / "06-Retired-and-Disposal" / "{AssetID}")

    # ANNEX-139 §8 Subcontractor-Records — NEW library in SITE 2
    sr_pr = s2 / "Subcontractor-Records"
    mkpath(sr_pr / "01-Approved-Supplier-List-with-Scope")
    by_sub = sr_pr / "02-By-Subcontractor" / "{ProcessorID}"
    for sub in SUBCONTRACTOR_BY_SUBCONTRACTOR_SUBS:
        mkpath(by_sub / sub)
    # Template processors (initial seed for HESEM rollout)
    for proc in SUBCONTRACTOR_TEMPLATE_PROCESSORS:
        for sub in SUBCONTRACTOR_BY_SUBCONTRACTOR_SUBS:
            mkpath(sr_pr / "02-By-Subcontractor" / proc / sub)
    mkpath(sr_pr / "03-Suspension-and-Decertification-Log")
    mkpath(sr_pr / "04-NADCAP-Audit-Coordination" / YYYY)
    mkpath(sr_pr / "05-Flow-Down-Quality-Clauses")
    mkpath(sr_pr / "99-Archive-Former-Subcontractor")

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

    # ANNEX-139 §5 HR-Operations/ — 7 sub policy + aggregate (NO PII)
    hro = s3 / "HR-Operations"
    for sub in HR_OPERATIONS_SUBS_WITH_YEAR:
        # 06-HR-Reports-and-Dashboards uses {YYYY-Qn} pattern, others use {YYYY}
        if sub == "06-HR-Reports-and-Dashboards":
            mkpath(hro / sub / "{YYYY-Qn}")
        else:
            mkpath(hro / sub / YYYY)
    for sub in HR_OPERATIONS_SUBS_NO_YEAR:
        mkpath(hro / sub)
    # 09-Registers (per ANNEX-139 §5 inferred substructure for registers grouping)
    for reg in HR_OPERATIONS_REGISTERS:
        mkpath(hro / "09-Registers" / reg)
    mkpath(hro / "99-Archive" / YYYY)

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
    # 01-Controlled-Source/eqms.hesemeng.com/<mirror sub-paths>
    cs_root = qsc / "01-Controlled-Source" / "eqms.hesemeng.com"
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

    # =====================================================================
    # SITE 5 — HESEM-ESG-Compliance (ANNEX-141 §2.3, 2026-05-16)
    # ESG audit cycle độc lập với Quality-Records: CDP annual, RBA 2-3 năm,
    # CMRT annual, UFLPA on-demand, SBTi 5-15 năm horizon.
    # =====================================================================
    s5 = ROOT / "HESEM-ESG-Compliance"
    # 01-RBA-Compliance: annual SAQ + 2-3 năm VAP + CAR + Code of Conduct
    mkpath(s5 / "01-RBA-Compliance" / YYYY)
    # 02-Carbon-Scope-1-2-3: GHG Protocol, SBTi, CDP — retention 15 năm
    mkpath(s5 / "02-Carbon-Scope-1-2-3" / YYYY)
    # 03-Conflict-Minerals-3TG-Cobalt: CMRT v6.40+ annual + CRT cobalt
    mkpath(s5 / "03-Conflict-Minerals-3TG-Cobalt" / YYYY)
    # 04-UFLPA-Supply-Chain-Map: aluminum/Si/W smelter map, mill location
    mkpath(s5 / "04-UFLPA-Supply-Chain-Map")
    # 05-Banned-Substance-Declarations: RoHS 3 + REACH SVHC + PFAS + halogen-free + chemSHERPA
    mkpath(s5 / "05-Banned-Substance-Declarations")
    # 06-Customer-Code-of-Conduct-Signed: 4 OEM Code signed
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(s5 / "06-Customer-Code-of-Conduct-Signed" / oem)
    # 07-Modern-Slavery-UFLPA-Statements: annual statement
    mkpath(s5 / "07-Modern-Slavery-UFLPA-Statements" / YYYY)

    # =====================================================================
    # NOTE: SITE 6 HESEM-Customer-Portals removed in v3 (2026-05-16).
    # Rationale: HESEM is a CONSUMER of customer portals (Ariba/Coupa/
    # myASML/TPS), not a publisher. Portal-pull/push evidence lives in
    # DEP-SCS + DEP-ERP scenarios and QMS-Governance/19.
    # =====================================================================

    # =====================================================================
    # SITE 6 — HESEM-Engineering-IP (NEW v3.1, 2026-05-16)
    # Separated L4-Restricted vault for: Customer CAD + HESEM Derivative
    # CAD + CAM Source + Post-Processor library + Reverse Engineering +
    # Trade-Secret Register + IP Access Acknowledgements + Patents.
    # Rationale (overriding earlier v3 §3 decision): user feedback explicit
    # — top-level visibility required. Site-level DLP + IB segment cho
    # nhóm engineer named-NDA AMAT/LAM/ASML/TEL; data-flow một chiều
    # từ DEP-ENG scenario folder modern-link, KHÔNG copy.
    # =====================================================================
    s6 = ROOT / "HESEM-Engineering-IP"
    # 01-Customer-CAD-Controlled — Customer-source IP, L4 strictest
    cad = s6 / "01-Customer-CAD-Controlled"
    mkpath(cad / "_Incoming-Quarantine")
    mkpath(cad / "_Receipt-Log" / YYYY)
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(cad / oem / "{PartNo}" / "REV-{Rev}" / "00-Controlled")
        mkpath(cad / oem / "{PartNo}" / "REV-{Rev}" / "_SUPERSEDED")
    # 02-HESEM-Derivative-CAD — internal models derived from customer source
    mkpath(s6 / "02-HESEM-Derivative-CAD" / "{IPN}" / "REV-{Rev}")
    # 03-CAM-Source-Restricted — CAM master + posted G-code archive
    mkpath(s6 / "03-CAM-Source-Restricted" / "{IPN}" / "{Machine}" / "source")
    mkpath(s6 / "03-CAM-Source-Restricted" / "{IPN}" / "{Machine}" / "posted")
    mkpath(s6 / "03-CAM-Source-Restricted" / "{IPN}" / "{Machine}" / "validation")
    # 04-Post-Processor-Kinematic-Library — machine-specific posts + kinematics
    mkpath(s6 / "04-Post-Processor-Kinematic-Library" / "PostProcessors")
    mkpath(s6 / "04-Post-Processor-Kinematic-Library" / "Kinematics")
    mkpath(s6 / "04-Post-Processor-Kinematic-Library" / "Qualification" / YYYY)
    # 05-Reverse-Engineering — gated per project with explicit authorization
    re_base = s6 / "05-Reverse-Engineering" / "{Project}"
    mkpath(re_base / "00-Authorization")
    mkpath(re_base / "01-Sample-Receiving")
    mkpath(re_base / "02-Scan-Data-3D")
    mkpath(re_base / "03-Reconstructed-CAD")
    mkpath(re_base / "04-Material-Analysis")
    mkpath(re_base / "05-Validation-Report")
    # 06-Trade-Secret-Register-Restricted — recipe / process know-how
    mkpath(s6 / "06-Trade-Secret-Register-Restricted")
    # 07-IP-Access-Acknowledgement — per engineer × customer × project
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(s6 / "07-IP-Access-Acknowledgement" / oem / "{Project}")
    # 08-Patent-Trademark-Filings — IP portfolio
    mkpath(s6 / "08-Patent-Filings" / "{CaseID}")
    mkpath(s6 / "08-Trademark-Filings" / "{CaseID}")
    # 09-Customer-Standards-Mirror — controlled customer spec library
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(s6 / "09-Customer-Standards-Mirror" / oem)
    # 99-Archive-Locked
    mkpath(s6 / "99-Archive-Locked" / YYYY)

    # =====================================================================
    # SITE 7 — HESEM-People-Competency (NEW v3.1, 2026-05-16)
    # Separated from HESEM-People (which holds PII contracts/medical/payroll)
    # to host the competency/training MATRIX and customer-audit people-pack
    # exports — these get shared cross-functionally (QA, Production, Audit)
    # without exposing PII. Live Power BI workspace also lives here.
    # =====================================================================
    s7 = ROOT / "HESEM-People-Competency"
    # 01-Skills-Taxonomy — master skill catalog
    mkpath(s7 / "01-Skills-Taxonomy")
    # 02-Required-Skill-Matrix — per role per dept
    mkpath(s7 / "02-Required-Skill-Matrix" / "{DeptCode}")
    # 03-Actual-Skill-Snapshot — quarterly snapshot, live in Power BI
    mkpath(s7 / "03-Actual-Skill-Snapshot" / "{DeptCode}" / YYYY)
    # 04-Competency-Gap-Report — annual analysis → ATP input
    mkpath(s7 / "04-Competency-Gap-Report" / YYYY)
    # 05-Cert-Expiry-Watch-90d — rolling 90-day expiry watch
    mkpath(s7 / "05-Cert-Expiry-Watch-90d")
    # 06-Customer-Approved-Operator-List — named lists for OEM audits
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(s7 / "06-Customer-Approved-Operator-List" / oem)
    # 07-Customer-Audit-People-Pack — redacted pack for customer audit
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(s7 / "07-Customer-Audit-People-Pack" / oem / YYYY)
    # 08-Critical-Cert-Library — taxonomy per cert family
    for cert in ["CNC-Operator", "Special-Process", "CMM-Operator",
                 "Lead-Auditor", "FAI-Engineer", "ESD-Coordinator",
                 "FOD-Trainer", "Forklift", "First-Aider", "Fire-Warden"]:
        mkpath(s7 / "08-Critical-Cert-Library" / cert)
    # 09-Training-Effectiveness-KPI — ATP delivery vs. plan
    mkpath(s7 / "09-Training-Effectiveness-KPI" / YYYY)
    # 99-Archive
    mkpath(s7 / "99-Archive" / YYYY)

    # =====================================================================
    # Workflow Libraries cấp công ty (ANNEX-141 §3 workflows + v3 ANNEX-143)
    # Đặt trong HESEM-Records/QMS-Governance/ để gắn QMS owner
    # =====================================================================
    qg = s1 / "QMS-Governance"
    # PCN-Register: List + folder structure cho mỗi PCN ID
    mkpath(qg / "15-PCN-Register" / "Active")
    mkpath(qg / "15-PCN-Register" / "Records" / YYYY)
    # Customer-Spec-Map: List mapping spec ID → HESEM procedure (per OEM)
    mkpath(qg / "16-Customer-Spec-Map")
    for oem in ["AMAT", "LAM", "ASML", "TEL"]:
        mkpath(qg / "16-Customer-Spec-Map" / oem)
    # External-Distribution-Log: cho audit export tracking
    mkpath(qg / "17-External-Distribution-Log" / YYYY)
    # Audit-Evidence-Library: cho customer audit response evidence
    mkpath(qg / "18-Audit-Evidence-Library" / YYYY)
    # 19-Customer-Portal-Evidence: portal-pull + portal-push receipts (replaces
    # the deleted SITE 6 publishing model with a consumer-side evidence vault)
    mkpath(qg / "19-Customer-Portal-Evidence" / "Inbound" / YYYY)
    mkpath(qg / "19-Customer-Portal-Evidence" / "Outbound-Staging" / YYYY)
    mkpath(qg / "19-Customer-Portal-Evidence" / "Submission-Receipts" / YYYY)


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

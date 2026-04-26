# 15_VERTICAL_PACK_AUTOMOTIVE.md

## Purpose

V5 Pharma vertical pack (file 14) covers life sciences. This file covers automotive: OEM + Tier-1/2 suppliers.

Standards:

- IATF 16949:2016 (automotive QMS)
- ISO 9001:2015 (general QMS, IATF supplement)
- VDA 6.3 (process audit)
- VDA 6.5 (product audit)
- ISO/TS 16949 (predecessor; legacy)
- AIAG-VDA FMEA Handbook 2019
- AIAG MSA 4th Edition
- AIAG SPC 2nd Edition
- AIAG APQP 2nd Edition (Advanced Product Quality Planning)
- AIAG PPAP 4th Edition (Production Part Approval Process)
- ISO 26262 (functional safety, automotive)
- ASPICE (Automotive SPICE for software process)
- IATF 16949 §8.7 (MRB requirements)
- CQI-9 (heat treat), CQI-11 (plating), CQI-12 (coating), CQI-15 (welding), CQI-17 (soldering), CQI-23 (molding) — special process audits
- VDA 19.1 / 19.2 (technical cleanliness)
- IPC-A-610 (electronics acceptability)

---

## Section 1 — Automotive-specific data model

### 1.1 New authoritative roots

```text
APQP            Advanced Product Quality Planning project
PPAP            Production Part Approval Process submission
PSW             Part Submission Warrant
CONTROL_PLAN    Production control plan (linked to PFMEA)
DFMEA           Design FMEA (extends FMEA root)
PFMEA           Process FMEA
PROCESS_FLOW    Process flow diagram
GAGE_RR         Gauge R&R study
INITIAL_SAMPLE  Initial sample inspection report
ROUTING         Manufacturing routing
SPECIAL_PROCESS Special process certification (CQI-9/11/12/etc)
LAYOUT_INSPECTION Annual layout inspection
WARRANTY_CLAIM  Warranty claim record
FIELD_RETURN    Customer field return
REQUIREMENT_LINK Customer-specific requirement reference
```

### 1.2 Edges

```text
APQP —MANAGES→ DFMEA, PFMEA, CONTROL_PLAN, PPAP
PPAP —SUBMITS→ PSW, GAGE_RR, INITIAL_SAMPLE, CONTROL_PLAN, DFMEA, PFMEA, ROUTING
CONTROL_PLAN —DERIVED_FROM→ PFMEA
PFMEA —ANALYZES→ PROCESS_FLOW
WARRANTY_CLAIM —AFFECTS→ ITEM, LOT
FIELD_RETURN —TRIGGERS→ NC (mandatory)
SPECIAL_PROCESS —CERTIFIES→ EQUIPMENT
```

V5 ADR-0236: Automotive vertical pack new roots + edges.

---

## Section 2 — APQP project lifecycle

```text
Phase 1: Plan and Define Program          (concept, voice of customer)
Phase 2: Product Design and Development   (DFMEA, design verification)
Phase 3: Process Design and Development   (PFMEA, control plan)
Phase 4: Product and Process Validation   (PPAP, run-at-rate)
Phase 5: Feedback Assessment and Corrective Action  (production launch)
```

V5 implements APQP as a workflow with phase gates:

```yaml
state_machine: apqp
states:
  - draft, phase_1_active, phase_1_complete, phase_2_active, phase_2_complete,
    phase_3_active, phase_3_complete, phase_4_active, phase_4_complete,
    phase_5_active, phase_5_complete, project_closed
transitions:
  - id: apqp.advance_phase
    guards:
      - all_phase_deliverables_complete
      - all_required_signoffs
      - customer_approval_received
    obligations:
      - reason_for_change
      - e_signature: { factor_count: 2, signers: 2 }
```

V5 ADR-0237: APQP state machine + phase gate enforcement.

---

## Section 3 — PPAP submission

### 3.1 18 PPAP elements (AIAG)

```text
1. Design Records
2. Engineering Change Documents (ECN)
3. Customer Engineering Approval
4. DFMEA
5. Process Flow Diagrams
6. PFMEA
7. Control Plan
8. MSA Studies (Gauge R&R)
9. Dimensional Results (initial sample)
10. Material/Performance Test Results
11. Initial Process Studies (Cpk)
12. Qualified Laboratory Documentation (ISO/IEC 17025)
13. Appearance Approval Report (AAR) — exterior parts
14. Sample Production Parts
15. Master Sample
16. Checking Aids
17. Customer-Specific Requirements
18. Part Submission Warrant (PSW)
```

### 3.2 PPAP submission levels

```text
Level 1: PSW only
Level 2: PSW + samples + limited supporting data
Level 3: PSW + samples + complete supporting data (DEFAULT)
Level 4: PSW + customer-specified data
Level 5: PSW + samples + supporting data at supplier site (audit-ready)
```

### 3.3 Generator

V5 PPAP generator pulls evidence from authoritative roots and packages a signed submission:

```text
- pulls DFMEA, PFMEA, CONTROL_PLAN, GAGE_RR, INITIAL_SAMPLE
- generates PSW with auto-filled customer + part info
- signs with company key
- packages as zip + digital signature
- submits via customer EDI / portal
- tracks customer approval status
```

V5 ADR-0238: PPAP generator + 18-element auto-assembly + level-aware submission.

---

## Section 4 — Control Plan

### 4.1 Control Plan structure

```text
Per characteristic:
  - characteristic_name (CC = Critical Characteristic)
  - tolerance / specification
  - measurement method
  - sample size + frequency
  - control method (SPC / 100% inspection / poka-yoke)
  - reaction plan (if OOS)
  - responsibility
```

### 4.2 Linkage to PFMEA

Every characteristic in Control Plan must trace to a PFMEA failure mode:

```text
PFMEA.failure_mode → CONTROL_PLAN.characteristic
                  → INSPECTION.check_item
                  → SPC_CHART (if applicable)
```

V5 enforces: a characteristic without PFMEA linkage flags as "uncontrolled risk".

### 4.3 Special characteristics

```text
CC (Critical Characteristic):  safety / regulatory; 100% inspection
SC (Significant Characteristic): customer-specified; SPC
KPC (Key Product Characteristic): function/fit/finish; SPC
KCC (Key Control Characteristic): process parameter; SPC
```

V5 ADR-0239: Special characteristics taxonomy + automatic SPC enrollment.

---

## Section 5 — IATF 16949 customer-specific requirements (CSRs)

Each OEM (Ford, GM, Stellantis, Toyota, etc.) publishes its own CSRs. Examples:

```text
Ford Q1                  supplier qualification standard
GM BIQS                  Built-In Quality Supply
Stellantis SQ          Stellantis supplier quality
Toyota TS              Toyota supply standard
VW Formel Q            VW supply quality
Renault-Nissan ASES    Alliance Supplier Evaluation Standard
```

### 5.1 CSR support

V5 stores customer-specific requirement references per customer:

```text
REQUIREMENT_LINK:
  customer_id, requirement_doc_uri, version, effective_at, applicable_parts[]
```

Suppliers' Control Plans must reference relevant CSRs; CI checks for orphan parts.

V5 ADR-0240: CSR repository + part-CSR linkage check.

---

## Section 6 — IMDS (International Material Data System)

For automotive parts, material declarations submitted to IMDS:

```text
- per part / sub-part: material composition
- substance restrictions (REACH, RoHS, etc.)
- recycled content reporting
- declarable substance threshold compliance
```

V5 ADR-0241: IMDS data model + declaration generator.

---

## Section 7 — Functional safety (ISO 26262, optional sub-pack)

For automotive electronics suppliers (E/E components):

```text
- HARA (Hazard Analysis and Risk Assessment)
- ASIL (Automotive Safety Integrity Level) classification A/B/C/D
- safety goals per HARA
- functional safety requirements
- technical safety requirements
- hardware safety requirements
- software safety requirements (per ASPICE alignment)
- safety case / case-for-safety
- ISO 26262 conformance evidence
```

V5 ADR-0242: ISO 26262 sub-pack for E/E suppliers (optional).

---

## Section 8 — Layered Process Audit (LPA)

IATF 16949 requires layered process audits:

```text
Layer 1: operator daily self-check
Layer 2: supervisor weekly check
Layer 3: middle management monthly check
Layer 4: senior management quarterly check
```

V5 implements LPA as a workflow:

```text
authoritative_root: LPA_PLAN
  - layer (1-4)
  - audit_frequency
  - process_step_id
  - check_questions[]
  - assigned_role

authoritative_root: LPA_AUDIT_RUN
  - plan_id
  - performed_at
  - performed_by
  - findings[]
  - corrective_actions[]
```

V5 ADR-0243: LPA workflow + multi-layer cadence enforcement.

---

## Section 9 — Warranty + field return analysis

### 9.1 Linkage to root cause

```text
WARRANTY_CLAIM:
  vehicle_id, vin, claim_date, dealer, mileage, complaint_text,
  diagnosis_text, repair_text, parts_replaced[], lot_codes[]
  
FIELD_RETURN:
  return_date, returned_by, condition, root_cause_findings, 
  link_to_warranty_claim, link_to_lot
```

### 9.2 Trend detection

```text
- per-part-number warranty rate (PPR — parts per repair)
- per-lot defect cluster
- dealer pattern detection (some dealers over-claim)
- rolling 30/90/365-day trends
```

### 9.3 8D problem-solving

V5 supports the 8D methodology for major customer issues:

```text
D1: Form team
D2: Describe problem (5W2H)
D3: Containment action
D4: Root cause analysis (5-Why, Fishbone)
D5: Permanent corrective action
D6: Implement + verify
D7: Prevent recurrence (system-level)
D8: Recognize team
```

V5 ADR-0244: 8D problem-solving workflow integrated with CAPA.

---

## Section 10 — Special process certification (CQI series)

### 10.1 Special processes per AIAG CQI

```text
CQI-9   Heat Treat System Assessment
CQI-11  Plating System Assessment
CQI-12  Coating System Assessment
CQI-15  Welding System Assessment
CQI-17  Soldering System Assessment
CQI-23  Molding System Assessment
CQI-27  Casting System Assessment
```

### 10.2 Implementation

```text
SPECIAL_PROCESS:
  process_id, cqi_standard (e.g., CQI-9), certification_date, 
  certification_expiry, audit_findings[], status
  
edges:
  SPECIAL_PROCESS —CERTIFIES→ EQUIPMENT (which equipment performs the process)
  SPECIAL_PROCESS —CERTIFIES→ ROUTING (which routings invoke it)
```

V5 ADR-0245: Special process certification tracking + expiry alerts.

---

## Section 11 — Annual layout inspection (LPI)

Per IATF 16949 §8.6.4:

```text
- annual full-feature dimensional inspection
- recorded vs original PPAP submission
- deviation triggers full investigation
- evidence retained per part lifetime
```

V5 ADR-0246: Annual layout inspection scheduler + deviation workflow.

---

## Section 12 — Customer EDI integration

Automotive customers commonly require EDI:

```text
850   Purchase Order
856   Advance Ship Notice (ASN)
860   Purchase Order Change
861   Receiving Advice
862   Shipping Schedule
865   PO Acknowledgment
997   Functional Acknowledgment

JIS / JIT scheduling
sequenced parts shipping
```

V5 ADR-0247: EDI ANSI X12 + EDIFACT support per customer; mapped to HESEM resource families.

---

## Section 13 — Cost of poor quality (COPQ)

```text
internal failure cost   scrap, rework, retest, downtime
external failure cost   warranty, field return, recall, lost customer
appraisal cost          inspection, testing, audit
prevention cost         training, FMEA, control plan, PPAP
```

V5 produces a COPQ dashboard rolling up these costs from authoritative_roots.

V5 ADR-0248: COPQ derived_read_model with cost categorization.

---

## Section 14 — Audit pack (IATF + customer)

```text
- IATF 16949 conformance evidence
- ISO 9001 conformance evidence
- per customer-specific requirement: evidence file
- LPA records last 12 months
- internal audit records
- management review minutes
- CAPA log
- supplier monitoring records
- customer scorecard summary
- COPQ trend
- annual layout inspection results
- special process certifications
```

V5 ADR-0249: Automotive audit pack template.

---

## Section 15 — ASPICE alignment (E/E software suppliers)

For E/E suppliers, V5 supports ASPICE process areas:

```text
- ACQ.4 Supplier monitoring
- SPL.2 Product release
- SYS.1-5 System engineering
- SWE.1-6 Software engineering
- MAN.3 Project management
- MAN.5 Risk management
- MAN.6 Measurement
- SUP.1 Quality assurance
- SUP.8 Configuration management
- SUP.9 Problem resolution management
- SUP.10 Change request management
```

V5 ADR-0250: ASPICE process area mapping (optional sub-pack).

---

## Section 16 — Cumulative ADRs

```text
ADR-0236  Automotive vertical pack new roots + edges
ADR-0237  APQP state machine + phase gates
ADR-0238  PPAP generator
ADR-0239  Special characteristics taxonomy + auto SPC
ADR-0240  CSR repository + linkage check
ADR-0241  IMDS data model
ADR-0242  ISO 26262 sub-pack (optional)
ADR-0243  LPA workflow
ADR-0244  8D problem-solving workflow
ADR-0245  Special process certification tracking
ADR-0246  Annual layout inspection
ADR-0247  EDI ANSI X12 + EDIFACT
ADR-0248  COPQ derived_read_model
ADR-0249  Automotive audit pack template
ADR-0250  ASPICE process area mapping (optional)
```

---

## Decision phrase

```text
V5_AUTOMOTIVE_VERTICAL_PACK_BASELINE_LOCKED
NEXT_FILE: 16_VERTICAL_PACK_AEROSPACE.md
```

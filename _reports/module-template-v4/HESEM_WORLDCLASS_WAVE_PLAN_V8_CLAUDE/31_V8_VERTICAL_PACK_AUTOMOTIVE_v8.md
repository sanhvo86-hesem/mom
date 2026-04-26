# 31 — V8 Automotive Vertical Pack

```text
purpose:        Carry forward V5 file 15 + V7 §21 automotive scope; V8 advances with mechanism
predecessor:    V5 file 15 (15 ADRs); V7 §21
v8_advance:     APQP state machine; PPAP generator schema; CSR repository; 8D workflow
work_package:   WP-V8-AUTO (8 work packages)
owner:          Automotive Pack Lead + Quality Engineer
estimate:       ~10 weeks (W10)
```

---

## 1. New roots (V5 file 15 carry-forward)

```text
APQP, PSW, PPAP, CONTROL_PLAN, GAGE_RR, INITIAL_SAMPLE, ROUTING (in core), 
SPECIAL_PROCESS (CQI series), LAYOUT_INSPECTION, WARRANTY_CLAIM, 
FIELD_RETURN, REQUIREMENT_LINK (per-OEM CSR)
```

---

## 2. APQP state machine (V5 file 15 §2 carry-forward)

```yaml
state_machine: apqp
states: [draft, phase_1_active, phase_1_complete, ..., phase_5_complete, project_closed]
transitions: per AIAG APQP 2nd Edition
phase_gates:
  - all_phase_deliverables_complete
  - all_required_signoffs
  - customer_approval_received
obligations: 2-person e-sign + reason_for_change at every phase advance
```

---

## 3. PPAP generator (V5 file 15 §3 carry-forward)

```yaml
PPAP 18 elements:
  1. Design Records
  2. Engineering Change Documents
  3. Customer Engineering Approval
  4. DFMEA
  5. Process Flow Diagrams
  6. PFMEA
  7. Control Plan
  8. MSA Studies (Gauge R&R)
  9. Dimensional Results
  10. Material/Performance Test Results
  11. Initial Process Studies (Cpk)
  12. Qualified Lab Documentation (ISO/IEC 17025)
  13. Appearance Approval Report
  14. Sample Production Parts
  15. Master Sample
  16. Checking Aids
  17. Customer-Specific Requirements
  18. Part Submission Warrant (PSW)

submission_levels: 1-5 (Level 3 default)
generator_output: zip + signed PSW PDF + manifest
exchange: customer EDI / portal
sla: < 24h from "submit PPAP" command
```

---

## 4. Control Plan ↔ PFMEA linkage

```yaml
PFMEA.failure_mode → CONTROL_PLAN.characteristic
CONTROL_PLAN.characteristic → INSPECTION.check_item
INSPECTION.check_item → SPC_CHART (where applicable)

Special characteristics:
  CC (Critical):    safety/regulatory; 100% inspection
  SC (Significant): customer-specified; SPC
  KPC (Key Product): function/fit/finish; SPC
  KCC (Key Control): process parameter; SPC

Auto-enrollment: special characteristics auto-enrolled in SPC machine
```

---

## 5. CSR repository

```yaml
REQUIREMENT_LINK records per customer:
  customer_id, requirement_doc_uri, version, effective_at, applicable_parts[]
examples: Ford Q1, GM BIQS, Stellantis SQ, Toyota TS, VW Formel Q, Renault-Nissan ASES
ci_check: scripts/verify_part_csr_linkage.py — every customer-supplied part references its CSRs
```

---

## 6. 8D problem-solving workflow

```yaml
state_machine: eight_d
states: [d1_team, d2_problem, d3_containment, d4_root_cause, d5_corrective, d6_implement, d7_prevent, d8_recognize, closed]
linked: every WARRANTY_CLAIM material → 8D process if customer requests
integration: file 08 SM-4 NC + CAPA + SCAR
```

---

## 7. LPA + Annual Layout Inspection

```yaml
LPA layers: operator daily, supervisor weekly, mid-mgmt monthly, sr-mgmt quarterly
LPA_PLAN + LPA_AUDIT_RUN authoritative roots
ALI: annual full-feature dimensional inspection
ALI deviation triggers: full investigation workflow
```

---

## 8. Customer EDI

```yaml
EDI ANSI X12 + EDIFACT support per customer:
  850 PO, 856 ASN, 860 PO Change, 861 Receiving, 862 Schedule, 865 PO Ack, 997 Functional Ack
JIT/JIS sequenced parts shipping
mapping: EDI fields → HESEM resource_family + commands
```

---

## 9. Work packages

```yaml
WP-V8-AUTO-1: New automotive roots + AL entries                      (W10, 1.5 wk)
WP-V8-AUTO-2: APQP state machine + phase gates                       (W10, 1 wk)
WP-V8-AUTO-3: PPAP generator (18-element zip + PSW)                 (W10, 2 wk)
WP-V8-AUTO-4: PFMEA ↔ Control Plan linkage + auto SPC enrollment    (W10, 1.5 wk)
WP-V8-AUTO-5: CSR repository + per-part linkage                     (W10, 1 wk)
WP-V8-AUTO-6: 8D workflow + warranty integration                    (W10, 1 wk)
WP-V8-AUTO-7: LPA + ALI workflows                                   (W10, 1 wk)
WP-V8-AUTO-8: EDI integration                                       (W10, 1 wk)
total: 10 wk
```

---

## 10. Decision phrase

```text
V8_AUTOMOTIVE_VERTICAL_PACK_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-AUTO-1..8
NEXT_FILE: 32_V8_VERTICAL_PACK_AEROSPACE_v8.md
```

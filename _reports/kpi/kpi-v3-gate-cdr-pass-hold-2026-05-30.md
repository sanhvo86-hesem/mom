# KPI V3 — Stage 07: G0→G7 Gate Control (pass/hold by quantitative evidence)

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/07-gate-g0-g7-control.md`
- **Type:** Validation-heavy (the gate structure is already complete and
  guard-enforced). No registry churn; report-only outcome.

---

## 1. Gate model is already complete and guard-enforced

The 46 `gate_control_metrics` each carry **all** required fields, verified by
direct probe:

```
gate_field_gaps     = []           (every metric has gate, linked_cdr,
                                     gate_pass_condition, hold_release_rule, owner_role)
gate_duplicate_codes = []          (no duplicate canonical_code)
gate_coverage       = ALL:3 · G0:3 · G1:7 · G2:3 · G3:8 · G4:3 · G5:9 · G6:3 · G7:7
```

The CI guard (`check_kpi_integrity.php`) already raises **P0** for any gate
metric missing `gate`, `linked_cdr`, `gate_pass_condition`, `decision_action`/
`hold_release_rule`, numeric thresholds, `owner_role`, or `evidence_source`
(lines ~690–768). So the V3 Stage-07 mandate — "every gate has ≥1 quantitative
pass metric with linked CDR, evidence and hold/release rule" — is **already met
and continuously protected**. Every G0–G7 has ≥3 metrics; none can pass on
feeling.

---

## 2. Full gate matrix (Gate → metric → CDR → owner → status)

| Gate | Metric | CDR | Owner | Status |
|---|---|---|---|---|
| G0 | RFQ_FEASIBILITY_STUDY_COMPLETENESS | A1 | EST | staged |
| G0 | RFQ_TURNAROUND_TIME | A1 | CS | staged |
| G0 | ORDER_REVIEW_RFT | A2,A5 | CS | staged |
| G1 | ENGINEERING_RELEASE_RFT | B1,B2 | ENGM | staged |
| G1 | ECN_LEAD_TIME | B3 | ENGM | staged |
| G1 | PROCESS_CHANGE_APPROVAL_RATE | B3 | ENGM | manual_governed |
| G1 | CONTROL_PLAN_PFMEA_APPROVAL | B8 | QA | staged |
| G1 | CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED | A2,A5 | CS | staged |
| G1 | CSR_ACKNOWLEDGEMENT_RATE | A2 | QA | staged |
| G1 | POST_CHANGE_CPK_REVALIDATION | D1,D3 | QA | manual_governed |
| G2 | IQC_PASS_RATE | D10 | QA | staged |
| G2 | TRACEABILITY_COMPLETENESS | D10 | SCM | staged |
| G2 | INSPECTION_PLAN_COMPLETENESS | B8 | QA | staged |
| G3 | MATERIAL_CERT_VERIFICATION_COMPLETENESS | D10 | SCM | manual_governed |
| G3 | LAM_MATERIAL_KIT_READY_TO_PLAN | C2,E5,D10 | PPL | manual_governed |
| G3 | IQC_RELEASE_ON_TIME | D10 | QA | manual_governed |
| G3 | TRACEABILITY_LABEL_VERIFIED | D10,D8 | QA | manual_governed |
| G3 | SPECIAL_PROCESS_REQUIREMENT_CLEAR | B8,E3,E4 | ENGM | staged |
| G3 | SUBTIER_REQUIREMENT_FLOWDOWN | E3,E4,E6 | SCM | manual_governed |
| G3 | SETUP_FIRST_PASS | B5,B6 | WKM | staged |
| G3 | CHANGEOVER_TIME | C4 | WKM | staged |
| G4 | FAI_FIRST_PASS | D1,D2 | QA | **runtime** |
| G4 | FAI_CYCLE_TIME | D1,D12 | QA | staged |
| G4 | GAGE_VALID_FOR_RELEASE | D1,D8 | MCS | manual_governed |
| G5 | IN_PROCESS_REJECT_RATE | D3 | WKM | **runtime** |
| G5 | SPC_SIGNAL_REACTION_TIME | D3,D4 | WKM | manual_governed |
| G5 | IPQC_CHARACTERISTIC_COMPLETENESS | D3,D4 | QA | staged |
| G5 | NCR_CONTAINMENT_ON_TIME | D3,D4,D6 | QA | staged |
| G5 | CMM_QUEUE_AGING | D1,D4,D7 | QA | manual_governed |
| G5 | CTQ_OUT_OF_SPEC_EVENT_COUNT | D3,D4,D6 | QA | manual_governed |
| G5 | CTQ_SPECIAL_CAUSE_OPEN_ACTIONS | D3,D4,D6 | WKM | manual_governed |
| G5 | GAGE_VALID_FOR_CTQ_MEASUREMENT | D3,D14 | MCS | manual_governed |
| G5 | GAGE_VALID_FOR_IN_PROCESS_MEASUREMENT | D3,D14 | MCS | staged |
| G6 | SHIP_PACKET_COMPLETENESS | D8 | QA | **runtime** |
| G6 | CHECK_DIM_REPORT_ON_SHIP | D8 | QA | manual_governed |
| G6 | TRACEABILITY_DRILL_TIME | D8 | QA | manual |
| G7 | OTD | D7 | SCM | **runtime** |
| G7 | SHIP_READY_TO_INVOICE_LT | D8 | FIN | staged |
| G7 | SPECIAL_RELEASE_COMPLIANCE | D11 | QA | manual_governed |
| G7 | SPECIAL_RELEASE_MARKING_COMPLIANCE | D11 | CPS | staged |
| G7 | LAM_EVIDENCE_PACK_COMPLETENESS | D11 | QA | manual_governed |
| G7 | CUSTOMER_ESCAPE_NOTIFICATION_LT | D11 | QA | manual |
| G7 | CUSTOMER_GAGE_DAMAGE_UNSUITABLE_NOTIFICATION_LT | D11 | QA | staged |
| ALL | FPY | D1,D3 | QA | runtime |
| ALL | COPQ | D3,D5,D9 | QA | runtime |
| ALL | OEE | C4,C7 | WKM | runtime |

5 gate metrics are runtime today (FAI_FIRST_PASS, IN_PROCESS_REJECT_RATE,
SHIP_PACKET_COMPLETENESS, OTD, + FPY/COPQ/OEE cross-cut); the rest are honest
manual_governed/staged with documented graduation contracts. **Every gate is
covered; no orphan; no duplicate.**

---

## 3. Red-line holds (already implemented as gate metrics)

The V3 prompt's "must not ship if…" list maps 1:1 onto existing gate metrics
with `hold_release_rule`:

| Red-line condition | Implementing gate metric(s) | Gate |
|---|---|---|
| Missing CoC / material cert / traceability | SHIP_PACKET_COMPLETENESS, TRACEABILITY_LABEL_VERIFIED, MATERIAL_CERT_VERIFICATION_COMPLETENESS, CHECK_DIM_REPORT_ON_SHIP | G3/G6 |
| Calibration / gage invalid for CTQ | GAGE_VALID_FOR_CTQ_MEASUREMENT, GAGE_VALID_FOR_RELEASE, GAGE_VALID_FOR_IN_PROCESS_MEASUREMENT | G4/G5 |
| Process/product change without customer approval | PROCESS_CHANGE_APPROVAL_RATE, POST_CHANGE_CPK_REVALIDATION | G1 |
| FAI/PPAP not passed and no waiver | FAI_FIRST_PASS, FAI_CYCLE_TIME | G4 |
| Deviation without written special release | SPECIAL_RELEASE_COMPLIANCE, SPECIAL_RELEASE_MARKING_COMPLIANCE | G7 |
| Final release packet incomplete | SHIP_PACKET_COMPLETENESS, LAM_EVIDENCE_PACK_COMPLETENESS | G6/G7 |
| Critical NCR not contained | NCR_CONTAINMENT_ON_TIME, CTQ_SPECIAL_CAUSE_OPEN_ACTIONS, CTQ_OUT_OF_SPEC_EVENT_COUNT | G5 |
| CMM/inspection plan not validated for critical feature | INSPECTION_PLAN_COMPLETENESS, IPQC_CHARACTERISTIC_COMPLETENESS, CMM_QUEUE_AGING | G2/G5 |

This directly satisfies the LAM/SEMSYSCO requirement (no shipment without written
special release / valid calibration / approved change) and AMAT precision/CTQ
discipline. The `CUSTOMER_ESCAPE_NOTIFICATION_LT` metric additionally has a guard
P0 forcing `containment_required = true` (notify-without-containment is blocked).

---

## 4. Finding: linked_cdr cannot be validated against ANNEX-121 (documented limitation)

`annex-121-raci-master-matrix.html` is a **1050-byte stub** (likely a
portal-rendered shell whose content loads at runtime via the DCC/RACI renderer);
a static parse finds **0 CDR codes**. So I cannot statically confirm each gate's
`linked_cdr` resolves to a row in the rendered RACI matrix.

**Mitigation — internal consistency validated instead:**
- All 29 referenced CDRs (A1,A2,A5,B1,B2,B3,B5,B6,B8,C2,C4,C7,D1–D12,D14,E3–E6)
  fall within the frozen CDR design space (domains A=commercial, B=engineering,
  C=production/equipment, D=quality, E=supplier/subtier) — consistent with the
  `process_catalog` domains and Stage 02 decision inventory.
- Owner roles are domain-consistent: A→CS/EST, B→ENGM, C→WKM, D→QA, D10/E→SCM,
  gage→MCS, OTD/ship→SCM/FIN. No quality CDR owned by a non-quality role, etc.
- **Recommendation (P1, Stage 12):** add a guard check that loads the RACI/CDR
  registry (when it exposes a machine-readable source) and asserts every gate
  `linked_cdr` exists and its owner matches the CDR's accountable role. Until the
  RACI source is machine-readable, this stays a documented manual-review item —
  not a fabricated pass.

---

## 5. Three Rounds of Self-Critique

**Round 1 — can any gate pass without quantitative evidence?** No. Every gate
metric has numeric thresholds + `gate_pass_condition` + `evidence_source`,
guard-enforced as P0. The weakest gates operationally are those still
`staged`/`manual` (most of G1–G3, G5) — they are *documented* holds but their
*data* isn't automated yet. That's an honest data-maturity gap, not a structural
hole; graduation is gated on the Stage-04 contracts.

**Round 2 — orphan / duplicate / wrong owner?** Probe confirms 0 duplicate
canonical codes, 0 field gaps, every G0–G7 covered. Owner roles are
domain-consistent. The one thing I cannot machine-verify is CDR↔owner against the
authoritative RACI (stub file) — flagged honestly as a limitation + a Stage-12
guard recommendation rather than asserted as validated.

**Round 3 — shopfloor simulation.** S6 (missing cert before ship):
SHIP_PACKET_COMPLETENESS + MATERIAL_CERT_VERIFICATION_COMPLETENESS hold at G6/G3.
S12 (special-process cert late): SPECIAL_PROCESS_REQUIREMENT_CLEAR +
SUBTIER_REQUIREMENT_FLOWDOWN at G3. S14 (gage not validated for CTQ):
GAGE_VALID_FOR_CTQ_MEASUREMENT hard-holds at G5. S13 (wrong revision):
PROCESS_CHANGE_APPROVAL_RATE + POST_CHANGE_CPK_REVALIDATION at G1. Every
simulated escape route hits an existing gate. The residual risk in all of them is
the same: the metric is *staged/manual*, so the hold is policy-enforced by people
today, not yet system-enforced — closed only when the data streams land.

---

## Definition of Done — Stage 07

- [x] Every G0→G7 has ≥1 quantitative pass metric (3+ each; verified coverage).
- [x] Every gate metric has linked_cdr (0 field gaps).
- [x] No orphan gate metric; no duplicate canonical_code.
- [x] No mis-coded value-stream/gate duplication (probe clean).
- [x] ANNEX-122 §9 ↔ registry sync is guard-enforced (P0 already); ANNEX-128 left
      to portal regeneration.
- [x] Guard PASS; 3 audits exit 0.
- [x] Red-line holds mapped to implementing metrics.
- [x] linked_cdr↔ANNEX-121 limitation documented honestly + Stage-12 guard rec.
- [x] 3-round self-critique + shopfloor simulation.

**Hand-off to Stage 08:** wire the active gate + value-stream metrics into the
T0–T3 tier-meeting cadence (WI-202) with an action playbook, and ensure each red
metric routes to an owner/action/escalation.

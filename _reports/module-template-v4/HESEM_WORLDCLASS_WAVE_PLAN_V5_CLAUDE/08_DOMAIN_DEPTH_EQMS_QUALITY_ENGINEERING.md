# 08_DOMAIN_DEPTH_EQMS_QUALITY_ENGINEERING.md

## Purpose

GPT Pro V4 §08 lists eQMS as a domain. V5 produces the engineering substance: state-machine network coupling, the NC↔CAPA↔BREL coupling that breaks every immature eQMS, and the analytical depth needed for Cp/Cpk, MSA, FMEA-MSR.

Standards relied on:

- ISO 9001:2015 (general QMS)
- ISO 13485:2016 (medical device QMS)
- IATF 16949:2016 (automotive QMS)
- AS9100D (aerospace QMS)
- ISO 14971:2019 (medical device risk management)
- AIAG-VDA FMEA Handbook 2019
- AIAG MSA 4th Edition (Measurement System Analysis)
- AIAG SPC 2nd Edition
- ISO/IEC 17025 (testing/calibration laboratories)
- ICH Q9 (quality risk management)

---

## Section 1 — The eQMS state-machine network

eQMS is the most coupled domain in HESEM. Five state machines interact:

```text
SM-3 Inspection            (file 01 §3)
SM-4 NC + CAPA + SCAR      (file 01 §3)
SM-5 Document (CDOC + ECO) (file 01 §3)
SM-6 Release (BREL)        (file 01 §3)
SM-8 Equipment (CAL/SPCRUN/FMEA/VAL) (file 01 §3)
```

The coupling is the engineering challenge: NC opens → lot quarantines → BREL blocks → CAPA opens → effectiveness check schedules → CDOC may need ECO → equipment FMEA may update → SPC limits may shift.

V5 represents these couplings as **explicit transition emit-rules**, not implicit code paths.

### 1.1 Coupling matrix

```text
when                                triggers
----                                --------
nc.open                             lot.quarantine_state := 'quarantined'
                                    lot.workflow_event   := 'lot_quarantined_due_to_nc'
                                    notify {lot_owner, qa_team}
nc.dispose_accept                   evaluate(remaining_open_nc_for_lot)
                                    if zero open NCs:
                                      lot.quarantine_state := 'clear'
                                      lot.workflow_event := 'lot_quarantine_released'
nc.dispose_reject                   lot.disposition_state := 'rejected'
                                    capa.required := true (auto-create or assign)
nc.dispose_rework                   wo.rework_required := true (link new MWO to lot)
nc.dispose_concession               cdoc.concession_required := true
                                    (released CDOC may require addendum)
capa.action_complete                schedule effectiveness_check after N days
                                    (typically 30-90 per QMS spec)
capa.effectiveness_check_pass       capa.lifecycle_state := 'closed'
                                    audit_event recorded
capa.effectiveness_check_fail       capa.lifecycle_state := 'reopened'
                                    new corrective action required
brel.attempt_release                evaluate guards:
                                      all_required_inspections.disposition = 'accept' AND
                                      lot.quarantine_state = 'clear' AND
                                      no_open_critical_NC_for_lot AND
                                      validation_evidence.fresh AND
                                      e_sign_obligation_met
brel.release_committed              cdoc.linked.lifecycle := 'released' (if pending)
                                    notify customers of release
cdoc.release                        may require ECO if first release
                                    or revision change
cdoc.supersede                      old version archived;
                                    new linked into existing release-history
eco.approve                         all CDOC linked transition to 'released'
                                    schedule training assignment if mandatory
fmea.update                         may shift SPC control limits;
                                    schedule SPC re-evaluation
fmea.add_failure_mode               new RPN/AP calculated;
                                    if AP=H, automatic CAPA candidate
spc.violation                       inspection.required := true (if not in progress)
                                    notify {process_engineer}
                                    if rule 1 (3σ): consider lot quarantine
calibration.oot                     review all measurements made by equipment
                                      since last passing calibration:
                                      - flag affected lots
                                      - flag affected inspections
                                      - flag affected validations
                                    auto-create NC if any quality decisions affected
val_run.fail                        related root.lifecycle := 'requalification_required'
                                    block any further releases of related root
```

### 1.2 Coupling enforcement

V5 ADR-0131: Coupling is encoded in `state_machine_definition.emits` as data, not in code paths. The orchestrator subscribes to the workflow_event stream and applies the coupling.

```yaml
# mom/data/state_machines/sm4_nc.yaml
transitions:
  - id: nc.open
    from: draft
    to:   open
    guards: [...]
    obligations: [reason_for_change]
    emits:
      - workflow_event: nc.opened
      - audit_event:    mutation
      - coupling:
          target: lot.quarantine
          rule: set_quarantined
          payload:
            lot_id: $.payload.subject_lot_id
            reason: nc_opened
            nc_id: $.subject_node_id
```

The coupling targets are evaluated against the policy directive. Forbidden couplings (e.g., autonomous CAPA close) raise RULE-2 violation alarm.

---

## Section 2 — NC severity grading

### 2.1 Severity model (per IATF + AS9100D + ISO 13485 hybrid)

```text
critical    immediate quarantine; production halt; CEO notification
major       quarantine + investigation; CAPA mandatory
minor       investigation only; CAPA optional
cosmetic    log + report; no quarantine
```

V5: severity is set at NC creation time and **frozen** unless escalated by formal review.

### 2.2 Trend detection

```text
- repeated minor-NCs of same defect mode → escalate to major
- minor-NC count > threshold per period → trigger trend CAPA
- supplier NC trend per supplier per part → trigger SCAR
```

V5 ADR-0132: Trend detection is a derived_read_model OTG node, with thresholds in policy directive (configurable per tenant).

---

## Section 3 — CAPA effectiveness check

### 3.1 Effectiveness check methodology

CAPA is closed only after evidence proves the corrective action prevented recurrence. V5:

```text
1. CAPA action_complete sets effectiveness_check_due_at = NOW + N days (default 90)
2. During interval, system tracks recurrence of the original defect mode
3. At due date:
   - if zero recurrence → effectiveness_check_pass
   - if recurrence count > 0 → effectiveness_check_fail; CAPA reopens
4. Effectiveness data is presented to CAPA owner who signs off (e-sign)
5. Independent QA reviewer co-signs (two-factor for regulated)
```

### 3.2 Effectiveness criteria (configurable)

```yaml
effectiveness_criteria:
  - id: zero_recurrence_60d
    description: "Zero recurrence of defect_code over 60 days"
    metric: count(NC where defect_code == :original_defect_code AND occurred > capa.completed_at)
    threshold: 0
    window: 60d
  - id: rate_reduction_80pct
    description: "Defect rate reduction ≥ 80% over 90 days"
    metric: defect_rate_per_unit_produced
    threshold: original_rate * 0.20
    window: 90d
```

V5 ADR-0133: CAPA effectiveness as data + automated metrics + manual sign-off.

---

## Section 4 — SCAR (Supplier Corrective Action Request)

### 4.1 SCAR lifecycle

```text
draft → opened → acknowledged_by_supplier → containment_in_place →
root_cause_identified → corrective_action_complete → effectiveness_check → closed
```

### 4.2 Supplier portal integration

The supplier portal (W9) lets suppliers acknowledge SCAR, submit response, and upload evidence. Time-boxed: response within 24h for critical, 5 business days for major.

### 4.3 Supplier scorecard impact

```text
SCAR open → supplier_score := score - score_penalty(severity)
SCAR closed effective → score restored gradually over 6 months
SCAR closed ineffective → score reduced permanently; supplier review triggered
```

V5 ADR-0134: SCAR ↔ supplier_score coupling rules.

---

## Section 5 — Document control + ECO discipline

### 5.1 CDOC lifecycle (per file 01 §3 SM-5)

```text
draft → in_review → approved → released → superseded
                                ↘ withdrawn
```

A CDOC release **may** require an ECO depending on:

```text
- first release of a controlled document → no ECO needed (initial release)
- minor revision (typo, grammar) → ECO not required if policy allows; logged
- major revision (content change affecting process) → ECO mandatory
- vertical-specific (Pharma) → ECO always mandatory for regulated CDOCs
```

V5 ADR-0135: ECO requirement matrix as policy directive; not hardcoded.

### 5.2 ECO state machine

```text
draft → impact_analysis_in_progress → impact_analyzed → in_review →
approved → implementing → verified → closed
                       ↘ rejected
```

### 5.3 Training trigger

Released CDOCs may trigger mandatory training:

```text
ECO.approve emits coupling: training_assignment
  target: comp_matrix
  rule: assign_training
  payload:
    course_id: derived from CDOC.training_course_id
    audience: derived from CDOC.role_audience
    due_at: NOW + 30 days
```

Training compliance is a release gate for affected processes.

---

## Section 6 — BREL (Batch / Build Release) discipline

### 6.1 Pre-release evidence chain

For BREL release commit, evidence chain must include:

```text
- all required inspections passed (per inspection plan)
- lot quarantine cleared (no open NCs blocking)
- relevant CAPA closed effectively (or scheduled effectiveness check)
- training compliance confirmed (operators completed mandatory training)
- equipment validation evidence fresh (last PQ within window)
- calibration status valid for measurement equipment
- master batch record / control plan adherence verified
- 21 CFR Part 11 e-sign captured (signer identity, meaning, timestamp)
- audit chain extension confirmed
```

### 6.2 Negative paths

If any evidence missing, BREL.attempt_release returns 422 problem-detail listing each failed evidence with concrete remediation. UI shows actionable checklist; user cannot proceed until every box ticks.

V5 ADR-0136: BREL release evidence chain definition + display contract.

---

## Section 7 — MSA (Measurement System Analysis)

### 7.1 GR&R study

For each critical measurement system:

```text
3 operators × 10 parts × 3 trials = 90 measurements
Calculate:
  - Repeatability (Equipment Variation, EV)
  - Reproducibility (Appraiser Variation, AV)
  - Part Variation (PV)
  - Total Variation (TV)
  - GRR / TV (% study variation)
  - GRR / Tolerance (% tolerance)
  - Number of Distinct Categories (NDC)
```

Acceptance criteria (per AIAG MSA 4th):

```text
GRR/Tolerance < 10%   → measurement system acceptable
10-30%                → marginal; specific application consideration
> 30%                  → unacceptable; rework system before relying on it
NDC ≥ 5                → adequate resolution
```

### 7.2 Bias and linearity

```text
Bias study: compare measurements to known reference standard
Linearity study: bias across range of measurements
```

V5 ADR-0137: MSA modules: GR&R, bias, linearity, stability. Calibration department workflow.

---

## Section 8 — FMEA-MSR + DFMEA + PFMEA

(See file 06 §9 for the foundation; this section adds eQMS-specific extensions.)

### 8.1 Linkage to control plan

```text
PFMEA.failure_mode → CONTROL_PLAN.characteristic
CONTROL_PLAN.characteristic → INSPECTION.check_item
INSPECTION.check_item → SPC_CHART (where applicable)
```

V5: a failure mode flagged in PFMEA but absent from CONTROL_PLAN raises a planning gap alarm.

### 8.2 FMEA review trigger

```text
NC opened → if NC.defect_mode is in PFMEA failure_modes:
              AP recalculation if Occurrence increases
            if NC.defect_mode is NOT in PFMEA failure_modes:
              FMEA update assignment to process engineer
              status: pending_fmea_update
              due: 30 days
```

V5 ADR-0138: NC ↔ FMEA gap closure workflow.

---

## Section 9 — Risk management (ISO 14971 for medical device)

### 9.1 Risk file structure

For each medical device customer's product, HESEM stores:

```text
authoritative_root: HAZARD
authoritative_root: HARM
authoritative_root: RISK_CONTROL
authoritative_root: RISK_BENEFIT_ANALYSIS
authoritative_root: POST_MARKET_SURVEILLANCE_DATA
```

Edges:

```text
HAZARD → CAUSES → HARM
HAZARD → CONTROLLED_BY → RISK_CONTROL
RISK_CONTROL → REDUCES → HAZARD.severity, HAZARD.probability
POST_MARKET_DATA → INFORMS → RISK_FILE_REVIEW
```

### 9.2 Severity × probability matrix

```text
       Negligible Minor Moderate Major Catastrophic
Frequent     L      M      H       VH      VH
Probable     L      M      H       H       VH
Occasional   L      L      M       H       VH
Remote       L      L      L       M       H
Improbable   L      L      L       L       M
```

Tolerable risk threshold: configurable per ISO 14971 risk policy.

V5 ADR-0139: ISO 14971 risk-file engine; per-customer risk policy.

### 9.3 Post-market surveillance feedback

NCs and complaints trigger risk file review automatically:

```text
NC severity ≥ major + product_id matches device → review trigger
COMPLAINT classified high-risk → review trigger
```

---

## Section 10 — Customer complaint handling

### 10.1 COMPLAINT lifecycle

```text
received → triaged → classified → investigation_in_progress →
root_cause_identified → corrective_action_in_progress → resolved → closed
```

### 10.2 Reportability evaluation

For medical devices in US: MDR (Medical Device Reporting) under 21 CFR 803 within 30 days of becoming aware. For EU: MIR (Manufacturer Incident Report) under MDR Article 87.

V5 implements an automated reportability evaluator:

```text
- if death or serious injury suspected → MDR/MIR mandatory; notify regulatory affairs immediately
- if device malfunction with potential to cause SI → MDR within 30 days
- if recurrence pattern → MDR
- otherwise → log only
```

V5 ADR-0140: Reportability evaluator + escalation to regulatory affairs.

### 10.3 NLP advisory (W6.5+)

The complaint NLP classifier (ML-5) suggests:

```text
- defect mode (probabilistic match to known modes)
- product family (from text)
- urgency tier
- whether to suggest field action investigation
```

The classifier is **advisory**; humans decide reportability.

---

## Section 11 — Internal audit module

### 11.1 Audit lifecycle

```text
plan → schedule → conduct → finding_recorded → response → corrective_action → close
```

Findings link to NCs and CAPAs.

### 11.2 Cadence

```text
- Process audit: per IATF 8.6.6, frequency by criticality (typ. annual)
- System audit: ISO 13485 §8.2.4 (annual)
- Product audit: per customer requirement
- Compliance audit: per regulatory schedule
```

### 11.3 ADR

```text
ADR-0141  Internal audit module + finding lifecycle
```

---

## Section 12 — Management review

### 12.1 Cadence

Per ISO 9001 §9.3: at least annual; HESEM customers can configure cadence (annual / bi-annual / quarterly).

### 12.2 Inputs

```text
- audit findings + closure rate
- customer feedback + complaints
- KPI dashboard (OEE, FPY, scrap rate, OTD, etc.)
- CAPA effectiveness data
- supplier performance trends
- training compliance
- risk register status
- regulatory updates affecting QMS
```

### 12.3 Outputs

```text
- improvement actions
- resource decisions
- QMS scope changes (if any)
- training plan updates
- risk register updates
```

V5: Management review is a workflow; outputs become CAPA / objective / training assignment records.

V5 ADR-0142: Management review automated input collection + output workflow.

---

## Section 13 — Quality KPI dashboard (per ISO 22400)

### 13.1 Mandatory KPIs

```text
First Pass Yield (FPY)
Cost of Poor Quality (COPQ): scrap + rework + warranty + complaint
Customer PPM (parts-per-million defective shipped)
Supplier PPM
On-Time Delivery (OTD)
Production Plan Attainment
Schedule Adherence
Capacity Utilization
OEE (per file 06 §6)
Mean Time To Repair (MTTR) — equipment
Mean Time Between Failures (MTBF) — equipment
Inspection Pass Rate per check item
SPC Cp/Cpk per critical characteristic
NC count by severity by period
CAPA cycle time + closure rate + effectiveness rate
SCAR cycle time per supplier
Training compliance rate
Audit finding closure rate
```

### 13.2 OTG materialized views

Each KPI is a materialized view derived from authoritative roots. Refresh cadence per KPI.

V5 ADR-0143: ISO 22400 KPI catalog implemented as MV registry.

---

## Section 14 — Supplier qualification + management

### 14.1 Supplier lifecycle

```text
prospect → evaluation → qualified → active → suspended → disqualified → reinstated
```

### 14.2 Evaluation criteria

```text
Per IATF 16949 §8.4.2.2:
  - quality system certification (ISO 9001 / IATF / ISO 13485)
  - financial stability
  - delivery capability
  - quality history
  - on-site audit
  - sample submission (PPAP for automotive)
```

### 14.3 Re-qualification triggers

```text
- expiration of certification
- SCAR ineffective close
- score drop below threshold
- contract renewal
- ownership change at supplier
```

V5 ADR-0144: Supplier qualification matrix + re-qualification trigger engine.

---

## Section 15 — Training matrix integration

### 15.1 Compete matrix

`COMP_MATRIX` defines per role × topic the required training course and frequency.

```yaml
comp_matrix:
  - role: line_operator
    topic: GMP_basics
    course: TRAIN-COURSE-001
    frequency: annual
  - role: line_operator
    topic: SOP-PROD-001
    course: TRAIN-COURSE-105
    frequency: ad_hoc + on_revision
  - role: qa_inspector
    topic: AQL_sampling
    course: TRAIN-COURSE-201
    frequency: annual
```

### 15.2 Compliance gates

```text
- only trained operators can perform certain transitions (guard check)
- training records visible in BREL release evidence chain
- training expiration triggers re-training assignment
```

V5 ADR-0145: Training as an L1 obligation type for restricted transitions.

---

## Section 16 — Cumulative ADRs

```text
ADR-0131  State-machine coupling encoded as data (not code)
ADR-0132  NC trend detection as derived_read_model
ADR-0133  CAPA effectiveness as data + metrics + sign-off
ADR-0134  SCAR ↔ supplier_score coupling
ADR-0135  ECO requirement matrix as policy directive
ADR-0136  BREL release evidence chain definition
ADR-0137  MSA modules
ADR-0138  NC ↔ FMEA gap closure
ADR-0139  ISO 14971 risk-file engine
ADR-0140  Reportability evaluator
ADR-0141  Internal audit module
ADR-0142  Management review automation
ADR-0143  ISO 22400 KPI catalog as MV registry
ADR-0144  Supplier qualification matrix engine
ADR-0145  Training as L1 obligation type
```

---

## Section 17 — Why this matters

V4 mentions eQMS as a domain. V5 makes it engineering: 8 coupled state machines, evidence chains, automated reportability, MSA, FMEA-MSR with control plan linkage, ISO 14971 risk file. This is the depth that separates "credible eQMS" from "checkbox eQMS".

---

## Decision phrase

```text
V5_EQMS_QUALITY_ENGINEERING_DEPTH_BASELINE_LOCKED
NEXT_FILE: 09_API_CONTRACT_FACTORY.md
```

# D6 — NC to CAPA (Nonconformance to Corrective and Preventive Action)

```
workflow_id:    D6
workflow_name:  NC to CAPA
domain_primary: Quality Improvement
domains_cross:  All domains (NC sources span entire system)
state_machine:  SM-6
trigger_count:  22
branch_count:   14
edge_case_count:12
kpi_count:      14
failure_mode_count: 12
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-3 BD-5
ai_advisory:    AI-13 AI-20
version:        V10-deep
```

---

## §1 Purpose and Scope

The NC to CAPA workflow governs the full cycle from identification of a
non-conformance through root cause analysis, corrective and preventive action
execution, and verified effectiveness closure. It is the primary quality
improvement engine in the HESEM system — every significant process failure,
product non-conformance, customer complaint, audit finding, and deviation that
requires systemic remediation is managed through this workflow.

D6 owns SM-6 (NC/CAPA State Machine) and references the CAPA classification
scheme (Class A through E) that determines cycle-time SLAs, root-cause method
requirements, and effectiveness verification windows. It feeds D7 (Document to
Release) for procedure changes, D8 (Train to Qualify) for operator retraining,
D3 (Plan to Produce) for process control updates, and D2 (Procurement to Pay)
for supplier corrective actions (SCAR).

Standards aligned: ISO 9001 §10.2, ISO 13485 §8.5.2, IATF 16949 §10.2.3
(8D requirement), 21 CFR 820.100 (CAPA), EU GMP Chapter 1 §1.4, ICH Q10
§3.2.2, AS9100D §10.2, Annex 11 §10 (electronic records).

---

## §2 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | NCR or quality event record created with minimum fields: `defect_description`, `source`, `affected_scope` | NCR completeness validator |
| PC-2 | Reporter holds `QMS_NC_CREATE` permission | RBAC |
| PC-3 | CAPA class assigned by QC Manager (not self-assigned by reporter) | Class assignment role check — CAPA class downgrade requires BD-5 |
| PC-4 | For Class A (safety/regulatory): Quality Director notified within 24 hours | Notification SLA enforced |
| PC-5 | For J1 pharma deviation: QP informed at NC creation | J1 QP notification check |
| PC-6 | For J4 vigilance cases: Regulatory Affairs informed before CAPA opens | J4 overlay |

---

## §3 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | IQC first-pass fail disposition | D4 → D5 referral |
| T-02 | In-process inspection fail during WO | D3 Step 8; D5 referral |
| T-03 | Final inspection fail | D3 Step 9 |
| T-04 | Customer complaint received | D1 / customer portal |
| T-05 | Field return with defect confirmed | D1 RMA; D12 |
| T-06 | Internal audit finding: requires corrective action | D13 audit flow |
| T-07 | Regulatory inspection finding (FDA, EMA, ANAB, NADCAP) | Regulatory visit |
| T-08 | Supplier audit finding | C3 supplier quality |
| T-09 | Process monitoring excursion: SPC out-of-control signal | C6 MES; SPC module |
| T-10 | Scrap or rework rate exceeds threshold | D3 / D5 COPQ |
| T-11 | CCP deviation during production (J5) | D3 HACCP monitoring |
| T-12 | Cold-chain excursion confirmed (J1/J4/J5) | D4 cold-chain branch |
| T-13 | Stability OOS confirmed (J1) | Stability program |
| T-14 | Counterfeit confirmed (J3) | D4/D5 counterfeit branch |
| T-15 | Equipment calibration failure: OOT (Out-of-Tolerance) | C9 calibration |
| T-16 | Adverse event / near miss in EHS | C9 EHS incident |
| T-17 | Systemic CAPA detection: trend threshold exceeded | Trend analysis engine |
| T-18 | Risk register action overdue (risk escalation) | C7 risk management |
| T-19 | Pharma deviation: planned deviation during clinical supply (J1) | J1 deviation |
| T-20 | FSCA (Field Safety Corrective Action) trigger (J4) | D12 / Regulatory |
| T-21 | LPA (Layered Process Audit) failure finding (J2) | J2 LPA |
| T-22 | Management review action item | Annual management review (C7) |

---

## §4 CAPA Classification

| Class | Name | Trigger Criteria | SLA | RCA Method | Effectiveness Window |
|-------|------|-----------------|-----|-----------|---------------------|
| A | Safety / Regulatory | Safety risk; regulatory citation; field injury/death risk | 30 days | FTA + 5 Whys + 8D if ≥ J2 | 90 days post-close, ≥ 3 verification cycles |
| B | Systemic Major | Repeat defect; customer SCAR; audit major finding | 60 days | 8D (J2); Ishikawa + 5 Whys (all) | 90 days post-close, ≥ 2 verification cycles |
| C | Process Improvement | Single-occurrence; no repeat; internal finding | 120 days | 5 Whys; Ishikawa | 60 days post-close, ≥ 1 verification cycle |
| D | Preventive | Risk-driven; horizon-scan; no defect yet | Next periodic review (≤ 180d) | Risk-based FTA or FMEA | After next audit cycle |
| E | Emergency | Safety stop; production halt; Class A + urgent | 7 days (containment); then Class A full cycle | Rapid 5 Whys + interim containment; full RCA within 30d | Per Class A |

**CAPA class downgrade axiom**: CAPA class cannot be downgraded by the reporter
or the assigned engineer. Downgrade requires Quality Director e-signature (BD-5).
This prevents social-pressure reclassification of systemic issues to avoid
Class A/B rigor.

---

## §5 State Machine — SM-6 NC/CAPA

### States

| State | Meaning |
|-------|---------|
| `open` | NC/CAPA created; initial data entry complete |
| `classified` | CAPA class assigned; owner assigned; SLA clock started |
| `containment` | Immediate containment actions in execution (Class A/B/E) |
| `root_cause_analysis` | RCA in progress; tools selected; investigation active |
| `action_plan` | Corrective and preventive actions defined; approval pending |
| `action_execution` | Actions being implemented; evidence being collected |
| `effectiveness_review` | Actions complete; effectiveness verification period active |
| `bd_approval_pending` | BD-3 (CAPA close) or BD-5 (class downgrade) committee required |
| `closed` | Effectiveness verified; QA Director approved closure; lessons learned recorded |
| `overdue` | SLA exceeded without closure; escalated |
| `cancelled` | NC found to be erroneous; cancellation requires QA Manager e-sig |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `open` | QC Manager classifies | `class ∈ {A,B,C,D,E} ∧ owner_assigned` | `classified` | QC Manager |
| `classified` | Containment actions initiated (Class A/B/E) | `containment_required = true` | `containment` | CAPA Owner |
| `classified` | Skip containment (Class C/D) | `containment_required = false` | `root_cause_analysis` | CAPA Owner |
| `containment` | Containment complete | `containment_actions_verified = true` | `root_cause_analysis` | QC Manager |
| `root_cause_analysis` | RCA documented | `root_cause_confirmed ∧ rca_method_evidence_attached` | `action_plan` | CAPA Owner |
| `action_plan` | Action plan approved | `action_plan_approved_by ≠ null` | `action_execution` | QA Manager |
| `action_execution` | All actions completed | `all_actions.status = COMPLETE ∧ evidence_attached` | `effectiveness_review` | CAPA Owner |
| `effectiveness_review` | Effectiveness window elapsed + evidence positive | `verification_cycles_met ∧ recurrence_rate = 0` | `bd_approval_pending` | System |
| `bd_approval_pending` | BD-3 quorum e-sigs obtained | `quality_director_esig = true ∧ process_owner_esig = true` | `closed` | QA Director |
| `bd_approval_pending` | BD-3 sigs insufficient | — | `effectiveness_review` | System |
| `action_execution` | SLA approaching/exceeded | `days_elapsed > sla_days * 0.9` | `overdue` | System |
| `overdue` | Escalation acknowledged + plan updated | `escalation_response = true` | `action_execution` | QA Director |
| `classified` | Downgrade requested | `bd_5_esig_required` | `bd_approval_pending` (BD-5) | Quality Director |

---

## §6 Step Substance

### Step 1 — NC Opening and Scope Definition

Reporter creates `nonconformance_report` with:
- `nc_source` (inspection, complaint, audit, monitoring, regulatory, etc.)
- `defect_description` (what was found, where, when)
- `affected_item_id`, `affected_lot_id[]`, `affected_process_id`
- `immediate_severity_assessment` (SAFETY, QUALITY, PROCESS, ENVIRONMENTAL)
- `containment_recommended` (bool)
- `attachments[]` (photos, measurement records, inspection results)

Reporter cannot assign CAPA class — this prevents reporters from
self-classifying low to avoid action. QC Manager reviews within:
- 4 hours for Class A/E candidates
- 24 hours for Class B candidates
- 5 business days for Class C/D candidates

### Step 2 — Classification and Owner Assignment

QC Manager reviews scope and assigns:
- `capa_class` per classification table
- `capa_owner` (responsible engineer or process owner)
- `target_close_date` = `classification_date + sla_days[class]`
- `root_cause_method[]` (required methods for this class)
- `effectiveness_metric_definition` (how effectiveness will be measured)

QC Manager signs classification with e-signature; SLA clock starts.
Quality Director notified for Class A and E.

### Step 3 — Immediate Containment (Class A, B, E)

Containment actions must be initiated within:
- Class E: 2 hours
- Class A: 24 hours
- Class B: 48 hours

Typical containment actions:
- Quarantine all affected lots (WMS hold transaction)
- Stop production on affected process (WO suspension)
- Customer notification if affected product already shipped
- SCAR issued to supplier (if supplier-caused)
- Regulatory notification if required (FDA MedWatch, FDA Field Alert Report,
  EU competent authority, etc.)

Each containment action is a `capa_action` with:
`action_type = CONTAINMENT`, `action_description`, `responsible_person`,
`due_date`, `completion_date`, `evidence_description`, `evidence_attachment_id`

### Step 4 — Root Cause Analysis

Root cause methods by class:

**5 Whys** (all classes): structured interrogation from symptom to root cause.
Each "Why" step recorded as `rca_step` with: question, answer, evidence,
next_why. Minimum depth: 5 levels for Class A/B; 3 levels for Class C.

**Ishikawa (Fishbone)** (Class B/C): causes mapped to 6M categories
(Man, Machine, Material, Method, Measurement, Environment). Each cause branch
documented with supporting evidence.

**8D (Eight Disciplines)** (mandatory for J2 IATF 16949 §10.2.3 and
recommended for Class B SCAR responses):
- D1: Team formation
- D2: Problem description (5W2H)
- D3: Containment actions
- D4: Root cause identification (Ishikawa + 5 Whys)
- D5: Chosen permanent corrective actions
- D6: Implementation and validation
- D7: Prevent recurrence (FMEA update, control plan update)
- D8: Team recognition and lessons learned

System provides structured 8D form with all 8 discipline sections;
each section has required fields and evidence attachment slots.

**Fault Tree Analysis (FTA)** (Class A/E): top-level event decomposed into
AND/OR gates showing failure logic. FTA diagram stored as `rca_diagram`
attachment. Minimum cut sets identified.

**TapRooT** (supported): for complex Class A events, TapRooT root cause
categories mapped to `rca_step.category_code`.

Root cause confirmed by QA Manager review before proceeding to action planning.

### Step 5 — Corrective and Preventive Action Planning

CAPA action plan distinguishes:
- **Corrective actions**: address identified root cause (fix the system, not just
  the symptom)
- **Preventive actions**: address potential root causes in similar processes
  not yet manifesting defects

Each action in `capa_action` table:
- `action_type` ∈ {CORRECTIVE, PREVENTIVE, CONTAINMENT}
- `action_category` ∈ {PROCEDURE_CHANGE, PROCESS_CHANGE, TRAINING,
  EQUIPMENT, DESIGN_CHANGE, SUPPLIER_DEVELOPMENT, MONITORING_INCREASE}
- `responsible_person_id`, `due_date`
- `verification_method` (how completion will be proven)
- `cross_references[]`: links to D7 document changes, D8 training assignments,
  D3 routing changes, D2 SCAR records

Action plan approval: QA Manager e-signature required before execution begins.
For Class A: Quality Director co-signature.

### Step 6 — Action Execution and Evidence Collection

Each `capa_action` tracks execution status. Owner updates action with:
- `completion_date`
- `evidence_description`
- `evidence_attachment_id[]` (updated procedures, training completion records,
  process audit results, measurement data)

Cross-linked activities auto-update:
- Document changes: D7 document revision workflow triggered; CAPA action
  marked `pending_doc_release` until document reaches `released` state
- Training assignments: D8 training needs identified and assigned; CAPA action
  marked `pending_training_completion` until training records signed
- Process changes: D3 routing/BOM update linked; WO dispatch blocked until
  change released

### Step 7 — Effectiveness Review

After all actions complete, effectiveness review period begins.
Effectiveness is measured against the `effectiveness_metric_definition`
set at classification:

Examples:
- Incoming PPM from supplier: zero defective lots in 90 days
- Scrap rate on process: rate below threshold for 3 consecutive weeks
- Inspection audit score: ≥ 95% for 2 consecutive audits
- Recurrence rate: zero instances of same root cause in effectiveness window

Verification cycles are `effectiveness_check` records. Each check:
- `check_date`
- `measurement_value`
- `pass_fail`
- `verifier_id` (must be QA, not CAPA owner)
- `verifier_note`

If any verification check FAILS: CAPA returns to `action_execution`;
root cause or action plan may need revision; class may be escalated.

### Step 8 — BD-3 Closure Gate

CAPA closure is a Banned Decision:
**BD-3**: No CAPA may be closed without Quality Director e-signature
AND process area owner e-signature.

This applies to ALL classes (A through E) — there is no class exemption.
The API enforces this at `POST /api/v1/capa/{id}/close`:
```json
{
  "type": "https://hesem.io/problems/banned-decision",
  "status": 403,
  "bd_code": "BD-3",
  "detail": "BD-3: CAPA closure requires Quality Director e-signature and Process Owner e-signature.",
  "required_signatories": ["quality_director", "process_owner"],
  "signed_by": []
}
```

Upon closure:
1. `capa.status = closed`; `capa.closed_date` set
2. Lessons learned document created (if Class A or B)
3. FMEA/Control Plan update triggered if action included process change
4. Management review agenda item for Class A/B closures
5. Supplier scorecard updated if SCAR-linked

---

## §7 Systemic CAPA Detection

The trend analysis engine monitors defect data to identify patterns that
individually fall below CAPA trigger thresholds but collectively indicate
systemic issues:

**Trend rules** (configurable):
- Same defect code on same item: ≥ 3 occurrences in 30 days → auto-CAPA Class C
- Same supplier IQC fail: ≥ 2 fails in 60 days → auto-CAPA SCAR
- Same root cause code on any items: ≥ 4 occurrences in 90 days → Class B CAPA
- Scrap rate on work center: exceeds threshold × 1.5 for 5 consecutive shifts → Class B
- Customer complaint from same customer: ≥ 2 in 30 days → Class B

Each trend trigger creates a `systemic_capa_signal` record that the QC Manager
reviews and either escalates to CAPA or dismisses with documented justification.
Dismiss requires QA Manager e-sign to prevent routine suppression of trends.

---

## §8 Per-Pack Overlays

### J1 Pharma
- **Planned deviations**: for approved deviations from standard process
  during clinical supply manufacturing, a formal deviation record is created
  (pre-approved by QP) before production. Unplanned deviations during batch
  manufacturing trigger an unplanned deviation CAPA. ICH Q10 §3.2.2 requires
  all deviations to be documented and investigated.
- **APR/PQR**: Annual Product Review (APR) or Product Quality Review (PQR)
  findings feed systemic CAPA. Adverse trend in annual data triggers preventive
  CAPA Class D.
- **PSUR**: Post-marketing safety data from PSUR findings can trigger CAPA
  for manufacturing process risk.

### J2 Automotive
- **8D mandatory**: all SCARs and customer complaints require 8D format per
  IATF 16949 §10.2.3. System generates 8D PDF for customer submission.
- **FMEA update**: CAPA closure for any design or process defect triggers
  review and update of the associated DFMEA or PFMEA. Updated risk priority
  numbers (RPN) recorded.
- **LPA (Layered Process Audit) failure**: LPA non-conformance triggers CAPA
  (Class C minimum). If LPA detects same finding at 2 consecutive audits:
  escalated to Class B.

### J3 Aerospace
- **AS9100D §10.2**: root cause analysis is required for all non-conformances;
  documented evidence of corrective action effectiveness is mandatory.
  No time waiver even for low-risk parts.
- **GIDEP notification**: for counterfeit or suspect counterfeit findings,
  GIDEP hazard alert filing is a CAPA action item (mandatory within 15 days
  of confirmation).
- **NADCAP nonconformance**: for special process failures at NADCAP-accredited
  facilities, the accreditation body is notified; CAPA response submitted
  within required timeframe.

### J4 Medical Device
- **21 CFR 820.100**: CAPA procedures must include analysis of processes,
  work operations, concessions, quality audit reports, quality records, service
  records, and complaints to identify existing and potential causes of
  non-conforming product.
- **Vigilance assessment**: Class A CAPAs involving field-returned devices
  require Regulatory Affairs to assess EU MDR Article 87 reportability
  and FDA MDR Part 803 reportability.
- **DHF/DMR impact**: CAPA actions requiring design changes must update the
  Design History File and Device Master Record.

### J5 Food Safety
- **FSMA preventive controls**: CCP deviation CAPAs must include corrective
  action plan under FSMA §117.150: identify the affected food; evaluate the
  affected food for safety; prevent the food from entering commerce (if
  necessary); correct the cause.
- **PCQI involvement**: CAPA for CCP deviations requires PCQI review and
  sign-off on corrective action adequacy.

---

## §9 Banned Decision Boundaries

| BD | Description | Trigger | API Enforcement |
|----|------------|---------|----------------|
| BD-3 | CAPA closure | Any CAPA reaching `bd_approval_pending` | `POST /api/v1/capa/{id}/close` → 403 without QDir + process_owner e-sig |
| BD-5 | CAPA class downgrade | Request to lower CAPA class after classification | `PATCH /api/v1/capa/{id}/classify` → 403 if downgrade without Quality Director e-sig |

---

## §10 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-13 RCA Intelligence | Root cause analysis (Step 4) | Similar historical NC pattern matching; probable root cause suggestion with confidence score; recommended RCA depth |
| AI-20 CAPA Recommendation | Action planning (Step 5) | Action effectiveness prediction based on historical action-outcome pairs; alternative action suggestions |

---

## §11 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D6-01 | CAPA On-Time Closure Rate | CAPAs closed before SLA date / total CAPAs × 100 | ≥ 90% |
| KPI-D6-02 | Class A Mean Time to Containment | NC open → containment complete (Class A) | ≤ 24 hours |
| KPI-D6-03 | Recurrence Rate | CAPAs where same root cause reappears within 12 months / closed CAPAs × 100 | ≤ 5% |
| KPI-D6-04 | Effectiveness Verification Pass Rate | Effectiveness checks PASS first attempt / total effectiveness reviews × 100 | ≥ 85% |
| KPI-D6-05 | SCAR Response Rate | Supplier CARs responded within SLA / total CARs issued × 100 | ≥ 95% |
| KPI-D6-06 | RCA Depth Score | Average number of verified Why levels for Class A/B CAPAs | ≥ 4 |
| KPI-D6-07 | Systemic CAPA Detection Rate | Systemic CAPA signals auto-detected / total CAPAs opened × 100 | ≥ 20% (measure trend engine efficacy) |
| KPI-D6-08 | COPQ Reduction Attributable to CAPA | COPQ cost in period vs. prior period after CAPA closure | Trending down |
| KPI-D6-09 | Overdue CAPA Rate | CAPAs in `overdue` state / total open CAPAs × 100 | ≤ 5% |
| KPI-D6-10 | 8D Submission On-Time Rate (J2) | 8D reports submitted to customer within SLA / total 8D requests × 100 | ≥ 95% |
| KPI-D6-11 | FMEA Update Completion Rate | CAPAs with process/design action triggering FMEA update, FMEA updated / total × 100 | 100% |
| KPI-D6-12 | Class Downgrade Rate | CAPA class downgrades / total classified CAPAs × 100 | ≤ 2% (BD-5 gate controls this) |
| KPI-D6-13 | Regulatory Audit NC Repeat Rate | Regulatory audit findings that were previously identified / total audit findings × 100 | 0% target |
| KPI-D6-14 | Lessons Learned Capture Rate | Class A/B CAPAs with lessons learned document / total Class A/B closures × 100 | 100% |

---

## §12 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | CAPA class downgraded to avoid rigor | Organizational pressure; reporter influence | BD-5 audit; class distribution KPI | BD-5 hard gate; downgrade requires QA Director e-sig |
| FM-02 | Root cause superficial — symptom treated, not cause | RCA tool misapplied; time pressure | Recurrence rate KPI; RCA depth score | Mandatory minimum depth; QA Manager review of RCA before action plan |
| FM-03 | Effectiveness period too short | SLA pressure; class assigned incorrectly | Recurrence after closure | Effectiveness window enforced by system; cannot be shortened without QA Director approval |
| FM-04 | Action plan not linked to document changes | Procedural changes missed | Document change completeness audit | CAPA closure checklist: all procedure-type actions must have D7 doc release linked |
| FM-05 | Training not assigned after CAPA action | Training action created but not tracked | Training completion audit | CAPA action type TRAINING automatically creates D8 training assignment |
| FM-06 | Systemic pattern not detected | Trend engine thresholds too high; manual suppression | Recurrence KPI; trend review meeting | Trend dismiss requires e-sig; monthly trend review by QA Manager |
| FM-07 | SCAR not issued to supplier for supplier-caused NC | Reporter scope limited to internal process | Supplier root cause rate; SCAR issuance audit | NC source = SUPPLIER automatically prompts SCAR creation |
| FM-08 | BD-3 bypassed — CAPA closed without quality director sign | Technical workaround; access control gap | BD-3 audit log; API enforcement | Hard API block; no workaround; audit of all closed CAPAs for BD-3 compliance |
| FM-09 | Counterfeit GIDEP alert not filed (J3) | CAPA action item missed | GIDEP action completeness check | Counterfeit CAPA automatically includes mandatory GIDEP action item |
| FM-10 | Pharma deviation not pre-approved (J1) | Planned deviation started without QP sign | EBR enforcement; QP availability check | EBR step for planned deviation requires QP e-sig before step can start |
| FM-11 | CCP corrective action insufficient (J5) | PCQI not involved | PCQI review check | CCP deviation CAPAs require PCQI e-sig before action plan approval |
| FM-12 | Overdue CAPA escalation not actioned | Escalation notification not reviewed | Overdue KPI; management review agenda | Overdue CAPAs automatically appear on QA Director's dashboard |

---

*Decision phrase: S2-10_D6_D7_DEEP_UPGRADE_COMPLETE (partial — D6 complete)*

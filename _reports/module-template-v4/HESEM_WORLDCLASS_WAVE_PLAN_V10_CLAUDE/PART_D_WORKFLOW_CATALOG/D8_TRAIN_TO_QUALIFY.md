# D8 — Train to Qualify

```
workflow_id:    D8
workflow_name:  Train to Qualify
domain_primary: Workforce & Training
domains_cross:  Quality Improvement, MES Execution, Maintenance & EHS,
                Planning & Production, All regulated domains
state_machine:  SM-8
trigger_count:  21
branch_count:   14
edge_case_count:11
kpi_count:      12
failure_mode_count: 12
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-6
ai_advisory:    AI-23
version:        V10-deep
```

---

## §1 Purpose and Scope

The Train to Qualify (T2Q) workflow governs the full lifecycle of a training
assignment: from identification of a training need through delivery, competency
assessment, and formal qualification certification. Completed training records
are the primary input to the Eligibility Resolver G1 gate in D3 (Plan to
Produce), which blocks WO dispatch for operators lacking current certification.

D8 owns SM-8 (Training Record State Machine) and the skill and competency
taxonomy. It receives triggers from D7 (document release cascade), D6 (CAPA
retraining action), C10 (workforce management), and per-pack regulatory
requirements (aseptic personnel qualification, PCQI certification, ITAR person-
of-record, PRRC registration, NADCAP auditor certification).

Standards aligned: ISO 13485 §6.2, IATF 16949 §7.2, AS9100D §7.2, 21 CFR
211.68 (training records), EU GMP Chapter 2 §2.8–2.11, FSMA §117.4.

---

## §2 Skill and Competency Taxonomy

| Level | Category | Examples |
|-------|---------|---------|
| L1 | General/Safety | Machine safety, LOTO awareness, GMP basics, GHS/SDS |
| L2 | Process Generic | Statistical sampling, basic metrology, cleanroom gowning |
| L3 | Process Specific | TIG welding 3G, CNC milling setup, SMT solder, injection molding |
| L4 | Quality Method | AQL inspection, SPC charting, Gauge R&R, 8D problem solving |
| L5 | Regulatory | DSCSA handler, ITAR person-of-record, PCQI, PRRC, aseptic technique |
| L6 | Advanced/Certified | Lean Black Belt, Quality Engineer, NADCAP auditor, LPA auditor, 8D lead |
| L7 | Executive/Authority | QP/RP (Pharma), Responsible Engineer (Aero), DPO (GDPR), Food Safety Team Lead |

Each skill has:
- `skill_code` (unique, e.g., `WELD-TIG-3G`, `ASEPTIC-GOWN-CLASS-A`, `PCQI-FSMA`)
- `min_proficiency_level` ∈ {1=aware, 2=basic, 3=proficient, 4=expert}
- `certification_required` (bool) — if true, requires formal assessment
- `recertification_interval_months`
- `approved_training_providers[]`
- `pack_overlay` (which regulatory pack requires this skill)

---

## §3 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | Training assignment record created with `skill_code`, `trainee_id`, `due_date`, `trigger_source` | Assignment validator |
| PC-2 | Approved training content exists for `skill_code` (training material in D7 `released` state) | Content availability check |
| PC-3 | Trainer is qualified for the skill being trained (trainer's own `skill_code` record = CERTIFIED) | Trainer qualification check |
| PC-4 | For certification-required skills: approved assessor is assigned | Assessor assignment check |
| PC-5 | For J5 PCQI: training must be delivered by FSPCA-approved source | PCQI provider check |
| PC-6 | For J3 ITAR: training must be delivered by facility's export compliance officer or designated delegate | ITAR training gate |

---

## §4 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | New employee onboarding: hire date triggers mandatory training plan | HR / onboarding |
| T-02 | Role change: employee moves to new role with different skill requirements | HR role change event |
| T-03 | Document release cascade: D7 releases SOP/WI requiring read-and-acknowledge | D7 training cascade |
| T-04 | Document release cascade: D7 releases WI requiring hands-on demonstration | D7 training cascade |
| T-05 | CAPA retraining action: CAPA identifies training gap as root cause | D6 action type = TRAINING |
| T-06 | Certification expiry: `training_record.expiry_date - alert_days ≤ today` | Expiry monitor |
| T-07 | Recertification cycle: annual or periodic recertification due | Certification cycle engine |
| T-08 | Process change: routing/BOM change affects operator skill requirements | D3 process change; D7 |
| T-09 | Equipment addition: new machine type requires operator certification | C9 asset commissioning |
| T-10 | Regulatory inspection finding: inspector identifies training gap | External audit (D13) |
| T-11 | Aseptic personnel re-qualification (J1): media fill cycle due | J1 aseptic program |
| T-12 | Aseptic qualification failure: media fill failure triggers disqualification + retraining | J1 aseptic program |
| T-13 | PCQI certification renewal (J5): 3-year FSPCA renewal | J5 compliance |
| T-14 | ITAR person-of-record annual refresher (J3) | J3 export compliance |
| T-15 | NADCAP auditor certification renewal (J3) | J3 NADCAP program |
| T-16 | LPA auditor certification renewal (J2) | J2 LPA program |
| T-17 | 8D lead certification renewal (J2) | J2 8D program |
| T-18 | PRRC/AR/Importer/Distributor record update: regulatory role change (J4) | J4 regulatory affairs |
| T-19 | QP/RP refresher: national competent authority requirement (J1) | J1 QP program |
| T-20 | DPO refresher: GDPR annual update | Legal / compliance |
| T-21 | Safety incident: near-miss or injury triggers affected-crew retraining | EHS incident (C9) |

---

## §5 State Machine — SM-8 Training Record

### States

| State | Meaning |
|-------|---------|
| `assigned` | Training assignment created; trainee notified; not yet started |
| `in_progress` | Trainee actively engaged in training activity |
| `assessment_pending` | Training content completed; formal assessment awaited |
| `bd_approval_pending` | BD-6 gate: OJT qualification requires supervisor + QA e-sig |
| `certified` | Competency assessed and passed; training record fully qualified |
| `expired` | Certification window elapsed; `certified` → `expired` automatically |
| `failed` | Assessment failed; remediation required |
| `cancelled` | Assignment voided (role change; trainee departed) |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `assigned` | Trainee starts training | `training_start_confirmed = true` | `in_progress` | Trainee |
| `in_progress` | Read-and-acknowledge completed | `esig_acknowledgement = true` ∧ `!certification_required` | `certified` | Trainee |
| `in_progress` | Training content completed | `content_completion_recorded = true` ∧ `certification_required` | `assessment_pending` | Trainee |
| `assessment_pending` | Practical/written assessment passed | `assessment_score ≥ pass_threshold` ∧ `!bd_6_required` | `certified` | Assessor |
| `assessment_pending` | OJT sign-off required (BD-6) | `training_type = OJT` ∧ `certification_required` | `bd_approval_pending` | System |
| `bd_approval_pending` | Supervisor + QA sign-off obtained | `supervisor_esig ∧ qa_esig` | `certified` | Supervisor + QA |
| `assessment_pending` | Assessment failed | `assessment_score < pass_threshold` | `failed` | System |
| `failed` | Remediation complete; re-assessment | `remediation_completed = true` | `assessment_pending` | Trainer |
| `certified` | Expiry date reached | `expiry_date ≤ today` | `expired` | System (automated) |
| `expired` | Renewal training started | — | `assigned` (renewal) | System / Supervisor |
| `assigned` | Cancellation | `assignment_cancelled_by ≠ null` | `cancelled` | Supervisor |

---

## §6 Step Substance

### Step 1 — Training Needs Identification

Training needs arise from three pathways:

**Competency gap analysis**: on role assignment (new hire or role change), the
system compares the role's required skill profile (`role_skill_requirement`)
against the individual's current certified skills (`training_record`). Each
gap generates a `training_assignment` with `trigger_source = COMPETENCY_GAP`.

**Document release cascade** (D7): when a new document revision is released,
`document_training_requirement` table determines training assignments needed.
Read-and-acknowledge assignments are created for all personnel in the audience
group within hours of release. Hands-on or classroom assignments are created
for WI/SOP changes requiring demonstrated competency.

**Proactive renewal scheduling**: for all skills with `recertification_interval`,
the system calculates `next_due_date = last_certification_date + interval` and
creates renewal assignments `alert_days_before_expiry` days in advance (default
30 days).

AI-23 (Training Gap Analytics) identifies patterns: groups with high collective
training gap rates, skills where failure rates are elevated, training providers
with below-average assessment pass rates.

### Step 2 — Training Delivery

Training delivery is matched to the `training_type` configured for the skill:

| Training Type | Delivery Method | Completion Evidence |
|--------------|----------------|-------------------|
| `READ_ACKNOWLEDGE` | Portal self-study; document display | E-signature acknowledgement |
| `E_LEARNING` | LMS course | LMS completion record; score |
| `CLASSROOM` | Instructor-led session | Attendance record; session sign-in sheet |
| `OJT` | On-the-job training with qualified trainer | Trainer e-sig; observation notes |
| `PRACTICAL_ASSESSMENT` | Hands-on demonstration to assessor | Assessor scoring rubric; pass/fail |
| `SIMULATION` | Controlled simulation environment | Simulation score; scenario completion |
| `EXTERNAL_COURSE` | Third-party training provider | Certificate of completion; provider name |

Each delivery event is a `training_event` record: `event_id`, `training_assignment_id`,
`event_type`, `start_datetime`, `end_datetime`, `location`, `trainer_id`,
`content_version` (document revision for RAA; course version for eLearning).

### Step 3 — Competency Assessment

For certification-required skills, assessment occurs after training content:
- **Written assessment**: question bank per skill; minimum passing score;
  questions randomized per attempt to prevent rote memorization
- **Practical assessment**: structured rubric; assessor scores each observable
  behavior; composite score vs. threshold
- **OJT sign-off**: supervisor observes operator performing task; qualitative
  and quantitative assessment; both supervisor and QA countersign (BD-6 gate)

Assessment records include: `assessor_id`, `assessment_date`, `score`, `max_score`,
`pass_fail`, `assessment_notes`, `evidence_attachment_id`.

Failed assessments trigger remediation: `remediation_plan` with targeted content;
second attempt scheduled; if second attempt fails, training escalated to QA Manager.

### Step 4 — BD-6 On-the-Job Qualification Gate

**BD-6**: Any operator qualification via OJT for production processes classified
as `critical_skill = true` requires both supervisor e-signature AND QA representative
e-signature before `certified` state is reached.

This prevents self-certification or peer-certification for operations where
operator incompetence has direct product quality or safety impact (welding, sterile
filling, CNC precision machining, chemical handling, high-voltage electrical, etc.)

API enforcement:
```
POST /api/v1/training/records/{id}/certify
```
If `training_type = OJT` and `skill.critical_skill = true`:
returns 403 with BD-6 problem detail until both e-signatures present.

E-signature records in `banned_decision_log` per BD-6.

### Step 5 — Certification Record and Eligibility Feed

Upon reaching `certified` state:
1. `training_record.status = CERTIFIED`
2. `training_record.certification_date = today`
3. `training_record.expiry_date = certification_date + recertification_interval`
4. Eligibility Resolver cache for this `(person_id, skill_code)` pair invalidated
5. G1 gate result for any WO holding this person may now clear → planner notified
6. Training matrix visualization updated
7. If this was a CAPA-triggered training: CAPA action marked `pending_training = false`

---

## §7 Per-Pack Overlays

### J1 Pharma
- **Aseptic technique qualification**: for sterile manufacturing areas,
  aseptic qualification consists of gowning qualification (practical assessment)
  + media fill (process simulation). Media fill cycle: performed on new personnel
  qualification and then per schedule (typically semi-annually). A media fill
  failure (`media_fill.result = FAIL`) immediately transitions the operator's
  aseptic qualification record to a disqualified state; operator is removed from
  eligible pool for sterile filling operations until re-qualification complete.
- **QP/RP qualification**: QP (EU) and RP (UK/others) hold their qualification
  via national competent authority recognition; HESEM stores `qp_record` with
  registration number, scope, country. QP certification is externally granted;
  HESEM records and tracks but does not own the assessment.

### J2 Automotive
- **LPA auditor certification**: facility LPA auditor must be certified by
  completing IATF/AIAG LPA training. Certified auditors can only be assigned
  as LPA auditors; non-certified observers may attend but cannot score.
- **8D lead certification**: personnel leading 8D investigations must hold
  8D Lead certification. System validates `8D_LEAD` skill on assigned D6 CAPA
  owner before allowing 8D format initiation.
- **Production trial runs**: for PPAP or process changes, operator certification
  on new process must be achieved before PPAP production run starts (G1 gate on
  PPAP WO).

### J3 Aerospace
- **ITAR person-of-record**: the facility ITAR person-of-record must complete
  annual ITAR export compliance training. `itar_training_record.status = CERTIFIED`
  is required for the person of record designation in the `itar_person_record`.
  If expired, system blocks designation of that person as ITAR PoR.
- **NADCAP auditor certification**: for facilities seeking or maintaining NADCAP
  accreditation, internal NADCAP auditors must complete NADCAP-recognized auditor
  training. Certification stored in `nadcap_auditor_cert` record with commodity
  scope and expiry.

### J4 Medical Device
- **PRRC (Person Responsible for Regulatory Compliance)**: EU MDR Article 15
  requires a designated PRRC; HESEM stores `prrc_record` with name, qualifications,
  relevant experience documentation, and designation date. PRRC has non-delegable
  sign-off on technical documentation.
- **Authorized Representative (AR)**: non-EU manufacturers must designate an EU AR
  per EU MDR Article 11. AR record stored with contact details, mandate scope,
  EUDAMED registration reference.
- **DPO (Data Protection Officer)**: if facility processes personal health data
  as part of device vigilance, DPO designation and GDPR Article 37 qualifications
  tracked in `dpo_record`.

### J5 Food Safety
- **PCQI (Preventive Controls Qualified Individual)**: mandatory designation
  per FSMA §117. PCQI must complete FSPCA (Food Safety Preventive Controls
  Alliance) training from an accredited program. Certification tracked with
  `provider = FSPCA_ACCREDITED`, expiry per FSPCA renewal requirements.
- **HACCP team training**: all HACCP team members must have documented HACCP
  training (basic or advanced). HACCP Team Charter (D7 document) lists members;
  all must have `HACCP_BASIC` or `HACCP_ADVANCED` skill current.

---

## §8 BD-6 Detail

**BD-6**: OJT qualification for critical skill requires both supervisor AND
QA representative independent e-signatures.

Critical skills (non-exhaustive, configurable):
- Sterile filling / aseptic operations (J1)
- High-pressure steam sterilization operation (J4)
- CNC programming and operation
- TIG/MIG welding certifications per ASME IX or AWS
- NDT (Non-Destructive Testing) per SNT-TC-1A / NAS 410
- HAZMAT handling
- Electrical high-voltage operations
- CCP monitoring for food safety (J5)

E-signature requirements documented in `banned_decision_log` per each certification.

---

## §9 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D3 Plan to Produce | G1 training gate consumes training records; HOLD cleared on certification | D8 → D3 |
| D6 NC to CAPA | CAPA retraining action triggers D8 assignment | D6 → D8; D8 → D6 (close action) |
| D7 Document to Release | Document release cascade creates D8 assignments | D7 → D8 |
| D9 Maintain to Restore | Equipment qualification requires certified technician (G2 gate) | D8 → D9 (technician eligibility) |
| C10 Workforce | Training matrix and certification records stored in C10 | C10 ↔ D8 |

---

## §10 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D8-01 | Training Completion Rate | Assignments completed before due date / total assignments × 100 | ≥ 95% |
| KPI-D8-02 | Certification Expiry Rate | Certifications expired without renewal / total certifications × 100 | ≤ 2% |
| KPI-D8-03 | G1 Hold Rate (Eligibility Resolver) | WO dispatch held due to training gap / total WO releases × 100 | ≤ 3% |
| KPI-D8-04 | Assessment First-Pass Rate | Trainees passing assessment on first attempt / total assessments × 100 | ≥ 85% |
| KPI-D8-05 | CAPA Training Action Closure Rate | CAPA training actions closed on time / total CAPA training actions × 100 | ≥ 90% |
| KPI-D8-06 | Document Cascade Training Completion | RAA assignments completed within grace period / total RAA assignments × 100 | ≥ 98% |
| KPI-D8-07 | BD-6 OJT Sign-Off Cycle Time | `bd_approval_pending` → `certified` | ≤ 5 business days |
| KPI-D8-08 | Aseptic Qualification Pass Rate (J1) | Media fill passes / total media fills × 100 | ≥ 95% |
| KPI-D8-09 | PCQI Certification Currency (J5) | PCQI-designated personnel with current FSPCA certification / total PCQIs × 100 | 100% |
| KPI-D8-10 | ITAR PoR Currency (J3) | ITAR persons-of-record with current training / total PoRs × 100 | 100% |
| KPI-D8-11 | Training Effectiveness (Post-Training Incident Rate) | Quality incidents attributable to training gaps in period after training / total incidents | Track trend |
| KPI-D8-12 | Training Matrix Coverage | Personnel with ≥ 95% of required skills CERTIFIED / total headcount × 100 | ≥ 90% facility |

---

## §11 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Operator works on critical process with expired certification | Supervisor oversight failure; system not blocking | G1 gate; dispatch hold | Eligibility resolver enforced at WO dispatch; supervisor notification 30 days before expiry |
| FM-02 | OJT qualification signed by supervisor only (BD-6 bypass) | QA countersign not sought; time pressure | BD-6 audit log | Hard API block; QA countersign cannot be skipped |
| FM-03 | Training assigned but never started | Notification not acted on | Completion rate KPI; overdue alert | Escalation to QA Manager after 50% of grace period elapsed without start |
| FM-04 | Assessor not qualified to assess the skill being assessed | Role misconfiguration | Trainer qualification check | System validates assessor's own certification before allowing assessment record |
| FM-05 | Read-and-acknowledge without actually reading | Employee clicks through | Document review time tracking | Minimum time-on-page enforced in portal before e-sig unlock |
| FM-06 | Media fill failure operator continues on sterile line (J1) | Supervisor delays disqualification action | Aseptic qualification status check | System immediately blocks aseptic WO dispatch for disqualified operator |
| FM-07 | PCQI designation to uncertified person (J5) | Administrative error | PCQI check at FSP sign-off | PCQI role assignment requires `PCQI-FSMA` skill CERTIFIED |
| FM-08 | Training content outdated: revision mismatch | Document updated; training material not revised | Document vs. training content version check | Training material D7-controlled; RAA assignment on every revision |
| FM-09 | External course certificate not verified | Trainee submits fake certificate | Provider credential check | External course providers on approved list; direct confirmation for critical certifications |
| FM-10 | CAPA training action closed without training completion | CAPA owner manually closes action | D8-CAPA link check | CAPA action of type TRAINING cannot close until `training_record.status = CERTIFIED` |
| FM-11 | ITAR training record not current on operator with USML access (J3) | Renewal delayed; access not revoked | ITAR annual review; G6 gate | ITAR training expiry triggers immediate access restriction review |
| FM-12 | Training assignment created for wrong skill (document cascade misconfiguration) | D7 training requirement table error | Training gap audit | Training cascade configuration is version-controlled; QA Manager reviews on each SOP release |

---

## §12 Competency Matrix and Training Calendar

### Competency Matrix Schema

The competency matrix is the facility-level view of which skills are required
for which roles, and who currently holds those certifications. It is the
primary input for gap analysis and training planning.

**`role_skill_requirement`** table:
```
role_skill_id (UUID PK)
role_id (FK → job_role)
skill_code (FK → skill_master)
min_proficiency_level INT (1–4)
certification_required (bool)
applicable_departments[] text[]
applicable_facilities[] uuid[]
effective_date date
superseded_date date (null = current)
version INT
```

**`training_record`** table (canonical certification record per person):
```
training_record_id (UUID PK)
person_id (FK → person)
skill_code (FK → skill_master)
status ∈ {ASSIGNED, IN_PROGRESS, ASSESSMENT_PENDING, CERTIFIED, EXPIRED, FAILED}
proficiency_level_achieved INT
certification_date date
expiry_date date
certified_by_id (FK → person)
training_event_id (FK → training_event)
training_type
assessment_score NUMERIC(5,2)
assessment_max_score NUMERIC(5,2)
bd_6_supervisor_esig (FK → esig_record, nullable)
bd_6_qa_esig (FK → esig_record, nullable)
document_revision_ref text (for RAA: document.code + revision)
capa_action_id (FK, nullable)
```

**Competency matrix view** (materialized daily):
```sql
CREATE MATERIALIZED VIEW mv_competency_matrix AS
SELECT
  p.person_id, p.full_name, p.department_id, p.role_id,
  rsr.skill_code,
  rsr.min_proficiency_level AS required_level,
  tr.proficiency_level_achieved AS current_level,
  tr.status,
  tr.expiry_date,
  CASE
    WHEN tr.status = 'CERTIFIED' AND tr.expiry_date >= CURRENT_DATE
         AND tr.proficiency_level_achieved >= rsr.min_proficiency_level
    THEN 'COMPLIANT'
    WHEN tr.status = 'CERTIFIED' AND tr.expiry_date < CURRENT_DATE
    THEN 'EXPIRED'
    WHEN tr.training_record_id IS NULL
    THEN 'NOT_TRAINED'
    ELSE 'INSUFFICIENT'
  END AS compliance_status,
  rsr.min_proficiency_level - COALESCE(tr.proficiency_level_achieved, 0)
    AS proficiency_gap
FROM person p
JOIN role_skill_requirement rsr ON rsr.role_id = p.role_id
LEFT JOIN training_record tr
  ON tr.person_id = p.person_id
  AND tr.skill_code = rsr.skill_code
  AND tr.status IN ('CERTIFIED', 'EXPIRED')
WHERE p.active = true
  AND rsr.superseded_date IS NULL;
```

The view enables:
- Facility training compliance report: `% compliant` per department
- Gap list: all `NOT_TRAINED` or `EXPIRED` records with `required_level`
- AI-23 analytics: trend detection on gap distribution by skill and department

### Annual Training Needs Analysis (TNA)

Each year (trigger: `tna_cycle_date` in `facility_config`), the training
manager initiates the TNA process:

1. **Pull compliance matrix**: `mv_competency_matrix` exported for all
   active personnel; compliance status summarized by department
2. **Identify gaps**: `NOT_TRAINED`, `EXPIRED`, and `INSUFFICIENT` records
   flagged as training needs
3. **Planned changes input**: next year's planned changes (new equipment,
   new standards, process changes from D3/D7) reviewed; new skill requirements
   anticipated
4. **Training demand forecast**: gap count × average training duration →
   total training hours needed; compared against training capacity (trainers,
   rooms, lab time)
5. **Annual training plan**: `training_plan` record with: `plan_year`,
   `facility_id`, `total_training_events_planned`, `total_hours_planned`,
   `key_skill_focus[]`, `regulatory_driven_training[]`, `budget_allocated`
6. **Training calendar populated**: `training_schedule_event` records created
   for all planned sessions; calendar visible to supervisors and employees

### LMS and HRIS Integration

Training events are synchronized with the organization's Learning Management
System (LMS) and Human Resources Information System (HRIS):

- **LMS push**: when a training assignment is created, the system pushes
  `training_assignment` data to the LMS API; LMS creates the learner enrollment
  with due date
- **LMS completion pull**: LMS completion webhook updates `training_record.status`
  in HESEM; score and completion timestamp synchronized
- **HRIS push**: certified training records pushed to HRIS as
  `competency_certification` entries for talent management visibility
- **Onboarding integration**: new hire created in HRIS triggers D8 T-01
  via webhook; mandatory training plan auto-generated within 1 business day

LMS integration supports: SCORM 2004 / xAPI (Tin Can) course packages for
eLearning; calendar invites for instructor-led sessions; mobile-compatible
portal for read-and-acknowledge on the production floor.

---

*Decision phrase: S2-11_D8_D9_DEEP_UPGRADE_COMPLETE (partial — D8 complete)*

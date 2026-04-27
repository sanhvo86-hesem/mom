# C10 — Workforce & Training

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-06_C10_C11_WORKFORCE_FINANCE  
**Supersedes:** V9 C10_WORKFORCE_TRAINING.md  

---

## 1. Domain Purpose and Boundaries

C10 owns the people record: who each person is, what they are qualified to do, whether their qualifications are current, and how they are scheduled. It is the authority consulted by the C6 Eligibility Resolver (Gate G1 — Training), by C7 BREL evidence gate (training compliance), and by every regulated action that requires an authorized signer.

In regulated industries, incompetent personnel are a top-cited FDA and notified body observation. C10 enforces the principle that every sensitive action in HESEM is gated on the actor's current, verified qualification — no qualification, no action.

**Domain boundaries:**

| Boundary | C10 owns | C10 consumes | C10 produces |
|---|---|---|---|
| Upstream | — | CDOC release events from C7 (triggers training assignments); Person identity from HR system via SSO/SCIM | — |
| Downstream | — | — | Eligibility verdicts to C6 G1; Training compliance gate to C8 BREL; Authorized signer registry to all BD-gated API calls |
| Excluded | Payroll, benefits, performance reviews — those stay in the customer's HR system | — | — |

---

## 2. Resource Families

**Person**

| Field | Type | Notes |
|---|---|---|
| person_id | UUID PK | |
| employee_id | VARCHAR(30) | HR system identifier |
| first_name | VARCHAR(60) | |
| last_name | VARCHAR(60) | |
| display_name | VARCHAR(120) | |
| email | VARCHAR(150) | |
| site_id | UUID FK | primary site |
| department | VARCHAR(60) | |
| job_title | VARCHAR(100) | |
| hire_date | DATE | |
| termination_date | DATE | nullable |
| status | ENUM | active, on_leave, suspended, terminated |
| sso_subject | VARCHAR(200) | OIDC/SAML subject claim |
| roles | UUID[] | Role IDs assigned |
| work_center_ids | UUID[] | work centers this person operates at |
| itar_clearance_verified | BOOLEAN | |
| itar_clearance_expiry | DATE | nullable |
| gdpr_data_subject_country | VARCHAR(5) | ISO country — determines retention rules |

**Skill**

| Field | Type | Notes |
|---|---|---|
| skill_id | UUID PK | |
| skill_code | VARCHAR(30) | unique, used by C6 routing and Eligibility |
| skill_name | VARCHAR(100) | |
| category | ENUM | process, quality, safety, regulatory, equipment, language |
| expiry_policy | ENUM | none, annual, biennial, triennial, per_course |
| expiry_months | SMALLINT | nullable — when expiry_policy is time-based |
| recertification_required | BOOLEAN | if true, full re-exam required; if false, refresher course sufficient |
| pack_tags | VARCHAR[] | e.g. ['J1_GMP', 'J2_IATF', 'J3_AS9100'] |

**Training Plan**

| Field | Type | Notes |
|---|---|---|
| training_plan_id | UUID PK | |
| name | VARCHAR(100) | |
| target_roles | UUID[] | roles this plan applies to |
| target_work_centers | UUID[] | nullable — work-center-specific plans |
| courses | JSONB | array of {course_id, required_by_date_offset_days, mandatory} |
| trigger_type | ENUM | role_assignment, onboarding, cdoc_release, annual_refresh, incident |
| version | INTEGER | |
| approved_by | UUID FK | |
| active | BOOLEAN | |

**Training Course**

| Field | Type | Notes |
|---|---|---|
| course_id | UUID PK | |
| course_code | VARCHAR(30) | |
| course_title | VARCHAR(150) | |
| version | INTEGER | increment on content change |
| skill_ids | UUID[] | skills granted on completion |
| delivery_type | ENUM | in_person, elearning, on_the_job, blended, external |
| duration_minutes | INTEGER | |
| assessment_required | BOOLEAN | |
| pass_score_pct | DECIMAL(5,2) | minimum pass percentage |
| cdoc_ids | UUID[] | controlled documents this course covers |
| status | ENUM | draft, in_review, approved, active, superseded, retired |
| approved_by | UUID FK | |
| approved_at | TIMESTAMPTZ | |

**Training Record**

| Field | Type | Notes |
|---|---|---|
| training_record_id | UUID PK | |
| person_id | UUID FK | |
| course_id | UUID FK | |
| course_version | INTEGER | version at time of completion |
| plan_id | UUID FK | nullable — if assigned via plan |
| status | ENUM | assigned, in_progress, completed_uncertified, certified, expired, waived |
| assigned_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| score_pct | DECIMAL(5,2) | |
| certified_at | TIMESTAMPTZ | |
| certified_by | UUID FK | BD-6 equivalent — trainer/supervisor e-sig |
| expiry_date | DATE | computed: certified_at + skill.expiry_months |
| training_provider | VARCHAR(100) | for external courses |
| certificate_file_id | UUID | |
| waiver_reason | TEXT | nullable |
| waiver_authority | UUID FK | nullable — QA manager sign-off required for waivers |

**Competency Matrix**

| Field | Type | Notes |
|---|---|---|
| matrix_id | UUID PK | |
| name | VARCHAR(100) | |
| site_id | UUID FK | |
| version | INTEGER | |
| rows | JSONB | array of {role_id or person_id, skill_id, required_level, mandatory} |
| approved_by | UUID FK | |
| effective_date | DATE | |
| status | ENUM | draft, approved, active, superseded |

**Competency Assessment**

| Field | Type | Notes |
|---|---|---|
| assessment_id | UUID PK | |
| person_id | UUID FK | |
| skill_id | UUID FK | |
| assessed_by | UUID FK | |
| assessed_at | TIMESTAMPTZ | |
| method | ENUM | exam, practical_observation, portfolio, peer_review |
| result | ENUM | competent, not_yet_competent, provisional |
| score_pct | DECIMAL(5,2) | |
| observations | TEXT | |
| expiry_date | DATE | |

**Schedule / Shift**

| Field | Type | Notes |
|---|---|---|
| shift_id | UUID PK | |
| shift_code | VARCHAR(20) | |
| site_id | UUID FK | |
| shift_name | VARCHAR(60) | e.g. Day, Swing, Night |
| start_time | TIME | |
| end_time | TIME | |
| days_of_week | SMALLINT[] | 0=Sun … 6=Sat |
| break_minutes | INTEGER | |
| active | BOOLEAN | |

| person_schedule_id | UUID PK | |
| person_id | UUID FK | |
| shift_id | UUID FK | |
| effective_from | DATE | |
| effective_to | DATE | nullable |

### 2.1 Per-Pack Specialized Records

**Aseptic Personnel Qualification (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| aseptic_qual_id | UUID PK | |
| person_id | UUID FK | |
| qualification_type | ENUM | initial, annual_requalification, requalification_after_absence |
| gown_intervention_test | BOOLEAN | HEPA gowning observation pass |
| media_fill_participation | BOOLEAN | participated in at least one media fill |
| gowning_score | DECIMAL(5,2) | |
| cleanroom_zone | VARCHAR(20) | ISO class / EU GMP grade authorized |
| status | ENUM | qualified, expired, suspended |
| qualified_at | DATE | |
| expiry_date | DATE | 12 months from qualified_at |
| assessed_by | UUID FK | Aseptic Techniques trainer |

**QP / Designated Person Record (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| qp_record_id | UUID PK | |
| person_id | UUID FK | |
| qp_type | ENUM | eu_qualified_person, rp_us_pharmacovigilance, responsible_person_uk |
| registration_body | VARCHAR(80) | e.g. MHRA, BfArM, ANSM |
| registration_number | VARCHAR(40) | |
| registration_expiry | DATE | |
| authorized_products | UUID[] | product families QP is authorized to release |
| status | ENUM | active, suspended, expired |

**PCQI Record (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| pcqi_record_id | UUID PK | |
| person_id | UUID FK | |
| certification_body | VARCHAR(80) | e.g. FSPCA, AIB, NSF |
| training_completion_date | DATE | |
| certificate_number | VARCHAR(40) | |
| certificate_file_id | UUID | |
| authorized_sites | UUID[] | sites where this person can serve as PCQI |
| status | ENUM | active, expired |
| expiry_date | DATE | FSPCA certification valid 3 years |

**HACCP Team Charter (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| haccp_charter_id | UUID PK | |
| site_id | UUID FK | |
| product_scope | VARCHAR(200) | |
| team_members | JSONB | array of {person_id, role_in_team, expertise} |
| pcqi_lead_id | UUID FK | PCQI who leads the team |
| charter_approved_by | UUID FK | |
| effective_date | DATE | |
| review_date | DATE | annual review required |
| version | INTEGER | |

**ITAR Person-of-Record (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| itar_por_id | UUID PK | |
| person_id | UUID FK | |
| por_type | ENUM | empowered_official, technology_control_officer, export_compliance_officer |
| facility_id | UUID FK | ITAR-registered facility |
| dsps_registration_number | VARCHAR(40) | DDTC registration |
| appointment_date | DATE | |
| appointment_approved_by | UUID FK | |
| status | ENUM | active, suspended, vacated |

**NADCAP Auditor Certification (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| nadcap_cert_id | UUID PK | |
| person_id | UUID FK | |
| process_category | VARCHAR(40) | e.g. Heat Treating, Welding, NDT |
| cert_number | VARCHAR(40) | |
| issuing_body | VARCHAR(60) | PRI (Performance Review Institute) |
| issued_date | DATE | |
| expiry_date | DATE | |
| status | ENUM | active, expired, suspended |

**LPA Auditor Certification (J2 Auto)**

| Field | Type | Notes |
|---|---|---|
| lpa_cert_id | UUID PK | |
| person_id | UUID FK | |
| max_layer | SMALLINT | highest layer this person is certified to audit |
| certified_by | UUID FK | |
| certified_at | DATE | |
| expiry_date | DATE | typically annual |
| status | ENUM | active, expired |

**8D Lead Certification (J2 Auto)**

| Field | Type | Notes |
|---|---|---|
| eight_d_cert_id | UUID PK | |
| person_id | UUID FK | |
| certification_body | VARCHAR(80) | e.g. Automotive Excellence, VDA QMC |
| certificate_number | VARCHAR(40) | |
| certified_at | DATE | |
| expiry_date | DATE | |
| status | ENUM | active, expired |

**PRRC / AR / Importer Record (J4 Medical Device)**

| Field | Type | Notes |
|---|---|---|
| prrc_person_id | UUID PK | |
| person_id | UUID FK | |
| role_type | ENUM | prrc, authorized_representative, eu_importer, us_agent |
| device_families | UUID[] | device families this person covers |
| qualifications | JSONB | per EU MDR Art 15 §1 qualification criteria |
| appointed_by | UUID FK | legal entity representative |
| appointed_at | DATE | |
| notified_body | VARCHAR(60) | if PRRC registered with NB |
| status | ENUM | active, vacated |

**DPO Record (GDPR Art 37)**

| Field | Type | Notes |
|---|---|---|
| dpo_record_id | UUID PK | |
| person_id | UUID FK | |
| appointment_basis | ENUM | mandatory_public, mandatory_large_scale, voluntary |
| contact_email | VARCHAR(150) | published DPO contact |
| supervisory_authority_notified | BOOLEAN | |
| supervisory_authority | VARCHAR(100) | e.g. CNIL, BfDI, ICO |
| appointed_at | DATE | |
| status | ENUM | active, vacated |

---

## 3. State Machine — SM-11 Training Record Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `assigned` | `in_progress` | `start_course` | Person acknowledges assignment | Record `started_at` |
| `in_progress` | `completed_uncertified` | `submit_completion` | All course material consumed; assessment passed (if required) | Score recorded; notify trainer/supervisor for certification |
| `completed_uncertified` | `certified` | `certify` | BD-6 equivalent: trainer or supervisor e-sign with signature meaning | Set `certified_at`; compute `expiry_date` from skill.expiry_months; emit `training.certified` to Eligibility Resolver cache |
| `certified` | `expired` | auto | `expiry_date ≤ CURRENT_DATE` | Emit `training.expired`; Eligibility Resolver marks skill as not current; alert to person and supervisor |
| `expired` | `assigned` | `reassign` | Training plan recertification due | New training record created; prior record archived |
| `assigned` | `waived` | `waive` | QA Manager e-sign waiver with documented rationale | Skills NOT granted by waiver unless waiver explicitly includes skill grant |
| `certified` | `suspended` | `suspend_certification` | Investigation (e.g., observation of non-compliant practice) | Eligibility Resolver immediately returns NOT current for skill |
| `suspended` | `certified` | `reinstate` | Reinstatement assessment passed; new e-sig | Eligibility cache updated |

---

## 4. Capabilities

### CAP-C10-01 — Person Master and Onboarding (per E1 + I8)

The Person record is the canonical identity anchor for all human actors in HESEM. It is created via one of three paths: SCIM provisioning from an IdP (Okta, Azure AD, Ping); manual creation by an HR administrator; or import from the customer's HR system via a scheduled sync job. The Person record does not store credentials — authentication is always delegated to the IdP via OIDC/SAML (E1).

On creation, the onboarding workflow (I8) is triggered: a Training Plan of type `onboarding` is assigned based on the person's roles and work centers. The onboarding plan has mandatory completion deadlines. Person.status = `active` is set immediately at creation; the system does not hold the person in a probationary state, but the Eligibility Resolver naturally blocks dispatch until required skills are certified.

At termination: `person.status = terminated`; all active sessions are invalidated via IdP revocation; role assignments are preserved for audit trail but all permission claims are revoked. Training records are retained per the regulatory class for the site (pharma: 7 years; medical device: expected device lifetime + 2 years; food: 2 years; automotive: customer-specified).

### CAP-C10-02 — Competency Matrix Authoring and Maintenance

The Competency Matrix defines which skills are required for which roles (and optionally for specific work centers or item categories). It is authored as a structured document with version control and approval workflow under SM-7 (CDOC lifecycle). Rows define `(role_id, skill_id, required_level, mandatory)` triplets. `required_level` is a qualitative assessment level used by Competency Assessment; for Eligibility Resolver purposes, the binary certified/not-certified from the Training Record is used.

When a new version of the Competency Matrix is approved and released, the system computes a delta: skills newly added to a role trigger Training Plan assignments for all persons in that role; skills removed from a role do not revoke existing certifications (they simply no longer block dispatch). The compliance gap report (`GET /api/v1/competency/gaps`) shows all persons with open required-skill gaps by role and site, with estimated completion dates based on training plan schedules.

### CAP-C10-03 — Skill Catalog Management

Skills are the atomic unit of eligibility. Each skill has an expiry policy. Skills are referenced by: C6 routing operations (required_skill_codes), C7 inspection plans (inspector skill requirements), C7 CAPA close (CAPA approver skill requirements), C4 supplier qualification (QE skill), and C9 calibration (calibration technician skill). When a skill's expiry_policy changes, the system sends a notification to all persons holding that skill informing them of the new recertification schedule but does not retroactively expire existing certifications.

Skill codes must be stable once referenced in routing or inspection plans. Renaming or retiring a skill that is referenced in live routing operations requires a routing ECO (C2 SM-7). The Skill Catalog includes pack-specific skills: J1_EU_GMP_OPERATOR, J1_ASEPTIC_GOWNIN, J2_LPA_L1_AUDITOR, J3_ITAR_AWARENESS, J4_MDR_AWARENESS, J5_HACCP_AWARENESS — each defined with the relevant regulatory citation.

### CAP-C10-04 — Training Course Authoring and Approval

Courses follow SM-7 CDOC lifecycle: draft → in_review → approved → active → superseded. Version increments are required when: course content changes materially; the assessed competency scope changes; the associated skill expiry changes. Minor corrections (typos, formatting) are handled via errata without version increment, logged in the course history.

On course supersession: all persons with a training record on the old version and `expiry_date > CURRENT_DATE` receive a notification that their current certification remains valid until expiry, at which point they must complete the new version. Persons whose record is already `expired` are immediately assigned the new version. The mapping between old and new version skills is declared explicitly; if a new skill is added in the new version, the system assigns all role-holders accordingly.

### CAP-C10-05 — Training Assignment (per D8 + per CDOC release trigger)

Training assignments are created from four triggers:

1. **Role assignment:** on Person.roles change, Training Plans for the new role are evaluated; required courses not yet completed are assigned
2. **Onboarding (I8):** the onboarding Training Plan fires on new person creation
3. **CDOC release (D7 §7):** when a controlled document is released, if `doc.training_required = true`, all persons in the affected roles receive an assignment for the linked course; completion_deadline = release_date + training_completion_deadline_days from the Doc Effectivity Record
4. **Annual refresh:** Training Plans with `trigger_type = annual_refresh` generate assignments at the person's certification anniversary date (not a fixed calendar date — per-person, avoiding end-of-year spikes)

Assignments carry a mandatory flag. Mandatory assignments that are not completed by deadline trigger escalation: first to the person's supervisor, then to the HR Lead and Quality Lead.

### CAP-C10-06 — Eligibility Resolver Integration (per D3 §7)

C10 exposes a read-optimized Eligibility Resolver API consumed by C6 Gate G1. The API is backed by a Redis-cached view of current certification status per person per skill, updated in near-real-time on training record state changes (certified, expired, suspended). Cache TTL: 60 seconds. On cache miss, the system falls back to a direct PostgreSQL query.

API contract:

```
GET /api/v1/eligibility/person/{person_id}/skills
Response: {
  person_id, evaluated_at,
  skills: [{skill_code, status: "current"|"expired"|"never_certified"|"suspended", expiry_date}]
}

POST /api/v1/eligibility/check
Body: {person_id, required_skill_codes: [...], itar_check: true}
Response: {
  result: "GO"|"HOLD",
  blocking_skills: [{skill_code, reason, expiry_date}]
}
```

The POST endpoint is the one called by the C6 Eligibility Resolver G1 gate on every WO dispatch attempt.

### CAP-C10-07 — Certification with E-Signature (BD-6 equivalent)

Training certification requires an e-signature from an authorized certifier (trainer, supervisor, or quality specialist depending on the course type). The e-signature captures: signer identity, signature meaning (configurable per course — e.g. "I confirm [person] has demonstrated competency on [course] version [N]"), datetime. For 21 CFR Part 11 regulated courses: the signer must re-authenticate at signing (password or biometric challenge); the signature is bound to the record by HMAC. Certifiers must themselves hold an active `TRAINING_CERTIFIER` skill — the system verifies this before accepting the e-signature.

A training record in `completed_uncertified` status blocks all dispatch requiring the associated skill until certification is performed. The certifier queue is visible on the Training Compliance Dashboard with aging alerts (default alert at 24h uncertified, escalation at 72h).

### CAP-C10-08 — Recertification Cycle (per pack frequency)

Recertification is managed per-skill based on `skill.expiry_months`. The system generates a recertification assignment automatically at `expiry_date - lead_time_days` (configurable per skill — default 30 days). If recertification is not completed by expiry_date, the training record transitions to `expired`, the Eligibility Resolver cache is updated immediately, and all active WO dispatch for that person requiring this skill is blocked. The person is notified at T-30, T-7, T-1, and T+0 (expiry day).

Per-pack recertification frequencies:
- **J1 Pharma — GMP/SOP skills:** annually; aseptic qualification: annually with media fill participation required
- **J2 Auto — LPA Auditor:** annually; 8D Lead: triennial per certification body
- **J3 Aero — ITAR Awareness:** annually per 22 CFR §120; NADCAP Auditor: per PRI schedule (typically biennial)
- **J4 MD — MDR/QSR Awareness:** biennial; PRRC qualification: no expiry but annual competence review
- **J5 Food — PCQI:** 3 years per FSPCA; HACCP Awareness: annually

### CAP-C10-09 — Aseptic Annual Requalification (J1 Pharma)

Per EU GMP Annex 1 §9.7, all personnel entering Grade A/B cleanrooms must be annually requalified. Requalification requires: successful gowning observation (passing score configurable, typically ≥ 85%), participation in at least one media fill run (or documented equivalent), and completion of the annual Aseptic Techniques refresher course. The Aseptic Personnel Qualification record tracks the qualification status per person per cleanroom zone. The C6 Eligibility Resolver G7 (J1 Pharma pack gate) checks `aseptic_qual.status = qualified` AND `aseptic_qual.expiry_date ≥ CURRENT_DATE` before allowing dispatch to Grade A/B cleanroom operations.

Personnel who have been absent from aseptic operations for > 6 months require requalification before re-entry, regardless of the annual cycle timing. The system tracks last aseptic operation date per person from WO operation records and auto-flags requalification needs.

### CAP-C10-10 — ITAR Person-of-Record Verification (J3 Aero per J3 §5)

The ITAR Person-of-Record record designates the Empowered Official (EO), Technology Control Officer (TCO), and Export Compliance Officer (ECO) for each ITAR-registered facility. These are not just training records — they are formal appointments with legal standing under 22 CFR §120.54.

When the Eligibility Resolver G6 gate checks ITAR facility registration, it verifies: (1) an active ITAR Person-of-Record exists for the facility with `por_type = empowered_official`; (2) the EO's appointment has not been vacated. Vacating an EO without designating a replacement blocks all ITAR-controlled WO dispatches at that facility and fires an urgent alert to the site quality manager.

For operators, the ITAR G1 sub-check verifies `person.itar_clearance_verified = true` AND `person.itar_clearance_expiry ≥ CURRENT_DATE`. ITAR clearance verification is managed externally (DSP-83, ITAR license); the HESEM record captures the verified status and expiry date. Updating itar_clearance_verified requires an EO or TCO e-signature.

### CAP-C10-11 — PCQI Appointment and Activity Log (J5 Food)

Per 21 CFR Part 117 §117.4, a Preventive Controls Qualified Individual (PCQI) must oversee all preventive controls activities. The PCQI Record designates the PCQI for each site and scope. The PCQI Activity Log records all PCQI activities required by FSMA: hazard analysis reviews, preventive control decisions, supply chain program oversight, recall procedures review, and HACCP Plan reanalysis determinations (BD-26). Each activity is time-stamped and linked to the relevant C7 record.

If the designated PCQI for a site leaves the company, the system detects the gap (person.status = terminated) and immediately alerts the site's quality manager. HACCP Plan approvals (C7 CAP-C7-23) are blocked until a replacement PCQI is appointed and their PCQI Record is activated.

### CAP-C10-12 — HACCP Team Charter (J5 Food)

The HACCP Team Charter formalizes the multi-disciplinary team responsible for developing and maintaining the HACCP Plan. The charter records each team member's expertise area (microbiology, food chemistry, process engineering, operations, quality). Per Codex Alimentarius HACCP principle prerequisites, the team must include at minimum: food safety expertise and operational process expertise. The system validates this requirement at charter approval — a charter without a documented food safety expert cannot be approved.

When the charter is reviewed annually, team membership changes are evaluated: if a member with a unique expertise area leaves, the charter triggers a gap alert. Charter approval requires the PCQI lead's e-signature. The charter version is linked to the HACCP Plan version — a new major version of the HACCP Plan requires a current-version charter.

---

## 5. Per-Pack Overlays

| Pack | Key C10 additions |
|---|---|
| **J1 Pharma** | Aseptic Annual Requalification per EU GMP Annex 1; QP/RP Records with regulatory registration; 21 CFR Part 11 §11.10(i) training documentation; EU GMP Annex 11 periodic access review quarterly; ICSR reporter training |
| **J2 Automotive** | LPA Auditor certification per layer; 8D Lead certification; Core Tools (FMEA, SPC, MSA, APQP, PPAP) training matrix per IATF 16949; per-OEM customer-specific training requirements tracked per C1 Customer master |
| **J3 Aerospace** | ITAR EO/TCO/ECO appointments; NADCAP Auditor certifications; AS9100D §7.2 competence records; ITAR Awareness annual recertification; export compliance training matrix |
| **J4 Medical Device** | PRRC/AR/Importer appointments per EU MDR Art 15; IEC 62304 software lifecycle training; ISO 14971 risk management training; Design Authority competence records |
| **J5 Food** | PCQI appointment and activity log; HACCP Team Charter; allergen awareness training mandatory for all food-contact operators; FSMA PCQI recertification (3-year cycle); food handler health and hygiene certification tracking |

---

## 6. KPIs

| KPI | Target | Measurement |
|---|---|---|
| Training compliance rate (mandatory courses) | ≥ 98% | certified / assigned (mandatory) per period |
| Average time to certify after completion | ≤ 24h | certified_at - completed_at |
| Expired certification rate (active personnel) | < 1% | expired records / total active certifications |
| Onboarding completion within plan deadline | ≥ 95% | |
| Aseptic requalification on-time (J1) | 100% | |
| PCQI activity log completeness (J5) | 100% | PCQI-required activities logged vs expected |

---

## 7. Standards

| Standard | Clause | Capability |
|---|---|---|
| 21 CFR Part 11 | §11.10(i) Training | CAP-C10-07 |
| 21 CFR Part 211 | §211.25 Qualified personnel | CAP-C10-06/07 |
| EU GMP Annex 1 (2022) | §9.7 Aseptic personnel | CAP-C10-09 |
| EU GMP Annex 11 | §12 Access review | CAP-C10-01 |
| ISO 13485:2016 | §6.2 Human resources | CAP-C10-02 |
| IATF 16949:2016 | §7.2 Competence | CAP-C10-02/08 |
| AS9100D | §7.2 Competence | CAP-C10-02 |
| 22 CFR §120.54 | ITAR Empowered Official | CAP-C10-10 |
| 21 CFR Part 117 | §117.4 PCQI | CAP-C10-11 |
| EU MDR 2017/745 | Art 15 PRRC | CAP-C10 PRRC record |
| GDPR | Art 37 DPO | DPO Record |

---

## 8. Cross-References

| Domain | Reference |
|---|---|
| C6 Shopfloor | G1 Training gate reads from Eligibility Resolver; ITAR acknowledgment steps use person.itar_clearance_verified |
| C7 Quality | Inspector eligibility; CAPA/document approver eligibility; BD-gated action signers verified against role assignments |
| C8 Traceability | Training compliance gate in BREL evidence chain |
| C9 Maintenance | Calibration technician skill; maintenance technician skill for MWO dispatch |
| C4 Procurement | QE competency for BD-7 supplier qualification |
| C2 Product Engineering | Design authority competence for ECO approval (BD-5) |

---

*Decision phrase (partial): C10 complete — C11 follows*

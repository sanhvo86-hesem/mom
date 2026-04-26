# D8 — Train to Qualify

```
workflow_id:    D8
workflow_name:  Train to Qualify
owner_role:     Workforce Lead with Quality Lead
participants:   Domain Leads (per affected role), Compliance,
                Vertical Pack Lead (per pack overlay),
                QP / PRRC (regulated certifications)
state_machines: SM-8 Training Qualification (primary; BD-6
                banned for AI)
```

D8 turns "training assignment" into "verified competency that
satisfies regulator." Without D8, the eligibility chain at D3
dispatch and D10 batch release fails. For regulated tenants, D8
evidence is among the first items inspectors examine.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Skill catalog + competency matrix      training-content authoring (per D7)
Training assignment                     individual coaching / mentoring
Training delivery (e-learn / class /    HR personnel records (per C10)
 OJT / hybrid)                         compensation / promotion
Competency assessment                   visa / certification authority
Certification (with e-sig)             external (rare; per pack)
Active eligibility tracking
Expiration handling
Re-certification cycle
Per-pack qualification (aseptic;
 ITAR; PCQI)
Training-as-evidence in audit
Training-record retention per H5
```

---

## 2. Trigger catalog

```
NEW EMPLOYEE ONBOARDING                  per HR + role
ROLE CHANGE                                per HR
DOC RELEASE WITH TRAINING TRIGGER          per D7 step 7
PERIODIC RE-CERTIFICATION                  per cycle (annual / cycle)
CAPA ROOT CAUSE INDICATES TRAINING GAP     per H8
AUDIT FINDING                                per H3 + H8
TENANT REGULATORY PROFILE CHANGE              per H1 §5
PACK ENABLE                                    new pack → new training set
SUB-PROCESSOR ONBOARD (where DPA-listed)        per L2 §8 + I8
ASEPTIC PERSONNEL ANNUAL REQUAL (Pharma)       per Annex 1
PCQI APPOINTMENT (Food)                          per FSMA Part 117
HACCP TEAM MEMBER QUAL (Food)                    per HACCP plan
ITAR PERSON-OF-RECORD (Aero)                      per J3 §5
NADCAP-CERT-AUDITOR INTERNAL TRAINING              per J3
LPA AUDITOR TRAINING (Auto)                         per J2
8D PROBLEM-SOLVING TRAINING (Auto)                  per CSR
CYBER AWARENESS (annual)                              per I7
PRIVACY (GDPR-ROLE) TRAINING                          per I7 §9
WCAG / IEC 62366 USABILITY (MD)                        per F11 + J4
AI DISCIPLINE (per L5)                                  per AI feature roll
EMERGENCY-RECERTIFICATION                                per incident
```

---

## 3. Skill + competency taxonomy

```
SKILL                            individual capability
                                 (e.g., GMP cleanroom gowning;
                                 8D problem-solving; AS9102 FAI)
COURSE                           training package teaching one
                                 or more skills
CERTIFICATION                    formal qualification per role +
                                 skill (signed; expiring)
COMPETENCY MATRIX                role × skill × authority lookup;
                                 drives eligibility resolution
                                 (per D3 step 7)
ROLE                              job function with required
                                 skill set (e.g., Aseptic
                                 Operator Pharma; PCQI Food;
                                 NADCAP Special-Process Operator
                                 Aero)
LEVEL                             apprentice / journeyman / master
                                 (where applicable)
RECERT FREQUENCY                  per skill × per pack
DELIVERY METHOD                   e-learning / classroom / OJT /
                                 simulator / hybrid
ASSESSMENT                        quiz / exam / practical /
                                 observation / multi-modal
```

---

## 4. State machine SM-8 Training Qualification

```
STATES                          EVENTS / GUARDS              EVIDENCE
unassigned                      no record; baseline             -
assigned                        coordinator_assigns;            EC-11 (assign)
                                deadline-set
in_progress                     trainee_starts                  EC-11 (start)
                                trainee_completes_modules        EC-11
assessment_pending               request_assessment              EC-11
assessing                        assessor_runs_assessment         EC-22
                                pass / fail
certified                        certification_signoff            EC-2 (sigs;
                                (regulated: 2-person sigs;       BD-6 banned for AI)
                                BANNED for AI)
active                           eligibility live for tasks       EC-11 (active);
                                requiring this skill            referenced by D3
                                                                eligibility
expiring                          recert window approaches         notification (EC-22)
                                  (90/30/7 day per cycle)
expired                           expiration_passed                 EC-11 (expired);
                                                                  eligibility lost
re_assigned                       cycle repeats                     -
withdrawn                         person leaves role / departs      EC-11 + EC-2
                                                                  (regulated: signoff)

HARD COUPLINGS
  SM-7 → SM-8 (doc release with training trigger)
  SM-8 → SM-3 (active eligibility gates WO start)
  SM-8 → SM-10 (qualified personnel gates batch release)
  SM-8 → SM-9 (qualified maintenance tech gates MWO)
  SM-8 → SM-INSP (qualified inspector gates IQC / IPQC / FQC)
  SM-8 → SM-FAI (qualified FAI inspector — Aero)
  SM-8 → SM-MRB (qualified MRB participant)
SOFT COUPLINGS
  SM-8 ← SM-6 (CAPA may trigger remedial training)
  SM-8 ← SM-12 (audit may identify training gap)
  SM-8 → C13 AI advisory (AI-23 training-gap detection)
```

---

## 5. Step substance

### Step 1 — Assignment

```
SUBSTANCE                       Coordinator (manual) or system
                                (auto from D7) creates training
                                record; user × course × deadline;
                                deadline policy per pack
                                (typ 30-90 d; emergency 7 d);
                                role-based bulk-assignment (per
                                Competency Matrix); language
                                preference per user
EVIDENCE                        assignment_record (EC-11)
DECISION POINTS                 P1.1 mandatory vs optional
                                P1.2 deadline override
                                P1.3 attestation-only sufficient
                                (read + acknowledge)
                                P1.4 instructor-led required
                                P1.5 cohort vs individual
EDGE CASES                       user on leave; user pending
                                role-change; user role retired;
                                user assigned course not
                                applicable to current role
```

### Step 2 — Notification

```
SUBSTANCE                       per Notification Service (per E10);
                                email + in-app + (per tenant)
                                SMS / mobile push; per-language;
                                per-deadline reminder cadence
                                (T-7 d / T-1 d / overdue daily)
EVIDENCE                        notification_event (EC-22)
EDGE CASES                       email bounce; user inactive;
                                organization-wide notify-storm
                                (allergen update; cyber update)
```

### Step 3 — Delivery

```
METHODS
  E-LEARNING                     LMS-hosted; per-language;
                                 captioned; WCAG 2.2 AA;
                                 SCORM / xAPI tracking; printable
                                 certificate
  CLASSROOM                       live session; attendance
                                 tracked; sign-in evidence;
                                 trainer qualification verified
  ON-THE-JOB (OJT)                 supervisor pairing; observation
                                 form; multi-shift if needed
  SIMULATOR / VR / AR              for high-risk skills (aseptic
                                 sterile; surgical device usability)
  HYBRID                            mix of methods
EVIDENCE                          delivery_record (EC-11);
                                 attendance / completion
                                 (EC-22)
DECISION POINTS                   P3.1 method per skill
                                 P3.2 retake policy
                                 P3.3 self-paced deadline
EDGE CASES                         user fails to start within
                                 deadline; trainer unavailable;
                                 system outage during e-learning;
                                 OJT supervisor not qualified
                                 (training-the-trainer path)
```

### Step 4 — Assessment

```
TYPES
  QUIZ / TEST (e-learning)           pass threshold per course
  WRITTEN EXAM (classroom)             same
  PRACTICAL DEMONSTRATION             observed by qualified
                                     assessor; per checklist
  SIMULATOR-BASED                       aseptic / surgical
  PRACTICAL OJT                          supervisor sign-off after
                                     observation
  ATTESTATION                            for awareness-only
                                     (per H7 governance);
                                     not sufficient for regulated
                                     skills
EVIDENCE                              assessment_record (EC-22);
                                     score; assessor sig (EC-2)
DECISION POINTS                       P4.1 pass threshold
                                     P4.2 retest allowance
                                     P4.3 remedial training
                                     P4.4 escalate to alternative
                                     role (if user repeatedly
                                     fails)
EDGE CASES                             borderline pass (retest);
                                     fraud / suspect cheating
                                     (per H8 + L4 if AI proctored);
                                     accommodation per disability
                                     (per F11)
```

### Step 5 — Certification (signed)

```
SUBSTANCE                       trainee e-signs (declaration of
                                completion + competency); assessor
                                e-signs (verification of
                                competency); for regulated:
                                second qualified-witness signs
                                (per pack: aseptic peer; PCQI
                                supervisor; ITAR responsible
                                official); banned for AI per
                                BD-6
EVIDENCE                        certification_record (EC-11) +
                                signature (EC-2) per signer +
                                per-pack additional sigs
EDGE CASES                       signer unavailable (per delegation
                                policy; some packs forbid
                                delegation); session expiry
                                (re-auth); attempt-to-self-sign
                                (rejected — separate trainee +
                                assessor required)
```

### Step 6 — Active eligibility

```
SUBSTANCE                       active certification grants
                                eligibility; visible to D3
                                eligibility resolver; downstream
                                workflows query D8 for currency;
                                effective date = certification date
                                or per pack rule
EVIDENCE                        eligibility_active flag (EC-11);
                                queryable per role × per skill ×
                                per user
COUPLINGS                        D3 step 7 eligibility gate;
                                D10 release gate; D9 MWO gate
EDGE CASES                       user role change post-cert
                                (eligibility may transfer);
                                pack toggle change (re-eligibility
                                test); cross-tenant transfer
                                (eligibility per tenant)
```

### Step 7 — Expiration

```
SUBSTANCE                       per recert frequency:
                                  T-90 d notification (early
                                  warning)
                                  T-30 d warning
                                  T-7 d alert + supervisor cc
                                  T+0 d expiration → eligibility
                                  withdrawn
                                supervisor + manager visibility;
                                per-pack: stricter (e.g., aseptic
                                T-180 d notice; ITAR T-60 d)
EVIDENCE                        expiration_event (EC-11)
DECISION POINTS                 P7.1 grace-period (rare; per
                                tenant policy; not regulated
                                tenants)
                                P7.2 leave-of-absence pause
                                (per HR policy; counter resumes
                                on return)
EDGE CASES                       user resigns within window
                                (eligibility immediately lost);
                                role retired (cert withdrawn);
                                pack disabled (cert per-pack
                                withdrawn)
```

### Step 8 — Re-certification

```
SUBSTANCE                       re-assignment; cycle repeats from
                                Step 1; per pack: full re-test
                                vs delta-test allowance
EVIDENCE                        re-cert_record (EC-11)
EDGE CASES                       user on extended leave (deferred
                                re-cert); user role change
                                (different cert); cycle interval
                                shortened due to incident (per
                                H8 + I3)
```

---

## 6. Branches

```
ONBOARDING                        new hire baseline curriculum
ROLE-CHANGE                       delta training only
ANNUAL CYCLE                       per skill recert
DOC-DRIVEN                         per D7 step 7
CAPA-DRIVEN                         per H8 root cause
EMERGENCY (incident-driven)         expedited per I3
CYBER / PRIVACY ANNUAL              per I7
ASEPTIC ANNUAL (Pharma)             per Annex 1
ITAR PER-CYCLE (Aero)                per J3 §5
PCQI APPOINTMENT (Food)              per FSMA Part 117
HACCP TEAM (Food)                     per HACCP plan
NADCAP SPECIAL PROCESS (Aero)        per CQI cycle
AS9102 FAI INSPECTOR (Aero)            per cycle
LPA AUDITOR (Auto)                     per LPA cycle
8D LEAD (Auto CSR)                     per OEM
PCCP-AI ROLE (MD)                      per L3 + J4
SUSTAINABILITY ROLE (where applic)     per ESG
ACCESSIBILITY (per F11)                 per role
USABILITY ENGINEERING (MD; per          per IEC 62366
   IEC 62366)
DPO / PRIVACY-ROLE (GDPR)               per I7 §9
SUBPROCESSOR-CONTACT (DPA-listed)       per L2 §8
SUPPLIER QUALITY (SCAR / D6)            per supplier
MOCK-RECALL (Food)                       per recall plan
EMERGENCY-DR (per I4)                     per quarterly drill
```

---

## 7. Cross-domain footprint

```
WORKFORCE (C10)                  primary
QUALITY (C7)                       regulated certification
SHOPFLOOR (C6)                     eligibility consumer
MAINTENANCE (C9)                    maintenance tech qual
PROCUREMENT (C4)                     supplier qual cert
COMPLIANCE                            regulated cert
ANALYTICS / AI (C13)                  AI-23 gap detection (advisory)
ENGINEERING (C2)                       SOP / WI training trigger
INTEGRATION (C12)                       LMS integration
CORE (C14)                              identity + tenant
```

---

## 8. Pack overlays

```
PHARMA (J1)                      aseptic personnel qualification
                                 (per Annex 1); media-fill
                                 evidence; gowning competency;
                                 GMP-specific role training;
                                 21 CFR 11.10(j) accountability
                                 attestation
AUTO (J2)                        per-OEM CSR training (Ford Q1
                                 problem-solving; Toyota TPS;
                                 LPA training); 8D method;
                                 SPC training; PFMEA team
                                 qualifications
AERO (J3)                        ITAR person-of-record training
                                 + nationality verification;
                                 NADCAP-cert special-process
                                 operator; AS9102 FAI inspector;
                                 counterfeit-avoidance training
MD (J4)                          IEC 62366 usability engineering
                                 role; clinical investigation
                                 (ISO 14155); IEC 62304 software
                                 lifecycle role; PRRC qualification
                                 (per MDR Art 15)
FOOD (J5)                        PCQI (Preventive Controls
                                 Qualified Individual);
                                 HACCP team member;
                                 sanitation team;
                                 food defense (FSMA Part 121)
```

---

## 9. KPIs

```
- Training completion rate (per role / per skill)
- On-time completion rate
- Assessment pass rate
- Re-certification adherence
- Eligibility-blocked dispatch rate (downstream measure)
- Training-related CAPAs (downward target)
- Per-pack regulated qualification compliance (target 100%)
- Mean time-to-eligibility post-assignment
- AI-23 training-gap acceptance rate
- Supervisor cycle compliance
- Skill / competency coverage per facility
```

---

## 10. Failure modes + recovery

```
FM1   Trainee fails assessment repeatedly
      Recovery: remedial training; alternate role;
              per pack: regulator training-incident report
              if pattern

FM2   Trainer / Assessor unavailable
      Recovery: alternative qualified assessor; if none,
              schedule slip; H8 systemic if recurring

FM3   E-learning system outage
      Recovery: per RB-INC; alternative delivery
              (classroom backup); deadline extension

FM4   Course superseded mid-cycle (per D7)
      Recovery: in-flight redirect to new course;
              per H7 governance

FM5   Expiration not caught (eligibility used post-expiry)
      Recovery: SEV-2 (regulated); H8 systemic;
              audit finding likely

FM6   AI auto-certifies (BD-6 attempt)
      Recovery: per L1 §4 triple defense; SEV-1; H8 systemic

FM7   Self-sign attempt (trainee = assessor)
      Recovery: separation-of-duties enforced (B6 axiom);
              attempt logged; H8 systemic if pattern

FM8   Cross-tenant eligibility leak
      Recovery: per B6 C5 tenant boundary; SEV-1;
              H8 systemic CAPA

FM9   Suspected cheating in e-learning
      Recovery: per H8 investigation;
              proctored re-assessment; data integrity
              review

FM10  Pack-specific cert (e.g., aseptic) lapsed in production
      Recovery: per J1 §10 FM; line access blocked;
              re-qual cycle expedited

FM11  ITAR person-of-record verification gap (Aero)
      Recovery: per J3 §10 FM3; SEV-1; access revoke

FM12  Training-record corruption (data integrity)
      Recovery: SEV-2; H8 systemic; audit trail
              reconstruction from anchor (per B6)
```

---

## 11. Roles and authority (RACI)

```
ACTION              TRAIN  ASSESS  COORD  HR  QM  DOM  COMP  PACK  AI
Assign               -      -       A     R   C   R    -     -     -
Notify                -      -       A     R   -   -    -     -     -
Deliver e-learn       R      -       C     -   -   -    -     -     -
Deliver classroom     R      C       C     -   -   -    -     -     -
Deliver OJT           R      C       -     -   -   A    -     -     -
Assess                -      A       C     -   C   -    -     -     -
Certify (regulated)   R      A       C     C   A   -    A     A    -
                                                                   (BD-6)
Active eligibility    -      -       A     -   -   R    -     -     -
Expire                -      -       A     -   -   -    -     -     -
Re-cert assignment    -      -       A     R   -   R    -     -     -
Withdrawal             -      -       A     R   -   R    -     -     -
```

---

## 12. Cross-references

- D3 (Plan to Produce) — eligibility consumer at dispatch
- D7 (Document to Release) — training trigger
- D9 (Maintain to Restore) — maintenance qual
- D10 (Batch to Release) — qualified release authority
- D14 (Validate to Qualify) — qualification training
- C7 (Quality) — regulated training
- C10 (Workforce) — primary domain
- E3 + E5 + E7 — APIs
- F4 + F5 + F11 + F12 — UI + a11y + i18n
- H4 — training_record (EC-11)
- H5 — perpetual + GxP retention
- H7 — change control for course set
- H8 — CAPA from training gap
- L1 — BD-6 (certify training)
- L2 — AI-23 training gap detection (advisory)
- M3 — root catalog (Training Record, Course)
- M4 — SM-8

---

## 13. Decision phrase

```
D8_TRAIN_TO_QUALIFY_BASELINE_LOCKED
NEXT: D9_MAINTAIN_TO_RESTORE.md
```

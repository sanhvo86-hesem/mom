# F8 — Sub-Flow Wizards (SFW)

```
surface_class:  SFW
owner_role:     Per-domain lead with Frontend Lead
sources:        Wizards / multi-step form patterns; WAI-ARIA 1.2
                wizard pattern; WCAG 2.2 SC 3.3.4 (error
                prevention for legal / financial / data); GAMP 5
                guided protocols; per F0 catalog
```

SFWs are multi-step processes spanning several screens or stages.
They guide the user through a complex sequence with progress
indication and save/resume. SFWs are the regulated UI shape for
high-risk capture (PPAP submission with 18 elements; Audit pack
export; Validation Master Plan; Recall initiation; APR draft).

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Multi-step form / capture              single-action drawer (F7)
Per-step validation                     full workspace (F4)
Save + resume per step                  authoritative record (F5)
Step-progress indicator                 background process
Final review + submit                    notification (E10)
Submission via E3 (single or            partner API submission
 multiple commands per E11)              (E15)
Audit trail of wizard
 progression
Per-pack overlay (PPAP wizard;
 APR wizard; Audit pack export;
 Recall initiation; tenant
 onboarding)
Per-tenant override (CSR-driven)
```

---

## 2. SFW catalog (canonical)

```
WIZARD                              STEPS
NEW ITEM INTRODUCTION (NPI)          identity → BOM → routing →
                                    FMEA → ECO → release
CUSTOMER ONBOARDING                  per K + I8 §1 P1-P8
AUDIT PACK EXPORT                    scope → period → regulator →
                                    compose → sign → deliver
                                    (per H3 §4)
TENANT PROVISIONING                  tenant identity → region →
                                    tier → vertical pack →
                                    initial admin → IQ → activate
                                    (per E14 + H2 §11 S8)
VALIDATION MASTER PLAN               scope → strategy → risk
                                    (per H9) → URS → IQ/OQ/PQ
                                    plan → approval (per H2)
URS / FS / DS AUTHORING              per H2 §2 each artifact
                                    template + review +
                                    approval cycle
DR DRILL                              scenario → planning →
                                    execution → reporting
                                    (per I4 §3)
RECALL INITIATION                     classification → scope →
                                    notification → tracking
                                    (per D12 + per pack §3)
MOCK RECALL                           per D12 + per Food §3
                                    (annual cycle)
PPAP SUBMISSION (Auto)                18 elements → review → submit
                                    (per J2 §3 SM-PPAP)
PSW SIGNOFF (Auto)                    summary → 2-person sign
                                    (per BD-17)
APR GENERATION (Pharma)               period → data ingest → AI
                                    draft (AI-21) → review →
                                    QP signoff (per BD-9)
PSUR GENERATION (MD)                  period → ingest → draft →
                                    PRRC signoff (per BD-14 / 15)
DHF SECTIONING (MD)                   per IEC 62304 stage
ICSR SUBMISSION (Pharma)              intake → triage → assess →
                                    code → submit (per H1 §3)
VIGILANCE REPORTABILITY (MD)          intake → triage → assess →
                                    AI-19 advisory → PRRC sign →
                                    submit (per H1 §3)
FAI BUBBLE-DRAWING (Aero)             characteristic identification
                                    → AI-08 + AI-FAI advisory →
                                    measurement → review → form
                                    submit (per J3 §3 SM-FAI)
NADCAP CYCLE (Aero)                   prep → audit → response →
                                    closure
COUNTERFEIT INVESTIGATION (Aero)      detect → quarantine →
                                    investigate → GIDEP draft →
                                    submit (per BD-21 / 22)
HACCP PLAN AUTHORING (Food)           team → hazard analysis →
                                    CCP → critical limits →
                                    monitoring → corrective →
                                    verification → record-keeping
                                    (per Codex 7 principles + J5)
HACCP REANALYSIS (Food)                annual + on-trigger
FSVP SUPPLIER VERIFICATION (Food)     hazard analysis →
                                    verification activity →
                                    review (per J5 + FSMA)
RISK FILE AUTHORING (per H9)           identify → analyze → evaluate
                                    → control → review (per
                                    framework: Q9 / 14971 / FMEA /
                                    4761 / NIST AI RMF)
ECO AUTHORING                         scope → impact analysis →
                                    risk → approval per H7
                                    (per BD-5)
SCAR (Procurement)                     problem → 5-Whys / 8D →
                                    supplier signoff (per D6 + D2)
8D INVESTIGATION (Auto)                D1 → D2 → D3 → D4 → D5 →
                                    D6 → D7 → D8 (per J2)
LPA AUDIT RUN (Auto)                   per layer × per cycle
                                    (per J2 SM-LPA)
COMPLAINT INVESTIGATION                intake → assessment →
                                    investigation → response →
                                    closure (per D12)
MEDIA FILL CYCLE (Pharma)              per period × per line
                                    (per Annex 1)
CLEANING VALIDATION (Pharma)           protocol → execute → analyze
                                    → accept (per SM-CLEANING-V)
STABILITY PROTOCOL (Pharma)            ICH Q1A storage + pull
                                    schedule (per SM-STAB)
THERMAL VALIDATION (Food LACF)        per Process Authority +
                                    per ICH-equivalent
SUB-PROCESSOR ONBOARDING                per L2 §8 + I8 §6
                                    (DPA amendment cycle)
ITAR ACCESS GRANT (Aero)                request → person-of-record
                                    verify → scope → grant
                                    (per BD-24)
DSCSA TRADING-PARTNER ONBOARDING       per Pharma §3 SM-DSCSA
PSUR / APR REVIEWER ASSIGN              per H6 cycle
DSAR EXTRACTION (per GDPR Art 15)       per H5 §6 + E13
```

---

## 3. Common pattern

```
HEADER                            wizard name + step indicator
                                  (Step 3 of 7) + estimated
                                  remaining time
PER STEP                           own surface; data capture;
                                  per-step validation; per-step
                                  evidence reference;
                                  next / prev / save & exit;
                                  cancel with unsaved guard
SAVE-RESUME                          state persisted server-side
                                  (per E3 LRO-equivalent for
                                  long wizards);
                                  client-side draft for short
                                  wizards
FINAL REVIEW                          summary of all entered data;
                                  per L1 §6 friction calibration:
                                  re-confirmation + reason text
                                  for Tier-1 actions
SUBMISSION                              per E3 single-command OR
                                  per E11 bulk-command;
                                  signature via E7 where
                                  regulated;
                                  multi-sig per L1 §quorum;
                                  AI cannot submit (BD-N);
                                  receipts for each step
AUDIT TRAIL                              per step: actor + timestamp +
                                  data captured + cancellations;
                                  full trail accessible per E6
```

---

## 4. Step kinds

```
DATA-ENTRY STEP                   form fields; per-field validation;
                                  per-pack vocabulary;
                                  AI advisory chip (per L2;
                                  advisory only);
                                  per F11 + F12
ATTACH-EVIDENCE STEP               file upload (per E12 + F7);
                                  evidence catalog (per E8)
REVIEW STEP                          read-only summary + edit-link
                                  back per step
APPROVAL STEP                          per E7 challenge + factor +
                                  compose; multi-sig as required
                                  (per L1 quorum)
SUBMISSION STEP                          per E3 / E11;
                                  per E15 partner submission
                                  (where applic);
                                  receipts
EFFECTIVITY-DATE STEP                     per D7 doc lifecycle;
                                  per pack rule
NOTIFICATION STEP                          per E10 + per H1 §3 windows
                                  (regulator-relevant)
TRAINING-ASSIGN STEP                          per D8 (where doc
                                  triggers)
```

---

## 5. Discipline

```
NO DIRECT MUTATION                  always via E3 / E11 with
                                  idempotency + ETag + signature
                                  (per F9 binding)
PER-STEP IDEMPOTENCY                 each step idempotent;
                                  resume returns same draft state
PER-STEP VALIDATION                  prevents progression to next
                                  step on failure
A11Y (per F11)                        focus discipline per step
                                  transition;
                                  step indicator aria-current
KEYBOARD                               full coverage
SAVE-AND-EXIT GUARD                   no data loss on accidental
                                  cancel
TIMING                                  long wizards (e.g., onboarding
                                  P4 master-data) span days /
                                  weeks; resume per session
TENANT BOUNDARY                          per B6 C5
PER-PACK OVERLAY                          per pack regulator-required
                                  steps
PII REDACTION                              per role; per-step
                                  visibility
EVIDENCE EMIT                                wizard_progression (EC-22)
                                  + per-step evidence;
                                  signed final submission
DEPRECATION                                  retirement is H7 Class A
                                  for regulated wizards (e.g.,
                                  PPAP submission shape change)
```

---

## 6. Per-pack overlays

```
PHARMA (J1)                      APR generation;
                                 PSUR draft;
                                 DSCSA partner onboarding;
                                 ICSR submission;
                                 cleaning validation cycle;
                                 stability protocol cycle;
                                 media fill;
                                 deviation handling
AUTO (J2)                        PPAP submission (18-element);
                                 PSW signoff;
                                 8D investigation;
                                 LPA audit run;
                                 layered process audit
AERO (J3)                        AS9102 FAI bubble-drawing;
                                 NADCAP cycle;
                                 counterfeit investigation;
                                 GIDEP submission;
                                 ITAR access grant;
                                 service-life-limited part
                                 replacement
MD (J4)                          DHF sectioning;
                                 vigilance reportability;
                                 PSUR generation;
                                 risk-file lifecycle;
                                 PCCP envelope
FOOD (J5)                        HACCP plan authoring;
                                 reanalysis annual;
                                 FSVP supplier verification;
                                 thermal validation;
                                 mock recall
```

---

## 7. Backend bindings (per F9)

```
PER STEP                          E5 (read context);
                                 E2 (authorization for next
                                 step);
                                 E12 (file upload);
                                 E9 (AI advisory chip)
SAVE-RESUME                          E14 admin storage of draft
                                 OR per E13 LRO state
APPROVAL                              E7 challenge + factor +
                                 compose
SUBMISSION                            E3 single OR E11 bulk OR
                                 E15 partner submission
NOTIFICATION                          E10 (downstream)
EVIDENCE                                 E8 attach across steps
```

---

## 8. Wave target

```
W1        baseline SFW infrastructure;
          first wizards: NPI + URS authoring (per H2)
W3        per regulated wizards: ECO authoring;
          SCAR; complaint investigation
W5        recall initiation; mock recall;
          DR drill
W7        audit pack export wizard (per H3 §4);
          PSUR / APR generation (with AI-21 advisory);
          AI advisory chip in regulated wizards
W8        SOC 2 + DORA Elite compatible
W10       per-pack wizard GA (J1..J5):
          PPAP (Auto); FAI (Aero); HACCP (Food);
          DHF (MD); APR (Pharma)
W11       customer onboarding wizard (per K + I8)
W12       sovereign region variants
```

---

## 9. Failure modes

```
FM1   User loses connection mid-wizard
      Recovery: auto-save per step; on reconnect,
              resume from last-saved step

FM2   Per-step validation passes but final-submit fails
      Recovery: clear error per RFC 9457;
              specific step pointed-back-to;
              re-edit allowed

FM3   Approval step expires (per E7 challenge expiry)
      Recovery: re-challenge; do not lose wizard state

FM4   AI advisory in wizard suggests banned-decision
      Recovery: per L1 §10; clear human-only path;
              advisory hidden if BD-related

FM5   Wizard crash mid-PPAP-element (Auto)
      Recovery: per E3 + per E14 admin storage;
              resume from element

FM6   Per-tenant override conflicts with regulator floor
      Recovery: regulator floor wins (per L1 §9);
              wizard refuses to proceed past floor

FM7   Customer-side wizard for CVLP delivery
      Recovery: per H2 §14 CVLP shipped pre-formed;
              customer wizard guides import

FM8   Cross-tenant wizard data leak in linked-records
      Recovery: per B6 C5; SEV-1; H8 systemic
```

---

## 10. Cross-references

- F0 — pattern catalog
- F4 + F5 + F6 — surfaces invoking wizards
- F7 — drawer (atomic alternative)
- F9 — frontend↔backend binding
- F10 + F11 + F12 — design tokens + a11y + i18n
- E3 + E7 + E11 + E13 + E15 — APIs
- D-workflows — many wizards instantiate D-workflows
- H1 §3 — regulator window
- H2 — validation lifecycle
- H3 §4 — audit pack export
- H7 — change governance
- L1 §10 — AI communication discipline
- L2 — AI feature integration
- M9 — cross-reference

---

## 11. Decision phrase

```
F8_SUB_FLOW_WIZARDS_BASELINE_LOCKED
NEXT: F9_FRONTEND_BACKEND_BINDING.md
```

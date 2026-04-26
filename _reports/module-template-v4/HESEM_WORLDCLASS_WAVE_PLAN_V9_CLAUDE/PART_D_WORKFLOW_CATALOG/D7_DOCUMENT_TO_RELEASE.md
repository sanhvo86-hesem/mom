# D7 — Document to Release

```
workflow_id:    D7
workflow_name:  Document to Release
owner_role:     Document Control Lead with Quality Lead
participants:   Engineering, Workforce (training), Compliance,
                Vertical Pack Lead (per pack), QP / PRRC
                (regulated decisions)
state_machines: SM-7 Document Lifecycle (primary; BD-4 + BD-5
                banned for AI); SM-8 Training (cascade); SM-1 +
                SM-3 + SM-10 (effectivity gate cascades)
```

D7 is the substrate of "what is the current authoritative
instruction." Every regulated workflow gates on doc effectivity:
SM-1 release waits for current Sales Spec; SM-3 dispatch waits for
current Routing + WI; SM-10 batch release waits for current MBR;
SM-14 validation waits for current URS / FS / DS. Doc lifecycle is
the single most-cited cross-cutting workflow in HESEM.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Doc authoring + revision               Training execution (D8)
Review cycle (SME + QA)                 Recall workflow (D12)
Approval cycle (per classification)     Audit pack export (H3)
Effectivity gate                         Customer notification (D1 + I8)
Supersession discipline
Withdrawal discipline
ECO linkage (when process change)
Training-trigger handoff (when applic)
Concession addendum (linked to D5)
Customer-facing label control (where
 applicable)
```

---

## 2. Trigger catalog

```
NEW DOCUMENT                            new product / process / pack
                                        deployment
PERIODIC REVIEW (per H6 §1)              every doc has a review-due date
REGULATORY HORIZON UPDATE                 per H1 §6 → may trigger CR
CAPA-DRIVEN REVISION                       per H8 → systemic CAPA
ECO-DRIVEN REVISION                         per H7 + C2
AUDIT FINDING                                per H3 + H8
INCIDENT-DRIVEN HOTFIX                       per I3 → emergency CR class E
SUPPLIER QUALITY UPDATE                       per C4 + supplier feedback
COMPLAINT-DRIVEN REVISION                     per D12
RECALL CONCLUSION                              per D12 → revise SOP /
                                            label
WITHDRAWAL (obsolete)                          per H7 governance
TRANSLATION ROLL                                per F11 + F12 i18n
ANNUAL REVIEW (where required)                  per pack
TENANT-SPECIFIC CSR OVERLAY                     per H1 §7
PHARMA APR FINDING                                per J1 SM-APR
MD POST-MARKET INPUT                              per J4 SM-VIG / SM-PMS
AUTO PFMEA UPDATE                                  per J2 PFMEA
AERO ECO POST-FAI                                  per J3 SM-FAI
FOOD HACCP REANALYSIS                              per J5
NEW SUB-PROCESSOR DPA                              per L2 §8
CONCESSION ADDENDUM (per D5 §6)                    per regulated lot
LEGAL HOLD / RETENTION CHANGE                       per H5 §5
NEW LABEL REGULATION                                  per FDA / EMA
DSCSA / FMD LABEL CHANGE                              per Pharma jurisdiction
```

---

## 3. Document class taxonomy

```
CLASS                            EXAMPLES
SOP                              Standard Operating Procedure
WI                               Work Instruction (per operation)
SPEC                             Item / material specification
DRAWING                          engineering drawing
ROUTING                          per item × per process
BOM                              bill of materials
INSPECTION PLAN                   per item / per supplier
TEST METHOD                       per analysis / per characteristic
SOP for SOPs (Master SOP)         meta SOP per H7
CDOC FORM                          regulated form
LABEL                              product label (per regulator
                                  + per language)
LEAFLET / IFU                      patient / user instructions (MD)
TRAINING MATERIAL                  per role × per skill
COMPETENCY MATRIX                  role × skill × authority map
QUALITY MANUAL                     top-level QMS document
VALIDATION MASTER PLAN              top-level validation strategy
RISK MGMT POLICY                   per H9
RISK FILE (MD)                     per device
RECALL PLAN                         per facility / per pack
HACCP PLAN                          per facility (Food)
FOOD SAFETY PLAN                    per facility (Food)
APR (Pharma)                        per product (cycle output)
PSUR (MD)                            per device (cycle output)
PCCP (MD AI)                          per device per AI feature
DPA / ROPA                            per tenant
CSR OVERLAY                            per customer × per pack
SOP-MAPPED CHANGE-CONTROL              per H7 (the SOP for SOPs)
TENANT REGULATORY PROFILE              per tenant (per H1 §5)
```

Each class has its own template + approval chain + effectivity
discipline.

---

## 4. State machine SM-7 Document Lifecycle

```
STATES                          EVENTS / GUARDS              EVIDENCE
draft                           submit_review                 EC-4
                                cancel                        EC-5
in_review_SME                   sme_signoff                   EC-2 (SME sig)
                                sme_change_request            EC-4 (revision)
in_review_QA                    qa_signoff                    EC-2
                                qa_change_request             EC-4
approved                        publish (effectivity date     EC-2 + EC-4
                                set; per pack additional sig: + per-pack sig
                                Pharma QP / MD PRRC /          (BD-4)
                                Aero DOA representative;
                                BANNED for AI per BD-4 +
                                BD-5)
effective                       (gates downstream)            EC-10 (effective)
under_revision                  revision_started              EC-4
superseded                      next_revision_effective       EC-4
                                (auto when next_rev becomes
                                effective)
withdrawn                        withdraw (per H7 governance)  EC-2 + EC-4
                                                              (regulated:
                                                               2-sig)

HARD COUPLINGS
  SM-7 → SM-1 (effective Sales Spec gates SO release)
  SM-7 → SM-3 (effective Routing + WI gates WO start)
  SM-7 → SM-10 (effective MBR / Master Production Record gates
              batch release)
  SM-7 → SM-INSP (effective Inspection Plan gates IQC / IPQC)
  SM-7 → SM-14 (effective URS / FS / DS gates validation activity)
  SM-7 → SM-8 (training-required revision triggers training
              assignment)
SOFT COUPLINGS
  SM-7 ← SM-12 (audit finding may trigger doc revision)
  SM-7 ← SM-6 (CAPA closure may revise SOP)
  SM-7 → C12 (translation pipeline + sub-processor)
```

---

## 5. Step substance

### Step 1 — Authoring

```
SUBSTANCE                       Author drafts in controlled
                                template (per class); language
                                of authorship (LTR/RTL); per-class
                                template enforces required
                                sections (purpose / scope /
                                responsibilities / definitions /
                                procedure / records / references);
                                per-pack overlay (Pharma SOP
                                template includes deviation
                                handling section; MD includes
                                risk-control linkage; etc.)
EVIDENCE                        draft_record (EC-4); per-revision
                                version
DECISION POINTS                 P1.1 inherit-from-existing vs new
                                P1.2 multi-language master
                                P1.3 use of approved-clause library
EDGE CASES                       template version drift
                                (new template available);
                                multi-author concurrency;
                                copy-from-superseded (must not
                                inherit superseded language by
                                default)
```

### Step 2 — SME review

```
SUBSTANCE                       SMEs review technical content;
                                per-class SME panel; comments
                                captured + author iterates;
                                per pack: pack-specific SMEs
                                (e.g., aseptic SME for Pharma
                                sterile)
EVIDENCE                        review_record (EC-22); SME sigs
                                per-checkpoint (EC-2)
DECISION POINTS                 P2.1 minor change inline vs
                                full-revision
                                P2.2 multi-SME quorum
                                requirement
                                P2.3 cross-SME conflict
                                resolution
EDGE CASES                       SME-blocking veto;
                                SME-unavailability with deadline
                                pressure;
                                technical disagreement reaching
                                executive
```

### Step 3 — QA review

```
SUBSTANCE                       QA Reviewer per class:
                                  regulatory compliance per H1
                                  consistency with related CDOCs
                                  cross-reference validity
                                  approval-chain conformance
                                  per pack: pack-specific
                                  conformance (Pharma 11.10(j);
                                  MD ISO 13485 §4.2.5; Auto
                                  IATF 16949 §7.5; Aero
                                  AS9100D §7.5; Food FSMA
                                  Part 117)
                                  language quality + glossary
                                  alignment
                                  effectivity-date proposal
                                  training-trigger flag
                                  withdrawal of replaced doc
                                  cross-link
EVIDENCE                        qa_review_record (EC-22); QA sig
                                (EC-2)
DECISION POINTS                 P3.1 minor revision (Class C
                                per H7) vs major
                                P3.2 expedited path (E-class)
                                per emergency
                                P3.3 escalate to Quality Lead
EDGE CASES                       QA reviewer subject-matter gap;
                                conflicting regulatory
                                interpretations;
                                pack-specific overlay missing
```

### Step 4 — ECO linkage (when applicable)

```
SUBSTANCE                       for major revisions or process
                                changes, ECO opened (per H7);
                                ECO impact analysis answers H7
                                §4 Q1-Q20; identifies affected
                                workflows / training / equipment
                                / customer-impact; per pack
                                additional considerations
                                (Pharma deviation impact;
                                MD risk-file impact;
                                Auto PFMEA + PPAP impact;
                                Aero FAI re-trigger;
                                Food HACCP reanalysis trigger);
                                per H7 Class A/B/C decision drives
                                approval chain
EVIDENCE                        eco_record (EC-16) +
                                impact_analysis (EC-22) +
                                approval signoffs (EC-2)
COUPLINGS                       SM-7 references SM-ECO; ECO closure
                                gates SM-7 effectivity
EDGE CASES                       SM-ECO open with multiple CDOCs
                                in scope; ECO scope creep;
                                ECO emergency with retroactive
                                paperwork
```

### Step 5 — Approval

```
APPROVAL CHAIN PER CLASS
  Standard (Class C/D per H7)             single-signer
                                          (Doc Owner)
  Major (Class B)                          multi-signer (Author +
                                          QA + Domain Lead)
  Regulated (Class A; per pack):
    Pharma                                 + QP / Designated Person
                                          (BD-9 in extension list);
                                          21 CFR Part 11 §11.50
                                          electronic signatures
    Med Device                              + PRRC (BD-13..BD-16
                                          extension); EU MDR Art 15
    Auto                                    + per-OEM CSR signoff
                                          (where applic)
    Aero                                    + DOA representative
                                          (where applic)
    Food                                    + PCQI signoff
  EMERGENCY (Class E per H7)                at-deploy signoff +
                                          retroactive within 5 days
ROLE                                       AI never autonomously
                                          commits (BD-4 + BD-5)
EVIDENCE                                    multi-sig (EC-2);
                                          per-class quorum check
                                          (axiom B6); reason-text
                                          per signer
DECISION POINTS                              P5.1 delegation per
                                            policy
                                            P5.2 emergency-bypass
                                            (rare; per H7 §3 Class E)
                                            P5.3 conditional approval
                                            (with action items
                                            tracked)
EDGE CASES                                    approver expired auth;
                                            quorum conflict;
                                            signing on behalf
                                            (delegation chain);
                                            customer concession
                                            addendum extra
                                            signoff
```

### Step 6 — Release / effectivity

```
SUBSTANCE                       once approved, doc transitions to
                                "approved"; effectivity date
                                set (immediate or future); on
                                effectivity date, doc transitions
                                to "effective"; "active" alias
                                per state machine; downstream
                                workflows now gate on this
                                effective state
EVIDENCE                        effectivity_event (EC-4 + EC-10
                                effective state)
DECISION POINTS                 P6.1 immediate vs phased
                                effectivity (per tenant +
                                training + per-pack)
                                P6.2 per-tenant rollout (some
                                tenants effective earlier)
                                P6.3 per-region effectivity
                                (data residency + jurisdiction)
EDGE CASES                       effectivity-date past (system
                                rejects); effectivity-date in
                                far future (delayed activation);
                                superseded predecessor not yet
                                retired (overlap window);
                                training-completion gate
                                (some tenants demand 100%
                                training before effective)
```

### Step 7 — Training assignment

```
SUBSTANCE                       per Competency Matrix (per C10),
                                affected audience identified
                                (role × skill × authority);
                                training assignments generated;
                                deadline per pack (typ 30-90 days);
                                training compliance tracked;
                                non-compliance blocks dispatch
                                (per D8 + D3 eligibility)
EVIDENCE                        training_assignment (EC-11)
DECISION POINTS                 P7.1 immediate vs phased
                                training
                                P7.2 attestation-only (read +
                                acknowledge)
                                P7.3 instructor-led + practical
                                P7.4 per-language training
EDGE CASES                       affected audience changes after
                                rev (re-trigger); operator on
                                leave / sabbatical;
                                operator turnover during window
```

### Step 8 — Active use

```
SUBSTANCE                       effective doc cited by:
                                  D1 SO release (sales spec)
                                  D2 PO terms
                                  D3 production WI + routing
                                  D4 inspection plan
                                  D5 disposition policy
                                  D8 training material
                                  D10 master batch record
                                  D11 trace documentation
                                  D12 recall procedure
                                  D13 audit pack content
                                  D14 validation reference
                                Auditors examine doc state at any
                                point in past via audit chain
                                anchor (per B6 C1)
EVIDENCE                        every reference creates
                                cross-reference (EC-22 + EC-4)
```

### Step 9 — Supersession

```
SUBSTANCE                       new revision becomes effective →
                                old revision auto-supersede;
                                superseded retained perpetually
                                per H5; superseded cannot drive
                                regulated decisions (history-only);
                                training-record references still
                                valid (operator was trained on
                                R3 → released against R3 history)
EVIDENCE                        supersession_event (EC-4)
EDGE CASES                       overlap-period concession (e.g.,
                                in-flight batches under R3 must
                                continue to R3); per-tenant
                                staggered effectivity creating
                                multi-active illusion (UI must
                                disambiguate per tenant)
```

### Step 10 — Withdrawal

```
SUBSTANCE                       doc no longer needed; per H7
                                governance; withdrawn doc
                                retained per H5; cannot drive
                                regulated decisions; per pack:
                                regulator notification if doc
                                was citation in submission
                                (Pharma APR / MD CER / Auto
                                PPAP)
EVIDENCE                        withdraw_event (EC-2 multi-sig
                                regulated)
DECISION POINTS                 P10.1 customer notification per
                                DPA
                                P10.2 archive vs delete
                                (regulated: archive perpetual)
EDGE CASES                       attempt-to-withdraw active doc
                                (rejected); withdraw + recreate
                                pattern (anti-pattern; H8 trigger)
```

---

## 6. Branches

```
NEW DOC                          §5 default
MAJOR REVISION                    + ECO + training
MINOR REVISION                    no ECO; possibly no training
EMERGENCY HOTFIX                  E-class per H7 §3
TRANSLATION                       per F12 + per regulator
                                  language requirement
RECALL-DRIVEN                     per D12 cycle; expedited
ANNUAL-REVIEW                     periodic (no actual change)
                                  → re-confirm signoff cycle
TENANT-SPECIFIC OVERLAY           per CSR layer per H1 §7
SUSTAINABILITY UPDATE              per ESG policy (where
                                  applicable)
LABEL UPDATE                      per FDA / EMA / FSMA
                                  pre-cleared formats
DSCSA / FMD LABEL                  Pharma serialization
DPA AMENDMENT                       per legal review
NEW SUB-PROCESSOR                    per L2 §8 + I8
PCCP (MD AI)                          per L3 §6
HACCP REANALYSIS                       per Food annual + on-trigger
PSUR / APR / CER                       per pack cycle
RISK FILE                              per ISO 14971 cycle
CALIBRATION SOP                        per Maintenance
SOP FOR SOPS (META)                    per H7 governance
```

---

## 7. Cross-domain footprint

```
QUALITY (C7)                    primary
ENGINEERING (C2)                  ECO linkage
WORKFORCE (C10)                    training trigger
COMMERCIAL (C1)                    sales spec
PROCUREMENT (C4)                    supplier-facing spec
INVENTORY (C5)                      lot handling SOP
SHOPFLOOR (C6)                      production WI + routing
TRACEABILITY (C8)                   trace documentation
MAINTENANCE (C9)                     calibration SOP
FINANCE (C11)                        cost accounting policy SOP
INTEGRATION (C12)                    DSCSA / EUDAMED format
                                   submissions
ANALYTICS / AI (C13)                  AI model card per L3 (a doc
                                   class)
CORE (C14)                            ROPA + DPA + tenant profile
                                   docs
COMPLIANCE LEAD                        regulatory clause anchor
```

---

## 8. Pack overlays

```
PHARMA (J1)                      MBR + Annex 11 SOP discipline;
                                 QP signoff (BD-9); EU FMD label
                                 control; DSCSA labeling control
AUTO (J2)                        per-OEM CSR documentation (Ford
                                 Q1; GM BIQS; etc.); PFMEA;
                                 control plan; PPAP submission
                                 documents
AERO (J3)                        AS9100D §7.5 doc control;
                                 AS9120B distributor tracability
                                 docs; ITAR-marked CDOC; QPL/QML
                                 listing docs; counterfeit
                                 avoidance plan SOP
MD (J4)                          ISO 13485 §4.2.5; DHF + DMR
                                 are themselves CDOCs;
                                 IFU per device per language;
                                 IEC 62304 software lifecycle
                                 docs
FOOD (J5)                        Food Safety Plan; HACCP plan;
                                 SSOP; allergen control plan;
                                 sanitation SOP; FSVP plan
```

---

## 9. KPIs

```
- Doc cycle time (draft → effective)
- ECO linkage rate (major rev → ECO)
- Training-trigger compliance rate
- Supersession overlap window
- Periodic review on-time
- Doc effectivity gate trip rate (downstream blocked)
- Concession addendum count
- Regulator-driven revisions
- Per-pack effectivity SLA adherence
- Translation cycle time
- Per-language coverage rate
```

---

## 10. Failure modes + recovery

```
FM1   E-sign session expiry mid-approval
      Recovery: re-authenticate; mutation aborted; investigate
              (per E7); no partial-state retained

FM2   Approver unavailable (vacation / illness)
      Recovery: delegation per approval policy (per E7);
              no auto-delegate for regulated decisions;
              escalation per H7

FM3   Training non-compliance widespread post-effectivity
      Recovery: per D3 eligibility blocks dispatch;
              H8 CAPA on training rollout discipline

FM4   Withdrawal-attempted of active doc
      Recovery: rejected at SM-7 transition guard;
              if active references exist, doc cannot
              withdraw

FM5   ECO impact-analysis incomplete (post-merge discovery)
      Recovery: H7 retro-analysis + remediation ECO;
              H8 systemic CAPA

FM6   Doc effective in one tenant but not in another
      (rollout drift)
      Recovery: per-tenant effectivity tracking;
              audit catches; H8 CAPA on rollout discipline

FM7   AI auto-approves a regulated doc release (BD-4 attempt)
      Recovery: per L1 §4; SEV-1; H8 systemic CAPA

FM8   Concession addendum forgotten on concession-released
      lot
      Recovery: per D5 §6 + D11 trace; H8 CAPA on
              addendum discipline

FM9   Stale doc in prod (training expired but not
      caught)
      Recovery: per H6 freshness check; SLO-20 surfaces;
              H8 CAPA

FM10  Translation drift (per language)
      Recovery: per F12; per QA cycle; H8 CAPA
              on translation governance

FM11  Customer CSR overlay conflicts with baseline regulator
      Recovery: stricter rule wins (per H1 §7);
              flagged for resolution; H3 audit catches
              if persistent
```

---

## 11. Roles and authority (RACI)

```
ACTION                AUTHOR  SME  QA  DC  ENG  TRAIN  COMP  QP/PRRC AI
Draft                  A       -    -   -   -    -      -     -       -
SME review              C       A    -   -   -    -      -     -       -
QA review              C       C    A   -   C    -      -     -       -
ECO linkage             -       -    -   -   A    -      C     -       -
                                                              (BD-5)
Approval (standard)     -       C    A   -   -    -      -     -       -
Approval (regulated)    -       C    A   R   C    -      A     A       -
                                                              (BD-4)  (BD-4)
Effectivity decision    -       -    -   A   -    -      C     C       -
Training trigger        -       -    -   -   -    A      -     -       -
Supersession            -       -    -   A   -    C      C     -       -
Withdrawal (regulated)  -       -    A   A   C    -      A     A       -
```

---

## 12. Cross-references

- All other D workflows — every regulated workflow gates on D7
- C2 (Engineering) — ECO source
- C7 (Quality) — primary domain
- C10 (Workforce) — training trigger
- E3 + E4 + E7 + E8 — APIs
- F4 + F5 + F11 + F12 — UI + a11y + i18n
- H1 §3 — regulator notification on doc-related changes
- H4 — doc_record (EC-10) + signature (EC-2)
- H5 — perpetual retention; superseded retained
- H6 — periodic review
- H7 — change control governance
- H8 — CAPA path
- L1 — BD-4 (release doc) + BD-5 (approve ECO)
- M3 — root catalog (CDOC, ECO)
- M4 — SM-7

---

## 13. Decision phrase

```
D7_DOCUMENT_TO_RELEASE_BASELINE_LOCKED
NEXT: D8_TRAIN_TO_QUALIFY.md
```

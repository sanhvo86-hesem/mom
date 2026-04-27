# M4 — State Machine Directory (V10)

```
chapter_id:     M4
version:        V10
chapter_purpose: complete index of every state machine (SM); states,
                 events, guard conditions, evidence emission per
                 transition, hard/soft couplings, banned-decision
                 boundaries, per-SM owner, maturity tier; canonical
                 reference cited from B7 and D1-D14
owner_role:     Plan Editor with Domain Leads (per domain)
cross_refs:     B7 (saga and SM architecture); D1-D14 (workflow
                narratives); L1 (BD-N banned decisions); H4 (EC-N
                evidence classes); M3 (root catalog ownership);
                M5 (SLOs per SM-governed transition)
sources:        B7 §3 (SM architecture); Statecharts (Harel 1987);
                UML 2.5 state machine semantics; IDEF0 guard condition
                notation
```

A state machine in HESEM is the authoritative lifecycle specification
for an authoritative root. Every regulated mutation of a root goes
through the SM: states define what is allowed; events trigger transitions;
guard conditions enforce business and regulatory pre-conditions;
evidence emission records what happened for the audit chain.

State machines have two regulatory functions. First, they prevent
prohibited sequences: a batch cannot be released without an approved
EBR; a controlled document cannot be released without a qualified signer.
These are guards, not reminders — the API physically rejects a transition
that violates a guard condition and returns an explicit error with the
violated guard's description. Second, they define the evidence emission
schedule: every regulated transition emits specific evidence classes
(EC-N per H4) to the OTG Authority Ledger, creating the immutable
audit chain that regulators inspect.

The state machine directory is the single source of truth for all lifecycle
governance in HESEM. Engineering teams may not implement state transitions
outside the SM service layer. Product teams may not promise a workflow that
does not have a corresponding SM with its guard conditions specified. Compliance
teams use the SM directory to verify that every regulatory requirement (BD-N
boundary, evidence class emission, guard condition) is covered by a declared
and implemented SM. The V10 M4 catalog covers 14 core SMs and 37 pack-specific
SMs, totaling 51 state machine specifications governing every regulated lifecycle
in the platform.

SM tiers classify the human authority level required at each transition:
- **Tier-1 (T-1)**: System-automated; no human approval needed
- **Tier-2 (T-2)**: Human actor required; any authorized role
- **Tier-3 (T-3)**: Human actor + e-signature required; specific role;
  this is the BD-N boundary tier

---

## 1. Core 14 state machines (canonical directory)

```
SM     NAME                       DOMAIN       WORKFLOW   STATES  TIER  BD-TOUCH
SM-1   Order Lifecycle            Commercial   D1         7       T-2   -
SM-2   Procurement Lifecycle      Procurement  D2         6       T-2   -
SM-3   Work Order Lifecycle       Shopfloor    D3         7       T-2   -
SM-4   Inspection Lifecycle       Quality      D4         5       T-2   -
SM-5   Disposition Decision       Quality      D5         4       T-3   BD-2
SM-6   NC / CAPA Lifecycle        Quality      D6         9       T-3   BD-2,BD-3
SM-7   Document Lifecycle         Quality      D7         6       T-3   BD-4,BD-5
SM-8   Training Qualification     Workforce    D8         5       T-2   BD-6
SM-9   Maintenance Order          Maintenance  D9         6       T-2   -
SM-10  Batch Release              Quality      D10        5       T-3   BD-1
SM-11  Recall                     Quality      D12        5       T-3   BD-8
SM-12  Audit Finding              Quality      D13        5       T-2   -
SM-13  Risk Assessment            Quality      H9         4       T-3   -
SM-14  Validation Lifecycle       Quality      D14        6       T-3   BD-36
```

---

## 2. SM-1 — Order Lifecycle (canonical full example)

```
STATES:   draft → submitted → credit_approved → committed →
          released → in_production → shipped → closed
          (plus: credit_held, cancelled — alt paths)

TRANSITION TABLE:
FROM              EVENT              GUARD               TIER  EC EMITTED
draft             submit             pricing valid;       T-2   EC-4
                                     credit not blocked
submitted         approve_credit     credit check pass    T-2   EC-4, EC-22
submitted         hold_credit        credit check fail    T-1   EC-4
credit_held       approve_credit     credit cleared       T-2   EC-4
credit_approved   commit_inventory   stock available;     T-2   EC-4
                                     BOM current per SM-7
credit_approved   commit_eng         BTO/CTO order;       T-2   EC-4
                                     ECO approved per SM-7
committed         release            doc effective SM-7;   T-3   EC-4, EC-2
                                     person trained SM-8;         (release sig)
                                     material available
released          dispatch_wos       WO created per SM-3  T-2   EC-4
in_production     ship               SM-10 batch released T-3   EC-4, EC-2
                                     (if regulated);              (ship sig)
                                     inspection passed SM-4
shipped           invoice            billing terms met     T-2   EC-4
shipped           close              revenue recognized    T-2   EC-4
any state         cancel             pre-shipped only      T-3   EC-4, EC-5
  (pre-ship)                        (credit-limit check)

HARD COUPLINGS OUT:
  → SM-3: release event dispatches Work Orders (each WO per SO line)
  → SM-10: ship event requires batch release for regulated products

SOFT COUPLINGS IN:
  ← SM-2: supply plan confirms material availability at commit
  ← SM-7: document effectivity gates release
  ← SM-8: operator training gates release (for BTO with regulated ops)
  ← SM-9: asset qualified state advisory at release
```

---

## 3. SM-2 — Procurement Lifecycle

```
STATES:   draft → submitted → approved → open_for_receipt → partial →
          received → closed (plus: cancelled)

TRANSITION TABLE:
FROM              EVENT              GUARD               TIER  EC
draft             submit             vendor approved;     T-2   EC-4
                                     pricing within budget
submitted         approve            spend authority;     T-2   EC-4, EC-2
                                     vendor qualified
approved          issue              per payment terms    T-2   EC-4
open_for_receipt  receive_partial    GRN created SM-4     T-2   EC-4, EC-18
partial           receive_final      all lines received   T-2   EC-4, EC-18
received          close              AP matched           T-2   EC-4
any state         cancel             pre-issued only      T-2   EC-4, EC-5

HARD COUPLINGS OUT:
  → SM-4: partial/final receipt triggers incoming inspection
SOFT COUPLINGS IN:
  ← SM-3: WO backflush demand drives PO creation (planned)
  ← SM-4: receipt quality finding may hold PO line
```

---

## 4. SM-3 — Work Order Lifecycle

```
STATES:   planned → released → dispatched → in_progress →
          first_off → in_production → complete → closed (plus: held, cancelled)

TRANSITION TABLE:
FROM              EVENT              GUARD                    TIER  EC
planned           release            material available;       T-2   EC-4
                                     routing effective SM-7;
                                     asset available SM-9
released          dispatch           operator qualified SM-8;  T-2   EC-4
                                     SOP effective SM-7
dispatched        start              operator confirm          T-2   EC-3
in_progress       hold               hold_reason required      T-2   EC-4, EC-2
in_progress       first_off          FAI required? (Aero J3)   T-2   EC-18
first_off         approve_first_off  quality sign-off          T-3   EC-18, EC-2
in_production     yield_record       SPC within limits         T-2   EC-3, EC-4
in_production     complete           yield meets plan          T-2   EC-4
complete          inspect            linked to SM-4            T-2   EC-18
complete          close              inspection pass SM-4       T-2   EC-4
any state         cancel             pre-dispatch only          T-2   EC-4, EC-5

HARD COUPLINGS OUT:
  → SM-4: completion triggers final inspection
  → SM-10: completion is prerequisite for batch release (J1 Pharma: EBR)
HARD COUPLINGS IN:
  ← SM-1: order release dispatches WO
  ← SM-7: SOP effectivity gates dispatch
  ← SM-8: training gates dispatch
  ← SM-9: asset state gates release (down asset blocks WO)
```

---

## 5. SM-4 and SM-5 — Inspection and Disposition

```
SM-4 INSPECTION LIFECYCLE:
STATES:  initiated → sampling_plan → in_progress → results_recorded →
         pending_review → reviewed

SM-5 DISPOSITION DECISION:
STATES:  pending → under_review → disposition_made → closed

SM-4 KEY TRANSITIONS:
FROM              EVENT           GUARD              TIER  EC
initiated         plan            inspection plan     T-2   EC-18
                                  exists per INSP-PLAN
sampling_plan     start           sampling done       T-2   EC-18
in_progress       record          measurements taken  T-2   EC-18
results_recorded  escalate        any out-of-spec     T-2   EC-18, EC-13
                                  result found                (triggers SM-5)
results_recorded  pass            all in spec         T-2   EC-18
pending_review    review_complete quality sign-off    T-2   EC-18, EC-2

SM-5 KEY TRANSITIONS:
FROM              EVENT           GUARD              TIER  EC
pending           start_review    NC opened SM-6      T-2   EC-13
under_review      decide          disposition;        T-3   EC-13, EC-2
                                  e-sig required;            (BD-2)
                                  authority role
disposition_made  close           lot state updated   T-2   EC-13
disposition_made  escalate_capa   if corrective req.  T-2   EC-14

HARD COUPLINGS OUT:
  SM-4 → SM-5: out-of-spec result triggers disposition
  SM-5 → SM-6: non-acceptance disposition opens NC
  SM-4 → SM-10: inspection passed is prerequisite for batch release
  SM-5 → SM-10: accepted disposition allows batch release progression
```

---

## 6. SM-6 — NC / CAPA Lifecycle

SM-6 is the most complex core SM because it governs both nonconformance
investigation and CAPA, which have overlapping but distinct stages.

```
STATES:   opened → under_investigation → root_cause_identified →
          corrective_action_planned → action_implemented →
          effectiveness_review → closed
          (plus: escalated_to_capa when opened as NC; merged when
           NC spawns CAPA as child)

TRANSITION TABLE:
FROM                      EVENT              GUARD            TIER  EC
opened                    assign             investigator     T-2   EC-13
                                             assigned
under_investigation       root_cause         evidence         T-2   EC-14
                                             documented
root_cause_identified     plan_action        action plan      T-2   EC-14
                                             approved
corrective_action_planned implement          action completed T-2   EC-14
action_implemented        start_eff_review   30-day min from  T-2   EC-14
                                             implementation
effectiveness_review      close              effectiveness    T-3   EC-14, EC-2
                                             confirmed;              (BD-3)
                                             e-sig required;
                                             Quality Lead
effectiveness_review      re_open            effectiveness    T-3   EC-14, EC-2
                                             not demonstrated        (re-open sig)
opened (NC)               escalate_to_capa   decision to      T-3   EC-13, EC-14
                                             escalate;
                                             Quality Lead

HARD COUPLINGS OUT:
  → SM-7: CAPA effectiveness may require document revision
  → SM-8: CAPA effectiveness may require re-training
  → SM-12: NC/CAPA that is an audit finding links to SM-12
HARD COUPLINGS IN:
  ← SM-5: disposition non-acceptance opens NC
  ← SM-12: audit finding may open CAPA
  ← SM-10: batch rejection opens NC

BANNED DECISIONS:
  BD-2: disposition decision (within SM-5, cross-linked here)
  BD-3: CAPA effectiveness determination and closure
```

---

## 7. SM-7 — Document Lifecycle

```
STATES:   draft → under_review → approved → released → effective →
          superseded → obsolete

TRANSITION TABLE:
FROM           EVENT          GUARD                 TIER  EC
draft          submit_review  document complete      T-2   EC-10
under_review   approve        approver role;         T-3   EC-10, EC-1
                               e-sig required;             (BD-4)
                               all reviewers done
approved       release        effectivity date set   T-3   EC-10, EC-1
                                                          (BD-5 if ECO)
released       make_effective effectivity date past  T-1   EC-10
effective      supersede      new revision released  T-1   EC-10
superseded     obsolete       retention-class check  T-2   EC-10
               (archive)      (per H5)

HARD COUPLINGS OUT:
  → SM-1: doc effectivity gates order release
  → SM-3: SOP effectivity gates WO dispatch
  → SM-10: batch record method effectivity gates batch release
  → SM-14: validation status gates doc effectivity (T-3 validation approved)
HARD COUPLINGS IN:
  ← SM-6: CAPA may require doc revision
  ← SM-12: audit finding may trigger doc revision
  ← SM-7 (self-loop via ECO): ECO approval triggers new revision
```

---

## 8. SM-8 — Training Qualification

```
STATES:   not_started → enrolled → in_training → assessment →
          qualified → expired (plus: failed → remediation)

TRANSITION TABLE:
FROM           EVENT         GUARD                  TIER  EC
not_started    enroll        training plan exists    T-2   EC-11
enrolled       start         trainer available       T-2   EC-11
in_training    complete      content consumed        T-2   EC-11
complete       assess        assessment tool ready   T-2   EC-11
assessment     pass          score ≥ pass threshold  T-3   EC-11, EC-2
                             (BD-6; e-sig trainer)
assessment     fail          score < threshold       T-2   EC-11
failed         remediate     remediation plan set    T-2   EC-11
qualified      expire        time-since-qualified    T-1   EC-11
               (auto)        > expiry period
expired        re-enroll     supervisor action       T-2   EC-11
qualified      maintain      annual retraining       T-3   EC-11, EC-2
                             complete

HARD COUPLINGS OUT:
  → SM-3: qualified status gates WO dispatch
  → SM-10: qualified person gates batch release (SM-8 as prerequisite)
SOFT COUPLINGS IN:
  ← SM-6: CAPA action may require re-training
```

---

## 9. SM-9 — Maintenance Work Order

```
STATES:   planned → scheduled → in_progress → pending_inspection →
          complete → closed (plus: deferred, on_hold)

TRANSITION TABLE:
FROM              EVENT          GUARD               TIER  EC
planned           schedule       asset available     T-2   EC-4
                                 window; spares
scheduled         start          technician qual'd   T-2   EC-4, EC-12
in_progress       complete_work  checklist done      T-2   EC-4, EC-12
complete_work     inspect_asset  calibration due     T-2   EC-12
  (if calib due)  (links SM-CALIB) (J4 / Pharma)
pending_insp      pass_inspect   asset qualified     T-3   EC-12, EC-2
                                 (e-sig tech)
complete          close          PM record logged    T-2   EC-4, EC-12
planned           defer          defer reason;       T-2   EC-4, EC-2
                                 risk-accepted

HARD COUPLINGS OUT:
  → SM-3: asset qualified state required for WO dispatch
SOFT COUPLINGS IN:
  ← SM-3: repeated WO yield drops suggest asset PM
  ← SM-6: NC analysis may trigger emergency MWO
```

---

## 10. SM-10 — Batch Release

```
STATES:   pending → under_review → qp_declared → released → rejected
          (J1 Pharma); or pending → under_review → approved → released
          (non-Pharma); or rejected (any state)

TRANSITION TABLE (Pharma J1):
FROM              EVENT         GUARD                   TIER  EC
pending           start_review  EBR complete SM-3;      T-2   EC-19
                                all inspections passed
                                SM-4; deviations closed
under_review      qp_declare    QP role; e-sig required; T-3   EC-1, EC-2
                                all pre-reqs met;              (BD-9)
                                cleaning valid SM-CLEAN
qp_declared       release       QP cert confirmed;      T-3   EC-19, EC-1
                                stability OK                   (BD-1)
pending           reject        any pre-req failed       T-3   EC-19, EC-2
                                                               (BD-1 rejection)

TRANSITION TABLE (non-Pharma, e.g., Food J5 with CCP):
FROM              EVENT         GUARD                   TIER  EC
pending           start_review  all CCPs passed SM-CCP; T-2   EC-19
                                yield within spec
under_review      approve       Quality Manager e-sig;  T-3   EC-19, EC-1
                                no open NCQASEs               (BD-1)
approved          release       lot updated to RELEASED  T-3   EC-4, EC-1
                                                               (BD-1)

HARD COUPLINGS IN:
  ← SM-3: WO completion is prerequisite
  ← SM-4: final inspection passed is prerequisite
  ← SM-7: method document effective is prerequisite
  ← SM-8: qualified person is prerequisite
  ← SM-9: equipment qualified is prerequisite
  ← SM-DEV: open deviations block release (J1)
  ← SM-STAB: instability finding blocks release (J1)
  ← SM-CCP: CCP excursion blocks release (J5)
HARD COUPLINGS OUT:
  → SM-1: batch release gates customer shipment
```

---

## 11. SM-11, SM-12, SM-13, SM-14

```
SM-11 RECALL:
STATES:   investigation → scope_defined → notification_in_progress →
          notification_complete → closed
KEY GUARD: BD-8 — recall initiation requires CEO + Quality Lead + Legal
KEY EC:    EC-13 (recall decision); EC-4 (lot traceability for scope)
COUPLING:  → SM-12 (recall produces formal audit finding)

SM-12 AUDIT FINDING:
STATES:   identified → root_cause → action_planned → action_implemented
          → closed
KEY GUARD: Closure requires evidence of action implemented
KEY EC:    EC-12 (audit record)
COUPLING:  → SM-7 (may trigger doc revision)
           → SM-6 (may open CAPA)

SM-13 RISK ASSESSMENT:
STATES:   identified → assessed → controls_applied → residual_risk_accepted
KEY GUARD: Acceptance requires Risk Manager authority; e-sig
KEY EC:    EC-17 (risk record)
COUPLING:  → SM-14 (risk drives validation depth decision)

SM-14 VALIDATION LIFECYCLE:
STATES:   requirements_defined → iq_executed → oq_executed → pq_executed
          → validated → periodic_review → re_validation
KEY GUARD: Each step requires Validation Lead sign-off; BD-36 for
           production deployment gates
KEY EC:    EC-15 (validation evidence); EC-2 (each sign-off)
COUPLING:  → SM-7 (validation status gates document effectivity)
           → SM-10 (validated state required for batch release)
```

---

## 12. Pack-specific state machines (full catalog)

```
PACK  SM              NAME                              BD-TOUCH  OWNER
J1    SM-APR          Annual Product Review              BD-9      Quality+Pharma
J1    SM-DEV          Manufacturing Deviation            -         Quality
J1    SM-STAB         Stability Study                    -         Quality
J1    SM-ICSR         ICSR (E2B R3 submission)           -         Quality
J1    SM-CLEAN-V      Cleaning Validation Cycle          -         Validation
J1    SM-DSCSA        DSCSA Transaction Step             -         Trace
J1    SM-EBR          Electronic Batch Record lifecycle  BD-9      Shopfloor+Quality
J2    SM-APQP         APQP Phase Lifecycle               -         Planning
J2    SM-PPAP         PPAP Submission                    BD-17     Procurement
J2    SM-LPA          Layered Process Audit Run          -         Shopfloor
J2    SM-8D           8D Investigation                   -         Quality
J2    SM-PRR          Production Trial Run               BD-18     Planning
J2    SM-WARRANTY     Warranty Claim Lifecycle           -         Commercial
J3    SM-FAI          AS9102 First Article               BD-20     Quality
J3    SM-NADCAP-CERT  NADCAP Special Process Cert        -         Procurement
J3    SM-COUNTERFEIT  Counterfeit Investigation          BD-21     Quality
J3    SM-ITAR-ACCESS  ITAR Access Grant                  BD-24     Workforce
J3    SM-DO-178C      DO-178C SCI Software Lifecycle     -         Engineering
J3    SM-DO-254       DO-254 HCI Hardware Lifecycle      -         Engineering
J3    SM-AD           Airworthiness Directive Compliance BD-25     Maintenance
J3    SM-GIDEP        GIDEP Submission Lifecycle         BD-22     Integration
J4    SM-DHF          Design History File                -         Engineering
J4    SM-DHR          Device History Record              -         Quality
J4    SM-VIG          Vigilance Report                   BD-15     Quality
J4    SM-PSUR         Periodic Safety Update Report      BD-15     Quality
J4    SM-FSCA         Field Safety Corrective Action     BD-15     Quality
J4    SM-SAMD         IEC 62304 Software Lifecycle       -         Engineering
J4    SM-CYBER        Cyber / IEC 81001-5-1              -         Security
J4    SM-CLIN         Clinical Evaluation                BD-15     Quality
J4    SM-PCCP         PCCP Amendment                     BD-36     AI+Quality
J5    SM-CCP-MON      CCP Monitoring                     -         Shopfloor
J5    SM-FSVP         Foreign Supplier Verification      -         Procurement
J5    SM-FSMA-204     FSMA §204 Traceability Event       -         Trace
J5    SM-RECALL-FOOD  Recall (Food cross-link)           BD-27     Quality
J5    SM-EMP          Environmental Monitoring           -         Quality
J5    SM-MOCK-RECALL  Mock Recall Run                    -         Quality
J5    SM-IA-VA        Intentional Adulteration VA        -         Quality
```

All 37 pack-specific SMs inherit the HESEM SM substrate:
audit chain emission per transition; e-signature where T-3; API
guard enforcement; evidence class emission per H4 schema.

---

## 13. Hard couplings — complete cascade matrix

Hard couplings mean that one SM's state is a guard condition for
another SM's transition. These cascades enforce regulated sequencing.

```
PRODUCING SM     CONSUMING SM     CASCADE MECHANISM
SM-1 release     SM-3             SM-1:release creates WO records (T-2 auto)
SM-1 ship        SM-10            SM-1:ship guard requires SM-10:released
SM-3 complete    SM-4             SM-3:complete triggers inspection (T-2)
SM-3 complete    SM-10            SM-3:complete is prerequisite for SM-10
SM-4 results     SM-5             SM-4:out_of_spec triggers SM-5:pending
SM-5 disposition SM-6             SM-5:non_accept opens SM-6:NC (T-2)
SM-5 accepted    SM-10            SM-5:accepted is prerequisite for SM-10
SM-6 closed      SM-12            SM-6 linked to SM-12 if audit-triggered
SM-7 effective   SM-1             SM-7:effective is guard for SM-1:release
SM-7 effective   SM-3             SM-7:effective is guard for SM-3:dispatch
SM-7 effective   SM-10            SM-7:MBR effective is guard for SM-10
SM-8 qualified   SM-3             SM-8:qualified is guard for SM-3:dispatch
SM-8 qualified   SM-10            SM-8:QP qualified is guard for SM-10:release
SM-9 qualified   SM-3             SM-9:asset_qualified is guard for SM-3:release
SM-9 qualified   SM-10            SM-9:equipment_qualified is guard for SM-10
SM-10 released   SM-1             SM-10:released is guard for SM-1:ship
SM-11 closed     SM-12            SM-11:recall produces audit finding (SM-12)
SM-13 accepted   SM-14            SM-13:risk_level drives SM-14:validation_depth
SM-14 validated  SM-7             SM-14:validated is guard for SM-7:release
SM-14 validated  SM-10            SM-14:validated is guard for SM-10:release
SM-EBR complete  SM-10            SM-EBR:complete is prerequisite for SM-10
SM-DEV closed    SM-10            SM-DEV:open blocks SM-10 (J1 Pharma)
SM-STAB concern  SM-10            SM-STAB:concern blocks SM-10 (J1 Pharma)
SM-CLEAN-V valid SM-10            SM-CLEAN-V:validated is guard for SM-10 (J1)
SM-FAI approved  SM-3             SM-FAI:approved is guard for SM-3:first_off (J3)
SM-NADCAP valid  SM-3             SM-NADCAP:certified is guard for SM-3 (J3 special)
SM-VIG open      SM-FSCA          SM-VIG:open may trigger SM-FSCA:initiate (J4)
SM-CCP-MON excur SM-10            SM-CCP:excursion blocks SM-10 (J5 Food)
```

---

## 14. Soft couplings (advisory; no blocking)

```
SIGNALING SM      RECEIVING SM     ADVISORY
SM-3 yield_drop   SM-9             Asset maintenance advisory
SM-4 reject_rate  SM-2             Supplier scorecard advisory
SM-6 repeat_NC    SM-9             PM cycle change advisory
SM-6 repeat_NC    SM-7             Document revision advisory
SM-12 finding     SM-7             Doc revision advisory
SM-9 drift        SM-13            Risk register update advisory
SM-PSUR data      SM-13            Risk file update advisory (J4)
SM-EMP excursion  SM-DEV           Deviation advisory (J1 Pharma)
SM-WARRANTY       SM-7             Spec revision advisory (J2 Auto)
SM-SPC control    SM-3             Process adjustment advisory
```

---

## 15. SM maturity model

```
MATURITY LEVEL    CRITERIA                           EFFECT
DRAFT             SM defined in M4; not implemented  No routing; design only
PROTOTYPE         SM implemented; no validation      HMV4 pre-production only;
                  evidence                           not for regulated use
VALIDATED         SM has validation pack (SM-14      May be used for regulated
                  lifecycle completed); evidence     tenants in controlled scope
                  emitted per transition; tested
REGULATED (L6)    SM is authoritative path for       No out-of-band mutation
                  regulated decision; BD-N guards     allowed; audit chain
                  enforced; triple-defense per L1;   enforced; SLO monitored
                  on-call covered
RETIRED           SM superseded by new SM; no new    Historical chains remain
                  root can use it; history readable  readable; no new mutations

CURRENT STATUS (V10):
  SM-1..SM-14:    VALIDATED → moving to REGULATED per wave delivery
  Wave 1 SMs:     SM-6, SM-7, SM-10 — REGULATED for Pro/Enterprise tenants
  Pack SMs:       PROTOTYPE → VALIDATED schedule per J1-J5 wave plan
```

---

## 16. SM governance and change control

```
ADDING A NEW SM:
  1. Domain Lead proposes SM with states, transitions, guards, EC emission
  2. CTO reviews architecture compatibility with B7 SM substrate
  3. Compliance Lead reviews BD-N boundary implications
  4. Quality Lead reviews evidence emission completeness
  5. M4 updated; B7 updated; relevant D-workflow updated
  6. Validation pack authored per SM-14 lifecycle (CS-B)
  7. API implementation + E2E test suite authored
  8. Wave delivery gate includes SM maturity check

MODIFYING AN EXISTING SM:
  Any SM modification that affects: (a) a guard condition at a BD-N
  boundary; (b) an evidence class emission; (c) a hard coupling;
  or (d) the set of valid states — requires:
  - H7 Class A (regulated commercial implication) change classification
  - CTO + Compliance Lead + Quality Lead sign-off
  - Re-validation (SM-14 partial re-execution for affected transitions)
  - M4 version bump; tenant notification per release cadence

RETIRING AN SM:
  No new roots may use the retired SM.
  Existing roots using the SM complete their lifecycle normally.
  After all roots reach terminal states, SM is archived in M4 with
  retirement date and replacement SM reference.
```

---

## 17. Guard condition catalog

Guards are the regulatory enforcement mechanism of HESEM state machines.
Every regulated transition has at least one guard; every BD-N transition
has at minimum the human-authority token check plus at least one
domain-specific guard. Guards are evaluated synchronously at the API
layer before the transition is applied.

### 17.1 Universal guards (all T-3 transitions)

```
GUARD NAME                   DESCRIPTION
human_authority_token        The request must include a human-authority
                             token (HAT) that was issued by the HESEM
                             auth service to a specific authenticated
                             user in a specific session. The HAT expires
                             in 15 minutes. It cannot be replayed.
                             Absence of HAT → 403 immediately.

authorized_role              The authenticated user must hold one of the
                             specified roles for the transition.
                             Roles are defined per SM per transition.
                             Example: SM-10 batch release requires
                             BATCH_RELEASE_AUTHORITY role; SM-7 document
                             release requires DOC_APPROVER role.

justification_present        A human-authored justification string must
                             be present in the request payload.
                             Minimum 20 characters; cannot be a
                             templated/repeated string (entropy check).
                             Required for all BD-N transitions.

e_signature_valid            For transitions requiring e-signature
                             (EC-1 emission): the HESEM e-sig token
                             must be present, valid, unexpired, and
                             bound to the authenticated user's session.
                             E-sig tokens require a separate PIN/password
                             confirmation (21 CFR Part 11 meaning + date).
```

### 17.2 Domain-specific guard types

```
GUARD TYPE                   SM EXAMPLE          DESCRIPTION
document_effective            SM-1, SM-3          A controlled document
                                                  (per SM-7) must be in
                                                  EFFECTIVE state for the
                                                  operation being performed.
                                                  Guards against working
                                                  without a current SOP.

person_qualified              SM-3, SM-10         The actor or a specified
                                                  person (e.g., QP for
                                                  batch release) must be in
                                                  QUALIFIED state (SM-8) for
                                                  the required task code.
                                                  Guards against unauthorized
                                                  operator performing regulated
                                                  operation.

lot_not_on_hold               SM-3 dispatch       The lot(s) to be consumed
                                                  must not be in ON_HOLD
                                                  state (per SM-HOLD).
                                                  Guards against using
                                                  quarantined material.

asset_available               SM-3 release        The asset/workcell must
                                                  be in AVAILABLE state
                                                  (SM-9). Prevents WO
                                                  dispatch to a down asset.

inspection_passed             SM-3 close,         The linked inspection
                              SM-10               (SM-4) must be in PASS
                                                  state. Prevents closing
                                                  a WO with failed inspection.

no_open_deviations            SM-10 release       No open SM-DEV records
                              (J1 Pharma)         against this batch.
                                                  Prevents batch release
                                                  while investigation is open.

ccp_monitoring_ok             SM-10 release       All CCP monitoring records
                              (J5 Food)           (SM-CCP-MON) for the
                                                  batch are within limits.
                                                  Prevents release with
                                                  unaddressed CCP excursion.

itar_access_granted           SM-3 (J3 Aero)      The operator must hold a
                                                  valid ITAR access grant
                                                  (SM-ITAR-ACCESS) for the
                                                  classified item. Prevents
                                                  unauthorized ITAR exposure.

stability_no_concern          SM-10 (J1 Pharma)   No open stability concern
                                                  record (SM-STAB) affects
                                                  this product. Prevents
                                                  release of products with
                                                  known stability issues.
```

### 17.3 Guard evaluation order

When multiple guards apply to a single transition, they are evaluated
in priority order. The first failed guard returns its error code and
stops evaluation:

```
PRIORITY  GUARD                            RATIONALE
1         human_authority_token            Security: must exist before
                                           anything else is evaluated
2         authorized_role                  Authorization: right person
3         tenant_pack_active               Feature: pack enabled for tenant
4         regulated prerequisite guards    Compliance: all prerequisites met
          (document_effective, person_qualified,
           inspection_passed, etc.)
5         business logic guards            Domain: business rules satisfied
          (stock available, credit OK, etc.)
6         justification_present            Governance: reason documented
7         e_signature_valid               Evidence: sig valid for recording
```

---

## 18. Evidence emission policy

Every state machine transition must emit at least one evidence class
record to the OTG Authority Ledger. The evidence emission policy
determines which EC classes are required per transition type.

### 18.1 Mandatory EC per transition tier

```
TIER     MINIMUM EC EMISSION
T-1      EC-4 (transaction record): automated transition; no human
         involvement but state change must be logged.

T-2      EC-4 (transaction record): human-initiated transition;
         actor identity recorded.
         + EC-N (domain-specific): per transition (see SM tables above)

T-3      EC-4 (transaction record)
         EC-1 (e-signature record): for each e-sig attached to
               the transition
         EC-2 (override record): when an AI advisory was presented
               and the human's decision differs from the advisory
         + EC-N (domain-specific): per SM (e.g., EC-13 for quality
               decisions, EC-15 for validation records, EC-19 for
               batch release)
```

### 18.2 EC emission implementation

```
IMPLEMENTATION PATTERN:
  1. Transition guard evaluation (all guards pass or first-fail returns)
  2. SM state written to Authority Ledger (atomic with step 3)
  3. EC record created in evidence store (same DB transaction)
  4. OTG anchor service notified (async, < 25h per SLO-10)
  5. Workflow event emitted (async, for CDC consumers)
  6. API response returned (200 OK + new state + audit_event_id)

ROLLBACK POLICY:
  If steps 2-3 fail atomically, the transition is rolled back.
  The EC is never created without the state transition (prevents
  phantom evidence records).
  If steps 4-5 fail (async), the anchor and event are retried
  with exponential backoff; the transition is already complete
  in the Authority Ledger.

AUDIT QUERY:
  GET /api/v1/{domain}/{root_plural}/{id}/history returns the
  complete sequence of EC records for a root, in emission order,
  with actor identity, timestamp, and evidence class citation.
```

---

## 19. Cross-SM workflow examples

The following examples trace complete regulated workflows across multiple
SMs, showing how coupling enforces regulatory integrity:

### 19.1 Pharma batch release sequence (J1)

```
STEP  SM        EVENT              EC EMITTED    GUARD CHECKED
1     SM-3      WO dispatched      EC-3, EC-4    person qualified (SM-8);
                                                 SOP effective (SM-7);
                                                 lot available
2     SM-EBR    EBR steps          EC-1 (each    Pharma operator qualified;
                executed           step sig)     aseptic qualification (SM-8)
3     SM-4      In-process insp    EC-18         Inspection plan effective (SM-7)
4     SM-DEV    Deviation opened   EC-13, EC-14  (if out-of-spec found)
5     SM-DEV    Deviation closed   EC-14, EC-2   Quality investigation complete
6     SM-3      WO complete        EC-4          All steps complete; yield OK
7     SM-CLEAN-V Cleaning valid    EC-15, EC-2   Validation Lead e-sig (SM-14)
8     SM-8      QP qualification   EC-11, EC-2   (confirmed active)
9     SM-10     Batch review start EC-19         EBR complete; DEV closed;
                                                 cleaning validated; QP qual'd
10    SM-10     QP declaration     EC-1, EC-2    QP e-sig + justification +
                                                 HAT (BD-9)
11    SM-10     Batch released     EC-19, EC-1   All guards pass; BD-1 HAT
12    SM-1      Ship released      EC-4, EC-2    SM-10 released gates ship
```

### 19.2 NC → CAPA → document revision sequence (any pack)

```
STEP  SM        EVENT              EC EMITTED    GUARD CHECKED
1     SM-5      Out-of-spec disp   EC-13, EC-2   Quality Lead role; BD-2 HAT
2     SM-6      NC opened          EC-13         Investigation assigned
3     SM-6      Root cause ID'd    EC-14         Evidence documented
4     SM-6      CAPA plan          EC-14         Action plan approved
5     SM-6      Action implemented EC-14         Action complete
6     SM-7      Document revision  EC-10         Doc author + approver roles
7     SM-7      Doc released       EC-10, EC-1   Approver e-sig; BD-4 HAT
8     SM-7      Doc effective      EC-10         (auto; effectivity date)
9     SM-6      Effectiveness rev  EC-14         30-day observation complete
10    SM-6      CAPA closed        EC-14, EC-2   Quality Lead e-sig; BD-3 HAT
11    SM-12     Audit finding      EC-12         (if NC was audit-triggered)
     closed                                      Action evidence confirmed
```

---

## 20. SM anti-patterns

The following patterns are explicitly prohibited in HESEM SM design
and are checked at code review and in architectural fitness functions:

```
ANTI-PATTERN                DESCRIPTION                    DETECTION
Out-of-band mutation        Writing to a root's state       DB trigger (forbidden)
                            column without going through    API contract test
                            the SM service layer.           (only SM service writes
                            Creates phantom state not        state column)
                            recorded in audit chain.

Guard bypass                Calling the state transition    Integration test:
                            API with elevated DB credentials unauthorized credential
                            that skip guard evaluation.     cannot call SM API
                            Prohibited even for migrations.

Implicit coupling           A transition in SM-A that       Architectural fitness
                            silently reads SM-B's state     function: SM code may
                            without declaring the coupling  only read SM-B state
                            in M4. Hidden dependencies      through declared coupling
                            break cascade analysis.         interface

Shared SM                   Two different root types        Code review: each root
                            reusing the same SM instance.   type has its own SM
                            Prevents independent state      instantiation; shared SM
                            evolution.                      superclass is acceptable
                                                           if each root has its
                                                           own state table row

Retroactive state           Setting a historical state      DB: created_at <
correction without          transition without creating     transition_at is
evidence record             a new EC record. Auditors       forbidden; always
                            can detect this as a            forward; correction is
                            chain break.                    a new forward transition
                                                           with corrective evidence
```

---

## 21. SM testing requirements

Every state machine in HESEM has mandatory test coverage requirements
before it may graduate to VALIDATED maturity.

### 21.1 Unit test coverage per SM

```
TEST CATEGORY         REQUIRED TESTS               MINIMUM COVERAGE
Happy path            One test per valid            100% of transitions
                      transition covering the       must have at least
                      nominal case                  one passing happy-path
                                                    test
Guard rejection       One test per guard            100% of guards must
                      condition that verifies       have a test confirming
                      the guard rejects the         the API rejects with
                      transition when the           the correct error code
                      condition is not met          (403 for auth; 422 for
                                                    business logic)
BD-N triple defense   Three tests per BD boundary:  All BD-N boundaries
                      (1) UI advisory-only          must have all three
                      (2) API rejects without HAT   tests passing
                      (3) Audit event emitted
                          regardless of outcome
Evidence emission     After each transition,        100% of EC emissions
                      assert that the correct       verified per transition
                      EC record(s) exist in the
                      evidence store
Idempotency           Submit same mutation twice    All T-2 and T-3
                      with same idempotency key;    transitions
                      assert second response is
                      200 (not 409; not duplicated)
Cascade test          For each hard coupling, test  100% of declared
                      that the downstream SM        hard couplings
                      transitions correctly when
                      upstream SM reaches the
                      coupling trigger state
Cross-tenant          Attempt to perform a          All SM endpoints
isolation             transition on a root           (critical for
                      belonging to a different       regulated multi-tenant)
                      tenant; assert 403
Pack guard            Attempt to call a pack-       All pack-specific
                      specific transition on a      SM endpoints
                      tenant without that pack;
                      assert 403
```

### 21.2 E2E test coverage per SM (Playwright)

For Wave 1 SMs (SM-6, SM-7, SM-10 and their roots NQCASE, CAPA, CDOC,
BREL), full Playwright E2E tests are required:

```
E2E TEST SCOPE:
  1. Navigate to AR pattern root (e.g., NQCASE detail page)
  2. Trigger state transition from UI (click action button)
  3. Assert UI shows new state; history panel shows new audit event
  4. Assert audit event has correct EC classes in evidence panel
  5. For BD-N transitions: assert that the "advisor recommended X"
     label is visible; human makes a different choice; assert
     override record created
  6. For T-3 transitions: assert e-sig dialog appears; submit PIN;
     assert e-sig record created with correct meaning and timestamp
  7. Assert DORA metric: lead time from button click to confirmed
     state change < 2 seconds P95
```

---

## 22. SM operational debugging guide

When a root is stuck in a non-terminal state (per root aging alerts in
M3 §30), the following debugging procedure applies:

```
STEP 1: Identify the stuck state
  GET /api/v1/{domain}/{root_plural}/{id}
  → returns current state and last transition timestamp

STEP 2: Query the history for the stuck root
  GET /api/v1/{domain}/{root_plural}/{id}/history
  → returns all transitions and EC records; identify last event
  → check if a guard failed (history shows failed transitions too)

STEP 3: Check prerequisite states
  For the expected next transition, evaluate each declared guard:
  - Is the linked document effective? (SM-7 state check)
  - Is the assigned person qualified? (SM-8 state check)
  - Are linked inspections passed? (SM-4 state check)
  - Are prerequisite SMs complete? (per coupling matrix §13)

STEP 4: Check for open dependencies
  If a prerequisite SM is stuck (e.g., SM-DEV deviation open blocks
  SM-10), that prerequisite must be resolved first.
  The stuck root cannot be advanced by bypassing the prerequisite.

STEP 5: Escalate if guard cannot be met
  If the guard cannot be met due to a data issue (e.g., person
  qualification expired and cannot be renewed in time):
  Option A: Risk-accept the deviation (requires Compliance Lead
            sign-off; creates override record EC-2; documented in
            NC/CAPA SM-6 as a quality event)
  Option B: Cancel/reject the root (advance to terminal rejected
            state rather than leaving in limbo)
  Option C: Emergency change (H7 Class A) to modify guard condition
            with engineering sign-off if guard is defective

STEP 6: Never bypass the SM layer
  Under no circumstances may a database administrator update the
  state column directly. This creates a chain break (B6 axiom
  violation → SLO-6 breach → SEV-1 incident). All state changes
  go through the SM API layer.
```

---

## 23. Per-pack SM activation and tenant provisioning

Pack-specific SMs are not loaded for all tenants. They activate when
a pack is provisioned in the tenant's regulatory profile (per M3 §22
pack activation policy). The SM activation manifest per pack:

```
PACK J1 PHARMA: SM-APR, SM-DEV, SM-STAB, SM-ICSR, SM-CLEAN-V,
                SM-DSCSA, SM-EBR
                + Extensions to SM-3 (EBR linking), SM-10 (QP guard),
                  SM-8 (aseptic qualification task codes)

PACK J2 AUTO:   SM-APQP, SM-PPAP, SM-LPA, SM-8D, SM-PRR, SM-WARRANTY
                + Extensions to SM-6 (8D integration), SM-4 (LPA
                  trigger), SM-2 (PPAP prerequisite for supplier qual)

PACK J3 AERO:   SM-FAI, SM-NADCAP-CERT, SM-COUNTERFEIT, SM-ITAR-ACCESS,
                SM-DO-178C, SM-DO-254, SM-AD, SM-GIDEP
                + Extensions to SM-3 (FAI prerequisite), SM-8 (ITAR
                  person-of-record task code), SM-9 (AD/SB compliance)

PACK J4 MD:     SM-DHF, SM-DHR, SM-VIG, SM-PSUR, SM-FSCA, SM-SAMD,
                SM-CYBER, SM-CLIN, SM-PCCP
                + Extensions to SM-6 (PRRC sign-off for vigilance),
                  SM-10 (MDR release), SM-13 (ISO 14971 risk acceptance)

PACK J5 FOOD:   SM-CCP-MON, SM-FSVP, SM-FSMA-204, SM-RECALL-FOOD,
                SM-EMP, SM-MOCK-RECALL, SM-IA-VA
                + Extensions to SM-10 (CCP guard), SM-4 (HACCP
                  monitoring as inspection type), SM-2 (FSVP gate on
                  supplier approval)

ACTIVATION TEST:
  Integration test confirms that:
  (a) Pack-specific SM endpoints return 404 for tenants without
      the pack (not 403 — resource should not be known to exist)
  (b) Pack-specific guards are active for tenants with the pack
  (c) Pack-specific EC emissions occur for tenants with the pack
  (d) Base SM behavior is unchanged for all tenants regardless
      of pack activation
```

---

## 24. SM performance targets and SLO linkage

State machine transition API calls have their own performance targets
because they are synchronous blocking operations in the regulated workflow:
an operator cannot proceed until the transition is confirmed. These targets
are part of SLO-4 (domain.root.write p95 < 100ms).

```
TRANSITION TYPE          PERFORMANCE TARGET         SLO LINKAGE
Standard T-2 transition  p95 < 100ms                SLO-4
  (no heavy prerequisites)
T-3 transition           p95 < 200ms                SLO-4 (relaxed for
  (with e-sig validation  (e-sig verification        e-sig processing)
  and guard chain)        adds 50-100ms)
BD-N transition          p95 < 300ms                SLO-4 (relaxed for
  (full triple defense)   (HAT check + audit         regulatory overhead)
                          emission adds overhead)
Cascade trigger          < 500ms total from          Async cascade;
  (e.g., SM-1 → SM-3)    initiating transition       measured end-to-end
                          to all downstream           via distributed trace
                          transitions confirmed
Evidence emission        < 1 second from             SLO-10 (anchor lag)
  to OTG anchor           transition commit           measured separately
  notification            to anchor notified

PERFORMANCE DEGRADATION PROTOCOL:
  If SM transition p95 exceeds 200ms sustained for > 5 minutes:
  1. Auto-alert SRE via SLO-4 burn rate monitor
  2. SRE examines: guard chain performance; DB lock contention;
     prerequisite SM query performance; HAT validation latency
  3. If guard chain query is slow: add index on prerequisite SM
     state tables (non-blocking DDL if PostgreSQL 12+)
  4. If HAT validation is slow: Identity team investigates (SLO-1)
  5. SM transition performance tracked per SM type in OTel traces;
     all SM transitions tagged with sm_id and transition_name
     attributes for filtering in observability dashboards
```

---

## 25. SM lifecycle health dashboard specification

The SM health dashboard is surfaced in the HESEM internal operations
portal for the SRE team and domain leads. It is not customer-facing.

```
DASHBOARD PANELS:

Panel 1: Active root count by SM and state
  Shows: per SM, count of roots in each state (not terminal)
  Alert: any state count growing monotonically for > 7 days
         (orphan accumulation; per M3 §30 aging alerts)

Panel 2: Transition rate by SM and tier
  Shows: transitions/hour per SM per tier (T-1, T-2, T-3)
  Alert: unexpected drop to zero (SM service down or circuit open)
  Alert: sudden 10× spike (potential data integrity issue or
         customer batch import)

Panel 3: Guard rejection rate by SM
  Shows: % of transition attempts rejected by guard (daily)
  Alert: > 10% rejection rate on any single guard for > 2 days
         (may indicate data quality issue or UX confusion)

Panel 4: BD-N encounter rate
  Shows: BD-N token presentations per day per boundary
  Alert: any BD-N attempt without HAT (triple-defense failure
         → SEV-1 immediate)

Panel 5: Evidence emission lag
  Shows: median and p95 time from transition to EC record persisted
  Alert: p95 > 2 seconds (EC emission pipeline health)

Panel 6: Cross-SM coupling latency
  Shows: end-to-end latency from cascade-triggering transition to
         all downstream SM transitions complete
  Alert: p95 > 2 seconds for any declared hard coupling
```

---

## 26. SM version tracking

Each SM has a version number that increments on any change to its states,
transitions, guards, or evidence emission schema. The SM version is
stored in the SM registry table (per B7) and is referenced in:

- Every audit event emitted by the SM (sm_version field in EC-4 record)
- The validation pack (SM-14 lifecycle references the SM version it validated)
- The API schema (per-SM transition endpoints versioned via SM version)
- The M4 chapter (each SM entry notes current version)

SM version history is maintained in the SM registry for at least 15 years
(the regulated_root retention period) because an auditor inspecting a
historical batch release must be able to confirm which version of SM-10
was in effect at the time of release and what guard conditions applied.

```
SM VERSION FORMAT:   {SM-ID}.{major}.{minor}
  Major version:     increments on breaking change (state removed;
                     guard condition strengthened; EC removed)
  Minor version:     increments on additive change (new optional
                     guard; new EC added; new soft coupling)

EXAMPLE:             SM-10.3.2 = Batch Release SM, major 3, minor 2
                     SM-10.4.0 would add the Pharma J1 QP guard as
                     a breaking change to SM-10.3.x

CURRENT VERSIONS (V10 baseline):
  SM-1: 2.1    SM-2: 2.0    SM-3: 2.2    SM-4: 2.1    SM-5: 2.0
  SM-6: 3.1    SM-7: 2.3    SM-8: 2.0    SM-9: 2.0    SM-10: 3.2
  SM-11: 2.0   SM-12: 2.0   SM-13: 2.1   SM-14: 2.2
  Pack SMs: all at 1.x (prototype → validated progression per wave)
```

---

## 27. Decision phrase

```
M4_STATE_MACHINE_DIRECTORY_V10_LOCKED
NEXT: M5_SLO_DIRECTORY.md
```

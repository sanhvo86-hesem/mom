# F6 — Action Consoles (AC)

```
surface_class:  AC
owner_role:     Per-domain lead with Frontend Lead
sources:        Bulk action UI patterns; per F0 catalog;
                E11 (bulk operation); E7 (signing); E2 (authority);
                WCAG 2.2 SC 3.3.4 error prevention for legal /
                financial / data-modification
```

ACs are bulk-action surfaces. When a user needs to perform the same
action on many records (reassign 50 NCs; close 30 WOs; approve 100
training records; bulk-disposition 200 inspections; mass-recall
1000 lots), an AC is the appropriate surface. ACs gate every
regulated bulk action through L1 boundary checks per-record.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Multi-record selection (from F4 /        single-record action (F4 / F5)
 F2)                                     wizard (F8)
Bulk action confirmation                 system-driven bulk (background)
Bulk authority signoff (per E7)
Bulk command submission (per E11)
Per-record result rendering
 (HTTP 207 Multi-Status)
Live action stream (per F4 console
 + per E5 §2.4 + per AsyncAPI)
Per-pack action overlay
Per-tenant action policy
Recall execution console (D12)
Dispatch console (D3)
```

---

## 2. AC catalog (canonical)

```
AC                                  USE CASE
NC BULK REASSIGNMENT                 reassign N NCs to new owner
CAPA BULK EFFECTIVENESS              initiate effectiveness check on
   INITIATION                        N CAPAs in window
TRAINING BULK ASSIGNMENT             assign course to N persons
   /role-based per Competency
   Matrix
INVENTORY BULK CYCLE-COUNT           adjustment console
   ADJUSTMENT
EQUIPMENT BULK CALIBRATION           rescheduling console (per D9)
   SCHEDULE
ECO BULK APPROVAL                    where policy permits multi-CR
                                    approval
DOC BULK WITHDRAWAL                   per D7
DISPATCH CONSOLE (DISP)               WO dispatch real-time live
                                    (per D3 step 6 + F4 + per E5
                                    AC console)
RECALL EXECUTION CONSOLE              per D12 + per pack §3
INSPECTION DISPOSITION CONSOLE        bulk-disposition (D5)
                                    where regulated permits +
                                    per L1 BD-2 still per-record
                                    enforced
SHOPFLOOR ANDON CONSOLE                per F4 + AC live alert
                                    handling
COMPLAINT CONSOLE (D12)                triage + assignment
HACCP CCP CONSOLE (FOOD)               real-time CCP excursion
                                    handling (per J5)
DSCSA SUSPECT CONSOLE (PHARMA)         3-business-day window
                                    response per H1 §3
GIDEP DRAFT CONSOLE (AERO)             counterfeit-suspect 60-day
                                    window per H1 §3
VIGILANCE CONSOLE (MD)                 reportability triage (per
                                    BD-15 advisory by AI-19)
COMPLAINT TRIAGE (CROSS)               assignment + initial assessment
DEVIATION CONSOLE (PHARMA)              per SM-DEV intake
LPA AUDIT CONSOLE (AUTO)                layer-by-layer cycle
SCAR CONSOLE                              supplier corrective action
PER-PACK CONSOLE                          pack-specific live operations
```

---

## 3. Common pattern

```
LAUNCH FROM WORKSPACE              user multi-selects rows in F4
                                  workspace; clicks "act on N
                                  records"
SCOPE CONFIRMATION                  console shows: which N records;
                                  per-record preview;
                                  total count
ACTION CONFIRMATION                  what will happen per record;
                                  per-record fitness for action
                                  (per E2.8 decide; per L1
                                  banned-decision check per-record)
EVIDENCE GATHER                       per record: signature
                                  obligation per L1 quorum;
                                  reason text per L1 §6;
                                  attached files (E12)
BULK AUTHORITY                          E7 challenge (one signing
                                  challenge can authorize multiple
                                  records of same kind);
                                  per record per L1 quorum still
                                  applies; bulk does NOT bypass
                                  per-record L1
SUBMIT                                  E11.3 bulk command;
                                  HTTP 207 Multi-Status response
PER-RECORD RESULT                          rendered per record
                                  (succeeded / failed-with-reason)
RETURN TO WORKSPACE                          updated state in workspace
                                  + per-record drill-into for
                                  any failures
LIVE STREAM (where applicable)               per E5 §2.4 console
                                  stream for real-time AC
                                  (e.g., dispatch, andon, HACCP
                                  CCP)
```

---

## 4. Discipline

```
PER-RECORD AUTH                    bulk does not bypass per-record
                                  authority; each record passes
                                  through E2.8 decide + L1
                                  banned-decision check
PER-RECORD IDEMPOTENCY              mandatory; per E11
PER-RECORD EVIDENCE                  each record evidence per E3
                                  + per pack composition (per H4 §3)
ROLLBACK STRATEGY                    rollback per record where
                                  partial-fail (per saga
                                  compensation per B7);
                                  cannot rollback regulated
                                  signed mutations (per H5
                                  immutability)
RATE LIMIT                            per tenant + per identity
                                  + per action-type;
                                  bulk actions inherit per-record
                                  rate budget
A11Y (per F11)                         keyboard-driven scope +
                                  action;
                                  multi-row selection accessible
                                  (per WCAG SC 2.4.11);
                                  HTTP 207 result table
                                  semantically correct
LIVE-STREAM (per AsyncAPI)            push-based update (E5 §2.4
                                  WebSocket / SSE);
                                  reconnect + replay supported
TENANT BOUNDARY                          per B6 C5
PER-PACK OVERLAY                          per pack action types +
                                  per pack regulator window
                                  enforcement
```

---

## 5. Per-pack overlays

```
PHARMA (J1)                      DSCSA suspect-product 3-day
                                 console; deviation triage console;
                                 cleaning validation cycle console
AUTO (J2)                        LPA audit console; PSW signoff
                                 console; SCAR triage
AERO (J3)                        GIDEP draft 60-day console;
                                 counterfeit-investigation triage;
                                 ITAR access grant console;
                                 service-life-limited part
                                 replacement
MD (J4)                          vigilance reportability console;
                                 FSCA execution console;
                                 cyber CVD lifecycle
FOOD (J5)                        HACCP CCP excursion console;
                                 mock-recall execution;
                                 RFR submission console
```

---

## 6. Backend bindings (per F9)

```
SELECTION                         from F4 (E5 workspace);
                                  filter persisted in scope
DECIDE                              per-record E2.8 (allow / deny /
                                  needs-quorum)
SIGNING                              E7 challenge + factor + compose
                                  (single challenge for bulk
                                  where same-meaning;
                                  per-record signature evidence)
SUBMIT                                E11.3 bulk command
LIVE STREAM                            E5 §2.4 + AsyncAPI
NOTIFICATION                            E10 (downstream alerts)
EVIDENCE                                  E8 attach where applic
```

---

## 7. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per failed record
HTTP 207 MULTI-STATUS              per-record outcome rendered
LIVE STREAM                         per E5 §2.4
A11Y                                  per F11
I18N                                   per F12
DESIGN TOKENS                          per F10
TENANT BOUNDARY                          per B6 C5
DATA RESIDENCY                            per region pinning
PII REDACTION                              per role
PERFORMANCE                                  bulk submission progress
                                  per E13 (LRO for very large)
DEPRECATION                                  AC retirement is H7 for
                                  regulated (e.g., dispatch
                                  console UX change)
```

---

## 8. Failure modes

```
FM1   Bulk submission partial-fail
      Behavior: HTTP 207; per-record reason
      Recovery: user re-acts on failed records;
              per-record drill-into for context

FM2   Cross-tenant record selected (multi-tenant filter
      escape)
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM3   Banned-decision per-record (e.g., bulk-disposition
      attempt with AI principal)
      Behavior: per L1 §4 triple defense; rejected
      per record
      Recovery: per L1 §7 logged

FM4   Live stream disconnected
      Behavior: reconnect + replay from last-event
      Recovery: per E5 §2.4 stream protocol

FM5   Bulk signing quorum incomplete mid-flow
      Behavior: per E7 §6 esign/quorum-incomplete
      Recovery: complete quorum; resume

FM6   Performance: bulk action of N=10000+ records
      Behavior: LRO per E13;
              progress + checkpoint
      Recovery: per E13 §2.2 status polling

FM7   AC tier-1 friction calibration insufficient (rubber-
      stamp pattern)
      Behavior: per L1 §6; H8 systemic CAPA on UX
      Recovery: tighten calibration + reason-text
              minimum length

FM8   Recall execution console for shipped lots stuck
      Behavior: per RB-INC-037
      Recovery: per D12 + I3 incident
```

---

## 9. Wave target

```
W1        baseline AC infrastructure (selection +
          confirmation pattern)
W3        regulated AC: NC bulk reassignment;
          CAPA bulk effectiveness initiation;
          training bulk assignment;
          dispatch console (DISP per HMV4)
W5        recall execution console; HACCP CCP console
          (per pack)
W7        SCAR / supplier action; complaint triage;
          live-stream consoles
W8        SOC 2 + DORA Elite path
W10       per-pack AC GA (J1..J5):
          DSCSA suspect (Pharma);
          GIDEP draft (Aero);
          vigilance reportability (MD);
          mock-recall (Food);
          PPAP signoff (Auto)
W12       sovereign region variants
```

---

## 10. Cross-references

- F0 — pattern catalog
- F4 — workspace (parent)
- F5 — record-shell (drill-into)
- F7 — drawers (per-record detail)
- F8 — wizards (multi-step alternative)
- F9 — frontend↔backend binding (E11 + E7 + E2)
- F10 + F11 + F12 — design tokens + a11y + i18n
- E2 + E5 + E7 + E11 + E13 — APIs
- D3 (dispatch console); D5 (disposition); D6 (CAPA effectiveness);
  D8 (training); D9 (calibration); D12 (recall + complaint)
- H1 §3 — regulator window enforcement
- H4 — per-record evidence per H4 §3 composition
- H7 — AC retirement governance
- L1 §6 — friction calibration (anti-rubber-stamp)
- L1 §4 — banned-decision per-record enforcement
- L2 §6 — AI advisory chip
- M5 — SLO-9
- M9 — cross-reference

---

## 11. Decision phrase

```
F6_ACTION_CONSOLES_BASELINE_LOCKED
NEXT: F7_DRAWERS_AND_DIALOGS.md
```

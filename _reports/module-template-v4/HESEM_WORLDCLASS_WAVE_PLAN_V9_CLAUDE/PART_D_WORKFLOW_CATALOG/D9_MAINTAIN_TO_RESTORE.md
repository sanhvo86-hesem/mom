# D9 — Maintain to Restore

```
workflow_id:    D9
workflow_name:  Maintain to Restore
owner_role:     Maintenance Lead with Quality Lead (calibration)
participants:   Shopfloor / MES, Procurement (spares), Workforce
                (qualification), Compliance (regulated assets),
                Vertical Pack Lead (per pack)
state_machines: SM-9 Maintenance Order (primary); SM-CALIB
                (calibration cycle); SM-7 (PM SOP); SM-8 (tech
                qualification); SM-3 (asset state ↔ WO start)
```

D9 keeps assets running and, when something goes wrong, restores
them. It owns calibration — and calibration drift is the regulated-
substrate's silent enemy: instruments out of tolerance retroactively
invalidate every measurement made since last pass. D9 must catch
this and propagate impact (OOT impact handling) into D5 disposition,
D6 CAPA, D11 trace, and potentially D12 recall.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
PM (preventive maintenance)            asset acquisition (D2)
CM (corrective maintenance)            asset disposal (per finance)
Calibration cycle + MSA                tooling design (Engineering)
Out-of-tolerance impact handling
Predictive maintenance (where applic)
Spare-part demand → D2 cycle
LOTO + safety procedure
Certificate of Return to Service
 (Aero / regulated)
Service-life-limited tracking (Aero)
Service Bulletin / AD compliance
 (Aero)
Equipment qualification (IQ/OQ/PQ;
 per H2)
```

---

## 2. Trigger catalog

```
PM SCHEDULE DUE                          calendar / runtime / condition
EQUIPMENT FAILURE                          operator-reported / sensor-detected
CALIBRATION DUE                            per cycle per device
ANDON / EMERGENCY-STOP                     immediate
PREDICTIVE MAINTENANCE ADVISORY            AI-04 per L2 (advisory)
EHS INCIDENT                                near-miss / safety event
ASSET-STATE-CHANGE FROM ANOTHER WORKFLOW   D3 yield drop pattern
SCHEDULED INSPECTION (Aero / FDA / EU)    per regulator cycle
SERVICE BULLETIN ISSUED (Aero)              per OEM / FAA SB
AIRWORTHINESS DIRECTIVE (Aero)              per FAA AD (BD-25)
SERVICE-LIFE-LIMITED PART REPLACEMENT       per S/N
NADCAP-CYCLE RE-ASSESSMENT (Aero)           per cycle
PERIODIC IQ/OQ/PQ RE-RUN                    per H2 §13 freshness
ASEPTIC LINE RE-VALIDATION (Pharma          per Annex 1
   sterile)
CIP / SIP CYCLE                              per recipe / campaign
EM EXCURSION (Pharma sterile)                per environmental control
THERMAL CYCLE VALIDATION (Food LACF)        per Process Authority
SANITATION SCHEDULE (Food)                   per master sanitation plan
PEST CONTROL SERVICE (Food)                  per service contract
CYBER-PATCH FOR EDGE GATEWAY                  per I7 + B8
TENANT-SPECIFIC CSR MAINTENANCE              per CSR (e.g., OEM-driven
                                            inspection cycle)
```

---

## 3. Actor catalog

```
PM SCHEDULER (system + planner)        cycle management
MAINTENANCE PLANNER                     scope + spares + downtime
                                        coordination
MAINTENANCE TECH                          execution
CALIBRATION TECH                          calibration + MSA
RELIABILITY ENGINEER                       analysis + RCM
REGULATORY CONTACT                          AD / SB / NADCAP
PRODUCTION SUPERVISOR                       downtime negotiation
OPERATOR                                    Andon / observation
QA ENGINEER                                  OOT impact assessment
QUALITY MANAGER                              OOT escalation +
                                          disposition (BD-2 cascade)
PROCUREMENT                                  spare-part fulfillment
SAFETY OFFICER                                LOTO + EHS
QP / PRRC (per pack)                          regulated asset signoff
                                          (e.g., aseptic line release)
NADCAP AUDITOR (Aero)                          audit cycle
```

---

## 4. State machine SM-9 Maintenance Order

```
STATES                          EVENTS / GUARDS              EVIDENCE
draft                           plan_request                  EC-4
planned                         schedule_set + parts_reserved EC-4
ready                           dispatch (qualified tech +    EC-4 + EC-22
                                downtime window)
in_progress                     start_work + LOTO_applied     EC-4 + EC-22
                                pause / resume                 EC-4
                                test / verify                  EC-3 + EC-12
                                                              (calib subset)
work_complete                    LOTO_removed +                EC-4
                                return-to-service candidate
returned_to_service             tech_signoff + (regulated)    EC-2 (sigs)
                                QA / Compliance signoff;
                                certificate of return
                                (Aero Part 145)
closed                           record finalized + KPIs
                                propagated                     -

SM-CALIB CYCLE
draft → due → calibrating → calibrated_pass | calibrated_fail (OOT)
  → if fail: OOT-IMPACT handling cascade
  → if pass: next-due-set; instrument continues service

HARD COUPLINGS
  SM-9 → SM-3 (asset state gates WO start)
  SM-9 → SM-10 (calibrated equipment gates batch release;
              cleaning state for Pharma)
  SM-CALIB FAIL → SM-5 (OOT impact retrocastig disposition
                       on affected lots)
  SM-CALIB FAIL → SM-6 (CAPA opens for OOT impact; per H8)
  SM-CALIB FAIL → SM-11 (recall consideration if shipped lots
                       affected)
  SM-9 ↔ SM-8 (qualified tech + LOTO trained)
SOFT COUPLINGS
  SM-9 ← SM-3 (yield drop suggests PM)
  SM-9 ← SM-6 (CAPA may revise PM cycle)
  SM-9 → C13 AI-04 (predictive maintenance advisory)
```

---

## 5. Step substance

### Step 1 — Trigger + MWO creation

```
SUBSTANCE                       per trigger (per §2);
                                MWO authoritative root created;
                                per pack: pack-specific MWO
                                attributes (Aero S/N + service-
                                life remaining; Pharma cleaning
                                cycle reference; Food sanitation
                                area)
EVIDENCE                        MWO_record (EC-4)
DECISION POINTS                 P1.1 priority (planned vs urgent)
                                P1.2 PM type (calendar / runtime
                                / condition)
                                P1.3 corrective vs preventive
EDGE CASES                       trigger fires repeatedly
                                (sensor noise → MWO storm);
                                missed PM (overdue);
                                operator-reported false alarm
```

### Step 2 — Planning

```
SUBSTANCE                       Maintenance Planner: scope +
                                spare-part identification +
                                qualified-tech assignment +
                                downtime window with Production
                                Supervisor; per pack:
                                regulator-relevant scheduling
                                (Pharma campaign-end; Aero
                                hangar slot; Food sanitation
                                window)
EVIDENCE                        plan_record (EC-22);
                                spare-part reservation (EC-4
                                via D2 trigger if needed)
DECISION POINTS                 P2.1 in-house vs contractor
                                P2.2 spare-part substitution
                                P2.3 deferred PM (with risk
                                acceptance per H9)
                                P2.4 emergency vs routine
                                window
EDGE CASES                       spare unavailable; supplier
                                lead-time exceeds window;
                                conflicting customer demand for
                                production
```

### Step 3 — Dispatch + LOTO

```
SUBSTANCE                       qualified tech assigned (per D8);
                                LOTO (Lockout/Tagout) procedure:
                                per OSHA 1910.147 (US) /
                                EU equivalent; tags applied;
                                verification of zero-energy
                                state; for Pharma sterile:
                                line-down notification + EM
                                impact assessment
EVIDENCE                        dispatch_record (EC-4); LOTO
                                evidence (EC-22 + EC-2 sig)
DECISION POINTS                 P3.1 verify de-energized
                                P3.2 multi-energy-source
                                isolation
                                P3.3 emergency-shutdown vs
                                planned
EDGE CASES                       LOTO inadequate (safety
                                incident); residual energy
                                discovered;
                                tech un-qualified (re-dispatch);
                                operator unaware (communication
                                gap)
```

### Step 4 — Execution

```
SUBSTANCE                       per WI (per D7); per-step
                                evidence (parts consumed; labor
                                hours; observations; photos for
                                high-value or regulated assets);
                                per pack: pack-specific
                                disciplines (Pharma cleaning
                                verification; Aero NDT — non-
                                destructive testing; Auto
                                tooling validation; Food
                                allergen cleanout)
EVIDENCE                        execution_record (EC-4);
                                per-step photo / log (EC-22);
                                consumed-spare (EC-4 inventory
                                consumption)
DECISION POINTS                 P4.1 method per WI
                                P4.2 hidden-damage discovery →
                                scope expansion
                                P4.3 deferred sub-task per
                                schedule
EDGE CASES                       part doesn't fit; technical
                                drawing wrong (per H8);
                                unexpected wear pattern
                                (predictive learning);
                                contamination during work
                                (Pharma sterile);
                                injury / near-miss
```

### Step 5 — Calibration (where applicable)

```
SUBSTANCE                       reference standards used (current
                                + traceable to NIST / equiv);
                                per-characteristic measurement
                                vs spec; calibration form per
                                pack (USP <1058> Pharma;
                                ISO/IEC 17025 lab); per pack:
                                MSA (Measurement System Analysis)
                                where Auto / Aero per AIAG MSA;
                                CALIBRATION CERTIFICATE issued
                                with traceability chain
EVIDENCE                        calibration_record (EC-12);
                                cert (EC-22); reference-standard
                                state (EC-22); calibrator sig
                                (EC-2)
DECISION POINTS                 P5.1 pass → next-due-set
                                P5.2 fail (OOT) → cascade Step 6
                                P5.3 borderline → tighter
                                tolerance + retest cycle
                                P5.4 reference-standard expired
                                during calibration
EDGE CASES                       reference standard expired
                                (invalidates calibration; re-cal
                                with valid reference); MSA
                                shows variability higher than
                                process tolerance (gage
                                inadequate); calibration shows
                                drift over time (PM cycle
                                shorten)
```

### Step 6 — Out-of-tolerance impact handling (canonical)

```
SUBSTANCE                       most regulated step in D9.
                                When calibration fails:
                                  identify all measurements made
                                  by this instrument since last
                                  passing calibration (EC-12 +
                                  EC-3 cross-reference);
                                  affected lots / inspections /
                                  decisions in scope identified
                                  per genealogy (D11);
                                  for each affected scope:
                                    auto-create NC (cascade D6);
                                    quarantine status if shipped
                                    not yet consumed by customer;
                                    customer notification per
                                    DPA + per H1 §3 if
                                    regulator-relevant;
                                    recall consideration per D12
                                    if patient / consumer impact;
                                  retest of affected items where
                                  feasible; re-disposition per D5
EVIDENCE                        OOT_impact_record (EC-13 +
                                EC-22); NC cascade evidence;
                                customer-notification evidence;
                                regulator-notification per
                                pack (EC-22 + EC-21
                                reportable_event)
DECISION POINTS                 P6.1 scope: time-back-to-last-
                                pass calibration
                                P6.2 retest feasibility (some
                                measurements destructive)
                                P6.3 recall vs notification
                                P6.4 customer concession
                                consideration
EDGE CASES                       last-pass calibration record
                                stale or missing (worst case);
                                multiple instruments
                                inter-affected; cross-pack
                                impact (medical-device + pharma
                                share gauge); release of
                                affected lot already shipped
                                to customer who already shipped
                                further (chain of recalls)
```

### Step 7 — MWO completion

```
SUBSTANCE                       work confirmed complete; LOTO
                                removed (verification);
                                equipment functional test;
                                clean-up; spare-part return /
                                disposal
EVIDENCE                        completion_record (EC-4);
                                tech sig (EC-2)
DECISION POINTS                 P7.1 functional verification
                                pass / re-work
                                P7.2 partial completion
                                (deferred sub-task)
EDGE CASES                       functional verification fails
                                (re-execute); LOTO removal
                                problematic; customer waiting
                                pressure forcing premature close
```

### Step 8 — Return to service (regulated)

```
SUBSTANCE                       for regulated assets (Aero
                                Part 145; Pharma sterile line;
                                MD device per IEC 62304):
                                  final inspection;
                                  QA / Compliance signoff;
                                  certificate of Return to
                                  Service (per FAA Form 8130-3
                                  Aero); per pack: Pharma
                                  sterile line release evidence
                                  (EM + cleaning + BAL);
                                  Food: sanitation pre-op
                                  release;
                                AI cannot autonomously sign
                                (regulated decision per L1)
EVIDENCE                        rts_certificate (EC-22 + EC-2);
                                per-pack signoff
DECISION POINTS                 P8.1 conditional release
                                (limited use)
                                P8.2 service-life-limited part
                                update (Aero per S/N)
                                P8.3 SB / AD compliance
                                attestation (Aero)
EDGE CASES                       additional findings during final
                                inspection; QA disagrees with
                                tech; regulatory pre-clearance
                                required (rare; Pharma sterile
                                redo)
```

### Step 9 — Closure + KPI

```
SUBSTANCE                       MWO finalized; KPIs propagated
                                (MTBF, MTTR, schedule
                                adherence); calibration cycle
                                next-due updated; PM cycle
                                review per H6
EVIDENCE                        closure_record (EC-4)
EDGE CASES                       KPI shows pattern → AI-04
                                advisory + per H8 systemic
                                analysis
```

---

## 6. Branches

```
PLANNED PM (calendar)            §5 default
RUNTIME-BASED PM                  per equipment hours
CONDITION-BASED PM (CBM)          per sensor signal
PREDICTIVE MAINTENANCE             AI-04 advisory-driven
EMERGENCY CORRECTIVE               unplanned breakdown
                                  (downtime-impacting)
SCHEDULED CALIBRATION              per cycle
URGENT CALIBRATION                  post-incident or pre-critical-
                                  inspection
NADCAP RE-ASSESSMENT (Aero)         per cycle
SB / AD COMPLIANCE (Aero)           per directive
SERVICE-LIFE-LIMITED PART           per S/N replacement
   REPLACEMENT (Aero)
ASEPTIC LINE QUALIFICATION (Pharma) per H2 + Annex 1
CIP / SIP CYCLE                       per recipe (Pharma)
THERMAL PROCESS RE-VAL (Food LACF)    per Process Authority
PASTEURIZATION CYCLE (Food Grade A)   per PMO
PM-BY-CONTRACT-MAINTAINER             external service per contract
MULTI-ENERGY LOTO                       complex hazard
TIME-CRITICAL EMERGENCY                  override risk per H9
PSEUDO-MAINTENANCE (cleanup; not       per pack
   regulated)
```

---

## 7. Cross-domain footprint

```
MAINTENANCE (C9)                primary
SHOPFLOOR (C6)                    asset state + downtime impact
QUALITY (C7)                      OOT impact + calibration
PROCUREMENT (C4)                   spare-part procurement
INVENTORY (C5)                      spare-part stock
WORKFORCE (C10)                     tech qualification
TRACEABILITY (C8)                    OOT impact trace
ANALYTICS / AI (C13)                  AI-04 predictive (advisory);
                                    AI-22 calibration OOT risk
                                    estimate (advisory)
INTEGRATION (C12)                    SCADA + edge gateway
CORE (C14)                            tenant + audit
```

---

## 8. Pack overlays

```
PHARMA (J1)                      USP <1058> equipment
                                 qualification; ASTM E2500;
                                 cleaning validation cycle;
                                 EM excursion-driven response;
                                 sterile line re-qualification
                                 after deviation
AUTO (J2)                        AIAG MSA; SPC-supporting
                                 calibration; tooling validation;
                                 LPA-driven equipment audit
AERO (J3)                        14 CFR Part 145; FAA Form
                                 8130-3 RTS; service-life-
                                 limited part lifecycle;
                                 SB / AD compliance; NADCAP
                                 special-process re-assessment;
                                 NDT (non-destructive testing);
                                 ITAR-controlled tooling
                                 calibration
MD (J4)                          IEC 62304 maintenance for
                                 software-controlled equipment;
                                 ISO 14155 instrument
                                 calibration for clinical;
                                 sterilizer revalidation cycle
                                 (ISO 11135 / 11137 / 17665);
                                 packaging machine validation
FOOD (J5)                        thermal process validation
                                 (LACF); pasteurizer cycle;
                                 sanitation cycle; CCP-instrument
                                 calibration (critical);
                                 pest control service log
```

---

## 9. KPIs

```
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Repair / Restore)
- PM compliance rate (calendar / runtime adherence)
- Calibration on-time rate
- OOT events per period (downward target)
- OOT-impact recall events (target zero)
- Spare-part stock-out rate
- Maintenance cost per asset
- Deferred-PM count (with H9 risk acceptance)
- AI-04 predictive maintenance acceptance rate
- AI-22 calibration OOT estimate accuracy
- Service-life-limited compliance (Aero target 100%)
- AD / SB compliance window adherence (Aero)
- NADCAP cycle compliance
- Aseptic line re-qualification cycle
```

---

## 10. Failure modes + recovery

```
FM1   Spare unavailable
      Recovery: per D2 expedite; substitute per approved-list;
              defer PM with H9 risk acceptance; equipment
              degraded mode

FM2   Reference standard expired during calibration
      Recovery: invalidate calibration; re-cal with valid
              reference; H8 CAPA on cycle discipline

FM3   Calibration finds OOT (canonical regulated event)
      Recovery: per Step 6 cascade; H1 §3 if regulator-relevant;
              D5 + D6 + D11 + possibly D12 cascade

FM4   LOTO breach
      Recovery: SEV-1 safety incident; halt; investigation per
              I3; H8 systemic CAPA; OSHA reporting if applicable

FM5   Tech un-qualified at execution
      Recovery: per D8; re-dispatch to qualified;
              if pattern, H8 systemic on training discipline

FM6   AD / SB compliance window missed (Aero)
      Recovery: per J3 §10 FM; airworthiness exposure;
              FAA / EASA reporting; aircraft potentially
              grounded

FM7   Service-life-limited part exceeded (Aero)
      Recovery: per J3 §10 FM5; aircraft grounding (per applic);
              FAA / EASA reporting; H8

FM8   Sterilizer cycle revalidation overdue (MD)
      Recovery: production blocked for affected sterile
              product; cycle re-val expedited; H8

FM9   Pasteurization deviation (Food Grade A)
      Recovery: lot held; PMO notification; recall consideration;
              H8

FM10  Predictive maintenance false-positive
      Recovery: investigate AI-04; per L4 if pattern; H8 if
              systematic

FM11  AI-22 OOT-risk underestimate (calibration drift not
      caught)
      Recovery: per L4 + L3 §4 drift; retraining; H8

FM12  Multi-instrument cross-affected OOT
      Recovery: scope-out cross-affected; complex OOT-impact
              handling; possibly multi-recall consideration
```

---

## 11. Roles and authority (RACI)

```
ACTION              PM-S  PLAN  TECH  CALIB  PROD  QA  COMP  PACK  AI
PM Trigger          A     -     -     -      -     -   -     -     -
MWO planning         -     A     C     C      C     -   -     -     -
Spare procurement    -     R     -     -      -     -   -     -     -
Dispatch + LOTO      -     -     A     -      C     -   -     -     -
Execution            -     -     A     R(calib) -     -   -     -     -
Calibration          -     -     -     A      -     C   -     -     -
OOT impact assess    -     -     -     R      -     A   C     -     -
                                                    (BD-2
                                                    cascade)
Closure              -     R     A     -      -     -   -     -     -
RTS certification    -     -     R     -      -     A   A     A    -
   (regulated)                                              (BD-25
                                                              Aero AD)
Predictive accept     -     C     -     -      -     C   -     -     R(AI-04)
                                                                     advisory
```

---

## 12. Cross-references

- D2 (Procurement to Pay) — spare-part demand
- D3 (Plan to Produce) — asset state ↔ WO start
- D5 (Inspect to Disposition) — OOT impact disposition
- D6 (NC to CAPA) — OOT-impact CAPA
- D10 (Batch to Release) — calibration currency gate
- D11 (Release to Trace) — OOT impact scope
- D12 (Complaint to Recall) — calibration-driven recall
- C9 (Maintenance) — primary domain
- E3 + E5 + E12 — APIs (incl. file upload for cert)
- F4 + F5 — UI surfaces
- H1 §3 — regulator notification (AD / SB / Aero; OSHA)
- H4 — calibration_certificate (EC-12), MWO (EC-4)
- H5 — perpetual asset life retention
- H7 — change to PM cycle is H7 governance
- H8 — CAPA cascade
- H9 — deferred-PM risk acceptance
- L2 — AI-04 predictive maintenance, AI-22 calibration OOT
- M3 — root catalog (MWO, Asset, Calibration Record)
- M4 — SM-9 + SM-CALIB

---

## 13. Decision phrase

```
D9_MAINTAIN_TO_RESTORE_BASELINE_LOCKED
NEXT: D10_BATCH_TO_RELEASE.md
```

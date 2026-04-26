# D3 — Plan to Produce

```
workflow_id:    D3
workflow_name:  Plan to Produce
owner_role:     Planning Lead
participants:   Production, Procurement, Inventory, Engineering,
                Quality, Maintenance, Workforce
state_machines: SM-1 Order; SM-2 Procurement; SM-3 Work Order
                (primary); SM-7 Doc effectivity; SM-8 Training;
                SM-9 Maintenance (asset state)
```

D3 turns demand (sales orders, forecasts, safety stock targets) into
finished goods through MPS → MRP → capacity → finite-capacity
scheduling → JO release → WO dispatch → kitting → operation
execution → in-process + final inspection. For regulated tenants,
D3 enforces the eligibility chain: every dispatch checks doc
effectivity + operator training + equipment qualification + material
qualified — silently failing any check blocks dispatch.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
MPS authoring + maintenance            sales order capture (D1)
MRP net requirements                    procurement execution (D2)
Capacity planning + simulation           customer shipment (D1)
Finite-capacity scheduling                detailed cost roll (C11)
Job + Work Order release
Kitting
Eligibility resolution
Operation execution
In-process + final inspection (D5)
Lot genealogy edge creation (D11)
Yield + scrap capture
Handoff back to D1
```

---

## 2. Trigger catalog

```
TRIGGER                                  ROUTE
Sales Order confirmation (BTO/CTO/MTO)    per D1
Forecast-driven cycle (weekly typical)     per planning cadence
Inventory reorder point reached             per C5
Safety-stock target breach                   per C3 + C5
Sub-assembly internal demand                  per BOM explosion
Engineering build (NPI / pilot)               per C2
Validation / qualification lots                per H2
Recall replacement urgency                     per D12
Stability supply (Pharma)                       per J1
Customer-driven schedule change                  per D1 + CSR
Production trial run (PRR Auto)                 per J2 + APQP
Sterility + line-readiness gate (Pharma)         per J1 + Annex 1
HACCP CCP-failure rework batch (Food)             per J5
First-article required (Aero)                     per J3 SM-FAI
Maintenance-driven reschedule                     per D9
Capacity-rebalance (peak / off-peak)              per I5
Customer-pulled JIT                                per CSR
```

---

## 3. Actors and authority

```
MASTER SCHEDULER                MPS authoring
MRP ENGINE (system)               net requirements computation
CAPACITY PLANNER                   capacity feasibility
PRODUCTION PLANNER                  JO release
PRODUCTION SUPERVISOR                WO dispatch + escalation
KIT OPERATOR                          kit assembly
OPERATOR                              operation execution
IPQC INSPECTOR                         in-process quality
FQC INSPECTOR                          final quality
QUALITY MANAGER                         disposition for variance
MAINTENANCE                              equipment state owner
WORKFORCE                                training currency owner
ENGINEERING                              spec + routing source
QP / PRRC (per pack)                     batch release authority
                                       (BD-1 cross-link D10)
```

---

## 4. State machine SM-3 Work Order Lifecycle

```
STATES                          EVENTS / GUARDS                EVIDENCE
draft                           plan_release (per JO ready)     EC-4
released                        dispatch (eligibility           EC-4 + EC-22
                                resolved per §6 step 7)
                                hold (any eligibility failure)   EC-4
dispatched                      start_op                          EC-4 + EC-3
in_progress                     pause (operator break,            EC-4
                                interruption)
                                resume                              EC-4
                                in_process_inspect                  EC-18 + EC-2
                                                                     (where regulated)
                                step_complete                       EC-4 + EC-3
                                  (cascades through routing)
all_steps_complete              final_inspection                    EC-18 + EC-2
final_inspected                  disposition                          EC-13 + EC-2
                                  (cascades to SM-5)
released_for_putaway             putaway (cascades to C5)              EC-4
closed                            (terminal)                            -
                                  cancel (early)                        EC-5
                                  recovery (rework loop)                 EC-4

HARD COUPLINGS
  SM-3 ← SM-1 (order release)
  SM-3 → SM-4 / SM-5 (final inspection + disposition)
  SM-7 → SM-3 (doc / SOP / WI effectivity gates start)
  SM-8 → SM-3 (training currency gates start + sign-off)
  SM-9 → SM-3 (asset state gates start)
  SM-3 → C5 (consumption + production)
  SM-3 → C8 (lot genealogy edge per consumed/produced lot)
SOFT COUPLINGS
  SM-3 → SM-9 (yield drop suggests PM)
  SM-3 → SM-13 (yield variance updates risk)
  SM-3 → SM-12 (recurrent issue may surface in audit)
```

---

## 5. Step substance

### Step 1 — MPS

```
SUBSTANCE                       Master Scheduler authors MPS using
                                booked SO + forecast + safety stock;
                                runs feasibility simulation (capacity
                                + material); publishes time-phased
                                plan
EVIDENCE                        MPS_record (EC-4); simulation
                                outcome (EC-3 telemetry)
DECISION POINTS                 P1.1 demand priority (allocation);
                                P1.2 forecast trust window;
                                P1.3 manual lock vs system auto;
                                P1.4 customer-mandated schedule
EDGE CASES                       overbooked (capacity); under-
                                booked (efficiency); multi-tenant
                                contention; force-majeure scenarios
```

### Step 2 — MRP

```
SUBSTANCE                       net = gross - on-hand - in-supply;
                                explode BOM; per item generate
                                requisition (sourced) or production
                                order (in-house); netting policy
                                per item (FIFO, FEFO, LIFO);
                                per-pack rules (Pharma: shelf-life
                                FEFO; Food: FEFO + allergen-line);
                                cycle: nightly default;
                                intra-day for dynamic shops
EVIDENCE                        MRP_run_log (EC-3); requisition
                                generation (EC-4); production order
                                draft (EC-4)
DECISION POINTS                 P2.1 sourcing rule (preferred,
                                competitive, sole-source);
                                P2.2 lot-sizing policy (per-order,
                                period-batch, EOQ);
                                P2.3 substitution rule (allowed?
                                approved-list?); P2.4 expediting
                                vs slipping
EDGE CASES                       infeasible (no supplier with lead
                                time); allocation conflict
                                (multi-customer same lot); recall
                                lot impact; expired material;
                                concession-released material with
                                limited use
```

### Step 3 — Capacity planning

```
SUBSTANCE                       finite-capacity check per workcell
                                + per shift; bottleneck identified;
                                rough-cut + detailed
EVIDENCE                        capacity_run (EC-3)
DECISION POINTS                 P3.1 add overtime / shift
                                P3.2 reschedule lower-priority
                                P3.3 outsource overflow
                                P3.4 customer renegotiate
EDGE CASES                       single-bottleneck cascade;
                                seasonal peak; new-product ramp;
                                qualification-supply spike;
                                regulated-validation supply
```

### Step 4 — Finite-capacity scheduling

```
SUBSTANCE                       generate timeline respecting
                                dependencies + setup +
                                changeover + tool availability
                                + qualified operator pool;
                                sequence-aware (campaign mode
                                Pharma; allergen sequencing
                                Food; counterfeit-risk supplier
                                segregation Aero)
EVIDENCE                        schedule_record (EC-4)
DECISION POINTS                 P4.1 makespan vs WIP balance
                                P4.2 priority overrides
                                P4.3 maintenance window
                                conservation
                                P4.4 cleanout / changeover
                                strategy
EDGE CASES                       AI-25 advisory (workforce-
                                schedule optimizer) per L2;
                                pause/resume per real shop
                                event; replanning post-disruption
```

### Step 5 — JO release

```
SUBSTANCE                       Production Planner releases Job
                                Orders to floor; JO references
                                routing (per current revision);
                                JO inherits attributes from
                                originating SO (priority,
                                customer, regulated flag,
                                pack overlay)
EVIDENCE                        JO_record (EC-4); release sig
                                where regulated (EC-2)
DECISION POINTS                 P5.1 hold for missing precondition
                                (doc / training / equipment)
                                P5.2 partial release (some lines)
                                P5.3 customer-driven hold
EDGE CASES                       routing version newer than
                                expected (R7); spec revision in
                                flight via ECO; conflicting
                                customer hold
```

### Step 6 — WO dispatch

```
SUBSTANCE                       JO decomposes per routing into
                                operation-level Work Orders;
                                Supervisor assigns WO to specific
                                equipment + operator per schedule;
                                kanban-style or push-style per
                                tenant
EVIDENCE                        WO_record (EC-4); dispatch event
                                (EC-22)
DECISION POINTS                 P6.1 dispatch sequence per
                                priority + setup minimization
                                P6.2 alternative equipment
                                P6.3 alternative operator
                                P6.4 split / merge WO
EDGE CASES                       equipment freed earlier than
                                planned (pull-in); equipment goes
                                down (re-dispatch); operator
                                rotation; emergency priority bump
```

### Step 7 — Eligibility resolution (canonical gate)

The single most critical step for regulated tenants. Eligibility
checks BEFORE dispatch:

```
CHECK                            SOURCE              EVIDENCE
Doc / SOP / WI effective         SM-7 (D7)           EC-10 currency
Routing version effective        per ECO (SM-7)      EC-10 currency
Spec version effective           per ECO (SM-7)      EC-10 currency
Operator trained on this OP      SM-8 (D8)           EC-11 currency
Operator qualified for this       SM-8                EC-11
   equipment
Aseptic personnel qualified       SM-8 + Pharma       EC-11
   (Pharma)
ITAR person-of-record (Aero)     SM-ITAR-ACCESS      EC-22 + EC-2
PCQI present (Food regulated)    SM-FOOD             EC-11
Equipment qualified              SM-9 (asset state)   EC-1 (PQ)
Calibration current              SM-9                 EC-12 currency
Cleaning state acceptable        SM-CLEANING-V       EC-1 (Pharma)
   (Pharma)
EM ok in area (Pharma sterile)    SM-EMP             EC-3
Material in stock + qualified    SM-INV              EC-4 + EC-13
                                                     (disposition)
Counterfeit screen passed (Aero)  SM-COUNTERFEIT     EC-18 sub
FAI on file (Aero first piece    SM-FAI              EC-1
   per revision)
PPAP on file (Auto regulated)    SM-PPAP             EC-1
Spec characteristics monitored    SM-SPC              EC-3
   in SPC
HACCP CCP within limit (Food)    SM-CCP-MONITOR     EC-3
Recall not in effect on lot       SM-11               -
Validation evidence fresh         per H2 §13           EC-1
   (regulated capability)

OUTCOME                          all green → dispatch proceed
                                 any red → block + reason +
                                 surface to Supervisor + Operator
```

The eligibility gate is itself a regulated capability with a
validation pack (per H2). Bypass attempts are SEV-1 incidents.

### Step 8 — Kitting

```
SUBSTANCE                       components per BOM gathered;
                                per-lot capture for genealogy
                                (per D11); transported to
                                workcell; allergen segregation
                                (Food); ITAR segregation (Aero);
                                serialized component capture
                                where applicable
EVIDENCE                        kitting_record (EC-4); per-lot
                                genealogy edge candidate
DECISION POINTS                 P8.1 substitute material per
                                approved-list
                                P8.2 short-kit (release with
                                gap)
                                P8.3 emergency manual kit
EDGE CASES                       expired material at kit time
                                (re-pull); cold-chain violation
                                during transport (Pharma /
                                food); ITAR controlled component
                                tracked
```

### Step 9 — Operation execution

```
SUBSTANCE                       Operator scans WO; follows
                                effective WI; per-step capture
                                (parameter, sample, photo,
                                e-signature where regulated);
                                consumed material captured;
                                produced material captured;
                                lot genealogy edges built;
                                yield captured; deviations
                                logged; AI advisory (AI-29
                                outlier detection) per L2
EVIDENCE                        WO_step_record (EC-4); telemetry
                                (EC-3); per-step signature
                                (EC-2 where regulated); deviation
                                (EC-13 / SM-DEV Pharma);
                                genealogy edges (EC-4)
DECISION POINTS                 P9.1 step skip not allowed
                                (regulated)
                                P9.2 deviation handling per
                                Pharma SM-DEV / per H8
                                P9.3 in-process challenge
                                (alarm) handling
                                P9.4 emergency stop + recovery
EDGE CASES                       parameter out-of-spec mid-step
                                (alarm; halt; dispose); operator
                                error (correction in next sample);
                                equipment lost-power (recovery
                                runbook); environment excursion
                                (cascade SM-EMP Pharma)
```

### Step 10 — In-process inspection

```
SUBSTANCE                       per Inspection Plan; sampling
                                per AQL or risk-based; per
                                special characteristic
                                continuous SPC (Auto CC/SC/
                                KPC/KCC); per critical control
                                point continuous monitoring
                                (Food)
EVIDENCE                        IPQC_record (EC-18); SPC sample
                                (EC-3); inspector sig (EC-2)
DECISION POINTS                 P10.1 OOS investigation
                                (cascade D5 + D6 if pattern)
                                P10.2 sample expansion if
                                near-spec
                                P10.3 SPC out-of-control
                                response
EDGE CASES                       drift detected; intermittent
                                fault; operator-induced (re-train
                                trigger); instrument calibration
                                drift detected
```

### Step 11 — Job completion

```
SUBSTANCE                       all WOs complete; finished goods
                                enter inventory in quarantine
                                (regulated) or available
                                (non-regulated); final yield
                                + scrap captured; cost variance
                                computed
EVIDENCE                        JO_complete (EC-4); yield_record
                                (EC-3); final cost (EC-4)
EDGE CASES                       partial complete (some scrap);
                                rework loop; concession path
```

### Step 12 — Final inspection (FQC; cascade D5)

Per pack overlay; for regulated tenants always required.

### Step 13 — Disposition (cascade SM-5)

Per D5; for Pharma additional QP pre-release pack (per J1).

### Step 14 — Hand-off to D1

```
SUBSTANCE                       finished goods linked to
                                originating SO; lot genealogy
                                snapshot; ready-to-ship state
                                or stock state per SO timing
EVIDENCE                        completion event; cross-reference
                                to D1 SM-1
```

---

## 6. Branches

```
DISCRETE MANUFACTURE             default
PROCESS / BATCH MANUFACTURE       per ISA-88; recipe + procedure;
                                  Pharma + Food + chemical
CONTINUOUS PROCESS                per ISA-88 + per process
ENGINEER-TO-ORDER (ETO)            per project; per Engineering;
                                  one-off
CONFIGURE-TO-ORDER (CTO)           per option; BOM resolution at
                                  order
ASSEMBLE-TO-ORDER (ATO)            sub-assembly stocked
MAKE-TO-STOCK (MTS)                forecast-driven
MAKE-TO-ORDER (MTO)                order-driven
PROTOTYPE / NPI                    per Engineering (C2)
QUALIFICATION LOT                  per H2
SAMPLE LOT                         non-saleable; tracked separately
RECALL REPLACEMENT                  expedited; tied to D12
SHIFT-CHANGE HANDOFF                operator change-over discipline
WORK-IN-PROCESS HOLD                hold for engineering review
                                  (CR per H7)
PARALLEL WORK STREAMS               same JO multiple streams
SUB-CONTRACT MANUFACTURE             sub-processor fabrication
                                   (per L2 §8 + I8 + DPA)
REWORK STREAM                        per RC-recovered lot
SCRAP STREAM                          per RC-failed lot
FIRST-PIECE DISCIPLINE               Aero per FAI required
PPAP-VERIFIED PRODUCTION              Auto post-PPAP-approval
APR-EVIDENCE-CONTRIBUTING            Pharma feeds APR
PSUR-EVIDENCE-CONTRIBUTING            MD feeds PSUR
HACCP-CRITICAL                        Food per CCP enforcement
SPECIAL-PROCESS NADCAP                Aero per cert
PILOT BATCH                            Pharma per Annex 15
PROCESS-VALIDATION RUN                  per H2 + Pharma 3-batch
                                       process validation
```

---

## 7. Cross-domain footprint

```
PLANNING (C3)                    primary
ENGINEERING (C2)                  BOM + routing + spec
PROCUREMENT (C4)                  sourced material via D2
INVENTORY (C5)                    consume + produce + stage
SHOPFLOOR / MES (C6)              execution; SCADA; edge gateway
QUALITY (C7)                      IPQC + FQC + disposition
TRACEABILITY (C8)                 genealogy edges
MAINTENANCE (C9)                   equipment qualification
WORKFORCE (C10)                    operator training + scheduling
FINANCE (C11)                      cost of production
INTEGRATION (C12)                  SCADA + edge + ASN
ANALYTICS (C13)                     KPI; AI yield-loss driver (AI-12);
                                  schedule optimizer (AI-25);
                                  SPC outlier (AI-29)
CORE (C14)                         tenant + identity + audit
```

---

## 8. Pack overlays

```
PHARMA (J1)                      EBR per batch; cleaning validation
                                 effective; EM ok (sterile);
                                 APR-evidence contribution; deviation
                                 handling per SM-DEV
AUTO (J2)                        APQP phase alignment; PFMEA-driven
                                 control plan; layered audit
                                 enforcement; SPC for special
                                 characteristics; PPAP gate before
                                 production
AERO (J3)                        FAI at first piece per revision;
                                 NADCAP-cert special process; ITAR
                                 person-of-record; counterfeit
                                 segregation; service-life-limited
                                 traceability
MD (J4)                          DHR per unit; UDI applied;
                                 sterilization cycle (Pharma-style)
                                 per ISO 11135 / 11137 / 17665;
                                 packaging per ISO 11607
FOOD (J5)                        HACCP plan effective; CCP monitored;
                                 allergen-segregated scheduling;
                                 sanitation pre-op + operational +
                                 post-op; EMP (where applic);
                                 §204 KDE/CTE captured for high-risk
```

---

## 9. KPIs

```
- OEE (Availability × Performance × Quality)
- Yield % per workcell + per item
- Scrap % + COPQ
- First-pass yield
- Cycle time mean + tail
- Schedule attainment %
- WIP turns
- On-time release %
- Eligibility-blocked dispatch rate (target near-zero)
- Right-first-time release rate
- Operator + equipment utilization
- Setup + changeover time
- SPC Cpk + Ppk per characteristic
- Deviation count + cycle time (Pharma)
- HACCP CCP excursion count + cycle time (Food)
- AI advisory acceptance rate (per L2)
```

---

## 10. Failure modes + recovery

```
FM1   MRP infeasibility (no supplier within window)
      Recovery: alternate sourcing; substitute material;
              customer renegotiate; H8 systemic if recurrent

FM2   Capacity bottleneck breaks plan
      Recovery: overtime / re-sequence / outsource overflow;
              H8 if pattern

FM3   Equipment failure mid-run
      Recovery: per RB-INC; alternate equipment if qualified;
              re-dispatch; H8 systemic via D9

FM4   Operator absence at dispatch
      Recovery: re-dispatch to qualified backup; if no backup
              qualified, schedule slip; H8 via D8

FM5   Eligibility bypass attempt (regulated)
      Recovery: SEV-1; validation pack tested;
              H8 systemic CAPA on dispatch discipline

FM6   In-process OOS sustained
      Recovery: halt; investigate (D5 + D6); re-validate;
              H8 + recall consideration if shipped

FM7   Yield drop > threshold
      Recovery: AI-12 driver-ranking advisory; investigate;
              H8 if root cause is process-systemic

FM8   Recall lot in WIP
      Recovery: per D12 cascade; segregate; consume per
              recall plan; H1 §3 notifications

FM9   Material expired in stock at consumption time
      Recovery: re-pull qualified material; H8 systemic
              on inventory rotation discipline

FM10  Pharma cleaning expired mid-campaign
      Recovery: per J1; campaign halted; re-validate;
              H8 CAPA

FM11  HACCP CCP excursion (Food)
      Recovery: per J5; lot held; corrective action;
              dispose per Process Authority

FM12  Aero counterfeit confirmed (mid-WIP)
      Recovery: per J3; quarantine; trace forward + back;
              GIDEP submit; H1 §3

FM13  ITAR boundary failure (mid-run)
      Recovery: per J3 §10; access revoke; SEV-1;
              regulator notification

FM14  IT outage in MES
      Recovery: per RB-INC; manual paper-fallback (regulated
              tenants have paper fallback documented per
              SOP); reconcile post-outage
```

---

## 11. Roles and authority (RACI)

```
ACTION                MS  CP  PP  SUP OP IPQC FQC QM ENG MAINT WK QP/PRRC
MPS                   A   C   -   -   -  -    -  -  C   -    -   -
MRP                   R   C   R   -   -  -    -  -  -   -    -   -
Capacity              C   A   -   -   -  -    -  -  -   -    -   -
Schedule              -   R   A   C   -  -    -  -  -   -    -   -
JO release            -   -   A   -   -  -    -  -  -   -    -   -
WO dispatch            -   -   -   A   R  -    -  -  -   -    -   -
Eligibility           -   -   -   A   -  -    -  -  C   C    C   -
Kitting               -   -   -   -   R  -    -  -  -   -    -   -
Operation execute     -   -   -   C   A  -    -  -  -   -    -   -
IPQC                  -   -   -   C   -  A    -  R  -   -    -   -
FQC                   -   -   -   C   -  -    A  R  -   -    -   -
Disposition (BD-2)     -   -   -   -   -  -    -  A  -   -    -   A(reg)
Job complete          -   -   A   R   R  -    -  -  -   -    -   -
Hand-off to D1        -   -   A   -   -  -    -  -  -   -    -   C (release)
```

---

## 12. Cross-references

- D1 (Order to Cash) — origin + destination
- D2 (Procurement to Pay) — sourced material
- D4 (Receive to Inspect) — receipt cycle for components
- D5 (Inspect to Disposition) — IPQC + FQC + variance
- D6 (NC to CAPA) — deviation cycle
- D7 (Document to Release) — doc effectivity gate
- D8 (Train to Qualify) — operator currency
- D9 (Maintain to Restore) — asset state
- D11 (Release to Trace) — genealogy
- D14 (Validate to Qualify) — for qualification lots
- C2..C10 — domain instantiation
- E3 + E5 — APIs
- F3 + F4 + F5 — UI surfaces
- H2 §13 — validation freshness
- H8 — CAPA
- L2 — AI features (AI-12, AI-25, AI-29)
- M3 — root catalog (JO, WO, Operation)
- M4 — SM-3 + SM-7 + SM-8 + SM-9 couplings

---

## 13. Decision phrase

```
D3_PLAN_TO_PRODUCE_BASELINE_LOCKED
NEXT: D4_RECEIVE_TO_INSPECT.md
```

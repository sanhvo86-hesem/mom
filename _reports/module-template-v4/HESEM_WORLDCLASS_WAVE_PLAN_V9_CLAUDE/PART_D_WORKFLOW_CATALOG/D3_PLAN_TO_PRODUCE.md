# D3 — Plan to Produce

```
workflow_id:    D3
workflow_name:  Plan to Produce
owner_role:     Planning Lead
participants:   Production Lead, Procurement Lead, Inventory Lead, Engineering Lead
```

---

## 1. Purpose

Plan to Produce turns demand (sales orders, forecasts, safety stock
targets) into actual finished-goods production through the sequence of
MPS, MRP, capacity planning, finite scheduling, dispatch, kitting, and
operation execution.

---

## 2. Trigger

- Sales Order confirmation (D1) for make-to-order
- Forecast-driven planning cycle (typically weekly)
- Inventory reorder point reached
- Safety stock target breach

---

## 3. Actors

```
Master Scheduler          Authors and adjusts MPS
MRP Engine (system)       Computes net requirements
Capacity Planner          Validates capacity feasibility
Buyer                     Issues POs from generated requisitions
Production Planner        Releases jobs and schedules
Production Supervisor     Dispatches work orders to floor
Operator                  Executes operations
```

---

## 4. Steps

### Step 1 — Master Production Schedule

Master Scheduler authors MPS based on Sales Order book + forecasts +
safety stock. Reviewed for capacity feasibility. Released as the
target plan.

### Step 2 — Material Requirements Planning

MRP runs (typically nightly, sometimes intra-day for dynamic shops).
For each scheduled item, MRP computes net requirements: gross need
(MPS), minus on-hand inventory, minus existing supply, equals net need.
For each net need: generate purchase requisition (sourced) or
production order (in-house).

### Step 3 — Capacity Planning

Capacity Planner reviews the schedule for feasibility against equipment
hours and labor hours. Overload and underload flagged. Adjustments
propagate back to MPS or trigger demand deferrals.

### Step 4 — Finite-Capacity Scheduling

Schedule generator creates a finite-capacity timeline respecting
dependencies, setup times, and bottleneck constraints. Output is the
shopfloor schedule per work cell.

### Step 5 — Job Order Release

Production Planner releases Job Orders. Released JOs flow to the floor.

### Step 6 — Work Order Dispatch

JOs decompose into per-operation Work Orders. Supervisor dispatches WOs
to specific equipment / operators per the schedule.

### Step 7 — Eligibility Resolution

Before dispatch, the Eligibility Resolver (CAP-C10-06) verifies:
- Operator is trained on this operation, this equipment
- Equipment is available, calibrated, not in maintenance lock
- Materials are available, not in quarantine
- Work instruction is current

If any check fails, dispatch is blocked.

### Step 8 — Kitting (when applicable)

Kit Operator gathers components per BOM, transports to work cell,
operator confirms kit complete.

### Step 9 — Operation Execution

Operator scans WO, follows work instruction, completes steps, captures
defects. OPER record built up. Material consumed and produced. Lot
genealogy edges created.

### Step 10 — In-Process Inspection (when applicable)

Per inspection plan, in-process inspections sampled. Findings recorded;
out-of-tolerance triggers NC.

### Step 11 — Job Completion

When all WOs are complete, JO transitions to "completed." Finished
goods enter inventory (in quarantine status pending OQC if applicable).

### Step 12 — Outgoing Quality Control (when applicable)

Final inspection per OQC plan. Disposition flows. If accepted, lot
moves to "available" or directly to "ready-to-ship" for the originating
SO.

### Step 13 — Handoff to Order to Cash

The completed finished goods feed back to D1 Order to Cash for
shipment.

---

## 5. Decision points

```
DP1  MPS feasibility:        capacity adequate?
DP2  Supplier availability:  for sourced components
DP3  Dispatch eligibility:    operator + equipment + material qualified?
DP4  In-process disposition: pass / fail / continue with rework?
DP5  Outgoing disposition:   release / reject / hold?
```

---

## 6. Cross-domain footprint

D-03 Planning (primary), D-02 Engineering (BOM, routing), D-04
Procurement, D-05 Inventory, D-06 Production, D-07 Quality, D-09
Maintenance (equipment availability), D-10 Workforce (operator
eligibility).

---

## 7. State machines

SM-1 Order, SM-9 Procurement (sourced components), SM-10 Job and Work
Order, SM-2 Material, SM-3 Inspection, SM-8 Equipment.

---

## 8. Evidence captured

MPS history, MRP run logs, Schedule history, JO records, WO records,
OPER records, kitting records, inspection results, lot genealogy edges.

---

## 9. Wave target

L4 by W5; L5 by W6 (heavy on Wave 5 Transactional + Wave 6 MES/OT).

---

## 10. Failure modes

```
- MRP infeasibility:         demand cannot be met → notify Sales / Customer
- Capacity bottleneck:       schedule adjusts; some jobs slip
- Material short:            expedite procurement or substitute
- Equipment failure:         reschedule; alternate equipment if possible
- Operator absence:          re-dispatch to qualified backup
- In-process NC:             impact assessed; rework or scrap; SO impact
```

---

## 11. Decision phrase

```
D3_PLAN_TO_PRODUCE_BASELINE_LOCKED
NEXT: D4_RECEIVE_TO_INSPECT.md
```

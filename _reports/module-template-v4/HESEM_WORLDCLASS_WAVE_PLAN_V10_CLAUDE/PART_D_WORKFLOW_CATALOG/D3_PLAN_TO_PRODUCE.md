# D3 — Plan to Produce

```
workflow_id:    D3
workflow_name:  Plan to Produce
domain_primary: Planning & Production
domains_cross:  MES Execution, Inventory & Logistics, Quality Improvement,
                Procurement, Maintenance & EHS, Traceability
state_machine:  SM-3 (Work Order), SM-1 partial (Sales Order demand)
trigger_count:  22
branch_count:   20
edge_case_count:14
kpi_count:      16
failure_mode_count: 14
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-2 BD-7 BD-14
ai_advisory:    AI-05 AI-06 AI-07 AI-08
version:        V10-deep
```

---

## §1 Purpose and Scope

The Plan to Produce (P2P-Prod) workflow governs every step from recognizing a
demand signal through dispatching a fully qualified work order to the shop
floor and confirming production completion. It is the central orchestrator of
demand, supply, capacity, and material—converting sales commitments or
inventory replenishment targets into executable manufacturing instructions.

This workflow owns the Master Production Schedule (MPS), the Material
Requirements Plan (MRP), capacity planning (RCCP + CRP), and the work order
lifecycle. It feeds D4 (Receive to Inspect) for externally sourced inputs, D2
(Procurement to Pay) for purchased items, D5 (Inspect to Disposition) for
in-process control, D8 (Train to Qualify) for operator eligibility, and
D9 (Maintain to Restore) for equipment readiness.

Scope includes:
- Demand capture (firm orders, forecasts, service part demand, replenishment)
- MPS building and horizon management (frozen zone, firm zone, planning zone)
- MRP net-change and regenerative runs with exception messages
- Rough-Cut Capacity Planning (RCCP) and Capacity Requirements Planning (CRP)
- Work order creation, routing, BOM explosion, material reservation
- Eligibility Resolver execution before WO dispatch (G1–G7 gate set)
- Shop floor dispatch list management
- Production confirmation, backflush, yield reporting
- WIP cost accumulation and variance capture (links to C11)

Out of scope: physical material movement (C5), incoming inspection (D4),
in-process inspection execution (D5), and maintenance execution (D9) — though
P2P-Prod triggers and monitors all of these.

---

## §2 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | Item master with `production_type` set and active bill of materials | BOM validator at MPS creation |
| PC-2 | Routing exists with at least one work center and cycle time defined | Routing completeness check |
| PC-3 | Finished goods item has a standard cost or cost estimate | Cost estimator (C11) |
| PC-4 | Demand source validated: firm SO confirmed, forecast bucket authorized, or replenishment trigger enabled | Demand validation service |
| PC-5 | For ETO/CTO items: product configuration completed and design released | Engineering change status = `RELEASED` |
| PC-6 | For pharma (J1): master batch record (MBR) exists and revision is current | MBR revision check |
| PC-7 | For automotive PPAP-verified parts (J2): PPAP level submitted ≥ min_ppap_level configured | PPAP status check |
| PC-8 | For aero FAI-anchored parts (J3): first article inspection record exists and status = `APPROVED` | FAI status gate |
| PC-9 | For medical device (J4): device master record (DMR) complete and current for the item | DMR completeness check |

---

## §3 Trigger Catalog

| ID | Trigger | Source | Entry Point |
|----|---------|--------|-----------|
| T-01 | Confirmed sales order line: `so_line.status = confirmed` | Order management (C2/D1) | MPS demand |
| T-02 | Forecast consumption: bucket-level demand from statistical forecast | S&OP planning (C4) | MPS demand |
| T-03 | Min/max replenishment trigger: `on_hand + on_order < reorder_point` | Inventory (C5) | MRP recommendation |
| T-04 | Safety stock replenishment: `projected_available < safety_stock` at planning horizon | MRP engine | MRP recommendation |
| T-05 | Blanket SO release: scheduled call-off triggers production | Order management (D1) | MPS firm demand |
| T-06 | Service part demand: spare part requirement from MWO | CMMS (C9/D9) | MRP recommendation |
| T-07 | Campaign production trigger: lot-size policy = `campaign`; campaign size reached | Production scheduler | WO creation |
| T-08 | Re-work order: QC disposition = `REWORK` | Quality (D5/C7) | WO creation (rework type) |
| T-09 | Pilot/trial run: process validation IQ/OQ/PQ protocol requires production runs | Process validation (C9) | WO creation (validation type) |
| T-10 | CTO configuration: customer-specific configuration confirmed | Order management (C2) | WO creation (CTO type) |
| T-11 | ETO release: engineering design released; BOM and routing auto-generated from design | Engineering (C3) | WO creation (ETO type) |
| T-12 | ATO (Assemble to Order): SO triggers final assembly of pre-stocked sub-assemblies | Order management | WO creation (ATO type) |
| T-13 | MTS safety replenishment after stockout event | Inventory (C5) | MRP recommendation |
| T-14 | Recall replacement production (D12): field recall triggers replacement lot manufacture | Recall management (D12) | WO creation (urgent) |
| T-15 | PPAP production run (J2): PPAP-level submission requires production sample parts | Auto compliance (J2) | WO creation (PPAP type) |
| T-16 | FAI anchor production (J3): first article inspection triggered on new part or process change | Aero compliance (J3) | WO creation (FAI type) |
| T-17 | Pharma campaign batch (J1): MBR-driven batch manufacturing order | Pharma operations (J1) | Batch manufacturing order |
| T-18 | Stability study lot (J1): dedicated production run for stability program | Pharma QA (J1) | WO creation (stability type) |
| T-19 | Sterilization validation run (J4): production of sterilization validation lot | MD process validation (J4) | WO creation (sterile validation) |
| T-20 | HACCP CCP monitoring lot (J5): production run requiring CCP monitoring | Food safety (J5) | WO creation (HACCP type) |
| T-21 | Inter-facility transfer production: demand from sister facility triggers production | Inter-company planning | WO creation |
| T-22 | Capacity leveling: planner manually moves WO to smooth load | Planning (C4) | WO rescheduling |

---

## §4 State Machine — SM-3 Work Order

### States

| State | Meaning |
|-------|---------|
| `planned` | WO created by MRP/planner; not yet released to shop floor |
| `firm_planned` | Planner has committed dates; material reserved but not picked |
| `released` | Eligibility check passed; dispatch list entry created |
| `in_progress` | First operation started; at least one labor transaction recorded |
| `suspended` | Active WO put on hold (equipment failure, material shortage, quality hold) |
| `completed` | All operations confirmed; final yield recorded |
| `closed` | WIP cost settled; variance posted; WO archived |
| `cancelled` | WO voided before any production start |

### Transition Table

| From | Event | Guard | To | Actor | Notes |
|------|-------|-------|-----|-------|-------|
| `planned` | Planner firms WO | `dates_within_horizon ∧ bom_valid ∧ routing_valid` | `firm_planned` | Planner | Material reservation triggered |
| `planned` | MRP auto-firm | `auto_firm_fence_date ≥ start_date` | `firm_planned` | MRP Engine | Configurable auto-firm horizon |
| `firm_planned` | Release to shop floor | `eligibility_resolver.result = GO` | `released` | Production Supervisor | All G1–G7 gates must pass |
| `firm_planned` | Release blocked | `eligibility_resolver.result = HOLD` | `firm_planned` | System | Blocking gates listed in resolver response |
| `released` | First operation started | `operator_clocked_in ∧ material_issued` | `in_progress` | Operator | Labor transaction creates WO start record |
| `in_progress` | All operations confirmed | `all_operations.status = CONFIRMED ∧ yield_recorded` | `completed` | Production Supervisor | Quality inspection plan check |
| `in_progress` | Hold applied | `hold_reason set` | `suspended` | Supervisor / QC | Reason codes: MAT_SHORTAGE, EQUIP_FAILURE, QUALITY_HOLD, SAFETY_STOP |
| `suspended` | Hold cleared | `hold_cleared_by ∧ eligibility_resolver.result = GO` | `in_progress` | Supervisor | Re-check eligibility before resuming |
| `completed` | Cost settlement run | `variance_posted = true` | `closed` | Finance / Costing | WIP reversal + actual cost posting |
| `planned` | Cancellation | `no_material_issued ∧ no_labor_started` | `cancelled` | Planner | Material reservation reversed |
| `firm_planned` | Cancellation | `no_labor_started` | `cancelled` | Planner | Material reservation reversed |
| `in_progress` | Partial cancellation | `remaining_qty_cancelled = true` | `completed` | Supervisor | Partial yield closed; remainder cancelled |

---

## §5 Step Substance

### Step 1 — Demand Capture and Consensus

Demand enters the planning engine from multiple sources: confirmed SO lines,
statistical forecast buckets, safety stock replenishment triggers, inter-facility
transfer orders, and service part demand from CMMS. The S&OP module aggregates
these into an unconstrained demand plan, which is reviewed in the monthly
consensus cycle.

The `demand_plan` table records:
- `demand_source` (SO, FORECAST, SS_REPLENISH, INTERPLANT, SERVICE)
- `item_id`, `facility_id`, `period_date`, `demand_qty`, `demand_uom`
- `confidence_factor` (for statistical forecast buckets)
- `override_qty` and `override_reason` (planner manual adjustment)
- `consensus_approved_by`, `consensus_date`

### Step 2 — Master Production Schedule (MPS)

The MPS translates consensus demand into a time-phased production plan for
finished goods and key sub-assemblies. MPS is maintained by horizon:

- **Frozen zone** (≤ `frozen_fence` weeks): no system-generated changes;
  all modifications require planner manual action with `change_reason`
- **Firm zone** (frozen < t ≤ `firm_fence` weeks): planner-directed; MRP
  may suggest but not auto-change
- **Planning zone** (> `firm_fence` weeks): MRP freely adjustable

MPS entries carry `mps_line.status` ∈ {`active`, `firm`, `frozen`,
`cancelled`}. The MPS drives rough-cut capacity planning (RCCP), which checks
key resource groups (bottleneck work centers, critical tools) for overloads.

RCCP output: `rccp_overload_alert` records identify time buckets where
required capacity > available capacity (after applying `efficiency_pct` and
`utilization_pct` factors from the work center master).

### Step 3 — Material Requirements Planning (MRP)

MRP net-change runs after every significant demand or supply event; full
regenerative run executes on the configured schedule (typically nightly).

MRP processing logic per item:
1. **Gross requirement** = MPS + dependent demand from parent WOs
2. **On-hand** = `inventory.on_hand_qty` (available; not in QC hold or
   reservation for other WOs)
3. **Scheduled receipts** = open PO lines (`acknowledged` or `in_transit`)
   + open WOs in `firm_planned` or `released` state
4. **Projected available balance** = on-hand + scheduled receipts − gross requirement
5. **Net requirement** = max(0, safety_stock − projected_available_balance)
6. **Planned order** = net requirement rounded up to lot-size rule
   (fixed lot, min/max, economic order quantity, period order quantity)

MRP exception messages:
- `EXPEDITE`: existing order needs to be moved earlier
- `DEFER`: existing order can be pushed later (no immediate need)
- `CANCEL`: existing order no longer needed
- `CREATE`: new planned order recommended
- `SPLIT`: single large order should be split per lot-size rule

Buyer-planner work queue surfaces all exception messages for review and action.

### Step 4 — Capacity Requirements Planning (CRP)

After MRP generates planned orders, CRP loads each work order's routing
against work center capacity. CRP computes:

```
required_capacity[work_center][time_bucket] =
  Σ (wo.qty × routing_operation.run_time_per_unit
     + routing_operation.setup_time)
  / work_center.shifts_per_day
  / work_center.hours_per_shift
```

CRP output: `crp_load_profile` table with overload and underload flags per
work center per bucket. Planners level load by:
- Shifting WOs within available slack (firm zone only)
- Authorizing overtime (requires supervisor approval)
- Off-loading to alternate work center (routing alternate defined)
- Requesting temporary capacity (subcontractor service — triggers D2 T-07)

### Step 5 — Work Order Creation and BOM/Routing Explosion

When MRP planned orders are converted to firm planned or released WOs, the
system performs BOM and routing explosion:

**BOM explosion:**
- Resolves the effective BOM revision for `wo.start_date`
- Explodes multi-level BOM to component requirements list
- Applies `component_scrap_factor` and `yield_factor` to adjust planned
  quantities
- Creates `wo_component` records (one per BOM line) with:
  `required_qty`, `uom`, `issue_method` (backflush or manual pick),
  `supply_location`, `substitute_allowed`, `substitute_items[]`

**Routing explosion:**
- Resolves effective routing revision
- Creates `wo_operation` records: `operation_seq`, `work_center_id`,
  `setup_time`, `run_time`, `labor_grade_required`, `machine_type_required`,
  `inspection_plan_ref`, `pack_overlay_instructions`

### Step 6 — Material Reservation and Shortage Check

Upon firm planning, the system reserves component quantities from available
inventory using FEFO/FIFO allocation:
1. Sort candidate lots by `expiry_date ASC`, then `receipt_date ASC` (FIFO tiebreaker)
2. Reserve from earliest-expiry lot until `required_qty` met
3. If insufficient stock: `shortage_alert` generated; MRP exception issued
   (triggers D2 purchase if purchased item; rescheduling if inter-WO dependency)

Reserved lots are locked in `inventory_reservation` table with
`reservation_type = WO_COMPONENT` and `wo_id` reference. Reservations
cannot be consumed by other WOs without planner override.

### Step 7 — Eligibility Resolver (WO Dispatch Gate)

Before releasing a WO to the dispatch list, the Eligibility Resolver
evaluates 7 gates in order. All gates must return `GO` before `wo.status`
can transition from `firm_planned` to `released`.

#### Gate G1 — Training Eligibility

For each `wo_operation`, the required `skill_code` and `proficiency_level`
are checked against each operator's current `training_record`:

```
POST /api/v1/eligibility/check
{
  "context": "WO_DISPATCH",
  "wo_id": "WO-2026-008741",
  "operator_id": "OPR-003421"
}
```

Resolver queries:
```sql
SELECT
  skill_code,
  CASE
    WHEN tr.status = 'CERTIFIED'
     AND tr.expiry_date >= CURRENT_DATE
     AND tr.proficiency_level >= req.min_proficiency_level
    THEN 'GO'
    ELSE 'HOLD'
  END AS gate_result,
  tr.expiry_date,
  tr.training_record_id
FROM wo_operation_skill_requirement req
LEFT JOIN training_record tr
  ON tr.person_id = :operator_id
  AND tr.skill_code = req.skill_code
  AND tr.status = 'CERTIFIED'
WHERE req.wo_id = :wo_id
```

Blocking condition: any required skill with status ≠ `CERTIFIED` or
`expiry_date < CURRENT_DATE` → gate returns `HOLD`.

Evidence stored: `eligibility_check_result.gate_g1_detail` JSONB with
blocking skill codes, expiry dates, and training gap closure path.

#### Gate G2 — Equipment Eligibility

Required machine type for each `wo_operation.machine_type_required` checked
against `equipment` table:

Checks performed:
- `equipment.status = 'AVAILABLE'` (not in MWO, not in PM, not in calibration)
- `equipment.next_pm_due > wo.planned_end_date` (PM not overdue)
- `equipment.calibration_due_date > wo.planned_end_date`
- No active `quality_hold` on equipment

If qualified equipment is available but under-utilized and maintenance is
approaching, a predictive maintenance advisory (AI-08) is surfaced — informational
only; does not block unless `equipment.status ≠ AVAILABLE`.

#### Gate G3 — Material Eligibility

Checks that all reserved component lots are available and releasable:

- `inventory_reservation.reserved_qty ≥ wo_component.required_qty`
- All reserved lots: `lot.status ∈ {AVAILABLE, CONDITIONAL}` (conditional
  requires BD-7 USE_AS_IS dispensation already recorded)
- No reserved lot has `quarantine_flag = true` or `hold_reason` set
- FEFO compliance: earliest-expiry lot reserved first; no expired lot in reservation

If any reserved lot is in quarantine or hold, gate G3 returns `HOLD` with
`blocking_lots[]` array and recommended alternative lots.

#### Gate G4 — Document Eligibility

Required work instructions, quality plans, and control plans must be available
and current revision:

- `work_instruction.status = 'RELEASED'` for all operations
- `quality_plan.revision` matches `item_master.current_quality_plan_revision`
- `control_plan.status = 'APPROVED'` (J2 IATF 16949 requirement)
- For pharma (J1): `master_batch_record.status = 'APPROVED'` and
  `mbr.revision = item_master.current_mbr_revision`
- For aero (J3): `drawing_revision` on router matches released `cad_drawing.revision`

#### Gate G5 — Quality / BREL Eligibility

- No active `quality_hold` on finished goods item (`item_master.quality_hold = false`)
- No `batch_release_hold` (J1/J4) pending on the item
- Previous lot genealogy check: if previous production lot flagged `genealogy_alert`,
  planner review required before new lot starts
- For medical device (J4): Design History File (DHF) control check — item must
  not be under active design change (ECO) that affects the production BOM/routing

#### Gate G6 — ITAR/EAR Eligibility

For items classified under USML or CCL:

- All operators assigned to the WO must have `itar_person_of_record.cleared = true`
  OR item is not foreign-transfer (domestic production only)
- Export license check: if production output is destined for export,
  `export_license.status = 'ACTIVE'` and `item_id` listed on license
- EAR de minimis check: if item contains US-origin controlled content > EAR99
  threshold, re-export license confirmed

#### Gate G7 — Pack-Specific Eligibility

| Pack | Check |
|------|-------|
| J1 Pharma | Cleanroom qualification current; personnel aseptic qualification valid (if sterile product); equipment sterility validation current |
| J2 Automotive | PPAP status ≥ required level for customer; no active customer SCAR unresolved on process |
| J3 Aerospace | NADCAP accreditation current for special processes on router; AS9102 FAI record approved |
| J4 Medical Device | Sterilization validation current (if sterile device); IQ/OQ/PQ complete for production equipment |
| J5 Food Safety | CCP monitoring plan active; sanitation verification current; allergen changeover SOP completed if allergen swap |

Resolver response when all gates pass:
```json
{
  "result": "GO",
  "wo_id": "WO-2026-008741",
  "checked_at": "2026-04-27T08:14:32Z",
  "gates": {
    "G1_training": "GO",
    "G2_equipment": "GO",
    "G3_material": "GO",
    "G4_document": "GO",
    "G5_quality_brel": "GO",
    "G6_itar_ear": "GO",
    "G7_pack_specific": "GO"
  },
  "advisory": []
}
```

Resolver response with hold:
```json
{
  "result": "HOLD",
  "wo_id": "WO-2026-008741",
  "checked_at": "2026-04-27T08:14:32Z",
  "gates": {
    "G1_training": "HOLD",
    "G2_equipment": "GO",
    "G3_material": "GO",
    "G4_document": "GO",
    "G5_quality_brel": "GO",
    "G6_itar_ear": "GO",
    "G7_pack_specific": "GO"
  },
  "blocking_details": [
    {
      "gate": "G1_training",
      "blocking_skills": [
        {
          "skill_code": "WELD-TIG-3G",
          "operator_id": "OPR-003421",
          "current_status": "EXPIRED",
          "expiry_date": "2026-03-01",
          "remediation": "Schedule refresher training; estimated 4 hours"
        }
      ]
    }
  ]
}
```

Resolver calls are idempotent within a 5-minute TTL window: repeated calls
with the same `wo_id` return the cached result. Cache invalidated on any
training record update, equipment status change, or lot status change.

### Step 8 — Shop Floor Dispatch and Operation Execution

After `released` status, the WO appears on the dispatch list for the
relevant work centers. The dispatch list is sorted by:
1. `wo.priority` (URGENT > HIGH > NORMAL > LOW)
2. `wo.planned_start_date ASC`
3. `wo.customer_promise_date ASC` (if SO-linked)

Operators claim operations via terminal scan or mobile device. First clock-in
triggers `in_progress` status and records `actual_start_datetime`.

Operation execution events:
- `LABOR_START`: operator + operation + timestamp
- `LABOR_STOP`: with `good_qty` and `scrap_qty` at each step
- `MATERIAL_ISSUE`: manual pick transactions (backflush happens at WO completion)
- `IN_PROCESS_INSPECTION`: D5 inspection trigger per control plan frequency
- `MACHINE_DOWNTIME`: unplanned stop with reason code; feeds OEE calculation
- `SETUP_COMPLETE`: setup time recorded; run phase begins

### Step 9 — Production Confirmation and Yield

When all routing operations complete:
1. Supervisor confirms WO: `POST /api/v1/production/wo/{id}/confirm`
2. System records `actual_qty_good`, `actual_qty_scrap`, `actual_qty_rework`
3. Backflush: component quantities consumed from reserved lots per BOM;
   `inventory_transaction` records created (type = `WO_ISSUE`)
4. Finished goods receipt: `inventory_transaction` (type = `WO_RECEIPT`)
   with newly created lot; `lot.parent_lots[]` = consumed component lots
   (genealogy edge records created in `lot_genealogy_edge`)
5. Scrap transactions posted to COGS-Scrap GL account
6. Rework WO created if `actual_qty_rework > 0` (T-08 trigger)

### Step 10 — WIP Cost Settlement and Variance

Upon WO closure:
1. Actual labor cost = `Σ(labor_transactions.hours × labor_rate_by_grade)`
2. Actual material cost = `Σ(material_issues.qty × lot.actual_unit_cost)`
3. Actual overhead = applied overhead rate × actual direct labor hours
4. Standard cost = `wo.qty × item_master.standard_cost`
5. Variances:
   - **Usage variance** = (actual qty issued − standard qty) × standard material cost
   - **Rate variance** = (actual labor rate − standard rate) × actual hours
   - **Efficiency variance** = (actual hours − standard hours) × standard labor rate
   - **Yield variance** = (actual good output − expected good output) × standard cost

Variances posted to dedicated GL accounts per C11 COPQ/variance framework.
WO status transitions to `closed`; WIP account relieved.

---

## §6 Branch Catalog

| Branch ID | Condition | Divergence | Special Logic |
|-----------|----------|-----------|--------------|
| BR-D3-01 | Make-to-Stock (MTS) | Demand from safety stock or forecast | Standard MRP-driven WO; no SO link |
| BR-D3-02 | Make-to-Order (MTO) | Firm SO demand with `supply_method = MTO` | WO linked to SO; ATP holds FG for SO |
| BR-D3-03 | Configure-to-Order (CTO) | Customer-specific configuration SO | Configuration engine generates BOM variant; WO has `configuration_id` |
| BR-D3-04 | Engineer-to-Order (ETO) | Design released from engineering | BOM and routing auto-created from design release; WO type = ETO |
| BR-D3-05 | Assemble-to-Order (ATO) | Final assembly from pre-stocked sub-assemblies | Sub-assemblies in stock; only final assembly WO required |
| BR-D3-06 | Campaign batch production | Lot-size = campaign; `campaign_flag = true` | Multiple SO lines satisfied from one campaign WO; campaign calendar |
| BR-D3-07 | Rework order | QC disposition = REWORK | Rework WO type; original lot re-entered; yield variance tracked |
| BR-D3-08 | Pilot/trial run | Process validation requirement | WO type = VALIDATION; yield recorded but FG held for inspection |
| BR-D3-09 | Qualification production (J1/J4) | IQ/OQ/PQ protocol | WO type = QUALIFICATION; batch record evidence requirements elevated |
| BR-D3-10 | PPAP submission run (J2) | T-15 trigger | WO type = PPAP; retained sample reservation; PPAP package linked |
| BR-D3-11 | FAI-anchored first article (J3) | T-16 trigger | First operation triggers AS9102 FAI inspection; all dimensions 100% inspected |
| BR-D3-12 | Pharma batch manufacturing order (J1) | T-17: MBR-driven | Electronic Batch Record (EBR) generated; all steps signed in EBR; yield reconciliation per MBR |
| BR-D3-13 | Stability study production lot (J1) | T-18 trigger | Lot flagged `stability_study_lot = true`; samples pulled and registered in stability module |
| BR-D3-14 | Sterilization validation run (J4) | T-19 trigger | WO linked to sterilization validation protocol; process parameters recorded automatically |
| BR-D3-15 | HACCP CCP-monitored production (J5) | T-20 trigger | CCP monitoring records created per step; deviations trigger D6 NC flow |
| BR-D3-16 | Recall replacement lot (D12) | T-14 trigger | WO type = RECALL_REPLACEMENT; expedite flag; priority = URGENT |
| BR-D3-17 | Subcontract-assisted production | Routing has `work_center.type = EXTERNAL` | D2 service PO triggered for external operation; WO suspended until service GRN |
| BR-D3-18 | Inter-facility production transfer | T-21: sister facility demand | WO result shipped as inter-facility transfer; D1 SO equivalent created |
| BR-D3-19 | Continuous process (process industry) | Item with `production_type = CONTINUOUS` | WO spans shift boundary; partial confirmations per shift; lot created at batch end |
| BR-D3-20 | Discrete-to-batch hybrid | Assembly using batch-produced components | Component lots from batch WO reserved into discrete assembly WO |

---

## §7 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | MRP generates planned order that conflicts with frozen zone | MRP exception message only; planner must manually action; no auto-firm in frozen zone |
| EC-02 | BOM revision changes while WO is in_progress | WO locked to BOM revision at release time; change handled via rework or scrap of in-progress material; ECO impact assessed |
| EC-03 | Work center capacity exhausted; all alternates also loaded | Planner receives `CRP_OVERLOAD_CRITICAL` alert; AI-07 suggests subcontract option; BD-14 approval if subcontract cost exceeds threshold |
| EC-04 | Component lot fails IQC after WO material reservation | Reservation invalidated; G3 gate blocks dispatch until replacement lot qualified; expedite signal to D2 |
| EC-05 | Operator trained but certification expired during WO | G1 gate HOLD on re-check; WO suspended until operator refresher completed or alternate operator assigned |
| EC-06 | Equipment calibration expires during WO execution | G2 gate HOLD on re-check; WO suspended; affected output since last confirmed calibration date flagged for re-inspection |
| EC-07 | Production yield significantly below standard (> scrap_threshold) | `LOW_YIELD_ALERT` triggered; supervisor investigation required; D5 in-process inspection escalated; CAPA consideration |
| EC-08 | Multiple WOs competing for same lot (FEFO conflict) | Reservation system grants lot to WO with earliest `customer_promise_date`; other WO shortage alert generated |
| EC-09 | ETO design changes released while WO is firm_planned | ECO change review: if BOM/routing change is material, WO cancelled and recreated; if cosmetic, WO amended in place |
| EC-10 | Pharma batch fails in-process test (J1) | EBR step flagged; QP review required; WO suspended; potential batch disposition decision (BD-7 if use-as-is) |
| EC-11 | ITAR operator cleared status revoked during WO (J3) | G6 gate HOLD immediately; WO suspended; security officer notification; operations covered by uncleared operator flagged for review |
| EC-12 | CCP deviation during production (J5) | HACCP CCP deviation triggers D6 NC; WO suspended at deviation step; food safety team disposition before resumption |
| EC-13 | WO completion exceeds planned duration > threshold | `CYCLE_TIME_EXCESS_ALERT`; OEE calculation uses actual vs. planned; efficiency variance captured; root cause analysis triggered |
| EC-14 | Demand cancellation after WO is in_progress | If material issued, cancellation requires WO completion with zero good output (scrap all); or rescheduling to alternate demand; planner decision |

---

## §8 Per-Pack Overlays

### J1 Pharma
- Every WO is driven by an approved Master Batch Record (MBR). The Electronic
  Batch Record (EBR) is system-generated from the MBR at WO creation.
- Each EBR step requires operator electronic signature and supervisor
  countersignature for critical steps (in-process weighing, dispensing,
  critical process parameters).
- In-process controls (IPCs) are defined in the MBR and enforced in the EBR:
  system prompts operator to enter measurement; values outside acceptance
  criteria automatically flag the step.
- Line clearance (before and after each batch) is a mandatory EBR checkpoint:
  no previous batch materials, labels, or product present.
- Yield reconciliation per MBR: actual yield must be within ±`yield_tolerance_pct`
  of theoretical yield. Out-of-tolerance yield triggers investigation and
  potential QP disposition.
- Batch Record Review (BRR): QA reviews complete EBR before batch release (D10).

### J2 Automotive
- Control plan monitoring: all CTQs (Critical-to-Quality characteristics) must
  have monitoring records per the approved control plan frequency. Missing
  monitoring records block WO completion confirmation.
- SPC data collection: for SPC-controlled characteristics, measurement values
  are stored in `spc_measurement` and evaluated for statistical control. Out-of-
  control signals trigger D6 NC process.
- PPAP lot tracking: WOs flagged as PPAP runs retain sample quantities per
  AIAG PPAP manual; samples linked to PPAP submission package.
- Production Part Approval: if PPAP status changes to `SUSPENDED` during
  production, G5 gate blocks new WO dispatch for the affected part.

### J3 Aerospace
- AS9102 First Article Inspection: first production lot (or first lot after
  process change) requires 100% dimensional and attribute inspection against
  the drawing. FAI record must be approved before subsequent lots can be
  released for shipment.
- Special process control: operations performed at NADCAP-accredited
  facilities have process certification records per operation. Non-NADCAP
  process data blocks WO closure.
- Serialized manufacturing: each unit receives a unique serial number at
  WO creation; `serial_number` records link to unit-level traveler.
- SLLP (Safety Life Limited Part) tracking: life-cycle hours/cycles counter
  created on each SLLP serial number at first production; counter increment
  per aircraft operation record.

### J4 Medical Device
- Design History File (DHF) cross-reference: WO references DHF record;
  any change in production BOM or routing that affects the design requires
  ECO + DHF update before WO release.
- UDI assignment: finished device lots assigned UDI-DI (device identifier)
  from item master and UDI-PI (production identifier = lot + expiry date) at
  WO receipt; `udi_record` created for each lot.
- Sterilization cycle link: if device requires sterilization, WO completion
  triggers sterilization work order (D9 / SM-CAL sequence); device lot held
  until sterilization cycle record released.
- IQ/OQ/PQ for equipment: any new or relocated production equipment must
  complete Installation, Operational, and Performance Qualification before
  being eligible for WO dispatch (G2 gate check).

### J5 Food Safety
- CCP monitoring: for each production step identified as a CCP in the HACCP
  plan, the system generates a `ccp_monitoring_record` at the start of each
  production run. Operators enter CCP parameter values (temperature, pH,
  water activity, metal detection pass/fail); values evaluated against
  critical limits.
- Allergen changeover: if sequential WOs involve allergen switch, the
  system enforces a `allergen_changeover_sop_completed = true` checkpoint
  before WO release (G7 gate).
- FSMA §204 CTE: WO completion creates a `cte_transformation` Critical
  Tracking Event recording: input TLCs, output TLC, facility, date, and
  transformation type.
- Organic integrity: if WO output is organic-certified, all input lots must
  have `organic_certified = true`; mixing with non-organic components triggers
  G3 gate HOLD.

---

## §9 Banned Decision Boundaries

| BD | Description | Trigger | API Enforcement |
|----|------------|---------|----------------|
| BD-2 | Disposition of non-conforming product (production scrap > threshold) | `actual_scrap_qty > bd_2_scrap_threshold` at WO confirmation | `POST /api/v1/production/wo/{id}/confirm` → 403 if BD-2 e-sig absent |
| BD-7 | Use-as-is disposition on non-conforming in-process material | In-process inspection result: USE_AS_IS | `POST /api/v1/inspection/disposition` → 403 without Quality Director e-sig |
| BD-14 | Subcontract production decision exceeding cost threshold | WO subcontract branch: service PO value > bd_14_threshold | `POST /api/v1/procurement/po/{id}/approve` → 403 without Operations Director e-sig |

---

## §10 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-05 Demand Sensing | MPS consensus (Step 1) | Demand forecast accuracy improvement; exception detection in forecast vs. actuals |
| AI-06 Production Scheduling | CRP load leveling (Step 4) | Optimized WO sequence to minimize changeovers, maximize OEE; bottleneck prediction |
| AI-07 Supply Risk | Material shortage detection (Step 6) | Alternative component sourcing suggestions; shortage impact on promise dates |
| AI-08 Predictive Maintenance | Equipment eligibility gate G2 | Next-failure prediction; advisory on deferring WO until after PM to avoid in-progress stoppage |

---

## §11 Cross-Workflow Couplings

| Coupled Workflow | Coupling Type | Direction |
|-----------------|--------------|-----------|
| D1 Order to Cash | SO demand drives MPS T-01; production completion enables ATP | D1 → D3 (demand); D3 → D1 (availability) |
| D2 Procurement to Pay | MRP net requirements trigger D2 purchase signals | D3 → D2 (demand) |
| D4 Receive to Inspect | GRN of purchased components feeds component availability | D2/D4 → D3 |
| D5 Inspect to Disposition | In-process inspection steps triggered within WO execution | D3 → D5 (trigger); D5 → D3 (result) |
| D8 Train to Qualify | G1 training gate consumes training records | D8 → D3 (prerequisite) |
| D9 Maintain to Restore | G2 equipment gate consumes equipment status | D9 → D3 (prerequisite); D3 → D9 (planned PM trigger) |
| D10 Batch to Release | Pharma WO completion feeds batch release process | D3 → D10 (J1) |
| D12 Complaint to Recall | Recall replacement production triggered by D12 | D12 → D3 (trigger) |
| C5 Inventory | Material reservation; backflush; finished goods receipt | D3 ↔ C5 |
| C6 MES Execution | Operation-level execution events; OEE data | C6 ↔ D3 |
| C11 Finance | WIP cost accumulation; variance posting; standard cost | D3 → C11 |

---

## §12 KPIs and Metrics

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D3-01 | Schedule Attainment | WOs completed on or before `planned_end_date` / total WOs × 100 | ≥ 95% |
| KPI-D3-02 | MPS Stability Index | % of MPS lines unchanged in frozen zone per week | ≥ 98% (frozen zone) |
| KPI-D3-03 | MRP Exception Message Rate | Exception messages / planned orders × 100 | ≤ 5% (target low nervousness) |
| KPI-D3-04 | Overall Equipment Effectiveness (OEE) | Availability × Performance × Quality | ≥ 85% |
| KPI-D3-05 | First Pass Yield (FPY) | Units passing all operations without rework / total starts × 100 | ≥ 97% |
| KPI-D3-06 | Scrap Rate | Scrap qty / total production qty × 100 | ≤ 1% |
| KPI-D3-07 | WO Cycle Time Efficiency | Standard cycle time / actual cycle time × 100 | ≥ 90% |
| KPI-D3-08 | Material Shortage Impact | WOs delayed due to material shortage / total WOs × 100 | ≤ 3% |
| KPI-D3-09 | Eligibility Resolver HOLD Rate | WOs blocked at dispatch by eligibility resolver / total WO releases × 100 | ≤ 5% |
| KPI-D3-10 | Capacity Utilization (Bottleneck) | Actual hours / available hours at bottleneck work center × 100 | 80–90% |
| KPI-D3-11 | WIP Turns | Annualized cost of goods manufactured / average WIP inventory value | ≥ target by industry |
| KPI-D3-12 | Labor Efficiency Variance | (Actual hours − standard hours) × standard rate, as % of standard labor cost | ≤ ±5% |
| KPI-D3-13 | Material Usage Variance | (Actual qty − standard qty) × standard cost, as % of standard material cost | ≤ ±3% |
| KPI-D3-14 | EBR Completion Rate (J1) | EBR steps completed with e-signature on time / total required EBR steps × 100 | 100% |
| KPI-D3-15 | CCP Deviation Rate (J5) | CCP monitoring records with deviation / total CCP monitoring records × 100 | ≤ 0.1% |
| KPI-D3-16 | PPAP First-Time Approval Rate (J2) | PPAP submissions approved first submission / total PPAP submissions × 100 | ≥ 85% |

---

## §13 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | MPS instability — excessive replanning in firm zone | Demand forecast errors; last-minute SO changes | MPS stability KPI; planner daily review | Improve forecast accuracy; enforce SO confirmation lead times |
| FM-02 | WO release blocked by training expiry (G1 HOLD) | Training renewal not scheduled proactively | Eligibility resolver HOLD rate KPI | Training expiry alerts 60/30/14 days before; auto-schedule refresher |
| FM-03 | Component shortage mid-WO (G3 retroactive) | IQC fail on reserved lot after WO started | Material shortage KPI; WO suspended | Supplier IQC performance monitoring; safety stock for critical components |
| FM-04 | Capacity overload on bottleneck | Demand spike; equipment downtime | CRP overload alert; OEE KPI | Overtime authorization; subcontract option (BD-14 check); load leveling |
| FM-05 | Backflush error — wrong lot consumed | Lot substitution without system transaction | Inventory reconciliation; physical count | Enforce scan-based issuance for critical components; disable free-text lot entry |
| FM-06 | EBR step skipped or signed out of sequence (J1) | Operator workflow error; system bypass | EBR step sequence enforcement | EBR system enforces sequential unlock; prior step e-sig required before next |
| FM-07 | FAI not completed before shipment (J3) | Scheduling pressure; oversight | FAI gate G7; shipping system block | System blocks shipping transaction on FAI-required lots until FAI record APPROVED |
| FM-08 | PPAP run sample not retained (J2) | Sample reservation not honored | PPAP audit; retention count | System-enforced sample reservation; physical label with PPAP sample flag |
| FM-09 | CCP limit breach unreported (J5) | Operator fails to record deviation | CCP monitoring rate KPI; audit | CCP monitoring system-enforced at each step; no proceed without entry |
| FM-10 | WO completion confirmation with overstated yield | Operator reports higher qty to meet target | Variance alert on positive yield vs. scrap | System cross-checks: material issued qty × yield factor = expected output |
| FM-11 | Scrap disposed incorrectly (BD-2 bypass) | Supervisor overrides scrap threshold without e-sig | BD-2 enforcement; QMS audit | Hard API block; audit log; QMS alert on BD bypass attempt |
| FM-12 | Equipment calibration gap during WO execution | Calibration due date missed; system not updated | G2 gate on re-check; calibration KPI | Calibration expiry alert before WO dispatch; auto-hold if calibration lapses |
| FM-13 | UDI assignment missed (J4) | WO receipt without UDI generation | UDI registration completeness check | WO confirmation API enforces UDI assignment before status → completed |
| FM-14 | Rework loop exceeds max cycles | Chronic process deficiency | FPY KPI; rework rate trend | After n rework cycles, CAPA (D6) automatically triggered; process capability study |

---

*Decision phrase: S2-08_D2_D3_DEEP_UPGRADE_COMPLETE*

# C3 — Planning & Production

```
domain_code:    D-03
domain_name:    Planning & Production
owner_role:     Planning Lead (with Production Lead for dispatch)
primary_state_machine: SM-10 Job and Work Order machine
```

---

## 1. Purpose

The Planning & Production domain is the bridge from demand (D-01
Commercial) to making things (D-06 Shopfloor / MES). It answers: what
should we make this week, on which equipment, in what sequence, with
what materials, by whom. Without good planning, capacity is wasted or
demand is missed.

---

## 2. The roots within this domain

```
Master Production Schedule (MPS) The plan of what is produced when, at the
                                  product family level. Drives MRP.

Material Requirements Planning   The calculation of what materials are
   (MRP) Result                 needed when, based on MPS and inventory.

Capacity Plan                    The assessment of available capacity
                                  (equipment, labor) versus demand.

Schedule (Finite Schedule)      The finite-capacity scheduled timeline
                                  for jobs and work orders, often per
                                  bottleneck or per work cell.

Dispatch List                    The projection that tells the floor what
                                  to run today (dispatch is L6 / projection
                                  surface; the underlying records are JOs
                                  and WOs).

Kit                              The gathered set of components physically
                                  assembled and ready for an operation.
```

---

## 3. The capabilities within this domain

### CAP-C3-01 — Master Production Scheduling

**Purpose.** Produce the time-phased plan of finished-goods production
based on Sales Orders, forecasts, safety stock, and capacity.

**Lifecycle.** MPS is generated periodically (weekly typical, daily for
dynamic shops). Reviewed by master scheduler. Released. Re-generated
when material conditions change.

**Wave target.** L4 by W5; L5 by W5.

**Acceptance evidence.** MPS reflects current sales order book. Capacity
constraints visible. Master scheduler can adjust manually.

### CAP-C3-02 — Material Requirements Planning

**Purpose.** Compute the material needs over time based on MPS, BOM, and
on-hand inventory. Produce purchase requisitions for supplier-procured
items and production orders for in-house items.

**Lifecycle.** MRP run is triggered by MPS release or by significant
inventory event. MRP output reviewed and released to procurement and
production.

**Wave target.** L4 by W5; L5 by W5.

**Acceptance evidence.** MRP correctly nets demand against inventory.
Lead times respected. Lot-sizing rules applied. Pegging visible (which
demand drives which supply).

### CAP-C3-03 — Capacity Planning

**Purpose.** Assess available capacity (equipment hours, labor hours,
calendar availability) against the demand from MPS / MRP. Surface
overload (insufficient capacity) and underload (idle capacity).

**Lifecycle.** Capacity plan generated alongside MPS. Reviewed by
operations manager. Adjustments propagate to MPS or trigger demand
deferrals.

**Wave target.** L4 by W5; L5 by W5.

### CAP-C3-04 — Finite-Capacity Scheduling

**Purpose.** Generate a feasible time-sequenced schedule respecting
finite capacity, sequence dependencies, setup times, and constraint
bottlenecks. Often via Theory of Constraints (TOC) or Advanced Planning
and Scheduling (APS) algorithms.

**Lifecycle.** Schedule is regenerated daily or per shift. Manual
overrides permitted by master scheduler.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C3-05 — Dispatch List

**Purpose.** Produce the daily or shift-level dispatch list for each
work cell or equipment, telling operators what to run next.

**Lifecycle.** Dispatch list is a projection refreshed continuously from
the schedule. Operators acknowledge work-start; supervisors can
re-sequence within the same shift.

**Wave target.** Already at L3 (existing slice in HMV4). L4 by W4.

**Acceptance evidence.** Dispatch list reflects current schedule.
Operator acknowledgment respected. Re-sequencing logged.

### CAP-C3-06 — Kitting

**Purpose.** Stage the components for an operation by gathering the
correct quantities of correct items from inventory and presenting them
to the operator at the work cell.

**Lifecycle.** Kit request generated when a job is released. Components
picked from inventory. Kit transported to work cell. Operator confirms
kit complete before starting operation.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C3-07 — Constraint Management (TOC)

**Purpose.** Identify the bottleneck process and ensure that scheduling
maximizes throughput at the bottleneck per Theory of Constraints
discipline.

**Lifecycle.** Bottleneck identified analytically; protected with buffer
inventory; downstream paced accordingly.

**Wave target.** L4 by W6; L5 by W8 (often customer-configured).

---

## 4. Workflows

Primary in: D3 Plan to Produce.

Participant in: D1 Order to Cash, D2 Procurement to Pay (through MRP
purchase requisitions).

---

## 5. APIs

```
- MPS API
- MRP API (read-mostly; runs are scheduled)
- Capacity Plan API
- Schedule API
- Dispatch List API (projection)
- Kit API
```

---

## 6. Frontend surfaces

```
- MPS Workspace (projection: MPS by family by week)
- MRP Workspace (projection: MRP results, exceptions)
- Capacity Plan Workspace (projection: utilization heatmap)
- Schedule Workspace / Gantt (projection: visual timeline)
- Dispatch List Workspace (projection: today's dispatch per cell)
- Kitting Workspace (projection: kits to pick today)
```

---

## 7. Cross-cutting concerns most relevant

- C8 Observability per scheduling cycle
- C5 Idempotency on MRP runs (same trigger doesn't run twice)
- C9 Performance budget on schedule recompute (must complete within
  shift window)
- C11 AI advisory: AI may suggest schedule alternatives but never
  autonomously commits a schedule (planner approves)

---

## 8. Wave assignments

```
MPS                L4 W5; L5 W5
MRP                L4 W5; L5 W5
Capacity Plan      L4 W5; L5 W5
Schedule           L4 W6; L5 W6
Dispatch List      L4 W4; L5 W4 (already advanced; HMV4 baseline)
Kit                L4 W6; L5 W6
Constraint Mgmt    L4 W6; L5 W8
```

---

## 9. Standards

```
- APICS / ASCM body of knowledge (CPIM, CSCP)
- ISO 9001:2015 §8.5 (Production and service provision)
- IATF 16949 §8.5 (Production for automotive)
- AS9100D §8.5 (Production for aerospace)
- ISA-95 part 4 (Operations management activities; production scheduling)
```

---

## 10. Boundary with adjacent domains

- **D-01 Commercial**: SO confirmation drives MPS.
- **D-02 Engineering**: BOM and Routing drive MRP and Schedule.
- **D-04 Procurement**: MRP purchase requisitions become POs.
- **D-05 Inventory**: MRP nets against on-hand inventory.
- **D-06 Production**: Schedule drives Job Order release.
- **D-09 Maintenance**: Equipment availability windows respected in
  scheduling.

---

## 11. Decision phrase

```
C3_PLANNING_PRODUCTION_BASELINE_LOCKED
NEXT: C4_PROCUREMENT.md
```

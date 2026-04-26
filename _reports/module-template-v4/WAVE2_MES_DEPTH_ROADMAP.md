# WAVE 2 — MES Depth + Quality Vertical Closure Roadmap

**Companion to**: `STRATEGIC_MASTER_V2_WORLDCLASS.md` Part 4
**Duration**: 12 weeks
**Goal**: Make HESEM a credible MES + complete the EQMS pillar

---

## Wave 2 net-new entities (8 roots + 6 workspaces)

### Roots (each becomes a Slice)

#### Slice 19: EQUIP — Equipment Master
**Why first**: ISA-95 anchor. Every OEE event, downtime event, SPC run is keyed to an equipment.

**Pattern**: AR transactional/master-data
**Tabs**: overview | hierarchy | location | calibration-status | maintenance-status | events | related | audit
**Lifecycle**: registered → in-service → in-maintenance → retired
**Backend canonical**: `/api/v1/equipment` (already in Step 3 family tokens — 5th dependency root)
**Bridge alias**: `equipment`, `asset`, `machine`

#### Slice 20: OEEEVT — OEE Event
**Why**: Real-time pipeline anchor. Every state transition (running, idle, setup, maintenance) is an event.

**Pattern**: AR transactional + WS workspace (event stream)
**Tabs**: overview | event-detail | linked-equipment | linked-shift | related | audit
**Workspace**: live OEE dashboard with rollup (equipment / line / site)
**Backend canonical**: `/api/v1/oee-events`
**Real-time**: subscribed to event bus topic `oee.events.{equipment_id}`

#### Slice 21: DOWNTIME — Downtime Reason
**Why**: Pareto + fishbone analysis driver. Categorized downtime feeds OEE.

**Pattern**: AR transactional
**Tabs**: overview | reason-tree | linked-equipment | impact-analysis | related | audit
**Reason tree**: hierarchical (planned/unplanned, internal/external, mechanical/electrical/operator)
**Backend canonical**: `/api/v1/downtime-events`

#### Slice 22: SPCRUN — SPC Control Chart Run
**Why**: Statistical Process Control closes the gap to A.4 capability.

**Pattern**: AR transactional + WS workspace (chart)
**Tabs**: overview | control-chart | violation-rules | capability-indices | linked-process | audit
**Workspace**: live chart with X-bar/R, EWMA, CUSUM, p, np, c, u variants
**Backend canonical**: `/api/v1/spc-runs`
**Server-side compute**: control limits, Cp/Cpk/Pp/Ppk, Western Electric rule violations

#### Slice 23: CAL — Calibration Record
**Why**: ISO 9001 / ISO 17025 mandates. Closes B.6 capability.

**Pattern**: AR governed-quality
**Tabs**: overview | calibration-data | acceptance-criteria | certificate | linked-equipment | audit | signatures
**Lifecycle**: due → in-progress → passed → out-of-tolerance | failed → recall-investigation
**Backend canonical**: `/api/v1/calibration-records`
**Bridge alias**: `calibration`, `cal`, `metrology`

#### Slice 24: FMEA — Failure Mode Analysis
**Why**: ISO 9001 / IATF 16949 / ISO 14971 mandates risk management.

**Pattern**: AR governed-quality + WS workshop (collaborative authoring)
**Tabs**: overview | failure-modes | severity-occurrence-detection | rpn-analysis | actions | related | audit
**Variants**: DFMEA (design), PFMEA (process), HACCP (food)
**Backend canonical**: `/api/v1/fmea-worksheets`

#### Slice 25: VAL — Validation Run
**Why**: GAMP 5 / 21 CFR Part 820 / IEC 62304 mandates IQ/OQ/PQ.

**Pattern**: AR governed-quality
**Tabs**: overview | iq-protocol | oq-protocol | pq-protocol | deviations | linked-equipment | signatures | audit
**Lifecycle**: planned → iq-running → iq-complete → oq-running → oq-complete → pq-running → pq-complete → validated → revalidation-due
**Backend canonical**: `/api/v1/validation-runs`

#### Slice 26: COMPLAINT — Customer Complaint
**Why**: B.11 capability. Triggers NQCASE/CAPA.

**Pattern**: AR governed-quality
**Tabs**: overview | complaint-detail | classification | investigation | resolution | linked-records | signatures | audit
**Bridge to**: NQCASE (escalation), CAPA (corrective action)
**Backend canonical**: `/api/v1/customer-complaints`

### Workspaces (each becomes a slice; uses live event bus or read-models)

#### Slice 27: Andon Tower
**Pattern**: WS projection + real-time event subscription
**Route**: `/ops/shopfloor-execution/andon/tower`
**Renders**: Live floor map with equipment status, in-progress jobs, active alarms, escalation timer
**Subscribes**: `equipment.status.*`, `alarm.raised.*`, `escalation.timer.*`

#### Slice 28: OEE Dashboard
**Pattern**: WS projection
**Route**: `/ops/shopfloor-execution/oee/dashboard`
**Renders**: Equipment-line-site OEE rollup, downtime Pareto, top scrap reasons
**Subscribes**: `oee.events.*`, `downtime.events.*`, `scrap.events.*`

#### Slice 29: SPC Chart Workspace
**Pattern**: WS projection
**Route**: `/ops/quality-compliance/spc/charts`
**Renders**: Live SPC chart for selected characteristic; multiple chart types
**Subscribes**: `spc.run.update.{run_id}`

#### Slice 30: Calibration Schedule
**Pattern**: WS projection
**Route**: `/ops/maintenance-reliability/calibration/schedule`
**Renders**: Calendar of calibrations due/overdue per equipment, drill-down to CAL record
**Backed by**: Read-model from CAL records + EQUIP master + interval rules

#### Slice 31: FMEA Workshop
**Pattern**: WS draft (collaborative authoring with co-presence)
**Route**: `/ops/quality-compliance/fmea/workshop/{workshop_id}`
**Renders**: Multi-user editing of FMEA worksheet with auto-save, presence indicators
**Real-time**: WebSocket or SSE for co-edit (CRDT or operational transform)

#### Slice 32: Operator Mobile Console
**Pattern**: WS workspace mobile-first
**Route**: `/ops/mobile/operator-console` (PWA shell)
**Renders**: My WO list, scan barcode, record completion, view work instructions, Andon button
**Offline**: Service worker caches assigned WOs; sync on reconnect

---

## Wave 2 platform/spine extensions

### Real-time event bus (4 weeks)
```
Existing: RabbitMQ (Phase 1 mentioned)
Extend with:
  - Topic taxonomy: oee.events.*, downtime.events.*, alarm.raised.*, scrap.events.*, equipment.status.*, calibration.due.*
  - Subscriber pattern: HMV4 hydration extends with EventSource bridge
  - Replay log for reconnect
  - Backpressure for slow subscribers
```

### Equipment connector framework (4 weeks)
```
Plugin contract:
  - Adapter per equipment type (OPC UA, MQTT, Modbus, custom HTTP)
  - Heartbeat
  - Tag mapping (raw signal → semantic tag)
  - Health monitoring
Reference adapters:
  - Siemens S7 (SIMATIC) via OPC UA
  - Rockwell Logix5000 via OPC UA
  - Mitsubishi MELSEC via OPC UA or SLMP
  - Generic Modbus TCP
```

### Statistical engine (3 weeks)
```
Library: PHP-side numerics (or microservice in Python with NumPy)
Compute:
  - Control limits (X-bar/R, EWMA, CUSUM, p, np, c, u)
  - Capability indices Cp/Cpk/Pp/Ppk
  - Western Electric runs rules
  - Process distribution fit (normality, Anderson-Darling)
  - Pareto analysis
Endpoints:
  POST /api/v1/spc-engine/compute
  GET  /api/v1/spc-engine/charts/{run_id}
```

### Mobile shell + offline-first sync (4 weeks)
```
PWA shell:
  - Service worker with cache strategy
  - IndexedDB for offline data
  - Background sync API
  - Push notifications (Firebase or webpush)
Slice template for mobile:
  - Touch-first interactions
  - Smaller viewport adaptation
  - Offline mode indicator
  - Queue mutation requests, replay on reconnect
ADR-0017: Offline-first sync queue contract
```

---

## Wave 2 ADRs (8 new)

```
ADR-0014: Real-time event subscription pattern
ADR-0015: Statistical chart component contract (chart types, control rules)
ADR-0016: Mobile slice contract (PWA shell, viewport, touch)
ADR-0017: Offline-first sync queue
ADR-0018: Equipment connector framework (plugin contract)
ADR-0019: ISA-95 entity model alignment (equipment, segment, lot, schedule)
ADR-0020: SPC chart kinds + violation rules
ADR-0021: Vertical compliance pack contract (preview for Wave 4)
```

---

## Wave 2 timeline (12 weeks parallel)

```
Week 1-2:    Slice 19 EQUIP (foundation)
             ADR-0014, ADR-0015, ADR-0016
             Statistical engine spike

Week 3-4:    Slice 20 OEEEVT
             Slice 21 DOWNTIME
             Event bus subscriber framework

Week 5-6:    Slice 22 SPCRUN (with statistical engine integration)
             Slice 27 Andon Tower workspace
             Equipment connector reference (Siemens S7)

Week 7-8:    Slice 23 CAL
             Slice 28 OEE Dashboard workspace
             Slice 30 Calibration Schedule workspace

Week 9-10:   Slice 24 FMEA
             Slice 25 VAL
             Slice 31 FMEA Workshop (with WebSocket)

Week 11-12:  Slice 26 COMPLAINT
             Slice 29 SPC Chart workspace
             Slice 32 Operator Mobile Console
             Wave 2 integration QA + ADRs frozen
```

**Wave 2 closure deliverables**:
- 8 new roots + 6 new workspaces = 14 new HMV4 surfaces (total ~30 surfaces)
- 8 new ADRs (total ~22)
- Real-time event bus operational
- Equipment connector reference
- Statistical engine
- Mobile PWA shell baseline
- ~400+ E2E tests
- ISO 9001 / 21 CFR Part 11 / GAMP 5 / IATF 16949 partial compliance evidence

```
WAVE2_GO_GATE: WAVE_1_CLOSED + ADR-0013-0021_PROPOSED + USER_APPROVED_D1_D5
```

# C6 — Shopfloor MES & Manufacturing Execution

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-03_C5_C6_INVENTORY_SHOPFLOOR  
**Supersedes:** V9 C6_SHOPFLOOR_MES.md  

---

## 1. Domain Purpose and Boundaries

C6 is the Level 3 layer of the ISA-95 manufacturing hierarchy. It accepts work orders released from Level 4 (C3 Planning) and executes them against physical resources — work centers, operators, materials, and equipment — recording every step with traceable evidence. C6 spans discrete, process, and hybrid manufacturing environments and adapts per-pack overlays to support pharmaceutical (batch, sterile), automotive (layered process audit), aerospace (first article, part-life tracking), food (HACCP, allergen, sanitation), and medical device (sterilization, UDI application) execution modes.

**Domain boundaries:**

| Boundary | What C6 owns | What C6 consumes | What C6 produces |
|---|---|---|---|
| **Upstream** | — | Released WO from C3; BOM/Routing from C2; Reserved lots from C5 | — |
| **Downstream** | — | — | Yield + scrap records to C5; Step evidence to C8 Traceability; SPC points to Analytics; NQ events to C7 Quality |
| **Shopfloor** | WO execution, step recording, yield, SPC | Operator identity from IAM; Equipment status from CMMS (C10) | Completion signals; audit entries |
| **Excluded** | WO creation authority, BOM/Routing definition, supplier quality, payroll | — | — |

---

## 2. Resource Families

### 2.1 Core Execution Resources

**WorkOrder (WO)**

| Field | Type | Notes |
|---|---|---|
| wo_id | UUID PK | Immutable once created |
| wo_number | VARCHAR(30) | Display key, unique per site |
| so_line_id | UUID FK | nullable — links to C1 SO |
| item_id | UUID FK | C2 item being produced |
| bom_revision_id | UUID FK | BOM used for this run |
| routing_id | UUID FK | Routing used for this run |
| planned_qty | DECIMAL(18,6) | |
| completed_qty | DECIMAL(18,6) | updated on operation completion |
| scrap_qty | DECIMAL(18,6) | |
| uom | VARCHAR(10) | |
| planned_start | TIMESTAMPTZ | |
| planned_finish | TIMESTAMPTZ | |
| actual_start | TIMESTAMPTZ | null until first dispatch |
| actual_finish | TIMESTAMPTZ | null until completion |
| status | ENUM | planned, dispatched, in_progress, paused, suspended, completed, cancelled |
| site_id | UUID FK | |
| shift_id | UUID FK | nullable |
| priority | SMALLINT | 1–99 |
| batch_number | VARCHAR(60) | pharma/food batch identifier |
| lot_id | UUID FK | output lot created |
| campaign_id | UUID FK | nullable — links to pharma campaign |
| itar_controlled | BOOLEAN | flag set by C2 Item |
| pack_overlay | JSONB | pack-specific metadata store |
| created_by | UUID FK | |
| created_at | TIMESTAMPTZ | |

**WO Operation**

| Field | Type | Notes |
|---|---|---|
| wo_op_id | UUID PK | |
| wo_id | UUID FK | |
| routing_op_id | UUID FK | template |
| op_seq | SMALLINT | execution sequence |
| work_center_id | UUID FK | |
| planned_labor_hrs | DECIMAL(10,4) | |
| actual_labor_hrs | DECIMAL(10,4) | |
| planned_machine_hrs | DECIMAL(10,4) | |
| actual_machine_hrs | DECIMAL(10,4) | |
| status | ENUM | pending, ready, active, completed, skipped |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| operator_ids | UUID[] | array — multi-operator support |
| equipment_id | UUID FK | nullable — specific machine |
| scrap_qty | DECIMAL(18,6) | at-operation scrap |
| yield_qty | DECIMAL(18,6) | |
| nc_count | INTEGER | NQ events opened at this operation |

**WO Step**

| Field | Type | Notes |
|---|---|---|
| wo_step_id | UUID PK | |
| wo_op_id | UUID FK | |
| step_seq | SMALLINT | |
| step_type | ENUM | process_parameter, inspection, material_issue, sign_off, quality_hold, itar_acknowledgment |
| instruction_text | TEXT | from routing step template |
| actual_value | TEXT | recorded value |
| uom | VARCHAR(10) | |
| lower_spec_limit | DECIMAL | |
| upper_spec_limit | DECIMAL | |
| status | ENUM | pending, completed, skipped, failed |
| completed_by | UUID FK | |
| completed_at | TIMESTAMPTZ | |
| evidence_file_id | UUID | linked document/image |
| spc_chart_id | UUID FK | nullable — if step feeds SPC |

**Operation (Work Center)**

| Field | Type | Notes |
|---|---|---|
| operation_id | UUID PK | |
| work_center_id | UUID FK | |
| operation_code | VARCHAR(20) | |
| operation_name | VARCHAR(100) | |
| default_cycle_time_s | DECIMAL(10,2) | |
| setup_time_s | DECIMAL(10,2) | |
| valid_equipment_ids | UUID[] | |
| required_skill_codes | VARCHAR[] | |
| spc_parameter_keys | VARCHAR[] | SPC charts attached |
| pack_constraints | JSONB | e.g. {j1_requires_ebr: true} |

**Yield Record**

| Field | Type | Notes |
|---|---|---|
| yield_record_id | UUID PK | |
| wo_op_id | UUID FK | |
| recorded_at | TIMESTAMPTZ | |
| good_qty | DECIMAL(18,6) | |
| scrap_qty | DECIMAL(18,6) | |
| rework_qty | DECIMAL(18,6) | |
| scrap_reason_codes | VARCHAR[] | |
| operator_id | UUID FK | |
| equipment_id | UUID FK | |

**SPC Chart**

| Field | Type | Notes |
|---|---|---|
| spc_chart_id | UUID PK | |
| chart_type | ENUM | xbar_r, xbar_s, individuals, p_chart, np_chart, c_chart, u_chart, cusum, ewma |
| parameter_key | VARCHAR(60) | |
| item_id | UUID FK | nullable |
| work_center_id | UUID FK | nullable |
| usl | DECIMAL | upper spec limit |
| lsl | DECIMAL | lower spec limit |
| ucl | DECIMAL | upper control limit (computed) |
| lcl | DECIMAL | lower control limit (computed) |
| subgroup_size | SMALLINT | |
| rule_set | VARCHAR[] | e.g. ['WE_1','WE_2','NE_5'] |
| active | BOOLEAN | |

**SPC Sample**

| Field | Type | Notes |
|---|---|---|
| spc_sample_id | UUID PK | |
| spc_chart_id | UUID FK | |
| wo_op_id | UUID FK | |
| sampled_at | TIMESTAMPTZ | |
| values | DECIMAL[] | raw measurements |
| subgroup_mean | DECIMAL | |
| subgroup_range | DECIMAL | |
| violation_rules | VARCHAR[] | which WE/Nelson rules fired |
| cpk | DECIMAL | computed if sufficient data |
| alert_sent | BOOLEAN | |

**First-Piece Inspection**

| Field | Type | Notes |
|---|---|---|
| fpi_id | UUID PK | |
| wo_id | UUID FK | |
| wo_op_id | UUID FK | |
| inspected_at | TIMESTAMPTZ | |
| inspector_id | UUID FK | |
| characteristics_checked | INTEGER | |
| conforming | BOOLEAN | |
| nc_items | JSONB | array of failing characteristic + value |
| disposition | ENUM | approved, rejected, conditionally_approved |
| approved_by | UUID FK | |
| approved_at | TIMESTAMPTZ | |

### 2.2 Edge / Connectivity Resources

**Edge Gateway**

| Field | Type | Notes |
|---|---|---|
| gateway_id | UUID PK | |
| gateway_code | VARCHAR(30) | |
| site_id | UUID FK | |
| protocol | ENUM | opc_ua, mqtt, modbus_tcp, s7, fins, profinet |
| endpoint_url | VARCHAR(300) | |
| status | ENUM | offline, connecting, online, error |
| last_heartbeat | TIMESTAMPTZ | |
| certificate_thumbprint | VARCHAR(64) | mTLS |
| firmware_version | VARCHAR(30) | |
| tag_count | INTEGER | subscribed tags |
| buffer_capacity_s | INTEGER | local store-forward seconds |

**Edge Gateway Site**

| Field | Type | Notes |
|---|---|---|
| site_id | UUID FK PK | |
| gateway_ids | UUID[] | ordered array |
| redundancy_mode | ENUM | none, active_standby, load_balanced |
| retry_policy | JSONB | max_attempts, backoff_ms |

**SCADA Connection**

| Field | Type | Notes |
|---|---|---|
| scada_conn_id | UUID PK | |
| gateway_id | UUID FK | |
| scada_system | VARCHAR(60) | e.g. Ignition, Wonderware, WinCC |
| tag_mappings | JSONB | array of {scada_tag, hesem_parameter_key, transform_expr} |
| packeml_state_topic | VARCHAR(200) | MQTT topic for PackML state |
| active | BOOLEAN | |

**Workcell**

| Field | Type | Notes |
|---|---|---|
| workcell_id | UUID PK | |
| workcell_code | VARCHAR(20) | |
| work_center_id | UUID FK | |
| packml_state | ENUM | stopped, starting, idle, suspended, execute, stopping, aborting, aborted, clearing, holding, held, resetting, completing, complete |
| current_wo_op_id | UUID FK | nullable |
| oee_availability | DECIMAL(5,4) | rolling 8-hour |
| oee_performance | DECIMAL(5,4) | |
| oee_quality | DECIMAL(5,4) | |
| last_state_change | TIMESTAMPTZ | |
| downtime_reason | VARCHAR(100) | |

**Workcell State** (audit log of PackML transitions)

| Field | Type | Notes |
|---|---|---|
| wc_state_id | UUID PK | |
| workcell_id | UUID FK | |
| from_state | VARCHAR(30) | |
| to_state | VARCHAR(30) | |
| transitioned_at | TIMESTAMPTZ | |
| trigger_source | ENUM | operator, edge, auto, api |
| duration_ms | INTEGER | time spent in from_state |

### 2.3 Per-Pack Resources

**EBR — Electronic Batch Record (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| ebr_id | UUID PK | |
| wo_id | UUID FK | |
| batch_number | VARCHAR(60) | |
| product_id | UUID FK | |
| master_batch_record_id | UUID FK | approved template |
| status | ENUM | in_progress, pending_review, reviewed, released, rejected |
| isa88_phase | VARCHAR(40) | current ISA-88 phase |
| deviations | JSONB | array of {step_ref, description, impact} |
| reviewed_by | UUID FK | |
| released_by | UUID FK | |
| batch_disposition | ENUM | released, rejected, reprocessing |
| created_at | TIMESTAMPTZ | |

**Cleaning Validation Cycle (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| cleaning_cycle_id | UUID PK | |
| equipment_id | UUID FK | |
| cycle_type | ENUM | validation, routine, pre_campaign |
| cleaning_procedure_id | UUID FK | |
| previous_product | VARCHAR(60) | for carryover calc |
| next_product | VARCHAR(60) | |
| rinse_sample_results | JSONB | array of {sample_point, result_ppm, limit_ppm, pass} |
| visual_inspection_pass | BOOLEAN | |
| status | ENUM | in_progress, passed, failed, invalidated |
| performed_by | UUID FK | |
| witnessed_by | UUID FK | |
| completed_at | TIMESTAMPTZ | |

**EM Run — Environmental Monitoring Run (J1 Pharma Sterile)**

| Field | Type | Notes |
|---|---|---|
| em_run_id | UUID PK | |
| site_id | UUID FK | |
| cleanroom_zone | VARCHAR(30) | ISO class / EU GMP grade |
| wo_id | UUID FK | nullable — linked batch |
| sample_points | JSONB | array of {location, method, count, result_cfu, limit_cfu, pass} |
| particle_count_results | JSONB | ≥0.5µm + ≥5µm per ISO 14644 |
| status | ENUM | scheduled, in_progress, completed, out_of_limit |
| run_date | DATE | |
| analyst_id | UUID FK | |
| ool_investigation_id | UUID FK | nullable — links C7 NC |

**Media Fill Run (J1 Pharma Annex 1)**

| Field | Type | Notes |
|---|---|---|
| media_fill_id | UUID PK | |
| line_id | UUID FK | |
| fill_volume_ml | DECIMAL(10,3) | |
| units_filled | INTEGER | |
| units_incubated | INTEGER | |
| contaminated_units | INTEGER | |
| contamination_rate | DECIMAL(10,6) | |
| pass_threshold | DECIMAL(10,6) | regulatory limit |
| status | ENUM | in_progress, passed, failed |
| performed_date | DATE | |
| reviewed_by | UUID FK | |

**LPA Run (J2 Auto)**

| Field | Type | Notes |
|---|---|---|
| lpa_run_id | UUID PK | |
| lpa_plan_id | UUID FK | |
| layer | SMALLINT | 1–5 (L1 operator, L2 team leader, L3 supervisor, L4 plant manager, L5 exec) |
| auditor_id | UUID FK | |
| work_center_id | UUID FK | |
| audit_date | DATE | |
| questions_asked | INTEGER | |
| nok_count | INTEGER | |
| findings | JSONB | array of {question_id, answer, observation} |
| status | ENUM | planned, completed, overdue |
| escalated_to_capa | BOOLEAN | |

**LPA Plan (J2 Auto)**

| Field | Type | Notes |
|---|---|---|
| lpa_plan_id | UUID PK | |
| work_center_id | UUID FK | |
| frequency_per_layer | JSONB | {L1: "daily", L2: "weekly", L3: "monthly"} |
| question_set_id | UUID FK | |
| active | BOOLEAN | |

**FAI Record (J3 Aero — AS9102)**

| Field | Type | Notes |
|---|---|---|
| fai_id | UUID PK | |
| wo_id | UUID FK | |
| item_id | UUID FK | |
| part_number | VARCHAR(40) | |
| drawing_revision | VARCHAR(10) | |
| fai_type | ENUM | full, partial_redesign, partial_new_source |
| form1_design_docs | JSONB | AS9102 Form 1 design documentation |
| form2_product_accounting | JSONB | AS9102 Form 2 |
| form3_characteristics | JSONB | AS9102 Form 3 — per-characteristic results |
| status | ENUM | in_progress, completed, approved, rejected |
| approved_by | UUID FK | DI/DAR authority |
| approved_at | TIMESTAMPTZ | |

**Service-Life-Limited Part Record (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| sllp_id | UUID PK | |
| serial_id | UUID FK | C5 serial number |
| item_id | UUID FK | |
| life_limit_type | ENUM | cycles, flight_hours, calendar_days, landings |
| life_limit_value | DECIMAL | |
| accumulated_value | DECIMAL | |
| remaining_value | DECIMAL | computed |
| last_update | TIMESTAMPTZ | |
| retirement_date | DATE | nullable |
| traceability_chain | UUID[] | full chain of custody serial IDs |

**Engine Maintenance Record (J3 Aero Part 145)**

| Field | Type | Notes |
|---|---|---|
| emr_id | UUID PK | |
| wo_id | UUID FK | |
| engine_serial | VARCHAR(40) | |
| maintenance_type | ENUM | scheduled, unscheduled, modification, repair |
| task_cards_completed | JSONB | array of {task_card_ref, completed_by, completed_at, sign_off} |
| airworthiness_release | BOOLEAN | |
| certifying_staff_id | UUID FK | CAA/FAA-licensed |
| release_date | DATE | |

**HACCP Plan + CCP Monitoring Record (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| haccp_plan_id | UUID PK | |
| product_category | VARCHAR(60) | |
| ccp_definitions | JSONB | array of {ccp_id, hazard_type, critical_limit, monitoring_freq_s, corrective_action} |
| version | INTEGER | |
| approved_by | UUID FK | PCQI |
| effective_date | DATE | |

| Field | Type | Notes |
|---|---|---|
| ccp_monitoring_id | UUID PK | |
| haccp_plan_id | UUID FK | |
| ccp_id | VARCHAR(20) | |
| wo_id | UUID FK | |
| monitored_at | TIMESTAMPTZ | |
| measured_value | DECIMAL | |
| critical_limit | DECIMAL | |
| limit_met | BOOLEAN | |
| corrective_action_taken | TEXT | |
| operator_id | UUID FK | |

**Allergen Control Plan (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| allergen_plan_id | UUID PK | |
| site_id | UUID FK | |
| allergen_matrix | JSONB | {allergen, zones_handled, run_order_required, dedicated_equipment} |
| changeover_procedure_id | UUID FK | |
| version | INTEGER | |

**Sanitation Record (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| sanitation_record_id | UUID PK | |
| site_id | UUID FK | |
| zone | VARCHAR(30) | |
| event_type | ENUM | pre_op, operational, post_op |
| sanitation_procedure_id | UUID FK | |
| performed_by | UUID FK | |
| performed_at | TIMESTAMPTZ | |
| atp_swab_results | JSONB | array of {sample_point, rlu, threshold, pass} |
| visual_pass | BOOLEAN | |
| status | ENUM | pass, fail, conditional |

**Process Authority Letter (J5 Food LACF)**

| Field | Type | Notes |
|---|---|---|
| pal_id | UUID PK | |
| item_id | UUID FK | |
| process_authority_name | VARCHAR(100) | |
| thermal_process_schedule | JSONB | {min_temp_f, min_time_min, ph_limit, aw_limit} |
| issued_date | DATE | |
| expires_date | DATE | nullable |
| document_file_id | UUID | |

**Pasteurization Record (J5 Food Grade A)**

| Field | Type | Notes |
|---|---|---|
| pasteurization_id | UUID PK | |
| wo_id | UUID FK | |
| batch_volume_liters | DECIMAL(12,3) | |
| min_temp_achieved_f | DECIMAL(6,2) | |
| min_hold_time_s | INTEGER | |
| pmmo_compliant | BOOLEAN | Grade A PMO check |
| recorder_chart_file_id | UUID | thermograph scan |
| operator_id | UUID FK | |
| completed_at | TIMESTAMPTZ | |

---

## 3. State Machines

### 3.1 SM-3 — Work Order Lifecycle

Seven states with full transition table:

| From State | To State | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `planned` | `dispatched` | `dispatch_wo` | Eligibility Resolver returns `GO`; lot reservation confirmed; planning period open | Set `actual_start` = null; notify workcell queue; emit `wo.dispatched` event |
| `dispatched` | `in_progress` | `start_first_operation` | Operator scans WO at workcell; equipment PackML = EXECUTE | Set `actual_start` = now; activate WO Operation seq 1 |
| `in_progress` | `paused` | `pause_wo` | Operator-initiated or auto-pause on shift end | Record pause reason; release workcell; preserve operation progress |
| `paused` | `in_progress` | `resume_wo` | Eligibility gates re-checked (equipment, operator continuity if required) | Resume active operation; log resume event |
| `in_progress` | `suspended` | `quality_hold` | NQ event requires WO suspension; or SPC out-of-control signal triggers hold | Set all active WO Operations to `suspended`; quarantine in-process lot in C5; open investigation in C7 |
| `suspended` | `in_progress` | `release_hold` | Quality disposition approved; suspension lifted | Reinstate active operations; release lot quarantine if appropriate |
| `in_progress` | `completed` | `complete_wo` | All WO Operations `completed`; yield recorded; first-piece approved; EBR released (J1); FAI approved (J3) | Set `actual_finish` = now; emit `wo.completed`; trigger C5 lot close; trigger C8 traceability chain close |
| `dispatched` | `cancelled` | `cancel_wo` | No operations started; cancellation authority confirmed | Release lot reservations in C5; emit `wo.cancelled`; log reason |
| `in_progress` | `cancelled` | `cancel_wo` | Partial execution; cancellation authority + scrap disposition confirmed | Record partial yield and scrap; release remaining reservations; emit `wo.cancelled` |
| `completed` | `cancelled` | — | Blocked — completed WOs cannot be cancelled; create a reversal transaction | Returns 409 with Problem Detail |

### 3.2 SM-CLEANING-V — Cleaning Validation Cycle (J1)

| State | Trigger → Next | Guard | Side-Effect |
|---|---|---|---|
| `scheduled` | `start_cleaning` → `in_progress` | Equipment cleared; operator certified | Begin cleaning procedure steps |
| `in_progress` | `submit_samples` → `awaiting_results` | All rinse sample points collected | Lock equipment from production use |
| `awaiting_results` | `enter_results` → `evaluating` | Lab results received | System calculates pass/fail per limit |
| `evaluating` | `approve` → `passed` | All results ≤ limit; visual pass; witnessed | Release equipment; record in cleaning log |
| `evaluating` | `reject` → `failed` | Any result > limit or visual fail | Trigger re-clean or equipment quarantine |
| `failed` | `re_initiate` → `scheduled` | Root cause assessed | Create new cycle; link predecessor |

### 3.3 SM-FAI — First Article Inspection (J3 Aero)

| State | Trigger → Next | Guard | Side-Effect |
|---|---|---|---|
| `initiated` | `start_measurement` → `in_progress` | CMM/measurement equipment calibrated | Attach AS9102 Form 3 template |
| `in_progress` | `submit_forms` → `pending_approval` | All three AS9102 forms complete | Notify DI |
| `pending_approval` | `approve` → `approved` | All characteristics within print tolerance | Emit `fai.approved`; allow production quantity build |
| `pending_approval` | `reject` → `rejected` | One or more characteristics out of tolerance | Trigger ECO review in C2; block production |
| `rejected` | `resubmit` → `in_progress` | Design or process corrected | New FAI iteration |

### 3.4 SM-LPA — Layered Process Audit Cycle (J2 Auto)

| State | Trigger → Next | Guard |
|---|---|---|
| `scheduled` | `start_audit` → `in_progress` | Auditor + layer + date assigned |
| `in_progress` | `submit_findings` → `completed` | All questions answered |
| `completed` | `escalate` → `capa_open` | NOK findings exceed threshold |
| `completed` | `close` → `closed` | No escalation needed |
| `overdue` | auto-escalate → `capa_open` | Audit not completed within window |

---

## 4. Capabilities

### CAP-C6-01 — Work Order Lifecycle (SM-3)

System manages WOs through SM-3's seven states. `dispatch_wo` is gated by the Eligibility Resolver (§5). Operations are executed in routing sequence; parallel operations are supported via op_seq ties. Each state transition is persisted as an immutable event row. `cancel_wo` on a completed WO returns 409; reversals must use a stand-alone scrap/return transaction.

Failure modes:
- **Partial completion on shift end**: System auto-pauses WO; resumes at next shift without data loss.
- **Equipment breakdown mid-operation**: WO transitions to `suspended`; downtime event recorded; equipment dispatch to C10 CMMS.

KPIs: On-time WO completion rate ≥ 97%; WO suspension rate (quality hold) < 2% of WOs.

### CAP-C6-02 — Eligibility Resolver (Canonical Gate)

The Eligibility Resolver is the canonical pre-dispatch gate. It evaluates seven gate categories in sequence. A single failing gate returns `HOLD` with an RFC 9457 Problem Detail identifying the specific blocking condition. All gates must return `PASS` for `dispatch_wo` to proceed.

Full specification in §5.

### CAP-C6-03 — Operation Step Execution and Per-Step Evidence

For each WO Operation, the system generates a step checklist from the routing step template. Operators complete steps in sequence; each step records: actual_value, completed_by, completed_at, evidence_file_id (optional). Steps with USL/LSL trigger auto-pass/fail evaluation. Steps of type `sign_off` require e-signature. Steps of type `itar_acknowledgment` are generated automatically when `wo.itar_controlled = true` — the operator must confirm ITAR awareness before proceeding.

Step skipping requires override authority; a skip reason is mandatory. Skip events are logged in the audit trail.

### CAP-C6-04 — Yield and Scrap Capture

At each WO Operation completion, the operator enters good_qty, scrap_qty, and rework_qty. Scrap requires one or more scrap_reason_codes from a configurable catalog. The system validates: `good_qty + scrap_qty + rework_qty ≤ wo_op.input_qty` (floating-point tolerance ε = 0.001). Yield records are immutable; corrections require a reversal yield record with original_yield_record_id reference. Cumulative yield is propagated to WO.completed_qty. Scrap is signaled to C5 for inventory relief.

KPIs: First-pass yield ≥ 98.5% target per work center; scrap rate < 1.5% of input.

### CAP-C6-05 — SPC Engine (Western Electric + Nelson Rules)

The SPC Engine evaluates every new SPC Sample against the active control limits for its chart. Supported chart types: Xbar-R, Xbar-S, Individuals (I-MR), p, np, c, u, CUSUM, EWMA.

Rules evaluated per VDA/AIAG convention:
- **WE-1**: One point beyond 3σ (UCL/LCL)
- **WE-2**: Two of three consecutive points beyond 2σ
- **WE-3**: Four of five consecutive points beyond 1σ
- **WE-4**: Eight consecutive points on one side of center
- **NE-5**: Six points in a row steadily increasing or decreasing
- **NE-6**: Fifteen consecutive points within 1σ (hugging)
- **NE-8**: Eight consecutive points with none within 1σ

On rule violation: `spc_sample.violation_rules` populated; alert dispatched to work center supervisor; if WE-1 triggered, WO auto-transitions to `suspended` pending investigation. Cpk computed when subgroup count ≥ 25; alert threshold Cpk < 1.33.

### CAP-C6-06 — First-Piece Inspection Cycle

At the first operation of a newly started WO (and after any setup change), the system generates an FPI record. The inspector works through the characteristic checklist from the BOM/Drawing. Each characteristic records measured value + conformance. If `conforming = false`, the WO cannot advance to production quantities until disposition is recorded. Disposition `conditionally_approved` requires a written condition and the approving authority's e-signature.

### CAP-C6-07 — Edge Gateway Lifecycle

Each Edge Gateway connects to one or more PLCs/machines via OPC-UA, MQTT, Modbus/TCP, S7, or FINS. The gateway maintains a local buffer for store-and-forward during connectivity loss (configurable `buffer_capacity_s`). Heartbeat monitored every 30 seconds; on missed heartbeat, status transitions to `error` and an alert is sent to the integration team. mTLS certificate thumbprint is validated at connection establishment. Tag subscriptions are managed centrally; changes require a gateway configuration reload event.

KPIs: Gateway uptime ≥ 99.5%; message loss rate < 0.01%.

### CAP-C6-08 — SCADA Integration (OPC-UA + MQTT)

SCADA connections map physical SCADA tags to HESEM parameter keys via configurable transform expressions (e.g., `(raw_value * 0.1) - 273.15` for Kelvin-to-Celsius). PackML machine states are subscribed via MQTT topic; state changes update `Workcell.packml_state` and write a `WorkcellState` audit row. Parameter values from SCADA are posted as SPC samples when mapped to an active SPC chart. Alarm events from SCADA with severity ≥ MAJOR trigger a WO suspension signal.

### CAP-C6-09 — PackML State Machine

Workcells expose a PackML ISA-TR88.00.02 state machine. Valid transitions are enforced — e.g., EXECUTE cannot transition directly to ABORTED; ABORTING is the required intermediate. State history is written to `WorkcellState` for OEE computation. OEE = Availability × Performance × Quality. Each `WorkcellState` row records `duration_ms` in the prior state, enabling rolling OEE computation without full scan. Target OEE ≥ 85% for production lines.

### CAP-C6-10 — Connected Worker PWA and Offline Tolerance

The Connected Worker interface is a Progressive Web App cached via Service Worker for offline use. Operators can complete WO steps and yield records while disconnected (up to 4 hours); records are queued locally in IndexedDB and synced when connectivity is restored. On sync: timestamps are preserved as the operator's actual completion times; the sync event is logged with a `sync_lag_s` metric. Conflict resolution rule: server record is authoritative if a later supervisor action exists; otherwise offline record wins. ITAR acknowledgment steps are blocked offline if the item is ITAR-controlled and the operator's ITAR clearance cannot be verified.

### CAP-C6-11 — EBR per Batch (J1 Pharma — SM-10 + ISA-88)

For J1 Pharma WOs, the system generates an EBR linked to an approved Master Batch Record. The EBR captures every critical process parameter, line clearance check, yield, and deviation in real time. ISA-88 phases progress from PHASE_CHARGE → PHASE_REACT/PHASE_BLEND → PHASE_TRANSFER → PHASE_FILL → PHASE_LYOPHILIZE (if applicable) → PHASE_LABEL → PHASE_PACK. Deviations are logged inline; each deviation requires an impact assessment. EBR status progresses: `in_progress` → `pending_review` → `reviewed` → `released`. Batch disposition (Released/Rejected/Reprocessing) is recorded by the Batch Release Manager. Regulatory submission of eBR to EudraLex Annex 11-compliant vault on `released` status.

### CAP-C6-12 — Cleaning Validation Cycle (J1 Pharma — SM-CLEANING-V)

Per SM-CLEANING-V (§3.2), cleaning cycles are enforced between product campaigns where carryover risk exists. The system calculates the maximum allowable carryover limit (MACL) from the previous product's LD50 (or acceptable daily exposure) and the next campaign batch size. Rinse sample results are compared against MACL. If any sample exceeds MACL, the cycle transitions to `failed`, equipment is quarantined in C5, and a deviation report is opened in C7. Three consecutive failures trigger a revalidation workflow.

Standards: EU GMP Annex 15, FDA Guide to Inspections (Nov 2014), ICH Q7 §12.

### CAP-C6-13 — Environmental Monitoring per Zone (J1 Pharma Sterile)

EM Runs are scheduled per zone per ISO 14644-1 classification (ISO 5–8) and EU GMP Grade (A–D). Particle counts (≥ 0.5 µm, ≥ 5 µm) and viable counts (active air, settle plates, contact plates, gloves) are recorded per sample point. Out-of-limit (OOL) result triggers: immediate zone investigation (C7 NC), batch review for any WO active during the monitoring period, and trend notification if 3 consecutive EM runs show upward trend in the same zone. Action limits and alert limits are configurable per zone classification.

Standards: EU GMP Annex 1 (2022), ISO 14644, USP <1116>.

### CAP-C6-14 — Media Fill Cycle (J1 Pharma Annex 1)

Media fills are scheduled semi-annually per filling line (minimum) per EU GMP Annex 1 §9.38. The system tracks: units filled, units incubated (14-day incubation), contaminated units, and contamination rate. Pass criterion: ≤ 1 contaminated unit per 5,000 units filled (< 0.01%). On failure: immediate line quarantine; all batches filled since last passing media fill reviewed; revalidation required before restart.

### CAP-C6-15 — LPA Cycle per Layer (J2 Auto)

LPA Plans define audit frequency per layer (L1 daily through L5 quarterly). The system generates scheduled LPA Run records and notifies auditors. Auditors record findings against the question set; NOK findings are captured with observations. Escalation thresholds (configurable per layer) trigger automatic CAPA opening in C7. LPA completion rates and NOK rates are reported by work center and layer. Late audits (overdue > 24h for L1, > 7 days for L2–L3) escalate automatically.

Standard: IATF 16949:2016 clause 10.3.3.

### CAP-C6-16 — AS9102 First Article Inspection (J3 Aero — SM-FAI)

Per SM-FAI (§3.3), FAIs are triggered on: first production run, design change, process change, source change, lapse in production > 2 years. The system generates AS9102 Form 1 (design documentation), Form 2 (product accounting / physical configuration), and Form 3 (characteristic accountability — all drawing callouts). CMM or digital measurement results are entered per characteristic. Approval authority is the Designated Inspector (DI) or Delegated Approval Representative (DAR). Partial FAI types (redesign, new source) pre-populate unchanged characteristics from the previous approved FAI. Approved FAI records are linked to C2 Item revisions and required before full-rate production.

Standard: AS9102 Rev C.

### CAP-C6-17 — Service-Life-Limited Part Tracking (J3 Aero)

For items with life limits (cycles, flight hours, landings, calendar days), the system maintains SLLP records keyed to each serial number. Accumulated values are updated from WO completions and from external maintenance system feeds. The `remaining_value` is computed in real-time; an alert fires at configurable thresholds (e.g., 90% of limit and 100% of limit). At limit, the serial is blocked from further installation in C5 dispatch. Traceability chain captures every install/removal in the part's service history. Records are non-deletable; correction requires a signed override with reason.

Standard: AS9100D clause 8.5.1.1, FAA AC 43.13-1B, EASA Part-145.

### CAP-C6-18 — HACCP CCP Monitoring Real-Time (J5 Food)

For J5 Food WOs, CCP monitoring records are generated per the HACCP Plan's `monitoring_freq_s`. Operators (or automated sensors via Edge Gateway) enter measured values. If `measured_value` breaches the `critical_limit`, an immediate corrective action prompt is presented; the operator must select a corrective action from the approved list. If no corrective action clears the limit within the configured response window, the WO is auto-suspended and the production lot quarantined in C5. CCP monitoring records are immutable; corrections require signed amendments. Records retained per FSMA Final Rule (2 years minimum).

Standards: 21 CFR Part 120/123, Codex Alimentarius HACCP, FSMA Preventive Controls (21 CFR Part 117).

### CAP-C6-19 — Sanitation Pre-op / Operational / Post-op (J5 Food)

Sanitation Records are generated per zone per event type (`pre_op`, `operational`, `post_op`). The system enforces that a `pre_op` Sanitation Record must be in `pass` status before any WO for the zone can be dispatched. ATP swab results are compared against RLU thresholds per surface type (food-contact vs. non-food-contact). Failed pre-op blocks WO dispatch with a 409 + Problem Detail. Allergen changeover records are created automatically when the Allergen Control Plan matrix indicates allergen presence in the prior production run and the next scheduled item lacks that allergen.

Standards: 21 CFR Part 110, FSMA PCHF (21 CFR Part 117 §117.135).

### CAP-C6-20 — Sterilization Cycle (J4 Medical Device)

For sterilized items, each WO includes a sterilization cycle step linked to an approved sterilization procedure. Cycle parameters (temperature, time, EO concentration, gamma dose, or e-beam dose depending on method) are recorded per cycle. Bioburden testing results are linked before sterilization. Biological indicator (BI) results are tracked; a failed BI quarantines the entire production lot in C5 pending re-sterilization or disposition. Sterilization cycle records are included in the Device History Record (DHR) and linked to the DMR (C2).

Standards: ISO 11135 (EtO), ISO 11137 (radiation), ISO 17665 (moist heat), ISO 14160 (liquid chemical), 21 CFR Part 820.86.

---

## 5. Eligibility Resolver — Full Specification

The Eligibility Resolver is invoked by `dispatch_wo` before SM-3 allows the transition `planned → dispatched`. It evaluates gates in the order listed below. The first failing gate stops evaluation and returns the HOLD response; it does not continue checking remaining gates.

### 5.1 Gate Evaluation Sequence

**Gate G1 — Training**

For each `required_skill_code` in `Operation.required_skill_codes`, verify that the assigned `operator_id` has a current, valid training record in C7 QMS with:
- `skill_code` match
- `expiry_date ≥ CURRENT_DATE` (or null if non-expiring)
- `status = active`

ITAR-controlled items additionally require: `operator.itar_clearance_verified = true` AND `operator.itar_clearance_expiry ≥ CURRENT_DATE`.

Failure response:
```json
{
  "type": "https://hesem.io/problems/eligibility/training",
  "title": "Operator training not current",
  "status": 422,
  "detail": "Operator <id> lacks current training for skill 'WELD-3G' (expired 2025-12-01).",
  "gate": "G1_TRAINING",
  "blocking_skill_code": "WELD-3G"
}
```

**Gate G2 — Equipment**

For the `work_center_id` and optional `equipment_id` in the WO Operation:
- Equipment `status` in CMMS (C10) must be `available` (not `out_of_service`, `in_repair`, or `calibration_due`)
- If equipment requires calibration: next `calibration_due_date ≥ CURRENT_DATE`
- If workcell has a packml_state: must be `IDLE`, `STOPPED` (stopped-with-reset-available), or `COMPLETE` — NOT `ABORTED`, `HELD`, or `EXECUTE` (already running another WO)

Failure response type: `https://hesem.io/problems/eligibility/equipment`

**Gate G3 — Material**

For each component on the BOM:
- C5 stock reservation must exist for this WO with `reservation_status = confirmed`
- Reserved lot(s) must have `status = available` (not quarantine, not hold)
- If `expiry_date` exists: `expiry_date > planned_start + safety_margin_hours` per site configuration
- FIFO/FEFO policy satisfied per C5 CAP-C5-04

For J1 Pharma: also check that API lot CoA (Certificate of Analysis) is linked and approved.

Failure response type: `https://hesem.io/problems/eligibility/material`

**Gate G4 — Document**

For the routing_id referenced in the WO:
- Routing revision `status = approved` in C2 Document Control
- If SM-7 (ECO Lifecycle) shows an in-flight ECO affecting this routing_id: check ECO `effective_date ≤ planned_start`; if not yet effective, block with document-pending advisory
- For J3 Aero: if first production run, FAI must be in `approved` status (SM-FAI)
- For J4 MD: DHF for this device family must be `approved` in C2; DMR must be current revision

Failure response type: `https://hesem.io/problems/eligibility/document`

**Gate G5 — Quality (BREL)**

Check for open BRELs (Batch Release Holds) or Item Quality Holds in C7 that cover:
- The output `item_id`
- Any component lot_id in the reservation set

If any open hold exists with `block_production = true`, gate returns HOLD.

Additionally: if item has an active Customer Concession (C1 CAP-C1-12) with `restrict_production = true`, gate returns HOLD pending concession re-confirmation.

Failure response type: `https://hesem.io/problems/eligibility/quality_hold`

**Gate G6 — ITAR / EAR**

If `wo.itar_controlled = true`:
- Facility must have `itar_registration_status = registered` in Site master
- Operator must pass G1's ITAR sub-check (already covered, but re-confirmed here for explicitness)
- No active ITAR embargo advisory for the destination country applies (checked via site country and C1 SO customer country)

If item has `ear_eccn` set: EAR classification must not be under denial order for customer country.

Failure response type: `https://hesem.io/problems/eligibility/itar_ear`

**Gate G7 — Pack-Specific Gates**

| Pack | Additional Gate |
|---|---|
| J1 Pharma | EBR template linked and in `draft` or `approved` status; campaign sequence constraints respected; cleanroom EM run for zone not in `out_of_limit` status |
| J2 Auto | PPAP submission in `approved` status for this item + customer combination (first production run); LPA plan active for work center |
| J3 Aero | FAI `approved` (same as G4 cross-check); NADCAP certification current for any special process operations on this routing |
| J4 MD | Device master record DMR current; if sterilized item: sterilization cycle template linked; UDI assignment confirmed |
| J5 Food | `pre_op` Sanitation Record for zone in `pass` status for today; allergen changeover complete if allergen matrix requires it; HACCP Plan `approved` for this product category |

Failure response type: `https://hesem.io/problems/eligibility/pack_gate`

### 5.2 GO Response

When all seven gates pass, the Resolver returns:

```json
{
  "result": "GO",
  "wo_id": "<uuid>",
  "evaluated_at": "<iso8601>",
  "gates_passed": ["G1_TRAINING","G2_EQUIPMENT","G3_MATERIAL","G4_DOCUMENT","G5_QUALITY","G6_ITAR","G7_PACK"],
  "pack_overlay": "J2"
}
```

The `dispatch_wo` transition may then proceed.

### 5.3 Resolver Idempotency

The Resolver records each evaluation in `eligibility_resolver_log` (wo_id, evaluated_at, result, failing_gate, detail_json). Re-dispatching the same WO re-runs all gates. No caching of GO results — equipment/lot status can change between evaluations.

---

## 6. Per-Pack Overlays Summary

| Pack | Activation | Key additions to C6 |
|---|---|---|
| **J1 Pharma** | `site.pharma_mode = true` | EBR mandatory for all WOs; Cleaning Validation between campaigns; EM Runs per zone; Media Fill semi-annual; ISA-88 phase tracking; EBR vault submission on release |
| **J2 Automotive** | `site.automotive_mode = true` | LPA plans mandatory per work center; PPAP gate in Eligibility G7; First-Piece Inspection cycle strict per AIAG; SPC WE rules enforced per VDA 6.3 |
| **J3 Aerospace** | `site.aerospace_mode = true` | AS9102 FAI gate in G4/G7; SLLP tracking for life-limited parts; Engine Maintenance Record for Part-145 work; ITAR/EAR gates G6; NADCAP cert gate in G7 |
| **J4 Medical Device** | `site.meddev_mode = true` | Sterilization cycle record mandatory for sterile items; UDI issuance linked to WO completion; DHF/DMR gates in G4/G7; IEC 62304 software verification steps |
| **J5 Food** | `site.food_mode = true` | Sanitation pre-op gate in G7; HACCP CCP monitoring real-time; Allergen changeover enforcement; PAL record required for LACF; Pasteurization records for Grade A dairy |

---

## 7. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Edge Gateway offline during production | Heartbeat miss at T+30s; status → `error` | Operator continues manual step entry; Edge reconnects and back-fills buffered data up to `buffer_capacity_s`; gap beyond buffer flagged for manual reconciliation |
| SPC OOC (WE-1) during run | SPC Engine fires violation; alert sent | WO auto-suspended; supervisor reviews last subgroup; if assignable cause found, records cause and resumes; if not, NQ event opened in C7 |
| HACCP CCP critical limit breach | CCP Monitor compares measured_value vs critical_limit | Operator selects corrective action; if corrective action fails within window, WO suspended and lot quarantined; Food Safety team notified within 1 hour |
| Operator eligibility expired mid-WO | G1 check on resume after pause | WO remains paused; alternate qualified operator must be assigned before resuming |
| EBR review rejection (J1) | Batch Release Manager rejects EBR | WO remains in `completed` state; batch disposition set to `rejected`; reject reason triggers CAPA in C7; lot quarantined pending disposition |
| FAI rejection (J3) | DI/DAR rejects AS9102 Form 3 | WO cancelled or reworked; ECO opened in C2 if design change required; new FAI iteration created |

---

## 8. KPIs and Targets

| KPI | Target | Measurement |
|---|---|---|
| First-pass yield | ≥ 98.5% | (good_qty / input_qty) per work center per shift |
| OEE | ≥ 85% | Availability × Performance × Quality, rolling 8-hour |
| On-time WO completion | ≥ 97% | `actual_finish ≤ planned_finish` ratio |
| SPC OOC rate | < 1% of subgroups | `violation_rules IS NOT NULL` count / total samples |
| Eligibility gate fail rate | < 3% of dispatch attempts | HOLD responses / total dispatch attempts |
| EBR release cycle time (J1) | ≤ 24h from `completed` to `released` | `ebr.released_at - wo.actual_finish` |
| FAI cycle time (J3) | ≤ 5 business days | `fai.approved_at - fai.initiated_at` |
| LPA compliance rate (J2) | ≥ 95% per layer per period | completed_runs / scheduled_runs |
| CCP monitoring compliance (J5) | 100% | ccp_monitoring records vs required frequency |
| Gateway uptime | ≥ 99.5% | online_time / scheduled_time per gateway |

---

## 9. RACI Matrix

| Process | Production Operator | Shift Supervisor | Quality Engineer | Site Quality Manager | IT/Integration |
|---|---|---|---|---|---|
| WO step execution + yield record | **R** | A | C | — | — |
| First-piece inspection disposition | C | A | **R** | — | — |
| SPC OOC investigation | I | A | **R** | C | — |
| WO suspension / release (quality hold) | I | C | **R** | A | — |
| EBR review and release (J1) | I | C | **R** | A | — |
| HACCP CCP corrective action (J5) | **R** | A | C | I | — |
| LPA audit completion (J2) | — | **R** (L2) | C | A | — |
| FAI approval (J3) | C | I | **R** | A | — |
| Eligibility Resolver configuration | — | — | C | A | **R** |
| Edge Gateway configuration | — | — | I | — | **R** |

**Key:** R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 10. Standards and Regulatory Traceability

| Standard | Clause | Capability |
|---|---|---|
| ISA-95 Part 2 | Level 3 Work Order | CAP-C6-01, CAP-C6-02 |
| ISA-88 Part 1 | Batch Process Control / Phase Model | CAP-C6-11 |
| IATF 16949:2016 | 8.5.1.3 (Control plan), 10.3.3 (LPA) | CAP-C6-15 |
| AIAG SPC 2nd Ed. | Western Electric / Nelson rules | CAP-C6-05 |
| AS9100D | 8.5.1.1 (Life-limited parts), 8.5.4 (Preservation) | CAP-C6-17 |
| AS9102 Rev C | Forms 1/2/3 FAI | CAP-C6-16 |
| EU GMP Annex 1 (2022) | §9.25 EM, §9.38 Media Fill | CAP-C6-13, CAP-C6-14 |
| EU GMP Annex 11 | Computerised systems / eBR | CAP-C6-11 |
| ICH Q7 | §12 Cleaning Validation | CAP-C6-12 |
| 21 CFR Part 820 | §820.86 Acceptance status, §820.181 DHR | CAP-C6-20 |
| ISO 13485:2016 | §7.5.1 Production controls | CAP-C6-20 |
| ISO 11135/11137/17665 | Sterilization validation | CAP-C6-20 |
| IEC 62304 | §5.7 Software verification | CAP-C6-20 |
| 21 CFR Part 117 | FSMA PCHF preventive controls | CAP-C6-18, CAP-C6-19 |
| Codex HACCP | HACCP principles 1–7 | CAP-C6-18 |
| PMO Grade A Pasteurized Milk Ordinance | §16 HTST records | CAP-C6-19 |
| IPC-A-610 | Assembly acceptance (electronics) | CAP-C6-03 |
| ITAR 22 CFR §120-130 | ITAR screening | CAP-C6-02 (G6 gate) |
| EAR 15 CFR §730-774 | EAR classification | CAP-C6-02 (G6 gate) |

---

## 11. Cross-References

| Target Domain | Reference |
|---|---|
| C2 Product Engineering | BOM + Routing revision gates in G4; FAI links to item revision; sterilization procedure in DMR |
| C3 Planning & Production | WO released from C3 Finite Schedule; campaign sequences respected in G7 J1 gate |
| C4 Procurement | Supplier lot CoA gates (G3 J1 Pharma); NADCAP cert currency for special processes (G7 J3) |
| C5 Inventory & Logistics | Lot reservation confirmed in G3; lot quarantine/release on WO suspension/resume; scrap relief on yield |
| C7 Quality Improvement | NQ events from SPC OOC and yield failures; CAPA from LPA NOK and EBR deviations; EM OOL investigations |
| C8 Traceability | WO completion closes traceability chain; SLLP history fed to C8 asset genealogy |
| C10 Workforce & CMMS | Operator training records in G1; equipment calibration status in G2; downtime events dispatched to CMMS |
| Analytics | OEE metrics; SPC Cpk trends; yield rates; LPA compliance rates |

---

*Decision phrase: S2-03_C5_C6_INVENTORY_SHOPFLOOR_DEEP_UPGRADE_COMPLETE*

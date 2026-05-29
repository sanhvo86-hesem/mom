# P08 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P08-CLAIM-001 | `equipment`, `calibration_records`, and legacy maintenance work orders already exist physically. | REPO_EVIDENCE | `mom/database/migrations/012_calibration_equipment.sql` | High | asset/calibration authority could be described as target-state only | anchor equipment truth to existing asset/calibration tables | verified |
| P08-CLAIM-002 | advanced PM/CMMS structures already exist for functional locations, PM plans, PM work orders, counters, condition monitoring, and failure history. | REPO_EVIDENCE | `mom/database/migrations/046_plant_maintenance_cmms.sql` | High | readiness policy could miss actual maintenance authorities | reuse PM tables as real gate sources | verified |
| P08-CLAIM-003 | MES connectivity adapters, connectivity events, alarm catalog/playbooks, NC download receipts, and adapter health views already exist. | REPO_EVIDENCE | `mom/database/migrations/026_mes_world_class_foundations.sql` | High | OT trust model could be invented detached from repo reality | base connectivity trust on current MES foundations | verified |
| P08-CLAIM-004 | machine event spine is now append-only and authoritative for raw/derived machine events. | REPO_EVIDENCE | `mom/database/migrations/135_world_class_mes_event_spine_periodic_closure.sql`; `docs/backend/EQMS_CONTROL_PLANE_CLOSURE_REGISTER.md` | High | event ingestion authority could be mis-modeled as mutable status store | keep raw vs derived vs projection layers separate | verified |
| P08-CLAIM-005 | canonical equipment contract already exposes lifecycle and compatibility alias semantics over `equipment` and `pm_equipment_master`. | REPO_EVIDENCE | `mom/contracts/objects/master_data--equipment/contract.json` | High | P08 could invent a second equipment root | keep one equipment identity with linked PM/OT children | verified |
| P08-CLAIM-006 | P07 already requires machine family, controller compatibility, tooling, and release-package readiness, so P08 must supply machine-side gate truth for those requirements. | REPO_EVIDENCE | `_reports/agent-audits/mda-prompt-os-2026-05-29/P07_engineering_definition_authority_bom_routing_work_definition_control_plan_inspec_MAIN.md` | High | equipment prompt could drift from engineering definition prompt | bind machine readiness directly to P07 release package gates | verified |

## Authority decisions

1. `Equipment` is the identity root for machines and governed assets; `WorkCenter` is a scheduling/capacity grouping and must not be duplicated as an equipment row.
2. readiness for release/start is composite: lifecycle + PM + calibration + OOT + capability + connectivity + safety + current program/package compatibility.
3. raw machine signals are immutable evidence, not lifecycle truth. current-state badges/projections are derived conveniences only.
4. manual overrides that release blocked equipment require governed e-sign and audit because they can override maintenance/calibration/safety truth.
5. connectivity heartbeat is not universally mandatory for every asset, but when the routing/package marks telemetry-required equipment, stale heartbeat blocks WO release/start.

## Object package

| Object | Class | Current physical lane | Authority decision |
| --- | --- | --- | --- |
| `Equipment` / `Machine` | lifecycle owner | `equipment`, `pm_equipment_master` | canonical asset identity with linked maintenance/equipment master bridge |
| `WorkCenter` / `WorkUnit` | reference / structural objects | `work_centers`, PM locations, MES location fields | structural capacity/location scope, not asset duplicate |
| `EquipmentCapability` / `EquipmentController` | governed child / target normalized profile | equipment metadata + NC package scope | machine-family/controller/capability truth for release gating |
| `EquipmentConnectivityAdapter` / `MachineSignalTag` | lifecycle owner + child | `mes_connectivity_adapters`, approved map target | OT trust configuration authority |
| `MachineEvent` / `DowntimeEvent` | event record | `machine_raw_events`, `production_derived_events`, MES connectivity events | immutable signal/event truth |
| `MachineStateProjection` | projection record | `mes_equipment_extended`, adapter health views | read-only projection only |
| `MachineAlarmCatalog` / `MachineAlarmEvent` | reference master + event | `mes_alarm_catalog`, `mes_machine_alarms`, connectivity events | alarm response and blocking evidence |
| `PMPlan` / `MaintenanceWO` | lifecycle owner + transaction document | `pm_maintenance_plans`, `pm_work_orders`, legacy `maintenance_work_orders` | maintenance readiness truth |
| `CalibrationRequirement` / `CalibrationRecord` / `OOTInvestigation` | reference/evidence | `equipment` dates, `calibration_records`, target OOT object | calibration validity truth |

## Repair pass applied in P08

1. Separated asset lifecycle authority from OT telemetry/state projections.
2. Unified PM, calibration, OOT, connectivity, safety, and controller/package compatibility into one readiness policy instead of scattered checks.
3. Linked equipment truth back to P07 release-package requirements so machine-side and engineering-side readiness cannot drift silently.
4. Prevented work-center/equipment duplication by making work center structural only.

## Decision token

`P08_PASS_WITH_CONTROLLED_GAPS`

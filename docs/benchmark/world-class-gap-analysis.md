# World-Class CNC MOM/MES Gap Analysis

Audited branch: `main`

Audit date: 2026-04-13

Scope: local branch state for dispatch, mobile execution, order/planning, AI scheduling, analytics summaries, DB map, and migrations related to MES/mobile/dispatch/quality/CNC/connectivity/master data.

## Scorecard

| category | current score before this patch | target score after this patch | evidence | gap closed by this patch |
|---|---:|---:|---|---|
| Execution truth integrity | 3.0 | 3.8 | Dispatch/manual reporting is still the live write path in `DispatchController`; PostgreSQL bridge exists but is not primary authority. | Kept one dispatch execution path, added stricter target state locks, first-piece gate, and lifecycle event bridge. |
| Transaction model / event history | 3.2 | 4.0 | `production_report_events.json` preserved report history, but target create/update/dispatch were mostly snapshot writes. | Added append-only `dispatch/execution_events.json` plus `shift_dispatch_execution_events` mirror. |
| Planning-to-execution consistency | 3.0 | 3.7 | Planner targets use existing shift target model and order enrichment; dispatch reference validation exists. | Revalidates dispatch references and prevents uncontrolled engineering field edits after release. |
| Quality / EQMS integration | 2.2 | 3.2 | Mobile inspection capture exists, but dispatch reporting did not enforce first-piece behavior. | Added first-piece quality gate with supervisor override semantics. |
| Digital thread continuity for CNC | 3.2 | 3.9 | Targets/logs carry WO/JO/item/revision/operation/machine/work center/CNC/setup/inspection fields. | Lifecycle events and reports now carry org/site fields and quality gate status. |
| Traceability / genealogy | 2.0 | 2.6 | Material lot, heat, traveler fields exist; no full genealogy graph yet. | Event journal keeps trace-ready target/report history without claiming full genealogy. |
| Reason-code and master-data governance | 3.7 | 3.9 | Downtime, blocking, NG, rework codes come from master data catalogs. | First-piece gate status and override reasons are structured, not free-form-only execution truth. |
| Operator qualification / authorization rigor | 2.7 | 2.9 | Dispatch actor guard and `ConnectedGovernanceService` hook exist; Mobile work queue has qualification gate. | Dispatch reports still call governance entitlement; this patch keeps the hook and documents remaining qualification depth. |
| Multisite / plant / site semantics | 2.3 | 3.0 | Enterprise org scope exists elsewhere; dispatch target payload did not consistently preserve org fields. | Added org company/legal entity/plant/site fields to target, report, task card, and lifecycle digital thread payloads. |
| Interoperability readiness | 2.8 | 3.3 | Stable machine/equipment IDs and timestamps exist; no direct MTConnect/OPC UA ingestion in Phase 1. | Event model uses clean timestamps and equipment semantics while staying manual-input-only. |
| AI / copilot architecture quality | 3.2 | 3.7 | AI scheduling remains advisory and file-backed; execution projections derive from dispatch logs. | Quality gate and lifecycle features improve deterministic, projection-only AI features. |
| OT / IT security and governance | 3.3 | 3.9 | Auth, role, CSRF, audit middleware exist; dispatch writes are role-guarded. | Preserved CSRF/role checks, added override-required target edits and first-piece overrides. |
| Performance / scalability | 3.4 | 3.6 | Operator retrieval reads target/log files once and builds a log map. | Added read lock to target list; no repeated file I/O loops added. |
| Developer architecture quality | 3.6 | 3.9 | Custom MVC controllers and services already separate controller IO from domain validation. | Kept existing MVC and added focused service/repository/migration changes only. |

## Confirmed hypotheses

| hypothesis | result | severity | evidence | remediation |
|---|---|---:|---|---|
| H1 dispatch truth remains file-backed or partially file-backed | Confirmed | P1 | `DispatchController` still writes JSON compatibility stores first. | Kept JSON as legacy live path, added DB mirror for lifecycle events and documented staged bridge. |
| H2 reporting was too snapshot-oriented | Partially confirmed | P1 | Report event ledger existed, but target lifecycle was snapshot-only. | Added `dispatch/execution_events.json` and DB mirror table. |
| H3 target lifecycle/edit constraints were naive | Confirmed | P1 | `applyTargetUpdates()` previously allowed engineering/context fields after dispatch. | Added state-based locked fields and supervisor override reason requirement. |
| H4 validation quality gaps remained | Partially confirmed | P1 | Core quantity/time/reason validations existed; first-piece quality gate was missing. | Added first-piece gate and tests. |
| H5 operator dispatch retrieval inefficient | Refuted | P3 | `getOperatorDispatch()` reads targets/logs once and builds a target log map. | No code widening; preserved single-pass pattern. |
| H6 blank operator assignment unsafe | Refuted | P2 | `assertReportActorCanSubmit()` rejects blank assignment without planner override. | Kept existing guard. |
| H7 reason codes not governed | Refuted for report reasons, partially confirmed for quality gate | P2 | Reason catalogs exist for downtime/NG/rework/blocking; quality override was not governed. | Added structured `quality_gate` and `quality_override_reason`. |
| H8 qualifications underused | Confirmed | P2 | Mobile queue uses qualification gate; dispatch reporting relies on governance hook rather than full skill matrix enforcement. | Deferred full dispatch skill enforcement; hook remains explicit. |
| H9 digital thread links incomplete | Partially confirmed | P2 | Core CNC links existed; org/site and first-piece quality context were weak. | Added org/site fields and quality gate to execution contracts/events. |
| H10 first-piece gate missing | Confirmed | P1 | Mobile inspections existed but dispatch reports did not check them. | Added blocking first-piece gate for required/enforced targets. |
| H11 idempotency/replay weak | Partially confirmed | P1 | Report idempotency existed; target lifecycle lacked replayable event history. | Added lifecycle event journal and DB mirror. |
| H12 AI detached from canonical execution | Partially confirmed | P2 | Advisory projections use production logs, while AI scheduling remains file-backed advisory. | Kept AI advisory-only and added cleaner deterministic quality/event features. |
| H13 duplicate/drifting execution concepts exist | Confirmed | P2 | Dispatch JSON, mobile queue JSON, MES DB tables, AI scheduling JSON all overlap. | Canonical docs define dispatch/report as Phase 1 execution truth; AI remains projection-only. |

## Benchmark-to-repo gap mapping

- SAP DM / ISA-95: This patch strengthens production target, work execution, quality gate, and event history semantics while keeping planning/execution/analytics boundaries separate.
- Siemens Opcenter / Apriso: The patch adds track-and-trace style event history and first-piece quality enforcement, but full NC/CAPA/SPC workflows remain outside this scope.
- AVEVA MES: Shift target and event journal are closer to performance/OEE-ready facts; model-driven multisite deployment is still staged.
- Tulip-style human execution: Operator payloads remain human-input-first and shopfloor-friendly; no fake autonomous AI is introduced.
- Google/Microsoft AI factory patterns: Execution remains source/sink; advisory features are deterministic projections from clean execution events.
- MTConnect/OPC UA readiness: Stable equipment IDs and event timestamps are preserved; no machine-control side effects are introduced.
- ISA/IEC 62443 posture: Writes stay role/CSRF/audit guarded; supervisor overrides are explicit and replayable.

## Target-state decision

The target state for this patch is a staged canonical execution backbone:

- Operational truth path: planner dispatch targets plus operator production reports through `DispatchController` and `ShopfloorExecutionService`.
- Compatibility store: JSON files under `data/dispatch` remain the live fallback path for the current architecture.
- Transactional bridge: PostgreSQL tables mirror accepted facts for migration validation and analytics.
- Event model: append-only report events plus dispatch lifecycle events are canonical history; target/log rows are derived snapshots.
- AI boundary: AI scheduling and analytics remain advisory and projection-only, never execution authority.

## Six-agent hardening reaudit

Additional reaudit on 2026-04-13 confirmed and remediated these residual defects:

- Alias lock bypass: conflicting canonical/legacy target update fields are now rejected, and alias-only edits are evaluated through the canonical lifecycle lock matrix.
- Override governance: completed/cancelled target identity edits remain locked even when an override reason is supplied.
- Replay safety: online reports without a client key now receive a deterministic `server:*` idempotency key; replay responses preserve the normal response envelope.
- Lifecycle semantics: downtime and blocked reports emit distinct dispatch lifecycle event types instead of collapsing into generic production-reported events.
- Mobile first-piece context: inspection capture now passes operation, inspection plan, machine/equipment, work center, result, device, and offline metadata through to `MobileWorkQueueService`.
- DB bridge lineage: the PostgreSQL bridge now preserves org/company/legal entity/plant/site scope on dispatch targets and production logs, and reports `partial` unless target, snapshot, and report-event mirrors all succeed.
- CNC digital thread: pending CNC program revisions no longer overwrite released `current_rev`; approved versions commit release truth, and setup sheets carry revision history.

## Deferred gaps

- Full DB authority cutover for dispatch targets and production reports.
- Full operator skill/certification matching directly in dispatch target reporting.
- Full genealogy graph across serial, lot, traveler, inspection, and shipment.
- SPC/non-conformance/CAPA workflow enforcement beyond first-piece gating.
- Real machine-state ingestion from MTConnect or OPC UA.

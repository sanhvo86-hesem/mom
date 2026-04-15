# Canonical Execution Source of Truth

Audited branch: `codex/worldclass-closure-20260415-0913`

Date: 2026-04-15

This document defines the current Phase 1 execution truth model for CNC/discrete manufacturing. It preserves the existing custom MVC architecture, router/middleware behavior, and legacy JSON fallback while making the operational boundary explicit.

## Source-of-truth matrix

| concept | current source of truth | competing sources | decision |
|---|---|---|---|
| Sales order | Existing planning/order APIs and order stores | Dispatch target copied references, analytics snapshots | Dispatch cannot redefine sales order truth. It stores references only. |
| Job order | Existing planning/order/work-order enrichment | Dispatch target `jo_number` copy | Dispatch stores job reference for execution context, not planning authority. |
| Work order | Existing work order/order store joined by `wo_number` | Mobile queue work items, dispatch copies | `wo_number` is the Phase 1 execution join key. |
| Work order operation | Operation fields on dispatch target/report: `operation_seq`, `operation_id`, `operation_revision` | Routing/job-operation DB tables | Dispatch preserves operation context; routing remains planning/master truth. |
| Work-order creation context | Parent JO and defined JO operation context | Caller-supplied WO plant/site/routing/work-center/CNC/setup fields | Work orders must match parent JO context where present. Missing WO context may be inherited; mismatched parent/operation context is rejected. |
| Dispatch target | Existing dispatch target store through `DispatchController` | `shift_targets` PostgreSQL bridge, analytics projections | Existing dispatch target path is live Phase 1 operational truth; DB is bridge until cutover. |
| Operator assignment | Dispatch target `operator_id` plus dispatch actor checks | Mobile queue assignee fields | Reports require assigned operator or supervisor/planner override. Blank assignment is not open execution. |
| Operator time entry | Mobile work queue service time-entry store | MES labor/time tables, production report actual times | Mobile time entry remains capture truth; online clock-in and clock-out replay keys protect retry-safe capture. Report times are production-event context. |
| Mobile task completion | Mobile work queue service task snapshot plus `mobile/task_events.json` event journal | Dispatch production report events, `mobile/work_queue.index.json` read model | Queue row is a derived task snapshot. Assignment/start/completion events are mobile task history truth; dispatch report remains production quantity truth. The queue index is retrieval-only and cannot override the snapshot or events. |
| Production report event | `ShopfloorExecutionService` report event journal | Production log snapshot, DB bridge | Event journal is audit/replay truth. Snapshot is derived latest state. |
| Production report snapshot | `production_logs.json` through dispatch reporting | `shift_production_log` bridge | Snapshot is a read model for dashboards and compatibility. |
| Inspection capture | `MobileWorkQueueService::captureInspection()` with JSON compatibility and DB bridge | Dispatch report quality gate fields | Mobile capture is quality evidence truth for Phase 1 first-piece/in-process checks. |
| First-piece gate | `ShopfloorExecutionService` gate check against DB `mobile_inspection_captures` then JSON fallback | Report override fields | Gate is execution validation. Override requires planner/supervisor authority and reason. |
| Machine/equipment | Existing machine/equipment master references | Connectivity projections and alarms | Execution payloads must preserve stable `machine_id`/`equipment_id`; no direct control. |
| Work center | Existing work center references | Dispatch/report copies | Dispatch/report preserve work-center context for later capacity/OEE analytics. |
| Machine alarm/downtime | Manual downtime/blocking facts in production reports for Phase 1 | Connectivity alarm tables, machine state projections | Manual downtime is execution truth only for operator-reported losses. Telemetry remains separate until connectivity cutover. |
| Reason codes | Master-data catalogs: downtime, defect, rework, blocking | Free text notes | Governed codes are required for structured loss/defect/blocker semantics. Notes are supporting context only. |
| Schedule/capacity slot | Planning/scheduling modules through `AiSchedulingController` schedule handlers | Dispatch shift target date/shift fields, advisory AI suggestions | Dispatch captures execution intent, not APS authority. Schedule create/update rejects machine/date/time overlaps in DB and JSON fallback stores. |
| CNC program version | CNC program management module | Dispatch target copied program revision | Execution freezes references; CNC program store owns release/version truth. Program and version rows now persist plant/site/work-center/operation/part-revision/inspection context for CNC traceability. |
| Setup sheet revision | CNC setup sheet store | Dispatch target copied setup revision | Execution freezes references; setup sheet store owns release/version truth. New setup sheets start as `draft`; missing setup status is not treated as released. |
| Inspection plan | Quality/mobile inspection plan store | Dispatch target copied `inspection_plan_id` | Inspection plan is quality truth; dispatch/report store references and gate policy. |
| Genealogy/traceability | Existing traceability/genealogy services and DB tables | Report material lot/heat/traveler context | Report payloads carry trace-ready fields; full edge emission is deferred. Shopfloor 5M gate persistence now passes plant/site partition scope as trusted top-level request scope and fails closed when scope is missing. |
| AI prediction/analytics projection | AI/analytics modules and projection files/tables | Execution records carrying advisory fields | AI is advisory only. It cannot mutate dispatch target, production report, quality evidence, or machine control. |
| AI model/dashboard/read surfaces | `AiSchedulingController` role-scoped advisory read APIs | Any authenticated session | AI model list, prediction list, SPC anomaly, tool-wear, legacy dashboard, and combined dashboard reads require AI read roles; model config/training source metadata is admin-only. |
| AI natural-language query | `NaturalLanguageQueryService` over read-only PostgreSQL SELECTs | Conversation history in `ai_conversations` | NLQ is scoped, CSRF-protected, audited, read-only, and cannot write execution truth. |
| AI training ETL | `AiDataEtlService` snapshots scoped by `org_id` | Scheduled job calls without tenant/org context | Scheduled ETL must run per explicit org scope. If no scope is available, it records skipped results and does not run unscoped projection extraction. |
| AI schedule apply / PM proposal | Advisory review/proposal responses from `AiSchedulingController` | Schedule slot and maintenance work-order stores | AI-named apply/PM endpoints do not mutate schedules or create maintenance execution. They return `applied=false`/`scheduled=false`, `execution_authority=false`, and human action requirements. |
| Evidence artifact | `EvidenceVaultService` custody/hash chain and canonical evidence DB tables where available | Uploaded file metadata, attachment rows | Evidence is controlled quality context. Uploads validate size and byte-detected MIME; extension fallback cannot override dangerous content. Canonical package reads require EQMS read roles and org scope; finalization requires at least one signature event. |
| Genealogy ontology | `GenealogyGraphService` runtime ontology plus migration 121 DB constraints | Older migration 108 constraints | Runtime and DB now agree on expanded MOM/MES/EQMS/PLM node and snapshot subject types. |

## Event vs snapshot rules

- Append-only production report events and dispatch lifecycle events are the audit/replay truth.
- File-backed manufacturing event fallback is compatibility-only and scans append context under lock for idempotency/hash-chain continuity; it is not DB-primary authority.
- Target and production-log snapshots are compatibility/read-model state.
- Mobile inspection capture is append-only by behavior for offline replay: matching replay returns existing fact; divergent replay is rejected.
- Mobile task assignment/start/completion writes append task events and then exposes the queue row as the current snapshot.
- `mobile/work_queue.index.json` is a derived operator/date read model. If stale, absent, or missing the requested bucket, the service rebuilds it from `work_queue.json`.
- Order holds keep `orders/holds.json` as the compatibility snapshot and append `orders/hold_events.json` lifecycle facts for set/release audit history.
- Order hold set rejects invalid order types and missing source orders before writing the compatibility snapshot or lifecycle fact.
- DB bridge writes are migration/readiness mirrors. They are not allowed to override JSON compatibility truth in this Phase 1 patch.
- If event history and snapshot disagree, event history wins for audit and reconciliation.

## File-backed, DB-backed, and projection decisions

| storage class | role | allowed writes |
|---|---|---|
| JSON dispatch/mobile files | Legacy live fallback and current operational compatibility store | Existing controllers/services only, under role/CSRF checks. |
| PostgreSQL MES/mobile bridge tables | Migration bridge, analytics-ready mirror, future DB-primary candidate | Service-layer shadow writes after accepted operational validation. |
| AI scheduling/analytics files | Advisory projections and model inputs/outputs | Advisory service writes only. No execution authority. |
| AI recommendation actions | Advisory review ledger in `ai_recommendation_actions` | Legacy migration 099 wording | Migration 110 re-documents the table as human-review advisory records, not autonomous execution. |
| Master-data JSON/DB seeds | Controlled vocabulary and governance seed | Migration/master-data governance path. No hardcoded business lists in controller logic. |

## State model rules

- `planned`: planner can edit target context and sequencing fields; `planned -> dispatched` is the only normal dispatch promotion.
- Redispatch of `dispatched`, `in_progress`, `completed`, or `cancelled` targets is rejected.
- `dispatched`: engineering, identity, quality, and shift edits require explicit supervisor override reason.
- `in_progress`: reporting has started; identity and engineering edits require override and audit.
- `completed`: normal edits are locked; corrections must use correction/override semantics.
- `cancelled`: execution reporting is rejected; corrections require governed supervisor path.
- `blocked`, `paused`, and `resumed` are execution sub-states/events, not new work-order abstractions.
- Compatibility aliases with the `order_schedule_*` prefix route to the existing scheduling controller. They do not make `OrderController` the owner of scheduling truth.

## Override rules

- Overrides must be explicit, role-guarded, CSRF-protected when invoked via web/API write route, and audited.
- Order hold release must derive the held order type and require the matching source-order write permission before mutating the hold.
- Order hold set must validate the source SO/JO/WO exists before writing the hold snapshot or event.
- First-piece gate override requires a structured `quality_override_reason`.
- Completed/cancelled target edits are not silently reopened by a free-text note.
- Offline/mobile replay is not an override path. Conflicting replay keys are rejected as data-integrity defects.
- Generic EQMS exception updates cannot mutate status, status history, closure, approval, or rejection fields; those lifecycle movements must use transition/change-control paths.
- Generic JO/WO update routes reject unknown top-level fields before workflow validation. This keeps planning lifecycle rules from being bypassed by uncontrolled JSON mutation.

## AI boundary rules

- AI may read canonical execution facts and derived projections.
- AI may record feedback only through CSRF-protected, idempotent write paths.
- AI feedback that can affect advisory confidence requires feedback/write roles, not read-only AI access.
- AI natural-language query and RCA POST surfaces require CSRF because they write conversation/advisory history or trigger advisory processing. NLQ throttling is a shared user/hour ledger, not session-only state.
- AI may suggest risk, priority, or quality insights, but may not dispatch work, complete targets, approve inspections, create quality disposition, or command machines.
- AI schedule apply and preventive-maintenance proposal routes are advisory review capture only. A human planner or governed maintenance/EQMS path must perform any real schedule or maintenance mutation.
- Execution truth remains in MOM/MES service paths, not in AI JSON files.
- AI ETL may extract `shopfloor_execution` features from accepted execution facts for training/projection snapshots; those datasets are downstream analytics artifacts and never overwrite dispatch, quality, maintenance, tooling, or machine state.

## Staged migration decision

The current safest architecture is not a broad DB rewrite. The staged path is:

1. Keep the existing dispatch/mobile controllers and service boundaries.
2. Strengthen validation and event/replay semantics in those services.
3. Mirror accepted facts to DB bridge tables where already available.
4. Use bridge data to reconcile and prove a DB-primary cutover in a later release.
5. Keep all AI/analytics projection writes advisory and downstream of accepted execution facts.

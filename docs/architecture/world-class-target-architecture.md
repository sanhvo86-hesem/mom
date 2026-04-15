# World-Class Target Architecture

Audited branch: `codex/worldclass-closure-20260415-0913`

Date: 2026-04-15

This target keeps the custom PHP MVC framework, router, middleware, DataLayer, EventBus, and legacy fallback behavior. It does not propose a rewrite.

## Target posture

1. ERP/planning owns sales order, job order, work order, routing, release/hold, and schedule intent.
2. MOM/MES owns dispatch targets, operator assignment, execution reporting, labor/time capture, inspection capture, downtime/manual loss capture, and execution event history.
3. EQMS owns inspection plans, controlled quality records, nonconformance, deviation, CAPA adjacency, evidence custody, and release packets.
4. CNC/digital-thread services own CNC program versions, setup sheets, tooling/setup references, and approved revision history.
5. Analytics and AI consume governed projections from accepted execution/quality/asset facts. They do not become execution authority.

## Canonical execution backbone

- Keep the existing `DispatchController` and `ShopfloorExecutionService` as the Phase 1 write path for shift targets and production reports.
- Keep production report events and dispatch lifecycle events as audit/replay truth.
- Keep mobile task events as audit/replay truth for mobile assignment/start/completion while `work_queue.json` remains the snapshot.
- Treat target and production-log JSON snapshots as compatibility/read models until a DB-primary cutover is proven.
- Keep `ShopfloorExecutionPersistenceService` as the DB bridge for `shift_targets`, `shift_production_log`, `shift_production_report_events`, and `shift_dispatch_execution_events`.
- Dispatch promotion must be a lifecycle transition from `planned` only. Started, terminal, paused, blocked, and correction states must flow through report/correction paths, not through redispatch.
- Keep scheduling/capacity endpoints owned by the existing scheduling controller. Order-prefixed aliases are compatibility routes only and must not drift into missing `OrderController` methods.
- Work-order creation must validate parent JO/routing context before persistence. Caller-supplied plant/site/routing/work-center/CNC/setup fields may not silently cross parent boundaries.
- Hold set/release are controlled planning/governance mutations. Hold set must validate the source order exists; hold release must require source-order write authority before the hold row/file is changed.
- Hold set/release keeps the legacy hold snapshot but also appends hold lifecycle events so planning governance has a replayable audit trail.

## Quality and evidence backbone

- Keep mobile first-piece/in-process/final capture through `MobileWorkQueueService`.
- Canonical evidence finalization must remain role-gated to quality/document/compliance authority roles, not merely authenticated users.
- Canonical evidence package reads must be role-gated and scoped by organization. Finalization must fail closed unless at least one structured signature event is present.
- Keep evidence custody through `EvidenceVaultService`.
- Evidence uploads must validate server-side size and actual MIME bytes. Extension fallback is allowed only for ambiguous/generic byte detection.
- FMEA and operational override access must use canonical role normalization, not generic or unmigrated role strings.
- Generic exception updates must not mutate lifecycle fields; status, closure, approval, and rejection movement stays in transition/change-control paths.
- Next staged work: route NCR/deviation/concession/MRB updates through service-owned transitions and make shipment OQC consume canonical inspection facts instead of sidecar JSON.

## CNC digital thread target

Target continuity:

`item -> item revision -> job order -> work order -> operation -> work center -> machine/equipment -> setup sheet revision -> CNC program version -> inspection plan -> production report event -> quality/evidence/genealogy`

Current execution payloads already preserve most links. CNC program and version JSON records now persist plant/site/work-center/operation/part-revision/routing/inspection context, matching setup-sheet context. New setup sheets start as `draft` and strict dispatch reference enforcement does not treat missing status as released. The remaining high-value target is a DB-backed CNC program/version/setup-sheet repository or bridge behind `CncProgramController`, with JSON retained as compatibility fallback during cutover.
Migration `121_genealogy_runtime_ontology_constraints.sql` keeps database genealogy constraints aligned with the runtime expanded ontology while automatic edge emission from every production report remains staged.

## AI and copilot boundary

- AI prediction rows and recommendation actions are advisory projections.
- `ai_recommendation_actions` may track pending human review but does not create NCRs, maintenance work, schedule moves, tool orders, dispatch changes, completion events, or machine commands.
- AI schedule apply and preventive-maintenance proposal routes may record review intent or propose a planner action, but they must return no execution authority and must not create schedule moves or maintenance work.
- Natural-language query writes conversation history and may expose broad manufacturing data, so it requires authentication, scoped roles, CSRF, shared user/hour rate limiting, read-only SQL validation, row limits, audit logging, and PostgreSQL read-only transactions.
- Conversation history/detail reads also require AI read roles; JSON fallback detail reads validate safe IDs and require owner metadata before returning content.
- AI prediction, SPC anomaly, tool-wear, legacy dashboard, model, and combined dashboard surfaces are advisory read APIs and require the same AI read role boundary; model internals are admin-only.
- AI feedback that can alter advisory confidence requires feedback/write roles and remains idempotent.
- RCA analysis is a write-like advisory surface because it can call an external LLM and cache/store outputs; it requires CSRF and quality/admin role scope.
- Scheduled AI ETL must run only for explicit org scopes from a scheduler, session, environment, or configured users. If no org scope is available, it must fail closed with skipped advisory snapshots rather than extracting unscoped data.

## Staged cutover rules

- A DB-primary cutover is allowed only after reconciliation proves JSON and DB facts match for dispatch, production reports, mobile inspections, CNC program releases, and quality exceptions.
- No AI, analytics, dashboard, or ETL projection may overwrite operational records during or after cutover.
- Connectivity parsers must not expand XML entities or accept machine-source XML with `DOCTYPE`/`ENTITY` declarations.
- Any compatibility bridge must state which side is authoritative, which side is a cache/projection, and how divergence is detected.
- Schedule write paths must enforce the same conflict rules in DB-primary and JSON fallback modes before a DB-primary scheduling cutover is allowed.

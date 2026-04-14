# World-Class Target Architecture

Audited branch: `codex/worldclass-closure-20260414-0807`

Date: 2026-04-14

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
- Treat target and production-log JSON snapshots as compatibility/read models until a DB-primary cutover is proven.
- Keep `ShopfloorExecutionPersistenceService` as the DB bridge for `shift_targets`, `shift_production_log`, `shift_production_report_events`, and `shift_dispatch_execution_events`.
- Keep scheduling/capacity endpoints owned by the existing scheduling controller. Order-prefixed aliases are compatibility routes only and must not drift into missing `OrderController` methods.
- Hold release is a controlled planning/governance mutation and must require source-order write authority before the hold row/file is changed.

## Quality and evidence backbone

- Keep mobile first-piece/in-process/final capture through `MobileWorkQueueService`.
- Keep evidence custody through `EvidenceVaultService`.
- Evidence uploads must validate server-side size and actual MIME bytes. Extension fallback is allowed only for ambiguous/generic byte detection.
- FMEA and operational override access must use canonical role normalization, not generic or unmigrated role strings.
- Next staged work: route NCR/deviation/concession/MRB updates through service-owned transitions and make shipment OQC consume canonical inspection facts instead of sidecar JSON.

## CNC digital thread target

Target continuity:

`item -> item revision -> job order -> work order -> operation -> work center -> machine/equipment -> setup sheet revision -> CNC program version -> inspection plan -> production report event -> quality/evidence/genealogy`

Current execution payloads already preserve most links. The remaining high-value target is a DB-backed CNC program/version/setup-sheet repository or bridge behind `CncProgramController`, with JSON retained as compatibility fallback during cutover.

## AI and copilot boundary

- AI prediction rows and recommendation actions are advisory projections.
- `ai_recommendation_actions` may track pending human review but does not create NCRs, maintenance work, schedule moves, tool orders, dispatch changes, completion events, or machine commands.
- Natural-language query writes conversation history and may expose broad manufacturing data, so it requires authentication, scoped roles, CSRF, read-only SQL validation, row limits, audit logging, and PostgreSQL read-only transactions.
- RCA analysis is a write-like advisory surface because it can call an external LLM and cache/store outputs; it requires CSRF and quality/admin role scope.

## Staged cutover rules

- A DB-primary cutover is allowed only after reconciliation proves JSON and DB facts match for dispatch, production reports, mobile inspections, CNC program releases, and quality exceptions.
- No AI, analytics, dashboard, or ETL projection may overwrite operational records during or after cutover.
- Any compatibility bridge must state which side is authoritative, which side is a cache/projection, and how divergence is detected.

# World-Class Gap Analysis for CNC Shopfloor Execution

Audited branch: `codex/worldclass-reaudit-20260414-145442`

Audit date: 2026-04-14

Merge-base inspected: `f5623d0c41957d467d956ad4514e88ea73316649`

Scope: current local branch state for planning/order control, dispatch, mobile execution, production reporting, quality inspection capture, CNC program management, connectivity, analytics/AI projections, migrations, and prior prompt artifacts.

## Official benchmark set used

- SAP Digital Manufacturing: MOM platform, S88/S95 production model support, AI-guided KPIs, resource orchestration, labor/skills, execution controls, scrap/rework standardization.
- Siemens Opcenter and Opcenter X Quality: MOM/MES execution, production/quality orchestration, closed-loop quality, inspection management, SPC, nonconformance management, lifecycle traceability.
- Dassault DELMIA Apriso: unified global MOM/MES, real-time manufacturing data, model-based manufacturing network, integrated quality, maintenance, material synchronization, ERP integration.
- AVEVA Manufacturing Execution System: composable model-driven deployment, plant/network visibility, production, inventory, quality, OEE, first-time quality, traceability.
- Tulip Composable MES and Frontline QMS: human-centric operator apps, app-based MES, common data model, open API, GxP-ready controls, defect disposition, CAPA adjacency, inspection plans.
- Google Cloud Manufacturing Data Engine: factory-floor to cloud data hub, configurable ingestion/contextualization, ISA-95/OPC UA semantic alignment, MES as source/sink rather than replacement.
- Microsoft for Manufacturing and Factory Operations Agent release material: unified IT/OT factory data, MES/QMS/system connections, semantic graph/NLQ access, AI as insight and worker support.
- ISA-95/IEC 62264: enterprise-control integration boundary and information exchange discipline.
- MTConnect 2.5: model-based, machine-readable equipment information model and agent pattern.
- OPC UA for Machinery: building-block semantics for machine identity, component identity, machine status, job/result transfer, energy/tool/resource topics.
- NIST digital thread research: design-manufacturing-inspection continuity, STEP/QIF/MTConnect alignment, GUID continuity, inspection-to-design feedback.
- ISA/IEC 62443 via ISA99: industrial automation/control security posture, secure control systems, confidentiality, integrity, availability, and IACS risk reduction.

Official source URLs reviewed:

- https://www.sap.com/products/scm/digital-manufacturing.html
- https://plm.sw.siemens.com/en-US/opcenter/
- https://www.3ds.com/products/delmia/apriso
- https://www.aveva.com/en/products/manufacturing-execution-system/
- https://tulip.co/platform/composable-mes/
- https://support.tulip.co/docs/it/frontline-qms-1
- https://docs.cloud.google.com/manufacturing-data-engine/docs/overview
- https://learn.microsoft.com/en-us/industry/manufacturing/
- https://learn.microsoft.com/en-us/industry/manufacturing/enable-intelligent-factories
- https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- https://www.mtconnect.org/standard-download20181
- https://reference.opcfoundation.org/Machinery/v102/docs/1
- https://www.nist.gov/document/4mq2hardwickrequirementsfordigitaltwinmanfframeworkpdf
- https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa99

## Scorecard

Scores are 0-5. "Before" is the current branch posture before this pass. "After" is after the safe remediations in this pass. "Future target" is a realistic next enterprise baseline, not a rewrite promise.

| category | before | after | future target | evidence | gap closed by this pass |
|---|---:|---:|---:|---|---|
| Execution truth integrity | 3.4 | 3.8 | 4.6 | `DispatchController` plus `ShopfloorExecutionService` remain one dispatch/report truth path; JSON compatibility still primary. | Hardened mobile inspection bridge, blocking catalog, replay handling, AI feedback write controls. |
| Transaction model / event history | 3.7 | 4.0 | 4.7 | Production report events and dispatch lifecycle events exist; snapshots remain compatibility read models. | Mobile inspection replay now dedupes and rejects conflicts; DB bridge adds inspection replay columns. |
| Planning-to-execution consistency | 3.3 | 3.6 | 4.6 | Order/planning truth still has JSON stores and DB mirrors; dispatch carries work order/job/order references. | Documented staged source-of-truth decision, fixed order schedule aliases to the existing scheduling controller, and required source-order write permission for hold release. |
| Quality / EQMS integration | 3.1 | 3.8 | 4.7 | First-piece gate exists in execution, but mobile capture was weak and file-only. | Added structured first-piece measurement validation and DB mirror into `mobile_inspection_captures`. |
| Digital thread continuity for CNC | 3.6 | 3.9 | 4.7 | Dispatch/report payloads carry WO/JO/operation/work center/machine/program/setup/inspection fields. | Inspection captures now preserve machine/equipment/work center/client/replay context. |
| Traceability / genealogy | 2.6 | 2.8 | 4.6 | Genealogy services and migrations exist, but dispatch/report do not emit complete genealogy edges. | Preserved trace-ready fields; deferred full genealogy edge emission. |
| Reason-code and master-data governance | 3.4 | 4.0 | 4.7 | Downtime/NG/rework governed; blockers had fallback drift. | Added explicit `blocking_reason_codes`; removed downtime fallback for blockers. |
| Operator qualification / authorization rigor | 3.1 | 3.2 | 4.6 | Mobile queue has qualification gate; dispatch reporting uses assignment and governance hooks, not full skill matrix matching. | Kept guardrails; documented full skill/cert enforcement as deferred. |
| Multisite / plant / site semantics | 3.0 | 3.1 | 4.6 | Org/site fields exist in enterprise migrations and dispatch contracts; not fully DB-primary. | Documentation now marks org/site as required digital-thread context when available. |
| Interoperability readiness | 3.2 | 3.3 | 4.6 | MTConnect/connectivity tables and machine IDs exist; no machine ingestion required in Phase 1. | Manual inspection/execution contracts use stable machine/equipment and timestamps. |
| AI / copilot architecture quality | 3.0 | 3.6 | 4.5 | AI scheduling is advisory, DB-first with JSON fallback, and execution facts remain MOM/MES authority. | AI feedback write is CSRF/idempotency guarded; recommendation actions are explicitly pending/advisory; AI ETL now extracts `shopfloor_execution` features from canonical execution facts. |
| OT / IT security and governance | 3.4 | 4.0 | 4.8 | Existing auth/role/CSRF/audit middleware; some write paths were inconsistent. | Added CSRF to API key writes and AI feedback; hardened local storage traversal/first-write behavior; hold release now checks order write authority before mutation. |
| Performance / scalability | 3.5 | 3.7 | 4.5 | Operator dispatch retrieval is single-pass; mobile offline replay was append-only without dedupe. | Offline replay now dedupes inspection facts and rejects divergent replays. |
| Developer architecture quality | 3.7 | 4.0 | 4.6 | Custom MVC/service pattern preserved; focused service/migration/test changes. | Added tests and docs without introducing a second MES or framework rewrite. |

## Strict hypotheses

| hypothesis | result | severity | evidence | remediation |
|---|---|---:|---|---|
| H1 dispatch truth weakly file-backed | Confirmed | P1 | Dispatch targets/logs/events still use JSON compatibility stores with DB bridges. | Documented staged JSON-live/DB-bridge model; no new conflicting store. Full DB-primary cutover deferred. |
| H2 production reporting last-write-wins | Partially refuted | P1 | Report and lifecycle event journals exist; snapshots remain derived read models. | Mobile inspection capture now also has replay-safe event-like append behavior. |
| H3 lifecycle/edit constraints naive | Partially confirmed | P1 | Target lifecycle locks were previously improved; full ERP release/hold governance is not DB-primary. | Hold release authority and schedule alias drift fixed; broad order-release governance remains staged. |
| H4 validation weak | Confirmed | P1 | Mobile first-piece allowed empty measurements and weak result semantics; planner schedule slot writes accepted weak date/time/priority context. | First-piece now requires structured measurements and valid result; schedule slot create/update validates date, time range, and priority. |
| H5 operator dispatch retrieval inefficient | Refuted | P3 | `getOperatorDispatch()` reads target/log stores once and maps logs by target. | No change needed. |
| H6 assignment/authorization unsafe | Refuted for dispatch reports, partially confirmed for mobile capture | P2 | Dispatch rejects blank assignment reports without override; mobile capture needed stronger operator/WO guards. | Mobile inspection now requires nonblank operator and work order. |
| H7 governed blocker reasons missing/superficial | Confirmed | P1 | Blocking reasons could fall back to downtime catalog. | Added blocker catalog and removed fallback. |
| H8 qualification controls absent/weak | Confirmed | P2 | Mobile start uses qualification gate; dispatch does not fully enforce operation-machine skill matrix. | Deferred full skill/cert enforcement because it needs master-data policy design beyond this patch. |
| H9 digital-thread links weak | Confirmed | P2 | Inspection capture did not preserve enough operation/equipment/replay context. | Added machine/equipment/work center/client/idempotency/fingerprint bridge fields. |
| H10 inspection gating weak/detached | Confirmed | P1 | First-piece gate checked mobile store, but capture schema and DB bridge were weak. | Capture now validates first-piece facts and mirrors to DB table used by gate when available. |
| H11 idempotency/offline reconciliation weak | Confirmed | P1 | Offline sync appended duplicate inspection facts and did not detect divergent replays. | Added idempotency/fingerprint dedupe and conflict rejection for offline/mobile inspection. |
| H12 AI detached from canonical execution | Confirmed | P2 | Legacy JSON fallback remains, but DB-backed AI tables and execution bridge facts exist. | AI stays advisory; feedback write hardened with CSRF/idempotency; recommendation records are pending/human-review only; `shopfloor_execution` ETL grounds future AI features in accepted MOM/MES execution facts. |
| H13 duplicate/drifting concepts unresolved | Confirmed | P2 | JSON orders/dispatch/mobile, DB MES/mobile tables, and AI files overlap. | Source-of-truth docs now explicitly classify operational truth, compatibility, bridge, and projection stores. |
| H14 prior prompt debt unfinished | Confirmed | P1 | Required doc names were missing and mobile/AI/security gaps remained. | Added missing docs, mobile bridge, reason codes, CSRF/idempotency hardening, tests. |

## Six-agent findings

- Agent 1 - ERP / Planning / Lifecycle Governance: order/planning data remains split between JSON stores and richer DB schema. Hold release authorization and stale schedule aliases were safe to fix now; full DB-primary planning governance is deferred.
- Agent 2 - MOM / MES Shopfloor Execution: dispatch/reporting are the correct Phase 1 extension points; operator retrieval is not the bottleneck; mobile/offline inspection replay was the confirmed weak area and was fixed.
- Agent 3 - EQMS / Quality / SPC / Compliance: quality capture needed first-piece measurement structure and a DB bridge. This pass validates first-piece measurements and shadows captures to `mobile_inspection_captures`.
- Agent 4 - CNC / Digital Thread / Connectivity: digital-thread fields exist but are not fully indexed in every canonical projection. This pass keeps stable machine/equipment/work-center semantics and preserves replay/inspection context for later MTConnect/OPC UA correlation.
- Agent 5 - AI / Analytics / Copilot / Data Platform: AI scheduling remains advisory. This pass prevents AI feedback from being an uncontrolled write path, makes recommendation actions explicitly pending/human-reviewed, and grounds future AI features in `shift_production_log` via projection-only `shopfloor_execution` ETL.
- Agent 6 - Security / Reliability / Performance / DevEx: CSRF was inconsistent on API-key and AI feedback writes; local storage first-write path was fragile. Both were fixed, with regression tests.

## Target-state architecture decision

The lowest-risk path is a staged canonical execution backbone:

- Planner dispatch and operator reporting stay on existing `DispatchController` and `ShopfloorExecutionService`.
- JSON dispatch/mobile files remain compatibility stores for current legacy fallback behavior.
- DB tables remain bridges/readiness stores until a later DB-primary migration is explicitly executed.
- Append-only production and lifecycle events are audit truth; snapshots are derived read models.
- Mobile inspection capture is strengthened as quality evidence and mirrored to DB when available.
- AI scheduling, feedback, analytics, and copilot features are advisory/projection-only and cannot dispatch, complete, or command work.

## Remaining blockers

- Full DB-primary authority for dispatch/order/mobile execution requires a dedicated migration and reconciliation release.
- Full skill/certification matching for dispatch reporting requires governed role/skill-to-operation policy data.
- Full NCR/CAPA/SPC enforcement is not in this patch; first-piece gating is the Phase 1 quality control.
- Full genealogy edge emission from every execution event remains deferred until serial/lot/traveler policy is finalized.
- MTConnect and OPC UA ingestion remain future integrations; this patch only preserves stable identifiers and timestamps.

# World-Class Positioning Gap - Tranche 4

**Declared:** 2026-04-13
**Scope:** Backend authority, digital-thread evidence, and runtime proof for the next ERP + MOM + MES + eQMS uplift tranche.

## Reaudit Inputs

Read before implementation:

- `standards/README.md`
- `standards/01-immutable-rules.md`
- `standards/32-module-architecture-v2.md`
- `standards/33-api-mapping-per-module.md`
- `mom/database/config.php`
- `mom/database/Connection.php`
- `mom/database/DataLayer.php`
- `mom/api/services/IdempotencyService.php`
- `mom/api/services/PostgresIdempotencyReplayRepository.php`
- `mom/api/services/FileIdempotencyReplayRepository.php`
- `mom/api/services/OrderWorkflowService.php`
- `mom/api/services/JsonOrderWorkflowRepository.php`
- `mom/api/services/MasterDataService.php`
- `mom/api/services/JsonMasterDataRepository.php`
- `mom/api/services/OutboxWorker.php`
- `mom/api/services/EpicorIntegrationService.php`
- `mom/api/services/EpicorInboundWorker.php`
- `mom/api/services/EventBus.php`
- `mom/api/services/DomainEvent.php`
- `mom/api/services/AuditTrail.php`
- `mom/api/services/EvidenceVaultService.php`
- `mom/api/services/QualityIntegrationService.php`
- `mom/api/services/ExceptionService.php`
- `mom/api/services/ShipmentGateService.php`
- `mom/api/controllers/ProductPassportController.php`
- `mom/api/controllers/HealthController.php`
- `mom/api/index.php`
- `mom/api/routes/*.php`
- `mom/tests/*`
- `mom/docs/system/world-class-benchmark-gap-tranche3.md`
- `mom/docs/system/backend-authority-closure-tranche2.md`

No `AGENTS.md` files were present in this workspace.

## Benchmark Matrix

| Dimension | Classification | Verified evidence | Gap |
|---|---:|---|---|
| Level 3 / Level 4 clarity | YELLOW | Schema has canonical MES/eQMS/ERP waves; DataLayer reports MES/Epicor runtime read modes; Epicor integration services exist. | Runtime L3-L4 contracts are still split across JSON runtime stores, route services, and schema artifacts. |
| Authoritative runtime | YELLOW | Idempotency is PostgreSQL-authoritative when DB mode is enabled; order workflow and master data now have repository boundaries and runtime authority probes. | Order workflow and master data still classify as JSON primary unless full PG persistence is promoted. |
| Integration backbone | YELLOW | `OutboxWorker`, `EpicorIntegrationService`, and `EpicorInboundWorker` expose retry, dead-letter, ack, and reconciliation concepts. | Semantics are still worker/runtime-store centered, not a fully transactional outbox/inbox backbone. |
| Digital thread / genealogy / production history | RED | Existing tables include `job_event`, `genealogy_link`, MES genealogy tables, passport events, order timelines, evidence vault, and audit trail. | No unified canonical operational event ledger spans production, quality, evidence, and genealogy with an authoritative append/query model. |
| Closed-loop quality | YELLOW | NCR/CAPA, shipment gates, supplier quality, FMEA/APQP, inspection, and evidence services exist. | Cross-loop invariant proof remains partial; quality events are not yet consistently linked through a canonical event backbone. |
| Supplier quality | YELLOW | Supplier controller/service covers scorecards, incoming inspection, ASL, SCAR, audits. | Supplier loop is not promoted in this tranche unless event backbone foundation lands first. |
| Compliance-grade records and signatures | YELLOW | Audit trail, evidence custody, approvals, e-signature schema, upload hardening, and retention artifacts exist. | Part 11-grade validation/record-copy/signature controls are not uniformly enforced across manufacturing execution. |
| Observability | YELLOW | Health status includes runtime authority; idempotency has counters; SliceObservability supports correlation for foundation governance. | Digital-thread/event backlog metrics are missing before this tranche. |
| Security / SDL readiness | YELLOW | API middleware, auth guards, upload hardening, audit trail, docs from prior tranches exist. | OT/security lifecycle and SSDF control evidence are still not complete runtime controls. |
| Control-surface modularity | GREEN | `mom/api/index.php` is bootstrap plus route modules; route module order preserves legacy action precedence. | Some route modules remain broad, but the old monolithic registration blocker is closed enough for this tranche. |
| Multisite / canonical data readiness | YELLOW | Schema includes org/company/site/plant scope fields and canonical enterprise tables. | Runtime services do not uniformly enforce site/plant authority or prove multisite concurrency. |
| Stress / failover / concurrency proof | RED | Idempotency has in-progress/conflict tests; DB connection has transaction helpers. | No system-wide concurrency/stress proof for event history, integration, or quality loops. |

## Prior Tranche Improvements Credited

- Idempotency replay state is repository-based and PostgreSQL-authoritative when the existing database mode is enabled.
- Runtime authority posture is exposed through health/status reports.
- Order workflow and master data now have repository boundaries and explicit readiness classifications.
- Route registration is modularized into route modules while preserving the MVC entrypoint and legacy action compatibility.

## Unproven Areas

- Digital thread is present as scattered tables and JSON-backed services, not as one canonical append/query backbone.
- Product passport and genealogy routes are still file-centric and not sufficient evidence for enterprise production history authority.
- Outbox/inbox reliability is partial and not yet a transactionally authoritative backbone.
- Closed-loop quality has important service logic but lacks a single traceable production-quality-evidence timeline.

## This Tranche Implements

Priority A only unless it completes cleanly:

1. Add an authoritative canonical operational event ledger for manufacturing/quality execution.
2. Cover these event families in one taxonomy:
   - order/work execution event
   - inspection/quality event
   - NCR/CAPA linkage event
   - evidence attachment/approval event
   - genealogy/material-lot relation event
3. Add immutable append behavior with event hash, previous event hash, idempotency fingerprint, correlation fields, org/scope fields, source aggregate reference, actor metadata, and payload/metadata JSON.
4. Add repository boundary with PostgreSQL primary path and explicit file fallback adapter for JSON-only runtimes.
5. Add a production-history/closed-loop-quality timeline read model.
6. Expose runtime authority/probe state so the slice is observable through backend health/status.
7. Add focused tests for append, replay/conflict, immutable hash chain, read model, and production-quality-evidence linkage.

## This Tranche Does Not Implement

- Full platform-wide event sourcing.
- Full PostgreSQL promotion of order workflow or master data.
- Full transactional outbox/inbox/reconciliation closure.
- Full closed-loop quality invariant enforcement across shipment release.
- New AI/search/frontend work.
- Route-module restructuring beyond adding the narrow event-read surface.

## Why This Slice Maximizes Movement

The largest verified RED gap is the absence of a canonical manufacturing event backbone. Adding a small authoritative event ledger gives the repo a measurable digital-thread foundation that can later absorb order workflow, inspection/NCR/CAPA, evidence, genealogy, and integration events without a big-bang rewrite. It also creates a read model operators can query, which is stronger evidence than adding more menu routes or static docs.

## Migration Plan

- Add migration `098_canonical_manufacturing_event_backbone.sql`.
- Regenerate `database/schema.sql`.
- Regenerate table registry artifacts from the schema.
- Refresh schema authority summaries so migration range/table counts remain truthful.

## Implementation Closure Evidence

Priority A was implemented in this tranche.

- Added `mes_operational_event_ledger` as the canonical immutable operational event ledger for production, inspection, NCR/CAPA linkage, evidence/approval, and genealogy relation events.
- Added repository boundary:
  - PostgreSQL repository is the authoritative backend when DB authority is enabled.
  - File repository is explicit compatibility fallback for JSON-only runtimes.
- Added first-class payload schema governance through `payload_schema_version`.
- Added event hash and aggregate-local `previous_event_hash` chain fields for immutable history verification.
- Added idempotency/replay conflict handling by event id and semantic idempotency identity.
- Added a production-history timeline query surface through `/api/manufacturing-events/timeline` and legacy action `manufacturing_event_timeline`.
- Added runtime authority probe through `/api/manufacturing-events/probe`, legacy action `manufacturing_event_probe`, and the existing runtime authority/health posture.
- Regenerated schema, registry, contract, publication-proof, and schema-authority artifacts after the migration.

Verification evidence generated:

- Publication pipeline PASS with 660 schema tables, 3621 endpoints, and zero critical system-contract gaps.
- Data schema admin workspace probe returned zero outdated artifacts, zero operational risks, and zero governance gaps.
- Focused unit tests cover append, immutable hash chain, duplicate replay, conflict, taxonomy coverage, timeline read model, and PostgreSQL repository path behavior.

## Compatibility Plan

- Existing `api.php?action=...` and `/api/...` surfaces are preserved.
- New read-only event timeline/probe routes are additive.
- JSON-only runtimes use an explicit file fallback repository under `data/manufacturing-events/`; DB-enabled runtimes use PostgreSQL as the authoritative path.
- Existing product passport, evidence, quality, order, and shipment-gate services are not replaced in this tranche.

## Deferred Items

- Priority B closed-loop quality invariant: deferred until the canonical event backbone is merged and tested.
- Priority C integration reliability: deferred unless Priority A finishes with remaining budget.
- Priority D broader observability: limited to touched event-backbone counters/probes in this tranche.
- Priority E security/compliance readiness map: deferred unless all implementation and verification work completes cleanly.

These deferrals are intentional. The tranche closes the largest RED gap, digital-thread/production-history authority, without pretending that closed-loop quality invariants, transactional integration reliability, multisite enforcement, or failover proof are complete.

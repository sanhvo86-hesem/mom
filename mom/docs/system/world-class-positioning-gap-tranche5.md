# World-Class Positioning Gap - Tranche 5

**Declared:** 2026-04-13
**Scope:** Backend canonical manufacturing spine, production-history read model, workforce qualification gates, and runtime proof.

## Reaudit Inputs

Read before implementation:

- `standards/README.md`
- `standards/01-immutable-rules.md`
- `standards/32-module-architecture-v2.md`
- `standards/33-api-mapping-per-module.md`
- `mom/database/config.php`
- `mom/database/Connection.php`
- `mom/database/DataLayer.php`
- `mom/database/migrations/072_canonical_foundation_governance.sql`
- `mom/database/migrations/073_canonical_master_data_core.sql`
- `mom/database/migrations/074_canonical_engineering_definition.sql`
- `mom/database/migrations/075_canonical_planning_erp_orchestration.sql`
- `mom/database/migrations/076_canonical_mes_execution_spine.sql`
- `mom/database/migrations/077_canonical_inventory_cost_traceability.sql`
- `mom/database/migrations/078_canonical_eqms_compliance_backbone.sql`
- `mom/database/migrations/098_canonical_manufacturing_event_backbone.sql`
- `mom/data/registry/table-registry.json`
- `mom/data/registry/relation-map.json`
- `mom/data/registry/domain-architecture.json`
- `mom/data/registry/frontend-foundation-catalog.json`
- `mom/api/services/ManufacturingEventBackboneService.php`
- `mom/api/services/PostgresManufacturingEventRepository.php`
- `mom/api/services/FileManufacturingEventRepository.php`
- `mom/api/services/MobileWorkQueueService.php`
- `mom/api/controllers/MobileController.php`
- `mom/api/services/EvidenceVaultService.php`
- `mom/api/controllers/ProductPassportController.php`
- `mom/api/services/ShipmentGateService.php`
- `mom/api/services/RuntimeAuthorityService.php`
- `mom/docs/system/world-class-positioning-gap-tranche4.md`

No `AGENTS.md` files were present in this workspace.

## Benchmark Matrix

| Dimension | Rating | Verified evidence | Gap |
|---|---:|---|---|
| Canonical enterprise manufacturing model | YELLOW | Canonical tables exist for enterprise/company/site/plant/work center/work unit, item/revision/site, work definition/operation, production/work order/job, lot/serial/genealogy, inspection, evidence, training, and HCM qualification requirements. | The repo lacks a runtime service that proves which entities are canonical owners, what their key strategy is, which org scope is required, and which source authority owns each slice. |
| Multisite readiness | YELLOW | Many canonical tables and registry entries contain site/plant/company scope and source lineage columns. | Runtime services do not consistently validate required scope or expose a canonical site/plant relation map. |
| Genealogy / production history | YELLOW | Tranche 4 added `mes_operational_event_ledger` with production, quality, evidence, approval, and genealogy event families plus a timeline query. | No production-history packet read model yet groups events into order, operation, lot/serial, quality, evidence, and actor sections. |
| Closed-loop quality | YELLOW | Inspection, NCR/CAPA, shipment gates, evidence, supplier quality, and canonical event linkage exist. | A closed-loop invariant is still partial; this tranche will strengthen history/read-model linkage, not shipment-release enforcement. |
| Workforce qualification linkage | RED | Tables exist for employees, training records, skills, certifications, HCM qualification requirements, and MES operator qualifications. | Operation/task start is not blocked by qualification status, expiry, skill level, or certification evidence. |
| Integration reliability | YELLOW | Outbox/inbound/sync workers and dead-letter concepts exist. | Transactional outbox/inbox/reconciliation is still deferred from prior tranches. |
| Observability | YELLOW | Runtime authority report includes idempotency, order workflow, master data, and manufacturing events; event service has counters. | Canonical spine validation failures, production-history queries, and qualification gate blocks are not yet observable. |
| Security / SDL readiness | YELLOW | Auth middleware, RBAC, upload hardening, audit trail, evidence custody, and prior readiness docs exist. | OT/62443 and SSDF proof remains distributed and not complete runtime evidence. |
| Compliance-grade records/signatures | YELLOW | Audit trail, evidence vault, e-signature schema, approval workflow, and retention-oriented artifacts exist. | Qualification gates and production-history packets are not yet connected to electronic-record evidence semantics. |
| Control-surface modularity | GREEN | API route registration is split into route modules; tranche 4 added narrow additive routes. | Some modules remain large, but this is not the highest-value tranche 5 gap. |
| Stress / failover proof | RED | Idempotency and event append semantics have focused tests. | No live DB concurrency/failover proof for the canonical model, digital thread, or qualification gates. |

## What Tranche 5 Implements

Priority A:

- Add a runtime canonical manufacturing spine service that maps existing canonical tables instead of creating duplicate entities.
- Validate canonical key strategy, required org scope fields, relation map, and source authority metadata.
- Expose probe/read model evidence through backend API and runtime authority posture.

Priority B:

- Add a production-history packet read model over the canonical event ledger.
- Keep deterministic ordering and group events by execution, quality, evidence, genealogy, and workforce/actor context.

Priority C:

- Add a workforce qualification gate for mobile work-queue task start.
- Block execution when configured required skill/certification is missing, expired, suspended, or below required proficiency.
- Emit a canonical manufacturing event for pass/block decisions so denials are visible in the production history.

## What Tranche 5 Defers

- Full PostgreSQL-native promotion of every order/master/workforce path.
- Full backward-forward genealogy graph traversal across all historical tables.
- Shipment release invariant changes.
- Transactional outbox/inbox/reconciliation closure.
- Live DB concurrency/failover tests.
- Complete OT/62443, SSDF, and Part 11 readiness map.

## Why This Maximizes Movement

The repo already has many schema objects. The limiting gap is proof: operators and admins need to know which manufacturing identities are canonical, whether history can be queried as one packet, and whether a person is qualified before execution starts. This tranche adds those runtime invariants and read models without a broad rewrite or duplicate canonical tables.


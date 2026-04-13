# World-Class Positioning Gap - Tranche 9

**Declared:** 2026-04-13
**Scope:** Supplier-to-production-to-customer traceability, lot/serial/material genealogy, supplier quality impact, containment response packet, and traceability proof layer.

## Reaudit Inputs

Read before implementation:

- `standards/README.md`
- `standards/01-immutable-rules.md`
- `standards/32-module-architecture-v2.md`
- `standards/33-api-mapping-per-module.md`
- `mom/docs/system/world-class-positioning-gap-tranche7.md`
- `mom/docs/system/world-class-positioning-gap-tranche8.md`
- `mom/docs/system/trusted-release-record-readiness-tranche6.md`
- `mom/docs/system/connected-governance-readiness-tranche7.md`
- `mom/database/config.php`
- `mom/database/Connection.php`
- `mom/database/DataLayer.php`
- `mom/database/migrations/035_supplier_quality_management.sql`
- `mom/database/migrations/066_traceability_serialization.sql`
- `mom/database/migrations/077_canonical_inventory_cost_traceability.sql`
- `mom/database/migrations/098_canonical_manufacturing_event_backbone.sql`
- `mom/api/services/ManufacturingEventBackboneService.php`
- `mom/api/services/ProductionHistoryReadModelService.php`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/ConnectedGovernanceService.php`
- `mom/api/services/PlanningScenarioService.php`
- `mom/api/services/SupplierQualityService.php`
- `mom/api/services/ShipmentGateService.php`
- `mom/api/controllers/ProductPassportController.php`
- Focused tests for manufacturing events, production history, trusted release records, connected governance, planning scenario, supplier quality, and current smoke harnesses.

No `AGENTS.md` files were present in this workspace.

## Benchmark Gap Matrix

| Dimension | Rating | Verified evidence | Unproven claim / gap |
|---|---:|---|---|
| Lot / serial / material traceability | YELLOW | Migrations `066` and `077` define trace genealogy batches/links, recall campaigns, lot, serial, inventory ledger, and material traceability concepts. Migration `098` adds `mes_operational_event_ledger` with genealogy relation event columns. | No authoritative backward/forward trace service currently turns genealogy events into deterministic upstream/downstream read models. |
| Supplier-to-receipt-to-inspection linkage | YELLOW | `SupplierQualityService` manages incoming inspections, skip-lot, ASL, SCAR, audits, and scorecards; migration `035` defines `incoming_inspections` and `scar_records`. | Supplier quality remains mostly file-backed/shadow-write and is not yet linked to production genealogy impact in a service invariant. |
| Production consumption genealogy | YELLOW | MES schema and `RuntimeShadowSync` reference `mes_material_consumption` and `mes_part_genealogy`; event ledger supports `trace.genealogy_relation`. | Consumption-to-output trace is not yet enforced by a runtime service with broken-reference rejection and deterministic graph traversal. |
| Shipment/customer traceability | YELLOW | Shipping and packing migrations/controllers exist; shipment gates block failed quality state; trusted release packets capture lot/serial identifiers when available. | No authoritative read model traces a shipped output backward to supplier lots or forward from supplier lots to affected shipments. |
| Containment / recall readiness | RED | Migration `066` includes `trace_recall_campaigns`; shipment and release gates exist separately. | No recall-grade containment response packet aggregates issue source, impacted outputs/shipments, evidence, approvals, blockers, and provenance. |
| Supplier quality loop closure | RED | SCAR lifecycle and incoming inspection governance exist; shipment gates know quality blockers. | No backend invariant prevents unresolved supplier quality issues from becoming freely consumable/releasable through genealogy. |
| Traceability query/read-model strength | RED | Production history read model groups genealogy events as a packet section. | It does not do backward/forward graph traversal, impacted-output lookup, or issue-impact summaries. |
| Observability of traceability failures | RED | Runtime authority reports promoted slices through `RuntimeAuthorityService`. | No traceability-specific metrics/probe exist for genealogy query, broken link rejection, supplier quality block, shipment eligibility block, or containment packet blockers. |
| Compliance-grade record posture for traceability/recall flows | YELLOW | Manufacturing event ledger is immutable with event hashes; trusted release packets have packet hash/freeze metadata. | Containment/recall packet freeze/resolution evidence is not implemented; live DB retention/failover proof is still absent. |
| Unproven claims from prior tranches | YELLOW | Tranche 8 docs honestly defer live DB concurrency/failover, full normalized APS persistence, and full genealogy graph projection. | The platform must not claim recall-grade traceability until graph traversal, containment packet, and supplier-quality-to-impact invariants land. |

## Tranche 8 Landing Verification

Priority 0 findings:

- `PlanningScenarioService`, file repository, PostgreSQL repository, controller, route wiring, focused tests, and runtime authority slice exist.
- The planning scenario slice can calculate deterministic finite-capacity blockers, approve/publish blocker-free scenarios, expose dispatch readiness, and record replanning signals.
- Strict Tranche 8 reaudit closed PostgreSQL schema mismatches for `created_by` UUID and `scenario_name` length, added row locking for scenario signal updates, and hardened `shift_start` parsing.
- Trusted release record, connected governance, production history, and qualification gate references required by traceability are present in code.
- Remaining unproven prerequisite: live PostgreSQL migration/apply, concurrency, and failover proof are still not executed locally.

## What Tranche 9 Will Implement

Priority A:

- Add a `TraceabilityGenealogyService` over the existing manufacturing event ledger instead of creating a second event system.
- Normalize genealogy links for supplier/receipt lots, internal production lots or serials, production consumption, and shipment package references where data is supplied.
- Reject broken genealogy link input before appending an event.
- Expose deterministic upstream trace, downstream trace, impacted output, and provenance/timeline read models.

Priority B:

- Add supplier-quality issue events tied to incoming inspection / SCAR / NCR and affected material lot.
- Enforce a backend consumption eligibility invariant: unresolved supplier quality issues block production consumption through the traceability service.
- Expose supplier issue impact summary and shipment eligibility blockers through the same genealogy read model.

Priority C:

- Add a containment response packet read model over the genealogy and supplier quality impact path.
- Packet will aggregate triggering issue, impacted lots/shipments, trace references, evidence/approval references, blockers, packet hash, and deterministic provenance.
- Resolution/closure is blocked when impact assessment or required evidence/approval is missing.

Priority D:

- Add runtime authority/probe metrics for traceability queries, broken links, supplier quality blocks, shipment eligibility blocks, containment packets, and containment blockers.

## What Tranche 9 Will Defer

- Full live PostgreSQL migration/apply, concurrency, lock contention, and failover proof.
- Full projection from every legacy product-passport, receiving, shipment, inventory, and SCAR table into the event ledger.
- Full customer recall campaign workflow automation and external customer/supplier communication dispatch.
- Full serial-depth genealogy for every product family when only lot-level data is supplied.
- UI/dashboard redesign, APS optimization, AI/search, and cosmetic route reshaping.

## Why This Is Highest Leverage

Prior tranches created event, production history, release packet, connected governance, and planning authority slices. The next largest world-class blocker is that supplier quality, material genealogy, shipment trace, and containment response are still separate surfaces. A bounded traceability spine over the existing immutable event ledger gives the repo a measurable path toward Critical Manufacturing-style genealogy and ETQ/MasterControl-style supplier quality containment without a broad rewrite.

## Implemented Closure

Priority 0:

- Verified Tranche 8 planning prerequisites are present in code: `PlanningScenarioService`, repositories, controller, route wiring, runtime authority reporting, focused tests, and strict PostgreSQL schema-helper hardening.
- Verified trusted release record, connected governance, production history, and manufacturing event backbone prerequisites are present in code.
- Confirmed live PostgreSQL migration/apply, lock-contention, and failover proof remain unexecuted locally and are still deferred.

Priority A:

- Added `TraceabilityGenealogyService` over the existing `ManufacturingEventBackboneService` / `mes_operational_event_ledger`; no second event system was introduced.
- Added canonical genealogy link normalization for:
  - supplier or receipt lot to internal lot
  - material consumption to production output lot/serial
  - production output to shipment/packing/package reference
- Added broken-reference rejection before appending genealogy relation events.
- Added deterministic read models:
  - upstream trace
  - downstream trace
  - impacted outputs
  - provenance event id list
  - site/scope-filtered trace behavior

Priority B:

- Added supplier quality issue event capture tied to affected lot/serial, incoming inspection, SCAR, NCR/CAPA, supplier/vendor, evidence, and status.
- Added backend consumption eligibility invariant: unresolved supplier quality issues block production consumption through `recordProductionConsumption`.
- Added shipment eligibility blockers by tracing upstream from shipment/package/output to supplier lots and checking unresolved supplier quality issues.
- Added supplier issue impact summary that traces affected downstream lots, production outputs, and shipment references.
- Closure event for the same supplier issue preserves linkage while clearing eligibility when the latest issue status is closed/released/resolved.

Priority C:

- Added containment response packet assembly over the same traceability read model.
- Packet includes triggering issue reference, affected lot, impacted outputs, impacted shipment references, evidence ids, approval ids, blockers, deterministic provenance, retention metadata, and SHA-256 packet hash.
- Added `resolveContainmentPacket` invariant: resolution is blocked unless impact assessment and required evidence/approval assertions are satisfied.
- Full customer recall campaign automation remains deferred; implemented packet is containment/impact-response grade, not external notification automation.

Priority D:

- `RuntimeAuthorityService` now reports `traceability_genealogy`.
- Traceability probe exposes backend, authority mode, read models, link types, and counters for genealogy append, upstream/downstream query, broken-link rejection, supplier quality blocks, shipment eligibility blocks, containment packets, and containment blockers.

Registry/governance closure found during final smoke:

- Added domain mapping for `107_phase1_shopfloor_execution_bridge.sql` and explicit domain overrides for the control-plane / traceability tables in `108_world_class_control_plane_execution.sql` so generated table architecture can classify all 750 current tables.
- Hardened migration `107` event tables with direct org scope, source lineage, row-version columns, scope/lineage indexes, and row-version triggers.
- Hardened migration `108` projection tables with direct org scope, source lineage, payload schema version, and row-version columns where the registry governance smoke identified direct-scope gaps.
- Updated `ShopfloorExecutionPersistenceService` so PostgreSQL shadow event writes populate org scope and `source_record_id` when those values are supplied.
- Classified `control_plane_object_registry` as a projection/control-plane record in the frontend foundation generator and exempted projection records from false collaboration-contract blockers.
- Regenerated registry/contract proof artifacts after the source fixes. Final publication proof status is `PASS`; wave-gap ledger reports `ready=761`, `partial=0`, `blocked=0`.

## Verification Evidence

- `php -l mom/api/services/TraceabilityGenealogyService.php` -> pass.
- `php -l mom/api/services/ManufacturingEventBackboneService.php` -> pass.
- `php -l mom/api/services/RuntimeAuthorityService.php` -> pass.
- `php -l mom/tests/Unit/Services/TraceabilityGenealogyServiceTest.php` -> pass.
- `php -l mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php` -> pass.
- `php -l mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php` -> pass.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-tranche9-traceability-phpunit-error.log vendor/bin/phpunit --do-not-cache-result tests/Unit/Services/TraceabilityGenealogyServiceTest.php` -> pass, 6 tests, 27 assertions.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-tranche9-focused-phpunit-error.log vendor/bin/phpunit --do-not-cache-result tests/Unit/Services/TraceabilityGenealogyServiceTest.php tests/Unit/Services/ManufacturingEventBackboneServiceTest.php tests/Unit/Services/ProductionHistoryReadModelServiceTest.php tests/Unit/Services/RuntimeAuthorityServiceTest.php tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php` -> pass, 16 tests, 107 assertions.
- `python3 tools/registry/canonical_publication_orchestrator.py` -> pass, publication proof `PASS`.
- `python3 tools/registry/enterprise_registry_doctor.py --write` -> pass, status `watch`, P1 findings `0`.
- `python3 tools/registry/enterprise_frontend_simulator.py` -> pass, status `watch`, blockers `0`.
- `php -d display_errors=1 tests/enterprise_registry_authority_smoke.php` -> pass.
- `php -d display_errors=1 tests/data_schema_admin_smoke.php` -> pass.
- `php -d display_errors=1 tests/backend_smoke.php` -> pass.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-tranche9-full-final2-phpunit-error.log vendor/bin/phpunit --do-not-cache-result` -> pass, 275 tests, 1622 assertions, 1 skipped.
- `git diff --check` -> pass.

## Remaining Unproven Items

- No live PostgreSQL test was executed for traceability ledger writes, graph queries, concurrent appends, or event hash-chain contention.
- The read model currently traverses the bounded event ledger window returned by the repository; a large production deployment still needs indexed graph projection or paged traversal.
- Full projection from legacy `ProductPassportController`, supplier-quality JSON stores, packing JSON stores, inventory ledger rows, and SCAR tables into the event ledger remains future work.
- Full customer recall campaign lifecycle and external communications are deferred.
- Serial-depth trace is supported when serial data is supplied, but not proven across every legacy source table.

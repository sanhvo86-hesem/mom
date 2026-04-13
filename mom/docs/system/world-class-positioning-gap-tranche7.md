# World-Class Positioning Gap - Tranche 7

**Declared:** 2026-04-13
**Scope:** Connected change-to-training-to-execution governance, site rollout state, execution entitlement, and trusted release packet proof for one controlled revision slice.

## Reaudit Inputs

Read before implementation:

- `standards/README.md`
- `standards/01-immutable-rules.md`
- `standards/32-module-architecture-v2.md`
- `standards/33-api-mapping-per-module.md`
- `mom/docs/system/world-class-positioning-gap-tranche5.md`
- `mom/docs/system/world-class-positioning-gap-tranche6.md`
- `mom/docs/system/trusted-release-record-readiness-tranche6.md`
- `mom/database/config.php`
- `mom/database/Connection.php`
- `mom/database/DataLayer.php`
- `mom/database/migrations/078_canonical_eqMS_compliance_backbone.sql`
- `mom/database/migrations/098_canonical_manufacturing_event_backbone.sql`
- `mom/database/migrations/100_trusted_release_record_spine.sql`
- `mom/database/migrations/102_eqms_document_form_control.sql`
- `mom/database/migrations/104_eqms_change_authority_field_governance.sql`
- `mom/api/services/CanonicalManufacturingSpineService.php`
- `mom/api/services/ManufacturingEventBackboneService.php`
- `mom/api/services/ProductionHistoryReadModelService.php`
- `mom/api/services/WorkforceQualificationGateService.php`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/ShopfloorExecutionService.php`
- `mom/api/controllers/DispatchController.php`
- `mom/api/controllers/ManufacturingEventController.php`
- `mom/api/controllers/TrustedReleaseRecordController.php`
- `mom/api/services/RuntimeAuthorityService.php`
- Focused tests for trusted release records, production history, workforce qualification, shopfloor execution, runtime authority, and health runtime authority.

No `AGENTS.md` files were present in this workspace.

## Benchmark Gap Matrix

| Dimension | Rating | Verified evidence | Unproven claim / gap |
|---|---:|---|---|
| Controlled revision governance | YELLOW | Document revision, eQMS document revision, inspection plan, work instruction, change affected/resulting object, and field governance tables exist. | No runtime slice releases a controlled process/document revision into site adoption state and training obligations. |
| Change-to-training linkage | RED | Training matrix/records and workforce qualification gates exist; Tranche 5 gates mobile work queue start when explicit requirements are configured. | A released revision does not automatically create/update training or qualification obligations. |
| Execution entitlement by qualification + active revision | RED | Shopfloor report submission has an assigned-operator guard; workforce qualification gate can block mobile task start. | Shopfloor execution is not blocked by active controlled revision adoption plus training/qualification proof. |
| Site-by-site rollout governance | RED | Canonical services and release packets carry company/legal entity/plant/site fields; graphics governance has unrelated rollout mechanics. | No controlled revision rollout state per plant/site with active/pending_training/blocked semantics for manufacturing execution. |
| Trusted release packet completeness | YELLOW | Tranche 6 release packets include execution, quality, evidence, approval/signature, qualification, provenance, retention, hash, and org scope. | Packet does not yet surface active revision id/version or the qualification assertion used at execution time. |
| Closed-loop quality linkage into release/execution | YELLOW | Manufacturing events support quality, NCR/CAPA, evidence, approvals, and release packet blockers. | This tranche will not implement a new CAPA/SCAR loop; it will make execution/release proof include controlled revision and training assertion references. |
| Observability of governance failures | RED | Runtime authority has promoted slices and health/status surfaces. | No counters or probe exist for revision rollout blocks, training obligations, entitlement denials, site rollout lag, or trusted packet governance blockers. |
| Compliance-grade record posture for the slice | YELLOW | Release packets have deterministic hash/version/freeze/retention metadata and immutable-after-release repository guard. | Connected governance proof is not yet captured as controlled electronic-record context in the production history packet. |
| Multisite enterprise-readiness | YELLOW | Canonical/event/release packet fields include org_company_code, org_legal_entity_code, org_plant_id, org_site_id. | Cross-site rollout coverage and blocker aggregation for revision adoption/training is not queryable. |
| Unproven claims carried by docs but not backed by runtime/code/tests | YELLOW | Prior docs honestly mark live DB concurrency, full HCM DB requirement resolution, full eDHR/eBR, and full genealogy as deferred. | Connected change-to-training-to-execution remains unimplemented and must not be presented as complete until this tranche lands. |

## Tranche 6 Landing Verification

Priority 0 findings:

- `TrustedReleaseRecordService`, `TrustedReleaseRecordRepository`, `PostgresTrustedReleaseRecordRepository`, and `FileTrustedReleaseRecordRepository` exist and implement structured packet assembly, readiness, release, provenance, rollup, probe, fallback classification, and immutable-after-release behavior.
- `mes_trusted_release_record` exists in migration `100_trusted_release_record_spine.sql`.
- `ProductionHistoryReadModelService` builds deterministic packets over the canonical manufacturing event ledger.
- `WorkforceQualificationGateService` enforces configured qualification requirements for mobile task start and emits manufacturing events for pass/block decisions.
- `RuntimeAuthorityService` includes `trusted_release_record`, `production_history`, `canonical_manufacturing_spine`, and `workforce_qualification_gate`.

## What Tranche 7 Will Implement

Priority A:

- Add one connected governance vertical slice for controlled work-instruction/process revision rollout.
- Create repository/service boundaries for controlled revision rollout, training obligations, execution entitlement decisions, and runtime probe/read models.
- On controlled revision release, create or update training obligations for the configured role/site/operation scope.
- Gate a backend execution-critical action: shopfloor production report submission.
- Block execution when the site has not adopted the active revision, rollout is not active, training/qualification is missing, or the assertion is expired/superseded.
- Emit canonical manufacturing events for revision release, obligation creation, entitlement allowed/denied, and assertion context.
- Surface active revision, operator readiness, rollout readiness, and blockers through service/controller query surfaces.

Priority B:

- Make rollout state explicit by company/legal entity/plant/site scope with planned, pending_training, active, blocked, superseded, and retired states.
- Add deterministic enterprise rollout coverage and blocked execution aggregation by site.
- Prevent scope leakage in query filters.

Priority C:

- Ensure the trusted production/release packet can carry active revision and qualification assertion references through the production-history read model.
- Add packet blocker/provenance tests for missing governance prerequisites and immutable packet behavior where applicable.

Priority D:

- Add runtime authority/probe counters for rollout releases, training obligations, entitlement checks, entitlement blocks, site rollout lag, and packet governance blockers.

## What Tranche 7 Will Defer

- Full DB-backed HCM/training matrix resolution for every role and document type.
- Full document-control workflow redesign.
- Full CAPA/SCAR/training closure loop.
- Live PostgreSQL concurrency/failover proof for rollout state and entitlement decisions.
- Full platform-wide eDHR/eBR, Part 11 validation package, and export copy generation.
- APS optimization, AI/search, and UI work.

## Why This Is Highest Leverage

Prior tranches established canonical identities, manufacturing events, production history, qualification gates, and trusted release packets. The largest remaining governance gap is that a released process/document revision does not force training obligations or block execution by site adoption and qualification status. Closing this slice moves the backend from isolated controls toward connected manufacturing governance without a broad rewrite or duplicate canonical owners.

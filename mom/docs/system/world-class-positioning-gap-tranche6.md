# World-Class Positioning Gap - Tranche 6

**Declared:** 2026-04-13
**Scope:** Trusted manufacturing release record, eDHR/eBR-style production packet, enterprise rollout shape, and proof for the release-critical slice.

## Reaudit Inputs

Read before implementation:

- `standards/README.md`
- `standards/01-immutable-rules.md`
- `standards/32-module-architecture-v2.md`
- `standards/33-api-mapping-per-module.md`
- `mom/docs/system/world-class-positioning-gap-tranche4.md`
- `mom/docs/system/world-class-positioning-gap-tranche5.md`
- `mom/database/config.php`
- `mom/database/Connection.php`
- `mom/database/DataLayer.php`
- `mom/database/migrations/078_canonical_eqms_compliance_backbone.sql`
- `mom/database/migrations/098_canonical_manufacturing_event_backbone.sql`
- `mom/data/registry/table-registry.json`
- `mom/data/registry/relation-map.json`
- `mom/api/services/CanonicalManufacturingSpineService.php`
- `mom/api/services/ManufacturingEventBackboneService.php`
- `mom/api/services/ProductionHistoryReadModelService.php`
- `mom/api/services/WorkforceQualificationGateService.php`
- `mom/api/services/ShipmentGateService.php`
- `mom/api/services/EvidenceVaultService.php`
- `mom/api/services/ApprovalGroupService.php`
- `mom/api/services/ApprovalWorkflowAdapter.php`
- `mom/tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php`
- `mom/tests/Unit/Services/ProductionHistoryReadModelServiceTest.php`
- `mom/tests/Unit/Services/WorkforceQualificationGateServiceTest.php`

No `AGENTS.md` files were present in this workspace.

## Benchmark Gap Matrix

| Dimension | Rating | Verified evidence | Unproven claim / gap |
|---|---:|---|---|
| Trusted release record readiness | RED | Shipment gate checks exist, evidence vault has hash/custody, approval and e-signature tables exist, and production-history packets exist. | No authoritative immutable release packet aggregates execution, quality, evidence, qualification, approval, release decision, and retention metadata. |
| Production history / genealogy trustworthiness | YELLOW | `ProductionHistoryReadModelService` builds deterministic packets over `mes_operational_event_ledger`; genealogy events are part of taxonomy. | Full backward-forward genealogy graph projection across legacy passport/genealogy tables remains partial. |
| Closed-loop release quality | YELLOW | Event taxonomy covers inspection, NCR/CAPA linkage, evidence, approval, and shipment-gate services exist. | Release is not yet blocked by service-layer invariant over required quality/evidence/signature/qualification assertions. |
| Qualification-gated execution | YELLOW | `WorkforceQualificationGateService` blocks mobile task start when configured requirements are missing or expired; tests prove pass/block behavior. | Full live DB-backed HCM/training requirement resolution remains deferred; runtime with no configured requirements is explicitly `authority_partial`. |
| Compliance-grade record controls | YELLOW | Evidence chain, custody, approval/e-signature schemas, audit trail, and retention policy tables exist. | No release packet freeze/hash/version/record-copy semantics exist for production record release. |
| Multisite rollout shape | YELLOW | Canonical event ledger and canonical spine expose org/company/site/plant fields. | Release readiness and blocker rollups are not queryable by site/plant for this production-record slice. |
| Observability of release-critical flows | YELLOW | Runtime authority report includes idempotency, order workflow, master data, manufacturing events, canonical spine, production history, and qualification gate. | No release packet assembly/block/release counters or release-specific probe exists. |
| Security / SDL readiness for release-critical flows | YELLOW | Auth/RBAC middleware, audit middleware, upload hardening, e-signature and approval bridge exist. | Release-specific Part 11/SSDF/OT proof is not consolidated; live abuse/failover tests are not present. |
| Control-surface modularity | GREEN | Route registration is modularized; operations routes already hold manufacturing event/read-model routes. | The operations route module remains broad but does not block this release slice. |
| Stress / failover proof | RED | Idempotency and manufacturing event append have unit-level replay/conflict tests. | No live DB concurrency/failover proof for release packet freeze or multisite rollup. |

## Tranche 5 Landing Verification

Priority 0 evidence:

- `CanonicalManufacturingSpineService` exists and validates 20 critical identity definitions against current registry authority.
- `ProductionHistoryReadModelService` exists and groups deterministic production history by execution, quality, evidence, genealogy, approval, and workforce sections.
- `WorkforceQualificationGateService` exists and blocks mobile task start when configured qualifications are missing, expired, revoked, inactive, suspended, or below minimum proficiency.
- Focused prerequisite tests passed before tranche 6 implementation: 7 tests, 178 assertions.

## What Tranche 6 Will Implement

Priority A:

- Add a trusted release record aggregate for controlled work-order/lot release.
- Build packets through `ProductionHistoryReadModelService`, not ad hoc controller file reads.
- Enforce service-layer release invariants for execution, quality, evidence, approval/signature, and qualification assertions.
- Persist packet state with `blocked`, `releasable`, and `released` semantics.
- Freeze released packets with deterministic packet hash/version/record-copy metadata and immutable-after-release behavior.

Priority B:

- Add enterprise rollup for release packets across company/legal entity/plant/site scope.
- Aggregate blocker categories by site/plant without leaking unrelated scopes.

Priority C:

- Add release slice probe and counters for assembly, blocked packets, releases, missing evidence/signature/qualification, immutable conflicts, and failures.
- Add release slice to runtime authority report.

## What Tranche 6 Will Defer

- Full eDHR/eBR platform coverage across every order, inspection, shipment, supplier, and document-control workflow.
- Live DB concurrency/failover validation.
- PDF/export copy generation; the structured packet is the authority.
- Full historical projection from every legacy genealogy/product-passport/evidence table.
- Full DB-backed training/HCM requirement resolution.
- Standalone security/compliance readiness map unless implementation/test closure leaves budget.

## Why This Is Highest Leverage

The repo already has canonical identities, event history, evidence, approval/e-signature schemas, and qualification gates. The largest release-critical gap is the missing controlled production record that assembles those pieces into one immutable, queryable, release-blocking packet. This tranche targets that gap without broad rewrite or duplicate domain objects.


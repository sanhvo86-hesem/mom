# Prompt 01 Canonical Platform Architecture Package

Date: 2026-04-06
Status: REVIEW REQUIRED
Prompt: [01-canonical-platform-architect-prompt.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/01-canonical-platform-architect-prompt.md)

## Purpose

This document saves the completed Prompt 01 result after the final Step 6 review pass.

Prompt 01 owns:

- target-state architecture truth
- bounded context design and dependency rules
- aggregate boundaries and invariants
- canonical contract architecture
- implementation sequencing and phase gates
- architecture-level standards decisions

Prompt 01 does not own:

- implementation backlog decomposition
- migration-by-migration delivery planning
- audit verdicts
- remediation triage

## Executed Step Plan

1. Step 1 - Scope freeze, local evidence inventory, provenance baseline, and live metrics import
2. Step 2 - Official standards extraction and primary-source refresh
3. Step 3 - Enterprise benchmark plus ERP, MES, eQMS, platform, security, and observability domain-depth review
4. Step 4 - Contradiction resolution plus evidence matrix, coverage matrix, and facts-vs-inference hardening
5. Step 5 - Architecture synthesis, bounded contexts, invariants, policies, contracts, and one first promotable slice
6. Step 6 - Red-team critique, QA verdict, Prompt 01 final package, and cross-bundle sync package for Prompt 04

## Executive Decision

- [FACT] Prompt 01 is complete.
- [FACT] The target-state architecture truth is the canonical write-model platform synthesized from [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql) through [078_canonical_eqms_compliance_backbone.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/078_canonical_eqms_compliance_backbone.sql).
- [FACT] Current-state runtime reality is anchored in [schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/schema.sql), [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml), [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json), and [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json).
- [FACT] The canonical write model is the only future business truth.
- [FACT] The designated first promotable slice is `Released Definition And Production Release Spine`.
- [FACT] That slice is architecture-defined but blocked. It is not promotable yet.

## Live Metrics Block

- [FACT] [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json) `generated_at=2026-04-06T02:22:55.218Z`: `endpoint_count=2862`, `pack_count=3168`, `workflow_count=425`, `workflow_engine_bridge_ready=0`, `workflow_engine_bridge_blocked=115`, `frontend_ready_entities=330`, `frontend_partial_entities=198`, `publishability_ready=false`
- [FACT] [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json) `generated_at=2026-04-06T02:22:55.218Z`: `entity_count=528`, `ready_entities=330`, `partial_entities=198`
- [INFERENCE] [schema-field-audit-full.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json) uses filesystem mtime proxy `2026-04-06T09:25:17.6616283+07:00`: `missing_field_defs=316`, `orphan_tables=45`
- [FACT] `canonical_onboarding_gap_count=101` is exact-match only
- [GAP] Namespace-normalized onboarding proof is unresolved

## Research Ledger

- [FACT] At least `22` local artifacts were reviewed.
- [FACT] `30` official or primary references were refreshed on `2026-04-06`.
- [FACT] Primary-source lanes covered: enterprise patterns, ERP backbone, MES or MOM execution, eQMS or regulated quality, API/security/observability standards.
- [FACT] Local anchors include [greenfield-canonical-first-execution-plan-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/greenfield-canonical-first-execution-plan-2026-04-06.md), [canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md), [canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md), [frontend-foundation-global-blueprint-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/frontend-foundation-global-blueprint-2026-04-06.md), [canonical-vs-hesem-schema-world-evaluation-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md), [schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/schema.sql), and [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml).

## Source Hierarchy And Contradiction Summary

- [FACT] Current-state claims follow implemented local evidence first.
- [FACT] Target-state claims follow approved canonical docs and migrations first.
- [FACT] Official standards and vendor references were used for parity and target obligations, not as proof that local implementation already complies.
- [FACT] Runtime richness in HESEM cannot be promoted into canonical truth by implication.
- [FACT] Stale narrative counts lose to the Live Metrics Block.

## Canonical Architecture Closure

- [FACT] Bounded contexts are fixed as `FoundationGovernance`, `IdentityAndPolicy`, `PartyMaster`, `ProductMasterAndPolicy`, `EngineeringDefinition`, `CommercialLifecycle`, `ProcurementLifecycle`, `PlanningAndRelease`, `MesExecution`, `InventoryCostTraceability`, `FinanceLinkage`, `QualityAndRegulatedRecords`, `DocumentAndTrainingGovernance`, `WorkflowOrchestration`, `ExperienceMetadataContracts`, `ReadModelsAndProjection`, and `IntegrationAndEdgeGateway`.
- [FACT] `WorkflowOrchestration` owns workflow definitions and transition execution only. It does not own business truth, approval meaning, or signature semantics.
- [FACT] `ExperienceMetadataContracts` and `ReadModelsAndProjection` are read-only layers and may not become write-truth stores.
- [FACT] `FinanceLinkage` may consume released inventory and cost truth only. It may not read mutable engineering or planning state.
- [FACT] The canonical layer model is `write truth -> workflow engine -> metadata contracts -> read projections -> compatibility and anti-corruption edges`.
- [FACT] Core platform services are command service, workflow service, policy engine, metadata registry, projection runner, outbox and inbox bus, audit and signature service, attachment and evidence service, notification service, and search service.
- [FACT] Non-negotiable rules remain command-only state change, separate write/workflow/metadata/projection layers, immutable released snapshots, `OIDC -> role resolution -> ABAC`, `application/problem+json`, `ETag/If-Match`, outbox and inbox replay with deduplication, CloudEvents-style async contracts, and OpenTelemetry-native observability.

## First Promotable Slice Definition

- [FACT] Slice name: `Released Definition And Production Release Spine`
- [FACT] Slice purpose: establish immutable released truth and the engineering-to-planning handoff before MES execution, inventory or cost settlement, finance posting, and regulated depth expansion.
- [FACT] Included bounded contexts: `FoundationGovernance`, `PartyMaster`, `ProductMasterAndPolicy`, `EngineeringDefinition`, `PlanningAndRelease`, `WorkflowOrchestration`, `ExperienceMetadataContracts`, `ReadModelsAndProjection`
- [FACT] Included canonical tables: all tables in [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql), all tables in [073_canonical_master_data_core.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/073_canonical_master_data_core.sql), all tables in [074_canonical_engineering_definition.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/074_canonical_engineering_definition.sql), and only `production_order`, `production_order_bom_snapshot`, and `production_order_route_snapshot` from [075_canonical_planning_erp_orchestration.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/075_canonical_planning_erp_orchestration.sql)
- [FACT] Included API families: `/api/foundation-governance/*`, `/api/party-master/*`, `/api/product-master/*`, `/api/engineering-definition/*`, `/api/planning-release/*`, `/api/workflow/*`, `/api/metadata/*`, `/api/projections/*`
- [FACT] Included event families: `item_revision.released`, `bom_version.released`, `work_definition_version.released`, `production_order.created`, `production_order.snapshot_frozen`, `production_order.released`, `approval.recorded`, `electronic_signature.applied`
- [FACT] Included projection families: `released_item_revision_lookup`, `released_definition_catalog`, `production_release_queue`, `approval_inbox`, `release_timeline`
- [FACT] Included workflow bridge targets: `item_revision`, `bom_version`, `work_definition_version`, and `production_order` release governance only
- [FACT] Excluded capabilities: `demand`, `forecast`, `sales_order`, `purchase_order`, `work_order`, `job`, dispatch, execution telemetry, genealogy execution logic, inventory and cost ledgers, finance posting, quality cases, document retention depth, training-gated release, and edge adapter execution behavior
- [FACT] Hard MES boundary: the slice stops at `production_order.released` plus immutable snapshot publication
- [FACT] Exit criteria stay mandatory: published slice OpenAPI and JSON Schema families, `application/problem+json` on all non-2xx responses, `ETag/If-Match` enforcement, concrete workflow bridge package for the four release-governance targets, semantic metadata package, projection operating package, and zero slice command writes to legacy HESEM tables
- [FACT] Fail-closed rule: if any bridge, contract, projection, or policy gate is unmet, the slice remains architecture-defined but blocked

## Frontend Semantic Metadata Contract

- [FACT] Every canonical entity must publish lifecycle or record-type variant, section and layout variants, field visibility predicates, field editability predicates, lookup and picker policy, related-list policy, list presets and default filters, board semantics, timeline taxonomy, and search facet and ranking policy.
- [FACT] First-slice board semantics are limited to `production_release_queue`.
- [FACT] First-slice timeline taxonomy is `created`, `submitted`, `approved`, `signature_applied`, `snapshot_frozen`, `released`, and `superseded`.
- [GAP] Concrete metadata payload examples for board, timeline, field predicates, and related lists are still missing.

## Security And Regulated Validation Architecture

- [FACT] Security architecture is `OIDC validation -> role resolution -> ABAC`.
- [FACT] PDP is centralized. PEP exists at API gateway, application service, and worker consumer boundaries.
- [FACT] ABAC inputs must include subject, object, action, and environment attributes.
- [FACT] Self-approval is prohibited. Delegation and substitution are scoped and audited. Break-glass is emergency-only, time-limited, and requires after-action review.
- [FACT] Regulated validation architecture is `requirement -> risk -> design decision -> aggregate or invariant -> verification evidence -> release package -> retained audit evidence`.
- [FACT] Controlled baseline must include schema version, API contract version, workflow definition version, metadata contract version, and projection version.
- [GAP] Canonical retention, archive, legal hold, supersession depth, immutable signed-record proof, and change-control-to-training release linkage remain incomplete.

## Open Architecture Blockers

- [GAP] Explicit `ReleaseSelection` aggregate or formally stated release-selection command boundary
- [GAP] First-slice aggregate-to-table-to-command map
- [GAP] Forbidden-dependency matrix for each included first-slice bounded context
- [GAP] Operation-level OpenAPI matrix for the first slice
- [GAP] `application/problem+json` schema and error-code taxonomy for slice responses
- [GAP] Concurrency enforcement matrix for commands, transitions, and mutable aggregates
- [GAP] Cursor pagination token contract and exception policy
- [GAP] Async bridge appendix with CloudEvents fields, AsyncAPI channels, ordering, replay, deduplication, and poison-message handling
- [GAP] Bridge-by-bridge transition map for the four release-governance workflow targets
- [GAP] Projection appendix with owner, trigger, freshness class, lag budget, rebuild procedure, stale-read behavior, and promotion criteria
- [GAP] Namespace-normalized canonical-to-runtime metadata onboarding crosswalk
- [GAP] Finance posting bridge from inventory and cost truth into job costing, GL, and AP or AR
- [GAP] MES Wave 2 intake contract for `site or plant -> work center -> work unit -> released order -> work order -> operation -> job -> event -> projection`
- [GAP] Regulated retention, archive, legal hold, supersession, and training-gated release architecture
- [GAP] Legacy-coupling register for read-only runtime dependencies that still support the slice during transition

## Prompt QA Checklist Result

- [FACT] Minimum evidence bar is met.
- [FACT] One exact first-slice candidate is defined.
- [FACT] Six reviewer roles were reconciled in the final step.
- [GAP] `workflow_engine_bridge_ready=0`
- [GAP] `workflow_engine_bridge_blocked=115`
- [GAP] `publishability_ready=false`
- [GAP] No proven local `application/problem+json` implementation artifact
- [GAP] No proven local AsyncAPI or CloudEvents artifact
- [GAP] No proven local `OIDC -> role -> ABAC` artifact
- [GAP] No proven local OpenTelemetry-native contract artifact
- [GAP] No complete canonical retention or legal-hold architecture artifact
- [FACT] Final QA result: `REVIEW REQUIRED`

## Prompt 01 Final Package For Prompt 04

- [FACT] Preserve as architecture truth the bounded-context map and dependency model in this document.
- [FACT] Preserve `WorkflowOrchestration` as transition execution only.
- [FACT] Preserve `ExperienceMetadataContracts` and `ReadModelsAndProjection` as read-only layers.
- [FACT] Preserve the first-slice boundary at `production_order.released` plus immutable snapshot publication.
- [FACT] Treat ERP completeness as partial: governed engineering-to-planning release spine is defined, while commercial, procurement, inventory and cost settlement, and finance posting remain deferred.
- [FACT] Treat MES completeness as partial: Wave 2 must define execution intake, dispatch, genealogy typing, downtime semantics, and offline and edge behavior.
- [FACT] Treat regulated capability as governed foundation only, not regulated-complete.
- [FACT] Require the missing architecture artifacts listed in the blocker section before any promotion decision.
- [ASSUMPTION] Minimum deprecation window `180 days` or `2 release trains` remains an open policy item until explicitly approved.

## Cross-Bundle Sync Requests For Prompt 04

- [FACT] Prompt 02 must treat live HESEM runtime as current delivery truth until canonical slice contracts and bridge gates exist.
- [FACT] Prompt 03 must audit the exact blockers listed here rather than re-deriving scope.
- [FACT] Prompt 04 must reconcile runtime richness versus canonical completeness without silently promoting runtime shortcuts into canonical truth.
- [FACT] Prompt 04 must explicitly resolve `ReleaseSelection`, metadata onboarding crosswalk, workflow bridge transition maps, finance posting bridge, MES Wave 2 intake contract, and regulated retention, archive, legal hold, and supersession policy.

## Six-Reviewer Review Synthesis

- [FACT] `architecture-core` kept the slice narrow and required sharper workflow and read-model guardrails plus an explicit release-selection boundary.
- [FACT] `erp-backbone` confirmed the slice is an engineering-to-planning release spine, not ERP-backbone complete, and kept finance linkage deferred.
- [FACT] `mes-execution` confirmed the first slice stops in the right place and required Wave 2 MES intake, dispatch, genealogy, downtime, and offline contracts to remain fail-closed.
- [FACT] `eqms-compliance` downgraded all regulated maturity claims to target-state only and kept retention, archive, legal hold, supersession, and training linkage blocked.
- [FACT] `platform-contracts` required the slice to remain blocked until concrete API, problem-details, concurrency, pagination, async, metadata, projection, and bridge artifacts exist.
- [FACT] `red-team` required the final package to close as `REVIEW REQUIRED` because live metrics still show `workflow_engine_bridge_ready=0` and `publishability_ready=false`.

## Completion

Prompt 01 is complete. Do not continue Prompt 01 from this section again. Use Prompt 04 separately for program-level reconciliation.

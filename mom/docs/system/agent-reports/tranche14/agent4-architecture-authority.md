# Agent 4 — Architecture / Data / Authority Audit
## WORLD-CLASS ZERO-TRUST SWARM CLOSURE TRANCHE 14

Worktree: `/Users/a10/Documents/mom-tranche14-a4`
Branch: `codex/tranche14-a4-architecture-authority`

## Scope and evidence base

I inspected the live code, tests, and generated artifacts directly. I did not change code.

Primary evidence used:
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/RuntimeAuthorityService.php:61-108`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/CanonicalManufacturingSpineService.php:27-40,354-370`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/Traceability/GenealogyGraphService.php:12-13,45-112,304-331`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/TrustedReleaseRecordService.php:74-119,320-353`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/FileTrustedReleaseRecordRepository.php:90-104`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/PostgresTrustedReleaseRecordRepository.php:72-105`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/ConnectedGovernanceService.php:324-339`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/FileConnectedGovernanceRepository.php:87-103`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/PostgresConnectedGovernanceRepository.php:110-147`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/OrderWorkflowService.php:193-222`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/MasterDataService.php:221-246`
- `/Users/a10/Documents/mom-tranche14-a4/mom/database/DataLayer.php:139-178,2249-2309`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/controllers/SchemaStudioController.php:5108-5158,5538-5557`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/controllers/GenericCrudController.php:1002-1076`
- `/Users/a10/Documents/mom-tranche14-a4/mom/api/services/PlanningScenarioService.php:196-230,501-517`
- `/Users/a10/Documents/mom-tranche14-a4/mom/tests/Unit/Services/RegistryBootstrapPathTest.php:12-24`
- `/Users/a10/Documents/mom-tranche14-a4/mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php:29-65`
- `/Users/a10/Documents/mom-tranche14-a4/mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php:30-74`
- `/Users/a10/Documents/mom-tranche14-a4/mom/tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php:12-23,57-115`
- `/Users/a10/Documents/mom-tranche14-a4/mom/tests/Unit/Controllers/SchemaStudioRegistryFallbackTest.php:32-79`

Test attempt:
- `cd /Users/a10/Documents/mom-tranche14-a4/mom && composer test`
- Result: blocked because `vendor/bin/phpunit` is not present in this worktree.

## Executive verdict

The architecture is materially stronger than a pure compatibility shell:
- canonical genealogy is real and DB-backed on the postgres path,
- trusted release and connected governance are real services with immutable/replay-aware record handling,
- the generic CRUD surface is correctly demoted to a guarded boundary,
- runtime authority reporting is honest about mixed authority instead of pretending the stack is fully authoritative.

The repo is still not world-class because several governed slices remain split between authoritative and compatibility modes, and one generated-artifact path still drifts from the actual runtime registry path.

## Findings

| Severity | Area | Current verified state | False / overstated claims | Code-fixable gap | Blocker class |
|---|---|---|---|---|---|
| P1 | Runtime authority / governed slices | `RuntimeAuthorityService` reports `mixed_authority = true` and `strict_authority_ready = false`; `order_workflow`, `master_data`, `manufacturing_events`, `trusted_release_record`, `connected_governance`, `planning_scenario`, and `traceability_genealogy` are still not uniformly authoritative in the current runtime posture. `canonical_manufacturing_spine` and `production_history` are authoritative-ready. | Any claim that the runtime is fully authoritative end-to-end is false. Any claim that tranche 14 has already closed all authority drift is overstated. | Collapse remaining compatibility-first governed slices onto a single authoritative backend/wiring path where postgres is available; keep fallback explicit and narrow. | Migration / release sequencing required for some slices. |
| P1 | Trusted release + connected governance | Both services are real and govern records, but their repositories still expose file fallback. File repos report `compatibility_only` / `json_fallback`; postgres repos report `authoritative_ready` only when the tables are available. Service defaults still choose the file path unless postgres is configured and reachable. | Any claim that release governance is DB-primary everywhere is overstated. Any claim that fallback authority has been retired is false. | Unify repository selection and remove fallback from governed execution paths once the schema and rollout are ready. | Schema migration + operational rollout needed. |
| P2 | Traceability / digital thread | `GenealogyGraphService` is the strongest authority slice: DB-backed writes, cycle detection, released-change authority checks, projected graph tables, and an authoritative probe. `ProductionHistoryReadModelService` includes genealogy sections. But `RuntimeAuthorityService` still classifies `traceability_genealogy` as compatibility_only in the current runtime posture. | Any claim that full digital-thread continuity is already complete is overstated. The platform does not yet prove end-to-end event-to-edge coverage across all operational event families. | Broaden event-to-edge emission coverage and wire the runtime authority report to the canonical graph whenever DB-backed authority is present. | Policy / event-taxonomy decisions still needed. |
| P2 | Canonical model breadth | `CanonicalManufacturingSpineService` validates 20 core entities and relations with org-scope and authority metadata. The model is coherent and test-covered, but it is still a core slice, not the full enterprise canonical model. | Any claim that the enterprise canonical model is complete is false. | Expand the canonical definitions into inventory, purchasing, quality, release, change-control, supplier, finance, and multisite governance entities. | Product scope decision on model breadth. |
| P2 | Generated-artifact drift | Runtime registry evidence is consistent with `/Users/a10/Documents/mom-tranche14-a4/mom/data/registry`. `RegistryBootstrapPathTest` proves the repo-root `data/registry/table-registry.json` does not exist. However, `SchemaStudioController` still labels registry source metadata as `data/registry/table-registry.json` in `_meta.source` and registry labels. | Any claim that generated artifact metadata is fully aligned with the runtime registry path is overstated. | Update Schema Studio source labels and regenerated metadata to the actual runtime registry path. | No external blocker beyond regeneration and verification. |
| P2 | Planning-to-execution / APS posture | `PlanningScenarioService` is a real deterministic finite-capacity engine with blocker categories and read models, and `OrderWorkflowService` / `DataLayer` make current read-mode split explicit. That is useful, but it is not a full APS solver or a closed-loop enterprise planning stack. | Any claim that full order-based multi-constraint APS behavior already exists is overstated. | If APS is a target, expand beyond deterministic finite-capacity v1 toward richer constraint modeling and more authoritative persistence. | Product decision on APS scope and semantics. |
| P3 | Route / control surface | `GenericCrudController` correctly rejects governed generic mutations with `409 domain_command_required` unless an explicit break-glass override is configured and the caller is admin plus release-manifest/command-ID constrained. | Generic CRUD is not the authority path for governed domains. | No fix required in this pass; the boundary is coherent. | None. |

## Canonical model and authority boundaries

Verified strengths:
- Canonical identity scope is explicit and test-covered for the current 20-entity backbone.
- Authority metadata exists instead of being implied or hand-waved.
- The route layer is not allowed to act as the execution authority for governed domains.

Still partial:
- The canonical model is narrower than a world-class enterprise manufacturing contract.
- Master data and order workflow are still split between compatibility storage and authoritative backend intent.
- Trusted release and connected governance remain migration-dependent for full authority consolidation.

## Digital thread, traceability, and trusted records

Verified strengths:
- Genealogy is no longer just a doc claim. The graph service enforces node types, cycle detection, release authority, and graph projection.
- Trusted release packets are immutable once released, with ordered provenance and blocker-based release state.
- Connected governance links controlled revision release, training obligations, entitlement checks, and provenance events.

Still partial:
- The digital thread is not yet proven to be end-to-end for every operational event family.
- The authority surface for traceability is not yet unified across all runtime modes.
- Release/governance fallbacks are still present, so the trust boundary is real but not fully collapsed.

## Planning-to-execution and multisite readiness

Verified:
- Planning and execution are not arbitrary CRUD. The planning service evaluates finite-capacity constraints, quality holds, qualification readiness, material shortage, and active revision references.
- Data-layer mode summaries surface `master_data_read_mode`, `orders_read_mode`, `mes_read_mode`, and `epicor_read_mode`.
- Org/site/plant scoping is present in canonical definitions and runtime summaries.

Not yet proven:
- Full multisite authority arbitration.
- Enterprise-wide site promotion / rollout governance as a single canonical contract.
- A world-class APS capability comparable to vendor benchmark families.

## False or overstated claims to correct

- “Runtime is fully authoritative.” It is not; `mixed_authority` is true and `strict_authority_ready` is false.
- “Trusted release and governance are universally DB-primary.” They are not; file fallback remains in the service architecture.
- “Traceability / genealogy is end-to-end complete.” It is not yet proven across all execution events.
- “Canonical enterprise model is complete.” It is not; the current spine is a strong backbone, not the full enterprise contract.
- “Schema Studio source metadata matches runtime reality.” It does not; source labels still point at legacy `data/registry/table-registry.json`.

## Code-fixable gaps

These are the gaps I would classify as code-fixable, subject to the migration / scope constraints above:

1. Align `SchemaStudioController` registry source labels with the actual runtime registry path.
2. Reduce the remaining compatibility-first authority surfaces on governed slices.
3. Wire traceability authority reporting more directly to the canonical genealogy graph when postgres-backed authority exists.
4. Expand the canonical spine definition set if the broader enterprise model is in scope.

## External / product blockers

- Removing the remaining file fallback from governed release/governance paths is not a trivial local edit; it wants schema and rollout sequencing.
- Expanding the canonical model breadth is a product contract decision, not just a refactor.
- A true APS leap beyond deterministic finite-capacity planning is a scope choice that needs planning semantics, persistence, and UX/operational agreement.

## Highest-leverage architecture gap candidates

1. **Collapse the mixed-authority governed slices into one canonical authority contract.**  
   This is the highest leverage because it removes several false-confidence vectors at once: master data, order workflow, trusted release, connected governance, and traceability all become easier to trust, test, and explain.

2. **Expand the canonical manufacturing spine into a broader enterprise contract.**  
   The current 20-entity backbone is coherent, but it does not yet cover the full enterprise footprint needed for vendor-class breadth.

3. **Remove generated-artifact path drift from Schema Studio and related contract exports.**  
   This is a smaller gap, but it matters because source-label drift erodes trust in generated evidence.

## Bottom line

The platform is stronger now in three places that matter:
- authority reporting is honest,
- genealogy is real,
- release/governance are implemented as governed services rather than loose docs.

What still blocks true world-class positioning is the remaining split authority and the narrow canonical contract. The next leverage point is not a cosmetic cleanup; it is authority consolidation plus canonical model expansion, with generated-artifact metadata kept in lockstep.

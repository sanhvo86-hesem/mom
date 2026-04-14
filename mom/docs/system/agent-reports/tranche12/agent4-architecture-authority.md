# Tranche 12 - Agent 4 Architecture / Data / Authority Audit

Scope: current code, unit tests, and repository docs only. No code changes were made in this pass.

## Verdict

The architecture has a credible authority model, but it is not yet uniform enough to call the execution backbone fully settled. The strongest parts of the repo are the fail-closed change authority path, the append/replay event spine, the canonical release packet assembly, and the explicit distinction between authoritative execution paths and read models. The main structural gap is authority fragmentation: critical slices still mix authoritative Postgres paths, compatibility-only JSON paths, and projection/read-model semantics.

The biggest risk is false confidence at the boundaries between execution truth, canonical projections, and documentation. The current codebase is unusually honest about those boundaries in several places, but it still leaves multiple places where a caller can mistake a read model, compatibility surface, or partial master record for operational truth.

## What is actually authoritative

| Surface | Current classification | Evidence |
| --- | --- | --- |
| `ManufacturingEventBackboneService` on the Postgres repo path | VERIFIED_COMPLETE for event authority, PARTIAL for file fallback | The service centralizes append/replay/timeline behavior and exposes authoritative taxonomy and required event families in `api/services/ManufacturingEventBackboneService.php:102-115` and `:203-215`. Focused tests passed for the Postgres-authoritative path and the fallback compatibility path. |
| `ProductionHistoryReadModelService` | VERIFIED_COMPLETE as a read model, not execution truth | The packet is built from the event backbone and canonical spine, and its probe explicitly reports `authority_mode = event_ledger_read_model` and `authoritative = true` for the read model itself in `api/services/ProductionHistoryReadModelService.php:24-45` and `:55-73`. |
| `ChangeAuthorityService` | VERIFIED_COMPLETE fail-closed authority guard | The service explicitly denies governed edits when authority tables are unavailable, and requires released change authority for post-release field edits in `api/services/ChangeControl/ChangeAuthorityService.php:27-33`, `:51-124`, and `:202-243`. |
| `TrustedReleaseRecordService` | VERIFIED_COMPLETE for trusted packet authority, with explicit non-authority export copy | The release packet is assembled from the production history read model plus canonical genealogy provenance, and `record_copy_metadata` marks the structured packet as authority while the export copy is not in `api/services/TrustedReleaseRecordService.php:74-150`, `:165-206`, and `:320-333`. |
| `GenealogyGraphService` | VERIFIED_COMPLETE for canonical genealogy facts when DB-backed | The service is described as the authoritative write/read surface for as-manufactured genealogy facts, rejects cycles/self-reference, and returns `authority = genealogy_projected_graph` for the thread view in `api/services/Traceability/GenealogyGraphService.php:11-13`, `:45-170`, `:242-330`. |
| `WorkforceQualificationGateService` | CONDITIONAL authority, readiness-ready when requirements exist | The probe returns `authoritative_ready` only when requirements exist, otherwise `authority_partial`, and the gate matches task fields such as `task_type`, `work_center_id`, `machine_id`, `operation_seq`, and `wo_number` in `api/services/WorkforceQualificationGateService.php:43-140`. |
| `PlanningScenarioService` | PARTIAL | The service enforces finite-capacity planning, site/org access checks, publish gating, and a probe with read-model outputs, but its repository posture is still split and the file-backed path remains compatibility-only in `api/services/PlanningScenarioService.php:118-240`, `:328-417`, and `:501-517`. |
| `ConnectedGovernanceService` | PARTIAL | The service releases controlled revisions, creates training obligations, and uses site-scoped rollout and entitlement read models, but the posture is still repository-dependent and site scope remains an explicit guard in `api/services/ConnectedGovernanceService.php:157-175`, `:260-339`, and `:365-385`. |
| `CanonicalManufacturingSpineService` | PARTIAL | The spine is broad and well-structured, but `equipment_machine` and `employee` are still marked `authority_partial` in `api/services/CanonicalManufacturingSpineService.php:96-103` and `:219-226`. |
| `OrderWorkflowService` | PARTIAL | The service is repository-bound and its `authorityProbe()` still says JSON is primary in current entrypoints when not on PostgreSQL, in `api/services/OrderWorkflowService.php:186-223`. |
| `RuntimeAuthorityService` | UNPROVEN as execution truth, because it is intentionally a posture report | The class explicitly frames itself as a runtime authority posture report and only aggregates slice probes in `api/services/RuntimeAuthorityService.php:11-13` and `:37-103`. |

## Structural inconsistencies

1. Authority is still fragmented across multiple storage modes.

   `RuntimeAuthorityService` aggregates slices that are variously `authoritative_ready`, `authority_partial`, or `compatibility_only`. That is a useful posture report, but it is also the clearest signal that the repo still has mixed authority modes rather than one uniform execution truth layer. The report is in `api/services/RuntimeAuthorityService.php:61-103`.

2. The canonical master spine is strong but not complete.

   The spine already covers core business entities, traceability, evidence, quality, planning, and release-relevant identities. However, `equipment_machine` and `employee` are still explicitly partial in `api/services/CanonicalManufacturingSpineService.php:96-103` and `:219-226`. Those are not peripheral objects. They are foundational to machine identity, labor qualification, and multisite execution governance.

3. Genealogy has two semantically different surfaces that must stay distinct.

   `TraceabilityGenealogyService` is a traceability read model over the event backbone, while `GenealogyGraphService` is the canonical genealogy fact surface. The first reports `authority_mode = event_ledger_traceability_read_model` in `api/services/TraceabilityGenealogyService.php:346-369`. The second returns a projected graph from `as_manufactured_snapshots` plus edges in `api/services/Traceability/GenealogyGraphService.php:242-298`. That split is valid, but it is easy to misread the projected thread as execution truth if docs or registries drift.

4. Trusted release records are authoritative packets, not independent source-of-truth objects.

   `TrustedReleaseRecordService` assembles from a production-history read model with canonical genealogy provenance, then freezes the packet on release. That is correct, but it means the packet is downstream of execution history and genealogy projection, not a substitute for them. The boundary is visible in `api/services/TrustedReleaseRecordService.php:86-150` and `:165-206`.

5. Planning and connected governance are site-aware but not yet a single canonical multisite authority spine.

   `PlanningScenarioService` requires site/org scope for access and publishability, and `ConnectedGovernanceService` scopes enterprise rollups by site. That is good discipline, but the underlying repositories are still mixed and the runtime authority is not yet unified across all sites. The clearest site-scope guard is `missing_rollout_site_scope` in `api/services/ConnectedGovernanceService.php:382-385`, and the planning service requires org checks in `api/services/PlanningScenarioService.php:253-279` and `:328-367`.

6. The runtime registry still has a large drift surface.

   `mom/contracts/registry-authority-standard.json` is honest about authority layering and read-only surfaces, but its current endpoint classification summary still reports `generic_runtime_classification = 555` and `runtime_safe_false = 948` in `mom/contracts/registry-authority-standard.json:118-144`. That is a real structural gap, not a cosmetic one.

7. Analytics and AI surfaces are correctly labeled as projections, but compatibility aliases keep them visually close to runtime truth.

   `mom/contracts/object-index.json` explicitly marks analytics snapshot objects as read-only projections and says they must not become mutation authority in `mom/contracts/object-index.json:11-21` and `:77-80`, `:101-111`, and `:166-169`. `mom/contracts/ai-authority-chain.json` also says workspace design is draft-only and not runtime authority in `mom/contracts/ai-authority-chain.json:8-32`, `:83-116`. The risk is not that the docs are wrong. The risk is that a caller or later tranche can still confuse compatibility aliases with truth if the generated registry does not keep the boundary loud.

## Multisite readiness

The codebase is materially better than a single-site-only ERP/MOM/MES stack. I found explicit org, company, site, and plant scoping in the canonical spine, planning, governance, release, and genealogy layers. That is the right foundation for multisite operation.

The limitation is that multisite readiness is still distributed across several services rather than anchored in one canonical authority spine. `ConnectedGovernanceService` uses site rollups and entitlement decisions, `PlanningScenarioService` uses org/site access checks, `TrustedReleaseRecordService` carries site and plant identifiers in its packet filters, and `TraceabilityGenealogyService` keeps org/site fields in trace filters. Those are good building blocks, but they are still separate authorities and projections.

The most important multisite gap is the pair of partial master identities:

- `equipment_machine`
- `employee`

Those objects sit directly under scheduling, labor qualification, machine governance, and release controls. Leaving them partial keeps the multisite model from being uniformly authoritative.

## Highest-leverage gap

The highest-leverage architecture gap is not another feature. It is collapsing authority ambiguity at the master-data and execution-boundary layer.

Concretely, the repo would gain the most by:

1. Completing the canonical authority status for the remaining partial spine entities, starting with equipment/machine and employee identity.
2. Making every critical execution slice report one unambiguous authority mode, with read models and compatibility surfaces labeled as such in code, contracts, and generated registries.
3. Keeping genealogy, planning, release, and governance as explicit downstream consumers of execution truth instead of allowing their projections to look like alternative truth sources.

That is the highest leverage because it reduces false confidence across planning, traceability, release control, and multisite governance simultaneously.

## Evidence from tests

Focused verification passed after the evidence sweep:

- `tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php`
- `tests/Unit/Services/RuntimeAuthorityServiceTest.php`
- `tests/Unit/Services/ManufacturingEventBackboneServiceTest.php`
- `tests/Unit/Services/ProductionHistoryReadModelServiceTest.php`
- `tests/Unit/Services/TraceabilityGenealogyServiceTest.php`
- `tests/Unit/Services/TrustedReleaseRecordServiceTest.php`
- `tests/Unit/Services/ConnectedGovernanceServiceTest.php`
- `tests/Unit/Services/WorkforceQualificationGateServiceTest.php`
- `tests/Unit/Services/OrderWorkflowRepositoryBoundaryTest.php`
- `tests/Unit/Services/ChangeAuthorityServiceTest.php`
- `tests/Unit/Services/AuditTrailIntegrityTest.php`
- `tests/Unit/Services/WorldClassControlPlaneExecutionTest.php`

Result: 81 tests, 574 assertions, all passing.

## Conclusion

The repo is already stronger where authority must be strict: change control, append/replay event handling, trusted release packet construction, and explicit read-model labeling. What still blocks world-class positioning is not a lack of surface area. It is the remaining split between authoritative execution truth, compatibility stores, and read-model projections. The repository needs one more clean pass on canonical authority consolidation before the architecture can be described as uniformly authoritative across planning, genealogy, and multisite execution.

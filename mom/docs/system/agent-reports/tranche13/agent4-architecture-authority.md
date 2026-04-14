# Tranche 13 - Agent 4 Architecture / Data / Authority Audit

Scope: canonical model, authority boundaries, digital thread, planning-to-execution, traceability, trusted records, multisite readiness, and repo hygiene drift that affects source-of-truth.

## Verdict

`PARTIAL / UNPROVEN`

The repo gained real generated registry/bootstrap artifacts since tranche 12, but the runtime authority path is still split from the checked-in publication path. That leaves the strongest new “system contract registry” claims unproven in the actual API boot path, and several health/authority surfaces still overstate readiness relative to slice-level truth.

## Verified Facts

1. The authored business-contract layer is broad and internally consistent.
   - `mom/contracts/authority-report.json` reports 67/67 authored canonical packages covered.
   - `mom/contracts/package-index.json`, `object-index.json`, `state-model-index.json`, `command-index.json`, and `event-index.json` are present and populated.
   - This is authored contract coverage, not runtime publication proof.

2. Generated registry/bootstrap artifacts were added in this tranche, but they live at the repo root `data/registry/`.
   - Present: `data/registry/table-registry.json`
   - Present: `data/registry/relation-map.json`
   - Present: `data/registry/schema-authority-summary.json`
   - Present: `data/registry/endpoint-catalog-index.json`
   - Sample current metadata:
     - `schema-authority-summary.json` -> `total = 661`, `domains = 1`
     - `table-registry.json` -> `total_count = 661`
     - `endpoint-catalog-index.json` -> `total_count = 604`, `action_routes = 451`, `rest_routes = 153`

3. The API runtime still resolves registry artifacts under `mom/data/registry`.
   - `mom/api/index.php` defaults `$DATA_DIR` to `mom/data`.
   - `mom/api/services/DataSchemaService.php` sets `$this->registryDir = $this->dataDir . '/registry'`.
   - `mom/tests/data_schema_admin_smoke.php` and `mom/tests/backend_smoke.php` both assert `system_contract_registry` as a first-class runtime read-only layer.
   - In this worktree, `mom/data/registry` is absent, while the generated artifacts exist at top-level `data/registry`.

4. Authority and health surfaces still allow partial slices to read as acceptable.
   - `mom/api/services/RuntimeAuthorityService.php` maps `authority_partial` to `shadow_mode` and `compatibility_only` to `json_fallback`.
   - `mom/api/controllers/HealthController.php` uses the authority report to drive readiness, but the aggregate `ok` state is still coarse relative to mixed slice truth.
   - Existing tests confirm mixed slice states remain in place:
     - `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php`
     - `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`

5. Traceability, trusted release, planning, and governance remain split across authority tiers.
   - `TraceabilityGenealogyService`, `TrustedReleaseRecordService`, `PlanningScenarioService`, `ConnectedGovernanceService`, and `WorkforceQualificationGateService` still expose a mix of authoritative, partial, and compatibility-only readiness states.
   - That is a valid transitional posture only if the surface labels stay explicit about the fallback tier.

## Structural Inconsistencies

### 1) Runtime registry publication path drift

The strongest new authority artifact set exists, but the runtime boot path still expects registry publication under `mom/data/registry`, while the generated artifacts are checked in at `data/registry`.

Why this matters:
- `system_contract_registry` is being advertised as the runtime read-only registry layer.
- The API boot path and `DataSchemaService` are reading a different filesystem location than the one populated by the new generated artifacts.
- That makes the new bootstrap layer look complete in docs and contracts while remaining unverified in the actual execution path.

Classification:
- `code-fixable`: yes
- `external/product decision`: no

Highest leverage fix:
- align publication output and runtime lookup to one canonical registry root, then update docs/tests to that same root.

### 2) Authored coverage is being over-read as runtime truth

`mom/contracts/authority-report.json` shows full authored-package coverage, but it does not prove:
- generated registry publication in the runtime path,
- database authority completeness,
- multisite authority completeness,
- or health/readiness truth.

This is the main false-confidence trap in the tranche 13 evidence set.

Classification:
- `code-fixable`: yes, via clearer authority labels, summary gates, and path-aligned publication verification

### 3) Health authority still conflates “reachable” with “authoritative enough”

`RuntimeAuthorityService` and `HealthController` still allow mixed states:
- some slices are `compatibility_only`,
- some are `authority_partial`,
- some are authoritative-ready,
- but the aggregate health surface can still read as broadly acceptable.

That is not zero-trust enough for a world-class authority boundary.

Classification:
- `code-fixable`: yes

### 4) Multisite readiness is not yet first-class in the authority envelope

The code has site-aware concepts in planning and governance, but the main health and contract publication proofs are still enterprise-global.

Observed gap:
- no site-by-site registry completeness envelope,
- no site-by-site authority health summary,
- no site-by-site release/trust record proof in the main runtime authority surface.

Classification:
- `code-fixable`: partially
- `external/product decision`: the canonical site/plant/region model and the required completeness thresholds

### 5) Repo hygiene drift now affects source-of-truth

There is now a split between:
- generated artifacts at repo root `data/registry/`
- runtime/docs/tests that still speak in `mom/data/registry/`

That drift is not cosmetic. It changes what the codebase can truthfully claim about execution authority.

Classification:
- `code-fixable`: yes

## Canonical Model / Digital Thread Assessment

Current state:
- The canonical object and contract lattice is strong on paper.
- The digital thread exists in service form across genealogy, trusted release, production history, and planning.
- The thread is still not uniformly promoted to one runtime authority layer.

What is strong:
- authored contract bundles are broad,
- traceability and trusted release services exist,
- governance services are explicit about partial authority,
- observability hooks are present.

What is still weak:
- runtime publication path is not aligned with the generated registry location,
- health and authority surfaces do not yet force slice-level truth to remain visible,
- multisite truth is still mostly implied rather than proved.

## Highest-Leverage Architecture Gap

**Unify registry publication + runtime lookup + health proof around one canonical registry root.**

Why this is the highest leverage gap now:
- it converts the new generated registry from a documented artifact into runtime authority,
- it removes the current path drift between publication and execution,
- it makes the `system_contract_registry` claim testable instead of aspirational,
- it gives every downstream slice a consistent authority anchor.

## Code-Fixable vs Product-Decision Ledger

### Code-fixable now
- registry publication path drift
- runtime/read-model authority labels that can still imply more certainty than the slices actually have
- docs/test path drift around `mom/data/registry`
- missing explicit per-slice/per-site authority proof in health summaries

### Product decision required
- canonical site hierarchy for multisite proofs
- whether root `data/registry/` or `mom/data/registry/` is the final publication root
- required readiness thresholds for declaring multisite authority complete

## Evidence Sources

- `data/registry/schema-authority-summary.json`
- `data/registry/table-registry.json`
- `data/registry/endpoint-catalog-index.json`
- `data/registry/relation-map.json`
- `mom/api/index.php`
- `mom/api/services/DataSchemaService.php`
- `mom/api/services/RuntimeAuthorityService.php`
- `mom/api/controllers/HealthController.php`
- `mom/contracts/authority-report.json`
- `mom/contracts/README.md`
- `mom/docs/schema-authority-model.md`
- `mom/docs/db-schema-and-data-change-control.md`
- `mom/tests/data_schema_admin_smoke.php`
- `mom/tests/backend_smoke.php`
- `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php`
- `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`

## Final Take

The tranche 13 registry/bootstrap work is real, but the authority chain is not yet fully closed because the runtime lookup path and the publication path still disagree. Until that is fixed, the repo has strong authored contracts and partial runtime proof, not a fully verified world-class zero-trust authority layer.

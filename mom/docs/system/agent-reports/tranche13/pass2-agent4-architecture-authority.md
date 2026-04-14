# Tranche 13 Pass 2 - Agent 4 Architecture / Data / Authority Red-Team

Scope: runtime registry path, RegistryService metadata overlay, CanonicalManufacturingSpineService overlay, schema authority counts, strict runtime authority health, multisite authority implications.

## Verdict

`PARTIAL / STILL OPEN`

The implementation improved the authority chain in one important way: the runtime-consumed registry path now exists under `mom/data/registry`, and table-registry metadata overlay is real. However, the repo still does not have a fully published runtime registry set, the endpoint catalog remains partly synthetic when its publication file is missing, and strict authority health is intentionally still red. This is better than pass 1, but not a closed authority state.

## What is now verified

1. Runtime registry bootstrap artifacts now live in the consumed path.
   - Verified directory: `mom/data/registry/`
   - Present files: `table-registry.json`, `endpoint-catalog-index.json`, `relation-map.json`, `schema-authority-summary.json`
   - Root-level `data/registry/` is absent in this worktree.
   - `mom/tests/Unit/Services/RegistryBootstrapPathTest.php` guards that path explicitly.

2. RegistryService table-registry overlay is real.
   - `RegistryService::loadTableRegistry()` merges runtime bootstrap tables with authored contract metadata from `mom/contracts/table-registry.json`.
   - The overlay is not theoretical:
     - runtime `mom/data/registry/table-registry.json` has skeletal rows with empty `domain` and `columns`
     - authored `mom/contracts/table-registry.json` carries full domain/column metadata
     - sample table `crm_activities` is recovered by overlay with `domain = crm` and populated columns
   - `mom/tests/Unit/Services/RegistryBootstrapPathTest.php` covers this overlay path.

3. CanonicalManufacturingSpineService overlay is real and keeps validation green.
   - `CanonicalManufacturingSpineService::registryTables()` overlays authored contract metadata when runtime bootstrap tables are skeletal.
   - `mom/tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php` proves the overlay by blanking runtime columns and still validating successfully.
   - This is a compatibility bridge, not proof that the runtime bootstrap table registry is complete by itself.

4. Schema authority counts are now separated honestly.
   - `mom/database/schema-authority-summary.json` reports:
     - `table_count = 772`
     - `registry_table_count = 661`
     - `registry_publication_state = registry_bootstrap_or_partial_publication_table_count_differs_from_schema_snapshot`
   - That is the correct split: migrations/schema.sql remain authoritative; bootstrap registry is smaller.

5. Strict runtime authority health is exposed and still not ready.
   - `RuntimeAuthorityService::report()` now exposes `strict_authority_ready` and `mixed_authority`.
   - `HealthController::evaluateComponents()` now exposes `runtime_authority_strict`.
   - Current unit-test evidence still asserts `strict_authority_ready = false` and `runtime_authority_strict = false`.
   - That is truthful, but it means closure language must not imply strict authority is complete.

## Red-team findings

### 1) Endpoint authority is still synthetic when publication files are missing

`RegistryService::load('endpoint-catalog')` falls back to building a synthetic generic endpoint catalog from `table-registry` if the runtime publication file is absent.

Why this matters:
- `mom/data/registry/endpoint-catalog.json` is not present.
- `RegistryController::getSystemContract()` still counts `endpoint-catalog` through `rawRegistryDocument('endpoint-catalog')`.
- That means endpoint counts can be generated from table metadata even when the endpoint publication artifact itself is missing.
- The authority surface therefore looks stronger than the on-disk publication set.

Classification:
- `code-fixable`: yes

Highest-leverage fix:
- publish `endpoint-catalog.json` explicitly or label the synthetic fallback as compatibility-only in all authority summaries.

### 2) Registry overlay is proven only for the table registry, not the full publication set

The overlay tests cover `table-registry`, but there is no equivalent proof that the full runtime registry publication set exists or is non-synthetic.

Observed state:
- `table-registry.json` exists and is skeletal
- `endpoint-catalog-index.json` exists
- `schema-authority-summary.json` exists
- required publication artifacts from `verify_publication_truth.py` are still missing

Implication:
- the runtime registry path is aligned enough for bootstrap work,
- but the publication truth set is still incomplete.

Classification:
- `code-fixable`: partially
- `external/source-input blocker`: yes, for the full publication pipeline

### 3) Strict authority health is not green, so docs must not read as completion

`HealthController` now exposes a strict authority gate, but the current report still says strict authority is not ready.

Why this matters:
- the code is honest,
- but any closure wording that treats strict authority as “fixed” or “complete” would be false confidence,
- readiness remains mixed by design.

Classification:
- `code-fixable`: no, this is current truthful state
- `doc drift risk`: yes, if any summary implies strict readiness is already achieved

### 4) Multisite authority is still enterprise-global, not site-scoped

There are site-aware services in planning/governance, but the authority proofs remain global:
- no site-by-site registry completeness envelope
- no site-by-site strict authority health
- no site-by-site publication truth summary

This is the remaining structural gap for multisite readiness.

Classification:
- `code-fixable`: partially
- `product decision required`: canonical site/plant/region hierarchy and readiness thresholds

### 5) Publication truth remains blocked by missing controlled artifacts

`python3 mom/tools/registry/verify_publication_truth.py` still fails with missing publication inputs.

The missing set includes, at minimum:
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`
- wave governance policy/report files
- operational blind-spot and stress artifacts
- system-contract runtime/publication artifacts

This is not a runtime-path bug anymore. It is a source-input/publication-completeness blocker.

Classification:
- `external/source-input blocker`: yes

## What is stronger now

- The runtime registry bootstrap lives in the consumed path.
- The table-registry overlay is proven and preserves canonical metadata.
- CanonicalManufacturingSpineService can validate against a skeletal runtime bootstrap by overlaying authored contract metadata.
- Schema authority counts are now separated instead of conflated.
- Strict authority health is visible instead of hidden.

## What still blocks world-class authority

- The runtime publication set is not complete.
- Endpoint authority is still synthetic when its publication file is missing.
- Multisite proof is still global-only.
- Full publication truth still fails on missing source inputs.
- Any closure document that implies strict authority is already green is overstated.

## Verification notes

Checks run:
- `php -l mom/api/services/RegistryService.php`
- `php -l mom/api/services/CanonicalManufacturingSpineService.php`
- `php -l mom/api/controllers/HealthController.php`
- `php -l mom/api/services/RuntimeAuthorityService.php`
- `php -l mom/tools/schema/refresh_schema_authority_summary.php`
- `php -l mom/tests/Unit/Services/RegistryBootstrapPathTest.php`
- `php -l mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`
- `php -l mom/tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php`
- `python3 mom/tools/registry/verify_publication_truth.py`

Skipped:
- PHPUnit execution, because this worktree does not have a local `phpunit` binary and the root also has no `composer.json` to bootstrap one here.

## Evidence files

- `mom/api/services/RegistryService.php`
- `mom/api/services/CanonicalManufacturingSpineService.php`
- `mom/api/controllers/HealthController.php`
- `mom/api/services/RuntimeAuthorityService.php`
- `mom/database/schema-authority-summary.json`
- `mom/data/registry/table-registry.json`
- `mom/data/registry/endpoint-catalog-index.json`
- `mom/docs/system/world-class-swarm-closure-tranche13.md`
- `mom/docs/system/world-benchmark-dossier-tranche13.md`
- `mom/tests/Unit/Services/RegistryBootstrapPathTest.php`
- `mom/tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php`
- `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`
- `mom/tools/registry/verify_publication_truth.py`


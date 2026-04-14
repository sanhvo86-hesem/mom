# Tranche 13 Agent 6 Pass 2 Defects Backlog Audit

Date: 2026-04-14  
Branch: `codex/tranche13-a6-defects-backlog`  
Implementation head: `1ba4be7e` (`Close tranche13 registry and hygiene backlog`)

## Executive summary

The implementation commit fixed the registry path split that blocked tranche 12/13 verification. The runtime-consumed path now has the bootstrap registry files under `mom/data/registry/` and `refresh_data_schema_authority.php --skip-publication` now reaches those files and reports schema counts before stopping on the next missing publication input. That is real progress and should be marked `ALREADY_FIXED`.

What is not closed is publication truth. `verify_publication_truth.py` still fails on 36 missing artifacts, the canonical orchestrator still fails on missing generated inputs such as `data-fields.json`, `orphan-resolution.json`, `domain-architecture.json`, wave policy files, and `endpoint-catalog.json`, and the publication proof still cannot be promoted to release truth. Any claim that the registry is now fully published would be false confidence.

Repo hygiene improved in the implementation commit because tracked junk and temp debris were removed, but the current verification run left ignored runtime residue under `mom/data/registry/`, `mom/_reports/`, `mom/data/php_error.log`, and `mom/data/schema-studio/*`. Those files are ignored by policy, but they are still local debris and should be cleaned before merge.

## Closure ledger

| Item | Status | Evidence | Why it still matters |
|---|---|---|---|
| Registry bootstrap path drift and root-vs-`mom/` mismatch | `ALREADY_FIXED` | `mom/data/registry/table-registry.json`, `endpoint-catalog-index.json`, `relation-map.json`, and `schema-authority-summary.json` now exist; `refresh_data_schema_authority.php --skip-publication` prints `tableCount: 772` and `registryTableCount: 661` before any later failure; current `schema-authority-model.md` says the bootstrap path drift was repaired | The path split that made the bootstrap invisible to the runtime consumers is gone |
| Publication truth and full publication artifact set | `FIX_NOW` | `verify_publication_truth.py` still fails on 36 missing artifacts including `endpoint-catalog.json`, `frontend-foundation-catalog.json`, `registry-quality-report.json`, wave policy/report files, `system-contract-*`, `wave-gap-ledger.json`, and publication summary outputs; `canonical_publication_orchestrator.py` still fails on missing `data-fields.json`, `orphan-resolution.json`, `domain-architecture.json`, `endpoint-catalog.json`, `frontend-foundation-catalog.json`, and other generated inputs | The bootstrap layer exists, but the publication layer is still incomplete and code-fixable |
| Metadata-only blocker families from the canonical orchestrator | `FIX_NOW` | The orchestrator still stops on missing registry inputs for `data-fields.json`, `orphan-resolution.json`, and `domain-architecture.json`; the wave generators still fail on missing policy and normalization files | These are generated-input gaps, not a product decision |
| Capability/readiness metrics are not publication proof | `INVALID_CLAIM` | `enterprise_registry_doctor.py` now runs successfully, `generate_global_erp_mom_capability_audit.py` reports `frontend_ready: true`, but `verify_publication_truth.py` still fails and `enterprise_frontend_simulator.py` still reports blocked scenarios | A narrow capability score is not release or publication truth |
| DB_PASSWORD as the current root blocker | `INVALID_CLAIM` | `refresh_data_schema_authority.php --skip-publication` now fails on missing `mom/data/registry/operational-blind-spot-catalog.json`; the full orchestrator fails on missing registry inputs before any credentials-only stop is demonstrated | The current exercised failure mode is missing publication inputs, not a verified credentials gate |
| Attachment / work-instruction / formula contract semantics | `PRODUCT_DECISION_REQUIRED` | The canonical orchestrator still classifies `missing_attachment_contract`, `missing_work_instruction_signal`, and `missing_formula_or_aggregate_contract` as manual domain decisions | These require owner/product semantics, not mechanical repair |
| Full admin-tab backend authority migration scope | `PRODUCT_DECISION_REQUIRED` | Current schema-authority docs still describe the System Contract Registry as bootstrap-only and not full publication truth | The scope of a full admin-control-plane migration is broader than this tranche |
| Tracked junk / temp debris removal | `ALREADY_FIXED` | The implementation commit deleted `.ai/index.log`, `.claude/settings.local.json`, `mom/.DS_Store`, `mom/data/audit.log`, `mom/docs/tmp/*`, `mom/ops/local-runtime/.php-server.log`, `mom/ops/local-runtime/.php-server.pid`, and `mom/tools/benchmark/.tmp-benchmark-schema.sql` | The tracked debris problem was addressed in the implementation commit |
| Ignored runtime residue after verification | `FIX_NOW` | `git status --short --ignored=matching` shows ignored residue under `mom/_reports/`, `mom/data/php_error.log`, `mom/data/registry/`, and `mom/data/schema-studio/{compiler,exports,releases,snapshots}` | It is not committed, but it is still local runtime noise and should be cleaned |

## Prioritized `FIX_NOW` list

1. Finish the publication artifact set under `mom/data/registry/` so the verifier and orchestrator can complete instead of stopping on missing generated inputs.
2. Regenerate the missing wave and system-contract outputs, then rerun `verify_publication_truth.py`, `canonical_publication_orchestrator.py`, `generate_publication_truth_summaries.py`, and `generate_system_contract_authority.py`.
3. Treat `frontend_ready: true` and `enterprise_registry_doctor` success as narrow metrics only, not as proof of publication truth.
4. Clean the ignored runtime residue created by the verification run so the worktree stays free of avoidable local debris.

## Repo hygiene / ignore rules

- `.gitignore` now explicitly ignores `mom/data/` while unignoring only the bootstrap registry files that are meant to stay tracked.
- The missing-ignore-rule debt is gone.
- The remaining hygiene issue is local residue from verification runs, not a commit of junk files.

## Tests and verifiers run

Completed successfully:

- `enterprise_registry_doctor.py`
- `generate_global_erp_mom_capability_audit.py`

Completed but still blocked:

- `enterprise_frontend_simulator.py` now reaches the governance overlay layer instead of failing immediately on a missing registry table; it still returns a blocked status.

Failed directly:

- `verify_publication_truth.py`
- `canonical_publication_orchestrator.py`
- `refresh_data_schema_authority.php --skip-publication`
- `refresh_data_schema_authority.php`
- `generate_publication_truth_summaries.py`
- `generate_system_contract_authority.py`
- `mom/tests/module_access_smoke.php` exited `255` without surfaced diagnostics in this environment

Failed through the canonical orchestrator chain:

- `generate-table-architecture.mjs`
- `generate-data-fields-registry.mjs`
- `generate-workflow-governance.mjs`
- `generate-module-builder-registry.mjs`
- `add_slice_field_definitions.py`
- `onboard_registry_keys.py`
- `regenerate_slice_publication.py`
- `generate_wave0_governance.py`
- `generate_operational_blind_spot_report.py`
- `generate_wave1_lifecycle_governance.py`
- `generate_wave2_canonical_governance.py`
- `generate_wave3_process_governance.py`
- `generate_wave4_production_quality_governance.py`
- `generate_wave5_maintenance_ehs_governance.py`
- `generate_wave6_finance_projection_governance.py`
- `generate_operational_stress_report.py`
- `generate_business_contract_bundle.py`

Smoke test note:

- `mom/tests/module_access_smoke.php` exited `255` without surfacing diagnostics in this environment, so I could not strengthen that into a code-fixable defect with evidence.

## Remaining blocked-external items

- None verified in this pass.
- The earlier `DB_PASSWORD` blocker is not the current root cause on the exercised path.

## Remaining product-decision items

- Attachment contract semantics.
- Work-instruction signal semantics.
- Formula / aggregate contract semantics.
- Scope of a full admin-tab backend authority migration.

## Final verdict

What is stronger now:

- The registry bootstrap files are in the runtime-consumed path.
- The old path drift is fixed.
- The tracked junk/temp debris was removed in the implementation commit.
- The doctor and capability audit now run and produce outputs instead of dying at the first path mismatch.

What still blocks world-class closure:

- Full publication truth is still incomplete.
- The canonical publication pipeline still fails on missing generated inputs.
- The ignored runtime residue still needs cleanup.
- Narrow readiness metrics are still too easy to overread as proof of publication truth.

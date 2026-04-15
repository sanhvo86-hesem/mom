# Tranche 13 Agent 6 Defects Backlog Audit

Date: 2026-04-14  
Branch: `codex/tranche13-a6-defects-backlog`  
Scope: inherited backlog closure, current docs vs code vs tests vs generated artifacts, repo hygiene debt

## Executive summary

Supersession note, 2026-04-15: this report describes the tranche13 branch state at the time it was written. It is no longer the current repo state. Later closure work moved the registry authority into `mom/data/registry/`, and the current verification run reports `verify_publication_truth.py` PASS 281/281, release-candidate verification 36/36 PASS, and repo boundary clean.

The registry/publication backlog is still not closed. The new commit `a42f0d16` did land a bootstrap set of generated registry artifacts, but it landed them at the repository root `data/registry/`, while the current registry consumers and verifiers resolve `mom/data/registry/`. That means the publication layer is still unproven in the path the code actually uses.

The current failure mode is internal path/input drift, not a clean external-credential stop. In this pass, `refresh_data_schema_authority.php --skip-publication` and the full orchestrator both fail on missing registry inputs under `mom/data/registry/` before any credentials-only blocker becomes decisive. The previous “DB_PASSWORD is the blocker” claim is therefore overstated for this branch state.

No new code was changed in this audit. I also found ignored runtime residue from the verification run under `mom/data/registry/` and `mom/_reports/`; that is process-fixable noise, not verified source authority.

## Closure ledger

| Item | Source prompt / tranche / doc | Current verified status | Evidence | Why still open | Code-fixable now | Action in this run |
|---|---|---|---|---|---|---|
| Publication registry path drift and incomplete bootstrap landing | Tranche 12 publication prompts/docs; `a42f0d16 Add generated registry bootstrap artifacts` | `FIX_NOW` | `git show --stat a42f0d16` adds `data/registry/{endpoint-catalog-index.json,relation-map.json,schema-authority-summary.json,table-registry.json}`; `canonical_publication_orchestrator.py:61-69`, `verify_publication_truth.py:17-25`, and `generate_global_erp_mom_capability_audit.py:21-29` all resolve `mom/data/registry`; `verify_publication_truth.py` still fails on missing `mom/data/registry/{endpoint-catalog.json,frontend-foundation-catalog.json,registry-manifest.json,...}`; `enterprise_registry_doctor.py` and the orchestrator still fail on `mom/data/registry/table-registry.json` | The bootstrap landing exists, but it is not in the authority directory the code actually consumes; required publication files are still missing there | Yes | Move or regenerate the registry artifacts into the consumed authority path and rerun the publication pipeline |
| Publication truth remains partial/unproven | `mom/docs/schema-field-audit-full.json`, tranche 12 closure docs, tranche13 verifier output | `SUPERSEDED_CLOSED` | Historical tranche13 verifier failed Gate A/C/D; current 2026-04-15 verifier reports `verify_publication_truth.py` PASS 281/281 | The tranche13 defect was real for that branch state, but no longer represents current repo posture | No | Keep this row as historical evidence only; use current publication verifier output for release decisions |
| Metadata-only blocker families | `close_partial_entities.py`, `canonical_publication_orchestrator.py` | `FIX_NOW` | The orchestrator still classifies `missing_record_timestamps`, `missing_operation_context`, `missing_execution_status`, `missing_planning_time_axis`, `missing_planning_status_dimension`, `missing_resource_dimension`, and `missing_traceability_identity` as generator-automatable; those generators stop immediately because the registry inputs are absent | Missing registry inputs prevent the mechanical closure pass from running | Yes | Restore the registry source set and regenerate the metadata families |
| Attachment / work-instruction / formula contracts | Orchestrator blocker classifications | `PRODUCT_DECISION_REQUIRED` | The orchestrator still treats `missing_attachment_contract`, `missing_work_instruction_signal`, and `missing_formula_or_aggregate_contract` as manual domain decisions | These are semantic decisions, not mechanical data repair | No | Leave as an explicit product/owner decision |
| Full admin-tab backend authority migration scope | `mom/docs/system/admin-tabs-international-standard-gap-assessment-2026-04-09.md`, `mom/docs/schema-authority-model.md` | `PRODUCT_DECISION_REQUIRED` | `mom/docs/schema-authority-model.md:5-14` still states the System Contract Registry is unproven/blocked; current code has the route alias and direct-write fallback behavior, so the remaining question is the scope of a full admin-control-plane migration | The deeper authority migration is broader than this closure tranche | No | Keep this as scope/architecture decision, not a fake green claim |
| DB_PASSWORD as the active publication blocker | Tranche 12 pass-2 notes / prior schema-refresh blocker claim | `INVALID_CLAIM` | `refresh_data_schema_authority.php --skip-publication` now fails later on missing `mom/data/registry/operational-blind-spot-catalog.json`; the full refresh run also fails on the same missing registry inputs and never demonstrates a credentials-only stop on this path | The current exercised failure path is missing registry inputs, not a verified credentials gate | No | Do not report DB_PASSWORD as the current root cause for this branch state |
| Historical global PASS / readiness claims | Prior tranche docs and execution reports | `INVALID_CLAIM` | Current verifier and pipeline runs still fail; the root `data/registry/` bootstrap files do not satisfy the `mom/data/registry/` authority layer | Past “green” statements no longer match the tree | No | Keep the docs honest; do not reintroduce the false landing |
| Session bootstrap log pollution | Backend cleanup tranche | `ALREADY_FIXED` | Previously closed in `SessionService` / `api.php`; not reopened by this pass | No current regression evidence | No | Verified only |
| Stale workspace revision guard | Schema Studio cleanup tranche | `ALREADY_FIXED` | The stale revision save path still rejects `stale_workspace_revision`; no new regression surfaced | Already closed and still behaving | No | Verified only |
| Contract-authority bundle gaps | Backend cleanup tranche | `ALREADY_FIXED` | `mom/contracts/authority-report.json` still reports full authored/core coverage | Already closed | No | Verified only |
| Ignored runtime residue from verification runs | Current `git status --ignored`, generated verifier outputs | `FIX_NOW` | `git status --short --ignored=matching` shows ignored runtime output under `mom/data/registry/`, `mom/_reports/`, and `mom/data/schema-studio/{compiler,exports,releases,snapshots}`; `mom/data/registry/` now contains runtime reports from `enterprise_frontend_simulator.py` and `generate_global_erp_mom_capability_audit.py` | Local runtime residue is process-fixable noise and should not be mistaken for checked-in authority | Yes | Clean or isolate the runtime outputs after verification runs |

## Prioritized `FIX_NOW` list

1. Fix the registry authority path drift: the bootstrap artifacts are at `data/registry/`, but every runtime verifier and generator resolves `mom/data/registry/`.
2. Regenerate the missing publication artifacts under the consumed authority path, then rerun the truth/orchestrator/doctor pipeline.
3. Close the metadata-only blocker families after the registry inputs exist, instead of treating their current generator failures as acceptable.
4. Clean up or isolate the ignored runtime residue created by the verification run so local noise does not masquerade as authority evidence.

## Repo hygiene notes

- The report file itself lives under `mom/docs/system/agent-reports/tranche13/`, which is ignored by `.gitignore` and therefore must be force-added for audit tracking.
- No OS/editor junk or screenshot debris was found in this pass.
- The only tracked file that was accidentally mutated during verification, `mom/database/schema-authority-summary.{json,md}`, was restored before commit.

## Verifiers and evidence used

- `git show --stat a42f0d16`
- `python3 mom/tools/registry/verify_publication_truth.py`
- `python3 mom/tools/registry/canonical_publication_orchestrator.py`
- `php mom/tools/schema/refresh_data_schema_authority.php --skip-publication`
- `php mom/tools/schema/refresh_data_schema_authority.php`
- `python3 mom/tools/registry/enterprise_frontend_simulator.py`
- `python3 mom/tools/registry/generate_global_erp_mom_capability_audit.py`
- `python3 mom/tools/registry/generate_publication_truth_summaries.py`
- `python3 mom/tools/registry/generate_system_contract_authority.py`
- `git status --short --ignored=matching`

# Tranche 12 - Agent 6 Defects Backlog Audit

Date: 2026-04-14
Scope: inherited backlog closure audit only. No code fixes were made in this pass.

## Executive Verdict

Current repo truth is still split between real code, missing publication artifacts, and older docs that overclaim closure.

Summary by class:

- `FIX_NOW`: 4
- `ALREADY_FIXED`: 3
- `INVALID_CLAIM`: 2
- `PRODUCT_DECISION_REQUIRED`: 1
- `BLOCKED_EXTERNAL`: 1

The biggest code-fixable backlog remains the publication registry surface itself: the current worktree does not contain the `data/registry` artifact set that the publication verifier, orchestrator, and smoke tests expect.

## Prioritized FIX_NOW

1. Restore and commit the missing publication registry artifact set under `mom/data/registry`.
2. Close the remaining publication blockers: `198` partial frontend entities and `115` workflow-engine bridge blockers.
3. Close the generator-automatable semantic blocker families: record timestamps, operation context, execution status, planning axes, traceability identity, and resource dimension.
4. Normalize admin-tab authority so writes stop depending on fragile temp-file-only JSON saves and browser-local persistence.

## Strict Closure Ledger

### 1. Publication registry artifacts are missing from the repo tree

- **Status:** `FIX_NOW`
- **Source docs / tools:** [verify_publication_truth.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/verify_publication_truth.py#L17), [canonical_publication_orchestrator.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/canonical_publication_orchestrator.py#L61), [generate_publication_truth_summaries.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/generate_publication_truth_summaries.py#L12)
- **Evidence from current run:** `find mom/data` shows no `data/registry` directory. `verify_publication_truth.py` failed Gate A on missing `endpoint-catalog.json`, `frontend-foundation-catalog.json`, `registry-manifest.json`, `registry-quality-report.json`, the wave 0-6 policy/report set, `wave-gap-ledger.json`, `publication-truth-summary.json`, `publication-entity-accounting.json`, and `foundation-governance-publication-summary.json`. `canonical_publication_orchestrator.py` failed immediately on missing `data-fields.json`.
- **Why still open:** the publication pipeline cannot converge if the committed tree does not contain the registry inputs/outputs that the rest of the tooling expects.
- **Code-fixable now:** yes.

### 2. Publication truth is still partial

- **Status:** `FIX_NOW`
- **Source artifact:** [schema-field-audit-full.json](/Users/a10/Documents/mom-tranche12-a6/mom/docs/schema-field-audit-full.json#L1)
- **Evidence:** `entity_count = 528`, `ready_entities = 330`, `partial_entities = 198`, `workflow_engine_bridge_ready = 0`, `workflow_engine_bridge_blocked = 115`, `publishability_ready = false`, `failed_checks` still fail on frontend entities and workflow-engine bridges.
- **Why still open:** the current artifact still says the platform is not publishable and still has a large partial set.
- **Code-fixable now:** yes.

### 3. Metadata-only partial families are modeled as generator-automatable blockers but remain open

- **Status:** `FIX_NOW`
- **Source code:** [close_partial_entities.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/close_partial_entities.py#L31), [canonical_publication_orchestrator.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/canonical_publication_orchestrator.py#L113), [generate-module-builder-registry.mjs](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/generate-module-builder-registry.mjs#L2161)
- **Evidence:** the code already classifies these blockers as `generator_automatable` / `metadata_only_gap`: `missing_record_timestamps`, `missing_operation_context`, `missing_execution_status`, `missing_planning_time_axis`, `missing_planning_status_dimension`, `missing_resource_dimension`, `missing_traceability_identity`.
- **Why still open:** the generator and orchestrator still surface these blocker families in current logic, so they remain live until the registry is regenerated and the underlying fields exist where expected.
- **Code-fixable now:** yes.

### 4. Attachment, work-instruction, and formula contracts still need domain-owner decision

- **Status:** `PRODUCT_DECISION_REQUIRED`
- **Source code:** [canonical_publication_orchestrator.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/canonical_publication_orchestrator.py#L162), [close_partial_entities.py](/Users/a10/Documents/mom-tranche12-a6/mom/tools/registry/close_partial_entities.py#L58)
- **Evidence:** `missing_attachment_contract`, `missing_work_instruction_signal`, and `missing_formula_or_aggregate_contract` are explicitly classified as `manual_domain_decision` in the orchestrator.
- **Why still open:** these are not pure mechanical gaps; the repo already says they require a domain-owner call on what the canonical contract should be.
- **Code-fixable now:** no.

### 5. Admin-tab authority is still split, and config writes remain fragile

- **Status:** `FIX_NOW`
- **Source doc:** [admin-tabs-international-standard-gap-assessment-2026-04-09.md](/Users/a10/Documents/mom-tranche12-a6/mom/docs/system/admin-tabs-international-standard-gap-assessment-2026-04-09.md#L44)
- **Evidence:** the assessment still records split source-of-truth, frontend/backend role mismatch, browser-local department/title persistence, browser-local permission overrides, audit split-brain, and temp-file-only config writes. The code path still uses `write_json_file()` with a temp file in the same directory before falling back to direct write: [api.php](/Users/a10/Documents/mom-tranche12-a6/mom/api.php#L660), [FileHelper.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/services/FileHelper.php#L54).
- **Important correction:** the specific subclaim that `admin_users_list` is still a raw legacy endpoint is stale. Current routing sends it to `UserController::list` in [core-routes.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/routes/core-routes.php#L60), and client-safe user payloads already include stable `employee_id`, `username`, and org-scope fields in [sanitize_user_for_client](/Users/a10/Documents/mom-tranche12-a6/mom/api.php#L15054) and [InputSanitizer](/Users/a10/Documents/mom-tranche12-a6/mom/api/services/InputSanitizer.php#L88).
- **Why still open:** the remaining gap is backend-authoritative persistence and policy enforcement, not just alias routing.
- **Code-fixable now:** yes.

### 6. Historical global-pass claims are invalid against current artifacts

- **Status:** `INVALID_CLAIM`
- **Source docs:** [prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-execution-report-2026-04-07.md](/Users/a10/Documents/mom-tranche12-a6/mom/docs/ai-prompts/prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-execution-report-2026-04-07.md), [prompt-03-platform-post-merge-public-repo-truth-convergence-repair-execution-report-2026-04-08.md](/Users/a10/Documents/mom-tranche12-a6/mom/docs/ai-prompts/prompt-03-platform-post-merge-public-repo-truth-convergence-repair-execution-report-2026-04-08.md)
- **Evidence:** current OpenAPI is `3.1.2` in [openapi.yaml](/Users/a10/Documents/mom-tranche12-a6/mom/api/openapi.yaml#L1), but current publication truth still says `frontend_foundation_entities = 528`, `frontend_partial_entities = 198`, and `publishability_ready = false` in [schema-field-audit-full.json](/Users/a10/Documents/mom-tranche12-a6/mom/docs/schema-field-audit-full.json#L35). The backend smoke suite still expects `workflow_engine_bridge_ready > 0` and `workflow_engine_bridge_blocked == 0` in [backend_smoke.php](/Users/a10/Documents/mom-tranche12-a6/mom/tests/backend_smoke.php#L1761).
- **Why invalid:** the older PASS narrative does not match the current artifact set.
- **Code-fixable now:** not applicable.

### 7. Session bootstrap log pollution is already fixed

- **Status:** `ALREADY_FIXED`
- **Source code:** [SessionService.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/services/SessionService.php#L1), [api.php](/Users/a10/Documents/mom-tranche12-a6/mom/api.php#L13767)
- **Evidence:** headerless/CLI session startup now uses explicit fallback paths and fresh-session recovery rather than emitting avoidable session warnings. The cleanup tranche already recorded this as closed in [backend-cleanup-execution-2026-04-10.md](/Users/a10/Documents/mom-tranche12-a6/mom/docs/system/backend-cleanup-execution-2026-04-10.md#L37).
- **Why closed:** the code path now handles the earlier warning class directly.
- **Code-fixable now:** no.

### 8. Stale workspace revision protection is already fixed

- **Status:** `ALREADY_FIXED`
- **Source code / test:** [AdminMetadataStudioController.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/controllers/AdminMetadataStudioController.php#L400), [data_schema_admin_smoke.php](/Users/a10/Documents/mom-tranche12-a6/mom/tests/data_schema_admin_smoke.php#L573)
- **Evidence:** saves now reject stale edits with `stale_workspace_revision`, and the smoke test asserts the `409` path explicitly.
- **Why closed:** the stale-write guard exists and is tested.
- **Code-fixable now:** no.

### 9. Cleanup tranche contract-authority gaps are already fixed

- **Status:** `ALREADY_FIXED`
- **Source docs / artifacts:** [backend-cleanup-execution-2026-04-10.md](/Users/a10/Documents/mom-tranche12-a6/mom/docs/system/backend-cleanup-execution-2026-04-10.md#L52), [package-index.json](/Users/a10/Documents/mom-tranche12-a6/mom/contracts/package-index.json#L713), [authority-report.json](/Users/a10/Documents/mom-tranche12-a6/mom/contracts/authority-report.json#L7)
- **Evidence:** the three contracts called out in the cleanup doc now exist: `supplier-asns`, `purchase-receipt-corrections`, and `improvement-actions`. The authority report now shows `authoredCoverageRatio = 1.0`, `coreValueStreamCoverageRatio = 1.0`, and `priorityGapCount = 0`.
- **Why closed:** that inherited tranche backlog no longer appears open in the current repo truth.
- **Code-fixable now:** no.

### 10. Publication regeneration is externally blocked in this workspace

- **Status:** `BLOCKED_EXTERNAL`
- **Evidence from command run:** `php tools/schema/refresh_data_schema_authority.php --skip-publication` exits with `DB_PASSWORD environment variable is required and must not be empty in production environment`.
- **Why blocked:** at least one schema/publication regeneration path requires database credentials that are not present in this environment.
- **Code-fixable now:** no, until the environment supplies the required secret or a test-mode path is provided.

## Tests And Verifiers Run

### Failures that are useful evidence

- `python3 mom/tools/registry/verify_publication_truth.py`
  - failed Gate A because the current tree does not contain the `data/registry` publication artifacts.
  - failed Gate C because there is no shared publication run id across missing artifacts.
- `python3 mom/tools/registry/canonical_publication_orchestrator.py`
  - failed immediately on missing `mom/data/registry/data-fields.json`.
  - later steps also failed on missing `table-registry.json`, `data-fields-part2.json`, and other registry inputs.
- `php mom/tests/module_access_smoke.php`
  - failed immediately because `DB_PASSWORD` is required in the current environment.

### Positive evidence

- `enterprise_frontend_simulator.py` completed and reported all 10 scenarios blocked by `missing_registry_table`.
- `generate_global_erp_mom_capability_audit.py` completed and reported `covered = 0`, `blocking_gap_count = 1`, and `frontend_ready = false`.
- `api/openapi.yaml` is currently `3.1.2`.

## Remaining Truth Gaps

- The repo still needs the committed publication registry artifact set.
- Publication readiness is still false.
- Admin-tab persistence is still not fully authoritative.
- Some blocker families still require domain-owner decision rather than mechanical regeneration.
- Some regeneration paths cannot run in this environment without database credentials.

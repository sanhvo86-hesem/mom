# Tranche 12 - Pass 2 Agent 6 Defects Backlog Red-Team

Date: 2026-04-14
Scope: red-team of pass 1 audit findings and any new false confidence introduced by this run. No code fixes were made.

## Executive Verdict

The repo is still not in a zero-backlog state.

What remains genuinely open:

- the committed publication registry artifact set is still missing
- publication truth cannot be treated as current verified state
- admin authority is still split across UI, config, and runtime policy surfaces
- some blocker families still require a domain-owner decision

What the pass 1 report overstated:

- the `198/115` publication truth numbers are stale doc evidence, not current verified authority
- the specific `temp-file-only` config-write fragility claim is too strong against the code now present
- the `admin_users_list` route claim was already corrected by routing and client-sanitization code

## Reclassification Summary

- `FIX_NOW`: 3
- `ALREADY_FIXED`: 3
- `INVALID_CLAIM`: 2
- `STILL_OPEN_AND_UNACCEPTABLE`: 1
- `PRODUCT_DECISION_REQUIRED`: 1
- `BLOCKED_EXTERNAL`: 1

## Findings

### 1. The publication registry artifact tree is still missing

- **Status:** `FIX_NOW`
- **Evidence:** `find mom/data` shows no `mom/data/registry` directory in this worktree. `python3 mom/tools/registry/verify_publication_truth.py` fails Gate A on missing `endpoint-catalog.json`, `frontend-foundation-catalog.json`, `registry-manifest.json`, `registry-quality-report.json`, the wave 0-6 policy/report set, `wave-gap-ledger.json`, `publication-truth-summary.json`, `publication-entity-accounting.json`, and `foundation-governance-publication-summary.json`. `canonical_publication_orchestrator.py` aborts on missing `data-fields.json`.
- **Why this is still open:** the publication toolchain cannot converge without the current registry inputs and outputs.
- **Code-fixable now:** yes.

### 2. The current `198/115` publication counts are not verified repo truth

- **Status:** `STILL_OPEN_AND_UNACCEPTABLE`
- **Evidence:** `docs/schema-field-audit-full.json` still states `entity_count = 528`, `ready_entities = 330`, `partial_entities = 198`, `workflow_engine_bridge_ready = 0`, and `workflow_engine_bridge_blocked = 115`. But the current worktree does not contain the live `mom/data/registry` artifacts that would make those counts current authority, and the publication verifier fails before it can validate the accounting layer.
- **Why this matters:** the pass 1 report treated those counts as current partial truth. In this worktree they should be treated as stale doc evidence until the registry surface is regenerated and checked in.
- **Code-fixable now:** yes, but the currently quoted numbers themselves are not current authority.

### 3. Generator-automatable semantic blockers remain open

- **Status:** `FIX_NOW`
- **Evidence:** the generator/orchestrator code still classifies these families as active blocker logic: `missing_record_timestamps`, `missing_operation_context`, `missing_execution_status`, `missing_planning_time_axis`, `missing_planning_status_dimension`, `missing_resource_dimension`, and `missing_traceability_identity`.
- **Why this is still open:** the code already knows how to reason about the gaps, but the committed registry surface that those generators depend on is still absent.
- **Code-fixable now:** yes.

### 4. Admin authority is still not fully backend-authoritative

- **Status:** `FIX_NOW`
- **Evidence:** the admin-tabs assessment still reports split source-of-truth, browser-local department/title persistence, browser-local permission overrides, and split audit surfaces. Code inspection still shows legacy JSON write helpers in [api.php](/Users/a10/Documents/mom-tranche12-a6/mom/api.php#L660) and [FileHelper.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/services/FileHelper.php#L54), plus client-side admin surfaces that continue to rely on local configuration.
- **Important correction:** the specific `admin_users_list` legacy-endpoint claim from the pass 1 summary is false. Routing now maps it to `UserController::list` in [core-routes.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/routes/core-routes.php#L60), and sanitized user payloads already carry stable identity and org-scope fields in [sanitize_user_for_client](/Users/a10/Documents/mom-tranche12-a6/mom/api.php#L15054) and [InputSanitizer](/Users/a10/Documents/mom-tranche12-a6/mom/api/services/InputSanitizer.php#L88).
- **Why still open:** the remaining problem is authority and persistence, not the old route name.
- **Code-fixable now:** yes.

### 5. The specific `temp-file-only` fragility claim is overstated

- **Status:** `INVALID_CLAIM`
- **Evidence:** both write helpers try temp-file rename first and then fall back to direct `file_put_contents()` if rename fails. That is not temp-file-only behavior. The pass 1 wording overstates the implementation.
- **Why invalid:** the code contains a direct-write fallback path; the stronger claim would need a live write-probe failure, not just the helper shape.
- **Code-fixable now:** not as stated.

### 6. Historical global PASS claims are invalid against current artifacts

- **Status:** `INVALID_CLAIM`
- **Evidence:** current OpenAPI is `3.1.2` in [openapi.yaml](/Users/a10/Documents/mom-tranche12-a6/mom/api/openapi.yaml#L1), but the repository still lacks the current publication registry artifacts needed to support any claim of platform-wide publishability. The backend smoke suite itself still asserts that the quality report should surface ready workflow-engine bridges in [backend_smoke.php](/Users/a10/Documents/mom-tranche12-a6/mom/tests/backend_smoke.php#L1761), which is incompatible with the stale 198/115 partial-state narrative.
- **Why invalid:** earlier PASS-style claims do not match the current repo evidence set.
- **Code-fixable now:** not applicable.

### 7. Attachment, work-instruction, and formula contracts still need a product decision

- **Status:** `PRODUCT_DECISION_REQUIRED`
- **Evidence:** the orchestrator explicitly classifies `missing_attachment_contract`, `missing_work_instruction_signal`, and `missing_formula_or_aggregate_contract` as `manual_domain_decision`.
- **Why still open:** these are not purely mechanical field additions; the canonical contract itself needs owner judgment.
- **Code-fixable now:** not until the decision is made.

### 8. Session bootstrap log pollution is already fixed

- **Status:** `ALREADY_FIXED`
- **Evidence:** `SessionService::init()` and the legacy session helper now handle CLI/headerless startup and fresh-session recovery without the earlier avoidable warning pattern. The cleanup tranche already documented this closure.
- **Why closed:** the earlier warning class is no longer a live backlog item in this tree.
- **Code-fixable now:** no.

### 9. Stale workspace revision protection is already fixed

- **Status:** `ALREADY_FIXED`
- **Evidence:** [AdminMetadataStudioController.php](/Users/a10/Documents/mom-tranche12-a6/mom/api/controllers/AdminMetadataStudioController.php#L400) rejects stale writes with `stale_workspace_revision`, and the dedicated smoke test asserts the `409` path in [data_schema_admin_smoke.php](/Users/a10/Documents/mom-tranche12-a6/mom/tests/data_schema_admin_smoke.php#L573).
- **Why closed:** the stale-save guard exists and is tested.
- **Code-fixable now:** no.

### 10. Cleanup tranche contract-authority gaps are already fixed

- **Status:** `ALREADY_FIXED`
- **Evidence:** the cleanup tranche’s three contracts now exist in `mom/contracts/objects/`: `procurement_supplier_quality--supplier-asns`, `procurement_supplier_quality--purchase-receipt-corrections`, and `quality_improvement--improvement-actions`. The authority report shows `authoredCoverageRatio = 1.0` and `priorityGapCount = 0`.
- **Why closed:** that inherited backlog no longer appears open in current repo truth.
- **Code-fixable now:** no.

### 11. Schema/publication regeneration is externally blocked in this environment

- **Status:** `BLOCKED_EXTERNAL`
- **Evidence:** `php /Users/a10/Documents/mom-tranche12-a6/mom/tools/schema/refresh_data_schema_authority.php --skip-publication` fails because `DB_PASSWORD environment variable is required and must not be empty in production environment`.
- **Why blocked:** at least one regeneration path depends on a live database secret that is not present here.
- **Code-fixable now:** no, until the environment is supplied or a test-mode path is added.

## Red-Team Notes

- The pass 1 report correctly identified the missing publication registry surface, but it should not have treated the `198/115` counts as current verified truth.
- The pass 1 report correctly identified admin authority split-brain, but the `admin_users_list` subclaim is now stale.
- The pass 1 report correctly identified environment blockage for some regeneration paths, but that block is narrower than the overall publication-registry gap.
- The ignored `mom/docs/system/agent-reports/tranche12` path is a workflow hazard: these audit files do not surface normally unless force-added.

## Tests / Verifiers Observed

- `python3 mom/tools/registry/verify_publication_truth.py` failed on missing `mom/data/registry` artifacts.
- `python3 mom/tools/registry/canonical_publication_orchestrator.py` failed on missing registry inputs such as `data-fields.json`.
- `php /Users/a10/Documents/mom-tranche12-a6/mom/tools/schema/refresh_data_schema_authority.php --skip-publication` failed on missing `DB_PASSWORD`.
- `enterprise_frontend_simulator.py` still reports all scenarios blocked by `missing_registry_table`.

## Remaining Code-Fixable Backlog

- Restore and commit the publication registry artifact tree.
- Regenerate the publication truth outputs after the registry tree exists.
- Continue closing the generator-automatable metadata blocker families.
- Finish the backend-authoritative admin persistence split.

## Changed Files

- `mom/docs/system/agent-reports/tranche12/pass2-agent6-defects-backlog.md`

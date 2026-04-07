# Prompt 02 Foundation Governance Slice Proof Package And Canonical Metric Convergence Prompt (2026-04-07)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This is a **narrow convergence pass** for the existing Foundation Governance Prompt 02 workstream.

Do **not** reopen architecture.
Do **not** broaden into Prompt 03 platform-wide redesign.
Do **not** generate another big planning package.
Do **not** chase generic modernization.

Your job is to make the **public repo self-explaining and metric-consistent** for the Foundation Governance slice.

## Repo-truth context you must start from

Current public repo state shows all of the following at once:

- `api/openapi.yaml` already exposes real Foundation / Governance routes and hardening:
  - `If-Match`
  - `ETag`
  - RFC 9457 problem responses on `approval-groups/{approvalGroupId}:decide`
  - session cookie + CSRF security semantics
- `registry-manifest.json` and `registry-quality-report.json` now share the same:
  - `generatedAt`
  - `publication_run_id`
  - `slice_publication_pass = foundation_governance_contract_slice`
- but canonical metrics are still split:
  - manifest says workflow bridge = `103 ready / 12 blocked`
  - quality report says workflow bridge = `104 ready / 11 blocked`
- `publishability_ready` is still `false`
- `frontend_partial_entities = 108`
- `frontend-foundation-catalog.json` is too large to render on GitHub (8.05 MB)
- `endpoint-catalog.json` is too large to render on GitHub (16.1 MB)
- there is still no compact public proof artifact in `qms-data/registry/`

You must work from **repo truth only**.

## Primary authority

Use these inputs in this exact order:

1. `prompt-02-foundation-governance-bridge-truthfulness-metadata-closure-and-observability-prompt-2026-04-07.md`
2. `prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-deep-evaluation-2026-04-07.md`
3. `prompt-02-foundation-governance-overall-state-deep-evaluation-2026-04-07.md`
4. current repo code and artifacts

If any prompt text conflicts with current repo code or generated artifacts, **repo truth wins**.

## Mandatory repo inputs

### Public contract
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/api/Router.php`

### Runtime / slice implementation
- `01-QMS-Portal/api/controllers/ApprovalGroupController.php`
- `01-QMS-Portal/api/controllers/MasterDataController.php`
- `01-QMS-Portal/api/services/ApprovalGroupService.php`
- `01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php`
- `01-QMS-Portal/api/services/FoundationGovernanceService.php`
- `01-QMS-Portal/api/services/SliceObservability.php`
- `01-QMS-Portal/api/services/WorkflowEngine.php`

### Registry / publication
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/qms-data/registry/data-fields-index.json`
- all generators that produce those artifacts

### Tests / proof
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- `01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql`
- `01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql`
- latest related `_reports/` benchmark and observability outputs

### Docs
- all existing Prompt 02 files already committed in `01-QMS-Portal/docs/ai-prompts/`

## Hard constraints

- Do **not** broaden to full platform redesign.
- Do **not** fake global green status.
- Do **not** hand-edit generated JSON outputs unless the generator is also fixed.
- Do **not** leave split truth in canonical metrics.
- Do **not** claim compact proof exists unless the files are written into the repo.
- Do **not** turn Foundation Governance slice proof into platform-global proof unless that is actually implemented and regenerated.
- Do **not** hide the difference between slice status and platform status.
- Do **not** regress existing runtime contract hardening in OpenAPI.
- Do **not** spend time rewriting earlier prompts.
- Do **not** create “report-only completion”.

## Exact work to perform

### 1) Decide and enforce one truth model: slice-scoped vs platform-global

Right now the repo mixes these ideas:

- `slice_publication_pass = foundation_governance_contract_slice`
- but summary numbers are platform-wide

You must choose **one explicit model** and implement it cleanly.

#### Option A — recommended
Keep `registry-manifest.json` and `registry-quality-report.json` as **platform-global canonical artifacts**, and create **separate slice-proof artifacts** for Foundation Governance.

In this option:
- global files remain honest about platform-wide counts
- `publishability_ready` may stay false if platform-wide blockers still exist
- Foundation Governance gets its own compact slice summary with exact slice verdict

#### Option B
Make the canonical files truly **slice-scoped** for this pass and regenerate them accordingly.

Unacceptable outcome:
- a file says “slice publication pass” but still mixes in unresolved platform-wide blockers without explanation
- reviewers cannot tell whether Foundation Governance itself passed or the platform as a whole passed

You must document which model you chose and why.

### 2) Eliminate metric split truth

At minimum, the following must match exactly between canonical artifacts:
- workflow bridge ready / blocked counts
- ready / partial / blocked frontend entity counts for the scope that the file claims to represent
- publication run ID
- generated timestamp family

Today, workflow bridge counts still differ between manifest and quality report.
Fix the generator / summarizer logic so they share one canonical computation path.

Do **not** patch one file by hand.

### 3) Reconcile or explain `533` vs `528`

Public repo currently shows:
- `frontend_foundation.entity_count = 533`
- asset `frontend-foundation-catalog.json.records = 528`

You must do one of these:
- reconcile the counts if they are supposed to be identical
- or explicitly document why `records != entity_count`
- or expose a machine-readable explanation in the new slice/global proof artifact

Unacceptable outcome:
- silent unresolved accounting drift

### 4) Add compact, GitHub-renderable proof artifacts

Create both:

- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.md`
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.json`

These files must be small, reviewer-friendly, and derived from the same authority as the larger artifacts.

Required content:
- scope (`foundation_governance_contract_slice`)
- whether the scope is slice-only or derived from a global publication run
- publication run ID
- generatedAt
- exact slice entities covered
- exact public routes covered
- exact internal commands covered
- exact slice verdict:
  - ready / partial / blocked
- exact workflow bridge verdict for the slice
- benchmark honesty:
  - e.g. `stability_probe`
- observability honesty:
  - e.g. `file_export_only`
- global platform status explicitly separated from slice status
- verification commands
- anti-false-green statement

These files must not pretend the full platform is publishable if only the slice is.

### 5) Preserve truthful OpenAPI alignment

`openapi.yaml` is already materially improved.
Do not churn it for vanity.

Allowed outcomes:
- keep `3.1.1` if that is the truthful, validated repo state
- or upgrade to `3.1.2` only if you also validate the full file and keep runtime/spec truth aligned

In either case:
- keep `If-Match`
- keep `ETag`
- keep RFC 9457 problem modeling where runtime truly supports it
- keep session cookie + CSRF semantics correct
- do not accidentally revert to OR security modeling

### 6) Strengthen smoke into scope-aware integrity proof

Upgrade `foundation_governance_contract_smoke.php` so it checks:
- manifest and quality report publication_run_id parity
- manifest and quality report bridge-count parity
- summary artifact existence
- summary artifact freshness correlation to the same publication run
- no contradiction between slice summary and global summary
- no contradiction between slice verdict and platform verdict wording
- no missing public Foundation/Governance route from the compact summary
- no missing benchmark / observability honesty declaration in the compact summary

If you choose the global+slice model, smoke must explicitly understand that:
- global publishability may still be false
- slice readiness may still be true

### 7) Add concise documentation of the converged model

Create:
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-slice-proof-package-execution-report-2026-04-07.md`

It must state:
- whether canonical files are global or slice-scoped
- why that model was chosen
- what still blocks platform-global publishability
- whether Foundation Governance slice itself is now self-proving

Keep it concise and technical.

## Required final report format

Return:
1. exact files changed
2. which truth model you implemented:
   - `global_canonical_plus_slice_summary`
   - or `slice_scoped_canonical`
3. whether manifest and quality report now have identical workflow bridge counts
4. whether `533 vs 528` was reconciled or explicitly explained
5. whether compact slice proof files now exist in the repo
6. whether OpenAPI remained `3.1.1` or moved to `3.1.2`
7. exact remaining blockers for:
   - Foundation Governance slice
   - platform-global publishability
8. blunt verdict:
   - `PASS FOR PROMPT 03 SLICE RE-AUDIT`
   - or `HOLD — FOUNDATION GOVERNANCE IS STILL NOT SELF-PROVING`

## Standards anchors

Anchor only where actually relevant:
- OpenAPI Specification 3.1.2
- RFC 9457
- JSON Schema 2020-12
- OpenTelemetry semantic conventions for HTTP
- PostgreSQL serializable / retry reality
- FDA 21 CFR Part 11
- EU GMP Annex 11

Again: this is a **narrow convergence prompt**, not a new architecture phase.

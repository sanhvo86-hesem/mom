# Prompt 02 Foundation Governance Public Repo Truth Convergence And Prompt 03 Preflight Prompt (2026-04-07)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This is a **narrow execution prompt** to make the **public repo** truthfully support the claim that Foundation Governance Prompt 02 is ready for Prompt 03 slice re-audit.

Do **not** reopen platform architecture.
Do **not** generate another planning package.
Do **not** claim success from local state, hidden branches, unpublished runs, or chat history.

**Repo truth on `main` wins.**

Your task is to converge:
1. canonical platform-global publication artifacts,
2. slice-specific Foundation Governance proof artifacts,
3. OpenAPI public contract,
4. publication metrics,
5. Prompt 03 preflight verdict.

## Current public repo reality you must treat as source of truth

At time of writing, the public repo still shows:

- `api/index.php` has real Foundation Governance routes and internal action keys.
- `api/openapi.yaml` is still `openapi: "3.1.1"`.
- `api/openapi.yaml` does not yet publicly document the actual Foundation/Governance REST routes that `index.php` registers.
- `registry-manifest.json` and `registry-quality-report.json` now share one `publication_run_id`, but metrics still drift:
  - manifest: workflow bridge `103/12`
  - quality report: workflow bridge `104/11`
- manifest still says `frontend_foundation.entity_count = 533` while asset `frontend-foundation-catalog.json.records = 528`
- `publishability_ready` is still `false`
- `publication-truth-summary.*` and `foundation-governance-publication-summary.*` are not materialized in the public `qms-data/registry/` tree

Do not dispute these facts unless you actually change and regenerate the repo so that the public files become different.

## Primary inputs

Read these first:

1. `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-public-repo-truth-convergence-and-prompt03-preflight-prompt-2026-04-07.md` (this prompt)
2. `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-public-repo-truth-deep-evaluation-2026-04-07.md`
3. existing Prompt 02 deep-evaluation + hardening + proof + publication-authority docs
4. existing Prompt 03 slice re-audit docs already present in repo
5. current repo code and generated artifacts

If any old prompt text conflicts with current repo files, **current repo files win**.

## Mandatory repo inputs

### Runtime / contract
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/api/Router.php`
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/api/controllers/ApprovalGroupController.php`
- `01-QMS-Portal/api/controllers/MasterDataController.php`
- `01-QMS-Portal/api/controllers/EvidenceController.php`
- `01-QMS-Portal/api/services/ApprovalGroupService.php`
- `01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php`
- `01-QMS-Portal/api/services/FoundationGovernanceService.php`
- `01-QMS-Portal/api/services/EvidenceVaultService.php`
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
- `01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs`
- `01-QMS-Portal/tools/registry/generate-workflow-governance.mjs`
- `01-QMS-Portal/tools/registry/regenerate_slice_publication.py`
- any current publication helper scripts actually used by repo

### Tests / proof
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- any publication verifier / truth verifier scripts already present
- latest related `_reports/` artifacts

### Existing docs
- `01-QMS-Portal/docs/ai-prompts/prompt-03-foundation-governance-slice-re-audit-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-foundation-governance-slice-re-audit-output-2026-04-07.md`

## Hard constraints

- Do **not** claim `PASS FOR PROMPT 03 SLICE RE-AUDIT` unless the **public repo files** now support it.
- Do **not** hand-edit canonical generated JSON to fake success.
- Do **not** keep metric drift between manifest and quality report.
- Do **not** mix slice labels with platform-global counts without explicit separation.
- Do **not** invent compact proof files and forget to actually write them into the repo.
- Do **not** upgrade OpenAPI to 3.1.2 unless the public spec file is actually updated.
- Do **not** claim Foundation/Governance contract coverage in the spec unless the paths are actually present.
- Do **not** keep stale or contradictory counts such as `533` in one place and `528` in another without a machine-readable explanation.
- Do **not** silently ignore `publishability_ready = false`.
- Do **not** broaden to Prompt 03 implementation waves yet. This prompt is a **public repo convergence gate**.

## Exact work to perform

### A. Materialize the claimed truth model for real

If the intended model is `global_canonical_plus_slice_summary`, then implement it explicitly:

#### Platform-global compact summaries
Create both:
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.md`
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.json`

These must summarize the platform-global canonical publication state.

#### Slice-specific compact summaries
Create both:
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.md`
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.json`

These must summarize the Foundation Governance slice only:
- 5 entities
- 10 public routes
- 12 internal commands
- exact slice blockers if any
- exact slice verdict if any

If the slice is blocker-free, say so.
If not, say so exactly.

These files must be **small, GitHub-renderable, and actually committed into the repo tree**.

### B. Unify canonical publication metrics

Fix generator logic so that these artifacts converge from one authority:

- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`

They must agree on:
- `publication_run_id`
- generation timestamp family
- workflow bridge ready / blocked counts
- frontend ready / partial / blocked counts
- total entity counts when referring to the same scope
- scope labels

#### Required correction
The current mismatch between:
- manifest `103/12`
- quality report `104/11`

must be eliminated.

#### Required correction
The current mismatch between:
- `frontend_foundation.entity_count = 533`
- asset `frontend-foundation-catalog.json.records = 528`

must be resolved by one of only these acceptable outcomes:

1. regenerate `frontend-foundation-catalog.json` so it truly has 533 records, or
2. change the canonical entity count to the truthful number, or
3. add a machine-readable exclusion/explanation contract that explains exactly which 5 are excluded and why

Do not leave this ambiguous.

### C. Separate scope semantics cleanly

Canonical platform files may remain platform-global.
Slice proof files may remain slice-specific.

But you must stop the current semantic confusion where:
- canonical JSON says `slice_publication_pass = foundation_governance_contract_slice`
- while the numeric summary block is clearly platform-wide

You must choose and implement one clear model:

#### Option 1 — platform canonical + slice summary (preferred)
- `registry-manifest.json` and `registry-quality-report.json` are explicitly platform-global
- slice-specific publication state lives in the new `foundation-governance-publication-summary.*`

#### Option 2 — slice canonical package
- only if you intentionally split slice publication away from global publication and make that machine-readable everywhere

Whichever model you choose, it must be explicit and internally consistent.

### D. Bring OpenAPI public contract into runtime truth

`api/index.php` already registers the Foundation Governance routes publicly.
`api/openapi.yaml` must stop lagging behind.

You must do one of only two acceptable outcomes:

#### Option A — update spec to runtime truth (preferred)
- add the actual Foundation/Governance paths now live in `index.php`
- document:
  - `/api/v1/foundation/organizations`
  - `/api/v1/foundation/parties`
  - `/api/v1/foundation/calendars`
  - `/api/v1/governance/approval-groups`
  - `/api/v1/governance/approval-groups/{approvalGroupId}`
  - `/api/v1/governance/approval-groups/{approvalGroupId}:decide`
  - `/api/v1/governance/approval-groups/{approvalGroupId}/timeline`
  - governance attachment routes actually exposed
- upgrade to `openapi: "3.1.2"` if you are touching the spec anyway
- document RFC 9457 / `application/problem+json`, `ETag`, `If-Match`, and security semantics **only if runtime truly supports them**

#### Option B — reduce the claim
- if the runtime route is not ready to be documented publicly, do not claim slice contract-readiness in the new compact summaries

Unacceptable outcome:
- routes live in runtime but absent in spec while compact summaries say the slice is contract-ready

### E. Strengthen proof and preflight gate

Upgrade the current smoke / verifier so Prompt 03 preflight is blocked unless all of the following are true:

- compact summary files exist
- canonical files share one run ID
- bridge counts match
- frontend counts match or are explicitly explained
- scope semantics are explicit
- OpenAPI version claim matches the actual file
- if the slice summary says “no blockers”, no canonical artifact may still say review required for that slice
- if platform summary says publishable, `registry-quality-report.json` may not still say `publishability_ready = false`

The verifier must use actual file content, not `str_contains`-only heuristics.

### F. Write one concise execution report

Create:
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-public-repo-truth-convergence-execution-report-2026-04-07.md`

It must say:
- exact files changed
- exact truth model chosen
- exact current platform-global counts
- exact current slice-specific counts
- whether OpenAPI now documents the live routes
- whether Prompt 03 slice re-audit is now truly unblocked
- any remaining blockers if not

No marketing language.

## Required final response format

Return exactly:

1. files changed
2. truth model chosen
3. whether compact platform summary exists
4. whether compact slice summary exists
5. whether OpenAPI is now 3.1.2 or intentionally left at 3.1.1
6. whether Foundation/Governance routes are now publicly documented in `openapi.yaml`
7. reconciled bridge counts
8. reconciled entity / record counts
9. whether `publishability_ready` is now true or still false
10. blunt verdict:
   - `PASS FOR PROMPT 03 SLICE RE-AUDIT`
   - or `HOLD — PUBLIC REPO TRUTH STILL NOT CONVERGED`

## Standards anchors

Use these as applicable and truthfully:
- OpenAPI Specification 3.1.2
- RFC 9457
- JSON Schema 2020-12
- OpenTelemetry semantic conventions
- PostgreSQL transaction isolation semantics
- FDA 21 CFR Part 11
- EU GMP Annex 11

Do not broaden scope.
This prompt is only about making the **public repo** support or reject the Prompt 03 preflight claim truthfully.

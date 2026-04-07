# Platform-Wide Post Single-Schema Merge — Deep Evaluation (2026-04-07, v2)

## Executive judgment

The repository has crossed the threshold from “architecture planning” into a **real platform implementation**.
The single-schema merge is visible in the repo and materially improves the platform backbone.
However, the public repo is **not yet globally self-proving**.

The remaining issues are no longer conceptual architecture gaps. They are now **authority convergence gaps**:

1. **Schema authority** is not yet explicit enough.
2. **OpenAPI authority** still lags the desired release baseline.
3. **Publication authority** is correlated by run ID but still split by metrics.
4. **Slice-vs-platform semantics** are still mixed in the same publication package.
5. **Reviewer proof ergonomics** remain weak because compact summary artifacts are missing.
6. **Prompt authority** is still diffuse because the repo carries a long chain of prompt files without a machine-readable current authority reset after the schema merge.

## What is now materially true in the repo

### 1) The single-schema merge is real
The database directory now contains:
- `schema.sql`
- `migrations/`
- `build_schema_snapshot.php`
- `canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `mes-schema-specification.sql`

This means the schema merge is not just narrative. It is reflected in the repository structure.

### 2) Foundation / Governance is a real runtime slice
The public API surface already contains live Foundation/Governance routes and supporting implementation files:
- `ApprovalGroupService.php`
- `ApprovalWorkflowAdapter.php`
- `FoundationGovernanceService.php`
- `GenericCrudService.php`
- `WorkflowEngine.php`
- `ApprovalGroupController.php`
- `foundation_governance_contract_smoke.php`

This confirms the workstream is no longer planning-only.

### 3) OpenAPI has materially improved
`api/openapi.yaml` now includes:
- `/api/v1/foundation/organizations`
- `/api/v1/foundation/parties`
- `/api/v1/foundation/calendars`
- `/api/v1/governance/approval-groups`
- approval-group detail / decide / timeline / attachments routes
- RFC 9457 style problem responses
- `If-Match` on approval decision
- `ETag` headers on relevant responses
- session cookie + CSRF security semantics on write paths

This is a major improvement versus earlier states.

### 4) Publication correlation improved
`registry-manifest.json` and `registry-quality-report.json` currently share:
- the same `generatedAt`
- the same `publication_run_id`
- the same `slice_publication_pass`

This is better than earlier runs that drifted at the run level.

## What is still wrong

### P1 — Canonical metric truth is still split
The current repo still contains a real canonical mismatch:

#### `registry-manifest.json`
- `workflow_engine_bridge.ready = 103`
- `workflow_engine_bridge.blocked = 12`
- `frontend_foundation.entity_count = 533`
- `frontend_foundation.ready_entities = 425`
- `frontend_foundation.partial_entities = 108`
- asset metadata says `frontend-foundation-catalog.json.records = 528`

#### `registry-quality-report.json`
- `workflow_engine_bridge_ready = 104`
- `workflow_engine_bridge_blocked = 11`
- `frontend_foundation_entities = 533`
- `frontend_ready_entities = 425`
- `frontend_partial_entities = 108`
- `publishability_ready = false`
- failed checks still include:
  - `frontend_entities_publishable` actual `108`
  - `workflow_engine_bridges_ready` actual `12`

This means run correlation exists, but **metric authority does not**.

### P1 — The publication package still mixes slice and platform semantics
The publication label is still:
- `slice_publication_pass = foundation_governance_contract_slice`

But the same package is simultaneously carrying platform-wide totals like:
- `entity_count = 533`
- `ready_entities = 425`
- `partial_entities = 108`

This makes the package semantically ambiguous.
The repo needs a clean truth model such as:
- **global canonical artifacts** for platform totals, plus
- **separate slice summary artifacts** for Foundation Governance.

### P1 — The schema merge still lacks explicit authority semantics
The repo currently exposes multiple schema-shaped artifacts side by side:
- `schema.sql`
- `canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `mes-schema-specification.sql`

The repo does not yet visibly declare, in a compact machine-readable way:
- which file is the **executable schema SSOT**,
- which file is **reference / blueprint**,
- which file is **specification / design aid**,
- and how table-registry / schema-library are validated against the merged schema.

This is now one of the most important remaining gaps after the merge.

### P2 — OpenAPI is strong, but still behind the desired release baseline
The public spec is currently `openapi: "3.1.1"`.
This is not a blocker by itself, but after the schema merge and publication hardening, the repo should either:
- upgrade truthfully to **3.1.2**, or
- explicitly freeze at 3.1.1 and declare why.

At the moment, it is simply behind the desired release baseline.

### P2 — Reviewer proof ergonomics are still weak
The registry tree currently exposes only large canonical artifacts such as:
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`
- `schema-library.json`
- `table-registry.json`
- `workflow-library.json`

But the repo still lacks the compact GitHub-renderable proof files that would allow a reviewer to confirm current state quickly.

Recommended missing artifacts:
- `publication-truth-summary.md`
- `publication-truth-summary.json`
- `foundation-governance-publication-summary.md`
- `foundation-governance-publication-summary.json`
- `schema-authority-summary.md`
- `schema-authority-summary.json`

### P2 — Prompt debt remains high
The repo now includes a very long chain of Prompt 02 files and many Prompt 03 files.
That is useful for traceability, but harmful for authority unless the repo also contains:
- one explicit **CURRENT PLATFORM AUTHORITY** file,
- one compact prompt lineage index,
- and one statement of which prompt family is still active after the schema merge.

## Net assessment by layer

### Architecture layer
Strong.
The repo now clearly has a registry-driven enterprise platform backbone.

### Runtime layer
Good and materially improved.
Foundation/Governance exists as real code and real routes.

### Schema layer
Improved sharply because of the merge.
Still missing explicit schema governance and parity proof.

### Contract layer
Improved.
But OpenAPI versioning and runtime/registry convergence are not yet fully settled.

### Publication layer
Correlated, but still not canonical.
This is the main blocker.

### Reviewer usability layer
Still weak.
Large files dominate; compact proof is still missing.

## What should happen next

Do **not** open another broad architecture prompt.
Do **not** go back to Foundation Governance-only work.
Do **not** create more speculative planning docs.

The correct next step is a **platform-wide post-single-schema-merge convergence prompt** that does exactly these things:

1. make `schema.sql` the explicit executable schema authority,
2. classify the other SQL artifacts as blueprint/spec/reference,
3. add schema-to-registry parity verification,
4. reconcile manifest/quality-report/frontend catalog metrics,
5. separate global canonical publication from slice summaries,
6. add compact proof artifacts,
7. either upgrade OpenAPI to 3.1.2 or explicitly freeze truthfully,
8. reset prompt authority with one current-authority file and one lineage index.

## Blunt verdict

**PASS** — for moving the repo into a platform-wide post-schema-merge convergence phase.

**HOLD** — for any claim that the public repo is already globally self-proving, globally publishable, or finished enough to treat publication truth as closed.

The next prompt should be platform-wide and authority-focused, not architecture-focused.

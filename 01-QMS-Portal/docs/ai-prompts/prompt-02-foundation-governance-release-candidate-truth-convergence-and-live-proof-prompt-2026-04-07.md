# Prompt 02 Foundation Governance Release-Candidate Truth Convergence And Live Proof Prompt (2026-04-07)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This is a **narrow, execution-only, release-candidate truth pass** for the existing **Foundation Governance Contract Slice**.

Do **not** reopen architecture.
Do **not** broaden into Prompt 03 or platform-global redesign.
Do **not** generate another strategy package.
Do **not** claim success from chat history.
Use **repo truth only**.

Your job is to make the Foundation Governance slice **self-proving in the public repo**.

## Primary authority

Use these inputs in this exact order:

1. `prompt-02-foundation-governance-bridge-truthfulness-metadata-closure-and-observability-prompt-2026-04-07.md`
2. `prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-deep-evaluation-2026-04-07.md`
3. `prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
4. current repo code and artifacts

If any prompt output conflicts with current repo code or generated artifacts, **repo truth wins**.

## Mandatory repo inputs

### Runtime / API
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
- `01-QMS-Portal/api/services/GenericCrudService.php`
- `01-QMS-Portal/api/services/WorkflowEngine.php`

### Registry / generation
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
- `01-QMS-Portal/tools/registry/add_slice_field_definitions.py`
- any helper these scripts call

### Tests / proof
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- `01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql`
- `01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql`
- latest related reports already in `_reports/`

## Hard constraints

- Do **not** broaden beyond Foundation Governance slice.
- Do **not** create ghost artifacts.
- Do **not** claim an artifact exists unless it is actually written into the repo.
- Do **not** claim global/platform publishability.
- Do **not** set `ready` or `publishable` flags unless runtime + registry + compact proof agree.
- Do **not** preserve split truth for convenience.
- Do **not** silently flip blockers to green.
- Do **not** introduce fake success paths, placeholder writes, or “report-only completion”.
- Do **not** keep stale generated files with mismatched run IDs.
- Do **not** regress fail-closed behavior unless replaced by a validated path.
- Do **not** weaken auditability, optimistic concurrency, or evidence continuity.
- Do **not** stop at first pass if any finding within this slice still remains and can be fixed in the same run.

## Exact work to perform

### 1) Unify Foundation Governance publication truth into one correlated run

You must make the following artifacts regenerate from **one slice publication run** with the **same**:
- `publication_run_id`
- generated timestamp family
- ready / partial / blocked counts
- workflow bridge counts
- slice publication label

At minimum the following must agree:
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`

If helper scripts currently compute summary metrics differently, fix the generator logic.  
Do not patch JSON outputs by hand.

### 2) Close `governance.approval_group` metadata truth completely or keep it honestly partial

This is the critical entity for this prompt.

You must either:

#### Preferred outcome
Make `governance.approval_group` **fully closure-ready inside the slice** by completing:
- field definitions
- detail sections / layout metadata
- pack-family mapping
- capabilities for list, detail, decide, timeline, attachments, comments/activity if supported
- workflow capability truth
- attachment/timeline relation truth
- nested readiness objects so they agree with the top-level verdict

#### Acceptable fallback
If one or more required parts are still genuinely unavailable, keep the entity `partial` but:
- expose exact blocker IDs
- expose exact missing metadata domains
- remove any contradictory nested `ready` states
- ensure endpoint catalog, frontend catalog, manifest summary, and quality report all agree

Unacceptable outcome:
- top-level `partial` but nested readiness still says `ready`
- top-level `ready` while detail sections or pack families are still missing
- hidden blocker text only in one artifact

### 3) Add compact public proof artifacts in `qms-data/registry/`

Create both:

- `01-QMS-Portal/qms-data/registry/publication-truth-summary.md`
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.json`

These must be small, GitHub-renderable, and derived from the same publication authority as the larger artifacts.

Required content:
- slice name
- publication scope
- `publication_run_id`
- generated timestamp
- ready / partial / blocked counts
- workflow bridge ready / blocked counts
- explicit status for `governance.approval_group`
- benchmark mode honesty (`stability_probe` if that is the truth)
- observability mode honesty (`file_export_only` if that is the truth)
- verification commands
- anti-false-green statement

If current truth is still not publish-ready, the summary must say so explicitly.

### 4) Bring `openapi.yaml` into contract truth

Current repo public spec is `openapi: "3.1.1"`.

You must choose one of only two acceptable outcomes:

#### Option A — implement-and-document
If runtime truly supports them for the Foundation Governance slice, then:
- upgrade spec to `3.1.2`
- model conditional write behavior truthfully
- add `ETag` response header where actually emitted
- add `If-Match` request header where actually required
- model `409`, `412`, and `428` only where runtime truly uses them
- model RFC 9457 problem responses with `application/problem+json` only where runtime truly emits them
- ensure write-route security semantics represent session + CSRF as **AND**, not accidental OR

#### Option B — spec honesty
If runtime does not yet support one or more of the above, then:
- keep the spec truthful
- do not claim those headers / media types / statuses
- make the compact summary and quality report state that this slice is still limited accordingly

Unacceptable outcome:
- spec claims `application/problem+json` / `If-Match` / `ETag` without runtime proof
- runtime has them but spec omits them
- security objects model cookie and CSRF as alternatives if both are required

### 5) Make observability proof repo-visible and slice-specific

Use existing observability scaffolding and add the minimum real proof needed for this slice.

Create a compact artifact under `_reports/observability/` and reference it from `publication-truth-summary.md`.

Required proof scope:
- approval-group decide flow
- at least these canonical writes if implemented:
  - `registerOrganizationNode`
  - `registerParty`
  - `registerCalendar`

Required proof fields:
- operation / route identity
- request or correlation id
- trace id
- span id or equivalent
- outcome status
- duration / latency field
- actor identity enrichment when available
- honest mode declaration (`file_export_only` is acceptable if true)

Do not fake live collector proof.  
If collector is absent, say so explicitly.

### 6) Turn the smoke into a release-candidate verifier for the slice

Upgrade `foundation_governance_contract_smoke.php` so that it fails on:
- mismatched `publication_run_id` across canonical artifacts
- mismatched ready / partial / bridge counts across canonical artifacts
- missing compact summary files
- stale summary files not correlated to the latest publication run
- `governance.approval_group` top-level and nested readiness contradictions
- route/catalog drift for the public Foundation Governance routes
- spec version mismatch if summary claims a different OpenAPI version
- registry truth saying publishable while quality report says review required, or vice versa

This verifier must be deterministic and source actual artifact content, not just static `str_contains` presence checks.

### 7) Keep benchmark proof honest and correlated

Do not turn the existing FG benchmark into marketing.

You must:
- keep or improve the current stability probe path
- ensure the newest benchmark artifact is actually refreshed if the benchmark is rerun
- expose benchmark mode honestly in the compact truth summary
- correlate the benchmark artifact to the same release-candidate proof package where feasible

Do not claim production-load proof.  
Do not silently keep stale benchmark files with misleading names or dates.

### 8) Self-review loop before you stop

Before returning final output, you must perform one more cycle:

1. re-open the generated canonical artifacts,
2. compare metrics / run IDs / verdicts again,
3. re-open compact summary artifacts,
4. re-open `governance.approval_group` metadata shape,
5. re-open the verifier code,
6. if any within-scope finding remains and can still be fixed in the same run, fix it and regenerate again.

You may stop only when:
- no within-scope finding remains, or
- there is a clearly irreducible blocker that is named precisely and supported by repo truth.

## Deliverables

Make only the smallest set of code / artifact / test changes necessary to achieve the above.

Required new or updated outputs:
- updated runtime code where needed
- regenerated canonical slice artifacts
- `publication-truth-summary.md`
- `publication-truth-summary.json`
- strengthened `foundation_governance_contract_smoke.php`
- compact observability proof artifact
- concise execution report:
  - `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-release-candidate-truth-convergence-execution-report-2026-04-07.md`

## Required final report format

Return:
1. exact files changed
2. whether `governance.approval_group` is now `ready` or still `partial`
3. whether the four canonical artifacts share one run ID
4. whether compact summary artifacts now exist in the repo
5. whether OpenAPI is now 3.1.2 or intentionally left at 3.1.1
6. whether RFC 9457 / ETag / If-Match are now real runtime-supported slice contracts or still absent
7. exact remaining blockers, if any
8. whether a second self-review cycle found additional issues and whether they were closed in the same run
9. blunt verdict:
   - `PASS FOR PROMPT 03 RE-AUDIT`
   - or `HOLD — FOUNDATION GOVERNANCE STILL NOT RELEASE-CANDIDATE TRUE`

## Standards anchors

Anchor implementation and truthfulness to these only as they actually apply:
- OpenAPI Specification 3.1.2
- RFC 9457
- JSON Schema 2020-12
- OpenTelemetry HTTP semantic conventions
- PostgreSQL transaction isolation / serialization-failure retry reality
- FDA 21 CFR Part 11
- EU GMP Annex 11

Again: do not broaden scope.  
This prompt is only about making the Foundation Governance slice **publicly self-proving and release-candidate truthful**.

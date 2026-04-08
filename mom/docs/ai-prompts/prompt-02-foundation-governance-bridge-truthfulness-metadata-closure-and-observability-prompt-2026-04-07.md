# Prompt 02 Bridge-Truthfulness, Metadata-Closure, And Observability Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs one narrow hardening pass on the existing `Foundation Governance Contract Slice`.

It must not reopen architecture.
It must not broaden the slice.
It must not turn into another planning package.

Its job is to fix what is still misleading or incomplete after the last implementation pass:

- the approval-group workflow bridge is exposed as active, but the WorkflowEngine path is not yet authoritative enough
- global registry truth and slice-local registry truth disagree on bridge readiness
- `governance.approval_group` frontend metadata is still only partially closed
- observability publish gates are still too weak

## Primary authority

Use these inputs in this exact order:

1. [prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-deep-evaluation-2026-04-07.md)
2. [prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-prompt-2026-04-07.md)
3. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)

## Mandatory repo inputs

- [ApprovalWorkflowAdapter.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php)
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php)
- [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php)
- [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php)
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)
- [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [registry-manifest.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-manifest.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [generate-module-builder-registry.mjs](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs)
- [regenerate_slice_publication.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/regenerate_slice_publication.py)
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)
- [backend-runtime-benchmark-latest.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-latest.json)

## Hard constraints

- do not reopen Prompt 01, Prompt 03, or Prompt 04
- do not broaden the slice beyond foundation governance
- do not replace implementation work with another strategy report
- do not claim `PUBLISH READY`
- do not claim the workflow bridge is complete unless WorkflowEngine is actually authoritative for the decision path
- do not keep `endpoint-catalog.json` green if `registry-quality-report.json` still truthfully says the bridge is blocked
- do not leave nested frontend readiness saying `workflow_bridge_not_ready` while top-level state says `bridged`
- do not degrade the existing canonical write implementations
- do not regress the benchmark proof

## Exact targets

### 1. Make the approval-group bridge truthful

Current problem:

- [ApprovalWorkflowAdapter.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php#L175) explicitly accepts WorkflowEngine rejection as non-fatal
- the adapter's own validation is currently the real authority
- publication artifacts expose the route as `active/bridged`

You must resolve this in one of two acceptable ways:

#### Preferred outcome

Implement a genuinely authoritative WorkflowEngine path for approval decisions.

That means:

- WorkflowEngine has a real config or supported execution path for the approval-step record type
- adapter success depends on true engine acceptance
- engine rejection is no longer silently tolerated

#### Acceptable fallback

If a truly authoritative engine path is not safely achievable in this pass:

- keep the local adapter validation improvements
- but revert runtime publication truth back to blocked/fail-closed
- set metadata and quality-report state to match that truth

Unacceptable outcome:

- leaving the route `active/bridged` while WorkflowEngine rejection is still explicitly non-fatal

### 2. Align registry truth across all artifacts

Current problem:

- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json) says `active/bridged`
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json) still says `workflow_engine_bridge_ready = 0`

You must make these artifacts tell the same truth.

Required outcomes:

- if the bridge is truly ready, global quality-report counts must reflect that
- if the bridge is not truly ready, endpoint/frontend artifacts must not advertise readiness
- shared `publication_run_id` and generation timestamps must remain coherent

### 3. Fully close `governance.approval_group` frontend metadata for this slice

Current problem:

- top-level entity says `workflow_ready = true` and `decide_execution_mode = bridged`
- nested readiness still carries `workflow_bridge_not_ready`
- `detail_layout.sections` is empty
- richer capability closure is missing

You must fully close this entity contract.

At minimum:

- no top-level/nested contradiction
- non-empty detail layout sections where the entity is supposed to support detail views
- populated capability contract for the entity in the same structural shape used by canonical generator output
- honest readiness score / blockers / warnings
- field/pack-family closure required to support the claimed frontend state

Do not patch only the top-level booleans.

### 4. Add minimum observability scaffolding and proof for the slice

Current problem:

- the slice still lacks meaningful observability evidence
- publish-gate language still mentions observability as unfinished

You must add the smallest safe observability layer that makes the slice more publication-credible.

Acceptable examples:

- operation names and structured logs around approval decisions and canonical write commands
- trace or correlation identifiers propagated into problem responses or logs
- explicit benchmark/report linkage for the slice operations
- OTel-compatible naming and metadata even if a full collector/export path is not yet present

Unacceptable outcome:

- writing another observability report without changing runtime or proof artifacts

### 5. Upgrade smoke so it catches the current false-green pattern

You must extend [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php) so it fails if:

- endpoint catalog says `bridged` but quality report still says no bridge is ready
- `governance.approval_group` has top-level state different from nested readiness state
- the entity still lacks the metadata structure required by the claimed readiness

Do not keep a smoke suite that can pass while these contradictions still exist.

## Mandatory standards to obey

- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [PostgreSQL pgbench documentation](https://www.postgresql.org/docs/current/pgbench.html)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Working mode

Work directly in the repository.

Patch runtime code and registry generation logic as needed.
Regenerate affected artifacts.
Strengthen smoke.
Keep benchmark proof intact.
Then summarize.

## Required implementation outputs

At the end of the run, produce all of the following:

1. actual repo changes
2. a short list of modified files
3. a `bridge truth outcome` section containing:
   - truly engine-backed now or not
   - if not, whether runtime was reverted to blocked truthfully
4. a `frontend metadata closure outcome` section containing:
   - what was added for `governance.approval_group`
   - whether top-level and nested readiness are fully aligned
5. an `observability outcome` section containing:
   - exact runtime/proof changes added
6. exact validation commands executed and their outcomes
7. remaining blockers, if any

## Success criteria

This prompt is successful only if all of the following are true:

- the approval-group bridge is truthful, not merely optimistic
- registry-quality-report agrees with endpoint/frontend truth
- `governance.approval_group` no longer has hollow or contradictory frontend readiness
- smoke would now fail on the false-green pattern that exists today
- observability publish-gate evidence is stronger than before

If full success is not safely reachable, do not fake completion.
Fix the highest-impact subset, clearly record the exact remaining blocker, and stop there.

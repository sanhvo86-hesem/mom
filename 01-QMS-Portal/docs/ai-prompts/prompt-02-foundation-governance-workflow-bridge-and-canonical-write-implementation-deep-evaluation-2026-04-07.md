# Prompt 02 Workflow-Bridge And Canonical-Write Implementation Deep Evaluation: Foundation Governance Contract Slice

Date: 2026-04-07
Status: REVIEW REQUIRED BEFORE PROMPT 03
Primary reviewed implementation input: [prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-prompt-2026-04-07.md)

## 1. Executive verdict

This pass made real runtime progress.

It moved the slice from:

- `501` write commands
- fail-closed approval-group decision route

to:

- implemented canonical write methods in [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- controller routes in [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php) now calling those write methods instead of `commandNotImplemented()`
- a new [ApprovalWorkflowAdapter.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php)
- `governance.approval_group.decide` now exposed as `active/bridged` in [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)

That is a meaningful upgrade.

However, this pass is still not ready for Prompt 03.

The most important reason is that the workflow bridge is not yet trustworthy enough to justify the new green state.

It is no longer correct to say "nothing was implemented".
But it is also not correct to say "the bridge is done and only field definitions remain".

## 2. What is genuinely better and should be kept

The following improvements are real and should remain:

- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php#L711) now routes foundation-governance internal commands to service methods instead of returning `501`
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L467) now has real canonical write methods including:
  - `registerOrganizationNode`
  - `registerParty`
  - `registerCalendar`
  - `assignPartyRole`
  - `registerShift`
  - `registerPartySite`
  - `registerPartyContact`
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L22) now sets `WORKFLOW_BRIDGE_READY = true`
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L308) now delegates decision validation through [ApprovalWorkflowAdapter.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php)
- [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2528) now documents the decision route in terms of the adapter instead of a blocked bridge
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json) now marks `governance.approval_group.decide` as `active` with `execution_mode = bridged`

These changes are important.
They should not be rolled back casually.

## 3. Deep findings

### [P1] The new workflow bridge is not yet a true WorkflowEngine authority

[ApprovalWorkflowAdapter.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php#L175) explicitly treats WorkflowEngine rejection as acceptable:

- "If the engine rejects ... that's acceptable"
- "Engine errors are non-fatal"

The adapter validates the transition itself, then tries to call WorkflowEngine, but still returns success even if WorkflowEngine has no matching config or the transition fails.

That is not a true engine-backed bridge.
It is a local validator plus best-effort engine side effect.

This matters because [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L22) now advertises `WORKFLOW_BRIDGE_READY = true`, and publication artifacts expose the route as active.

The bridge is therefore greener than the code really proves.

Relevant references:

- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

Inference:
- The mismatch between advertised bridge state and actual engine authority is inferred from the local adapter code.

### [P1] Registry truth is split again between endpoint/frontend artifacts and the quality report

[endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json) now says:

- `governance.approval_group.decide` is `active`
- `execution_mode = bridged`

But [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json#L31) still says:

- `workflow_engine_bridge_ready = 0`
- `workflow_engine_bridge_blocked = 115`

So the package currently tells two different stories:

- slice-local endpoint/frontend metadata says the bridge is active
- the global quality report still says no workflow-engine bridges are ready

That is a real publication-integrity regression.

### [P2] `governance.approval_group` frontend metadata is still structurally incomplete

[frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json) currently gives `governance.approval_group`:

- `overall = partial`
- `workflow_ready = true`
- `decide_execution_mode = bridged`

But the same entity still has:

- `detail_layout.sections = []`
- no populated `capabilities` subtree
- nested `readiness.blockers = ["workflow_bridge_not_ready"]`
- nested `readiness.decide_execution_mode = fail_closed`

So the entity is still internally inconsistent.

This is not just "field definitions missing" in the abstract.
It is a concrete contract-closure problem:

- the top-level state says bridged
- nested readiness still says blocked
- richer frontend contract sections are not closed

### [P2] Observability publish gates are still effectively open

I found no meaningful OpenTelemetry-style hooks in the slice runtime files:

- [ApprovalWorkflowAdapter.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php)
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php)
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)

That matches the publish-gate narrative:

- slice runtime has improved
- but observability proof is still weak

Relevant references:

- [OpenTelemetry documentation](https://opentelemetry.io/docs/)

Inference:
- The observability gap is inferred from local code search in the slice files above.

### [P2] Smoke still allows a false-green path for the bridge

[foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L607) now asserts:

- approval-group `workflow_ready = true`
- approval-group `overall = partial`

But it does not require all of the following at once:

- that the entity has a populated `capabilities.workflow` contract
- that nested readiness no longer says `workflow_bridge_not_ready`
- that [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json) agrees with the new bridge state

So the smoke suite is better than before, but it still permits the current split-truth condition.

### [P3] The benchmark remains useful but unchanged in intent

[backend-runtime-benchmark-latest.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-latest.json) still provides a good `stability_probe`:

- `clients = 2`
- `jobs = 1`
- `duration_seconds = 15`
- `average_latency_ms = 2.864`
- `tps_excluding_connect = 702.256739`

That remains a valid no-crash proof.
But it does not help decide whether the workflow bridge is truly engine-backed or whether frontend metadata is publication-complete.

## 4. Verification note

This review is based on direct local evidence:

- code inspection of the new adapter, service, controller, and registry files
- current endpoint/frontend/quality-report artifacts
- current benchmark artifact

I could not rerun PHP smoke from this shell because `php` is not available in `PATH`.
So the proof here is source-and-artifact based, not a fresh local PHP execution.

## 5. Improvement directives for the next pass

The next pass should remain inside Prompt 02 and do only these things:

1. make the approval-group bridge truthful:
   - either implement a real WorkflowEngine-backed path
   - or revert runtime metadata back to blocked/fail-closed until that is true
2. align the quality report with the actual bridge state
3. fully close the `governance.approval_group` frontend metadata contract:
   - populated capabilities
   - populated detail layout / hero / pack-family style closure
   - no stale nested blocker if the route is active
4. add minimal observability scaffolding and proof for the slice runtime

Do not move to Prompt 03 yet.
Do not reopen architecture.
Do not turn this into another broad planning pass.

## 6. Recommended next prompt

The next prompt should be a narrow `bridge truthfulness, frontend metadata closure, and observability hardening` pass.

It should focus on:

- making the workflow bridge honest
- aligning global and slice-local registry truth
- finishing the `approval_group` frontend contract
- adding only the minimum observability needed for publish-gate credibility


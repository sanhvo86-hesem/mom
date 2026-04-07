# Prompt 02 Workflow Bridge And Canonical Write Implementation Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs one narrow implementation pass on the existing `Foundation Governance Contract Slice`.

It must not reopen architecture.
It must not broaden the slice.
It must not become another planning or publication-only package.

Its job is to close the two remaining execution blockers:

- `approval_group` workflow execution is still fail-closed because the WorkflowEngine bridge is not implemented
- canonical foundation-governance internal commands still return `501`

## Primary authority

Use these inputs in this exact order:

1. [prompt-02-foundation-governance-publication-authority-and-benchmark-charter-hardening-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-publication-authority-and-benchmark-charter-hardening-deep-evaluation-2026-04-07.md)
2. [prompt-02-foundation-governance-publication-authority-and-benchmark-charter-hardening-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-publication-authority-and-benchmark-charter-hardening-prompt-2026-04-07.md)
3. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)

## Mandatory repo inputs

- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php)
- [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php)
- [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php)
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)
- [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php)
- [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
- [079_foundation_governance_contract_hardening.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/079_foundation_governance_contract_hardening.sql)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [registry-manifest.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-manifest.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)
- [backend-runtime-benchmark-latest.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-latest.json)

## Hard constraints

- do not reopen Prompt 01 or Prompt 04
- do not broaden the slice beyond foundation governance
- do not replace implementation work with another strategy report
- do not claim `PUBLISH READY`
- do not fake `WORKFLOW_BRIDGE_READY = true` if the decision path still bypasses WorkflowEngine semantics
- do not return `200`, `201`, or `204` for canonical write commands unless they actually persist canonical DB rows
- do not regress the current benchmark proof or publication integrity state
- do not remove fail-closed protection unless the replacement path is real and validated
- do not silently downgrade auditability, concurrency, or e-signature behavior

## Exact targets

### 1. Implement the real WorkflowEngine bridge for `approval_group`

Current state:

- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L28) still sets `WORKFLOW_BRIDGE_READY = false`
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L308) still fails closed in `decide()`
- metadata correctly marks the public decide route as blocked

Preferred outcome:

- implement a real adapter so approval-group decisions can execute through validated WorkflowEngine semantics
- the adapter must enforce:
  - state validation
  - actor authorization
  - self-approval prohibition
  - ETag / row-version concurrency protection
  - audit trail continuity
  - canonical persistence after transition validation

Acceptable design patterns:

- initialize a WorkflowEngine record for each approval group and transition that record directly
- or add a dedicated adapter that maps approval-group decisions into WorkflowEngine transition checks before canonical persistence

Unacceptable outcome:

- changing `WORKFLOW_BRIDGE_READY` to `true` while still updating the approval table directly without real WorkflowEngine validation

If full live execution is safely achievable in this pass:

- unblock the decide path
- update OpenAPI and registry artifacts to reflect the new runtime truth

If full live execution is still not safe after code-level proof:

- keep the route fail-closed
- implement as much of the adapter as is safe
- narrow the blocker to an exact technical prerequisite instead of the current broad blocker text

### 2. Replace selected `501` internal commands with real canonical DB writes

Current state:

- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php#L712) still routes all internal foundation-governance commands through `commandNotImplemented()`
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php) is still read-only

You must implement the smallest safe but real canonical write subset.

Required minimum subset:

- `registerOrganizationNode`
- `registerParty`
- `registerCalendar`

Strongly preferred additional subset if safe:

- `assignPartyRole`
- `registerShiftEntry`

Required outcomes:

- add real write methods to `FoundationGovernanceService`
- persist to the canonical tables introduced by [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
- use transactions where appropriate
- return proper RFC 9457 problem details on validation or state failures
- keep commands that are still not implemented explicitly fail-closed with exact reasons

Do not implement fake writes against JSON files or placeholder in-memory success paths.

### 3. Keep contracts truthful after runtime changes

If you unblock any runtime capability:

- update [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- update [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- update [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- update [registry-manifest.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-manifest.json)
- update [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)

If a capability remains blocked:

- keep the catalogs honest
- do not let frontend metadata drift into `ready` status

### 4. Strengthen proof only where the new runtime work demands it

Do not create a new reporting tranche.
Only extend proof where needed to validate the implementation above.

At minimum:

- update [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php) so it can prove:
  - the implemented internal commands no longer route to `501`
  - the still-blocked commands remain explicitly blocked
  - the workflow-bridge state exposed in metadata matches runtime truth
- preserve the existing benchmark stability proof
- only touch [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py) if the runtime changes actually require benchmark updates

## Mandatory standards to obey

- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Microsoft Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Working mode

Work directly in the repository.

Patch code.
Add migrations only if truly required.
Regenerate artifacts only where runtime truth changed.
Run the relevant validations.
Then summarize.

## Required implementation outputs

At the end of the run, produce all of the following:

1. actual repo changes
2. a short list of modified files
3. a `workflow bridge outcome` section containing:
   - bridge implemented or still blocked
   - exact technical reason if still blocked
   - runtime and metadata alignment outcome
4. a `canonical write outcome` section containing:
   - which commands no longer return `501`
   - which canonical tables they write to
   - which commands remain blocked
5. exact validation commands executed and their outcomes
6. remaining blockers, if any

## Success criteria

This prompt is successful only if all of the following are true:

- the repository is improved by real runtime code, not only by documentation
- at least the required minimum canonical write subset stops returning `501` and persists canonical data
- the approval-group decision path either:
  - runs through a real WorkflowEngine-backed path
  - or remains fail-closed with a much narrower and code-proven blocker
- OpenAPI and registry artifacts remain truthful after the runtime changes

If full success is not safely reachable, do not fake completion.
Implement the highest-impact subset that is actually safe, record the exact remaining blocker, and stop there.

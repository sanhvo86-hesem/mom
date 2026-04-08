# Prompt 02 Tranche-1 Hardening And Proof Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs one narrow hardening pass on the existing implementation of the `Foundation Governance Contract Slice`.

It must not reopen architecture or broaden the slice.

It must repair the exact implementation weaknesses identified after the first tranche-1 coding pass, then run repo-local verification that proves the slice is closer to audit-grade quality.

## Primary authority

Use these inputs in this exact order:

1. [prompt-02-foundation-governance-tranche1-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-deep-evaluation-2026-04-07.md)
2. [prompt-02-foundation-governance-closure-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-closure-package-2026-04-06.md)
3. [prompt-02-foundation-governance-closure-deep-evaluation-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-closure-deep-evaluation-2026-04-06.md)
4. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)
5. [prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md)

## Mandatory repo inputs

- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php)
- [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)
- [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php)
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php)
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php)
- [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php)
- [AuditTrail.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/AuditTrail.php)
- [079_foundation_governance_contract_hardening.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/079_foundation_governance_contract_hardening.sql)
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
- [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)

## Hard constraints

- do not broaden the slice
- do not reopen Prompt 01 or Prompt 04
- do not write another wide report instead of editing code
- do not keep false-success write commands
- do not keep write-route security semantics as `sessionCookie OR csrfHeader`
- do not bypass the requester/self-approval invariant
- do not claim benchmark support if the benchmark artifacts cannot run against real relations
- do not mark `PUBLISH READY`

## Exact hardening targets

### 1. Fix OpenAPI write security semantics

For state-changing slice routes, represent the security requirement as one object containing both schemes, not two alternative objects.

Example target shape:

```yaml
security:
  - sessionCookie: []
    csrfHeader: []
```

This must apply at least to:

- `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
- `POST /api/v1/governance/attachments`

### 2. Make requester identity real and enforce self-approval correctly

You must make `requestedByPartyId` authoritative in the approval-group detail and decision path.

Acceptable implementations:

- persist requester identity in canonical approval-group data and return it in detail/list payloads
- then enforce the self-approval prohibition in the service layer, not only in the controller

Unacceptable implementation:

- leaving `requestedByPartyId` as `null`
- or relying on a controller-only guard without authoritative persisted requester identity

### 3. Resolve workflow-bridge integrity

You must not leave approval decisions as plain table updates with no workflow authority story.

Choose one of these two outcomes and implement it completely:

1. preferred:
   - introduce a narrow adapter that uses [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php) as the transition authority for the slice
   - keep `ApprovalGroupService` as the orchestration layer above that adapter
2. fail-closed alternative if the current repo cannot safely support option 1:
   - make public approval decision execution return an explicit blocked workflow-engine-required problem
   - reflect that blocked capability in OpenAPI and registry metadata
   - do not pretend the decision route is fully supported

Do not keep the current halfway state.

### 4. Remove false-success internal commands

For internal master-data commands in [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php):

- either implement real canonical writes
- or fail closed with an explicit not-implemented or blocked-capability response

Do not return `registered`, `amended`, or `assigned` when nothing was persisted.

### 5. Close wire-contract drift

At minimum, fix:

- `parentOrganizationId` filtering for foundation organizations
- `roleCode` filtering for parties
- timeline cursor advancement for approval-group timeline

If any parameter remains intentionally unsupported, remove it from the published slice contract or mark it explicitly unsupported.

### 6. Replace placeholder smoke with executable contract smoke

Strengthen [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php) so it verifies behavior, not just symbol presence.

At minimum, cover:

- route registration parity
- OpenAPI write-route security object shape
- `428` vs `412` semantics
- strong ETag format on approval-group detail and attachment detail
- requester/self-approval invariant
- timeline cursor advancement

### 7. Make the benchmark artifact real

You must remove the fake-benchmark condition.

Choose one of these two outcomes and implement it fully:

1. preferred:
   - rewrite [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql) to benchmark the actual canonical tables and read paths that exist in this slice
2. acceptable:
   - add the missing benchmark relations or fixtures required by the current SQL script and wire them into the existing benchmark schema and seed path

Do not leave `run_runtime_benchmark.py` invoking a scenario that references relations absent from the repo schema artifacts.

## Required verification

After editing, run the strongest local verification that is feasible in this environment.

At minimum:

- syntax-check touched PHP files if a local PHP binary is available
- run [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php) if feasible
- verify the exact OpenAPI security structure for both write routes
- verify the canonical registry keys still exist
- verify the benchmark harness no longer points at undefined relations

If any validation cannot run, say exactly why.

## Output rules

Return only:

1. concise hardening summary
2. exact files changed
3. verification results
4. remaining blockers
5. final status among `BUILD READY`, `BUILD COMPLETE / PUBLISH BLOCKED`, or `REVIEW REQUIRED`

## Official references to prioritize

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457](https://www.rfc-editor.org/info/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Fail-closed rule

If a target cannot be completed safely, fail closed on that exact target and say so explicitly.

Do not hide unsupported behavior behind green wording.

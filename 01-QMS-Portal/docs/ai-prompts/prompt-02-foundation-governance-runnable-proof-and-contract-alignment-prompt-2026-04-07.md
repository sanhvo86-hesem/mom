# Prompt 02 Runnable Proof And Contract Alignment Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs one narrow follow-up pass on the existing implementation of the `Foundation Governance Contract Slice`.

It must not reopen architecture.
It must not broaden the slice.
It must not generate another wide planning package.

Its job is to turn the current hardening result into a more credible proof-grade slice by fixing:

- benchmark harness executability
- runtime-contract alignment for blocked approval workflow execution
- smoke verification quality

## Primary authority

Use these inputs in this exact order:

1. [prompt-02-foundation-governance-hardening-proof-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-hardening-proof-deep-evaluation-2026-04-07.md)
2. [prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md)
3. [prompt-02-foundation-governance-tranche1-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-deep-evaluation-2026-04-07.md)
4. [prompt-02-foundation-governance-closure-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-closure-package-2026-04-06.md)
5. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)

## Mandatory repo inputs

- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)
- [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php)
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php)
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php)
- [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php)
- [079_foundation_governance_contract_hardening.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/079_foundation_governance_contract_hardening.sql)
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
- [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql)
- [benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/benchmark_schema.sql)
- [seed_runtime_benchmark.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/seed_runtime_benchmark.sql)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)

## Hard constraints

- do not broaden the slice beyond foundation governance
- do not reopen Prompt 01 or Prompt 04
- do not replace code work with another strategy report
- do not flip the slice to `PUBLISH READY`
- do not pretend the workflow bridge is ready if it is still blocked
- do not keep false-green registry or frontend readiness for blocked workflow execution
- do not claim the benchmark is valid unless the harness can actually load the tables queried by the benchmark script
- do not rely only on `file_get_contents`, `str_contains`, and `preg_match` if more direct behavioral proof is feasible

## Exact targets

### 1. Make the benchmark harness runnable for the slice

The current problem:

- [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql) now queries canonical governance tables
- but [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py) still builds `BENCH_DB` from the APS-only [benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/benchmark_schema.sql)

You must make this proof runnable by choosing one of these acceptable implementations:

1. preferred:
   - add a dedicated canonical foundation-governance benchmark schema and seed
   - teach the harness to load them before running `foundation_governance_contract_read_mix.sql`
2. acceptable:
   - extend [benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/benchmark_schema.sql) and [seed_runtime_benchmark.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/seed_runtime_benchmark.sql) so the canonical governance benchmark script can execute successfully

Unacceptable outcome:

- leaving the read-mix SQL and the benchmark DB schema incompatible

The resulting benchmark report must include a concrete `foundation_governance_read_mix` section only if it truly ran.

### 2. Align contract truth with the blocked workflow bridge state

Current runtime truth:

- approval decisions are intentionally blocked until the workflow bridge is ready

This truth must become consistent across every public contract surface:

- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)

Required outcomes:

- the decide route must explicitly document the blocked workflow-bridge runtime condition
- the endpoint catalog must stop presenting `governance.approval_group.decide` as fully active if runtime blocks execution
- the frontend foundation catalog must not claim `workflow_ready: true` or overall `ready` for approval-group workflow while execution is blocked

You may represent this with:

- blocked capability metadata
- execution mode metadata
- explicit blockers
- slice-specific problem documentation

But all surfaces must agree.

### 3. Upgrade smoke from source inspection toward executable contract proof

You must strengthen [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php).

Required direction:

- keep useful static checks where necessary
- add more direct behavioral proof wherever repo-local execution is feasible

Good targets include:

- verifying controller mapping for `bridge_not_ready`
- verifying timeline cursor behavior with concrete event arrays or deterministic service-level exercises
- verifying OpenAPI and registry alignment for the blocked approval decision capability
- verifying benchmark harness/schema compatibility before declaring the foundation-governance benchmark runnable

If a full HTTP or DB integration test is not feasible in the repo-local environment, fail closed:

- say so in the result
- but still strengthen verification beyond pure string existence checks

### 4. Preserve all good hardening already landed

Do not regress these behaviors:

- `AND` security semantics for write routes
- persisted requester identity
- service-layer self-approval prohibition
- fail-closed decision execution while the workflow bridge is not ready
- `501` blocked capability for unimplemented internal master-data writes
- applied `parentOrganizationId`, `roleCode`, and timeline cursor logic

## Mandatory standards to obey

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Working mode

Work directly in the repository.

Do not spend the run writing a long report first.
Read only what is necessary.
Patch the code and artifacts.
Then verify.

## Required implementation outputs

At the end of the run, produce all of the following:

1. actual repo changes
2. a short list of modified files
3. a concise `proof status` section with:
   - benchmark runnable or not runnable
   - approval decision capability state
   - contract alignment status
   - smoke quality status
4. exact validation commands executed and their outcomes
5. any remaining blockers, if any

## Success criteria

This prompt is successful only if all of the following are true:

- the benchmark harness and the foundation-governance read-mix script are compatible
- approval-group blocked workflow execution is represented consistently across runtime, OpenAPI, endpoint catalog, and frontend foundation catalog
- smoke verification is stronger than simple source scanning
- the slice remains fail-closed where real workflow execution is still unavailable

If any success criterion cannot be met safely, do not fake completion.
Implement the safest partial improvement, clearly state the remaining blocker, and stop there.


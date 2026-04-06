# Prompt 02 Tranche-1 Implementation Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs direct tranche-1 implementation for the already-frozen `Foundation Governance Contract Slice`.

It must edit the repository directly.

It must not produce another broad planning report unless a hard blocker is discovered from local evidence.

## Primary authority

Use these inputs in this exact precedence order:

1. [prompt-02-foundation-governance-closure-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-closure-package-2026-04-06.md)
2. [prompt-02-foundation-governance-closure-deep-evaluation-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-closure-deep-evaluation-2026-04-06.md)
3. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)
4. [execution-package-build-publish-gates-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-build-publish-gates-2026-04-06.md)
5. [execution-package-implementation-backlog-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-implementation-backlog-2026-04-06.md)

## Mandatory repo inputs

- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php)
- [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [BaseController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/BaseController.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)
- [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php)
- [GenericCrudController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/GenericCrudController.php)
- [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php)
- [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php)
- [AuditTrail.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/AuditTrail.php)
- [RegistryService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/RegistryService.php)
- [GenericCrudService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/GenericCrudService.php)
- [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [backend_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/backend_smoke.php)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)

## Approved data policy

The historical `approval_group_id` ambiguity is resolved for this implementation run as follows:

- before first publication of the canonical slice, each existing legacy `approval` row receives one new `approval_group_id`
- do not infer historical multi-row grouping unless the current local dataset proves an authoritative grouping key
- once the slice is published, `approval_group_id` becomes permanent and must never be remapped

This policy is approved for this run and is not a blocker.

## Hard constraints

- do not broaden the slice
- do not reopen Prompt 01 architecture
- do not switch to Prompt 03 or Prompt 04
- do not write another wide strategy report
- do not publish canonical public routes through `GenericCrudController` or `GenericCrudService`
- do not keep weak ETag behavior for the published slice
- do not invent bearer or OIDC runtime behavior that the current repo does not implement
- do not leave attachment controller-service signature mismatch unfixed if you expose attachment routes
- do not mark `PUBLISH READY` unless code, smoke checks, and benchmark artifacts are present

## Required implementation targets

Implement the tranche-1 patch plan directly in the repository.

At minimum, complete these targets:

1. Add [079_foundation_governance_contract_hardening.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/079_foundation_governance_contract_hardening.sql)
2. Add `api/services/FoundationGovernanceService.php`
3. Add `api/services/ApprovalGroupService.php`
4. Add `api/controllers/ApprovalGroupController.php`
5. Extend [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php) for canonical list surfaces and frozen internal commands
6. Repair and extend [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php)
7. Repair and extend [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php)
8. Register the ten frozen public routes in [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php) and [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
9. Upgrade [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml) to `3.1.1` and add the exact slice contract
10. Onboard the five canonical entity keys and ten public endpoint keys in the registry JSON assets
11. Add [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
12. Add [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql)
13. Extend [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py) so the new slice benchmark can be invoked by the existing harness

## Required contract rules

Implement the exact closure-package choices, including:

- OpenAPI `3.1.1`
- JSON Schema 2020-12 compatible request and response shapes
- RFC 9457 `application/problem+json` for published slice errors
- success envelopes with `data` and `pageInfo`
- strong ETags for approval-group detail, approval timeline when derived from the same snapshot, and attachment detail
- `If-Match` required for `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
- `428` for missing precondition
- `412` for ETag mismatch
- `409` for invalid state transition or blocked capability
- session-cookie plus CSRF-header security for state-changing slice operations

## Required implementation behavior

The run must prefer the existing repo shape where it fits:

- reuse `api/index.php` and `api/Router.php` for routing
- reuse `MasterDataController.php` for the public foundation list routes and internal master-data commands
- create `ApprovalGroupController.php` only for approval-group-specific public behavior
- reuse `WorkflowEngine.php` only behind `ApprovalGroupService`
- reuse `AuditTrail.php` for immutable governance and attachment audit events
- keep `GenericCrudController.php` and `GenericCrudService.php` as donors only

## Required verification

After editing, run repo-local verification that is feasible in this environment.

At minimum:

- syntax-check every touched PHP file with `php -l`
- run [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
- run [backend_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/backend_smoke.php) if the new changes can be covered there without unrelated failures
- verify [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml) contains the frozen ten public routes
- verify registry JSON assets contain the five entity keys and ten endpoint keys
- verify the benchmark harness can recognize the new SQL scenario file

If any validation cannot run, say exactly why.

## Output rules

Do not return a new long strategy report.

Return only:

1. a concise implementation summary
2. the exact files changed
3. verification results
4. remaining blockers, if any
5. the final status among `BUILD READY`, `BUILD COMPLETE / PUBLISH BLOCKED`, or `PUBLISH READY`

## Official references to prioritize

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457](https://www.rfc-editor.org/info/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [NIST SP 800-162 ABAC](https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Fail-closed rule

If you discover a real repo contradiction that makes direct implementation unsafe, stop only on that exact contradiction and report it precisely.

Do not stop for already-approved ambiguities.
The `approval_group_id` legacy backfill policy is already approved for this run.

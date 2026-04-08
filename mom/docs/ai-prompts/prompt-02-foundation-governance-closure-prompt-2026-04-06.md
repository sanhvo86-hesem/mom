# Prompt 02 Closure Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt does not reopen architecture, slice selection, or whole-program planning.

Its only job is to harden the latest Prompt 02 output into a codebase-fit, publication-ready implementation delta package for the already-frozen `Foundation Governance Contract Slice`.

## Primary inputs

- [prompt-02-backend-implementation-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-backend-implementation-final-package-2026-04-06.md)
- [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)
- [execution-package-build-publish-gates-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-build-publish-gates-2026-04-06.md)
- [execution-package-implementation-backlog-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-implementation-backlog-2026-04-06.md)
- [prompt-02-output-deep-evaluation-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-output-deep-evaluation-2026-04-06.md)

## Required codebase-fit inputs

- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php)
- [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php)
- [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php)
- [RegistryController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/RegistryController.php)
- [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php)
- [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php)
- [AuditTrail.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/AuditTrail.php)
- [OutboxWorker.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/OutboxWorker.php)
- [RegistryService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/RegistryService.php)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [schema-field-audit-full.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json)
- [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)

## Hard constraints

- do not broaden the slice
- do not reopen Prompt 01 architecture
- do not run Prompt 03 style audit as the main output
- do not hand-wave file placement
- do not leave contract authority ambiguous
- do not invent real sub-agents if the environment does not provide them

## Six-reviewer protocol

Review the closure pass through these 6 roles:

1. `codebase-fit-architect`
2. `api-contract-hardener`
3. `workflow-evidence-hardener`
4. `metadata-registry-hardener`
5. `observability-benchmark-hardener`
6. `delivery-red-team`

If real sub-agents are unavailable, emulate them sequentially and say so explicitly.

## Required deliverables

Produce only the missing closure package for the current Prompt 02 bundle:

1. Live Metrics Block
2. Closure Findings
3. Codebase-Fit Reuse Matrix
4. Contract-Authority Closure Plan
5. Exact Wire Contract Delta
6. Exact Cursor and Problem-Detail Schema Delta
7. Approval Group Public Identity Contract
8. Registry Onboarding Delta Table
9. Exact DDL Delta Matrix by table, column, index, trigger, and rollback note
10. Tranche-1 File-by-File Patch Plan
11. Risks and Explicit Non-Goals
12. QA Verdict

## Required quality bar

The output must:

- prefer reuse or extension of existing controllers and services when practical
- justify every new controller, service, directory, or artifact root
- define exact `securitySchemes`
- define exact cursor request and response shape
- define exact RFC 9457 problem-type to HTTP-status mapping
- define exact `If-Match missing` vs `ETag mismatch` semantics
- define exact registry entity keys, endpoint keys, pack IDs, and blocked-capability rows for `organization`, `party`, `calendar`, `approval_group`, and `attachment`
- define whether `approval_group_id` is a permanent public alias or a temporary facade with compatibility guarantees
- define exact file-level implementation order for the first coding tranche

## Official references to prioritize

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [NIST SP 800-162 ABAC](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [FDA Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Decision policy

If any closure item remains too ambiguous for safe coding, return `REVIEW REQUIRED` and name the exact ambiguity.

Do not pretend the closure package is ready if contract authority, codebase fit, or registry onboarding are still underspecified.

# Prompt 02 Tranche-1 Deep Evaluation: Foundation Governance Contract Slice

Date: 2026-04-07
Status: REVIEW REQUIRED BEFORE PROMPT 03
Primary reviewed implementation input: [prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md)

## 1. Executive verdict

This tranche materially improved the codebase.

It is no longer just a documentation pass:

- canonical public routes were added
- OpenAPI was upgraded to `3.1.1`
- canonical entity and endpoint keys were onboarded
- new services and controllers were created
- migration `079_foundation_governance_contract_hardening.sql` was added

However, the tranche is still not ready for Prompt 03 or publication-grade audit.

The main reason is not missing scope.
The main reason is that several newly implemented artifacts are still logically weaker than the execution package they were meant to satisfy.

## 2. What is genuinely better

The following implementation progress is real and should be kept:

- canonical routes now exist in [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php#L816)
- canonical OpenAPI paths now exist in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2319)
- OpenAPI version is now `3.1.1` in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L1)
- canonical registry entity keys now exist in [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json#L450735)
- canonical endpoint keys now exist in [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json#L787452)
- the evidence controller-service signature mismatch was actively addressed in [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php#L72) and [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php#L527)
- migration hardening is now explicit in [079_foundation_governance_contract_hardening.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/079_foundation_governance_contract_hardening.sql)

This is meaningful progress.

## 3. Deep findings

### [P1] OpenAPI write-route security semantics are wrong

Write operations in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2528) and [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2712) declare:

- `- sessionCookie: []`
- `- csrfHeader: []`

as separate `security` entries.

Under the OpenAPI Security Requirement Object rules, multiple schemes must appear in the same object when all are required; multiple objects in the list are alternatives. This means the current document describes `sessionCookie OR csrfHeader`, not `sessionCookie AND csrfHeader`.

That is a contract bug, not a formatting nit.

Reference:
- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)

### [P1] The self-approval prohibition is currently ineffective

[ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php#L144) tries to block self-approval by comparing `requestedByPartyId` to the acting user.

But [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L264) hardcodes:

- `'requestedByPartyId' => null`

in the detail payload.

At the same time, [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L536) inserts new approval rows without persisting a requester identity contract that can reliably support the self-approval invariant.

Result:

- the route advertises a controlled approval process
- the actual server-side invariant is not enforced reliably

This is especially serious under regulated-governance expectations such as Part 11 and Annex 11.

References:
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

### [P1] Approval decisions still bypass the workflow engine

[ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L341) directly updates the `approval` table, and [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L510) directly creates approval rows.

The service does not call [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php#L45) through a narrow adapter even though the execution package explicitly positioned workflow execution behind such a bridge.

So the current implementation is still:

- table mutation first
- workflow semantics second

instead of:

- workflow transition authority first
- persistence as subordinate effect

This keeps the slice below the intended governance standard.

Reference:
- [Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)

Inference:
- The source above is about conditional updates rather than workflow design itself; the workflow-engine conclusion is inferred from the local execution package and live code structure.

### [P1] The benchmark artifact is not credible yet

[foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql#L32) queries:

- `fg_organization_nodes`
- `fg_parties`
- `fg_approval_groups`
- `fg_approval_timeline_entries`
- `fg_governance_attachments`

But repo scan across:

- [benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/benchmark_schema.sql)
- [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
- [079_foundation_governance_contract_hardening.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/079_foundation_governance_contract_hardening.sql)

found no definitions for those benchmark relations.

[run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L308) now tries to run this script if present, so the benchmark path is integrated but not yet grounded in real benchmark schema artifacts.

This means the benchmark story is still nominal, not executable.

### [P2] The smoke test is mostly static presence checking, not contract verification

[foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L36) is mainly built around:

- `assertMethodExists`
- `assertTrue`
- route string presence in `index.php`
- pure helper checks for ETag and cursor functions

It does not actually verify:

- public route execution
- `application/problem+json` behavior
- `428` vs `412`
- detail ETag round-trips
- timeline cursor behavior
- attachment create conflict handling

So the current smoke coverage is useful as a scaffolding test, but it is not yet the contract smoke promised by the tranche goal.

Reference:
- [RFC 9457](https://www.rfc-editor.org/info/rfc9457)

### [P2] Several published filters and cursors drift from the implemented behavior

There are multiple wire-contract drifts that should be closed before re-audit:

- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L97) accepts `parentOrganizationId`, but [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L174) never applies that filter
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L260) accepts `roleCode`, but the SQL built in [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L299) never uses it
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L478) slices timeline events from the beginning and ignores cursor advancement even though the method advertises cursor pagination

These are not cosmetic issues because they weaken generated frontend behavior and create false assumptions in API consumers.

Reference:
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)

Inference:
- The source above is used as a reference for cursor-pagination discipline; the drift finding is derived from local code inspection.

### [P2] Internal master-data commands currently succeed without persisting anything

[MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php#L717), [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php#L761), and [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php#L816) show the same pattern:

- audit log
- immediate success response
- no write to the canonical tables

For internal-only commands, a fail-closed `501` or explicit blocked-capability response is safer than a false-positive `201/200`.

### [P3] Independent verification could not be re-run in this shell

The current shell session does not have `php` on `PATH`, so I could not independently reproduce `php -l` or the smoke execution from this environment.

That does not invalidate the code review itself, but it does leave a local re-verification gap for this pass.

## 4. Overall assessment

The current tranche should be classified as:

- `implementation materially advanced`
- `build not yet credibly proven`
- `publish still blocked`

This is strong enough to justify one more narrow Prompt 02 hardening pass before Prompt 03.

It is not yet clean enough to send into a strict audit loop as if the implementation were closure-complete.

## 5. Improvement direction

The next prompt should remain inside the exact same slice and fix only these classes of gaps:

1. contract semantics bugs
2. invariant enforcement bugs
3. proof-quality gaps
4. benchmark realism gaps
5. false-success internal command behavior

It should not reopen architecture, domain scope, or whole-program planning.

## 6. Recommended next prompt

Use:

- [prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md)

This next prompt should be the last Prompt 02 loop for this slice before handing the result to Prompt 03.


# Prompt 02 Hardening-And-Proof Deep Evaluation: Foundation Governance Contract Slice

Date: 2026-04-07
Status: REVIEW REQUIRED BEFORE PROMPT 03
Primary reviewed implementation input: [prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md)

## 1. Executive verdict

This hardening pass materially improved the slice.

It fixed several real weaknesses from the prior tranche:

- OpenAPI write-route security semantics were corrected from `OR` to `AND`
- requester identity is now persisted and surfaced through approval-group detail
- self-approval protection moved into the service layer
- the approval decision route is now fail-closed behind an explicit workflow-bridge gate
- false-success internal master-data commands were replaced with `501` blocked capability responses
- `parentOrganizationId`, `roleCode`, and timeline cursor behavior were improved
- the benchmark SQL now targets canonical tables instead of fictional `fg_*` relations

That is meaningful engineering progress.

However, the slice is still not ready for Prompt 03.

The remaining gaps are no longer architecture gaps.
They are proof-quality and contract-alignment gaps:

- the benchmark harness still cannot credibly run the new foundation-governance read mix
- public metadata still overstates readiness for `governance.approval_group`
- smoke verification is still dominated by static source inspection instead of executable contract proof

## 2. What is genuinely better and should be kept

The following improvements are real and should not be rolled back:

- OpenAPI is still at `3.1.1` in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L1)
- the approval decision route now models `sessionCookie` plus `csrfHeader` in one security requirement object in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2527)
- attachment create now uses the same `AND` security shape in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2711)
- requester identity is now projected in approval-group list/detail via [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L137) and [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L176)
- new approval requests now persist a requester row in [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L563)
- self-approval is now blocked in the service layer in [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L329)
- approval decision execution now fail-closes behind the bridge gate in [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L310)
- the controller maps that blocked state to a typed problem in [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php#L156)
- foundation organization filtering now applies `parentOrganizationId` in [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L199)
- party filtering now applies `roleCode` in [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php#L292)
- timeline pagination now advances from the decoded cursor in [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L506)
- false-success internal commands are gone from [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php#L709)
- the benchmark SQL now references canonical tables such as `org_enterprise`, `party`, `approval`, and `attachment` in [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql#L24)

## 3. Deep findings

### [P1] The benchmark is still not runnable end-to-end

The benchmark SQL was repaired, but the harness was not repaired far enough.

[run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L203) still recreates `BENCH_DB` and loads only:

- [benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/benchmark_schema.sql)
- `seed_runtime_benchmark.sql`

That benchmark schema contains APS-only benchmark relations such as:

- `aps_planning_scenarios`
- `aps_demand_forecasts`
- `aps_schedule_blocks`

It does not define the canonical governance tables now referenced by [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql#L24), including:

- `org_enterprise`
- `org_company`
- `party`
- `approval`
- `attachment`

So the hardening pass fixed the SQL script content, but not the benchmark runtime environment needed to execute it.

That means the proof artifact is still weaker than it looks.

Relevant references:

- [PostgreSQL documentation: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)

Inference:
- The need for a runnable harness is inferred from the local repository structure and benchmark workflow, not directly from the standards above.

### [P1] Public contracts still overstate approval-group readiness

Runtime behavior now intentionally blocks approval decisions until the workflow bridge is ready.

That truth is visible in [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php#L310) and [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php#L156).

But the published metadata does not fully reflect that fail-closed state:

- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json#L787577) still marks `governance.approval_group.decide` as `"status": "active"`
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json#L450846) still reports:
  - `"overall": "ready"`
  - `"workflow_ready": true`
- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2550) exposes only generic `409 Conflict`, not a clearly documented slice-specific `workflow bridge not ready` runtime condition

This creates a false-green surface for frontend, orchestration, and audit consumers.

The slice is better than before because runtime is now safe.
But the contract surface is still pretending to be more complete than runtime really is.

Relevant references:

- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)

### [P2] Smoke verification is still mostly source-inspection proof

[foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L135) is better than a pure file-presence check, but it still relies mostly on:

- `file_get_contents`
- `str_contains`
- `preg_match`
- reflection over symbols

It verifies that code and strings exist.
It does not yet prove enough route-level behavior such as:

- blocked decision execution returning the expected problem contract
- timeline cursor semantics over representative events
- registry and OpenAPI consistency for the blocked approval workflow state
- benchmark harness compatibility with the concrete schema it loads

This is a quality-of-proof issue, not a no-progress issue.

Relevant references:

- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)

Inference:
- The preference for executable proof over string inspection is inferred from the local slice goals and the repository test shape.

### [P2] Workflow bridge state is now safely blocked, but still not fully surfaced as a governed capability state

The current runtime choice is acceptable for this slice:

- block execution
- do not bypass workflow authority
- return a typed runtime problem

That is the correct fail-closed direction.

But until the blocked state is surfaced consistently across OpenAPI, endpoint catalog, frontend foundation catalog, and smoke assertions, the slice is still below execution-package quality.

In short:

- runtime safety is now stronger
- contract honesty still lags runtime safety

Relevant references:

- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## 4. Verification note

This review could not independently rerun PHP-based validation from the current shell because `php` is not available in `PATH` in this session.

That does not invalidate the code findings above, but it does mean the next pass should prioritize runnable proof artifacts over narrative assurance.

## 5. Improvement directives for the next pass

The next pass should stay in the same slice and do only the following:

1. Make the foundation-governance benchmark actually runnable:
   - either extend the benchmark schema and seed for canonical governance tables
   - or teach the harness to load a dedicated canonical benchmark schema before running the read mix
2. Align public contract truth with runtime truth for `governance.approval_group.decide`:
   - OpenAPI must expose the blocked workflow-bridge condition clearly
   - endpoint catalog must stop presenting the decide action as fully active
   - frontend foundation catalog must not claim `workflow_ready: true` while runtime blocks execution
3. Strengthen smoke verification:
   - add executable or deterministic contract-level checks
   - reduce dependence on source-string pattern checks where route or service behavior can be exercised more directly

## 6. Recommended next prompt

The next prompt should be a narrow `runnable proof and contract alignment` pass.

It should not reopen architecture.
It should not broaden the slice.
It should not jump to Prompt 03.

It should only close the remaining proof and metadata-integrity gaps identified here.


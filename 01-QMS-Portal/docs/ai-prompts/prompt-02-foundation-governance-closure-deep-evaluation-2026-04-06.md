# Prompt 02 Closure Deep Evaluation: Foundation Governance Contract Slice

Date: 2026-04-06
Status: GO FOR IMPLEMENTATION WITH ONE EXPLICIT DATA POLICY
Primary reviewed package: [prompt-02-foundation-governance-closure-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-closure-package-2026-04-06.md)

## 1. Review objective

This evaluation determines whether the latest Prompt 02 closure package is still a planning artifact, or whether it is now strong enough to drive direct tranche-1 implementation for the frozen `Foundation Governance Contract Slice`.

The evaluation is based on:

- the closure package itself
- live repo evidence from `api/`, `database/migrations/`, `tests/`, `tools/benchmark/`, and registry JSON assets
- official primary-source standards and vendor documentation

## 2. Live repo evidence confirmed

The strongest claims in the closure package were verified against the current repository:

- `api/openapi.yaml` is still `openapi: 3.1.0`, not `3.1.1`
- there are still `0` canonical `/api/v1/foundation/*` and `/api/v1/governance/*` routes in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml), [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php), and [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php) and [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php) still have real signature mismatches for `store()` and `link()`
- [GenericCrudController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/GenericCrudController.php) still emits weak ETags via `W/"rv-n"`
- [GenericCrudService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/GenericCrudService.php) still blocks persisted workflow execution until a workflow-engine bridge exists
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json) still shows `workflow_engine_bridge_ready = 0`, `frontend_ready_entities = 330`, `frontend_partial_entities = 198`, and `publishability_ready = false`
- [schema-field-audit-full.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json) still shows canonical slice orphan tables such as `approval`, `attachment`, `calendar`, `electronic_signature`, `party`, `party_contact`, `party_role`, and `party_site`, plus missing field definitions for slice-critical columns such as `approval_step_code`, `approver_party_id`, `attachment_type`, `calendar_id`, `electronic_signature_id`, `party_id`, and `party_type`

Conclusion from live evidence:

- the closure package is not hallucinating progress
- the remaining blockers are implementation blockers, not missing-research blockers

## 3. What the closure package now gets right

### 3.1 Contract authority is finally clear

This is the biggest improvement over the earlier Prompt 02 package.

The closure package correctly establishes:

- [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md) as frozen slice authority
- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml) as canonical machine-readable authority for the published public routes
- [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php) plus [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php) as execution authority
- registry JSON files as derived mirrors rather than contract sources

That aligns with the OpenAPI specification and avoids the earlier multi-authority ambiguity.

### 3.2 Wire contract is now publication-grade

The closure package correctly upgrades from repo compatibility behavior to a publishable contract:

- success envelopes become `data` and `pageInfo`
- error responses move toward RFC 9457 problem details
- strong ETags are required for published write concurrency
- `428` and `412` are separated correctly for missing vs mismatched preconditions
- cursor pagination is treated as part of the contract instead of an implementation detail

This is materially closer to world-class platform practice than the earlier generic-CRUD-shaped package.

### 3.3 Codebase fit is grounded in the real repo

The closure package no longer invents a whole greenfield runtime surface.

It correctly chooses:

- reuse and extend for [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php), [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php), [api/Router.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/Router.php), and [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- donor-only status for [GenericCrudController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/GenericCrudController.php) and [GenericCrudService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/GenericCrudService.php)
- new justified services for `FoundationGovernanceService` and `ApprovalGroupService`
- one forward-only migration `079_foundation_governance_contract_hardening.sql`

That is the right balance between reuse and canonical isolation.

### 3.4 DDL, registry, and patch order are now implementation-grade

The exact DDL delta matrix, registry onboarding delta table, and tranche-1 file-by-file patch plan are strong enough to assign to a build team.

This is the first Prompt 02 output in this series that clearly crosses from architecture narrative into build-system intent.

## 4. What is still weak or unresolved

### 4.1 The only real ambiguity left is data policy, not architecture

The closure package keeps `REVIEW REQUIRED` mainly because of one unresolved decision:

- how to backfill `approval.approval_group_id` for legacy rows that predate the first publication of the canonical slice

This is not a standards gap.
It is a local data-governance choice.

The schema in [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql) does not expose an authoritative historical grouping key for approval sets. It contains `approval_id`, `entity_name`, `entity_id`, `approval_step_code`, `approver_party_id`, `decision_code`, `comment_text`, `electronic_signature_id`, and `decided_at`, but no existing stable `approval_group_id`.

Because the slice is still unpublished, the safest fail-closed implementation policy is:

- each pre-publication legacy `approval` row gets one new `approval_group_id`
- no attempt is made to infer historical multi-row grouping unless a locally provable grouping key exists in current data
- once published, `approval_group_id` becomes permanent and non-remappable

This preserves stable public identity and avoids invented history.

### 4.2 The closure package still stops just before code execution

It defines the patch order, but it does not yet force the next AI run to:

- edit the files directly
- run syntax checks
- add the smoke file
- add the benchmark SQL
- update OpenAPI and route registration in one go

That means the package is execution-grade in content, but still one instruction away from practical repo change.

### 4.3 Attachment reuse remains a hard implementation concern

The package correctly blocks publication on attachment reuse until the evidence stack is repaired.

This is important because attachment/evidence behavior is governed not only by API shape, but also by:

- immutable custody behavior
- audit linkage
- public metadata representation
- ETag generation

The next prompt must force this repair as code, not leave it as a narrative blocker.

## 5. World-standard alignment

The closure package is materially aligned with primary-source guidance in the following ways:

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html): one canonical machine-readable API authority
- [RFC 9457](https://www.rfc-editor.org/info/rfc9457): one problem-details error format instead of custom error envelopes
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12): schema-grade request and response contracts
- [Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency): explicit conditional update semantics instead of silent overwrites
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm): deterministic cursor pagination patterns for list surfaces
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-18.html): separation between current session-based auth reality and any future bearer-based contract
- [NIST SP 800-162 ABAC](https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations): explicit policy architecture rather than implicit role leakage
- [OpenTelemetry](https://opentelemetry.io/docs/): observability as a publication gate, not a later add-on
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application): secure, reliable, attributable regulated records with audit trail and controlled change
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf): computerized-system controls, access, traceability, and record integrity

The main conclusion from the world-standard review is:

- the package is no longer missing research depth
- it is missing implemented artifacts

## 6. Deep verdict

### 6.1 Current classification

- architecture quality: high
- contract quality: high
- codebase fit: high
- implementation readiness: high
- publication readiness: not yet

### 6.2 Overall verdict

The current Prompt 02 closure package is strong enough to stop writing more broad implementation reports.

It should now be treated as:

- `implementation-driving package`

not as:

- `another planning package`

### 6.3 Exact recommended transition

The next run should not be another wide Prompt 02 planning pass.

It should be a direct `tranche-1 implementation prompt` with one approved default data policy:

- pre-publication legacy `approval` rows backfill `approval_group_id` one-row-per-group unless current local evidence proves a stricter historical grouping key

## 7. Improvement decisions

The following improvements are recommended immediately:

1. Approve the pre-publication backfill default:
   - `one legacy approval row = one new approval_group_id`
2. Move the next AI run from documentation mode into implementation mode.
3. Require direct code edits in the next prompt.
4. Require OpenAPI, route wiring, evidence repair, migration, registry onboarding, smoke coverage, and benchmark coverage in the same tranche.
5. Keep `PUBLISH BLOCKED` until code, smoke, and benchmark evidence exist.

## 8. Next prompt target

The next prompt should produce implementation, not another report.

It should:

- use the closure package as primary authority
- freeze the backfill policy above
- edit the repository directly
- add the exact files and deltas already identified in the tranche-1 patch plan
- run repo-local validation after editing

Recommended next prompt file:

- [prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md)


# Foundation Governance Contract Slice Execution Package

Generated at: `2026-04-06`
Status: `BUILD READY / PUBLISH BLOCKED`
Owning workstream: `Prompt 02 Backend Implementation Factory`
Authoritative orchestration input: [prompt-04-master-orchestrator-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-04-master-orchestrator-final-package-2026-04-06.md)

## 1. Package Objective

This document converts the current Prompt 01-04 result set into an execution package for the exact next promotable slice chosen by Prompt 04:

- Slice name: `Foundation Governance Contract Slice`
- Build intent: create the exact backend contract package needed for canonical foundation and governance publication
- Publish intent: allow frontend generation only after slice-scoped publishability, workflow bridge, observability, and benchmark gates pass

This package is authoritative for implementation planning. If it conflicts with earlier broader narratives, this package wins for the next loop.

## 2. Source Hierarchy

Precedence order for this package:

1. implemented local artifacts and live metrics
2. [prompt-04-master-orchestrator-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-04-master-orchestrator-final-package-2026-04-06.md)
3. [prompt-02-backend-implementation-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-backend-implementation-final-package-2026-04-06.md)
4. [prompt-01-canonical-platform-architecture-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-01-canonical-platform-architecture-package-2026-04-06.md)
5. [prompt-03-backend-audit-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-03-backend-audit-final-package-2026-04-06.md)
6. [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
7. official standards and vendor references

Live metrics that remain authoritative until regenerated:

- `workflow_engine_bridge_ready = 0`
- `workflow_engine_bridge_blocked = 115`
- `frontend_ready_entities = 330`
- `frontend_partial_entities = 198`
- `publishability_ready = false`
- `missing_field_defs = 316`
- `orphan_tables = 45`
- `canonical_onboarding_gap_count = 101`

## 3. Build-ready vs Publish-ready

### 3.1 Build-ready definition

The slice is build-ready when all of the following are frozen:

- exact slice scope
- exact aggregate boundaries
- exact public route matrix
- exact internal command catalog
- exact events and invariants
- exact policy architecture
- exact projection ownership
- exact observability attributes
- exact benchmark charter
- exact artifact targets and acceptance criteria

This document now provides that freeze.

### 3.2 Publish-ready definition

The slice is publish-ready only when all of the following pass for the chosen slice:

- OpenAPI 3.1.1 and JSON Schema 2020-12 artifacts are published
- RFC 9457 problem details are implemented and parity-tested
- route and catalog parity tests pass
- chosen-slice field definitions and orphan ownership gaps are zero
- `approval_group` workflow bridge is ready and tested
- metadata packs exist for list, detail, timeline, attachments, and blocked states
- projection freshness, rebuild, and stale-read rules are implemented and proven
- OTel traces, metrics, and correlation evidence are published
- benchmark overlap on supported runtime paths is nonzero and thresholds pass

The current program state is therefore:

- `BUILD READY`
- `PUBLISH BLOCKED`

## 4. Exact Slice Scope

### 4.1 Included bounded contexts

- `FoundationGovernance`
- `PartyMaster`
- `WorkflowOrchestration`
- `ExperienceMetadataContracts`
- `ReadModelsAndProjection`

### 4.2 Included canonical tables

From [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql):

- `org_enterprise`
- `org_company`
- `org_site`
- `org_plant`
- `org_warehouse`
- `org_work_center`
- `org_work_unit`
- `party`
- `party_role`
- `party_site`
- `party_contact`
- `uom`
- `calendar`
- `shift`
- `reason_code`
- `status_code`
- `approval`
- `electronic_signature`
- `attachment`

### 4.3 Public canonical route matrix

The public route surface for this slice is frozen as:

- `GET /api/v1/foundation/organizations`
- `GET /api/v1/foundation/parties`
- `GET /api/v1/foundation/calendars`
- `GET /api/v1/governance/approval-groups`
- `GET /api/v1/governance/approval-groups/{approvalGroupId}`
- `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
- `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline`
- `GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments`
- `GET /api/v1/governance/attachments/{attachmentId}`
- `POST /api/v1/governance/attachments`

### 4.4 Internal or admin-only commands

The following write commands are in-scope but not public-facing in the first published surface:

- `registerOrganizationNode`
- `amendOrganizationNode`
- `reparentOrganizationNode`
- `deactivateOrganizationNode`
- `registerParty`
- `amendPartyIdentity`
- `assignPartyRole`
- `registerPartySite`
- `registerPartyContact`
- `registerCalendar`
- `registerShift`
- `requestApproval`

### 4.5 Explicitly blocked or deferred capabilities

- no standalone public signature routes
- no standalone public `approval` CRUD
- no public `shift` publication until slice onboarding closes
- no planning board beyond governance list, detail, timeline, and attachment surfaces
- no MES execution, dispatch, genealogy, inventory, costing, finance, or eQMS case publication
- no compatibility-only routes in canonical endpoint or frontend catalogs

## 5. Aggregate Manifest

| Aggregate | Write truth tables | Public resources | Internal commands | Projections | Notes |
|---|---|---|---|---|---|
| `OrganizationHierarchy` | `org_enterprise`, `org_company`, `org_site`, `org_plant`, `org_warehouse`, `org_work_center`, `org_work_unit` | `organizations` | `registerOrganizationNode`, `amendOrganizationNode`, `reparentOrganizationNode`, `deactivateOrganizationNode` | `organization` read-through | Parent-child hierarchy only; no planning or execution state |
| `PartyProfile` | `party`, `party_role`, `party_site`, `party_contact` | `parties` | `registerParty`, `amendPartyIdentity`, `assignPartyRole`, `registerPartySite`, `registerPartyContact` | `party` read-through | `party` is the canonical human or business root |
| `CalendarSchedule` | `calendar`, `shift` | `calendars` | `registerCalendar`, `registerShift` | `calendar` read-through | `shift` remains internal-only until onboarding closure |
| `ReferenceCodeSet` | `reason_code`, `status_code`, `uom` | none in first public slice | internal reference-data seeding only | embedded lookups | Needed by policies, validation, and metadata; no public dedicated route in this slice |
| `ApprovalGroup` | `approval`, `electronic_signature` | `approval-groups`, `approval-groups/{id}`, `approval-groups/{id}:decide`, `approval-groups/{id}/timeline`, `approval-groups/{id}/attachments` | `requestApproval` | `approval_queue`, `attachment_timeline` | Public governance root; signature evidence is embedded |
| `AttachmentEvidence` | `attachment` | `attachments`, `approval-groups/{id}/attachments` | verification and linkage internals only | `attachment_timeline` | Immutable evidence only after verification and token-bound linkage |

## 6. Command, Event, and Invariant Catalog

### 6.1 OrganizationHierarchy

Commands:

- `registerOrganizationNode`
- `amendOrganizationNode`
- `reparentOrganizationNode`
- `deactivateOrganizationNode`

Events:

- `organization.node_registered`
- `organization.node_amended`
- `organization.node_reparented`
- `organization.node_deactivated`

Invariants:

- parent node must exist and be active
- child node type must be valid under the parent type
- codes are unique inside the canonical hierarchy
- deactivation is blocked if active children or governed references remain
- hierarchy mutations require `ETag` and `If-Match`

### 6.2 PartyProfile

Commands:

- `registerParty`
- `amendPartyIdentity`
- `assignPartyRole`
- `registerPartySite`
- `registerPartyContact`

Events:

- `party.registered`
- `party.identity_amended`
- `party.role_assigned`
- `party.site_registered`
- `party.contact_registered`

Invariants:

- `party_code` is globally unique
- `(party_id, role_code, scope_entity_name, scope_entity_id)` remains unique
- party contact and site records inherit the parent party lifecycle
- effective dating may not overlap for the same scoped role where exclusivity is required by policy
- all mutable writes require concurrency enforcement

### 6.3 CalendarSchedule

Commands:

- `registerCalendar`
- `registerShift`

Events:

- `calendar.registered`
- `shift.registered`

Invariants:

- `calendar_code` is unique
- `(calendar_id, shift_code)` is unique
- shift time windows must be valid for same-calendar collision rules
- cross-midnight behavior must be explicit

### 6.4 ApprovalGroup

Commands:

- `requestApproval`
- `decideApprovalGroup`

Events:

- `approval.requested`
- `approval.decision_recorded`
- `electronic_signature.applied`
- `approval.group_completed`

Invariants:

- self-approval is prohibited
- delegation and substitution require scope, time bounds, and audit evidence
- signature requirement is keyed by approval action or step code
- missing required signature blocks decision completion
- signed approval evidence is immutable; correction is by supersession, hold, or later disposition records
- `If-Match` is mandatory on public decision commands
- stale `ETag` produces conflict semantics, never silent overwrite

### 6.5 AttachmentEvidence

Commands:

- `initiateAttachmentIntake`
- `verifyAndBindAttachment`
- `placeAttachmentOnHold`
- `supersedeAttachment`

Events:

- `attachment.intake_initiated`
- `attachment.verified`
- `attachment.bound`
- `attachment.hold_applied`
- `attachment.superseded`

Invariants:

- intake token is single-use, expiry-bounded, hash-bound, and target-record-bound
- immutable canonical attachment exists only after verification
- attachment content is never updated in place after verification
- hold and supersession are modeled explicitly
- evidence retrieval remains possible under retention and legal-hold rules

## 7. Public API Contract Requirements

### 7.1 Common HTTP requirements

All public slice routes must satisfy:

- OpenAPI 3.1.1 contract publication
- JSON Schema 2020-12 request and response schemas
- `application/problem+json` for all non-2xx responses
- `ETag` on mutable governance resources
- `If-Match` required on `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
- opaque cursor pagination for list and timeline routes
- stable default sort with deterministic tiebreaker
- explicit capability exposure: `supported`, `blocked`, or `not_applicable`

### 7.2 Route behavior contract

| Route | Behavior | Notes |
|---|---|---|
| `GET /api/v1/foundation/organizations` | cursor-paginated read-through query over the organization hierarchy | must support `as_of`; no write capability leakage |
| `GET /api/v1/foundation/parties` | cursor-paginated read-through query over canonical party | must support scoped filters and `as_of` |
| `GET /api/v1/foundation/calendars` | cursor-paginated read-through query over calendars; shifts may be embedded or blocked | public shift mutation is blocked |
| `GET /api/v1/governance/approval-groups` | cursor-paginated queue and search surface | backed by `approval_queue` projection |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}` | authoritative detail view | embeds signature state and blocked capabilities |
| `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide` | public decision command | requires `If-Match`; may require embedded signature evidence |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline` | cursor-paginated lifecycle history | backed by `attachment_timeline` and approval history rules |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments` | cursor-paginated evidence listing | immutable evidence only |
| `GET /api/v1/governance/attachments/{attachmentId}` | immutable attachment detail or secure retrieval metadata | no public update or delete |
| `POST /api/v1/governance/attachments` | intake initiation or upload orchestration only | immutable attachment record exists only after verification |

### 7.3 Required problem codes

The slice must define and test at least these RFC 9457 problem types:

- `precondition_required`
- `etag_mismatch`
- `invalid_cursor`
- `validation_failed`
- `policy_denied`
- `self_approval_forbidden`
- `signature_required`
- `invalid_state_transition`
- `bridge_not_ready`
- `evidence_missing`
- `legal_hold_active`
- `capability_blocked`
- `resource_not_found`

## 8. Metadata Publication Contract

The first publishable metadata package for the slice must expose entity contracts for:

- `organization`
- `party`
- `calendar`
- `approval_group`
- `attachment`

For each entity, metadata must include:

- list columns and default filters
- detail sections and semantic slots
- action availability and blocked reasons
- timeline taxonomy
- attachment policy
- related-list policy
- field visibility and editability predicates
- search facet and ranking policy

Entity-specific requirements:

- `organization`: hierarchy path, type, parent references, active status, effective period if used
- `party`: type, roles, primary site/contact semantics, scope path
- `calendar`: timezone, shift summary, blocked shift mutation state
- `approval_group`: decision state, approver, requester, due state, signature requirement, escalation state
- `attachment`: checksum, MIME type, retention class, hold status, supersession pointers, verification state

## 9. Policy Architecture

### 9.1 Identity and authorization chain

The slice authorization chain is frozen as:

- `OIDC token validation`
- `role resolution`
- `ABAC policy evaluation`
- `policy enforcement at gateway, app service, and worker boundaries`

### 9.2 Minimum subject attributes

- `subject_id`
- `party_id`
- `tenant_id`
- `enterprise_id`
- `company_id`
- `site_id`
- `plant_id`
- `role_codes`
- `delegation_context`
- `break_glass_state`

### 9.3 Minimum object attributes

- `resource_type`
- `resource_id`
- `entity_name`
- `record_status`
- `approval_mode`
- `signature_required`
- `retention_class`
- `legal_hold_state`
- `org_scope_path`

### 9.4 Minimum environment attributes

- `request_time`
- `client_type`
- `network_zone`
- `device_assurance`
- `correlation_id`
- `channel`

### 9.5 Segregation-of-duties rules

- requester may not approve own governed request
- delegated approver may only act within valid delegation window
- break-glass may not finalize regulated approval without after-action review artifact
- evidence uploader may not mutate verified evidence in place
- archived or held evidence may not be deleted through normal operator actions

## 10. Workflow Bridge Contract

The exact bridge target for this slice is:

- public `approval_group` behavior rooted over canonical `approval`
- embedded `electronic_signature` evidence

Bridge completion criteria:

- workflow state machine for approval group is explicit
- decision commands call bridge-owned transition logic, not direct status mutation
- signature requirement matrix is step-code aware
- blocked transition responses are exposed through RFC 9457 problem details
- bridge tests cover approve, reject, delegate, stale version, self-approval prohibition, signature-required, and capability-blocked cases

## 11. Projection and Async Contract

### 11.1 Authoritative read-through

These are read-through query surfaces, not asynchronous projections:

- `organization`
- `party`
- `calendar`

### 11.2 Operational projections

Only these projections are in-scope:

- `approval_queue`
- `attachment_timeline`

### 11.3 Projection contract

For each in-scope projection, implementation must publish:

- owner
- source commands and source events
- freshness class
- lag budget
- rebuild procedure
- stale-read behavior
- promotion criteria

### 11.4 Async contract

If async is used in the slice, the canonical package must publish:

- CloudEvents-style event envelope fields
- AsyncAPI channel descriptions
- outbox ownership
- inbox deduplication rule
- replay procedure
- poison-message handling
- dead-letter visibility

Compatibility async artifacts do not count as proof for canonical readiness.

## 12. Observability Contract

The slice must emit standard traces, metrics, and logs for both public routes and supporting workers.

### 12.1 Required trace attributes

- `trace_id`
- `correlation_id`
- `request_id`
- `actor.party_id`
- `actor.role_codes`
- `org.enterprise_id`
- `org.company_id`
- `org.site_id`
- `org.plant_id`
- `resource.type`
- `resource.id`
- `command.name`
- `event.name`
- `workflow.step_code`
- `approval.mode`
- `signature.required`
- `signature.applied`
- `attachment.id`
- `policy.decision`

### 12.2 Required metrics

- request count and error count by route and problem type
- p50, p95, and p99 latency by supported route
- approval decision conflict rate
- attachment verification success and failure counts
- projection lag for `approval_queue`
- projection lag for `attachment_timeline`
- worker retry and dead-letter counts

### 12.3 Required structured logs

- approval decision audit log
- signature application audit log
- attachment verification log
- policy denial log
- projection rebuild log

## 13. Benchmark Charter

### 13.1 Supported benchmark scenarios

- organization list and filter browse
- party list and filter browse
- approval queue browse
- approval group detail read
- approval decision with required concurrency guard
- attachment intake plus verification handoff
- attachment timeline retrieval

### 13.2 Pre-publish dataset floor

The pre-publish benchmark dataset must be no smaller than:

- `1` enterprise
- `10` companies
- `100` sites
- `250` plants
- `500` warehouses
- `750` work centers
- `3000` work units
- `100000` parties
- `250000` party contacts and sites combined
- `50000` approval groups
- `200000` attachment timeline events

### 13.3 Traffic mix

- `55%` read-through list and detail
- `20%` approval queue and timeline reads
- `10%` approval decision writes
- `10%` attachment intake and retrieval
- `5%` background verification, projection, and replay activity

### 13.4 Minimum thresholds

- list or detail reads: `p95 <= 300 ms`, `p99 <= 700 ms`
- approval decision command: `p95 <= 500 ms`, `p99 <= 1200 ms`
- attachment intake orchestration: `p95 <= 400 ms`
- verification-to-bind completion: `p95 <= 5 s`
- projection lag: `p95 <= 5 s`
- stale read window for operational projections: documented and bounded
- benchmark overlap count on supported canonical slice routes: `> 0`

## 14. Artifact Manifest

The next loop must produce these implementation artifacts as the minimum execution package:

- `contracts/openapi/foundation-governance-v1.yaml`
- `contracts/json-schema/foundation-governance/*.schema.json`
- `contracts/problems/foundation-governance-problem-types.yaml`
- `contracts/async/foundation-governance-asyncapi.yaml` if async exists
- `contracts/metadata/foundation-governance-frontend-contract.json`
- `contracts/policy/foundation-governance-policy-architecture.md`
- `contracts/projections/foundation-governance-projection-contract.md`
- `contracts/observability/foundation-governance-otel-contract.md`
- `benchmarks/foundation-governance/benchmark-charter.md`
- `benchmarks/foundation-governance/results/*.json`
- `tests/contracts/foundation-governance/*`
- `tests/workflow/approval-group/*`
- `tests/metadata/foundation-governance/*`
- `tests/benchmarks/foundation-governance/*`

Target paths are proposed outputs. Equivalent final locations are acceptable if the manifest remains stable and versioned.

## 15. Build Sequence

The implementation sequence is frozen as:

1. schema and aggregate hardening
2. public contract publication
3. internal command service and workflow bridge
4. attachment verification and immutable evidence path
5. metadata publication for the slice
6. projection and async publication
7. observability publication
8. benchmark execution
9. re-audit
10. promotion decision

## 16. Publish Decision Rule

The slice may be published only if all of the following are true:

- chosen-slice route and catalog parity tests pass
- chosen-slice field-definition and orphan ownership gaps are zero
- chosen-slice workflow bridge blockers are zero
- chosen-slice metadata package exposes blocked states explicitly
- chosen-slice observability package is published
- chosen-slice benchmark thresholds pass with nonzero overlap
- Prompt 03 re-audit returns no critical slice blocker
- a new Prompt 04 reconciliation approves promotion

Until then, the correct state remains:

- `BUILD READY`
- `PUBLISH BLOCKED`

## 17. Sources

- [prompt-04-master-orchestrator-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-04-master-orchestrator-final-package-2026-04-06.md)
- [prompt-02-backend-implementation-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-backend-implementation-final-package-2026-04-06.md)
- [prompt-01-canonical-platform-architecture-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-01-canonical-platform-architecture-package-2026-04-06.md)
- [prompt-03-backend-audit-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-03-backend-audit-final-package-2026-04-06.md)
- [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
- [canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md)
- [canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md)
- [Azure CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Microsoft Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- [Retrieve table definitions by name or MetadataId](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-metadata-name-metadataid)
- [Salesforce ObjectInfo metadata](https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html)
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [AsyncAPI 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [CloudEvents](https://cloudevents.io/)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [PostgreSQL LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [NIST SP 800-162 ABAC](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
- [FDA Part 11 Scope and Application](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU GMP Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)
- [Oracle Item Master Organizations](https://docs.oracle.com/en/cloud/saas/applications-common/25d/faesc/item-master-organizations.html)
- [Oracle Manage Inspections](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/how-you-manage-inspections.html)
- [Oracle Review Product Genealogy](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/how-you-review-product-genealogy.html)
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)

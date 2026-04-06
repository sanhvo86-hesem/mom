# Prompt 02 Backend Implementation Final Package

Generated at: `2026-04-06T21:43:00.9396505+07:00`
Execution mode: `execution-package-first`
Primary slice: `Foundation Governance Contract Slice`
QA verdict: `REVIEW REQUIRED`
Rollout status: `BUILD READY / PUBLISH BLOCKED`
Reviewer mode: `six-reviewer protocol emulated sequentially in this run; no sub-agents were used`

## Prompt 02 Step Plan

| Step | Status | Prompt 02 independent completion | External sync later required | Reviewer-driven change in this step |
|---|---|---|---|---|
| 1. Architecture conformance and live metrics normalization | completed | Imported execution package, current runtime evidence, live metrics, and contradiction hierarchy | Prompt 04 promotion only | Forced execution package to override older broader Prompt 02 narrative |
| 2. Contract freeze and dependency freeze | completed | Froze one exact first delivery slice, route matrix, contract family, and gate set | Prompt 01 deprecation-window ratification | Removed drift back into compatibility routes and generic runtime contracts |
| 3. Data, command, workflow, and policy design | completed | Defined aggregates, invariants, idempotency, concurrency, policy model, and bridge semantics | Prompt 03 re-audit after implementation | Tightened self-approval, signature, retention, and evidence immutability requirements |
| 4. Projection, metadata, observability, and benchmark design | completed | Defined read-through vs projection boundaries, metadata packs, OTel contract, and benchmark charter | Prompt 03 benchmark and observability verification | Prevented projection-backed decision authority and compatibility telemetry reuse |
| 5. Final package and handoff | completed | Published implementation-grade manifest, blocker log, Prompt 04 handoff, and QA result | Prompt 04 reconciliation and promotion decision | Kept final result fail-closed as `REVIEW REQUIRED` instead of overstating readiness |

## Live Metrics Block

```yaml
generated_at:
  execution_package_slice: 2026-04-06
  execution_package_gates: 2026-04-06
  execution_package_backlog: 2026-04-06
  registry_quality_report: 2026-04-06T02:22:55.218Z
  frontend_foundation_catalog: 2026-04-06T02:22:55.218Z
  endpoint_catalog: 2026-04-06T02:22:55.218Z
  schema_field_audit_full: 2026-04-06T02:25:17.6616283Z
counts:
  endpoint_count: 2862
  pack_count: 3168
  workflow_count: 425
  workflow_engine_bridge_ready: 0
  workflow_engine_bridge_blocked: 115
  frontend_ready_entities: 330
  frontend_partial_entities: 198
  publishability_ready: false
  publishability_review_required_entities: 198
  missing_field_defs: 316
  orphan_tables: 45
  canonical_onboarding_gap_count: 101
  exact_canonical_route_matches: 0
  exact_slice_entity_matches: 0
  canonical_async_tables_present: false
stale_narratives_rejected:
  - source: frontend-foundation-global-blueprint-2026-04-06.md
    stale_ready_entities: 40
    stale_partial_entities: 488
    live_ready_entities: 330
    live_partial_entities: 198
  - source: older broader Prompt 02 narrative
    stale_scope: multi-phase foundation anchors beyond the execution package
    live_scope: Foundation Governance Contract Slice only
```

## Research Ledger

| Source | Source type | Generated / date | Slice evidence extracted |
|---|---|---|---|
| `execution-package-index-2026-04-06.md` | execution package | 2026-04-06 | current next-loop owner is Prompt 02 and package is exact enough to start implementation |
| `execution-package-foundation-governance-contract-slice-2026-04-06.md` | execution package | 2026-04-06 | exact slice boundary, route matrix, aggregate list, policy minimums, projection scope, benchmark floor |
| `execution-package-build-publish-gates-2026-04-06.md` | execution package | 2026-04-06 | build-start pass, build-complete open, publish blocked, fail-closed gate matrix |
| `execution-package-implementation-backlog-2026-04-06.md` | execution package | 2026-04-06 | ordered workstreams 01-10 and their done criteria |
| `02-backend-implementation-factory-prompt.md` | Prompt 02 base prompt | current workspace file | mandatory deliverables, live metrics block rules, contract-first workflow, six-reviewer protocol |
| `prompt-01-canonical-platform-architecture-package-2026-04-06.md` | prior architecture package | 2026-04-06 | first promotable slice and live counts align with execution package, but execution package now outranks it for scope |
| `prompt-03-backend-audit-final-package-2026-04-06.md` | prior audit package | 2026-04-06 | zero bridge-ready, publishability false, benchmark overlap zero, evidence/signature gaps remain critical |
| `prompt-04-master-orchestrator-final-package-2026-04-06.md` | prior orchestration package | 2026-04-06 | next promotable slice is this exact slice; weighted blockers prioritize contract truth, bridge, evidence, onboarding, observability |
| `greenfield-canonical-first-execution-plan-2026-04-06.md` | architecture execution plan | 2026-04-06 | foundation and governance must be built before module publication; workflow and metadata are first-class platform work |
| `canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md` | canonical architecture | 2026-04-05 | one canonical organization, party, approval, signature, attachment backbone across ERP, MES, and eQMS |
| `canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md` | canonical schema map | 2026-04-05 | layer ownership, regulated records, read-through vs event/ledger patterns, cross-layer relation spine |
| `frontend-foundation-global-blueprint-2026-04-06.md` | frontend requirements | 2026-04-06 | required metadata families and stale narrative count that must be rejected in favor of live registry metrics |
| `frontend-foundation-catalog.json` | live registry artifact | 2026-04-06T02:22:55.218Z | exact slice entity matches are zero; only legacy or adjacent entities are present today |
| `registry-quality-report.json` | live registry artifact | 2026-04-06T02:22:55.218Z | live counts, publishability false, bridge blocked, transition runtime warnings 115 |
| `schema-field-audit-full.json` | live schema audit | 2026-04-06T02:25:17.6616283Z | missing field definitions 316, orphan tables 45, exact field gaps affecting approval, attachment, party, calendar semantics |
| `strategic-roadmap-2026.md` | implementation roadmap | 2026-03-28 | current runtime is still compatibility-heavy, session-based, and generic; canonical slice contracts are not yet published |
| `34-module-builder-architecture.md` | platform builder reference | legacy local artifact | runtime and builder are metadata-driven, but current artifact strategy is not a substitute for canonical backend truth |
| `module-builder-world-class-prompts.md` | builder prompt reference | legacy local artifact | reinforces need for explicit metadata, accessibility, test, and governance contracts |
| `072_canonical_foundation_governance.sql` | canonical migration | local implemented artifact | canonical slice tables exist, but row-version, legal-hold, retention, evidence verification, and approval-group bridge columns do not |
| `073` to `078` canonical migrations | canonical migrations | local implemented artifacts | later layers confirm no need to broaden the slice; execution, inventory, and eQMS remain excluded |
| `api/openapi.yaml` | implemented runtime artifact | current workspace file | current public OpenAPI is compatibility-oriented, cookie/session-auth, and does not contain canonical `/api/v1` slice routes |
| `tests/backend_smoke.php`, `tests/bootstrap.php`, `tools/benchmark/*` | implemented verification artifacts | current workspace files | existing tests and benchmarks are generic only; no slice-specific contract, bridge, or benchmark pack exists yet |

## Facts, Inference, and Contradictions

- [FACT] The execution package is the highest-priority scope source for this run and limits Prompt 02 to `Foundation Governance Contract Slice`.
- [FACT] The live registry reports `workflow_engine_bridge_ready = 0`, `workflow_engine_bridge_blocked = 115`, `frontend_ready_entities = 330`, `frontend_partial_entities = 198`, `publishability_ready = false`, `missing_field_defs = 316`, and `orphan_tables = 45`.
- [FACT] `endpoint-catalog.json` contains `0` exact matches for the frozen canonical route matrix.
- [FACT] `frontend-foundation-catalog.json` contains `0` exact matches for the frozen entity keys `organization`, `party`, `calendar`, `approval_group`, and `attachment`.
- [FACT] `072_canonical_foundation_governance.sql` creates the slice tables but does not yet encode row-version concurrency, attachment retention/hold, explicit evidence verification fields, or record-version-bound signature fields.
- [FACT] Current `api/openapi.yaml` is `openapi: 3.1.0` for a session-cookie and legacy action interface, not the canonical `/api/v1/foundation...` and `/api/v1/governance...` surface frozen by the execution package.
- [FACT] No canonical `domain_event_outbox` or `domain_event_inbox` tables are present in migrations; only compatibility `outbox_events` handling exists in current services.
- [INFERENCE] The first slice must publish a new canonical contract pack under a dedicated `contracts/` tree instead of extending the compatibility OpenAPI in place.
- [ASSUMPTION] In the first slice, public `approval_group_id` maps 1:1 to `approval.approval_id`; multi-step group composition remains later-phase work and is not introduced here as a new canonical business table.
- [GAP] The current canonical DDL is insufficient for the slice release gate until hardening migrations add concurrency, provenance, immutability, and hold semantics.

### Contradiction Log

1. `frontend-foundation-global-blueprint-2026-04-06.md` narrates `40 ready / 488 partial`, but the live registry artifacts generated on `2026-04-06T02:22:55.218Z` show `330 ready / 198 partial`. The live metrics block wins.
2. Older Prompt 02 output mixed this slice with later-phase anchors. The execution package now narrows the owned scope to foundation, governance contract publication, and slice-scoped publish gates only.
3. Current runtime OpenAPI and router artifacts describe compatibility actions, while the execution package freezes canonical `/api/v1` route authority. Contract publication is therefore split today and must be consolidated by this slice.
4. Canonical DDL exists for slice tables, but execution-package invariants require hardening that is not yet encoded in `072`. The execution package wins; DDL must be extended rather than treated as complete.

## Dependency Map

| Capability | Prompt 02 ownership | Depends on | Current status | Prompt 04 concern |
|---|---|---|---|---|
| Slice OpenAPI, JSON Schema, and problem types | full | execution package freeze only | not started | contract authority blocker |
| DDL hardening for concurrency and immutability | full | `072` as baseline | not started | governed evidence blocker |
| Internal command services for org, party, calendar, approval request | full | hardened DDL | not started | build-sequence blocker |
| `approval_group` workflow bridge | full | workflow engine contract, hardened DDL | blocked | zero-ready bridge blocker |
| Attachment intake, verify, bind, hold, supersede path | full | hardened DDL, evidence policy | not started | evidence and retention blocker |
| Metadata packs and registry regeneration | full | contract pack plus entity field closure | not started | publishability blocker |
| `approval_queue` and `attachment_timeline` projections | full | outbox/inbox or equivalent slice async support | not started | freshness and rebuild blocker |
| Canonical async envelope and dedup | full | new canonical outbox/inbox support | blocked | async proof blocker |
| OIDC, RBAC, ABAC, SoD enforcement | full | policy contract and service boundaries | not started | security and compliance blocker |
| OTel contract and slice-specific benchmark harness | full | route and worker implementation | not started | rollout credibility blocker |
| Re-audit and promotion | no | Prompt 03, Prompt 04 | pending | downstream only |

## First Delivery Slice

- Slice name: `Foundation Governance Contract Slice`
- Why first: it is the smallest slice that closes contract authority, concurrency, governed evidence, workflow bridge, and metadata publication for all later ERP, MES, and eQMS layers.
- Included bounded contexts:
  - `FoundationGovernance`
  - `PartyMaster`
  - `WorkflowOrchestration`
  - `ExperienceMetadataContracts`
  - `ReadModelsAndProjection`
- Included aggregates:
  - `OrganizationHierarchy`
  - `PartyProfile`
  - `CalendarSchedule`
  - `ReferenceCodeSet`
  - `ApprovalGroup`
  - `AttachmentEvidence`
- Included canonical tables:
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
- Included routes:
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
- Included schemas:
  - `OrganizationCollection`
  - `OrganizationNode`
  - `PartyCollection`
  - `PartyProfile`
  - `CalendarCollection`
  - `CalendarDetail`
  - `ApprovalGroupCollection`
  - `ApprovalGroupDetail`
  - `ApprovalDecisionCommand`
  - `ApprovalTimelineCollection`
  - `AttachmentCollection`
  - `AttachmentDetail`
  - `AttachmentIntakeCommand`
  - `AttachmentIntakeReceipt`
  - `ProblemDetails`
  - `CapabilityDescriptor`
  - `CursorPage`
- Included events:
  - `foundation.organization.node_registered`
  - `foundation.organization.node_amended`
  - `foundation.organization.node_reparented`
  - `foundation.organization.node_deactivated`
  - `foundation.party.registered`
  - `foundation.party.identity_amended`
  - `foundation.party.role_assigned`
  - `foundation.party.site_registered`
  - `foundation.party.contact_registered`
  - `foundation.calendar.registered`
  - `foundation.shift.registered`
  - `foundation.approval.requested`
  - `foundation.approval.decision_recorded`
  - `foundation.approval.group_completed`
  - `foundation.electronic_signature.applied`
  - `foundation.attachment.intake_initiated`
  - `foundation.attachment.verified`
  - `foundation.attachment.bound`
  - `foundation.attachment.hold_applied`
  - `foundation.attachment.superseded`
- Included projections:
  - `organization` read-through
  - `party` read-through
  - `calendar` read-through
  - `approval_queue`
  - `attachment_timeline`
- Included metadata packs:
  - `organization`
  - `party`
  - `calendar`
  - `approval_group`
  - `attachment`
- Included workflow bridge target:
  - public `approval_group` behavior rooted over canonical `approval` with embedded `electronic_signature` evidence
- Excluded scope:
  - standalone public signature routes
  - standalone public approval CRUD
  - public shift publication
  - planning boards beyond governance list/detail/timeline/attachments
  - MES execution, dispatch, genealogy, inventory, cost, finance, and eQMS case publication
  - compatibility endpoints in canonical endpoint or frontend catalogs
- Exact build order:
  1. schema and aggregate hardening
  2. public contract publication
  3. internal command services and workflow bridge
  4. attachment verification and immutable evidence path
  5. metadata publication
  6. projection and async publication
  7. observability publication
  8. benchmark execution
  9. Prompt 03 re-audit
  10. Prompt 04 promotion decision
- Exact release gate:
  - `build.contract.openapi`
  - `build.contract.schema`
  - `build.contract.problem`
  - `build.contract.concurrency`
  - `build.workflow.bridge`
  - `build.evidence.immutability`
  - `build.registry.slice_onboarding`
  - `build.projection.ownership`
  - `build.async.contract`
  - `build.observability.contract`
  - `build.tests.parity`
  - publish remains blocked until `publish.slice.field_closure`, `publish.slice.bridge_ready`, `publish.slice.publishability`, `publish.slice.otel`, `publish.slice.benchmark`, `publish.slice.audit`, and `publish.slice.orchestration` all pass

## Implementation Artifact Manifest

### Migrations to create or update

- `01-QMS-Portal/database/migrations/079_foundation_governance_slice_hardening.sql`
  - add `row_version` to mutable slice roots
  - add effectivity and provenance fields required for `as_of`
  - add explicit retention, legal hold, verification, MIME, size, and supersession columns for governed evidence
  - add signature binding columns for record identity, action meaning, and record version
  - add indexes and update triggers needed for ETag and query performance
- `01-QMS-Portal/database/migrations/080_foundation_governance_projection_async_support.sql`
  - create canonical `domain_event_outbox`
  - create canonical `domain_event_inbox`
  - create `approval_queue`
  - create `attachment_timeline`
  - create replay, deduplication, dead-letter, and projection-lag support indexes

### Services to implement or modify

- `01-QMS-Portal/api/controllers/FoundationController.php`
- `01-QMS-Portal/api/controllers/GovernanceController.php`
- `01-QMS-Portal/api/Router.php`
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/api/services/foundation-governance/OrganizationHierarchyCommandService.php`
- `01-QMS-Portal/api/services/foundation-governance/OrganizationHierarchyQueryService.php`
- `01-QMS-Portal/api/services/foundation-governance/PartyProfileCommandService.php`
- `01-QMS-Portal/api/services/foundation-governance/PartyProfileQueryService.php`
- `01-QMS-Portal/api/services/foundation-governance/CalendarScheduleService.php`
- `01-QMS-Portal/api/services/foundation-governance/ApprovalGroupBridgeService.php`
- `01-QMS-Portal/api/services/foundation-governance/AttachmentEvidenceService.php`
- `01-QMS-Portal/api/services/foundation-governance/ProjectionRefreshService.php`
- `01-QMS-Portal/api/services/foundation-governance/PolicyDecisionService.php`
- `01-QMS-Portal/api/services/foundation-governance/TelemetryService.php`
- modify `01-QMS-Portal/api/services/WorkflowEngine.php`
- modify `01-QMS-Portal/api/services/AuditTrail.php`
- modify `01-QMS-Portal/api/services/OutboxWorker.php` only to consume canonical outbox after new support tables exist

### OpenAPI, JSON Schema, AsyncAPI, metadata, and policy artifacts

- `01-QMS-Portal/contracts/openapi/foundation-governance-v1.yaml`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/organization.collection.schema.json`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/party.collection.schema.json`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/calendar.collection.schema.json`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/approval-group.detail.schema.json`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/approval-decision.command.schema.json`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/attachment.detail.schema.json`
- `01-QMS-Portal/contracts/json-schema/foundation-governance/attachment-intake.command.schema.json`
- `01-QMS-Portal/contracts/problems/foundation-governance-problem-types.yaml`
- `01-QMS-Portal/contracts/async/foundation-governance-asyncapi.yaml`
- `01-QMS-Portal/contracts/metadata/foundation-governance-frontend-contract.json`
- `01-QMS-Portal/contracts/policy/foundation-governance-policy-architecture.md`
- `01-QMS-Portal/contracts/projections/foundation-governance-projection-contract.md`
- `01-QMS-Portal/contracts/observability/foundation-governance-otel-contract.md`

### Registry or metadata artifacts to emit or regenerate

- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`

### Tests to add

- `01-QMS-Portal/tests/contracts/FoundationGovernanceOpenApiTest.php`
- `01-QMS-Portal/tests/contracts/FoundationGovernanceSchemaParityTest.php`
- `01-QMS-Portal/tests/contracts/FoundationGovernanceProblemDetailsTest.php`
- `01-QMS-Portal/tests/integration/FoundationIfMatchConflictTest.php`
- `01-QMS-Portal/tests/integration/FoundationIdempotencyTest.php`
- `01-QMS-Portal/tests/integration/ApprovalGroupBridgeTest.php`
- `01-QMS-Portal/tests/integration/AttachmentEvidenceImmutabilityTest.php`
- `01-QMS-Portal/tests/metadata/FoundationGovernanceMetadataTest.php`
- `01-QMS-Portal/tests/projections/ApprovalQueueProjectionTest.php`
- `01-QMS-Portal/tests/projections/AttachmentTimelineProjectionTest.php`

### Benchmark hooks to add

- `01-QMS-Portal/benchmarks/foundation-governance/benchmark-charter.md`
- `01-QMS-Portal/benchmarks/foundation-governance/results/`
- `01-QMS-Portal/tools/benchmark/foundation-governance/seed_foundation_governance.sql`
- `01-QMS-Portal/tools/benchmark/foundation-governance/run_foundation_governance.py`

### Observability instrumentation to add

- route spans in `FoundationController` and `GovernanceController`
- command spans in slice command services
- projection worker spans in `ProjectionRefreshService`
- canonical outbox publish spans and dead-letter counters
- structured audit logs for decision, signature, attachment verification, policy denial, and projection rebuild

## Command-Event-Invariant Catalog

### OrganizationHierarchy

- Commands:
  - `registerOrganizationNode`
  - `amendOrganizationNode`
  - `reparentOrganizationNode`
  - `deactivateOrganizationNode`
- Validations:
  - parent node exists and is active
  - child node type is valid under the selected parent type
  - business code is unique inside the hierarchy
  - reparent target does not create a cycle
- Forbidden transitions:
  - deactivation while active children remain
  - reparent into inactive parent
  - direct delete
- Emitted events:
  - `foundation.organization.node_registered`
  - `foundation.organization.node_amended`
  - `foundation.organization.node_reparented`
  - `foundation.organization.node_deactivated`
- Idempotency rule:
  - `Idempotency-Key` required for internal writes; duplicate key with same payload returns prior result
- Concurrency rule:
  - `row_version` and `If-Match` semantics on internal updates; stale version returns conflict
- Projection consumers:
  - `organization` read-through only
- Audit and governed envelope:
  - org scope path, actor, source system, source record ID, correlation ID

### PartyProfile

- Commands:
  - `registerParty`
  - `amendPartyIdentity`
  - `assignPartyRole`
  - `registerPartySite`
  - `registerPartyContact`
- Validations:
  - `party_code` unique
  - scoped role uniqueness on `(party_id, role_code, scope_entity_name, scope_entity_id)`
  - primary site and primary contact uniqueness per party
  - effective dates do not overlap for exclusive scoped roles
- Forbidden transitions:
  - direct hard delete of party, site, contact, or role
  - silent overwrite of conflicting effective dates
- Emitted events:
  - `foundation.party.registered`
  - `foundation.party.identity_amended`
  - `foundation.party.role_assigned`
  - `foundation.party.site_registered`
  - `foundation.party.contact_registered`
- Idempotency rule:
  - create and role-assignment commands use caller-supplied idempotency keys
- Concurrency rule:
  - row-version required on mutable party identity and site/contact amendments
- Projection consumers:
  - `party` read-through only
- Audit and governed envelope:
  - subject party, scoped org path, lifecycle status, source system lineage

### CalendarSchedule

- Commands:
  - `registerCalendar`
  - `registerShift`
- Validations:
  - `calendar_code` unique
  - `(calendar_id, shift_code)` unique
  - same-calendar shift windows do not overlap unless explicitly modeled for handoff
  - `crosses_midnight` must align with start and end times
- Forbidden transitions:
  - public shift mutation in this slice
  - direct delete of calendar referenced by later operational scope
- Emitted events:
  - `foundation.calendar.registered`
  - `foundation.shift.registered`
- Idempotency rule:
  - duplicate shift create with same idempotency key is absorbed
- Concurrency rule:
  - row-version required for internal calendar amendments
- Projection consumers:
  - `calendar` read-through only
- Audit and governed envelope:
  - timezone, effective window, actor, org scope

### ApprovalGroup

- Commands:
  - `requestApproval`
  - `decideApprovalGroup`
- Validations:
  - target record exists and is inside caller org scope
  - self-approval is forbidden
  - required signature matrix satisfied for the chosen decision action
  - delegation target is valid and within the delegation window
  - governed record is not blocked by legal hold or capability block
- Forbidden transitions:
  - direct status mutation outside workflow bridge
  - approve or reject with stale `If-Match`
  - approve without required signature evidence
  - finalize using break-glass identity without after-action review marker
- Emitted events:
  - `foundation.approval.requested`
  - `foundation.approval.decision_recorded`
  - `foundation.electronic_signature.applied`
  - `foundation.approval.group_completed`
- Idempotency rule:
  - public decision command requires `Idempotency-Key`; same key and same payload are safe retries
- Concurrency rule:
  - `If-Match` is mandatory; stale version produces `etag_mismatch`
- Projection consumers:
  - `approval_queue`
  - `attachment_timeline`
- Audit and governed envelope:
  - action meaning, actor, requester, approver, record identity, record version, signature evidence, correlation ID

### AttachmentEvidence

- Commands:
  - `initiateAttachmentIntake`
  - `verifyAndBindAttachment`
  - `placeAttachmentOnHold`
  - `supersedeAttachment`
- Validations:
  - intake token is single-use, expiry-bounded, checksum-bound, target-bound
  - verification checksum matches uploaded content
  - bound record exists and is in-scope
  - hold and supersession authority checks pass
- Forbidden transitions:
  - in-place update of verified attachment content
  - direct delete of verified or held evidence
  - bind without token verification
- Emitted events:
  - `foundation.attachment.intake_initiated`
  - `foundation.attachment.verified`
  - `foundation.attachment.bound`
  - `foundation.attachment.hold_applied`
  - `foundation.attachment.superseded`
- Idempotency rule:
  - intake and verify commands are keyed by token plus `Idempotency-Key`
- Concurrency rule:
  - hold and supersede commands use row-version; verified evidence is immutable after bind
- Projection consumers:
  - `attachment_timeline`
  - `approval_queue` when evidence completeness affects action availability
- Audit and governed envelope:
  - checksum, MIME type, size, retention class, legal hold, source system, owner, bound target, supersession pointer

## Data Layer Design

| Slice area | Current evidence | Required hardening | Index and constraint plan | Archive / deletion strategy |
|---|---|---|---|---|
| OrganizationHierarchy | `072` has codes, names, status, timestamps only | add `row_version`, `effective_from`, `effective_to`, `source_system`, `source_record_id` | parent-child lookup indexes, active-path index, unique code retained | deactivate only; no hard delete |
| PartyProfile | `072` has unique `party_code`, scoped role uniqueness, site/contact tables | add `row_version`, `legal_name` optional alias handling, primary site/contact partial uniqueness, lineage fields | unique primary site/contact partial indexes, scoped role date overlap guard | deactivate or supersede only |
| CalendarSchedule | `072` has unique `calendar_code` and `(calendar_id, shift_code)` | add `row_version`, `updated_at`, effectivity columns for `as_of` | shift overlap exclusion or trigger, timezone query index | internal-only deactivation, no public delete |
| ApprovalGroup | `072` `approval` row is step-oriented and lacks requester, due, idempotency, and row-version fields | add `row_version`, `requested_by_party_id`, `required_signature_flag`, `decision_due_at`, `idempotency_key`, delegation window fields | entity lookup index, approver queue index, unique retry guard on idempotency | no delete; supersede or archive only |
| ElectronicSignature | `072` has actor, meaning, hash, provider, time, metadata only | add `entity_name`, `entity_id`, `record_row_version`, `action_code`, `retention_class`, `legal_hold_flag` | record identity lookup index, actor/time index | immutable after creation; no update or delete |
| AttachmentEvidence | `072` has target, type, file name, URI, checksum, created time only | add `mime_type`, `size_bytes`, `verification_state`, `verified_at`, `verified_by_party_id`, `retention_class`, `legal_hold_flag`, `superseded_by_attachment_id`, token binding fields, `row_version` | attachment target index, checksum index, hold-state index, supersession index | immutable after verify; hold or supersede only |
| Projection and async support | no canonical slice support tables present | create `domain_event_outbox`, `domain_event_inbox`, `approval_queue`, `attachment_timeline` | dedup unique key on CloudEvent ID, lag and rebuild indexes | projections rebuildable; outbox/inbox retained per policy |

- [ASSUMPTION] `approval_group_id` is exposed as the public identifier for a single `approval.approval_id` in this slice. This avoids inventing a new canonical business table while preserving the execution-package route contract.
- [FACT] No new canonical business aggregates beyond the execution package are introduced here. Only support tables for outbox, inbox, and read models are added.

## Command and Workflow Design

### Approval group workflow state machine

- States:
  - `requested`
  - `delegated`
  - `approved`
  - `rejected`
  - `held`
  - `superseded`
  - `archived`
- Public command surface:
  - `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
- Allowed decision codes:
  - `approve`
  - `reject`
  - `delegate`
- Guard rules:
  - `approve` and `reject` require `If-Match`
  - `approve` may require embedded signature evidence
  - `delegate` requires a valid delegate party and active delegation context
  - any decision fails with `bridge_not_ready` until the workflow bridge is active for this slice
- Side effects:
  - persist decision and signature atomically
  - write audit event
  - enqueue outbox event
  - refresh `approval_queue`
  - refresh `attachment_timeline` if evidence state changed

### Internal command service model

- `registerOrganizationNode`
  - synchronous write
  - transaction boundary: one hierarchy table row plus audit plus outbox
- `amendOrganizationNode`
  - requires row-version
  - no cross-aggregate writes
- `registerParty`, `assignPartyRole`, `registerPartySite`, `registerPartyContact`
  - one aggregate transaction per command
- `registerCalendar`, `registerShift`
  - one calendar aggregate transaction per command
- `requestApproval`
  - internal only
  - emits pending approval group and queue refresh
- `initiateAttachmentIntake`
  - returns short-lived token and secure upload instructions
- `verifyAndBindAttachment`
  - background or synchronous verification depending file size
  - creates immutable canonical evidence only after checksum and target match

## API Contract Design

### Common HTTP contract

- OpenAPI version: `3.1.1`
- JSON Schema version: `2020-12`
- Every non-2xx response uses `application/problem+json`
- List and timeline routes use opaque cursor pagination
- `ETag` is returned on mutable governance resources
- `If-Match` is required on `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
- `Idempotency-Key` is required on every write command in the slice
- Capability flags must return `supported`, `blocked`, or `not_applicable`

### Route contract matrix

| Route | Operation ID | Success | Key parameters or body | Problem types |
|---|---|---|---|---|
| `GET /api/v1/foundation/organizations` | `listOrganizations` | `200` | `cursor`, `limit`, `as_of`, `enterprise_id`, `company_id`, `site_id`, `plant_id`, `node_type`, `status_code`, `q` | `invalid_cursor`, `policy_denied` |
| `GET /api/v1/foundation/parties` | `listParties` | `200` | `cursor`, `limit`, `as_of`, `party_type`, `role_code`, `scope_entity_name`, `scope_entity_id`, `status_code`, `q` | `invalid_cursor`, `policy_denied` |
| `GET /api/v1/foundation/calendars` | `listCalendars` | `200` | `cursor`, `limit`, `as_of`, `calendar_code`, `status_code`, `include_shifts` | `invalid_cursor`, `policy_denied` |
| `GET /api/v1/governance/approval-groups` | `listApprovalGroups` | `200` | `cursor`, `limit`, `decision_state`, `requested_by`, `approver`, `company_id`, `site_id`, `plant_id`, `due_before`, `q` | `invalid_cursor`, `policy_denied`, `capability_blocked` |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}` | `getApprovalGroup` | `200` | path `approvalGroupId` | `resource_not_found`, `policy_denied` |
| `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide` | `decideApprovalGroup` | `200` | path `approvalGroupId`, headers `If-Match`, `Idempotency-Key`, body `ApprovalDecisionCommand` | `precondition_required`, `etag_mismatch`, `validation_failed`, `policy_denied`, `self_approval_forbidden`, `signature_required`, `invalid_state_transition`, `bridge_not_ready`, `legal_hold_active`, `capability_blocked`, `resource_not_found` |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline` | `listApprovalTimeline` | `200` | `cursor`, `limit`, `kinds`, `since` | `invalid_cursor`, `resource_not_found`, `policy_denied` |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments` | `listApprovalAttachments` | `200` | `cursor`, `limit`, `verification_state`, `hold_state` | `invalid_cursor`, `resource_not_found`, `policy_denied` |
| `GET /api/v1/governance/attachments/{attachmentId}` | `getAttachment` | `200` | path `attachmentId`, optional `download=false` | `resource_not_found`, `policy_denied`, `legal_hold_active` |
| `POST /api/v1/governance/attachments` | `initiateAttachmentIntake` | `201` | header `Idempotency-Key`, body `AttachmentIntakeCommand` | `validation_failed`, `policy_denied`, `evidence_missing`, `capability_blocked` |

### Required problem types

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

### Versioning and deprecation policy

- Path version is `v1` for the slice.
- Additive request or response fields increment schema minor version only.
- Breaking changes require a new path or media version plus Prompt 04 approval.
- Minimum deprecation window: `90 days` after successor publication.
- Consumer pinning: metadata, OpenAPI, JSON Schema, AsyncAPI, and workflow contracts pin by exact artifact version in `registry-manifest.json`.

## Event and Integration Design

### CloudEvents-style envelope

- Required envelope fields:
  - `id`
  - `source`
  - `specversion`
  - `type`
  - `subject`
  - `time`
  - `datacontenttype`
  - `dataschema`
  - `data`
- Required extension attributes:
  - `enterpriseid`
  - `companyid`
  - `siteid`
  - `plantid`
  - `actorpartyid`
  - `rolecodes`
  - `sourcesystem`
  - `sourcerecordid`
  - `correlationid`
  - `causationid`
  - `idempotencykey`
  - `offline_sync_state`
  - `retention_class`
  - `legal_hold_state`

### Channel model

- `foundation.organization.events`
- `foundation.party.events`
- `foundation.calendar.events`
- `foundation.approval.events`
- `foundation.attachment.events`

### Async operating rules

- Outbox ownership:
  - command service transaction writes business row, audit row, and `domain_event_outbox` row atomically
- Inbox deduplication:
  - unique on CloudEvent `id`; duplicate event is acknowledged and skipped
- Replay procedure:
  - replay by channel and bounded aggregate ID range
  - projections rebuild from canonical write tables plus outbox history
- Ordering assumptions:
  - guaranteed only inside aggregate scope (`approval_id`, `attachment_id`, organization node ID, party ID, calendar ID)
- Backoff:
  - exponential retry with jitter
- Poison handling:
  - after configured retries move to dead-letter state with operator-visible diagnostics
- Current blocker:
  - compatibility `outbox_events` does not satisfy canonical async proof and earns no promotion credit

## Metadata Contract Design

| Entity | Required list contract | Required detail contract | Required actions and blocked states | Timeline and attachment semantics |
|---|---|---|---|---|
| `organization` | code, name, type, parent, active state, scope path, effective window | hierarchy section, parent chain, active children summary, provenance section | no public write actions; expose internal-only or blocked states explicitly | no dedicated timeline route in slice; show creation and amendment history in detail metadata only |
| `party` | code, display name, type, primary role, primary site/contact, scope path | identity, roles, sites, contacts, governance sections | no public write actions; blocked states for missing role or inactivation | related lists for roles, sites, contacts; attachment slot `not_applicable` |
| `calendar` | code, name, timezone, active state, shift summary | overview, shift summary, blocked shift mutation section | public shift mutation blocked; metadata must emit blocked reason | timeline `not_applicable`; attachments `not_applicable` |
| `approval_group` | requester, approver, due state, age, decision state, signature requirement, escalation state | decision panel, signature state, requester/approver, evidence summary, blocked capability panel | `decide` supported when policy and state allow; `delegate` exposed through decision payload only; blocked states explicit | timeline is required; attachments are required and immutable-only |
| `attachment` | file name, type, checksum, verification state, hold state, retention class | evidence identity, storage metadata, supersession chain, legal hold section | no update or delete actions; `hold` and `supersede` internal only unless later promoted | timeline includes intake, verify, bind, hold, supersede events |

- [FACT] Current frontend catalog does not yet contain exact slice entity keys. Metadata publication for this slice is new build work, not a runtime reality.

## Projection Design

| Surface | Class | Owner | Source commands or events | Lag budget | Refresh trigger | Rebuild procedure | Stale-read behavior | Promotion criteria |
|---|---|---|---|---|---|---|---|---|
| `organization` | read-through | `OrganizationHierarchyQueryService` | direct query over canonical tables | `0 s` | N/A | query canonical tables only | no stale header; transactional read | route parity and pagination tests pass |
| `party` | read-through | `PartyProfileQueryService` | direct query over canonical tables | `0 s` | N/A | query canonical tables only | no stale header; transactional read | route parity and scoped-filter tests pass |
| `calendar` | read-through | `CalendarScheduleService` | direct query over canonical tables | `0 s` | N/A | query canonical tables only | no stale header; transactional read | route parity and shift summary tests pass |
| `approval_queue` | operational projection | `ProjectionRefreshService` | `approval.requested`, `approval.decision_recorded`, `approval.group_completed`, attachment events affecting evidence completeness | `p95 <= 5 s` | outbox event consumption | truncate and rebuild from `approval` plus evidence state | stale reads allowed for queue browse only; decision command always checks write truth | lag, rebuild, and stale-read tests pass |
| `attachment_timeline` | operational projection | `ProjectionRefreshService` | attachment and approval events | `p95 <= 5 s` | outbox event consumption | rebuild from attachment and approval event history | stale reads allowed for timeline read only; hold and supersession must still reflect write truth on mutation | lag, timeline ordering, and rebuild tests pass |

## Security and Governance Design

- Authentication order:
  1. validate OIDC issuer, audience, subject, expiry, issued-at, and nonce
  2. resolve roles from verified identity only
  3. evaluate ABAC with org scope, object state, ownership, classification, and environment
  4. enforce at gateway, application service, and worker boundaries
- Segregation of duties:
  - requester cannot approve own governed request
  - delegated approver must act inside a valid time window and scope subset
  - break-glass cannot finalize regulated approval without after-action review evidence
  - evidence uploader cannot modify verified evidence in place
- Governance rules:
  - signed or verified governed records are immutable
  - correction is by supersession, hold, or later governed disposition only
  - retention class and legal hold apply to `approval`, `electronic_signature`, and `attachment`
- Redaction:
  - list endpoints may mask email, phone, tax registration, or storage URI unless caller holds privileged capability
- Conflict behavior:
  - stale writes fail explicitly with conflict; no silent merge or last-write-wins

## Policy Architecture

### Subject attributes

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
- `auth_strength`

### Object attributes

- `resource_type`
- `resource_id`
- `entity_name`
- `record_status`
- `approval_mode`
- `signature_required`
- `retention_class`
- `legal_hold_state`
- `org_scope_path`
- `requester_party_id`
- `owner_party_id`

### Action attributes

- `action_code`
- `command_name`
- `http_method`
- `capability`
- `requires_if_match`
- `requires_signature`

### Environment attributes

- `request_time`
- `client_type`
- `network_zone`
- `device_assurance`
- `correlation_id`
- `channel`
- `offline_sync_state`

### PDP and PEP boundaries

- PDP:
  - policy evaluation service inside application layer
- PEP:
  - `AuthMiddleware` and router for entry checks
  - slice command services for business authorization
  - outbox, projection, and replay workers for asynchronous enforcement

### Service identity rules

- service-to-service calls must use workload identity with audience and scope validation
- worker identities may publish or project only the channels and entities explicitly assigned to them

### Delegation and substitution behavior

- delegation grant must include granter, delegate, scope, valid-from, valid-to, and grant reason
- substitution does not override self-approval prohibition

### Field masking behavior

- mask `tax_registration_no`, `email_address`, `phone_number`, and attachment storage internals unless caller has explicit capability

## Benchmark Charter and Proof Matrix

### Benchmark charter

- Dataset floor:
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
- Traffic mix:
  - `55%` list and detail reads
  - `20%` approval queue and timeline reads
  - `10%` approval decision writes
  - `10%` attachment intake and retrieval
  - `5%` verification, projection, and replay workers
- Concurrency profile:
  - `120` concurrent read clients
  - `25` concurrent decision writers
  - `10` concurrent attachment verifiers
  - `5` concurrent projection or replay workers
- Required latency targets:
  - list and detail reads: `p50 <= 120 ms`, `p95 <= 300 ms`, `p99 <= 700 ms`
  - approval decision: `p50 <= 250 ms`, `p95 <= 500 ms`, `p99 <= 1200 ms`
  - attachment intake orchestration: `p50 <= 150 ms`, `p95 <= 400 ms`, `p99 <= 800 ms`
  - verification-to-bind completion: `p50 <= 2 s`, `p95 <= 5 s`, `p99 <= 8 s`
- Lag budgets:
  - `approval_queue p95 <= 5 s`
  - `attachment_timeline p95 <= 5 s`
- Rebuild thresholds:
  - `approval_queue` full rebuild `<= 15 min`
  - `attachment_timeline` full rebuild `<= 20 min`
- Route overlap target:
  - `10/10` public slice routes represented in the benchmark harness before publish
- Soak duration:
  - `60 minutes`
- Failure budget:
  - `<= 0.1%` 5xx responses
  - `0` lost or duplicate decision effects under idempotent retries

### Proof matrix

| Evidence line | Pass condition | Current state |
|---|---|---|
| OpenAPI authority | `foundation-governance-v1.yaml` published and lint-clean | open |
| JSON Schema authority | every public request and response schema published | open |
| Problem detail parity | RFC 9457 types, examples, and contract tests pass | open |
| Concurrency proof | ETag and `If-Match` behavior proven | open |
| Workflow bridge proof | approve, reject, delegate, stale version, self-approval, signature-required, and bridge-blocked tests pass | blocked |
| Evidence immutability proof | verify, bind, hold, supersede, and no-update-after-verify tests pass | open |
| Slice onboarding proof | exact entity metadata and endpoint catalog rows exist | blocked |
| Projection proof | owner, lag, rebuild, stale-read, replay, and dead-letter behavior proven | blocked |
| OTel proof | route and worker telemetry published with required attributes | open |
| Benchmark proof | nonzero route overlap and thresholds pass | blocked |

## Observability and Benchmark Hooks

### Required traces

- HTTP entry span per public slice route
- command span per internal write command
- workflow bridge transition span
- outbox publish span
- projection update span
- attachment verification span

### Required metrics

- request count and error count by route and problem type
- latency histogram per route
- `foundation_approval_conflict_total`
- `foundation_attachment_verify_total`
- `foundation_attachment_verify_failure_total`
- `foundation_projection_lag_seconds`
- `foundation_dead_letter_total`
- `foundation_policy_denial_total`

### Required structured logs

- approval decision audit log
- signature application audit log
- attachment verification log
- policy denial log
- projection rebuild log

### Benchmark hooks

- slice-specific seed SQL under `tools/benchmark/foundation-governance/`
- route runner that hits all 10 public slice routes
- contention scenario for concurrent `:decide` calls
- projection rebuild timing capture
- OTel export snapshot stored with benchmark results

- [FACT] The repository currently contains only generic benchmark scripts under `tools/benchmark/`; no slice-specific benchmark harness exists yet.

## Test Strategy and Rollout Gate

### Test strategy

- Contract tests:
  - OpenAPI lint
  - JSON Schema validation
  - problem-details example parity
- Integration tests:
  - row-version conflicts
  - idempotent retries
  - self-approval denial
  - signature-required denial
  - attachment verification and immutability
  - hold and supersession behavior
- Metadata tests:
  - slice entities emitted with correct capability states
  - blocked states exposed and unsupported actions hidden
- Projection tests:
  - lag budget
  - rebuild correctness
  - stale-read headers
  - replay and dead-letter visibility
- Benchmark tests:
  - read mix
  - hot-update contention
  - long soak

### Gate result

- Build-start gates: `PASS`
- Build-complete gates: `OPEN`
- Publish gates: `BLOCKED`

### Exact blockers before build-complete can close

- split contract truth remains unresolved
- slice DDL hardening not implemented
- workflow bridge remains zero-ready
- metadata and registry slice onboarding remain absent
- canonical outbox/inbox and projection proof remain absent
- OTel contract not published
- slice tests not implemented

## Negative Scope and Blocked Scope

### Negative scope

- no standalone public `electronic_signature` create, list, detail, update, or delete route
- no standalone public `approval` CRUD route
- no public `shift` route in this slice
- no planning board, dispatch board, MES operator console, genealogy, inventory, cost, finance, or eQMS case publication
- no compatibility endpoint promotion into canonical contracts
- no dangerous approximation of unsupported capability as `temporary`

### Blocked scope

- publishability remains blocked while `publishability_ready = false`
- workflow bridge remains blocked while slice bridge-ready count is zero
- metadata publication remains blocked while exact slice entity and route matches are zero
- async readiness remains blocked until canonical outbox/inbox exists
- shipment-grade genealogy remains unsupported and receives no proof credit in this slice

## Execution Playbook Trace

1. Imported execution package and froze the slice boundary.
2. Reconciled live metrics against stale narratives and rejected stale counts.
3. Compared execution-package target truth against current DDL, OpenAPI, registry, tests, and benchmark assets.
4. Froze one first delivery slice with exact routes, aggregates, events, projections, metadata packs, and release gates.
5. Converted aggregate rules into implementation-facing commands, invariants, and policy boundaries.
6. Converted contract-first requirements into an artifact manifest and proof matrix.
7. Carried forward only slice-owned sync requests and blocked everything else fail-closed.
8. Stopped at Prompt 02 completion without switching to Prompt 03 or Prompt 04.

## Prompt QA Checklist Result

### Passed

- execution package used as authoritative slice boundary
- contracts were made explicit before any implementation planning
- OpenAPI, JSON Schema, and `application/problem+json` are explicit
- OIDC, RBAC, and ABAC ordering is explicit
- idempotency and optimistic concurrency behavior are explicit
- one exact first delivery slice is defined
- artifact manifest is build-team assignable
- command-event-invariant catalog exists
- policy architecture is explicit
- benchmark charter and projection freshness rules are explicit
- unsupported capability is marked unsupported instead of approximated
- six-reviewer synthesis is explicit

### Open or blocked

- workflow bridge proof is blocked
- slice metadata onboarding is blocked
- DDL hardening is not implemented
- canonical async proof is absent
- OTel proof is absent
- benchmark proof is absent
- Prompt 03 re-audit is pending

### Result

- `REVIEW REQUIRED`

## Prompt 02 Final Package for Prompt 04

- Frozen decision:
  - keep the next loop on `Foundation Governance Contract Slice`
  - keep overall status at `BUILD READY / PUBLISH BLOCKED`
- Frozen authority:
  - execution package wins over older broader Prompt 02 narrative
  - live metrics block wins over stale blueprint counts
  - canonical `/api/v1` route matrix is the only public contract target for this slice
- Frozen non-authorizations:
  - no merge approval
  - no publish approval
  - no rollout approval
  - no claim that workflow or metadata publication is ready
- Frozen blockers for Prompt 04:
  - contract authority split between compatibility OpenAPI and slice target OpenAPI
  - bridge-ready count remains zero
  - governed evidence hardening not encoded in DDL
  - slice entity and route publication still absent from live catalogs
  - async, OTel, and benchmark evidence not yet published

## Cross-Bundle Sync Requests for Prompt 04

### With Prompt 01

- ratify the `90 day` minimum deprecation window or replace it with the architecture-approved value
- ratify whether org-node effectivity belongs on canonical foundation tables or on a later temporal support layer
- ratify long-term `approval_group` naming once multi-step approval chains are introduced later

### With Prompt 03

- re-audit OpenAPI, schema, and problem-detail publication
- re-audit DDL hardening for row-version, evidence immutability, retention, and legal hold
- re-audit workflow bridge activation and self-approval controls
- re-audit projection freshness, replay, dead-letter, and stale-read behavior
- re-audit OTel attributes and benchmark overlap for supported slice routes

### With Prompt 04 only

- preserve execution-package scope discipline
- do not reintroduce standalone signature publication
- keep compatibility endpoints and catalogs out of canonical proof
- keep shipment genealogy unsupported until a later slice closes it explicitly
- do not upgrade the slice past `REVIEW REQUIRED` while any publish gate remains blocked

## Six-Reviewer Review Synthesis

- `implementation-architecture` required the final package to align every section to the execution package and to make the contract-authority split explicit instead of assuming `api/openapi.yaml` could stand in for canonical publication.
- `erp-implementation` required `as_of` semantics, scoped party-role uniqueness, primary site/contact rules, and explicit organization and party lineage fields.
- `mes-implementation` required a hard statement that operational projections never become decision authority and that no MES execution or genealogy scope leaks into this slice.
- `eqms-implementation` required meaning-bound signatures, immutable evidence after verification, legal-hold rules, self-approval prohibition, and correction-by-supersession wording.
- `platform-implementation` required canonical outbox/inbox support to be treated as missing work, not implied by compatibility `outbox_events`, and required OTel plus benchmark hooks to be named explicitly.
- `delivery-red-team` forced stale metric rejection, exact zero-match evidence for canonical routes and slice entities, and a fail-closed terminal verdict of `REVIEW REQUIRED`.

## Terminal Clause

Prompt 02 is complete for this execution-package-first run. The slice is implementation-grade and build-team assignable, but it remains `BUILD READY / PUBLISH BLOCKED` until the named build-complete and publish gates are closed with code, tests, telemetry, benchmark evidence, and re-audit.

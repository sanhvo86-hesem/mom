# Prompt 02 Closure Package: Foundation Governance Contract Slice

Date: 2026-04-06
Status: REVIEW REQUIRED
Scope lock: This closure pass stays inside the already-frozen `Foundation Governance Contract Slice`. It does not reopen Prompt 01 architecture, slice selection, Prompt 03 audit scope, or whole-program planning.

Reviewer protocol note: the six reviewer roles were emulated sequentially in this environment; no real sub-agents were used.

Authoritative source order for this closure package:
1. `execution-package-foundation-governance-contract-slice-2026-04-06.md`
2. `execution-package-build-publish-gates-2026-04-06.md`
3. `execution-package-implementation-backlog-2026-04-06.md`
4. `prompt-02-backend-implementation-final-package-2026-04-06.md`
5. Live codebase evidence from `api/`, `database/migrations/072_canonical_foundation_governance.sql`, and the registry JSON assets
6. `registry-quality-report.json` as evidence only, never as contract authority

## 1. Live Metrics Block

| Metric | Live value | Evidence | Closure meaning |
| --- | --- | --- | --- |
| `workflow_engine_bridge_ready` | `0` | `qms-data/registry/registry-quality-report.json` | Generic workflow bridging is not publication-ready for approval decisions. |
| `workflow_engine_bridge_blocked` | `115` | `qms-data/registry/registry-quality-report.json` | The repo still treats workflow bridging as materially blocked. |
| `frontend_ready_entities` | `330` | `qms-data/registry/registry-quality-report.json` | This is a global registry metric, not slice onboarding proof. |
| `frontend_partial_entities` | `198` | `qms-data/registry/registry-quality-report.json` | A large portion of registry coverage still needs closure work. |
| `publishability_ready` | `false` | `qms-data/registry/registry-quality-report.json` | The bundle cannot be called publication-ready yet. |
| `publishability_review_required_entities` | `198` | `qms-data/registry/registry-quality-report.json` | Review-required registry debt is still live. |
| Canonical public route matches in `api/openapi.yaml` | `0` | repo scan | None of the frozen `/api/v1/foundation/*` or `/api/v1/governance/*` paths exist yet. |
| Canonical public route matches in `api/Router.php` | `0` | repo scan | Router wiring is still absent for the slice public surface. |
| Canonical public route matches in `api/index.php` | `0` | repo scan | The entrypoint has no registration for the frozen slice REST routes. |
| Canonical registry entity keys present | `0 / 5` | `frontend-foundation-catalog.json` | `foundation.organization`, `foundation.party`, `foundation.calendar`, `governance.approval_group`, and `governance.attachment` are all still missing. |
| Canonical public endpoint keys present | `0 / 10` | registry scan | None of the ten frozen public endpoint keys are onboarded yet. |
| Slice orphan tables still unmapped in schema audit | `10` | `docs/schema-field-audit-full.json` | `approval`, `attachment`, `calendar`, `party`, `party_role`, `party_site`, `party_contact`, `reason_code`, `status_code`, and `electronic_signature` still lack full registry/onboarding closure. |
| Verified slice-critical field definitions still missing | `17+` | `docs/schema-field-audit-full.json` | Fields such as `base_timezone`, `decision_code`, `decided_at`, `comment_text`, `storage_uri`, and `signature_status` still need registry field metadata. |
| Evidence controller/service compatibility | `broken` | `api/controllers/EvidenceController.php`, `api/services/EvidenceVaultService.php` | Governance attachment reuse is unsafe until the controller/service signature mismatch is repaired. |

## 2. Closure Findings

| Reviewer role | Disposition | Finding | Closure decision |
| --- | --- | --- | --- |
| `codebase-fit-architect` | Conditional approve | The repo already supports mixed REST and legacy action routing, but the frozen slice public routes do not exist anywhere in the router or OpenAPI document. | Public slice endpoints must be added as REST routes in `api/index.php` and `api/Router.php`. Internal/admin commands remain legacy Router action keys because that is the repo-native fit for non-published command flows. |
| `api-contract-hardener` | Conditional approve | Existing `BaseController` and `GenericCrudController` success/error envelopes are compatibility-oriented and do not satisfy a publication-grade contract. `GenericCrudController` also emits weak ETags (`W/"rv-n"`), which is not sufficient for canonical `If-Match` semantics. | The frozen slice must use a new success envelope (`data`, `pageInfo`) and RFC 9457 `application/problem+json` errors. Strong ETags are mandatory for published write concurrency. Compatibility helpers remain donors only. |
| `workflow-evidence-hardener` | Blocker | `GenericCrudService` explicitly blocks persisted lifecycle transitions until a workflow-engine bridge exists, and the current evidence path is broken by controller/service signature mismatches. | Approval decisions must go through a dedicated `ApprovalGroupService` bridge, not through generic runtime transitions. Attachment endpoints may reuse `EvidenceVaultService` only after a repair pass aligns method signatures and custody helpers. |
| `metadata-registry-hardener` | Conditional approve | Donor rows exist for `org_companies`, `org_legal_entities`, `org_plants`, and `file_attachments`, but no canonical registry rows exist for the frozen public slice entities or endpoints. | Add five new canonical entity rows, ten canonical public endpoint keys, and the new pack families listed in Section 8. Donor rows stay in place but must be treated as compatibility donors, not public contract authority. |
| `observability-benchmark-hardener` | Conditional approve | The repo already has smoke-test and benchmark roots, but no slice-specific contract smoke or benchmark scenario exists. | Reuse `tests/` and `tools/benchmark/` roots. Add `tests/foundation_governance_contract_smoke.php` and `tools/benchmark/foundation_governance_contract_read_mix.sql`; extend `run_runtime_benchmark.py` rather than creating a new benchmark harness root. |
| `delivery-red-team` | Reject PASS | The repo still has `0` canonical public routes, `0 / 5` entity keys, `workflow_engine_bridge_ready = 0`, broken attachment reuse, and no authoritative historical grouping key for `approval_group_id` backfill. | The closure package is implementation-grade, but the bundle must stay `REVIEW REQUIRED` until the backfill policy for legacy approval grouping is explicitly approved and tranche-1 implementation lands cleanly. |

Contradictions logged in favor of the execution package:
1. Existing `master_data_governance.org_companies`, `master_data_governance.org_legal_entities`, and `master_data_governance.org_plants` registry rows are ready compatibility donors only. They do not satisfy the frozen public routes for `foundation.organization`.
2. Existing `GenericCrudController` weak ETag behavior is a compatibility donor only. It does not define the canonical slice contract.
3. Global frontend readiness counts (`330 ready`, `198 partial`) do not prove slice onboarding. Live canonical entity keys are still `0 / 5`.
4. Any implied readiness of the evidence stack is contradicted by the live `EvidenceController` to `EvidenceVaultService` signature mismatch.

## 3. Codebase-Fit Reuse Matrix

| Artifact | Current role | Reuse decision | Required delta |
| --- | --- | --- | --- |
| `api/Router.php` | Native REST and `?action=` route registry | Reuse and extend | Register the ten frozen public REST routes. Keep internal/admin commands as explicit action keys. |
| `api/index.php` | Central router/bootstrap wiring | Reuse and extend | Import the new controller/service owners and register the public REST routes plus the frozen internal action keys. |
| `api/controllers/MasterDataController.php` | Existing master-data controller surface | Reuse and extend | Add canonical DB-backed list methods for `organizations`, `parties`, and `calendars`, plus the frozen internal master-data command handlers. Do not route canonical reads through file-backed generic methods. |
| `api/controllers/EvidenceController.php` | Existing evidence endpoints | Repair then extend | First align service calls with the actual `EvidenceVaultService` method signatures. Then add governance attachment detail/create/list wiring. |
| `api/controllers/RegistryController.php` | Registry exposure/admin surface | Keep as donor, not route owner | No new public slice route ownership. Registry JSON assets remain the mirror that this controller can expose as-is. |
| `api/services/WorkflowEngine.php` | Existing workflow engine integration | Reuse behind an adapter only | Never expose it directly from the router for this slice. Invoke it only through `ApprovalGroupService` once decision preconditions are satisfied. |
| `api/services/EvidenceVaultService.php` | Evidence storage and custody helper | Repair then extend | Align method signatures with controller usage, keep checksum/custody helpers, and add canonical attachment metadata helper methods. |
| `api/services/AuditTrail.php` | Immutable audit/event helper | Reuse | Record approval decision and attachment custody events. Do not create a second audit sink. |
| `api/services/OutboxWorker.php` | Existing outbox processing | Do not reuse for canonical slice | This worker is not the contract authority for governance approval publication and should not own approval-group delivery semantics. |
| `api/services/RegistryService.php` | Registry asset support | Reuse as derived-mirror support only | Keep it as the service that exposes registry files after the JSON assets are updated. It is not the contract source of truth. |
| `api/controllers/GenericCrudController.php` | Compatibility CRUD runtime | Donor only | Reuse parsing ideas for `If-Match` and row-version handling, but do not publish its response envelope, weak ETag policy, or generic transition semantics as the slice contract. |
| `api/services/GenericCrudService.php` | Generic CRUD and workflow transition runtime | Donor only | Do not route approval decisions or canonical public reads through this service. Its workflow bridge gate is still explicitly blocked. |
| `api/services/FoundationGovernanceService.php` | Does not exist | New, justified | New DB-backed read/query service is justified because current master-data services are not the canonical 072-backed read layer for the frozen slice. |
| `api/services/ApprovalGroupService.php` | Does not exist | New, justified | New orchestration service is justified because no existing service owns approval-group aggregation, snapshot ETag generation, or decision bridge enforcement. |
| `api/controllers/ApprovalGroupController.php` | Does not exist | New, justified | New narrow controller is justified because approval-group list/detail/decide/timeline does not fit cleanly inside `MasterDataController` or `EvidenceController`. |
| `database/migrations/079_foundation_governance_contract_hardening.sql` | Does not exist | New, justified | New migration is required because historical migration `072` must not be edited. The closure delta adds concurrency, attachment, and public-identity hardening. |
| `tests/` root | Existing backend smoke coverage | Reuse | Add one new slice-specific smoke file rather than a new test root. |
| `tools/benchmark/` root | Existing benchmark harness and SQL scripts | Reuse | Add one new slice benchmark SQL file beside the existing scripts and extend the current Python harness. |

## 4. Contract-Authority Closure Plan

Contract authority is closed with the following precedence and implementation rules:

1. The execution package defines the frozen slice boundary and wins over any older bundle narrative.
2. This closure package is the decision log for the remaining Prompt 02 hardening gaps. It is not a substitute for the code contract, but it does resolve the contract choices that were still ambiguous.
3. `api/openapi.yaml` becomes the canonical machine-readable authority for the ten published public REST endpoints in this slice and must be upgraded from `openapi: 3.1.0` to `openapi: 3.1.1`.
4. `api/index.php` plus `api/Router.php` become the canonical execution authority for route registration. They must match the OpenAPI path list one-for-one for the public surface.
5. Internal/admin commands remain unpublished Router action keys because the current codebase already supports action routing and the execution package freezes command names rather than public admin paths.
6. Controller and service implementations are subordinate to the public contract. If controller helper behavior conflicts with the published contract, the helper must be bypassed or extended.
7. Registry JSON assets are derived mirrors. They must reflect the canonical entity keys, endpoint keys, pack IDs, and blocked-capability rows decided here, but they do not override the OpenAPI contract.
8. `registry-quality-report.json` is evidence only. It can block publication, but it cannot redefine the contract.

Internal/admin command authority for this slice:

| Frozen command key | Route style | Owner |
| --- | --- | --- |
| `registerOrganizationNode` | Router action key | `MasterDataController` |
| `amendOrganizationNode` | Router action key | `MasterDataController` |
| `reparentOrganizationNode` | Router action key | `MasterDataController` |
| `deactivateOrganizationNode` | Router action key | `MasterDataController` |
| `registerParty` | Router action key | `MasterDataController` |
| `amendPartyIdentity` | Router action key | `MasterDataController` |
| `assignPartyRole` | Router action key | `MasterDataController` |
| `registerPartySite` | Router action key | `MasterDataController` |
| `registerPartyContact` | Router action key | `MasterDataController` |
| `registerCalendar` | Router action key | `MasterDataController` |
| `registerShift` | Router action key | `MasterDataController` |
| `requestApproval` | Router action key | `ApprovalGroupController` |

## 5. Exact Wire Contract Delta

Canonical public success contract:
- List endpoints return `200 application/json` with top-level shape `{ "data": [...], "pageInfo": { ... } }`.
- Detail endpoints return `200 application/json` with top-level shape `{ "data": { ... } }`.
- `POST /api/v1/governance/attachments` returns `201 application/json` with `Location` and `ETag` headers.
- Published public slice endpoints must not use the legacy `ok/server_time` envelope.

Canonical security schemes for `api/openapi.yaml`:

```yaml
openapi: 3.1.1
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: PHPSESSID
      description: Session-authenticated portal user.
    csrfHeader:
      type: apiKey
      in: header
      name: X-CSRF-Token
      description: Required together with sessionCookie on every state-changing slice operation.
```

Security policy:
- Read routes require `sessionCookie`.
- Write routes require `sessionCookie` and `csrfHeader` in the same OpenAPI security requirement object.
- Do not publish a bearer or OIDC security scheme in this slice because `AuthMiddleware` does not implement bearer-token validation.

Frozen public routes and exact wire ownership:

| Method and path | OperationId | Controller owner | Security | Success schema | ETag / precondition rules |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/foundation/organizations` | `listFoundationOrganizations` | `MasterDataController` via `FoundationGovernanceService` | `sessionCookie` | `OrganizationConnection` | No `If-Match`. Response body only. |
| `GET /api/v1/foundation/parties` | `listFoundationParties` | `MasterDataController` via `FoundationGovernanceService` | `sessionCookie` | `PartyConnection` | No `If-Match`. Response body only. |
| `GET /api/v1/foundation/calendars` | `listFoundationCalendars` | `MasterDataController` via `FoundationGovernanceService` | `sessionCookie` | `CalendarConnection` | No `If-Match`. Response body only. |
| `GET /api/v1/governance/approval-groups` | `listApprovalGroups` | `ApprovalGroupController` via `ApprovalGroupService` | `sessionCookie` | `ApprovalGroupConnection` | No `If-Match`. Response body only. |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}` | `getApprovalGroup` | `ApprovalGroupController` via `ApprovalGroupService` | `sessionCookie` | `ApprovalGroupEnvelope` | Must emit a strong `ETag` header for the approval-group snapshot. |
| `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide` | `decideApprovalGroup` | `ApprovalGroupController` via `ApprovalGroupService` | `sessionCookie` + `csrfHeader` | `ApprovalDecisionResultEnvelope` | `If-Match` required. Missing -> `428`; invalid syntax -> `400`; mismatch -> `412`; invalid transition -> `409`. |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline` | `listApprovalGroupTimeline` | `ApprovalGroupController` via `ApprovalGroupService` | `sessionCookie` | `ApprovalTimelineConnection` | Should emit the same strong `ETag` as group detail if the timeline is derived from the same snapshot. |
| `GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments` | `listApprovalGroupAttachments` | `EvidenceController` via repaired `EvidenceVaultService` | `sessionCookie` | `AttachmentConnection` | No `If-Match`. Attachment list is read-only. |
| `GET /api/v1/governance/attachments/{attachmentId}` | `getGovernanceAttachment` | `EvidenceController` via repaired `EvidenceVaultService` | `sessionCookie` | `AttachmentEnvelope` | Must emit a strong `ETag` based on attachment row representation. |
| `POST /api/v1/governance/attachments` | `createGovernanceAttachment` | `EvidenceController` via repaired `EvidenceVaultService` | `sessionCookie` + `csrfHeader` | `AttachmentEnvelope` | Creation does not require `If-Match`, but returns `409` when the target approval group no longer accepts attachments. |

Canonical request and response details:

### `GET /api/v1/foundation/organizations`

Query parameters:
- `limit`: integer, min `1`, max `100`, default `50`
- `cursor`: opaque base64url cursor from a prior `pageInfo.endCursor`
- `organizationType`: enum `enterprise | company | site | plant | warehouse | work_center | work_unit`
- `parentOrganizationId`: typed public alias string
- `statusCode`: string
- `search`: string

Response item schema:
- `organizationId`: string, pattern `^(enterprise|company|site|plant|warehouse|work_center|work_unit):[A-Za-z0-9-]+$`
- `organizationType`: same enum as above
- `organizationCode`: string
- `organizationName`: string
- `parentOrganizationId`: string or `null`
- `statusCode`: string
- `baseTimezone`: string or `null`
- `updatedAt`: RFC 3339 timestamp
- `rowVersion`: integer

Sort order:
- primary `organizationType asc`
- secondary `organizationCode asc`
- tie-breaker `organizationId asc`

Public identity rule:
- `organizationId` is a typed public alias composed from the subtype plus the subtype-native immutable row identifier. No new standalone `organization` table is introduced in this slice.

### `GET /api/v1/foundation/parties`

Query parameters:
- `limit`
- `cursor`
- `partyType`: string
- `roleCode`: string
- `statusCode`: string
- `search`: string

Response item schema:
- `partyId`: UUID string
- `partyType`: string
- `displayName`: string
- `statusCode`: string
- `primaryEmail`: string or `null`
- `primaryPhone`: string or `null`
- `updatedAt`: RFC 3339 timestamp
- `rowVersion`: integer

Sort order:
- primary `displayName asc`
- tie-breaker `partyId asc`

### `GET /api/v1/foundation/calendars`

Query parameters:
- `limit`
- `cursor`
- `statusCode`: string
- `baseTimezone`: string
- `search`: string

Response item schema:
- `calendarId`: UUID string
- `calendarCode`: string
- `calendarName`: string
- `baseTimezone`: string
- `statusCode`: string
- `shiftCount`: integer
- `updatedAt`: RFC 3339 timestamp
- `rowVersion`: integer

Sort order:
- primary `calendarCode asc`
- tie-breaker `calendarId asc`

### `GET /api/v1/governance/approval-groups`

Query parameters:
- `limit`
- `cursor`
- `entityName`: string
- `entityId`: string
- `statusCode`: string
- `approverPartyId`: UUID string
- `decisionCode`: string

Response item schema:
- `approvalGroupId`: UUID string
- `entityName`: string
- `entityId`: string
- `statusCode`: string
- `decisionCode`: string or `null`
- `requestedAt`: RFC 3339 timestamp
- `requestedByPartyId`: UUID string or `null`
- `decidedAt`: RFC 3339 timestamp or `null`
- `currentStepCode`: string or `null`
- `etag`: string

Sort order:
- primary `requestedAt desc`
- tie-breaker `approvalGroupId desc`

### `GET /api/v1/governance/approval-groups/{approvalGroupId}`

Response body schema:
- `approvalGroupId`: UUID string
- `entityName`: string
- `entityId`: string
- `statusCode`: string
- `decisionCode`: string or `null`
- `requestedAt`: RFC 3339 timestamp
- `requestedByPartyId`: UUID string or `null`
- `decidedAt`: RFC 3339 timestamp or `null`
- `steps`: array of:
  - `approvalId`: internal identifier string, optional for internal debugging only and omitted from published default response
  - `approvalStepCode`: string
  - `approverPartyId`: UUID string or `null`
  - `statusCode`: string
  - `decisionCode`: string or `null`
  - `decidedAt`: RFC 3339 timestamp or `null`
  - `rowVersion`: integer

Header rules:
- Must emit `ETag: "<strong-snapshot-token>"`.
- Should also emit `X-Row-Version` only as an informational compatibility header, never as the publication authority.

### `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`

Request body:

```json
{
  "decisionCode": "approve",
  "commentText": "Approved after final review.",
  "reasonCode": "final-review-complete",
  "electronicSignatureId": "7f6c20d8-2f85-4f78-b764-85b36ee249d7"
}
```

Rules:
- `decisionCode` enum is `approve | reject | request_changes`.
- `commentText` is optional, max length `4000`.
- `reasonCode` is optional but, when provided, must resolve to a valid `reason_code` in the `governance_approval` reason domain.
- `electronicSignatureId` is nullable on the wire, but the service must reject the request with `422` when the backing approval policy requires a signature and a valid signature record is not supplied.

Response body schema:
- `approvalGroupId`: UUID string
- `statusCode`: string
- `decisionCode`: string
- `decidedAt`: RFC 3339 timestamp
- `etag`: string

### `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline`

Timeline event schema:
- `eventId`: string
- `eventType`: enum `requested | step_assigned | decision_recorded | attachment_added | signature_linked`
- `occurredAt`: RFC 3339 timestamp
- `actorPartyId`: UUID string or `null`
- `approvalStepCode`: string or `null`
- `decisionCode`: string or `null`
- `commentText`: string or `null`
- `attachmentId`: UUID string or `null`
- `electronicSignatureId`: UUID string or `null`

Sort order:
- primary `occurredAt asc`
- tie-breaker `eventId asc`

### `GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments`

Response item schema:
- `attachmentId`: UUID string
- `entityName`: literal `approval_group`
- `entityId`: UUID string
- `fileName`: string
- `contentType`: string or `null`
- `fileSizeBytes`: integer or `null`
- `checksumSha256`: string
- `uploadedByPartyId`: UUID string or `null`
- `createdAt`: RFC 3339 timestamp
- `etag`: string

Sort order:
- primary `createdAt desc`
- tie-breaker `attachmentId desc`

### `GET /api/v1/governance/attachments/{attachmentId}`

Response body schema:
- `attachmentId`: UUID string
- `entityName`: literal `approval_group`
- `entityId`: UUID string
- `fileName`: string
- `contentType`: string or `null`
- `fileSizeBytes`: integer or `null`
- `checksumSha256`: string
- `evidenceChainHash`: string or `null`
- `uploadedByPartyId`: UUID string or `null`
- `createdAt`: RFC 3339 timestamp
- `updatedAt`: RFC 3339 timestamp
- `rowVersion`: integer

Non-goal of this endpoint:
- It returns metadata only in tranche-1. Binary download publishing stays outside this slice.

### `POST /api/v1/governance/attachments`

Request media type:
- `multipart/form-data`

Required form parts:
- `approvalGroupId`: UUID string
- `file`: binary

Optional form parts:
- `commentText`: string, max length `4000`
- `documentTypeCode`: string

Rules:
- The target approval group is represented in `attachment.entity_name = 'approval_group'` and `attachment.entity_id = <approvalGroupId>`.
- The endpoint must validate that the referenced approval group exists and remains in a state that accepts attachments.
- Unsupported content type returns `415`.

## 6. Exact Cursor and Problem-Detail Schema Delta

Cursor request and response components for `api/openapi.yaml`:

```yaml
components:
  schemas:
    SortClause:
      type: object
      additionalProperties: false
      required: [field, direction]
      properties:
        field:
          type: string
        direction:
          type: string
          enum: [asc, desc]
    CursorPageInfo:
      type: object
      additionalProperties: false
      required:
        - limit
        - hasNextPage
        - hasPreviousPage
        - startCursor
        - endCursor
        - sort
      properties:
        limit:
          type: integer
          minimum: 1
          maximum: 100
        hasNextPage:
          type: boolean
        hasPreviousPage:
          type: boolean
        startCursor:
          type: [string, "null"]
        endCursor:
          type: [string, "null"]
        sort:
          type: array
          items:
            $ref: "#/components/schemas/SortClause"
```

Cursor query contract:
- `cursor` is an opaque base64url string produced from the prior page's `pageInfo.endCursor`.
- Clients must not construct or mutate it.
- Invalid base64url, unsupported cursor version, or missing sort-key payload returns `400 urn:qms:problem:invalid-request`.

Internal cursor payload contract for implementers only:

```json
{
  "v": 1,
  "s": ["requested_at", "approval_group_id"],
  "d": ["desc", "desc"],
  "k": ["2026-04-06T02:22:55Z", "0e67f43f-8c53-49f9-bf17-8db8187a5be4"]
}
```

Problem-detail schema delta for RFC 9457:

```yaml
components:
  schemas:
    ProblemDetail:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri-reference
        title:
          type: string
        status:
          type: integer
          minimum: 100
          maximum: 599
        detail:
          type: string
        instance:
          type: string
          format: uri-reference
        code:
          type: string
        trace_id:
          type: string
        current_etag:
          type: string
        errors:
          type: array
          items:
            type: object
            additionalProperties: false
            required: [field, message]
            properties:
              field:
                type: string
              message:
                type: string
              code:
                type: string
      additionalProperties: true
```

Problem-type to HTTP-status mapping:

| HTTP status | Problem type | When used |
| --- | --- | --- |
| `400` | `urn:qms:problem:invalid-request` | Invalid cursor, malformed `If-Match`, malformed UUID, malformed multipart boundary, or unsupported query combination. |
| `401` | `urn:qms:problem:authentication-required` | Missing or expired authenticated session. |
| `403` | `urn:qms:problem:insufficient-scope` | Authenticated user lacks the permission or ABAC attributes required for the route. |
| `404` | `urn:qms:problem:resource-not-found` | Unknown `approvalGroupId`, `attachmentId`, or filtered parent record not found. |
| `409` | `urn:qms:problem:invalid-state-transition` | The resource exists, but the requested decision or attachment mutation is not allowed in the current state. |
| `409` | `urn:qms:problem:blocked-capability` | The capability exists in the slice but is administratively blocked pending workflow or policy readiness. |
| `412` | `urn:qms:problem:etag-mismatch` | `If-Match` does not equal the current strong ETag. |
| `415` | `urn:qms:problem:unsupported-media-type` | Unsupported attachment content type or non-multipart upload to the attachment create route. |
| `422` | `urn:qms:problem:validation-error` | Semantically invalid payload such as missing required decision fields, invalid reason code, or required signature omission. |
| `428` | `urn:qms:problem:precondition-required` | `If-Match` missing on a route that requires optimistic concurrency. |

Exact `If-Match` semantics:
- Public `GET` routes never require `If-Match`.
- `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide` requires `If-Match`.
- Frozen internal amend commands for organization, party, and calendar also require `If-Match`.
- Frozen internal register/create commands do not require `If-Match`.
- `POST /api/v1/governance/attachments` does not require `If-Match`.

Strong ETag rules:
- Do not inherit `GenericCrudController` weak `W/"rv-n"` ETags for the published slice.
- Approval-group detail and timeline must emit a strong ETag generated from a canonical JSON snapshot of the approval-group representation, hashed with SHA-256 and quoted as a strong validator.
- Attachment detail must emit a strong ETag generated from the canonical row representation, not from `X-Row-Version` alone.

## 7. Approval Group Public Identity Contract

Public identity decision:
- `approval_group_id` is a permanent public identity, not a temporary facade.
- Data type: `UUID`.
- Column placement: `approval.approval_group_id`.
- Assignment rule: one UUID is assigned when `requestApproval` creates a new approval group, and that same UUID is copied to every `approval` row created for that group.
- Future compatibility rule: if a dedicated `approval_group` table is introduced later, it must reuse the existing public `approval_group_id` values as its primary keys. No public remapping is allowed.
- Internal identity rule: `approval_id` remains row-level and internal. It does not become the public route key.

Group snapshot ETag rule:
- The strong ETag for approval-group detail and timeline is derived from a canonical JSON serialization of:
  - `approvalGroupId`
  - group-level status fields
  - ordered step records with `approvalStepCode`, `statusCode`, `decisionCode`, `decidedAt`, and `rowVersion`
- The final header value is the quoted SHA-256 digest of that canonical JSON payload.

Historical backfill rule and the remaining publication ambiguity:
- The current schema does not expose an authoritative historical grouping surrogate for legacy `approval` rows.
- Therefore the migration can safely add the column and the runtime rule for new requests, but it cannot infer a publication-safe grouping policy for pre-existing rows from the schema alone.
- Recommended approval decision before publication:
  1. Either declare pre-publication legacy rows disposable or resettable and backfill `approval_group_id` one UUID per existing row; or
  2. Provide an authoritative data-repair mapping that groups legacy rows into stable public approval groups before the public routes go live.
- Until one of those two policies is explicitly approved, this package must stay `REVIEW REQUIRED`.

## 8. Registry Onboarding Delta Table

| Canonical entity key | Onboarding mode | Donor reuse | Canonical public endpoint keys | Internal command keys | Required pack IDs | Blocked-capability rows |
| --- | --- | --- | --- | --- | --- | --- |
| `foundation.organization` | New canonical row | Derive field and layout ideas from `master_data_governance.org_companies`, `master_data_governance.org_legal_entities`, and `master_data_governance.org_plants`. Keep donor rows as compatibility-only. | `foundation.organization.list` | `foundation.organization.register`, `foundation.organization.amend`, `foundation.organization.reparent`, `foundation.organization.deactivate` | `foundation_organization_header`, `foundation_organization_list_columns`, `foundation_organization_filters`, `foundation_organization_search`, `foundation_organization_command_form` | `detail`, `public_create`, `public_update`, `public_delete`, `public_transition`, `planning_board`, `operator_console` |
| `foundation.party` | Greenfield canonical row | No existing donor row is sufficient; source from `party`, `party_role`, `party_site`, `party_contact` | `foundation.party.list` | `foundation.party.register`, `foundation.party.amend_identity`, `foundation.party.assign_role`, `foundation.party.register_site`, `foundation.party.register_contact` | `foundation_party_header`, `foundation_party_list_columns`, `foundation_party_filters`, `foundation_party_search`, `foundation_party_command_form` | `detail`, `public_create`, `public_update`, `public_delete`, `public_transition`, `planning_board`, `operator_console` |
| `foundation.calendar` | Greenfield canonical row | No existing donor row is sufficient; source from `calendar` and `shift` | `foundation.calendar.list` | `foundation.calendar.register`, `foundation.calendar.register_shift` | `foundation_calendar_header`, `foundation_calendar_list_columns`, `foundation_calendar_filters`, `foundation_calendar_search`, `foundation_calendar_command_form`, `foundation_calendar_shift_form` | `detail`, `public_create`, `public_update`, `public_delete`, `public_transition`, `public_shift_list`, `planning_board`, `operator_console` |
| `governance.approval_group` | Greenfield canonical row | No existing donor row is sufficient; source from `approval`, `electronic_signature`, `reason_code`, `status_code` | `governance.approval_group.list`, `governance.approval_group.detail`, `governance.approval_group.decide`, `governance.approval_group.timeline`, `governance.approval_group.attachments` | `governance.approval_group.request` | `governance_approval_group_header`, `governance_approval_group_list_columns`, `governance_approval_group_filters`, `governance_approval_group_search`, `governance_approval_group_decide_form`, `governance_approval_group_timeline` | `create`, `update`, `delete`, `generic_transition`, `planning_board`, `operator_console` |
| `governance.attachment` | New canonical row | Reuse interaction-contract ideas from `system_infrastructure.file_attachments`, but do not reuse its contract as canonical authority | `governance.attachment.detail`, `governance.attachment.create` | none | `governance_attachment_header`, `governance_attachment_related_list_columns`, `governance_attachment_filters`, `governance_attachment_create_form`, `governance_attachment_search` | `standalone_list`, `update`, `delete`, `transition`, `planning_board`, `operator_console` |

Registry onboarding notes:
1. The endpoint-catalog entries for the donor rows must remain, but any future metadata that marks canonical publication status must flag them as non-canonical for this slice.
2. `domain-field-packs.json` uses the pack key as the pack identifier. No separate `pack_id` property should be invented.
3. `data-fields.json` and `data-fields-part2.json` must close the currently missing field-definition gaps for slice-critical fields before publication.

## 9. Exact DDL Delta Matrix by Table, Column, Index, Trigger, and Rollback Note

New migration file:
- `database/migrations/079_foundation_governance_contract_hardening.sql`

Shared DDL artifacts introduced by `079`:

| Artifact | Exact delta | Rollback note |
| --- | --- | --- |
| `pgcrypto` extension | `CREATE EXTENSION IF NOT EXISTS pgcrypto;` to support `gen_random_uuid()` | Safe to leave enabled; no rollback required. |
| Trigger function `qms_touch_foundation_row()` | Sets `NEW.updated_at = now()` and `NEW.row_version = OLD.row_version + 1` on mutable tables | Drop only if the slice stays unpublished and the migration is rolled back. |

Per-table matrix:

| Table | Column delta | Index delta | Trigger delta | Rollback note |
| --- | --- | --- | --- | --- |
| `org_enterprise` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_enterprise_status_code_enterprise_code(status_code, enterprise_code)` | Add `trg_org_enterprise_touch` using `qms_touch_foundation_row()` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `org_company` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_company_enterprise_status_code_company_code(enterprise_id, status_code, company_code)` | Add `trg_org_company_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `org_site` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_site_company_status_code_site_code(company_id, status_code, site_code)` | Add `trg_org_site_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `org_plant` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_plant_site_status_code_plant_code(site_id, status_code, plant_code)` | Add `trg_org_plant_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `org_warehouse` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_warehouse_plant_status_code_warehouse_code(plant_id, status_code, warehouse_code)` | Add `trg_org_warehouse_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `org_work_center` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_work_center_plant_status_code_work_center_code(plant_id, status_code, work_center_code)` | Add `trg_org_work_center_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `org_work_unit` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_org_work_unit_work_center_status_code_work_unit_code(work_center_id, status_code, work_unit_code)` | Add `trg_org_work_unit_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `party` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_party_party_type_status_code_display_name(party_type, status_code, display_name)` | Add `trg_party_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `party_role` | Add `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_party_role_party_status_role_code(party_id, status_code, role_code)` and `idx_party_role_scope_entity(scope_entity_name, scope_entity_id)` | Add `trg_party_role_touch` | Pre-publication only: drop trigger, indexes, then added columns if rolled back. |
| `party_site` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_party_site_party_default_status(party_id, is_default, status_code)` | Add `trg_party_site_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `party_contact` | Add `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_party_contact_party_primary_status(party_id, is_primary, status_code)` | Add `trg_party_contact_touch` | Pre-publication only: drop trigger, index, then column if rolled back. |
| `uom` | No slice delta in tranche-1 | No new index | No trigger change | Explicitly unchanged in this slice. |
| `calendar` | Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_calendar_status_code_calendar_code(status_code, calendar_code)` | Add `trg_calendar_touch` | Pre-publication only: drop trigger, index, then added columns if rolled back. |
| `shift` | Add `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_shift_calendar_status_code_shift_code(calendar_id, status_code, shift_code)` | Add `trg_shift_touch` | Pre-publication only: drop trigger, index, then added columns if rolled back. |
| `reason_code` | Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_reason_code_domain_active_code(reason_domain, is_active, reason_code)` | Add `trg_reason_code_touch` | Pre-publication only: drop trigger, index, then added columns if rolled back. |
| `status_code` | Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1` if missing | Add `idx_status_code_domain_active_sequence(status_domain, is_active, sequence_no)` | Add `trg_status_code_touch` | Pre-publication only: drop trigger, index, then added columns if rolled back. |
| `electronic_signature` | No mutable concurrency columns; keep immutable | Add `uq_electronic_signature_hash_value(hash_value)` and `idx_electronic_signature_signed_by_party_signed_at(signed_by_party_id, signed_at DESC)` | No touch trigger | Unique hash index is safe to keep. Drop only if unpublished and rollback is explicit. |
| `approval` | Add `approval_group_id UUID NOT NULL DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1`, and optionally `decision_reason_code VARCHAR(40)` if the existing table lacks a coded reason column | Add `idx_approval_group_status_step(approval_group_id, status_code, approval_step_code)`, `idx_approval_entity_status(entity_name, entity_id, status_code)`, and `idx_approval_approver_status(approver_party_id, status_code)` | Add `trg_approval_touch` | Forward-only after first public publication because `approval_group_id` becomes a public identifier. Before publication, rollback is allowed only if the public contract has not been released. |
| `attachment` | Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `row_version BIGINT NOT NULL DEFAULT 1`, `uploaded_by_party_id UUID NULL REFERENCES party(party_id)`, `content_type VARCHAR(255)`, `file_size_bytes BIGINT`, `evidence_chain_hash TEXT` if missing | Add `idx_attachment_entity_created_at(entity_name, entity_id, created_at DESC)` and `idx_attachment_checksum_sha256(checksum_sha256)` | Add `trg_attachment_touch` | Pre-publication only: drop trigger, indexes, and added columns if rolled back. |

DDL implementation notes:
1. Every `ALTER TABLE` in `079` should use `ADD COLUMN IF NOT EXISTS` and idempotent trigger/index guards because dev snapshots may already contain partial hardening.
2. `approval_group_id` backfill for legacy data remains operationally blocked on the approval decision described in Section 7.
3. `attachment` continues to bind approval-group attachments through `entity_name = 'approval_group'` and `entity_id = approval_group_id`; no new attachment junction table is introduced in this slice.

## 10. Tranche-1 File-by-File Patch Plan

Implementation order is exact and should not be rearranged because later files depend on earlier contract and schema work.

| Order | File | Change | Why this order matters |
| --- | --- | --- | --- |
| `1` | `database/migrations/079_foundation_governance_contract_hardening.sql` | Add the DDL hardening from Section 9 | The public contract cannot be wired safely until strong concurrency columns and public approval-group identity exist. |
| `2` | `api/services/FoundationGovernanceService.php` | New DB-backed list/query service for `organizations`, `parties`, and `calendars` | This service becomes the canonical read layer reused by `MasterDataController`. |
| `3` | `api/controllers/MasterDataController.php` | Add canonical public list methods and the frozen internal master-data action handlers | The public foundation routes and internal commands need one controller owner before router wiring. |
| `4` | `api/services/ApprovalGroupService.php` | New approval-group query, snapshot ETag, decision, and timeline orchestration service | This is the core bridge that replaces unsafe generic runtime reuse. |
| `5` | `api/controllers/ApprovalGroupController.php` | New narrow controller for approval-group list/detail/decide/timeline and `requestApproval` action wiring | The public governance contract gets a dedicated controller owner with bounded responsibility. |
| `6` | `api/services/EvidenceVaultService.php` | Repair `store()` and `link()` signatures and add attachment metadata helpers | Attachment routes are unsafe until the evidence service and controller agree on the API. |
| `7` | `api/controllers/EvidenceController.php` | Repair service usage, then add governance attachment detail/create/list handlers | This brings attachment behavior into alignment with the repaired service layer. |
| `8` | `api/Router.php` | Register the ten public REST routes and ensure internal action keys are available | Route resolution becomes explicit only after controller ownership exists. |
| `9` | `api/index.php` | Import the new controller classes and bind the new REST plus action routes | Entry-point registration follows router/controller readiness. |
| `10` | `api/openapi.yaml` | Upgrade to `3.1.1` and add paths, schemas, securitySchemes, cursor contract, and RFC 9457 errors | The machine-readable contract must reflect the implemented route and schema owners, not guess ahead of them. |
| `11` | `qms-data/registry/endpoint-catalog.json` | Add the canonical endpoint keys and mark donor entries as compatibility-only where supported | Endpoint mirrors should follow the actual path and controller contract. |
| `12` | `qms-data/registry/frontend-foundation-catalog.json` | Add five canonical entity rows and their blocked-capability rows | Entity-level onboarding cannot be published until the endpoint keys exist. |
| `13` | `qms-data/registry/domain-field-packs.json` | Add the new pack IDs from Section 8 | Pack families must align to the entity rows that now exist. |
| `14` | `qms-data/registry/data-fields.json` | Add the non-part2 slice field definitions needed by the new packs and public schemas | Pack references must point to defined fields. |
| `15` | `qms-data/registry/data-fields-part2.json` | Add the master-data-governance and system-infrastructure field definitions still missing for slice-critical fields | This closes the orphan field metadata revealed by the schema audit. |
| `16` | `tests/foundation_governance_contract_smoke.php` | New smoke file covering public list/detail/decide/attachment happy and failure paths | The slice should reuse the existing `tests/` root instead of creating a new testing root. |
| `17` | `tools/benchmark/foundation_governance_contract_read_mix.sql` | New benchmark SQL for approval-group list/detail read mix | The benchmark harness already expects SQL scripts under `tools/benchmark/`. |
| `18` | `tools/benchmark/run_runtime_benchmark.py` | Extend the current harness to run the new slice benchmark scenario and report it in the existing JSON report shape | Reuse the existing observability root and avoid a second benchmark runner. |

Files intentionally not patched in tranche-1:
- `api/controllers/BaseController.php`: keep untouched; canonical slice routes should write their own response payloads instead of forcing a legacy envelope change across the whole API.
- `api/services/GenericCrudService.php` and `api/controllers/GenericCrudController.php`: donor-only for parsing ideas, not canonical owners.
- `api/middleware/AuthMiddleware.php`: no bearer-token or OIDC expansion in this slice.

## 11. Risks and Explicit Non-Goals

Primary risks:
1. `approval_group_id` backfill is the single remaining publication ambiguity. The schema alone does not reveal how historical multi-step approval rows should be grouped into stable public approval-group identities.
2. `workflow_engine_bridge_ready = 0` means the team must keep approval decisions inside a dedicated service bridge and must not leak generic workflow exceptions into the published contract.
3. Governance attachment routes remain blocked until the `EvidenceController` to `EvidenceVaultService` API mismatch is repaired.
4. The flattened `foundation.organization` list spans seven subtype tables and will require careful SQL planning plus the new indexes from Section 9 to avoid slow pagination.
5. Registry onboarding will remain misleading if donor rows are presented as canonical rather than compatibility-only.
6. Benchmark execution depends on the existing Windows/PostgreSQL toolchain paths already assumed by `tools/benchmark/run_runtime_benchmark.py`; benchmark reporting may fail in environments without those binaries.

Explicit non-goals for this closure package and tranche-1:
1. No reopening of Prompt 01 architecture, slice selection, or whole-program planning.
2. No Prompt 03-style audit report as the primary output.
3. No new public detail routes for `organization`, `party`, or `calendar` in this slice.
4. No new standalone public routes for `warehouse`, `work_center`, or `work_unit`; they stay inside the flattened `foundation.organization` list contract.
5. No bearer-token or OIDC runtime expansion in this slice; session plus CSRF remains the implemented security surface.
6. No standalone binary attachment download contract in tranche-1; attachment detail is metadata-only.
7. No new artifact roots for tests, benchmarks, registry, or services beyond the explicitly justified files in Section 10.
8. No repurposing of `OutboxWorker.php` as the governance approval publication mechanism.

## 12. QA Verdict

Verdict: `REVIEW REQUIRED`

Why the bundle is not yet `PASS`:
1. Live canonical public route matches remain `0` in `api/openapi.yaml`, `api/Router.php`, and `api/index.php`.
2. Canonical registry entity keys remain `0 / 5`, and canonical public endpoint keys remain `0 / 10`.
3. `workflow_engine_bridge_ready` is still `0`, so a direct generic workflow publication would be unsafe.
4. Governance attachment reuse is blocked by the verified `EvidenceController` to `EvidenceVaultService` signature mismatch.
5. `approval_group_id` backfill for pre-existing `approval` rows is still ambiguous without an explicit data policy or mapping.

Exact ambiguity that must be resolved before publication:
- Historical approval grouping: decide whether pre-publication legacy approval rows can be reset/backfilled one-row-per-group, or provide an authoritative mapping that groups them into stable public `approval_group_id` values.

What this closure package does complete:
- It closes contract authority.
- It closes route ownership.
- It closes security-scheme authority.
- It closes cursor and problem-detail authority.
- It closes registry entity, endpoint, pack, and blocked-capability authority.
- It closes the DDL hardening target.
- It closes the tranche-1 implementation order.

Release recommendation:
- Proceed to coding only after approving the historical `approval_group_id` backfill policy.
- Keep the overall Prompt 02 bundle status at `REVIEW REQUIRED` until tranche-1 implementation, smoke coverage, and benchmark evidence are complete.

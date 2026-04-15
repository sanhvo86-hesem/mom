# Screen and Field Definition Catalog -- P0 Foundation Governance Wave

| Key             | Value                                   |
|-----------------|-----------------------------------------|
| Slice           | Foundation Governance Contract (P0)     |
| OpenAPI version | 3.1.1                                   |
| API base        | `/01-QMS-Portal/api/`                   |
| Routes          | 10 (3 foundation + 7 governance)        |
| Entities        | 5 (approval_group, attachment, organization, party, calendar) |
| Field packs     | 27 domain-field-packs across registry   |
| Migration base  | 072 canonical + 079 hardening           |
| Date            | 2026-04-07                              |
| Governance score| 88 / 100                                |

---

## 1. Screen Contract Rules

Every screen in the P0 wave follows the same structural rules derived from the
OpenAPI 3.1.1 contract and the `domain-field-packs.json` registry.

### 1.1 List View

| Aspect           | Rule                                                                                         |
|------------------|----------------------------------------------------------------------------------------------|
| **Data source**  | `GET /api/v1/{domain}/{entity-plural}` returning `{Entity}Connection`                        |
| **Columns**      | Drawn from the `*_list_columns` field pack for the entity                                    |
| **Filters**      | Drawn from the `*_filters` field pack; rendered as a collapsible filter panel above the table |
| **Pagination**   | Cursor-based: query params `limit` (1-100, default 25) and `cursor` (opaque base64url)       |
| **Page envelope**| `{ data: T[], pageInfo: CursorPageInfo }`                                                    |
| **CursorPageInfo** | `{ limit, hasNextPage, hasPreviousPage, startCursor, endCursor, sort }`                    |
| **Sort**         | Compound default sort order defined per entity (see entity sections); override via `sort` query param (e.g. `name:asc`) |
| **Empty state**  | Shown when `data` is an empty array (see Section 4)                                          |
| **Row click**    | Navigates to detail view if the entity exposes a detail endpoint; otherwise no-op             |

### 1.2 Detail View

| Aspect             | Rule                                                                                  |
|--------------------|---------------------------------------------------------------------------------------|
| **Data source**    | `GET /api/v1/{domain}/{entity-plural}/{id}` returning `{Entity}Envelope`              |
| **ETag**           | Response header `ETag` (strong, SHA-256-based); stored client-side for conditional writes |
| **Sections**       | Derived from `detail_layout.sections` in the pack; fall back to semantic slots        |
| **Semantic slots** | `title` (heading), `status` (chip), `subtitle` (secondary text), `owner` (avatar+name), `timestamps` (createdAt, updatedAt) |
| **Evidence panel** | Attachment list sub-panel (AttachmentConnection) if entity has attachments sub-resource |
| **Audit panel**    | Timeline sub-panel (TimelineConnection) if entity has timeline sub-resource            |
| **Related records**| Cross-links to parent/child entities via foreign-key references                        |
| **Action bar**     | Contextual commands (e.g. Decide) based on entity workflow state and user permissions  |

### 1.3 Create / Edit Form

| Aspect            | Rule                                                                                   |
|-------------------|----------------------------------------------------------------------------------------|
| **Field source**  | `*_command_form` or `*_create_form` field pack                                         |
| **Validation**    | Client-side: `required`, `maxLength`, `minLength`, `pattern` from pack constraints     |
| **Server errors** | RFC 9457 ProblemDetail with optional `violations[]` array for 422 responses             |
| **Submit**        | `POST` with `X-CSRF-Token` header; `Content-Type: application/json` or `multipart/form-data` |
| **Optimistic lock**| `If-Match` header required for state-changing commands on existing resources            |
| **Success**       | 200 or 201 with `{Entity}Envelope`; 201 includes `Location` header                    |

### 1.4 Timeline

| Aspect         | Rule                                                                                     |
|----------------|------------------------------------------------------------------------------------------|
| **Data source**| `GET /api/v1/governance/approval-groups/{id}/timeline` returning `ApprovalTimelineConnection` |
| **Item schema**| `TimelineEvent { id, eventType, actor, summary, detail, occurredAt }`                    |
| **eventType values** | `decision`, `comment`, `status_change`, `attachment_added`                          |
| **occurredAt** | ISO 8601 UTC timestamp                                                                   |
| **actor**      | Username or party ID of the person who performed the action                              |
| **detail**     | Freeform object with event-specific payload (decisionCode, commentText, etc.)            |
| **Rendering**  | Chronological feed, newest-first, with icon per eventType                                |

### 1.5 Attachments

| Aspect           | Rule                                                                                    |
|------------------|-----------------------------------------------------------------------------------------|
| **List source**  | `GET /api/v1/governance/approval-groups/{id}/attachments` returning `AttachmentConnection` |
| **Item schema**  | `AttachmentItem { id, filename, contentType, sizeBytes, uploadedBy, uploadedAt }`       |
| **Detail source**| `GET /api/v1/governance/attachments/{attachmentId}` returning `AttachmentEnvelope`       |
| **Detail schema**| `AttachmentDetail` adds `description, approvalGroupId, downloadUrl, updatedAt`           |
| **Upload**       | `POST /api/v1/governance/attachments` with `multipart/form-data` (file, approvalGroupId, description) |
| **Integrity**    | DB columns: `checksum_sha256`, `evidence_chain_hash`, `file_size_bytes`                  |
| **Binary download** | Out of scope for tranche-1; `downloadUrl` field reserved for future implementation    |

### 1.6 Commands

| Command  | Method | Path                                                        | Headers required                          | Request body schema            |
|----------|--------|-------------------------------------------------------------|-------------------------------------------|-------------------------------|
| Decide   | POST   | `/api/v1/governance/approval-groups/{id}:decide`            | `X-CSRF-Token`, `If-Match` (required)     | `DecideApprovalGroupRequest`  |
| Upload   | POST   | `/api/v1/governance/attachments`                            | `X-CSRF-Token`                            | `multipart/form-data`         |

**DecideApprovalGroupRequest fields:**

| Field                   | Type       | Required | Description                                          |
|-------------------------|------------|----------|------------------------------------------------------|
| `decisionCode`          | string     | yes      | One of: `approve`, `reject`, `request_changes`       |
| `commentText`           | string     | no       | Free-text comment accompanying the decision          |
| `reasonCode`            | string     | no       | Machine-readable reason code from `reason_code` table|
| `electronicSignatureId` | string/uuid| no       | Reference to `electronic_signature` for regulatory traceability |

**Error responses for Decide (all RFC 9457 ProblemDetail):**

| HTTP | type URN                                | Meaning                                 |
|------|-----------------------------------------|-----------------------------------------|
| 400  | `urn:qms:problem:invalid-request`       | Malformed or missing request body       |
| 403  | `urn:qms:problem:forbidden`             | Insufficient permissions or self-approval prohibited |
| 404  | `urn:qms:problem:not-found`             | Approval group does not exist           |
| 409  | `urn:qms:problem:conflict`              | Invalid state transition or workflow bridge not ready |
| 412  | `urn:qms:problem:precondition-failed`   | ETag mismatch (concurrent modification)|
| 422  | `urn:qms:problem:unprocessable-entity`  | Validation errors in decision payload   |
| 428  | `urn:qms:problem:precondition-required` | Missing `If-Match` header               |

---

## 2. Entity Screen Definitions -- P0 Foundation Governance

### 2.1 governance.approval_group

**API routes:**

| Route                                                               | operationId              | Method |
|---------------------------------------------------------------------|--------------------------|--------|
| `/api/v1/governance/approval-groups`                                | `listApprovalGroups`     | GET    |
| `/api/v1/governance/approval-groups/{approvalGroupId}`              | `getApprovalGroup`       | GET    |
| `/api/v1/governance/approval-groups/{approvalGroupId}:decide`       | `decideApprovalGroup`    | POST   |
| `/api/v1/governance/approval-groups/{approvalGroupId}/timeline`     | `listApprovalGroupTimeline` | GET |
| `/api/v1/governance/approval-groups/{approvalGroupId}/attachments`  | `listApprovalGroupAttachments` | GET |

#### 2.1.1 List View

**Columns (from ApprovalGroupItem schema):**

| Column key      | Type          | Sortable | Description                            |
|-----------------|---------------|----------|----------------------------------------|
| `id`            | uuid          | yes      | Approval group primary key             |
| `title`         | string        | yes      | Human-readable title of the approval   |
| `status`        | string        | yes      | Current workflow status code           |
| `createdBy`     | string        | no       | Username of the requester              |
| `createdAt`     | date-time     | yes      | Timestamp when approval was requested  |
| `updatedAt`     | date-time     | yes      | Timestamp of last modification         |

**Extended list columns (from service query parameters):**

| Column key          | Type     | Source                        | Description                           |
|---------------------|----------|-------------------------------|---------------------------------------|
| `entityName`        | string   | `approval.entity_name`        | Governed entity type (e.g. document)  |
| `entityId`          | uuid     | `approval.entity_id`          | ID of the governed entity             |
| `statusCode`        | string   | `approval.status_code`        | Workflow status                       |
| `decisionCode`      | string   | `approval.decision_code`      | Latest decision on this group         |
| `requestedAt`       | datetime | `approval.created_at`         | When approval was requested           |
| `currentStepCode`   | string   | `approval.approval_step_code` | Current step in multi-step workflow   |
| `approverPartyId`   | uuid     | `approval.approver_party_id`  | Assigned approver party               |

**Default sort:** `requested_at DESC, approval_group_id DESC`

**Pagination:** `limit` (1-100, default 50), `cursor` (opaque base64url)

#### 2.1.2 Filters

| Filter key         | Type     | Control     | DB index backing                            |
|--------------------|----------|-------------|---------------------------------------------|
| `entityName`       | string   | dropdown    | `idx_approval_entity_status`                |
| `entityId`         | uuid     | text input  | `idx_approval_entity_status`                |
| `statusCode`       | string   | chip select | `idx_approval_group_status_step`            |
| `approverPartyId`  | uuid     | party picker| `idx_approval_approver_status`              |
| `decisionCode`     | enum     | chip select | N/A (filtered in application layer)         |

#### 2.1.3 Detail View

**Data source:** `GET /api/v1/governance/approval-groups/{approvalGroupId}`
**Response schema:** `ApprovalGroupEnvelope { data: ApprovalGroupDetail }`
**ETag:** Returned in response header; SHA-256 of canonical JSON snapshot.

**Layout sections:**

| Section                | Content                                                                |
|------------------------|------------------------------------------------------------------------|
| **Header**             | `title`, `status` chip, `createdBy`, `createdAt`, `updatedAt`         |
| **Description**        | `description` field (full text)                                        |
| **Participants table** | Array of `{ userId, name, role, decision, decidedAt }` per participant|
| **Timeline panel**     | Sub-resource: `ApprovalTimelineConnection` (see 2.1.5)                |
| **Attachments panel**  | Sub-resource: `AttachmentConnection` (see 2.2)                        |
| **Decision action**    | Decide form (see 2.1.4); visible only when user has pending decision  |

#### 2.1.4 Decide Form

**Endpoint:** `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`

| Field                   | Type       | Required | Control               | Validation                         |
|-------------------------|------------|----------|-----------------------|------------------------------------|
| `decisionCode`          | enum       | yes      | Radio group           | One of: `approve`, `reject`, `request_changes` |
| `commentText`           | string     | no       | Textarea              | maxLength: 4000                    |
| `reasonCode`            | string     | no       | Dropdown (reason_code)| Must exist in `reason_code` table, `reason_domain = 'approval'`, `is_active = true` |
| `electronicSignatureId` | uuid       | no       | Signature widget      | Must reference valid `electronic_signature` row |

**Required headers:** `X-CSRF-Token`, `If-Match: "{etag}"`

**Business rules enforced by ApprovalWorkflowAdapter:**
- State validation: group must be in a decidable state
- Self-approval prohibition: `createdBy` cannot approve their own request
- Concurrency protection: ETag must match current snapshot
- Workflow bridge: `WORKFLOW_BRIDGE_READY = true` flag must be set

#### 2.1.5 Timeline

**Endpoint:** `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline`
**Response:** `ApprovalTimelineConnection { data: TimelineEvent[], pageInfo }`

| eventType            | Icon     | Summary template                                         |
|----------------------|----------|----------------------------------------------------------|
| `decision`           | gavel    | "{actor} recorded decision: {decisionCode}"              |
| `comment`            | chat     | "{actor} added a comment"                                |
| `status_change`      | refresh  | "Status changed from {oldStatus} to {newStatus}"         |
| `attachment_added`   | paperclip| "{actor} attached {filename}"                            |
| `step_assigned`      | user-plus| "Step {stepCode} assigned to {assignee}"                 |

#### 2.1.6 Status Chips

| statusCode          | Color   | Label (en)         | Label (vi)                |
|---------------------|---------|--------------------|---------------------------|
| `pending`           | yellow  | Pending            | Dang cho                  |
| `approved`          | green   | Approved           | Da phe duyet              |
| `rejected`          | red     | Rejected           | Tu choi                   |
| `changes_requested` | orange  | Changes Requested  | Yeu cau chinh sua         |
| `in_review`         | blue    | In Review          | Dang xem xet              |
| `cancelled`         | gray    | Cancelled          | Da huy                    |

#### 2.1.7 Permissions

| Action         | Security scheme                      | Additional requirements       |
|----------------|--------------------------------------|-------------------------------|
| List           | `sessionCookie`                      | None                          |
| Detail         | `sessionCookie`                      | None                          |
| Decide         | `sessionCookie` + `csrfHeader`       | `If-Match` header required    |
| Timeline       | `sessionCookie`                      | None                          |
| Attachments    | `sessionCookie`                      | None                          |

---

### 2.2 governance.attachment

**API routes:**

| Route                                                              | operationId                 | Method |
|--------------------------------------------------------------------|-----------------------------|--------|
| `/api/v1/governance/approval-groups/{id}/attachments`              | `listApprovalGroupAttachments` | GET |
| `/api/v1/governance/attachments/{attachmentId}`                    | `getGovernanceAttachment`   | GET    |
| `/api/v1/governance/attachments`                                   | `createGovernanceAttachment`| POST   |

#### 2.2.1 List View

**Columns (from AttachmentItem schema):**

| Column key      | Type          | Sortable | Description                          |
|-----------------|---------------|----------|--------------------------------------|
| `id`            | uuid          | yes      | Attachment primary key               |
| `filename`      | string        | yes      | Original file name                   |
| `contentType`   | string        | yes      | MIME type (e.g. application/pdf)     |
| `sizeBytes`     | integer/int64 | yes      | File size in bytes                   |
| `uploadedBy`    | string        | no       | Username of the uploader             |
| `uploadedAt`    | date-time     | yes      | Upload timestamp                     |

**Extended DB columns (from migration 079):**

| Column key           | Type     | Description                                         |
|----------------------|----------|-----------------------------------------------------|
| `checksum_sha256`    | text     | SHA-256 hash of file content for integrity checks   |
| `evidence_chain_hash`| text     | Hash-chain link for evidence vault traceability     |
| `file_size_bytes`    | bigint   | Canonical file size                                 |
| `content_type`       | varchar  | MIME content type                                   |
| `uploaded_by_party_id`| uuid    | FK to `party(party_id)`                             |

**Default sort:** `uploadedAt DESC`

#### 2.2.2 Detail View (Metadata Only)

**Data source:** `GET /api/v1/governance/attachments/{attachmentId}`
**Response:** `AttachmentEnvelope { data: AttachmentDetail }`
**ETag:** Returned in response header.

**AttachmentDetail fields:**

| Field            | Type     | Description                                       |
|------------------|----------|---------------------------------------------------|
| `id`             | uuid     | Primary key                                       |
| `filename`       | string   | Original filename                                 |
| `contentType`    | string   | MIME type                                         |
| `sizeBytes`      | int64    | File size                                         |
| `description`    | string   | User-provided description                         |
| `approvalGroupId`| uuid?    | Associated approval group (nullable)              |
| `downloadUrl`    | uri      | Reserved for future binary download endpoint      |
| `uploadedBy`     | string   | Uploader identity                                 |
| `uploadedAt`     | datetime | Upload timestamp                                  |
| `updatedAt`      | datetime | Last modification timestamp                       |

**Note:** Binary download is out of scope for tranche-1. The `downloadUrl` field
is present in the schema but will return a placeholder URI until the evidence
vault streaming endpoint is implemented.

#### 2.2.3 Create Form (Upload)

**Endpoint:** `POST /api/v1/governance/attachments`
**Content-Type:** `multipart/form-data`

| Field            | Type          | Required | Control          | Validation                      |
|------------------|---------------|----------|------------------|---------------------------------|
| `file`           | binary        | yes      | File picker      | Max size enforced server-side   |
| `approvalGroupId`| uuid          | no       | Hidden / picker  | Must reference existing group   |
| `description`    | string        | no       | Textarea         | maxLength: 2000                 |

**Required headers:** `X-CSRF-Token`

**Success response:** 201 Created with `Location` header and `AttachmentEnvelope` body.

**Error responses:**

| HTTP | Meaning                                    |
|------|--------------------------------------------|
| 400  | Invalid form data or missing file          |
| 403  | Insufficient permissions                   |
| 415  | Unsupported media type                     |
| 422  | Validation errors (e.g. invalid groupId)   |

#### 2.2.4 Filters (on list sub-resource)

| Filter key    | Type   | Control    | Description                              |
|---------------|--------|------------|------------------------------------------|
| `entityName`  | string | dropdown   | Filter by parent entity type             |
| `entityId`    | uuid   | text input | Filter by parent entity ID               |
| `contentType` | string | dropdown   | Filter by MIME type                      |

#### 2.2.5 Permissions

| Action  | Security scheme                | Additional requirements |
|---------|--------------------------------|-------------------------|
| List    | `sessionCookie`                | None                    |
| Detail  | `sessionCookie`                | None                    |
| Create  | `sessionCookie` + `csrfHeader` | None                    |

---

### 2.3 foundation.organization

**API route:**

| Route                                    | operationId                  | Method |
|------------------------------------------|------------------------------|--------|
| `/api/v1/foundation/organizations`       | `listFoundationOrganizations`| GET    |

#### 2.3.1 List View

**Columns (from OrganizationItem schema + service query):**

| Column key             | Type     | Sortable | Description                                    |
|------------------------|----------|----------|------------------------------------------------|
| `organizationId`       | string   | yes      | Typed composite ID (e.g. `enterprise:UUID`)    |
| `organizationType`     | string   | yes      | One of 7 subtypes (see below)                  |
| `organizationCode`     | string   | yes      | Human-readable code (e.g. `HE-001`)           |
| `organizationName`     | string   | yes      | Display name                                   |
| `parentOrganizationId` | string?  | no       | Typed parent ref (e.g. `company:UUID`)         |
| `statusCode`           | string   | yes      | Active/inactive status                         |
| `baseTimezone`         | string?  | no       | IANA timezone (only enterprise and site have this) |

**Organization subtypes (7-table union):**

| Type           | DB table          | PK column         | Code column        | Name column        | Parent type    |
|----------------|-------------------|--------------------|--------------------|--------------------|----------------|
| `enterprise`   | `org_enterprise`  | `enterprise_id`    | `enterprise_code`  | `enterprise_name`  | --             |
| `company`      | `org_company`     | `company_id`       | `company_code`     | `legal_name`       | `enterprise`   |
| `site`         | `org_site`        | `site_id`          | `site_code`        | `site_name`        | `company`      |
| `plant`        | `org_plant`       | `plant_id`         | `plant_code`       | `plant_name`       | `site`         |
| `warehouse`    | `org_warehouse`   | `warehouse_id`     | `warehouse_code`   | `warehouse_name`   | `plant`        |
| `work_center`  | `org_work_center` | `work_center_id`   | `work_center_code` | `work_center_name` | `plant`        |
| `work_unit`    | `org_work_unit`   | `work_unit_id`     | `work_unit_code`   | `work_unit_name`   | `work_center`  |

**Default sort:** `organizationType ASC, organizationCode ASC, organizationId ASC`

**Pagination:** `limit` (1-100, default 50), `cursor` (base64url-encoded multi-key cursor containing `[organizationType, organizationCode, organizationId]`)

#### 2.3.2 Filters

| Filter key             | Type   | Control    | DB index backing                                    |
|------------------------|--------|------------|-----------------------------------------------------|
| `organizationType`     | enum   | dropdown   | Selects which subtype tables to query               |
| `parentOrganizationId` | string | text input | Per-table parent FK column (e.g. `enterprise_id`)   |
| `statusCode`           | string | chip select| `idx_org_{subtype}_status_code_{subtype}_code`      |
| `search`               | string | search bar | ILIKE on code and name columns                      |

#### 2.3.3 Detail View

**Not available in this slice.** The organization entity exposes list-only access
in the P0 wave. A future tranche may add `GET /api/v1/foundation/organizations/{id}`.

#### 2.3.4 Permissions

| Action | Security scheme | Additional requirements |
|--------|-----------------|-------------------------|
| List   | `sessionCookie` | None                    |

---

### 2.4 foundation.party

**API route:**

| Route                            | operationId            | Method |
|----------------------------------|------------------------|--------|
| `/api/v1/foundation/parties`     | `listFoundationParties`| GET    |

#### 2.4.1 List View

**Columns (from PartyItem schema):**

| Column key       | Type          | Sortable | Description                         |
|------------------|---------------|----------|-------------------------------------|
| `id`             | uuid          | yes      | Party primary key                   |
| `name`           | string        | yes      | Display name                        |
| `email`          | string/email  | no       | Primary email address               |
| `phone`          | string        | no       | Primary phone number                |
| `role`           | string        | yes      | Party role                          |
| `organizationId` | uuid          | no       | FK to parent organization           |
| `active`         | boolean       | yes      | Active status                       |
| `createdAt`      | date-time     | yes      | Creation timestamp                  |
| `updatedAt`      | date-time     | yes      | Last modification                   |

**Extended DB columns (from party table + migration 079):**

| Column key      | Type     | DB index backing                                |
|-----------------|----------|-------------------------------------------------|
| `party_type`    | string   | `idx_party_party_type_status_code_display_name` |
| `status_code`   | string   | `idx_party_party_type_status_code_display_name` |
| `display_name`  | string   | `idx_party_party_type_status_code_display_name` |
| `row_version`   | bigint   | Used for optimistic locking                     |

**Default sort:** `displayName ASC, partyId ASC`

**Pagination:** `limit` (1-100, default 25), `cursor` (opaque)

#### 2.4.2 Filters

| Filter key  | Type   | Control     | Description                                |
|-------------|--------|-------------|--------------------------------------------|
| `partyType` | enum   | dropdown    | Filter by party type classification        |
| `roleCode`  | string | dropdown    | Filter by role code from `party_role` table|
| `statusCode`| string | chip select | Active/inactive filter                     |
| `search`    | string | search bar  | ILIKE on display_name                      |

#### 2.4.3 Detail View

**Not available in this slice.** Party entity exposes list-only access in the P0 wave.

#### 2.4.4 Permissions

| Action | Security scheme | Additional requirements |
|--------|-----------------|-------------------------|
| List   | `sessionCookie` | None                    |

---

### 2.5 foundation.calendar

**API route:**

| Route                              | operationId               | Method |
|------------------------------------|---------------------------|--------|
| `/api/v1/foundation/calendars`     | `listFoundationCalendars` | GET    |

#### 2.5.1 List View

**Columns (from CalendarItem schema):**

| Column key    | Type      | Sortable | Description                          |
|---------------|-----------|----------|--------------------------------------|
| `id`          | uuid      | yes      | Calendar primary key                 |
| `name`        | string    | yes      | Calendar display name                |
| `description` | string    | no       | Calendar description text            |
| `timezone`    | string    | yes      | IANA timezone identifier             |
| `active`      | boolean   | yes      | Active status                        |
| `createdAt`   | date-time | yes      | Creation timestamp                   |
| `updatedAt`   | date-time | yes      | Last modification                    |

**Extended DB columns (from calendar table + migration 079):**

| Column key     | Type     | DB index backing                            |
|----------------|----------|---------------------------------------------|
| `calendar_code`| string   | `idx_calendar_status_code_calendar_code`    |
| `calendar_name`| string   | Used in search ILIKE                        |
| `status_code`  | string   | `idx_calendar_status_code_calendar_code`    |
| `base_timezone`| string   | Returned in list view                       |
| `row_version`  | bigint   | Optimistic locking                          |

**Shift count:** The `shiftCount` column is derived at query time by counting
rows in the `shift` table where `shift.calendar_id = calendar.calendar_id` and
`shift.status_code = 'active'`. The shift table is indexed by
`idx_shift_calendar_status_code_shift_code`.

**Default sort:** `calendarCode ASC, calendarId ASC`

**Pagination:** `limit` (1-100, default 25), `cursor` (opaque)

#### 2.5.2 Filters

| Filter key    | Type   | Control     | Description                             |
|---------------|--------|-------------|-----------------------------------------|
| `statusCode`  | string | chip select | Active/inactive filter                  |
| `baseTimezone`| string | dropdown    | Filter by IANA timezone                 |
| `search`      | string | search bar  | ILIKE on calendar_code and calendar_name|

#### 2.5.3 Detail View

**Not available in this slice.** Calendar entity exposes list-only access in the P0 wave.

#### 2.5.4 Permissions

| Action | Security scheme | Additional requirements |
|--------|-----------------|-------------------------|
| List   | `sessionCookie` | None                    |

---

## 3. Field Families and Pack Reference

Each entity in the `domain-field-packs.json` registry produces packs following
a naming convention: `{table_name}_{pack_suffix}`. The pack suffix maps to a
specific screen region:

| Pack suffix      | Screen region          | Purpose                                                 |
|------------------|------------------------|---------------------------------------------------------|
| `_header`        | Detail view hero       | Primary identification fields displayed in the header   |
| `_list_columns`  | List table columns     | Visible columns in the data table                       |
| `_filters`       | Filter panel           | Filterable dimensions shown in the collapsible panel    |
| `_search`        | Search bar             | Fields included in the global search ILIKE clause       |
| `_command_form`  | Create/edit dialog     | Writable fields for create or update commands           |
| `_create_form`   | Create dialog          | Subset of command_form for creation only                |
| `_decide_form`   | Decision panel         | Fields for governance decision submission               |
| `_timeline`      | Timeline event list    | Event type definitions and rendering rules              |
| `_status`        | Status chip config     | Status code to color/label mapping                      |

**Pack field structure (each item in a pack array):**

| Property       | Type    | Description                                              |
|----------------|---------|----------------------------------------------------------|
| `key`          | string  | camelCase field identifier                               |
| `label`        | string  | Vietnamese display label                                 |
| `labelEn`      | string  | English display label                                    |
| `type`         | string  | Control type: `select`, `text`, `textarea`, `number`, `date`, `datetime`, `boolean` |
| `required`     | boolean | Whether the field is mandatory for form submission       |
| `filterable`   | boolean | Whether the field appears in the filter pack             |
| `sortable`     | boolean | Whether the field supports sort-by in list views         |
| `group`        | string  | Semantic group: `identification`, `general`, `quality`, `temporal` |
| `source`       | string  | Always `db_column` for foundation entities               |
| `dbTable`      | string  | Physical database table name                             |
| `dbColumn`     | string  | Physical column name                                     |
| `constraints`  | object  | Validation constraints: `maxLength`, `minLength`, `precision`, `scale`, `pattern` |
| `relationRef`  | string? | FK relation in format `table.column->target_table.target_column` |

**P0 entity-to-pack mapping:**

| Entity                     | header | list_columns | filters | search | create_form | decide_form | timeline | status |
|----------------------------|--------|--------------|---------|--------|-------------|-------------|----------|--------|
| governance.approval_group  | yes    | yes          | yes     | yes    | no*         | yes         | yes      | yes    |
| governance.attachment      | yes    | yes          | yes     | no     | yes         | no          | no       | no     |
| foundation.organization    | yes    | yes          | yes     | yes    | no          | no          | no       | no     |
| foundation.party           | yes    | yes          | yes     | yes    | no          | no          | no       | no     |
| foundation.calendar        | yes    | yes          | yes     | yes    | no          | no          | no       | no     |

*Approval groups are created programmatically via `requestApproval` command, not through a user-facing create form.

---

## 4. Empty / Loading / Error States

### 4.1 Empty States

| Context                  | Message (en)                                   | Message (vi)                                | CTA                        |
|--------------------------|------------------------------------------------|---------------------------------------------|----------------------------|
| Empty list (no filters)  | "No records found"                             | "Khong tim thay ban ghi nao"               | None or "Create new" if applicable |
| Empty list (with filters)| "No records match your filters"                | "Khong co ban ghi nao khop voi bo loc"     | "Clear filters" button     |
| Empty timeline           | "No events recorded yet"                       | "Chua co su kien nao duoc ghi nhan"        | None                       |
| Empty attachments        | "No attachments uploaded"                      | "Chua co tep dinh kem nao"                 | "Upload attachment" button |
| Empty participants       | "No participants assigned"                     | "Chua co nguoi tham gia nao"               | None                       |

### 4.2 Loading States

| Component        | Skeleton pattern                                                          |
|------------------|---------------------------------------------------------------------------|
| List table       | 5 skeleton rows with pulsing gray bars matching column widths             |
| Detail header    | Skeleton title bar (60% width) + status chip placeholder + 2 timestamp bars |
| Timeline         | 3 skeleton event cards with icon circle + 2 text bars each               |
| Attachments      | 3 skeleton rows with file-icon placeholder + filename bar + size bar     |
| Filter panel     | Skeleton dropdown placeholders matching filter count                      |
| Decision panel   | Skeleton radio group (3 items) + textarea placeholder                    |

### 4.3 Error States

All API errors follow one of two formats:

**Legacy envelope errors:**
```
{ "ok": false, "error": "error_code", "detail": "message", "server_time": "..." }
```

**RFC 9457 ProblemDetail errors (governance slice):**
```
{ "type": "urn:qms:problem:...", "title": "...", "status": 4xx, "detail": "..." }
```

**Error-to-UI mapping:**

| HTTP | Error type                          | UI treatment                                              |
|------|-------------------------------------|-----------------------------------------------------------|
| 400  | Bad request                         | Inline field validation errors or toast notification       |
| 401  | Unauthorized                        | Redirect to login page                                    |
| 403  | Forbidden                           | Alert banner: "You do not have permission to perform this action" |
| 403  | Self-approval                       | Alert banner: "Self-approval is not allowed"              |
| 404  | Not found                           | Full-page 404 state with back-to-list link                |
| 409  | Conflict                            | Alert banner: "Invalid state transition" or "Workflow bridge not ready" |
| 412  | Precondition failed                 | Dialog: "Record was modified by another user. Refresh and try again." |
| 415  | Unsupported media type              | Inline error: "File type not supported"                   |
| 422  | Validation error                    | Inline field errors from `violations[]` array             |
| 428  | Precondition required               | Dialog: "Please refresh and try again" (stale or missing ETag) |
| 429  | Rate limited                        | Toast: "Too many requests. Please wait." with countdown from `X-RateLimit-Reset` |
| 500  | Server error                        | Toast: "An unexpected error occurred. Please try again."  |

### 4.4 Optimistic Concurrency UX Flow

1. Client loads detail view, stores `ETag` from response header.
2. User fills decide form and submits.
3. Client sends `POST :decide` with `If-Match: "{stored_etag}"`.
4. If 200: show success toast, refresh detail view.
5. If 412: show dialog "Record was modified by another user", offer "Refresh" button.
6. If 428: show dialog "Please refresh and try again" (ETag was not sent).
7. On refresh: re-fetch detail, update stored ETag, re-enable form.

---

## 5. Observability Tags per Screen

Every screen action emits a structured OTel-compatible event via
`FoundationGovernanceService::emitObservabilityEvent()` or
`SliceObservability::getInstance()`. Events follow the naming convention:
`{domain}.{entity}.{action_past_tense}`.

### 5.1 Foundation Entity Events

| Screen action                    | OTel event name                            | Attributes                                       |
|----------------------------------|--------------------------------------------|--------------------------------------------------|
| Organization list loaded         | `foundation.organization.list_loaded`      | `{ limit, cursor, organizationType, resultCount }` |
| Organization list filtered       | `foundation.organization.list_filtered`    | `{ filterKeys[], resultCount }`                  |
| Party list loaded                | `foundation.party.list_loaded`             | `{ limit, cursor, partyType, resultCount }`      |
| Party list filtered              | `foundation.party.list_filtered`           | `{ filterKeys[], resultCount }`                  |
| Calendar list loaded             | `foundation.calendar.list_loaded`          | `{ limit, cursor, resultCount }`                 |
| Calendar list filtered           | `foundation.calendar.list_filtered`        | `{ filterKeys[], resultCount }`                  |

### 5.2 Governance Entity Events

| Screen action                    | OTel event name                            | Attributes                                       |
|----------------------------------|--------------------------------------------|--------------------------------------------------|
| Approval group list loaded       | `governance.approval_group.list_loaded`    | `{ limit, cursor, statusCode, resultCount }`     |
| Approval group list filtered     | `governance.approval_group.list_filtered`  | `{ filterKeys[], resultCount }`                  |
| Approval group detail loaded     | `governance.approval_group.detail_loaded`  | `{ approvalGroupId, statusCode, etag }`          |
| Decision form opened             | `approval.decision.form_opened`            | `{ approvalGroupId, currentStatus }`             |
| Decision submitted               | `approval.decision.executed`               | `{ approvalGroupId, decisionCode, reasonCode }`  |
| Decision failed                  | `approval.decision.failed`                 | `{ approvalGroupId, httpStatus, problemType }`   |
| Timeline loaded                  | `governance.timeline.loaded`               | `{ approvalGroupId, eventCount }`                |
| Timeline page advanced           | `governance.timeline.page_advanced`        | `{ approvalGroupId, cursor }`                    |

### 5.3 Attachment Events

| Screen action                    | OTel event name                            | Attributes                                       |
|----------------------------------|--------------------------------------------|--------------------------------------------------|
| Attachment list loaded           | `governance.attachment.list_loaded`        | `{ approvalGroupId, resultCount }`               |
| Attachment detail loaded         | `governance.attachment.detail_loaded`      | `{ attachmentId, contentType, sizeBytes }`       |
| Attachment upload initiated      | `attachment.intake_initiated`              | `{ approvalGroupId, filename, contentType, sizeBytes }` |
| Attachment upload completed      | `attachment.intake_completed`              | `{ attachmentId, checksumSha256, durationMs }`   |
| Attachment upload failed         | `attachment.intake_failed`                 | `{ httpStatus, problemType, filename }`          |

### 5.4 Error Observability

All RFC 9457 problem responses are enriched with OTel trace context by
`SliceObservability::enrichProblem()`. The enriched problem body includes:

| Field              | Source                        | Description                              |
|--------------------|-------------------------------|------------------------------------------|
| `traceId`          | OTel W3C Trace Context        | Distributed trace identifier             |
| `spanId`           | OTel W3C Trace Context        | Current span identifier                  |
| `service`          | Hardcoded                     | `foundation_governance_contract_slice`   |
| `component`        | Calling service class name    | e.g. `ApprovalGroupController`           |

### 5.5 Client-Side Event Naming

Frontend components should emit matching client-side events with a `.client`
suffix for round-trip observability:

| Server event                          | Client event                                    |
|---------------------------------------|-------------------------------------------------|
| `governance.approval_group.list_loaded` | `governance.approval_group.list_loaded.client` |
| `approval.decision.executed`          | `approval.decision.executed.client`             |
| `attachment.intake_initiated`         | `attachment.intake_initiated.client`            |

---

## 6. Cross-Cutting Conventions

### 6.1 Security Headers (All Requests)

| Header            | When required                   | Source                                   |
|-------------------|---------------------------------|------------------------------------------|
| `Cookie: PHPSESSID=...` | All authenticated routes   | PHP session from login flow              |
| `X-CSRF-Token`    | All POST/PUT/DELETE             | `csrf_token` from auth status response   |
| `If-Match`        | Decide command                  | `ETag` from last GET of the resource     |

### 6.2 Response Envelope Patterns

| Pattern                | Shape                                    | Used by                              |
|------------------------|------------------------------------------|--------------------------------------|
| Connection (list)      | `{ data: T[], pageInfo: CursorPageInfo }`| All list endpoints                   |
| Envelope (detail)      | `{ data: T }`                            | All detail/single-resource endpoints |
| ProblemDetail (error)  | `{ type, title, status, detail, ... }`   | All governance error responses       |
| Legacy error           | `{ ok: false, error, detail, server_time }` | Auth and legacy endpoints         |

### 6.3 Date/Time Handling

- All timestamps are ISO 8601 with UTC offset (`2026-04-07T08:00:00+00:00`)
- Client renders in user's local timezone using `baseTimezone` from organization
  or browser `Intl.DateTimeFormat`
- Relative timestamps ("2 hours ago") for timeline events less than 24 hours old
- Absolute timestamps for all other cases

### 6.4 Internationalization Slots

Every field label has both `label` (Vietnamese) and `labelEn` (English) in the
field pack. The frontend reads the user's locale preference and selects the
appropriate label key at render time. Status chip labels follow the same pattern.

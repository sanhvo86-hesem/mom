# Prompt 03 -- Frontend Contract Authority

> Generated: 2026-04-07
> Canonical source chain: `generate-module-builder-registry.mjs` -> `endpoint-catalog.json`
> -> `frontend-foundation-catalog.json` -> `data-fields.json` + `data-fields-part2.json`
> -> `domain-field-packs.json` -> screen metadata

---

## 1. Single Authority Chain

The frontend contract follows a strict, linear authority chain. Every screen definition, field layout, permission gate, and readiness verdict traces back through exactly one path. There is no secondary source of truth.

### 1.1 Chain Links

```
[1] generate-module-builder-registry.mjs
     |
     | Reads registry JSON files, computes readiness, emits catalog
     v
[2] endpoint-catalog.json
     |
     | Canonical API surface: every route, method, params, response shape
     | 528 entity endpoints mapped to controllers and services
     v
[3] frontend-foundation-catalog.json
     |
     | Per-entity module definition: capabilities, readiness score,
     | verdict (ready / partial / blocked), blockers list
     v
[4] data-fields.json + data-fields-part2.json
     |
     | Master field definitions: field_key, data_type, label, labelVi,
     | validation rules, display hints, enum sets, unit references
     v
[5] domain-field-packs.json
     |
     | Per-domain field groupings: which fields appear in which domain,
     | section assignments, ordering, required/optional, conditional visibility
     v
[6] Screen Metadata (runtime)
     |
     | Assembled at build time from [3]+[4]+[5]: list columns, detail sections,
     | form layouts, timeline config, attachment panels, command buttons
```

### 1.2 Authority Rules

1. **No out-of-band definitions.** If a field is not in `data-fields.json` or `data-fields-part2.json`, it does not exist in the frontend.
2. **No endpoint invention.** If a route is not in `endpoint-catalog.json`, the frontend must not call it.
3. **No readiness override.** The verdict in `frontend-foundation-catalog.json` is final. A developer cannot manually mark a module as "ready" without the score meeting the threshold.
4. **No split-field packs.** A domain gets exactly one entry in `domain-field-packs.json`. Partial packs or per-screen overrides are forbidden.
5. **Idempotent generation.** Running `generate-module-builder-registry.mjs` twice with the same inputs must produce byte-identical output.

### 1.3 Update Protocol

When any link in the chain changes:

1. Update the source registry file (e.g., add a field to `data-fields.json`)
2. Regenerate downstream: run `generate-module-builder-registry.mjs`
3. Verify: check that `frontend-foundation-catalog.json` reflects the change
4. Commit all changed files together -- never commit a partial chain update

---

## 2. Readiness Gates

### 2.1 Verdict Computation

Each entity module receives a **readiness score** (0-100) computed from capability weights. The verdict is determined by:

| Condition | Verdict | Meaning |
|---|---|---|
| `score >= 80` AND `blockers.length === 0` | **ready** | Frontend can build full UI for this entity |
| `score >= 55` AND `score < 80` | **partial** | Some capabilities available; others show placeholders |
| `score < 55` OR `blockers.length > 0` | **blocked** | Do not generate frontend; entity is not safe to expose |

### 2.2 Capability Weights

Each capability contributes a weighted score to the total:

| Capability | Weight | Description |
|---|---|---|
| `list` | 12 | Paginated list view with columns, sort, filter |
| `detail` | 16 | Single-entity detail view with sections and semantic slots |
| `form` | 12 | Create/edit form with validation |
| `workflow` | 14 | Status transitions, FSM visualization, action buttons |
| `timeline` | 10 | Chronological event history (audit + business events) |
| `attachments` | 8 | Evidence panel with upload/download/verify |
| `commands` | 8 | Entity-specific actions (approve, release, dispatch, etc.) |
| `search` | 6 | Full-text and faceted search across entity instances |
| `export` | 4 | CSV/Excel/PDF export of list or detail |
| `permissions` | 6 | RBAC + ABAC gate definitions for this entity |
| `observability` | 4 | OTel event mapping for every screen action |
| **Total** | **100** | |

### 2.3 Capability Scoring Rules

A capability scores its full weight only if ALL of the following are true:

- **Backend endpoint exists** in `endpoint-catalog.json` for the required HTTP methods
- **Field definitions exist** in `data-fields.json` / `data-fields-part2.json` for all columns used by the capability
- **Domain field pack** includes the fields in the correct sections
- **Status options** are defined in `status-options.json` (for workflow capability)
- **Validation rules** are defined in `validation-rules.json` (for form capability)

A capability scores **half weight** if the endpoint exists but field definitions are incomplete.

A capability scores **zero** if the endpoint does not exist.

### 2.4 Blocker Rules

A blocker is any condition that forces the verdict to `blocked` regardless of score:

| Blocker Code | Condition |
|---|---|
| `NO_ENDPOINT` | Zero endpoints in `endpoint-catalog.json` for this entity |
| `NO_PRIMARY_KEY` | Entity table lacks a UUID primary key in `table-registry.json` |
| `NO_STATUS_SET` | Entity has a status column but no matching entry in `status-options.json` |
| `SCHEMA_MISMATCH` | Migration file and `table-registry.json` disagree on column set |
| `NO_SMOKE_TEST` | Entity is in P0 wave but has no smoke test file |
| `SERVICE_MISSING` | No service class implements the business logic for this entity |
| `FIELD_PACK_EMPTY` | Domain field pack exists but contains zero fields for this entity |

### 2.5 Example Readiness Computation

```
Entity: approval_group
Capabilities:
  list:          12/12  (GET /api/approval-groups exists, fields defined, pack complete)
  detail:        16/16  (GET /api/approval-groups/{id} exists, snapshot ETag)
  form:          12/12  (POST + PUT exist, validation rules defined)
  workflow:      14/14  (status set defined, FSM transitions in workflow-library)
  timeline:      10/10  (timeline projection implemented in ApprovalGroupService)
  attachments:    8/8   (evidence vault integration via EvidenceController)
  commands:       8/8   (requestApproval command endpoint exists)
  search:         6/6   (list endpoint supports filter params)
  export:         2/4   (CSV exists, PDF not yet)
  permissions:    6/6   (RBAC gates defined)
  observability:  4/4   (all OTel events mapped)

Score: 98/100
Blockers: []
Verdict: READY
```

---

## 3. Field Definition Authority

### 3.1 Source Files

| File | Content | Approx Size |
|---|---|---|
| `data-fields.json` | Primary field definitions (A-M domains) | ~3 600 fields |
| `data-fields-part2.json` | Continuation field definitions (N-Z domains) | ~2 400 fields |
| `data-fields-index.json` | Lookup index: field_key -> file + offset | All ~6 000 fields |

### 3.2 Field Definition Schema

Each field entry contains:

```json
{
  "field_key": "organization_name",
  "data_type": "varchar(200)",
  "label": "Organization Name",
  "labelVi": "Ten to chuc",
  "description": "Legal or trading name of the organization entity",
  "domain": "master_data_governance",
  "entity": "organization",
  "required": true,
  "unique": false,
  "indexed": true,
  "searchable": true,
  "display_hint": "text_input",
  "max_length": 200,
  "validation_rule": "non_empty_string",
  "enum_set": null,
  "unit_reference": null,
  "computed": false,
  "part11_audited": true,
  "section": "header"
}
```

### 3.3 Data Type Mapping

| Registry Type | Frontend Control | Validation |
|---|---|---|
| `uuid` | Hidden / read-only label | UUID v4 format |
| `varchar(N)` | Text input | Max length N |
| `text` | Textarea | Optional max |
| `integer` | Number input | Integer range |
| `numeric(P,S)` | Decimal input | Precision/scale |
| `boolean` | Toggle / checkbox | true/false |
| `timestamptz` | DateTime picker | ISO 8601 |
| `date` | Date picker | YYYY-MM-DD |
| `jsonb` | JSON editor / structured form | Schema validation |
| `enum` | Select / radio group | Allowed values from enum_set |

### 3.4 Domain Field Packs

`domain-field-packs.json` groups fields into per-domain packs:

```json
{
  "master_data_governance": {
    "organization": {
      "header": ["org_code", "org_name", "org_type", "parent_org_id"],
      "details": ["legal_entity_code", "timezone", "default_currency", "address_id"],
      "status": ["status", "is_deleted", "row_version"],
      "audit": ["created_at", "updated_at", "created_by", "updated_by"]
    },
    "party": { ... },
    "calendar": { ... }
  }
}
```

Section assignment determines where a field appears in the detail view and form layout.

---

## 4. Screen Contract Rules

### 4.1 List View Contract

Every entity list view must conform to:

| Aspect | Rule |
|---|---|
| **Columns** | Derived from `domain-field-packs[domain][entity].header` + `status` section |
| **Default sort** | First indexed field in header section, ascending |
| **Sort options** | Any field with `indexed: true` in field definition |
| **Filter** | Any field with `searchable: true`; enum fields get dropdown filter |
| **Pagination** | Keyset cursor (opaque Base64url); page size default 25, max 100 |
| **ETag** | Response includes `ETag` header; client sends `If-None-Match` for cache |
| **Empty state** | Render standard empty-state component with entity label |
| **Loading state** | Skeleton rows matching column count |
| **Error state** | Standard error card with retry button |
| **Bulk actions** | Only if entity has `commands` capability at full weight |
| **Row click** | Navigate to detail view; row is focusable for keyboard nav |

### 4.2 Detail View Contract

| Aspect | Rule |
|---|---|
| **Sections** | One card per section from field pack: header, details, status, audit |
| **Semantic slots** | `hero` (top: entity code + name), `status_badge`, `action_bar`, `timeline_panel`, `evidence_panel` |
| **Hero slot** | First two fields from header section |
| **Status badge** | Colored chip derived from status-options.json color mapping |
| **Action bar** | Buttons for each command in `commands` capability; disabled if FSM forbids transition |
| **Timeline panel** | Rendered if `timeline` capability weight > 0; chronological event list |
| **Evidence panel** | Rendered if `attachments` capability weight > 0; upload/download/verify |
| **Breadcrumb** | Module label > Entity label > Instance identifier |
| **ETag** | Detail response ETag drives optimistic concurrency on save |

### 4.3 Create / Edit Form Contract

| Aspect | Rule |
|---|---|
| **Form fields** | All fields from `header` + `details` sections where `computed: false` |
| **Required fields** | Fields with `required: true` show asterisk, block submit if empty |
| **Validation** | Client-side from `validation-rules.json`; server echoes same rules |
| **Enum fields** | Select control populated from `status-options.json` or `enum_set` |
| **FK fields** | Autocomplete search against the referenced entity list endpoint |
| **Conditional fields** | Visibility rules from `validation-rules.json` conditional block |
| **Default values** | From field definition `default_value` if present |
| **Dirty tracking** | Only changed fields sent in PATCH/PUT payload |
| **Conflict handling** | On `409 Conflict`, show diff dialog with server vs. local values |
| **Submit** | POST for create, PUT for update; include `If-Match` ETag on update |

### 4.4 Timeline Contract

| Aspect | Rule |
|---|---|
| **Events** | Fetched from `GET /api/{entity}/{id}/timeline` |
| **Event types** | `state_transition`, `field_change`, `comment`, `attachment`, `e_signature` |
| **Rendering** | Vertical timeline; each event shows icon, actor, timestamp, description |
| **Filtering** | By event type, date range, actor |
| **Infinite scroll** | Cursor-based pagination on timeline events |

### 4.5 Attachment Contract

| Aspect | Rule |
|---|---|
| **Upload** | `POST /api/evidence/upload` with `multipart/form-data` |
| **Download** | `GET /api/evidence/{id}/download`; verify hash on response |
| **List** | Panel shows attachments linked to current entity (polymorphic FK) |
| **Verification** | UI shows green checkmark if hash matches, red alert if tamper detected |
| **Drag and drop** | Supported; files queued and uploaded sequentially |
| **Size limit** | Per-file limit from server config; shown in upload dialog |

### 4.6 Command Contract

| Aspect | Rule |
|---|---|
| **Command list** | Derived from entity workflow transitions available from current state |
| **Button placement** | Primary command (most common next transition) = primary button; others = dropdown |
| **Confirmation** | Commands with `requires_esig: true` show e-signature dialog |
| **Reason code** | Commands with `requires_reason: true` show reason code selector + comment |
| **Optimistic UI** | Button disables immediately; re-enables on error; state updates on success |
| **Batch commands** | If list view has bulk actions, commands apply to selected rows |

---

## 5. Permission Model

### 5.1 RBAC Foundation

Permissions follow the pattern: `{domain}.{entity}.{action}`

```
master_data_governance.organization.list
master_data_governance.organization.detail
master_data_governance.organization.create
master_data_governance.organization.update
master_data_governance.organization.delete
master_data_governance.organization.approve
```

Roles are collections of permissions:

| Role | Scope | Example Permissions |
|---|---|---|
| `system_admin` | Global | All permissions |
| `quality_manager` | Domain | `quality_management.*.*` |
| `production_supervisor` | Domain | `mes_execution.*.list`, `mes_execution.*.detail`, `mes_execution.work_order.update` |
| `inspector` | Entity | `quality_management.inspection_lot.*`, `quality_management.result_record.create` |
| `viewer` | Read-only | `*.*.list`, `*.*.detail` |

### 5.2 ABAC Extensions

Beyond role-based checks, attribute-based conditions apply:

| Attribute | Example Rule |
|---|---|
| `org_scope` | User can only see entities within their assigned organization subtree |
| `plant_scope` | User restricted to specific plant(s) |
| `data_classification` | Confidential entities require `clearance >= SECRET` |
| `time_window` | Certain transitions only allowed during business hours (calendar-aware) |
| `ownership` | Creator can edit draft entities; others need explicit permission |

### 5.3 Capability-to-Permission Mapping

| Capability | Required Permission(s) |
|---|---|
| `list` | `{domain}.{entity}.list` |
| `detail` | `{domain}.{entity}.detail` |
| `form` (create) | `{domain}.{entity}.create` |
| `form` (edit) | `{domain}.{entity}.update` |
| `workflow` | `{domain}.{entity}.{transition_action}` (e.g., `.approve`, `.release`) |
| `commands` | Per-command: `{domain}.{entity}.{command_name}` |
| `attachments` | `evidence.attachment.upload`, `evidence.attachment.download` |
| `export` | `{domain}.{entity}.export` |

### 5.4 Frontend Enforcement

1. **Route guard**: Check `list` permission before rendering module route
2. **Button visibility**: Check per-action permission; hide unauthorized buttons entirely (do not show disabled)
3. **Form field masking**: Fields with `data_classification > user_clearance` render as `***` read-only
4. **API fallback**: Server always re-checks permissions; frontend enforcement is UX convenience, not security boundary

---

## 6. Observability Tags

### 6.1 OTel Event Naming Convention

Every frontend action emits an OTel-compatible event using the naming pattern:

```
{domain}.{entity}.{screen}.{action}
```

Examples:

```
master_data_governance.organization.list.load
master_data_governance.organization.list.filter
master_data_governance.organization.list.sort
master_data_governance.organization.list.page_next
master_data_governance.organization.detail.load
master_data_governance.organization.detail.edit_start
master_data_governance.organization.form.submit
master_data_governance.organization.form.validation_error
master_data_governance.organization.workflow.transition_request
master_data_governance.organization.workflow.transition_complete
master_data_governance.organization.timeline.load
master_data_governance.organization.attachments.upload_start
master_data_governance.organization.attachments.upload_complete
master_data_governance.organization.commands.approve
```

### 6.2 Standard Attributes

Every event carries these attributes:

| Attribute | Source |
|---|---|
| `entity_type` | From module definition |
| `entity_id` | Current entity UUID (detail/form screens) |
| `user_id` | From JWT claims |
| `session_id` | Browser session identifier |
| `org_scope` | User's current organization context |
| `timestamp` | ISO 8601 with milliseconds |
| `screen` | `list`, `detail`, `form`, `timeline` |
| `action` | Specific user action |
| `duration_ms` | Time from action start to completion (for async actions) |
| `result` | `success`, `error`, `conflict`, `forbidden` |

### 6.3 Error Events

Errors include additional attributes:

```json
{
  "error.type": "validation_error | api_error | network_error | permission_denied",
  "error.status_code": 409,
  "error.message": "Optimistic lock conflict: row_version mismatch",
  "error.retry_eligible": true
}
```

### 6.4 Performance Spans

Screen loads and form submissions create spans:

```
span: organization.detail.load
  start: page navigation
  marks: api_request_start, api_response_received, render_start, render_complete
  end: fully interactive
  attributes: ttfb_ms, api_duration_ms, render_duration_ms, total_duration_ms
```

---

## 7. No Split-Truth Rule

### 7.1 The Rule

> All readiness verdicts, field definitions, endpoint mappings, and screen contracts
> MUST trace to exactly ONE authority chain (Section 1). If any runtime behavior
> disagrees with the registry chain, the runtime is wrong and must be fixed.

### 7.2 Violations and Remediation

| Violation | Example | Fix |
|---|---|---|
| **Hardcoded fields** | Developer adds a column to list view that is not in field pack | Remove from component; add to `data-fields.json` + pack if legitimate |
| **Shadow endpoints** | Frontend calls an API route not in `endpoint-catalog.json` | Add to catalog or remove the call |
| **Manual readiness** | Developer marks module as "ready" in a config file | Delete override; fix underlying capability gaps to raise score |
| **Stale cache** | `frontend-foundation-catalog.json` not regenerated after registry update | Re-run `generate-module-builder-registry.mjs`; CI enforces this |
| **Duplicate field defs** | Field defined in both a component and `data-fields.json` | Remove component-level definition; always read from registry |
| **Status invention** | Frontend renders a status badge not in `status-options.json` | Add to status options or remove from UI |

### 7.3 CI Enforcement

The build pipeline enforces the no-split-truth rule:

1. **Registry regeneration check**: `generate-module-builder-registry.mjs` runs in CI; output diff must be empty
2. **Field coverage check**: Every field referenced in frontend components must exist in `data-fields.json` or `data-fields-part2.json`
3. **Endpoint coverage check**: Every API call in frontend code must map to an `endpoint-catalog.json` entry
4. **Readiness gate check**: No module with verdict `blocked` may have a route registered in the frontend router
5. **Orphan detection**: Fields in packs that are not in any field definition file are flagged as errors

### 7.4 Developer Workflow

When adding a new entity to the frontend:

1. Verify entity exists in `table-registry.json` with correct schema
2. Verify endpoints exist in `endpoint-catalog.json`
3. Add field definitions to `data-fields.json` / `data-fields-part2.json` if missing
4. Add domain field pack entry to `domain-field-packs.json`
5. Run `generate-module-builder-registry.mjs`
6. Check `frontend-foundation-catalog.json` -- verdict must be `ready` or `partial`
7. If `blocked`, resolve blockers before writing any frontend code
8. Implement screen components using ONLY registry-derived metadata
9. Add OTel event tags matching the naming convention
10. Add permission checks matching the capability-to-permission mapping

### 7.5 Exception Process

There is no exception process. If the registry says an entity is blocked, it is blocked. The only path to "ready" is to complete the missing capabilities in the backend and registry. This prevents technical debt from accumulating in the form of frontend screens backed by incomplete or nonexistent services.

---

## Appendix A: Quick Reference -- Verdict Thresholds

```
READY:    score >= 80  AND  blockers == 0
PARTIAL:  score >= 55  AND  score < 80
BLOCKED:  score < 55   OR   blockers > 0
```

## Appendix B: File Path Reference

| File | Path |
|---|---|
| Generator | `tools/generate-module-builder-registry.mjs` |
| Endpoint catalog | `qms-data/registry/endpoint-catalog.json` |
| Frontend catalog | `qms-data/registry/frontend-foundation-catalog.json` |
| Field definitions (1) | `qms-data/registry/data-fields.json` |
| Field definitions (2) | `qms-data/registry/data-fields-part2.json` |
| Field index | `qms-data/registry/data-fields-index.json` |
| Domain field packs | `qms-data/registry/domain-field-packs.json` |
| Table registry | `qms-data/registry/table-registry.json` |
| Status options | `qms-data/registry/status-options.json` |
| Validation rules | `qms-data/registry/validation-rules.json` |
| Workflow library | `qms-data/registry/workflow-library.json` |
| Relation map | `qms-data/registry/relation-map.json` |
| Domain architecture | `qms-data/registry/domain-architecture.json` |

# API Frontend Contract Policy

This policy is backend-first. The current frontend is sample-only. Future frontend must not infer product workflows from raw endpoint catalogs or table registry.

## Non-Negotiable Policy

Frontend must not consume raw endpoint catalog directly for business mutation. Frontend may call only approved process APIs and read projections that have:

- Domain owner.
- Runtime authority classification.
- Versioned OpenAPI contract.
- Idempotency requirement for mutation.
- Error response contract.
- Audit/correlation headers.
- Test evidence in `END_TO_END_SIMULATION_TEST_PLAN.md`.

Generic CRUD is not a frontend business API.

## Allowed Process APIs

Allowed only after implementation and runtime-safe review:

| API | Purpose | Required status |
| --- | --- | --- |
| `POST /api/v1/commands/ConvertQuoteToSalesOrder` | Convert accepted quote to SO atomically | New required command |
| `POST /api/v1/commands/ConfirmSalesOrder` | Contract/PO confirmation | New required command |
| `POST /api/v1/commands/ReleaseSalesOrderToProduction` | Engineering readiness | New required command |
| `POST /api/v1/commands/CreateJobOrder` | JO creation | New required command |
| `POST /api/v1/commands/ReleaseJobOrder` | JO release | New required command |
| `POST /api/v1/commands/CreateWorkOrder` | WO creation | New required command |
| `POST /api/v1/commands/ReleaseWorkOrder` | WO release | New required command |
| `POST /api/v1/commands/IssueMaterialToWorkOrder` | Inventory/WIP issue | New required command |
| `POST /api/v1/commands/CompleteOperation` | Operation completion | New required command |
| `POST /api/v1/commands/RecordOqcResult` | OQC result and quality gate | New required command |
| `POST /api/v1/commands/ConfirmPacking` | Packing confirmation | New required command |
| `POST /api/v1/commands/ConfirmDelivery` | Shipment/delivery confirmation | New required command |
| `POST /api/v1/commands/ReceivePurchaseOrder` | PO receiving | New required command |
| `POST /api/v1/commands/RecordIqcResult` | IQC result | New required command |
| `POST /api/v1/commands/PutawayInventory` | Putaway | New required command |
| `POST /api/v1/commands/PostApInvoice` | AP posting | New required command |
| `POST /api/v1/commands/RunThreeWayMatch` | 3-way match | New required command |
| `POST /api/v1/commands/CloseFinancePeriod` | Period close enforcement | New required command |
| `POST /api/v1/commands/CreateElectronicSignature` | Part 11 signature | New required command |
| `GET /api/v1/projections/*` | Read models only | Must be versioned and owner-approved |

Existing dedicated endpoints may stay for internal/admin/compatibility until replaced, but must be marked `not runtime-safe for frontend mutation` unless the command contract is met.

## Internal/Admin-Only APIs

| Endpoint/action | Classification | Reason |
| --- | --- | --- |
| `/api/runtime/{domain}/{table}` read | Admin/internal/read projection only | Generic table shape is not business workflow contract. |
| `/api/registry/*` | Internal/control-plane | Can expose registry internals, not process UX contract. |
| `schema_studio_*` | Admin/control-plane | Can alter schema/registry/data; never product workflow. |
| `module_schema_*` | Admin/control-plane | Can alter module metadata. |
| `admin_metadata_*` | Admin/control-plane | Can mutate API/table/schema metadata. |
| `vps_file_*` | Admin/ops only | File mutation/upload to controlled assets. |
| `admin_git_*` | Admin/ops only | Server repository/workspace operations. |
| `master_data_*` mutation | MDM admin only until command/approval workflow exists | Can change release inputs. |
| `finance_period_close_*` existing endpoints | Finance admin only | Control records exist but posting enforcement is incomplete. |

## Blocked Destructive APIs

These must be denied to product frontend and populated in `destructive-endpoint-quarantine.json`:

| Route/action | Required frontend policy |
| --- | --- |
| `DELETE /api/runtime/{domain}/{table}/{id}` | Blocked for all governed domains. |
| `{domain}.{table}.delete` | Blocked unless non-governed admin table with owner approval. |
| `doc_delete_drafts`, `doc_delete_version` | Document-control admin only. |
| `delete_doc`, `delete_folder` | Document-control admin only; archive/evidence required. |
| `admin_user_delete`, `admin_user_reset_password` | Security admin only with re-auth/evidence. |
| `admin_git_discard_local`, `admin_git_pull`, `admin_git_sync` | Ops admin only; never product UI. |
| `dict_delete` | Admin only. |
| `master_data_delete` | MDM admin only with dependency, release freeze, and e-signature. |
| `module_schema_delete`, `module_schema_reset` | Admin/control-plane only. |
| `schema_studio_delete`, `schema_studio_apply_migration`, `schema_studio_table_row_save` | Admin/control-plane only. |
| `vps_file_mutate`, `vps_file_upload` | Admin/ops only. |

Current finding: `mom/data/registry/destructive-endpoint-quarantine.json` has `endpointCount: 0`, which is a documentation-runtime mismatch because the routes above exist.

## Generic CRUD Allowlist/Denylist

Default: deny all mutation.

Read-only allowlist can include:

- Non-governed reference projections after domain owner review.
- Dashboards/read models that are generated from command events.
- Registry metadata for admin surfaces only.

Mutation denylist must include at minimum:

| Domain/table | Deny operations |
| --- | --- |
| `sales.sales_orders`, `sales.sales_order`, `sales.quotes` | create/update/delete/transition |
| `production.job_orders`, `production.work_orders`, `mes_execution.work_order` | create/update/delete/transition |
| `inventory.inventory_transactions`, `inventory.inventory_ledger`, `inventory_balance_snapshot`, `stock_balances` | all mutation |
| `purchasing.purchase_orders`, `purchase_receipts`, `ap_invoices` | all mutation |
| `quality_management.ncr_records`, `capa_records`, `scar_records`, `oqc_inspections` | all mutation |
| `finance.*`, `finance_treasury.*` posting tables | all mutation except approved commands |
| `foundation_governance.electronic_signature` | all mutation except `CreateElectronicSignature` |
| `traceability_serialization.lot`, `serial`, `mes_part_genealogy`, `dpp_passports` | all mutation except trace commands |

## Runtime-Unsafe Endpoint Policy

An endpoint is runtime-unsafe if any of these are true:

- Writes a governed business table/store without dedicated command service.
- Has no required `Idempotency-Key`.
- Does not define transaction boundary.
- Does not check status/workflow authority.
- Does not check quality/finance/inventory gates.
- Writes JSON and PG separately without reconciliation.
- Has no audit/evidence.
- Can hard-delete or hide business records.
- Can bypass command path by writing status directly.

Runtime-unsafe endpoints must return `403 forbidden_runtime_unsafe` to product frontend roles.

## Versioning

- Process APIs use `/api/v1/commands/{CommandName}`.
- Read projections use `/api/v1/projections/{domain}/{projection}`.
- Version breaking changes require new command version or compatibility adapter.
- `deprecated_at`, `sunset_at`, replacement command, and migration note are required for old endpoints.

## Idempotency Requirements

Every mutation command requires:

- `Idempotency-Key` header.
- Command fingerprint hash over normalized DTO, actor, tenant/site, command name.
- TTL at least 24 hours for ordinary commands, longer for finance/shipment/quality if needed.
- Replay returns same response, status code, command ID, and entity IDs.
- Different payload with same key returns `409 idempotency_conflict`.

## Error Response Contract

```json
{
  "ok": false,
  "error": {
    "code": "quality_hold_blocks_shipment",
    "message": "Shipment cannot be confirmed while quality hold is active.",
    "retryable": false,
    "violations": [
      {"field": "sales_order_id", "rule": "no_active_quality_hold", "evidence": "HOLD-20260413-001"}
    ]
  },
  "command": "ConfirmDelivery",
  "correlation_id": "corr-...",
  "server_time": "2026-04-13T00:00:00Z"
}
```

## Workflow Transition Contract

Workflow transitions are not generic state writes. They must be:

- Command-specific.
- Role-guarded.
- Evidence-aware.
- Idempotent.
- Transactional.
- Audited.
- Generated from canonical workflow authority.

Generic transition endpoints may only be used for non-governed admin metadata after owner approval.

## Pagination/Filter/Sort Contract

Read projections must support:

- `limit` max 200 by default unless otherwise approved.
- `cursor` or `offset` with stable ordering.
- Explicit `sort` allowlist.
- Explicit filter allowlist.
- `include_total=false` default for large tables.
- `as_of` or projection version where audit reconstruction matters.

## Required Headers

| Header | Required for | Notes |
| --- | --- | --- |
| `Idempotency-Key` | All mutation commands | Not optional. |
| `X-Correlation-Id` | All requests | Generated by server if absent for read-only, required for commands. |
| `X-CSRF-Token` | Browser session mutation | Existing CSRF continues. |
| `If-Match` or `X-Row-Version` | Record update where applicable | Optimistic concurrency. |
| `X-Actor-Reason` | Overrides/destructive/admin repair | Must be audited. |


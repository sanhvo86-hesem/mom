# MDA Postgres Blueprint

Generated: 2026-05-29

## Authority stance

- PostgreSQL remains the target transactional authority for governed master data.
- The blueprint uses normalized authority tables plus projections.
- JSON remains migration bridge/cache/export only.
- No super-table for all MDA objects is allowed.

## Domain packages

### 1. Foundation governance package

Existing repo tables:
- `org_enterprise`, `org_company`, `org_site`, `org_plant`, `org_warehouse`, `org_work_center`, `org_work_unit`
- `party`, `party_role`, `party_site`, `party_contact`
- `uom`, `calendar`, `shift`, `reason_code`, `status_code`
- `electronic_signature`, `approval`, `attachment`

Blueprint rules:
- `party` is canonical legal/person root.
- `party_role` carries customer/supplier/internal role assignment with effectivity.
- `uom` is foundational reference master.
- `approval` and `electronic_signature` are shared governance tables, never business roots.
- Add `row_version`, `source_system`, `source_record_id`, `created_by`, `updated_by` where missing or standardize via migration uplift.

### 2. Identity and RBAC package

Existing repo tables:
- `users`, `roles`, `user_roles`, `employees`

Target additions:
- `user_party_link` target bridge table because repo has identity SSOT rules but no explicit canonical bridge table was proven in this turn.
- `operator_qualification` target link table or governed view because operator runtime is still projection-heavy.

Blueprint rules:
- `users` remains account/auth root.
- `employees` remains HR profile / person-org assignment source.
- `user_party_link` maps user to party/employee canonical identity.
- `operator_qualification` is link/eligibility, not separate person root.

### 3. Item and revision package

Existing repo tables:
- legacy ERP lane: `items`, `item_revisions`, `bill_of_materials`, `bom_components`, `routings`, `routing_operations`
- canonical lane: `item`, `item_revision`, `item_site`, `item_spec`, `item_attr`, `item_variant`, `lot_policy`, `serial_policy`, `shelf_life_policy`

Blueprint rules:
- `item`/`item_revision` in canonical lane are target authority.
- legacy `items`/`item_revisions` stay migration bridge until P15 cutover.
- `item_site` is mandatory for site/plant release readiness.
- `item_spec` stores governed specification rows linked to revision.
- Add non-overlap effectivity rules on `item_revision` released windows per item.

### 4. Engineering definition package

Existing repo tables:
- `bill_of_materials`, `bom_components`
- `routings`, `routing_operations`
- `control_plans`, `control_plan_characteristics`
- `inspection_plans`
- `mes_nc_release_packages`

Target additions:
- `engineering_release_bundle`
- `engineering_release_bundle_member`

Blueprint rules:
- child definition tables remain normalized and authoritative for their own content.
- released execution meaning is granted only through `engineering_release_bundle`.
- bundle holds released item revision + BOM + routing + control plan + inspection plan + NC package references with effectivity and release evidence.
- no direct mutation on released child rows without supersede/change-control path.

### 5. Quality planning and supplier/customer approval package

Existing repo tables:
- `control_plans`, `control_plan_characteristics`
- `inspection_plans`
- `approved_supplier_list`
- `incoming_inspections`, `incoming_inspection_results`
- `scar_records`

Target additions or bridges:
- `customer_item_approval`
- `supplier_process_approval`
- `quality_gate_profile`
- `traveler_template`

Blueprint rules:
- `approved_supplier_list` remains supplier lifecycle authority until unified party-role bridge is implemented.
- customer/supplier approval objects must become explicit lifecycle owners instead of JSON-only collections.
- incoming inspection and SCAR stay transaction/result domains, not master roots.

### 6. Equipment, work-unit, connectivity package

Existing repo tables:
- `equipment`, `work_centers`, `mes_connectivity_adapters`, `mes_connectivity_events`
- `mes_alarm_catalog`, `mes_alarm_playbooks`
- `mes_equipment_extended` projection/runtime extension

Blueprint rules:
- `equipment` or canonical `EquipmentAsset` package is reference-master authority.
- `mes_connectivity_adapters` is governed reference master for adapter identity.
- `mes_connectivity_events` is append-only event record.
- `mes_equipment_extended` remains projection/runtime-extension and must not own canonical lifecycle truth.

### 7. Tooling, assembly, preset, life package

Existing repo tables:
- `tools`
- `mes_tool_assemblies`
- `mes_tool_preset_offsets`

Target additions:
- `tool_life_counter`
- `tool_capability_assignment`

Blueprint rules:
- `tools` is tooling asset authority.
- `mes_tool_assemblies` is contained-child authority with effectivity.
- preset offsets are result/event-adjacent records, not master roots.
- tool life must be append-only or event-backed; no direct “remaining life” authority cell without lineage.

### 8. Audit, evidence, signature, outbox package

Existing repo tables:
- `electronic_signature`, `approval`, `attachment`
- evidence and audit tables elsewhere in EQMS packages
- outbox/event tables in integration runtime

Blueprint rules:
- every lifecycle owner and selected transaction document gets `row_version`, actor/audit lineage, and evidence hooks.
- outbox/event spine is required before PG-only cutover claims.
- legal-hold / retention tables block destructive deletion.

## Column policy

Mandatory for lifecycle owners and selected transaction documents:
- surrogate PK
- stable natural key / business key unique index
- lifecycle state field
- `row_version`
- `created_at`, `updated_at`
- `created_by`, `updated_by` where identity is available
- `source_system`, `source_record_id`
- `payload_schema_version` or equivalent contract marker for event/evidence heavy objects

Mandatory for effectivity-governed records:
- `effective_from`
- `effective_to`
- exclusion or non-overlap validation by business identity and site/scope when released

Mandatory for projections:
- `source_system`
- `source_record_id`
- `source_version`
- `refreshed_at`
- `is_stale`

## Migration mode plan by collection family

| family | current state | next state | notes |
| --- | --- | --- | --- |
| Foundation (`party`, `uom`, `calendar`, `approval`) | schema present, partially unused by runtime | `SHADOW_WRITE` then `POSTGRES_PRIMARY` | bridge customer/supplier/employee identities |
| Item canonical lane (`item`, `item_revision`, `item_site`, `item_spec`) | schema present, not current runtime authority | `SHADOW_WRITE` | dual-write from legacy master data commands first |
| Legacy ERP lane (`items`, `item_revisions`, `bill_of_materials`, `routings`) | current runtime/bridge lane | `POSTGRES_PRIMARY` compatibility source during migration | eventually compatibility/export only |
| Engineering bundle | target addition | `JSON_ONLY` design -> `SHADOW_WRITE` once implemented | bundle root required before WO release hard cutover |
| Supplier/customer approvals | partial PG (`approved_supplier_list`) plus JSON collections | `SHADOW_WRITE` | unify under explicit command services |
| Connectivity/tooling | PG tables already present, JSON runtime still primary for some slices | `POSTGRES_PRIMARY` candidate after reconciliation | require raw-event and readiness proof |

## Reconciliation and rollback blueprint

Required reconciliation report sections per collection:
- count parity
- missing in PG
- missing in JSON
- mismatch sample
- unknown status values
- duplicate natural keys
- last sync timestamp
- fallback-read count

Rollback policy:
- `JSON_ONLY -> SHADOW_WRITE`: rollback allowed by disabling PG writes after snapshot
- `SHADOW_WRITE -> POSTGRES_PRIMARY`: rollback allowed only if JSON dual-write remained active and drift is zero for command-created rows
- `POSTGRES_PRIMARY -> POSTGRES_ONLY`: not allowed until export restore from PG is tested

## Critical target additions

1. `user_party_link`
2. `operator_qualification`
3. `engineering_release_bundle`
4. `engineering_release_bundle_member`
5. explicit `customer_item_approval`
6. explicit `supplier_process_approval`
7. explicit `quality_gate_profile`
8. explicit `traveler_template`

These are blueprint additions only. No migration number is assigned in this prompt.

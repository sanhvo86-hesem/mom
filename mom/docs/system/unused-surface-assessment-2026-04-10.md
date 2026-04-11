# Unused Surface Assessment

Date: 2026-04-10
Scope: ERP + MOM backend authority, runtime compatibility surfaces, generated registry, and runtime-noise files.

## Executive Conclusion

Current backend governance does **not** have any active `unused_candidate` business entities.

Evidence:
- [wave0-governance-report.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/wave0-governance-report.json)
- [wave2-canonical-report.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/wave2-canonical-report.json)

What remains is split into three different classes:

1. `archive_isolation`
These are legacy aliases that should **not** be used in active composition anymore.

2. `compatibility_supported`
These are still used by live runtime/API surfaces and therefore **must not be removed yet**.

3. `runtime noise`
These are not business-authority assets and can be rotated, purged, or ignored with operational controls.

## Class A: Archive Isolation

These 5 surfaces are no longer active system truth and should stay quarantined.

Source:
- [wave2-canonical-report.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/wave2-canonical-report.json)
- [deprecation-ledger.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/contracts/deprecation-ledger.json)

| Legacy surface | Canonical successor | Current decision | Keep? | Why |
|---|---|---|---|---|
| `audit_risk.audit_program` | `quality_improvement.audit-programs` | Keep only in archive isolation | Keep temporarily | Needed for traceability and backward lookup; must not return to active composition |
| `mes_execution.dispatch_queue` | `planning_production.dispatch-lists` | Keep only in archive isolation | Keep temporarily | Legacy MES queue alias; active orchestration must stay on `mes_dispatch_queue`/dispatch-lists |
| `quality_management.capa` | `quality_improvement.corrective-actions` | Keep only in archive isolation | Keep temporarily | Prevent duplicate CAPA truth alongside `capa_records` |
| `quality_management.deviation` | `quality_improvement.deviations` | Keep only in archive isolation | Keep temporarily | Singular alias kept only for traceability |
| `quality_management.nonconformance` | `quality_improvement.nonconformances` | Keep only in archive isolation | Keep temporarily | Prevent duplicate NCR truth alongside `ncr_records` |

### Assessment

These 5 are **not functionally needed as active backend building blocks**.

They **are still present in generated artifacts** such as:
- [frontend-foundation-catalog.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/frontend-foundation-catalog.json)
- [data-fields-part1.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/data-fields-part1.json)
- [relation-map.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/relation-map.json)

But they are explicitly marked:
- `archive_isolation = true`
- `publishable = false`

That means:
- Do not use them for new frontend work
- Do not use them as AI authority for business flow composition
- Do not delete the historical mapping yet

### Recommendation

Keep the deprecation mapping and read-only trace for now. Remove only after:
- no external dependency reads them for 2 controlled release cycles
- no generated lookup endpoint still needs them
- successor canonical object is the only referenced object in UI/schema builder/AI prompts

## Class B: Compatibility Surfaces Still In Real Use

These are **not unused**. They are legacy or compatibility runtime surfaces that still have live endpoints and therefore must remain until canonical API rollout is complete.

Evidence:
- [package-index.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/contracts/package-index.json)
- [endpoint-catalog.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/endpoint-catalog.json)

Package summary currently shows:
- `compatibility_alias_api = 26`
- `compatibility_alias_runtime = 1`

High-impact examples:

| Live runtime/API | Canonical object | Keep? | Reason |
|---|---|---|---|
| `master_data.items.*` | `inventory_logistics.inventory-items` | Yes | Live runtime still uses `items` API |
| `purchasing.vendors.*` | `master_data.suppliers` | Yes | Live supplier master still runs on vendor surface |
| `inventory.inventory_transactions.*` | `inventory_logistics.inventory-movements` | Yes | Stock movement runtime still uses transaction alias |
| `production.job_operations.*` | `planning_production.production-operations` | Yes | Operation execution still exposed through job operation runtime |
| `sales.customers.*` | `master_data.customers` | Yes | Customer master API still lives under sales runtime namespace |
| `training_hr.employees.*` | `master_data.employees` | Yes | Employee runtime still exposed under HR/training namespace |
| `calibration_equipment.equipment.*` | `master_data.equipment` | Yes | Equipment runtime still exposed via calibration/equipment domain |
| `transportation.freight_orders.*` | `inventory_logistics.freight-orders` | Yes | Freight execution API still lives in transportation namespace |
| `plant_maintenance.pm_maintenance_plans.*` | `maintenance_ehs.maintenance-plans` | Yes | PM plan runtime not yet renamed to canonical API |
| `ehs_sustainability.ehs_permit_register.*` | `maintenance_ehs.permits` | Yes | Permit runtime still lives under EHS sustainability namespace |

### Assessment

These surfaces are still part of the real working system.

They should **not** be classified as unused.

They should be classified as:
- `keep temporarily`
- migrate by controlled canonical API rollout
- remove only after runtime/API convergence is complete

### Recommendation

Do not delete these now.

The correct path is:
1. introduce canonical `/api/v1/...` read/write surfaces
2. move UI, AI prompts, schema tools, and integrations to canonical endpoints
3. keep compatibility endpoint shims for a deprecation window
4. only then archive or remove old runtime namespaces

## Class C: Runtime Noise And Non-Authority Files

These are not business backend authority.

Observed in workspace:
- `.DS_Store`: 8 files
- `__pycache__`: 13 directories
- `mom/data/sessions/*`: 149 session files
- [php_error.log](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/php_error.log): about 148 MB
- [audit.log](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/audit.log): small flat log
- [audit_2026-04.jsonl](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/audit/audit_2026-04.jsonl): structured audit trail

### Decision Matrix

| Artifact class | Keep? | Action |
|---|---|---|
| `.DS_Store` | No | Remove and ignore |
| `__pycache__` | No | Remove and ignore |
| `mom/data/sessions/*` | Keep only active sessions | Purge expired sessions on retention schedule |
| `mom/data/php_error.log` | No as authority, yes as short-term ops log | Rotate and exclude from source/release evidence |
| `mom/data/audit.log` | Keep temporarily | Treat as compatibility audit sink only if still referenced; prefer structured audit stream |
| `mom/data/audit/*.jsonl` | Yes | Keep as real audit evidence |

### Important distinction

[api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php) and [index.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/index.php) still write:
- `data/php_error.log`
- `data/audit.log`
- `data/sessions/`

These are runtime artifacts, not business-contract authority.

Do not treat them as schema or product-source truth.

## What Should Be Kept

Keep as system authority:
- [database/schema-authority-summary.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/database/schema-authority-summary.json)
- [table-registry.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/table-registry.json)
- [endpoint-catalog.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/endpoint-catalog.json)
- [relation-map.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/registry/relation-map.json)
- the whole [mom/contracts](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/contracts) authority layer

Keep as non-authoritative design surface:
- [workspace.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/data/schema-studio/designs/workspace.json), intentionally blank from 2026-04-11 onward

Keep as compatibility but not authority:
- the 26 `compatibility_alias_api` surfaces in [package-index.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/contracts/package-index.json)

Keep as quarantined archive only:
- the 5 `archive_isolation` entities listed above

## What Can Be Removed Or Purged Safely

Safe to remove immediately from workspace hygiene:
- `.DS_Store`
- `__pycache__`

Safe to purge only by retention policy:
- expired `mom/data/sessions/*`
- rotated `mom/data/php_error.log`

Do not purge blindly:
- `mom/data/audit/*.jsonl`
- compatibility mappings in [deprecation-ledger.json](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/contracts/deprecation-ledger.json)
- archive-isolation aliases until all external reads are confirmed gone

## Final Judgment

Deep assessment result:

- Active unused business elements: **none**
- Archive-only legacy aliases: **5**
- Compatibility runtime surfaces still genuinely in use: **many**, at least 26 authored packages still depend on compatibility API exposure
- Runtime noise that should not be treated as system authority: **present and should be cleaned/rotated**

The right standard is not “delete everything old”.

The right standard is:
- delete true noise
- quarantine legacy aliases
- keep compatibility shims only while they are still live
- never confuse runtime residue with backend authority

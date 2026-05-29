# P01 Main

## Domain affected

- Primary: `master_data`
- Cross-domain dependencies: `planning_production`, `mes_execution`, `quality_improvement`, `procurement_supplier_quality`, `inventory_logistics`, `maintenance_ehs`, `traceability_serialization`

## Tables and stores materially involved

- JSON/runtime stores: `master-data/master-data.json`, `master-data-history.json`, `master-data-pending.json`, `orders/orders.json`, `mes/mes-runtime.json`
- PG/master data and engineering tables: `customers`, `vendors`, `items`, `item_revisions`, `routings`, `bill_of_materials`, `control_plans`, `inspection_plans`, `master_data_store`, `work_centers`, `equipment`, `tools`, `mes_nc_release_packages`, `mes_connectivity_adapters`, `mes_alarm_catalog`, `mes_alarm_playbooks`, `mes_tool_assemblies`
- Schema-only or not yet wired into current authority chain: `mdm_uom_conversions`, `uom`

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01-CLAIM-001 | Master data is still JSON primary. | REPO_EVIDENCE | `mom/api/services/JsonMasterDataRepository.php`; `mom/api/services/MasterDataService.php` | High | false PG-readiness claim | build repo-truth matrix | verified |
| P01-CLAIM-002 | `MasterDataService::authorityProbe()` explicitly marks JSON as `compatibility_only`. | REPO_EVIDENCE | `mom/api/services/MasterDataService.php` | High | incorrect slice classification | quote service behavior in audit | verified |
| P01-CLAIM-003 | `DataLayer` supports four migration modes, but services do not consistently use it. | REPO_EVIDENCE | `mom/database/DataLayer.php`; `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md` | High | overstate cutover readiness | compare service paths | verified |
| P01-CLAIM-004 | Initial P01 repo truth showed PG rebuild omitting BOM, routing, control plan, inspection plan, and defect catalog. | REPO_EVIDENCE | baseline `DataLayer.php` audit before repair pass | High | release-gate chain built on incomplete projection | diff required collections vs rebuild | verified |
| P01-CLAIM-005 | The repair pass wires BOM, routing, control plan, inspection plan, and defect catalog into `DataLayer` rebuild and `RuntimeShadowSync`. | REPO_EVIDENCE | `mom/database/DataLayer.php`; `mom/database/RuntimeShadowSync.php` | High | false pass if code not really changed | verify diff + syntax | verified |
| P01-CLAIM-006 | Generic CRUD mutation is guarded but not replaced by full command APIs. | REPO_EVIDENCE | `mom/api/controllers/GenericCrudController.php`; `docs/backend/DOMAIN_COMMAND_SPEC.md` | High | bypass risk understated | classify as mitigation only | verified |
| P01-CLAIM-007 | UOM conversion schema exists. | REPO_EVIDENCE | `mom/database/migrations/064_master_data_governance.sql` | High | undercount foundation assets | include in gap map | verified |
| P01-CLAIM-008 | Canonical `uom` schema also exists. | REPO_EVIDENCE | `mom/database/migrations/072_canonical_foundation_governance.sql` | High | duplicate or split foundation unseen | include in conflict ledger | verified |
| P01-CLAIM-009 | Current runtime master-data chain does not load UOM/UOM conversion as governed master-data collections. | REPO_EVIDENCE | `mom/api/services/MasterDataService.php`; `mom/database/DataLayer.php`; `mom/database/RuntimeShadowSync.php` | High | false impression that unit conversion is operationally governed already | classify as blocker | verified |
| P01-CLAIM-010 | The active checkout does not contain `mom/data/master-data/master-data.json`, and `MasterDataController` list/detail no longer reads that file directly after the repair pass. | REPO_EVIDENCE | filesystem check on `mom/data/master-data/`; `mom/api/controllers/MasterDataController.php`; `mom/api/services/MasterDataService.php` | High | hidden file-dependency may be assumed present | verify controller/service path | verified |

## Current authority map

| Domain slice | Current primary runtime store | Runtime classification | Controller/service owner | Existing gate | Missing gate | Direct-use risk |
| --- | --- | --- | --- | --- | --- | --- |
| Customer and supplier master | JSON primary with PG shadow/projection | `JSON_ONLY` or partial `SHADOW_WRITE` | `MasterDataController`, `MasterDataService` | duplicate detection, lifecycle map, pending approval | canonical PG command path, supplier/customer downstream release gates | high |
| Part, revision, routing, BOM, CP, IP | JSON primary with repaired PG rebuild/sync for core engineering collections | compatibility only | `MasterDataService`, `DataLayer`, `RuntimeShadowSync` | duplicate and status checks for registered entities; rebuilt PG mirrors for BOM/routing/CP/IP | released engineering authority chain, complete PG round-trip with live DB evidence, WO release lock | high |
| Equipment, operators, tooling, adapters | JSON primary with selective PG mirrors | partial shadow | `MasterDataService`, `RuntimeShadowSync`, `DataLayer` | status maps, selected sync | readiness validation for WO start/release, canonical training/calibration/tool-life gate | high |
| UOM and UOM conversion | schema and registry only in this audit | schema-only/deferred runtime | no dedicated runtime service found | database uniqueness only | lifecycle, command, sync, reconciliation, downstream usage policy | critical |
| Governed generic mutations | runtime deny/guard layer | mitigation only | `GenericCrudController`, `GenericCrudService` | `409 domain_command_required` on many governed writes | full command coverage, denylist publication, telemetry completeness | high |

## Migration readiness snapshot

| Collection or subject | Current mode | Evidence |
| --- | --- | --- |
| `customers`, `suppliers`, `parts`, `revisions`, `machines`, `operators`, `tooling_assets` | JSON primary with PG mirror helpers | `MasterDataService`, `JsonMasterDataRepository`, `RuntimeShadowSync`, `DataLayer` |
| `routing_library`, `bom_library`, `control_plans`, `inspection_plans`, `defect_catalog` | JSON primary with repaired PG rebuild/sync coverage in code, but no live PG runtime validation in this turn | `POSTGRES_MIGRATION_AND_SYNC_SPEC.md`, `DataLayer`, `RuntimeShadowSync` |
| `quality_gate_profiles`, `traveler_templates`, `customer_item_approvals`, `supplier_process_approvals`, `warehouse_locations` | still JSON primary and not evidenced with dedicated PG mirror mapping in this turn | `POSTGRES_MIGRATION_AND_SYNC_SPEC.md`, service/entity maps, table-registry review |
| `mes_connectivity_adapters`, `mes_alarm_catalog`, `mes_alarm_playbooks`, `tool_assemblies` | partial shadow-write capable | `RuntimeShadowSync`, `DataLayer` |
| `uom`, `mdm_uom_conversions` | schema present, runtime authority missing | migrations `064`, `072`, `table-registry.json` |

## Repairable conclusions completed inside this prompt

1. `MasterDataController` list/detail no longer bypass the governed service path with direct `master-data.json` reads.
2. `MasterDataService` now exposes runtime read methods so controller reads share the same authority chain as mutations.
3. `DataLayer::loadRuntimeMasterDataFromPg()` now includes `routing_library`, `bom_library`, `control_plans`, `inspection_plans`, and `defect_catalog`.
4. `RuntimeShadowSync::syncMasterDataStore()` now dual-writes the same core engineering/quality collections.
5. The UOM/conversion foundation remains explicitly classified as a blocker rather than assumed capability.
6. The absent `master-data.json` runtime file remains a controlled gap for live-runtime evidence, but no longer blocks controller list/detail behavior inside this checkout.

## Verification completed in repair pass

- `php -l` passed for `mom/api/controllers/MasterDataController.php`
- `php -l` passed for `mom/api/services/MasterDataService.php`
- `php -l` passed for `mom/database/DataLayer.php`
- `php -l` passed for `mom/database/RuntimeShadowSync.php`
- `php mom/tests/runtime_assurance_suite.php` passed: 67/67
- `composer test -- --filter MasterDataRepositoryBoundaryTest` passed: 4 tests, 19 assertions
- `php mom/tools/audit_runtime_authority_consistency.php` still runs in current `JSON_ONLY` mode
- Focused PHPStan on the 4 touched files did not complete in time and therefore is not counted as pass evidence

## Decision token

`P01_PASS_WITH_CONTROLLED_GAPS`

# MDA Canonical Object Taxonomy

Generated: 2026-05-29

## Canonical classes

| class | definition | may_own_governed_transition | examples | forbidden_behavior |
| --- | --- | --- | --- | --- |
| `reference_master` | Stable identity and classification master referenced by many downstream objects. | No, unless promoted by explicit owner decision. | Party, User, Employee, Equipment, WorkCenter, UOM, ReasonCode | cannot behave like transaction workflow owner |
| `lifecycle_owner` | Canonical write model with governed lifecycle, commands, audit, and release semantics. | Yes | Item, ItemRevision, EngineeringReleaseBundle, ControlPlan, InspectionPlan, SupplierApproval, QualityOrder | cannot be mutated by Generic CRUD |
| `contained_child` | Child object whose lifecycle is governed by a parent lifecycle owner. | No | BOM component, Routing operation, Party role link, Tool assembly component | cannot become top-level workflow owner |
| `transaction_document` | Business transaction that may own selected governed transitions. | Yes, selected only | SalesOrder, JobOrder, WorkOrder, PurchaseOrder, Shipment, InventoryMovement | cannot redefine upstream master truth |
| `result_record` | Captures execution or inspection result against a parent scope. | No | Inspection result, SPC observation, tool preset measurement | cannot become standalone master authority |
| `event_record` | Append-only event for runtime or integration lineage. | No | Machine raw event, outbox event, release event, audit event | cannot be latest-state authority |
| `evidence_record` | Evidence package or retained proof linked to a parent object. | No | evidence_record, signature package, attachment publication | cannot own business lifecycle of parent |
| `projection_record` | Read-only derived view or snapshot with lineage and freshness. | No | OEE snapshot, inventory balance snapshot, BOM snapshot, route snapshot | direct mutation blocked |
| `compatibility_alias` | Legacy name or API surface mapped to a canonical object. | No | `customers`, `parts`, `machines`, `tooling_assets` API names | cannot accept independent mutations |
| `archived_legacy` | Frozen historical object retained for audit/rollback only. | No | archived JSON export, retired legacy schema lanes | no new business writes |

## Root groups and canonical roots

| root_group | canonical_root | authority_class | notes |
| --- | --- | --- | --- |
| Foundation | `EnterpriseFoundation` | `reference_master` | enterprise/site/plant/warehouse/work-center/unit/calendar/status/reason/UOM |
| Party | `Party` | `reference_master` | one party can hold customer, supplier, contact, and other roles |
| Identity/User | `UserIdentity` | `reference_master` | user/login/auth scope separated from employee/operator qualification links |
| Item/Revision | `Item` and `ItemRevision` | `lifecycle_owner` | item identity separate from released revision package |
| Engineering Definition | `EngineeringReleaseBundle` | `lifecycle_owner` | canonical bundle linking item revision to BOM/routing/control plan/inspection plan/NC package |
| Equipment/Machine | `EquipmentAsset` | `reference_master` | connectivity is projection, readiness is governed by linked controls |
| Tooling/Fixture/Gage | `ToolingAsset` | `reference_master` | inventory-item relationship is link, not duplicate root |
| Supplier/Customer | `PartyRoleAssignment` under `Party` | `contained_child` | commercial/procurement role views map back to Party |
| Quality Planning | `QualityPlanBundle` | `contained_child` or `lifecycle_owner` by parent scope | control plan and inspection plan live under engineering release bundle but keep own governed release states |
| MES Execution | `WorkOrderExecutionSnapshot` | `transaction_document` | execution snapshots freeze released master package references |
| Inventory/Traceability | `InventoryLotSerialLedger` | `transaction_document` | balances are projections; ledger and genealogy are authority |
| Evidence/eSign/Audit | `EvidenceRecord` and `SignatureEvent` | `evidence_record` / `event_record` | evidence never silently becomes parent lifecycle owner |
| Integration/AI/Analytics | `IntegrationEvent` and projections | `event_record` / `projection_record` | AI and analytics stay advisory/read-only |

## Alias resolution lock

| legacy_or_runtime_name | canonical_object | taxonomy_class | rule |
| --- | --- | --- | --- |
| `customers` | `Party` + `PartyRoleAssignment(customer)` | `compatibility_alias` | customer role is not a separate legal-entity root |
| `suppliers` | `Party` + `PartyRoleAssignment(supplier)` | `compatibility_alias` | supplier role is not a separate root from party |
| `employees` | `EmployeeProfile` linked to `UserIdentity` | `compatibility_alias` | employee HR identity is not login authority |
| `operators` | `OperatorQualification` linked to `EmployeeProfile` or `UserIdentity` | `compatibility_alias` | operator is execution-role projection/link, not duplicate person root |
| `users` | `UserIdentity` | `compatibility_alias` | authentication/account scope only |
| `parts` | `Item` | `compatibility_alias` | part number maps to canonical item identity |
| `revisions` | `ItemRevision` | `compatibility_alias` | revision is lifecycle owner beneath item, not a sibling root |
| `machines` | `EquipmentAsset` | `compatibility_alias` | machine is a subtype/view of equipment asset |
| `equipment` | `EquipmentAsset` | `compatibility_alias` | keep one canonical equipment root |
| `tooling_assets` | `ToolingAsset` | `compatibility_alias` | tooling asset root distinct from inventory movement projection |
| `tool_assemblies` | `ToolAssembly` | `contained_child` | assembly belongs under tooling asset relationships |

## Hard rules

1. `EngineeringReleaseBundle` is the canonical root for released execution-ready engineering meaning.
2. `ControlPlan` and `InspectionPlan` may keep governed release workflows, but they cannot claim independent execution authority outside a released engineering bundle.
3. Inventory balance is always `projection_record`; inventory ledger and genealogy own traceable truth.
4. Machine state/OEE/analytics dashboards are `projection_record` only.
5. Compatibility aliases may route reads, but all governed writes must resolve to the canonical root first.

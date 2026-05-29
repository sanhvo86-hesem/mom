# MDA Root Relationship Graph

```mermaid
graph TD
  Party["Party"] --> PartyRole["PartyRoleAssignment"]
  Party --> PartySite["PartySite"]
  Party --> PartyContact["PartyContact"]
  User["UserIdentity"] --> Employee["EmployeeProfile"]
  Employee --> Operator["OperatorQualification"]
  Item["Item"] --> ItemRev["ItemRevision"]
  ItemRev --> EngBundle["EngineeringReleaseBundle"]
  EngBundle --> BOM["BOM"]
  EngBundle --> Routing["Routing"]
  EngBundle --> CP["ControlPlan"]
  EngBundle --> IP["InspectionPlan"]
  EngBundle --> NC["NC Program Release"]
  WorkOrder["WorkOrderExecutionSnapshot"] --> EngBundle
  WorkOrder --> Ready["Machine/Tool/Operator Readiness"]
  Equipment["EquipmentAsset"] --> Ready
  Tool["ToolingAsset"] --> Ready
  Operator --> Ready
  InvLedger["InventoryLotSerialLedger"] --> Genealogy["Lot/Serial Genealogy"]
  Evidence["EvidenceRecord"] --> Signature["SignatureEvent"]
  Evidence --> Audit["AuditEvent"]
  Projection["ProjectionRecord"] -. read only lineage .-> Party
  Projection -. read only lineage .-> Item
  Projection -. read only lineage .-> WorkOrder
```

## Mandatory relationship rules

1. `PartyRoleAssignment` is a contained child of `Party`, not a separate root.
2. `OperatorQualification` is a link/projection under employee or user identity, not a duplicate person root.
3. `EngineeringReleaseBundle` is the canonical parent for execution-ready BOM/routing/control-plan/inspection-plan/NC definitions.
4. `WorkOrderExecutionSnapshot` stores frozen references to the released engineering bundle and readiness state.
5. `InventoryLotSerialLedger` and genealogy own traceability truth; inventory balances remain projections.
6. Evidence, signature, and audit objects always link back to a parent root and never supersede the parent lifecycle.

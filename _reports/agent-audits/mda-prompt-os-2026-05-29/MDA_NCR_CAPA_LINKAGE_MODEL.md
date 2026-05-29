# MDA NCR CAPA Linkage Model

## Source linkage rule

Every `NCR`, `CAPA`, `Complaint`, `SCAR`, and `Deviation` must link back to a concrete originating object, not only free text.

Minimum link targets:

- PO receipt / incoming inspection / supplier / lot
- WO / operation / machine / operator / tool
- inspection lot / inspection result / gage
- shipment / sales order / customer / serial or lot
- return / complaint / field failure / service event

## Escalation chain

1. inspection or runtime failure creates/updates `QualityOrder` or direct governed quality case
2. failing result can apply `QualityHold` / `InventoryHold` / `ShipmentHold`
3. material or product defect creates `NCR`
4. systemic root cause or repeated defect escalates to `CAPA`
5. supplier-caused defect can create `SCAR` / `Supplier8D`
6. customer escape can create `Complaint` and linked NCR/CAPA

## Closure rule

- NCR cannot close without disposition and containment trace
- CAPA cannot close without effectiveness verification
- Complaint cannot close without backward/forward trace to affected lot/serial/shipment population
- SCAR overdue status must feed supplier approval and receipt gating

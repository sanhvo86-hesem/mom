# MDA Traceability Recall Model

## Canonical chain

`supplier_heat/lot -> purchase_receipt -> IQC decision -> putaway/container/location -> issue/consumption -> WO/operation -> machine/operator/tool/program/process parameter -> output lot/serial -> OQC/shipment -> complaint/NCR/CAPA/recall`

## Rules

1. Recall queries are graph traversals over canonical ledger and genealogy links, not ad hoc joins over mutable master tables.
2. Every governed material movement must carry `source_transaction_id`, `subject_lot_or_serial`, `site`, `time`, and `causation/correlation` lineage.
3. Output genealogy must freeze the released package snapshot used at execution time.
4. Complaint and containment actions must link back to the shipped lot/serial and forward to all sibling shipments when required.

## Required graph nodes

- `supplier_receipt_lot`
- `iqc_inspection`
- `inventory_lot`
- `inventory_serial`
- `inventory_container`
- `material_issue`
- `wip_consumption`
- `machine_run`
- `inspection_result`
- `production_completion`
- `shipment_line`
- `customer_complaint`
- `ncr_record`
- `capa_record`

## Required graph edges

- `received_from`
- `inspected_by`
- `stored_in`
- `issued_to`
- `consumed_by`
- `processed_on`
- `measured_by`
- `completed_into`
- `packed_into`
- `shipped_to`
- `complained_by`
- `contained_by`

## Recall assertions

- backward recall from complaint serial must resolve supplier lot/heat, receipt, IQC, WO, operation, machine, operator, tool, program, and inspection evidence.
- forward recall from supplier heat must resolve all open inventory, WIP, completed lots/serials, shipments, and linked quality cases.
- if any edge is missing, recall status is `trace_incomplete` and shipment release remains blocked for affected scope.

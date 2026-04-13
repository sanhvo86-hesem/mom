# Enterprise Frontend Simulation Report

Generated: 2026-04-13T08:05:23.058055+00:00
Status: watch

## Summary

- Scenario count: 10
- Scenario status: {"pass": 7, "watch": 3}
- Blockers: {}
- Warnings: {"frontend_surface_not_explicit": 1, "missing_command_or_state_model": 2}

## Operating Standard

- System Contract Registry is the default read-only source for frontend discovery.
- Workspace Draft is design sandbox only and must never define runtime truth.
- Manual Runtime may edit only machine/MES support tables.
- Operators are governed by Admin users/org chart, not by manual runtime.
- Core process records must use command/workflow endpoints, not generic CRUD as the primary frontend contract.
- Destructive endpoints in the quarantine file must not be exposed to frontend.
- Every frontend mutation must carry idempotency, audit, correlation, validation, and allowed-next-action metadata.

## Scenario Results

### executive_cockpit - pass
- Persona: CEO / plant director
- Goal: KPI cockpit drills from OEE, OTD, COPQ, inventory, finance and safety KPI to source records.

### quote_to_cash - pass
- Persona: Sales / customer service
- Goal: Quote, customer PO, SO confirmation, shipment, invoice and customer care are traceable end-to-end.

### procure_to_pay_supplier_quality - pass
- Persona: Buyer / supplier quality
- Goal: Supplier PO, ASN/receipt, IQC, supplier NCR and AP invoice are gated without bypassing supplier quality.

### plan_to_produce - pass
- Persona: Planner
- Goal: Demand, APS/MRP, capacity, JO/WO release and dispatch are simulated before committing production.

### machine_execution_operator - watch
- Persona: Operator / line leader
- Goal: Machine status, alarms, downtime, tooling and work-center runtime are captured with machine-source timestamps.
- Warning `frontend_surface_not_explicit`: work_centers, equipment, tools

### qa_qc_closed_loop - pass
- Persona: QA/QC engineer
- Goal: IQC/IPQC/OQC/FQC, NCR, CAPA, MSA and SPC are gated as first-class quality workflows.

### maintenance_ehs_5s - pass
- Persona: Maintenance / EHS
- Goal: Maintenance, calibration, EHS incidents, safety observations and 5S audits preserve release-to-service evidence.

### warehouse_shipping_returns - watch
- Persona: Warehouse / logistics
- Goal: Inventory movements, stock balance, shipment, package, carrier, RMA and traceability are closed-loop.
- Warning `missing_command_or_state_model`: stock_balances, inventory_locations

### finance_posting_close - watch
- Persona: Finance controller
- Goal: AP/AR, costing, WIP, inventory valuation, assets and period controls use reversal/correction, not deletion.
- Warning `missing_command_or_state_model`: cost_ledger, wip_ledger, inventory_valuations

### admin_ai_governance - pass
- Persona: Admin / AI assistant
- Goal: AI and administrators see a read-only authority registry, explicit editable surfaces and data-loss guards.

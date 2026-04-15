# Canonical ERP + MES + eQMS 7-Layer Schema Map

Date: 2026-04-05

Status: Implementation-grade schema map for HESEM canonical platform

Related artifacts:

- `docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md`
- `database/canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `qms-data/schema-studio/designs/canonical_erp_mes_eqms_7layer_core.json`

## 1. Purpose

This schema map translates the canonical 7-layer architecture into an execution-ready table system.

It answers five practical questions:

1. Which tables own the source of truth?
2. Which tables represent released snapshots?
3. Which tables record events or ledgers?
4. Which tables are regulated records requiring audit and approval?
5. How should HESEM migrate current domains into the canonical model without breaking execution history?

## 2. Design rules

### 2.1 Source-of-truth hierarchy

- Foundation tables define organization, party, codes, calendars, and governance primitives.
- Master data tables define product, party, and policy identity.
- Engineering tables define released manufacturing intent.
- Planning tables orchestrate demand, supply, and released order snapshots.
- MES tables capture execution reality through events and transactions.
- Inventory tables record physical and financial movement through ledger-first accounting.
- eQMS tables govern regulated evidence, quality decisions, and closed-loop improvement.

### 2.2 Allowed data motion

- Master data may feed engineering, planning, MES, inventory, and eQMS.
- Engineering may feed released planning snapshots, never the reverse.
- Planning may create execution objects and frozen snapshots.
- MES may append events and transactions, but must not rewrite master definitions.
- Inventory must be derived from transactions and snapshots, not direct balance edits.
- eQMS must link to any execution or logistics object, but retain independent lifecycle control.

### 2.3 Regulated records

The following object families require audit trail plus approval or signature support:

- item revision
- BOM version
- work definition version
- inspection plan and result
- quality order, nonconformance, deviation, complaint, CAPA
- document revision and change control
- training completion where compliance matters

## 3. Layer-by-layer table catalog

### 3.1 Foundation

| Table | Role | Notes |
|---|---|---|
| `org_enterprise` | global root | top enterprise context |
| `org_company` | legal/reporting unit | accounting and statutory anchor |
| `org_site` | operational site | physical business site |
| `org_plant` | production plant | production planning scope |
| `org_warehouse` | storage/logistics node | inventory ownership point |
| `org_work_center` | capacity bucket | operation scheduling anchor |
| `org_work_unit` | specific machine/cell/resource | shop-floor execution anchor |
| `party` | unified party master | customer, supplier, employee, auditor |
| `party_role` | role assignment | SAP-like role model |
| `party_site` | address and operational site | ship-to, bill-to, supplier site |
| `party_contact` | contact person | quality, logistics, commercial contacts |
| `uom` | measurement standard | common cross-layer UOM |
| `calendar` | calendar model | workday and planning calendar |
| `shift` | shift model | execution schedule |
| `reason_code` | governed reasons | scrap, downtime, deviation, complaint |
| `status_code` | governed status machine | standard lifecycle codes |
| `electronic_signature` | signature event | Part 11 / QMSR compliance |
| `approval` | generic approval step | cross-entity approval workflow |
| `attachment` | controlled linked evidence | photos, files, reports, records |

### 3.2 Master Data

| Table | Role | Notes |
|---|---|---|
| `lot_policy` | lot numbering and genealogy policy | traceability behavior |
| `serial_policy` | serialization policy | serial granularity and rules |
| `shelf_life_policy` | shelf-life governance | expiry, retest, quarantine |
| `item` | item identity | one item master only |
| `item_class` | classification tree | family and governance segmentation |
| `item_revision` | versioned definition | revision-controlled product identity |
| `item_variant` | configurable released variant | optional product variant layer |
| `item_site` | planning and stocking by site | site-specific policy |
| `item_attr` | bounded extensibility | avoid free-form schema drift |
| `item_spec` | measurable product spec | quality + engineering alignment |

### 3.3 Engineering / Manufacturing Definition

| Table | Role | Notes |
|---|---|---|
| `bom` | BOM header identity | parent revision and alternate path |
| `bom_version` | released BOM revision | time-effective |
| `bom_line` | BOM component detail | planned consumption intent |
| `bom_substitute` | alternate component | controlled substitution |
| `work_definition` | route/work definition identity | Oracle-style work definition |
| `work_definition_version` | released route version | time-effective |
| `operation` | sequenced operation | execution template |
| `operation_resource` | required resource | work center / work unit / labor |
| `operation_material` | operation-level consumption | point-of-use material definition |
| `operation_output` | operation-level output | by-product / intermediate / main output |
| `work_instruction` | linked controlled instruction | document-linked instruction step |

### 3.4 Planning / ERP Orchestration

| Table | Role | Notes |
|---|---|---|
| `demand` | net demand signal | order-independent planning demand |
| `forecast` | demand planning | customer/site time-bucket forecast |
| `sales_order` | customer demand document | commercial commitment |
| `sales_order_line` | sales line detail | allocatable execution scope |
| `purchase_order` | procurement order | inbound supply |
| `purchase_order_line` | PO line detail | inspection and receipt source |
| `mrp_signal` | planning exception/signal | shortage or action proposal |
| `planned_supply` | proposed replenishment | planned order / PO / transfer |
| `allocation` | reservation link | tie supply to demand |
| `pegging` | dependency link | parent-child planning chain |
| `production_order` | released manufacturing intent | order header |
| `production_order_bom_snapshot` | frozen BOM at release | never join back to mutable BOM |
| `production_order_route_snapshot` | frozen route at release | execution traceability |

### 3.5 MES / Shop Floor Execution

| Table | Role | Notes |
|---|---|---|
| `work_order` | executable order segment | operation-level release |
| `job` | dispatchable unit | machine/operator execution granularity |
| `track_in` | execution start event | labor/machine accountability |
| `track_out` | execution completion event | good/reject reporting |
| `pause_resume` | interruption control | pause, hold, resume history |
| `dispatch_queue` | sequence dispatch board | execution order control |
| `job_event` | append-only job event stream | status reconstruction source |
| `machine_event` | machine telemetry/event | OEE and state tracking |
| `downtime_event` | downtime record | structured loss accounting |
| `alarm_event` | alarm lifecycle | event trace for machine alarms |
| `process_param_capture` | process data capture | temperature, torque, pressure, etc. |
| `labor_capture` | labor transaction | actual effort and accountability |
| `tool_usage` | tool life and usage | cutter/fixture/tool trace |
| `material_consumption` | issued/consumed material | actual issue history |
| `production_completion` | completion transaction | actual output history |
| `scrap` | explicit scrap event | quantity and reason ownership |
| `rework` | explicit rework case | closed-loop correction |
| `genealogy_link` | parent-child lineage | lot/serial traceability backbone |

### 3.6 Inventory / Cost / Traceability

| Table | Role | Notes |
|---|---|---|
| `lot` | lot identity | batch traceability unit |
| `serial` | serialized identity | unique traceability unit |
| `container` | handling unit | tote, pallet, rack, carrier |
| `inventory_ledger` | movement ledger | source of truth for stock changes |
| `inventory_balance_snapshot` | point-in-time balance | reporting/performance layer |
| `location_balance` | current location state | derived operational balance |
| `cost_ledger` | cost event ledger | financial impact trail |
| `wip_ledger` | WIP valuation trail | execution-to-cost bridge |

### 3.7 eQMS / Compliance

| Table | Role | Notes |
|---|---|---|
| `inspection_plan` | released inspection method | product-quality contract |
| `inspection_characteristic` | measure-level definition | test/limit/criticality |
| `inspection_lot` | inspection work object | SAP-style quality anchor |
| `inspection_result` | actual quality result | measured evidence |
| `quality_order` | universal quality case | Dynamics-style cross-source issue |
| `quality_case_link` | typed linkage to source objects | PO/SO/WO/lot/serial/document |
| `nonconformance` | formal nonconformance | containment/disposition |
| `deviation` | temporary controlled deviation | approved departure from standard |
| `capa` | corrective/preventive action | root cause and effectiveness |
| `complaint` | external complaint file | 21 CFR 820.198 class record |
| `document` | controlled document | SOP, WI, form, spec |
| `document_revision` | revision-controlled document | released document state |
| `change_control` | formal change record | change impact and approval |
| `audit_program` | audit master | planned audit portfolio |
| `audit` | audit execution | audit instance |
| `finding` | audit finding | observation/NCR/opportunity |
| `competency` | governed competency | training target object |
| `training_matrix` | required training definition | role-document-competency map |
| `training_record` | completion evidence | person-specific training status |
| `supplier_quality_case` | supplier-linked issue | SCAR / supplier incident anchor |
| `risk_register` | governed risk item | enterprise and quality risk backbone |
| `audit_trail` | regulated audit ledger | immutable change history |

## 4. Relationship spine

### 4.1 Product spine

`item -> item_revision -> bom -> bom_version -> bom_line`

`item -> item_revision -> work_definition -> work_definition_version -> operation`

### 4.2 Planning spine

`forecast/demand/sales_order_line -> mrp_signal -> planned_supply -> production_order`

`production_order -> production_order_bom_snapshot`

`production_order -> production_order_route_snapshot`

### 4.3 Execution spine

`production_order -> work_order -> job`

`job -> track_in / pause_resume / job_event / process_param_capture / labor_capture / tool_usage / material_consumption / production_completion / scrap / rework`

### 4.4 Traceability spine

`material_consumption + production_completion -> genealogy_link`

`genealogy_link -> lot / serial`

`inventory_ledger -> inventory_balance_snapshot / location_balance`

### 4.5 Quality spine

`inspection_plan -> inspection_characteristic`

`production_order / purchase_order / sales_order / lot / serial -> inspection_lot`

`inspection_lot -> inspection_result`

`inspection_lot / complaint / deviation / audit finding / supplier issue -> quality_order -> nonconformance / capa`

## 5. Governance contract

### 5.1 Snapshot-owned objects

These objects must preserve released context:

- `production_order_bom_snapshot`
- `production_order_route_snapshot`
- `inspection_lot`
- `document_revision`

### 5.2 Event-owned objects

These objects must be append-only or effectively append-first:

- `job_event`
- `machine_event`
- `downtime_event`
- `alarm_event`
- `process_param_capture`
- `labor_capture`
- `tool_usage`
- `material_consumption`
- `production_completion`
- `inventory_ledger`
- `cost_ledger`
- `wip_ledger`
- `audit_trail`

### 5.3 Mutable current-state objects

These objects may be updated, but only with auditability:

- `item`, `item_revision`, `item_site`
- `bom_version`, `work_definition_version`
- `production_order`, `work_order`, `job`
- `quality_order`, `nonconformance`, `deviation`, `capa`
- `complaint`, `change_control`, `audit`, `training_record`, `risk_register`

## 6. HESEM migration crosswalk

| Current HESEM area | Canonical landing layer | Typical canonical targets |
|---|---|---|
| `master_data_governance` | Foundation + Master Data | `party`, `item`, `item_revision`, `item_attr` |
| `advanced_planning` | Planning | `forecast`, `demand`, `mrp_signal`, `planned_supply`, `pegging` |
| `quality_management` | eQMS | `inspection_lot`, `quality_order`, `nonconformance`, `capa`, `complaint` |
| `mes_*` domains | MES + Inventory | `job`, `job_event`, `machine_event`, `genealogy_link`, `inventory_ledger` |
| `document_control` | eQMS + Foundation | `document`, `document_revision`, `approval`, `electronic_signature` |
| `audit_risk` | eQMS | `audit_program`, `audit`, `finding`, `risk_register` |

## 7. Recommended rollout order

1. Foundation
2. Master Data
3. Engineering definition
4. Planning and order snapshot
5. MES event spine
6. Inventory and cost ledgers
7. eQMS and regulated overlays

This order keeps the platform deployable while protecting the most critical principle: released execution objects must never depend on mutable master records alone.

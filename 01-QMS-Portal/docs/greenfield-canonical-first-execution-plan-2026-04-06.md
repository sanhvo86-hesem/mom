# Greenfield Canonical-First Execution Plan

Date: 2026-04-06  
Workspace: `C:\Users\TEST4\qms.hesem.com.vn`

## Decision

Because no business module has been built yet, the correct strategy is:

- **do not optimize for legacy reuse**
- **do not start from generic CRUD screens**
- **do not start from raw tables**
- **start from the target enterprise model**

The platform should be built as:

1. **canonical write-model**
2. **workflow engine on canonical entities**
3. **metadata-driven frontend contracts**
4. **read/projection models for lists, boards, analytics, and operator views**

This is the cleanest way to get the system right the first time.

## What “right from the start” means

The strongest enterprise platforms consistently separate these concerns:

- **write truth**: business rules, validation, approvals, regulated records
- **read shape**: list/grid/board/detail/analytics-friendly projections
- **experience metadata**: sections, related lists, actions, side effects, permissions
- **workflow/orchestration**: transitions, guards, approvals, escalations, history

Do not let one physical table try to do all of them.

## Non-Negotiable Architecture Rules

### 1. Canonical write model only

All net-new domain logic must write to canonical entities, not to ad-hoc UI tables.

### 2. Read and write must be separated

Use canonical tables for transactional integrity.  
Use read models/projections for:

- list pages
- dashboards
- APS boards
- operator consoles
- analytics
- search

### 3. Frontend contracts must exist before frontend build

Every entity must publish:

- identity contract
- list contract
- detail/object-page contract
- related-list contract
- action contract
- workflow contract
- capability/permission contract
- concurrency contract
- side-effect/refetch contract
- attachment/timeline/audit contract

### 4. Workflow must run on canonical entities

Do not repeat the current transition-state problem where workflow labels are canonical but runtime storage is something else.

### 5. Governance is part of the core model

The platform must treat these as first-class from day one:

- org scope
- actor identity
- role and field security
- row version / ETag
- audit trail
- electronic signature
- attachment governance
- archive/retention policy

### 6. Regulated objects are not “just records”

For eQMS/governed records, the platform must support:

- immutable history
- approval chain
- signature meaning
- revision lineage
- record retention
- authority checks

## The Target Stack

### Layer 1. Foundation governance

Build first:

- `org_enterprise`
- `org_company`
- `org_site`
- `org_plant`
- `org_warehouse`
- `org_work_center`
- `party`
- `calendar`
- `uom`
- `status_code`
- `reason_code`
- `attachment`
- `approval`
- `electronic_signature`

This layer is the base for everything else.

### Layer 2. Platform runtime contracts

Build before any module:

- auth and user context
- org scope resolution
- access policy matrix
- field-level capability model
- row version / optimistic concurrency
- archive/delete policy
- audit event envelope
- attachment storage contract
- timeline event contract
- notification contract

### Layer 3. Master data core

Build next:

- `item`
- `item_class`
- `item_revision`
- `item_variant`
- `item_site`
- `item_attr`
- `item_spec`

Rules:

- one canonical item master
- revision-aware
- org/site availability separated from item identity
- no duplication between engineering, planning, quality, and MES

### Layer 4. Engineering definition

Build before planning and MES:

- `bom`
- `bom_version`
- `bom_line`
- `bom_substitute`
- `work_definition`
- `operation`
- `operation_material`
- `work_instruction`

Rules:

- engineering revision must drive execution eligibility
- release/effective dating must be built in
- instructions/documents must attach to revision and operation

### Layer 5. ERP planning backbone

Build after master and engineering:

- `customer`
- `supplier`
- `sales_order`
- `sales_order_line`
- `purchase_order`
- `purchase_order_line`
- `forecast`
- `production_order`
- `supply_plan`
- `allocation`

Rules:

- order model must be canonical, not “screen-shaped”
- planning entities must reference item/site/revision correctly
- APS and planning boards must read from projections, not transactional joins

### Layer 6. MES execution spine

Build after planning:

- `work_order`
- `job`
- `dispatch_queue`
- `job_event`
- `machine_event`
- `downtime_event`
- `labor_capture`
- `process_param_capture`
- `material_consumption`
- `production_completion`
- `scrap_event`
- `rework_event`
- `tool_usage`
- `genealogy_link`

Rules:

- execution is event-first
- operator actions must append trace, not overwrite state blindly
- machine/operator/dispatch boards must read from projections

### Layer 7. Inventory, costing, and traceability

Build after execution:

- `inventory_balance`
- `inventory_transaction`
- `lot`
- `serial`
- `location_balance`
- `cost_element`
- `cost_ledger`
- `valuation_snapshot`

Rules:

- inventory identity and movement must be explicit
- genealogy and consumption must connect to lot/serial
- costing must read from execution and inventory events

### Layer 8. eQMS/compliance backbone

Build as a canonical regulated layer, not as a patch:

- `inspection_plan`
- `inspection_lot`
- `inspection_result`
- `quality_order`
- `nonconformance`
- `deviation`
- `capa`
- `complaint`
- `document`
- `document_revision`
- `change_control`
- `audit_program`
- `audit`
- `finding`
- `competency`
- `training_matrix`
- `training_record`
- `risk_register`
- `audit_trail`

Rules:

- each regulated object needs revision/history/approval semantics
- signature and approval are shared services, not per-module hacks
- CAPA, NCR, inspection, complaint, document change, training, and audit must link into one quality graph

## Frontend-First Capability Contract

Before building any screen, define one universal entity contract.

Each entity must publish:

### Record shell

- title
- subtitle
- status
- owner
- created_at
- updated_at
- object identity

### Detail contract

- sections
- field ordering
- reference fields
- quick-view blocks
- related tabs
- timeline slot
- attachment slot
- analytics slot

### Grid contract

- search fields
- filter fields
- sortable fields
- projection fields
- cursor pagination
- saved-view compatibility

### Action contract

- create
- update
- archive
- restore
- transition
- approve
- reject
- sign
- print/export where applicable

### Workflow contract

- states
- transitions
- guards
- role visibility
- lock behavior
- side effects
- SLA/escalation metadata

### Capability contract

- field editable?
- action visible?
- action enabled?
- record locked?
- attachment allowed?
- transition allowed?

### Audit/governance contract

- record history
- event stream
- approval history
- signature history
- archive state
- retention class

## The Build Order

### Phase 0. Architecture freeze

Deliverables:

- canonical object inventory
- bounded context map
- naming standard
- identity standard
- state model standard
- archive/delete standard
- audit/signature standard
- projection naming standard

Exit gate:

- no new table can be created without belonging to a canonical layer and bounded context

### Phase 1. Platform foundation

Deliverables:

- auth model
- org scope
- ACL matrix
- field capability engine
- optimistic concurrency
- audit envelope
- attachment service
- workflow engine contract

Exit gate:

- one sample canonical entity can complete create -> review -> approve -> archive with full audit trail

### Phase 2. Master + engineering

Deliverables:

- item master
- revision model
- BOM/work definition/operation
- instruction/document link
- engineering approval workflow

Exit gate:

- an item revision can be approved and released with BOM + work definition + instruction lineage

### Phase 3. ERP planning

Deliverables:

- sales/purchase/forecast/production order
- planning read models
- order object page contracts
- planning board projections

Exit gate:

- one customer order can produce a production order with traceable planning context

### Phase 4. MES execution

Deliverables:

- work order/job/event model
- dispatch projection
- operator console projection
- downtime and genealogy contracts

Exit gate:

- one work order can be dispatched, executed, consumed, completed, and traced end-to-end

### Phase 5. Inventory + costing

Deliverables:

- inventory transaction model
- lot/serial trace
- cost rollup and actuals
- shortage and reservation projections

Exit gate:

- one completed job produces inventory, cost, and genealogy outputs consistently

### Phase 6. eQMS backbone

Deliverables:

- inspection plan/lot/result
- NCR/deviation/CAPA graph
- document revision/change control
- training and audit graph
- signature-driven approvals

Exit gate:

- one defect can become NCR -> CAPA -> effectiveness -> closure with trace, approvals, and signatures

### Phase 7. Frontend builder enablement

Deliverables:

- object-page contracts
- list/grid contracts
- related-list contracts
- action metadata
- side-effect metadata
- timeline metadata
- attachment metadata
- analytics and board contracts

Exit gate:

- builder can generate stable list/detail/form/workflow screens from metadata without per-screen hard-coding

## What To Build Before Any Real Module

Do these first:

1. canonical naming and identity rules
2. shared workflow engine contract
3. approval/e-signature service
4. archive/delete/retention policy
5. audit envelope
6. attachment/document service
7. object-page metadata model
8. list/grid metadata model
9. projection strategy
10. query/pagination standard

If you skip these and go straight to modules, you will almost certainly rebuild later.

## The Query Strategy

Use:

- canonical relational write tables for transactional truth
- projection/read tables for UI and boards
- cursor pagination for large lists
- materialized views only for snapshot/analytics, not for live transactional UX

Do not use:

- one raw table for both write logic and all frontend reads
- uncontrolled `SELECT *`
- large `OFFSET` pagination as the main list strategy

## Workflow Strategy

Workflows must be command-based, not field-flip based.

A transition should mean:

- validate command
- check authority
- check guard conditions
- persist state change
- persist approval/signature if needed
- emit audit event
- publish projection refresh event

Not:

- directly update `status` and hope the rest follows

## Security and Compliance Strategy

From day one:

- every command knows actor + org scope
- every governed record has row version
- every governed record has archive mode
- every approval/signature has meaning + actor + timestamp
- every critical object emits audit history
- every document/revision object is immutable after release except through controlled revision

## Delivery Strategy

### First 3 canonical modules to implement

Do not start with sales or production.

Start with:

1. `organization + party + role + approval + signature`
2. `item + revision + document_revision + work_instruction`
3. `bom + work_definition + operation`

Reason:

- these modules force the platform to solve governance, revisioning, approval, attachments, workflow, detail pages, and related lists correctly
- once these are stable, planning, MES, and eQMS can reuse the same backbone

### Then implement:

4. `sales_order + production_order`
5. `work_order + job + job_event`
6. `inspection_lot + nonconformance + capa`

## Done Definition

The platform is only “ready” when all of these are true:

- canonical tables are the write truth for the implemented domain
- no workflow writes to non-canonical runtime tables
- object page can be rendered from metadata
- list/grid can be rendered from metadata
- action availability can be rendered from metadata
- audit trail is visible
- attachments and documents are governed
- archive/restore behavior is defined
- cursor pagination exists for big lists
- projections exist for boards, operator views, and analytics

## Practical Recommendation

If you want to do it right from the start:

- choose the canonical schema as the only business model
- refactor the current platform artifacts into **builder/runtime contracts**, not into business truth
- build the platform services first
- implement canonical modules in the order:
  - foundation
  - master
  - engineering
  - planning
  - execution
  - inventory/cost
  - eQMS

This is slower in the first few weeks, but dramatically faster over the lifetime of the system.

## Official References

- Microsoft CQRS: [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- Microsoft ACL: [Anti-corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
- Microsoft Strangler Fig: [Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
- Microsoft Dataverse metadata: [Get table metadata](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/get-table-metadata)
- Microsoft Dataverse timeline: [Set up timeline control](https://learn.microsoft.com/en-gb/power-apps/maker/model-driven-apps/set-up-timeline-control)
- Salesforce metadata: [Query ObjectInfo](https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html)
- Salesforce related lists: [Query Related List Info](https://developer.salesforce.com/docs/platform/graphql/guide/query-related-list-info.html)
- Relay pagination: [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- SAP RAP object page: [Object Page](https://help.sap.com/docs/abap-cloud/abap-rap/object-page)
- SAP RAP UI metadata: [Adding UI Metadata to the Data Model](https://help.sap.com/docs/abap-cloud/abap-rap/adding-ui-metadata-to-data-model)
- Oracle item master: [Item Master Organizations](https://docs.oracle.com/en/cloud/saas/applications-common/25d/faesc/item-master-organizations.html)
- Oracle work orders: [Manage Work Orders](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26a/faumm/manage-work-orders.html)
- IFS MRP: [About MRP](https://docs.ifs.com/ifsclouddocs/25r2/lang/en/Planning/AboutMrp.htm)
- ISA-95: [ISA-95 standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- FDA Part 11: [Part 11, Electronic Records; Electronic Signatures](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- PostgreSQL pagination: [LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)
- PostgreSQL materialized views: [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)

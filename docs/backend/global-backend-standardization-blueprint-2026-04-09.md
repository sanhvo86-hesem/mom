# Global Backend Standardization Blueprint

Date: 2026-04-09
Scope: enterprise backend target state for HESEM before broad frontend scale-out
Input baseline:

- `mom/docs/backend-readiness-gap-analysis-2026-04-09.md`
- `mom/data/registry/table-registry.json`
- `mom/data/registry/domain-architecture.json`
- `mom/data/registry/endpoint-catalog.json`
- `mom/data/registry/publication-truth-summary.json`

## Executive Standard

HESEM should standardize toward a canonical enterprise backend with these characteristics:

- one canonical business model per object family
- one governed write path per lifecycle owner
- read models and projections allowed, but no ambiguous dual-write ownership
- OpenAPI-described HTTP APIs using JSON Schema 2020-12
- RFC 9457 problem details for errors
- explicit workflow/state contracts, not free-form status mutation
- auditability, traceability, and e-signature readiness for regulated manufacturing
- ISA-95-aligned separation between enterprise planning, operations management, and control integration

This blueprint is the target authority for endpoint, schema, variable, lifecycle, and roadmap decisions.

## External Source Authority

### Core API and schema standards

- OpenAPI Specification 3.1.1
  - https://spec.openapis.org/oas/v3.1.1.html
- JSON Schema Draft 2020-12
  - https://json-schema.org/specification
  - https://json-schema.org/draft/2020-12
- HTTP semantics
  - https://www.rfc-editor.org/rfc/rfc9110
- Problem Details for HTTP APIs
  - https://www.rfc-editor.org/rfc/rfc9457
- API workflow description for multi-call business outcomes
  - https://spec.openapis.org/arazzo/latest.html

### Enterprise manufacturing and quality reference models

- ISA-95 enterprise-control integration
  - https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- SAP quality inspection lots and status management
  - https://help.sap.com/docs/SAP_S4HANA_CLOUD/d1e58be39d884a0dbf75a7526a9acbf4/ecfae2574096f432e10000000a441470.html
  - https://help.sap.com/docs/SAP_S4HANA_ONPREMISE/2bc3ee8d1c83404e8cf62418640004f2/6140b853dcfcb44ce10000000a174cb4.html
  - https://help.sap.com/docs/SAP_S4HANA_CLOUD/c0c54048d35849128be8e872df5bea6d/3130f553da4a4bf68e3336b66ec5635c.html
- SAP maintenance inspection checklists and procurement milestones
  - https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e72f747389b340229f7fa343975bfa57/71ee98560102490ab0ca9b6eb69b3416.html
  - https://help.sap.com/docs/SAP_S4HANA_CLOUD/2dfa044a255f49e89a3050daf3c61c11/efa9cfce88ad4ab49051c2cf4745e927.html
- Oracle procurement, receiving, quality, maintenance, and assets
  - https://docs.oracle.com/cd/G49759_01/trans/G46404-01/using-procurement.pdf
  - https://docs.oracle.com/cd/G49759_01/trans/G46465-01/using-receiving.pdf
  - https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/fauqm/inspection-plan-criteria.html
  - https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/faumm/report-work.html
  - https://docs.oracle.com/cd/G49759_01/trans/G46399-01/using-assets.pdf
  - https://docs.oracle.com/en/cloud/saas/financials/24a/faalm/using-assets.pdf
- Microsoft Dynamics 365 warehouse, quality, asset, finance
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/quality-check
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/tasks/inspect-quality-goods
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/asset-management/work-order-scheduling/schedule-work-orders
  - https://learn.microsoft.com/en-us/dynamics365/finance/general-ledger/account-reconciliation
  - https://learn.microsoft.com/en-us/dynamics365/finance/fixed-assets/set-up-fixed-assets
  - https://learn.microsoft.com/en-us/dynamics365/finance/fixed-assets/acquire-assets-procurement
- IFS cloud business function and extensibility posture
  - https://www.ifs.com/en/ifs-cloud
  - https://www.ifs.com/en/assets/cloud/ifs-cloud-brochure
  - https://www.ifs.com/en/assets/cloud/enterprise-financial-operations-software
  - https://docs.ifs.com/techdocs/Foundation1/040_administration/220_user_interface/020_custom_objects/040_custom_fields/

### Regulated records and safety/compliance

- FDA 21 CFR Part 11 scope and application
  - https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- EU Annex 11 / computerised systems revision context
  - https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en
  - https://health.ec.europa.eu/consultations/stakeholders-consultation-eudralex-volume-4-good-manufacturing-practice-guidelines-chapter-4-annex_en
- OSHA inspection/record expectations
  - https://www.osha.gov/sites/default/files/enforcement/directives/ADM_03-01-006.pdf
- EPA e-Manifest and hazardous records
  - https://www.epa.gov/e-manifest

## Global Operating Logic Extracted From Official Sources

### 1. Lifecycle state must control permissible business actions

The standard operating model across SAP, Oracle, and Dynamics is:

- lifecycle state is not decorative
- lifecycle state controls what can happen next
- state transitions may be gated by role, prerequisites, and linked-object completion

Therefore HESEM must eliminate free-form mutation for business-critical objects.

### 2. Inspection is multi-stage, not single-stage

Official enterprise references show inspection at:

- receiving
- inventory
- production / WIP
- maintenance / asset
- shipping / final release

Therefore HESEM must model:

- `incoming_inspections`
- `ipqc_inspections`
- `fqc_inspections`
- `oqc_inspections`
- shared `inspection_lots` and `inspection_results`

### 3. Procurement is a closed transactional chain

The standard chain is:

- requisition
- approval
- purchase order
- shipment notice / ASN
- receipt
- inspection / acceptance
- invoice match
- payment

Therefore PO cannot remain the only strong object in purchasing.

### 4. Warehouse and quality must be integrated

Official warehouse/quality patterns show:

- receiving can create quality work
- failed checks can reroute putaway
- quarantine and release are inventory controls, not just quality comments

Therefore WMS must honor quality holds and usage decisions directly.

### 5. Asset management must unify operations, maintenance, and finance

Official enterprise references show:

- asset acquisition
- capitalization
- maintenance planning
- work order execution
- depreciation
- reliability

Therefore HESEM needs a canonical asset identity model that spans equipment, PM, finance, and service.

### 6. Compliance obligations and incidents need traceable closure

Official regulated and safety references consistently require:

- controlled records
- audit trails
- retention
- signatures/approvals where applicable
- closure evidence

Therefore obligation, permit, incident, corrective action, and review records must be governed objects.

## Target Architecture

### Layer model

HESEM should standardize to the following backend layers:

1. Canonical foundation
   - organizations
   - parties
   - sites/plants/warehouses/work centers
   - users/roles/approval groups
   - code sets and status sets
   - attachments/evidence/e-signatures

2. Canonical business objects
   - customer, supplier, employee, asset, item
   - commercial, procurement, production, quality, logistics, finance, safety

3. Workflow and transaction orchestration
   - lifecycle states
   - role guards
   - transition rules
   - domain actions
   - outbox and integration events

4. Projection and runtime read models
   - dashboards
   - portal-specific views
   - search models
   - mobile execution lists

5. Integration and edge
   - ERP/MES adapters
   - machine telemetry
   - barcode/mobile
   - document and evidence exports

### Write-model rule

For every lifecycle owner:

- exactly one canonical write model
- transitions only through the lifecycle authority
- explicit domain actions for side-effect-heavy steps
- projections may denormalize, but never own state

### Projection rule

Projection/read models may:

- enrich
- aggregate
- optimize search
- simplify frontend rendering

Projection/read models may not:

- become an alternate lifecycle owner
- invent statuses
- bypass concurrency and scope

## Canonical Naming Standards

### General rules

- bounded context names: snake_case
- database tables: snake_case plural
- database columns: snake_case
- API JSON fields: snake_case
- query parameters: snake_case
- path resources: kebab-case plural
- path identifiers: snake_case inside braces
- OpenAPI `operationId`: lowerCamelCase

Examples:

- table: `sales_orders`
- field: `sales_order_id`
- path: `/api/v1/sales-orders/{sales_order_id}`
- action key: `sales.sales_orders.confirm`
- OpenAPI operationId: `confirmSalesOrder`

### Identifier conventions

- surrogate PK: `<entity>_id` as UUID
- business number: `<entity>_number`
- business code: `<entity>_code`
- parent FK: `<parent_entity>_id`
- lifecycle field: `<entity>_status` for top-level lifecycle owner, or `status` only when domain-wide standard already exists and is unambiguous
- concurrency field: `row_version`
- scope fields:
  - `org_company_code`
  - `org_legal_entity_code`
  - `org_plant_id`
  - `org_site_id`
- source lineage:
  - `source_system`
  - `source_record_id`

### Timestamp conventions

- `created_at`
- `updated_at`
- `effective_from`
- `effective_to`
- `approved_at`
- `released_at`
- `completed_at`
- `closed_at`
- `cancelled_at`

Avoid ambiguous names like `date` or `status_date` unless domain-specific.

## Canonical API Standards

### Protocol and description

- HTTP APIs documented in OpenAPI 3.1.1
- schema dialect: JSON Schema 2020-12
- workflow sequences documented in Arazzo where business outcomes span multiple calls

### Resource pattern

For lifecycle owners:

- `GET /api/v1/<resource>`
- `GET /api/v1/<resource>/{id}`
- `POST /api/v1/<resource>`
- `PATCH /api/v1/<resource>/{id}`
- `POST /api/v1/<resource>/{id}:transition`

For side-effect domain verbs:

- `POST /api/v1/<resource>/{id}:approve`
- `POST /api/v1/<resource>/{id}:release`
- `POST /api/v1/<resource>/{id}:receive`
- `POST /api/v1/<resource>/{id}:complete`
- `POST /api/v1/<resource>/{id}:close`

Use explicit verbs when:

- multiple related records are created or mutated
- financial posting or inventory movement occurs
- audit/e-signature obligations apply
- downstream events must be emitted

### Sub-resource pattern

Use nested resources only for true containment or contextual views:

- `/sales-orders/{sales_order_id}/lines`
- `/purchase-orders/{purchase_order_id}/lines`
- `/jobs/{job_order_id}/operations`
- `/ncrs/{ncr_id}/actions`
- `/assets/{asset_id}/maintenance-history`

### Error contract

Use RFC 9457 problem details:

- `type`
- `title`
- `status`
- `detail`
- `instance`

Extend with:

- `code`
- `correlation_id`
- `field_errors`
- `expected_row_version`
- `current_row_version`
- `required_roles`

### Concurrency

Use optimistic concurrency for all lifecycle owners:

- response headers:
  - `ETag`
  - `X-Row-Version`
- request headers:
  - `If-Match`
- request body fallback:
  - `expected_row_version`

### Deletion

Default rule:

- no hard delete for governed records
- archive or close instead

Allow physical delete only for:

- draft, unreferenced setup objects
- explicitly non-governed support rows

## Canonical Schema Standards

### Lifecycle owner schema

A top-level lifecycle owner should minimally contain:

- UUID primary key
- business number or code
- lifecycle status field
- timestamps
- row version
- organization scope
- source lineage
- optional metadata JSONB

### Child/detail schema

Child rows should not own lifecycle unless there is a real independent business process.

Examples of child-only rows:

- order lines
- inspection result measurements
- maintenance plan items
- training matrix assignments

### Reference data and code-set schema

Every code-bearing object should use governed code sets, not free-form values:

- status sets
- reason codes
- disposition codes
- severity codes
- incoterms
- payment terms
- defect codes
- failure codes

### Evidence and signature schema

Critical business objects should not embed evidence blobs directly.

Use shared evidence/signature relations:

- `attachments`
- `evidence_links`
- `electronic_signatures`
- `approval_records`

### Event and outbox schema

Every business action with downstream effects should emit an outbox event.

Minimum event envelope:

- `event_id`
- `event_type`
- `aggregate_type`
- `aggregate_id`
- `aggregate_number`
- `occurred_at`
- `triggered_by`
- `payload`
- `correlation_id`

## Canonical Workflow Standards

### Lifecycle categories

Use only these categories:

- setup/master lifecycle
- transactional lifecycle
- investigation/case lifecycle
- review/approval lifecycle
- execution lifecycle
- planning lifecycle

### Transition standards

Each lifecycle owner must declare:

- current state field
- state set
- allowed transitions
- role guards
- prerequisite checks
- emitted events
- required attachments/e-signatures where applicable
- closure criteria

### Action standards

Actions are mandatory where business meaning is stronger than generic transition.

Examples:

- sales order:
  - `:confirm`
  - `:release-to-production`
  - `:ship`
  - `:close`
- purchase order:
  - `:submit-approval`
  - `:approve`
  - `:send-to-supplier`
  - `:receive`
  - `:close`
- ncr:
  - `:contain`
  - `:disposition`
  - `:launch-capa`
  - `:verify-effectiveness`
  - `:close`

## Global Canonical Domain Map

The target enterprise backend should standardize around these process families:

1. Foundation and governance
2. Commercial and CRM
3. Procure-to-pay
4. Plan-to-produce
5. Inventory, warehouse, shipping, transportation
6. Quality and compliance
7. Asset, maintenance, tooling, calibration
8. HCM, training, qualification
9. EHS and external obligations
10. Finance and treasury
11. Audit, CI, and operational excellence
12. Analytics, events, and integration

## Variable Standardization Rules For HESEM

### Keep

- snake_case semantic naming
- `row_version`
- org scope columns
- `source_system`
- `source_record_id`

### Standardize

- remove cases where `workflowId` exists without lifecycle field
- stop mixing `status`, `*_status`, `approval_status`, and ad hoc boolean gates without contract
- stop storing critical document/control outcomes only in `metadata`
- stop duplicating business identity across sibling tables without canonical cross-reference

### Deprecate

- uncontrolled `generic_status_only` on major lifecycle owners
- file-first lifecycle ownership for enterprise transaction objects
- mixed naming for the same business key across domains

## Roadmap Principles

### Wave order

1. lifecycle contract repair
2. identity and master-data unification
3. missing object-family introduction
4. canonical write-path consolidation
5. integration and projection cleanup
6. frontend expansion after backend authority is stable

### Do not do

- do not build broad frontend against unstable lifecycle objects
- do not keep adding screens on top of duplicate masters
- do not create new domain logic in ad hoc file stores when canonical DB tables exist

## Strategic Upgrade Waves

### Wave 0: Authority and freeze

- freeze new frontend work for weak domains
- adopt this blueprint plus the endpoint/schema catalog as backend authority
- identify all lifecycle owners lacking valid transition contract

### Wave 1: Workflow contract normalization

- add missing lifecycle columns or remove false workflow ownership
- define guarded transitions
- standardize status sets
- close gaps for:
  - `equipment`
  - `tools`
  - `oqc_inspections`
  - `qual_compliance_obligations`
  - `ehs_incidents`
  - `crm_customer_touchpoints`

### Wave 2: Master-data unification

- canonical customer master
- canonical supplier master
- canonical employee master
- canonical asset master or governed cross-reference model

### Wave 3: Missing process object introduction

- customer purchase orders
- purchase requisitions
- supplier ASNs
- purchase receipts
- IPQC inspections
- FQC inspections
- external authority/certificate records where required

### Wave 4: Canonical transaction chain closure

- customer PO -> quote -> SO -> JO -> WO -> shipment -> complaint/return
- requisition -> PO -> ASN -> receipt -> IQC -> invoice match -> payment
- asset acquisition -> capitalization -> PM -> calibration -> reliability -> depreciation

### Wave 5: Projection and legacy runtime retirement

- retire custom/file ownership for SO/JO/WO
- retire shadow-write-only patterns where canonical write model is ready
- convert dashboards to read models fed from canonical events

### Wave 6: Full frontend scale-out

- only after lifecycle authority, identity, and chain closure are stable

## Deliverables Required To Execute This Blueprint

- canonical endpoint/schema catalog
- OpenAPI workspace per domain
- JSON Schema component library
- lifecycle contract register
- event taxonomy and outbox register
- migration dependency map
- compatibility/deprecation register for legacy endpoints

## Bottom Line

The highest-standard international target for HESEM is not:

- more ad hoc CRUD
- more screens on unstable objects
- more parallel masters

The correct target is:

- canonical business objects
- governed lifecycle endpoints
- stable schema dialect
- explicit transaction chains
- auditable and integration-safe write ownership

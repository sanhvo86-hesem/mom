# ERP + MOM Backend Target Architecture

Date: 2026-04-10
Scope: long-term backend restructuring plan for HESEM ERP + MOM platform
Status: target-state proposal grounded in current repo evidence and official standards

## Why This Exists

The current platform is powerful but still cognitively expensive:

- the physical database authority is clear
- the generated registry is broad
- the schema studio workspace is curated
- the terminology around schema, registry, design, workspace, and system view is still too easy to misread

That is dangerous for both humans and AI tools.

The backend must be restructured so that no one has to guess:

- what is authoritative for storage
- what is authoritative for business meaning
- what is generated
- what is editable
- what is read-only
- what is active, deprecated, archived, or unused

## Current Local Facts

Verified locally on 2026-04-10:

- physical schema authority is declared in `mom/database/schema-authority-summary.json`
- the authority chain is `database/migrations/*.sql -> database/schema.sql`
- authoritative physical table count is `658`
- `mom/data/registry/table-registry.json` also catalogs `658` tables
- `mom/data/schema-studio/designs/workspace.json` currently contains `101` tables and `161` relationships
- `SchemaStudioController` and `DataSchemaService` intentionally expose one editable design: `workspace`
- runtime services and generators still depend heavily on `table-registry.json`, `relation-map.json`, and `endpoint-catalog.json`

Implication:

- `workspace` is not the full backend schema
- `table-registry` is not the physical schema authority
- both are needed today, but for different jobs
- the architecture needs an explicit layered authority model

## External Standards And Reference Direction

The target architecture should align with the following official references:

- OpenAPI 3.1.1: https://spec.openapis.org/oas/v3.1.1.html
- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12
- HTTP Semantics RFC 9110: https://www.rfc-editor.org/rfc/rfc9110
- Problem Details RFC 9457: https://www.rfc-editor.org/rfc/rfc9457
- Arazzo workflow descriptions: https://spec.openapis.org/arazzo/latest.html
- CloudEvents: https://cloudevents.io/
- AsyncAPI: https://www.asyncapi.com/
- Google AIP-155 request identification: https://google.aip.dev/155
- Kubernetes API deprecation policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- ISA-95: https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- FDA Part 11 guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- NIST Lean and Process Improvement: https://www.nist.gov/mep/lean-and-process-improvement
- OPC UA overview: https://opcfoundation.org/
- Oracle Procurement / Receiving / Financials:
  - https://docs.oracle.com/cd/G49759_01/trans/G46404-01/using-procurement.pdf
  - https://docs.oracle.com/cd/G49759_01/trans/G46465-01/using-receiving.pdf
  - https://docs.oracle.com/cloud/131/user_services/OAFIM.pdf
- Microsoft Dynamics 365:
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/asset-management/work-order-scheduling/schedule-work-orders
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/tasks/inspect-quality-goods
  - https://learn.microsoft.com/en-us/dynamics365/finance/general-ledger/account-reconciliation
- SAP Help:
  - https://help.sap.com/docs/SAP_S4HANA_ONPREMISE/2bc3ee8d1c83404e8cf62418640004f2/6140b853dcfcb44ce10000000a174cb4.html
  - https://help.sap.com/docs/SAP_S4HANA_CLOUD/d1e58be39d884a0dbf75a7526a9acbf4/ecfae2574096f432e10000000a441470.html

## Design Principles

Every backend element must answer these questions:

1. What business purpose does it exist for?
2. Which KPI, gate, or compliance control consumes it?
3. What would break if it did not exist?
4. Who owns its lifecycle?
5. Is it a write model, a child record, an event, a projection, a design artifact, or a compatibility alias?
6. Can it be deprecated, and if so how do we preserve round-trip compatibility without data loss?

If an element cannot answer those questions, it must not remain ambiguous in the system.

## The Required Authority Model

The backend should standardize to exactly five clearly named layers.

### 1. Storage Authority

Purpose:

- executable source of truth for physical persistence
- tables, columns, constraints, indexes, views, triggers, functions

Authority:

- `database/migrations/*.sql`
- generated snapshot `database/schema.sql`

Rules:

- only this layer defines physical schema
- no design file, registry artifact, or UI workspace may redefine storage truth
- one PostgreSQL schema should remain active unless there is a hard multi-tenant or regulatory requirement
- in the current repo, that should remain `public`

### 2. Business Contract Authority

Purpose:

- machine-readable definition of business meaning
- canonical objects, state models, invariants, commands, events, and linkages
- the layer AI tools should read first

This layer does not exist cleanly enough yet. It should be added explicitly.

Recommended path:

`mom/contracts/`

Recommended structure:

```text
mom/contracts/
  domains/
    foundation/
    commercial/
    procurement/
    planning/
    manufacturing/
    quality/
    warehouse_logistics/
    maintenance_ehs/
    finance/
    analytics/
  objects/
    sales-orders/
      object.yaml
      fields.schema.json
      workflow.yaml
      commands.yaml
      events.yaml
      mappings.yaml
      examples/
    incoming-inspections/
    work-orders/
    purchase-orders/
    ap-invoices/
```

Each canonical object package should declare:

- `purpose`
- `classification`
- `canonical_name`
- `storage_mapping`
- `owner_domain`
- `id_strategy`
- `state_model`
- `allowed_commands`
- `required_links`
- `evidence_requirements`
- `event_contracts`
- `retention_policy`
- `deprecation_policy`

This is the key missing layer that will stop AI from inferring business meaning from raw tables alone.

### 3. Generated Runtime Registry

Purpose:

- compiled operational catalog for runtime, generators, diagnostics, validators, and portal tooling

Examples:

- `table-registry.json`
- `relation-map.json`
- `endpoint-catalog.json`
- `validation-rules.json`
- publication and wave reports

Rules:

- generated, not hand-authored
- derived from storage authority plus business contract authority
- must never become the only place where business meaning exists
- may be deleted and rebuilt without losing business intent

### 4. Design Workspace

Purpose:

- editable visualization, design exploration, curated schema review, onboarding, architecture communication

Examples:

- `schema-studio/designs/workspace.json`
- `schema-studio/snapshots/workspace.baseline.json`

Rules:

- not authoritative for runtime
- not authoritative for full system contract
- may intentionally show only a curated subset
- should coexist with a separate read-only full system contract view

### 5. Projection And Analytics Layer

Purpose:

- read-only denormalized models for search, KPI, dashboards, OEE, costing snapshots, operational cockpits

Rules:

- must be marked as projections
- must carry lineage fields
- must never own lifecycle truth
- mutations against projections must be blocked at runtime

## Required Naming Model

These terms should be reserved and used consistently:

- `database` = PostgreSQL database
- `schema` = PostgreSQL schema such as `public`
- `storage authority` = migrations and generated schema snapshot
- `business contract` = canonical semantic definition of objects and workflows
- `registry` = generated machine-readable runtime catalog
- `workspace design` = editable or curated design artifact
- `projection` = read-only derived read model
- `compatibility alias` = legacy object name maintained temporarily for migration safety
- `archived legacy` = frozen object retained for retention, audit, or rollback
- `unused candidate` = element without a current supported business purpose

Terms that should be avoided:

- `system registry` when the real meaning is full contract view
- `schema` when the real meaning is design document
- `workspace` when the real meaning is full platform

## ERP + MOM Domain Backbone

The long-term platform should be organized by canonical domains, not by accidental table clusters.

### Foundation

- enterprise, company, site, plant, warehouse, work center, work unit
- party, party role, site, contact
- user, role, approval group
- codes, reasons, status sets, units, calendars, shifts
- attachment, evidence, signature, audit event

### Commercial

- customer master
- quotation
- customer purchase order
- sales order
- customer service request
- complaint
- return / RMA

### Procurement

- supplier master
- purchase requisition
- sourcing / approval
- supplier purchase order
- ASN
- receipt
- incoming inspection
- AP invoice match

### Engineering

- item master
- item revision
- specifications
- BOM
- routing / work definition
- engineering change
- tooling specification

### Planning

- demand forecast
- MRP outputs
- master production schedule
- finite schedule
- dispatch queue

### Manufacturing Execution

- job order
- manufacturing work order
- operation execution
- material issue / backflush
- labor reporting
- machine event
- genealogy / lot / serial linkage

### Quality

- inspection plans
- inspection lots
- IQC
- IPQC
- OQC
- FQC alias policy if retained
- inspection results
- NCR
- CAPA
- SPC
- MSA
- deviation / waiver / override

### Warehouse And Logistics

- inventory identity
- stock balance
- warehouse transactions
- quarantine / hold / release
- pick / pack / ship
- freight order
- transport execution

### Maintenance And EHS

- equipment
- asset
- PM plans
- maintenance work order
- permit
- incident
- compliance obligation
- safety observation
- 5S / lean audit

### Finance

- AP invoice
- AR invoice
- payment / receipt
- GL postings
- inventory valuation
- job costing / order costing
- fixed assets
- period close
- credit memo / debit memo

### Analytics And Improvement

- OEE
- plant KPI snapshots
- costing snapshots
- management review
- audit findings
- improvement initiatives

## Canonical Object Taxonomy

Every object must be exactly one of these:

- `reference_master`
- `lifecycle_owner`
- `contained_child`
- `transaction_document`
- `result_record`
- `event_record`
- `evidence_record`
- `projection_record`
- `compatibility_alias`
- `archived_legacy`

Hard rule:

- only `lifecycle_owner` and selected `transaction_document` objects may own governed transitions
- `contained_child`, `result_record`, and `evidence_record` cannot pretend to be top-level workflow owners
- `projection_record` is always read-only

## API And Event Contract Standard

### Synchronous APIs

Use:

- OpenAPI 3.1.1
- JSON Schema 2020-12
- RFC 9457 problem details
- optimistic concurrency via `row_version` and `If-Match`
- idempotent mutation policy
- versioned resource paths under `/api/v1/...`

For each lifecycle owner expose:

- `GET /resource`
- `GET /resource/{id}`
- `POST /resource`
- `PATCH /resource/{id}`
- `POST /resource/{id}:transition`
- `POST /resource/{id}:command-name`
- `GET /resource/{id}/timeline`
- `GET /resource/{id}/attachments`

### Business workflows

Describe cross-call flows using Arazzo:

- quote to customer PO to SO
- requisition to PO to receipt to IQC to AP
- JO to WO to IPQC to OQC to shipping
- NCR to CAPA to effectiveness check
- incident to containment to CAPA to closure
- period close and valuation sequence

### Events

Use:

- CloudEvents envelope
- AsyncAPI for channel and payload description
- transactional outbox pattern in the application layer

Canonical events should exist for:

- object created
- state transitioned
- hold applied
- release granted
- inspection completed
- NCR opened
- CAPA closed
- shipment released
- financial posting finalized

## AI-Readable Backend Bundle

To stop AI from guessing, the repo should provide a minimal machine-readable bundle that is always up to date:

```text
mom/contracts/glossary.json
mom/contracts/domain-map.json
mom/contracts/object-index.json
mom/contracts/state-model-index.json
mom/contracts/command-index.json
mom/contracts/event-index.json
mom/contracts/deprecation-ledger.json
mom/contracts/migration-manifest.json
mom/contracts/examples/
```

Minimum contents:

- canonical object name
- plain-language purpose
- domain owner
- storage tables
- API resources
- lifecycle states
- allowed transitions
- required links
- examples of valid payloads
- deprecation successor if any

If an AI tool can load those files, it will no longer need to infer business intent from random PHP code or generated registry artifacts.

## Non-Destructive Migration Policy

No data loss is acceptable during restructuring.

The platform should use a five-state migration policy for existing objects:

1. `active_canonical`
   - used in current writes
2. `compatibility_supported`
   - still served for backward compatibility
3. `frozen_legacy`
   - no new writes except migration or audit repair
4. `archived_legacy`
   - retained for retention and audit only
5. `unused_candidate`
   - no active business purpose; cannot be deleted until proven unmapped

Mandatory safeguards:

- no physical table drop until data mapping, retention review, rollback path, and read compatibility are complete
- legacy names may remain as compatibility views or translation endpoints
- every object deprecation needs a successor mapping
- persisted representations must round-trip during the deprecation window
- dual-write is forbidden except within time-bounded migration bridges with parity checks

## How To Handle The Current 658 vs 101 Reality

The current repo should explicitly adopt this model:

- `658` = full physical + registry-backed platform contract scope
- `101` = curated workspace design subset

The correct long-term fix is not to collapse `658` into `101`.

The correct fix is:

1. keep one physical database schema authority
2. keep one full generated system contract registry
3. keep one editable workspace design
4. present them in the UI as different layers, not as competing schemas

Recommended Schema Studio model:

- `Workspace Design` - editable, curated
- `System Contract Registry` - read-only, full platform
- `Storage Authority` - read-only migration and schema status

## Required Backend Package Layout

Without rewriting the whole stack immediately, the target package layout should move toward:

```text
mom/
  api/
    contracts/
    controllers/
    application/
    domain/
    infrastructure/
    policies/
  database/
    migrations/
    views/
    seeds/
  contracts/
    domains/
    objects/
    workflows/
    events/
  data/
    registry/
      generated/
    schema-studio/
      designs/
      snapshots/
      releases/
```

Meaning:

- `database/` owns persistence
- `contracts/` owns business meaning
- `data/registry/generated/` owns compiled runtime catalogs
- `schema-studio/` owns design and visualization only

## Long-Term ERP + MOM Capability Model

The platform should be planned around these major value streams:

- Lead to Quote
- Quote to Customer PO
- Customer PO to Sales Order
- Sales Order to Production
- Requisition to Purchase Order
- Supplier PO to Receipt
- Receipt to IQC to Stock Release
- Plan to Produce
- Execute to Traceability
- WIP to IPQC to NCR to Release
- OQC to Ship to Return
- Maintain to Reliability
- Incident to CAPA to Closure
- Record to Report
- Inventory to Valuation to Close
- Audit to Improvement

Each value stream should have:

- object map
- state model
- command map
- event map
- KPI map
- evidence map
- integration map

## Immediate Restructuring Roadmap

### Phase 0: Terminology Lock

- standardize the terms above in docs, UI, code comments, and admin screens
- stop using `schema` for workspace design
- rename the full view to `System Contract Registry`

### Phase 1: Contract Authority Introduction

- create `mom/contracts/`
- define canonical object packages for the top 30 lifecycle owners
- declare successors for every alias and legacy split object

### Phase 2: Registry Compiler Split

- make `table-registry`, `relation-map`, `endpoint-catalog`, and validation bundles explicitly generated from:
  - migrations
  - contracts
  - workflow specs
- stop relying on inferred semantics from schema alone

### Phase 3: ERP + MOM Backbone Hardening

- unify commercial, procurement, production, quality, maintenance, and finance object ownership
- remove residual dual-write bridges
- formalize inspection lot and genealogy backbone

### Phase 4: Compatibility And Deprecation Governance

- add deprecation ledger
- add version policy
- add warning headers and release notes for deprecated endpoints
- preserve round-trip behavior for persisted representations

### Phase 5: AI-Ready Knowledge Surface

- publish glossary, object index, state model index, and examples
- generate concise object briefings for tooling and agents
- make backend self-describing enough for safe automation

### Phase 6: Event And Integration Hardening

- outbox + CloudEvents
- AsyncAPI channels
- OPC UA / machine / telemetry adapter contracts
- external master and transaction mappings

## Governance Gates

No new backend element should be accepted unless all of the following are true:

- purpose is declared
- owner domain is declared
- classification is declared
- successor or retention policy is declared
- API schema exists if externally callable
- state model exists if lifecycle-governed
- evidence requirements are declared if regulated
- KPI or gate usage is declared if operationally relevant
- AI-readable examples exist for critical objects

## Final Recommendation

HESEM should not treat the current generated registry or the current workspace design as the final architecture.

The strongest long-term backend is:

- one physical schema authority
- one explicit business contract authority
- one generated registry layer
- one curated design workspace layer
- one read-only projection layer
- one governed deprecation and archive policy

That is the structure that supports:

- no data loss migration
- ERP + MOM end-to-end coverage
- cleaner APIs
- explainable workflow logic
- safer AI-assisted implementation
- long-term maintainability without hidden semantic drift


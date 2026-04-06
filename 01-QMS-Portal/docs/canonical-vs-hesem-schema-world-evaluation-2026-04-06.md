# Canonical ERP+MES+eQMS vs HESEM Runtime Schema

Date: 2026-04-06  
Workspace: `C:\Users\TEST4\qms.hesem.com.vn`

## Executive Verdict

Do not choose one schema and discard the other.

- Use the **canonical ERP+MES+eQMS schema** as the **target business model and long-term write-model / source of truth**.
- Use the **current HESEM schema/runtime** as the **current operational runtime, read-model, compatibility layer, and frontend foundation**.
- Build the strongest system by moving toward a **canonical write model + metadata-driven runtime contracts + read/projection models**, not by forcing the current live frontend/runtime directly onto the raw canonical tables today.

If the decision is about **what supports frontend soonest**, the answer is **HESEM runtime**.  
If the decision is about **what should become the long-term enterprise backbone**, the answer is **canonical**.

## Why This Is The Right Decision

### 1. HESEM is much more ready for frontend and runtime today

Current runtime artifacts already expose a large metadata and action surface:

- `2862` endpoints
- `3168` packs
- `2440` relation edges
- `425` workflows
- `528` frontend foundation entities
- `330` frontend-ready entities
- `198` frontend-partial entities
- `115` blocked workflow-engine bridges

Source: [registry-quality-report.json](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\qms-data\registry\registry-quality-report.json)

This means the current HESEM side is already far closer to what Microsoft Dataverse, Salesforce metadata APIs, and SAP Fiori metadata-driven apps expect from a frontend-buildable platform: queryable metadata, relationship graphs, actions, runtime capability signals, and UI contracts.

### 2. Canonical is much stronger as a business model than as a runtime today

The canonical tranche is structurally strong:

- `072`: enterprise/governance/party/calendar/approval/e-signature/attachment backbone
- `073`: item master and revision/variant/site semantics
- `074`: BOM and engineering/work-definition semantics
- `075`: planning/orchestration backbone
- `076`: MES execution spine
- `077`: inventory/cost/traceability backbone
- `078`: eQMS/compliance backbone

Examples:

- [072_canonical_foundation_governance.sql](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\database\migrations\072_canonical_foundation_governance.sql)
- [073_canonical_master_data_core.sql](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\database\migrations\073_canonical_master_data_core.sql)
- [076_canonical_mes_execution_spine.sql](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\database\migrations\076_canonical_mes_execution_spine.sql)
- [078_canonical_eqms_compliance_backbone.sql](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\database\migrations\078_canonical_eqms_compliance_backbone.sql)

But the canonical model is **not yet onboarded into runtime metadata and builder contracts**:

- Canonical tables declared in `072`-`078`: `101`
- Canonical tables present in current registry: `0`
- Canonical tables still missing from registry onboarding: `101`

This is the decisive reason canonical cannot yet replace HESEM runtime directly for frontend delivery.

## Local Evidence

### A. Live schema / registry drift

From the live audit:

- DB tables: `628`
- DB columns: `11,115`
- Orphan/unmapped tables: `45`
- DB columns without field definition: `316`

Source: [schema-field-audit-full.json](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\docs\schema-field-audit-full.json)

Important orphan canonical-style tables visible in the audit include:

- `alarm_event`
- `approval`
- `electronic_signature`
- `inspection_lot`
- `capa`

This confirms the canonical model is already appearing in the DB surface, but the runtime registry and field contracts are not fully caught up.

### B. Workflow drift

The workflow layer already uses canonical business language in places, but runtime still binds to legacy tables:

- canonical `capa` behavior still maps to `capa_records`
- canonical `document` behavior still maps to `documents`
- canonical `sales_order` behavior still maps to `sales_orders`
- execution workflows still depend on legacy MES/runtime tables

Source: [workflow-library.json](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\qms-data\registry\workflow-library.json)

This is the clearest sign that the system is in a **semantic transition state**, not yet a clean canonical runtime.

### C. Runtime still depends on legacy operational tables

Current runtime/read-model logic continues to read and aggregate from legacy/runtime tables such as:

- `items`
- `sales_orders`
- `job_orders`
- `mes_downtime_events`
- `maintenance_work_orders`
- `documents`

Sources:

- [DataLayer.php](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\database\DataLayer.php)
- [api.php](C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\api.php)

So while canonical is the better destination model, **HESEM is still the runtime truth for the application surface**.

## Deep Comparative Assessment

| Dimension | Canonical ERP+MES+eQMS | Current HESEM Runtime | Verdict |
|---|---|---|---|
| Business semantics | Stronger, cleaner, more unified | Mixed, legacy/plural/runtime-driven | Canonical wins |
| Frontend readiness | Low today because registry onboarding is missing | High today because packs, relations, ACL, endpoints already exist | HESEM wins |
| Workflow runtime fit | Better entity naming, but bridge not wired | Running, but still coupled to legacy tables | HESEM now, Canonical later |
| Master data SSOT suitability | Strong | Medium | Canonical wins |
| Planning/ERP backbone | Strong target shape | Operational but less clean | Canonical wins |
| MES execution truth model | Strong event/capture/genealogy spine | Strong read-side/operator practicality | Split: canonical write, HESEM read |
| eQMS/regulatory model | Stronger target backbone | Operational but less canonical | Canonical wins |
| Governance foundation | Stronger conceptual model | Stronger live enforcement today | Split |
| Migration risk if chosen alone | High if used directly now | High if frozen forever as SSOT | Use both in roles |

## What To Take From Canonical

Canonical should become the target source of truth for these domains and concepts:

- `org_enterprise`, `org_company`, `org_site`, `org_plant`, `org_warehouse`, `org_work_center`
- `party`, `calendar`, `status_code`, `reason_code`
- `approval`, `electronic_signature`, `attachment`
- `item`, `item_revision`, `item_variant`, `item_site`, `item_spec`
- `bom`, `bom_version`, `bom_line`, `work_definition`, `operation`, `work_instruction`
- `sales_order`, `sales_order_line`, `purchase_order`, `forecast`, `production_order`
- `work_order`, `job`, `job_event`, `labor_capture`, `material_consumption`, `production_completion`, `genealogy_link`, `downtime_event`
- `inspection_lot`, `inspection_result`, `nonconformance`, `deviation`, `capa`, `complaint`, `document`, `document_revision`, `change_control`, `training_record`, `risk_register`

These are the pieces that most closely match global enterprise references from Oracle, SAP, IFS, ISA-95, and regulated quality systems.

### Regulated quality decision

For the regulated eQMS backbone, the canonical model should be the long-term SSOT for:

- `inspection_plan`
- `inspection_lot`
- `inspection_result`
- `quality_order`
- `nonconformance`
- `deviation`
- `capa`
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
- `electronic_signature`
- `audit_trail`

Current HESEM quality/runtime tables should remain alive as transition and projection surfaces:

- `capa_records`
- `capa_effectiveness_checks`
- `documents`
- `document_versions`
- `incoming_inspections`
- `incoming_inspection_results`
- `ncr_records`
- `training_records`
- `audit_events`

This is the cleanest way to converge toward Part 11 / Annex 11 / ICH Q10-style regulated behavior without breaking current operations.

## What To Keep From Current HESEM

HESEM should be preserved and evolved as the runtime/read-side and transition platform:

- registry contracts
- field metadata and builder packs
- current relation graph
- current endpoint and ACL surface
- row-version and org-scope runtime conventions
- runtime access policy
- evidence/authority/gate concepts already embedded in operations
- legacy/runtime tables that behave like projections or operator cockpits:
  - `items`
  - `sales_orders`
  - `job_orders`
  - `maintenance_work_orders`
  - `mes_downtime_events`
  - `mes_dispatch_queue`
  - `mes_equipment_extended`
  - `documents`
  - `training_records`

These should not remain the ultimate SSOT forever, but they should remain alive as:

- compatibility views
- read models
- integration landing zones
- operator/planner dashboards
- builder-facing runtime surfaces

## Best-Of-World Architecture

The strongest architecture for this program is:

1. **Canonical write-model**
   - business rules, validation, state changes, regulated records, engineering versions, quality records

2. **Workflow engine on canonical entities**
   - no more semantic drift where canonical workflow names write to legacy tables

3. **HESEM runtime read-model / projection layer**
   - optimized for lists, cockpits, boards, detail pages, search, alerts, dashboards, and compatibility

4. **Anti-corruption / translation layer**
   - maps legacy tables and integration payloads to canonical entities

5. **Metadata-driven frontend contracts**
   - not just fields and tables, but object-page sections, actions, side effects, timeline/activity, attachments, related lists, readiness, and permission-aware behavior

This matches official enterprise patterns more closely than a direct-table CRUD architecture.

## Recommended Decision

### Use HESEM now for:

- frontend builder and module builder foundation
- runtime endpoints and ACL
- list/detail/form delivery in the current application
- read-side dashboards and operational pages
- compatibility with current integrations and workflows

### Use Canonical now for:

- target SSOT design
- all new net-new domain modeling
- refactoring of regulated/evidence-heavy flows
- workflow write-path redesign
- long-term ERP/MES/eQMS convergence

### Do not do:

- do not rebuild frontend directly on raw canonical tables today
- do not freeze current HESEM legacy/runtime tables as the permanent enterprise truth
- do not let canonical workflow names continue to execute on legacy tables indefinitely

## Priority Borrow Plan

### Borrow from Canonical into HESEM roadmap

- governance backbone
- approval + e-signature model
- item/revision/site model
- BOM/work definition/operation model
- canonical sales/purchase/production order semantics
- MES execution events and genealogy model
- inspection/nonconformance/CAPA/document revision backbone

### Borrow from HESEM into Canonical rollout

- metadata surface
- builder contracts
- relation packs
- access policy and runtime auth conventions
- optimistic concurrency conventions
- org scope runtime conventions
- planner/operator/read-side projections
- live operational evidence and workflow states already proven in practice

## 3-Phase Transition Path

### Phase 1: Make canonical visible to runtime

- onboard canonical tables into registry
- add field definitions for orphan columns
- add explicit canonical-to-runtime mappings
- publish canonical entity metadata without switching write paths yet

### Phase 2: Move write paths domain-by-domain

- ERP master data and engineering first
- regulated eQMS objects next
- MES execution events after workflow bridge and projections are ready
- keep current HESEM tables as compatibility/read models

### Phase 3: Cut over workflows and projections

- route workflow engine to canonical entities
- materialize read models for builder and boards
- keep legacy names only as views/adapters where necessary
- remove semantic drift between workflow name, entity, and storage

### Cutover principle

Use a `Strangler Fig + Anti-Corruption Layer + CQRS read model` transition, not a big-bang rewrite.

- Keep existing frontend/API contracts stable at the boundary
- place a facade in front of legacy and canonical backends
- route new write paths into canonical domain services
- keep frontend reading from stable read models and projections
- use compatibility views/materialized read stores while migration is in progress
- only cut traffic after reconciliation and lag validation

This is the safest way to avoid breaking frontend, workflows, and integrations during the migration window.

## Final Recommendation

If the question is:

- “Which schema should run the frontend platform today?” -> **HESEM runtime**
- “Which schema should become the enterprise source of truth?” -> **Canonical ERP+MES+eQMS**
- “What is the strongest world-class architecture?” -> **Canonical domain/write model + HESEM-compatible metadata/runtime read layer + workflow bridge + projections**

That is the architecture most consistent with the repository evidence and with official patterns from Microsoft, Salesforce, SAP, Oracle, IFS, Relay, PostgreSQL, and ISA-95.

## Official Reference Documents

- Microsoft Dataverse metadata: [Get table metadata](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/get-table-metadata)
- Microsoft Dataverse timeline: [Set up timeline control](https://learn.microsoft.com/en-gb/power-apps/maker/model-driven-apps/set-up-timeline-control)
- Microsoft Azure CQRS: [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- Microsoft Azure ACL: [Anti-corruption layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
- Microsoft Azure messaging bridge: [Messaging Bridge pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/messaging-bridge)
- Salesforce metadata: [Query ObjectInfo](https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html)
- Salesforce related list metadata: [Query Related List Info](https://developer.salesforce.com/docs/platform/graphql/guide/query-related-list-info.html)
- Relay pagination: [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- SAP RAP object page: [Object Page](https://help.sap.com/docs/abap-cloud/abap-rap/object-page)
- SAP RAP UI metadata: [Adding UI Metadata to the Data Model](https://help.sap.com/docs/abap-cloud/abap-rap/adding-ui-metadata-to-data-model)
- SAP UI side effects: [Side Effects](https://help.sap.com/docs/SAPUI5/b2f662dd9d7a4ec680056733050b4b56.html)
- Oracle item master: [Item Master Organizations](https://docs.oracle.com/en/cloud/saas/applications-common/25d/faesc/item-master-organizations.html)
- Oracle supply planning: [Using Supply Planning](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/fausp/using-supply-planning.pdf)
- Oracle work orders: [Manage Work Orders](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26a/faumm/manage-work-orders.html)
- Oracle product master data management: [Using Product Master Data Management](https://docs.oracle.com/cd/G49759_01/trans/G46470-01/using-product-master-data-management.pdf)
- IFS MRP: [About MRP](https://docs.ifs.com/ifsclouddocs/25r2/lang/en/Planning/AboutMrp.htm)
- IFS routings: [About Routings](https://docs.ifs.com/ifsclouddocs/25r2/MfgStandard/AboutRoutings.htm)
- ISA-95: [ISA-95 standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- PostgreSQL pagination warning: [LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)
- PostgreSQL materialized views: [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)

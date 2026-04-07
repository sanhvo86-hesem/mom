# Prompt 03 -- World-Class Reference Architecture

**Date:** 2026-04-07
**Platform:** HESEM QMS Portal -- Unified ERP + MES + eQMS for CNC/Discrete Manufacturing
**Version:** 5.0.0 (Canonical Schema Era)
**Standards baseline:** ISA-95, ISA-88, MTConnect, OPC UA, FDA Part 11, EU GMP Annex 11, GAMP 5, ISO 9001, IATF 16949, AS9100D, NIST SP 800-53/162, OpenTelemetry, RFC 9457, OpenAPI 3.1.1

---

## 1. Platform Thesis

HESEM QMS Portal is a **single authoritative manufacturing platform** that
unifies Enterprise Resource Planning (ERP), Manufacturing Execution (MES), and
electronic Quality Management (eQMS) into one data model, one API surface, and
one governance spine.

### 1.1 Why a Single Platform

CNC job-order and discrete manufacturing operations at HESEM require tight
coupling between:

- **Planning** (what to make, when, in what quantity)
- **Execution** (how it is being made right now, on which machine, by whom)
- **Quality** (is it within specification, is the evidence captured, is the
  disposition recorded)

Separate systems for these three concerns create data silos, reconciliation
overhead, and compliance gaps. A single platform eliminates these problems by
enforcing one canonical schema (528 tables, 79 migrations) where every
transaction is born with traceability, audit, and governance metadata.

### 1.2 Design Principles

| Principle | Implementation |
|---|---|
| **Single source of truth** | One PostgreSQL schema with canonical migrations 001-079. No shadow databases, no ETL between ERP/MES/QMS. |
| **Contract-first API** | `api/openapi.yaml` is the single source for all 2,872 endpoints. Code generation and frontend bindings derive from this contract. |
| **Governance by default** | Every mutation passes through the Foundation Governance spine (migrations 072 + 079): optimistic concurrency, approval workflows, electronic signatures, evidence capture. |
| **Standards alignment** | Every table, every endpoint, every workflow maps to at least one international standard (ISA-95, FDA Part 11, ISO 9001, etc.). |
| **Observable from birth** | OpenTelemetry-compatible structured events emitted at the service layer. RFC 9457 problem details for all error responses. |

### 1.3 Target Operating Model

The platform serves HESEM's CNC machining, turning, milling, and precision
manufacturing operations. The target is a Vietnamese manufacturing enterprise
producing high-precision mechanical parts for automotive (IATF 16949),
aerospace (AS9100D), and general industrial (ISO 9001) customers.

---

## 2. Standards Mapping

### 2.1 ISA-95 / IEC 62264 -- Enterprise-Control System Integration

ISA-95 defines a five-level hierarchy for manufacturing enterprises. The HESEM
platform maps to all five levels:

| ISA-95 Level | Name | Platform Mapping | Key Migrations |
|---|---|---|---|
| Level 4 | Business Planning and Logistics | ERP operations: planning, purchasing, sales, finance, HR | 006-009, 015, 032-033, 036, 047, 051-053, 058, 060, 065 |
| Level 3 | Manufacturing Operations Management | MES execution: dispatching, tracking, quality, maintenance | 010, 025-031, 043-046, 057, 063, 069 |
| Level 2 | Control Systems | CNC program management, machine data collection | 039 (cnc_program_management), MTConnect/OPC UA integration points |
| Level 1 | Sensors and Actuators | Machine-level signals (via MTConnect adapters) | External; data lands in MES tables via `029_mes_timescale_runtime_activation.sql` |
| Level 0 | Physical Process | The actual machining operation | Physical; no software mapping |

### 2.2 ISA-88 / IEC 61512 -- Batch Control

While HESEM is primarily discrete (not batch) manufacturing, ISA-88 concepts
apply to:

| ISA-88 Concept | Platform Implementation |
|---|---|
| Recipe management | `039_cnc_program_management.sql` -- CNC programs as "recipes" for machining operations |
| Equipment hierarchy | `org_enterprise > org_company > org_site > org_plant > org_warehouse > org_work_center > org_work_unit` (migration 072) |
| Procedural control | Workflow engine bridge in `ApprovalGroupService` -- state machine for approval transitions |

### 2.3 MTConnect -- CNC Machine Data

MTConnect is the open standard for CNC machine tool data collection.

| Aspect | Implementation |
|---|---|
| Data ingestion | TimescaleDB hypertables via `029_mes_timescale_runtime_activation.sql` for high-frequency machine data |
| Real-time notification | `030_mes_realtime_notify.sql` provides PostgreSQL NOTIFY/LISTEN for machine state changes |
| CNC program traceability | `039_cnc_program_management.sql` links programs to parts, operations, and quality records |

### 2.4 OPC UA -- Semantic Interoperability

OPC UA provides the semantic layer for machine-to-enterprise communication.

| Aspect | Implementation |
|---|---|
| Information model | Equipment hierarchy in migration 072 aligns with OPC UA NodeId structure |
| Alarm governance | `027_mes_alarm_governance_alignment.sql` implements OPC UA alarm classification |
| Integration bridge | `028_epicor_mes_integration_foundations.sql` defines the adapter layer for Epicor/OPC UA bridging |

### 2.5 FDA 21 CFR Part 11 -- Electronic Records and Signatures

| Requirement | Implementation |
|---|---|
| Electronic signatures | `electronic_signature` table in migration 072 with signer identity, signature meaning, timestamp |
| Audit trail | `approval` table captures every approval decision with actor, timestamp, and reason |
| Evidence capture | `EvidenceVaultService` (`api/services/EvidenceVaultService.php`) provides immutable evidence storage |
| Access control | Migration `023_rls_policies.sql` implements row-level security |
| Data integrity | `row_version` and `updated_at` triggers in migration 079 ensure tamper detection via optimistic concurrency |

### 2.6 EU GMP Annex 11 -- Computerised Systems

| Requirement | Implementation |
|---|---|
| Risk management | `014_audit_risk.sql` -- audit and risk management tables |
| Change control | `048_plm_change_control.sql` -- PLM change control with approval workflows |
| Data integrity (ALCOA+) | Evidence vault provides attributable, legible, contemporaneous, original, and accurate records |
| Periodic review | Observability events enable periodic system review via structured queries |

### 2.7 GAMP 5 -- Software Lifecycle

| Category | Platform Position |
|---|---|
| Category 4 (Configured) | Standard platform functionality configured per-tenant via seed data and controlled codes |
| Category 5 (Custom) | Custom CNC program management, DPP (Digital Product Passport), AI predictive quality |
| Validation approach | Smoke tests (`tests/foundation_governance_contract_smoke.php`), benchmarks, registry gates serve as the automated validation evidence base |

### 2.8 Quality Management Standards

| Standard | Scope | Key Migrations |
|---|---|---|
| **ISO 9001:2015** | General QMS | 011 (quality), 037 (evidence vault), 061 (quality lab), 078 (eQMS backbone) |
| **IATF 16949:2016** | Automotive QMS | 042 (FMEA/APQP/control plan), 035 (supplier quality), 066 (traceability/serialization) |
| **AS9100D** | Aerospace QMS | 016 (shipping compliance), 068 (trade compliance), 066 (traceability/serialization) |

### 2.9 Security Standards

| Standard | Implementation |
|---|---|
| **NIST SP 800-53** | Access control (RLS policies), audit and accountability (evidence vault), system and communications protection (TLS, parameterized queries) |
| **NIST SP 800-162** | Attribute-based access control (ABAC) patterns in RLS policies per migration 023 |

### 2.10 API and Observability Standards

| Standard | Implementation |
|---|---|
| **OpenAPI 3.1.1** | `api/openapi.yaml` -- single contract for all 2,872 endpoints |
| **RFC 9457** | Problem Details for HTTP APIs -- all error responses use `{type, title, status, detail, instance}` envelope |
| **OpenTelemetry** | `SliceObservability` emits structured events with OTel-compatible naming; service-layer instrumentation in `FoundationGovernanceService` and `ApprovalGroupService` |

---

## 3. Bounded Context Map

The 528 tables across 79 migrations organize into the following bounded
contexts. Each context is a candidate for independent slice promotion through
the Foundation Governance gate.

### 3.1 Platform Services (Cross-Cutting)

**Migrations:** 001, 002, 019, 020, 021, 022, 023, 024, 070, 071

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| Extensions and types | Custom PostgreSQL types, pgcrypto | Database foundation |
| Core system | Users, roles, permissions, tenants | Identity and access |
| System tables | Configuration, feature flags | Runtime configuration |
| Indexes | Cross-table performance indexes | Query optimization |
| Views | Materialized and standard views | Reporting shortcuts |
| Functions and triggers | Stored procedures, trigger functions | Business logic in DB |
| RLS policies | Row-level security rules | Multi-tenant data isolation |
| Seed data | Reference data, controlled codes | Bootstrap data |
| Enterprise governance uplift | Governance metadata extensions | Cross-domain governance |
| MES identity hardening | Machine and operator identity | MES authentication |

### 3.2 Foundation Master Data

**Migrations:** 006, 064, 072, 073, 079

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| ERP master data | Items, BOMs, routings, cost centers | Core master records |
| Master data governance | MDM rules, approval gates | Data stewardship |
| Foundation governance | `org_enterprise`, `org_company`, `org_site`, `org_plant`, `org_warehouse`, `org_work_center`, `org_work_unit`, `party`, `uom`, `calendar`, `shift`, `status_code`, `reason_code`, `electronic_signature`, `approval`, `attachment` | ISA-95 equipment hierarchy, party master, governance backbone |
| Canonical master data core | Extended master attributes | Enriched master data layer |
| FG contract hardening | `row_version`, triggers, indexes on all 072 tables | Optimistic concurrency, performance |

### 3.3 Engineering and Manufacturing Definition

**Migrations:** 039, 042, 048, 063, 074

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| CNC program management | Programs, program-part links, revisions | Recipe management for CNC machines |
| FMEA/APQP/control plan | FMEA worksheets, APQP phases, control plans | Automotive/aerospace quality planning |
| PLM change control | Change requests, change orders, effectivity | Engineering change management |
| Manufacturing engineering | Process plans, industrialization records | Manufacturing process definition |
| Canonical engineering definition | Extended engineering attributes | Enriched engineering layer |

### 3.4 Planning and ERP Operations

**Migrations:** 007, 008, 009, 015, 032, 033, 036, 047, 051, 052, 053, 058, 060, 065, 075

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| Customers and sales | Customer master, sales orders, quotations | Commercial operations |
| Vendors and purchasing | Vendor master, purchase orders | Procurement |
| Inventory | Stock transactions, lot control, warehouse locations | Material management |
| Finance | GL accounts, journals, AP/AR | Financial accounting |
| Order management | Work orders, production orders, scheduling | Production planning |
| Quoting and estimation | Quote lines, cost estimation | Pre-sales engineering |
| Advanced planning and scheduling | Capacity planning, constraint-based scheduling | APS engine |
| Finance trade and multicurrency | Multi-currency transactions, FX rates | International finance |
| Project system earned value | WBS, earned value metrics | Project accounting |
| CRM pipeline | Opportunities, pipeline stages | Sales management |
| S&OP demand-supply planning | Demand forecasts, supply plans | Strategic planning |
| Finance treasury and assets | Fixed assets, treasury operations | Asset management |
| Commercial contract pricing | Pricing agreements, discount structures | Commercial terms |
| Canonical planning orchestration | Extended planning attributes | Enriched planning layer |

### 3.5 MES Execution

**Migrations:** 010, 025, 026, 027, 028, 029, 030, 031, 043, 044, 045, 069, 076

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| Production | Work orders, operations, labor tracking | Shop floor execution |
| MES tables | Machine states, operator assignments, production events | Real-time MES |
| MES world-class foundations | OEE, SPC, Andon | World-class manufacturing metrics |
| MES alarm governance | Alarm definitions, escalation rules | OPC UA alarm alignment |
| Epicor MES integration | Adapter tables for Epicor bridge | ERP-MES integration |
| MES TimescaleDB runtime | Hypertables for time-series machine data | High-frequency data |
| MES real-time notify | NOTIFY/LISTEN channels | Real-time event propagation |
| MES DPP energy cost | Energy consumption, cost allocation | Sustainability tracking |
| Production dispatch and shift targets | Dispatch rules, shift production targets | Daily scheduling |
| Shift calendar | Shift patterns, break rules | Workforce scheduling |
| OQC packing outsource | Outgoing quality, packing, outsource tracking | Post-production |
| Lean manufacturing | Kanban, 5S, kaizen tracking | Lean operations |
| Canonical MES execution spine | Extended MES attributes | Enriched MES layer |

### 3.6 Quality and eQMS

**Migrations:** 011, 034, 035, 037, 061, 078

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| Quality | NCRs, CAPAs, inspections, disposition | Core quality management |
| Exception management | Exception types, resolution workflows | Non-conformance handling |
| Supplier quality | Supplier audits, scorecards, incoming inspection | Supply chain quality |
| Evidence vault | Evidence records, immutable storage links | Compliance evidence |
| Quality lab and compliance | Lab test methods, calibration, specifications | Laboratory management |
| Canonical eQMS backbone | Extended quality attributes | Enriched eQMS layer |

### 3.7 Traceability and Compliance

**Migrations:** 012, 013, 016, 017, 040, 046, 049, 050, 054, 056, 059, 062, 066, 067, 068, 077

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| Calibration and equipment | Calibration records, equipment master | Metrology management |
| Training and HR | Training records, competency matrix | Workforce qualification |
| Shipping and compliance | Shipping documents, export compliance | Trade compliance |
| Subcontracting and RMA | Subcontract orders, return authorizations | Extended supply chain |
| Digital product passport | DPP records, sustainability data | EU DPP regulation |
| Plant maintenance (CMMS) | Work orders, PM schedules, spare parts | Asset maintenance |
| HCM workforce management | Attendance, leave, payroll integration | Human capital |
| WMS extended warehouse | Advanced picking, wave planning, slotting | Warehouse management |
| Transportation management | Shipment planning, carrier management | Logistics |
| Supplier relationship management | SRM scorecards, development programs | Strategic sourcing |
| Service and warranty | Service tickets, warranty claims | After-sales |
| EHS and sustainability | Environmental, health, safety records | Regulatory compliance |
| Traceability and serialization | Serial numbers, lot genealogy, track-and-trace | Full traceability |
| Outsource supplier execution | Outsource work orders, quality at supplier | Extended manufacturing |
| Trade compliance advanced | Denied party screening, ITAR/EAR | Export control |
| Canonical inventory-cost-traceability | Extended traceability attributes | Enriched traceability layer |

### 3.8 Analytics

**Migrations:** 018, 055

| Sub-domain | Tables (examples) | Purpose |
|---|---|---|
| Projects and KPIs | KPI definitions, target/actual tracking | Performance management |
| BI data warehouse | Fact tables, dimension tables, ETL staging | Business intelligence |

---

## 4. Canonical Integration Patterns

### 4.1 Command/Query Separation

The platform enforces a clear separation between commands (mutations) and
queries (reads):

```
Query path:  Controller --> Service (read-through) --> DataLayer --> PostgreSQL
Command path: Controller --> Service (validate) --> WorkflowAdapter (transition check)
              --> DataLayer (persist) --> ObservabilityEmitter (event)
```

- **Query services** (e.g., `FoundationGovernanceService`) provide filtered,
  paginated reads returning the canonical `{data, pageInfo}` envelope.
- **Command services** (e.g., `ApprovalGroupService.requestApproval()`) validate
  input, check workflow state transitions, persist with optimistic concurrency,
  and emit observability events.

### 4.2 Event-Driven Architecture

Events flow through multiple channels:

| Channel | Technology | Use Case |
|---|---|---|
| PostgreSQL NOTIFY/LISTEN | `030_mes_realtime_notify.sql` | Real-time machine state changes, MES events |
| Observability events | `SliceObservability` + OpenTelemetry | Structured audit events for every significant action |
| Workflow bridge events | `ApprovalWorkflowAdapter` | State transition events for approval workflows |
| TimescaleDB continuous aggregates | `029_mes_timescale_runtime_activation.sql` | Aggregated machine metrics over time windows |

### 4.3 Optimistic Concurrency Control

Every Foundation Governance table implements optimistic concurrency:

1. Client reads entity, receives `row_version` (exposed as ETag via `If-Match`)
2. Client sends mutation with `If-Match: <row_version>`
3. Service issues `UPDATE ... WHERE id = $1 AND row_version = $2`
4. If no rows affected, return `409 Conflict` with RFC 9457 problem details
5. On success, trigger `qms_touch_foundation_row()` auto-increments
   `row_version` and updates `updated_at`

This pattern prevents lost updates in concurrent editing scenarios, which is
critical for shop-floor environments where multiple operators may access the
same work order or quality record.

### 4.4 Evidence and Audit Pattern

Every compliance-significant action follows the evidence chain:

1. **Action** -- User or system initiates a mutation
2. **Approval** -- If required, the approval workflow gate fires via
   `ApprovalGroupService`
3. **Signature** -- If required, `electronic_signature` captures signer identity,
   meaning, and timestamp
4. **Evidence** -- `EvidenceVaultService` captures an immutable evidence record
   linking the action, actor, timestamp, and payload hash
5. **Observability** -- `SliceObservability` emits a structured event for
   downstream analytics and audit queries

### 4.5 Workflow Bridge Pattern

The workflow bridge connects domain-specific business logic to the Foundation
Governance approval spine:

```
Domain Service (e.g., QualityNCR)
    |
    v
ApprovalWorkflowAdapter.validateTransition(from, to)
    |
    v  (if valid)
ApprovalGroupService.requestApproval(entityType, entityId, metadata)
    |
    v  (approval granted)
Domain Service.applyDecision(entityId, decision)
    |
    v
EvidenceVaultService.capture(evidence)
```

Currently, 2 of 115 bridge points are wired (both in the FG slice). The
remaining 113 will follow the same pattern as each domain slice is hardened.

---

## 5. ISA-95 Layer Mapping

### 5.1 How 79 Migrations Map to ISA-95

The following table maps each migration to its primary ISA-95 level. Many
migrations span multiple levels; the primary level is where the majority of
tables reside.

| ISA-95 Level | Migration Range | Count | Key Domains |
|---|---|---|---|
| **Level 4** (Business) | 006-009, 015, 032-033, 036, 047, 051-053, 055, 058, 060, 064-065 | ~20 | ERP master data, finance, purchasing, sales, planning, CRM, S&OP, BI |
| **Level 3** (MES/MOM) | 010-014, 025-031, 034-035, 037, 042-046, 057, 061, 063, 069 | ~25 | Production, MES, quality, calibration, evidence vault, maintenance |
| **Level 2** (Control) | 039, 027-028 | ~3 | CNC programs, alarm governance, Epicor bridge |
| **Cross-cutting** | 001-005, 016-024, 040-041, 048-050, 054, 056, 059, 062, 066-068, 070-079 | ~31 | Platform services, governance, compliance, traceability, canonical layers |

### 5.2 ISA-95 Activity Models Implemented

| Activity Model | Implementation |
|---|---|
| Production scheduling | `047_advanced_planning_scheduling.sql`, `043_production_dispatch_shift_targets.sql` |
| Production dispatching | `043_production_dispatch_shift_targets.sql`, `032_order_management_world_class_foundations.sql` |
| Production execution | `010_production.sql`, `025_mes_tables.sql`, `026_mes_world_class_foundations.sql` |
| Production tracking | MES TimescaleDB hypertables, real-time notify |
| Quality test management | `011_quality.sql`, `061_quality_lab_compliance.sql` |
| Material movement | `009_inventory.sql`, `050_wms_extended_warehouse.sql` |
| Maintenance management | `046_plant_maintenance_cmms.sql` |
| Resource management | `049_hcm_workforce_management.sql`, `044_shift_calendar.sql` |

---

## 6. Why This Architecture Is Strong

### 6.1 For CNC/Job-Order/Discrete Manufacturing at HESEM

**Problem:** CNC job shops produce high-mix, low-volume parts where every job
may have different tooling, programs, materials, and quality requirements.
Traditional ERP systems treat manufacturing as repetitive; traditional MES
systems lack financial and planning context.

**Solution:** The HESEM platform addresses this by:

1. **CNC program as first-class entity.** Migration `039_cnc_program_management.sql`
   treats CNC programs with the same governance rigor as BOMs and routings.
   Programs are versioned, linked to parts and operations, and subject to
   change control via `048_plm_change_control.sql`.

2. **Job-order native.** The order management domain (migrations 032-033)
   supports job-order workflows where each production order can have unique
   routing, tooling, and quality requirements -- not just repetitive
   manufacturing runs.

3. **Machine-level traceability.** MTConnect data flows into TimescaleDB
   hypertables (migration 029), linking machine parameters (spindle speed,
   feed rate, tool wear) directly to the part being produced. This enables
   root cause analysis when a quality issue is detected.

4. **Integrated quality at the point of manufacture.** Quality inspections
   (migration 011), SPC (migration 026), and evidence capture (migration 037)
   are wired into the MES execution flow, not bolted on after the fact.

5. **Multi-standard compliance.** A single part may need to satisfy ISO 9001
   (general), IATF 16949 (if destined for automotive), and AS9100D (if
   destined for aerospace). The platform's quality backbone supports all three
   simultaneously through configurable inspection plans and approval workflows.

### 6.2 Architectural Strengths

| Strength | Evidence |
|---|---|
| **Canonical schema** | 528 tables in one PostgreSQL database. No data silos, no ETL between systems. |
| **Contract-first** | 2,872 endpoints defined in `api/openapi.yaml`. Frontend and backend develop against the same contract. |
| **Governance spine** | Foundation Governance (072 + 079) provides approval, e-signature, and evidence infrastructure that every domain slice inherits. |
| **Performance proven** | 702 TPS on FG read mix with 2.86 ms average latency. TimescaleDB for time-series machine data. |
| **Regulatory ready** | Part 11, Annex 11, GAMP 5 structural requirements addressed in schema. Evidence vault for immutable audit trail. |
| **Standards-aligned** | ISA-95 hierarchy, ISA-88 equipment model, MTConnect integration, OPC UA alarm governance. |
| **Observable** | OpenTelemetry-compatible events, RFC 9457 error responses, structured logging. |
| **Concurrency safe** | Optimistic concurrency with row_version triggers on all governed tables. |

### 6.3 Comparison with Alternative Approaches

| Approach | Weakness | HESEM Advantage |
|---|---|---|
| Separate ERP + MES + QMS | Data silos, reconciliation overhead, compliance gaps at system boundaries | Single schema, single API, single governance spine |
| Cloud-native microservices | Distributed transaction complexity, eventual consistency challenges for regulated data | Monolithic schema with strong consistency; PostgreSQL ACID for every transaction |
| Low-code platforms | Limited customization for CNC-specific workflows, vendor lock-in | Full code ownership, CNC-native data model, open standards |
| Spreadsheet-based QMS | No audit trail, no access control, no traceability | Full Part 11 / Annex 11 compliance infrastructure |

---

## 7. AI Governance

### 7.1 NIST AI Risk Management Framework 1.0 Alignment

The HESEM platform includes AI-assisted capabilities (migration
`041_ai_predictive_quality_aps.sql`) for predictive quality and advanced
planning. These are governed under NIST AI RMF 1.0.

| AI RMF Function | Implementation |
|---|---|
| **GOVERN** | AI capabilities are subject to the same Foundation Governance approval workflow as any other domain. No AI model can be deployed without approval_group decision. |
| **MAP** | AI use cases are explicitly mapped: predictive quality (defect prediction from machine parameters), APS optimization (schedule optimization under constraints). Both are advisory, not autonomous. |
| **MEASURE** | AI model performance is tracked in the BI data warehouse (migration 055). Prediction accuracy, false positive/negative rates, and drift metrics are recorded as standard KPIs (migration 018). |
| **MANAGE** | AI model lifecycle follows PLM change control (migration 048). Model versions are tracked, rollback is supported, and every prediction is logged in the evidence vault. |

### 7.2 No Autonomous AI on Regulated Decisions

**Policy:** AI capabilities in the HESEM platform are strictly **advisory**.
No AI system may autonomously make or execute a regulated decision. This
includes but is not limited to:

- **Quality disposition** (accept/reject/rework) -- always requires human
  approval via `ApprovalGroupService`
- **Lot release** -- requires electronic signature per Part 11
- **CAPA effectiveness** -- requires human assessment and approval
- **Supplier qualification** -- requires human review of audit evidence
- **Change order approval** -- requires human decision via change control workflow

AI may **recommend** actions (e.g., "predicted defect probability is 0.87,
recommend increased inspection frequency"), but the **decision** and
**execution** always require a human actor whose identity is captured in
the `electronic_signature` table.

### 7.3 AI Transparency Requirements

| Requirement | Implementation |
|---|---|
| Explainability | All AI predictions include feature importance scores stored alongside the prediction in the evidence vault |
| Auditability | Every AI inference is logged with model version, input hash, output, and confidence score |
| Bias monitoring | Model performance is tracked per product family, machine, and operator to detect demographic or process bias |
| Human override | Every AI recommendation can be overridden; overrides are captured as evidence with reason codes from `reason_code` table (migration 072) |
| Model provenance | Training data, hyperparameters, and validation metrics are versioned under PLM change control |

### 7.4 AI-Specific Risk Controls

| Risk | Control | Evidence |
|---|---|---|
| Model drift | Automated drift detection in BI pipeline; alert when prediction accuracy drops below threshold | KPI tables in migration 018 |
| Adversarial input | Input validation at service layer before model inference; anomaly detection on input feature distributions | Service layer validation in PHP |
| Over-reliance | UI clearly labels AI predictions as "AI-assisted" with confidence scores; forced human confirmation for all regulated decisions | Frontend catalog entity metadata |
| Data poisoning | Training data subject to the same evidence vault immutability as production data; data lineage tracked | Evidence vault (migration 037) |

---

## Appendix A: Migration Index by Bounded Context

| Context | Migrations |
|---|---|
| Platform Services | 001, 002, 019, 020, 021, 022, 023, 024, 070, 071 |
| Foundation Master Data | 006, 064, 072, 073, 079 |
| Engineering/Manufacturing Definition | 039, 042, 048, 063, 074 |
| Planning/ERP Operations | 007, 008, 009, 015, 032, 033, 036, 047, 051, 052, 053, 058, 060, 065, 075 |
| MES Execution | 010, 025, 026, 027, 028, 029, 030, 031, 043, 044, 045, 069, 076 |
| Quality/eQMS | 011, 034, 035, 037, 061, 078 |
| Traceability/Compliance | 012, 013, 016, 017, 040, 041, 046, 049, 050, 054, 056, 057, 059, 062, 066, 067, 068, 077 |
| Analytics | 018, 055 |

## Appendix B: Key File Reference

| Artifact | Path |
|---|---|
| OpenAPI contract | `api/openapi.yaml` |
| API router | `api/index.php` |
| Foundation Governance service | `api/services/FoundationGovernanceService.php` |
| Approval Group service | `api/services/ApprovalGroupService.php` |
| Evidence Vault service | `api/services/EvidenceVaultService.php` |
| Approval Group controller | `api/controllers/ApprovalGroupController.php` |
| Evidence controller | `api/controllers/EvidenceController.php` |
| Master Data controller | `api/controllers/MasterDataController.php` |
| Data layer | `database/DataLayer.php` |
| Foundation Governance schema | `database/migrations/072_canonical_foundation_governance.sql` |
| FG contract hardening | `database/migrations/079_foundation_governance_contract_hardening.sql` |
| Smoke tests | `tests/foundation_governance_contract_smoke.php` |
| Benchmark runner | `tools/benchmark/run_runtime_benchmark.py` |
| Benchmark SQL | `tools/benchmark/foundation_governance_contract_read_mix.sql` |
| Endpoint catalog | `qms-data/registry/endpoint-catalog.json` |
| Frontend catalog | `qms-data/registry/frontend-foundation-catalog.json` |
| Registry key onboarder | `tools/onboard_registry_keys.py` |

## Appendix C: Standards Quick Reference

| Standard | Scope | Primary Repo Touchpoints |
|---|---|---|
| ISA-95 / IEC 62264 | Enterprise-control integration | Equipment hierarchy (072), MES (025-031), Planning (047) |
| ISA-88 / IEC 61512 | Batch/recipe control | CNC programs (039), Equipment hierarchy (072) |
| MTConnect | CNC machine data | TimescaleDB (029), Real-time notify (030) |
| OPC UA | Semantic interop | Alarm governance (027), Epicor bridge (028) |
| FDA 21 CFR Part 11 | Electronic records/signatures | E-signatures (072), Evidence vault (037), RLS (023) |
| EU GMP Annex 11 | Computerised systems | Audit/risk (014), Change control (048), Evidence vault (037) |
| GAMP 5 | Software lifecycle | Smoke tests, benchmarks, registry gates |
| ISO 9001:2015 | General QMS | Quality (011), Evidence vault (037), eQMS backbone (078) |
| IATF 16949:2016 | Automotive QMS | FMEA/APQP (042), Supplier quality (035), Traceability (066) |
| AS9100D | Aerospace QMS | Shipping compliance (016), Trade compliance (068), Traceability (066) |
| NIST SP 800-53 | Security controls | RLS (023), Evidence vault (037), Access control (002) |
| NIST SP 800-162 | ABAC | RLS policies (023) |
| NIST AI RMF 1.0 | AI risk management | AI predictive quality (041), KPIs (018), Evidence vault (037) |
| OpenTelemetry | Observability | SliceObservability, structured events in services |
| RFC 9457 | Problem details | All error responses across controllers |
| OpenAPI 3.1.1 | API specification | `api/openapi.yaml` (2,872 endpoints) |

---

*End of Prompt 03 World-Class Reference Architecture.*

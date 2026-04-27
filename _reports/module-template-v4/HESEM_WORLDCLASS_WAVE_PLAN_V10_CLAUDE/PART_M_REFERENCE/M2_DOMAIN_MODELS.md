# M2 — Domain Models (V10)

```
chapter_id:     M2
version:        V10
chapter_purpose: bounded-context map per Domain-Driven Design;
                 ownership rules, cross-domain reference, replication
                 strategy, anti-corruption layer policy, event schema,
                 per-pack domain overlays, DDD isolation discipline
owner_role:     Domain Leads (one per domain) + CTO (architecture)
sources:        Domain-Driven Design (Evans 2003; Vernon 2013 — IDDD);
                Vaughn Vernon Implementing DDD bounded context catalog;
                ISA-95 functional hierarchy (ISA-95.00.01..06);
                Microservices patterns (Richardson 2018);
                Accelerate (Forsgren, Humble, Kim) — team topology
                alignment to bounded context ownership
```

HESEM's domain architecture is a modular monolith structured as
14 bounded contexts. The monolith shares a single deployable unit
and a shared PostgreSQL database, but each domain has its own schema
namespace, owns its own tables, and does not write into another domain's
schema. Cross-domain interaction uses explicit API calls or workflow
events — never shared mutable state.

This architecture is chosen deliberately over microservices:
- A regulated manufacturer's data must be ACID-consistent within
  a transaction (batch release touching lot, quality, and trace must
  be atomic).
- Regulated audit chain integrity requires a single OTG anchor service
  rather than distributed consensus.
- A small team (4-40 FTE) cannot bear the operational complexity of
  20+ independently deployed services.
- The bounded context boundaries provide the same team autonomy and
  cognitive-load benefits as microservices without the distributed
  systems overhead.

If a future scale need requires extracting a service, the existing
bounded context boundaries are the correct extraction units.

---

## 1. Domain map (14 bounded contexts per Part C)

```
ID   DOMAIN                   PART_C   SCHEMA NS     TEAM
1    Commercial                C1       commercial    Commercial Team
2    Engineering               C2       engineering   Engineering Team
3    Planning                  C3       planning      Planning Team
4    Procurement               C4       procurement   Procurement Team
5    Inventory                 C5       inventory     Inventory+Trace Team
6    Shopfloor / MES           C6       mes           Shopfloor Team
7    Quality / eQMS            C7       quality       Quality Team
8    Traceability              C8       trace         Inventory+Trace Team
9    Maintenance               C9       maintenance   Maintenance Team
10   Workforce                 C10      workforce     Workforce Team
11   Finance                   C11      finance       Finance Team
12   Integration               C12      integration   Integration Team
13   Analytics / AI            C13      analytics     Analytics+AI Team
14   Core Platform             C14      core          Platform Team
```

Each domain's schema namespace is enforced by PostgreSQL schema-level
access controls: Domain 1 (commercial) owns the `commercial.*` schema;
no other application service has write credentials to `commercial.*`
except the Commercial domain service.

---

## 2. Bounded context rules

### 2.1 Single ownership

Every authoritative root belongs to exactly one domain. Other domains
reference it by ID but never own or write its state. If two domains
appear to own the same entity, this is a context boundary error that
must be resolved by determining which domain contains the authoritative
decision for that entity's state.

```
EXAMPLE RESOLUTION:
  "Item" appears in Engineering (definition), Inventory (stock), and
  Quality (inspection spec). Resolution:
  - Engineering owns Item master (definition, BOM, Routing, Spec)
  - Inventory owns Lot (quantity, location, stock movement)
  - Quality owns Inspection Plan (spec application to an incoming lot)
  These are different roots in different contexts, coordinated via
  the Item ID as a shared identifier (not shared state).
```

### 2.2 No shared mutable state

Domains do not write into each other's schema tables. Cross-domain
state change uses one of three patterns:

```
PATTERN 1: Explicit API call
  Domain A calls Domain B's API endpoint to request a state change.
  Domain B validates, processes, emits its own audit event.
  Used when: the requesting domain needs an immediate synchronous result.
  Example: Quality calls Inventory to place a Hold on a lot.

PATTERN 2: Workflow event (async choreography)
  Domain A emits a workflow event (via RabbitMQ).
  Domain B subscribes and reacts in its own transaction.
  Used when: eventual consistency is acceptable; Domain A does not need
  Domain B's result before proceeding.
  Example: Inventory emits LotMoved event; Quality subscribes and
  checks if the lot's receiving inspection is due.

PATTERN 3: CDC read model replication
  Domain A's Authority Ledger changes are captured via CDC.
  Domain B maintains a read-only mirror (read model) of relevant data.
  Used when: Domain B needs to query Domain A's data frequently.
  The mirror is never authoritative; writes always go through Domain A.
  Example: Analytics domain maintains read model of all lot movements
  from Inventory for OEE and quality dashboards.
```

### 2.3 Ubiquitous language per domain

Each domain has its own vocabulary, codified in M1 with domain attribution.
The same word may mean different things in different domains; the boundary
is where translation is required.

```
EXAMPLE: "Lot"
  Inventory domain: a quantity of material in a bin location
  Quality domain: the batch whose inspection record is being evaluated
  Pharma pack overlay: the EBR production batch that the QP releases
  These are the same entity referred to from different domains;
  the translation at the boundary is explicit (cross-domain ACL).

EXAMPLE: "Document"
  Engineering domain: a technical drawing or specification
  Quality domain: a controlled quality document (SOP, form, work
                  instruction) with its own lifecycle (SM-7)
  These are different entities in different contexts.
  Engineering drawings are managed in ECO workflow;
  Quality SOPs are managed in CDOC/SM-7 workflow.
```

### 2.4 Anti-corruption layer (ACL) policy

An anti-corruption layer is a translation component at the boundary
between two contexts. It converts the model of one context into the
model of another, preventing the model of a consuming context from
being distorted by the internal model of the supplying context.

```
ACL IMPLEMENTATION IN HESEM:

  APPROACH:      Service-layer translation object (not database join)
  LOCATION:      In the consuming domain's service layer
  DIRECTION:     Consuming domain ACL translates incoming data to
                 its own model; does not expose its model to the
                 supplier
  TESTING:       ACL is unit-tested independently; changes to the
                 supplying domain's model trigger ACL contract tests

EXAMPLE ACL: Quality consuming from Inventory
  Inventory's Lot has: lot_id, item_id, bin_id, qty_on_hand, status
  Quality's view of Lot needs: lot_number, item_code, lot_status,
                                 incoming_inspection_due
  Quality's ACL maps these at the boundary; if Inventory's schema
  changes, only the ACL needs to change — Quality's internal model
  is unaffected.

FORBIDDEN ACL PATTERNS:
  - Cross-domain JOIN in SQL (couples schemas; prevents schema evolution)
  - Shared model class used by two domains (couples domain models)
  - Domain A's API returning Domain B's internal IDs without translation
```

### 2.5 Regulated domain boundaries

The Quality domain (C7) is the designated owner of regulated decisions
across all packs. Other domains contribute evidence and data but do not
own the regulated decision outcome.

```
DECISION AUTHORITY:
  Lot release (BD-1):           Quality domain (batch release root)
  Nonconformance (BD-2):        Quality domain (NC/CAPA root)
  CAPA closure (BD-3):          Quality domain
  Document release (BD-4):      Quality domain
  Engineering change (BD-5):    Engineering domain + Quality sign-off

  AI features:                  Advisory outputs from Analytics domain
                                displayed in the consuming domain's UI;
                                the human decision remains in the
                                authoritative domain (not Analytics)

This means an AI advisory for "probable NC disposition" is generated
by the Analytics domain but the disposition decision itself is stored
as an NC root mutation in the Quality domain, with the human's choice
(not the AI's suggestion) as the authoritative outcome.
```

### 2.6 Event schema and event ownership

Each domain owns the schema of the events it emits. Event schemas
are versioned. Consumers pin to a version; breaking changes require
a new event type.

```
EVENT NAMING CONVENTION:
  {domain}.{root}.{action}
  Examples:
    quality.lot.released              (Batch Release approved)
    inventory.lot.received            (Procurement Receipt complete)
    quality.nonconformance.opened     (NC created)
    quality.nonconformance.closed     (NC closed after CAPA)
    mes.work_order.completed          (WO completed on shopfloor)
    workforce.person.qualified        (Training qualification granted)
    engineering.eco.approved          (ECO approved)

EVENT PAYLOAD STANDARD:
  {
    event_id:       UUID (immutable; for idempotency)
    event_type:     string (domain.root.action)
    event_version:  integer (schema version)
    occurred_at:    ISO 8601 timestamp (UTC)
    tenant_id:      UUID (multi-tenant isolation)
    root_id:        UUID (root entity this event is about)
    actor_id:       UUID (person or system that caused the event)
    payload:        object (event-type-specific; versioned schema)
    audit_chain_id: UUID (link to OTG audit anchor for this mutation)
  }

EVENT RETENTION:
  All events retained per H5 class C-8 (integration events): 7 years
  Regulated events (quality.* ; workforce.* qualification):
    per H5 class R-5 (regulated audit trail): 15 years
```

---

## 3. Cross-domain reference data (shared entities)

Certain entities are authored by one domain but referenced by all.
The authoring domain is authoritative; consuming domains hold a
read-only CDC-replicated mirror.

```
ENTITY            AUTHORING DOMAIN   CONSUMERS (and what they read)
Item              Engineering (C2)   Procurement (purchasing spec);
                                     Inventory (stock item); Shopfloor
                                     (WO item, operation spec); Quality
                                     (inspection plan, release spec);
                                     Trace (genealogy item); Finance
                                     (cost roll item)

Lot               Inventory (C5)     Shopfloor (component consumption);
                                     Quality (inspection, release);
                                     Trace (genealogy chain);
                                     Maintenance (calibration lot);
                                     Finance (cost roll lot)

Serial            Inventory (C5)     Trace (UDI, DSCSA); Quality
  + Trace (C8)                       (individual device inspection);
  (co-owned for                      Shopfloor (device manufacture step)
   different attributes)

Person            Workforce (C10)    All domains (e-signature identity;
                                     training qualification status;
                                     operator permissions)

Role              Core (C14)         All domains (authorization checks;
                                     permission-gated UI features;
                                     audit trail actor classification)

Tenant            Core (C14)         All domains (row-level isolation;
                                     feature flag resolution; SLO tier)

Cost Center       Finance (C11)      Procurement (PO cost center);
                                     Shopfloor (WO cost absorption);
                                     Maintenance (MWO cost)

Asset             Maintenance (C9)   Shopfloor (workcell asset;
                                     calibration due check); Quality
                                     (calibrated equipment on inspection);
                                     Trace (asset in genealogy)

Spec              Engineering (C2)   Quality (inspection plan against
                                     spec); Procurement (incoming
                                     material spec); Shopfloor (WO
                                     operation against spec)

Document          Quality (C7)       All domains (effective SOP
  (Controlled SOP)                   displayed at point-of-use; WO
                                     operation linked to SOP)

Customer          Commercial (C1)    Quality (customer complaint;
                                     recall notification); Trace
                                     (where did this lot ship to)

Supplier          Procurement (C4)   Quality (SCAR; supplier quality
                                     rating); Inventory (GRN source);
                                     Trace (supply chain genealogy)
```

### 3.1 Replication mechanism

```
MECHANISM:      Change Data Capture (CDC) via PostgreSQL logical
                replication slots → message bus → consumer read models
CONSISTENCY:    Eventually consistent; lag typically < 1 second
                (acceptable for read models)
FRESHNESS:      Regulated decisions always read from primary
                (e.g., batch release must read the lot's current state
                from Inventory primary, not the Quality read model)
GOVERNANCE:     CDC subscriptions are declared in Integration domain
                (C12) connector registry; no undeclared subscriptions
FAILURE:        CDC replay from WAL; consumer read model rebuild
                from Authority Ledger on restart
```

---

## 4. Domain-to-state-machine map (per M4)

```
DOMAIN               STATE MACHINES OWNED
Commercial (C1)      SM-1 (Sales Order / Customer PO lifecycle)
Engineering (C2)     SM-7 (Document / ECO lifecycle)
                     SM-DHF (Design History File lifecycle; MD pack)
Planning (C3)        SM-APQP (APQP project lifecycle; Auto pack)
                     SM-AS9145 (Aero APQP; Aero pack)
Procurement (C4)     SM-2 (Purchase Order lifecycle)
                     SM-SUP (Supplier Qualification lifecycle)
                     SM-PPAP (PPAP submission lifecycle; Auto pack)
Inventory (C5)       SM-HOLD (Lot Hold lifecycle)
Shopfloor / MES (C6) SM-3 (Work Order lifecycle)
                     SM-EBR (Electronic Batch Record lifecycle; Pharma)
                     SM-CCP (CCP monitoring lifecycle; Food pack)
Quality / eQMS (C7)  SM-4 (Inspection lifecycle)
                     SM-5 (Disposition lifecycle)
                     SM-6 (NC/CAPA lifecycle)
                     SM-10 (Batch Release lifecycle)
                     SM-11 (Recall lifecycle)
                     SM-12 (Audit lifecycle)
                     SM-13 (Customer Complaint lifecycle)
                     SM-14 (Validation Pack lifecycle)
                     SM-DEV (Deviation lifecycle; Pharma)
                     SM-STAB (Stability Study lifecycle; Pharma)
                     SM-VIG (Vigilance Report lifecycle; MD)
                     SM-PSUR (PSUR lifecycle; MD)
                     SM-ICSR (ICSR lifecycle; Pharma)
                     SM-FSCA (Field Safety Corrective Action; MD)
                     SM-RM (Risk Management File lifecycle; MD)
                     SM-RR (Risk Record lifecycle)
                     SM-APR (Annual Product Review lifecycle; Pharma)
                     SM-CMPLT (Customer Complaint lifecycle)
Maintenance (C9)     SM-9 (Maintenance Work Order lifecycle)
Workforce (C10)      SM-8 (Training Qualification lifecycle)
Analytics / AI (C13) SM-AI (AI Model lifecycle)
```

---

## 5. Domain-to-API-family map (per Part E)

```
DOMAIN               PRIMARY API FAMILIES
Commercial           E3 (list); E4 (record detail); E5 (mutation)
Engineering          E3; E4; E5; E7 (e-signature on ECO/Doc release)
Planning             E3; E4; E5
Procurement          E3; E4; E5; E7 (e-signature on supplier qual);
                     E15 (EDI for auto/aero procurement)
Inventory            E4; E5; E11 (bulk lot operations)
Shopfloor / MES      E3; E4; E5; E15 (edge gateway + SCADA)
                     E7 (e-signature on EBR steps; Pharma)
Quality / eQMS       E3; E4; E5; E7 (all BD-1..BD-15 require e-sig);
                     E8 (evidence pack / audit pack API);
                     E11 (bulk inspection; batch release)
Traceability         E4; E5; E11 (bulk genealogy; DSCSA queries)
Maintenance          E3; E4; E5
Workforce            E1 (auth/identity); E3; E4; E5
Finance              E4; E5
Integration          E15 (connector orchestration; EDI; webhooks)
Analytics / AI       E5; E9 (advisory request/response API)
Core Platform        E1 (auth); E2 (admin); E6 (audit query);
                     E14 (tenant admin)
```

---

## 6. Domain-to-frontend-pattern map (per Part F)

```
DOMAIN               PRIMARY PATTERNS        NOTES
Commercial           DL + ML + WS + AR +     Quote/Order Wizard; AR for
                     AC + Wizard             customer contract; DL for
                                             order-to-cash metrics
Engineering          DL + ML + WS + AR +     Item AR; BOM WS; ECO AR;
                     Wizard                  Drawing AR; Spec AR
Planning             DL + ML + WS + AR       MPS WS; APQP AR (Auto);
                                             MRP action list ML
Procurement          DL + ML + WS + AR + AC  PO AR; Supplier AR; PPAP AR
Inventory            DL + ML + WS            Lot WS; Stock Move WS;
                                             Cycle Count AC
Shopfloor / MES      DL + ML + WS + AR + AC  DISP WS (Wave 1 root);
                                             WO AR; EBR AR (Pharma);
                                             SPC AC; Real-time OEE DL
Quality / eQMS       DL + ML + WS + AR +     NQCASE AR (Wave 1);
                     AC + Wizard             CAPA AR; BREL AR; IREV AR;
                                             INSP AR; CDOC AR (all
                                             Wave 1 roots); PSUR Wizard;
                                             Risk File Wizard
Traceability         ML + WS                 Genealogy WS; Recall ML;
                                             DSCSA query ML
Maintenance          DL + ML + WS + AR       MWO AR (Wave 1); PM WS;
                                             Asset AR; Calibration AR
Workforce            DL + ML + WS + AR       TRAIN WS (Wave 1); Person
                                             AR; Training Record AR
Finance              DL + ML + WS            Cost Roll DL; GL WS
Integration          ML + WS                 Connector ML; Subscription
                                             WS; Event log WS
Analytics / AI       DL + WS                 KPI DL; AI advisory panel
                                             embedded in all AR patterns
Core Platform        DL + ML + AR            Tenant AR; Role ML; Identity
                                             AR; Audit log WS
```

---

## 7. Per-pack domain overlays

Each vertical pack adds domain extensions (new roots, new states,
new regulatory content) to the base domain model. Overlays are additive;
they do not modify base domain ownership or state machines.

### 7.1 Pharma (J1) overlay

```
DOMAIN EXTENDED    OVERLAY CONTENT
Quality (C7)       EBR lifecycle (SM-EBR); APR (SM-APR); Stability
                   Study (SM-STAB); Deviation (SM-DEV); QP Declaration
                   (BD-9); ICSR (SM-ICSR); Cleaning Validation root;
                   EM Run root; Media Fill root
Shopfloor (C6)     EBR-linked WO operations; aseptic line SOP execution;
                   EM sampling trigger; Cleaning Validation protocol
Inventory (C5)     DSCSA Transaction and Serialized Unit; EU FMD
                   Decommissioning Event
Traceability (C8)  DSCSA chain; EU FMD pack-level tracing
Workforce (C10)    Aseptic Personnel Qualification record
Integration (C12)  DSCSA trading partner; EU FMD EMVS connection
```

### 7.2 Auto (J2) overlay

```
DOMAIN EXTENDED    OVERLAY CONTENT
Procurement (C4)   PPAP Submission (SM-PPAP); PSW; ISIR; CSR registry
Quality (C7)       8D Investigation; LPA Plan and Run; IATF-specific
                   NC categorization; AIAG APQP milestone review
Engineering (C2)   DFMEA; PFMEA; PFD; HARA/ASIL safety analysis
Planning (C3)      APQP Project (SM-APQP); production trial run; annual
                   layout inspection; AS9145 for Aero overlap
```

### 7.3 Aerospace (J3) overlay

```
DOMAIN EXTENDED    OVERLAY CONTENT
Procurement (C4)   NADCAP cert tracking; counterfeit risk assessment;
                   QPL/QML registry; DFARs clause compliance
Quality (C7)       FAI (AS9102); Counterfeit Investigation; GIDEP
                   submission (BD-22); AD/SB compliance tracking
Workforce (C10)    ITAR Person-of-Record (BD-24); EAR person tracking
Maintenance (C9)   Service Bulletin Compliance; Airworthiness Directive
                   compliance; Production Approval Holder record
Engineering (C2)   DO-178C SCI; DO-254 HCI; ARP 4754A system dev
Integration (C12)  GIDEP interface; CMMC compliance artifacts
```

### 7.4 Medical Device (J4) overlay

```
DOMAIN EXTENDED    OVERLAY CONTENT
Engineering (C2)   DHF (SM-DHF); DMR; SOUP/OTSS register; SBOM (for
                   cybersecurity per IEC 62304); PCCP; IEC 62304 SCI
Quality (C7)       Vigilance Report (SM-VIG); PSUR (SM-PSUR); PMS Plan;
                   Clinical Evaluation Report; FSCA (SM-FSCA); Risk
                   Management File (SM-RM); ISO 14971 risk record;
                   PRRC declaration (BD-15); NB Cert tracking
Integration (C12)  EUDAMED registration; GUDID submission; NB e-portal
Traceability (C8)  UDI management; UDI/GUDID linkage
```

### 7.5 Food (J5) overlay

```
DOMAIN EXTENDED    OVERLAY CONTENT
Quality (C7)       HACCP Plan; CCP Monitoring (SM-CCP); HARPC controls;
                   EMP records; Allergen Control Plan; Sanitation Record;
                   Food Defense Plan; Reportable Food Registry submission
Procurement (C4)   FSVP Verification Activity; food supplier approval
Shopfloor (C6)     CCP monitoring procedure; Sanitation execution log;
                   Process Authority Letter (LACF); allergen changeover
Inventory (C5)     FSMA §204 KDE/CTE; recall lot traceability
Traceability (C8)  FSMA §204 supply chain traceability chain
Workforce (C10)    PCQI record; food handler hygiene qualification
```

---

## 8. Anti-corruption layer — implementation catalog

The following ACLs are specified and tested in HESEM's codebase:

```
ACL NAME                    FROM DOMAIN    TO DOMAIN    TRANSLATES
ItemReferenceACL             Engineering    All other    Item {id, code,
                                            domains      name, unit, status}
                                                        → consuming domain's
                                                        item reference format

LotReferenceACL              Inventory      Quality,     Lot {id, number,
                                            Trace,       item_id, status,
                                            Shopfloor    expiry} → consuming
                                                        format

PersonReferenceACL           Workforce      All domains  Person {id, name,
                                                        role_ids, qualified_
                                                        tasks} → consuming
                                                        format (e-sig identity)

TenantContextACL             Core           All domains  Tenant {id, tier,
                                                        regulatory_profile,
                                                        feature_flags,
                                                        pack_ids} injected
                                                        into request context

SupplierReferenceACL         Procurement    Quality,     Supplier {id, name,
                                            Inventory    status, risk_rating}

DocumentEffectivityACL       Quality        All domains  Document {id, code,
                                                        title, revision,
                                                        effective_from} for
                                                        point-of-use display

AdvisoryResultACL            Analytics      All domains  AI advisory {feature,
                                                        recommendation,
                                                        confidence, citation,
                                                        advisory_id} for
                                                        in-domain display
```

---

## 9. Domain isolation rules

These rules are enforced via PostgreSQL role-based access control,
code review gates, and automated tests. Violations fail pre-release
quality gates.

```
RULE D-1: Schema write isolation
  Each domain service has a dedicated PostgreSQL role with WRITE
  permission only to its own schema. Attempting to write to another
  domain's schema at the database level returns a permission denied error.
  Enforcement: PostgreSQL role grants; tested in integration test suite.

RULE D-2: No cross-schema SQL JOINs in application code
  Application queries may only JOIN within a single domain's schema.
  Cross-domain queries use API calls or read models.
  Enforcement: SQL lint rule in CI/CD; grep for cross-schema join patterns.

RULE D-3: Event schema ownership
  A domain may only produce events with event_type prefixes it owns.
  A domain may consume events from any domain.
  Enforcement: Event schema registry in Integration domain (C12);
  schema validation on event publication.

RULE D-4: Read model staleness tolerance declaration
  Any consuming domain that uses a CDC read model must declare in its
  service contract the maximum staleness it can tolerate.
  Regulated decisions that require fresh data must use primary-read.
  Enforcement: service contract file per domain; code review.

RULE D-5: ACL completeness
  Every cross-domain data reference in application code must pass through
  a declared ACL. No raw cross-domain model reference in service code.
  Enforcement: architectural fitness function test (per phase 3+).
```

---

## 10. Domain schema governance and migration strategy

### 10.1 Schema migration ownership

Each domain owns its own database migrations. Migration files are placed
in `mom/database/migrations/` and prefixed with a sequential number.
The migration number space is managed globally to prevent conflicts, but
the content of a migration is owned exclusively by the domain team that
authored it.

```
MIGRATION RULES:
  R-MIG-1: A migration may only create, alter, or drop tables/views
            in the domain's own schema namespace.

  R-MIG-2: A migration may not add a foreign key constraint that
            references another domain's schema. Cross-domain references
            are by ID only (soft reference), not enforced by FK.

  R-MIG-3: Migrations are applied in order; they are non-destructive
            by default (no DROP TABLE without deprecation cycle per
            R-MIG-4).

  R-MIG-4: Deprecation cycle for schema removal:
            Phase 1: Column/table marked deprecated (comment in migration).
            Phase 2: Application code stops writing to deprecated column.
            Phase 3: Application code stops reading deprecated column.
            Phase 4: Migration drops the deprecated column/table.
            Each phase requires a separate migration and a wave cycle.

  R-MIG-5: Regulated data tables are never dropped without explicit
            sign-off from Compliance Lead + CTO (H5 retention classes
            must be honored before any drop).
```

### 10.2 Database health metrics per domain

```
METRIC               MEASUREMENT              TARGET
Schema drift          Migration applied vs     Zero drift (all migrations
                      codebase migrations       applied in all environments)

Table bloat           Dead tuple ratio per      < 10% dead tuples per table
                      domain's tables           (autovacuum tuning per table)

Index coverage        % of query patterns       > 90% of frequent queries
                      with index support        use index scan (EXPLAIN)

Cross-domain join     Count of SQL queries      Zero (fail pre-release gate)
  violations          with cross-schema JOINs

FK violation          Count of soft-ref IDs     Zero orphan IDs
  (soft ref orphans)  with no matching parent   (checked via weekly job)

CDC lag               Time for CDC event to     < 1 second P95
                      reach consumer            (monitored per I3 SLO)
```

---

## 11. Domain-boundary integration test strategy

Cross-domain interactions must be tested at the boundary, not mocked.
Mocking a cross-domain dependency creates the same isolation failure
risk as shared schema — the mock diverges from reality.

```
INTEGRATION TEST APPROACH:

LEVEL 1: In-process boundary tests
  Test: Domain A's service layer calls Domain B's API in-process
  using Domain B's real service implementation with a real database.
  Database: Per-test database reset; real migrations applied.
  Coverage: Every declared ACL translation is tested with real data.

LEVEL 2: Event schema contract tests
  Test: Domain A produces an event; Domain B's event handler
  deserializes and processes it using the declared event schema.
  Tool: Pact (consumer-driven contract testing) or equivalent.
  Coverage: All cross-domain event schemas.

LEVEL 3: Cross-domain saga tests
  Test: Full saga flow across 2+ domains (e.g., Batch Release saga:
  Quality → Inventory → Trace → Analytics).
  Database: Shared test database with all domain schemas.
  Coverage: All multi-domain saga workflows (per B7).

FORBIDDEN TEST PATTERNS:
  - Mocking a domain API at the HTTP boundary in integration tests
    (use real service in-process or real HTTP against test environment)
  - Bypassing ACL in tests (test must use declared translation path)
  - Asserting on another domain's database state from the test of
    Domain A (test only what Domain A's own reads return)
```

---

## 12. Domain readiness gates

Before a domain's first wave delivery milestone is accepted, the
following domain-specific readiness checks must pass:

```
GATE                         CHECK
Schema completeness          All tables for domain's Wave-N roots
                             exist in migration (php tools/ai-index or
                             equivalent confirms table presence)

API coverage                 All routes declared in .ai/route-map.json
                             for domain's roots have implemented
                             controllers (route map complete)

ACL coverage                 All cross-domain references in domain's
                             service code pass through declared ACLs
                             (architectural fitness function check)

State machine coverage        All SM-N state machines for domain's roots
                             are implemented and tested (unit test per
                             transition; SM test coverage ≥ 90%)

Event schema registered      All domain events declared in Integration
                             domain event registry with version and schema

Fixture coverage             All domain roots have fixture data in
                             tests/fixtures/ (for HMV4 pre-production
                             mode; per ADR-0004)

BD boundary coverage         All BD-N boundaries touching domain roots
                             have triple-defense tests (per L1 §3):
                             UI (advisory-only), API (reject auto-exec),
                             Audit (event emitted)

Audit coverage               All domain root mutations emit audit events
                             to OTG Authority Ledger; verified by
                             Playwright E2E test asserting audit record
                             created after each mutation
```

---

## 13. Domain interaction pattern examples

The following examples illustrate the three cross-domain interaction
patterns (§2.2) in concrete HESEM workflows:

### 13.1 Pattern 1 — Synchronous API call: Lot Hold

```
TRIGGER:   Quality team inspector finds a critical NC during incoming
           inspection; must immediately prevent the lot from being
           consumed in production.

FLOW:
  1. Quality domain: NC root created (SM-6 → OPENED).
  2. Quality domain service: calls Inventory domain API
     POST /api/v1/inventory/lots/{lot_id}/holds
     with payload {reason: "NC-2345", placed_by: person_id}
  3. Inventory domain: validates caller has QUALITY_HOLD permission;
     transitions lot status → ON_HOLD; emits audit event; returns 200.
  4. Quality domain: records hold_id on NC root (ACL-translated reference).
  5. Shopfloor domain: next time WO tries to consume lot_id, Inventory
     API returns 409 (lot on hold); WO operation blocked; operator alerted.

WHY SYNCHRONOUS: Quality needs confirmation that the hold is placed
before completing the NC creation workflow (audit trail completeness).
```

### 13.2 Pattern 2 — Async workflow event: Training-gated WO dispatch

```
TRIGGER:   Workforce domain qualifies an operator for a specialized
           operation (aseptic gowning for Pharma). Other domains
           need to know this qualification status.

FLOW:
  1. Workforce domain: Training qualification approved (SM-8 → QUALIFIED).
  2. Workforce domain emits: workforce.person.qualified
     {person_id, task_codes: ["ASEPTIC_GOWN"], effective_from: timestamp}
  3. Shopfloor domain: subscribes; updates person's cached qualification
     record in its read model (Shopfloor does not call Workforce per-WO).
  4. When Shopfloor dispatches a WO operation requiring ASEPTIC_GOWN:
     the eligibility check reads the Shopfloor read model (fast path).
  5. If Shopfloor read model is stale (CDC lag): operation check falls
     back to synchronous call to Workforce API for fresh qualification
     status (regulated operation requires fresh data per Rule D-4).

WHY ASYNC: Qualification status is needed at dispatch time (potentially
thousands of WOs per day); async update to a read model avoids per-WO
synchronous call to Workforce.
```

### 13.3 Pattern 3 — CDC read model: Analytics cross-domain queries

```
TRIGGER:   Analytics team needs to compute OEE (Overall Equipment
           Effectiveness) per workcell, crossing Shopfloor (yield),
           Inventory (material availability), and Maintenance (downtime).

FLOW:
  1. Shopfloor domain CDC emits: mes.work_order.completed, mes.yield.recorded
  2. Inventory domain CDC emits: inventory.lot.consumed
  3. Maintenance domain CDC emits: maintenance.asset.downtime_started,
     maintenance.asset.downtime_ended
  4. Analytics domain consumes all three; maintains analytics.oee_snapshot
     read model updated from events.
  5. OEE dashboard reads analytics.oee_snapshot directly — no synchronous
     calls to Shopfloor, Inventory, or Maintenance at query time.
  6. Data freshness: OEE read model is approximately 1-2 seconds behind
     (acceptable for dashboard; not for regulated lot release decisions,
     which always use primary reads from Quality domain).

WHY CDC: Analytics requires cross-domain aggregation at query time;
CDC materializes the pre-joined result without cross-schema SQL JOINs.
```

---

## 14. Domain dependency graph (fan-out by consumer count)

The following ranks domains by how many other domains consume data from
them, indicating which domains are most critical to keep backward-compatible
and which have the highest ACL test coverage requirement:

```
DOMAIN               CONSUMED BY    CONSUMER DOMAINS
Engineering (C2)     7 domains      Inventory, Shopfloor, Quality,
  (Item, Spec)                      Trace, Procurement, Finance, Analytics
Workforce (C10)      6 domains      Shopfloor, Quality, Commercial,
  (Person)                          Maintenance, Trace, Analytics
Core Platform (C14)  All 13 domains All (Tenant, Role for auth)
  (Tenant, Role)
Inventory (C5)       5 domains      Shopfloor, Quality, Trace, Finance,
  (Lot)                             Analytics
Quality (C7)         4 domains      Commercial (complaint), Trace (recall
  (Document, NC)                    trigger), Analytics, Integration
Procurement (C4)     4 domains      Inventory (GRN), Quality (SCAR),
  (Supplier)                        Trace (genealogy), Finance
Commercial (C1)      3 domains      Quality (complaint), Trace (recall
  (Customer)                        destination), Analytics
Maintenance (C9)     3 domains      Shopfloor (asset state), Quality
  (Asset)                           (calibration), Analytics
Finance (C11)        2 domains      Shopfloor (cost absorption),
  (Cost Center)                     Procurement (PO cost)
Planning (C3)        1 domain       Shopfloor (WO generation)
Integration (C12)    Provides to    External systems (not HESEM domains)
Analytics (C13)      Provides to    External dashboards; no domain consumer
Shopfloor (C6)       Provides to    Analytics (CDC read model only)
Traceability (C8)    Provides to    Analytics (CDC read model only)
```

This ranking informs: highest-priority ACL test coverage for Engineering,
Workforce, and Core Platform (widest fan-out). These domains must treat
their schemas as public APIs with versioning discipline equivalent to
external-facing APIs.

---

## 15. RACI shorthand

```
DECISION                    RESPONSIBLE         CONSULTED
Schema change in domain X    Domain X lead       CTO (if schema is
                                                 cross-domain ACL target)
New root added to domain X   Domain X lead       CTO; Compliance Lead
                                                 (if regulated root)
New state machine            Domain X lead +     CTO; Quality Lead
                             Plan Editor         (if BD boundary touched)
Cross-domain event           Both domain leads   Integration team;
  schema change              + Integration team  Plan Editor
New pack overlay             Pack lead +         Domain lead; CTO;
                             Domain lead         Compliance Lead
ACL change                   Consuming domain    Supplying domain lead
                             lead                + CTO
Bounded context split        CTO                 All affected domain leads
  or merge                                       + CEO (team topology)
```

---

## 16. Decision phrase

```
M2_DOMAIN_MODELS_V10_LOCKED
NEXT: M3_ROOT_CATALOG.md
```

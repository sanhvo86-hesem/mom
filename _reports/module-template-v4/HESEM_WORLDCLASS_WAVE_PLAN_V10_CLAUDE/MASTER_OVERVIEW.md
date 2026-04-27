# HESEM V9 — MASTER OVERVIEW (the bird's-eye view)

This file is the single page everyone reads first. It tells you what HESEM is
from 30,000 feet, what the platform contains, how it is structured, in what
sequence it gets built, and where in this V9 package each topic lives.

If you are an AI agent receiving a task, you read this file before you open any
other file. If you are an engineer about to be assigned work, you read this
file before you accept the assignment. If you are a stakeholder reviewing the
plan, you read this file before you challenge any chapter.

---

## 1. What HESEM is, in one paragraph

HESEM is a single integrated **Operations Operating Platform** that combines
ERP demand and supply truth, MOM (Manufacturing Operations Management)
orchestration, MES (Manufacturing Execution System) execution evidence, eQMS
(electronic Quality Management System) regulatory control, Digital Thread
genealogy, and an AI advisory layer — all governed by an explicit Authority
model, Workflow Command discipline, Evidence chain, contract-first APIs and
data products, OT-safe integration, and Site Reliability discipline. HESEM is
intended to serve regulated manufacturers (pharmaceutical, medical device,
automotive, aerospace, food) and non-regulated manufacturers seeking to
consolidate fragmented stacks. HESEM is currently in development as a
prototype / pre-production readiness; it is not a validated production system.

---

## 2. Why HESEM exists

The world's manufacturing-software stack is fragmented:

- ERP (SAP S/4, Oracle EBS, Microsoft Dynamics) does demand and finance
- MOM and MES (Siemens Opcenter, Rockwell Plex, Dassault DELMIA) do execution
- eQMS (MasterControl, ETQ, Veeva Vault QMS) does regulated quality
- PLM (PTC Windchill, Siemens Teamcenter) does engineering data
- Maintenance / EAM (IBM Maximo, IFS) does equipment
- Analytics (Snowflake, Databricks, Palantir) does insight
- AI is bolted on top, not integrated

A typical mid-market manufacturer pays for 5 to 10 vendors and spends
substantial calendar time on integration, validation, and reconciliation.
HESEM proposes one integrated platform with one authority model, one truth
graph, one workflow discipline, one validation framework, and one AI
governance — so the customer pays for one platform and gains one set of
evidence.

This is not a unique idea. SAP and Oracle have made the same claim for forty
years. HESEM differs in three ways:

1. **Open standards first**: ISA-95, ISA-88, OPC UA, OpenAPI, RFC 9457,
   OpenTelemetry, NIST AI RMF, IEC 62443 — not proprietary protocols.
2. **Authority discipline**: every mutation flows through an Authority
   Ledger and Command Bus. There are no hidden state changes anywhere in
   the system.
3. **AI as advisory only**: AI never autonomously commits a regulated
   decision. The boundary between AI and human authority is explicit and
   enforced.

These three differences are the core of HESEM. Everything else in V9 is in
service of these three.

---

## 3. The 14 domains HESEM covers

HESEM's scope is divided into 14 business domains. Each domain is described
in detail in PART_C, and each capability inside each domain has its own
chapter that lists workflows, APIs, frontend surfaces, and acceptance
evidence.

| # | Domain | What it does | PART_C chapter |
|---|---|---|---|
| 01 | Commercial & Customer | quotes, orders, shipping, invoicing, complaints | C1 |
| 02 | Product & Engineering | item master, BOM, routing, change orders, FMEA | C2 |
| 03 | Planning & Production | MPS, MRP, capacity, scheduling, dispatch | C3 |
| 04 | Procurement & Supplier Quality | PO, supplier master, receiving, IQC, SCAR, PPAP | C4 |
| 05 | Inventory & Logistics | inventory transactions, lot, serial, WIP, warehouse | C5 |
| 06 | Shopfloor / MES Execution | job order, work order, operation execution, OEE | C6 |
| 07 | Quality Improvement (eQMS) | inspection, NC, CAPA, controlled documents, audit | C7 |
| 08 | Traceability & Genealogy | lot genealogy, batch release, recall, release packet | C8 |
| 09 | Maintenance & EHS | equipment, maintenance work order, calibration, EHS | C9 |
| 10 | Workforce & Training | user, role, training course, training record, competency | C10 |
| 11 | Finance | standard cost, actual cost, WIP cost, variance, GL | C11 |
| 12 | Integration | API gateway, event bus, idempotency, CDC, partner connectors | C12 |
| 13 | Analytics & AI | OEE analytics, quality analytics, predictive maintenance, AI advisory | C13 |
| 14 | Core Platform | identity, workflow, evidence, audit, notify, graphics authority, SRE | C14 |

These 14 domains contain approximately 105 capabilities. Each capability is
the smallest planning unit that can be delivered as one slice or one feature
in a wave. Each capability has its own description in PART_C plus expanded
treatments in PART_D (workflows), PART_E (APIs), and PART_F (frontend).

---

## 4. The 8 architectural layers

HESEM's architecture is described as 8 layers (Part B). Every component lives
in exactly one layer. Each layer has a clear responsibility and clear
boundaries. The layers are described here only as headlines; full
descriptions live in PART_B.

```
L1  Identity, Authority, Authorization
L2  Governance, Compliance, Validation
L3  Process, Workflow, State Machines
L4  Domain Model & Authoritative Records
L5  Data Engineering & Digital Thread
L6  Experience & Interaction (UI)
L7  Integration, API, External Surface
L8  Platform, Runtime, SRE, Observability
```

Plus 12 cross-cutting concerns that thread vertically through every layer:
audit chain, e-signature, internationalization, tenant isolation,
idempotency, optimistic concurrency, problem details, observability,
performance budget, retention and WORM, AI advisory governance, accessibility.

---

## 5. The 95 authoritative roots

HESEM identifies 95 root entities that are the "system of record" for the
business. Examples: Sales Order, Purchase Order, Lot, Batch Release,
Nonconformance Case, CAPA, Controlled Document, Equipment, Calibration
Record, User, Role, Training Course, Item Master, etc.

Each root has its own scope contract describing:

- What domain owns it
- What authority class it has (authoritative, projection, dependency, platform, vertical)
- What workflows it participates in
- What APIs expose it
- What frontend surfaces render it
- What evidence supports its mutations
- What approval authority is needed for what changes
- What rollback model applies

The root catalog lives in PART_M2. The per-root scope contract lives under
PART_C / per-domain chapters.

---

## 6. The 14 workflows

HESEM identifies 14 end-to-end workflows that span multiple domains. Each
workflow has its own chapter in PART_D describing the steps, the actors,
the data flow, the evidence captured, and the regulatory considerations.

```
D1   Order to Cash                     (quote → SO → ship → invoice → cash)
D2   Procurement to Pay                (PO → receive → IQC → invoice → pay)
D3   Plan to Produce                   (MPS/MRP → JO → WO → OPER → finished good)
D4   Receive to Inspect                (RECEIPT → IQC → disposition)
D5   Inspect to Disposition            (INSPECTION → NC → MRB → disposition)
D6   NC to CAPA                        (NC opened → root cause → CA → effectiveness → close)
D7   Document to Release               (CDOC draft → review → approve → release → train)
D8   Train to Qualify                  (TRAIN_COURSE → TRAIN_RECORD → certify → qualify)
D9   Maintain to Restore               (PMSCH → MWO → execute → calibrate → return-to-service)
D10  Batch to Release                  (BATCH_RECORD → execute → BREL → release)
D11  Release to Trace                  (BREL → SHIPMENT → trace → recall)
D12  Complaint to Recall               (COMPLAINT → investigate → reportability → recall)
D13  Audit to Remediate                (AUDIT_FINDING → CAPA → remediation → close)
D14  Validate to Qualify               (URS → IQ → OQ → PQ → validation summary)
```

These 14 workflows cover the operational life of HESEM's business scope. Each
workflow ties to specific roots (PART_M2), state machines (PART_M3), APIs
(PART_E), and frontend surfaces (PART_F).

---

## 7. The 14 phased waves + 2 continuous streams

HESEM is delivered in 14 phased waves and 2 continuous parallel streams. The
waves are sequential with documented dependencies. The continuous streams
run from W0.5 onward and never pause.

```
W0     Phase 2 Integration Review and Repair
W0.5   Platform Substrate Hardening
W1     HMV4 Foundation Productization (slice factory)
W2     Governed Record Factory
W3     eQMS + Workforce + Maintenance Core
W4     Live Read-Only API Graduation
W4.5   Operational Truth Graph Native Cutover
W5     Core Transactional ERP / MOM
W6     MES / OT Foundation
W6.5   AI Advisory Controlled Rollout
W7     Digital Thread / Genealogy / Release
W8     Analytics + Improvement + Reliability
W9     Security + Validation + Compliance
W10    Vertical Packs (Pharma, Auto, Aero, Med Device, Food)
W11    Customer Pilot / Pre-Production Readiness
W12    Release Candidate / Scale Operating Model
W13    Multi-Region + Multi-Jurisdictional Operations
W14    Continuous Improvement Operating Loop

CS-A   Continuous Security stream (from W0.5, never pauses)
CS-B   Continuous Validation stream (from W0.5, never pauses)
```

Each wave has its own chapter in PART_G describing scope, entry criteria,
exit criteria, deliverables, gates, decision phrase, and dependency on prior
waves.

---

## 8. How the V9 Parts relate

The Parts are not independent — they describe the same system from different
viewpoints. A capability described once in PART_C is referenced (not
duplicated) in PART_D (workflow context), PART_E (API context), PART_F (UI
context), PART_G (when delivered), and PART_H (compliance posture).

```
                          ┌─── PART_A (vision: why we build) ────┐
                          │                                       │
                          ▼                                       │
                 PART_B (architecture: how it is structured)      │
                          │                                       │
                          ▼                                       │
                 PART_C (domain capabilities: what we build)──────┘
                          │
            ┌─────────────┼─────────────┬──────────────┐
            ▼             ▼             ▼              ▼
     PART_D (workflows) PART_E (APIs) PART_F (UIs)  PART_G (when, in what wave)
            │             │             │              │
            └─────────────┴─────────────┴──────────────┘
                          │
                          ▼
                 PART_H (quality + compliance posture)
                 PART_I (operations posture)
                 PART_J (vertical extensions)
                 PART_K (commercial frame)
                 PART_L (AI discipline)
                          │
                          ▼
                 PART_M (reference: glossary, root catalog,
                          SM directory, SLO directory, risk
                          register, decision phrases, standards,
                          bibliography)
```

A reader who wants to understand "what does HESEM do for Sales Order" reads:

- PART_C/C1_COMMERCIAL_CUSTOMER (capability description: what SO is + scope)
- PART_D/D1_ORDER_TO_CASH (workflow that involves SO)
- PART_E/E4_RECORD_API_COMMERCIAL (API endpoints touching SO)
- PART_F/F5_AUTHORITATIVE_RECORD_SHELLS (UI surface for SO record)
- PART_G/G8_WAVE_W5_TRANSACTIONAL (when SO graduates to transactional)
- PART_M/M2_ROOT_CATALOG (the SO root entry in the master catalog)

No content is duplicated. Each Part contributes one viewpoint.

---

## 9. The discipline that holds it together

```
PRINCIPLE 1  Authority is explicit. Every change to a system-of-record root
             flows through the Authority Ledger and Command Bus. Workspaces
             never mutate. AI never commits regulated decisions.

PRINCIPLE 2  Evidence is mandatory. Every mutation produces an audit event,
             a workflow event, and (for regulated mutations) an evidence
             record with retention and WORM enforcement.

PRINCIPLE 3  Contract first. No live API endpoint exists without a written
             contract describing purpose, audience, request, success result,
             and every failure mode.

PRINCIPLE 4  Per-slice graduation. Features mature through 8 levels (L0
             planned to L7 productized) one step at a time. No skipping.

PRINCIPLE 5  Pre-production wording. HESEM is pre-production-readiness until
             Wave 8 cutover. No "production" wording in any document or
             commit message until then.

PRINCIPLE 6  Forbidden files protected. Specific files (portal HTML, core
             CSS, eQMS shell, module router, state-auth-UI, qms-data
             registry) are protected and never modified except via explicit
             ADR-approved exception.

PRINCIPLE 7  Validation is bidirectional. URS → RTM → IQ/OQ/PQ →
             root maturity. Stale validation evidence demotes a root's
             maturity automatically.

PRINCIPLE 8  Operations are observable. Every layer emits OpenTelemetry
             traces, metrics, and logs. SLO breaches are alarmed. DR drills
             quarterly. Validation reviews bi-annually.
```

These eight principles pervade V9. Every chapter respects them. Any
deviation requires an ADR.

---

## 10. Reading-time map for an AI agent

If an AI agent is given a task, here is the typical reading sequence
(see READING_DISCIPLINE for the full discipline):

| Task type | Required reads (in order) |
|---|---|
| New slice planning | README, MASTER_OVERVIEW, READING_DISCIPLINE, PART_B (relevant layer chapters), PART_C (relevant domain chapter), PART_F (relevant UI surface), PART_E (relevant API family), PART_M2 (root catalog entry), PART_G (current wave entry) |
| API design | README, MASTER_OVERVIEW, PART_E (full Part), PART_B7 (integration boundaries), PART_M (problem registry) |
| Workflow design | README, MASTER_OVERVIEW, PART_D (relevant workflow chapter), PART_B3 (state machine layer), PART_C (relevant domain) |
| Validation evidence | README, MASTER_OVERVIEW, PART_H (full Part), PART_M5 (risk register), relevant root chapter |
| AI feature | README, MASTER_OVERVIEW, PART_L (full Part), PART_B (relevant layer), the banned-decision list |
| Wave planning | README, MASTER_OVERVIEW, PART_G (relevant wave chapter), PART_M (decision phrases) |
| Architecture review | README, MASTER_OVERVIEW, PART_B (full Part) |
| Vertical pack work | README, MASTER_OVERVIEW, PART_J (relevant pack chapter), PART_C (affected domains), PART_H (regulatory landscape) |

---

## 11. What V9 deliberately does NOT contain

V9 does NOT contain:

- SQL DDL, JSON Schema documents, YAML state-machine definitions,
  TypeScript / PHP / Python source code, Terraform manifests, or any
  other code artifact.
- Customer-specific configurations.
- Vendor SKUs or proprietary protocol details.
- Implementation choices that an engineer should make (e.g., specific
  Postgres version, specific Kubernetes flavor, specific CI tool —
  these are mentioned only as examples where helpful).
- Repo paths to specific source files (those live in CLAUDE.md and
  the actual repo, not in V9).

Code goes in `mom/...`. Repo conventions go in `.ai/...`. Per-tenant
configuration goes in customer-specific manifests outside V9. V9 stays
above the implementation line.

---

## 12. What V9 always contains for every entity

Every entity described in V9 has, at minimum:

- **Name** (canonical English; Vietnamese parenthetical when useful)
- **Purpose** (why it exists)
- **Owner role** (which role on the team owns it)
- **Domain or layer** (where in the architecture)
- **Inputs and outputs** (what it consumes and produces, in plain terms)
- **Lifecycle** (how it comes into existence, evolves, and ends)
- **Connections** (which other entities it relates to, by name)
- **Acceptance evidence** (what proves it works, in plain terms)
- **Maturity target** (which level L0-L7 by which wave)
- **Standards reference** (which standards govern it, by name)

This consistent shape is what makes V9 navigable.

---

## 13. Decision phrase

```
V9_MASTER_OVERVIEW_BASELINE_LOCKED
NEXT: read READING_DISCIPLINE.md
```

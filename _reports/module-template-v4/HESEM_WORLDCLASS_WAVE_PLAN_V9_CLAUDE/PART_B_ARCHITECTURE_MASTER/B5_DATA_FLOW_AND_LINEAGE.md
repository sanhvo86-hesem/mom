# B5 — Data Flow & Lineage

This chapter describes how data moves through HESEM. Where B3 (Operational
Truth Graph) describes the structure of the truth graph, B5 describes the
flow of data into and out of the OTG, the projections derived from it, the
materialized views, and the data products served to analytics and BI.

---

## 1. The four data planes

HESEM's data flow is organized into four planes:

```
Plane 1   Authoritative plane   The system-of-record records (L4 of B1).
                                 Source of truth. Mutations only via L3.

Plane 2   Truth-graph plane     The OTG (B3). Append-mostly. Holds nodes,
                                 edges, events. The single graph of
                                 operational facts.

Plane 3   Projection plane      Read-optimized denormalized views
                                 (workspace projections, derived read
                                 models, materialized views).

Plane 4   Analytic plane        Data products with contracts. Lakehouse.
                                 BI tools. Customer reporting.
```

Data flows from Plane 1 to Plane 2 via Change Data Capture, from Plane 2
to Plane 3 via materialized-view refresh and incremental updates, and
from Plane 2 / Plane 3 to Plane 4 via dbt (or equivalent) transformations.

Data does not flow backward. Plane 4 never writes to Plane 3. Plane 3
never writes to Plane 2. Plane 2 never writes to Plane 1. This
unidirectional flow is the basis of lineage.

---

## 2. Change Data Capture (CDC) from Plane 1 to Plane 2

Every mutation to an authoritative root in L4 is captured by a CDC pipeline
and written to the OTG event log. The capture mechanism is:

- **Logical decoding** at the database level (Postgres logical replication
  with the pgoutput plugin).
- **Per-resource-family publication** so each authoritative root family is
  a separate replication stream.
- **At-least-once delivery** semantics with idempotency on the OTG side
  (events keyed by transaction LSN + table + primary key).
- **Lag SLA**: p95 lag less than 5 seconds, p99 less than 30 seconds.
- **Backpressure handling**: WAL retention budget of 50% of disk; emergency
  drain runbook if breached.

The CDC consumer is owned by the Data Platform Lead.

---

## 3. From Plane 2 to Plane 3 — materialized-view refresh

Materialized views (described in B3 §6) refresh from the OTG. The refresh
patterns are:

- **Continuous incremental** for high-cadence views (open NCs by lot, OEE
  freshness): refresh every 30 seconds via change-driven trigger.
- **Periodic incremental** for medium-cadence views (genealogy upstream,
  validation evidence freshness): refresh every 5 to 15 minutes.
- **Full nightly** as a drift-correction safeguard for every materialized
  view: rebuild from scratch and compare to live; non-zero drift is a
  SEV-2 incident.

Each view has a freshness SLA published in PART_M4 (SLO directory).

---

## 4. From Plane 2 / Plane 3 to Plane 4 — analytic data products

Data products are described in PART_C13 (Analytics & AI). Each data
product has a contract that declares:

- **What the product is** (purpose in plain words)
- **Source roots** (which authoritative roots feed it)
- **Source events** (which OTG events drive its updates)
- **Grain** (the level of aggregation, e.g., per tenant per equipment per day)
- **Freshness SLA** (max acceptable lag)
- **Data quality checks** (completeness, validity, referential integrity)
- **Owner** (the team responsible for the contract)
- **Consumers** (which dashboards or partners consume the product)
- **Breaking-change policy** (typically 6 months deprecation)

Six core data products are mandatory baseline:

```
DP-1  Quality Escape Rate         (BREL × COMPLAINT × NQCASE)
DP-2  OEE per Equipment per Day   (EQP × OEE_EVENT × JO × WO)
DP-3  Release Readiness            (BREL × INSP × NQCASE × CAPA × TRAIN_RECORD × VAL)
DP-4  Training Eligibility         (USER × ROLE × COMP_MATRIX × TRAIN_RECORD)
DP-5  Supplier Quality Score       (SUP × IQC × NQCASE × SCAR × RECEIPT)
DP-6  Cost Variance per Product    (STD_COST × ACT_COST × WIP_COST × JO)
```

Per-pack data products are added in vertical packs (PART_J).

---

## 5. Lineage discipline

Every derived entity in HESEM (every projection, every materialized view,
every data product) has explicit lineage to its source. The lineage record
captures:

- The **source events** consumed to produce the entity
- The **source watermark** (the highest event timestamp consumed)
- The **derivation version** (the version of the transformation logic)
- The **derivation timestamp** (when the derived entity was last updated)

This lineage record is the basis of:
- **Drift detection**: comparing the live derived state to a fresh rebuild
  reveals drift.
- **Replay**: if a derived entity is corrupt, it is rebuilt from source
  events.
- **Regulatory traceability**: a regulator asking "what data did your
  dashboard show on day X" can be answered by replaying the event log to
  the corresponding watermark.

Per OTG axiom A8 (lineage soundness), drift greater than zero is a SEV-2
incident.

---

## 6. Time-series telemetry from Edge Gateway

Telemetry from PLCs, sensors, and connected workers is ingested via the
Edge Gateway (described in B8). Telemetry data flows:

- From the **Edge Gateway** (which aggregates raw 10-100 Hz sensor data
  to 1-second bucketed events).
- Into the **time-series store** (PostgreSQL with TimescaleDB extension
  by default; alternative engines if scale demands).
- Into the **OTG event log** for state-change events (PackML state
  transitions, OEE events, andon signals) — only state changes, not raw
  measurements.

Time-series storage has a multi-resolution ladder:

```
1-second resolution    7 days (online)
1-minute resolution    90 days (continuous aggregate)
1-hour resolution      1 year
1-day resolution       7 years (compliance evidence)
anomaly samples        full resolution, 30 days
```

This ladder is sized to support OEE analytics, predictive maintenance,
and regulatory evidence without unbounded storage cost.

---

## 7. Multi-tenant data isolation

Every node in the OTG has a tenant_id (per axiom A1, tenant scoping
totality). Every authoritative root in L4 has a tenant_id. Every
materialized view filters by tenant. Every data product is partitioned
by tenant.

The isolation discipline is:

- **First wall**: middleware sets the tenant context on every request.
- **Second wall**: row-level security policies on every authoritative
  table and every OTG table enforce that queries see only the
  current tenant's rows.
- **Third wall**: query plan audit in CI that flags any plan scanning
  rows from multiple tenants in a non-aggregate join.

A tenant boundary leak is a SEV-1 incident (and STOP-3 program halt).

---

## 8. Data retention and WORM

Per OTG axiom A11, evidence_artifact and audit_event nodes are stored in
WORM (Write Once Read Many) media — typically S3 Object Lock or
equivalent. Retention is per record class:

```
Class                        Retention                 Storage
authoritative_root (regulated) 7 years past supersession Hot tier (active 1y) → cold (6y)
authoritative_root (general)  2 years past supersession Hot (active 1y) → warm (1y)
projection_workspace          rebuildable (no retention) Hot only
derived_read_model            rebuildable (no retention) Hot only
evidence_artifact             permanent (or 25y minimum) WORM
workflow_event                permanent                  Hot 30d → warm 1y → glacier
audit_event                   permanent                  WORM
ai_advisory_annotation        5 years                   Hot 1y → warm 4y
policy_directive              permanent                  Permanent
```

The retention policy is data-driven, not code-driven: each record class
has a row in the retention policy registry.

---

## 9. Backup and disaster recovery

Backup discipline:

- **Postgres PITR (Point-In-Time Recovery)** with daily full backups,
  continuous WAL archiving, 7-year retention for compliance data.
- **Object storage cross-region replication** for evidence and audit
  data.
- **WORM lock** for audit and evidence (cannot be modified or deleted
  before retention expiry).
- **Backup verification** quarterly: random sample restore on staging,
  integrity verification, audit-chain re-anchoring.

Disaster recovery commitment:

- **Recovery Point Objective**: 1 hour (maximum data loss in a regional
  failure scenario).
- **Recovery Time Objective**: 4 hours (maximum downtime to fail over to
  DR region).
- **Quarterly DR drill**: full failover scenario; documented in a DR
  drill report with metrics.
- **2 consecutive quarter DR drill failure**: STOP-5 program halt; halt
  new tenant onboarding until RPO/RTO restored.

---

## 10. Lakehouse and analytic depth

Analytics beyond the materialized views uses a lakehouse (Plane 4):

- **Default**: PostgreSQL + columnar extension (Citus or Hydra) for scale
  up to ~10 TB raw.
- **Migration trigger**: above 10 TB raw, or Q1/Q6 (per B3 §1) failing
  their p99 budget, migrate to ClickHouse or BigQuery / Snowflake /
  Redshift.
- **Transformation**: dbt for analytic transformation; data tests as
  first-class. Analytic models authored as dbt models with documented
  tests.
- **Connection to BI tools**: SQL access for the lakehouse; per-tenant
  views; no cross-tenant query support.

---

## 11. Data quality discipline

Every data product has data quality (DQ) rules:

```
DQ-1  Not-null check on tenant_id, occurred_at across OTG event.
DQ-2  Referential integrity: every foreign key resolves.
DQ-3  Range check on numeric fields (counts, money, durations).
DQ-4  Enum check on lifecycle_state per state machine.
DQ-5  Freshness check: last update timestamp newer than SLA threshold.
DQ-6  Uniqueness check: external_id + tenant_id unique per resource family.
DQ-7  Monotonicity: audit chain prev-hash chain unbroken.
DQ-8  Cardinality: GENEALOGY edge count per LOT bounded (depth ≤ 20).
```

DQ rules are implemented as dbt tests, Postgres CHECK constraints, and a
Great Expectations (or equivalent) suite. DQ failure is logged and
notifies the data product owner.

---

## 12. Decision phrase

```
B5_DATA_FLOW_AND_LINEAGE_BASELINE_LOCKED
NEXT: B6_CROSS_CUTTING_CONCERNS.md
```

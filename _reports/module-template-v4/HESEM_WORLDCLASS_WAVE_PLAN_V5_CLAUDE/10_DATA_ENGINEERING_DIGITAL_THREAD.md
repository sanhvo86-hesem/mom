# 10_DATA_ENGINEERING_DIGITAL_THREAD.md

## Purpose

GPT Pro V4 §09 names "Data & Digital Thread" as one of 5 layers and sketches the OTG schema (covered in V5 file 02). V4 does not address:

- CDC pipeline engineering
- Materialized view refresh strategy
- Event-stream backbone choice (Kafka vs RabbitMQ vs Postgres LISTEN/NOTIFY)
- Data warehouse / OLAP integration
- Time-series at scale (IIoT)
- Search index lifecycle (OpenSearch / Elastic)
- Schema evolution + breaking-change discipline
- Data quality monitoring + SLAs
- Master data management
- Backfill + replay engineering
- DSAR subgraph extraction
- Data contracts (input + output, with producers + consumers)
- Cost engineering at the data layer

V5 produces the full data engineering playbook for HESEM's digital thread.

---

## Section 1 — Data architecture overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                      OPERATIONAL TRUTH GRAPH (OTG)                       │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  otg_node  │  │  otg_edge  │  │  otg_event  │  │  audit_chain     │  │
│  │  ~100M     │  │  ~500M     │  │  ~10B/yr    │  │  daily anchor    │  │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────────────┘  │
└────────▲──────────────────────────────────────────────────────▲──────────┘
         │ (CDC: pgoutput logical decoding)                     │
┌────────┴────────┐                                  ┌──────────┴────────┐
│ AUTHORITATIVE   │                                  │  PROJECTIONS &    │
│  ROOTS (L4)     │  ─── workflow_event ────────►   │  READ MODELS (L5) │
│                 │                                  │                   │
│ Postgres        │  ─── otg_event ────────────►    │  - mv_*           │
│ tables per      │                                  │  - search index   │
│ resource family │  ◄── derived_read_model ────    │  - OLAP cube      │
└─────────────────┘                                  └───────────────────┘
         │                                                     ▲
         │                                                     │
         ▼                                                     │
┌──────────────────────┐                          ┌────────────┴────────────┐
│  EVENT BACKBONE       │                          │  DATA WAREHOUSE         │
│  (intra-cluster)      │                          │  (analytic)             │
│  Kafka / RabbitMQ     │  ◄── async sink ────►   │  Postgres + columnar    │
│  topic per family     │                          │  or BigQuery / Snowflake│
└──────────────────────┘                          └─────────────────────────┘
         │
         ▼
┌──────────────────────┐
│  TIME-SERIES (IIoT)   │
│  TimescaleDB          │
│  hypertables          │
└──────────────────────┘
```

---

## Section 2 — CDC (Change Data Capture)

### 2.1 Postgres logical decoding

V5 ADR-0161: Logical decoding via `pgoutput` plugin (built-in since PG 10). Reasons:

```text
- zero application-level dual-write
- crash-safe (LSN-based replay)
- ordered by commit time (source-of-truth ordering)
- no ETL latency beyond commit-to-decode
- Postgres-native (no extra dependency)
```

### 2.2 Replication slot lifecycle

```sql
-- Create slot
SELECT pg_create_logical_replication_slot('hesem_cdc_main', 'pgoutput');

-- Per-table publication
CREATE PUBLICATION hesem_cdc_pub FOR TABLE
  brel, lot, irev, nc, capa, cdoc, eco,
  inspection, mrb, train_record, train_course, comp_matrix, role,
  scar, ipc, oqc, iqc, mwo, prec
  WITH (publish = 'insert, update, delete');

-- Monitor lag
SELECT slot_name, active, restart_lsn, confirmed_flush_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots
WHERE slot_name LIKE 'hesem_cdc%';
```

### 2.3 Consumer durability

```text
- Consumer commits LSN only after successful insert into otg_event
- At-least-once semantics; otg_event idempotency key handles dedup
- Consumer health metric: lag < 60s warning, 5min critical
- Slot abandoned > 1h → SEV-1 (will fill WAL disk)
```

### 2.4 Backpressure

```text
If otg_event ingestion lags:
  - consumer slows pgoutput consumption (yields)
  - WAL retains until slot catches up
  - if WAL > 50% disk → emergency drain procedure
```

V5 ADR-0162: WAL retention budget + emergency drain runbook.

---

## Section 3 — Event backbone

### 3.1 Choice

| Option | Throughput | Ops cost | Multi-tenancy | Decision |
|---|---|---|---|---|
| Postgres LISTEN/NOTIFY | low (<10k/s) | low | weak | not used (volume) |
| RabbitMQ | medium (50k/s) | medium | OK with vhosts | for routing |
| Kafka | high (1M+/s) | high | strong with topics | for stream + retention |
| NATS JetStream | medium-high | low | strong | candidate alternative |

V5 ADR-0163: RabbitMQ for service-to-service routing (already in stack); Kafka or NATS JetStream introduced at W7 when ML/analytics demand stream replay.

### 3.2 Topic discipline

```text
hesem.<env>.<resource_family>.<event_type>           e.g., hesem.prod.brel.released
hesem.<env>.workspace.<workspace_id>.freshness
hesem.<env>.audit.anchor
hesem.<env>.ai.advisory.<advisory_id>
hesem.<env>.edge.<edge_id>.<resource_family>
```

### 3.3 Schema registry

V5 ADR-0164: Confluent Schema Registry (or alternative) holds Avro/JSON Schema for every event topic. Producers register schemas; consumers fetch + validate. Breaking-change discipline:

```text
- adding optional field: backward-compatible
- adding required field: forward-incompatible (consumer can't read old)
- removing field: full-incompatible
- only backward-compatible changes allowed without major-bump topic
```

### 3.4 Event design

```yaml
WorkflowTransitionEvent:
  schema: hesem.workflow.transition.v1
  required:
    event_id: uuid
    event_type: string
    occurred_at: ISO8601
    tenant_id: uuid
    trace_id: string
    subject:
      resource_family: string
      external_id: string
      authority_class: string
    transition:
      id: string
      from_state: string
      to_state: string
      committed: boolean
    principal_id: uuid
    audit_event_id: uuid
  optional:
    span_id: string
    correlation_id: string
    payload_hash: string
```

---

## Section 4 — Materialized view strategy

### 4.1 Refresh cadence catalog

```text
mv_otg_open_ncs_by_lot                   incremental: 30s; full: nightly
mv_otg_genealogy_upstream                incremental: 5min; full: nightly
mv_otg_brel_release_history              incremental: 30s; full: nightly
mv_otg_validation_evidence_freshness     incremental: 1h; full: nightly
mv_otg_audit_chain_health                incremental: 1h; full: nightly
mv_oee_daily                             nightly only (date-based)
mv_supplier_score                        incremental: 1h; full: daily
mv_capa_effectiveness_status             incremental: 1h; full: daily
mv_quality_kpi_per_period                full: per period close
```

### 4.2 Concurrent refresh

```text
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_*    (uses unique index)
```

This allows reads during refresh — but doubles disk usage temporarily. Plan for 2x storage on each MV.

### 4.3 Incremental sketch

For high-cadence MVs, use incremental refresh via trigger or scheduled function instead of full REFRESH:

```sql
-- Pseudo-incremental: maintain a 'staging' table updated by triggers,
-- swap into MV via INSERT ... ON CONFLICT
```

V5 ADR-0165: Incremental MV refresh via per-MV staging table; full nightly rebuild as drift correction.

---

## Section 5 — Search index

### 5.1 Choice

```text
OpenSearch                  open source; AWS-managed if needed
ElasticSearch               commercial; license risk
Postgres pg_trgm + tsvector small datasets only
```

V5 ADR-0166: OpenSearch as primary search index; Postgres tsvector for low-cardinality search.

### 5.2 Index per resource family

```text
hesem-brel-<tenant_id>
hesem-cdoc-<tenant_id>
hesem-nc-<tenant_id>
hesem-lot-<tenant_id>
hesem-supplier-<tenant_id>
```

### 5.3 Sync from OTG

```text
- otg_event → search-sync consumer → OpenSearch bulk API
- per-tenant index isolation
- soft-delete via _deleted_at field
- search SLO: indexed within 30s of mutation
```

### 5.4 Tenant scoping

Every query carries tenant filter at query-builder layer. Per-tenant index simplifies tenant-isolation but increases index count; per-tenant alias to shared index is alternative.

V5 ADR-0167: Per-tenant search index (boundary defense in depth).

---

## Section 6 — Time-series at scale (IIoT)

### 6.1 TimescaleDB hypertable

```sql
SELECT create_hypertable('ts_equipment_measurement', 'sampled_at',
  chunk_time_interval => INTERVAL '1 day');

-- Compression policy
SELECT add_compression_policy('ts_equipment_measurement', INTERVAL '1 day');

-- Retention policy
SELECT add_retention_policy('ts_equipment_measurement', INTERVAL '7 days');

-- Continuous aggregate (1-minute rollup)
CREATE MATERIALIZED VIEW ts_equipment_measurement_1m
WITH (timescaledb.continuous) AS
SELECT
  equipment_id,
  tag_id,
  time_bucket('1 minute', sampled_at) AS bucket,
  avg(value_num) AS avg_value,
  max(value_num) AS max_value,
  min(value_num) AS min_value,
  count(*) AS sample_count
FROM ts_equipment_measurement
GROUP BY equipment_id, tag_id, bucket;

SELECT add_continuous_aggregate_policy('ts_equipment_measurement_1m',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes');
```

### 6.2 Multi-resolution storage

```text
1s resolution:    7 days (online)
1m resolution:    90 days (continuous aggregate)
1h resolution:    1 year
1d resolution:    7 years (compliance evidence)
anomaly samples:  full resolution, 30 days
```

V5 ADR-0168: Multi-resolution time-series ladder.

### 6.3 Scale benchmarks

```text
100 machines × 100 tags × 10Hz = 100,000 samples/sec
8.6B samples/day raw

After 1m rollup: 100 × 100 × 1/60 × 86400 = 14.4M rows/day at 1m
After 1h rollup: 240,000 rows/day at 1h
```

---

## Section 7 — Data warehouse + OLAP

### 7.1 Choice

```text
Postgres + columnar extension (citus / hydra)        if scale ≤ 10TB
ClickHouse                                            10-1000TB analytic
BigQuery / Snowflake / Redshift                      managed cloud
DuckDB embedded                                       per-tenant analytic exports
```

V5 ADR-0169: Postgres + columnar extension for scale ≤ 10TB; migration plan to ClickHouse documented for scale > 10TB.

### 7.2 ETL → ELT shift

```text
- raw mutations land in OTG (no transformation)
- nightly job loads OTG events → warehouse fact tables
- transformations (aggregations, joins) happen in warehouse via dbt
- analytic models authored as dbt models with documentation + tests
```

### 7.3 dbt project layout

```text
mom/dbt/
  models/
    staging/
      stg_otg_node.sql
      stg_otg_event.sql
      stg_otg_edge.sql
    intermediate/
      int_brel_release_chain.sql
      int_lot_genealogy_resolved.sql
    marts/
      quality/
        fact_nc_open_close.sql
        fact_capa_effectiveness.sql
        dim_defect_mode.sql
      production/
        fact_oee_daily.sql
        fact_lot_yield.sql
      financial/
        fact_cost_of_quality.sql
  tests/
    assert_no_dangling_edges.sql
    assert_capa_close_audit_trail.sql
```

V5 ADR-0170: dbt for analytic transformation; data tests as first-class.

---

## Section 8 — Data contracts

### 8.1 What is a data contract

A data contract is a versioned promise from a producer to consumers about:

```text
- schema (field names, types)
- semantic (meaning of values)
- freshness (max staleness)
- quality (completeness, uniqueness, range)
- ownership (who maintains)
- breaking-change policy
```

### 8.2 Format

```yaml
# mom/data/contracts/quality/fact_nc_open_close.contract.yaml
data_product: quality.fact_nc_open_close
version: 1.0.0
owner_team: quality_engineering
description: Daily fact of NC opens and closes per defect mode
schema:
  - name: date
    type: date
    description: Calendar date in tenant timezone
    nullable: false
  - name: tenant_id
    type: uuid
    nullable: false
  - name: defect_mode
    type: string
    nullable: false
  - name: nc_opened_count
    type: integer
    nullable: false
    constraints: { minimum: 0 }
  - name: nc_closed_count
    type: integer
    nullable: false
freshness_sla:
  max_lag_hours: 24
  measurement: max(loaded_at) - max(date)
quality_checks:
  - test: not_null
    columns: [date, tenant_id, defect_mode]
  - test: unique
    columns: [date, tenant_id, defect_mode]
  - test: range
    column: nc_opened_count
    minimum: 0
    maximum: 10000
breaking_change_policy: 6_months_deprecation
deprecation_notice: null
consumers:
  - quality.dashboard.fpy
  - quality.dashboard.capa_effectiveness
  - finance.dashboard.cost_of_quality
```

### 8.3 Contract enforcement

```text
- producer release pipeline validates schema against contract
- consumers register via registry
- breaking change → deprecate + 6 months → remove
- contract test failures = pipeline failure
```

V5 ADR-0171: Data contracts as first-class artifacts in dbt + producer pipeline.

---

## Section 9 — Schema evolution

### 9.1 Forward-compatible discipline

```text
add nullable column         OK (default NULL)
add column with default     OK (existing rows take default)
add new table               OK
add new index               OK (CONCURRENTLY)
remove unused column        deprecate first; remove after 1 release
rename column               two-step: add new + dual-write + deprecate old
change type                 widening OK; narrowing requires migration
```

### 9.2 Migration discipline

```text
- migrations are forward-only (no DOWN unless purely additive)
- each migration is a numbered file in mom/database/migrations/
- migrations test on shadow DB before merge
- migrations apply in same release deployment as code
- multi-step migrations (e.g., column rename) split across releases
```

V5 ADR-0172: Forward-only migration discipline + multi-step rename pattern.

---

## Section 10 — Data quality

### 10.1 SLOs

```text
freshness                completeness          uniqueness        validity
mv_open_ncs:  < 5min     null-rate < 1%        keys unique       FK referenced
otg_node:     < 30s      tenant_id NOT NULL    external_id unq   class enum
otg_event:    < 5s       payload not empty     idem key unique   schema valid
ts_*:         < 60s      timestamp valid       not duplicate     value range
```

### 10.2 Continuous data quality monitoring

```text
- Great Expectations or dbt tests run on schedule
- failures → SLO breach → alert
- per-product owner notified
- dashboard surfaces DQ scorecard per data product
```

V5 ADR-0173: Continuous data quality framework (Great Expectations or dbt-test).

---

## Section 11 — Master data management (MDM)

### 11.1 What is MDM

Master data is reference data shared across business processes (customers, products, suppliers, materials, units of measure, account codes). MDM ensures:

```text
- single source of truth per master object
- de-duplication across heterogeneous inputs
- versioning + supersession
- subscriber notification on changes
```

### 11.2 HESEM MDM scope

```text
PRODUCT, ITEM, BOM, SUPPLIER, CUSTOMER, MATERIAL, UNIT_OF_MEASURE,
LOCATION, COST_CENTER, GL_ACCOUNT, EMPLOYEE, EQUIPMENT
```

Each is an authoritative_root with its own state machine for create/approve/release/supersede.

### 11.3 De-duplication

For inbound master data (e.g., from external CRM):

```text
- candidate match via fuzzy string + business key
- confidence score
- if confidence > 95% → auto-merge with audit trail
- if 70-95% → human review queue
- if < 70% → create new master with link
```

V5 ADR-0174: MDM dedup pipeline + AI advisory for human review queue (W6.5+).

---

## Section 12 — Backfill + replay

### 12.1 OTG event log replay

The fact OTG event log is append-only enables:

```text
- rebuild a projection from scratch
- replay events into a new derived_read_model
- DR scenario: replay event log on new region
- audit reconstruction: replay events at-time-T
```

### 12.2 Replay performance

```text
target: full replay of 1B events in < 4 hours (per W4.5 PQ benchmark)
parallelism: per-resource-family; per-tenant
checkpointing: every 10M events
```

V5 ADR-0175: Replay engineering: parallelize by resource_family + tenant_id; resumable via LSN.

---

## Section 13 — DSAR subgraph extraction

(Per file 02 §12 + file 07 §12.)

### 13.1 Subgraph algorithm

```text
1. Identify all otg_node where principal participated:
   - audit_event.ACTED_BY → principal_id = subject
   - otg_node where metadata contains subject
2. Walk LINKED + ACTED_BY + ON_BEHALF_OF + SIGNED_BY edges (within tenant)
3. Compose graph slice
4. Export as JSON-LD + CSV
5. Sign export bundle
6. Deliver via portal + email
```

### 13.2 Performance

```text
typical export: 1k-100k nodes
target: < 5 min for 95% of cases; < 1 hour for 99th
async via long-running operation pattern (file 09 §14)
```

---

## Section 14 — Cost engineering

### 14.1 Storage cost ladder

```text
hot   Postgres (online)              ~$300/TB/month  (managed cloud)
warm  S3 standard                    ~$23/TB/month
cold  S3 IA                          ~$13/TB/month
glacial S3 Glacier                   ~$1/TB/month
WORM  S3 Object Lock + Glacier       ~$1.50/TB/month + transfer
```

### 14.2 Lifecycle policy per class

```text
authoritative_root        hot 7 days → warm 90 days → cold 1 year → glacial 7 years
projection_workspace      hot only (rebuild from event log if needed)
derived_read_model        hot only
evidence_artifact         WORM permanent (Glacier + Object Lock for old)
audit_event               hot 30 days → warm 1 year → glacial 25 years
otg_event                 hot 30 days → warm 90 days → cold 7 years
ts_equipment_measurement  hot 7 days → warm 90 days → cold 7 years
```

### 14.3 Compute cost lever

```text
- materialized view refresh cadence (more frequent = more cost)
- search index size (per-tenant vs shared alias)
- ML inference (CPU vs GPU; batch vs realtime)
- query budget per route (high-cost queries flagged + reviewed)
```

V5 ADR-0176: Per-tenant cost SLA budget + monitoring; out-of-budget queries throttled.

---

## Section 15 — Observability for data layer

```text
metrics:
  cdc_lag_seconds                       (target < 60s)
  otg_event_ingestion_rate              (per resource_family)
  mv_refresh_latency_ms                 (per MV)
  mv_freshness_seconds                  (per MV)
  search_index_lag_seconds              (per index)
  data_contract_violations_total        (per product)
  ts_compression_ratio                  (per hypertable)
  dq_check_failures_total               (per check)

logs:
  CDC_CONSUMER_RESTARTED
  MV_REFRESH_FAILED
  SEARCH_BULK_INDEX_FAILED
  DATA_CONTRACT_BREAKING_CHANGE_BLOCKED
  DQ_FAILURE                            severity=warn
```

---

## Section 16 — Data team responsibilities

```text
Data Platform team:
  - CDC pipeline ops
  - Event backbone ops
  - Search index ops
  - Time-series ops
  - Schema registry
Data Engineering team:
  - dbt models in marts/
  - data contracts maintenance
  - DQ rules
ML Engineering team:
  - Feature store
  - Model registry
  - Inference mesh
Domain teams:
  - Own their authoritative_root tables
  - Author data contracts for their owned data products
```

V5 ADR-0177: Data team RACI matrix.

---

## Section 17 — Cumulative ADRs

```text
ADR-0161  CDC via pgoutput logical decoding
ADR-0162  WAL retention budget + emergency drain runbook
ADR-0163  RabbitMQ + Kafka/NATS introduced at W7
ADR-0164  Schema registry with backward-compat enforcement
ADR-0165  Incremental MV refresh strategy
ADR-0166  OpenSearch primary search; pg_trgm fallback
ADR-0167  Per-tenant search index
ADR-0168  Multi-resolution time-series ladder
ADR-0169  Postgres+columnar warehouse; ClickHouse migration plan
ADR-0170  dbt for analytic transformation
ADR-0171  Data contracts first-class
ADR-0172  Forward-only migration discipline
ADR-0173  Continuous data quality framework
ADR-0174  MDM dedup pipeline + AI advisory
ADR-0175  Replay engineering parallelism
ADR-0176  Per-tenant cost SLA + throttling
ADR-0177  Data team RACI
```

---

## Decision phrase

```text
V5_DATA_ENGINEERING_DIGITAL_THREAD_BASELINE_LOCKED
NEXT_FILE: 11_AI_ENGINEERING_PLAYBOOK.md
```

# 20 — V8 Data Platform and Lineage

```text
purpose:        Bind V7 §18 prose to data product contract + CDC + lakehouse + DQ
predecessor:    V7 §18 + V5 file 10
v8_advance:     6 data products with full contract; CDC schema; DQ rules; cost model integration
work_package:   WP-V8-DATA (6 work packages)
owner:          Data Platform Lead
estimate:       ~10 engineering-weeks (W4.5 + W6 + W8)
```

---

## 1. Data product contract (V5 file 10 §8 carry-forward + V8 fields)

```yaml
data_product_contract:
  id, version, owner_team
  description, intended_use
  schema (avro + json schema mirror)
  source_roots: [list of root_codes]
  cdc_streams: [list of cdc_topic_names]
  grain: e.g. per (tenant, day, equipment, defect_mode)
  freshness_sla: max_lag_seconds (e.g. 60 for OEE; 3600 for QualityKPI)
  freshness_alarm: at threshold X% of SLA
  dq_checks: [list of dq_rule_ids]
  access_policy: { read: [roles], write: [job_id] }
  retention: per data class
  cost_class: hot|warm|cold
  consumer_count: tracked
  breaking_change_policy: 6_months_deprecation
```

---

## 2. Six core data products (V7 §18 §11)

```text
DP-V8-001: Quality Escape Rate
  source_roots: [BREL, COMPLAINT, NQCASE]
  grain: tenant × product_family × month
  freshness_sla: 24h
  consumers: quality dashboard, APR generator

DP-V8-002: OEE per Equipment per Day
  source_roots: [EQP, OEE_EVENT, JO, WO]
  grain: tenant × equipment × day
  freshness_sla: 1h
  consumers: production dashboard, andon

DP-V8-003: Release Readiness
  source_roots: [BREL, INSP, NQCASE, CAPA, TRAIN_RECORD, VAL]
  grain: tenant × lot
  freshness_sla: 5min
  consumers: BREL workspace, executive dashboard

DP-V8-004: Training Eligibility
  source_roots: [USER, ROLE, COMP_MATRIX, TRAIN_RECORD]
  grain: tenant × user × course
  freshness_sla: 1h
  consumers: Connected Worker eligibility resolver

DP-V8-005: Supplier Quality Score
  source_roots: [SUP, IQC, NQCASE, SCAR, RECEIPT]
  grain: tenant × supplier × month
  freshness_sla: 24h
  consumers: procurement dashboard, supplier portal

DP-V8-006: Cost Variance per Product
  source_roots: [STD_COST, ACT_COST, WIP_COST, JO]
  grain: tenant × item × month
  freshness_sla: 24h
  consumers: finance dashboard
```

---

## 3. CDC pipeline (V5 file 10 §2 + V8 hardening)

```yaml
backend: Postgres logical decoding (pgoutput plugin)
slot: hesem_cdc_main (per region per cluster)
publication: hesem_cdc_pub_v8 covering all authoritative_root tables
consumer: hesem-cdc-consumer-v8 (Go service)
target: otg_event ingestion via at-least-once with idempotency by lsn+table+pk
slo: lag p95 < 5s; lag p99 < 30s
backpressure: WAL retention budget 50% of disk; emergency drain runbook RB-CDC-001
```

---

## 4. DQ rule library

```yaml
DQ-V8-001 not_null check on tenant_id, occurred_at across otg_event
DQ-V8-002 referential integrity: every FK resolves
DQ-V8-003 range check on numeric fields (ages, counts, money)
DQ-V8-004 enum check on lifecycle_state per state machine
DQ-V8-005 freshness check: max(updated_at) > NOW - SLA per table
DQ-V8-006 uniqueness check: external_id + tenant_id unique per resource_family
DQ-V8-007 monotonicity: audit chain prev_hash chain unbroken
DQ-V8-008 cardinality: GENEALOGY edge count per LOT bounded (≤ 10K parents)
```

Implementation: dbt tests + Great Expectations + Postgres CHECK constraints.

---

## 5. Lakehouse

```yaml
choice_w8: Postgres + columnar extension (citus or hydra)
upgrade_path: ClickHouse if scale > 10TB raw
ingest: nightly batch from CDC + hourly streaming for hot data products
processing: dbt models (staging/intermediate/marts)
output: data products consumable via SQL + Grafana + BI tools
```

---

## 6. Work packages

```yaml
WP-V8-DATA-1: CDC consumer service                                  (W4.5, 2 wk)
WP-V8-DATA-2: Materialized views + dbt project                      (W4.5+W6, 2 wk)
WP-V8-DATA-3: Six data products + contracts                          (W6+W8, 3 wk)
WP-V8-DATA-4: DQ rule library + dbt tests + Great Expectations       (W6+W8, 1.5 wk)
WP-V8-DATA-5: Lakehouse provisioning + ingest                        (W8, 1.5 wk)
WP-V8-DATA-6: Cost monitoring + per-tenant attribution               (W8, 1 wk)
total: 11 wk
```

---

## 7. Decision phrase

```text
V8_DATA_PLATFORM_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-DATA-1..6
NEXT_FILE: 21_V8_VERTICAL_PACK_DEPENDENCY_PATHS.md
```

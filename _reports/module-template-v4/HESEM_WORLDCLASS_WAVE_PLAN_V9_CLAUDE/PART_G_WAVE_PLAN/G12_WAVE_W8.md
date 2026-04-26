# G12 — Wave W8: Analytics + Improvement + Reliability

```
wave_id:        W8
wave_name:      Analytics + Improvement + Reliability
predecessor:    W7
successor:      W9
calendar:       6-12 weeks
team_size:      10 FTE
```

---

## 1. Goal

Build out analytics depth, lakehouse, observability maturity, DORA
Elite-tier targets, SOC 2 evidence collection, pen-test program, bug
bounty launch. This wave delivers reliability + insight.

---

## 2. Entry criteria

W7 READY.

---

## 3. Exit criteria

```
[ ] CDC pipeline production-grade with SLO compliance
[ ] Lakehouse operational (Postgres + columnar OR ClickHouse)
[ ] dbt project with 6 core data products (per PART_C13)
[ ] DORA Elite tier on >= 60% of services
[ ] OEE / Quality / Throughput dashboards operational
[ ] Predictive maintenance ML feature live
[ ] Complaint NLP AI advisory feature live
[ ] SOC 2 Type II evidence collection automated
[ ] Annual third-party penetration test conducted
[ ] Bug bounty program launched
```

---

## 4. Work packages

```
WP-W8-01 Lakehouse provisioning (Postgres+columnar default)
WP-W8-02 dbt project with 6 core data products
WP-W8-03 OEE Analytics, Quality Analytics, Throughput Analytics dashboards
WP-W8-04 Predictive Maintenance ML feature
WP-W8-05 Complaint NLP AI advisory feature
WP-W8-06 DORA metrics dashboard with continuous measurement
WP-W8-07 SOC 2 Type II evidence collection automation
WP-W8-08 Annual penetration test (3rd-party)
WP-W8-09 Bug bounty program launch
WP-W8-10 Per-tenant cost attribution + throttling
WP-W8-11 Synthetic monitoring for golden user journeys
WP-W8-12 Backup verification quarterly drill
```

---

## 5. Decision phrases

```
W8_ANALYTICS_RELIABILITY_READY
W8_ANALYTICS_RELIABILITY_PASS_WITH_WARNINGS
W8_ANALYTICS_RELIABILITY_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G12_WAVE_W8_BASELINE_LOCKED
NEXT: G13_WAVE_W9.md
```

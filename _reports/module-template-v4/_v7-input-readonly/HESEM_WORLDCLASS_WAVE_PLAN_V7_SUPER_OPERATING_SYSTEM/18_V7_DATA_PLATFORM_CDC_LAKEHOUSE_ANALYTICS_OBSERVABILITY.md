# 18 — Data Platform, CDC, Lakehouse, Analytics and Observability
## Data platform thesis

Analytics must be downstream of authority. A dashboard that cannot trace its numbers to roots/events/evidence is not trusted. V7 defines CDC/data contracts, semantic models, quality checks and observability before advanced AI analytics.

## Data product contract

| Field | Meaning |
| --- | --- |
| data_product_id | stable identity |
| source_roots | authoritative roots included |
| cdc_streams | event/table streams consumed |
| grain | record/event/time grain |
| freshness_slo | expected latency |
| dq_checks | completeness/validity/referential rules |
| owner | domain/data owner |
| lineage | source to output mapping |
| access_policy | tenant/site/role restrictions |

## Core analytics products

| Product | Sources | Wave |
| --- | --- | --- |
| Quality escape dashboard | INSP/NQCASE/CAPA/MRB/LOT | W8 |
| OEE and downtime | OPER/DOWNTIME/OEEVT/EQP | W8 |
| Release readiness | BREL/LOT/INSP/NQCASE/CAPA/ESIGN | W7/W8 |
| Training eligibility | TRAIN/CDOC/WO/DISP | W3/W6 |
| Supplier quality | SUP/PREC/INSP/NQCASE/SCAR | W10 |
| Cost variance | JO/WO/INVTXN/COST/SHIP/INVOICE | W8 |

## Observability model

Every API request, command, workflow transition and evidence write should emit correlated trace/log/event data using stable semantic attributes where possible. Dashboards must include latency, error rate, fallback mode, command rejection reason, workflow guard failures, live-vs-fixture mode and rollback rehearsal result.

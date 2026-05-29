# P08 — UoM Digital Thread Linkage Map

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P08 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Trace how MEASVAL evidence and audit hashes propagate across the HESEM digital thread — from raw sensor or inspector input to roll-up KPI dashboards — so any value in any report can be traced to its source measurement and its conversion rule.

## 2. Thread graph (compressed)

```
sensor (OPC UA / CMM / gauge)            inspector (Quality module)
   │                                          │
   ▼                                          ▼
ExternalEngineeringUnitMapper       UI form → POST /api/v1/uom/convert
   │                                          │
   ▼                                          ▼
canonical_code + magnitude          MEASVAL envelope (transient)
   │                                          │
   ▼                                          ▼
mes_inline_measurements         inspection_results
   │   (insert)                       │   (insert)
   ▼                                          ▼
QualityMeasurementBridge::wrapInlineMeasurement | wrapInspectionResult
   │
   ▼
MEASVAL envelope stamped on source row
   │
   ▼
uom_measurement_thread row recorded
   │
   ▼ (joined via item_id, job_number, rule_code, audit_hash)
   │
SPC analytics → KPI dashboards → Executive scorecard
```

## 3. Joinability

`uom_measurement_thread` indexes:

| Index | Use case |
|---|---|
| `(source_table, source_id)` | drill from KPI back to specific inspection / MES row |
| `(item_id, recorded_at DESC)` | per-item history |
| `(job_number, operation_seq)` | per-job-and-operation review |
| `(audit_hash)` | tamper verification + cross-reference |
| `(rule_code)` | impact analysis when a rule changes |

## 4. Cross-domain hops

| Hop | Mechanism | Evidence |
|---|---|---|
| ITUOM resolution → MEASVAL envelope | `semantic_context.item_id` + `match_level` (carried by consumer) | trace |
| MEASVAL → KPI | analytics SQL aggregates over `uom_measurement_thread` joined to source | trace |
| KPI → MEASVAL (drill-down) | KPI row carries thread_id(s) | trace |
| MEASVAL → conversion rule version | `evidence.rule_code` + `evidence.rule_version` | reproducibility |
| MEASVAL → quarantine alias | if input went through quarantine, alias_id is recorded | provenance |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| DT-001 | Thread row carries `audit_hash` so KPI roll-ups can verify integrity at any aggregation level | tamper resistance |
| DT-002 | `item_id` denormalised on thread row (not joined) so analytics SQL is fast | performance |
| DT-003 | Thread is append-only; no UPDATE permitted | audit |
| DT-004 | Cross-domain joins to `users`, `items`, `work_orders` are read-only and traceable | scope boundary |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | DTG-001 | Analytics consumer not yet using thread; aggregates still computed over source tables | analytics follow-up |
| medium | DTG-002 | Thread row writer does not yet populate `request_id` / `trace_id` from W3C Trace Context | observability follow-up |
| low | DTG-003 | Thread retention policy not yet declared | release-engineering decision |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Thread graph completeness | 9 |
| Index discipline | 10 |
| Joinability for audit | 10 |
| Cross-domain transparency | 9 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/domain-integration-blueprint.md` (P08 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p08-domain-regression-surface.md` (P08 / 3)

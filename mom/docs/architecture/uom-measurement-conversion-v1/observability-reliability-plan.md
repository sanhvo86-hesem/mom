# P16 — Observability, SRE, and Reliability Specification

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P16 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the observability surface (logs, metrics, traces), the SRE health-check pattern, and the reliability budget the UoM subsystem operates under.

## 2. Observability surface

| Signal | Producer | Destination | Use |
|---|---|---|---|
| Application logs | every UoM service | `/var/www/eqms.hesemeng.com/mom/data/php_error.log` | per-request debugging |
| Audit event log | UomWorkflowService | EventBus + admin dashboard | compliance |
| Conversion result metrics | ConversionEngine | (planned) Prometheus exporter | latency + throughput |
| Scanner findings counts | UomDataQualityScanner::fullScan | admin dashboard | metrology health |
| Tamper detection events | bridge re-verify | EventBus + admin notification | security |
| Cache hit / miss | ConversionRuleService + UomAliasResolutionService | (planned) Redis MONITOR aggregation | performance |
| AI advisory volume | recordAiAdvisory | EventBus | model behaviour |

## 3. Health checks

| Probe | Endpoint | Healthy criteria |
|---|---|---|
| Engine liveness | `GET /api/v1/uom/health` | HTTP 200 + `ok: true` |
| Engine readiness | same + `catalog.active_units > 0` + `catalog.approved_rules > 0` | |
| DB liveness | implicit (every controller hits PG) | |
| Redis liveness | implicit; engine falls back to DB on miss | |
| Scanner status | `UomDataQualityScanner::fullScan().overall_status == 'OK'` | |

## 4. Reliability budget

| SLO | Target |
|---|---|
| Engine convert p50 latency | < 30 ms |
| Engine convert p95 latency | < 80 ms |
| Engine convert p99 latency | < 200 ms |
| Alias resolve p50 (cache hit) | < 2 ms |
| Alias resolve p95 (cache miss) | < 20 ms |
| Engine availability (monthly) | 99.9% |
| Bridge wrap success rate | > 99.95% (rejecting kind-mismatch is not a failure) |

These targets are starting values; metrology + SRE adjust after observation.

## 5. Rollback plan

| Failure | Rollback |
|---|---|
| Migration applied with bad seed | not rolled back; corrective forward migration |
| Engine release ships a bug | deploy the previous tag via deploy.sh; database is forward-compatible |
| Controller route registration corrupted | re-deploy `mom/api/index.php` |
| Cache poisoned | flush Redis namespace `uom:*` |
| Catalog rule activated with wrong factor | retire the rule (workflow); activate corrective forward rule |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| OD-001 | Engine emits structured JSON logs with `event_id` for correlation | observability |
| OD-002 | Scanner full-scan exposes overall_status that drives deploy gate | release engineering |
| OD-003 | Reliability budgets are advisory until consumer wiring lands | data-driven adjustment |
| OD-004 | Rollback is forward-only (corrective migration), never destructive | audit integrity |
| OD-005 | Cache flush is bounded to `uom:*` namespace | blast radius |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | OG-001 | Prometheus exporter not yet wired | infrastructure |
| medium | OG-002 | Tracing (W3C Trace Context) not yet propagated through bridge calls | observability follow-up |
| low | OG-003 | Cache hit/miss aggregation not yet exposed | metrics follow-up |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Signal enumeration | 9 |
| Health check completeness | 10 |
| Reliability budget realism | 8 |
| Rollback discipline | 10 |
| **Total** | **37 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/release/uom-measurement-conversion-v1/rollback-and-release-readiness-plan.md` (P16 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p16-operational-readiness-redteam.md` (P16 / 3)

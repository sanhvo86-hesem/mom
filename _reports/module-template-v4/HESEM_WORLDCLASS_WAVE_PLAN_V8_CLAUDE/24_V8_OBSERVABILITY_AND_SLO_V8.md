# 24 — V8 Observability and SLO

```text
purpose:        Bind V7 §18 §20 observability prose to OTel semantic conventions + SLO library
predecessor:    V7 §18 + V7 §20 + V5 file 12
v8_advance:     OTel SDK init contract + 22 SLOs + burn-rate alerts + per-tenant cost attribution
work_package:   WP-V8-OBS (5 work packages)
owner:          SRE Lead + Platform Lead
estimate:       ~7 engineering-weeks (W0.5 + W4 + W8)
```

---

## 1. OTel stack (V5 file 12 §5 carry-forward)

```text
SDK in every service          → OTel collector
Collector → Tempo/Jaeger (traces) + Prometheus (metrics) + Loki (logs) + AlertManager + Grafana
Sampling: 5% head-based + 100% on error spans
W3C Trace Context: traceparent + tracestate
W3C Baggage: tenant.id, principal.id, request.id
HESEM-specific resource attrs: hesem.tenant.id, hesem.principal.id, hesem.workflow.machine, hesem.workflow.transition_id, hesem.resource_family, hesem.authority_class
```

---

## 2. 22 SLO catalog

```yaml
SLO-V8-001  L1 auth.decide p95 < 20ms                              99.9% / 30d
SLO-V8-002  L2 policy directive store availability                 99.95% / 30d
SLO-V8-003  L3 workflow.transition.commit p95 < 500ms              99.9% / 30d
SLO-V8-004  L4 domain.root.write p95 < 100ms                       99.95% / 30d
SLO-V8-005  L5 projection freshness < 5s p95                       99.5% / 30d
SLO-V8-006  L5 OTG integrity zero violations / 7d                  100% / 7d
SLO-V8-007  L6 surface render p95 < 200ms                          99.9% / 30d
SLO-V8-008  L7 api request p95 < 500ms                             99.9% / 30d
SLO-V8-009  L7 api error rate < 0.1%                               99.9% / 30d
SLO-V8-010  L8 audit chain anchor lag < 25h                        100% / 7d
SLO-V8-011  L8 log ingest lag < 60s                                99.9% / 30d
SLO-V8-012  L8 trace ingest lag < 60s                              99.9% / 30d
SLO-V8-013  CDC consumer lag < 60s                                 99.9% / 30d
SLO-V8-014  AI inference p95 < 200ms                               99.5% / 30d
SLO-V8-015  Audit pack export p95 < 24h                            99% / 90d
SLO-V8-016  Backup success rate                                    100% / 30d
SLO-V8-017  DR drill quarterly success                             100% / 90d
SLO-V8-018  Per-tenant cost SLA                                    99% / 30d under budget
SLO-V8-019  Vulnerability patch SLA per severity                   100% within SLA / 90d
SLO-V8-020  Validation evidence freshness                           100% non-expired / always
SLO-V8-021  Edge gateway uptime per site                           99.9% / 30d
SLO-V8-022  Customer onboarding time within tier SLA               90% / 90d
```

Each SLO has: error budget, fast-burn alert (5min), slow-burn alert (1h), runbook URL.

---

## 3. Burn-rate alerts (Google SRE multi-window)

```yaml
fast_burn:
  burn_rate: 14.4
  window: 5min
  exhausts_30d_budget_in: 1h
  severity: critical
  
slow_burn:
  burn_rate: 1.0
  window: 1h
  exhausts_30d_budget_at_steady_rate: yes
  severity: warning
```

Alert routing: PagerDuty (critical) + Slack #sre (warning) + per-domain Slack (info).

---

## 4. DORA metrics dashboard (W8 commitment)

```yaml
Deployment Frequency:    daily+ per service (Elite)
Lead Time:               P50 < 1h; P95 < 1d
Change Failure Rate:     < 5%
MTTR:                    P50 < 1h; P95 < 4h

source: github releases + incident_record OTG nodes + deploy log
publication: weekly team scorecard; quarterly company review
```

---

## 5. Per-tenant cost attribution

```yaml
breakdown_per_tenant_per_month:
  - compute (vCPU × hours × node-pool rate)
  - memory (GB × hours)
  - storage (GB × month per tier)
  - network egress
  - managed services share (DB, queue)
  - ML inference per call
  - observability share

threshold:
  - per-tenant SLA budget published in commercial pack
  - 80% budget → warning email
  - 95% budget → throttle non-critical workloads
  - 100% budget → engineering absorbs OR negotiates uplift
```

---

## 6. Work packages

```yaml
WP-V8-OBS-1: OTel SDK + collector + base dashboards               (W0.5, 2 wk)
WP-V8-OBS-2: 22 SLO definitions + burn-rate alerts                (W4, 2 wk)
WP-V8-OBS-3: DORA dashboard + automation                           (W8, 1 wk)
WP-V8-OBS-4: Per-tenant cost attribution + throttling              (W8, 1.5 wk)
WP-V8-OBS-5: Synthetic monitoring (golden user journeys)           (W8, 0.5 wk)
total: 7 wk
```

---

## 7. Decision phrase

```text
V8_OBSERVABILITY_AND_SLO_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-OBS-1..5
NEXT_FILE: 25_V8_PER_TENANT_COST_GOVERNANCE.md
```

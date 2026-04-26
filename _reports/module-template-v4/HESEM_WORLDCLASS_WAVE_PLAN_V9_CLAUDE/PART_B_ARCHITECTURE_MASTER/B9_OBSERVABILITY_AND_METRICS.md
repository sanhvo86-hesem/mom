# B9 — Observability and Metrics

This chapter describes how HESEM is observed at run time. Without
observability, HESEM cannot meet its DORA Elite-tier reliability
commitment, debug production incidents efficiently, or satisfy regulatory
expectations for system monitoring.

Observability is treated as a cross-cutting concern (B6 C8) with its own
chapter here because it has enough depth to warrant it.

---

## 1. The three pillars

HESEM's observability rests on three pillars:

```
Pillar 1   Traces      (distributed tracing of every request)
Pillar 2   Metrics     (numeric measurements over time)
Pillar 3   Logs        (structured event records)
```

Plus one connecting pillar:

```
Pillar 4   Trace Links (span-to-log, span-to-metric correlation)
```

All four pillars use OpenTelemetry as the canonical SDK and the
OpenTelemetry Protocol (OTLP) as the wire format. There is no other
observability SDK in HESEM.

---

## 2. Traces

**What is captured.** Every API request, every command, every workflow
transition, every guard evaluation, every database query, every CDC
event, every materialized-view refresh, every audit chain anchor —
each is one or more spans.

**Span attributes.** Every span carries:
- service.name (the service emitting the span)
- service.version (the deployed version)
- deployment.environment (production, staging, etc.)
- hesem.tenant.id (the tenant context)
- hesem.principal.id (the actor identity, when known)
- hesem.workflow.machine (state machine, when applicable)
- hesem.workflow.transition_id (transition, when applicable)
- hesem.resource_family (resource family, when applicable)
- hesem.authority_class (authority class of the touched root)

**Trace propagation.** W3C Trace Context (traceparent + tracestate)
across all service boundaries. W3C Baggage propagating tenant.id,
principal.id, request.id.

**Sampling.** Head-based 5% by default. 100% sampling on error spans.
Full sampling on regulated transitions (e.g., CAPA close, BREL release)
regardless of the default rate.

**Backend.** OpenTelemetry Collector ingests OTLP, exports to Tempo
(Grafana) or Jaeger (Linux Foundation). Engineering decides the specific
backend; V9 specifies the contract.

---

## 3. Metrics

**What is measured.**

Application-level metrics:
- HTTP request count and latency per route
- Workflow transition count per state machine per transition
- Guard failure count per guard per machine
- Audit event count per resource family
- OTG event lag p95, p99
- Materialized view freshness per view
- Authentication decision count (permit, deny, not applicable)
- Idempotency replay hit rate
- AI advisory invocation count and acceptance rate

Resource-level metrics:
- CPU utilization per pod
- Memory utilization per pod
- Process open file descriptors
- Database connection pool utilization
- Database query latency by operation
- Redis cache hit rate
- Object storage request latency

Compliance metrics:
- Audit chain anchor recency
- Validation evidence freshness distribution
- Stop-rule check status (per stop rule per night)
- DR drill pass rate (per quarter)

**Metric naming convention.** OpenTelemetry semantic conventions where
applicable; HESEM-specific metrics prefixed `hesem_` (e.g.
`hesem_workflow_transitions_total`, `hesem_audit_chain_anchor_age_hours`).

**Backend.** OpenTelemetry Collector exports to Prometheus (Cloud Native
Computing Foundation) for storage and query. Long-term storage in
Mimir or Thanos for capacity.

---

## 4. Logs

**What is logged.** Structured logs (JSON line format) from every service.

**Required log fields.**
- timestamp (ISO 8601)
- level (debug, info, notice, warning, error, critical)
- service
- trace_id (for correlation with span)
- span_id (for correlation with span)
- tenant.id
- principal.id (when applicable)
- message
- attributes (additional structured fields)

**Sensitive data discipline.** Logs never carry passwords, signatures,
PHI, or PII without explicit field-level masking. The masking policy is
documented in PART_I7 (Security Operations).

**Backend.** OpenTelemetry Collector ingests, exports to Loki or ELK
stack. Engineering decides; V9 specifies the contract.

---

## 5. Service Level Objectives (SLOs)

HESEM publishes 22 baseline SLOs. Each SLO has:
- **Service Level Indicator** (SLI): the measured signal.
- **Objective**: the target the SLI must meet over a window.
- **Window**: typically 30 days; some SLOs are 7-day or 90-day.
- **Burn rate alerts**: fast burn (5 min, exhausts 30d budget in 1 hour
  → critical) and slow burn (1 hour, exhausts at steady rate → warning).
- **Runbook URL**: link to the on-call response procedure.

The 22 SLOs are listed in PART_M4 (SLO directory). Headlines:

```
SLO-V9-001  L1 auth.decide p95 < 20 ms                       99.9% / 30d
SLO-V9-003  L3 workflow commit p95 < 500 ms                   99.9% / 30d
SLO-V9-005  L5 projection freshness < 5 s p95                 99.5% / 30d
SLO-V9-006  L5 OTG integrity zero violations / 7d             100% / 7d
SLO-V9-008  L7 API request p95 < 500 ms                       99.9% / 30d
SLO-V9-009  L7 API error rate < 0.1%                          99.9% / 30d
SLO-V9-010  L8 audit chain anchor lag < 25 hours              100% / 7d
SLO-V9-013  CDC consumer lag < 60 s                           99.9% / 30d
SLO-V9-014  AI inference p95 < 200 ms                         99.5% / 30d
SLO-V9-015  Audit pack export p95 < 24 hours                  99% / 90d
SLO-V9-017  DR drill quarterly pass                           100% / 90d
SLO-V9-018  Per-tenant cost SLA under tier budget             99% / 30d
... (full list in PART_M4)
```

---

## 6. Dashboards

**Default dashboards** (per-cluster):

- Service health per service (golden signals: latency, traffic, errors,
  saturation).
- SLO burn rate per SLO.
- RED dashboard per route (Requests, Errors, Duration).
- USE dashboard per node (Utilization, Saturation, Errors).
- Audit chain health.
- OTG event lag and integrity status.
- Per-tenant cost attribution.
- DORA metrics (deployment frequency, lead time, change failure rate,
  MTTR).
- Capacity utilization.

**Service-specific dashboards** (per HESEM service):

- Per-service span performance.
- Per-service error breakdown by problem-detail type.
- Per-service throughput.

**Customer-facing dashboards** (per-tenant, post Wave 8):

- Per-tenant SLA compliance.
- Per-tenant cost vs budget.
- Per-tenant audit pack export history.

Dashboards are authored in Grafana (or equivalent). Engineering
maintains a default set; Vertical Pack Leads may add pack-specific
dashboards.

---

## 7. Alerts

**Alert routing.** PagerDuty (or equivalent) for critical alerts.
Slack #sre or #incidents for warning alerts. Per-domain Slack channels
for informational alerts.

**Alert severity** (per the V8 severity matrix described in PART_I3):
- SEV-0: program-halting (CEO + legal + customers)
- SEV-1: immediate response (on-call paged; 15 min ack)
- SEV-2: same-day response (30 min ack; 1 business day resolve)
- SEV-3: same-week response (4 hour ack; same sprint resolve)
- SEV-4: backlog (next standup)

**Alert volume discipline.** False-alarm rate is tracked. Alerts that
fire too frequently are reviewed and tuned. Alerts that never fire are
reviewed for relevance.

---

## 8. Synthetic monitoring

In addition to passive observability, HESEM runs synthetic monitoring on
golden user journeys:

- Login + dashboard render
- Open record + tab through tabs
- Submit a fixture transaction (in test tenant)
- Generate audit pack (in test tenant)
- Failover transaction (test DR)

Synthetic tests run continuously in production-equivalent staging and
periodically in production. Failures alarm immediately.

---

## 9. Compliance evidence

Observability evidence is a regulatory deliverable. Compliance Lead can
extract:

- Per-tenant access log (every action, every authentication)
- Per-tenant per-period audit chain status
- Per-tenant per-period SLO compliance report
- Per-tenant per-period incident log
- Per-quarter DR drill report
- Per-quarter security review report (per CS-A stream in PART_G)
- Per-quarter validation review report (per CS-B stream in PART_G)

These reports feed into the audit pack generator (PART_J / PART_H)
on-demand.

---

## 10. Engineering vs operations metrics distinction

HESEM observability is bidirectional:

- **Operations metrics** answer "is the system running well?" — SLO
  compliance, error rates, latency, capacity.
- **Engineering metrics** answer "is the team delivering well?" —
  DORA metrics, CI pipeline health, deployment frequency, lead time,
  change failure rate.

Both are observed. Both are reviewed weekly. Both are reported
quarterly. Both are part of the operational discipline.

---

## 11. Owner

**SRE Lead** owns the observability stack. **API Lead** owns API-level
SLOs and service-level objectives. **Platform Lead** owns deployment
metrics and infrastructure metrics. **Compliance Lead** owns compliance
metrics and audit chain monitoring.

---

## 12. Decision phrase

```
B9_OBSERVABILITY_AND_METRICS_BASELINE_LOCKED
PART_B_COMPLETE
NEXT: PART_C_DOMAIN_CAPABILITIES/C0_PART_C_OVERVIEW.md
```

# I2 — Observability and SLO

```
chapter_purpose: how HESEM is observed at runtime; SLO discipline;
                 burn-rate alerting; SLI definition; cardinality
                 governance; data residency for telemetry; auditor-
                 facing observability
owner_role:      SRE Lead with Platform Lead
sources:         Google SRE Books (Site Reliability Engineering,
                 The Site Reliability Workbook — chapters 2, 5, 6),
                 OpenTelemetry semantic conventions v1.24,
                 Prometheus data model + PromQL specification,
                 NIST SP 800-92 guide to computer security log
                 management,
                 ISO/IEC 27037:2012 digital evidence principles,
                 ISO/IEC 20000-1:2018 IT service management,
                 ITIL 4 (Service Level Management practice),
                 SOC 2 CC7.2 (system monitoring)
version:         V10 (upgraded from V9 baseline)
```

Observability is not "metrics + dashboards." It is the discipline
that lets a single engineer answer, in 60 seconds: is the system
healthy now, was a recent change responsible for a degradation, and
where in the architecture is the problem. SLOs translate observability
into committed promises (to tenants, to regulators, to ourselves).
Without observability discipline, the regulated substrate (audit chain,
OTG axioms) cannot be trusted at runtime.

The V10 depth adds: per-signal concrete spec (OTel semantic
conventions, Prometheus naming, structured log schema, trace
propagation mechanics), full 22-SLO catalog with SLI definition
per SLO (numerator, denominator, exclusions, window, error budget,
alert thresholds, breach behavior), multi-window burn-rate alert
specification per Google SRE book, cardinality governance with
per-metric budgets and increase governance process, per-tenant and
per-region isolation detail, auditor-facing observability interface
spec, per-route SLO discipline, anomaly detection specification,
postmortem instrumentation, and failure modes expanded to 12.

---

## 1. The three signals (per OTel)

### 1.1 Traces

Specification basis: OpenTelemetry Tracing API/SDK v1.24;
semantic conventions `trace.http.*`, `trace.db.*`, `trace.messaging.*`,
`trace.rpc.*`.

Every inbound HTTP request produces a root span with:
- `http.request.method` (OTel semconv: string, e.g. `GET`)
- `url.path` (string; PII segments replaced with `{param}` template)
- `url.route` (normalized route pattern, e.g. `/api/v1/records/{id}`)
- `http.response.status_code` (int)
- `http.request.body.size` (int, bytes)
- `http.response.body.size` (int, bytes)
- `server.address`, `server.port` (string, int)
- `hesem.tenant_id` (string; custom HESEM attribute; always present)
- `hesem.route_class` (string; per E0 route class taxonomy)
- `hesem.request_id` (string; UUID; correlated with log `request_id`)
- `db.system`, `db.name`, `db.statement` (per db.* semconv; statement
  sanitized — parameter values replaced with `?`)

Span tree propagation:
- W3C Trace Context (`traceparent` header, RFC 9457 §3) used for
  inbound HTTP
- `traceparent` injected into all outbound HTTP calls, Redis commands
  (via custom instrumentation), RabbitMQ message headers
  (`traceparent` in AMQP application headers), and PostgreSQL
  advisory lock comments (`/* traceid=<id> */` appended to
  long-running queries)
- Worker processes (queue consumers) extract `traceparent` from
  message header and continue the trace; span kind = `CONSUMER`

Sampling strategy:
- Head sampling: deterministic ratio sampler at 10% for success
  traffic; 100% for all error spans (`status.code=ERROR`)
- Tail sampling: OTel Collector tail sampling processor retains 100%
  of slow spans (duration > p99 baseline × 2) and 100% of spans
  with attribute `hesem.regulated_event=true`
- Regulated tenants: minimum 10% success + 100% error regardless of
  global sample rate
- AI advisory spans: 100% retained regardless (per L4 evidence
  requirements)

Retention tiers:
- Hot: 30 days in OTel backend (Tempo or Jaeger); full trace
- Warm: 90 days in object storage (Pareto format); indexed by
  trace_id, tenant_id, route, error flag
- Cold: 1 year in cold storage per H5 audit retention floor; full
  raw spans preserved for audit

Per-tenant trace boundary: traces for tenant A cannot be queried
via tenant B's observability scope; enforced at OTel Collector
pipeline (tenant_id label routing to per-tenant Tempo namespace)
and at API layer (auditor query scope validated against calling
identity's tenant list).

### 1.2 Metrics

Specification basis: Prometheus data model; OTel Metrics API v1.24;
naming per `prometheus.io/docs/practices/naming/`.

Metric families used:

RED pattern (per service):
```
hesem_http_request_total{tenant_id, route_class, status_class, region}
  — counter; total requests; status_class ∈ {success, 4xx, 5xx}
hesem_http_request_errors_total{tenant_id, route_class, error_code, region}
  — counter; error requests; error_code from RFC 9457 type field
hesem_http_request_duration_seconds{tenant_id, route_class, region}
  — histogram; buckets: .005,.01,.025,.05,.1,.25,.5,1,2.5,5,10
```

USE pattern (per resource):
```
hesem_db_connection_pool_utilization{pool_name, region}
  — gauge; 0-1; ratio of active connections to pool max
hesem_db_connection_pool_saturation{pool_name, region}
  — gauge; queue depth of pending connection requests
hesem_redis_memory_utilization{instance, region}
  — gauge; 0-1; used_memory / maxmemory
hesem_rabbitmq_queue_depth{queue_name, tenant_id}
  — gauge; messages ready in queue
```

Feature-specific metrics:
```
hesem_ai_inference_duration_seconds{model_id, tier, tenant_id, region}
  — histogram; AI advisory inference latency
hesem_ai_calibration_score{model_id, tenant_id}
  — gauge; 0-1; model calibration score vs holdout set
hesem_ai_override_rate{model_id, tenant_id}
  — gauge; 0-1; ratio of AI recommendations overridden by humans
hesem_ai_fallback_total{model_id, tenant_id, reason}
  — counter; AI fallback invocations
hesem_audit_anchor_lag_seconds{tenant_id, region}
  — gauge; seconds since last successful merkle anchor
hesem_esig_verification_duration_seconds{tenant_id}
  — histogram; e-signature verification latency
hesem_worm_lock_total{tenant_id, record_type}
  — counter; WORM lock events (write-once lock applied)
hesem_erasure_total{tenant_id}
  — counter; data erasure events (GDPR right to erasure)
hesem_replication_lag_seconds{source_region, dest_region}
  — gauge; cross-region replication lag
hesem_evidence_write_duration_seconds{evidence_class, tenant_id}
  — histogram; evidence write latency (all EC classes)
```

Retention:
- Hot: 90 days in Prometheus (or Thanos) at full resolution (15s
  scrape interval)
- Warm: 1 year at 1-minute resolution (Thanos downsampling)
- Cold: per H5 floor at 1-hour resolution

### 1.3 Logs

Specification basis: NIST SP 800-92 §4; OTel Log Data Model v1.24;
ISO/IEC 27037 §8 (digital evidence integrity).

Schema: every log line is a single JSON object on stdout; no
multi-line log lines (container log driver cannot reliably assemble
them). Required fields:

```json
{
  "timestamp":    "2026-04-27T12:34:56.789Z",     // RFC 3339 nano
  "severity":     "info",                          // debug|info|warn|error|fatal
  "trace_id":     "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id":      "00f067aa0ba902b7",
  "request_id":   "018f3c4e-1a2b-7c8d-9e0f-1a2b3c4d5e6f",
  "tenant_id":    "tenant-abc",
  "service":      "hesem-api",
  "version":      "v3.14.0",
  "region":       "eu-west-1",
  "message":      "...",
  "event_kind":   "http|audit|sig|sec|privacy|ai|system",
  "pii_present":  false
}
```

Severity levels:
- `debug`: developer instrumentation; not emitted in PROD unless
  `LOG_LEVEL=debug` explicitly set (not permitted in PROD for
  regulated tenants)
- `info`: normal operation events
- `warn`: recoverable condition; SRE should be aware
- `error`: request failed; span marked ERROR; on-call must be able
  to act without additional context
- `fatal`: process will exit after emitting; use sparingly

Regulated event markers (`event_kind`):
- `audit` — audit evidence write; always retained; PII reading allowed
  in audit pipeline
- `sig` — e-signature event
- `sec` — security event (access control decision, auth failure)
- `privacy` — data erasure, consent change, subject access request
- `ai` — AI inference, calibration, override

PII redaction:
- Log emit middleware applies regex replacements for known PII
  patterns (email: `[EMAIL]`, phone: `[PHONE]`, Vietnamese CCCD:
  `[ID]`, card PAN: `[PAN]`) before writing to stdout
- `pii_present: true` flag is set on log lines where PII was found
  and redacted; `pii_present: false` if no PII patterns matched
- Audit pipeline receives un-redacted lines via separate sidecar
  stream (encrypted channel; not accessible to general log
  consumers)

Retention:
- All logs: 90 days hot in log backend (Loki or equivalent)
- `event_kind=audit|sig|sec|privacy`: minimum 7 years per H5;
  WORM-locked in cold storage
- `event_kind=ai`: 3 years per L4 model governance requirements
- General operational logs: 90 days; then deleted unless pinned by
  incident investigation

---

## 2. SLO catalog (the 22 SLOs)

Each SLO entry specifies: SLI definition (numerator / denominator /
exclusions), measurement window, target, error budget, alert
thresholds, and breach behavior.

### SLO-1 — API request latency p50 (read routes)

```
SLI           p50 of hesem_http_request_duration_seconds where
              route_class="read"
Numerator     requests completing at or below 100ms (p50 threshold)
Denominator   all valid read requests (excluding maintenance window,
              bulk route class, and tenant-declared freeze)
Exclusions    maintenance window per H6; tenant freeze; routes with
              route_class="bulk" or "long-running-ack"
Window        30 days rolling
Target        99.0%  (p50 ≤ 100ms for 99% of windows)
Error budget  1.0% of request-minutes = ~432 request-minutes/30d
Alert         fast-burn: p50 > 100ms sustained for 5min at >14.4×
              budget burn → SEV-2 page
              slow-burn: p50 > 100ms in 1h window at >6× burn → ticket
Breach        SRE Lead investigation; canary ramp halted; H8 CAPA
              if breach > 1h
```

### SLO-2 — API request latency p99 (read routes)

```
SLI           p99 of hesem_http_request_duration_seconds where
              route_class="read"
Numerator     requests completing at or below 800ms (p99 threshold)
Denominator   all valid read requests (same exclusions as SLO-1)
Exclusions    same as SLO-1
Window        30 days rolling
Target        99.5%
Error budget  0.5% of request-minutes
Alert         fast-burn: p99 > 800ms for 5min at >14.4× → SEV-2
              slow-burn: 1h + 6h windows at >6× → ticket
Breach        H8 CAPA; DB query plan review; index audit
```

### SLO-3 — API request latency p99 (write routes)

```
SLI           p99 of hesem_http_request_duration_seconds where
              route_class="write"
Numerator     requests completing at or below 1200ms
Denominator   all valid write requests excluding bulk
Window        30 days rolling
Target        99.5%
Error budget  0.5% of request-minutes
Alert         fast-burn: p99 > 1200ms for 5min at >14.4× → SEV-2
              slow-burn: 1h + 6h at >6× → ticket
Breach        investigate DB write path; saga overhead; H8 CAPA
```

### SLO-4 — API availability

```
SLI           proportion of requests returning non-5xx status
              (or timeout) per region
Numerator     requests with HTTP 1xx/2xx/3xx/4xx response
Denominator   all valid requests (excluding health check path
              /api/v1/health, maintenance window, and force-5xx
              circuit breaker test events)
Exclusions    maintenance window per H6; /api/v1/health; circuit
              breaker synthetic test events (tagged with header
              X-Hesem-Synthetic: true)
Window        30 days rolling
Target        99.95%
Error budget  0.05% of request-minutes ≈ 21.6 request-minutes/30d
Alert         fast-burn: 5min + 1h at >14.4× → SEV-1
              slow-burn: 1h + 6h at >6× → SEV-2
Breach        SEV-1 if availability drops below 99.9% instantaneously
              for > 5 minutes; full incident response per I3
```

### SLO-5 — E-signature verification latency

```
SLI           p95 of hesem_esig_verification_duration_seconds
Numerator     e-signature verifications completing at or below 500ms
Denominator   all valid e-signature verification calls
Exclusions    none (e-signature cannot be excluded by maintenance)
Window        30 days rolling
Target        99.9%
Error budget  0.1% of verification calls
Alert         fast-burn: p95 > 500ms for 5min at >14.4× → SEV-2
              slow-burn: 1h + 6h at >6× → ticket
Breach        21 CFR Part 11 §11.100 compliance at risk; Quality Lead
              notified immediately; H8 CAPA; stop new e-signature
              flows if p95 > 2000ms
```

### SLO-6 — Audit anchor freshness

```
SLI           hesem_audit_anchor_lag_seconds per tenant per region
Numerator     measurements where anchor lag < 90,000 seconds (25h)
Denominator   all measurements (scrape every 60s)
Exclusions    none (anchor lag cannot be excluded)
Window        7 days rolling
Target        100% (any breach is a compliance event)
Error budget  0 (no tolerance; 100% SLO)
Alert         ANY measurement where lag ≥ 86400s (24h) → SEV-1
              immediately; no burn-rate framing; single breach pages
Breach        SOC 2 CC7.2 evidence at risk; Compliance Lead and
              Quality Lead notified; investigation within 1h; H8 CAPA;
              if lag > 48h, tenant and DPO notification required
```

### SLO-7 — Evidence write latency

```
SLI           p95 of hesem_evidence_write_duration_seconds across
              all evidence classes (EC-1..EC-22)
Numerator     evidence writes completing at or below 200ms
Denominator   all valid evidence write calls
Exclusions    bulk evidence export operations (EC class EC-15
              batch export)
Window        30 days rolling
Target        99.9%
Error budget  0.1%
Alert         fast-burn: p95 > 200ms for 5min at >14.4× → SEV-2
              slow-burn: 1h + 6h at >6× → ticket
Breach        regulated workflows blocked if evidence cannot be
              written; Quality Lead notified; workflow pause per
              business decision
```

### SLO-8 — WORM lock latency

```
SLI           p99 of duration from evidence record creation to
              WORM lock applied; sourced from hesem_worm_lock_total
              event timestamps
Numerator     evidence records with WORM lock applied within 5s of
              creation
Denominator   all evidence records created
Exclusions    none
Window        7 days rolling
Target        99.95%
Error budget  0.05%
Alert         WORM lock delay > 30s for any record → SEV-2 (unlocked
              evidence is a compliance risk)
Breach        immediately quarantine un-locked records; apply lock
              manually via admin CLI; H8 CAPA on WORM pipeline
```

### SLO-9 — Data erasure completion

```
SLI           proportion of GDPR Art. 17 erasure requests completed
              within 30 days of subject request receipt
Numerator     erasure requests completed within 30 calendar days
Denominator   all valid erasure requests received
Exclusions    requests under legal hold (Art. 17(3) exceptions,
              documented in erasure_hold table)
Window        90 days rolling
Target        100%
Error budget  0 (GDPR Art. 17 is a legal obligation)
Alert         any erasure request at day 25 without completion →
              SEV-2; Privacy Lead paged
Breach        GDPR breach notification obligation may apply;
              Privacy Lead + DPO notified; H8 CAPA; regulatory
              impact assessment
```

### SLO-10 — Batch release certification latency

```
SLI           p95 of time from batch creation to batch release
              certification record written
Numerator     batches certified within 4 hours of creation
Denominator   all batches requiring certification
Exclusions    batches placed on hold (quality_hold=true);
              batches with pending CAPA linkage
Window        30 days rolling
Target        99%
Error budget  1%
Alert         fast-burn: >14.4× budget at 5min + 1h → SEV-2
              slow-burn: >6× at 1h + 6h → ticket
Breach        manufacturing impact; Operations Lead notified;
              H8 CAPA on certification workflow bottleneck
```

### SLO-11 — AI advisory inference latency (Tier-1)

```
SLI           p95 of hesem_ai_inference_duration_seconds where
              tier="tier1" (synchronous, user-visible)
Numerator     inferences completing at or below 200ms
Denominator   all valid Tier-1 AI inference calls
Exclusions    cold-start inference (first call after model load;
              tagged cold_start=true); maintenance window
Window        30 days rolling
Target        99.5%
Error budget  0.5%
Alert         fast-burn: p95 > 200ms at >14.4× for 5min → SEV-2
              slow-burn: 1h + 6h at >6× → ticket
Breach        AI Lead notified; fallback mode enabled; H8 CAPA
```

### SLO-12 — AI advisory inference latency (Tier-2)

```
SLI           p95 of hesem_ai_inference_duration_seconds where
              tier="tier2" (async, background)
Numerator     inferences completing at or below 2000ms
Denominator   all valid Tier-2 AI inference calls
Exclusions    cold-start; batch inference jobs
Window        30 days rolling
Target        99.0%
Error budget  1.0%
Alert         fast-burn: p95 > 2000ms at >14.4× for 5min → SEV-2
              slow-burn: 1h + 6h at >6× → ticket
Breach        AI Lead notified; queue backlog investigated; H8 CAPA
```

### SLO-13 — AI model drift (calibration score)

```
SLI           hesem_ai_calibration_score per model_id per tenant_id
Numerator     measurements where calibration score ≥ 0.85 (threshold)
Denominator   all calibration score measurements (daily batch eval)
Exclusions    models in retraining window (model_status=retraining)
Window        30 days rolling
Target        95% (some drift is expected; sustained drift is the
              failure)
Error budget  5% of daily measurements
Alert         ANY single measurement < 0.70 → SEV-2 (acute drift);
              3 consecutive days < 0.85 → ticket (gradual drift)
Breach        model retired from active inference; fallback to
              previous model version; AI Lead + Quality Lead notified;
              H8 CAPA on model drift governance; per L3 §6
```

### SLO-14 — AI human override rate

```
SLI           hesem_ai_override_rate per model_id per tenant_id
Numerator     days where override rate ≤ 15% (threshold)
Denominator   all days with AI advisory activity ≥ 10 inferences
Exclusions    days with fewer than 10 inferences (insufficient signal)
Window        30 days rolling
Target        90% (sustained high override rate indicates model
              usefulness degradation)
Error budget  10% of days
Alert         override rate > 30% for 7 consecutive days → SEV-3
              ticket; AI Lead review required
Breach        model usefulness investigation; consider retraining;
              H8 CAPA; per L2 §6
```

### SLO-15 — Cross-region replication lag

```
SLI           hesem_replication_lag_seconds per source-dest pair
Numerator     measurements where lag < 60s
Denominator   all measurements (scrape every 30s)
Exclusions    none (replication cannot be excluded by maintenance)
Window        30 days rolling
Target        99.9%
Error budget  0.1% of 30-second intervals ≈ 43.2 minutes/30d
Alert         lag > 120s for 5 consecutive measurements → SEV-2
              lag > 300s for any measurement → SEV-1
Breach        DR decision gate triggered per I4; cross-region
              failover readiness assessed; H8 CAPA
```

### SLO-16 — DR RTO (Recovery Time Objective)

```
SLI           DR drill execution: time from declared disaster to
              workload restored and SLO-4 green in failover region
Numerator     DR drills completing within 4 hours
Denominator   all DR drills conducted
Exclusions    none
Window        90 days (quarterly drill)
Target        100%
Error budget  0
Alert         any drill exceeding 4 hours → SEV-2; DR Lead paged
Breach        DR plan update required before next drill; H8 CAPA
              on RTO gap; if real incident exceeds 4h: SEV-1
```

### SLO-17 — Backup integrity verification

```
SLI           proportion of scheduled backup integrity checks passing
              (restore test confirms backup is restorable and data
              is consistent per checksum)
Numerator     backup checks with result=pass
Denominator   all scheduled backup checks (daily for PROD; weekly
              for DR replica)
Exclusions    checks cancelled due to maintenance window
Window        30 days rolling
Target        100%
Error budget  0
Alert         any backup check failure → SEV-2; on-call SRE + I4
              Lead paged immediately
Breach        backup regime at risk; previous successful backup
              identified; investigate storage layer; H8 CAPA; tenant
              notification if RPO gap > 24h
```

### SLO-18 — Cost adherence per tenant

```
SLI           monthly infrastructure cost per tenant relative to
              agreed budget band (± 20% of provisioned baseline)
Numerator     months where cost within band
Denominator   all billed months
Exclusions    months where tenant explicitly triggered over-quota
              load test (tagged cost_test=true in CTR)
Window        90 days rolling
Target        99%
Error budget  1% of months
Alert         cost > 120% of baseline for 3 consecutive days → ticket
              (I6 cost governance)
Breach        cost anomaly investigation; scale-in if possible;
              tenant notification; I6 CAPA
```

### SLO-19 — Metric cardinality adherence

```
SLI           proportion of active time series below cardinality
              budget (100k unique label sets per metric per tenant)
Numerator     metrics with active series count < 100k
Denominator   all tracked metric families
Exclusions    metrics in approved cardinality increase (§5 increase
              governance)
Window        30 days rolling
Target        99%
Error budget  1%
Alert         any metric > 80k series (warning); any metric > 100k
              (breach) → auto-throttle new series + alert SRE Lead
Breach        H7 Class C cardinality increase request; H8 CAPA on
              label governance
```

### SLO-20 — Validation evidence freshness

```
SLI           all validation evidence records (EC-1) in PROD have
              not passed their declared validity window
Numerator     EC-1 records with validation_expiry > NOW()
Denominator   all EC-1 records for active regulated capabilities
Exclusions    none (expired validation is always a breach)
Window        always (continuous; measured every hour)
Target        100%
Error budget  0
Alert         any EC-1 record within 30 days of expiry → ticket
              (renewal planning); any record past expiry → SEV-2
Breach        regulated workflow using expired validation evidence
              is suspended; Quality Lead + Compliance Lead notified;
              revalidation initiated; H8 CAPA
```

### SLO-21 — Edge gateway uptime per site

```
SLI           proportion of minutes where edge gateway at each
              manufacturing site is reachable (ICMP + HTTP health
              check from central monitor)
Numerator     check-minutes where both ICMP and health check pass
Denominator   all check-minutes
Exclusions    minutes during planned gateway maintenance (in freeze
              calendar)
Window        30 days rolling
Target        99.9%
Error budget  0.1% = 43.2 minutes/30d
Alert         fast-burn at >14.4× → SEV-2 (manufacturing site
              connectivity at risk)
              slow-burn at >6× → ticket
Breach        manufacturing operations may be impacted; Operations
              Lead notified; local failover activated per I4 §5;
              H8 CAPA on network path
```

### SLO-22 — Customer onboarding within tier SLA

```
SLI           proportion of new tenant onboardings completed within
              the contracted SLA window (Tier 1: 5 business days,
              Tier 2: 10 business days, Tier 3: 20 business days)
Numerator     onboardings completing within tier SLA
Denominator   all new tenant onboarding requests
Exclusions    onboardings blocked by tenant-side data provision
              delay (documented in onboarding_ticket with reason=
              customer-delay)
Window        90 days rolling
Target        90%
Error budget  10%
Alert         onboarding at day (SLA - 2) without completion → ticket
Breach        customer impact; Customer Success Lead notified; H8
              CAPA on onboarding automation gaps
```

---

## 3. SLI definition discipline

Every SLI promoted to SLO must carry all of the following fields.
Without all fields present, the SLI cannot be promoted; SLO promotion
is itself an H7 Class B+ change (because tenants rely on it).

```
NAME              canonical identifier (SLO-<N>; human slug)
DESCRIPTION       what it measures, stated in user-outcome language
                  (not implementation language)
NUMERATOR         precise definition of "good event"; the query or
                  formula; units; which metric(s) or log query
DENOMINATOR       precise definition of "valid event"; why excluded
                  events are not counted
EXCLUSIONS        enumerated list of excluded event types with
                  rationale; must not be used to hide failures
WINDOW            measurement window duration; rolling vs calendar
DIMENSIONS        label dimensions the SLI is sliced by (tenant_id,
                  region, route_class, etc.)
SOURCE            specific OTel metric name, log query, or trace
                  statistic; version of OTel semconv relied upon
ALIVENESS         emit cadence; alert if metric not received within
                  2× cadence (dead-man alert)
OWNER             individual responsible for SLI correctness; drift
                  from expected behavior triggers H8 CAPA from owner
ERROR BUDGET      numeric: (1 - target) × denominator per window
ALERT_FAST        fast-burn window + burn multiplier threshold
ALERT_SLOW        slow-burn window + burn multiplier threshold
BREACH_ACTION     who is paged; what action is required; escalation
                  path if breach > defined duration
```

SLI registry stored in `slo_definition` table (`id`, `slug`, `sli_json`
JSONB, `owner_id`, `version`, `promoted_at`, `deprecated_at`); each
field above maps to a key in `sli_json`. Promotion writes a new row
with bumped version; old version retained for audit.

---

## 4. Burn-rate alerting (per Google SRE book)

Burn-rate alerting addresses the core problem: a threshold alert on
raw error rate fires too late (budget exhausted) or too early (spike
that self-resolves). Burn-rate quantifies how fast the error budget
is being consumed.

### Definitions

```
error_budget     = (1 - SLO_target) × window_in_minutes
                   for SLO-4 (99.95%, 30d):
                   error_budget = 0.0005 × 43200 = 21.6 request-minutes

burn_rate(w)     = (bad_requests in window w / total_requests in w)
                   / (1 - SLO_target)
                   burn_rate=1.0 means budget consumed exactly at
                   window end; burn_rate=14.4 means exhausted in 2 days
```

### Multi-window alert specification (per Google SRE book §5.3)

Applied to every SLO in the 22-SLO catalog. Windows and multipliers:

```
ALERT TIER   SHORT WINDOW  LONG WINDOW  BURN MULTIPLIER  SEVERITY
Page          5 min         1 hour       14.4×            SEV-1/2
              (both windows must exceed threshold simultaneously)
Ticket        1 hour        6 hours      6×               SEV-3
Warning       3 days        —            1×               dashboard
```

Rationale for window pairs:
- 5min alone: catches spikes that self-resolve; generates noise.
  Requiring both 5min AND 1h ensures the degradation is sustained.
- 1h + 6h: catches slow burns that individually don't look alarming
  but will exhaust budget within a week.
- 3d at 1×: budget is being consumed at exactly the agreed rate;
  no action required but SRE should be aware at the next standup.

### Alert routing

Alerts emitted from Prometheus Alertmanager (or OTel Alert Processor):
- SEV-1/2 page: PagerDuty with `routing_key=sre-primary`; tenant_id
  included in alert body; per-tenant escalation policy honored (some
  tenants have dedicated on-call)
- SEV-3 ticket: GitHub Issue auto-created with label `slo-burn`;
  assigned to on-call SRE for that week
- Warning: Grafana dashboard badge; reviewed at weekly SRE standup

Dead-man switch: each SLO-sourcing metric must emit at least once per
2× its scrape interval; if metric absent → alert
`HesmSliMetricAbsent{slo_id}` fires at SEV-2 (missing metric is worse
than a degraded metric because the SLO is unobserved).

### Alert hygiene

An alert that fires and is ignored for 3 consecutive occurrences is
flagged for review at the next SRE weekly. Chronic false positives
are H8 CAPA targets: either the threshold is wrong or the SLO target
is wrong. Silencing an alert requires:
- Reason (free text + structured code: `KNOWN_INCIDENT | PLANNED_MAINT
  | FALSE_POSITIVE | INVESTIGATING`)
- Expiry (max 24 hours; auto-re-enables; re-silencing requires new
  justification)
- Actor (PagerDuty user identity; retained in audit log)

---

## 5. Cardinality governance

Prometheus cardinality is the product of the number of unique label
value combinations per metric family. High cardinality (e.g., one time
series per user_id) can OOM the Prometheus server and makes TSDB
compaction prohibitively slow.

### Allowed label dimensions

```
LABEL                CARDINALITY ESTIMATE    RATIONALE
tenant_id            ≤ 1000                  bounded by business
                                             growth; always required
route_class          ≤ 9 (per E0)            bounded by taxonomy
status_class         3 (success/4xx/5xx)     bounded
region               ≤ 10                    bounded by deployment
feature_id           ≤ 50                    bounded by product
                                             roadmap
model_id             ≤ 20                    bounded by AI model
                                             registry
evidence_class       ≤ 22 (EC-1..EC-22)      bounded by spec
pool_name            ≤ 10                    bounded by infra
queue_name           ≤ 50                    bounded by domain
                                             design
```

All of the above can be combined on a single metric only if the
cross-product cardinality < 100k for that metric. Checked at metric
registration (custom Prometheus exporter validates cardinality budget
before registering a new label set).

### Forbidden label dimensions

```
LABEL           REASON
user_id         unbounded; unique per user; use trace + sampled
                log with user_id in span attribute instead
record_id       unbounded; unique per record; use OTel exemplar
                (exemplar links a histogram bucket to a trace_id
                for a representative slow request)
request_body    unbounded; also PII risk
ip_address      unbounded; also privacy risk (GDPR);
                use region label instead
arbitrary_tag   any label derived from request body or query param
                is forbidden; must be pre-declared in metric
                definition
PII fields      email, name, phone; forbidden in any label
```

Enforcement: metric registration code in `HesmMetrics` PHP class
validates label names against allowlist at class instantiation;
throws `CardinalityPolicyViolation` if forbidden label used; test
at S2 (unit test for all metric registrations).

### Per-metric cardinality budget

Default: 100k unique label sets per metric family per tenant.

Monitoring: `prometheus_tsdb_head_series` per job; alert at 80k
(warning), action at 100k (auto-throttle: new label combinations
are dropped and a `hesem_cardinality_throttle_total` counter
incremented).

### Cardinality increase governance process

1. Engineer identifies need for higher cardinality (e.g., new label
   dimension required for a new SLO).
2. H7 Class C change request: includes metric name, current cardinality,
   proposed new cardinality, new label(s), justification, impact
   analysis.
3. SRE Lead reviews: approves if new cardinality < 500k AND new label
   is on allowlist or allowlist is also being updated.
4. If new label is not on allowlist: H7 Class B (label dimension
   policy change requires Platform Lead + SRE Lead approval).
5. After approval: `metric_cardinality_budget` table updated; Prometheus
   rule regenerated; monitoring thresholds adjusted.

---

## 6. Per-tenant and per-region observability isolation

### Tenant boundary

Telemetry pipeline architecture:
- OTel Collector deployed per cluster; receives spans + metrics + logs
  from all pods via OTLP gRPC (port 4317)
- Collector processor chain: (1) attribute detection extracts tenant_id
  from span attribute or log field; (2) routing processor routes to
  per-tenant pipeline; (3) per-tenant pipeline applies: sampling
  policy, PII redaction filter, cardinality budget enforcer
- Backend storage: per-tenant Loki stream (label `tenant_id`); per-
  tenant Prometheus namespace (label `tenant_id` on all metrics);
  per-tenant Tempo trace namespace

Cross-tenant query: forbidden at the API layer (dashboard query
validates calling identity's tenant scope; cross-tenant query returns
403 + audit log entry). Enforced via OPA policy on dashboard proxy.

### Data residency for telemetry

- OTel Collector for region-bound tenants runs in-region (not
  forwarded to central)
- Prometheus (or Thanos) for region-bound tenants runs in-region
  with regional storage backend
- Loki for region-bound tenants: regional object storage backend
  (e.g., AWS S3 `eu-west-1` for EU-resident tenants)
- Cross-region aggregation (for platform-level DORA KPIs): uses
  anonymized, aggregated metrics only (tenant_id hashed to opaque ID
  for non-tenant-specific platform metrics); raw telemetry stays
  in-region

### Sampling floors for regulated tenants

Regulated tenants (any tenant in a regulated vertical pack, J1..J5):
- Error spans: 100% retained (no sampling)
- Audit event logs (`event_kind=audit|sig|sec|privacy`): 100% retained
- AI inference spans: 100% retained
- Success spans: minimum 10% retained (never less)
- Metrics: no sampling (all metric points retained at full resolution)

---

## 7. Auditor-facing observability

### Purpose and scope

An auditor (internal quality auditor, external ISO/SOC 2 auditor,
regulatory inspector) must verify at runtime that:
1. The system is meeting its SLO targets (→ SLO-4 availability, SLO-6
   anchor freshness, SLO-20 evidence freshness)
2. No banned decisions have been executed (AI governance per L1)
3. Audit chain is current and anchored
4. Incidents are logged and resolved within MTTR target
5. Validation evidence is current (no expired records)

### Interface specification

Access: read-only auditor account created via `auditor_account_request`
workflow (H3 §7); scoped to one tenant; time-limited (default 30 days;
extendable by Compliance Lead); all auditor queries logged.

Portal page: `/portal/auditor-dashboard` (feature-flagged; accessible
only to roles with `auditor` permission on the tenant).

Dashboard sections:

```
SECTION              CONTENT                       DATA SOURCE
SLO Performance      SLO-1..SLO-22 current status  Prometheus/Thanos
                     vs target; 30d trend;           query via Grafana
                     error budget remaining          read-only proxy
Anchor Freshness     hesem_audit_anchor_lag_         same
                     seconds per tenant; last
                     anchor timestamp; anchor
                     hash (linkable to merkle
                     log)
Validation Evidence  EC-1 records by type;           audit_evidence
                     oldest record age; any           DB read-only
                     records approaching expiry       view
AI Governance        banned decision attempts         ai_decision_log
                     = 0 expected; override          + calibration
                     rate trend; calibration         metrics
                     score per model
Incidents            SEV-1/2 in past 90 days;        incident_log DB
                     MTTR actual vs target            read-only view
Evidence Complete-   per-release evidence            evidence_export
ness                 completeness score (H3          API
                     §4 export dry-run result)
```

Access audit: every auditor page load and every dashboard query is
logged as `event_kind=audit` with `actor=auditor-account-id`,
`scope=tenant_id`, `query_type`, `timestamp`; retained per H5 7-year
floor.

Data residency for auditor queries: auditor dashboard proxy routes
queries to in-region Prometheus and in-region DB for region-bound
tenants; no cross-region data access.

Read-only evidence dashboard (per H3 §7): auditor can export evidence
in structured format (JSON or CSV) for offline analysis; export itself
creates an EC-4 (transaction) evidence record as proof of auditor access.

---

## 8. Per-route SLO discipline

### SLO required before graduation

Every API route must have an SLO defined before it graduates to
L4 maturity (per B7 route maturity levels). Without an SLO entry in
`slo_definition` referencing the route's `route_class`, the route
cannot be toggled to `production` status in the route registry.
CI enforces this: a check at S2 compares routes in `route-map.json`
with `production` status against `slo_definition` entries.

### SLO lifecycle for routes

```
ROUTE STATE    SLO STATE              REQUIREMENT
draft          SLO optional           no enforcement
staging        SLO draft              SLI must be defined;
                                      no error budget yet
L4 / prod      SLO active             target + error budget +
                                      alerts configured + fire-tested
deprecated     SLO sunset             30-day sunset period;
                                      SLO retired with route
                                      after 0 traffic verified
```

SLO draft: SLI fields filled, target proposed based on PRE-PROD
baseline (p95/p99 at 10× load), error budget computed. Reviewed by
SRE Lead. Approved as H7 Class B+ before route goes to CANARY.

### Route-class default SLO thresholds (E0 taxonomy)

```
ROUTE_CLASS             P95 TARGET   P99 TARGET   AVAILABILITY
read                    300ms        800ms         99.9%
write                   500ms        1200ms        99.5%
long-running-ack        500ms        —             99.9%
                        (initial ack; background completion has
                        separate SLO on job completion time)
bulk                    backend-promised; no user-facing latency
                        SLO; job completion time SLO per batch
workspace-projection    200ms        500ms         99.9%
ai-advisory-sync        200ms (T1)   500ms (T1)    99.5%
ai-advisory-async       2000ms (T2)  —             99.0%
health                  50ms         100ms         99.99%
                        (health route SLO failure is SEV-1)
```

---

## 9. Anomaly detection

SLOs catch known patterns relative to a committed target. Anomaly
detection catches unknown deviations: a new behavior that is within
the SLO threshold but statistically unusual.

### Seasonal baseline

Per-route per-tenant per-hour-of-week baseline computed from rolling
4-week history (672 hourly buckets). Baseline consists of:
- `mean`: average request rate (requests/minute)
- `stddev`: standard deviation of request rate
- `p95_latency`: 95th percentile latency
- `error_rate_mean`, `error_rate_stddev`

Stored in `anomaly_baseline` table; recomputed nightly by batch job.

### Detectors

```
DETECTOR                SIGNAL              THRESHOLD          SEVERITY
Spike detection         hesem_http_request  > mean + 4σ for    SEV-3 ticket
                        _total rate         5 consecutive
                                            minutes
Latency anomaly         p95 latency         > baseline_p95 ×   SEV-3 ticket
                                            2.0 for 10min
                                            AND not SLO breach
Error rate anomaly      error rate          > baseline mean +  SEV-2 if
                                            3σ for 5min        correlated
                                                               with deploy
PII redaction spike     pii_present=true    rate increase       SEV-2; Privacy
                        log events          > 200% of baseline  Lead paged
AI calibration drift    calibration score   decrease > 0.05    SEV-3; AI
                        delta (daily)       vs previous day    Lead ticket
AI fallback rate spike  hesem_ai_fallback   > 5× baseline      SEV-2; AI
                        _total rate         for 30min          Lead paged
Tenant usage cliff      per-tenant request  drop > 80% of      SEV-3; check
                        rate                baseline for 15min  tenant network
CDC lag spike           rabbitmq_queue      > 2× baseline for  SEV-2
                        _depth              10min
```

Correlation: spike detection and error rate anomaly are correlated
with recent deploy events (from `deploy_evidence` table); if a detector
fires within 30 minutes of a deploy, the alert includes the deploy
reference and suggests rollback consideration.

### Noise optimization

Quarterly review of anomaly detectors:
- Compute false positive rate (alerts that fired without follow-up
  action)
- Detectors with false positive rate > 30% in quarter are either
  threshold-adjusted or retired
- Retirement of a detector is an H7 Class C change

---

## 10. Postmortem instrumentation

After every SEV-1 or SEV-2 incident, the postmortem is supported by
automated timeline reconstruction.

### Automatic timeline reconstruction

The `incident_timeline_builder` service (triggered by incident close
in PagerDuty via webhook) reconstructs the incident timeline by:

1. Query `incident_log` table for incident ID; extract `declared_at`,
   `resolved_at`, `trace_ids_involved`, `tenant_ids_involved`.

2. Fetch all spans with `trace_id` in `trace_ids_involved` AND
   `timestamp` between `declared_at - 1h` and `resolved_at + 30min`
   from Tempo; correlate by `hesem.tenant_id`.

3. Fetch all log lines with `trace_id` in involved set OR
   `event_kind` ∈ {`audit`, `sec`, `ai`} AND timestamp in window;
   merge with span timeline.

4. Fetch all deploy events from `deploy_evidence` table in window;
   overlay on timeline with marker type `deploy`.

5. Fetch all feature flag changes from `feature_flag_audit` in window;
   overlay with marker type `flag_change`.

6. Fetch all SLO-metric time series from Prometheus for affected
   routes in window; identify exact degradation start timestamp.

7. Output: structured JSON timeline with events in chronological
   order, categorized by type (span, log, deploy, flag, slo_breach,
   slo_restore); timeline stored as EC-17 (incident) evidence record.

### Postmortem required sections

```
SECTION                     SOURCE
Timeline                    automated (§above)
Root cause                  human; per H8 root cause depth categories
Instrumentation gap         what signal was missing; backlog items created
Detection gap               what alert should have fired earlier; SLO
                            or anomaly detector adjustment required
Response gap                process or training issue if detection was
                            adequate but response was slow
Evidence                    EC-17 record + postmortem document stored
                            as EC-7 (certification-relevant); per H4
Follow-up actions           linked to H8 CAPA items; each item has
                            owner, due date, verification method
```

---

## 11. Failure modes

```
FM1   SLO target set by aspirational figure not informed by baseline
      Root cause: SLO promoted without PRE-PROD baseline data
      Detection: SLO promotion gate requires baseline_p95_latency
                 field in SLI definition from PRE-PROD load test
      Recovery: SLO demoted to draft; baseline data collected;
                H8 CAPA on SLO promotion governance

FM2   Cardinality breach
      Root cause: new label dimension introduced without H7 approval;
                  or existing label value space grew beyond estimate
      Detection: hesem_cardinality_throttle_total counter increments;
                 Prometheus series count alert
      Recovery: auto-throttle drops new label combinations; alert
                fires; investigate label source; H7 Class C or B to
                approve new budget or restrict label; H8 CAPA

FM3   Trace missing trace_id propagation across queue boundary
      Root cause: RabbitMQ message published without traceparent
                  in AMQP application headers
      Detection: OTel semconv compliance check in PR review (custom
                 semgrep rule finds queue publish calls without header
                 injection); manual review of distributed trace
                 completeness in staging
      Recovery: H8 CAPA; instrumentation backlog item; PR check
                enforces header injection for all publish calls

FM4   Log emits PII (redaction failed for new PII pattern)
      Root cause: new field introduced with PII content but not
                  added to redaction pattern list
      Detection: pii_present=true rate spike anomaly detector; or
                 found in log audit
      Recovery: privacy incident per I3 + I7; DPO and affected
                tenant notified; pattern added to redaction list;
                affected logs quarantined; H8 CAPA on redaction
                coverage discipline

FM5   Burn-rate alert chronically noisy (>30% false positive rate)
      Root cause: SLO target too tight for actual baseline; or
                  exclusion list missing legitimate excluded events
      Detection: false positive rate computed quarterly in detector
                 review (§9 noise optimization)
      Recovery: alert threshold adjusted or SLO target revised
                (H7 Class B for SLO change); H8 CAPA on SLO
                calibration discipline

FM6   Auditor query returns data from a different tenant
      Root cause: dashboard proxy missing tenant_id scope enforcement
      Detection: auditor query scope validator; cross-tenant query
                 test in S2 E2E suite
      Recovery: SEV-1; auditor account suspended; access log reviewed;
                Privacy Lead + tenant DPO notified; H8 CAPA on
                auditor portal isolation; per B6 C5

FM7   SLO error budget exhausted before detection alert fires
      Root cause: alert thresholds too loose; budget too small for
                  actual traffic volume
      Detection: weekly SLO review compares error budget remaining
                 at end of week; persistent near-exhaustion is a signal
      Recovery: deploy freeze (CS-A policy) if regulated SLO;
                investigation; H7 reclassify if regulated impact;
                H8 CAPA on burn-rate alert configuration

FM8   Anchor freshness alert fails to fire (dead-man switch absent)
      Root cause: anchor freshness metric not emitting (anchor job
                  crashed silently)
      Detection: dead-man switch: hesem_audit_anchor_lag_seconds
                 must update every 3600s; absence of update → alert
      Recovery: SEV-2; anchor job investigated and restarted; H8
                CAPA on anchor pipeline reliability

FM9   Telemetry retention below H5 floor (logs deleted early)
      Root cause: object storage lifecycle policy misconfigured;
                  cost optimization change accidentally shortened
                  retention
      Detection: H5 floor compliance check (weekly job); compares
                 oldest retained log/span age vs required floor per
                 event_kind
      Recovery: SEV-2; restore from backup if possible; Privacy +
                Compliance Lead notified; H8 CAPA on retention
                governance

FM10  Anomaly detector silenced during incident (alarm fatigue)
      Root cause: on-call silenced multiple detectors at incident
                  start without expiry; incident resolved; silences
                  not cleared
      Detection: silence audit: any silence older than 24h without
                 renewal generates alert to SRE Lead
      Recovery: silences reviewed and cleared or renewed with
                fresh justification; H8 CAPA on silence hygiene

FM11  Seasonal baseline corrupted by an incident in the training
      window
      Root cause: 4-week baseline recomputation included a week
                  with major incident (atypical traffic); baseline
                  now reflects incident behavior as "normal"
      Detection: baseline anomaly check: if stddev of new baseline
                 > 3× historical stddev, flag for human review
      Recovery: SRE Lead reviews flagged baseline; marks incident
                week as excluded from baseline computation;
                recompute; H8 CAPA on baseline exclusion policy

FM12  Per-route SLO missing for a route promoted to production
      Root cause: S2 SLO check bypassed (manual override) or route
                  added to route registry without going through PR
      Detection: daily audit job checks all production-status routes
                 in route_registry against slo_definition; reports
                 any route without a matching active SLO
      Recovery: route demoted to staging status until SLO defined
                and approved; H8 CAPA on SLO gate bypass
```

---

## 12. KPIs

```
KPI                                         TARGET     MEASUREMENT
SLO catalog coverage (routes with SLO)      100%       daily audit
SLI dead-man alert coverage                 100%       weekly
Burn-rate alert false positive rate         < 10%      quarterly
Cardinality budget compliance               100%       continuous
Anomaly detector noise rate                 < 20%      quarterly
Postmortem timeline reconstruction success  100%       per SEV-1/2
Auditor query response time                 < 5s p95   auditor portal log
WORM lock lag (median)                      < 2s       evidence write log
Replication lag within SLO-15 target        99.9%      per SLO-15
DR RTO drill success rate                   100%       per SLO-16
Backup integrity check pass rate            100%       per SLO-17
```

---

## 13. Roles and authority (RACI)

```
Role             SLI-DEF  SLO-DEF  ALERT  CARDINALITY  RESIDENCY  AUDIT-VIEW
SRE Lead         A        A        A      A            A          A
Platform Lead    R        R        R      R            R          R
Security Lead    C        C        C      -            R          A
Privacy Lead     C        C        C      -            A          A
Compliance Lead  C        A        C      -            A          A
Engineering Lead R        R        R      R            -          C
Domain Lead      R        R        R      -            -          R
AI Lead          R(AI)    R(AI)    R(AI)  C            -          R(AI)
Vertical Pack Ld C(pack)  C(pack)  C      -            R(pack)    R(pack)
Tenant Admin     -        -        I      -            I          R(tenant)
Auditor          -        -        I      -            -          R(scoped)
```

---

## 14. Cross-references

- B9 — observability architecture; OTel collector configuration
- B6 C1 — audit chain anchor freshness; WORM policy
- B6 C2 — OTG axiom; per SLO-6 and OTG axiom regression
- B6 C5 — cross-tenant isolation enforced in observability pipeline
- H1 §3 — DPA notification windows; auditor access windows
- H3 §7 — auditor-facing observability interface; read-only account
- H4 — evidence classes: EC-1 validation, EC-2 anchor, EC-3 telemetry,
       EC-17 incident (postmortem); EC-4 transaction (auditor access)
- H5 — telemetry retention floors per event_kind
- H6 — periodic review; maintenance windows (excluded from SLI)
- H7 — SLO promotion as Class B+ change; cardinality increase as
       Class C; alert silence as audited action
- H8 — CAPA trigger per SLO breach pattern and per FM
- I1 — deploy gates evaluate SLO burn at canary + ramp
- I3 — incident response from burn-rate alerts; SEV classification
- I4 — DR drill SLO-16; backup SLO-17
- I6 — cost governance SLO-18
- I7 — security anomaly routing; KEV-related SLO-19 implications
- I8 — per-tenant observability; tenant freeze honored in SLI
       exclusions
- K5 §11 — DORA Elite targets measured via OTel metrics
- L2 §6 — AI feature KPIs (SLO-13, SLO-14)
- L3 — AI lifecycle drift detection (SLO-13 calibration score)
- L4 — AI red-team probe; AI evidence retention
- M5 — SLO directory canonical; DORA KPI dashboard
- M9 — cross-reference master

---

## 15. Decision phrase

I2_OBSERVABILITY_AND_SLO_V10_UPGRADE_COMPLETE

S4-06_I1_I2_DEEP_UPGRADE_COMPLETE

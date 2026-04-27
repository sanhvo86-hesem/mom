# B9 — Observability and Metrics

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B9 (three-pillar overview without semconv, instrumentation contract, SLO mapping, or cardinality governance)  
**Cross-references:** B1 §3 L8, B6 C9, I2, I3, L1 §7, L4 §5, M5

---

## §1 Three-Signal Architecture

HESEM emits three correlated signal types, all transported via OTLP/gRPC to the
OpenTelemetry Collector deployed as a DaemonSet in the `hesem-observability`
namespace (per B7 §1.2). The Collector fans signals out to backend stores based
on signal type and tenant classification.

### 1.1 Metrics

**Format:** Prometheus exposition (text-based) for scrape-compatible clients;
OTLP/gRPC for SDK-emitted metrics. VictoriaMetrics is the metrics backend for
the hot tier (< 14 days); Thanos or equivalent long-term storage for the warm
tier (14 days – 13 months, aligned with annual SLO reporting windows).

**Per-tenant labels:** Every metric series carries `tenant_id` as a mandatory
label. The Collector enforces this via a `metricstransform` processor that
injects `tenant_id` from the OTLP resource attribute if not already present
on the data point. Cross-tenant metric aggregation is performed only in the L8
Grafana alerting layer by the SRE team (never by application code).

**Cardinality budget:** Per I2 §5, total active time series per region is
capped at 20 million. Cardinality budget per tenant is 50,000 series for Core
tier and 200,000 for Enterprise. A Cardinality Exporter job runs every 15 minutes
and publishes `hesem_metric_cardinality{tenant_id, metric_name}` to the monitoring
cluster; series approaching 80% of budget trigger a SEV-3 alert.

### 1.2 Logs

**Format:** Structured JSON only. Every log line must include: `timestamp` (RFC 3339
nanosecond precision), `severity` (DEBUG/INFO/WARN/ERROR), `trace_id` (W3C
trace context), `span_id`, `service.name`, `tenant_id`, `message` (human-readable
summary), and an optional `attributes` object for structured key-value data.

**PII redaction:** The OTel Collector processor chain includes a `redaction`
processor that replaces values matching PII patterns (email regex, E.164 phone
regex, IBAN regex, and the platform's internal user ID regex) with `<REDACTED>`
before logs are forwarded to Loki (log aggregation backend). A daily audit runs
over the previous day's log samples and verifies that no PII patterns survive
in the stored logs; a leak triggers FM-B9-05 (see §18).

**Retention:** Logs are retained in Loki for 90 days (hot + warm); then compressed
to object storage (cold) for the applicable H5 retention floor per data
classification. Auditor query logs (§13) are retained perpetually.

**Log backends:** Loki (Grafana stack) for application and API logs; Kubernetes
audit logs shipped directly to object storage (WORM) for the security audit trail.

### 1.3 Traces

**SDK:** OpenTelemetry SDK for PHP (L4/L7 API layer) and Go (L8 relay, Edge
Gateway). The SDK is initialised once at application bootstrap; no per-request
SDK re-initialisation.

**Sampling:** Head-based sampling at 10% for routine traffic; tail-based sampling
(Jaeger / OTel Tail Sampling Processor) at 100% for error spans, slow spans
(> 2× p95 baseline), regulated-action spans (those carrying `authority.class >=
Tier-2` attribute), and banned-decision attempt spans. This ensures that 100%
of regulated and error traces are captured without exploding storage costs for
routine health-check traffic.

**Per-tenant scope:** Traces carry `tenant_id` as a resource attribute. The
Collector routes traces to a per-tenant trace partition in the Jaeger/Tempo
backend; cross-tenant trace query is restricted to L8 SRE principals only.

**Trace correlation:** Every OTG event carries `trace_id` and `span_id` (stored
in `otg_event.payload.otel`), enabling correlation from an OTG event back to
the originating request trace. Every Loki log line carries the same `trace_id`.
The Grafana Explore UI links log lines → traces → metrics for a unified debugging
view.

---

## §2 OTel Semantic Convention Compliance

### 2.1 Resource Attributes (mandatory on all signals)

Every signal emitted by any HESEM service MUST carry the following OTel resource
attributes, populated at service startup:

| Attribute | Value source | Example |
|---|---|---|
| `service.name` | Helm chart value `service.name` | `hesem-api`, `hesem-cdc-relay` |
| `service.version` | Git tag at build time (per SLSA provenance) | `v10.3.1` |
| `service.namespace` | Kubernetes namespace | `hesem-core` |
| `deployment.environment` | ENV var `HESEM_ENV` | `prod`, `pre-prod`, `dev` |
| `cloud.region` | Cloud provider metadata API | `eu-west-1` |
| `cloud.availability_zone` | Cloud provider metadata API | `eu-west-1a` |
| `tenant_id` | Session context; populated per-request, not at startup | `<uuid>` |
| `pack.id` | Tenant pack configuration | `pharma`, `auto`, `aero`, `md`, `food` |
| `k8s.pod.name` | Kubernetes downward API | auto-populated |
| `k8s.node.name` | Kubernetes downward API | auto-populated |

### 2.2 Span Attributes per Route and State Machine Transition

Every API route span carries:
- `http.method`, `http.route` (templated path), `http.status_code` — OTel HTTP server semconv.
- `http.request.body.size`, `http.response.body.size` — for bandwidth accounting.
- `hesem.tenant_id` (extension; mirrors resource attribute for query efficiency).
- `hesem.principal_id` — the authenticated principal; SHA3-256-hashed before storage if PII risk.
- `hesem.command_id` — the L3 command ID for the mutation (where applicable).

Every state-machine transition span carries:
- `hesem.sm.id` — state machine identifier (e.g. `SM-6`).
- `hesem.sm.root_kind` — the root type (e.g. `NQCASE`, `LOT`).
- `hesem.sm.root_id` — SHA3-256 hash of the actual root ID (not the raw UUID, to avoid PII via inference).
- `hesem.sm.source_state` — the state before the transition.
- `hesem.sm.target_state` — the state after the transition.
- `hesem.sm.event` — the named transition event (e.g. `approve_disposition`).
- `hesem.sm.duration_ms` — transition duration in milliseconds (also captured as a metric histogram).

### 2.3 Per-Evidence Attributes

Spans that emit H4 evidence carry:
- `hesem.evidence.class` — the H4 EC class (EC-2, EC-16, EC-22).
- `hesem.evidence.id` — the evidence record ID (hashed).
- `hesem.evidence.emit_latency_ms` — time from mutation commit to evidence emit confirmation.

### 2.4 Per-Authority-Decision Attributes

Every call to the L2 `decide()` function (per B2 §5) produces a child span with:
- `hesem.authority.principal_id` — hashed.
- `hesem.authority.action` — the requested action.
- `hesem.authority.class_required` — the minimum authority class required.
- `hesem.authority.class_resolved` — the authority class the principal actually holds.
- `hesem.authority.outcome` — `ALLOW`, `DENY`, `NEEDS_QUORUM`, `NEEDS_STEP_UP`.
- `hesem.authority.quorum_satisfied` — boolean; for quorum actions.
- `hesem.authority.banned_flag` — boolean; true if the action is a banned decision.
- `hesem.authority.cache_hit` — boolean; true if the decision was served from cache.

---

## §3 Per-Service Instrumentation Contract (per Layer)

Every service at each B1 layer MUST emit the following spans and metrics.
This is a hard contract enforced by CI (per B6 C9 testing discipline).

**L1 (Identity & Authentication):** Inbound authentication request span with
`http.method`, `http.route`, `http.status_code`. Failed authentication counter
`hesem_auth_failures_total{tenant_id, reason}`. Session token issue latency
histogram `hesem_token_issue_duration_ms`. Cache hit/miss for identity
validation `hesem_identity_cache{result=hit|miss}`.

**L2 (Authority & Policy):** `decide()` span per authority decision (per §2.4).
Decision latency histogram `hesem_authority_decide_duration_ms{outcome}`. Cache
hit/miss `hesem_authority_cache{result}`. Banned-decision attempt counter
`hesem_banned_decision_attempts_total{tenant_id, bd_id, layer=runtime}`.

**L3 (Workflow & Command Bus):** Saga lifecycle spans: per-step Try/Confirm/Cancel
with `hesem.saga.id`, `hesem.saga.step`, `hesem.saga.outcome`. Saga timeout counter
`hesem_saga_timeouts_total{saga_kind}`. Command enqueue/dequeue latency
`hesem_command_bus_latency_ms{command_kind}`. Per-saga compensation counter
`hesem_saga_compensations_total{saga_kind}`.

**L4 (Domain Roots & Mutations):** Per-mutation transaction span with
`hesem.sm.*` attributes (§2.2). Mutation throughput counter
`hesem_mutations_total{tenant_id, root_kind, event}`. Per-SM transition duration
`hesem_sm_transition_duration_ms{sm_id, event}`. Evidence emit latency
`hesem_evidence_emit_duration_ms{evidence_class}`.

**L5 (OTG / Persistence):** Postgres client spans with `db.statement`
(sanitised), `db.operation`, `db.name`, `db.sql.rows_affected`. OTG write
latency histogram `hesem_otg_write_duration_ms`. Axiom guard evaluation latency
`hesem_axiom_guard_duration_ms{axiom_id}`. OTG axiom violation counter
`hesem_axiom_violations_total{axiom_id, tenant_id}`. Connection pool utilisation
gauge `hesem_db_pool_utilisation{pool_name}`.

**L6 (Frontend / Presentation):** Core Web Vitals reported via
OpenTelemetry Browser SDK: LCP, FID/INP, CLS as histograms per route per tenant.
Frontend error counter `hesem_frontend_errors_total{tenant_id, route, error_type}`.
Accessibility scan result (from CI; not runtime) per §8 CI gate.

**L7 (API Gateway / Public Surface):** Rate limiting counter
`hesem_ratelimit_rejections_total{tenant_id, route}`. Request/response size
histograms. Authentication middleware latency `hesem_auth_middleware_duration_ms`.
HMAC verification counter `hesem_hmac_verify{result=pass|fail}` for integration
endpoints.

**L8 (Platform / SRE):** CDC relay lag gauge `hesem_cdc_lag_seconds{slot_name}`.
Outbox relay delivery counter `hesem_outbox_delivery_total{channel_id, result}`.
Anchor job completion counter `hesem_anchor_job_total{tenant_id, result}`. Anchor
lag gauge `hesem_anchor_lag_hours{tenant_id}`. WORM export job status
`hesem_worm_export{tenant_id, partition, result}`.

---

## §4 RED Method Metrics per Route

For every HTTP API route, the following RED metrics are emitted with labels
`{tenant_id, route, method}`:

- **Rate:** `hesem_http_requests_total` (counter) — requests per second (computed
  as rate over 1m window in alerting rules).
- **Errors:** `hesem_http_errors_total{status_class=4xx|5xx}` — subdivided by
  status class. Error ratio = `hesem_http_errors_total / hesem_http_requests_total`.
- **Duration:** `hesem_http_request_duration_ms` (histogram with buckets at
  10, 25, 50, 100, 200, 500, 1000, 2000, 5000ms) — p50/p95/p99 computed
  from histogram quantiles in Grafana.

Alerting rule: for any route where `p95 > M5_SLO_TARGET` sustained for 5 minutes,
fire a SLO burn rate alert at the appropriate severity (per multi-window burn rate
rule, §6).

---

## §5 USE Method Metrics per Resource

**CPU:** `hesem_cpu_utilisation_ratio{pod, node}` gauge (0.0–1.0). Saturation:
`hesem_cpu_throttling_ratio{pod}`. Errors: `hesem_cpu_errors_total{node}` (from
kernel metrics).

**Memory:** `hesem_memory_utilisation_ratio{pod}`. Saturation:
`hesem_oom_kills_total{pod}`. Errors: none (OOM kills captured as saturation).

**Postgres:** Utilisation: `hesem_db_connections_active / hesem_db_connections_max`
per pool. Saturation: `hesem_db_connections_waiting` (connection queue depth).
Errors: `hesem_db_query_errors_total{error_code}`.

**Redis:** Utilisation: `redis_memory_used_bytes / redis_maxmemory_bytes`. Saturation:
`redis_blocked_clients`. Errors: `redis_rejected_connections_total`.

**RabbitMQ:** Utilisation: `rabbitmq_queue_messages{queue}` gauge. Saturation:
`rabbitmq_queue_messages_ready{queue} > threshold`. Errors:
`rabbitmq_channel_errors_total`.

**Network:** Utilisation: `container_network_transmit_bytes_total / link_capacity`
per pod. Saturation: `node_network_transmit_drop_packets_total`. Errors:
`node_network_receive_errs_total`.

**Disk/WAL:** `node_filesystem_avail_bytes / node_filesystem_size_bytes` for Postgres
PVC. WAL retention gauge: `pg_wal_size_bytes`. Alert: WAL retention > 50% of disk
triggers RB-DR alert per B7 §3.1.

---

## §6 SLO Instrumentation (all 22 SLOs per M5)

Multi-window burn rate alerting follows the Google SRE Workbook Chapter 5
methodology: one fast burn alert (1h window at 14× burn rate = consumes 5% of
monthly error budget in 1 hour) and one slow burn alert (6h window at 6× burn
rate). Both must fire for a page to trigger (AND condition reduces false positives).

| SLO | Signal source metric | Good event definition | Window | Alert |
|---|---|---|---|---|
| SLO-1 decide() p95 < 20ms | `hesem_authority_decide_duration_ms` histogram | `p95 < 20ms` | 1m evaluation | Fast+slow burn |
| SLO-2 API p95 < 200ms | `hesem_http_request_duration_ms` | `p95 < 200ms` per route | 1m | Fast+slow burn |
| SLO-3 Lot genealogy p95 < 1s | `hesem_otg_genealogy_query_duration_ms` | `p95 < 1000ms` | 5m | Fast+slow burn |
| SLO-4 OTG write < 50ms p95 | `hesem_otg_write_duration_ms` | `p95 < 50ms` | 1m | Fast+slow burn |
| SLO-5 MV freshness < 5s | `hesem_mv_refresh_lag_seconds` | `lag < 5s` per MV | 30s | Fast burn (real-time) |
| SLO-6 Axiom violations = 0/7d | `hesem_axiom_violations_total` | `increase(7d) == 0` | 7d | Immediate on any > 0 |
| SLO-7 Signature verify < 3s p95 | `hesem_signature_verify_duration_ms` | `p95 < 3000ms` | 1m | Fast+slow burn |
| SLO-8 Audit trail query < 100ms p95 | `hesem_http_request_duration_ms{route="/api/v1/audit/*"}` | `p95 < 100ms` | 1m | Fast+slow burn |
| SLO-9 Frontend LCP < 2.5s p75 | `web_vitals_lcp_ms` histogram | `p75 < 2500ms` | 5m | Slow burn |
| SLO-10 Anchor lag < 25h | `hesem_anchor_lag_hours` | `gauge < 25` | 5m | Alert at 20h (pre-breach) |
| SLO-11 Trace ingest lag < 30s | `hesem_otel_collector_export_queue_lag_seconds` | `lag < 30s` | 1m | Fast burn |
| SLO-12 Log ingest lag < 60s | `hesem_loki_ingest_lag_seconds` | `lag < 60s` | 1m | Fast burn |
| SLO-13 CDC lag < 60s | `hesem_cdc_lag_seconds` | `lag < 60s` | 30s | Alert at 45s |
| SLO-14 Webhook delivery success >= 99% | `hesem_outbox_delivery_total{result="success"} / total` | ratio >= 0.99 | 5m | Slow burn |
| SLO-15 Saga completion p95 < 5min | `hesem_saga_duration_ms` | `p95 < 300000ms` | 5m | Fast+slow burn |
| SLO-16 Recall scope query < 5s | `hesem_mv_recall_scope_query_duration_ms` | `p95 < 5000ms` | 5m | Fast burn |
| SLO-17 WORM export success 100% | `hesem_worm_export{result}` | all partitions `result=success` | Daily | Alert on first failure |
| SLO-18 Per-tenant cost ≤ K1 envelope | `hesem_tenant_cost_usd` | `value <= K1_limit` | Monthly | Monthly report alert |
| SLO-19 Cross-tenant access = 0/y | `hesem_cross_tenant_attempts_total` | `increase(365d) == 0` | Continuous | Immediate on any > 0 |
| SLO-20 PII redaction compliance >= 99.99% | `hesem_pii_redaction_compliance_ratio` | `ratio >= 0.9999` | 30d | Alert at 99.95% |
| SLO-21 Accessibility 0 critical violations | axe-core CI result (not runtime metric) | CI pass | Per build | Build failure |
| SLO-22 Banned-decision attempts = 0 | `hesem_banned_decision_attempts_total` | `increase(any_window) == 0` | Continuous | Immediate on any > 0 |

---

## §7 Per-Tenant Observability

### 7.1 Per-Tenant Labels

Every metric series, log line, and trace span carries `tenant_id`. The OTel Collector
enforces this via a `metricstransform/resourcedetection` processor chain. If a signal
arrives at the Collector without a `tenant_id` resource attribute, the Collector tags
it with `tenant_id=PLATFORM` (treated as vendor-side telemetry). No signal may be
forwarded to a per-tenant backend without a verified `tenant_id`.

### 7.2 Cross-Tenant Aggregation

Aggregation across tenants is permitted only at the L8 SRE layer in Grafana,
using queries that explicitly anonymise tenant identity (e.g. summing request
rates across all tenants without displaying individual tenant labels). Application
code at L1..L7 may never issue a metric query that aggregates across tenant IDs.

### 7.3 Per-Tenant Dashboard

Each tenant has access to a read-only Grafana dashboard (DL-15 per F2 dashboard
catalog) showing: API latency p95 per route, error rates, active user count, OTG
write rate, and MV freshness. The dashboard is filtered to `tenant_id =
${TENANT_ID}` via a Grafana variable bound to the authenticated principal's tenant
scope. Tenants cannot modify the dashboard template; they can export snapshot reports.

### 7.4 Auditor Portal Observability

The auditor portal (per H3 §7) exposes a restricted observability subset to
external auditors: audit trail query latency, signature verification event count,
anchor lag gauge, and axiom violation count. All queries are logged to the
perpetual auditor query log (§13). Auditors cannot access raw metric data or
trace content.

---

## §8 Per-Region Observability

Each region runs its own OTel Collector, Loki instance, VictoriaMetrics cluster,
and Jaeger/Tempo instance. Per-region SLI/SLO measurements are computed
independently — a region can meet its SLO targets while another region is
degraded. The global SLO (reported to customers) is the worst-case across all
regions where the tenant's data is active.

Cross-region consistency for the anchor lag SLO-10 is verified by comparing
`hesem_anchor_lag_hours` across all regions for a given tenant; a divergence
> 2h triggers a cross-region anchor reconciliation alert (per B3 §13).

Log retention in each region follows B5 §5 per-region data residency rules.
EU-sovereign region logs do not replicate to non-EU Loki instances. ITAR-flagged
logs from J3 tenants are written only to the US-region Loki instance.

---

## §9 Cardinality Governance (per I2 §5)

### 9.1 Allowed Label Classes

Labels that identify a fixed set of values (low cardinality):
`tenant_id` (bounded by license count), `route` (bounded by API endpoint count),
`sm_id` (bounded by SM-1..SM-14 + packs), `evidence_class` (EC-2/EC-16/EC-22),
`outcome` (ALLOW/DENY/NEEDS_QUORUM), `result` (success/failure), `region`,
`environment`, `pack_id`, `severity`.

### 9.2 Forbidden Label Classes

Labels that produce unbounded cardinality and are explicitly forbidden:
`user_id` (unbounded; use `hesem.principal_id` in traces, not metrics),
`record_id` (unbounded; use traces for record-level correlation),
`request_id` (unbounded; use `trace_id` instead),
arbitrary business tags (e.g. product codes, lot numbers),
`error_message` (arbitrary string; use `error_code` from a controlled vocabulary).

Forbidden labels detected by the Collector's `metricstransform` processor are
dropped and a `hesem_forbidden_label_drops_total{label_name}` counter is
incremented. A non-zero value triggers a SEV-3 code review of the emitting service.

### 9.3 Per-Metric Budget and Breach Alert

The Cardinality Budget Table (maintained in I2 §5) lists the allowed series count
per metric name. The Cardinality Exporter checks actual series counts every 15
minutes; if any metric exceeds 80% of its budget, a SEV-3 alert fires with the
offending metric name, the contributing label values, and the top contributing
tenants. At 95% of budget, the metric is throttled (new label combinations are
dropped until cardinality drops).

### 9.4 Cardinality Increase Governance

Adding a new label to an existing metric, or increasing a metric's cardinality
budget, requires a H7 Class C change (lightest governance class). The change must
include a cardinality estimate (label value count × metrics emission frequency)
and a revised budget entry in I2 §5. No metric may be deployed to production with
a new label without the budget entry being updated.

---

## §10 Anomaly Detection

### 10.1 Per-Route and Per-Tenant Baseline

A 7-day rolling baseline is computed for each `{route, tenant_id}` combination
using VictoriaMetrics `forecast` function (or Grafana ML plugin). The baseline
produces a predicted p95 latency and error rate for each 5-minute bucket. An
anomaly alert fires if the observed value exceeds `baseline + 3σ` for two
consecutive 5-minute windows.

### 10.2 Per-AI-Feature Drift Detection (per L3 §4)

The AI advisory engine emits a `hesem_ai_advisory_confidence_score` histogram per
advisory type. A 30-day rolling baseline is computed per advisory type. If the
median confidence score drops > 20% below baseline for 48 hours (indicating model
drift), a drift detection alert fires and a red-team review is scheduled (per L4 §5).

### 10.3 Per-Region Anomaly Correlation

If anomalies are detected simultaneously in > 50% of active regions for the same
metric, the L8 alert is escalated to a "multi-region anomaly" classification,
which bypasses the slow-burn window and pages the incident commander immediately.

### 10.4 Calibration KPI (per L2 §6)

The authority `decide()` function's cache hit rate is tracked as `hesem_authority_cache{result=hit}`.
A sustained hit rate < 80% for > 15 minutes indicates authority configuration
churn (many authority entries changing, causing cache invalidations) and triggers
a SEV-3 alert for investigation.

---

## §11 Audit Chain Anchor Observability

**Anchor cron health:** The audit anchor CronJob (per B3 §8.3) emits a heartbeat
metric `hesem_anchor_job_last_success_timestamp_seconds{tenant_id}` immediately
upon successful completion. A Grafana "dead man's switch" alert fires if this
metric is not updated within 26 hours for any regulated tenant.

**Anchor lag SLO-10:** `hesem_anchor_lag_hours{tenant_id}` is a gauge computed as
`(now - max(otg_event.occurred_at WHERE anchor_seq IS NULL)) / 3600`. Alert at
20h (pre-breach); SEV-1 page at 25h.

**Per-anchor verification sample:** After each anchor job completes, the integrity
verification job samples 1% of the events in the newly anchored batch, recomputes
their SHA3-256 hashes, and compares against the stored values. If any mismatch is
detected, `hesem_anchor_integrity_errors_total{tenant_id}` is incremented and a
SEV-1 alert fires immediately.

---

## §12 Banned-Decision Observability (per L1 §7)

Three counters, one per defense layer of the triple-defense architecture (B6 C15):

- `hesem_banned_decision_attempts_total{layer=ci, bd_id}` — incremented by the
  CI gate when a code change attempts to allow a banned decision; triggers a
  build failure.
- `hesem_banned_decision_attempts_total{layer=runtime, bd_id, tenant_id}` —
  incremented by the L2 `decide()` function when a BD-classified action is
  attempted at runtime and rejected.
- `hesem_banned_decision_attempts_total{layer=offline, bd_id, tenant_id}` —
  incremented by the daily OTG axiom A-05 reconciliation when a BD-classified
  event is found in the graph with an AI principal.

Any non-zero value in any counter triggers an immediate SEV-1 page with full
context (principal_id hash, bd_id, timestamp, tenant_id). The SLO-22 error budget
is exhausted at the first event — there is zero tolerance. The alert routes to
both the Engineering incident commander and the Compliance officer simultaneously.

Cross-links: L4 §5 (red-team) and L5 (OTG axiom A-05) are the sources of the
runtime and offline layer counters respectively.

---

## §13 Auditor / Regulator Instrumentation

Every query issued by an external auditor or regulator through the auditor portal
(H3 §7) or the E6 audit trail API is logged to a dedicated `auditor_query_log`
table in Postgres. This log is separate from the general application log; it is:

- Retained perpetually (per H5 §4 regulation-facing log retention).
- WORM-exported to object storage monthly (per B6 C10).
- Protected by a dedicated RLS policy that allows read access only to the
  Compliance Lead and platform security principals.

Metrics on auditor usage: `hesem_auditor_query_total{tenant_id, query_type}` and
`hesem_auditor_query_duration_ms{query_type}`. These metrics are reported to
the tenant's compliance dashboard monthly.

Per-inspector portal metrics (for regulatory inspectors using the read-only
inspection portal): page load time (SLO-9 threshold applies), query latency,
document export success rate.

---

## §14 Cost Observability

**Per-tenant cost attribution:** The I6 cost model aggregates CPU-seconds,
memory-byte-seconds, storage-byte-seconds, and network-byte counts per `tenant_id`
label from the Kubernetes metrics server and cloud provider billing API. The result
is published as `hesem_tenant_cost_usd{tenant_id, cost_category}` monthly. The
K1 cost envelope target for each tier is stored as a Grafana constant; an alert
fires if any tenant exceeds their envelope by > 10% for two consecutive months.

**Per-AI-feature cost:** AI inference calls are tracked via
`hesem_ai_inference_cost_usd{tenant_id, advisory_type}`. Per L2 §9, AI feature
cost is capped at a per-tenant monthly budget; approaching 80% of budget triggers
a proactive notification to the tenant.

**Cost SLO-18 burn alert:** `hesem_tenant_cost_usd` is compared against the K1
envelope monthly. A K1 overrun activates a cost burn rate alert (analogous to
error budget burn rate) that flags the specific cost category driving the overrun.

---

## §15 Game-Day Observability

During DR drills (per I4 §4) and game-day exercises (per I3 §7), the following
additional signals are captured:

- `hesem_game_day_active{scenario}` — a gauge set to 1 during the exercise;
  used to filter dashboards to game-day view.
- `hesem_dr_rto_seconds{scenario}` — the measured RTO for each exercise scenario;
  compared against the I4 target (< 4h for full region failure).
- `hesem_dr_rpo_seconds{scenario}` — the measured RPO (data loss window) for each
  scenario; compared against the I4 target (0 committed transactions lost for
  synchronous replica failover).
- Trace sampling: during a game-day exercise, head-based sampling is set to 100%
  for all services in the affected region to capture the full failure mode response.

Game-day results are stored as annotated Grafana snapshots; the snapshots are
retained for 3 years and reviewed annually by the SRE team to verify that DR
capabilities are improving or holding steady.

---

## §16 Privacy Observability

- `hesem_pii_redaction_compliance_ratio{tenant_id}` — the fraction of API
  responses containing PII fields that had them correctly redacted; computed by
  the automated API response scanner (B6 C13 testing discipline). Target: >= 99.99%.
  Alert at < 99.95%.
- `hesem_subject_rights_request_duration_days{request_type}` — the elapsed days
  since a data subject rights request (erasure, access) was received; alert if
  any open request approaches 28 days (GDPR 30-day limit with 2-day buffer).
- `hesem_cross_region_transfer_blocked_total{source_region, destination_region,
  reason}` — counts of cross-region data transfers blocked by the B5 §5 residency
  gate. Any ITAR-related block triggers an immediate SEV-1 alert with the originating
  service and transfer target.

---

## §17 Per-Pack Overlay

**J1 Pharma:**
- `hesem_dscsa_suspect_product_window_hours{tenant_id}` — time elapsed since a
  DSCSA suspect-product alert was received without resolution; alert at 23h (1h
  before FDA 24h response window expires).
- `hesem_fmd_alert_unresolved_total{tenant_id}` — count of unresolved EU FMD alerts;
  any > 0 after 1h triggers SEV-2.
- `hesem_qp_release_pending_hours{tenant_id, batch_id}` — hours a batch has been
  waiting for QP release; alert if > 8 business hours.

**J2 Auto:**
- `hesem_ppap_submission_overdue_total{tenant_id, oem}` — PPAP submissions overdue
  past the OEM-agreed submission date.
- `hesem_edi_ack_latency_seconds{tenant_id, oem}` — EDI 855 acknowledgment latency
  per OEM; alert if > 1800s (30 minutes).
- `hesem_fai_cycle_duration_days{tenant_id, part_number}` — First Article Inspection
  cycle time; tracked for OEM on-time delivery commitments.

**J3 Aero:**
- `hesem_itar_access_outside_region_total` — any ITAR data access from outside the
  US region; SEV-1 on any > 0.
- `hesem_fai_open_duration_days{tenant_id}` — FAI records open beyond the AS9100D
  required timeline.

**J4 Medical Device:**
- `hesem_vigilance_reportability_window_hours{tenant_id, incident_id}` — time
  remaining before the MDR Article 87 reporting deadline (15 days for serious
  incidents); alert at 48h remaining.
- `hesem_gudid_submission_pending_days{tenant_id}` — UDI records pending GUDID
  submission beyond the 5-business-day window.

**J5 Food:**
- `hesem_haccp_ccp_excursion_open_total{tenant_id, ccp_id}` — count of open CCP
  excursions (temperature or other parameter out of Critical Limit); any > 0 triggers
  immediate production hold alert.
- `hesem_fsma_trace_request_elapsed_hours{tenant_id, request_id}` — hours elapsed
  since an FDA §204 trace-back request was received; alert at 20h (4h before 24h
  deadline).

---

## §18 Failure Modes

**FM-B9-01 OTel Collector Outage**
- Trigger: OTel Collector pod crash; signal export queue fills to capacity; SDK
  drops signals after 5s buffer exhaustion.
- Severity: SEV-2 (data loss of low-cardinality telemetry); SEV-1 if traces for
  regulated actions are lost.
- Recovery: Kubernetes will restart the Collector pod (liveness probe, 30s timeout).
  SDK buffers for 5s before dropping. If Collector is down > 30s: alert; SRE
  investigates; if regulated trace loss confirmed, manual incident correlation
  from `otg_event` payload (which stores `trace_id`).

**FM-B9-02 Cardinality Blow-Up**
- Trigger: A new code deployment emits a high-cardinality label (e.g. `record_id`);
  metric series count exceeds 95% of budget within minutes.
- Severity: SEV-2; VictoriaMetrics performance degrades; scrape targets time out.
- Recovery: Collector throttles the offending metric (drops new label combinations).
  SRE identifies the offending service via `hesem_forbidden_label_drops_total`;
  hotfix deployment removes the forbidden label; cardinality returns to normal.

**FM-B9-03 Tail Sampling Skew**
- Trigger: The tail sampling processor's decision cache fills up during a traffic
  spike; some error spans are sampled at the head-based rate (10%) instead of 100%.
- Severity: SEV-3; some error traces are missed; RCA may be incomplete.
- Recovery: Increase tail sampling decision cache size in Collector config; re-deploy.
  Compensate by querying `otg_event` records directly for the affected time window.

**FM-B9-04 Trace Ingestion Lag (SLO-11 breach)**
- Trigger: `hesem_otel_collector_export_queue_lag_seconds > 30` sustained for
  2 minutes; Jaeger/Tempo backend under pressure.
- Severity: SEV-2 if lag > 60s; SEV-1 if traces for regulated actions are
  unresolvable in the debugging window.
- Recovery: Scale Tempo/Jaeger ingest workers; increase OTel Collector batch size.
  If backend storage is full: run retention cleanup job; add storage capacity.

**FM-B9-05 Log PII Leak (redaction failure)**
- Trigger: Daily PII audit scan detects a PII pattern (email, phone, user ID) in
  Loki-stored logs for the previous day.
- Severity: SEV-1; potential GDPR Article 33 notification.
- Recovery: Identify the log line and service; patch the log statement (do not log
  PII raw); redact the Loki log entry (Loki log deletion API); assess whether
  the log data was accessed by any external party; notify DPO; assess breach.

**FM-B9-06 Anchor Metric Missing (dead-man's switch fires)**
- Trigger: `hesem_anchor_job_last_success_timestamp_seconds` not updated within
  26 hours for a regulated tenant.
- Severity: SEV-1; triggers RB-INC-004.
- Recovery: Check CronJob execution log; restart if failed; verify Postgres
  connectivity; run anchor job manually; verify anchor lag returns to < 2h.

**FM-B9-07 Banned-Decision Counter Non-Zero**
- Trigger: Any `hesem_banned_decision_attempts_total{layer=runtime}` > 0.
- Severity: SEV-1; immediate page to incident commander + compliance officer.
- Recovery: Identify the principal, action, and timestamp from the alert labels;
  verify the action was blocked (check OTG for absence of COMMITTED event with
  that command_id); investigate how the attempt occurred; CAPA.

---

## §19 KPIs

All 22 SLOs in M5 must be measurable and reported via the instrumentation in §6.
Additionally:

- **Cardinality budget compliance:** `max(hesem_metric_cardinality / cardinality_budget)` across
  all metrics < 0.80 (80% of budget). Reported monthly.
- **Trace ingest lag (SLO-11):** `hesem_otel_collector_export_queue_lag_seconds p95 < 30s`.
- **Log ingest lag (SLO-12):** `hesem_loki_ingest_lag_seconds p95 < 60s`.
- **Signal completeness:** Fraction of regulated SM transitions with a corresponding
  OTel trace found in Jaeger/Tempo >= 99.9% (cross-correlated via `otg_event.otel.trace_id`).

---

## §20 Cross-References

- **B1 §3 L8:** Observability infrastructure (Collector, VictoriaMetrics, Loki, Jaeger)
  is deployed at L8; every layer L1..L9 emits to L8.
- **B6 C9:** This chapter is the canonical implementation of the C9 Observability
  cross-cutting concern; B6 C9 cross-links here.
- **I2:** I2 (Observability Architecture) is the canonical operational specification;
  B9 is the architecture reference. I2 §5 (cardinality governance) is the source of
  budget figures cited in §9.
- **I3:** Alerts defined in §6 fire into the I3 incident management process;
  severity classification follows I3 §3.
- **L1 §7:** Banned-decision observability (§12) implements the L1 §7 monitoring
  requirement for the AI governance layer.
- **L4 §5:** Red-team schedule referenced in §10.2; AI drift detection counters
  feed the L4 red-team review agenda.
- **M5:** SLO directory is the authoritative source of all targets cited in §6;
  this chapter does not define SLO targets independently.

---

```
S1-07_B9_OBSERVABILITY_DEEP_UPGRADE_COMPLETE
```

# S1-07 — B9 Observability + Metrics

```
prompt_id:        S1-07
stream:           1
sequence:         7 of 9
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baseline:
   PART_B_ARCHITECTURE_MASTER/B9_OBSERVABILITY_AND_METRICS.md
3. Cross-references: B1 (L8), B6 (cross-cutting),
   I2 (observability + SLO), I3 (incident),
   M5 (SLO directory)
4. Standards / patterns:
   - OpenTelemetry semantic conventions (full)
   - Prometheus / VictoriaMetrics exposition
   - Loki / log aggregation patterns
   - Jaeger / tail-based sampling
   - Grafana / dashboard discipline
   - Google SRE Workbook (signal types; SLO methodology)
   - RED method (rate / errors / duration) for services
   - USE method (utilization / saturation / errors) for resources
```

## Deliverable

```
PART_B_ARCHITECTURE_MASTER/B9_OBSERVABILITY_AND_METRICS.md
```

## Depth requirements

```
1.  Three-signal architecture
    - Metrics (Prometheus exposition; per-tenant labels;
      cardinality budget per I2 §5)
    - Logs (structured JSON; trace_id correlated; PII redaction
      per I7 §9)
    - Traces (OTel SDK; head + tail sampling; per-tenant scope)

2.  OTel semantic convention compliance
    - Resource attributes (service.name; service.version;
      tenant_id; deployment.environment; cloud.region;
      pack.id)
    - Span attributes per route per state-machine transition
    - Per-state attribute (workflow.state; sm.id; root.kind;
      root.id)
    - Per-evidence attribute (evidence.class; evidence.id)
    - Per-decision attribute (authority.class; quorum.satisfied;
      banned.flag)

3.  Per-service instrumentation contract
    Every service MUST emit (per L1..L8 layer):
    - Inbound request span
    - Outbound RPC + DB query + cache + queue spans
    - Per-mutation transaction emit
    - Per-evidence emit
    - Per-error problem-detail
    - Per-decision authority outcome
    - Per-cache hit/miss
    - Per-saga step + compensation

4.  Per-route metric set (RED)
    - rate (req/sec per tenant + per route)
    - errors (per status class per tenant)
    - duration (p50 / p95 / p99 per tenant + per route)

5.  Per-resource metric set (USE)
    - utilization (CPU / memory / network / IO)
    - saturation (queue depth; pool exhaustion)
    - errors (filesystem; disk; network)

6.  SLO instrumentation per SLO directory (M5)
    Per SLO: which signal source; which aggregation; which
    burn-rate alert config (multi-window per Google SRE)

7.  Per-tenant observability
    - Per-tenant labels everywhere (per B6 C5 + per I2 §5)
    - Cross-tenant aggregation only at L8 (no leaks)
    - Per-tenant dashboard (DL-15 per F2)
    - Auditor portal observability subset (per H3 §7)

8.  Per-region observability
    - Per-region SLI / SLO; cross-region consistency
    - Per-region log retention (per H5)

9.  Cardinality governance (per I2 §5)
    - Allowed label classes
    - Forbidden label classes (user_id; record_id; arbitrary tag)
    - Per-metric budget; breach alert
    - Increase governance (H7 Class C)

10. Anomaly detection
    - Per-route + per-tenant baseline
    - Per-AI-feature drift detection (per L3 §4)
    - Per-region anomaly correlation
    - Calibration KPI per L2 §6

11. Audit chain anchor observability
    - Anchor cron health metric
    - Anchor lag SLO-10
    - Per-anchor verification sample

12. Banned-decision observability (per L1 §7)
    - Attempt counter per principal per layer (CI / runtime /
      offline)
    - SEV-1 alert on any non-zero
    - Per L4 + L5 cross-link

13. Auditor / regulator instrumentation
    - Per-auditor query log retained perpetually (per H5)
    - Per-inspector portal metrics

14. Cost observability
    - Per-tenant cost attribution (per I6)
    - Per-AI-feature cost (per L2 §9)
    - Cost SLO-18 burn alert

15. Game-day observability
    - Per-DR-drill telemetry (per I4 §4)
    - Per game-day scenario per I3 §7

16. Privacy observability
    - PII redaction compliance metric
    - Subject-rights cycle SLA metric
    - Cross-region transfer attempts blocked

17. Per-pack overlay
    Per-pack metric set (e.g., DSCSA suspect-product window
    metric; PPAP submission metric; FAI cycle metric;
    vigilance reportability metric; HACCP CCP excursion metric)

18. Failure modes
    - OTel collector outage
    - Cardinality blow-up
    - Sampling skew
    - Trace ingestion lag
    - Log redaction failure
    - Per-anchor metric missing

19. KPIs (sustained)
    - All SLO-1..SLO-22 measurable + reported
    - Cardinality budget compliance
    - Trace + log + metric ingest lag (per SLO-11 + SLO-12)

20. Cross-references: B1 §3 L8; B6 C9; I2 (canonical); I3
    (incident from alerts); L1 §7; L4 §5; M5

21. Decision phrase
```

## Required substance

≥ 5,000 words.

## Acceptance criteria

```
[ ] Three-signal architecture with concrete tools
[ ] OTel semconv compliance specified
[ ] Per-service instrumentation contract per layer
[ ] RED + USE method metric sets
[ ] SLO instrumentation per M5 directory (all 22 SLOs)
[ ] Per-tenant observability discipline
[ ] Per-region observability
[ ] Cardinality governance
[ ] Anomaly detection
[ ] Audit chain anchor observability
[ ] Banned-decision observability per L1 §7
[ ] Auditor instrumentation
[ ] Cost observability
[ ] Game-day observability
[ ] Privacy observability
[ ] Per-pack overlay
[ ] ≥ 6 failure modes with concrete recovery
[ ] KPIs sustained
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S1-07_B9_OBSERVABILITY_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-08_C12_C13_C14_PLATFORM_DOMAINS.md` next.

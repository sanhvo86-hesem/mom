# I2 — Observability and SLO

```
chapter_purpose: how HESEM is observed at runtime; SLO discipline;
                 burn-rate alerting; SLI definition; cardinality
                 governance; data residency for telemetry; auditor-
                 facing observability
owner_role:      SRE Lead with Platform Lead
sources:         Google SRE Books, OpenTelemetry semantic
                 conventions, Honeycomb tracing patterns, Grafana
                 SLO methodology, RFC 9457 problem details for
                 trace context, NIST SP 800-92 logging guide,
                 ISO/IEC 27037 digital evidence principles
```

Observability is not "metrics + dashboards." It is the discipline
that lets a single engineer answer, in 60 seconds: is the system
healthy now, was a recent change responsible for a degradation, and
where in the architecture is the problem. SLOs translate
observability into committed promises (to tenants, to regulators,
to ourselves). Without observability discipline, the regulated
substrate (audit chain, OTG axioms) cannot be trusted at runtime.

---

## 1. The three signals (per OTel)

```
TRACES
  Every request → span tree
  Per-span: operation, attributes (per OTel semconv), status, time
  Distributed across services; trace_id propagated through all
   inbound + outbound + queue + worker hops
  Sampled by default at adaptive rate; head sampling for high-volume,
   tail-sampling for errors + slow + suspicious
  Retained per H4 EC-3 (telemetry) tiered storage
  Per-tenant trace boundary; per-tenant cardinality limited

METRICS
  RED for services (Rate / Errors / Duration)
  USE for resources (Utilization / Saturation / Errors)
  SLI / SLO metrics dimensioned per tenant + per route + per region
  Per-feature metric (per AI feature; per workflow capability)
  Cardinality budget per metric per tenant (cap)
  Retention: hot 90d / warm 1y / cold per H5

LOGS
  Structured logs (JSON); trace_id + span_id correlated
  Severity (debug / info / warn / error) +
   regulated-event marker (audit / sig / sec / privacy)
  Per-tenant routing; per-tenant retention floor
  PII tagged + redacted-by-default (only audit pipeline reads
   un-redacted)
  Retained per H4 EC-22 audit + EC-3 telemetry + per H5 floor
```

---

## 2. SLO catalog (the 22 SLOs)

```
ID    SLO                                              TARGET     WINDOW
SLO-1 auth.decide p95 < 20ms                             99.9%      30d
SLO-2 policy directive availability                       99.95%     30d
SLO-3 workflow.commit p95 < 500ms                          99.9%      30d
SLO-4 domain.root.write p95 < 100ms                        99.95%     30d
SLO-5 projection freshness lag < 5s                         99.5%      30d
SLO-6 OTG integrity (axiom violations)                      100%       7d
SLO-7 surface render p95 < 200ms                            99.9%      30d
SLO-8 api request p95 < 500ms                                99.9%      30d
SLO-9 api error rate < 0.1%                                  99.9%      30d
SLO-10 audit chain anchor lag < 25h                          100%       7d
SLO-11 log ingest lag < 60s                                  99.9%      30d
SLO-12 trace ingest lag < 60s                                99.9%      30d
SLO-13 CDC consumer lag < 60s                                99.9%      30d
SLO-14 AI inference p95 < 200ms (Tier-1) / 2000ms (Tier-2)   99.5%      30d
SLO-15 audit pack export p95 < 24h                            99%        90d
SLO-16 backup success rate                                    100%       30d
SLO-17 DR drill quarterly cadence                              100%       90d
SLO-18 per-tenant cost SLA                                    99%        30d
SLO-19 vuln patch within severity-window                       100%       90d
SLO-20 validation evidence freshness (non-expired)            100%       always
SLO-21 edge gateway uptime per site                            99.9%      30d
SLO-22 customer onboarding within tier SLA                     90%        90d
```

Tenant SLAs map onto a subset of these (typ availability, latency,
error rate). Internal SLOs are stricter than customer-promised SLAs
to provide error budget.

---

## 3. SLI definition discipline

Each SLI MUST declare:

```
NAME                    canonical
DESCRIPTION              what it measures (in user language)
NUMERATOR                "good events" definition
DENOMINATOR              "valid events" definition
EXCLUSIONS               legitimately filtered events
                         (planned maintenance, tenant-side error)
WINDOW                   measurement window
DIMENSIONS                tenant / route / region / pack
SOURCE                    OTel metric / log query / trace stat
ALIVENESS                 emit cadence (or "any of N windows")
GUARANTEE                 owner promises this metric is correct;
                         drift triggers H8 CAPA
```

Without all fields, the SLI cannot be promoted to SLO. SLO promotion
is itself H7 Class B+ (because tenants rely on it).

---

## 4. Burn-rate alerting (per Google SRE)

```
ERROR BUDGET     allowed bad events per window (1 - SLO target)
BURN RATE        rate at which budget is consumed per period

MULTI-WINDOW ALERT (per SLO)

Fast-burn alert
  Window: 5min + 1h
  Threshold: > 14.4× budget burn (means budget exhausted in
              under 2 days at sustained rate)
  Action: page primary on-call (Tier-1)
  Severity: SEV-1

Slow-burn alert
  Window: 1h + 6h
  Threshold: > 6× burn (means budget exhausted in 5 days)
  Action: ticket; investigate during business hours
  Severity: SEV-3

Sustained high-baseline (warning)
  Window: 24h
  Threshold: > 1× burn
  Action: dashboard warning; review at standup
```

Alert hygiene: alert MUST be actionable. A noisy alert is itself an
H8 CAPA target.

---

## 5. Cardinality governance

High-cardinality metric labels (e.g., user_id) explode storage.
Discipline:

```
ALLOWED LABEL CLASSES
  tenant_id (always; budgeted)
  route_class (per E0)
  workflow_kind (per Part D)
  status_class (success / 4xx / 5xx)
  region
  feature_id (per L2 for AI)

FORBIDDEN LABEL CLASSES
  user_id (use trace + sampled log instead)
  individual record_id (use exemplar + trace)
  arbitrary tag from request body
  PII fields

PER-METRIC BUDGET
  Default 100k unique label sets per metric per tenant
  Breach: alert; auto-throttle; investigate
  Increase: H7 Class C; review by SRE Lead
```

---

## 6. Per-tenant + per-region

```
TENANT BOUNDARY            telemetry stores per-tenant; cross-tenant
                           query forbidden in dashboard layer
DATA RESIDENCY              telemetry retained in tenant region (per
                           B6 C5)
TENANT-VISIBLE              per-tenant slice exposed via tenant
                           dashboard; auditor-facing read
SAMPLING                    per-tenant sample-rate floors (regulated
                           tenants: keep 100% errors + 10% success)
REDACTION                   logs redact PII per tenant policy +
                           regulator floors
ANCHOR                      observability anchored daily (per B6 C1)
                           subset relevant to integrity (axiom
                           violations, anchor lag)
```

---

## 7. Auditor-facing observability

```
PURPOSE                    auditor must verify the system meets
                           regulatory requirements at runtime
SCOPE                      per-tenant; time-bounded; class-bounded
INTERFACE                   read-only auditor account (per H3 §7)
                           with scoped portal access
ACCESS                      auditor sees: SLO performance vs target,
                           recent incidents, audit chain anchor
                           freshness, validation evidence freshness,
                           AI feature KPIs, banned-decision attempt
                           count (= 0 expected)
EVIDENCE                    auditor queries themselves logged + retained
DATA RESIDENCY              auditor query honored per tenant region
```

---

## 8. Per-route SLO discipline

```
NEW ROUTE                  new API route requires SLO at promotion to
                           L4 maturity (per B7); without SLO, route
                           cannot graduate
PROMOTION                  SLO drafted at S1 of H2 lifecycle; SLO
                           data emitted from L1 (test); promoted to
                           SLO when sustained in PROD
ROUTE RETIREMENT           SLO retired with route; deprecation
                           window per E0 deprecation policy
ROUTE-CLASS DEFAULTS       per E0 route class:
                           - read: p95 300ms / p99 800ms / 99.9%
                           - write: p95 500ms / p99 1200ms / 99.5%
                           - long-running ack: p95 500ms / 99.9%
                           - bulk: backend-promised SLAs
                           - workspace projection: p95 200ms read
```

---

## 9. Anomaly detection vs SLO

SLOs catch known patterns; anomaly detection catches unknown.

```
SOURCES                     metrics / logs / traces / per-tenant
                           usage patterns
DETECTORS                   statistical baseline (rolling baseline
                           per route per tenant); change-point
                           detection; PII redaction-rate spike;
                           AI calibration drift; fallback rate spike
TRIGGERS                    per-detector; warn vs page based on
                           confidence
ROUTING                     per-domain; SRE Lead; AI Lead for
                           AI-related; Security Lead for security
                           anomalies
NOISE-OPTIMIZATION          quarterly review; tune thresholds; retire
                           noisy detectors
```

---

## 10. Postmortem instrumentation

After every SEV-1/2:

```
TIMELINE                   reconstructed from trace + log + audit
                           chain
ROOT CAUSE                  per H8 root cause depth
INSTRUMENTATION GAP         what we wished we'd seen; backlog
DETECTION GAP                what alert should have fired earlier
RESPONSE GAP                 process/training gap if detection was OK
EVIDENCE                     per H4; archived per H5
```

---

## 11. Failure modes

```
FM1   SLO target set by aspirational figure not informed by data
      Recovery: SLO promotion gate requires baseline data;
              H8 CAPA on governance discipline

FM2   Cardinality breach
      Recovery: auto-throttle + alert; investigate label source;
              H8 CAPA

FM3   Trace missing trace_id propagation across boundary
      Recovery: H8 CAPA; instrumentation backlog;
              spec OTel semconv compliance enforced via PR check

FM4   Logs leak PII (redaction failed)
      Recovery: privacy incident per I3 + I7; tenant + DPO
              notification; H8 CAPA on redaction discipline

FM5   Burn-rate alert noisy
      Recovery: post-incident review; alert tune; retire if
              consistently false-positive

FM6   Auditor query leaks cross-tenant data
      Recovery: BD-equivalent per B6 C5; SEV-1; access revoke;
              H8 systemic CAPA on auditor portal

FM7   SLO breach detected after error budget exhausted
      Recovery: deploy freeze (CS-A); investigation; per H7
              reclassify if regulated impact; H8 CAPA on burn
              detection latency

FM8   Anchor freshness alarm doesn't fire
      Recovery: SEV-2; H8 CAPA on alert pipeline integrity

FM9   Telemetry retention lapsed
      Recovery: H5 retention floor enforced; lapse triggers
              SEV-2; H8 CAPA

FM10  Anomaly detector silenced during incident (alarm fatigue)
      Recovery: silencing requires reason + expiry; expiry
              re-enables; review of silence patterns
```

---

## 12. Roles and authority (RACI)

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

## 13. Cross-references

- B9 — observability architecture
- B6 C1 — audit chain anchor freshness
- B6 C2 — OTG axiom; per SLO-6
- H3 §7 — auditor-facing observability
- H4 — telemetry + access_audit + audit_anchor classes
- H5 — telemetry retention
- H6 — periodic review consumes SLO data
- H8 — CAPA per SLO breach pattern
- L2 — AI feature KPIs per L2 §6
- L3 — AI lifecycle drift detection
- L4 — anomaly detection inputs
- I1 — deploy gates against SLO burn
- I3 — incident response from alerts
- I4 — DR drill SLO-17
- I6 — cost SLO-18
- I7 — security SLO-19 + SLO-22
- I8 — per-tenant view
- M5 — SLO directory canonical
- M9 — cross-reference
```

---

## 14. Decision phrase

```
I2_OBSERVABILITY_AND_SLO_BASELINE_LOCKED
NEXT: I3_INCIDENT_RESPONSE.md
```

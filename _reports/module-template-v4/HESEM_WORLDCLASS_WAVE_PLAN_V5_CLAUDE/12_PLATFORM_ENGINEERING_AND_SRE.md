# 12_PLATFORM_ENGINEERING_AND_SRE.md

## Purpose

GPT Pro V4 §07 Wave 8 lists "platform" duties (Kubernetes, observability, CI/CD) but does not specify the **engineering substance** of platform engineering, internal developer platforms, SRE methodology, error budgets, or developer experience.

V5 produces the platform/SRE playbook for HESEM.

Standards drawn upon:

- Google SRE Book + Workbook
- Team Topologies (Skelton & Pais, 2019)
- Accelerate (Forsgren, Humble, Kim, 2018) — DORA metrics
- CNCF Cloud Native Maturity Model
- CIS Kubernetes Benchmark
- NIST SP 800-204 (microservices security)
- OpenTelemetry semantic conventions 1.27+
- Kubernetes 1.30+
- ITIL v4 (incident / change / problem)
- ISO/IEC 20000 (service management)
- Lean / Toyota Production System (continuous improvement)

---

## Section 1 — Platform engineering vs SRE vs DevOps

```text
DevOps:               culture + practices for collaboration
SRE:                  reliability engineering with SLO discipline
Platform engineering: build the internal platform that DevOps + SRE consume
```

V5: HESEM has **all three**:

```text
- Platform team builds the internal developer platform (IDP)
- SRE team owns reliability of running services
- All teams (incl. domain teams) practice DevOps
```

---

## Section 2 — Internal Developer Platform (IDP)

### 2.1 Goal

Reduce the time from "I have an idea" to "production-running service" for a domain team from weeks to hours.

### 2.2 IDP capabilities

```text
service template               cookiecutter; opinionated PHP/Go/Python/TS
infrastructure as code         Terraform modules per service shape
CI/CD pipeline template        GitHub Actions reusable workflows
secrets management             HashiCorp Vault or AWS Secrets Manager
service catalog                Backstage (or alternative)
ephemeral environments         per-PR preview environment
golden paths                   documented end-to-end paths for common tasks
self-service runbooks          common ops via web UI / CLI
deployment dashboard           per-service release state
SLO dashboards                 per-service SLO status
cost allocation dashboard      per-service / per-tenant cost
```

V5 ADR-0195: IDP investment — 30% of platform team capacity goes to IDP improvements.

### 2.3 Service template

```text
mom/templates/service/
  Dockerfile                    multi-stage; slim runtime
  composer.json                 / package.json / pyproject.toml
  src/
    Bootstrap.php
    Health.php                  /health, /ready, /metrics
    Telemetry.php               OTel SDK init
  tests/
    smoke/
    contract/
    integration/
  .github/workflows/
    ci.yml                      reusable workflow reference
  README.md                     golden path documentation
  service-manifest.yaml         Backstage catalog
  k8s/
    deployment.yaml.tmpl
    service.yaml.tmpl
    hpa.yaml.tmpl
    networkpolicy.yaml.tmpl
```

A new service: `idp service new <name> <domain> <stack>` produces a working scaffold.

---

## Section 3 — Kubernetes deployment topology

### 3.1 Cluster architecture

```text
production cluster (per region):
  - control plane (managed)
  - 3+ worker pools:
    - general (CPU)
    - memory-optimized (postgres, redis, etc.)
    - GPU (for ML inference)

namespaces (per environment):
  hesem-core            HESEM monolith services
  hesem-edge            edge gateway connectors (regional)
  hesem-data            CDC consumer, MV refresher, search sync
  hesem-ml              inference services, training pipeline
  hesem-observability   OTel collector, Prometheus, Loki, Jaeger
  hesem-system          shared infra (cert-manager, external-dns, etc.)
  hesem-portals         customer + supplier portals
```

### 3.2 Resource governance

```text
- per-namespace ResourceQuota (CPU + memory + storage + pods + services)
- per-pod LimitRange (default + max)
- per-node taints/tolerations for pool segregation
- horizontal pod autoscaler per service
- vertical pod autoscaler advisory mode (no auto-resize without review)
- pod disruption budgets per service (min available)
- network policies: default deny; explicit allow per service
```

V5 ADR-0196: NetworkPolicy default-deny baseline.

### 3.3 CIS Kubernetes Benchmark

V5 commits to CIS Kubernetes Benchmark Level 2:

```text
- API server hardening (anonymous auth disabled, audit log enabled)
- etcd encryption at rest
- kubelet authentication + authorization
- pod security standards: 'restricted' baseline (no root, no privilege escalation, etc.)
- ImagePullPolicy: Always for prod; signed images only via cosign
- runtime: containerd hardened; AppArmor / seccomp profiles per service
```

V5 ADR-0197: CIS Kubernetes Benchmark Level 2 + cosign image signing.

---

## Section 4 — CI/CD pipeline

### 4.1 Pipeline stages

```text
1. lint                   linters per language; fast feedback
2. unit test              per service; goal < 5min
3. contract validation    OpenAPI spec checks; backward compat
4. build                  Docker image; SBOM via syft; cosign signing
5. scan                   trivy + grype + npm audit + composer audit
6. integration test       in ephemeral env; testcontainers
7. e2e smoke              per-PR preview environment
8. visual regression      Playwright screenshots vs baseline
9. a11y                   axe-core
10. perf budget           Lighthouse CI per route
11. security gate         no critical CVE; no secret leak (gitleaks)
12. deploy staging        auto on merge to main
13. integration test prod-like
14. canary deploy production  5% traffic, 30min soak
15. promote production    100% traffic
16. post-deploy verification SLO check, smoke
```

### 4.2 Required vs advisory checks

```text
PR to main (required):
  - unit
  - contract validation
  - build + scan
  - lint
PR to main (advisory in early waves; required from W8):
  - integration
  - e2e smoke
  - visual regression
  - a11y
  - perf budget
deploy production (required):
  - all CI green
  - canary soak passed
  - 2 reviewers approval
  - deploy window respected (no Friday-after-3pm)
```

V5 ADR-0198: Deploy gate matrix; required checks expand wave-by-wave.

### 4.3 Rollback

```text
- every deploy gets an artifact-versioned tag
- rollback = redeploy previous tag (one command)
- DB migration rollback: forward-only with shadow-write, never DOWN migrations
- on-call has rollback authority; one-button rollback < 30 seconds
```

V5 ADR-0199: Rollback always forward-only for DB; one-button rollback for app.

---

## Section 5 — Observability (OpenTelemetry)

### 5.1 OTel stack components

```text
SDK in every service                ingests spans + metrics + logs
OTel Collector (per cluster)        ingests + batches + exports
exporters:
  - Tempo (or Jaeger) for traces
  - Prometheus for metrics
  - Loki for logs
  - external SIEM (e.g., Splunk) for security events
sampling: head-based 5% per service; 100% on error spans
```

V5 ADR-0200: OTel Collector mandatory; service direct-export forbidden.

### 5.2 Semantic conventions

V5 follows OpenTelemetry semantic conventions 1.27+:

```text
service.name, service.version, deployment.environment
http.request.method, http.response.status_code, http.route
db.system, db.statement (sanitized), db.operation
messaging.system, messaging.operation
cloud.provider, cloud.region
```

Plus HESEM-specific:

```text
hesem.tenant.id
hesem.principal.id
hesem.workflow.machine
hesem.workflow.transition_id
hesem.resource_family
hesem.authority_class
```

### 5.3 Trace propagation

```text
W3C Trace Context (traceparent + tracestate)
W3C Baggage (tenant.id, principal.id, request.id)
across services, queues, edge gateway
```

### 5.4 Required dashboards

```text
service health per service          golden signals (latency, traffic, errors, saturation)
SLO burn rate per SLO              fast (1h) + slow (6h) burn windows
RED dashboard per route            requests, errors, duration
USE dashboard per node              utilization, saturation, errors
audit chain health                  anchor lag, integrity job status
projection freshness                per MV + per OTG event consumer
data quality                        DQ check failure trends
deploy pipeline                     time-to-prod per service
incident dashboard                  open + recent incidents
```

V5 ADR-0201: Default dashboard set in Grafana; service-specific dashboards extend.

---

## Section 6 — SLO discipline

### 6.1 SLO definition format

```yaml
slo_id: l1_auth_decide_p95
service: hesem-api
description: "L1 auth.decide latency p95"
sli:
  type: latency
  query: histogram_quantile(0.95, sum by (le) (rate(auth_decide_duration_ms_bucket[5m])))
  good_event: result < 20
  bad_event: result >= 20
objective:
  target: 0.999    # 99.9% of 5min windows below 20ms
  window: 30d
error_budget_policy:
  - if budget_remaining < 25%:
      action: review imminent releases
  - if budget_remaining < 0%:
      action: freeze releases until SLO restored
alerting:
  fast_burn:
    burn_rate: 14.4         # exhausts budget in 1h
    duration: 5m
    severity: critical
  slow_burn:
    burn_rate: 1.0          # exhausts budget over 30d
    duration: 1h
    severity: warning
runbook: https://hesem.io/runbooks/l1-auth-slow
```

### 6.2 SLO catalog (per file 01 §3 layer)

```text
L1  auth.decide p95 < 20ms                                99.9% / 30d
L2  policy directive store availability                   99.95% / 30d
L3  workflow.transition.commit p95 < 500ms                99.9% / 30d
L4  domain.root.write p95 < 100ms                         99.95% / 30d
L5  projection freshness < 5s p95                         99.5% / 30d
L5  otg integrity zero violations / 7d                    100% / 7d
L6  surface render p95 < 200ms                            99.9% / 30d
L7  api request p95 < 500ms                               99.9% / 30d
L7  api error rate < 0.1%                                 99.9% / 30d
L8  audit chain anchor lag < 25h                          100% / 7d
L8  log ingest lag < 60s                                  99.9% / 30d
L8  trace ingest lag < 60s                                99.9% / 30d
```

### 6.3 Error budget

Error budget = (1 - SLO target) × time window
Error budget burn rate = current bad-event rate / SLO threshold

Burn-rate alerts (Google SRE multi-window):

```text
Fast: burn_rate=14.4 over 5m → exhausts 30d budget in 1h → critical
Slow: burn_rate=1.0 over 1h  → on-trajectory to exhaust → warning
```

V5 ADR-0202: SLO + error budget mandatory for every service in production.

---

## Section 7 — Incident management

### 7.1 Severity levels

```text
SEV-0   product-wide outage; CEO involved; multi-customer
SEV-1   regulated function broken; potential compliance impact
SEV-2   degraded service; SLO breached
SEV-3   minor issue; SLO at risk
SEV-4   cosmetic / documentation
```

### 7.2 Response times

```text
SEV-0   acknowledge 5min; resolve 1h
SEV-1   acknowledge 15min; resolve 4h
SEV-2   acknowledge 30min; resolve 1 day
SEV-3   acknowledge 4h; resolve 1 week
SEV-4   acknowledge 1d; resolve next sprint
```

### 7.3 Postmortem (blameless)

For every SEV-0/1/2:

```text
- timeline (with timestamps; from detection to resolution)
- impact (customers, revenue, regulatory)
- root cause
- contributing factors
- lessons learned (no blame)
- corrective actions (with owner + due date)
- prevention measures
```

Postmortems are **public within HESEM**; redacted versions shared with customers per agreement.

V5 ADR-0203: Blameless postmortem mandatory; corrective actions tracked to closure.

### 7.4 Game days

```text
quarterly: simulate failure scenarios
  - region failure
  - DB failure
  - dependency failure (Auth0, Stripe, AWS service)
  - network partition
  - data corruption
  - ransomware
verify: runbooks current; on-call response time; recovery time
```

---

## Section 8 — Capacity planning

### 8.1 Per-service capacity model

Each service publishes:

```text
expected_qps:           normal + p99 peak
cpu_per_request_ms:     median + p99
memory_per_request_kb:  median + p99
db_connections:         steady-state + burst
external_calls_per_request: count + dependencies
```

### 8.2 Aggregate

Capacity planning per region accounts for:

```text
N tenants × per-tenant QPS estimate × peak factor
+ buffer (2x for safety)
+ ML inference load (per advisory call rate)
+ batch job load (per scheduled job)
+ ingestion load (CDC, edge, search index)
+ analytics load (warehouse + dashboard)
```

V5 ADR-0204: Capacity model per service; aggregated quarterly.

---

## Section 9 — Cost optimization

### 9.1 Per-service cost reporting

```text
- compute (vCPU × hours)
- memory (GB × hours)
- storage (GB × month per tier)
- network (egress GB)
- managed services (DB, queue, etc.)
- ML inference (per call)
```

### 9.2 Optimization levers

```text
- right-size pods (VPA recommendations)
- spot instances for non-critical workloads
- batch jobs in low-cost windows
- per-tenant cost SLO + throttling
- autoscale aggressively for stateless services
- database read-replica routing for analytic queries
- compression for time-series + logs
- cold-storage lifecycle for old data
```

V5 ADR-0205: Quarterly cost optimization review per service.

---

## Section 10 — Developer experience (DX)

### 10.1 Local development

```text
docker-compose / devcontainer
seeded local DB with HMV4 fixtures
local OTel collector → Jaeger
hot reload per service
local pre-commit hooks (lint, secret scan)
```

V5 ADR-0206: Local environment parity with staging within 90% (acknowledged differences documented).

### 10.2 Inner loop

```text
edit code
local test (target < 30s feedback)
push to PR branch
auto-deploy to ephemeral PR environment
share PR URL with reviewer; preview live
review + merge
```

### 10.3 Documentation

```text
each service: README, architecture diagram, runbooks
each domain: business rules, gotchas (.ai/module-summaries/<domain>.md)
platform: golden paths, IDP usage guide
ADRs: chronological per area
runbooks: per alert + per common issue
```

---

## Section 11 — Accessibility (WCAG 2.2 AA)

### 11.1 Mandatory practices

```text
- semantic HTML
- ARIA roles + labels
- keyboard navigation: full coverage; logical order
- focus visible (per file 01 ADR-0009 reference)
- color contrast ≥ 4.5:1 (text) / 3:1 (large text)
- alt text for images; transcripts for audio/video
- error messages: descriptive + linked to fields
- form labels associated correctly
- skip links for repetitive content
- responsive design: keyboard usable at all viewports
- reduced motion respected (prefers-reduced-motion)
- screen reader tested (NVDA / JAWS / VoiceOver)
```

### 11.2 CI gate

```text
axe-core in CI per page
manual screen reader testing per release
WCAG 2.2 AA self-assessment + 3rd-party audit annual
```

V5 ADR-0207: Accessibility CI gate + annual external audit.

---

## Section 12 — i18n / l10n

### 12.1 Locale support

V5 baseline locales (W2 priority):

```text
en-US  English (US)               default
vi-VN  Vietnamese                  Vietnam (HESEM home market)
ja-JP  Japanese                    Japan
zh-CN  Chinese (simplified)        China
zh-TW  Chinese (traditional)       Taiwan
ko-KR  Korean                      Korea
de-DE  German                      Germany / EU
es-ES  Spanish                     Spain / LatAm
pt-BR  Portuguese                  Brazil
fr-FR  French                      France / Canada
```

### 12.2 ICU MessageFormat 2

V5 uses ICU MessageFormat 2 (current draft):

```text
{user, plural, =0 {No users} one {1 user} other {# users}}
```

Locale data via CLDR. Time zones via tz database.

V5 ADR-0208: ICU MessageFormat 2 + CLDR; all user-facing strings localized.

### 12.3 Locale-aware behavior

```text
date / time formatting
number formatting (decimal/thousands separator, currency)
collation (sorting)
right-to-left layout (Arabic, Hebrew — defer to W10)
plural / gender variants
```

---

## Section 13 — Compliance evidence collection

V5's platform automatically generates compliance evidence:

```text
- access logs per principal per resource (90 days online, 7 years archived)
- change management records via ECO state machine
- audit chain anchor records
- backup test records (every restore drill)
- pen test reports (annual, archived)
- vulnerability scan reports (weekly)
- incident records (per SEV-1/2/0)
- DR drill records (quarterly)
- training records per employee
- background check records per hire
```

These are dumped to `evidence_artifact` OTG nodes with WORM retention.

V5 ADR-0209: Compliance evidence as code: evidence collection pipelined; auditor self-serve.

---

## Section 14 — Cumulative ADRs

```text
ADR-0195  IDP investment 30% of platform team capacity
ADR-0196  NetworkPolicy default-deny baseline
ADR-0197  CIS Kubernetes Benchmark Level 2 + cosign signing
ADR-0198  CI/CD deploy gate matrix; expanding required checks per wave
ADR-0199  Forward-only DB migration; one-button app rollback
ADR-0200  OTel Collector mandatory
ADR-0201  Default Grafana dashboard set per service
ADR-0202  SLO + error budget mandatory in production
ADR-0203  Blameless postmortem; corrective action tracking
ADR-0204  Capacity model per service
ADR-0205  Quarterly cost optimization review
ADR-0206  Local environment parity ≥ 90% with staging
ADR-0207  Accessibility CI gate + annual external audit
ADR-0208  ICU MessageFormat 2 + CLDR
ADR-0209  Compliance evidence as code
```

---

## Decision phrase

```text
V5_PLATFORM_ENGINEERING_AND_SRE_BASELINE_LOCKED
NEXT_FILE: 13_SECURITY_THREAT_MODEL_AND_DEVSECOPS.md
```

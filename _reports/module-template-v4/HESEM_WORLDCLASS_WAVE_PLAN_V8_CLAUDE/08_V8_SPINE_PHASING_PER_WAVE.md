# 08 — V8 Spine Phasing per Wave

```text
purpose:        Bind V7's 12 enterprise spines to per-wave maturity targets
predecessor:    V7 §09 (V7_ENTERPRISE_SPINE_BACKLOG.md) lists spines, no phasing
v8_advance:     Per-spine maturity per wave + work-package decomposition + dashboard
work_package:   WP-V8-SPINE (12 work packages, one per spine)
owner:          Platform Lead (SPI 1-3) + Security Lead (SPI 4) + 
                Data Lead (SPI 5,8) + AI Lead (SPI 10) + ...
estimate:       ~36 engineering-weeks across 12 spines
```

---

## 1. The 12 spines (V7 carry-forward)

```text
SPI-1  Identity / Access (USER, ROLE, POLICY)
SPI-2  Workflow (state machines, command bus)
SPI-3  Evidence / e-Sign (audit, signatures, retention)
SPI-4  Master Data (ITEM, CUST, SUP, EQP, MDEV)
SPI-5  Digital Thread (OTG, lineage, genealogy)
SPI-6  Event / Notification (RabbitMQ, real-time push)
SPI-7  Analytics (data products, KPI MV, dashboards)
SPI-8  Instruction Runtime (work instructions, eligibility checks)
SPI-9  Graphics Authority (design tokens, simulation)
SPI-10 AI Governance (model registry, advisory, banned-decisions)
SPI-11 Security/Privacy/OT (ASVS, GDPR, IEC 62443)
SPI-12 Platform SRE (Kubernetes, OTel, DR)
```

---

## 2. Per-spine per-wave target table

Each cell = target maturity (0-7) the spine must reach by the end of that wave.

```csv
spine,W0,W0.5,W1,W2,W3,W4,W4.5,W5,W6,W6.5,W7,W8,W9,W10,W11,W12,W13,W14
SPI-1 Identity,0,4,4,4,4,5,5,5,5,5,5,5,6,7,7,7,7,7
SPI-2 Workflow,0,3,4,4,4,4,5,5,5,5,5,6,6,7,7,7,7,7
SPI-3 Evidence,0,3,3,4,4,4,5,5,5,5,6,6,7,7,7,7,7,7
SPI-4 Master Data,0,3,4,4,4,4,5,5,5,5,5,5,6,7,7,7,7,7
SPI-5 Digital Thread,0,2,2,3,3,4,5,5,5,5,6,6,6,7,7,7,7,7
SPI-6 Event/Notify,0,3,3,3,4,4,4,4,4,4,5,5,6,6,7,7,7,7
SPI-7 Analytics,0,2,2,3,3,3,4,4,4,4,5,6,6,7,7,7,7,7
SPI-8 Instruction Runtime,0,1,2,3,3,3,3,4,5,5,5,6,6,7,7,7,7,7
SPI-9 Graphics Authority,0,4,5,5,5,5,5,5,5,5,5,6,6,7,7,7,7,7
SPI-10 AI Governance,0,1,1,1,1,1,2,2,2,5,5,5,5,5,5,6,6,7
SPI-11 Security/OT,0,3,3,4,4,4,4,4,5,5,5,6,7,7,7,7,7,7
SPI-12 Platform SRE,0,3,4,4,4,4,4,5,5,5,5,6,7,7,7,7,7,7
```

A wave PASSes when every spine reaches its declared target. A wave whose target is L5+ blocks if any spine prerequisite is unmet (cf V7 §09 line 175-177 spine dependency rule).

---

## 3. Spine-by-spine work package summary

### SPI-1 Identity / Access

```yaml
roots: [USER, ROLE, POLICY, TENANT_MEMBERSHIP]
substrate_components:
  - Keycloak (or alternative OIDC IdP) deployed (W0.5)
  - PolicyEngine /decide endpoint (W0.5; per V5 file 04 §W0.5.1)
  - 21 CFR Part 11 e-sign factor pluggability (W0.5 framework, W3 active)
  - Step-up authentication for sensitive transitions (W0.5)
  - JIT (just-in-time) elevation with audit trail (W3)
  - Per-tenant role membership tables (W0.5)
work_packages:
  WP-V8-SPI-1.1: Keycloak deploy + RLS-tenant integration   (W0.5, 1 wk)
  WP-V8-SPI-1.2: PolicyEngine service + decide endpoint     (W0.5, 1.5 wk)
  WP-V8-SPI-1.3: e-sign factor framework + obligation table (W0.5, 1 wk)
  WP-V8-SPI-1.4: Step-up auth flow + session management     (W0.5, 1 wk)
total_eff: 4.5 wk
```

### SPI-2 Workflow / Command Bus

```yaml
substrate_components:
  - Command envelope schema + middleware (W0.5)
  - State machine definition format YAML (W0.5; per file 10)
  - Workflow guard evaluator (W1)
  - Saga orchestrator (W4.5; per V5 file 05 W5.2)
  - Idempotency replay table (W0.5)
  - Optimistic locking with ETag/If-Match (W0.5)
work_packages:
  WP-V8-SPI-2.1: Command envelope + middleware              (W0.5, 1.5 wk)
  WP-V8-SPI-2.2: State machine engine + YAML loader         (W0.5, 1 wk)
  WP-V8-SPI-2.3: Workflow guard library                     (W1, 1 wk)
  WP-V8-SPI-2.4: Saga orchestrator                          (W4.5, 2 wk)
  WP-V8-SPI-2.5: Idempotency + ETag middleware              (W0.5, 1 wk)
total_eff: 6.5 wk
```

### SPI-3 Evidence / e-Sign

```yaml
substrate_components:
  - audit_event hash-chain table (W0.5; per V5 file 02 §13)
  - Daily merkle anchor cron (W0.5)
  - evidence_record_v8 schema (W0.5; per file 16)
  - WORM storage integration (W2; S3 Object Lock)
  - RFC 3161 timestamping connector (W4.5 optional, W8 mandatory for regulated)
work_packages:
  WP-V8-SPI-3.1: audit_event chain + service                (W0.5, 1.5 wk)
  WP-V8-SPI-3.2: Daily anchor cron                          (W0.5, 0.5 wk)
  WP-V8-SPI-3.3: evidence_record_v8 schema + storage        (W2, 1 wk)
  WP-V8-SPI-3.4: WORM S3 Object Lock integration            (W2, 1 wk)
  WP-V8-SPI-3.5: RFC 3161 timestamping connector            (W4.5, 1 wk)
total_eff: 5 wk
```

### SPI-4 Master Data

```yaml
roots: [ITEM, CUST, SUP, EQP, MDEV, ROUTE, BOM]
work_packages:
  WP-V8-SPI-4.1: ITEM master + revision/effectivity         (W0.5-W1, 2 wk)
  WP-V8-SPI-4.2: CUST + SUP master + sites                  (W1, 1.5 wk)
  WP-V8-SPI-4.3: EQP + MDEV master + calibration linkage   (W2, 1.5 wk)
  WP-V8-SPI-4.4: MDM dedup pipeline + AI advisory queue     (W6.5, 2 wk)
total_eff: 7 wk
```

### SPI-5 Digital Thread / OTG

```yaml
work_packages: covered by WP-V8-OTG-1..5 (file 05)
total_eff: 8 wk
```

### SPI-6 Event / Notification

```yaml
substrate_components:
  - RabbitMQ topic discipline (W0.5)
  - WebSocket gateway for real-time push (W7)
  - SSE fallback (W7)
  - Per-topic ACL via PolicyEngine (W7)
work_packages:
  WP-V8-SPI-6.1: RabbitMQ + topic registry                  (W0.5, 1 wk)
  WP-V8-SPI-6.2: Schema registry (Avro) + producer SDK      (W4, 1 wk)
  WP-V8-SPI-6.3: WebSocket gateway + topic ACL              (W7, 2 wk)
  WP-V8-SPI-6.4: Real-time client SDK                       (W7, 1 wk)
total_eff: 5 wk
```

### SPI-7 Analytics

```yaml
substrate_components:
  - Materialized view registry (W4.5)
  - dbt project (W6)
  - Lakehouse (Postgres+columnar OR ClickHouse) (W8)
  - KPI dashboard per file 03 §4 (W4.5–W8)
work_packages:
  WP-V8-SPI-7.1: MV registry + refresh job                  (W4.5, 1 wk)
  WP-V8-SPI-7.2: dbt project scaffolding                    (W6, 1 wk)
  WP-V8-SPI-7.3: Lakehouse decision + deploy                (W8, 2 wk)
  WP-V8-SPI-7.4: 18 KPI dashboards (file 03)                (W4.5–W8 ongoing, ~2 wk)
total_eff: 6 wk
```

### SPI-8 Instruction Runtime

```yaml
substrate_components:
  - Work instruction renderer with version + effectivity (W3)
  - Eligibility resolver (TRAIN, EQP, MDEV, LOT) (W3)
  - Step-completion event emission (W6)
  - Offline tolerance (PWA service worker) (W6)
work_packages:
  WP-V8-SPI-8.1: Instruction renderer + version selector    (W3, 1.5 wk)
  WP-V8-SPI-8.2: Eligibility resolver service              (W3, 1 wk)
  WP-V8-SPI-8.3: Step event emission + OTG nodes            (W6, 1 wk)
  WP-V8-SPI-8.4: PWA offline + sync                         (W6, 2 wk)
total_eff: 5.5 wk
```

### SPI-9 Graphics Authority

```yaml
substrate_components:
  - Token catalog tables (already exist; W0.5 binding)
  - Simulation modal + ControlKit factories (already exist; W0.5 ratification)
  - No-hardcode CI gate (W0.5; per file 13)
  - Override audit per tenant (W2)
work_packages:
  WP-V8-SPI-9.1: Token registry hardening + ControlKit ADR  (W0.5, 0.5 wk)
  WP-V8-SPI-9.2: No-hardcode linter (LINT-V8-009)           (W0.5, 0.5 wk)
  WP-V8-SPI-9.3: Per-tenant override + audit chain          (W2, 1 wk)
total_eff: 2 wk
```

### SPI-10 AI Governance

```yaml
substrate_components:
  - Banned-decisions data file (W0.5)
  - RULE-2 enforcement CI test + runtime guard (W0.5)
  - Model registry + model card schema (W6.5)
  - Inference service framework (W6.5)
  - Drift monitor (W7)
  - Red-team protocol (W7)
work_packages:
  WP-V8-SPI-10.1: data/ai_banned_decisions_v8.json + tests  (W0.5, 0.5 wk)
  WP-V8-SPI-10.2: Model registry + cards                    (W6.5, 2 wk)
  WP-V8-SPI-10.3: Inference mesh + per-feature SLO          (W6.5, 2 wk)
  WP-V8-SPI-10.4: Drift monitor + retraining trigger        (W7, 2 wk)
  WP-V8-SPI-10.5: Red-team quarterly drill                  (W7+, ongoing)
total_eff: 7 wk
```

### SPI-11 Security / Privacy / OT

```yaml
work_packages: covered by file 23 + WP-V8-SEC-1..N (~16 wk)
```

### SPI-12 Platform SRE

```yaml
substrate_components:
  - Kubernetes deployment topology (W0.5)
  - OTel collector + Prometheus + Loki + Jaeger (W0.5)
  - SLO + error budget engine (W4)
  - HA + DR active-passive design (W8)
  - Canary deployment (W8)
work_packages:
  WP-V8-SPI-12.1: K8s topology + namespaces                 (W0.5, 1.5 wk)
  WP-V8-SPI-12.2: OTel stack + per-service spans            (W0.5, 1.5 wk)
  WP-V8-SPI-12.3: SLO engine + alerting                     (W4, 1 wk)
  WP-V8-SPI-12.4: HA + DR design                            (W8, 2 wk)
  WP-V8-SPI-12.5: Canary deploy pipeline                    (W8, 1 wk)
total_eff: 7 wk
```

---

## 4. Spine readiness dashboard

```yaml
data_product: hesem.spine_readiness_v8
location:     data/v8_spine_phasing.json (live; refreshed per spine WP completion)
fields:
  - spine_id
  - current_maturity (L0-L7)
  - target_maturity_per_wave (W0..W14)
  - delta (target - current; positive = ahead, negative = behind)
  - blocking_work_packages
  - last_assessment_at
  - assessor (Platform Lead default)
freshness: weekly
```

---

## 5. Decision phrase

```text
V8_SPINE_PHASING_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-SPI-1.* .. WP-V8-SPI-12.* (~50 sub-WPs total)
NEXT_FILE: 09_V8_COMMAND_BUS_NORMATIVE.md
```

# 20_RISK_REGISTER_V5_FORMAL.md

## Purpose

GPT Pro V4 §13 publishes a "Risk Register and Open Decisions" with ~10 high-level decisions. V5 produces the formal risk register applying STRIDE (security), LINDDUN (privacy), and FMEA-style scoring.

Each risk: **id, category, description, severity (1-10), occurrence (1-10), detection (1-10), RPN, action priority, owner, mitigation, monitoring, due date, current status**.

---

## Section 1 — Risk register methodology

### 1.1 Scoring per AIAG-VDA 2019 (FMEA action priority)

```text
S (Severity):     1=negligible, 10=catastrophic
O (Occurrence):   1=very rare, 10=frequent
D (Detection):    1=very high (almost certain to detect), 10=undetectable
RPN = S × O × D    (deprecated by AIAG-VDA but useful for ranking)
AP (Action Priority): H, M, L per AIAG-VDA lookup
```

### 1.2 Categories

```text
TECH      technical/architecture risk
SEC       security/cyber risk
PRIV      privacy/data protection risk
COMPL     regulatory/compliance risk
ECON      economic/business risk
OPS       operational/SRE risk
TEAM      organizational/people risk
EXT       external/dependency risk
```

### 1.3 Action priority threshold

```text
AP = H   immediate action required; cross-functional review monthly
AP = M   plan mitigation; review quarterly
AP = L   document; accept; review annually
```

---

## Section 2 — Top risks (RPN ≥ 200 or AP=H)

### R-001 — OTG axiom violation in production

```text
category:    TECH
description: Axioms A1-A14 violation observed in production data
S=10 O=2 D=4 RPN=80 AP=H (S=10 forces H)
owner:       Platform Lead + Data Engineering Lead
mitigation:
  - online triggers (file 02 §6) for hot-path axioms
  - nightly integrity job (file 02 §7)
  - automated alerts; SEV-1
monitoring:
  - axiom violation metric per axiom per night
  - target: 0 violations
due:         W0.5 baseline + always
status:      pending implementation (W0.5)
```

### R-002 — Audit chain hash break (tamper or corruption)

```text
category:    SEC + COMPL
S=10 O=1 D=3 RPN=30 AP=H (S=10)
owner:       Security Lead
mitigation:
  - WORM storage (S3 Object Lock)
  - external timestamping (RFC 3161)
  - daily verification job
  - SIEM rule: direct DB write to audit_event
monitoring:
  - daily verification job result
  - chain depth + anchor lag metrics
due:         W0.5 + W8 hardening
status:      pending implementation
```

### R-003 — RULE-2 violation (AI committing regulated decision)

```text
category:    COMPL
S=10 O=2 D=2 RPN=40 AP=H
owner:       AI Governance Lead
mitigation:
  - CI test (file 11 §8.1)
  - runtime guard (file 11 §8.2)
  - axiom A7 nightly check
  - decision logging
monitoring:
  - zero RULE-2 violations
  - quarterly AI governance audit
due:         W6.5 + always
status:      pending W6.5
```

### R-004 — Tenant boundary leak

```text
category:    SEC + PRIV
S=10 O=2 D=4 RPN=80 AP=H
owner:       Security Lead + Platform Lead
mitigation:
  - RLS on all tenant tables (file 02 §4.5)
  - middleware enforcement (file 04 W0.5.6)
  - query plan audit in CI
  - per-tenant index isolation for search
monitoring:
  - boundary violation alert
  - quarterly query plan review
due:         W0.5 + always
status:      pending W0.5
```

### R-005 — SOC 2 Type II audit failure (Wave 8 gate)

```text
category:    COMPL + ECON
S=8 O=4 D=5 RPN=160 AP=H
owner:       Compliance Lead + Security Lead
mitigation:
  - file 12 §13 compliance evidence collection automated
  - quarterly internal audit (W8 prep)
  - 3rd-party gap analysis (12 weeks before audit)
  - remediation plan with explicit owners
monitoring:
  - control coverage dashboard
  - exception aging report
due:         W8
status:      pending W8 prep
```

### R-006 — Validation evidence stale on regulated release

```text
category:    COMPL
S=9 O=3 D=2 RPN=54 AP=H
owner:       Compliance Lead
mitigation:
  - axiom A5 nightly check
  - 90-day-before-expiration alert
  - L2 obligation prevents release if evidence stale
  - automatic CAPA on stale evidence
monitoring:
  - daily count of records with stale evidence
  - automated escalation
due:         W3 + W8
status:      pending W3
```

### R-007 — Cross-region data flow violation (ITAR / Schrems II)

```text
category:    COMPL + PRIV + EXT
S=9 O=2 D=5 RPN=90 AP=H
owner:       Privacy Lead + Compliance Lead
mitigation:
  - per-tenant region declaration
  - egress monitoring per tenant
  - per-tenant cluster pinning for high-sensitivity
  - ITAR person-of-record verification (file 16 §6)
monitoring:
  - egress audit per tenant
  - regional regulator engagement
due:         W9 multi-tenancy
status:      pending W9
```

### R-008 — Edge gateway compromise (OT path)

```text
category:    SEC
S=9 O=3 D=4 RPN=108 AP=H
owner:       OT Security Specialist
mitigation:
  - mutual TLS with cert pinning (file 06 §5.5)
  - IEC 62443 SL-2/3 baseline
  - device cert rotation
  - signed firmware updates
  - segregated network zone
monitoring:
  - certificate expiration tracking
  - anomaly detection on edge events
due:         W6 (when edge gateway introduced)
status:      pending W6
```

### R-009 — ML model committing banned decision via human-loop bypass

```text
category:    COMPL + TECH
S=10 O=2 D=4 RPN=80 AP=H
owner:       AI Governance + ML Lead
mitigation:
  - human-in-the-loop verification on every advisory
  - override capture mandatory
  - acceptance-rate KPI monitoring (file 11 §7.3)
  - quarterly NIST RMF review
monitoring:
  - acceptance rate dashboard
  - override reason analytics
due:         W6.5 + always
status:      pending W6.5
```

### R-010 — Cryptographic algorithm sunset (e.g., SHA-256 weakness)

```text
category:    SEC + COMPL
S=8 O=2 D=6 RPN=96 AP=H
owner:       Security Lead
mitigation:
  - cryptographic agility (file 13 §6.2)
  - annual post-quantum readiness review
  - algorithm name in policy directive (not hardcoded)
  - migration playbook ready
monitoring:
  - NIST + IETF advisory tracking
due:         continuous
status:      ongoing monitoring
```

---

## Section 3 — Engineering execution risks (medium-high)

### R-011 — Solo Codex-augmented pace insufficient

```text
category:    TEAM + ECON
S=7 O=5 D=3 RPN=105 AP=M
owner:       Founder
mitigation:
  - hire 1-2 contractors at Phase 2
  - aggressive use of Claude/Codex automation
  - focus ruthlessly; defer vertical packs
monitoring:
  - velocity vs plan; quarterly recalibration
due:         continuous
status:      acknowledged
```

### R-012 — Cross-browser visual regression instability

```text
category:    TECH
S=5 O=7 D=4 RPN=140 AP=M
owner:       Frontend Platform Lead
mitigation:
  - chromium-canonical baseline (W1)
  - tri-browser-required from W4
  - layout-stable component design (avoids brittle screenshots)
  - per-PR baseline updates with reviewer approval
monitoring:
  - visual regression PR comments
due:         W0 + W4
status:      ongoing repair (current Phase 2 status: CROSS_BROWSER_FAIL_BLOCK_NEXT)
```

### R-013 — Live-API graduation cliff (Wave 4 stalled by slowest slice)

```text
category:    TECH + ECON
S=6 O=5 D=3 RPN=90 AP=M
owner:       Platform Lead
mitigation:
  - per-slice graduation (V5 §3 W4 refinement)
  - 60% threshold for wave PASS
  - graduation tracker dashboard
monitoring:
  - graduation count per week
due:         W4
status:      pending W4
```

### R-014 — OTG migration backfill data quality

```text
category:    TECH + COMPL
S=7 O=4 D=4 RPN=112 AP=M
owner:       Data Engineering Lead
mitigation:
  - phased backfill (Stage 0-5 per file 02 §10)
  - dry-run on staging
  - drift check during cutover
  - rollback plan documented
monitoring:
  - drift counter; SLO
due:         W4.5
status:      pending W4.5
```

### R-015 — Vertical pack scope creep

```text
category:    TECH + ECON
S=6 O=6 D=3 RPN=108 AP=M
owner:       Vertical Pack PMs
mitigation:
  - per-pack ADR with frozen scope
  - customer-specific extensions as add-ons
  - pack maturity gate before next pack
monitoring:
  - pack delivery velocity
due:         W10
status:      pending W10
```

### R-016 — Customer implementation timeline blow-out

```text
category:    ECON
S=7 O=5 D=5 RPN=175 AP=M
owner:       Customer Success Lead
mitigation:
  - customer validation leverage pack (file 07 §4.3 ADR-0122)
  - implementation playbooks per vertical
  - reference implementations (sample customers)
  - customer success manager engagement
monitoring:
  - per-customer time-to-go-live
due:         W8 + always
status:      pending W8
```

### R-017 — Cloud cost run-away on noisy tenant

```text
category:    OPS + ECON
S=5 O=6 D=4 RPN=120 AP=M
owner:       SRE Lead + Customer Success
mitigation:
  - per-tenant cost SLA (file 17 §3.3 ADR-0265)
  - per-tenant rate limit + quota
  - alert on unusual query patterns
  - cost dashboard per customer
monitoring:
  - daily cost per tenant
  - anomaly detection
due:         W4 + always
status:      pending
```

### R-018 — Backup/restore failure during DR drill

```text
category:    OPS + COMPL
S=8 O=2 D=4 RPN=64 AP=M
owner:       SRE Lead
mitigation:
  - quarterly DR drill (W8 commitment)
  - automated backup verification (post-restore checksum)
  - PITR capability + cross-region replication
  - recovery runbook + game day
monitoring:
  - DR drill PASS rate
  - RPO/RTO measurement
due:         W8 + quarterly
status:      pending W8
```

### R-019 — Multi-tenancy migration breaks existing tenant

```text
category:    TECH + ECON
S=8 O=3 D=4 RPN=96 AP=M
owner:       Platform Lead
mitigation:
  - shadow-write phase (file 09 §15)
  - phased nullable→NOT NULL+RLS migration (file 04 W9.1)
  - per-tenant rollback plan
  - customer-coordinated cutover for existing tenants
monitoring:
  - migration drift check
  - boundary violation alert
due:         W9
status:      pending W9
```

### R-020 — Standards version drift (e.g., 21 CFR Part 11 amendment)

```text
category:    COMPL
S=6 O=4 D=5 RPN=120 AP=M
owner:       Compliance Lead
mitigation:
  - quarterly standards monitoring
  - subscription to FDA / EMA / IATF feeds
  - policy directives versioned (file 02 §1.1 §11)
  - 6-month adoption window per standard change
monitoring:
  - standards-change calendar
due:         continuous
status:      ongoing monitoring
```

---

## Section 4 — Lower-priority risks (RPN < 100 OR AP=L)

### R-021 — Translation quality for vi/ja/zh

```text
S=4 O=5 D=3 RPN=60 AP=L
mitigation: native-speaker review per release; ICU MF2 testing
```

### R-022 — i18n date/timezone bugs at boundaries

```text
S=5 O=4 D=4 RPN=80 AP=M
mitigation: tz-aware everywhere; CLDR; comprehensive test suite at boundary cases
```

### R-023 — License compliance drift in OSS deps

```text
S=5 O=3 D=3 RPN=45 AP=L
mitigation: quarterly license scan + approval list
```

### R-024 — UI accessibility regressions

```text
S=5 O=4 D=3 RPN=60 AP=M
mitigation: axe-core CI gate (file 12 §11)
```

### R-025 — Documentation drift (docs vs code)

```text
S=4 O=6 D=4 RPN=96 AP=M
mitigation: docs-as-code; PR docs review required (file 18 §7.3 ADR-0275)
```

### R-026 — Engineering knowledge concentration (bus factor)

```text
S=6 O=4 D=3 RPN=72 AP=M
mitigation: pair programming; rotation; documentation; cross-training
```

### R-027 — Vendor concentration (Postgres, Keycloak)

```text
S=6 O=2 D=5 RPN=60 AP=L
mitigation: open-source primary; vendor-neutral abstractions; exit playbook
```

### R-028 — Onboarding (new hire) productivity gap

```text
S=4 O=5 D=2 RPN=40 AP=L
mitigation: 90-day onboarding playbook (file 18 §9.3)
```

### R-029 — AI tool subscription cost / availability

```text
S=4 O=3 D=2 RPN=24 AP=L
mitigation: provider redundancy; cost monitoring
```

### R-030 — Customer-specific custom workflow proliferation

```text
S=5 O=6 D=3 RPN=90 AP=M
mitigation: state-machine framework supports custom; vertical pack templates;
            per-customer scope frozen at sale; change-control via ECO
```

---

## Section 5 — Risk by category summary

```text
TECH:    R-001, R-008, R-011, R-012, R-013, R-014, R-019, R-022, R-024, R-025
SEC:     R-002, R-004, R-008, R-010
PRIV:    R-004, R-007
COMPL:   R-002, R-005, R-006, R-007, R-009, R-018, R-020, R-022, R-023
ECON:    R-005, R-011, R-013, R-015, R-016, R-017, R-019
OPS:     R-017, R-018
TEAM:    R-011, R-026, R-028
EXT:     R-007, R-027, R-029
```

---

## Section 6 — Risk review cadence

```text
AP=H risks:    monthly review with cross-functional team
AP=M risks:    quarterly review
AP=L risks:    annual review

Risk register publication: per release
Risk-burndown dashboard:    Grafana dashboard linked from V5 documentation
```

V5 ADR-0290: Risk register cadence + dashboard.

---

## Section 7 — Open decisions (V4 §13 successor)

V4 listed 10 open decisions (D-1 to D-10). V5 reviews each:

```text
D-1   single-region vs multi-region default                 → DECIDED single-region default; multi-region post-Wave 9
D-2   self-hosted vs SaaS Keycloak vs hosted IdP            → DECIDED self-hosted Keycloak; SaaS IdP for verticals on request
D-3   Postgres vs CockroachDB                                → DECIDED Postgres canonical; Cockroach evaluated post-Wave 10
D-4   Kafka vs RabbitMQ vs NATS                             → DECIDED RabbitMQ now; Kafka or NATS at W7
D-5   Neo4j as accelerator?                                  → DECIDED Postgres-canonical OTG; Neo4j only if Q1/Q6 fail (W9+)
D-6   GraphQL adoption                                       → DECIDED W9 convenience layer
D-7   audit chain external timestamping                      → DECIDED RFC 3161 optional per regulated tenant (W8+)
D-8   ML inference platform: Triton vs custom vs SageMaker   → DECIDED FastAPI per model; Triton if GPU
D-9   Backstage adoption                                     → DECIDED yes for IDP catalog (W8+)
D-10  bug bounty program                                      → DECIDED W8+ post-hardening
```

V5 also adds new open decisions (V5-D-*):

```text
V5-D-1   should HESEM ship a "lite tier" for SMB?
V5-D-2   when to introduce CockroachDB? (currently: post-Wave 10)
V5-D-3   should AI advisory annotations have a separate retention window?
V5-D-4   how aggressively to push customer-data-export portability?
V5-D-5   when does HESEM open-source the SDK?
V5-D-6   federated learning for ML across tenants (privacy-preserving)?
V5-D-7   blockchain anchoring (vs RFC 3161) for audit chain in vertical packs?
V5-D-8   data clean-rooms for cross-tenant analytics?
V5-D-9   regulated-AI-evaluator partnership (e.g., Anthropic, OpenAI)?
V5-D-10  HESEM-as-a-platform for partner-built verticals?
```

V5 ADR-0291: V5 open decisions tracked + reviewed quarterly.

---

## Section 8 — Cumulative ADRs

```text
ADR-0290  Risk register cadence + dashboard
ADR-0291  V5 open decisions tracker
```

---

## Decision phrase

```text
V5_RISK_REGISTER_FORMAL_BASELINE_LOCKED
NEXT_FILE: 21_GPT_PRO_REVIEW_INSTRUCTIONS_V5.md
```

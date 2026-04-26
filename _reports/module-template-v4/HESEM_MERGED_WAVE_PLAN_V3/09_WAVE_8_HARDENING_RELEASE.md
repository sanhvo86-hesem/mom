# 09_WAVE_8_HARDENING_RELEASE.md

## Wave name

```text
Wave 8 — Hardening, Validation, and Release Readiness
```

## Status

```text
Estimated duration: 6-12 weeks
Codex sessions: 6-12
Predecessor gate: Wave 7 PASS
Successor gate: Wave 9 begins ONLY after Wave 8 + 1 vertical pack approved
```

## Goal

Turn HESEM from development/prototype into a controlled pre-production/release candidate.

This wave does NOT add features. It hardens.

```
Security verification (ASVS)
Accessibility verification (WCAG 2.2)
Performance baseline + budget
Observability (OpenTelemetry, Prometheus, Grafana)
CI/CD pipeline (advisory → enforced)
Rollback playbook validation
Validation master plan (IQ/OQ/PQ for HESEM platform itself)
HA active-active deployment design
DR with RPO/RTO commitments
Backup/restore tested
GDPR/CCPA compliance evidence
SOC 2 audit prep
```

After Wave 8: HESEM is **release-candidate-grade** for prototype/pre-production. Production cutover requires user approval + validation pack execution.

## Why this wave matters

Wave 1-7 deliver function. Wave 8 delivers **trust**. Without Wave 8:
- Customers cannot run HESEM in production
- Security audit fails
- A11y compliance fails (WCAG 2.2 AA mandatory in EU/CA)
- DR drill cannot be executed
- Validation master plan absent
- Hosted SaaS launch blocked

## Entry criteria

```text
[ ] Wave 7 returned PASS_READY_FOR_WAVE_8
[ ] AI Governance audit passed (no RULE-2 violations)
[ ] All 18 Wave 1 roots in Stage 2 live-API
[ ] Backend C.1+C.2+C.3+C.4 (PO/QUO; LOT/PREC/IREV/MWO from Wave 6) complete
```

## Exit criteria

```text
[ ] All security gates pass (ASVS Level 2)
[ ] All a11y gates pass (WCAG 2.2 AA)
[ ] Performance budget met (Lighthouse > 90, p95 page < 2s)
[ ] Observability stack live (metrics, logs, traces, alerts)
[ ] CI/CD enforces all guards (forbidden diff, fixture production-load, hex-in-JS, JSON parse)
[ ] HA topology designed and dry-run executed
[ ] DR drill executed (RPO 1hr, RTO 4hr verified)
[ ] Backup/restore drilled
[ ] Validation master plan published
[ ] Risk register frozen for v1
[ ] Known-limitations register signed off
[ ] Release branch policy defined
[ ] Customer onboarding playbook drafted
```

## Work packages

### WP8.1 — Security verification (ASVS Level 2)

ASVS = Application Security Verification Standard (OWASP).

Per category:
```
V1 Architecture
V2 Authentication (SSO, MFA, password complexity)
V3 Session management
V4 Authorization (RBAC + ABAC)
V5 Validation, sanitization, encoding
V6 Cryptography (e-sign, audit chain hashing)
V7 Error handling (no info leak)
V8 Data protection (PII, GDPR)
V9 Communication (TLS 1.3, HSTS)
V10 Malicious code (dep scanning, SCA)
V11 Business logic (state machine integrity)
V12 Files and resources (upload, download, retention)
V13 API and web service (REST + GraphQL hardening)
V14 Configuration
```

Output: `V28_ASVS_LEVEL_2_AUDIT.md`
Plus: `V28_PENETRATION_TEST_REPORT.md` (3rd-party pentest preferred)

### WP8.2 — Accessibility verification (WCAG 2.2 AA)

Beyond axe-core (Wave 2 baseline):
- Screen reader testing (NVDA / JAWS / VoiceOver)
- Keyboard navigation (no mouse) full flow per slice
- High-contrast mode
- 200% zoom usability
- Reduced motion
- Color-contrast 4.5:1 (text) / 3:1 (large text)
- Focus visible per ADR-0009

Output: `V28_WCAG_2_2_AA_AUDIT.md`

### WP8.3 — Performance baseline + budget

Per route:
- Lighthouse score > 90
- p95 page load < 2s
- p95 interaction < 200ms
- Bundle size < 500KB gzipped
- Time to interactive < 3s

Load test: 10K concurrent users, 1K req/sec sustained.

Output: `V28_PERFORMANCE_BUDGET_REPORT.md`
Plus: `V28_LOAD_TEST_REPORT.md`

### WP8.4 — Observability stack

Deploy:
```
Metrics:  Prometheus (scrapes app metrics + Postgres + Redis + RabbitMQ)
Logs:     Loki or ELK (structured logs from app + nginx + Postgres)
Traces:   Jaeger via OpenTelemetry SDK
Alerts:   AlertManager + PagerDuty integration
Dashboard: Grafana (per-domain SLO visibility)
```

Per-route observable events:
- route opened
- bridge alias used
- bridge alias unmapped (WARN)
- live-API enabled (INFO)
- live-API error (WARN)
- workflow transition requested (INFO)
- workflow transition denied (WARN)
- record shell rendered (INFO)
- projection stale (WARN)

Output: `V28_OBSERVABILITY_STACK_REPORT.md`

### WP8.5 — CI/CD pipeline enforcement

`.github/workflows/hmv4-e2e.yml` from Wave 1 was advisory. Wave 8 makes it enforced:
- Required check on PR to main
- Branch protection: 2 reviewers + green CI
- Auto-revert on main if smoke fails
- Daily cross-browser visual regression (chromium + firefox + webkit)
- Daily axe-core a11y check
- Weekly performance regression check
- Weekly security dep scan (npm audit, composer audit)

Output: `V28_CI_PIPELINE_ENFORCEMENT.md`

### WP8.6 — Validation master plan

For HESEM platform validation:
- Validation master plan document
- Requirements-to-test traceability matrix
- IQ (installation qualification) script
- OQ (operational qualification) script per slice
- PQ (performance qualification) script per workflow
- Validation summary report

Output: `V28_VALIDATION_MASTER_PLAN.md` + IQ/OQ/PQ scripts

### WP8.7 — HA active-active deployment design

```
Topology:
  - 3+ app servers behind LB (round-robin)
  - PostgreSQL primary + replica streaming + read replicas
  - Redis Sentinel (3 nodes)
  - RabbitMQ cluster (3 nodes)
  - Object storage (S3-compatible) with cross-region replication
Multi-AZ: yes
Multi-region: nice-to-have for v1, mandatory for v2
```

Output: `V28_HA_DEPLOYMENT_ARCHITECTURE.md`
Plus: `V28_HA_DRY_RUN_REPORT.md` (failover dry run)

### WP8.8 — DR drill

```
RPO target: 1 hour (max data loss)
RTO target: 4 hours (max downtime)
Backup strategy:
  - PostgreSQL PITR + daily full backup, 7-year retention for compliance data
  - Object storage cross-region replication
  - Audit chain WORM (S3 Object Lock)
DR drill: full failover from primary region to DR region; verify RPO/RTO
```

Output: `V28_DR_DRILL_REPORT.md`

### WP8.9 — GDPR / CCPA compliance evidence

```
DSAR workflow (Data Subject Access Request)
Data deletion (right to erasure)
Data portability export (JSON/CSV)
Consent management
Privacy impact assessment per process (PIA)
Cookie compliance
Data retention policy enforcement
```

Output: `V28_PRIVACY_COMPLIANCE_REPORT.md`

### WP8.10 — SOC 2 Type II audit prep

```
Trust Services Criteria:
  - Security
  - Availability
  - Processing Integrity
  - Confidentiality
  - Privacy

Evidence required:
  - Access control records
  - Change management records
  - Incident response runbook
  - Vendor management records
  - Annual penetration testing
  - Risk assessment annual
  - Business continuity plan tested
  - Vulnerability management program
```

Output: `V28_SOC_2_AUDIT_READINESS.md`

### WP8.11 — Release branch policy

```
Trunk-based development with release branches
Tagged releases: v1.0.0-rc1, v1.0.0
Hotfix branch policy
Backport policy
Release notes template
Customer changelog
```

Output: `V28_RELEASE_BRANCH_POLICY.md`

### WP8.12 — Wave 8 integration

Wave 8 final integration:

```text
V28_WAVE_8_RELEASE_READINESS_REPORT.md
```

Decision phrase:
```text
WAVE_8_RELEASE_READINESS_PASS_READY_FOR_PRODUCTION_CUTOVER_GATE
WAVE_8_RELEASE_READINESS_PASS_WITH_WARNINGS
WAVE_8_RELEASE_READINESS_FAIL_BLOCK_NEXT
```

## Workload estimate

```text
Codex sessions: 6-12 (Wave 8 is heavy on human work, less Codex)
Human work: 5-20 days (security audit, validation, drills require humans)
Calendar elapsed: 6-12 weeks
```

## Allowed files

```text
.github/workflows/hmv4-e2e.yml (extended with daily/weekly schedules)
mom/api/middleware/* (security hardening)
mom/api/Logging/* (observability)
docs/validation/* (NEW directory for IQ/OQ/PQ)
docs/security/* (NEW directory for SOC 2 evidence)
docs/privacy/* (NEW directory for GDPR/CCPA)
docs/release/* (NEW directory for release procedure)
docs/ha-dr/* (NEW directory for infra)
_reports/module-template-v4/V28_*.md (12 V28 reports)
```

## Forbidden

```text
Any new feature
Any forbidden file (production protection paramount in Wave 8)
HMV4_PREVIEW_ENABLED defaults change
mom/qms-data/**
Stage 3 mutation graduation (still no auto-mutation)
3rd-party telemetry without explicit data privacy review
```

## Per-rule compliance

- **RULE-1**: All slices remain Stage 2 max; Stage 3 graduation deferred to first vertical pack in Wave 9
- **RULE-2**: AI Governance audit re-validated
- **RULE-3**: Pre-production wording strict; PRODUCTION wording allowed ONLY in WP8.6 validation pack and WP8.11 release policy
- **RULE-4**: 8 standard artifacts × 12 work packages = 96 artifacts (large wave)
- **RULE-5**: Wave 7 must PASS
- **RULE-6**: 15-question checklist
- **RULE-7**: V28 naming
- **RULE-8**: Read-only graduation strict

## Decision phrase

```text
WAVE_8_RELEASE_READINESS_PASS_READY_FOR_PRODUCTION_CUTOVER_GATE
WAVE_8_RELEASE_READINESS_PASS_WITH_WARNINGS
WAVE_8_RELEASE_READINESS_FAIL_BLOCK_NEXT
```

After Wave 8 PASS: USER decides production cutover trigger. This is the FIRST point at which "production" wording is allowed in commit messages and release notes.

```
WAVE_8_PLAN_BASELINE_LOCKED
```

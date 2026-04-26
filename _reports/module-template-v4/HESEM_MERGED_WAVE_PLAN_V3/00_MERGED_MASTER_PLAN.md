# 00_MERGED_MASTER_PLAN.md

## 1. Purpose

This master plan is the **merged execution roadmap** for HESEM Operations Platform — a development/prototype ERP + MOM + MES + eQMS system on repository `sanhvo86-hesem/mom`.

It merges:
- GPT Pro's 9-wave plan (operational discipline, stabilization gates, AI governance)
- Claude Code Strategic Master V2 (world-class capability scoring, vertical packs, MES depth, finance core, multi-tenancy)

**This is V3** — supersedes both inputs once accepted.

```text
NOT production
development / prototype / pre-production readiness
current portal safety first
feature-flagged HMV4 prototype
slice-based rollout
fixture-first → opt-in live API → controlled mutation graduation
```

Do not use production-cutover language unless project enters formal release lane (Wave 8 trigger).

## 2. Repo-grounded current state (verified 2026-04-26 against main HEAD)

```text
main HEAD includes:
  - GPT Pro 9-wave plan review file
  - Strategic Master V2 + Wave 1-4 V2 roadmaps
  - World-class benchmark reference
  - Phase 4 Codex megaprompts (Slices 9-12 + nav shell expansion)
  - Phase 3 carry-over: BREL baselines, live-API replication, ADR-0012

Stream status (verified):
  - Cross-browser: CROSS_BROWSER_FAIL_BLOCK_NEXT
  - CAPA Slice 4: CAPA_SLICE4_PASS_WITH_WARNINGS
  - NQCASE live API: LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS
  - Backend Transactional REST C.2: TRANSACTIONAL_REST_PASS_WITH_WARNINGS

Slices on main (record shells / workspaces):
  - DISP, NQCASE, TRAIN, CAPA, CDOC, INSP, BREL, ECO (governed/quality)
  - Nav shell SH/DL/ML
  - Slices 9-12 (transactional) NOT yet executed; megaprompts ready

Backend canonical aliases:
  - Stream C.1 (EQMS plural aliases): ~91 routes
  - Stream C.2 (transactional REST SO/JO/WO): formalized
  - Stream C.3 (CPO rename): canonical /api/v1/customer-purchase-orders
  - Stream C.4 (RED roots PO/QUO/PREC/LOT/IREV/MWO): NOT STARTED

ADRs: 12 (10 + ADR-0011 live-api + ADR-0012 replication pattern)

Tests: ~150-200 Playwright (chromium passing; firefox+webkit have baseline drift)
```

**Therefore the immediate next action is NOT another business slice.** It is Wave 0 stabilization.

## 3. Frozen architectural constraints (per ADR-0001 to ADR-0012)

```text
Product shell: HESEM Operations Platform
Canonical shell route: /ops
14 experience domains
46 primary modules (61 detailed capabilities incl. demoted)
8 macro bounded contexts (BC1-BC8)
8 enterprise spines
9 route classes (SH, DL, ML, AC, AR, ERD, NRD, WS, SFW)
23 frozen API family tokens
HMV4 additive/feature-flagged/rollback-safe
Current portal inert by default (HMV4_PREVIEW_ENABLED=false)
74-module-template-v4-fixtures.js never loaded in mom/portal.html
```

Forbidden files:
```text
mom/portal.html (only guarded feature-flag insertion allowed)
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/qms-data/** (no production registry promotion)
```

## 4. Wave overview (10 waves: 0 + 8 + 9-extension)

| Wave | Name | Core objective | Implementation allowed? | Predecessor gate |
|---|---|---|---|---|
| **0** | Phase 2 Integration Stabilization | Repair cross-browser FAIL + review 3 PASS_WITH_WARNINGS | limited repair only | none — must run FIRST |
| **1** | HMV4 Foundation Consolidation | Document 9 proven slices, pattern registry, branch hygiene | docs only | Wave 0 PASS |
| **2** | Governed Record Shells & Quality | CDOC, INSP, BREL, ECO QA hardening; missing slice closure | mostly already done; QA only | Wave 1 PASS |
| **3** | Workforce / Maintenance / Connected Worker | Training depth, MWO readiness, operator UX | after E2E/visual stable | Wave 2 PASS |
| **4** | Live API Cutover & Backend Contracts | Per-slice opt-in live API; close backend C.2 warnings | opt-in only | Wave 3 PASS |
| **5** | Core Transactional ERP/MOM | Slices 9-12 (JO/SO/WO/CPO) + nav shell expansion | controlled | Wave 4 PASS |
| **6** | Digital Thread / Genealogy / Release | Genealogy explorer, LOT root, batch release packet trace | after record shells mature | Wave 5 PASS |
| **7** | Analytics / AI / Knowledge / Improvement | KPI dashboards, AI advisory (governance enforced), RCA, lessons | advisory only | Wave 6 PASS |
| **8** | Hardening / Validation / Release Readiness | Security, a11y, performance, CI, validation, HA/DR, SOC 2 | no feature expansion | Wave 7 PASS |
| **9** | World-Class Extension | MES depth + finance core + multi-tenancy + AI/ML platform + vertical packs + marketplace | post v1 release | Wave 8 + 1 vertical pass |

## 5. Recommended execution sequence (CRITICAL DISCIPLINE)

```text
1. Wave 0 first — repair stabilization warnings.
2. Wave 1 — consolidate documentation in parallel.
3. Wave 2 QA closure (CAPA warnings, INSP/BREL/ECO/CDOC stabilize) — partial done.
4. Wave 3 starts after Wave 0/1/2 pass.
5. Wave 4 hardens live API (NQCASE first; replicate per slice).
6. Wave 5 = Phase 4 megaprompts already prepared; resume after Wave 0-4 close.
7. Wave 6-8 sequential after Wave 5 close.
8. Wave 9 only after first vertical pack approved (Wave 8 trigger).
```

**Hard rule**: Do NOT start a new slice while ANY upstream wave has FAIL_BLOCK_NEXT outstanding.

## 6. Workload estimate (merged + revised)

These are planning estimates for a Codex-assisted development/prototype program with 1-2 humans reviewing.

| Wave | Codex sessions | Human review | Calendar elapsed | Cumulative |
|---|---:|---:|---:|---:|
| Wave 0 | 1-3 | 1-2 days | 1-3 days | ≤ 1 week |
| Wave 1 | 1-2 | 1 day | 1-2 days | ≤ 2 weeks |
| Wave 2 | 4-8 | 2-4 days | 2-4 weeks | ≤ 6 weeks |
| Wave 3 | 4-8 | 2-5 days | 2-5 weeks | ≤ 11 weeks |
| Wave 4 | 5-10 | 4-8 days | 4-8 weeks | ≤ 19 weeks |
| Wave 5 | 8-16 | 5-12 days | 6-12 weeks | ≤ 31 weeks (~7 months) |
| Wave 6 | 8-14 | 5-12 days | 6-12 weeks | ≤ 43 weeks (~10 months) |
| Wave 7 | 8-16 | 5-15 days | 8-16 weeks | ≤ 59 weeks (~14 months) |
| Wave 8 | 6-12 | 5-20 days | 6-12 weeks | ≤ 71 weeks (~16 months) |
| Wave 9 | 30-60 | 20-40 days | 12-18 months | ≤ 30 months total |

```text
Pre-production readiness (Wave 0-8 close):  9-18 months
Release v1 candidate (Wave 8 + 1 vertical):  ~12-20 months
World-class parity (Wave 9 close):           24-30 months
```

This is realistic — GPT Pro estimate (4-8 months prototype) was for prototype-only, not release-ready. Claude V2 (12 months full-team) was optimistic for release-grade. Merged middle ground: **~12-18 months to release v1**.

## 7. Quality strategy — 8 standard artifacts per wave

Each wave must produce:

```text
1. Implementation report          (S<n>_<scope>_IMPLEMENTATION_REPORT.md)
2. QA report                      (S<n>_<scope>_QA_REPORT.md)
3. Rollback procedure             (S<n>_<scope>_ROLLBACK_PROCEDURE.md)
4. Fixture coverage report        (S<n>_<scope>_FIXTURE_COVERAGE_REPORT.md)
5. E2E result summary             (embedded in implementation/QA)
6. Forbidden diff guard result    (embedded; PASS/FAIL)
7. Current portal safety result   (embedded; INERT/ENABLED)
8. Decision phrase                (one of: PASS_READY_FOR_QA / PASS_WITH_WARNINGS / FAIL_BLOCK_NEXT)
```

## 8. Eight Discipline Rules (FROZEN — see `11_DISCIPLINE_RULES.md`)

```text
RULE-1: Three-stage graduation per slice (fixture → opt-in live → controlled mutation)
RULE-2: AI governance — 8 banned autonomous regulated decisions
RULE-3: Pre-production wording mandatory across docs
RULE-4: 8 standard artifacts per wave (above)
RULE-5: Wave stabilization gate — never enter next wave with FAIL outstanding
RULE-6: 15-question verification checklist per major prompt
RULE-7: Naming convention V<n> for prompts, S<n> for artifacts
RULE-8: Read-only graduation per slice (no fixture→uncontrolled-mutation jumps)
```

## 9. Four Measurement Rubrics (FROZEN — see `12_MEASUREMENT_RUBRICS.md`)

```text
RUBRIC-1: 11 capability pillars × 5 levels scored quarterly
RUBRIC-2: Compare HESEM to SAP/Oracle/Veeva/MasterControl/Siemens benchmark
RUBRIC-3: Build-vs-buy decision per capability tracked
RUBRIC-4: Slice progress mapped to ISA-95 / ISO 9001 / 21 CFR / IATF / AS9100 / HACCP coverage
```

## 10. World-class implementation principle

The target system is strongest **not by having the most screens**, but by having the strongest **control structure**:

```text
root authority (52 frozen roots, 18 Wave 1, 6 RED, ~28 Wave 9 extensions)
workflow lifecycle (per Step 2 schemas)
API contracts (REST canonical + plural-form aliases + 301 redirects)
route contracts (9 route classes per Step 4)
screen contracts (per Step 5)
semantic HTML (Step 6 + ADR-0009 graphics authority)
observability (Wave 8: OpenTelemetry, Prometheus, Grafana)
security (Wave 8: ASVS, SOC 2, GDPR)
accessibility (WCAG 2.2 AA enforced via axe-core)
rollback (per-slice + commit-level + feature-flag)
digital thread (Wave 6: end-to-end traceability)
AI governance (Wave 7: advisory only, 8 banned autonomous decisions)
multi-tenancy (Wave 9: tenant isolation discipline)
```

## 11. Compared to GPT Pro's 9-wave plan

This merged plan **adopts** GPT Pro's:
- Wave 0 stabilization mandate
- AI governance rule (8 banned autonomous decisions)
- 3-stage graduation per slice
- Pre-production wording
- 15-question verification checklist
- Wave 1 documentation/consolidation phase

This merged plan **adds** to GPT Pro's:
- Wave 9 World-Class Extension (MES depth + finance core + multi-tenancy + AI/ML platform + 3-5 vertical compliance packs + marketplace)
- 11-pillar capability scoring rubric
- Build-vs-buy per capability
- Vendor competitive positioning vs SAP/Oracle/Veeva/Siemens
- Specific MES platform extensions (event bus, equipment connector, statistical engine)
- Specific industry compliance packs (Pharma 21 CFR/ICH/GAMP 5; Auto IATF/VDA/AIAG; Aero AS9100/AS9102/NADCAP)

## 12. Compared to Claude V2 plan

This merged plan **adopts** Claude V2's:
- 11-pillar scoring rubric
- Industry vertical packs (Pharma/Auto/Aero/Med Device/Food)
- MES depth (SPC/OEE/IoT/calibration/FMEA/validation roots)
- Finance core (GL/AP/AR/FA)
- Multi-tenancy + AI/ML platform foundation
- HA/DR + SOC 2 + GDPR + observability
- Marketplace + 8 pre-built connectors
- Build-vs-buy decisions
- Vendor competitive benchmark

This merged plan **corrects** Claude V2's:
- Missing Wave 0 stabilization (→ added)
- Drift to "production" wording (→ tightened to "pre-production readiness")
- No 8-rule discipline framework (→ added)
- No 15-question verification (→ added)
- Optimistic 12-month timeline (→ revised to 12-18 months prototype, 24-30 months world-class)

## 13. Open decisions (USER input required before Wave 9)

GPT Pro and Claude V2 both raised decisions that AI cannot make:

```
D-A. Approve Chromium baseline repair? (Wave 0)
D-B. Re-QA each PASS_WITH_WARNINGS dedicated reports? (Wave 0)
D-C. Block new slices until Wave 0 passes? (default YES)
D-D. Production cutover trigger? (recommended: after Wave 8 + 1 vertical pack pass)

D-1. Go-to-market: SaaS multi-tenant OR on-prem licensed OR hybrid?
D-2. Target verticals (top 3 of {pharma, auto, aero, med dev, food, electronics, general})?
D-3. AI/ML investment: build in-house OR integrate cloud (AWS SageMaker, Azure ML, GCP)?
D-4. Mobile: PWA only OR native iOS+Android OR Flutter/React Native?
D-5. Real-time stack: RabbitMQ extended OR Kafka migration OR cloud-native?
D-6. IoT depth: reference architecture OR pre-built connectors OR fully integrated?
D-7. Compliance certification timeline + budget?
D-8. Team scaling: solo Codex-augmented OR hire team for parallel waves?
D-9. Open-source vs proprietary licensing?
D-10. Real-time stack vendor / cloud commitment?
```

These should be resolved before Wave 7 (AI governance freeze) and Wave 8 (release readiness).

## 14. Claude/Codex/GPT Pro verification requirements

Before approving this plan, reviewers should verify against repo:

1. Does current main contain reports for Phase 2 streams? **YES** — verified
2. Is cross-browser still blocked? **YES** — `CROSS_BROWSER_FAIL_BLOCK_NEXT` in S_QA_CROSS_BROWSER_REPORT
3. Are CAPA + live-API + REST C.2 still PASS_WITH_WARNINGS? **YES** — all 3 verified
4. Are forbidden files untouched? **YES** — verified
5. Is 74 excluded from mom/portal.html? **YES** — verified
6. Is current portal inert by default? **YES** — `HMV4_PREVIEW_ENABLED=false`
7. Are reports tracked intentionally? **YES** — `_reports/module-template-v4/` whitelist active
8. Is there dirty working tree? Inspect before each wave start
9. Is there branch divergence? Inspect before each wave start
10. Are all future prompts using non-production language? Enforce per RULE-3

## 15. Next file to use

```text
01_WAVE_0_STABILIZATION.md
```

This is mandatory before any further slice or live-API work.

---

**Companion files in this plan (read in order)**:
```
00_MERGED_MASTER_PLAN.md (this file)
01_WAVE_0_STABILIZATION.md
02_WAVE_1_FOUNDATION_CONSOLIDATION.md
03_WAVE_2_GOVERNED_RECORDS.md
04_WAVE_3_WORKFORCE_MAINTENANCE.md
05_WAVE_4_LIVE_API_BACKEND.md
06_WAVE_5_TRANSACTIONAL_CORE.md
07_WAVE_6_DIGITAL_THREAD.md
08_WAVE_7_ANALYTICS_AI.md
09_WAVE_8_HARDENING_RELEASE.md
10_WAVE_9_WORLDCLASS_EXTENSION.md
11_DISCIPLINE_RULES.md
12_MEASUREMENT_RUBRICS.md
13_GPT_PRO_REVIEW_INSTRUCTIONS.md
```

```
DECISION_PHRASE: MERGED_MASTER_PLAN_V3_BASELINE_LOCKED_PENDING_USER_APPROVAL
```

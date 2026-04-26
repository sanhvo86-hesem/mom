# 03_WAVE_PLAN_V5_REFINED.md

## Purpose

GPT Pro V4 §04 publishes an **11-wave roadmap (Wave 0 → Wave 10)** with a one-line synopsis per wave and a "must-touch L1 + one of L2/L3/L4" rule.

V4's wave model is **directionally correct** but produces three execution problems:

1. **Foundation gap.** V4 jumps from Wave 0 (stabilize) to Wave 1 (governed records foundation) without authoring the platform substrates (OTG tables, OTel stack, identity, policy engine). Slices that try to claim Wave-1 maturity find these substrates missing, forcing inline shortcuts that violate L1/L2/L8.

2. **Live-API graduation cliff.** V4's Wave 4 is the single graduation event from Stage 1 fixtures to Stage 2 live API for *all* slices simultaneously. In practice, slices graduate at different rates; a single-wave gate produces either premature graduation (some slices not ready) or stalls (all slices wait for the slowest).

3. **Vertical pack saturation.** V4's Wave 9 bundles Pharma + Auto + Aero + ML platform + multi-tenancy + GraphQL + portals + marketplace + 8 connectors into one wave. This is ~280 engineering-weeks of work behind a single decision phrase. Failure of any sub-stream blocks all of Wave 9.

V5 refines V4's 11 waves to **14 waves** by inserting three sub-waves: 0.5, 4.5, and 6.5. The sub-wave numbering is explicit so the relationship to V4 remains transparent.

V5 also introduces a **tri-axial maturity coordinate** (Slice Maturity Cube, per master thesis §10) so that a slice's progress is no longer a single Stage 1/2/3 ladder but a 3-dimensional position the wave gate evaluates.

---

## Section 1 — V4 → V5 wave delta table

| V5 Wave | V4 Wave | Δ |
|---|---|---|
| **W0** Stabilization | W0 | unchanged |
| **W0.5** Platform substrate (NEW) | — | **NEW SUB-WAVE** |
| **W1** Governed records foundation | W1 | unchanged scope; OTG nodes added |
| **W2** Workforce + training | W2 | unchanged |
| **W3** Quality engineering depth | W3 | unchanged scope; refined gates |
| **W4** Live-API foundation | W4 | refined: per-slice graduation |
| **W4.5** OTG-native cutover (NEW) | — | **NEW SUB-WAVE** |
| **W5** Transactional mutation | W5 | unchanged |
| **W6** Digital thread + analytics | W6 | unchanged scope |
| **W6.5** AI advisory rollout (NEW) | — | **NEW SUB-WAVE** |
| **W7** AI governance + analytics | W7 | refined: AI advisory promoted to W6.5 |
| **W8** Hardening + release readiness | W8 | unchanged scope; SOC2 audit prep added |
| **W9** Multi-tenancy + portals | W9 (subset) | scope narrowed (verticals split) |
| **W10** Vertical packs + marketplace | W9/W10 | scope expanded (verticals here) |

Total: **14 waves** vs V4's 11.

The three NEW sub-waves are not "extra work" — they extract platform/integration scope that V4 hides inside other waves and exposes the dependencies explicitly. Net engineering-weeks are unchanged; only the sequencing and gate boundaries change.

---

## Section 2 — Wave-by-wave specification

For each wave V5 specifies:

```text
- Wave name
- Predecessor / successor gates
- Goal in one paragraph (engineering substance, not aspirational)
- Entry criteria (concrete checks)
- Exit criteria (concrete deliverables)
- Layer × cross-cutting coverage matrix (per file 01 §6)
- Workload estimate (engineering-weeks, full-team / Codex-augmented)
- Standards touched
- Decision phrase set
- Risk register pointers
```

---

### W0 — Stabilization (Wave 0)

```text
Goal: stop bleeding. Repair tests, lock conventions, freeze inert defaults.
      No new features, no scope expansion.

Predecessor: Phase 2 streams CROSS_BROWSER_FAIL_BLOCK_NEXT (current state)
Successor:   W0.5
```

**Entry criteria**

```text
[ ] Repository at expected HEAD with all expected reports
[ ] Phase 2 stream reports archived under _reports/module-template-v4/
[ ] Working tree clean before W0 work begins
```

**Exit criteria**

```text
[ ] Cross-browser visual regression GREEN on chromium baseline
[ ] All PASS_WITH_WARNINGS classified as must_fix_now / schedule / accept
[ ] Forbidden file diff guard PASS
[ ] HMV4_PREVIEW_ENABLED defaults preserved (false)
[ ] CI advisory pipeline GREEN on main
[ ] All Phase 2 lessons captured in _reports/module-template-v4/V21_PHASE2_INTEGRATION_REVIEW_REPORT.md
[ ] Wave 0 stabilization report PASS
```

**Layer × cross-cutting coverage**

W0 only repairs L6/L7. No new substrate.

```text
            L1  L2  L3  L4  L5  L6  L7  L8
   C1       .   .   .   .   .   .   .   .
   C8       .   .   .   .   .   •   •   .   (existing telemetry kept alive)
   C12      .   .   .   .   .   •   .   .   (a11y regressions repaired)
```

**Workload**

```text
Codex sessions: 2-4
Calendar: 1-2 weeks
```

**Decision phrase**

```text
WAVE_0_STABILIZATION_PASS_READY_FOR_W0_5
WAVE_0_STABILIZATION_PASS_WITH_WARNINGS
WAVE_0_STABILIZATION_FAIL_BLOCK_NEXT
```

**Risk pointers**

`20_RISK_REGISTER_V5_FORMAL.md` items: R-001 to R-005.

---

### W0.5 — Platform Substrate (NEW SUB-WAVE)

```text
Goal: build the L1/L2/L8 substrates that all subsequent waves depend on.
      No business slices touched. Pure platform engineering.

Predecessor: W0 PASS
Successor:   W1
```

This wave fills V4's gap. It is sized at 4–6 weeks because the substrates are foundational.

**Work packages**

```text
WP0.5.1  Identity & policy engine baseline
         - Keycloak (or alternative OIDC IdP) deployed
         - Tenant + role tables created
         - PolicyEngine service spec authored (decide endpoint)
         - L1 semantic conventions for OTel
         - 21 CFR Part 11 e-sign factor pluggability sketched

WP0.5.2  Observability stack (OTel + Prometheus + Loki + Jaeger)
         - OTel collector deployed
         - Prometheus scraping HESEM service
         - Loki ingesting structured logs
         - Jaeger query UI live
         - Per-domain Grafana dashboards stubbed
         - Alerting rules published

WP0.5.3  OTG schema baseline (per file 02 Section 4)
         - migration 200_otg_baseline.sql created
         - empty tables exist with all indexes + RLS + triggers
         - Integrity job scheduled with axiom A1–A14 query suite
         - Materialized views created (empty)
         - Audit chain anchor cron scheduled

WP0.5.4  Problem-detail factory (RFC 9457)
         - ProblemDetailService class authored
         - Standard type URIs registered for known errors
         - L7 middleware emits problem-detail on every error path
         - Localization hooks via ICU MessageFormat 2

WP0.5.5  Idempotency + ETag + If-Match middleware
         - IdempotencyMiddleware with 24h replay window
         - VersionMiddleware with ETag generation + If-Match validation

WP0.5.6  Tenant guard middleware
         - TenantGuardMiddleware sets app.tenant_id from JWT claim
         - Refuses requests where claim missing

WP0.5.7  Audit chain primitives
         - AuditChainService writes hash-chained audit_events
         - Anchor cron computes daily merkle root
         - Optional external timestamping connector stubbed
```

**Exit criteria**

```text
[ ] All WP0.5.* deliverables present
[ ] OTG schema migrated on staging DB
[ ] Integrity job runs cleanly against empty tables
[ ] OTel collector ingesting spans from at least one HESEM service
[ ] L1 /decide endpoint returns deterministic decisions for permission table
[ ] Problem-detail factory unit tests pass
[ ] No business surface affected (HMV4 prototype unchanged)
```

**Layer × cross-cutting coverage**

W0.5 lights up all 8 layers' substrates without producing business value:

```text
            L1  L2  L3  L4  L5  L6  L7  L8
   C1       •   •   .   .   .   .   .   •
   C2       •   •   .   .   .   .   .   .
   C4       •   .   .   •   •   .   •   .
   C5       .   .   .   .   .   .   •   .
   C6       .   .   .   .   .   .   •   .
   C7       .   .   .   .   .   .   •   .
   C8       •   •   •   •   •   •   •   •
```

**Workload**

```text
Codex sessions: 6-10
Engineering-weeks: 8 (2 engineers × 4 weeks, or 1 × 8)
Calendar: 4-6 weeks
```

**Standards touched**

OpenAPI 3.1.1, RFC 9457, RFC 9110 (HTTP semantics), RFC 7232 (ETag), OpenTelemetry semantic conventions 1.27+, OWASP ASVS 5.0 §V2 §V3 §V4, NIST SP 800-63B (authentication assurance levels).

**Decision phrase**

```text
WAVE_0_5_PLATFORM_SUBSTRATE_PASS_READY_FOR_W1
WAVE_0_5_PLATFORM_SUBSTRATE_PASS_WITH_WARNINGS
WAVE_0_5_PLATFORM_SUBSTRATE_FAIL_BLOCK_NEXT
```

**Why this sub-wave matters**

Without W0.5, every subsequent wave smuggles platform work into business slices. Slice S20 (training matrix) ends up containing a half-built policy decide endpoint. Slice S15 (BREL release) contains an inline audit-chain primitive. The codebase becomes 18 different mini-platforms. W0.5 is **the cost of not having platform debt later**.

---

### W1 — Governed Records Foundation (Wave 1)

```text
Goal: 18 authoritative_root tables exist; first 12 record-shells render
      from fixture; CDOC + BREL + NC + WO/MWO + LOT + IREV first-class.

Predecessor: W0.5 PASS
Successor:   W2
```

**Scope unchanged from V4 W1.** The 18 roots, 4 BC patterns, 9 route classes per V3 plan.

**Δ from V4:** every slice's wave-completion artifact must populate `otg_node` rows for its authoritative_roots from fixture data, so the OTG starts collecting data even though projections are not yet live. This is Stage 1 of the OTG migration plan (per file 02 §10).

**Layer × cross-cutting coverage**

```text
            L1  L2  L3  L4  L5  L6  L7  L8
   C1       •   .   •   •   •   .   •   •
   C3       .   .   .   •   •   •   •   .
   C4       •   .   .   •   •   .   •   .
   C8       •   .   •   •   •   •   •   •
   C12      .   .   .   .   .   •   .   .
```

**Workload**

```text
Codex sessions: 12-18 (per slice + integration)
Engineering-weeks: 24 (already partially done as of repo state)
Calendar: 8-12 weeks
```

**Decision phrase**

```text
WAVE_1_FOUNDATION_PASS_READY_FOR_W2
WAVE_1_FOUNDATION_PASS_WITH_WARNINGS
WAVE_1_FOUNDATION_FAIL_BLOCK_NEXT
```

---

### W2 — Workforce + Training (Wave 2)

```text
Goal: 4 net-new roots (TRAIN-COURSE, TRAIN-RECORD, COMP-MATRIX, ROLE),
      per V4. Authority class: authoritative_root. Stage 1 fixture.
```

Scope unchanged from V4 W2. OTG nodes populated for new roots. C2 (e-sign) wired for training certification transitions.

**Decision phrase**

```text
WAVE_2_WORKFORCE_PASS_READY_FOR_W3
WAVE_2_WORKFORCE_FAIL_BLOCK_NEXT
```

---

### W3 — Quality Engineering Depth (Wave 3)

```text
Goal: NC, CAPA, SCAR, INS, MRB, IQC, IPC, OQC roots reach Stage 1 maturity
      with full state machine (per file 01 §3, SM-3 + SM-4).
```

**Δ from V4:** state machines SM-3 and SM-4 declared formally per file 01 §3. Workflow event nodes populated for every transition (even Stage 1 simulated transitions emit otg_event into staging).

**Decision phrase**

```text
WAVE_3_QUALITY_ENGINEERING_PASS_READY_FOR_W4
WAVE_3_QUALITY_ENGINEERING_FAIL_BLOCK_NEXT
```

---

### W4 — Live-API Foundation (Wave 4)

```text
Goal: graduate slices from Stage 1 → Stage 2 (opt-in live read-only).
      Per-slice graduation, NOT bulk wave graduation.

Predecessor: W3 PASS
Successor:   W4.5
```

**Δ from V4:** V4 treats Wave 4 as one graduation event. V5 converts it to a *graduation window* during which slices may individually graduate, gated per-slice by:

```text
[ ] OpenAPI 3.1.1 spec for the slice's resource family published
[ ] Live read endpoint returning canonical envelope
[ ] Adapter normalizes response to fixture shape (per V4 ADR-0012)
[ ] Per-slice graduation ADR authored
[ ] User approval phrase: "Proceed with <slice> Stage 2 live-API graduation"
[ ] Cross-browser visual regression GREEN against live source
[ ] OTG nodes mirror live source within 5s
[ ] Performance budget met per route
```

**Exit criterion for W4 wave (not per-slice)**

```text
[ ] At least 60% of Wave 1 + Wave 2 + Wave 3 slices graduated to Stage 2
[ ] Forbidden file diff guard PASS
[ ] No silent fallback to fixture on live-API error
[ ] Per-slice graduation tracker updated in _reports/module-template-v4/V<n>_LIVE_API_GRADUATION_TRACKER.md
```

**Layer × cross-cutting coverage**

W4 lights up L7 fully:

```text
            L1  L2  L3  L4  L5  L6  L7  L8
   C5       .   .   •   .   .   .   •   .
   C6       .   .   .   •   .   .   •   .
   C7       .   .   •   .   .   .   •   .
```

**Decision phrase**

```text
WAVE_4_LIVE_API_FOUNDATION_PASS_READY_FOR_W4_5
WAVE_4_LIVE_API_FOUNDATION_PASS_WITH_WARNINGS
WAVE_4_LIVE_API_FOUNDATION_FAIL_BLOCK_NEXT
```

---

### W4.5 — OTG-Native Cutover (NEW SUB-WAVE)

```text
Goal: turn the OTG from "shadow data store" into the canonical reporting source.
      Projections served from OTG-derived materialized views, not direct queries.

Predecessor: W4 PASS
Successor:   W5
```

**Why this sub-wave matters**

V4 Waves 6 (digital thread) and 7 (analytics) assume the OTG is already authoritative — but V4 never specifies *when* the cutover happens. V5 places the cutover in W4.5 so that all subsequent analytic and AI work runs on a single substrate.

**Work packages**

```text
WP4.5.1  CDC pipeline live
         - Postgres logical decoding consumer running per resource family
         - otg_event population from authoritative_root mutations
         - Lag SLO: < 5 seconds p95

WP4.5.2  Materialized view backfill
         - mv_otg_genealogy_upstream populated
         - mv_otg_open_ncs_by_lot populated
         - mv_otg_brel_release_history populated
         - Refresh schedule established

WP4.5.3  Workspace projection cutover
         - Slice 1-12 workspaces switch from direct-query to projection-query
         - Performance budget verified per workspace
         - Drift check (rebuild = live) zero

WP4.5.4  Audit chain anchoring live
         - Daily anchor cron PASS for 7 consecutive days
         - External timestamping (RFC 3161) connector live (optional)
         - Verification job exercised for sample audit_event

WP4.5.5  Integrity job at scale
         - Axiom A1-A14 checks run nightly against full OTG
         - Zero violations for 7 consecutive nights
         - Runtime within 1h budget
```

**Exit criteria**

```text
[ ] All workspaces serve from OTG projection
[ ] Drift = 0 across all materialized views
[ ] OTG event lag < 5s p95
[ ] Integrity job zero violations × 7 consecutive nights
[ ] Audit chain anchor daily PASS × 7 consecutive nights
```

**Workload**

```text
Codex sessions: 6-8
Engineering-weeks: 6
Calendar: 3-4 weeks
```

**Decision phrase**

```text
WAVE_4_5_OTG_NATIVE_CUTOVER_PASS_READY_FOR_W5
WAVE_4_5_OTG_NATIVE_CUTOVER_PASS_WITH_WARNINGS
WAVE_4_5_OTG_NATIVE_CUTOVER_FAIL_BLOCK_NEXT
```

---

### W5 — Transactional Mutation (Wave 5)

```text
Goal: graduate selected slices from Stage 2 → Stage 3 (controlled mutation).
      Per-mutation-surface ADR mandatory. NEVER bulk graduation.
```

**Δ from V4:** V4 W5 is unchanged. V5 enforces per-surface ADR authorship before each Stage 3 graduation, and requires the mutation to flow through the formal state-machine network (per file 01 §3 SM-1 to SM-8).

**Per-mutation graduation gate (per surface)**

```text
[ ] State machine declares the transition (in state_machine_definition table)
[ ] Workflow contract specified (guards, obligations, emits)
[ ] Idempotency-Key middleware verified (replay test PASS)
[ ] If-Match concurrency verified (conflict test PASS)
[ ] Problem-detail envelope verified (every error path)
[ ] Audit event emitted (chain extension verified)
[ ] Rollback path tested (saga compensation)
[ ] 21 CFR Part 11 e-sign verified if regulated
[ ] Per-mutation ADR signed off
[ ] User approval phrase: "Proceed with <slice> Stage 3 controlled mutation per ADR-<NNNN>"
```

**Decision phrase**

```text
WAVE_5_TRANSACTIONAL_PASS_READY_FOR_W6
WAVE_5_TRANSACTIONAL_FAIL_BLOCK_NEXT
```

---

### W6 — Digital Thread + Analytics (Wave 6)

```text
Goal: 4 cross-cutting roots (LOT genealogy, PREC supplier component, IREV item revision,
      MWO maintenance work order). Projections light up genealogy queries.
```

Scope unchanged from V4 W6. The OTG (since W4.5) already supports `GENEALOGY` edges; W6 turns on the *workspaces* that visualize them.

**Decision phrase**

```text
WAVE_6_DIGITAL_THREAD_PASS_READY_FOR_W6_5
WAVE_6_DIGITAL_THREAD_FAIL_BLOCK_NEXT
```

---

### W6.5 — AI Advisory Rollout (NEW SUB-WAVE)

```text
Goal: deploy the first 2–3 AI advisories under the AI Governance frame
      (per master thesis §5 RULE-2 + file 11 AI Engineering Playbook).
      All advisory; no autonomous regulated decisions.

Predecessor: W6 PASS
Successor:   W7
```

**Why this sub-wave matters**

V4's W7 bundles AI governance + advisory rollout + analytics into one wave. V5 splits the advisory rollout earlier (W6.5) so the **governance machinery is exercised** before W7 attempts to scale it.

**Initial advisories**

```text
AI-1  NC similarity clustering (read-only suggestion, never auto-merge)
AI-2  CAPA root-cause candidate ranking (advisory)
AI-3  CDOC suggested reviewer (HR-graph + topic match, advisory)
```

Each advisory:

- Emits `ai_advisory_annotation` OTG nodes per call.
- Records model name + version + training timestamp + confidence.
- Captures human decision + override reason.
- Subject to NIST AI RMF risk classification.
- Subject to RULE-2 enforcement check in CI (no advisory may COMMIT a transition).

**Exit criteria**

```text
[ ] Three advisories live in staging
[ ] Each advisory has a model card published
[ ] Each advisory has a NIST AI RMF risk profile
[ ] AI advisory annotations populating OTG
[ ] Human override rate logged
[ ] No A7 axiom violation observed
```

**Decision phrase**

```text
WAVE_6_5_AI_ADVISORY_ROLLOUT_PASS_READY_FOR_W7
WAVE_6_5_AI_ADVISORY_ROLLOUT_PASS_WITH_WARNINGS
WAVE_6_5_AI_ADVISORY_ROLLOUT_FAIL_BLOCK_NEXT
```

---

### W7 — AI Governance + Analytics (Wave 7)

```text
Goal: scale to 5 production-grade ML features under full governance.
      Build feature store, model registry, training pipeline, inference service.
      Refine NIST AI RMF 1.0 alignment.
```

**Δ from V4:** advisory rollout already done in W6.5. W7 focuses on platform (ML infra) and on the next 2 advisories (predictive maintenance + complaint NLP), pushing ML feature count to 5.

**Decision phrase**

```text
WAVE_7_AI_GOVERNANCE_PASS_READY_FOR_W8
WAVE_7_AI_GOVERNANCE_PASS_WITH_WARNINGS
WAVE_7_AI_GOVERNANCE_VIOLATION_BLOCK_NEXT     (any RULE-2 violation halts)
```

---

### W8 — Hardening + Release Readiness (Wave 8)

Scope unchanged from V4 W8. Per V3 09_WAVE_8_HARDENING_RELEASE.md WP8.1–WP8.12.

V5 addition: **DORA elite-tier targets** (per file 18 Team Topology + DORA):

```text
- Deployment frequency: ≥ daily per team
- Lead time for changes: < 1 day
- Change failure rate: < 5%
- Time to restore service: < 1 hour
```

These targets are not "goals"; they are **measured continuously** and reported in V8_DORA_METRICS_REPORT.md.

**Decision phrase**

```text
WAVE_8_RELEASE_READINESS_PASS_READY_FOR_PRODUCTION_CUTOVER_GATE
WAVE_8_RELEASE_READINESS_PASS_WITH_WARNINGS
WAVE_8_RELEASE_READINESS_FAIL_BLOCK_NEXT
```

---

### W9 — Multi-Tenancy + Portals (Wave 9, narrowed scope)

```text
Goal: multi-tenant subgraph isolation operational; customer + supplier portals live.
      Scope LIMITED to platform multi-tenancy + portals + GraphQL gateway + real-time push.
      Vertical packs MOVED to W10.
```

**Δ from V4:** V4's W9 was overloaded (12 streams). V5 keeps only platform-scaling streams in W9.

```text
W9 streams (per V4):
  9G Multi-tenancy
  9I Real-time push + GraphQL
  9J Customer + Supplier portals
  9L Marketplace + connectors (8 pre-built)
```

**Decision phrase**

```text
WAVE_9_PLATFORM_SCALE_PASS_READY_FOR_W10
WAVE_9_PLATFORM_SCALE_PASS_WITH_WARNINGS
WAVE_9_PLATFORM_SCALE_FAIL_BLOCK_NEXT
```

---

### W10 — Vertical Packs + Domain Depth (Wave 10)

```text
Goal: ship vertical packs (Pharma, Auto, Aero) + MES depth + Finance + Supply chain depth.
      Each vertical pack gated independently.
      Each domain depth stream gated independently.

Streams (per V4 W9, moved here):
  10A MES Depth
  10B Finance Core
  10C Supply Chain Depth
  10D CRM Depth
  10E HR / EHS
  10F Asset / Maintenance Depth
  10H AI/ML Platform expansion
  10K1 Pharma Pack
  10K2 Automotive Pack
  10K3 Aerospace Pack
  10K4 (optional) Med Device Pack
  10K5 (optional) Food / FSMA Pack
```

**Decision phrase**

```text
WAVE_10_WORLDCLASS_EXTENSION_PASS_PARITY_ACHIEVED
WAVE_10_WORLDCLASS_EXTENSION_PASS_WITH_GAPS
WAVE_10_WORLDCLASS_EXTENSION_PARTIAL_NEEDS_CONTINUATION
```

---

## Section 3 — Wave dependency graph

```text
W0
 ↓
W0.5  [substrate]   ←─── adds OTG, OTel, IdP, problem-detail, idempotency
 ↓
W1
 ↓
W2
 ↓
W3
 ↓
W4   [Stage 1→2 per slice]
 ↓
W4.5 [OTG-native cutover]
 ↓
W5   [Stage 2→3 per surface]
 ↓
W6
 ↓
W6.5 [first 3 AI advisories]
 ↓
W7   [scale ML to 5 features + ML platform]
 ↓
W8   [hardening + release readiness + DORA elite]
 ↓
W9   [multi-tenancy + portals + GraphQL + real-time]
 ↓
W10  [vertical packs + domain depth, streams gated independently]
 ↓
ongoing continuous improvement
```

Total path-dependent waves: **W0 → W8 = 11 strict gates** (vs V4's 9).

---

## Section 4 — Wave entry/exit gate matrix

For every wave gate transition `W_n → W_{n+1}`, the following gate matrix is evaluated:

```text
GATE   | Predecessor | Coverage   | Cross-cutting | Validation     | Standards          | Decision
       |  PASS       | matrix     | gates         | evidence       | compliance         | phrase
-------|-------------|------------|---------------|----------------|--------------------|-----------
W0→0.5 | Phase 2     | none       | C8 alive      | none           | repo conventions   | WAVE_0_..._READY_FOR_W0_5
W0.5→1 | W0          | Sec 2 W0.5 | C1,C2,C4-C8   | IQ stack ready | OWASP ASVS L2 spec | WAVE_0_5_..._READY_FOR_W1
W1→2   | W0.5        | Sec 2 W1   | C1,C3,C4,C8,C12| 18 roots OQ   | ISO 9001:2015      | WAVE_1_..._READY_FOR_W2
W2→3   | W1          | Sec 2 W2   | + C2          | training OQ    | ISO 10015          | WAVE_2_..._READY_FOR_W3
W3→4   | W2          | Sec 2 W3   | + state mach  | NC/CAPA OQ     | ISO 13485 §8       | WAVE_3_..._READY_FOR_W4
W4→4.5 | W3          | Sec 2 W4   | + C5,C6,C7    | live-API OQ    | OpenAPI 3.1.1      | WAVE_4_..._READY_FOR_W4_5
W4.5→5 | W4          | Sec 2 W4.5 | + audit chain | OTG cutover OQ | RFC 3161 (opt)     | WAVE_4_5_..._READY_FOR_W5
W5→6   | W4.5        | Sec 2 W5   | + saga        | mutation PQ    | 21 CFR Part 11     | WAVE_5_..._READY_FOR_W6
W6→6.5 | W5          | Sec 2 W6   | + lineage     | digital thread | ISA-95             | WAVE_6_..._READY_FOR_W6_5
W6.5→7 | W6          | Sec 2 W6.5 | + C11         | AI advisory PQ | NIST AI RMF 1.0    | WAVE_6_5_..._READY_FOR_W7
W7→8   | W6.5        | Sec 2 W7   | + ML platform | 5 ML in prod   | ISO 42001 (AI MS)  | WAVE_7_..._READY_FOR_W8
W8→9   | W7          | Sec 2 W8   | all 12 cuts   | full validation| SOC 2 Type II      | WAVE_8_..._READY_FOR_PROD_CUTOVER
W9→10  | W8 + cutover| Sec 2 W9   | + tenant iso  | tenant PQ      | ISO 27001          | WAVE_9_..._READY_FOR_W10
W10→∞  | W9          | per stream | per pack      | per pack       | per vertical std   | per stream phrase
```

Each gate is a **set of objective evidence requirements**, not a subjective judgment. Per RULE-6 (15-question checklist) the gate is mechanically enforceable.

---

## Section 5 — Per-slice graduation across waves

A slice's lifecycle:

```text
slice born:                Stage 1 fixture (Wave 1, 2, 3, or 6)
slice graduates Stage 1→2: during Wave 4 graduation window, per-slice ADR
slice graduates Stage 2→3: during Wave 5+, per-mutation ADR + state machine declaration
slice acquires AI advisory: during Wave 6.5 + Wave 7
slice acquires multi-tenant scope: during Wave 9 (existing slices migrate)
slice gets vertical-specific extensions: during Wave 10 (per pack)
```

Slice maturity is tracked by the Slice Maturity Cube coordinate (per master thesis §10):

```text
Surface axis (S0-S5)
A0 ─ render skeleton only
A1 ─ fixture-only render
A2 ─ live read partial
A3 ─ live read full
A4 ─ Stage 3 mutation
A5 ─ multi-tenant + vertical-aware

Validation axis (V0-V5)
V0 ─ no validation
V1 ─ smoke test passes
V2 ─ contract tests pass
V3 ─ visual regression GREEN
V4 ─ IQ/OQ pass
V5 ─ PQ + GxP audit pass

Compliance axis (C0-C5)
C0 ─ no compliance evidence
C1 ─ basic audit log
C2 ─ tenant isolation
C3 ─ 21 CFR 11 e-sign
C4 ─ DSAR + retention enforced
C5 ─ vertical-pack-compliant
```

A slice is "Wave N ready" when its (Surface, Validation, Compliance) tuple meets the Wave N target tuple.

```text
Wave 1 target: (S2, V2, C1)        # fixture render + contract test + audit log
Wave 4 target: (S3, V3, C1)        # live read + visual regression + audit log
Wave 5 target: (S4, V3, C3)        # Stage 3 mutation + visual regression + e-sign
Wave 8 target: (S4, V5, C4)        # Stage 3 + PQ + DSAR/retention
Wave 10 target: (S5, V5, C5)       # multi-tenant + PQ + vertical pack
```

A slice not meeting target tuple fails the wave gate **for that slice**, but the wave itself can pass if 60–80% of slices meet target (per V4's per-wave thresholds).

---

## Section 6 — Wave workload (cumulative)

| Wave | Codex sessions | Eng-weeks (full team) | Calendar weeks | Cumulative |
|---|---|---|---|---|
| W0 | 2-4 | 2 | 1-2 | 1-2 |
| W0.5 | 6-10 | 8 | 4-6 | 5-8 |
| W1 | 12-18 | 24 | 8-12 | 13-20 |
| W2 | 6-8 | 8 | 4-6 | 17-26 |
| W3 | 8-12 | 12 | 6-8 | 23-34 |
| W4 | 8-12 | 12 | 6-8 | 29-42 |
| W4.5 | 6-8 | 6 | 3-4 | 32-46 |
| W5 | 12-16 | 18 | 8-10 | 40-56 |
| W6 | 8-12 | 12 | 6-8 | 46-64 |
| W6.5 | 4-6 | 6 | 3-4 | 49-68 |
| W7 | 12-18 | 20 | 10-14 | 59-82 |
| W8 | 6-12 | 12 (+ human heavy) | 6-12 | 65-94 |
| W9 | 16-24 | 32 | 12-16 | 77-110 |
| W10 | 30-50 | 80 | 16-26 | 93-136 |
| **Total** | **136-210** | **252 eng-weeks** | **93-136** | **18-32 months solo Codex / 12-18 months full team** |

V4 estimates "2-3 years to world-class". V5 estimate: **18-32 months solo Codex + Claude / 12-18 months full team of 14-16**. Aligned.

---

## Section 7 — Standards crosswalk per wave

| Wave | Standards primary | Standards secondary |
|---|---|---|
| W0 | repo conventions | — |
| W0.5 | OWASP ASVS 5.0, OpenTelemetry, OpenAPI 3.1.1, RFC 9457, RFC 7232 | NIST SP 800-63B |
| W1 | ISO 9001:2015 §7.5 (documented info) | RFC 9110 |
| W2 | ISO 10015 (training) | ISO 30414 (HR metrics) |
| W3 | ISO 13485 §8 (NC/CAPA), IATF 16949 §10 | AS9100D §10 |
| W4 | OpenAPI 3.1.1, RFC 9457 | RFC 8141 (URN), JSON Schema 2020-12 |
| W4.5 | RFC 3161 (timestamping, optional) | (continuation) |
| W5 | 21 CFR Part 11 §11.10, §11.50, §11.70 | EU GMP Annex 11 |
| W6 | ISA-95 / IEC 62264, ISA-88 | ISO 22400 (KPI) |
| W6.5 | NIST AI RMF 1.0, ISO 42001 | ISO 23894 (AI risk) |
| W7 | NIST AI RMF, ISO 42001, EU AI Act risk class | OECD AI principles |
| W8 | OWASP ASVS L2, WCAG 2.2 AA, SOC 2 Type II, ISO 27001 | GDPR / CCPA, NIS2 |
| W9 | ISO 27001 (information security MS), ISO 27017 (cloud) | OAuth 2.1, OIDC |
| W10 | per pack (21 CFR 820 / 211, IATF 16949, AS9100D, FDA 21 CFR 117 FSMA) | per pack |

---

## Section 8 — Risk per wave

Each wave has 3-7 high-impact risks listed in `20_RISK_REGISTER_V5_FORMAL.md`. Headline:

```text
W0:    repo divergence; visual regression noise
W0.5:  identity provider misconfig; OTG schema lockout
W1:    fixture quality; cross-browser drift
W2:    ICU MF2 i18n adoption
W3:    state machine spec drift
W4:    silent fallback to fixture on live-API error
W4.5:  CDC lag; projection drift
W5:    saga compensation correctness
W6:    genealogy depth pathology
W6.5:  AI advisory captured in regulated decision
W7:    model drift; training-serving skew
W8:    SOC 2 evidence completeness; DR drill failure
W9:    tenant boundary leak; portal SSO complexity
W10:   vertical pack scope creep; certification body engagement timing
```

---

## Section 9 — Wave-level kill criteria (when to halt the entire program)

The program halts (not just the current wave) under any of:

```text
K1: A regulated mutation committed without full audit chain    → STOP
K2: AI advisory committed a banned regulated decision          → STOP
K3: Tenant boundary leaked beyond test environment             → STOP
K4: OTG axiom A1, A3, A5, A7, A10, A14 violated in production  → STOP
K5: Audit chain anchor broken or unverifiable                  → STOP
K6: WORM evidence loss (S3 Object Lock failure)                → STOP
K7: Cross-region DR drill fails 2 consecutive quarters         → STOP
K8: SOC 2 Type II audit fails materially                       → STOP
```

Halt = freeze all wave progression, declare incident SEV-0, page exec on-call, halt customer-onboarding, communicate to legal/compliance.

These criteria are deliberately strict because the platform is regulated.

---

## Section 10 — Comparison with V4

| Dimension | V4 | V5 |
|---|---|---|
| Wave count | 11 | 14 |
| Sub-waves | 0 | 3 (0.5, 4.5, 6.5) |
| Wave-touch rule | "L1 + one of L2/L3/L4" | "all coverage matrix cells per file 01 §6" |
| Per-slice graduation | bulk in W4 | per-slice in graduation window (W4) |
| Per-mutation graduation | implicit | explicit per-surface ADR (W5+) |
| AI advisory rollout | bundled in W7 | extracted to W6.5 + scaled in W7 |
| Vertical packs | bundled in W9 | extracted to W10 with per-pack gates |
| OTG cutover | implicit | explicit W4.5 |
| Platform substrate | implicit (split across waves) | explicit W0.5 |
| Decision phrases per wave | 3 | 3-4 (more granular) |
| Maturity model | Stage 1/2/3 | (Surface, API, Validation) cube |
| Standards crosswalk | partial | per-wave §7 |
| Kill criteria | not specified | 8 explicit |
| Workload estimate | "2-3 years" | 252 eng-weeks; 18-32mo solo / 12-18mo team |

V5 is V4 with the **wave architecture made falsifiable**. Every gate has objective evidence; every transition has a falsifiable pass criterion; every kill condition is named.

---

## Section 11 — Decision phrase

```text
V5_WAVE_PLAN_REFINED_BASELINE_LOCKED
NEXT_FILE: 04_WAVE_PACK_DEEP_DIVE_W0_W4.md
```

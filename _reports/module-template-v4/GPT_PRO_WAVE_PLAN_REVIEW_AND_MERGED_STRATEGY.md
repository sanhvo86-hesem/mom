# GPT Pro Wave Plan Review + Merged Strategy

**Generated**: 2026-04-26
**Inputs reviewed**:
- `HESEM_MOM_WAVE_PLANNING_FOR_CLAUDE.zip` (12 files, GPT Pro 9-wave plan)
- `STRATEGIC_MASTER_V2_WORLDCLASS.md` (Claude's 4-wave plan + benchmark)
- Live repo at HEAD `26b5109d` on main

**Decision**: `WAVE_PLAN_ACCEPTED_WITH_CORRECTIONS_MERGE_RECOMMENDED`

---

## TL;DR

GPT Pro's plan is **operationally superior** in near-term discipline (Wave 0 stabilization gate, AI governance rule, read-only-first per slice).

Claude V2's plan is **strategically more ambitious** (industry vertical packs, finance core, multi-tenancy, MES depth specifics, world-class capability scoring).

**Recommended action**: MERGE — adopt GPT Pro's Wave 0-1 immediately, layer Claude V2 strategic content into GPT Pro's Wave 7-8, keep both reference docs.

---

## Part 1 — GPT Pro plan claims VERIFIED against repo

| Claim | Reality | Status |
|---|---|---|
| Cross-browser blocked: `CROSS_BROWSER_FAIL_BLOCK_NEXT` | Confirmed in `S_QA_CROSS_BROWSER_REPORT.md` | ✅ VERIFIED |
| CAPA Slice 4: `CAPA_SLICE4_PASS_WITH_WARNINGS` | Confirmed in `S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md` | ✅ VERIFIED |
| NQCASE live API: `LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS` | Confirmed | ✅ VERIFIED |
| Backend C.2: `TRANSACTIONAL_REST_PASS_WITH_WARNINGS` | Confirmed | ✅ VERIFIED |
| Phase 2 advanced beyond prompts | Confirmed (commits 70196e7a, 0761c181, 4aaa5c4b, 3205c07a, 1bb57c08) | ✅ VERIFIED |
| Forbidden files untouched | Spot-check confirms | ✅ VERIFIED |
| 74-fixtures absent from portal.html | Confirmed | ✅ VERIFIED |
| Current portal inert by default | Confirmed (HMV4_PREVIEW_ENABLED defaults false) | ✅ VERIFIED |

**GPT Pro plan starts from accurate repo grounding.** This is a strong foundation for trust.

---

## Part 2 — GPT Pro plan structure (9 waves)

```
Wave 0: Phase 2 Integration Stabilization      (1-3 days)   ← MUST RUN FIRST
Wave 1: HMV4 Foundation & Proven Slices        (1-2 days)   consolidate / document
Wave 2: Governed Record Shells & Quality       (2-4 weeks)  CDOC, INSP, BREL, ECO + CAPA fix
Wave 3: Workforce/Maintenance/Connected Worker (2-5 weeks)  Training depth + MWO + operator UX
Wave 4: Live API Cutover & Backend Contracts   (4-8 weeks)  per-slice live opt-in + REST hardening
Wave 5: Core Transactional ERP/MOM             (6-12 weeks) Quote→SO→JO→WO→Dispatch→Inspection→Release
Wave 6: Digital Thread / Genealogy / Release   (6-12 weeks) genealogy, lot, batch release packet
Wave 7: Analytics / AI / Knowledge             (8-16 weeks) advisory only; AI governance rule
Wave 8: Hardening / Validation / Release       (6-12 weeks) security, a11y, perf, CI, validation
```

**Total**: 4-8 months prototype, 9-18 months release-grade.

---

## Part 3 — Strengths of GPT Pro plan (adopt these)

### S1. Wave 0 stabilization gate (CRITICAL DISCIPLINE)

GPT Pro **correctly identifies** that current main has 3 PASS_WITH_WARNINGS + 1 FAIL_BLOCK_NEXT. Starting more slices on top of unresolved warnings creates compound debt.

**Claude V2 missed this.** My plan jumped to Phase 4 megaprompts (Slice 9 JO etc.) without addressing the cross-browser blocker.

**Adopt**: Run Wave 0 BEFORE any further frontend slice work.

### S2. AI Governance rule (Wave 7)

```
AI may recommend.
AI must NOT autonomously:
- release lot
- approve disposition
- close CAPA
- release ECO
- release controlled document
- certify training
- qualify supplier
- decide recall/field action
```

This is **world-class regulated-industry compliance discipline**. Claude V2 had AI/ML platform but didn't codify governance rules.

**Adopt**: Make this ADR-0014 (or appropriate number) when AI/ML platform lands.

### S3. Read-only-first discipline per wave

GPT Pro applies "read-only fixture-backed prototype → opt-in live API → controlled mutation with workflow contract" as a STRICT graduation per slice.

```
read-only fixture-backed prototype
  ↓
read-only live API opt-in prototype
  ↓
controlled mutation prototype with API/workflow contract
```

No slice may jump directly to uncontrolled live mutation.

**Claude V2 had this implicit but not explicit.** Adopt as ADR.

### S4. Pre-production wording strict enforcement

Every wave document repeats:
```
Use:    development/prototype, current portal safety, pre-production readiness
Avoid:  production go-live, production cutover, production release
```

**Claude V2 sometimes uses "production" and "production-grade" loosely.** Tighten language across V2 docs.

### S5. Wave 1 consolidation/documentation phase

Pattern Registry + QA Evidence Index + Branch Hygiene Report. This is mature engineering practice — document what's done before progressing.

**Claude V2 dismissed this as "already done".** Adopt as mandatory closure step before Wave 2 V2 begins.

### S6. Verification checklist for Claude/Codex

15 specific verification questions for repo state, decision phrases, naming, forbidden files. Standardizes review.

**Adopt**: Use this as the standard pre-implementation gate template.

### S7. Conservative wave naming

"Phase 2 Integration", "Wave 0 stabilization" — names reflect operational reality. Doesn't pretend things are done that aren't.

**Adopt**: Renumber Claude V2 waves to align with GPT Pro's Wave 0-8 structure.

---

## Part 4 — Strengths of Claude V2 plan (preserve these)

### V1. World-class capability scoring (11 pillars × 5 levels)

Quantifies progress vs SAP/Oracle/Veeva/Siemens benchmark. Re-scoreable quarterly.

**GPT Pro plan has no scoring or benchmark.**

### V2. Industry vertical compliance packs (Wave 4)

```
Pack 1: Pharma (21 CFR Part 11 / ICH Q10 / GAMP 5)
Pack 2: Automotive (IATF 16949 / VDA / AIAG)
Pack 3: Aerospace (AS9100 / AS9102 / NADCAP)
Optional: Med Device (ISO 13485 / EU MDR), Food (HACCP / FSSC)
```

**GPT Pro Wave 8 has "validation package" but no industry-specific compliance packs.** Required for "world-class" claim.

### V3. MES depth specifics

GPT Pro Wave 5 says "transactional ERP/MOM" but doesn't detail SPC/OEE/Andon/IoT/calibration/FMEA/validation. Claude V2 Wave 2 has 8 net-new MES roots:

```
EQUIP, OEEEVT, DOWNTIME, SPCRUN, CAL, FMEA, VAL, COMPLAINT
+ 6 workspaces (Andon, OEE Dashboard, SPC Charts, Calibration Schedule, FMEA Workshop, Operator Mobile)
+ Equipment connector framework (OPC UA, MQTT)
+ Statistical engine
```

**Without these, HESEM cannot claim "world-class MES".** GPT Pro plan would result in "MOM with order tracking" not "true MES".

### V4. Finance core

GPT Pro plan has zero finance core (GL/AP/AR/FA/multi-currency/multi-entity).

**Without finance core, HESEM cannot claim "ERP".** Claude V2 Wave 3 Stream 3A addresses this.

### V5. Multi-tenancy

GPT Pro plan has zero multi-tenancy design.

**Required for SaaS go-to-market.** Claude V2 Wave 3 Stream 3F has this.

### V6. AI/ML platform foundation

GPT Pro Wave 7 has "AI advisory shell" but no platform foundation (model registry, feature store, training pipeline, inference service).

**Without platform foundation, AI features become 1-off PoCs that can't scale.**

### V7. HA/DR/observability/SOC 2

GPT Pro Wave 8 mentions security/a11y/perf/CI but no specific HA topology, DR commitments (RPO/RTO), SOC 2 audit prep, GDPR/CCPA.

**Required for production cutover.**

### V8. Marketplace/plugin framework + pre-built connectors

GPT Pro has no ecosystem strategy.

**Salesforce-style platform-as-a-product is a competitive differentiator.**

### V9. Build-vs-buy decisions

```
SPC engine: BUILD (differentiator)
OPC UA: BUILD reference + Buy Kepware production
AI/ML: INTEGRATE AWS SageMaker
Tax: INTEGRATE Avalara
Identity: BUILD if mid-market, INTEGRATE Auth0/Okta if enterprise
```

**GPT Pro plan has no build-vs-buy guidance.** Without this, every capability gets "BUILD by default" trap.

### V10. Vendor competitive positioning

```
Beats Oracle on UX + TCO
Beats SAP on speed
Beats Veeva on integration breadth
Loses to SAP on scale (>10K users)
Loses to Salesforce on CRM ecosystem
```

**GPT Pro plan doesn't position vs competitors.** Strategic gap.

---

## Part 5 — MERGED Strategic Plan

Adopt GPT Pro's wave structure as the **execution discipline** layer, layer Claude V2's strategic ambition as the **content** layer.

### 5.1 Wave numbering reconciliation

| GPT Pro wave | Claude V2 equivalent | Merged name |
|---|---|---|
| Wave 0 | (not in V2) | **Wave 0 — Phase 2 Stabilization** (NEW, mandatory) |
| Wave 1 | (within V2 Wave 1) | **Wave 1 — HMV4 Foundation Consolidation** (documentation) |
| Wave 2 | V2 Wave 1 closure (Slices 5-8) | **Wave 2 — Governed Record Shells** (already 80% done) |
| Wave 3 | (mapped to V2 Wave 2 partial) | **Wave 3 — Workforce/Maintenance/Connected Worker** |
| Wave 4 | (within V2 Wave 1) | **Wave 4 — Live API Cutover & Backend Hardening** |
| Wave 5 | V2 Wave 1 Phase B (Slices 9-12) | **Wave 5 — Core Transactional ERP/MOM** |
| Wave 6 | V2 Wave 1 Phase C + V2 Wave 2 traceability | **Wave 6 — Digital Thread / Genealogy / Release** |
| Wave 7 | V2 Wave 3 Stream G (AI/ML) | **Wave 7 — Analytics / AI / Knowledge** |
| Wave 8 | V2 Wave 4 (compliance + verticals + production-grade) | **Wave 8 — Hardening / Validation / Release** |
| **Wave 9 (NEW)** | V2 Wave 2 MES depth + V2 Wave 3 cross-cutting + V2 Wave 4 vertical packs | **Wave 9 — World-Class Extension** (post-release v1) |

### 5.2 Wave 0 priorities (MUST RUN BEFORE PHASE 4 megaprompts execute)

```
1. Run V21 Phase 2 integration review
2. Repair Chromium baseline drift (CROSS_BROWSER_FAIL_BLOCK_NEXT)
3. Resolve CAPA Slice 4 warnings
4. Resolve NQCASE live API warnings
5. Resolve Backend REST C.2 warnings
6. Generate `V21_PHASE2_INTEGRATION_REVIEW_REPORT.md`
7. Decision: PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```

**Until Wave 0 passes**, do NOT execute Phase 4 megaprompts (Slices 9-12).

The Phase 4 megaprompts I created are STILL VALID but should run AFTER Wave 0.

### 5.3 Wave 8 → Wave 9 expansion (where Claude V2 strategic content lands)

**Wave 8 (Hardening) — keep GPT Pro scope** + add:
- HA active-active topology + RPO/RTO commitments (Claude V2 Wave 4 Part)
- SOC 2 audit prep + GDPR/CCPA (Claude V2 Wave 4)
- OpenTelemetry observability (Claude V2 Wave 4)
- Performance budget (Lighthouse > 90) (Claude V2 Wave 4)

**Wave 9 (World-Class Extension) — NEW from Claude V2**:
```
9.1 MES depth roots: EQUIP, OEEEVT, DOWNTIME, SPCRUN, CAL, FMEA, VAL, COMPLAINT
9.2 MES workspaces: Andon, OEE Dashboard, SPC Charts, Calibration Schedule, FMEA Workshop, Mobile Console
9.3 MES platform: equipment connector (OPC UA/MQTT), statistical engine
9.4 Finance core: GL, AP, AR, FA, COSTRUN, PERIODCLOSE
9.5 Multi-tenancy + SSO + GraphQL
9.6 AI/ML platform foundation (model registry, feature store, inference service)
9.7 AI/ML features: predictive maintenance, demand forecasting, anomaly detection, defect classification, complaint NLP
9.8 Customer + supplier portals
9.9 Industry vertical packs:
    - Pharma (21 CFR Part 11 / ICH Q10 / GAMP 5)
    - Automotive (IATF 16949 / VDA / AIAG)
    - Aerospace (AS9100 / AS9102 / NADCAP)
9.10 Marketplace + 8 pre-built connectors (Salesforce, SAP, Oracle, PLM, MS 365, Slack/Teams)
```

**Wave 9 elapsed**: 12-18 months post-release v1.

### 5.4 Discipline rules adopted from GPT Pro plan

```
RULE-1: No slice may jump from fixture → uncontrolled mutation. Three-stage graduation.
RULE-2: AI may recommend, must NOT autonomously decide regulated outcomes (8 specific actions banned).
RULE-3: Pre-production wording mandatory across all docs (no "production" language).
RULE-4: Each wave must produce: implementation report + QA report + rollback procedure +
        fixture coverage report + E2E result + forbidden diff result + current portal safety result + decision phrase.
RULE-5: Wave 0 stabilization gate — never enter Wave 2 with FAIL_BLOCK_NEXT outstanding.
RULE-6: 15-question Claude verification checklist per major prompt.
RULE-7: Slice naming convention enforced: V<n>_<scope> for prompts, S<n>_<scope> for artifacts.
RULE-8: Read-only graduation: fixture → opt-in live read → controlled mutation with contract.
```

### 5.5 Strategic measurement adopted from Claude V2

```
RUBRIC-1: Score 11 capability pillars × 5 levels quarterly
RUBRIC-2: Compare to SAP/Oracle/Veeva/Siemens/MasterControl benchmark
RUBRIC-3: Track build-vs-buy decisions per capability
RUBRIC-4: Map slice progress to ISA-95 / ISO 9001 / 21 CFR Part 11 / IATF / AS9100 / HACCP coverage
```

---

## Part 6 — Recommended Immediate Actions

### Action 1: Run Wave 0 BEFORE Phase 4 megaprompts execute

**Priority**: P0
**Effort**: 1-3 days

1. Open Codex local
2. Paste this prompt (adapted from GPT Pro Wave 0 file):

```
You are in local repo sanhvo86-hesem/mom.

Run V21 Phase 2 integration review per
`/tmp/gpt-pro-waves/HESEM_MOM_WAVE_PLANNING_FOR_CLAUDE/01_WAVE0_PHASE2_INTEGRATION_STABILIZATION.md`.

Step 1: WP0.1 current main verification
Step 2: WP0.2 stream status matrix
Step 3: WP0.3 static guard sweep
Step 4: WP0.4 full Chromium E2E reality check
Step 5: WP0.5 cross-browser repair plan (no commit yet)
Step 6: Generate V21_PHASE2_INTEGRATION_REVIEW_REPORT.md
Step 7: Decision phrase per the template.

Do not run Phase 4 megaprompts. Do not start any new slice. This is integration repair only.
```

3. After Wave 0 passes → resume Phase 4 megaprompts.

### Action 2: Pause Phase 4 execution if running

If Codex is mid-execution of Slice 9 JO or similar, the slice can complete but DO NOT merge to main until Wave 0 passes. This protects against compound debt.

### Action 3: Adopt 8 discipline rules from GPT Pro

Add to `CLAUDE.md` (or new ADR-0013):

```markdown
## MANDATORY: HMV4 Wave Execution Discipline (from V21 plan)

RULE-1: No slice fixture→uncontrolled-mutation jump. Use 3-stage graduation.
RULE-2: AI advisory only. Never autonomous regulated decisions (release lot, approve
        disposition, close CAPA, release ECO, release CDOC, certify training, qualify
        supplier, decide recall).
RULE-3: Pre-production wording. Never "production go-live/cutover/release".
RULE-4: Each wave produces 8 standard artifacts.
RULE-5: Wave stabilization gate must pass before next wave begins.
RULE-6: 15-question verification checklist per major prompt.
RULE-7: V<n>_<scope> for prompts, S<n>_<scope> for artifacts.
RULE-8: Three-stage live graduation per slice.
```

### Action 4: Re-merge Phase 4 megaprompts under Wave 5 numbering

The Phase 4 megaprompts (Slice 9 JO, 10 SO, 11 WO, 12 CPO + nav shell expansion) align with GPT Pro **Wave 5** scope. Update internal references:

```
Phase 4 megaprompts → Wave 5 megaprompts (after Wave 0/1 close)
```

This avoids confusion about phase ordering.

### Action 5: Combine reference docs

Keep both:
- `STRATEGIC_MASTER_V2_WORLDCLASS.md` (strategic ambition + benchmark)
- `00_WAVE_MASTER_PLAN.md` from GPT Pro (operational discipline)

Add this review doc as the **bridge document** explaining how to use both.

---

## Part 7 — Open Decisions

Decisions GPT Pro raised that user must answer:

```
D-A. Approve Chromium baseline repair? (Wave 0)
     → If YES, on a controlled branch with explicit approval
D-B. Should each PASS_WITH_WARNINGS be re-QA'd? (Wave 0)
     → If YES, generate dedicated QA reports per warning
D-C. Should new slices wait until Wave 0 passes? (default YES)
D-D. Production cutover trigger?
     → GPT Pro suggests: after Wave 8 release readiness pass
     → Claude V2 suggests: after Wave 4 vertical pack pass
     → Recommended merged: after Wave 8 + 1 vertical pack from Wave 9
```

Decisions Claude V2 raised that GPT Pro plan doesn't address:

```
D-1. Go-to-market: SaaS multi-tenant OR on-prem licensed OR hybrid?
D-2. Target verticals (top 3 of 7): pharma, auto, aero, med dev, food, electronics, general?
D-3. AI/ML investment: build in-house OR integrate cloud AI?
D-4. Mobile: PWA only OR native iOS+Android OR Flutter/React Native?
D-5. Real-time stack: RabbitMQ extended OR Kafka migration OR cloud-native?
D-6. IoT depth: reference architecture OR pre-built connectors OR fully integrated?
D-7. Compliance certification timeline?
D-8. Team scaling: solo Codex vs hire team?
D-9. Open-source vs proprietary?
```

These decisions cannot be made by Claude/Codex/GPT Pro — they require user/stakeholder direction.

---

## Part 8 — Net Assessment

### GPT Pro plan: **A** for operational rigor, **B-** for strategic ambition

**Pros**:
- Accurately grounded in current repo state
- Strict discipline rules (3-stage graduation, AI governance, pre-production wording)
- Mandatory stabilization gate before progression
- Clear verification checklist
- Realistic timing estimates

**Cons**:
- No industry vertical packs
- No finance core
- No multi-tenancy
- No MES depth specifics (SPC/OEE/IoT)
- No AI/ML platform foundation
- No marketplace
- No build-vs-buy guidance
- No competitive benchmark

**Score**: 7/10 — **excellent operational compass, missing strategic ambition**

### Claude V2 plan: **B+** for strategic ambition, **C** for operational rigor

**Pros**:
- Industry-leading vertical packs
- World-class capability scoring (11 pillars × 5 levels)
- Build-vs-buy decisions
- Vendor benchmark
- Ambitious total scope

**Cons**:
- No Wave 0 stabilization gate
- "Production" wording sometimes drifts
- No 8-rule discipline framework
- No verification checklist
- Total elapsed estimate (12 months) too optimistic

**Score**: 7/10 — **excellent strategic compass, missing operational discipline**

### MERGED plan: **A** strategic + **A** operational = **9/10**

**Adopt GPT Pro Wave 0-8 as discipline frame** + **layer Claude V2 strategic content into Wave 8/9** + **enforce 8 discipline rules + 4 measurement rubrics**.

Total: 9 waves + Wave 9 (post-release world-class extension).
Total elapsed: 9-18 months prototype + release readiness, 18-30 months to world-class parity.

---

## Part 9 — Recommended Update Plan for Strategic Master V2

### Updates to apply to STRATEGIC_MASTER_V2_WORLDCLASS.md

```diff
+ Add Wave 0 stabilization gate (from GPT Pro)
+ Renumber Wave 1-4 to Wave 1-9 to align with GPT Pro
+ Add 8 discipline rules section
+ Add 15-question verification checklist as appendix
+ Tighten "production" → "pre-production readiness" language
- Remove direct "production cutover" without ADR gate
+ Add AI Governance Rule (no autonomous regulated decisions)
+ Add 3-stage live graduation explicit per-slice section
```

### Updates to apply to WAVE2/3/4 docs

```
Rename:
  WAVE2_MES_DEPTH_ROADMAP.md → WAVE_9_1_MES_DEPTH.md
  WAVE3_CROSS_CUTTING_ROADMAP.md → WAVE_9_2_CROSS_CUTTING.md
  WAVE4_COMPLIANCE_VERTICAL_ROADMAP.md → WAVE_9_3_COMPLIANCE_VERTICAL.md

Or keep names but mark as "post-Wave 8 extension" so reader understands sequencing.
```

### New artifact

```
WAVE_PLAN_MERGED_V3.md
  Combines GPT Pro Wave 0-8 + Claude V2 Wave 9 + 8 discipline rules + 4 measurement rubrics
```

---

## Part 10 — Final Recommendations

### To USER (decision needed)

1. **APPROVE merged plan** (combine GPT Pro discipline + Claude V2 strategic ambition)
2. **APPROVE Wave 0 execution** (stop Phase 4 megaprompts mid-flight if running)
3. **PROVIDE direction on D-1 through D-9** (decisions Claude/GPT Pro can't make)
4. **CHOOSE target vertical** (pharma OR auto OR aero — first vertical pack)

### To CODEX (next prompt to paste)

```text
Run V21 Phase 2 integration review and stabilization per
_reports/module-template-v4/GPT_PRO_WAVE_PLAN_REVIEW_AND_MERGED_STRATEGY.md
Part 6 Action 1.

Generate V21_PHASE2_INTEGRATION_REVIEW_REPORT.md.

After Wave 0 passes, await user approval to resume Phase 4 megaprompts as
"Wave 5 Core Transactional ERP/MOM" execution.
```

### To CLAUDE (next session)

```text
After Wave 0 + Wave 1 close on main, generate:
- WAVE_PLAN_MERGED_V3.md (canonical 9-wave plan)
- ADR-0013 HMV4 Wave Execution Discipline (the 8 rules)
- ADR-0014 AI Governance Rule (the 8 banned autonomous decisions)
- Updated STRATEGIC_MASTER_V2_WORLDCLASS.md with renumbered waves and tightened language

Then propose Wave 9 detailed prompts (MES depth + finance core + AI platform + verticals).
```

---

## Closing

**GPT Pro's plan is honest about messy reality** (3 PASS_WITH_WARNINGS + 1 FAIL_BLOCK_NEXT) and prescribes **stabilize-before-progress** discipline.

**Claude V2's plan is ambitious about world-class** (vertical packs, MES depth, AI platform) but ignored that current foundation has unresolved warnings.

**The merged plan takes both**: operational rigor from GPT Pro keeps the project honest day-to-day; strategic ambition from Claude V2 keeps the project pointing toward world-class.

```
WAVE_PLAN_REVIEW_DECISION: WAVE_PLAN_ACCEPTED_WITH_CORRECTIONS_MERGE_RECOMMENDED
NEXT_ACTION: RUN_WAVE_0_BEFORE_PHASE_4_MEGAPROMPT_EXECUTION_RESUMES
USER_APPROVAL_REQUIRED: YES (Action 1 + decisions D-A through D-D, D-1 through D-9)
```

# 13_GPT_PRO_REVIEW_INSTRUCTIONS.md

## Purpose

Instructions for GPT Pro (or any external reviewer) to evaluate this merged wave plan.

This file is the **entry point** for review. Read this first, then proceed through the plan files in numerical order.

---

## What this plan is

This is a **merged execution roadmap** for HESEM Operations Platform (sanhvo86-hesem/mom). It combines:

1. **GPT Pro 9-wave plan** (originally provided in `HESEM_MOM_WAVE_PLANNING_FOR_CLAUDE.zip`)
   - Operational discipline (Wave 0 stabilization gate)
   - AI governance (8 banned autonomous decisions)
   - 3-stage graduation per slice
   - Pre-production wording strict enforcement

2. **Claude Strategic Master V2** (from prior conversation)
   - World-class capability scoring (11 pillars × 5 levels)
   - Industry vertical compliance packs
   - MES depth specifics
   - Finance core, multi-tenancy, AI/ML platform
   - HA/DR, observability, SOC 2
   - Marketplace + connectors
   - Build-vs-buy decisions
   - Vendor competitive positioning

The merge produces a **10-wave plan** (Wave 0 through Wave 9) with:
- 8 Discipline Rules (RULE-1 through RULE-8)
- 4 Measurement Rubrics
- 15-Question Verification Checklist
- Standard Decision Phrases (FROZEN)

---

## Files in order to review

```
00_MERGED_MASTER_PLAN.md             — overview, frozen architecture, 10-wave summary
01_WAVE_0_STABILIZATION.md           — Phase 2 integration repair (most urgent — RUN FIRST)
02_WAVE_1_FOUNDATION_CONSOLIDATION.md — documentation; pattern registry; QA evidence index
03_WAVE_2_GOVERNED_RECORDS.md         — close governed record QA (CDOC/INSP/BREL/ECO/CAPA fix)
04_WAVE_3_WORKFORCE_MAINTENANCE.md    — MWO + asset readiness + connected worker + mobile PWA
05_WAVE_4_LIVE_API_BACKEND.md         — Stage 2 graduation; backend C.4 RED root prep
06_WAVE_5_TRANSACTIONAL_CORE.md       — Slices 9-13 (JO/SO/WO/CPO/QUO) + workspaces
07_WAVE_6_DIGITAL_THREAD.md           — LOT/PREC/IREV + genealogy explorer + batch release packet
08_WAVE_7_ANALYTICS_AI.md             — KPI dashboards + AI advisory (RULE-2 enforced)
09_WAVE_8_HARDENING_RELEASE.md        — security, a11y, perf, observability, HA/DR, SOC 2, validation
10_WAVE_9_WORLDCLASS_EXTENSION.md     — MES depth, finance, multi-tenant, AI/ML platform, vertical packs, marketplace
11_DISCIPLINE_RULES.md                — 8 rules + 15-question checklist + decision phrases
12_MEASUREMENT_RUBRICS.md             — 11 pillars × 5 levels + vendor benchmark + build-vs-buy + compliance map
13_GPT_PRO_REVIEW_INSTRUCTIONS.md     — (this file)
```

---

## Verification questions (specific)

Please verify the plan against the live repository at `sanhvo86-hesem/mom` and answer:

### Repo grounding (Wave 0 questions)

1. Does current `main` HEAD contain the reports referenced in Wave 0 entry criteria?
2. Are `CROSS_BROWSER_FAIL_BLOCK_NEXT` and 3 PASS_WITH_WARNINGS verifiable in the repo?
3. Do the forbidden file references in `11_DISCIPLINE_RULES.md` match `mom/portal.html`, `mom/styles/*`, `mom/scripts/portal/01-*.js`, `02-*.js`, `40-*.js`?
4. Is `74-module-template-v4-fixtures.js` actually absent from `mom/portal.html`?
5. Is `HMV4_PREVIEW_ENABLED` defaulting to false in `mom/portal.html`?

### Wave plan internal consistency

6. Do the 10 waves form a complete dependency chain (each wave's exit criteria match the next wave's entry criteria)?
7. Are workload estimates realistic per stream/wave?
8. Does Wave 9 Stream 9A through 9L cover all P0+P1 capability gaps from Strategic Master V2?
9. Does the merged plan preserve Wave 0 (stabilization) as MANDATORY before Wave 1+?
10. Are all 8 banned autonomous AI decisions per RULE-2 listed in Wave 7 (`08_WAVE_7_ANALYTICS_AI.md`)?

### Discipline rules

11. Are RULE-1 through RULE-8 applied consistently across all 10 waves?
12. Is the 15-question verification checklist applicable to each wave's main prompt?
13. Are decision phrases FROZEN (per RULE-7) and used consistently?
14. Is the 3-stage graduation discipline (RULE-1) NEVER violated by any wave (no Stage 1 → Stage 3 jump)?
15. Is pre-production wording (RULE-3) maintained EXCEPT in Wave 8 release-readiness contexts?

### Measurement rubrics

16. Does RUBRIC-1 (11 pillars × 5 levels) accurately score current HESEM at ~30%?
17. Does RUBRIC-2 (vendor benchmark) accurately position vs SAP/Oracle/Veeva/Siemens?
18. Do RUBRIC-3 (build-vs-buy) decisions match industry best practice?
19. Does RUBRIC-4 (compliance coverage) accurately map to Wave plans?

### Strategic positioning

20. Is the "mid-market manufacturing-first MOM/MES/EQMS with full ERP, opinionated for 3 verticals" positioning credible?
21. Is the 24-30 month timeline to ~95% world-class capability realistic for solo Codex-augmented model?
22. Is the 12-18 month timeline realistic for a 14-16 person full team?
23. Are the 10 user decisions (D-1 to D-10 in `00_MERGED_MASTER_PLAN.md` Section 13) the right strategic questions?

### Specific corrections requested

For each item GPT Pro disagrees with, provide in the format:

```
File:                   <which file>
Section:                <which section>
Concern:                <what's wrong>
Suggested correction:   <how to fix>
Reason:                 <why correct>
Repo evidence:          <what should be checked in repo>
```

---

## Decision output format

GPT Pro should return ONE of:

```
MERGED_WAVE_PLAN_V3_ACCEPTED_READY_FOR_USER_APPROVAL
   → User can proceed with Wave 0 execution.

MERGED_WAVE_PLAN_V3_ACCEPTED_WITH_CORRECTIONS
   → Plan good with N specific corrections needed.
   → List corrections in format above.
   → User must approve corrections before Wave 0 begins.

MERGED_WAVE_PLAN_V3_BLOCKED_REPO_STATE_MISMATCH
   → Plan claims don't match repo reality.
   → List specific mismatches.
   → Re-grounding required before plan can be accepted.

MERGED_WAVE_PLAN_V3_REJECTED_FUNDAMENTAL_DISAGREEMENT
   → Plan structure or approach has fundamental issue.
   → Detailed disagreement with proposed alternative.
```

---

## Specific evaluation prompts for GPT Pro

### On Wave 0 (`01_WAVE_0_STABILIZATION.md`)

- Is the WP0.1-WP0.8 sequence comprehensive?
- Should any work package be removed or added?
- Are the 4 decision phrases (PASS_READY / PASS_WITH_REPAIRS_PENDING / BLOCKED_CROSS_BROWSER / FAIL_BLOCK_NEXT) sufficient?
- Is the cross-browser repair plan (WP0.5) gated correctly (NO snapshot updates without explicit user approval)?
- Should there be a WP0.9 (e.g., security smoke check)?

### On Wave 1 (`02_WAVE_1_FOUNDATION_CONSOLIDATION.md`)

- Are the 5 documentation artifacts (Pattern Registry, QA Evidence Index, Branch History, Live API Registry, Vocabulary Lock) the right set?
- Should Vocabulary Lock be in `docs/adr/` or `_reports/`? Per CLAUDE.md NEVER place reports under `mom/docs/`, but is `docs/adr/HMV4_VOCABULARY_LOCK.md` (top-level docs) acceptable?
- Is 1-2 days realistic, or should it be 1 week to allow for deeper documentation?

### On Wave 9 (`10_WAVE_9_WORLDCLASS_EXTENSION.md`)

- Is the 12-stream parallel structure realistic for a single team?
- Should vertical packs (Stream 9K) be moved earlier (alongside Wave 8) so production cutover gates per vertical?
- Is 12-18 months full team / 24-30 months solo realistic?
- Should AI/ML platform (Stream 9H) be earlier given it's a long-running stream?

### On AI Governance (`08_WAVE_7_ANALYTICS_AI.md` + RULE-2)

- Are the 8 banned autonomous decisions sufficient?
- Should there be additional banned decisions for specific industries (e.g., recipe approval for pharma, dispatch decision for ATC-class)?
- Is the AI advisory shell pattern (input/model/confidence/explanation/decision/override) standard?

### On Compliance (`12_MEASUREMENT_RUBRICS.md` RUBRIC-4)

- Is the compliance coverage map accurate for ISO 9001, 21 CFR Part 11, IATF 16949, AS9100, ISO 13485, HACCP?
- Should ISO/IEC 27001 be in the rubric (information security)?
- Should SOC 2 Type II have its own row?
- Are GDPR + CCPA represented adequately?

---

## Repo state to verify

GPT Pro should inspect these files in the repo for verification:

```
git log --oneline --decorate -30
_reports/module-template-v4/                       (62+ reports)
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/71-module-template-v4-routes.js
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/74-module-template-v4-fixtures.js
mom/portal.html                                   (verify forbidden-file integrity)
tests/e2e/                                         (8+ spec files)
tests/fixtures/module-template-v4/                 (40+ fixture pages)
mom/api/routes/rest-routes.php                    (verify EQMS plural aliases)
mom/api/openapi.yaml                              (verify OpenAPI extended)
docs/adr/                                          (12+ ADRs)
```

---

## Comparison to GPT Pro original 9-wave plan

The merged plan adopts GPT Pro's:
- ✅ Wave 0 stabilization gate
- ✅ Wave 1 consolidation/documentation
- ✅ Wave 2-8 structure preserved
- ✅ AI governance rule (RULE-2)
- ✅ 3-stage graduation (RULE-1, RULE-8)
- ✅ Pre-production wording (RULE-3)
- ✅ 15-question verification (RULE-6)
- ✅ Decision phrase format (FROZEN)
- ✅ 8 standard artifacts per wave (RULE-4)
- ✅ Wave stabilization gate before progression (RULE-5)

The merged plan adds (from Strategic Master V2):
- ➕ Wave 9 (post-v1 release) for world-class extension
- ➕ MES depth specifics (8 roots + 6 workspaces in Stream 9A)
- ➕ Finance core (Stream 9B with 6 roots)
- ➕ Multi-tenancy (Stream 9G)
- ➕ AI/ML platform foundation (Stream 9H — beyond AI advisory shell)
- ➕ Customer + supplier portals (Stream 9J)
- ➕ Industry vertical packs (Pharma/Auto/Aero in Stream 9K)
- ➕ Marketplace + 8 pre-built connectors (Stream 9L)
- ➕ 11-pillar capability scoring (RUBRIC-1)
- ➕ Vendor benchmark (RUBRIC-2)
- ➕ Build-vs-buy decisions (RUBRIC-3)
- ➕ Compliance coverage map (RUBRIC-4)
- ➕ Strategic positioning vs SAP/Oracle/Veeva/Siemens

GPT Pro should evaluate:
- Are these additions valuable, or do they over-extend the plan?
- Should any be removed (e.g., is Wave 9 too ambitious)?
- Should any be moved earlier (e.g., AI/ML platform in Wave 7 vs Wave 9)?

---

## Closing instruction

After review, GPT Pro should:

1. Provide overall decision phrase
2. List any specific corrections in the standard format
3. Confirm whether Wave 0 is the right immediate next action
4. Confirm whether Wave 1-8 dependencies are realistic
5. Identify any P0 risks not addressed
6. Recommend ordering changes if any

User will use GPT Pro's output to:
- Approve or revise the plan
- Begin Wave 0 execution
- Resolve user decisions D-1 through D-10
- Decide team scaling for Wave 9

```
GPT_PRO_REVIEW_INSTRUCTIONS_BASELINE_LOCKED
PLAN_AWAITS_GPT_PRO_VERIFICATION_AND_USER_APPROVAL
```

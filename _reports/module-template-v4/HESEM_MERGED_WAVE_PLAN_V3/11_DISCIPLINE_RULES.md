# 11_DISCIPLINE_RULES.md

## Purpose

This file codifies the **8 Discipline Rules** + **15-Question Verification Checklist** + **Standard Decision Phrases** that govern every wave.

These rules are **frozen** unless superseded by a future ADR. They apply to ALL waves (0 through 9).

---

## RULE-1: Three-Stage Slice Graduation

Every slice progresses through 3 stages. **No stage skipping**.

```
STAGE 1: FIXTURE-ONLY (default forever, never deprecated)
  - Renderer reads from window.HMV4_<RESOURCE>_FIXTURE or inline JSON
  - No backend fetch
  - No mutation possible
  - All mutation buttons disabled with data-hmv4-mutation-intent attribute
  - Default mode of HMV4 prototype

  ↓ user explicitly approves Stage 2 graduation per slice

STAGE 2: OPT-IN LIVE READ-ONLY
  - Feature flag activated: ?hmv4-live-api=1 OR data-hmv4-live-api="true" OR window.HMV4_LIVE_API_ENABLED=true
  - Renderer fetches GET /api/v1/<resource-family>/<id>
  - Adapter normalizes response to fixture shape (per ADR-0012)
  - On error (4xx/5xx/network): falls back to error UI (does NOT silently use fixture)
  - Mutation buttons remain disabled
  - data-hmv4-source="live-api" set on success

  ↓ separate ADR per mutation surface required (NEVER bulk graduation)

STAGE 3: CONTROLLED MUTATION
  - Specific mutation surface enabled
  - Workflow/API contract verified
  - Idempotency, If-Match/version, problem details, audit event mandatory
  - Rollback test mandatory
  - 21 CFR Part 11 e-sign if regulated
  - Per-mutation ADR
```

**Forbidden**: jump from Stage 1 directly to Stage 3.

---

## RULE-2: AI Governance — 8 Banned Autonomous Regulated Decisions

AI MAY:
- Recommend
- Rank candidates
- Score risk
- Cluster similar records
- Surface anomalies
- Draft text for human review
- Extract structured data from free text

AI MUST NOT autonomously:

```
1. Release a lot (BREL approve-release / market-ship)
2. Approve a disposition (NQCASE record-disposition)
3. Close a CAPA (CAPA action-close)
4. Release a controlled document (CDOC action-release)
5. Release an ECO (ECO action-approve)
6. Certify training as complete (TRAIN-complete-certify)
7. Qualify a supplier (SUP qualify-decide)
8. Decide a recall or field action
```

Every AI feature MUST capture:
- Input references (which records were considered)
- Model name + version + training timestamp
- Output (recommendation/score/cluster)
- Confidence (numeric)
- Explanation (if explainable model)
- Human decision (which option chosen)
- Override reason (if human disagreed)
- Audit trail entry

---

## RULE-3: Pre-Production Wording

Mandatory in all docs, prompts, commit messages:

✅ **Use**:
- `development/prototype`
- `current portal safety`
- `pre-production readiness`
- `first-slice prototype`
- `limited Wave N implementation`
- `repair`, `stabilization`
- `release-candidate-grade` (Wave 8 only)

❌ **Avoid**:
- `production go-live`
- `production cutover`
- `production release`
- `validated production system`

EXCEPTION: After Wave 8 + production cutover gate passed, formal release language is permitted in commit messages and release notes.

---

## RULE-4: Eight Standard Artifacts Per Wave

Every wave MUST produce:

```
1. Implementation report   (S<n>_<scope>_IMPLEMENTATION_REPORT.md)
2. QA report               (S<n>_<scope>_QA_REPORT.md)
3. Rollback procedure      (S<n>_<scope>_ROLLBACK_PROCEDURE.md)
4. Fixture coverage report (S<n>_<scope>_FIXTURE_COVERAGE_REPORT.md)
5. E2E result summary      (embedded in implementation/QA)
6. Forbidden diff result   (embedded; PASS/FAIL)
7. Current portal safety   (embedded; INERT verified)
8. Decision phrase         (one of 4 standard phrases)
```

---

## RULE-5: Wave Stabilization Gate

```
NEVER enter wave N+1 with ANY of:
  - Outstanding FAIL_BLOCK_NEXT decision phrase
  - Unresolved warnings classified as `must_fix_now`
  - Forbidden file diff
  - Mutation introduced without ADR
  - Failing CI on main
  - Failing E2E count > 0 (chromium baseline)
```

Wave stabilization gate must PASS before progression.

---

## RULE-6: 15-Question Verification Checklist

For every major prompt or implementation, run this checklist:

```
1.  Is current main at expected HEAD with all expected reports? [ ]
2.  Is cross-browser visual regression clean (chromium baseline)? [ ]
3.  Are all PASS_WITH_WARNINGS classified (must-fix / schedule / accept)? [ ]
4.  Are forbidden files untouched per ADR-0004? [ ]
5.  Is 74-module-template-v4-fixtures.js absent from mom/portal.html? [ ]
6.  Is current portal inert by default (HMV4_PREVIEW_ENABLED=false)? [ ]
7.  Are reports tracked under _reports/module-template-v4/ intentionally? [ ]
8.  Is working tree clean? Any unintended dirty state? [ ]
9.  Is there branch divergence requiring sync? [ ]
10. Are all wave docs using pre-production wording? [ ]
11. Was any Stage 3 mutation introduced without ADR? Should be NO. [ ]
12. Was any AI autonomous regulated decision introduced? Should be NO. [ ]
13. Are workload estimates realistic (per cumulative timeline)? [ ]
14. Is Wave 0 mandatory before next wave begins? Should be YES. [ ]
15. Is the next prompt identified, with proper allowed/forbidden lists? [ ]
```

If any answer is NO/FAIL, halt and address before proceeding.

---

## RULE-7: Naming Convention

```
V<n>_<SCOPE>.md            — wave-prompt artifact (planning, approval, integration)
S<n>_<SCOPE>.md            — slice-specific artifact (implementation, QA, fixture coverage, rollback)
STREAM_<X>_<SCOPE>.md      — independent infrastructure/backend stream artifact
HMV4_<TOPIC>.md            — HMV4-wide reference document
ADR-<NNNN>_<TOPIC>.md      — architecture decision record (4-digit zero-padded)
```

Examples:
- `V21_PHASE2_INTEGRATION_REVIEW_REPORT.md` (Wave 0)
- `S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md` (Wave 1, Slice 3)
- `STREAM_C2_TRANSACTIONAL_REST_REPORT.md` (Wave 4 backend)
- `HMV4_SLICE_PATTERN_REGISTRY.md` (Wave 1)
- `ADR-0017-live-api-three-stage-graduation.md` (Wave 4)

---

## RULE-8: Read-Only Graduation Per Slice

Per slice progression rule:

```
A new slice is BORN at Stage 1 (fixture-only).
A slice GRADUATES to Stage 2 only after explicit approval.
A slice GRADUATES to Stage 3 only after per-mutation-surface ADR.

NEVER skip stages.
NEVER graduate Stage 1 → Stage 3 directly.
NEVER graduate without explicit user approval phrase.
```

User approval phrases:
- `Proceed with <slice> Stage 2 live-API graduation.` → unlocks Stage 2 work
- `Proceed with <slice> Stage 3 controlled mutation per ADR-<NNNN>.` → unlocks Stage 3 work

---

## Standard Decision Phrases (FROZEN)

Per RULE-4 artifact #8, every wave/slice/stream returns ONE of:

### Wave-level

```
WAVE_<N>_<SCOPE>_PASS_READY_FOR_WAVE_<N+1>
WAVE_<N>_<SCOPE>_PASS_WITH_WARNINGS
WAVE_<N>_<SCOPE>_FAIL_BLOCK_NEXT
WAVE_<N>_<SCOPE>_BLOCKED_<SPECIFIC_REASON>
```

### Slice-level

```
<SLICE>_<NUM>_PASS_READY_FOR_QA
<SLICE>_<NUM>_PASS_WITH_WARNINGS
<SLICE>_<NUM>_FAIL_BLOCK_NEXT
<SLICE>_<NUM>_QA_PASS_READY_FOR_NEXT_SLICE_PLANNING
<SLICE>_<NUM>_QA_FAIL_BLOCK_NEXT
```

### Stream-level

```
<STREAM>_PASS_READY_FOR_REVIEW
<STREAM>_PASS_WITH_WARNINGS
<STREAM>_FAIL_BLOCK_NEXT
```

### Special

```
WAVE_7_AI_GOVERNANCE_VIOLATION_BLOCK_NEXT  (any RULE-2 violation)
WAVE_8_RELEASE_READINESS_PASS_READY_FOR_PRODUCTION_CUTOVER_GATE
```

---

## Forbidden Files (FROZEN per ADR-0004)

These files are NEVER modified except as explicitly stated:

```
mom/portal.html                                    — only guarded feature-flag block insertion
mom/styles/portal.main.css                        — never
mom/styles/eqms-suite.css                         — never
mom/styles/density-darkmode.css                   — never
mom/scripts/portal/01-module-router.js            — never
mom/scripts/portal/02-state-auth-ui.js            — never
mom/scripts/portal/40-eqms-shell.js               — never
mom/qms-data/**                                   — never (no production registry promotion)
```

CI workflow enforces this via `git diff --name-only` guard.

---

## Slice graduation gate phrases (USER must say)

```
"Proceed with <wave> <scope> work."                 — unlocks wave start
"Approve <wave> stabilization. Proceed with <next>." — unlocks wave gate transition
"Proceed with <slice> Stage 2 live-API graduation."  — Stage 1 → Stage 2
"Proceed with <slice> Stage 3 controlled mutation per ADR-<NNNN>." — Stage 2 → Stage 3
"Approve <slice> commit and push."                   — commit gate
"Defer <slice> commit until <condition>."            — pause gate
```

---

## Compliance per file

```
00_MERGED_MASTER_PLAN.md           — references rules 1-8 in Section 8
01_WAVE_0_STABILIZATION.md          — applies RULE-3, RULE-4, RULE-5, RULE-6
02_WAVE_1_FOUNDATION.md             — applies RULE-3, RULE-7
03_WAVE_2_GOVERNED_RECORDS.md       — applies RULE-1 (Stage 1 only), RULE-4, RULE-6
04_WAVE_3_WORKFORCE.md              — applies RULE-1 (Stage 1 only), RULE-4
05_WAVE_4_LIVE_API.md               — applies RULE-1 (Stage 1→2 graduation)
06_WAVE_5_TRANSACTIONAL.md          — applies RULE-1 (Stage 2 max)
07_WAVE_6_DIGITAL_THREAD.md         — applies RULE-1, RULE-4
08_WAVE_7_ANALYTICS_AI.md           — applies RULE-2 (AI governance) STRICT
09_WAVE_8_HARDENING.md              — applies RULE-3 (production wording allowed only here)
10_WAVE_9_WORLDCLASS.md             — applies all rules
```

```
DISCIPLINE_RULES_BASELINE_LOCKED
```

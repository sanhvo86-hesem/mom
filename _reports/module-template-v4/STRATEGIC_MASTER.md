# STRATEGIC_MASTER.md — HESEM Operations Platform Frontend Program

**Generated**: 2026-04-25 (parallel strategic synthesis, no GPT Pro input yet)
**Branch**: `codex/second-slice-planning-from-dispatch-qa` @ HEAD `567e365b`
**Status**: Slice 1 + Slice 2 done; Slice 3 ready for approval; strategic posture established for Wave 1 (18 slices)

---

## 0. One-page TL;DR

| Question | Answer |
|---|---|
| What is the project? | Frontend redesign of HESEM ERP/MOM/MES/EQMS, fixture-prototype-first, slice-by-slice |
| What's done? | Step 1-8 architecture FROZEN; V6-V19 Codex execution DONE; Slice 1 (Dispatch) + Slice 2 (Nonconformance) PASS QA |
| What's next? | Slice 3 = Training Matrix workspace (S16 + API readiness scoring confirms) |
| Backend ready? | 0/18 GREEN; 12 YELLOW (need 1-day REST aliases); 6 RED (need full controllers) |
| Compliance status? | Vocabulary: 100% PASS. Graphics Authority: FAIL_BLOCK_NEXT (19 baseline CSS issues — not V18 NC) |
| Total estimate? | 18 slices, ~30 weeks frontend + parallel backend stream |
| Risk count? | 1 P1, 9 P2, 17 P3, 8 P4 (resolved). Top: CSS token remediation, EQMS alias backend stream |

## 1. What is built

### 1.1 Architectural foundation (FROZEN per Step 1-8)

```
14 experience domains
  → 46 primary modules + 15 demoted = 61 detailed inventory
  → 8 bounded contexts (BC1-BC8)
  → 8 enterprise spines
  → 52 baseline / 51 normalized roots
  → 18 Wave 1 workflow roots + 5 dependency roots
```

**Frozen vocabulary** (verified ZERO drift across all Step 1-8 masters):
- 14 domain names verbatim
- 18 Wave 1 root codes verbatim (QUO, CPO, SO, PO, IREV, ECO, JO, WO, DISP, PREC, LOT, INSP, NQCASE, CAPA, BREL, CDOC, TRAIN, MWO)
- 5 dependency roots verbatim (ITEM, CUST, SUP, EQP, MDEV)
- 9 route classes verbatim (SH, DL, ML, AC, AR, ERD, NRD, WS, SFW)
- 23 API family tokens verbatim
- 7 forbidden file paths

### 1.2 Implementation pattern (FROZEN per Step 6-8)

```
mom/portal.html                          ← only feature-flag insertion (line 33-36 CSS, 429-440 JS)
mom/styles/module-template-v4.tokens.css ← design tokens (additive)
mom/styles/module-template-v4.css        ← component CSS (additive, has 19 violations)
mom/templates/module-template-v4/...     ← HTML template
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/71-module-template-v4-routes.js
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/74-module-template-v4-fixtures.js  ← FIXTURE-ONLY, never loaded by portal
tests/e2e/module-template-v4*.spec.ts    ← 4 spec files, 23 tests
tests/fixtures/module-template-v4/**     ← 11 JSON, 18+ HTML pages
_reports/module-template-v4/**           ← 22+ audit/QA reports (now tracked)
```

**Feature flags** (default: HMV4 INERT):
```js
window.HMV4_PREVIEW_ENABLED = false             // default off
window.HMV4_ROUTE_BRIDGE_ENABLED = true         // bridge always available
window.HMV4_FIXTURE_MODE = false                // never loads 74-fixtures.js
window.HMV4_DISABLE_MUTATION_LAUNCHERS = true   // no live mutations
```

### 1.3 Slice progress (committed)

| Slice | Code | Route Class | Authority | Commit | Status |
|---:|---|---|---|---|---|
| 1 | Dispatch Board | WS | projection | `a5f4d3c7` + `9289ef89` | ✅ DONE |
| 2 | Nonconformance Case Record Shell | AR | authoritative | `2eb6a7aa` | ✅ DONE |

**12 + 23 = 35 E2E tests** currently green across both slices.

## 2. Strategic Posture

### 2.1 Pre-production positioning (FROZEN)

This is **development/prototype** work only. Wording rules:

✅ Allowed: `development/prototype`, `current portal safety`, `pre-production readiness`, `first-slice prototype`, `limited Wave 1 implementation`

❌ Forbidden: `production go-live`, `production cutover`, `production release`, `validated production system`

**Implications**:
- No backend API changes during slice work
- No registry promotion to `mom/qms-data`
- No current portal navigation switch
- Feature flags inert by default
- Forbidden files immutable (7 files)

### 2.2 Slice quality gates (FROZEN)

Every slice MUST pass:

| Gate | Tool/Command |
|---|---|
| 1. Node syntax 70-74 | `node --check` for each `mom/scripts/portal/7?.js` |
| 2. JSON fixture parse | Python `json.loads` over `tests/fixtures/module-template-v4/**/*.json` |
| 3. Forbidden diff | `git diff --name-only \| grep -E 'forbidden-pattern'` (FAIL if match) |
| 4. No fixture production load | `grep -n "74-module-template-v4-fixtures" mom/portal.html` (FAIL if match) |
| 5. Portal feature flag inert | Default values must remain false |
| 6. Playwright E2E 100% pass | `npm run test:hmv4 -- --project=chromium` |
| 7. Graphics Authority compliance | grep `#[0-9a-f]{6}` and `\d+px` in JS files (FAIL if match in slice diff) |

### 2.3 Slice cycle (FROZEN per V13-V19 pattern)

```
V_n   = planning prompt        →  S_n  planning artifacts
V_n+1 = approval prompt        →  S_n  approval gate
V_n+2 = implementation prompt  →  S_n  implementation report (PASS_READY_FOR_QA)
V_n+3 = QA prompt              →  S_n  QA report (PASS_READY_FOR_NEXT_SLICE_PLANNING)
```

Each cycle ~1 week (small slices, EQMS-backed) to ~3 weeks (RED slices, backend creation).

## 3. Wave 1 Execution Roadmap

### Phase A — Quality stream (Slices 3-8, ~6 weeks)

Lean on EQMS-grade backends already implemented; build all governed AR
shells and the qualification workspace.

| Slice | Root | Pattern | Backend |
|---:|---|---|---|
| 3 | TRAIN | WS qualification matrix | YELLOW-EQMS |
| 4 | CAPA | AR governed-quality | YELLOW-EQMS |
| 5 | CDOC | AR governed-content | YELLOW-EQMS |
| 6 | INSP | AR governed-quality | YELLOW-EQMS |
| 7 | BREL | AR governed-release | YELLOW-EQMS |
| 8 | ECO | AR governed-change | YELLOW-EQMS |

**Backend cost (parallel)**: 6 REST aliases (1-day each).

### Phase B — Transactional stream (Slices 9-12, ~6 weeks)

Sales/Job/Work order shells. Backend exists as legacy `/api/orders/*`.

| Slice | Root | Backend |
|---:|---|---|
| 9 | JO | YELLOW-legacy |
| 10 | SO | YELLOW-legacy |
| 11 | WO | YELLOW-legacy |
| 12 | CPO | YELLOW-rename |

**Backend cost**: 4 canonical REST routes (~2-3 days each).

### Phase C — RED stream (Slices 13-18, ~18 weeks)

Full backend creation required.

| Slice | Root |
|---:|---|
| 13 | PO |
| 14 | QUO |
| 15 | PREC |
| 16 | LOT |
| 17 | IREV |
| 18 | MWO |

**Backend cost**: 6 full controllers + state machines.

### Slice 0.5 (insert before Slice 4)

Domain landing pattern (SH/DL/ML route classes) — currently implicit in
HMV4 hydration, never fixture-tested. Insert thin slice for shell
navigation.

### Total Estimate

- **Best case**: 20 weeks (backend prioritizes alias work)
- **Likely**: 30 weeks (with parallel backend stream)
- **Worst case**: 40 weeks (RED roots prove larger than estimate)

## 4. Strategic Decisions (Frozen vs Open)

### 4.1 FROZEN (no reopen without explicit decision)

- **F-01** Step 1-8 architecture (14/46/61, BCs, spines, roots)
- **F-02** Route grammar (`/ops/{domain}/{module}` and `/ops/records/...`)
- **F-03** API family tokens (plural, snake-case in URL)
- **F-04** Forbidden file list (7 paths)
- **F-05** Non-production positioning (no live API in slices)
- **F-06** Feature flag mechanism (HMV4_PREVIEW_ENABLED inert by default)
- **F-07** Slice cycle (planning → approval → impl → QA)
- **F-08** 7 quality gates per slice
- **F-09** Slice 3 = Training Matrix (per S16 + API readiness)
- **F-10** Vocabulary index (resolved by zero-drift audit)

### 4.2 OPEN (need decision before next milestone)

- **O-01** [P1] Fix 19 CSS Graphics Authority violations — pre-Slice 4 or dedicated cleanup slice?
- **O-02** [P2] When to start backend alias work? Pre-Slice 4 or Slice-by-Slice?
- **O-03** [P2] Run `/security-review` skill on Slice 1+2 — when? recommended pre-Slice 5
- **O-04** [P3] CI workflow activation — approve `.github/workflows/hmv4-e2e.yml` draft?
- **O-05** [P3] axe-core a11y suite — add to E2E or maintain manual matrix?
- **O-06** [P3] Visual regression testing — Percy/Chromatic/Playwright screenshot diff?
- **O-07** [P3] React/Vue framework decision — re-evaluate at Slice 8 inflection
- **O-08** [P3] Cross-browser test (Firefox, WebKit) — add when?
- **O-09** [P3] Live API cutover plan — phased rollout per slice or big bang at Wave 1 end?
- **O-10** [P3] PR strategy — single big PR for Wave 1 or per-slice PRs?

## 5. Top 3 Strategic Recommendations

### Recommendation 1: Lock the 6 EQMS aliases as Sprint 1 backend work

**Why**: 6 REST aliases (NQCASE→ncr, CAPA→capa, CDOC→documents, INSP→iqc+inprocess, BREL→batch-release, ECO→engineering-change, TRAIN→training) unblock Slices 3-8 to go from 100% fixture to live data. Each alias is 1-day work. Total: 1.5 weeks parallelizable.

**Without this**: Slices 3-8 stay fixture-only forever; live cutover deferred to end of Wave 1, increasing migration risk.

**With this**: Slices 3-8 can have a "fixture mode" + "live mode" toggle. End of Phase A = first time we know HMV4 actually works against real data.

### Recommendation 2: Address Graphics Authority debt as Slice 0.5

**Why**: 19 violations in baseline `module-template-v4.css` — not V18 NC issue, but every future slice inherits the dirty baseline. Per CLAUDE.md this is FAIL_BLOCK_NEXT.

**Cost**: 1-2 days. 9 new tokens to add to `graphics_token_catalog`, 19 CSS rules to refactor.

**Defer-cost**: Each future slice (Slices 3-18) silently extends the violation list. By Slice 8, audit fix becomes 80+ violations.

### Recommendation 3: Insert "Slice 0.5" for shell/landing navigation

**Why**: Current HMV4 only renders WS workspaces and AR record shells when explicitly routed. The SH/DL/ML route classes are implicit but never fixture-tested. A user landing on `/ops` or `/ops/quality-compliance/quality-case-management` sees nothing useful.

**Cost**: 1 week. Add domain landing renderer + 4-6 fixture pages.

**Benefit**: After Slice 0.5, HMV4 becomes a navigable surface (shell + 14 domains + 46 modules); a user can browse from `/ops` to any record without hand-typing routes.

## 6. Branch & Commit Hygiene

### 6.1 Current state

```
main                                                   = 383f3327 (clean, 2 behind)
codex/module-template-v4-step10-5-hardening (origin)   = 9289ef89 (V14 dispatch QA)
codex/second-slice-planning-from-dispatch-qa (this)    = 567e365b (V18 NC + reports + V20 plan)
codex/dcc-en-header-flicker-root-cause                 = c42914d5 (parallel DCC bug-fix)
```

### 6.2 Recommended branch convention going forward

- One branch per slice: `codex/<slice-N>-<root-code>-from-<prev-qa>`
- Examples:
  - `codex/slice-3-train-from-nc-qa` (current = `codex/second-slice-planning-from-dispatch-qa`)
  - `codex/slice-4-capa-from-train-qa`
  - `codex/slice-5-cdoc-from-capa-qa`
- Each slice merges to `main` via PR after QA pass + GPT Pro review
- Stale branches archived after merge

### 6.3 Commit grouping (per slice, after V_n+3 QA pass)

Single focused commit per slice:
- `feat(module-template): add <root> <pattern> prototype` — runtime + fixtures + E2E
- Plus separate `docs` commit for `_reports/` artifacts

## 7. Knowledge Persistence

### 7.1 Source of truth (in repo)

- `_reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md` — current state for external review
- `_reports/module-template-v4/STRATEGIC_MASTER.md` — this document
- `_reports/module-template-v4/WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md` — slice order
- `_reports/module-template-v4/CONSOLIDATED_RISK_REGISTER.md` — risk tracking
- `_reports/module-template-v4/PARALLEL_RESEARCH_*.md` — backend, graphics, vocabulary research
- `_reports/module-template-v4/V20_TRAINING_MATRIX_*.md` — Slice 3 prompts

### 7.2 Source of truth (in archive only)

- `/Users/a10/Downloads/Archive.zip` — V6-V18 historical packages
- `/tmp/hesem-archive/Asset 5/Asset 6/Asset 7/Asset 8` — Step 5/6/7/8 master files
- ChatGPT session transcripts — historical drafts

### 7.3 Continuity guarantee

If this session ends and a new Claude/Codex/ChatGPT session starts:
- Read `_reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md` first → current state
- Read `STRATEGIC_MASTER.md` (this file) → strategy
- Read `WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md` → next slice
- Read `CONSOLIDATED_RISK_REGISTER.md` → blockers
- The full Step 1-8 vocabulary is reproducible from `_reports/module-template-v4/PARALLEL_RESEARCH_VOCABULARY_DRIFT_AUDIT.md`

## 8. Strategic Targets (Quarterly)

### Q2 2026 (this quarter)

- ✅ Slices 1-2 PASS QA (DONE)
- 🟡 Slice 3 (TRAIN) — V20 plan ready; awaiting GPT Pro review + user approval
- 🟡 Backend Sprint 1 — 6 EQMS REST aliases; coordinate with backend team
- 🟡 GA-01 fix — 19 CSS violations; Slice 0.5 cleanup
- 🟡 CI workflow activation — `.github/workflows/hmv4-e2e.yml`

### Q3 2026

- Slices 4-8 (CAPA, CDOC, INSP, BREL, ECO) — Phase A complete
- 6 EQMS aliases live in backend
- First "fixture → live" toggle introduced (Slice 5)
- Security review pass on HMV4 surface
- a11y axe-core integration

### Q4 2026

- Slices 9-12 (JO, SO, WO, CPO) — Phase B
- 4 transactional REST routes formalized
- Visual regression testing introduced
- Cross-browser CI matrix

### Q1 2027

- Slices 13-18 (PO, QUO, PREC, LOT, IREV, MWO) — Phase C
- 6 RED-root backends built
- Performance baseline + load test
- Wave 1 complete; portal cutover planning

### Q2 2027

- Wave 2 planning (workflow tasks, work-inbox, draft state)
- Portal cutover Phase 1 (HMV4 default for `/ops` paths)
- Legacy portal retirement plan

## 9. Decision Phrase

```
STRATEGIC_MASTER_BASELINE_ESTABLISHED
READY_FOR_GPT_PRO_REVIEW
RECOMMENDED_NEXT_ACTIONS_LISTED_IN_SECTION_5
```

GPT Pro should review:
1. Section 5 (Top 3 Recommendations) — agree/disagree/refine
2. Section 4.2 (Open decisions) — answer or punt
3. Section 3 (Roadmap) — confirm slice ordering, especially Slice 0.5 insertion
4. Section 8 (Strategic Targets) — confirm quarterly milestones realistic

## 10. Files generated this strategic session (parallel work)

| File | Purpose |
|---|---|
| `EXECUTIVE_REVIEW_FOR_GPT_PRO.md` | Single review entry point for external evaluation |
| `STRATEGIC_MASTER.md` (this file) | Quarterly strategy + roadmap |
| `WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md` | All 18 slices ordered |
| `CONSOLIDATED_RISK_REGISTER.md` | 35 risks ranked |
| `PARALLEL_RESEARCH_API_READINESS_MATRIX.md` | Backend gap per root |
| `PARALLEL_RESEARCH_GRAPHICS_AUTHORITY_AUDIT.md` | 19 violations identified |
| `PARALLEL_RESEARCH_VOCABULARY_DRIFT_AUDIT.md` | 12 axes verified zero drift |
| `V20_TRAINING_MATRIX_THIRD_SLICE_PLANNING_PROMPT.md` | Slice 3 planning input for Codex |
| `V20_TRAINING_MATRIX_IMPLEMENTATION_PROMPT.md` | Slice 3 implementation input for Codex |
| `CI_WORKFLOW_DRAFT.md` | GitHub Actions YAML draft |
| `S18_NONCONFORMANCE_SECOND_SLICE_QA_REPORT.md` | Re-verified Slice 2 QA on committed state |

## 11. Self-assessment

**What I (Claude) did without GPT Pro**:
- ✅ Verified V18 NC slice on committed state (23/23 E2E pass)
- ✅ Generated S18 QA report
- ✅ Whitelisted `_reports/` and tracked 22 evidence files
- ✅ Pushed branch with reports to GitHub
- ✅ Audited Graphics Authority compliance → 19 violations identified
- ✅ Audited vocabulary drift across Step 1-8 → ZERO drift
- ✅ Built API readiness matrix → 0 GREEN, 12 YELLOW, 6 RED
- ✅ Scored 18 Wave 1 roots → ordered Slice 3-18 sequence
- ✅ Drafted V20 (planning + implementation) prompts for Slice 3
- ✅ Drafted CI workflow YAML
- ✅ Consolidated risk register (35 risks ranked)
- ✅ Generated this STRATEGIC_MASTER.md

**What I deliberately did NOT do (waiting for GPT Pro / user approval)**:
- ❌ Activate CI workflow (drafted, not committed to `.github/`)
- ❌ Refactor 19 CSS violations (drafted plan, no code change)
- ❌ Pre-execute V20 planning artifacts beyond the prompts (Codex should run V20 prompt)
- ❌ Push V19 prompt to backend team for alias work (coordination required)
- ❌ Create PR from `codex/second-slice-planning-from-dispatch-qa` to main

**What I cannot do without user input**:
- Slice priority override (S16 + my scoring → TRAIN, but user could pick differently)
- Accept Open decisions O-01 through O-10
- Approve security review timing
- Approve framework switch timing

## Final note for GPT Pro

This session has materially advanced the project beyond just running V18.
The deliverables in this `_reports/module-template-v4/` directory now form
a self-contained planning + execution + risk + roadmap reference. GPT Pro
should treat these as the canonical state-of-the-program, find gaps,
challenge recommendations, and propose alternatives where appropriate.

```
STRATEGIC_BASELINE_LOCKED_2026-04-25
NEXT_USER_DECISION = APPROVE_OR_REVISE_RECOMMENDATIONS_IN_SECTION_5
```

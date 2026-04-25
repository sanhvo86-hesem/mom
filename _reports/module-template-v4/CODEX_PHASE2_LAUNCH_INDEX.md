# CODEX PHASE 2 LAUNCH INDEX

**Generated**: 2026-04-25 (after Phase 1 merge into main commit `2af773e8`)
**Purpose**: Next-phase parallel megaprompts for Codex local sessions.
**Branch base**: `main` @ `2af773e8` (all Phase 1 work consolidated).

## ✅ Phase 1 — COMPLETE and on main

| Stream | Status | Commit on main |
|---|---|---|
| Slice 1 (DISP) | DONE | merged earlier |
| Slice 2 (NQCASE) | DONE | merged earlier |
| Slice 3 (TRAIN) | DONE | (via slice cycle) |
| Slice 0.5 (Nav shell SH/DL/ML) | DONE | `41e3252e` |
| Stream B.1 (GA CSS remediation) | DONE | merged earlier |
| Stream B.3 (CI workflow) | DONE | merged earlier |
| Stream C.1 (EQMS plural aliases) | DONE | `d21d6462` |
| Stream D.1 (axe-core a11y) | DONE | merged earlier |
| Stream D.2 (Visual regression chromium) | DONE | `ae46d9e0` |
| Stream D.3 (Performance baseline) | DONE | `d9a6786b` |
| Stream E.1 (.ai/ index regen) | DONE | `618b99de` |
| Stream E.2 (10 ADRs) | DONE | merged earlier |
| Stream E.3 (CLAUDE.md Wave 1 section) | DONE | merged earlier |

**Test status**: 111/111 Playwright tests pass on Chromium.

## 🟡 Phase 2 — Ready to launch

### Parallel matrix (4 sessions can run simultaneously)

| Session | Branch | Megaprompt | Touches | Independent? |
|---|---|---|---|---|
| **1** | `codex/slice-4-capa-from-train-qa` | `CODEX_MEGAPROMPT_SLICE4_CAPA_RECORD_SHELL.md` | 73-renderers.js, fixtures, e2e | Slice cycle (frontend) |
| **2** | `codex/live-api-toggle-nqcase` | `CODEX_MEGAPROMPT_LIVE_API_TOGGLE_NQCASE.md` | 70-hydration.js, 73-renderers.js | ⚠️ Conflicts with Session 1 (same renderer file) |
| **3** | `codex/backend-transactional-rest` | `CODEX_MEGAPROMPT_TRANSACTIONAL_REST_C2.md` | mom/api/ (backend) | ✅ Fully independent |
| **4** | `codex/qa-cross-browser-baselines` | `CODEX_MEGAPROMPT_CROSS_BROWSER_BASELINES.md` | tests/e2e (test infra) | ✅ Fully independent |

### Conflict resolution

- **Sessions 1 + 2** both touch `73-module-template-v4-renderers.js`. Pick ONE to run first; merge before running the other.
  - Recommendation: **Session 2 first** (live API toggle) because it tests the strategic cutover playbook against the just-merged backend EQMS aliases. Then Session 1 (CAPA) which adds new renderer.
- **Sessions 3 + 4** are independent of everything else — run in parallel with whichever frontend session you pick.

### Optimal launch sequence

```
Day 1 morning:
├─ Session 2: Live API Toggle for NQCASE (frontend hydration + renderer extension)
├─ Session 3: Transactional REST C2 (backend SO/JO/WO formalization)
└─ Session 4: Cross-Browser Baselines (test infra Firefox + WebKit)

Day 1 evening (after merging Session 2 into main):
└─ Session 1: CAPA Slice 4 record shell

Day 2:
├─ Session 5: Slice 5 CDOC (use the same megaprompt template as CAPA, swap CAPA→CDOC)
├─ Session 6: Slice 6 INSP (same template, swap to INSP)
└─ Session 7: Slice 7 BREL (same template, swap to BREL)
```

## 📋 Phase 2 megaprompt files

```text
CODEX_MEGAPROMPT_SLICE4_CAPA_RECORD_SHELL.md          (~700 lines)
CODEX_MEGAPROMPT_LIVE_API_TOGGLE_NQCASE.md            (~500 lines)
CODEX_MEGAPROMPT_TRANSACTIONAL_REST_C2.md             (~550 lines)
CODEX_MEGAPROMPT_CROSS_BROWSER_BASELINES.md           (~350 lines)
CODEX_PHASE2_LAUNCH_INDEX.md                          (this file)
```

## 🔑 Approval phrases

| Session | Approval phrase |
|---|---|
| 1 (CAPA) | `Proceed with CAPA Record Shell fourth-slice prototype implementation.` |
| 2 (Live API) | `Proceed with NQCASE live API toggle experiment.` |
| 3 (Transactional REST) | `Proceed with transactional REST formalization (SO/JO/WO).` |
| 4 (Cross-browser) | `Proceed with HMV4 cross-browser baselines.` |

## 🎯 Decision phrase outputs

| Session | PASS | WARNINGS | FAIL |
|---|---|---|---|
| 1 | `CAPA_SLICE4_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 2 | `LIVE_API_TOGGLE_NQCASE_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 3 | `TRANSACTIONAL_REST_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 4 | `CROSS_BROWSER_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |

## 📦 What this phase unlocks

**After Phase 2 complete**:
- 5 of 18 Wave 1 slices done (DISP, NQCASE, TRAIN, CAPA, plus nav shell)
- Live API cutover playbook proven on NQCASE — replicable to CAPA, CDOC, INSP, etc.
- Backend transactional path (SO/JO/WO) ready for Phase B (Slices 9-12)
- Cross-browser visual coverage (Firefox + WebKit) — release-grade quality
- 14 ADRs total (10 existing + 4 new: ADR-0011 live-api-toggle, plus revisions)

**Next opportunities (Phase 3)**:
- Slice 5 CDOC (governed-content)
- Slice 6 INSP (governed-quality)
- Slice 7 BREL (governed-release)
- Slice 8 ECO (governed-change)
- Replicate live-api toggle to CAPA + CDOC

## ⚠️ Forbidden across all Phase 2 sessions

```text
mom/portal.html (only feature-flag exception in live-api session)
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/qms-data/**
HMV4_PREVIEW_ENABLED=true in any committed file
HMV4_LIVE_API_ENABLED=true in mom/portal.html
```

## 🔄 Post-Phase-2 coordinator prompt

After all 4 Phase 2 sessions land, run a coordinator (Claude Code or Codex):

```text
Read all Phase 2 reports in _reports/module-template-v4/. Synthesize
unified PR plan: which branches go to main first, in what order, with
what merge conflicts. Then run a single full E2E suite on main to
verify all Phase 1 + Phase 2 work coexists. Generate
S_PHASE2_INTEGRATION_REPORT.md with go/no-go for Phase 3.
```

---

**Total Phase 2 LOC budget**: ~2100 lines of megaprompt content.
**Estimated parallel time**: ~6-8 hours of Codex execution time across 4 windows.
**Estimated single-thread time**: ~24 hours.

# CODEX PHASE 3 LAUNCH INDEX

**Generated**: 2026-04-25 (after Phase 2 merged into main)
**Main HEAD**: `f98e2354`
**Phase**: 3 — completes Wave 1 Phase A (governed-quality stream) + replicates live API + finishes backend C stream

---

## ✅ Phase 1 + Phase 2 — COMPLETE on main

| Phase | Stream | Status |
|---|---|---|
| 1 | Slice 0.5 nav shell, Slice 1 DISP, Slice 2 NQCASE, Slice 3 TRAIN | DONE |
| 1 | Stream B.1 GA cleanup, B.3 CI workflow | DONE |
| 1 | Stream C.1 EQMS plural aliases (~91 routes) | DONE |
| 1 | Stream D.1 axe-core, D.2 visual regression chromium, D.3 perf, D.5 security review | DONE |
| 1 | Stream E.1 .ai/ regen, E.2 10 ADRs, E.3 CLAUDE.md update | DONE |
| 2 | Slice 4 CAPA | DONE |
| 2 | Live API toggle NQCASE (ADR-0011) | DONE |
| 2 | Stream C.2 transactional REST | DONE |
| 2 | Stream D.4 cross-browser baselines (firefox + webkit) | DONE |

**Tests**: 111+ Playwright passing on chromium; firefox + webkit baselines captured.
**ADRs**: 11 (10 + ADR-0011 live API).

---

## 🟡 Phase 3 — 6 megaprompts ready

### Parallel matrix

| Session | Branch | Megaprompt | Conflict-free? |
|---|---|---|---|
| **1** (frontend slice 5) | `codex/slice-5-cdoc-from-capa-qa` | `CODEX_MEGAPROMPT_SLICE5_CDOC_RECORD_SHELL.md` | Touches 73-renderers.js |
| **2** (backend C.3) | `codex/backend-cpo-rename` | `CODEX_MEGAPROMPT_CPO_RENAME_C3.md` | ✅ Independent |
| **3** (frontend slice 6) | `codex/slice-6-insp-from-cdoc-qa` | `CODEX_MEGAPROMPT_SLICE6_INSP_RECORD_SHELL.md` | ⚠️ After Slice 5 merged |
| **4** (frontend slice 7) | `codex/slice-7-brel-from-insp-qa` | `CODEX_MEGAPROMPT_SLICE7_BREL_RECORD_SHELL.md` | ⚠️ After Slice 6 merged |
| **5** (frontend slice 8) | `codex/slice-8-eco-from-brel-qa` | `CODEX_MEGAPROMPT_SLICE8_ECO_RECORD_SHELL.md` | ⚠️ After Slice 7 merged |
| **6** (live api replication) | `codex/live-api-toggle-replication-phase3` | `CODEX_MEGAPROMPT_LIVE_API_REPLICATION.md` | ⚠️ After Slice 8 merged |

### Optimal parallel

**Day 1**:
- Session 1: Slice 5 CDOC (frontend, ~3 hr Codex)
- Session 2: CPO rename C.3 (backend, ~2 hr) **PARALLEL**

**Day 1 evening**: Merge Session 1 + Session 2 → main.

**Day 2**:
- Session 3: Slice 6 INSP (frontend, ~3 hr)

**Day 2 evening**: Merge → main.

**Day 3**:
- Session 4: Slice 7 BREL (frontend, ~3 hr)

**Day 3 evening**: Merge.

**Day 4**:
- Session 5: Slice 8 ECO (frontend, ~3 hr)

**Day 4 evening**: Merge. **Phase A quality stream COMPLETE.**

**Day 5**:
- Session 6: Live API replication for CAPA+CDOC+INSP+BREL+ECO (frontend hydration adapter, ~4 hr)

**Day 5 evening**: Merge. **Phase 3 COMPLETE.**

### Total Phase 3 timing

- Sequential (1 frontend at a time): ~5 days × ~3 hr Codex = 15 hr Codex + 2-3 hr review per slice
- Parallel where possible (Sessions 1+2 on Day 1): saves ~1 day
- Net: **~5-6 calendar days** for Phase 3

---

## 📋 Phase 3 file inventory

```text
CODEX_PHASE3_LAUNCH_INDEX.md (this file)
CODEX_MEGAPROMPT_SLICE5_CDOC_RECORD_SHELL.md          (full template, ~600 lines)
CODEX_MEGAPROMPT_SLICE6_INSP_RECORD_SHELL.md          (differential, ~250 lines)
CODEX_MEGAPROMPT_SLICE7_BREL_RECORD_SHELL.md          (differential, ~250 lines)
CODEX_MEGAPROMPT_SLICE8_ECO_RECORD_SHELL.md          (differential, ~250 lines)
CODEX_MEGAPROMPT_LIVE_API_REPLICATION.md              (~600 lines, ADR-0012)
CODEX_MEGAPROMPT_CPO_RENAME_C3.md                     (~250 lines)
```

Total: ~2200 LOC. Differential prompts reference the CDOC full template.

---

## 🔑 Approval phrases

```text
Proceed with CDOC Record Shell fifth-slice prototype implementation.
Proceed with CPO canonical path rename.
Proceed with INSP Record Shell sixth-slice prototype implementation.
Proceed with BREL Record Shell seventh-slice prototype implementation.
Proceed with ECO Record Shell eighth-slice prototype implementation.
Proceed with live API toggle replication for governed records.
```

---

## 🎯 Decision phrases

| Session | PASS | WARNINGS | FAIL |
|---|---|---|---|
| 1 (CDOC) | `CDOC_SLICE5_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 2 (CPO) | `CPO_RENAME_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 3 (INSP) | `INSP_SLICE6_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 4 (BREL) | `BREL_SLICE7_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 5 (ECO) | `ECO_SLICE8_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 6 (Live API replication) | `LIVE_API_REPLICATION_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |

---

## 📦 What Phase 3 unlocks

After Phase 3 complete:
- **8 of 18 Wave 1 record/workspace surfaces done** (DISP, NQCASE, TRAIN, CAPA, CDOC, INSP, BREL, ECO + nav shell)
- **Phase A quality stream FINISHED** — all governed-quality, governed-content, governed-release, governed-change roots have authoritative record shells
- **Live API cutover playbook proven on 6 roots** (NQCASE original + 5 replicated) — pattern is now mechanical for any future EQMS-backed root
- **Backend transactional + commercial REST canonical paths complete** (C.1, C.2, C.3) — Phase B (Slices 9-12) frontend can now consume live data immediately
- **12 ADRs total** (11 + ADR-0012 live API replication pattern)

## 🚀 Phase 4 candidates (preview)

After Phase 3, the next phase begins **Phase B transactional stream**:
- Slice 9 JO record shell (job orders) — Stream A.9 with live API on Day 1
- Slice 10 SO record shell (sales orders)
- Slice 11 WO record shell (work orders)
- Slice 12 CPO record shell (customer purchase orders, now with canonical path)
- Plus: domain landing fixture expansion (3 → 14 domains), more workspace types, axe-core full coverage

---

## ⚠️ Forbidden across all Phase 3 sessions

```text
mom/portal.html (cache-bust line edits OK; no feature-flag default change)
mom/styles/portal.main.css, eqms-suite.css, density-darkmode.css
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js
mom/qms-data/**
HMV4_PREVIEW_ENABLED=true in any committed file
HMV4_LIVE_API_ENABLED=true in mom/portal.html
Any mutation execution in live-api adapter (read-only enforced)
```

---

## 🔄 Post-Phase-3 coordinator prompt

After all 6 sessions land on main, run a coordinator (Claude Code or Codex):

```text
Read all Phase 3 reports in _reports/module-template-v4/ (S_SLICE5*,
S_SLICE6*, S_SLICE7*, S_SLICE8*, S_LIVE_API_REPLICATION*, S_BACKEND_CPO_RENAME*).
Synthesize unified Phase A integration report covering:
- 8 surfaces × 5 fixture states × 3 browsers visual coverage matrix
- Live API mode coverage matrix across 6 governed roots
- Backend canonical path completeness for Wave 1 Phase A roots
- Outstanding gaps for Phase B (transactional Slices 9-12) entry
Run full E2E suite on main to verify all phases coexist.
Generate S_PHASE3_INTEGRATION_REPORT.md with Phase 4 go/no-go.
```

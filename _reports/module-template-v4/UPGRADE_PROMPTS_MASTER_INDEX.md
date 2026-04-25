# UPGRADE PROMPTS MASTER INDEX

**Generated**: 2026-04-25
**Purpose**: Sequence + parallelization map for the next phase of HESEM Operations Platform frontend upgrade. Each prompt is self-contained for Codex local or Claude Code execution.

---

## 0. How to use this index

1. Read `STRATEGIC_MASTER.md` first for context.
2. Identify which **stream** you want to advance (1–5 below).
3. Open the corresponding `UPGRADE_PROMPT_PACK_<N>_*.md` file.
4. Within each pack, prompts are listed in **execution order**. Some prompts can run in parallel (marked 🟢); others have dependencies (marked 🔴 with predecessor).
5. Paste the prompt block verbatim into Codex local (or Claude Code session). Append the user's approval phrase at the end if required.

---

## 1. The five upgrade streams

| Stream | Pack | Goal | Frequency |
|---|---|---|---|
| **A — Slice cycle** | [Pack 1](UPGRADE_PROMPT_PACK_1_SLICE_3_CYCLE.md) | Execute one slice (plan → impl → QA) | Repeat per slice (3, 4, 5, …) |
| **B — Pre-slice cleanup** | [Pack 2](UPGRADE_PROMPT_PACK_2_PRESLICE_CLEANUP.md) | Fix baseline tech debt before Slice 3 lands | One-time |
| **C — Backend alignment** | [Pack 3](UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md) — read [Correction Note](UPGRADE_PROMPT_PACK_3_CORRECTION_NOTE.md) before pasting C1/C3/C4 | Unblock fixture→live transition for EQMS roots, transactional roots, RED roots | One-time per phase |
| **D — Quality infrastructure** | [Pack 4](UPGRADE_PROMPT_PACK_4_QUALITY_INFRA.md) | Add a11y, visual regression, performance, cross-browser, security | One-time setup |
| **E — Documentation** | [Pack 5](UPGRADE_PROMPT_PACK_5_DOCUMENTATION.md) | .ai/ index regen, ADR, CLAUDE.md update | One-time + ongoing |

---

## 2. Parallelization map

```
[Stream A: Slice cycle]    Pack1.A1 ──> Pack1.A2 ──> Pack1.A3 ──> Pack1.A4
   (sequential within slice)   plan       approve     impl         QA
                                                                    │
                                                                    └─> next slice cycle...

[Stream B: Cleanup]         Pack2.B1 ─┐
   (parallel each)          Pack2.B2 ─┼──> independent of Stream A
                            Pack2.B3 ─┘

[Stream C: Backend]         Pack3.C1 ─┐
   (parallel each)          Pack3.C2 ─┼──> independent of Stream A
                            Pack3.C3 ─┤
                            Pack3.C4 ─┘

[Stream D: Quality infra]   Pack4.D1 ─┐
   (parallel each)          Pack4.D2 ─┼──> independent of Stream A
                            Pack4.D3 ─┤
                            Pack4.D4 ─┤
                            Pack4.D5 ─┘

[Stream E: Documentation]   Pack5.E1 ─┐
   (parallel each)          Pack5.E2 ─┼──> independent of Stream A
                            Pack5.E3 ─┘
```

**Streams A–E run concurrently.** Within Stream A, prompts are sequential (a slice's QA depends on its impl which depends on its approval which depends on its plan). Within Streams B–E, each prompt is independent and can run in any chat/session order.

---

## 3. Execution session strategy

Three roles:

| Role | What it runs | When |
|---|---|---|
| **Codex local** (in `/Users/a10/Documents/mom`) | Pack 1 (slice cycle), Pack 2 (cleanup), Pack 4.D1 (a11y), Pack 5.E1 (.ai regen) | Daily |
| **Codex backend session** (PHP-aware) | Pack 3 (backend alignment) | When backend SME available |
| **Claude Code parallel sessions** | Pack 4 quality infra, Pack 5 documentation | Anytime |

---

## 4. Required user approvals

Each prompt pack lists which phrases the **user** must say to unlock the next prompt. Common phrases:

- `Proceed with V20 Training Matrix planning prompt.` → unlocks Pack 1.A1
- `Proceed with Training Matrix Workspace third-slice prototype implementation.` → unlocks Pack 1.A3 (after V20 plan completes)
- `Proceed with V22 Training Matrix QA.` → unlocks Pack 1.A4
- `Proceed with Slice 0.5 graphics authority CSS remediation.` → unlocks Pack 2.B1
- `Proceed with Slice 0.5 navigation shell prototype.` → unlocks Pack 2.B2
- `Activate HMV4 CI workflow.` → unlocks Pack 2.B3
- `Proceed with EQMS plural-form REST alias backend work.` → unlocks Pack 3.C1
- `Proceed with HMV4 axe-core integration.` → unlocks Pack 4.D1
- `Proceed with HMV4 visual regression setup.` → unlocks Pack 4.D2
- `Proceed with HMV4 performance baseline.` → unlocks Pack 4.D3
- `Proceed with HMV4 cross-browser matrix.` → unlocks Pack 4.D4
- `Proceed with HMV4 security review.` → unlocks Pack 4.D5
- `Proceed with .ai/ index regeneration.` → unlocks Pack 5.E1
- `Proceed with ADR records authoring.` → unlocks Pack 5.E2
- `Proceed with CLAUDE.md Wave 1 section update.` → unlocks Pack 5.E3

These approval phrases are explicit so Codex/Claude does not start work without permission.

---

## 5. Branch strategy per pack

| Pack | Branch convention | Example |
|---|---|---|
| Pack 1 (slice) | `codex/slice-<N>-<root>-from-<prev-qa>` | `codex/slice-3-train-from-nc-qa` |
| Pack 2.B1 (CSS) | `codex/slice-0-5-graphics-authority-cleanup` | (single branch) |
| Pack 2.B2 (nav shell) | `codex/slice-0-5-navigation-shell` | (single branch) |
| Pack 2.B3 (CI) | `codex/ci-hmv4-e2e-workflow` | (single branch) |
| Pack 3 (backend) | `codex/backend-<scope>-aliases` | `codex/backend-eqms-aliases` |
| Pack 4 (quality infra) | `codex/qa-<tool>-integration` | `codex/qa-axe-core-integration` |
| Pack 5 (docs) | `codex/docs-<scope>` | `codex/docs-ai-index-regen` |

Each branch lands as a single PR. PRs go to `main` after QA pass + review.

---

## 6. Forbidden across all packs (always honor)

- `mom/portal.html` (only feature-flag exception in Pack 1/2 if necessary)
- `mom/styles/portal.main.css`
- `mom/styles/eqms-suite.css`
- `mom/styles/density-darkmode.css`
- `mom/scripts/portal/01-module-router.js`
- `mom/scripts/portal/02-state-auth-ui.js`
- `mom/scripts/portal/40-eqms-shell.js`
- `mom/qms-data/**` (no production registry promotion)
- Any file under `mom/api/services/` for non-Pack-3 work

---

## 7. Decision phrases (canonical vocabulary)

Each prompt expects one of these decision phrases as output:

**Slice cycle (Pack 1)**:
- `<SLICE>_PLANNING_READY_FOR_APPROVAL`
- `<SLICE>_APPROVAL_READY_FOR_IMPLEMENTATION`
- `<SLICE>_IMPLEMENTATION_PASS_READY_FOR_QA`
- `<SLICE>_QA_PASS_READY_FOR_NEXT_SLICE_PLANNING`
- `<SLICE>_QA_PASS_WITH_WARNINGS`
- `<SLICE>_QA_FAIL_BLOCK_NEXT`

**Cleanup / infra (Packs 2-5)**:
- `<SCOPE>_PASS_READY_FOR_REVIEW`
- `<SCOPE>_PASS_WITH_WARNINGS`
- `<SCOPE>_FAIL_BLOCK_NEXT`

---

## 8. Status tracking

A `STREAM_STATUS.md` file should be maintained at `_reports/module-template-v4/`. Update after each prompt completes:

```text
Stream A (Slice cycle): SLICE-3 IMPL DONE / SLICE-3 QA PENDING
Stream B (Cleanup): B1 IN PROGRESS / B2 PENDING / B3 DRAFTED
Stream C (Backend): C1 PENDING (waiting backend team)
Stream D (Quality infra): D1 IN PROGRESS / D2-D5 PENDING
Stream E (Documentation): E1 DONE / E2-E3 PENDING
```

This file is a single source of truth for "where are we in the upgrade".

---

## 9. Time estimate (parallelized)

| Stream | Single-thread time | Parallel-thread time |
|---|---|---|
| A — Slice 3 cycle | 1 week | 1 week |
| B — Pre-slice cleanup (3 prompts) | 1 week | 2-3 days |
| C — Backend EQMS aliases | 1.5 weeks | 1.5 weeks (backend SME serialized) |
| D — Quality infra (5 prompts) | 2 weeks | 4-5 days |
| E — Documentation (3 prompts) | 4 days | 1-2 days |

**Total parallel**: ~2 weeks for Slice 3 + entire baseline cleanup + quality infra + docs (assuming backend SME has ~1.5 week capacity).

**Total single-thread**: ~6 weeks.

The parallelization advantage is **3× speedup** if Streams B/C/D/E run concurrently with Stream A.

---

## 10. Index of all prompt packs

| Pack | File | Prompts inside |
|---|---|---|
| 1 | [UPGRADE_PROMPT_PACK_1_SLICE_3_CYCLE.md](UPGRADE_PROMPT_PACK_1_SLICE_3_CYCLE.md) | A1 plan, A2 approval, A3 impl, A4 QA |
| 2 | [UPGRADE_PROMPT_PACK_2_PRESLICE_CLEANUP.md](UPGRADE_PROMPT_PACK_2_PRESLICE_CLEANUP.md) | B1 CSS remediation, B2 nav shell, B3 CI |
| 3 | [UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md](UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md) | C1 EQMS aliases, C2 transactional REST, C3 CPO rename, C4 RED kickoff |
| 4 | [UPGRADE_PROMPT_PACK_4_QUALITY_INFRA.md](UPGRADE_PROMPT_PACK_4_QUALITY_INFRA.md) | D1 axe-core, D2 visual regression, D3 performance, D4 cross-browser, D5 security review |
| 5 | [UPGRADE_PROMPT_PACK_5_DOCUMENTATION.md](UPGRADE_PROMPT_PACK_5_DOCUMENTATION.md) | E1 .ai/ index, E2 ADR, E3 CLAUDE.md |

19 prompts total. Streams B/C/D/E (15 prompts) can run in parallel with Stream A (4 prompts).

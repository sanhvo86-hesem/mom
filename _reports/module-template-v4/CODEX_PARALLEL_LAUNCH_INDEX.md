# CODEX PARALLEL LAUNCH INDEX

**Purpose**: 5 self-contained mega-prompts for Codex local. Each is one Codex session. Up to 5 in parallel — no file conflicts between them.
**Branch base for all**: `codex/second-slice-planning-from-dispatch-qa` @ `24d57d9a`

## Parallel matrix

| Codex session | Branch | Megaprompt file | Touches |
|---|---|---|---|
| **Session 1** (frontend slice) | `codex/slice-3-train-from-nc-qa` | `CODEX_MEGAPROMPT_SLICE3_TRAIN_IMPL.md` | 72-bridge.js, 73-renderers.js, fixtures/, e2e specs |
| **Session 2** (backend) | `codex/backend-eqms-aliases` | `CODEX_MEGAPROMPT_BACKEND_EQMS_ALIASES.md` | mom/api/routes/, mom/api/openapi.yaml, mom/api/controllers/Eqms*.php |
| **Session 3** (visual) | `codex/qa-visual-regression` | `CODEX_MEGAPROMPT_VISUAL_REGRESSION.md` | tests/e2e/playwright.config.ts, new visual.spec.ts, snapshots/ |
| **Session 4** (.ai index) | `codex/docs-ai-index-regen` | `CODEX_MEGAPROMPT_AI_INDEX_REGEN.md` | .ai/*.json |
| **Session 5** (alt frontend) | `codex/slice-0-5-navigation-shell` | `CODEX_MEGAPROMPT_NAV_SHELL.md` | 73-renderers.js, fixtures/, e2e specs |

## Conflict check

- Sessions 1 + 5 BOTH touch `73-module-template-v4-renderers.js`. Run **only one at a time**, or pick the one you want most. Recommendation: pick **Session 1** (Slice 3 = next planned slice).
- Sessions 2, 3, 4 are **fully independent**. Run all 3 in parallel with whichever frontend session you choose.

→ **Optimal parallel**: Session 1 + Session 2 + Session 3 + Session 4 (4 Codex windows simultaneously).

## How to launch each session

```text
1. Open Codex local in /Users/a10/Documents/mom
2. Paste the megaprompt file contents verbatim
3. Codex creates the branch, runs the work, generates the report
4. Each megaprompt outputs a decision phrase you can search for to confirm completion
```

## Approval phrases (paste before megaprompt if Codex asks)

| Session | Approval phrase |
|---|---|
| 1 | `Proceed with Training Matrix Workspace third-slice prototype implementation.` |
| 2 | `Proceed with EQMS plural-form REST alias backend work.` |
| 3 | `Proceed with HMV4 visual regression setup.` |
| 4 | `Proceed with .ai/ index regeneration.` |
| 5 | `Proceed with Slice 0.5 navigation shell prototype.` |

## Expected output decisions

| Session | PASS phrase | WARNINGS phrase | FAIL phrase |
|---|---|---|---|
| 1 | `TRAINING_MATRIX_THIRD_SLICE_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 2 | `EQMS_ALIASES_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 3 | `VISUAL_REGRESSION_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 4 | `AI_INDEX_REGEN_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 5 | `NAV_SHELL_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |

## After all sessions complete

Run a coordinator session (Claude Code or Codex) with:
```
Read all 5 reports in _reports/module-template-v4/. Synthesize a unified
PR plan: which branches go to main first, in what order, with what merge conflicts.
```

## Forbidden across all sessions

```text
mom/portal.html (only feature-flag exception in Session 1/5 if necessary)
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/qms-data/**
```

## File list

- `CODEX_MEGAPROMPT_SLICE3_TRAIN_IMPL.md` — Session 1
- `CODEX_MEGAPROMPT_BACKEND_EQMS_ALIASES.md` — Session 2
- `CODEX_MEGAPROMPT_VISUAL_REGRESSION.md` — Session 3
- `CODEX_MEGAPROMPT_AI_INDEX_REGEN.md` — Session 4
- `CODEX_MEGAPROMPT_NAV_SHELL.md` — Session 5 (alternative to Session 1)

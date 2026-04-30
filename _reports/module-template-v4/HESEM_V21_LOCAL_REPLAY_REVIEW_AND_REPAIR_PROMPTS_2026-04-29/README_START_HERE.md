# HESEM V21 Local Replay Review & Repair Prompt Pack

Generated: 2026-04-29

## Decision

```text
PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
```

## Current gate state

Stage F remains locked. The uploaded local Codex report did not return the only unlock token:

```text
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```

## Why Stage F is still locked

1. Full Chromium E2E did not execute to render because Playwright Chromium was not installed in the local cache.
2. Backend `composer run analyse`, `composer run test`, and `composer run check` were not clean.
3. The report explicitly sets `stage_f_unlock=false`.

## Files in this pack

- `reports/V21_LOCAL_REPLAY_REVIEW.md` — reviewed interpretation of the uploaded local report.
- `reports/STAGE_F_GATE_DECISION.md` — exact gate decision and allowed/forbidden next moves.
- `evidence/REPAIR_BACKLOG.csv` — machine-readable repair backlog.
- `prompts/CODEX_PROMPT_01_V21_ENV_REPLAY_ONLY.md` — first local Codex prompt: install Playwright Chromium and rerun E2E without source changes.
- `prompts/CODEX_PROMPT_02_V21_BACKEND_REPAIR_AND_REPLAY.md` — second local Codex prompt: narrow backend repairs for PHPStan/PHPUnit blockers, then rerun gates.
- `prompts/CODEX_PROMPT_03_V21_FINAL_UNLOCK_AUDIT.md` — final local Codex prompt: verify all evidence and issue the exact unlock token only if gates pass.
- `source/` — original uploaded local replay reports.

## Recommended run order

1. Run `CODEX_PROMPT_01_V21_ENV_REPLAY_ONLY.md` first.
2. If Chromium E2E passes but backend gates still fail, run `CODEX_PROMPT_02_V21_BACKEND_REPAIR_AND_REPLAY.md`.
3. Run `CODEX_PROMPT_03_V21_FINAL_UNLOCK_AUDIT.md` only after both browser and backend gates are clean.

Do not run Stage F until the final audit returns:

```text
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```

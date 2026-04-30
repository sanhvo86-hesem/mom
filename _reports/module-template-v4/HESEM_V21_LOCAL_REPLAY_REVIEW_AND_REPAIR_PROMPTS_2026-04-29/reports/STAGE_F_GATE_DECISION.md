# Stage F Gate Decision

## Decision

```text
STAGE_F_LOCKED_PENDING_V21_REPAIR_AND_REPLAY
```

The uploaded local Codex replay returned:

```text
PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
```

This is not the Stage F unlock token.

## Allowed next work

- Environment repair to install the missing Playwright Chromium browser.
- V21 replay on the same current main SHA or a newer explicitly verified main.
- Narrow backend repairs for the exact PHPStan and PHPUnit blockers listed in the report.
- Report-only V21 gate documentation under `_reports/module-template-v4/`.

## Forbidden next work

- Do not start Stage F row-level expansion.
- Do not instantiate slice execution prompts.
- Do not add new HMV4 slices.
- Do not refresh Chromium snapshots unless an actual rendered visual diff is reproduced and explicitly approved.
- Do not enable live API by default.
- Do not modify forbidden current portal files without explicit approval.
- Do not claim production, cutover, validated-system, certification, or release readiness.

## Unlock condition

Stage F opens only when a current local replay returns:

```text
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```

Recommended evidence required for that token:

- `node --check` pass for HMV4 scripts 70–74.
- Portal fixture-load guard pass.
- Forbidden diff guard pass.
- Fixture JSON parse pass.
- Playwright Chromium full suite pass after Chromium browser install.
- Focused transactional REST C2 tests pass.
- Backend `composer run analyse`, `composer run test`, and `composer run check` pass, or a written gate policy explicitly scopes existing backend debt out of V21. Strict package recommendation: require clean backend gates.

# Stage F Gate Decision

## Decision

```text
STAGE_F_LOCKED_PENDING_CLEAN_MAIN_V21_REPLAY
```

## Why

The uploaded V21 final audit shows all major technical gates passing, including backend PHPStan/PHPUnit and full Chromium Playwright. However, the audit explicitly withheld the unlock token because it ran on `codex/v21-backend-gate-repair-20260429`, not on clean current `main`.

Stage F requires this exact token:

```text
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```

The uploaded audit returned:

```text
PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
```

Therefore, Stage F remains locked.

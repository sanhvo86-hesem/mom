# 06 V11 Wave, Phase and Work-Package Factory

## Work-package minimum input

Every detailed work package must reference:

- M02 root/domain/value-stream/spine/wave row
- M03 workflow/API/frontend trace row
- M04 evidence/e-sign/validation/standards row
- M05 gap backlog status
- Owner and acceptance gate
- Stop-rule and rollback/restriction path

## Factory sequence

1. Select root/domain/value-stream slice from M02.
2. Confirm current repo state through V21/repo verification.
3. Resolve M03 orphan ledger rows for the selected slice.
4. Resolve M04 owner/gate/evidence gaps for the selected slice.
5. Create phase-detailing packet with scope, commands, endpoint prose, screen contract, evidence, audit, telemetry, fallback, tests and rollback plan.
6. Only then consider implementation prompt creation.

# Decision Tokens

A prompt may unlock the next prompt only with one of these token suffixes:

- `PASS_READY_FOR_NEXT`: no P0/P1 issues; P2/P3 either absent or not relevant.
- `PASS_WITH_CONTROLLED_GAPS`: no P0/P1 issues; P2/P3 gaps logged with owner and acceptance criteria.

A prompt must not unlock the next prompt with:

- `REPAIR_REQUIRED`: defects found and repair loop must run.
- `BLOCKED_ENVIRONMENT`: environment prevents verification.
- `BLOCKED_AUTHORITY`: authority contradiction or unsafe mutation risk remains.
- `BLOCKED_SECURITY`: security, SoD, e-sign, privacy, or OT boundary risk remains.
- `BLOCKED_ROLLBACK`: migration or release has no verified rollback.

Every token must be appended to `MDA_V2_DECISION_LOG.md` and stored in `MDA_V2_SEQUENCE_STATE.json`.

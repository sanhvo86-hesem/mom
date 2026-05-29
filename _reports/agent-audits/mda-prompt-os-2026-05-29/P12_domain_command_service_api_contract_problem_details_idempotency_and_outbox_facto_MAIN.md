# P12 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P12-CLAIM-001 | the repo already declares a command envelope with idempotency, correlation, CSRF, audit, evidence, and outbox durability. | REPO_EVIDENCE | `docs/backend/DOMAIN_COMMAND_SPEC.md` | High | hidden CRUD may survive | use this spec as contract baseline | verified |
| P12-CLAIM-002 | an idempotency replay ledger already exists in PostgreSQL migration history. | REPO_EVIDENCE | `mom/database/migrations/097_idempotency_replay_ledger.sql` | High | replay policy may be guessed | retain `in_progress` fail-closed semantics | verified |
| P12-CLAIM-003 | workflow/status unification requires command-generated transitions rather than field patching. | REPO_EVIDENCE | `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` | High | stale aliases and direct patches survive | bind status changes to commands only | verified |
| P12-CLAIM-004 | JSON/PG cutover depends on command dual-write control, not ad hoc service behavior. | REPO_EVIDENCE | `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md` | High | cutover drift remains unbounded | tie migration modes to command framework | verified |
| P12-CLAIM-005 | NIST CSF 2.0 still supports governance, identity, and monitored recovery boundaries for command infrastructure. | CURRENT_OFFICIAL_REFERENCE | [NIST CSF](https://www.nist.gov/cyberframework) | Medium | security design may underplay governance | keep deny-by-default and monitored recovery in command spine | verified |

## Authority decisions

1. Every governed mutation from P05-P11 enters through `POST /api/v1/commands/{CommandName}` or an exact equivalent internal worker command surface.
2. Problem details follow RFC 9457 style fields plus `correlation_id`, `command`, `retryable`, and field `violations`.
3. Idempotency is part of the command contract, not a best-effort helper.
4. Outbox durability is inside the same transaction boundary as domain state, audit, and evidence references.

## Repair pass applied in P12

1. Published `MDA_COMMAND_CATALOG.csv` spanning party, item, engineering, quality, inventory, MES, and finance-adjacent commands.
2. Locked stale `in_progress` recovery behind operator-controlled reconciliation rather than silent reclaim.
3. Explicitly banned projection/frontend/generic CRUD mutation for governed state.
4. Bound command rollout to migration modes and status authority generation.

## Decision token

`P12_PASS_WITH_CONTROLLED_GAPS`

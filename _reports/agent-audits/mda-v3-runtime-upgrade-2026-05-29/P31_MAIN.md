# P31 Domain Command Factory / API / Idempotency / Outbox / Problem Details

## Source Truth Audit

P31 found that the repo already has strong primitives but not a shared command runtime surface. `IdempotencyService` provides deterministic replay and conflict detection, `domain_outbox_events` exists from the eQMS control-plane migration, and selected controllers/OpenAPI surfaces already use RFC 9457 Problem Details. The missing runtime link was a governed command envelope that every domain can reuse without letting Generic CRUD become mutation authority.

The current runtime environment still reports JSON-only/compatibility behavior in authority probes, so P31 cannot claim PostgreSQL command audit writes are live. The correct repair is an additive command spine with explicit controlled gaps, not a false production-ready claim.

## Runtime Evidence Probe

| Probe | Result |
|---|---|
| Existing idempotency service | Present, supports file/cache/PostgreSQL repositories, fingerprint conflict, and in-progress conflict. |
| Existing outbox primitive | Present as `domain_outbox_events`, but command-to-outbox link was absent. |
| Router pattern | REST route params are copied into `$_GET`; state-changing routes already pass through session auth and CSRF middleware. |
| OpenAPI ProblemDetail | Present, but generic command route and envelope schemas were absent. |
| Generic CRUD hard stop | Present from prior prompts; P31 does not weaken it. |

## Design / Implementation Delta

P31 adds `DomainCommandGatewayService`, a fail-closed `DomainCommandController`, migration 235, a first-class OpenAPI command operation, and tests. The gateway normalizes command envelopes, delegates to the existing idempotency ledger, emits RFC 9457-shaped problem details, and marks outbox publication failures as `pending_retry` without losing the command result.

The controller registers `POST /api/v1/commands/{commandName}` but intentionally returns `domain_command_handler_not_registered` until an owning domain supplies a handler. This is safer than accepting arbitrary command names and accidentally creating a generic mutation authority.

## Files To Edit / Files Forbidden

Edited files are listed in `P31_HANDOFF_PACKET.md`. UOM files and unrelated active-session files were not touched. P31 did not edit user identity SSOT writers, order release handlers, WO start/complete handlers, inventory posting code, or quality hold handlers because those are later prompt domains.

## Operational Simulation Matrix

See `P31_SIMULATION_MATRIX.csv`. The implemented scenario coverage includes:

- deterministic replay with the same idempotency key and fingerprint;
- in-progress idempotency conflict returning retryable Problem Detail;
- validation/precondition error returning RFC 9457 Problem Detail;
- outbox publisher failure preserving command result as `pending_retry`;
- OpenAPI operation absence blocking pass.

## Multi-Role Adversarial Audit

The adversarial audit concluded that P31 is a valid shared runtime spine improvement, but only a partial repair of P0 command coverage. It reduces API/idempotency/outbox/problem-contract risk and avoids unsafe generic mutation, but domain-specific handlers and live PostgreSQL command audit writes remain open.

## Gap Ledger Update

See `P31_GAP_LEDGER_UPDATE.csv`. The most important classification is:

- `GAP-P12-001` is `partially_repaired`, not closed.
- `GAP-P01-004` remains open because every governed mutation does not yet resolve to a concrete handler.
- OpenAPI command contract is partially repaired but generated parity remains P37/P40.

## Validation

Validation completed before commit:

- `php -l` passed for the new service, exception, controller, route, and test files.
- Direct PHP smoke proved deterministic replay and OpenAPI command operation presence.
- `php -r` OpenAPI surface check passed for path, operation ID, schemas, and ProblemDetail media type.
- Full final validation is recorded in the commit handoff.

## Decision Token

`P31_PASS_WITH_CONTROLLED_GAPS`

P32 is unlocked. The next prompt must attach workflow/status/approval/evidence/audit/e-sign to the command spine and must not treat the P31 route as a complete domain command catalog.

# P31 Implementation Plan

## Scope

P31 implements the shared command envelope spine only. It does not implement every business command handler because those handlers belong to domain prompts such as P32, P33, P34, and P36.

## Files To Edit

- `mom/database/migrations/235_domain_command_envelope_authority.sql`
- `mom/api/services/DomainCommandGatewayService.php`
- `mom/api/services/DomainCommandProblemException.php`
- `mom/api/controllers/DomainCommandController.php`
- `mom/api/routes/rest-routes.php`
- `mom/api/openapi.yaml`
- `mom/tests/Unit/Services/DomainCommandGatewayServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- P31 report and handoff files in `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

## Files Forbidden

- UOM runtime files being modified by other active AI sessions.
- User identity SSOT files unless an allowlisted identity writer owns the change.
- Generic CRUD internals except where a command hard stop is already established.
- Order, WO, inventory, and quality business transition handlers, because they are owned by later prompts.

## Repair Plan

1. Add a physical command audit/outbox link migration that extends, rather than duplicates, the existing idempotency and outbox primitives.
2. Add `DomainCommandGatewayService` to normalize command envelopes, delegate idempotency replay, emit RFC 9457 Problem Details, and preserve command results when outbox publication fails.
3. Add `DomainCommandController` as a fail-closed route so `/api/v1/commands/{commandName}` exists but cannot mutate business state without a registered domain handler.
4. Add OpenAPI `mdaDomainCommandExecute` with required `Idempotency-Key`, `X-Correlation-Id`, session cookie, CSRF, command envelope, result envelope, and ProblemDetail responses.
5. Add unit/direct-smoke coverage for deterministic replay, in-progress conflict, validation problem detail, outbox pending retry, and OpenAPI absence blocking.
6. Update the runtime proof matrix without overstating maturity. P31 improves the integration/event command spine but leaves domain-specific handlers and PostgreSQL live writes as controlled gaps.

## Stop Rules Applied

- No P0/P1 authority risk was hidden as closed.
- Generic CRUD remains non-authoritative for governed mutations.
- JSON_ONLY runtime remains a controlled gap, not a production-ready claim.
- P31 passes only as a shared command gateway slice.

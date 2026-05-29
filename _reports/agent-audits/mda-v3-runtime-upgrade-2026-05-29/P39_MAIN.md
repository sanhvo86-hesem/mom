# P39 - Security, RBAC, SoD, Privacy, AI Action Firewall and OT Boundary

## Executive Verdict

Decision token: `P39_PASS_WITH_CONTROLLED_GAPS`.

P39 now has additive PostgreSQL authority anchors, governed registry coverage, Generic CRUD mutation hard-stop, a side-effect-free runtime security evaluator and executable tests for the required scenarios. It is not runtime-complete because the evaluator is not yet wired into every governed command and security decisions are not persisted to telemetry/browser evidence.

## Runtime Evidence Probe

- `MdaRuntimeSecurityBoundaryService::authorityProbe()` reports policy, redaction, SoD exception, AI firewall, OT signal trust and decision evidence authorities.
- Direct smoke returned:
  - `SIM-P39-001`: `bola_scope_violation_blocked`
  - `SIM-P39-002`: `ai_governed_action_refused`
  - `SIM-P39-003`: `privileged_reauth_required`
  - `SIM-P39-004`: `sod_exception_expired`
  - `SIM-P39-005`: `ot_signal_tag_map_not_approved`
  - field redaction: `field_redaction_applied`
- Local runtime authority audit still reports `JSON_ONLY`, `database_configured=false`, `postgres_reachable=false`.

## Code Delta

- Created migration `242_mda_security_boundary_authority.sql` for security policy, redaction policy, SoD exceptions, AI firewall events, OT signal trust and security boundary decisions.
- Created `MdaRuntimeSecurityBoundaryService.php` with deterministic evidence-hashed decisions.
- Created `MdaRuntimeSecurityBoundaryServiceTest.php` for the required P39 simulations.
- Added P39 tables to Generic CRUD hard-stop and governed entity registry.
- Updated proof matrix, maturity scorecard, blocker register and denylist matrix.

## Validation Evidence

- `php -l mom/api/services/MdaRuntimeSecurityBoundaryService.php`: pass.
- `php -l mom/tests/Unit/Services/MdaRuntimeSecurityBoundaryServiceTest.php`: pass.
- `php -r` JSON decode for `governed-entities.json`: pass.
- `php -l mom/api/services/*.php 2>/dev/null || true`: pass for listed service files.
- `php -l mom/api/controllers/*.php 2>/dev/null || true`: pass for listed controller files.
- `composer test -- --filter Security, || true`: root Composer has no `test` command.
- `composer --working-dir=mom test -- --filter MdaRuntimeSecurityBoundaryServiceTest || true`: blocked by missing `vendor/bin/phpunit`.
- `php mom/tools/audit_runtime_authority_consistency.php || true`: completes, reports local `JSON_ONLY`.
- `php mom/tools/release/check_migration_drift.php || true`: 0 P1, existing 3 P2 prefix collisions.
- `php mom/tools/release/check_user_identity_ssot.php || true`: clean.
- `npm test -- --runInBand 2>/dev/null || true`: no output.

## Gap Ledger

Registered P39 gaps:

- `GAP-P39-001`: command gateway integration pending.
- `GAP-P39-002`: security/OT denial telemetry and browser evidence pending.
- `GAP-P39-003`: SoD exception command lifecycle pending.
- `GAP-P39-004`: redaction policy wiring into projections/controllers pending.

## Handoff

P40 may proceed, but must treat P39 as a service-level security boundary proof, not as full runtime enforcement. The next repair should wire the evaluator into governed command preflight, persist decisions, and expose security/OT denial telemetry before any final readiness claim.

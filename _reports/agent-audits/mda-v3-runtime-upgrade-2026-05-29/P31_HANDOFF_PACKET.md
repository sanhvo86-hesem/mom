prompt_id: P31
decision_token: P31_PASS_WITH_CONTROLLED_GAPS
repo_commit: pending
branch: codex/mda-v3-runtime-upgrade-20260529
implementation_mode: runtime-repair-additive

files_created:
- `mom/database/migrations/235_domain_command_envelope_authority.sql`
- `mom/api/services/DomainCommandGatewayService.php`
- `mom/api/services/DomainCommandProblemException.php`
- `mom/api/controllers/DomainCommandController.php`
- `mom/tests/Unit/Services/DomainCommandGatewayServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_SOURCE_TRUTH_AUDIT.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_IMPLEMENTATION_PLAN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_SIMULATION_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_ADVERSARIAL_AUDIT.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_MAIN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P31_HANDOFF_PACKET.md`

files_modified:
- `mom/api/routes/rest-routes.php`
- `mom/api/openapi.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

files_deleted:
- none

tests_run:
- `php -l` on new service/controller/test/route files
- direct PHP smoke for deterministic idempotency replay and OpenAPI command operation presence
- `php -r` OpenAPI command surface check
- required prompt validation commands after final patch

tests_failed_or_skipped:
- Full Composer/PHPUnit may remain blocked by missing local vendor/test runner, consistent with prior prompts.
- PostgreSQL live command audit writes were not tested because current runtime probe reports JSON_ONLY / PG not reachable.

open_p0_blockers:
- `GAP-P01-004`: every governed mutation does not yet resolve to a concrete registered command handler.
- `GAP-P12-001`: command runtime coverage is only partially repaired by the shared gateway.

open_p1_blockers:
- Domain-specific handlers for party merge, item/revision release, engineering release, quality hold, readiness, and inventory remain open.
- Generated OpenAPI/Arazzo parity, live PG command audit writes, idempotency recovery UI/telemetry, and e-sign/SoD are still open.

controlled_p2_gaps:
- None added by P31. Existing P2 migration drift prefix collisions remain unrelated.

runtime_proof_matrix_updates:
- `ROOT-INT-001` moved to maturity 4 `command_gateway_partial`.
- Party, item, revision, and engineering rows now reference P31 shared gateway evidence while keeping domain handler gaps open.

scenario_coverage_updates:
- Added P31 simulations for deterministic replay, in-progress conflict, validation problem detail, outbox failure recovery, and OpenAPI absence blocking.

rollback_notes:
- Migration 235 rollback drops `domain_command_outbox_link`, `domain_command_audit`, and `domain_command_problem_type`.
- Route/controller rollback removes `/api/v1/commands/{commandName}` but must not reopen Generic CRUD mutation for governed roots.

next_prompt_unlock_condition:
- P32 is unlocked because a common command envelope/problem/idempotency route now exists.
- P32 must attach workflow/status/approval/evidence/audit/e-sign to command execution without treating the P31 fail-closed route as a finished business command catalog.

notes_for_next_agent:
- Keep `DomainCommandController` fail-closed unless a domain-owned handler registry is added.
- Do not claim P0 command coverage closed until real handlers write via PostgreSQL transaction, command audit/evidence, outbox, and regulated e-sign where required.

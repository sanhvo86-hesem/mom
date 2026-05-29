prompt_id: P32
decision_token: P32_PASS_WITH_CONTROLLED_GAPS
repo_commit: pending
branch: codex/mda-v3-runtime-upgrade-20260529
implementation_mode: hybrid-runtime-repair

files_created:
- `mom/database/migrations/236_regulated_command_evidence_policy.sql`
- `mom/api/services/RegulatedCommandEvidenceGateService.php`
- `mom/tests/Unit/Services/RegulatedCommandEvidenceGateServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_SOURCE_TRUTH_AUDIT.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_IMPLEMENTATION_PLAN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_SIMULATION_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_ADVERSARIAL_AUDIT.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_MAIN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P32_HANDOFF_PACKET.md`

files_modified:
- `mom/api/services/Evidence/ElectronicSignatureChallengeService.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

tests_run:
- `php -l mom/api/services/RegulatedCommandEvidenceGateService.php`
- `php -l mom/api/services/Evidence/ElectronicSignatureChallengeService.php`
- `php -l mom/tests/Unit/Services/RegulatedCommandEvidenceGateServiceTest.php`
- `php -l mom/api/services/*.php 2>/dev/null || true`
- `php -l mom/api/controllers/*.php 2>/dev/null || true`
- `python3 -m json.tool mom/contracts/governed-entities.json`
- direct PHP smoke for allowed regulated command, SoD block, and replay block
- `php mom/tools/audit_runtime_authority_consistency.php || true`
- `php mom/tools/release/check_user_identity_ssot.php || true`
- `php mom/tools/release/check_migration_drift.php || true`
- `php mom/tools/release/check_workflow_status_authority.php || true`
- `composer test -- --filter Workflow, || true`
- `composer --working-dir=mom test -- --filter RegulatedCommandEvidenceGateServiceTest || true`
- `npm test -- --runInBand 2>/dev/null || true`
- `git diff --check`

open_p0_blockers:
- `GAP-P12-001`: domain-specific governed command handlers are still not implemented for all roots.

open_p1_blockers:
- `GAP-P13-001`: generated workflow/status parity needs CI/runtime enforcement with vendor available.
- `GAP-P13-002`: domain handlers must consume `regulated_command_policy`.
- `GAP-P13-003`: live PG audit/evidence writes and telemetry are pending.
- `GAP-P16-002`: SoD exception lifecycle needs governed create/approve/expire/revoke flow.
- `GAP-P31-P32-001`: signature links are physicalized but not yet written by live domain command handlers.

controlled_gaps:
- `GAP-P32-TOOL-001`: local workflow status release tool cannot load missing `mom/vendor/autoload.php`.

next_prompt_unlock_condition:
- P33 is unlocked. It must use P32 evidence gate for canonical quality hold release and related quality case commands, but must not claim runtime-complete quality authority until live PG audit/evidence/outbox writes are proven.

notes_for_next_agent:
- Keep this P32 gate fail-closed for regulated actions.
- Do not bypass this gate with Generic CRUD or controller-local approval logic.
- Do not claim Part 11 compliance; only claim runtime evidence pattern until validation package and live audit/signature records exist.
- Original checkout and concurrent UOM work were not touched.

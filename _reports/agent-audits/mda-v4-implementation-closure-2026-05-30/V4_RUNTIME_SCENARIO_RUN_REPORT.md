# P58 Real Command-Stack Scenario Runner Report

## 1. EXECUTIVE DECISION

Decision token: `P58_PASS_READY_FOR_NEXT`.

P58 now has an executable scenario runner that dispatches every acceptance scenario through `DomainCommandGateway`, seeds deterministic runtime fixtures through `ScenarioSandboxConnection`, asserts mutation/no-mutation evidence from the query log, records scenario telemetry, and exports a dashboard for P60 input.

This is still pre-production runtime-readiness evidence, not production validation. The dashboard deliberately returns `NO_GO_CUTOVER_FALLBACK_READ_PRESENT` because scenario `V4-SIM-058-007` injects fallback telemetry to prove the cutover gate fails closed.

## 2. SOURCE TRUTH AUDIT

- Existing `ScenarioRegistryService` and `check_scenario_coverage.php` were static registry/coverage controls, not command-stack execution.
- Existing live authority path is `DomainCommandGateway` plus domain handlers for engineering package, MES runtime, inventory ledger, quality hold, tooling/gage, UOM, security, regulated evidence, idempotency, audit, outbox and telemetry.
- UOM is used through `UomRuntimeAuthorityService` and `UomCommandQuantityNormalizer`; no MDA UOM bridge is used.

## 3. RUNTIME EVIDENCE PROBE

- `php mom/tools/release/run_mda_runtime_scenarios.php` passed.
- Result: `14` scenarios, `14` passed, `0` failed.
- Dashboard: `mom/data/registry/mda-v4-runtime-scenario-dashboard.latest.json`.
- Decision: `P58_PASS_READY_FOR_NEXT`.
- Cutover decision: `NO_GO_CUTOVER_FALLBACK_READ_PRESENT`.

## 4. BLOCKER / GAP MAP

- Closed: static-only scenario acceptance risk.
- Closed: missing direct gateway scenario driver.
- Closed: missing DB write/no-write assertions.
- Closed: missing audit/outbox/e-sign/readiness/quality/UOM/inventory/tooling/security scenario evidence.
- Controlled gap: HTTP browser/API mode is not claimed in P58; P60 remains the browser/operator smoke and restore drill prompt.

## 5. DESIGN DELTA

Added `MOM\Api\Services\Scenario` with:

- `MdaRuntimeScenarioRunner`: orchestrates library load, integrity checks, seeding, gateway dispatch, assertions, telemetry and dashboard export.
- `ScenarioFixtureSeeder`: loads scenario fixtures into the sandbox.
- `ScenarioCommandDriver`: dispatches real envelopes through `DomainCommandGateway` and returns RFC 9457-style problem details for blocked commands.
- `ScenarioAssertionEngine`: asserts expected acceptance/problem code, SQL writes, forbidden writes, audit, outbox, evidence and idempotency replay counts.
- `ScenarioSandboxConnection`: deterministic transaction sandbox for command-stack execution without shared DB side effects.

## 6. IMPLEMENTATION PLAN

Implemented as code, then repaired after first runner pass exposed two over-strict evidence-link assertions for blocked post-signature commands. The repair changed those scenarios to require `signature_events` and audit instead of post-mutation evidence links, because blocked handlers do not reach `recordAfterMutation()`.

## 7. FILES TO EDIT

- `mom/api/services/Scenario/*.php`
- `mom/tools/release/run_mda_runtime_scenarios.php`
- `mom/tests/Unit/Services/MdaRuntimeScenarioRunnerTest.php`
- `mom/data/registry/mda-v4-runtime-scenarios.json`
- `mom/data/registry/mda-v4-runtime-scenario-dashboard.latest.json`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_RUNTIME_SCENARIO_RUN_REPORT.md`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_RUNTIME_SCENARIO_PROOF_PACK.json`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_P58_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_PROMPT_HANDOFF_P58.md`

## 8. FILES FORBIDDEN OR HIGH-RISK

- No edits to UOM branch work outside this isolated branch.
- No edits to legacy UOM bridge; the bridge file remains deleted from the prior UOM consolidation.
- No Generic CRUD mutation paths were added.
- No production DB connection was used by P58 runner.

## 9. CODE / SCHEMA / CONTRACT CHANGES

No schema migration was required for P58. The change is runtime/service/test/registry evidence:

- Scenario runner uses direct gateway mode, not static registry-only mode.
- Scenario library forbids `mock_only`.
- Scenario telemetry is isolated under `data/runtime/p58-scenario-telemetry` so stale failed probe logs do not pollute the P58 dashboard.
- Dashboard remains exported to the canonical registry path for P60.

## 10. TEST PLAN

Executed:

- `php -l` for all new scenario services.
- `php -l mom/tools/release/run_mda_runtime_scenarios.php`.
- `php -l mom/tests/Unit/Services/MdaRuntimeScenarioRunnerTest.php`.
- JSON parse for `mom/data/registry/mda-v4-runtime-scenarios.json`.
- `php mom/tools/release/run_mda_runtime_scenarios.php`.
- `php tools/scripts/ai-index/generate.php --verbose`.

Blocked by missing local vendor tools:

- `composer --working-dir=mom run test`: `Could not open input file: vendor/bin/phpunit`.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: `Could not open input file: vendor/bin/phpstan`.
- `composer --working-dir=mom run check`: blocked at `@analyse` because `vendor/bin/phpstan` is missing.

## 11. OPERATIONAL SIMULATION MATRIX

| Scenario | Command path | Expected gate | Evidence |
|---|---|---|---|
| V4-SIM-058-001 | `StartJobCommand` | `resource_readiness_blocked` | readiness snapshot + audit; no `mes_job_execution` |
| V4-SIM-058-002 | `RecordInspectionResultCommand` | accepted OQC fail | quality result + hold + NCR + outbox + audit + evidence |
| V4-SIM-058-003 | duplicate `IssueMaterialToWorkOrderCommand` | idempotent replay | one inventory ledger, replay count 1 |
| V4-SIM-058-004 | AI `ReleaseEngineeringReleasePackageCommand` | `ai_governed_action_forbidden` | security audit; no package update |
| V4-SIM-058-005 | `ReleaseQualityHoldCommand` missing meaning | `signature_meaning_required` | regulated block audit; no hold release |
| V4-SIM-058-006 | `ReleaseWorkOrderCommand` | accepted | engineering package snapshot hash + work order update + evidence |
| V4-SIM-058-007 | `ReceiveInventoryCommand` + fallback metric | accepted + cutover no-go | ledger/outbox plus fallback alert |
| V4-SIM-058-008 | invalid envelope | `command_name_required` | problem details before mutation |
| V4-SIM-058-009 | material issue missing UOM policy | `uom_authority_resolution_failed` | no inventory ledger |
| V4-SIM-058-010 | inventory move with active hold | `quality_hold_active` | readiness hold + audit; no ledger |
| V4-SIM-058-011 | valid receipt | accepted | ledger + genealogy + outbox; no balance mutation |
| V4-SIM-058-012 | blocked tool load | `tooling_runtime_blocked` | readiness evidence + audit; no tool life event |
| V4-SIM-058-013 | expired gage inspection | `gage_runtime_blocked` | signature event + readiness evidence + audit; no quality result |
| V4-SIM-058-014 | closed-period ledger post | `inventory_period_closed` | signature event + audit; no inventory ledger |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

- Architecture reviewer: runner does not create a second authority because all business decisions still flow through `DomainCommandGateway` and domain handlers.
- Quality reviewer: OQC fail and active hold scenarios prove canonical EQMS chain and no-mutation-on-block behavior.
- MES reviewer: readiness and tooling/gage failures block before MES execution writes.
- Inventory reviewer: ledger-only scenarios assert no `inventory_balance` mutation.
- Security reviewer: AI actor and missing e-sign meaning are blocked before governed mutation.
- SRE reviewer: telemetry and dashboard produce P60 scorecard input and fail cutover when fallback reads are present.

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

Rollback is file-level safe:

1. Remove `mom/api/services/Scenario/`.
2. Remove `mom/tools/release/run_mda_runtime_scenarios.php`.
3. Remove `mom/tests/Unit/Services/MdaRuntimeScenarioRunnerTest.php`.
4. Remove P58 registry/dashboard/report artifacts.
5. Re-run `php tools/scripts/ai-index/generate.php --verbose`.

No production data migration or destructive data operation is involved.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

The runner records:

- `hesem.mda.scenario.result.total`
- `hesem.mda.scenario.failure.total`
- `hesem.mda.command.outcome.total`
- problem-code mapped blocker metrics
- injected fallback metric for cutover no-go proof

Current P58 dashboard telemetry has `scenario_failure_count=0`, `fallback_read_total=1`, and active alert `fallback_read_total`.

## 15. GENERATED ARTIFACTS

- `mom/data/registry/mda-v4-runtime-scenarios.json`
- `mom/data/registry/mda-v4-runtime-scenario-dashboard.latest.json`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_RUNTIME_SCENARIO_PROOF_PACK.json`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_P58_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_PROMPT_HANDOFF_P58.md`

## 16. GAP LEDGER UPDATE

See `V4_P58_GAP_LEDGER_UPDATE.csv`.

## 17. DECISION TOKEN

`P58_PASS_READY_FOR_NEXT`

## 18. HANDOFF PACKET FOR NEXT PROMPT

Next prompt: P59 cutover rehearsal, restore drill, browser/operator smoke, rollback proof.

P59 should consume `mom/data/registry/mda-v4-runtime-scenario-dashboard.latest.json`. It must treat `NO_GO_CUTOVER_FALLBACK_READ_PRESENT` as a cutover rehearsal blocker until fallback telemetry is zero in a clean run.

P58_PASS_READY_FOR_NEXT

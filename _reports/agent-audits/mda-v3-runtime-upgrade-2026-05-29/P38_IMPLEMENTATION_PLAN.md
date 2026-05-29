# P38 Implementation Plan

## Domain

P38 affects `integration_resilience`, `qa_automation`, `platform_backend`, `sre_frontend`, and every governed domain represented by the MDA scenario library. The implemented slice is a non-mutating scenario acceptance runner.

## Files Created

- `mom/contracts/schemas/mda-sim-schema.json`
- `mom/api/services/MdaExecutableScenarioRunnerService.php`
- `mom/tools/run_mda_executable_scenarios.php`
- `mom/tests/Unit/Services/MdaExecutableScenarioRunnerServiceTest.php`
- P38 report artifacts in `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

Placement was checked against `.ai/CONVENTIONS.md`: schema under `mom/contracts/schemas/`, service under `mom/api/services/`, CLI tool under `mom/tools/`, tests under `mom/tests/`, reports under `_reports/`.

## Files Modified

- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_P0_P1_BLOCKER_REGISTER.csv`

## Runtime Delta

- Added executable DSL schema for MDA scenarios.
- Added CSV fixture loader for `MDA_SIMULATION_MASTER_LIBRARY.csv`.
- Added static contract command driver that validates scenario mapping without mutating governed records.
- Added assertion engine for declared count, minimum count, root/command/gate/evidence mapping, P0/P1 blocker failures and `mock_only` final-acceptance prohibition.
- Added dashboard/evidence exporter with SHA-256 hash.
- Added CLI runner for local/CI smoke execution.

## Deliberate Boundary

P38 does not execute real domain commands. This is intentional because many domain handlers are still P31/P32/P34/P36 controlled gaps. Final runtime acceptance remains blocked until the `runtime_command` driver can execute against the transaction/audit/evidence/outbox stack.

## Regression Surface

- CSV parsing must remain stable for the 200-row master library.
- Dashboard must not substitute placeholder live telemetry for actual fallback/drift/outbox/audit metrics.
- Final acceptance must block `mock_only` scenarios.
- Any scenario with P0/P1 failure must block acceptance.

## Tests

- PHP syntax for new service, CLI and test.
- Direct PHP smoke for all required P38 scenarios.
- CLI execution of 200 scenarios.
- Required prompt commands.
- CSV/JSON validation for P38 artifacts and proof matrices.

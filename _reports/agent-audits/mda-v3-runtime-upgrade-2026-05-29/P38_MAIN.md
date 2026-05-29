# P38 Main Report - Executable Scenario DSL Runner and Acceptance Dashboard

## 1. Executive Verdict

Decision token: `P38_PASS_WITH_CONTROLLED_GAPS`.

P38 created an executable static-contract scenario runner for the 200-row MDA simulation library. It provides DSL schema, CSV fixture loading, command-driver classification, assertion engine, evidence hash and dashboard payload. It intentionally does not claim final runtime acceptance because the `runtime_command` driver, browser dashboard, live telemetry and persisted regulated evidence remain future work.

## 2. Source Truth Audit

See `P38_SOURCE_TRUTH_AUDIT.csv`.

Key source findings:

- `MDA_SIMULATION_MASTER_LIBRARY.csv` contains 200 scenarios.
- `MDA_TEST_ACCEPTANCE_DASHBOARD_SPEC.md` requires scenario execution counts, failed blockers and live telemetry widgets.
- `MDA_V3_P0_P1_BLOCKER_REGISTER.csv` had P38 blockers for executable scenario DSL and dashboard evidence.
- Existing `ScenarioRegistryService` validates a different deployment/RACI scenario registry and is not an MDA scenario runner.

Discovery summary:

- `pwd`: `/Users/a10/Documents/mom-mda-v3-runtime-20260529`
- `git status --short --branch`: clean at P38 start.
- `git rev-parse --short HEAD` at P38 start: `b3f73f2cb`
- Search confirmed scenario library, P19 gaps and dashboard spec.

## 3. Runtime Evidence Probe

Implemented:

- `mom/contracts/schemas/mda-sim-schema.json`
- `MdaExecutableScenarioRunnerService`
- `mom/tools/run_mda_executable_scenarios.php`
- `MdaExecutableScenarioRunnerServiceTest`

Direct smoke:

```json
{
  "SIM-P38-001": "scenario_acceptance_dashboard_blocked",
  "SIM-P38-002_total": 200,
  "SIM-P38-002_status": "scenario_acceptance_dashboard_passed",
  "SIM-P38-003": "scenario_acceptance_dashboard_blocked",
  "SIM-P38-003_p0_failed": 1,
  "SIM-P38-004": "mock_only_final_acceptance_prohibited",
  "SIM-P38-005": "scenario_acceptance_dashboard_passed",
  "evidence_hash_ok": true
}
```

CLI smoke:

```text
passed 200 0 a3cf56073b7de1503be1e62f165d104e9eb72e454187ac98822af4b5ceb7ba97
```

## 4. Files Changed

Created:

- `mom/contracts/schemas/mda-sim-schema.json`
- `mom/api/services/MdaExecutableScenarioRunnerService.php`
- `mom/tools/run_mda_executable_scenarios.php`
- `mom/tests/Unit/Services/MdaExecutableScenarioRunnerServiceTest.php`
- P38 report artifacts in this directory.

Modified:

- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- `MDA_V3_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv`
- `MDA_V3_P0_P1_BLOCKER_REGISTER.csv`

Intentionally not changed:

- UOM artifacts and active UOM work.
- DataLayer runtime mode.
- Frontend/browser dashboard, because P39 owns UI workspace/dashboard work.
- Real domain command handlers, because P38 only proves the runner pattern.

## 5. Design and Code Delta

The runner converts CSV scenario rows into DSL records with:

- `root_code`
- `command`
- `expected_gate`
- `expected_events`
- `expected_ledgers`
- `expected_holds`
- `expected_evidence`
- `assertions`
- `severity`
- `command_driver`

The dashboard blocks on:

- declared count mismatch
- fewer than required scenarios
- P0/P1 failure
- `mock_only` final acceptance

Live telemetry fields are visible as requirements, not fabricated metrics.

## 6. Simulation Summary

See `P38_SIMULATION_MATRIX.csv`.

All five prompt-required scenarios are covered by service test specs and direct smoke. A sixth simulation captures the no-fake-telemetry dashboard rule.

## 7. Adversarial Audit Summary

See `P38_ADVERSARIAL_AUDIT.md`.

Critical repair completed before pass: PHP 8.5 `fgetcsv()` deprecation was fixed so the runner emits clean output.

## 8. Gap Ledger Update

See `P38_GAP_LEDGER_UPDATE.csv`.

P23-P1-047 and P23-P1-048 are partially repaired. P23-P1-049 remains open because critical scenarios still need real command-stack execution.

## 9. CI and Test Evidence

Executed:

- `php -l mom/api/services/MdaExecutableScenarioRunnerService.php`
- `php -l mom/tools/run_mda_executable_scenarios.php`
- `php -l mom/tests/Unit/Services/MdaExecutableScenarioRunnerServiceTest.php`
- `python3 -m json.tool mom/contracts/schemas/mda-sim-schema.json`
- Direct PHP smoke for SIM-P38-001 through SIM-P38-005.
- CLI runner over 200 scenarios.

Required prompt validation is recorded in handoff. Known environment limitations continue: root `composer test` has no script and local `mom/vendor/bin/phpunit` is unavailable.

## 10. Decision Token

`P38_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff

P39 is unlocked. It must turn the P38 dashboard payload into operator/browser-visible evidence and wire live telemetry without fabricating metrics or bypassing command authority.

# UOM Authority Closure Report - P46

Prompt: P46 - UOM Measurement Authority Integration Closure
Branch: codex/mda-v4-implementation-closure-recovery-20260530
Date: 2026-05-30
Decision token: P46_BLOCKED_RUNTIME_AUTHORITY_RISK

## 1. EXECUTIVE DECISION

NO-GO for UOM runtime closure on this branch. The repo has a substantial UOM engine and MEASVAL foundation, but P46 requires proof that governed command paths cannot bypass canonical conversion. That proof does not exist on `main`, and the UOM files needed to repair alias/lifecycle gaps are actively owned by parallel UOM branches.

## 2. SOURCE TRUTH AUDIT

Authoritative UOM implementation currently present:

| Area | Evidence | Status |
|---|---|---|
| Unit catalog and rules | migrations `215`, `217`, `224`, `226`, `231` | PARTIAL |
| Item UOM policy | migration `220`, `ItemUomPolicyService.php` | PARTIAL |
| MEASVAL evidence | migration `228`, `MeasurementValueFactory.php`, `QualityMeasurementBridge.php` | PARTIAL |
| Conversion engine | `ConversionEngine.php`, `ConversionRuleService.php`, `AffineConverter.php`, `ExactLinearConverter.php` | PARTIAL |
| Alias resolution | `UomAliasResolutionService.php` | BLOCKED |
| Command-stack integration | inventory/MES/quality/cost/tooling command paths | BLOCKED |

Active remote branches touching the P46 repair surface:

| Branch | Collision |
|---|---|
| `origin/codex/uom-production-backend-clean-20260531` | UOM services, controller, OpenAPI, registries, migrations 257-260, tests |
| `origin/codex/uom-production-claim-gate-20260530` | UOM claim/gate surface |
| `origin/codex/uom-v5-no-guess-20260530` | UOM V5 services, tests, registries, UI |

## 3. RUNTIME EVIDENCE PROBE

Commands executed:

| Probe | Result |
|---|---|
| `php -r 'echo extension_loaded("bcmath") ...'` | PASS: `bcmath yes` |
| `find mom/api/services/Uom -name '*.php' -exec php -l {} +` | PASS: no syntax errors across UOM services |
| `composer --working-dir=mom run test -- --filter Uom` | BLOCKED: `vendor/bin/phpunit` missing |
| Manual `MeasurementValueFactory` probe | PASS: deterministic SI normalization and 64-char SHA-256 hash |
| Manual `AffineConverter` probe | PASS: `98.6F_to_C=37.00`, `100C_to_F=212.00` |
| Command-stack usage search | FAIL: required governed commands do not call canonical UOM service |

## 4. BLOCKER / GAP MAP

| Blocker | Severity | Evidence | Repair |
|---|---:|---|---|
| Commands bypass canonical UOM conversion | P0 | Required command names were not found using UOM services | Wire each command to item policy, conversion, MEASVAL, audit, outbox |
| Alias ambiguity not quarantined | P0 | Main resolver uses `LIMIT 1` for active alias match | Query all candidates and quarantine conflicting canonical results |
| Lifecycle semantics inconsistent | P1 | rule resolver uses `approved`, workflow/data quality use `active` | Declare one active state or explicit compatibility mapping |
| UOM repair surface owned by active branches | P0 | remote branch diff shows UOM services/controller/tests/migrations changed | Integrate reviewed UOM branch before editing UOM files here |
| PHPUnit unavailable | P2 | `vendor/bin/phpunit` missing | Restore/install dependencies in isolated environment |

## 5. DESIGN DELTA

No code delta was applied in P46 because the only safe, honest decision is blocked. A partial code patch would either:

- touch UOM files currently modified by active UOM sessions; or
- add a second command/measurement gate without proving existing command paths use it.

The correct design delta for a future repair pass is:

1. Stabilize the UOM branch first.
2. Adopt one conversion rule lifecycle vocabulary.
3. Change alias resolution from first-match to candidate-set resolution.
4. Wire domain command handlers to `ItemUomPolicyService`, `ConversionEngine`, and `MeasurementValueFactory` before any quantity mutation.
5. Add real command-stack scenarios through P59, not static narrative simulations.

## 6. IMPLEMENTATION PLAN

| Step | Action | Owner prompt |
|---|---|---|
| 1 | Integrate reviewed UOM V5 branch or cherry-pick only alias/lifecycle fixes | Integration |
| 2 | Add DB candidate ambiguity quarantine and tests | P46 repair |
| 3 | Unify `approved`/`active` rule lifecycle semantics | P46 repair |
| 4 | Wire inventory receipt/issue/putaway commands to UOM authority | P54/P59 |
| 5 | Wire MES completion/material issue/tool preset measurements | P52/P55/P59 |
| 6 | Wire inspection/spec persistence through MEASVAL | P53/P56/P59 |
| 7 | Execute real command-stack scenario suite | P59 |

## 7. FILES TO EDIT

For this P46 pass, only report artifacts were created in `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/`.

Future repair files after UOM branch stabilization:

| File | Reason |
|---|---|
| `mom/api/services/Uom/UomAliasResolutionService.php` | ambiguity quarantine |
| `mom/api/services/Uom/ConversionRuleService.php` | lifecycle/effectivity semantics |
| `mom/api/services/Uom/UomWorkflowService.php` | lifecycle transition authority |
| inventory/MES/quality/cost command handlers | live UOM command integration |
| UOM tests under `mom/tests/Unit/Uom/` | ambiguity, lifecycle, precision, command contract tests |

## 8. FILES FORBIDDEN OR HIGH-RISK

All `mom/api/services/Uom/*`, `mom/api/controllers/UomController.php`, `mom/api/openapi.yaml`, UOM migrations `257`-`260`, and UOM tests are high-risk in this branch because active UOM branches modify them.

## 9. CODE / SCHEMA / CONTRACT CHANGES

None. This is intentional. P46 would be a runtime authority regression if it created a parallel UOM authority or overwrote the active UOM sessions.

## 10. TEST PLAN

Required before P46 can pass:

| Test | Required evidence |
|---|---|
| UOM unit tests | PHPUnit UOM suite passes in this branch |
| Alias ambiguity | Multiple active alias rows with distinct canonical codes quarantine, not resolve |
| Lifecycle | Deprecated/inactive/expired rule is blocked; effective approved/active rule resolves |
| ReceiveInventory | PO receipt 10 BOX -> 500 PCS canonical inventory quantity with MEASVAL |
| IssueMaterial | Missing item policy blocks lot-controlled issue before mutation |
| Quality | micron vs mm inspection spec normalizes with precision envelope |
| Cost | purchase UOM quantity normalizes separately from currency/price |
| Scenario runner | P59 executes command stack, not mocked narrative |

## 11. OPERATIONAL SIMULATION MATRIX

| Scenario | Expected gate | Current result | Test to add |
|---|---|---|---|
| V4-SIM-046-001 PO receipt 10 BOX -> 500 PCS | ReceiveInventory resolves item policy and conversion rule before ledger write | BLOCKED: no live command proof | command-stack receipt scenario |
| V4-SIM-046-002 supplier alias `in` conflict | deterministic scope or quarantine | BLOCKED: main resolver can first-match | alias ambiguity unit/integration test |
| V4-SIM-046-003 Celsius/Fahrenheit | affine offset, not factor-only | PASS engine probe only | API + command scenario |
| V4-SIM-046-004 length as mass | dimensional incompatibility block | PASS design only | conversion engine + command scenario |
| V4-SIM-046-005 micron vs mm inspection | canonical conversion with precision proof | PARTIAL bridge exists | EQMS command scenario |
| V4-SIM-046-006 cost rollup purchase UOM | canonical cost/unit conversion | BLOCKED | finance command scenario |
| V4-SIM-046-007 deprecated rule | block or effectivity-specific resolution | BLOCKED lifecycle mismatch | rule lifecycle test |
| V4-SIM-046-008 missing policy for lot issue | fail-closed before material issue | BLOCKED | MES material issue scenario |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

| Role | Finding |
|---|---|
| Manufacturing engineer | BOX/PCS and recipe quantities can still be raw strings outside UOM controller |
| Quality lead | QC bridge exists, but spec definition controllers can persist units outside canonical UOM |
| Finance lead | Cost quantity normalization is not proven and must not mix with currency conversion |
| Security/API reviewer | UOM API has Problem Details shape, but governed commands are not forced through it |
| SRE | Redis cache failures are mostly tolerated, but multi-node cache invalidation is not closure evidence |
| Release manager | Active UOM branches make direct repair unsafe in this branch |

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

No runtime code was changed, so rollback is limited to reverting the P46 report commit. For future code repair, rollback must include:

- revert UOM service/controller changes;
- revert or disable new migrations;
- clear Redis UOM caches;
- rerun UOM command-stack scenarios;
- verify no domain quantity mutation occurred on blocked commands.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

No live telemetry was added in P46. Required future telemetry:

- `uom.alias.quarantined.count`
- `uom.command.conversion.required.count`
- `uom.command.conversion.blocked.count`
- `uom.command.measval.persisted.count`
- `uom.rule.lifecycle.blocked.count`
- command correlation id linking domain command, MEASVAL hash, audit/evidence, and outbox event.

## 15. GENERATED ARTIFACTS

- `UOM_AUTHORITY_CLOSURE_REPORT.md`
- `UOM_COMMAND_AND_POLICY_MATRIX.csv`
- `UOM_CONVERSION_TEST_SUITE_REPORT.md`
- `UOM_RUNTIME_PROOF_PACK.json`
- `V4_P46_GAP_LEDGER_UPDATE.csv`
- `V4_PROMPT_HANDOFF_P46.md`

## 16. GAP LEDGER UPDATE

See `V4_P46_GAP_LEDGER_UPDATE.csv`.

## 17. DECISION TOKEN

P46_BLOCKED_RUNTIME_AUTHORITY_RISK

## 18. HANDOFF PACKET FOR NEXT PROMPT

Do not proceed as if UOM P0 is closed. P47 can only continue if it treats UOM as an open runtime blocker and avoids caller-provided requirement truth that depends on unresolved UOM command integration.

P46_BLOCKED_RUNTIME_AUTHORITY_RISK

# P48 Engineering Release Package Runtime Closure Report

Date: 2026-05-31  
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`  
Decision token: `P48_PASS_WITH_CONTROLLED_GAPS`

## 1. EXECUTIVE DECISION

EngineeringReleasePackage is now physicalized as a PostgreSQL-backed command authority for engineering release package lifecycle, manifest release, and SO/JO/WO binding snapshots. It is not a production validation claim; local full PHPUnit/PHPStan remains blocked by missing vendor tools.

## 2. SOURCE TRUTH AUDIT

- Prompt read: `P48_engineering_release_package_command_handler_physicalization.md`.
- P47 resolver exists and was left compatible with P48 release gating.
- Existing repo had generic CRUD guard references for `engineering_release_package`, but no physical package tables or handler implementation.
- Existing `work_orders`, `job_orders`, and `sales_order` tables were identified as release surfaces.

## 3. RUNTIME EVIDENCE PROBE

| Probe | Result |
|---|---|
| PHP lint P48 service files | PASS |
| PHP lint P48 tests | PASS |
| Migration text probe | PASS: package tables, snapshots, and SO/JO/WO triggers present |
| Missing inspection plan manual probe | PASS: blocked before release update |
| Successful release manual probe | PASS: returned `released`, 64-char manifest hash, event/audit/outbox writes |
| Job order bind manual probe | PASS: wrote frozen planning snapshot and `UPDATE job_orders` |
| `composer --working-dir=mom run test` | BLOCKED: `vendor/bin/phpunit` missing |
| `composer --working-dir=mom run analyse/check` | BLOCKED: `vendor/bin/phpstan` missing |

## 4. BLOCKER / GAP MAP

| Gap | Severity | Status |
|---|---|---|
| Package release with missing members | P0 | Closed in command invariant and tests |
| Released package mutable | P0 | Closed in command invariant and DB triggers |
| Caller-provided manifest hash trusted | P0 | Closed; command rejects caller hash and recomputes server hash |
| WO release without package snapshot | P0 | Closed by DB trigger |
| SO/JO release without package snapshot | P0 | Closed by DB triggers and bind methods |
| Existing legacy JSON order release paths | P1 | Still need P49/P55 command gateway wiring audit |
| Full CI-grade PHPUnit/PHPStan evidence | P1 | Blocked locally by missing vendor |

## 5. DESIGN DELTA

- `EngineeringReleasePackageCommandHandler` implements create, member add, submit, approve, release, supersede, withdraw, bind-to-WO, bind-to-JO, and bind-to-SO flows.
- `EngineeringPackageManifestBuilder` builds trusted manifest JSON from persisted package/member/approval rows and computes SHA-256.
- `RequiredMemberMatrix` defines required base members and conditional policy flags.
- Migration `266_engineering_release_package_runtime_closure.sql` creates package/member/approval/event/snapshot tables and release triggers.

## 6. IMPLEMENTATION PLAN

Implemented narrow runtime closure before broader P49 command gateway wiring:

1. Add authoritative package schema and immutable manifest/snapshot triggers.
2. Add handler with transaction, audit, evidence-like manifest, outbox, and idempotency-key propagation.
3. Add unit tests and migration shape tests.
4. Run local lint and manual runtime probes.
5. Regenerate `.ai` index.

## 7. FILES TO EDIT

- `mom/api/services/EngineeringReleasePackageCommandHandler.php`
- `mom/api/services/EngineeringReleasePackageException.php`
- `mom/api/services/EngineeringPackageManifestBuilder.php`
- `mom/api/services/RequiredMemberMatrix.php`
- `mom/database/migrations/266_engineering_release_package_runtime_closure.sql`
- `mom/tests/Unit/Services/EngineeringReleasePackageCommandHandlerTest.php`
- `mom/tests/Unit/Database/EngineeringReleasePackageMigrationTest.php`
- `.ai/*` regenerated index files

## 8. FILES FORBIDDEN OR HIGH-RISK

- Do not route release through Generic CRUD.
- Do not allow SO/JO/WO release by implicit latest BOM/routing/control plan/inspection plan.
- Do not let UI or caller submit `manifest_hash` as authority.
- Do not mutate released package members outside supersede/change-control flow.

## 9. CODE / SCHEMA / CONTRACT CHANGES

- New tables: `engineering_release_package`, `engineering_release_package_member`, `engineering_release_package_approval`, `engineering_release_package_event`, `work_order_engineering_package_snapshot`, `order_engineering_package_snapshot`.
- New columns: engineering package id/hash/snapshot on `work_orders`, `job_orders`, and `sales_order`.
- New trigger functions: package member immutability, released manifest immutability, SO/JO/WO release snapshot enforcement.
- New handler methods: `bindPackageToJobOrder` and `bindPackageToSalesOrder` supplement the prompt-required `bindPackageToWorkOrder` to close SO/JO stop rules.

## 10. TEST PLAN

- Unit tests cover missing inspection plan, draft control plan, CNC missing NC program, released-package member edit, caller hash rejection, bind hash mismatch, successful release, and job-order snapshot binding.
- Migration test asserts required tables, triggers, and release blockers are present.
- Full test execution is deferred to CI or dependency restore because local vendor tools are missing.

## 11. OPERATIONAL SIMULATION MATRIX

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|
| V4-SIM-048-001 | Package approved, no inspection plan | QE | Release package | RequiredMemberMatrix | none | none | transaction rollback | block `engineering_package_release_invariants_failed` | WO could release without inspection plan | unit test present |
| V4-SIM-048-002 | Package has draft control plan | QE | Release package | member status invariant | none | none | transaction rollback | block draft member | draft plan enters execution | unit test present |
| V4-SIM-048-003 | `cnc_required=true`, no NC program | ME | Release package | conditional member matrix | none | none | transaction rollback | block missing `nc_program` | wrong CNC program risk | unit test present |
| V4-SIM-048-004 | `tool_required=true`, no tool requirement | ME | Release package | conditional member matrix | none | none | transaction rollback | block missing `tool_requirement` | tool readiness bypass | unit test present |
| V4-SIM-048-005 | Package released | ME | Add member | command + DB immutable trigger | none | none | transaction rollback | block `released_engineering_package_immutable` | released package mutates silently | unit test present |
| V4-SIM-048-006 | WO no package snapshot | Planner | Release WO | DB trigger | none | none | statement rollback | block `work_order_release_requires_engineering_package_snapshot` | latest engineering join used | migration test present |
| V4-SIM-048-007 | WO bound to P1, P2 released later | Planner | Start/release WO | frozen snapshot | P1 snapshot only | bind outbox | idempotent bind key | WO remains P1 | dynamic latest P2 leaks into WO | P49 command-stack test |
| V4-SIM-048-008 | Expected hash != server hash | Planner | Bind package | hash compare | none | none | transaction rollback | block mismatch | caller binds stale package | unit test present |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

| Role | Attack | Result |
|---|---|---|
| Manufacturing engineer | Release with missing BOM/control/inspection artifacts | Blocked by matrix |
| Planner | Release WO/SO/JO without explicit package snapshot | Blocked by DB trigger |
| UI developer | Pass `manifest_hash_sha256` from frontend | Rejected before transaction |
| Integration job | Edit member after release | Blocked by handler and trigger |
| SRE | Retry bind command | Idempotency key dedupes snapshot row |
| Auditor | Ask why release was allowed | Manifest hash and package event/outbox are persisted |

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

- Disable new SO/JO/WO release triggers only as emergency break-glass, then restore from audit/outbox and package snapshots.
- Roll back migration by dropping triggers, snapshot tables, package tables, and added columns only if no release traffic has used them.
- For command failure after partial write, PostgreSQL transaction rolls back package mutation, event, audit, and outbox together.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

- Events written to `engineering_release_package_event`.
- Audit rows written to `audit_events`.
- Outbox rows written to `domain_outbox_events`.
- P58 should add dashboard metrics for blocked release counts, hash mismatch counts, and package snapshot age.

## 15. GENERATED ARTIFACTS

- `.ai` indexes regenerated after migration/service creation.
- P48 report, handoff, gap ledger, and proof pack were generated.

## 16. GAP LEDGER UPDATE

See `V4_P48_GAP_LEDGER_UPDATE.csv`.

## 17. DECISION TOKEN

P48_PASS_WITH_CONTROLLED_GAPS

## 18. HANDOFF PACKET FOR NEXT PROMPT

P49 must wire actual SO/JO/WO release command flows through these handler methods and must not let legacy JSON/order workflow paths release against latest master data. If a route cannot be wired yet, P49 must add a hard gate or DB-backed stop rather than documenting a gap.

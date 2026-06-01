# P43 Runtime Proof Matrix Recalculation

Prompt: P43 - Runtime Proof Matrix Recalculation and Maturity Gate
Generated: 2026-05-30
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Head before P43 files: `2bfe981da`
Base main at P42: `2d25f7375aa2ffe43c496596a0ef4f0b47fe4925`
Posture: pre-production runtime-readiness planning; not production-ready.

## 1. EXECUTIVE DECISION

P43 recalculated runtime maturity root-by-root and rejected report-only
evidence. No root is marked runtime-ready. No P0/P1 blocker is downgraded.

Decision: continue to P44. P44 must close the governed entity registry and
Generic CRUD hard-stop proof before any deeper command implementation.

## 2. SOURCE TRUTH AUDIT

Evidence inspected:

- P42 artifacts in `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/`.
- V4 template `V4_RUNTIME_PROOF_MATRIX_TEMPLATE.csv`.
- `mom/api/services/RuntimeAuthorityService.php`.
- `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php`.
- `mom/api/controllers/GenericCrudController.php`.
- `mom/tests/Unit/Controllers/GenericCrudControllerRuntimeSafetyTest.php`.
- `mom/api/controllers/UomController.php`.
- `mom/api/routes/uom-routes.php`.
- `mom/api/openapi.yaml` and `mom/api/openapi-eqms-worldclass.yaml`.
- `mom/contracts/command-index.json`.
- `docs/backend/DOMAIN_COMMAND_SPEC.md`.
- `docs/backend/API_FRONTEND_CONTRACT_POLICY.md`.
- `mom/api/services/ControlPlane/*Command*.php`.
- `mom/api/services/Evidence/*`.
- `mom/api/services/ScenarioRegistryService.php`.

Repo state:

- Branch: `codex/mda-v4-implementation-closure-recovery-20260530`.
- P42 commit is pushed: `2bfe981da`.
- Migration drift remains `0 P1 + 3 P2`.
- Scenario registry count from P42: 112 scenarios and 26 drills.

## 3. RUNTIME EVIDENCE PROBE

Positive evidence:

- Physical tables exist for several roots: UOM, inventory ledger, WIP ledger,
  evidence/e-sign, control plane, genealogy, status constraints.
- Generic CRUD has a code-level governed mutation deny path.
- Control-plane command services exist for limited EQMS/document/change slices.
- RuntimeAuthorityService test source explicitly classifies JSON-only slices as
  `compatibility_only` and blocks strict authority claims.
- UOM has controller/routes/services and unit tests.

Negative evidence:

- No general MDA `DomainCommandGateway` or `/api/v1/commands/{CommandName}` live
  route was found in `mom/api`.
- `mom/api/openapi.yaml` does not expose the required MDA command endpoints.
- UOM route exists but UOM paths are not present as OpenAPI paths in current
  `mom/api/openapi.yaml`.
- `ResourceReadinessService` file was not found.
- Scenario registry is static; no real command-stack scenario runner was found.
- `mom/vendor` is absent, so PHPUnit/PHPStan cannot be rerun in this worktree.

## 4. BLOCKER / GAP MAP

All P42 P0/P1 blockers remain open. P43 adds no new P0; it clarifies that
`Evidence/eSign/Audit` has maturity 5 only for limited EQMS control-plane
slices, not for MDA platform-wide closure.

## 5. DESIGN DELTA

P43 converts V4 claims into a machine-readable proof evidence JSON and two CSV
matrices. Maturity levels are conservative:

- 0 absent.
- 1 planned.
- 2 fixture/static.
- 3 portal-safe or schema-heavy prototype.
- 4 live read or partial gate.
- 5 controlled mutation in a limited slice.
- 6 pre-production validation package.
- 7 multi-site productized.

No root reached level 6 or 7.

## 6. IMPLEMENTATION PLAN

Next repair order:

1. P44: governed entity registry and triple-layer Generic CRUD hard-stop.
2. P45: PostgreSQL master-data authority and JSON bridge closure.
3. P46: UOM measurement authority integration closure.
4. P47-P49: resolver, engineering package, domain command handler factory.
5. P51-P59: evidence/e-sign, readiness, quality hold, inventory, scenarios,
   cutover/restore/browser smoke.

## 7. FILES TO EDIT

P43 created:

- `V4_RUNTIME_PROOF_MATRIX.csv`
- `V4_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv`
- `V4_RUNTIME_PROOF_EVIDENCE.json`
- `V4_OPEN_BLOCKER_REGISTER.csv`
- `V4_PROMPT_HANDOFF_P43.md`

## 8. FILES FORBIDDEN OR HIGH-RISK

No P43 edits in:

- `mom/api/services/Uom/*`
- `mom/api/controllers/UomController.php`
- `mom/database/migrations/*`
- `mom/api/index.php`
- `mom/api/openapi.yaml`
- user active checkout branch files

## 9. CODE / SCHEMA / CONTRACT CHANGES

None. P43 is report/matrix-only.

## 10. TEST PLAN

Executed or reused from P42:

- `php mom/tools/release/check_migration_drift.php`: `0 P1 + 3 P2`.
- Static root probes through `rg`, `find`, `sed`, and PHP JSON parsing.
- CSV and JSON validation will be run before commit.

Blocked:

- Composer/PHPUnit because `mom/vendor` is absent.

## 11. OPERATIONAL SIMULATION MATRIX

| scenario_id | name | initial_state | actor | command_or_action | authoritative_reads | expected_gate | expected_writes | expected_events | expected_audit_evidence | expected_problem_details_if_blocked | rollback_retry_expectation | telemetry_expectation | test_to_add | gap_if_fails |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V4-SIM-043-001 | table_no_command | Root has table but no handler | Backend dev | Mark root runtime-ready | table registry and service map | runtime proof gate | none | none | blocker row | runtime_claim_not_allowed | no mutation to roll back | matrix blocker metric | matrix unit test | false runtime claim |
| V4-SIM-043-002 | evaluator_no_persist | Service evaluates readiness only | MES lead | Start job from evaluator | resolver inputs | command handler gate | none | none | denial evidence required | command_handler_missing | retry only after handler exists | missing command span | readiness command test | shadow authority |
| V4-SIM-043-003 | command_no_outbox | Limited command lacks outbox | Platform dev | Accept command closure | command service outbox code | outbox gate | mutation blocked | none | attempted command audit | outbox_required | rollback transaction | outbox lag metric | outbox closure test | silent side effects |
| V4-SIM-043-004 | openapi_route_mismatch | OpenAPI lacks command route | API owner | Publish endpoint claim | route map and openapi | contract parity gate | none | none | contract mismatch row | openapi_route_missing | regenerate after route exists | contract drift metric | OpenAPI parity test | client guesswork |
| V4-SIM-043-005 | unit_no_scenario | Unit tests exist only | QA | Final acceptance | test list and scenario registry | real scenario gate | none | none | scenario blocker row | command_stack_scenario_required | add scenario runner | scenario pass metric | real runner smoke | mock-only acceptance |
| V4-SIM-043-006 | restore_missing | POSTGRES_ONLY claimed | SRE | Cutover claim | restore evidence pack | restore gate | none | none | restore blocker row | restore_drill_missing | run restore drill | restore duration metric | restore rehearsal test | unsafe cutover |
| V4-SIM-043-007 | telemetry_missing | Command has no spans | SRE | Runtime closure claim | telemetry service map | observability gate | none | none | telemetry gap row | telemetry_required | add spans then retry | command failure counter | telemetry assertion | blind runtime |
| V4-SIM-043-008 | pass_report_no_physical | Report says PASS | Release manager | Promote root | physical proof matrix | source truth gate | none | none | report-only rejection | physical_proof_missing | return to owner prompt | proof coverage metric | report rejection test | paper authority |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

| role | attack / objection | impact | required proof | repair recommendation | severity |
|---|---|---|---|---|---|
| ERP architect | Command docs list endpoints that are not live | ERP callers guess routes | route plus OpenAPI plus handler | P49 command gateway | P0 |
| MES/ISA-95 architect | Resource readiness is split by evaluator | StartJob may bypass 5M gate | composite resolver in command | P52 ResourceReadinessService | P0 |
| eQMS lead | Hold and e-sign are not universal | regulated release may lack evidence | canonical hold plus e-sign spine | P51 and P53 | P0 |
| Manufacturing engineer | Engineering package is partial | WO may release on stale master data | frozen release package snapshot | P48 | P0 |
| CNC/tooling engineer | Tooling and gage readiness not in matrix closure | bad tool/gage can start job | tool/gage life and OOT command proof | P55 | P0 |
| Warehouse controller | Stock balance table exists but ledger-only proof absent | inventory drift | ledger posting command and direct-write block | P54 | P0 |
| Finance controller | Cost ledger command not proven | WIP/cost postings drift | cost ledger transaction tests | P54 | P0 |
| Security/API red-team | Generic CRUD deny is not registry-wide proven | bypass via unlisted table | registry-derived deny matrix | P44 | P0 |
| SRE | No restore drill in V4 branch | unsafe cutover claim | restore rehearsal evidence | P59 | P0 |
| Data governance lead | Master data JSON primary remains | two authorities | PostgreSQL repository proof | P45 | P0 |
| Frontend/operator UX | UI can still call route absent from OpenAPI | operator sees inconsistent blocker | Problem Details contract | P56 | P1 |
| Migration/cutover lead | numbering gaps and P2 duplicate prefixes remain | migration collision risk | all-branch number reservation | P45 onward | P1 |
| AI governance lead | AI route names can suggest actions | AI may appear authoritative | AI firewall on governed commands | P50 | P0 |

Mandatory audit answers:

- Second authority risk: reports, static scenario files, JSON stores, and UI
  workspaces can become shadow authorities if accepted as proof.
- Bypass paths: Generic CRUD, legacy controllers, import/email intake, JSON
  stores, and direct admin routes remain candidates until P44/P49 prove closure.
- Caller-provided data: UOM context, readiness flags, hold state, operator
  qualification, machine/tool/material status, and e-sign meaning must be
  server-resolved.
- Duplicate/retry/failure: no root is closed until idempotency replay,
  transaction rollback, audit/evidence, outbox, deadlock retry, stale
  projection, and restore behavior are tested.
- No-mutation evidence: blocked commands need explicit denial audit and proof
  of zero authoritative writes.
- Operator message: use RFC 9457 style Problem Details with safe blocker code.
- Telemetry: command accepted/blocked/fail counters, outbox lag, audit/evidence
  failures, readiness denials, and scenario run status are required.
- Rollback: report-only rollback is commit revert; runtime rollback is deferred.

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

P43 rollback is file-only:

- Revert the P43 commit or delete the five P43 artifact files.
- No runtime schema, route, service, UI, or config was changed.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

Existing telemetry-capable services exist (`SliceObservability`,
`RuntimeAuthorityService`, outbox workers), but P43 found no root-level proof
that all governed MDA commands emit required spans/metrics/logs. P57 owns this.

## 15. GENERATED ARTIFACTS

Generated deliverables are the five P43 files listed in Section 7.

## 16. GAP LEDGER UPDATE

`V4_OPEN_BLOCKER_REGISTER.csv` is the authoritative P43 blocker register for
subsequent prompts. It keeps all P0/P1 blockers open until executable proof is
added.

## 17. DECISION TOKEN

P43_PASS_READY_FOR_NEXT

## 18. HANDOFF PACKET FOR NEXT PROMPT

Next prompt: P44 - Governed Entity Registry and Triple-layer Generic CRUD Hard
Stop.

P44 must use:

- `V4_RUNTIME_PROOF_MATRIX.csv`
- `V4_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv`
- `V4_RUNTIME_PROOF_EVIDENCE.json`
- `V4_OPEN_BLOCKER_REGISTER.csv`
- Current `GenericCrudController` and `GenericCrudControllerRuntimeSafetyTest`

P44 must not:

- assume current hard-stop covers every governed root without registry proof;
- edit UOM implementation files;
- mark Generic CRUD closure complete without HTTP/service/registry/OpenAPI
  denial evidence.

P43_PASS_READY_FOR_NEXT

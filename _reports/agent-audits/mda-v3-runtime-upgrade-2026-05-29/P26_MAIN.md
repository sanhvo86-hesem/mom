# P26 Governed Entity Registry and Generic CRUD Hard Stop

## 1. Source Truth Audit

- Prompt executed: `P26 Governed Entity Registry and Generic CRUD Hard Stop`.
- Prior handoff consumed: `P25_HANDOFF_PACKET.md`.
- Repo evidence: `GenericCrudController` already had static domain/table guard and break-glass env; `GenericCrudService` already blocked hard delete for some governed domains.
- Runtime gap found: the guard was not backed by a machine-readable governed entity registry, did not include the P25 UOM authority tables, and did not require the documented internal override header.
- User identity SSOT was read before adding identity-related table names to the registry. No user-data writes, schema changes, seed data, or role literals were introduced.

## 2. Runtime Evidence Probe

| Probe | Result |
|---|---|
| `php -l mom/api/controllers/GenericCrudController.php` | PASS |
| `php -l mom/api/services/GenericCrudService.php` | PASS |
| `php -l mom/tests/Unit/Controllers/GenericCrudControllerRuntimeSafetyTest.php` | PASS |
| Governed registry structural probe | PASS: 12 governed roots, 203 governed tables |
| Direct runtime smoke: `uom_conversion_authority` update through Generic CRUD | PASS: blocked with `domain_command_required`, root `MDA-FOUNDATION-MEASUREMENT` |
| Direct runtime smoke: break-glass without internal override header | PASS: blocked |
| Direct runtime smoke: break-glass with env, internal header, release manifest, command id | PASS: allowed |
| `composer test -- --filter GenericCrud || true` | BLOCKED: root Composer has no `test` command |
| `composer --working-dir=mom test -- --filter GenericCrud || true` | BLOCKED: `vendor/bin/phpunit` missing |
| `php mom/tools/audit_runtime_authority_consistency.php || true` | RAN: still `JSON_ONLY`, PostgreSQL inactive/unconfigured |
| `php mom/tools/release/check_user_identity_ssot.php || true` | PASS: `user identity ssot clean` |
| `php mom/tools/release/check_migration_drift.php || true` | PASS with existing P2 prefix collisions `108`, `115`, `188` |

## 3. Design / Implementation Delta

- Added `mom/contracts/governed-entities.json` as runtime-readable registry authority.
- Added `mom/contracts/governed-entities.yaml` as the human-readable mirror.
- Added `mom/contracts/governed-entity-schema.json` to define required root fields and forbidden action vocabulary.
- Patched `GenericCrudController` so registry-backed governed tables require domain command before runtime policy can allow generic mutation.
- Patched break-glass override to require `HESEM_ALLOW_GOVERNED_GENERIC_MUTATION=break_glass_for_migration_only`, `X-HESEM-Internal-Generic-Override: domain-command-backfill`, `X-HESEM-Release-Manifest`, and `X-HESEM-Command-Id`.
- Added structured server telemetry for denied and break-glass governed generic mutation attempts.
- Expanded static fallback denylist and `GenericCrudService` hard-delete governed domains so registry failure does not reduce baseline protection.
- Extended `GenericCrudControllerRuntimeSafetyTest` for registry-backed UOM, item, work order, quality hold, inventory balance, e-signature, and missing internal override header.

## 4. Files To Edit / Files Forbidden

Edited:
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/contracts/governed-entity-schema.json`
- `mom/api/controllers/GenericCrudController.php`
- `mom/api/services/GenericCrudService.php`
- `mom/tests/Unit/Controllers/GenericCrudControllerRuntimeSafetyTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_GOVERNED_COMMAND_MAP.csv`

Forbidden / untouched:
- Original checkout `/Users/a10/Documents/mom`.
- Other agents' UOM work in the original checkout.
- `mom/data/config/users.json`, user seed data, direct identity table writes, and role source files.
- Runtime JSON data stores and served docs.

## 5. Implementation Or Repair Plan

Completed in P26:
- Convert governed-root boundary from static-only guard to registry-backed guard.
- Block P25 UOM authority tables from Generic CRUD mutation.
- Preserve Generic CRUD read behavior under runtime authorization.
- Require a complete break-glass envelope for migration-only generic mutation.
- Add test coverage and direct smoke evidence.

Deferred to later prompts:
- P27 must move broader MasterData repository authority toward PostgreSQL cutover bridge.
- P30 must physicalize Engineering Release Package runtime.
- P31/P32/P33/P34/P36 must supply domain command services for roots now explicitly blocked from Generic CRUD.

## 6. Operational Simulation Matrix

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|
| P26-S01 | UOM conversion table listed in registry | admin | Generic CRUD `update uom_conversion_authority` | governed registry boundary | none | denied telemetry | safe retry via UOM command | HTTP 409 `domain_command_required` | UOM conversion can bypass P25 authority | Added unit/static smoke |
| P26-S02 | Quality hold table listed in registry | admin | Generic CRUD `delete quality_holds` | governed registry boundary | none | denied telemetry | use quality hold command | HTTP 409 | Hold release/delete bypasses quality case authority | Added unit test |
| P26-S03 | Work order table listed in registry | admin | Generic CRUD `transition work_order` | governed registry boundary | none | denied telemetry | use work order command | HTTP 409 | WO release/start bypasses readiness gates | Added unit test |
| P26-S04 | Inventory balance table listed in registry | admin | Generic CRUD `update inventory_balance_snapshot` | governed registry boundary | none | denied telemetry | use ledger command | HTTP 409 | Balance can be overwritten outside ledger | Added unit test |
| P26-S05 | Break-glass env enabled but no internal header | admin | Generic CRUD `update capa_records` | complete migration envelope | none | denied telemetry | add proper migration envelope or use command | HTTP 409 | env alone becomes silent authority bypass | Added unit/direct smoke |
| P26-S06 | Complete break-glass envelope | admin | Generic CRUD governed update | migration-only override | write proceeds to existing service path | break-glass telemetry | command id supports replay trace | allowed | migration backfill impossible without controlled route | Existing override test retained |

## 7. Multi-role Adversarial Audit

| Role | Objection | Repair / Control |
|---|---|---|
| ERP/MOM architect | A denylist alone can drift from canonical roots. | Added contract registry and schema; controller reads registry at runtime. |
| MES execution owner | Work order status must not transition through Generic CRUD. | `work_order` and `work_orders` are registry-mapped and unit-tested. |
| EQMS owner | Holds, NCR, CAPA, complaints, and signatures need command/audit spine. | Quality and workflow/e-sign roots are registry-mapped; P32/P33 remain P0 implementation prompts. |
| Security reviewer | Env-only break-glass is too weak. | Added internal override header requirement plus manifest and command id. |
| Data governance reviewer | Identity tables must not violate SSOT. | Read `.ai/USER_IDENTITY_SSOT.md`; registry only blocks generic mutation and does not write identity data. |
| SRE/observability reviewer | Denied authority attempts need evidence. | Added structured `hesem.runtime_authority` log events for denied and break-glass outcomes. |

## 8. Gap Ledger Update

| gap_id | previous_severity | p26_status | evidence | next_owner |
|---|---|---|---|---|
| P26-G01 Governed roots lack machine-readable registry | P0 | REPAIRED | `mom/contracts/governed-entities.json`, schema, YAML mirror | P27/P31 command integration |
| P26-G02 Generic CRUD can miss P25 UOM authority tables | P0 | REPAIRED | UOM tables in registry and static fallback; direct smoke blocked mutation | P27 downstream UOM integration |
| P26-G03 Runtime policy could allow generic mutation before governed boundary | P0 | REPAIRED | registry check precedes `genericMutation=allow` handling | Release validation |
| P26-G04 Break-glass override lacks internal header check | P1 | REPAIRED | controller patch and test/smoke | Release validation |
| P26-G05 Full PHPUnit execution unavailable | P2 | CONTROLLED_GAP | `vendor/bin/phpunit` missing in `mom` Composer path | Dev environment/toolchain |
| P26-G06 PostgreSQL runtime authority still inactive | P0 | OPEN | audit probe reports `JSON_ONLY`, database unconfigured/unreachable | P27/P38/P41 |

## 9. Decision Token

`P26_PASS_WITH_CONTROLLED_GAPS`

Rationale: P26 stop rules are satisfied for governed registry coverage, Generic CRUD hard stop, machine-readable registry, and deny behavior tests/smokes. Remaining P0s are downstream runtime authority work explicitly assigned to later prompts, not a reason to re-open P26.

# P30 — Engineering Release Package Physicalization

## 1. Executive Verdict

Decision token: `P30_PASS_WITH_CONTROLLED_GAPS`

P30 repaired the physical absence of EngineeringReleasePackage authority by adding package root, member hash/effectivity, approval/e-sign hook, SO/JO/WO/production-order binding, and WO frozen snapshot tables. It also added `EngineeringReleasePackageAuthorityService` and test/smoke coverage for the required P30 failure modes.

This is not runtime-complete engineering release authority. SO/JO/WO command wiring, idempotency, audit/evidence, outbox, problem details, e-sign/re-auth/SoD, generated registry refresh, and live PostgreSQL cutover remain open.

## 2. Source Truth Audit

Detailed audit: `P30_SOURCE_TRUTH_AUDIT.csv`

| Area | Repo Evidence | Verdict |
| --- | --- | --- |
| BOM/routing/work definition | `074_canonical_engineering_definition.sql` has canonical BOM and work-definition tables. | Usable package members. |
| Control plan | `042_fmea_apqp_control_plan_mobile.sql` has control plan tables. | Usable with P33 quality convergence gap. |
| Inspection plan | `078_canonical_eqms_compliance_backbone.sql` and `011_quality.sql` have inspection plan lanes. | Required release member. |
| NC program | `026_mes_world_class_foundations.sql`, `039_cnc_program_management.sql`, and `RuntimeShadowSync.php` provide checksum-bearing NC program lanes. | Checksum gate added. |
| WO release binding | `076_canonical_mes_execution_spine.sql` and `084_execution_quality_projection.sql` provide WO tables, but no single engineering package snapshot. | Snapshot table added; command wiring pending. |
| Approval dependencies | P28/P29 physicalized customer/supplier approvals and item crossrefs. | Package approval hooks added. |

Discovery command summary:

- `pwd`: `/Users/a10/Documents/mom-mda-v3-runtime-20260529`
- Branch: `codex/mda-v3-runtime-upgrade-20260529`
- `git rev-parse --short HEAD` before P30: `f90c8bed3`
- Search confirmed `engineering_release_package` existed only in registry/planning claims before P30, not as a physical package/member schema.

## 3. Runtime Evidence Probe

Added runtime artifacts:

- `mom/database/migrations/234_engineering_release_package_authority.sql`
- `mom/api/services/EngineeringReleasePackageAuthorityService.php`
- `mom/tests/Unit/Services/EngineeringReleasePackageAuthorityServiceTest.php`

`EngineeringReleasePackageAuthorityService::authorityProbe()` reports:

- package authority: `engineering_release_package`
- member authority: `engineering_release_package_member`
- approval hook authority: `engineering_release_package_approval`
- release binding authority: `engineering_release_package_binding`
- WO snapshot authority: `work_order_engineering_package_snapshot`
- Generic CRUD mutation allowed: `false`

Runtime authority audit still reports `JSON_ONLY` and PostgreSQL not configured/reachable, so no PostgreSQL-primary claim is made.

## 4. Files Changed

Created:

- `mom/database/migrations/234_engineering_release_package_authority.sql`
- `mom/api/services/EngineeringReleasePackageAuthorityService.php`
- `mom/tests/Unit/Services/EngineeringReleasePackageAuthorityServiceTest.php`
- `P30_SOURCE_TRUTH_AUDIT.csv`
- `P30_IMPLEMENTATION_PLAN.md`
- `P30_SIMULATION_MATRIX.csv`
- `P30_ADVERSARIAL_AUDIT.md`
- `P30_GAP_LEDGER_UPDATE.csv`
- `P30_HANDOFF_PACKET.md`
- `P30_MAIN.md`

Modified:

- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`

Intentionally not changed:

- UOM files.
- User identity SSOT files.
- `mom/contracts/table-registry.json`, because it is generated.
- SO/JO/WO release controllers and shopfloor readiness commands, because P31/P34 own command/runtime integration.

## 5. Design And Code Delta

Schema:

- `engineering_release_package`: package root with item revision, site, change-order link, effectivity, package hash, member manifest hash, release/supersede/withdraw metadata.
- `engineering_release_package_member`: hashed/effective members for BOM, routing/work definition, control plan, inspection plan, NC program, work instruction, tooling, customer approval, supplier approval, and other controlled members.
- `engineering_release_package_approval`: engineering/quality/customer/supplier/tooling/regulatory approval and e-sign hook surface.
- `engineering_release_package_binding`: active binding from SO/JO/WO/production order to package hash/member manifest hash.
- `work_order_engineering_package_snapshot`: frozen WO package baseline for production execution.
- Triggers block core/member/approval edits after release so changes require successor package.

Service:

- Blocks missing BOM/routing/control/inspection members.
- Blocks invalid required member hashes.
- Blocks NC checksum mismatch.
- Blocks customer-specific release without customer approval evidence.
- Blocks released package/member mutation and requires successor package.
- Builds deterministic WO snapshot package/member hashes.

Registry:

- `MDA-ENGINEERING-RELEASE` now lists P30 physical tables and commands.
- Generic CRUD fallback denylist now includes P30 package member/approval/binding/snapshot tables.

## 6. Simulation Matrix Summary

Detailed matrix: `P30_SIMULATION_MATRIX.csv`

Covered scenarios:

- missing inspection plan blocks release.
- NC checksum mismatch blocks release.
- BOM superseded after package release requires a new package, not mutation.
- WO snapshot stores package and member hashes.
- customer-specific package blocks without customer approval.
- generated registry lag cannot reopen generic mutation because fallback denylist blocks P30 tables.

## 7. Adversarial Audit Summary

Detailed audit: `P30_ADVERSARIAL_AUDIT.md`

Highest residual risks:

- P31 command factory must implement transactional package commands.
- P32 e-sign/re-auth/SoD must validate regulated package release/withdraw.
- P34 must make WO release/start consume package binding and snapshot.
- P33/P36 must consume package quality and BOM/material/cost implications.
- P37/P40 must regenerate generated artifacts and prove live PostgreSQL migration/cutover.

## 8. Gap Ledger Update

Detailed update: `P30_GAP_LEDGER_UPDATE.csv`

P30 repaired or partially repaired:

- `GAP-P03-003`: physical package root now exists.
- `GAP-P04-002`: physical package member/approval/binding/snapshot tables now exist.
- `GAP-P07-001`: physical SO/JO/WO binding and WO snapshot surfaces exist, command wiring pending.
- `GAP-P07-003`: inspection plan member is required by service release gate.
- `GAP-P07-004`: approval hooks and customer-specific approval gate exist.

Still open:

- `GAP-P07-002`: no live PostgreSQL primary/cutover proof.
- `GAP-P07-005`: e-sign/SoD/replay-safe command spine not complete.

## 9. CI And Test Evidence

Commands run:

```bash
php -l mom/api/services/EngineeringReleasePackageAuthorityService.php
php -l mom/tests/Unit/Services/EngineeringReleasePackageAuthorityServiceTest.php
php -l mom/api/controllers/GenericCrudController.php
php -l mom/api/services/*.php 2>/dev/null || true
php -l mom/api/controllers/*.php 2>/dev/null || true
python3 -m json.tool mom/contracts/governed-entities.json
php -r 'require "mom/api/services/EngineeringReleasePackageAuthorityService.php"; ...'
php mom/tools/release/check_user_identity_ssot.php || true
php mom/tools/audit_runtime_authority_consistency.php || true
php mom/tools/release/check_migration_drift.php || true
composer test -- --filter Engineering || true
composer --working-dir=mom test -- --filter EngineeringReleasePackageAuthorityServiceTest || true
npm test -- --runInBand 2>/dev/null || true
git diff --check
```

Observed:

- PHP syntax passed for new service, test, and touched controller.
- Bulk service/controller PHP lint passed.
- Governed entity JSON is valid.
- Direct PHP smoke returned `engineering_release_package_smoke_ok`.
- SSOT guard returned `user identity ssot clean`.
- Runtime authority audit still reports `JSON_ONLY`, PostgreSQL not configured/reachable.
- Migration drift check reports only existing P2 prefix collisions for `108`, `115`, and `188`; no P1/fatal issues.
- Root Composer has no `test` command.
- `composer --working-dir=mom test` cannot open `vendor/bin/phpunit`.
- `npm test -- --runInBand` produced no runnable output.
- `git diff --check` passed.

## 10. Decision Token

`P30_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff Packet

See `P30_HANDOFF_PACKET.md`.

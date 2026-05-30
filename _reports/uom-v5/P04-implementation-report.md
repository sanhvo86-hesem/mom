# P04 Implementation Report

Prompt: P04 Standard Authority Manifest & Human Approval Lock
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

## Scope

- REPO_EVIDENCE: P04 scope was limited to manifest service, forward migration, permission/audit checks, tests, AI index, and `_reports/uom-v5`.
- REPO_EVIDENCE: `.ai/USER_IDENTITY_SSOT.md` was read before editing identity/permission-sensitive code.
- REPO_EVIDENCE: No users, employees, hcm_employees, or users.json write path was added.

## File Inventory Before

- `mom/api/services/Uom/UomStandardLibraryManifestService.php`: manifest register/approve/link service; approval only checked UUID shape and did not check RBAC permission, signature meaning, active/effective manifest, rule category, or write audit.
- `mom/tests/Unit/Uom/UomStandardLibraryManifestTest.php`: covered authority catalog, duplicate, invalid transition, and non-active manifest only.
- `mom/database/migrations/224_uom_seeds.sql`: legacy seed approval uses first registered user.
- `mom/database/migrations/231_uom_v3_lifecycle_governance.sql`: V3 remediation introduced a standard manifest but still used a development/prototype bridge approver.

## File Inventory After

- `mom/api/services/Uom/UomStandardLibraryManifestService.php`
  - Added `APPROVE_PERMISSION = uom.standard_library_manifest.approve`.
  - `approveManifest()` now requires real active UUID actor from `v_user_canonical`, rejects AI/service/system-like usernames, checks canonical `roles.permissions`, requires signature meaning, and writes an `audit_events` row with before/after, actor, permission, source authority, signature meaning, and trace ID.
  - `linkRuleToManifest()` now requires a permissioned actor, active/effective manifest, standard-library-eligible rule category, non-contextual rule, and writes an audit event.
  - `listActiveManifests()` now enforces `effective_from <= CURRENT_DATE`.
- `mom/database/migrations/257_uom_v5_manifest_human_approval_lock.sql`
  - Adds permission catalog row `uom.standard_library_manifest.approve`.
  - Grants the permission data-driven to roles that already hold both `docs.approve` and `audit.export`, through `roles.permissions` JSONB.
  - Quarantines legacy bridge-activated manifest/rules to `pending_review` until real human approval is replayed through the service.
- `mom/tests/Unit/Uom/UomStandardLibraryManifestTest.php`
  - Added simulations for AI actor rejection, permission denied, signature meaning required, permissioned human approval + audit, packaging rule rejection, and expired manifest rejection.
- `.ai/*`
  - Regenerated with `php tools/scripts/ai-index/generate.php --verbose`.

## Diff Summary

- REPO_EVIDENCE: Service diff is localized to UoM manifest authority and audit behavior.
- REPO_EVIDENCE: Migration count increased to 237 in regenerated AI index.
- REPO_EVIDENCE: No UI/API route contract was changed in P04; API problem-details parity remains owned by P10.

## Commands And Results

- `php -l mom/api/services/Uom/UomStandardLibraryManifestService.php`: PASS.
- `php -l mom/tests/Unit/Uom/UomStandardLibraryManifestTest.php`: PASS.
- `composer --working-dir=mom run test -- --filter UomStandardLibraryManifest`: PASS, 11 tests, 16 assertions.
- `composer --working-dir=mom run test -- --filter 'UomStandardLibraryManifest|UomLifecycleResolution|Uom|Decimal|Conversion'`: PASS, 110 tests, 194 assertions, 1 skipped.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: PASS, 0 errors.
- `php mom/tools/release/check_user_identity_ssot.php`: PASS, `user identity ssot clean`.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS.
- `git diff --check`: PASS.
- `composer --working-dir=mom run check`: WARN, PHPStan passed, full PHPUnit failed on existing KPI assertion `148 is identical to 142` in `KpiEngineAuthorityRegistryTest.php:81`.

## Acceptance Gates

- Human permission gate: PASS.
- AI/system actor denial: PASS.
- Audit event for approve/link: PASS.
- Standard manifest active/effective check: PASS.
- Context-required/packaging rule rejection: PASS.
- Existing first-user bridge remediation: PASS_WITH_WARNINGS. New migration quarantines bridge-activated rows; legacy applied migrations remain as historical evidence.
- No posture overclaim: PASS.

## Residual Risk Ledger

- WARNING: Full `composer check` remains red because of unrelated KPI registry count drift. This was present before P04 and is not introduced by UoM manifest changes.
- WARNING: Migration 224 and 231 still contain historical first-user SQL in applied migration history; P04 adds forward remediation rather than rewriting history.
- OUT_OF_SCOPE_BLOCKER: API Problem Details mapping for these new UoM exceptions remains P10.
- OUT_OF_SCOPE_BLOCKER: UI parity for manifest approval/link rule remains P11.

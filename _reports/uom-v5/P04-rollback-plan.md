# P04 Rollback Plan

Prompt: P04
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

## Code Rollback

1. Revert the P04 commit on branch `codex/uom-v5-no-guess-20260530`.
2. Regenerate AI index with `php tools/scripts/ai-index/generate.php --verbose`.
3. Run:
   - `php -l mom/api/services/Uom/UomStandardLibraryManifestService.php`
   - `composer --working-dir=mom run test -- --filter UomStandardLibraryManifest`
   - `php mom/tools/release/check_user_identity_ssot.php`

## Migration Rollback

Migration 257 includes a rollback comment for:

- deleting `permission_catalog.permission_code = uom.standard_library_manifest.approve`.
- removing the same permission from `roles.permissions.permissions`.

Do not automatically re-activate quarantined manifests/rules during rollback. Re-activation without a real human approval would recreate the P04 defect. If a test or demo environment needs standard rules active again, approve through `UomStandardLibraryManifestService::approveManifest()` with a real permissioned human actor and then run the governed rule workflow.

## Data Safety

- REPO_EVIDENCE: P04 does not write to `users`, `employees`, `hcm_employees`, or `users.json`.
- REPO_EVIDENCE: P04 migration writes permission catalog/roles JSONB and UoM manifest/rule lifecycle only.
- INFERENCE: The safest rollback for data quarantine is manual because the prior active state was not valid approval evidence.

Rollback status: feasible with explicit manual governance for any re-activation.

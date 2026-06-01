# UOM System SSOT Deployment Audit

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Branch commit: `65806f07020800291bdad1ad570dc3d96d8ccc07`

## Result

UOM SSOT closure is committed and pushed to the branch above, but it is not deployed to the VPS production tree.

Production VPS evidence:

- VPS path: `/var/www/eqms.hesemeng.com`
- VPS branch: `main`
- VPS HEAD: `89c31d0a5ae235e9d996f08911890f5af2a4ffb7`
- VPS `QualityMeasurementAuthorityService.php`: absent
- VPS `283_uom_system_ssot_closure.sql`: absent
- VPS `QualityMeasurementBridge.php`: present because production is still on `main` and has not received the SSOT branch.

## Deploy Gate

Do not deploy this branch directly to production while V4 final red-team remains `P60_NO_GO_REPAIR_REQUIRED`.

Current non-UOM blockers:

- `postgres_restore_target_missing`
- `live_vps_chrome_smoke_missing_or_failed`
- local Composer vendor binaries missing for PHPUnit/PHPStan

## Overwrite Assessment

The pushed branch was not overwritten:

- Remote branch `codex/mda-v4-implementation-closure-recovery-20260530` resolves to `65806f07020800291bdad1ad570dc3d96d8ccc07`.
- Local worktree was clean after push.

The VPS production tree has unrelated dirty runtime/doc changes, but it does not contain the UOM SSOT files from this branch.

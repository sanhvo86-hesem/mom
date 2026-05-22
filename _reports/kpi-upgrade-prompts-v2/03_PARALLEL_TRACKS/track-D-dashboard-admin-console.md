# Track D — Dashboard, manual input, Admin Console

## Phạm vi

Được sửa:
- `KpiRegistryAdminService.php`
- `AdminController.php`
- `DashboardController.php`
- `core-routes.php`
- `00o-admin-kpi-registry.js`
- dashboard JS modules
- docs for API/console
- CI guard overlay/console checks

Không sửa:
- KpiEngine formulas except interface support
- registry taxonomy large changes without coordinator
- JD rewrite

## Nhiệm vụ

1. Harden overlay/change-control.
2. Make staged/manual/runtime badges clear.
3. Expose counter-metric status and input.
4. Manual input UX with evidence/approval.
5. Ensure ANNEX-122 §9 sync if service responsible.
6. Dashboard scorecard excludes staged.

## Output

- `_reports/kpi/kpi-dashboard-manual-input-ux-<date>.md`
- UI screenshots or browser verification notes
- API payload samples.

## Merge handoff

- changed endpoints;
- UI behavior;
- manual input workflow;
- restrictions on add/retire.

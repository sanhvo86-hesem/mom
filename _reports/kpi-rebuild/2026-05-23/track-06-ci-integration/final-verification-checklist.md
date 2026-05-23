# KPI Rebuild Track 06 - Final Verification Checklist

Date: 2026-05-23

## Static Checklist

- [x] Prompt pack read completely.
- [x] Mandatory repo workflow files read.
- [x] Clean isolated worktree created to avoid concurrent Track 1/5 edits in the main checkout.
- [x] KPI guard hardened.
- [x] Staged reward drift removed from registry.
- [x] ANNEX-122 regenerated from registry.
- [x] ANNEX-127 and deploy workflow comments updated.

## Required Commands

```bash
php -l mom/tools/release/check_kpi_integrity.php
php -l mom/api/services/KpiEngine.php
php -l mom/api/services/KpiRegistryAdminService.php
php -l mom/api/controllers/AdminController.php
node --check mom/scripts/portal/00o-admin-kpi-registry.js
node --check mom/scripts/portal/13-jd-scorecard-renderer.js
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php
php mom/tools/release/check_migration_drift.php
```

## Acceptance Criteria

- [x] Guard exits 0 on clean state.
- [x] Fake drift tests fail for P0 cases.
- [x] Fake percent min_sample drift remains P1/exit 0 by policy.
- [x] Worktree has no fake drift residue.
- [x] Remaining P1 warnings are reported honestly.

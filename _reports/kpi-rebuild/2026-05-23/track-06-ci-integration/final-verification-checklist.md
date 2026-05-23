# KPI Rebuild Track 06 - Final Verification Checklist

Date: 2026-05-23

## Static Verification

- [x] Read universal guardrails and prompt pack.
- [x] Read `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`,
  `AGENTS.md`, `CLAUDE.md`.
- [x] Inspect current branch, remote branches, status, diff, merge-base.
- [x] Confirm v3 Track 1-5 report directories are absent in this checkout.
- [x] Inspect legacy KPI stage reports under `_reports/kpi/`.
- [x] Harden `check_kpi_integrity.php`.
- [x] Keep KPI guard unconditional in deploy workflow.
- [x] Remove staged reward eligibility from staged governance KPIs.
- [x] Regenerate ANNEX-122 marker regions from registry.

## Required Commands

Run before final handoff:

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

- [ ] Guard exits 0 on clean repo state.
- [ ] Fake staged reward drift exits 1.
- [ ] Fake runtime without calculator exits 1.
- [ ] Fake unknown CDR exits 1.
- [ ] Fake duplicate governance code exits 1.
- [ ] Fake JD unknown KPI code exits 1.
- [ ] Final report records all P1 warnings honestly.
- [ ] Worktree contains no fake drift residue.

## Manual/Live Verification Later

- `GET /api.php?action=kpi_catalog`
- `GET /api.php?action=kpi_jd_scorecards`
- `GET /api.php?action=kpi_threshold_badges`
- `GET /api.php?action=kpi_get&metric_code=OTD`
- `GET /api.php?action=kpi_trend&metric_code=OTD`
- Admin Console load.
- Admin Console harmless threshold edit and revert.
- JD scorecard renders active/candidate model after Track 4 lands.
- ANNEX-122 shows staged/runtime/manual labels.
- Dashboard does not render staged metrics as active payout metrics.

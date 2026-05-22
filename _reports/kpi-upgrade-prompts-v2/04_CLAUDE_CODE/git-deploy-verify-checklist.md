# Git, deploy, verify checklist

## Before commit

```bash
git status --short
git diff --check
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php || php tools/release/check_kpi_integrity.php
```

Run `php -l` / `node --check`.

## Commit split

If repo hooks require docs split:

```bash
git add mom/api mom/scripts mom/data tools .github _reports/kpi
git commit -m "feat(kpi): <stage summary>"
git add mom/docs
ALLOW_DOC_COMMIT=1 git commit --no-verify -m "docs(kpi): <stage docs summary>"
```

Adjust paths to actual changes. Do not commit runtime private files unless intended.

## Push/CI

```bash
git push
gh run list --workflow Deploy --limit 5
gh run watch <run-id>
```

If CI fail, inspect logs and fix root cause.

## Live verify

- Portal loads.
- KPI catalog returns updated schema.
- KPI runtime endpoints work.
- Admin Console loads.
- ANNEX-122 renders.
- Dashboard badges correct.
- Audit trail for admin save.

## Evidence

Save screenshots/API snippets in `_reports/kpi/verify-<date>/` if repo convention allows. Otherwise include text evidence in final report.

## Rollback/revert

Do not `git reset --hard` on VPS. Use normal git revert or fix forward according to `CLAUDE.md`.

# Preflight & validation checklist

## Preflight mỗi session

```bash
pwd
git status --short
git branch --show-current
bash tools/ai/preflight.sh || true
```

Đọc:
- `.ai/AI-WORKFLOW.md`
- `.ai/CONVENTIONS.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.ai/repo-map.json`

## KPI file map

```bash
ls mom/data/registry/kpi-authority-registry.json
ls mom/api/services/KpiEngine.php
ls mom/api/services/KpiRegistryAdminService.php
ls mom/tools/release/check_kpi_integrity.php tools/release/check_kpi_integrity.php 2>/dev/null || true
ls mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/
```

## Audit commands

```bash
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php || php tools/release/check_kpi_integrity.php
```

## PHP/JS checks

```bash
find mom/api -name "*.php" -print0 | xargs -0 -n1 php -l
node --check mom/scripts/portal/00o-admin-kpi-registry.js
```

Nếu chạy toàn bộ `php -l` quá lâu, chỉ file đã sửa nhưng ghi rõ.

## Git diff checks

```bash
git diff --check
git diff --stat
git diff -- mom/data/registry/kpi-authority-registry.json | head -200
```

## API verify checklist

- Catalog includes schema_version and metric statuses.
- Runtime KPI returns value/breakdown.
- Empty period grey.
- Staged KPI does not fake value.
- Manual input endpoint returns/records evidence.
- Threshold badges reflect registry.

## Browser verify checklist

- Admin Console loads.
- No raw JSON editor.
- Staged/manual/runtime badges visible.
- Save requires reason.
- ANNEX-122 region updates or no-op safely.
- Audit event created.
- Dashboard scorecard excludes staged.

## Final no-go conditions

Do not call stage done if:
- any P0 guard finding remains;
- KPI runtime uses unverified table/cột;
- staged KPI counted in scorecard;
- gate G0-G7 missing pass metric;
- overlay can create official KPI without change-control;
- docs/registry/ANNEX-128 drift;
- Vietnamese rewrite changed KPI numbers.

# P02 Test Evidence

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 247b1fbeabfe8bd07feb3d2265a8c2ec0ec625a4

## Commands Run

```text
git status --short --branch && git rev-parse HEAD
Result: branch codex/uom-v5-no-guess-20260530 at 247b1fbeabfe8bd07feb3d2265a8c2ec0ec625a4.
```

```text
git ls-files 'mom/database/migrations/*uom*.sql' 'mom/api/services/Uom/*.php' 'mom/api/controllers/*Uom*.php' 'mom/api/routes/uom-routes.php' 'mom/scripts/portal/*uom*.js' 'mom/tests/Unit/Uom/*.php' 'mom/contracts/objects/uom/*' '_reports/uom-measurement-conversion-v3/*' | sort
Result: UoM contracts, migrations, services, controller, routes, UI scripts, tests, and prior V3 reports found.
```

```text
grep/rg for rule_version, lifecycle_status, approved, active, first-user, category, alias, Problem Details, trace_id, and route patterns.
Result: contradictions recorded in P02 contradiction ledger.
```

```text
rg -n "uom_|item_uom_policy|item_packaging_policy|material_density_registry" .ai/db-map/index.json .ai/contracts-map.json
Result: UoM tables exist in AI index, mostly classified unclassified.
```

## Commands To Run After Writing

```text
test -s _reports/uom-v5/P02-current-state-file-inventory.csv
Result: inventory ok.
```

```text
test -s _reports/uom-v5/P02-contradiction-ledger.md
Result: ledger ok.
```

```text
php -r 'json_decode(file_get_contents("_reports/uom-v5/P02-decision.json"), true, flags: JSON_THROW_ON_ERROR); json_decode(file_get_contents("_reports/uom-v5/00-sequential-gate-ledger.json"), true, flags: JSON_THROW_ON_ERROR); echo "json ok\n";'
Result: json ok.
```

P02 is report-only; full PHPStan/PHPUnit is deferred until P03 begins runtime repair.

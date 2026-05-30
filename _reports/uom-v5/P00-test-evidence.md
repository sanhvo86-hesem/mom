# P00 Test Evidence

Branch: codex/uom-v5-no-guess-20260530
SHA: 59fd44fec98f52e17324fb465a684ed18f3b9218

## Commands Run Before Writing

```text
git status --short --branch
Result: branch codex/uom-v5-no-guess-20260530, clean before P00 files.
```

```text
git rev-parse HEAD
Result: 59fd44fec98f52e17324fb465a684ed18f3b9218
```

```text
git merge-base HEAD origin/main
Result: 857ca8fd4cfa6ac6d262437451653a2c0522580f
```

```text
php -v || true
Result: PHP 8.5.2 CLI available.
```

```text
rg --files | rg '(uom-scope-contract|mom/api/services/Uom|UomController|uom-routes|openapi|80-uom|81-uom|mom/tests/.*/Uom|mom/database/migrations/21[4-9]|22[0-9]|23[0-1])'
Result: Required UoM source roots found.
```

## Commands To Run After Writing

```text
find _reports/uom-v5 -maxdepth 1 -type f | sort
Result: 10 P00 files present.
```

```text
php -r 'json_decode(file_get_contents("_reports/uom-v5/P00-decision.json"), true, flags: JSON_THROW_ON_ERROR); json_decode(file_get_contents("_reports/uom-v5/00-sequential-gate-ledger.json"), true, flags: JSON_THROW_ON_ERROR); echo "json ok\n";'
Result: json ok.
```

```text
git check-ignore -v _reports/uom-v5/P00-decision.json || true
Result: _reports/* ignore rule applies; commit requires git add -f for evidence artifacts.
```

## Test Classification

P00 is report-only, so full PHPStan/PHPUnit is not required by risk. Product code tests begin when a product prompt mutates PHP/SQL/JS/OpenAPI.

# UOM Runtime Test Plan

PROMPT_ID=P25
DATE=2026-05-29

## Implemented Tests

| Test | File | Status |
|---|---|---|
| Receive 10 BOX and normalize to 500 PCS | `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Added |
| Block KG to PCS without packaging policy | `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Added |
| Block two active BOX to PCS conversions for same scope/effectivity | `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Added |
| Preserve released snapshot by effectivity date | `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Added |
| Deterministic rounding for fractional issue quantity | `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Added |
| Block draft UOM on released item revision gate | `mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Added |

## Executed In P25

| Command | Result |
|---|---|
| `php -l mom/api/services/UomAuthorityService.php` | Pass |
| `php -l mom/tests/Unit/Services/UomAuthorityServiceTest.php` | Pass |
| `php -l mom/api/services/MasterDataService.php` | Pass |
| `php -l mom/database/DataLayer.php` | Pass |
| Direct PHP UOM smoke for BOX to PCS and KG to PCS block | Pass |
| Direct PHP UOM scenario smoke for ambiguity, effectivity, rounding, draft release block | Pass |
| `composer test -- --filter Uom` | Blocked because root Composer script `test` is not defined |
| `composer --working-dir=mom test -- --filter Uom` | Blocked because `mom/vendor/bin/phpunit` is missing |
| `php mom/tools/audit_runtime_authority_consistency.php` | Runs but reports `JSON_ONLY` and PostgreSQL inactive |

## Tests Still Required Later

| Owner Prompt | Required Runtime Test |
|---|---|
| P27 | Item create/release rejects draft UOM and stores base UOM. |
| P30 | BOM/routing/release package freezes conversion snapshot. |
| P31 | Command envelope includes idempotency and audit for UOM lifecycle commands. |
| P33 | Inspection sample quantities call UOM service. |
| P34 | MES start/complete uses frozen UOM snapshot. |
| P36 | Inventory ledger stores source qty/UOM and normalized qty/UOM. |
| P38 | Scenario DSL executes SIM-P25-001 through SIM-P25-006. |

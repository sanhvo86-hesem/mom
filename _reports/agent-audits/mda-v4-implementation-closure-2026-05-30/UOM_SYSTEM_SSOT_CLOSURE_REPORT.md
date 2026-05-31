# UOM System SSOT Closure Report

## Decision

UOM is now modeled as one system-wide runtime authority:

`DomainCommandGateway -> domain handler -> UomCommandQuantityNormalizer -> UomRuntimeAuthorityService -> domain_command_uom_measurement`

QC/MES measurement wrapping is also direct:

`QualityMeasurementAuthorityService -> UomRuntimeAuthorityService -> MeasurementValueFactory -> uom_measurement_thread`

## Runtime Closure

- Removed the runtime `QualityMeasurementBridge.php` file and replaced it with `QualityMeasurementAuthorityService.php`.
- Kept `MdaUomAuthorityBridge.php` absent and guarded by tests plus `check_uom_system_ssot.php`.
- Wired `CostRollupCommand`, `ShipmentPackCommand`, and `ToolPresetMeasurementCommand` into `CommandRegistry`, `RegulatedActionPolicy`, and `DomainCommandGateway`.
- Added `275_uom_system_ssot_closure.sql` so `cost_ledger`, `shipment_packages`, `tooling_presets`, and `tooling_life_measurements` can carry `uom_measurement_id`.
- Ensured idempotent cost rollup retries read back the existing `cost_ledger` row instead of returning an empty result.

## Verification

- `php mom/tools/release/check_uom_system_ssot.php`: `UOM_SYSTEM_SSOT_PASS`.
- `php mom/tools/release/run_mda_runtime_scenarios.php`: `P58_PASS_READY_FOR_NEXT`, 14/14 scenarios passed.
- PHP lint passed for changed runtime services, tests, migration, and release guard.
- `composer --working-dir=mom run test`: blocked because `vendor/bin/phpunit` is missing.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: blocked because `vendor/bin/phpstan` is missing.

## Remaining Non-UOM Blockers

- PostgreSQL restore drill target is still not configured.
- Live VPS Chrome smoke is still not configured in this local branch run.

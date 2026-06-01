# V4 Prompt Handoff - P46

Prompt: P46 - UOM Measurement Authority Integration Closure
Branch: codex/mda-v4-implementation-closure-recovery-20260530
Date: 2026-05-31
Decision token: UOM_SYSTEM_SSOT_PASS

## Supersession Notice

The earlier bridge-staging P46 handoff is superseded. The current runtime rule is:

`DomainCommandGateway -> domain handler -> UomCommandQuantityNormalizer -> UomRuntimeAuthorityService -> domain_command_uom_measurement`

No future prompt may route governed quantities through `MdaUomAuthorityBridge` or `QualityMeasurementBridge`. Both files are removed and are guarded by `mom/tools/release/check_uom_system_ssot.php`.

## Source Truth Audit

- UOM authority is the existing UOM subsystem under `mom/api/services/Uom/*`.
- Command mutation authority is the domain command handler, with UOM normalization before physical quantity mutation.
- UOM evidence is `domain_command_uom_measurement` for commands and `uom_measurement_thread` for QC/MES measurement wrapping.
- Current live command surface includes inventory movement, MES completion, inspection result, cost rollup, shipment pack, and tool preset measurement.

## Runtime Evidence Probe

| Probe | Result |
|---|---|
| `php mom/tools/release/check_uom_system_ssot.php` | `UOM_SYSTEM_SSOT_PASS` |
| `php mom/tools/release/run_mda_runtime_scenarios.php` | `P58_PASS_READY_FOR_NEXT`, 14/14 |
| Bridge files present | PASS: both forbidden bridge files are absent |
| Command policy count | PASS: 16 governed UOM commands |
| PHPUnit/PHPStan | BLOCKED: local Composer vendor binaries missing |

## Implementation Delta

- `QualityMeasurementAuthorityService` replaces the former QC/MES measurement wrapper bridge.
- `CostRollupCommand`, `ShipmentPackCommand`, and `ToolPresetMeasurementCommand` are registered, policy declared, gateway-routed, and backed by handler writes.
- Migration `283_uom_system_ssot_closure.sql` gives cost, shipment, tooling preset, and tooling life records UOM evidence columns and governed generic CRUD guard coverage.
- Cost rollup idempotent retry now reads back the existing authoritative `cost_ledger` row.

## Gap Ledger Update

Closed:

- UOM bridge ambiguity.
- Required command policy coverage.
- Cost rollup, shipment pack, and tool preset handler gaps.
- QC/MES measurement bridge dependency.

Remaining non-UOM blockers:

- PostgreSQL restore drill target is not configured.
- Live VPS Chrome smoke is not proven in this local branch run.
- PHPUnit/PHPStan execution is blocked by missing `vendor/bin/phpunit` and `vendor/bin/phpstan`.

## Next Prompt Constraint

Continue V4 runtime closure with UOM treated as system-wide SSOT. Any new governed physical quantity write must call `UomCommandQuantityNormalizer` or `UomRuntimeAuthorityService` before mutation and must write UOM evidence atomically.

UOM_SYSTEM_SSOT_PASS

# UOM Authority Closure Report - P46

Date: 2026-05-31
Branch: codex/mda-v4-implementation-closure-recovery-20260530
Decision token: UOM_SYSTEM_SSOT_PASS

## Executive Decision

UOM is closed as a single system-wide runtime authority for the current MDA command surface. The earlier MDA bridge plan is retired. Governed quantities now resolve through:

`UomCommandQuantityNormalizer -> UomRuntimeAuthorityService -> ItemUomPolicyService / UomAliasResolutionService / ConversionEngine`

Successful commands write `domain_command_uom_measurement`, audit, and outbox evidence before domain truth mutation.

## Source Truth Audit

| Area | Authority |
|---|---|
| Unit catalog and rules | `uom_unit_catalog`, `uom_conversion_rule`, UOM services |
| Alias and contextual resolution | `uom_alias`, `uom_alias_quarantine`, `UomAliasResolutionService` |
| Item UOM policy | `item_uom_policy`, `ItemUomPolicyService` |
| Command quantity evidence | `domain_command_uom_measurement` |
| QC/MES measurement thread | `uom_measurement_thread`, `QualityMeasurementAuthorityService` |
| Mutation gate | domain command handlers through `UomCommandQuantityNormalizer` |

## Runtime Evidence Probe

| Probe | Result |
|---|---|
| UOM SSOT release guard | PASS: `UOM_SYSTEM_SSOT_PASS` |
| Runtime scenarios | PASS: 14/14 P58 scenarios |
| Forbidden bridge files | PASS: absent |
| Command surface | PASS: 16 governed commands |
| Composer tests/analyse | BLOCKED: missing vendor binaries |

## Closed Blockers

- Commands can no longer depend on an MDA UOM bridge.
- Cost rollup writes `cost_ledger` with `uom_measurement_id`, quantity magnitude, and quantity UOM.
- Shipment pack writes `shipment_packages` and genealogy with UOM evidence.
- Tool preset measurement writes `tooling_presets` / `tooling_life_measurements` with UOM evidence.
- QC/MES measurement wrapping uses `QualityMeasurementAuthorityService` directly.

## Remaining Non-UOM Blockers

- Restore drill target is not configured.
- Live VPS Chrome smoke is not proven.
- Local PHPUnit/PHPStan cannot run until `mom/vendor/bin/phpunit` and `mom/vendor/bin/phpstan` are restored.

## Handoff

Future command handlers must treat UOM as mandatory SSOT. Caller-provided `uom`, `unit_of_measure`, quantity kind, conversion rule, or target unit is only input to UOM authority resolution; it is never authoritative by itself.

UOM_SYSTEM_SSOT_PASS

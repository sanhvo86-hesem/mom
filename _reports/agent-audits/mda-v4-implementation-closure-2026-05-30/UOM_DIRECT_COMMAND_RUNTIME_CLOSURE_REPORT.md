# UOM Direct Command Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Posture: pre-production runtime-readiness evidence; not production-ready

## Executive Decision

Implemented command-stack UOM runtime authority directly, not through `MdaUomAuthorityBridge`.

All governed UOM command paths now call:

`UomCommandQuantityNormalizer -> UomRuntimeAuthorityService -> ItemUomPolicyService -> UomAliasResolutionService -> ConversionEngine`

before MES/quality mutation. The normalizer records immutable `domain_command_uom_measurement`, audit, and outbox evidence in the same command transaction.

## Source Truth Audit

- Existing UOM authority remains in `mom/api/services/Uom/*`.
- `MdaUomAuthorityBridge` has been removed from runtime source and tests; new runtime command paths must call `UomRuntimeAuthorityService` directly through `UomCommandQuantityNormalizer`.
- New command transaction evidence table is `domain_command_uom_measurement`.
- Live DomainCommandGateway handlers now include inventory movement, MES completion, inspection result, cost rollup, shipment pack, and tool preset measurement paths.

## Runtime Evidence Probe

Manual probe:

```json
{"ok":{"converted":"500.000000","target_unit":"PCS","measurement_id":"uom-measurement-1","mes_writes":1},"blocked":["uom_authority_resolution_failed","UOM_POLICY_NOT_FOUND",0]}
```

Interpretation:

- `10 BOX` converts to `500 PCS` before command mutation.
- Missing item UOM policy fails closed with `uom_authority_resolution_failed`.
- Blocked command performed zero domain writes.

## Implementation Delta

- Added `mom/database/migrations/269_uom_domain_command_runtime_authority.sql`.
- Added `mom/api/services/DomainCommand/UomCommandQuantityNormalizer.php`.
- Updated `mom/api/services/DomainCommand/MesRuntimeCommandHandler.php`.
- Updated `mom/api/services/DomainCommand/InventoryCommandHandler.php`.
- Updated `mom/api/services/DomainCommand/ToolingCommandHandler.php`.
- Updated `mom/api/services/DomainCommand/DomainCommandGateway.php`.
- Added `mom/database/migrations/274_uom_direct_authority_system_registry.sql`.
- Added `mom/data/registry/mda-uom-direct-authority-system.json`.
- Added `RuntimeAuthorityService.slices.uom_runtime_authority`.
- Removed `mom/api/services/MdaUomAuthorityBridge.php` and `mom/tests/Unit/Services/MdaUomAuthorityBridgeTest.php`.
- Added `mom/tests/Unit/Services/DomainCommandUomRuntimeAuthorityTest.php`.
- Updated UOM command matrix and P46 gap ledger away from bridge wording.

## Gap Ledger

Closed:

- `P46-BLOCK-CMD-003`: issue material now direct UOM-normalized.
- `P46-BLOCK-CMD-004`: complete operation now direct UOM-normalized for good/scrap quantities.
- `P46-BLOCK-CMD-005`: record inspection result now carries direct UOM MEASVAL evidence.
- `P46-BLOCK-CMD-006`: cost rollup now writes `cost_ledger` with UOM evidence.
- `P46-BLOCK-CMD-007`: shipment pack now writes `shipment_packages` and genealogy with UOM evidence.
- `P46-BLOCK-CMD-008`: tool preset measurement now writes `tooling_presets` / `tooling_life_measurements` with UOM evidence.

Controlled gaps:

- Full PHPUnit/PHPStan execution remains blocked in this local worktree because Composer vendor binaries are missing.
- Non-UOM V4 closure still requires restore-drill target and live VPS Chrome smoke evidence.

## Decision Token

UOM_SYSTEM_SSOT_PASS

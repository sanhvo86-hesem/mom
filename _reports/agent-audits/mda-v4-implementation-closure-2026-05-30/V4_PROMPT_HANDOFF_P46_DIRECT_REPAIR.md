# V4 Prompt Handoff - P46 Direct Repair

Prompt: P46 - UOM Measurement Authority Integration Closure
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Date: 2026-05-31
Decision token: `UOM_SYSTEM_SSOT_PASS`

## What Changed

- Replaced command-stack bridge dependency with `UomCommandQuantityNormalizer`.
- Domain command handlers now normalize inventory, MES, quality, cost, shipment, and tooling measurement quantities directly through `UomRuntimeAuthorityService`.
- Added immutable `domain_command_uom_measurement` evidence table.
- Added command-stack UOM unit tests, SSOT release guard, and runtime scenario evidence.

## Runtime Proof

- `10 BOX` governed quantity becomes `500 PCS` before domain write.
- Missing item UOM policy returns `uom_authority_resolution_failed`.
- Missing policy path performs zero domain writes.
- UOM MEASVAL hash is carried into inspection event payload.

## Next Prompt Constraint

New governed quantity handlers must inject or instantiate `UomCommandQuantityNormalizer` inside the domain command transaction before mutation.

## Remaining Non-UOM Gaps

- Restore drill target is not configured.
- Live VPS Chrome smoke is not proven.
- PHPUnit/PHPStan remain blocked by missing local Composer vendor binaries.

UOM_SYSTEM_SSOT_PASS

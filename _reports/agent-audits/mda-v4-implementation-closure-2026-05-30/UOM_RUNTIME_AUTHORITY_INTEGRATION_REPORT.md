# UOM Runtime Authority Integration Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Decision token: UOM_SYSTEM_SSOT_PASS

## Source Truth Audit

- The existing UOM subsystem remains the only UOM authority.
- MDA command paths depend directly on `UomRuntimeAuthorityService` through `UomCommandQuantityNormalizer`.
- QC/MES measurement wrapping depends directly on `QualityMeasurementAuthorityService`.
- Forbidden bridge classes are removed from runtime source.

## Implementation Delta

- Added `mom/api/services/Uom/UomRuntimeAuthorityService.php` as the first-class runtime authority for governed command quantities.
- Added `mom/api/services/DomainCommand/UomCommandQuantityNormalizer.php` and `mom/database/migrations/277_uom_domain_command_runtime_authority.sql`.
- Wired MES, quality, inventory, cost, shipment, and tooling handlers to normalize UOM before mutation.
- Added `mom/api/services/Uom/QualityMeasurementAuthorityService.php` for direct QC/MES MEASVAL wrapping.
- Added migration `283_uom_system_ssot_closure.sql` for system-wide UOM evidence columns and governed registry coverage.
- Added `mom/tools/release/check_uom_system_ssot.php`.

## Runtime Gate Semantics

| Command group | UOM authority path | Gate behavior |
|---|---|---|
| Inventory movement | `UomCommandQuantityNormalizer -> UomRuntimeAuthorityService` | normalize or block before ledger write |
| MES completion/material issue | same | normalize or block before MES/WIP mutation |
| Inspection result | same | normalize or block before quality result write |
| Cost rollup | same | normalize physical quantity only; currency remains finance authority |
| Shipment pack | same | normalize or block before package/genealogy write |
| Tool preset measurement | same | normalize or block before tooling measurement write |

## Adversarial Audit

| Risk | Finding |
|---|---|
| MDA creates second UOM authority | CLOSED |
| Command path bypasses canonical UOM | CLOSED for current command surface |
| QC/MES measurement wrapper bypasses UOM | CLOSED |
| Generic CRUD mutates UOM evidence roots | CLOSED by governed registry trigger plan |
| Full PHPUnit/PHPStan evidence | BLOCKED locally by missing vendor binaries |
| Live production readiness claim | BLOCKED; this remains pre-production runtime-readiness evidence |

## Decision

UOM_SYSTEM_SSOT_PASS

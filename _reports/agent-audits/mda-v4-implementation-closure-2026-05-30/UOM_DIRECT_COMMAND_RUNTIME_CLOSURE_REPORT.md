# UOM Direct Command Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Posture: pre-production runtime-readiness evidence; not production-ready

## Executive Decision

Implemented command-stack UOM runtime authority directly, not through `MdaUomAuthorityBridge`.

`IssueMaterialToWorkOrderCommand`, `CompleteOperationCommand`, and `RecordInspectionResultCommand` now call:

`UomCommandQuantityNormalizer -> UomRuntimeAuthorityService -> ItemUomPolicyService -> UomAliasResolutionService -> ConversionEngine`

before MES/quality mutation. The normalizer records immutable `domain_command_uom_measurement`, audit, and outbox evidence in the same command transaction.

## Source Truth Audit

- Existing UOM authority remains in `mom/api/services/Uom/*`.
- `MdaUomAuthorityBridge` is retained only as deprecated compatibility shim; no new runtime command path depends on it.
- New command transaction evidence table is `domain_command_uom_measurement`.
- Live DomainCommandGateway handlers currently implemented for MES quantity paths are issue material, complete operation, and record inspection result.

## Runtime Evidence Probe

Manual probe:

```json
{"ok":{"converted":"500.000000","target_unit":"PCS","measurement_id":"uom-measurement-1","mes_writes":1},"blocked":["uom_authority_resolution_failed","UOM_POLICY_NOT_FOUND",0]}
```

Interpretation:

- `10 BOX` converts to `500 PCS` before `mes_material_consumption`.
- Missing item UOM policy fails closed with `uom_authority_resolution_failed`.
- Blocked command performed zero MES material writes.

## Implementation Delta

- Added `mom/database/migrations/269_uom_domain_command_runtime_authority.sql`.
- Added `mom/api/services/DomainCommand/UomCommandQuantityNormalizer.php`.
- Updated `mom/api/services/DomainCommand/MesRuntimeCommandHandler.php`.
- Updated `mom/api/services/DomainCommand/DomainCommandGateway.php`.
- Added `mom/tests/Unit/Services/DomainCommandUomRuntimeAuthorityTest.php`.
- Updated UOM command matrix and P46 gap ledger away from bridge wording.

## Gap Ledger

Closed:

- `P46-BLOCK-CMD-003`: issue material now direct UOM-normalized.
- `P46-BLOCK-CMD-004`: complete operation now direct UOM-normalized for good/scrap quantities.
- `P46-BLOCK-CMD-005`: record inspection result now carries direct UOM MEASVAL evidence.

Controlled gaps:

- Receive, putaway, cost rollup, shipment pack, and tool preset commands have direct UOM policies but no live DomainCommandGateway handler yet.
- Alias ambiguity and conversion-rule lifecycle hardening remain UOM-internal work and should stay on the UOM branch to avoid multi-AI overwrite.

## Decision Token

P46_PASS_WITH_CONTROLLED_GAPS_DIRECT_COMMAND_STACK_READY

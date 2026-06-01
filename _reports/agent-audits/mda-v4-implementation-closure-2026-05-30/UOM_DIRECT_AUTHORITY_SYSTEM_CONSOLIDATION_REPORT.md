# UOM Direct Authority System Consolidation Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Posture: pre-production runtime-readiness evidence; not production-ready

## Executive Decision

UOM is now represented as one direct runtime authority inside the MDA runtime map. The MDA-specific `MdaUomAuthorityBridge` source and test were removed. Runtime command paths use:

`DomainCommandGateway -> UomCommandQuantityNormalizer -> UomRuntimeAuthorityService -> ItemUomPolicyService / UomAliasResolutionService / ConversionEngine -> domain_command_uom_measurement`

## Source Truth Audit

- Current UOM V5 subsystem already exists in `mom/api/services/Uom/*`, `mom/api/controllers/UomController.php`, UOM migrations `214..260`, and UOM API routes.
- MDA command closure had already introduced `UomRuntimeAuthorityService`, `UomCommandQuantityNormalizer`, and `domain_command_uom_measurement`.
- The remaining ambiguity was the old `MdaUomAuthorityBridge` compatibility class and stale registry/report wording.

## Implementation Delta

- Removed `mom/api/services/MdaUomAuthorityBridge.php`.
- Removed `mom/tests/Unit/Services/MdaUomAuthorityBridgeTest.php`.
- Added `UomRuntimeAuthorityService::probe()` as the direct authority posture contract.
- Added `RuntimeAuthorityService.slices.uom_runtime_authority`.
- Added migration `282_uom_direct_authority_system_registry.sql` to register `domain_command_uom_measurement`.
- Added `mom/data/registry/mda-uom-direct-authority-system.json`.
- Updated `uom-domain-integration-contracts.json` so ITEM, PO, WO, LOT, and INSP point to direct runtime command evidence instead of a bridge.

## Runtime Probe

```json
{
  "slice": "uom_runtime_authority",
  "readiness_state": "authoritative_ready",
  "authority_mode": "postgres_primary_domain_command",
  "command_policy_count": 16,
  "no_bridge_runtime_contract": true,
  "bridge_file_exists": false,
  "normalizer_uses_uom_runtime_authority": true,
  "normalizer_uses_mda_bridge": false
}
```

Direct command-stack probe still passes: `10 BOX -> 500 PCS`, writes UOM evidence before MES mutation, and blocks missing item policy before any MES write.

## Adversarial Audit

- MDA architect: PASS. There is no second UOM authority class in MDA source.
- MES lead: PASS. Material issue, complete operation, inspection, and inventory handlers normalize through UOM before mutation.
- Quality lead: PASS. Inspection result path carries MEASVAL hash into quality/event evidence.
- Data governance: PASS. Cost rollup, shipment pack, and tool preset policies now have live command handlers and UOM evidence columns.

## Decision Token

UOM_SYSTEM_SSOT_PASS

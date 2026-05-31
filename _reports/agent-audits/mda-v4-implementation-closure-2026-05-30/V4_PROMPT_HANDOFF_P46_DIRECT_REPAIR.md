# V4 Prompt Handoff - P46 Direct Repair

Prompt: P46 - UOM Measurement Authority Integration Closure
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Date: 2026-05-31
Decision token: `P46_PASS_WITH_CONTROLLED_GAPS_DIRECT_COMMAND_STACK_READY`

## What Changed

- Replaced command-stack bridge dependency with `UomCommandQuantityNormalizer`.
- `MesRuntimeCommandHandler` now normalizes issue material, complete operation, and inspection measurement quantities directly through `UomRuntimeAuthorityService`.
- Added immutable `domain_command_uom_measurement` evidence table.
- Added command-stack UOM unit test file and manual probe evidence.

## Runtime Proof

- `10 BOX` material issue becomes `500 PCS` before MES write.
- Missing item UOM policy returns `uom_authority_resolution_failed`.
- Missing policy path performs zero `mes_material_consumption` writes.
- UOM MEASVAL hash is carried into inspection event payload.

## Next Prompt Constraint

Do not route new governed quantity writes through `MdaUomAuthorityBridge`. New command handlers must inject or instantiate `UomCommandQuantityNormalizer` inside the domain command transaction before mutation.

## Remaining Controlled Gaps

- Receive, putaway, cost, shipment, and tool preset handlers are not live DomainCommandGateway handlers yet.
- UOM-internal alias ambiguity and lifecycle rule hardening should stay on the active UOM branch or be cherry-picked separately after review.

P46_PASS_WITH_CONTROLLED_GAPS_DIRECT_COMMAND_STACK_READY

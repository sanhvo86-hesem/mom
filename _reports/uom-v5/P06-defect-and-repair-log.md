# P06 Defect And Repair Log

Prompt: P06
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Defects Found And Repaired

- DEFECT: Existing alias resolver returned only canonical strings and could not surface structured ambiguous/unknown statuses.
  - REPAIR: Added `resolveDetailed()` and changed the API endpoint to return structured results.
- DEFECT: Ambiguous `M` could be resolved by broad alias/default patterns in future data if not explicitly guarded.
  - REPAIR: Added hard ambiguous candidate quarantine before catalog/alias lookup.
- DEFECT: Unknown OPC UA numeric units had no structured EUInformation source payload.
  - REPAIR: Added `resolveOpcUaEuInformation()` and unknown UnitId quarantine reason.
- DEFECT: No UCUM parser contract existed to reject unknown atoms.
  - REPAIR: Added `UcumParser` golden subset and controlled-gap exception.
- DEFECT: Quarantine rows lacked normalized alias, source system, candidates, reason, and trace id.
  - REPAIR: Added migration 258 with additive fields and trace index.

## Defects Not Repaired In P06

- OUT_OF_SCOPE_BLOCKER: Full KPI registry count drift remains unrelated to UoM P06.
- CONTROLLED_GAP: Full UCUM/QUDT catalog backfill remains later adoption work.
- CONTROLLED_GAP: UI remediation of structured alias statuses remains P11.

## Retest

Focused P06, broad UoM, PHPStan, index regeneration, syntax checks, and diff whitespace checks passed. Full `composer check` remains warning-only for unrelated KPI count drift.

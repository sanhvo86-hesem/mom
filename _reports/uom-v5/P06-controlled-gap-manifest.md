# P06 Controlled Gap Manifest

Prompt: P06 UCUM/QUDT/UNECE/OPC UA Alias Quarantine
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Controlled Gaps

- CONTROLLED_GAP: `UcumParser` is a governed golden-subset parser, not a full UCUM universe. Unknown atoms throw `UOM_UCUM_ATOM_CONTROLLED_GAP` and cannot reach conversion core.
- CONTROLLED_GAP: P06 does not mass-backfill `uom_unit_catalog` with all UCUM/QUDT rows. It adds the parser/catalog-load contract that fails mismatches.
- CONTROLLED_GAP: QUDT URI enforcement is represented by catalog-row contract boundaries and remains for broader catalog governance/backfill in later adoption work.
- CONTROLLED_GAP: AI advisory candidate logging is not invoked because P06 adds no AI suggestion path; ambiguous aliases are quarantined for human review.
- CONTROLLED_GAP: API Problem Details parity for all alias statuses remains P10; P06 returns structured results and blocks conversion by non-resolved status.

## Allowed Golden Subset

- `g`, `kg`, `mg`, `ug`: Mass, `M1`.
- `L`, `mL`: Volume, `L3`.
- `mol`: AmountOfSubstance, `N1`.
- `ug/mL`: inferred MassConcentration, `M1L-3`.
- `mol/L`: inferred Molarity, `N1L-3`.
- `Cel`, `[degF]`: special affine temperature atoms, not factor-only units.

## Governance Rule

Any external unit string outside the controlled subset must resolve through verified catalog/alias/external-code mappings or be written to `uom_alias_quarantine` with source payload, reason, candidates, and trace id.

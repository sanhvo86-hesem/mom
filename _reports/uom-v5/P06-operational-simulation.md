# P06 Operational Simulation

Prompt: P06
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Required Simulations

- SIM-P06-01: Vendor sends `M`.
  - TEST_EVIDENCE: `UomAliasResolutionP06Test::testSimP0601VendorMSymbolCreatesAmbiguousQuarantine`.
  - Result: PASS. Status is `ambiguous`; four candidates are returned; quarantine reason is `AMBIGUOUS_ALIAS`; no canonical unit is returned.
- SIM-P06-02: EDI 6411 sends `kgm`.
  - TEST_EVIDENCE: `UomAliasResolutionP06Test::testSimP0602Edi6411KgmResolvesToKg`.
  - Result: PASS. Alias normalizes to `KGM` and resolves to `kg` through verified UNECE map.
- SIM-P06-03: OPC UA sends unknown `engineeringUnitId = 999999`.
  - TEST_EVIDENCE: `UomAliasResolutionP06Test::testSimP0603UnknownOpcUaEngineeringUnitIdQuarantines`.
  - Result: PASS. Status is `unknown`; quarantine reason is `UNKNOWN_OPC_UA_ENGINEERING_UNIT_ID`.
- SIM-P06-04: UCUM `ug/mL`.
  - TEST_EVIDENCE: `UcumParserP06Test::testSimP0604UgPerMlParsesAsMassConcentration`.
  - Result: PASS. Quantity kind is `MassConcentration`; dimension vector is `M1L-3`.
- SIM-P06-05: UCUM `Cel` and `[degF]`.
  - TEST_EVIDENCE: `UcumParserP06Test::testSimP0605CelAndDegFAreSpecialAffineAtoms`.
  - Result: PASS. Both are special affine temperature atoms.

## Additional Prompt Simulations

- Golden case pass: EDI 6411 KGM resolves to `kg`.
- Negative case: Unknown OPC UA UnitId quarantines.
- Boundary precision/overflow: P06 does not perform numeric conversion; precision remains P05/P08.
- Permission denied: P06 adds no approval/write authority; all review remains pending.
- Stale cache/effective date: Resolved alias cache excludes quarantine responses; alias table lookup checks `effective_to`.
- Audit hash replay: P06 does not alter conversion evidence hashes; quarantine replay evidence uses trace id and raw payload.
- External alias quarantine: Ambiguous `M` and unknown OPC UA are covered.
- UI/API parity: API returns structured statuses; UI remediation remains P11 controlled gap.

## Result

PASS_WITH_WARNINGS due unrelated full-suite KPI registry count drift.

# P06 Audit Report

Prompt: P06
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Static Audit

- REPO_EVIDENCE: `UomAliasResolutionService::resolveDetailed()` returns non-resolved statuses instead of creating canonical mappings.
- REPO_EVIDENCE: Ambiguous `M` is hard blocked into quarantine with four candidate-only meanings.
- REPO_EVIDENCE: EDI 6411 and UNECE use `uom_external_code_map` with `confidence = 'VERIFIED'` and active catalog join.
- REPO_EVIDENCE: OPC UA unknown numeric UnitId returns `unknown` and writes quarantine reason `UNKNOWN_OPC_UA_ENGINEERING_UNIT_ID`.
- REPO_EVIDENCE: `UcumParser` rejects unknown atoms with `UOM_UCUM_ATOM_CONTROLLED_GAP`.
- REPO_EVIDENCE: Alias API now returns the structured result shape needed by remediation workflows.

## Bypass Audit

- No P06 path creates a `uom_alias` or `uom_unit_catalog` row.
- No P06 path approves quarantine, rule, manifest, or e-signature.
- Non-resolved alias statuses return `canonical_unit_code = null`, so conversion callers have no unit to run.
- Legacy `resolve()` still throws when detailed status is not `resolved`.

## Drift Audit

- Additive migration 258 extends `uom_alias_quarantine`; it does not rename existing columns or change review-status values.
- New service SQL joins external code maps to `uom_unit_catalog`, preventing verified external codes from pointing to inactive catalog units.
- `UcumParser::validateCatalogRow()` checks canonical code, quantity kind, and dimension vector against the parser contract.

## Hard Gate Result

P06 hard gates pass. The only red full-suite signal is unrelated KPI registry count drift already present before this prompt.

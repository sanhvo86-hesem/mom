# P05 Audit Report

Prompt: P05
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

## Static Audit

- REPO_EVIDENCE: UoM float grep over `mom/api/services/Uom` and `mom/api/controllers/UomController.php` returns no output.
- REPO_EVIDENCE: `DecimalString::parse()` remains pure string parsing and rejects not-a-number/infinity, locale comma, hex, blank, and overflow exponent cases.
- REPO_EVIDENCE: `ConversionEngine::CATEGORY_DISPATCH` has every category from `uom_conversion_rule` plus synthetic `identity` and `si_base_hop`.
- REPO_EVIDENCE: Unsupported categories throw `UOM_CATEGORY_NOT_SUPPORTED`; there is no default silent fallback to `UOM_NO_CONVERSION_PATH`.
- REPO_EVIDENCE: Affine direct and reverse both route through `AffineConverter`, preserving offset handling.
- REPO_EVIDENCE: SI-hop is blocked for affine units and cross-kind pairs before synthetic factor construction.
- REPO_EVIDENCE: MEASVAL evidence includes rule code, version, category, reversed flag, effective window, factor exactness, and precision envelope.

## Replay Audit

- TEST_EVIDENCE: SIM-P05-01 asserts `9007199254740993e0 kg -> g` returns `9007199254740993000` with exact input preserved.
- TEST_EVIDENCE: MEASVAL evidence for SIM-P05-01 records `rule_version=1`, `effective_from=2026-01-01`, `factor_exact=true`, `calculation_scale=30`, and `output_precision=0`.
- INFERENCE: A later replay can select the same rule version and effective window from the stored envelope. Full persisted measurement replay remains P09.

## Cache Audit

- REPO_EVIDENCE: P03 introduced cache key `uom:rule:v5:{from}:{to}:{as_of}:{context}:{policy}`.
- REPO_EVIDENCE: P05 engine now forwards context `as_of`/`effective_date` and `context_hash` into rule resolution.
- CONTROLLED_GAP: Cache invalidation breadth and observability remain P13.

Audit result: PASS_WITH_WARNINGS.
